"""
Allocation Service
──────────────────
Core spoilage-aware driver dispatch engine.

Pipeline for every NGO acceptance:
  1. Validate listing + remaining_quantity
  2. Geo-fence: find idle drivers within radius (expand if needed)
  3. Rank by priority_score (distance + spoilage weight)
  4. Create a Delivery document (status=assigned)
  5. Mark driver busy, reduce listing's remaining_quantity
  6. Fire notification (log + DB record)

If a driver rejects / times out → reassign_driver() picks the next candidate.
"""

import logging
import math
from datetime import datetime
from typing import Optional, List, Dict, Any
from bson import ObjectId

from app.core.database import db, listings_collection, notifications_collection
from app.services.driver_service import (
    get_idle_drivers,
    _set_driver_busy,
    _set_driver_idle,
)

logger = logging.getLogger(__name__)

# ── Collections ───────────────────────────────────────────────────────────────
drivers_col   = db["drivers"]
deliveries_col = db["deliveries"]

# ── Geo-fence configuration ───────────────────────────────────────────────────
GEO_FENCE_STEPS_KM = [10, 20, 35, 50]   # progressive expansion

# ── Spoilage urgency threshold ────────────────────────────────────────────────
CRITICAL_SHELF_LIFE_HOURS = 12


# ══════════════════════════════════════════════════════════════════════════════
# Geo Utilities
# ══════════════════════════════════════════════════════════════════════════════

def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Return the great-circle distance in kilometres between two points
    on Earth (Haversine formula).
    """
    R = 6371.0  # Earth radius in km
    φ1, φ2 = math.radians(lat1), math.radians(lat2)
    Δφ = math.radians(lat2 - lat1)
    Δλ = math.radians(lon2 - lon1)

    a = (math.sin(Δφ / 2) ** 2 +
         math.cos(φ1) * math.cos(φ2) * math.sin(Δλ / 2) ** 2)
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _drivers_within_radius(
    pickup_lat: float, pickup_lng: float, radius_km: float
) -> List[Dict[str, Any]]:
    """
    Return a list of idle drivers within `radius_km` of the pickup point,
    each annotated with a `_distance_km` field.
    """
    idle = get_idle_drivers()
    result = []
    for driver in idle:
        dist = haversine(pickup_lat, pickup_lng,
                         driver["latitude"], driver["longitude"])
        if dist <= radius_km:
            driver["_distance_km"] = round(dist, 3)
            result.append(driver)
    return result


def find_drivers_with_expansion(
    pickup_lat: float, pickup_lng: float
) -> List[Dict[str, Any]]:
    """
    Try each radius step in GEO_FENCE_STEPS_KM until at least one driver
    is found. Returns an empty list only if none found at max radius.
    """
    for radius in GEO_FENCE_STEPS_KM:
        candidates = _drivers_within_radius(pickup_lat, pickup_lng, radius)
        if candidates:
            logger.info(
                f"🌐 Found {len(candidates)} driver(s) within {radius} km "
                f"of ({pickup_lat:.4f}, {pickup_lng:.4f})"
            )
            return candidates
        logger.info(f"🔍 No drivers within {radius} km — expanding…")
    logger.warning("⚠️  No idle drivers found even at max radius (50 km).")
    return []


# ══════════════════════════════════════════════════════════════════════════════
# Priority Scoring
# ══════════════════════════════════════════════════════════════════════════════

def compute_priority_score(
    driver: Dict[str, Any],
    hours_remaining: float
) -> float:
    """
    Lower score = higher priority.

    Normal:   score = distance + spoilage_risk * 0.5
    Critical  (< 12 h remaining):
              score = distance * 3 + spoilage_risk * 0.1
              → distance is aggressively penalised to pick nearest driver.

    spoilage_risk = (1 / max(hours_remaining, 0.1)) * 10
    """
    spoilage_risk = 10.0 / max(hours_remaining, 0.1)
    distance      = driver["_distance_km"]

    if hours_remaining < CRITICAL_SHELF_LIFE_HOURS:
        score = distance * 3 + spoilage_risk * 0.1
    else:
        score = distance + spoilage_risk * 0.5

    driver["_priority_score"] = round(score, 4)
    return score


def _rank_drivers(
    candidates: List[Dict[str, Any]], hours_remaining: float
) -> List[Dict[str, Any]]:
    """Sort candidates by ascending priority_score (best first)."""
    for d in candidates:
        compute_priority_score(d, hours_remaining)
    return sorted(candidates, key=lambda d: d["_priority_score"])


# ══════════════════════════════════════════════════════════════════════════════
# Listing Helpers
# ══════════════════════════════════════════════════════════════════════════════

def _get_listing(listing_id: str) -> Optional[dict]:
    """Fetch from listings collection (try both collections)."""
    from app.core.database import marketplace_listings_collection
    doc = listings_collection.find_one({"_id": ObjectId(listing_id)})
    if not doc:
        doc = marketplace_listings_collection.find_one({"_id": ObjectId(listing_id)})
    if doc:
        doc["id"] = str(doc.pop("_id"))
    return doc


def _reduce_remaining_quantity(listing_id: str, quantity: int) -> dict:
    """
    Decrement remaining_quantity.
    Mark listing as 'completed' when it reaches 0.
    Returns updated listing doc (with id as string).
    """
    from app.core.database import marketplace_listings_collection

    for col in [listings_collection, marketplace_listings_collection]:
        existing = col.find_one({"_id": ObjectId(listing_id)})
        if not existing:
            continue

        current_rem = existing.get("remaining_quantity",
                                   existing.get("total_quantity", 0))
        new_rem = max(0, current_rem - quantity)
        new_status = "completed" if new_rem == 0 else existing.get("status", "available")

        updated = col.find_one_and_update(
            {"_id": ObjectId(listing_id)},
            {"$set": {
                "remaining_quantity": new_rem,
                "status": new_status,
            }},
            return_document=True,
        )
        if updated:
            updated["id"] = str(updated.pop("_id"))
            return updated
    return {}


# ══════════════════════════════════════════════════════════════════════════════
# Notification Helper
# ══════════════════════════════════════════════════════════════════════════════

def _notify_driver(driver_id: str, delivery_id: str, listing: dict) -> None:
    """
    Simulate a push notification to the driver.
    • Writes a record to the notifications collection (existing infra).
    • Prints a conspicuous server log (placeholder for Firebase/Twilio).
    In production: replace the log line with an FCM / Twilio SMS call.
    """
    message = (
        f"🚚 New delivery assignment!\n"
        f"Pickup: {listing.get('pickup_address', 'N/A')}\n"
        f"Crop:   {listing.get('title', 'N/A')}\n"
        f"Urgency: {listing.get('urgency_status', 'N/A')}\n"
        f"Delivery ID: {delivery_id}\n"
        f"Please ACCEPT or REJECT within 120 seconds."
    )

    notif_doc = {
        "user_id":      driver_id,
        "delivery_id":  delivery_id,
        "listing_id":   listing.get("id"),
        "type":         "driver_assignment",
        "message":      message,
        "read":         False,
        "timeout_sec":  120,
        "created_at":   datetime.utcnow(),
        # Placeholder fields for future Firebase/Twilio integration
        "firebase_sent": False,
        "sms_sent":      False,
    }
    notifications_collection.insert_one(notif_doc)

    logger.info("=" * 60)
    logger.info(f"📲 DRIVER NOTIFICATION → driver_id={driver_id}")
    logger.info(message)
    logger.info("=" * 60)


# ══════════════════════════════════════════════════════════════════════════════
# Core Allocation
# ══════════════════════════════════════════════════════════════════════════════

def assign_driver(
    listing_id:  str,
    ngo_id:      str,
    ngo_name:    str,
    quantity:    Optional[int] = None,
    ngo_phone:   Optional[str] = None,
    dest_lat:    Optional[float] = None,
    dest_lng:    Optional[float] = None,
    # Internal use: if we already have a ranked list (reassignment)
    _ranked_candidates: Optional[List[dict]] = None,
    _skip_driver_ids:   Optional[List[str]]  = None,
) -> dict:
    """
    Full driver allocation pipeline.

    Returns a dict with:
      - delivery: the created delivery document
      - driver:   the assigned driver
      - listing:  updated listing
      - ranked_candidates: sorted list for potential reassignment
    """
    # ── 1. Load listing ────────────────────────────────────────────────────
    listing = _get_listing(listing_id)
    if not listing:
        raise ValueError(f"Listing {listing_id} not found.")

    if listing.get("status") in ("completed", "expired", "cancelled"):
        raise ValueError(f"Listing {listing_id} is no longer available ({listing['status']}).")

    # ── 2. Validate quantity ───────────────────────────────────────────────
    # Ensure listing has remaining_quantity; initialise from total_quantity if missing
    if "remaining_quantity" not in listing:
        # Parse integer from string field like "50 kg" if needed
        raw_qty = listing.get("total_quantity") or listing.get("quantity", "0")
        if isinstance(raw_qty, str):
            import re
            nums = re.findall(r"\d+", raw_qty)
            raw_qty = int(nums[0]) if nums else 0
        listing["remaining_quantity"] = int(raw_qty)
        # Persist the initialised remaining_quantity
        for col_name in [listings_collection, db["marketplace_listings"]]:
            col_name.update_one(
                {"_id": ObjectId(listing_id)},
                {"$set": {
                    "remaining_quantity": listing["remaining_quantity"],
                    "total_quantity":     listing["remaining_quantity"],
                }},
                upsert=False,
            )

    remaining = listing["remaining_quantity"]
    if remaining <= 0:
        raise ValueError("This listing has no remaining quantity to fulfil.")

    # If NGO didn't specify quantity, take everything remaining
    qty_to_assign = quantity if quantity else remaining
    if qty_to_assign > remaining:
        raise ValueError(
            f"Requested {qty_to_assign} units but only {remaining} remain."
        )

    # ── 3. Get pickup coordinates ──────────────────────────────────────────
    pickup_lat = listing.get("latitude")
    pickup_lng = listing.get("longitude")
    if pickup_lat is None or pickup_lng is None:
        raise ValueError(
            "Listing has no geo-coordinates. Farmer must add latitude/longitude."
        )

    # ── 4. Find & rank drivers ─────────────────────────────────────────────
    hours_remaining = listing.get("hours_remaining", 48.0)

    if _ranked_candidates is None:
        candidates = find_drivers_with_expansion(pickup_lat, pickup_lng)
        if not candidates:
            return {
                "error": "no_drivers_available",
                "message": "No idle drivers found within 50 km of the pickup location.",
                "listing": listing,
            }
        ranked = _rank_drivers(candidates, hours_remaining)
    else:
        ranked = _ranked_candidates

    # Skip previously tried drivers (for reassignment)
    skip = set(_skip_driver_ids or [])
    available = [d for d in ranked if d["id"] not in skip]

    if not available:
        return {
            "error": "no_drivers_available",
            "message": "All nearby drivers have rejected or timed out.",
            "listing": listing,
        }

    chosen_driver = available[0]
    driver_id = chosen_driver["id"]

    # ── 5. Create delivery document ────────────────────────────────────────
    now = datetime.utcnow()
    delivery_doc = {
        "listing_id":       listing_id,
        "ngo_id":           ngo_id,
        "ngo_name":         ngo_name,
        "ngo_phone":        ngo_phone,
        "driver_id":        driver_id,
        "driver_name":      chosen_driver.get("name"),
        "driver_phone":     chosen_driver.get("phone"),
        "vehicle_number":   chosen_driver.get("vehicle_number"),
        "quantity_assigned": qty_to_assign,
        "status":           "assigned",

        # Pickup info
        "pickup_lat":      pickup_lat,
        "pickup_lng":      pickup_lng,
        "pickup_address":  listing.get("pickup_address"),
        "pickup_title":    listing.get("title"),

        # Destination info
        "dest_lat":        dest_lat,
        "dest_lng":        dest_lng,
        "dest_address":    ngo_phone,   # reuse phone for now; replace with actual address

        # Routing + tracking
        "route":           [],          # populated by tracking_service on location pings
        "distance_km":     chosen_driver["_distance_km"],
        "priority_score":  chosen_driver["_priority_score"],
        "hours_remaining_at_assignment": hours_remaining,

        # Lifecycle timestamps
        "assigned_at":     now,
        "accepted_at":     None,
        "picked_up_at":    None,
        "delivered_at":    None,

        # Reassignment tracking
        "rejected_by":     list(skip),
        "attempt_count":   len(skip) + 1,

        # Ranked list stored so reassignment can pick next without re-querying
        "_ranked_candidate_ids": [d["id"] for d in ranked],

        "created_at":      now,
    }

    ins = deliveries_col.insert_one(delivery_doc)
    delivery_id = str(ins.inserted_id)
    delivery_doc["id"] = delivery_id
    delivery_doc.pop("_id", None)

    # ── 6. Mark driver busy ────────────────────────────────────────────────
    _set_driver_busy(driver_id, delivery_id)

    # ── 7. Reduce listing remaining_quantity ───────────────────────────────
    updated_listing = _reduce_remaining_quantity(listing_id, qty_to_assign)

    # ── 8. Notify driver ───────────────────────────────────────────────────
    _notify_driver(driver_id, delivery_id, listing)

    logger.info(
        f"✅ Delivery {delivery_id} assigned → driver {chosen_driver['name']} "
        f"({driver_id}) | distance={chosen_driver['_distance_km']} km | "
        f"score={chosen_driver['_priority_score']}"
    )

    return {
        "delivery":           delivery_doc,
        "driver":             chosen_driver,
        "listing":            updated_listing,
        "ranked_candidates":  ranked,
    }


# ══════════════════════════════════════════════════════════════════════════════
# Reassignment (driver rejected / timed out)
# ══════════════════════════════════════════════════════════════════════════════

def reassign_driver(delivery_id: str, reason: str = "rejected") -> dict:
    """
    Called when a driver rejects or times out.
    Steps:
      1. Load the current delivery
      2. Free the current driver (idle)
      3. Attempt the next best driver from the stored ranked list
    """
    delivery = deliveries_col.find_one({"_id": ObjectId(delivery_id)})
    if not delivery:
        raise ValueError(f"Delivery {delivery_id} not found.")

    if delivery["status"] not in ("assigned",):
        raise ValueError(
            f"Cannot reassign delivery with status '{delivery['status']}'."
        )

    # Free the current driver
    old_driver_id = delivery["driver_id"]
    _set_driver_idle(old_driver_id)

    # Mark this delivery failed/rejected (a NEW one will be created)
    deliveries_col.update_one(
        {"_id": ObjectId(delivery_id)},
        {"$set": {
            "status":    "failed",
            "fail_reason": reason,
            "failed_at": datetime.utcnow(),
        }},
    )

    # Build skip list: all drivers who have already tried
    skip_ids = list(delivery.get("rejected_by", [])) + [old_driver_id]

    # Reconstruct ranked candidates from IDs stored at assignment time
    ranked_ids = delivery.get("_ranked_candidate_ids", [])
    # Re-fetch driver docs so locations/status are fresh
    fresh_drivers = []
    for did in ranked_ids:
        doc = drivers_col.find_one({"_id": ObjectId(did), "status": "idle"})
        if doc:
            doc["id"] = str(doc.pop("_id"))
            # Re-compute distance from pickup
            dist = haversine(
                delivery["pickup_lat"], delivery["pickup_lng"],
                doc["latitude"], doc["longitude"]
            )
            doc["_distance_km"] = round(dist, 3)
            fresh_drivers.append(doc)

    if not fresh_drivers:
        logger.warning(f"❌ No fallback drivers for delivery {delivery_id}.")
        return {
            "error": "no_drivers_available",
            "message": "All previously ranked drivers are now unavailable.",
            "original_delivery_id": delivery_id,
        }

    hours_remaining = delivery.get("hours_remaining_at_assignment", 48.0)
    ranked = _rank_drivers(fresh_drivers, hours_remaining)

    return assign_driver(
        listing_id=delivery["listing_id"],
        ngo_id=delivery["ngo_id"],
        ngo_name=delivery["ngo_name"],
        quantity=delivery["quantity_assigned"],
        ngo_phone=delivery.get("ngo_phone"),
        dest_lat=delivery.get("dest_lat"),
        dest_lng=delivery.get("dest_lng"),
        _ranked_candidates=ranked,
        _skip_driver_ids=skip_ids,
    )
