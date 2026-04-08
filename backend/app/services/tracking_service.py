"""
Tracking Service
────────────────
Manages the post-assignment lifecycle of a delivery.

Handles:
  • Driver accept / reject responses
  • Periodic GPS location pings (route array)
  • Lifecycle FSM advancement
  • Full tracking read (for NGO / admin views)
"""

import logging
from datetime import datetime
from typing import Optional, List, Dict, Any
from bson import ObjectId

from app.core.database import db
from app.services.driver_service import _set_driver_idle

logger = logging.getLogger(__name__)

# ── Collection ────────────────────────────────────────────────────────────────
deliveries_col = db["deliveries"]

# ── Valid lifecycle transitions ────────────────────────────────────────────────
VALID_TRANSITIONS: Dict[str, List[str]] = {
    "assigned":   ["accepted", "failed"],
    "accepted":   ["in_transit", "failed"],
    "in_transit": ["delivered", "failed"],
    "delivered":  [],   # terminal
    "failed":     [],   # terminal
    "cancelled":  [],   # terminal
}


# ══════════════════════════════════════════════════════════════════════════════
# Helpers
# ══════════════════════════════════════════════════════════════════════════════

def _fmt(doc: dict) -> dict:
    if doc and "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    return doc


def _get_delivery(delivery_id: str) -> Optional[dict]:
    doc = deliveries_col.find_one({"_id": ObjectId(delivery_id)})
    return _fmt(doc) if doc else None


# ══════════════════════════════════════════════════════════════════════════════
# Driver Accept / Reject
# ══════════════════════════════════════════════════════════════════════════════

def driver_respond(
    delivery_id: str,
    driver_id:   str,
    accepted:    bool,
    reason:      Optional[str] = None,
) -> dict:
    """
    Driver explicitly accepts or rejects an assigned delivery.

    Accept  → status transitions to 'accepted'
    Reject  → frees the driver, triggers reassignment via allocation_service
    """
    delivery = _get_delivery(delivery_id)
    if not delivery:
        raise ValueError(f"Delivery {delivery_id} not found.")

    if delivery["driver_id"] != driver_id:
        raise ValueError("You are not the assigned driver for this delivery.")

    if delivery["status"] != "assigned":
        raise ValueError(
            f"Cannot respond to a delivery with status '{delivery['status']}'."
        )

    if accepted:
        now = datetime.utcnow()
        updated = deliveries_col.find_one_and_update(
            {"_id": ObjectId(delivery_id)},
            {"$set": {
                "status":      "accepted",
                "accepted_at": now,
            }},
            return_document=True,
        )
        logger.info(f"✅ Driver {driver_id} ACCEPTED delivery {delivery_id}")
        return {
            "message": "Delivery accepted.",
            "delivery": _fmt(updated),
        }
    else:
        # Reject → hand off to allocation_service for reassignment
        logger.warning(
            f"❌ Driver {driver_id} REJECTED delivery {delivery_id}. "
            f"Reason: {reason or 'not provided'}"
        )
        from app.services.allocation_service import reassign_driver
        result = reassign_driver(delivery_id, reason=reason or "driver_rejected")
        return {
            "message": "Driver rejected. Reassignment initiated.",
            "reassignment": result,
        }


# ══════════════════════════════════════════════════════════════════════════════
# GPS Location Updates (in-transit pings)
# ══════════════════════════════════════════════════════════════════════════════

def record_location_update(
    delivery_id: str,
    driver_id:   str,
    lat:         float,
    lng:         float,
    heading:     Optional[float] = None,
    speed_kmh:   Optional[float] = None,
) -> dict:
    """
    Append a GPS waypoint to the delivery's route array.
    Also updates the driver's live location via driver_service.
    """
    from app.services.driver_service import update_driver_location

    delivery = _get_delivery(delivery_id)
    if not delivery:
        raise ValueError(f"Delivery {delivery_id} not found.")

    if delivery["driver_id"] != driver_id:
        raise ValueError("Driver ID mismatch.")

    if delivery["status"] not in ("accepted", "in_transit"):
        raise ValueError(
            f"Location updates only accepted for 'accepted' or 'in_transit' deliveries "
            f"(current: '{delivery['status']}')."
        )

    now = datetime.utcnow()
    waypoint = {
        "lat":       lat,
        "lng":       lng,
        "timestamp": now.isoformat(),
    }
    if heading  is not None: waypoint["heading"]   = heading
    if speed_kmh is not None: waypoint["speed_kmh"] = speed_kmh

    # Append waypoint to route array, update last known position
    deliveries_col.update_one(
        {"_id": ObjectId(delivery_id)},
        {
            "$push": {"route": waypoint},
            "$set": {
                "last_lat":       lat,
                "last_lng":       lng,
                "last_update_at": now,
            },
        },
    )

    # Mirror to driver document
    update_driver_location(driver_id, lat, lng, heading, speed_kmh)

    logger.debug(
        f"📍 Location ping — delivery={delivery_id} "
        f"lat={lat:.5f} lng={lng:.5f}"
    )

    return {
        "message":    "Location recorded.",
        "waypoint":   waypoint,
        "delivery_id": delivery_id,
    }


# ══════════════════════════════════════════════════════════════════════════════
# Lifecycle FSM
# ══════════════════════════════════════════════════════════════════════════════

def advance_delivery_status(
    delivery_id: str,
    driver_id:   str,
    new_status:  str,
    notes:       Optional[str] = None,
) -> dict:
    """
    Advance the delivery through its lifecycle.

    Valid chain:
      assigned → accepted → in_transit → delivered

    Side effects:
      • 'in_transit'  → marks driver still busy (no change needed)
      • 'delivered'   → frees the driver (idle)
      • 'failed'      → frees the driver (idle)
    """
    delivery = _get_delivery(delivery_id)
    if not delivery:
        raise ValueError(f"Delivery {delivery_id} not found.")

    if delivery["driver_id"] != driver_id:
        raise ValueError("Driver ID mismatch.")

    current  = delivery["status"]
    allowed  = VALID_TRANSITIONS.get(current, [])

    if new_status not in allowed:
        raise ValueError(
            f"Cannot transition from '{current}' to '{new_status}'. "
            f"Allowed next states: {allowed}"
        )

    now = datetime.utcnow()
    timestamp_field_map = {
        "accepted":   "accepted_at",
        "in_transit": "picked_up_at",
        "delivered":  "delivered_at",
        "failed":     "failed_at",
    }
    set_fields: Dict[str, Any] = {"status": new_status}
    if new_status in timestamp_field_map:
        set_fields[timestamp_field_map[new_status]] = now
    if notes:
        set_fields["notes"] = notes

    updated = deliveries_col.find_one_and_update(
        {"_id": ObjectId(delivery_id)},
        {"$set": set_fields},
        return_document=True,
    )

    # Free driver on terminal completion
    if new_status in ("delivered", "failed", "cancelled"):
        _set_driver_idle(driver_id)
        logger.info(
            f"🏁 Delivery {delivery_id} → {new_status}. "
            f"Driver {driver_id} returned to idle."
        )
    else:
        logger.info(f"🔄 Delivery {delivery_id}: {current} → {new_status}")

    return {
        "message":  f"Delivery status updated to '{new_status}'.",
        "delivery": _fmt(updated),
    }


# ══════════════════════════════════════════════════════════════════════════════
# Tracking Read
# ══════════════════════════════════════════════════════════════════════════════

def get_delivery_track(delivery_id: str) -> dict:
    """
    Return full delivery document including route history.
    """
    delivery = _get_delivery(delivery_id)
    if not delivery:
        raise ValueError(f"Delivery {delivery_id} not found.")

    # Enrich with driver info
    from app.services.driver_service import get_driver_by_id
    driver = get_driver_by_id(delivery["driver_id"])

    # Build a clean timeline from timestamps
    timeline = []
    ts_fields = [
        ("assigned",   "assigned_at"),
        ("accepted",   "accepted_at"),
        ("in_transit", "picked_up_at"),
        ("delivered",  "delivered_at"),
        ("failed",     "failed_at"),
    ]
    for label, key in ts_fields:
        if delivery.get(key):
            timeline.append({"event": label, "timestamp": delivery[key]})

    return {
        "delivery":   delivery,
        "driver":     driver,
        "timeline":   timeline,
        "route":      delivery.get("route", []),
        "waypoints":  len(delivery.get("route", [])),
        "status":     delivery["status"],
    }


def list_deliveries(
    driver_id:  Optional[str] = None,
    listing_id: Optional[str] = None,
    status:     Optional[str] = None,
) -> List[dict]:
    """Flexible query for deliveries by any combination of filters."""
    query: Dict[str, Any] = {}
    if driver_id:  query["driver_id"]  = driver_id
    if listing_id: query["listing_id"] = listing_id
    if status:     query["status"]     = status

    docs = list(deliveries_col.find(query).sort("created_at", -1).limit(100))
    return [_fmt(d) for d in docs]
