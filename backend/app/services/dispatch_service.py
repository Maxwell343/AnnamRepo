"""
Smart Driver Dispatch Service
─────────────────────────────
Ola/Uber-style cascade dispatch engine.

Flow:
  1. NGO claims a listing → broadcast_to_nearest_driver()
  2. System finds nearest idle driver within 10km
  3. Creates a driver_request with 30s TTL
  4. Driver polls via GET /driver/{id}/incoming-request
  5. Accept → delivery created, driver busy
  6. Decline/Timeout → next nearest driver
  7. Max 5 attempts → "no_driver" status

Concurrency safety: atomic findOneAndUpdate with status check.
"""

import logging
import math
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Any, Tuple
from bson import ObjectId

from app.core.database import db

logger = logging.getLogger(__name__)

# ── Collections ───────────────────────────────────────────────────────────────
driver_requests_col = db["driver_requests"]
drivers_col         = db["drivers"]
deliveries_col      = db["deliveries"]
listings_col        = db["listings"]
marketplace_col     = db["marketplace_listings"]
ngo_settings_col    = db["ngo_settings"]

# ── Configuration ─────────────────────────────────────────────────────────────
REQUEST_TTL_SECONDS    = 30     # 30s for driver to respond
MAX_DISPATCH_RADIUS_KM = 10    # strict 10km radius
MAX_CASCADE_ATTEMPTS   = 5     # max 5 drivers before giving up
DRIVER_BASE_EARNINGS   = 80    # base ₹ per delivery
DRIVER_KM_RATE         = 20    # ₹ per km bonus


# ══════════════════════════════════════════════════════════════════════════════
# Geo Utilities
# ══════════════════════════════════════════════════════════════════════════════

def _haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance in km between two points."""
    try:
        R = 6371.0
        p1, p2 = math.radians(float(lat1)), math.radians(float(lat2))
        dp = math.radians(float(lat2) - float(lat1))
        dl = math.radians(float(lon2) - float(lon1))
        a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
        return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    except Exception:
        return float("inf")


def _find_idle_drivers_within_radius(
    pickup_lat: float,
    pickup_lng: float,
    skip_ids: List[str],
) -> List[Dict[str, Any]]:
    """
    Find all idle drivers within MAX_DISPATCH_RADIUS_KM of pickup.
    Returns list sorted by distance (nearest first), excluding skip_ids.
    Also checks driver_settings for drivers registered via the settings flow.
    """
    candidates = []

    # ── Source 1: drivers collection (registered via /driver/register) ─────
    idle_docs = list(drivers_col.find({"status": "idle"}))
    for doc in idle_docs:
        did = str(doc["_id"])
        if did in skip_ids:
            continue
        lat = doc.get("latitude")
        lng = doc.get("longitude")
        if lat is None or lng is None:
            continue
        dist = _haversine(pickup_lat, pickup_lng, lat, lng)
        if dist <= MAX_DISPATCH_RADIUS_KM:
            candidates.append({
                "id": did,
                "name": doc.get("name", "Driver"),
                "phone": doc.get("phone", ""),
                "vehicle_number": doc.get("vehicle_number", ""),
                "latitude": float(lat),
                "longitude": float(lng),
                "distance_km": round(dist, 2),
                "source": "drivers",
            })

    # ── Source 2: driver_settings (for drivers who signed up via auth) ─────
    all_settings = list(db["driver_settings"].find({}))
    for ds in all_settings:
        did = str(ds.get("driver_id") or ds.get("user_id") or "")
        if not did or did in skip_ids:
            continue
        # Skip if already found in drivers collection
        if any(c["id"] == did for c in candidates):
            continue

        loc = ds.get("location") or {}
        lat = loc.get("lat") or ds.get("latitude")
        lng = loc.get("lng") or ds.get("longitude")
        if lat is None or lng is None:
            continue

        dist = _haversine(pickup_lat, pickup_lng, float(lat), float(lng))
        if dist <= MAX_DISPATCH_RADIUS_KM:
            candidates.append({
                "id": did,
                "name": ds.get("name", "Driver"),
                "phone": ds.get("phone", ""),
                "vehicle_number": ds.get("vehicle_number", ""),
                "latitude": float(lat),
                "longitude": float(lng),
                "distance_km": round(dist, 2),
                "source": "driver_settings",
            })

    # Sort by distance (nearest first)
    candidates.sort(key=lambda d: d["distance_km"])
    return candidates


# ══════════════════════════════════════════════════════════════════════════════
# Core Dispatch
# ══════════════════════════════════════════════════════════════════════════════

def broadcast_to_nearest_driver(
    listing_id: str,
    ngo_id: str,
    ngo_name: str = "NGO",
    skipped_driver_ids: Optional[List[str]] = None,
    attempt_number: int = 1,
) -> Dict[str, Any]:
    """
    Find the nearest idle driver and create a dispatch request.
    Returns the created request or a no_driver status.
    """
    if skipped_driver_ids is None:
        skipped_driver_ids = []

    # ── Enforce max cascade attempts ──────────────────────────────────────
    if attempt_number > MAX_CASCADE_ATTEMPTS:
        _mark_listing_no_driver(listing_id)
        return {
            "status": "no_driver",
            "message": f"All {MAX_CASCADE_ATTEMPTS} nearby drivers exhausted. No driver available.",
            "listing_id": listing_id,
        }

    # ── Load listing ──────────────────────────────────────────────────────
    listing = _get_listing(listing_id)
    if not listing:
        return {"status": "error", "message": "Listing not found"}

    pickup_lat = listing.get("latitude")
    pickup_lng = listing.get("longitude")
    if pickup_lat is None or pickup_lng is None:
        # Try coordinates sub-object
        coords = listing.get("coordinates") or {}
        pickup_lat = coords.get("lat") or pickup_lat
        pickup_lng = coords.get("lng") or pickup_lng

    try:
        pickup_lat = float(pickup_lat) if pickup_lat else 0.0
        pickup_lng = float(pickup_lng) if pickup_lng else 0.0
    except (ValueError, TypeError):
        pickup_lat, pickup_lng = 0.0, 0.0

    # ── Load NGO destination info ──────────────────────────────────────────
    ngo_settings = ngo_settings_col.find_one({"ngo_id": ngo_id})
    dest_lat, dest_lng, ngo_address = None, None, ""
    if ngo_settings:
        loc = ngo_settings.get("location") or {}
        dest_lat = loc.get("lat")
        dest_lng = loc.get("lng")
        ngo_address = loc.get("address") or ngo_settings.get("organization_address", "")

    # ── Find nearest idle driver ──────────────────────────────────────────
    candidates = _find_idle_drivers_within_radius(pickup_lat, pickup_lng, skipped_driver_ids)

    if not candidates:
        _mark_listing_no_driver(listing_id)
        return {
            "status": "no_driver",
            "message": "No idle drivers found within 10km.",
            "listing_id": listing_id,
        }

    chosen = candidates[0]

    # ── Calculate earnings & priority ─────────────────────────────────────
    earnings = DRIVER_BASE_EARNINGS + int(chosen["distance_km"] * DRIVER_KM_RATE)
    hours_remaining = listing.get("hours_remaining") or listing.get("remaining_shelf_life_hours") or 999
    try:
        hours_remaining = float(hours_remaining)
    except (ValueError, TypeError):
        hours_remaining = 999.0

    if hours_remaining <= 6:
        priority = "urgent"
    elif hours_remaining <= 12:
        priority = "high"
    else:
        priority = "normal"

    estimated_minutes = max(5, int(chosen["distance_km"] * 4))  # ~15 km/h avg

    # ── Cancel any existing pending request for this listing ───────────────
    driver_requests_col.update_many(
        {"listing_id": listing_id, "status": "pending"},
        {"$set": {"status": "superseded", "responded_at": datetime.utcnow()}},
    )

    # ── Create driver_request document ─────────────────────────────────────
    now = datetime.utcnow()
    request_doc = {
        "listing_id": listing_id,
        "ngo_id": ngo_id,
        "ngo_name": ngo_name,
        "ngo_address": ngo_address,
        "pickup_lat": pickup_lat,
        "pickup_lng": pickup_lng,
        "pickup_address": listing.get("pickup_address") or listing.get("location", ""),
        "dest_lat": dest_lat,
        "dest_lng": dest_lng,
        "driver_id": chosen["id"],
        "driver_name": chosen["name"],
        "distance_km": chosen["distance_km"],
        "estimated_minutes": estimated_minutes,
        "earnings": earnings,
        "priority": priority,
        "status": "pending",
        "expires_at": now + timedelta(seconds=REQUEST_TTL_SECONDS),
        "skipped_driver_ids": skipped_driver_ids,
        "attempt_number": attempt_number,
        "listing_title": listing.get("title") or listing.get("crop_name", "Donation"),
        "listing_type": listing.get("type", "Other"),
        "listing_quantity": str(listing.get("quantity", "N/A")),
        "hours_remaining": hours_remaining,
        "farmer_name": listing.get("farmer_name", "Farmer"),
        "farmer_phone": listing.get("farmer_phone", ""),
        "created_at": now,
        "responded_at": None,
    }

    result = driver_requests_col.insert_one(request_doc)
    request_id = str(result.inserted_id)
    request_doc["id"] = request_id
    request_doc.pop("_id", None)

    # ── Update listing with dispatch status ────────────────────────────────
    dispatch_status = {
        "dispatch_status": "finding_driver",
        "dispatch_attempt": attempt_number,
        "dispatch_driver_name": chosen["name"],
        "current_dispatch_request_id": request_id,
    }
    _update_listing_both(listing_id, dispatch_status)

    logger.info(
        f"🚀 Dispatch #{attempt_number} → driver {chosen['name']} ({chosen['id']}) "
        f"| distance={chosen['distance_km']}km | ttl=30s | listing={listing_id}"
    )

    return {
        "status": "dispatched",
        "request": request_doc,
        "driver": chosen,
        "attempt": attempt_number,
    }


def driver_accept_request(request_id: str, driver_id: str) -> Dict[str, Any]:
    """
    Driver accepts the dispatch request.
    Uses atomic findOneAndUpdate to prevent race conditions.
    """
    # ── Atomic claim: only one driver can accept ──────────────────────────
    now = datetime.utcnow()
    request = driver_requests_col.find_one_and_update(
        {
            "_id": ObjectId(request_id),
            "driver_id": driver_id,
            "status": "pending",
            "expires_at": {"$gt": now},  # not expired
        },
        {
            "$set": {
                "status": "accepted",
                "responded_at": now,
            }
        },
        return_document=True,
    )

    if not request:
        # Check if it was already accepted/expired
        existing = driver_requests_col.find_one({"_id": ObjectId(request_id)})
        if not existing:
            raise ValueError("Request not found.")
        if existing.get("status") == "accepted":
            raise ValueError("Request already accepted.")
        if existing.get("status") == "expired":
            raise ValueError("Request has expired. Please wait for the next one.")
        if existing.get("driver_id") != driver_id:
            raise ValueError("This request is not assigned to you.")
        raise ValueError("Request is no longer available.")

    listing_id = request["listing_id"]

    # ── Create delivery via allocation_service ─────────────────────────────
    try:
        from app.services.allocation_service import assign_driver, _get_listing

        listing = _get_listing(listing_id)
        if not listing:
            raise ValueError("Listing not found for delivery creation.")

        # Build driver object for allocation
        driver_doc = {
            "id": driver_id,
            "name": request.get("driver_name", "Driver"),
            "phone": request.get("farmer_phone", ""),
            "vehicle_number": "",
            "latitude": 0.0,
            "longitude": 0.0,
            "_distance_km": request.get("distance_km", 0),
            "_priority_score": request.get("distance_km", 0),
        }

        # Try to get real driver data
        real_driver = drivers_col.find_one({"_id": ObjectId(driver_id)})
        if real_driver:
            driver_doc["name"] = real_driver.get("name", driver_doc["name"])
            driver_doc["phone"] = real_driver.get("phone", "")
            driver_doc["vehicle_number"] = real_driver.get("vehicle_number", "")
            driver_doc["latitude"] = real_driver.get("latitude", 0.0)
            driver_doc["longitude"] = real_driver.get("longitude", 0.0)

        result = assign_driver(
            listing_id=listing_id,
            ngo_id=request["ngo_id"],
            ngo_name=request["ngo_name"],
            ngo_phone=None,
            dest_lat=request.get("dest_lat"),
            dest_lng=request.get("dest_lng"),
            _ranked_candidates=[driver_doc],
        )

        if "error" in result:
            raise ValueError(result.get("message", "Delivery creation failed"))

    except ValueError:
        raise
    except Exception as exc:
        logger.exception(f"Failed to create delivery for request {request_id}")
        # Fallback: create a simpler delivery
        delivery_doc = {
            "listing_id": listing_id,
            "ngo_id": request["ngo_id"],
            "ngo_name": request["ngo_name"],
            "driver_id": driver_id,
            "driver_name": request.get("driver_name", "Driver"),
            "status": "accepted",
            "pickup_lat": request.get("pickup_lat"),
            "pickup_lng": request.get("pickup_lng"),
            "pickup_address": request.get("pickup_address"),
            "dest_lat": request.get("dest_lat"),
            "dest_lng": request.get("dest_lng"),
            "distance_km": request.get("distance_km", 0),
            "assigned_at": now,
            "accepted_at": now,
            "created_at": now,
        }
        ins = deliveries_col.insert_one(delivery_doc)
        result = {"delivery": {**delivery_doc, "id": str(ins.inserted_id)}}

    # ── Update listing status ──────────────────────────────────────────────
    _update_listing_both(listing_id, {
        "status": "assigned",
        "dispatch_status": "driver_assigned",
        "assigned_driver_id": driver_id,
        "assigned_driver_name": request.get("driver_name", "Driver"),
        "updated_at": now.isoformat(),
    })

    logger.info(f"✅ Driver {driver_id} ACCEPTED request {request_id} for listing {listing_id}")

    return {
        "status": "accepted",
        "message": "Delivery assigned successfully!",
        "delivery": result.get("delivery"),
        "listing_id": listing_id,
    }


def driver_decline_request(request_id: str, driver_id: str) -> Dict[str, Any]:
    """
    Driver explicitly declines. Cascade to next nearest driver.
    """
    now = datetime.utcnow()
    request = driver_requests_col.find_one_and_update(
        {
            "_id": ObjectId(request_id),
            "driver_id": driver_id,
            "status": "pending",
        },
        {
            "$set": {
                "status": "declined",
                "responded_at": now,
            }
        },
        return_document=True,
    )

    if not request:
        return {"status": "error", "message": "Request not found or already responded."}

    logger.info(f"❌ Driver {driver_id} DECLINED request {request_id}")

    # ── Cascade to next driver ─────────────────────────────────────────────
    skipped = list(request.get("skipped_driver_ids", []))
    skipped.append(driver_id)
    attempt = request.get("attempt_number", 1) + 1

    # Update listing with "trying next driver" status
    _update_listing_both(request["listing_id"], {
        "dispatch_status": "trying_next_driver",
        "dispatch_attempt": attempt,
    })

    cascade_result = broadcast_to_nearest_driver(
        listing_id=request["listing_id"],
        ngo_id=request["ngo_id"],
        ngo_name=request["ngo_name"],
        skipped_driver_ids=skipped,
        attempt_number=attempt,
    )

    return {
        "status": "declined",
        "message": "Declined. Dispatching to next driver.",
        "cascade": cascade_result,
    }


def get_pending_request(driver_id: str) -> Optional[Dict[str, Any]]:
    """
    Get the active pending dispatch request for a driver.
    Returns None if no pending request or if expired.
    """
    now = datetime.utcnow()
    request = driver_requests_col.find_one({
        "driver_id": driver_id,
        "status": "pending",
        "expires_at": {"$gt": now},
    })

    if not request:
        return None

    request["id"] = str(request.pop("_id"))
    # Calculate remaining seconds
    remaining = (request["expires_at"] - now).total_seconds()
    request["remaining_seconds"] = max(0, int(remaining))

    # Serialize datetime fields
    for key in ["expires_at", "created_at", "responded_at"]:
        if request.get(key) and isinstance(request[key], datetime):
            request[key] = request[key].isoformat()

    return request


# ══════════════════════════════════════════════════════════════════════════════
# Scheduler: Auto-Expire Stale Requests
# ══════════════════════════════════════════════════════════════════════════════

def expire_stale_requests() -> int:
    """
    Called by scheduler every 15s.
    Finds all pending requests past their TTL and auto-declines them.
    Triggers cascade dispatch for each.
    """
    now = datetime.utcnow()
    expired_requests = list(driver_requests_col.find({
        "status": "pending",
        "expires_at": {"$lte": now},
    }))

    count = 0
    for req in expired_requests:
        req_id = str(req["_id"])
        driver_id = req["driver_id"]

        # Atomically mark as expired (prevent double-processing)
        result = driver_requests_col.find_one_and_update(
            {"_id": req["_id"], "status": "pending"},
            {"$set": {"status": "expired", "responded_at": now}},
        )
        if not result:
            continue  # Already processed by another worker

        logger.warning(
            f"⏰ Request {req_id} EXPIRED (driver {driver_id} did not respond in 30s)"
        )

        # Cascade to next driver
        skipped = list(req.get("skipped_driver_ids", []))
        skipped.append(driver_id)
        attempt = req.get("attempt_number", 1) + 1

        broadcast_to_nearest_driver(
            listing_id=req["listing_id"],
            ngo_id=req["ngo_id"],
            ngo_name=req.get("ngo_name", "NGO"),
            skipped_driver_ids=skipped,
            attempt_number=attempt,
        )
        count += 1

    return count


# ══════════════════════════════════════════════════════════════════════════════
# Hotspot Recommendations
# ══════════════════════════════════════════════════════════════════════════════

def get_hotspot_recommendations(
    driver_lat: float, driver_lng: float, radius_km: float = 15.0
) -> List[Dict[str, Any]]:
    """
    Find clusters of urgent listings (<12h remaining) near the driver.
    Returns repositioning suggestions.
    """
    from app.services.expiry_engine import enrich_listing

    urgent_listings = []
    for coll in [listings_col, marketplace_col]:
        docs = list(coll.find({
            "status": {"$in": ["available", "claimed", "pending_donation"]},
        }))
        for doc in docs:
            doc["id"] = str(doc.pop("_id"))
            enrich_listing(doc)
            hours = doc.get("hours_remaining", 999)
            if isinstance(hours, (int, float)) and hours <= 12:
                lat = doc.get("latitude")
                lng = doc.get("longitude")
                if lat is not None and lng is not None:
                    dist = _haversine(driver_lat, driver_lng, float(lat), float(lng))
                    if dist <= radius_km:
                        urgent_listings.append({
                            "listing_id": doc["id"],
                            "title": doc.get("title", ""),
                            "hours_remaining": round(hours, 1),
                            "latitude": float(lat),
                            "longitude": float(lng),
                            "distance_km": round(dist, 2),
                            "address": doc.get("pickup_address") or doc.get("location", ""),
                        })

    if not urgent_listings:
        return []

    # Cluster by proximity (simple grid-based clustering)
    clusters: Dict[str, Dict[str, Any]] = {}
    for item in urgent_listings:
        # Grid key: round to 0.02 degrees (~2km)
        grid_key = f"{round(item['latitude'], 2)}_{round(item['longitude'], 2)}"
        if grid_key not in clusters:
            clusters[grid_key] = {
                "center_lat": item["latitude"],
                "center_lng": item["longitude"],
                "count": 0,
                "listings": [],
                "avg_distance_km": 0,
                "most_urgent_hours": 999,
                "address": item["address"],
            }
        c = clusters[grid_key]
        c["count"] += 1
        c["listings"].append(item)
        c["avg_distance_km"] = round(
            sum(l["distance_km"] for l in c["listings"]) / c["count"], 2
        )
        c["most_urgent_hours"] = min(c["most_urgent_hours"], item["hours_remaining"])

    # Sort clusters: most urgent first, then most pickups
    hotspots = sorted(
        clusters.values(),
        key=lambda c: (c["most_urgent_hours"], -c["count"]),
    )

    recommendations = []
    for hs in hotspots[:5]:
        urgency = "critical" if hs["most_urgent_hours"] <= 6 else "high"
        recommendations.append({
            "message": f"Move to {hs['address'] or 'nearby area'} – {hs['count']} urgent pickup{'s' if hs['count'] > 1 else ''} nearby",
            "center_lat": hs["center_lat"],
            "center_lng": hs["center_lng"],
            "pickup_count": hs["count"],
            "distance_km": hs["avg_distance_km"],
            "most_urgent_hours": hs["most_urgent_hours"],
            "urgency": urgency,
        })

    return recommendations


# ══════════════════════════════════════════════════════════════════════════════
# Helpers
# ══════════════════════════════════════════════════════════════════════════════

def _get_listing(listing_id: str) -> Optional[dict]:
    """Fetch listing from either collection."""
    try:
        doc = listings_col.find_one({"_id": ObjectId(listing_id)})
        if not doc:
            doc = marketplace_col.find_one({"_id": ObjectId(listing_id)})
        if doc:
            doc["id"] = str(doc.pop("_id"))
        return doc
    except Exception:
        return None


def _update_listing_both(listing_id: str, update_data: dict):
    """Update listing in both collections."""
    try:
        query = {"_id": ObjectId(listing_id)}
        listings_col.update_one(query, {"$set": update_data})
        marketplace_col.update_one(query, {"$set": update_data})
    except Exception as exc:
        logger.error(f"Failed to update listing {listing_id}: {exc}")


def _mark_listing_no_driver(listing_id: str):
    """Mark listing as having no available driver."""
    _update_listing_both(listing_id, {
        "dispatch_status": "no_driver",
        "dispatch_attempt": MAX_CASCADE_ATTEMPTS,
        "updated_at": datetime.utcnow().isoformat(),
    })
    logger.warning(f"⚠️ No driver available for listing {listing_id} after {MAX_CASCADE_ATTEMPTS} attempts")
