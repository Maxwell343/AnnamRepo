"""
Driver Dispatch Routes
──────────────────────
API endpoints for the Ola-style cascade dispatch system.

  • Driver polls for incoming requests
  • Driver accepts / declines
  • Hotspot recommendations
  • Smart AI-scored recommendations (GET /driver/{id}/recommendations)
"""

import logging
import math
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app.services.dispatch_service import (
    get_pending_request,
    driver_accept_request,
    driver_decline_request,
    get_hotspot_recommendations,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Driver Dispatch"])


# ══════════════════════════════════════════════════════════════════════════════
# GET /driver/{driver_id}/incoming-request
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/driver/{driver_id}/incoming-request")
async def poll_incoming_request(driver_id: str):
    """
    Driver polls this endpoint every 5s (idle) or 15s (busy).
    Returns the pending dispatch request if one exists.

    Response when request exists:
    ```json
    {
      "has_request": true,
      "request": { ... full request object with remaining_seconds ... }
    }
    ```

    Response when no request:
    ```json
    {
      "has_request": false,
      "request": null
    }
    ```
    """
    request = get_pending_request(driver_id)
    return {
        "has_request": request is not None,
        "request": request,
    }


# ══════════════════════════════════════════════════════════════════════════════
# POST /driver/requests/{request_id}/accept
# ══════════════════════════════════════════════════════════════════════════════

class AcceptPayload(BaseModel):
    driver_id: str


@router.post("/driver/requests/{request_id}/accept")
async def accept_dispatch_request(request_id: str, payload: AcceptPayload):
    """
    Driver accepts the incoming dispatch request.

    - Atomic: only one driver can accept (findOneAndUpdate with status check)
    - Creates a delivery document
    - Marks driver as busy
    - Updates listing status to 'assigned'
    """
    try:
        result = driver_accept_request(request_id, payload.driver_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.exception("accept_dispatch_request error")
        raise HTTPException(status_code=500, detail=str(exc))

    return result


# ══════════════════════════════════════════════════════════════════════════════
# POST /driver/requests/{request_id}/decline
# ══════════════════════════════════════════════════════════════════════════════

class DeclinePayload(BaseModel):
    driver_id: str
    reason: Optional[str] = None


@router.post("/driver/requests/{request_id}/decline")
async def decline_dispatch_request(request_id: str, payload: DeclinePayload):
    """
    Driver declines the incoming request.

    - Marks request as 'declined'
    - Automatically cascades to the next nearest driver
    - If max attempts reached, marks listing as 'no_driver'
    """
    try:
        result = driver_decline_request(request_id, payload.driver_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.exception("decline_dispatch_request error")
        raise HTTPException(status_code=500, detail=str(exc))

    return result


# ══════════════════════════════════════════════════════════════════════════════
# GET /driver/{driver_id}/hotspots
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/driver/{driver_id}/hotspots")
async def driver_hotspots(
    driver_id: str,
    lat: Optional[float] = Query(None, description="Driver latitude"),
    lng: Optional[float] = Query(None, description="Driver longitude"),
):
    """
    Smart fleet intelligence: recommend areas with urgent pickups.

    Returns up to 5 hotspot clusters where the driver should reposition.
    Each hotspot includes: message, coordinates, pickup count, urgency level.
    """
    if lat is None or lng is None:
        # Try to find driver's last known location
        from app.core.database import db
        driver = db["drivers"].find_one({"_id": __import__("bson").ObjectId(driver_id)})
        if driver:
            lat = driver.get("latitude", 0.0)
            lng = driver.get("longitude", 0.0)
        else:
            ds = db["driver_settings"].find_one({"driver_id": driver_id})
            if ds:
                loc = ds.get("location") or {}
                lat = loc.get("lat", 0.0)
                lng = loc.get("lng", 0.0)
            else:
                return {"hotspots": [], "message": "Driver location unknown"}

    recommendations = get_hotspot_recommendations(float(lat), float(lng))

    return {
        "hotspots": recommendations,
        "count": len(recommendations),
        "driver_location": {"lat": lat, "lng": lng},
    }


# ══════════════════════════════════════════════════════════════════════════════
# GET /driver/{driver_id}/recommendations
# ══════════════════════════════════════════════════════════════════════════════

def _parse_quantity_kg(qty_raw: any) -> float:
    """Convert a quantity value to kg float for scoring."""
    try:
        val = str(qty_raw).replace("kg", "").replace("Kg", "").strip()
        return float(val)
    except Exception:
        return 1.0


def _haversine_simple(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371.0
    try:
        p1, p2 = math.radians(float(lat1)), math.radians(float(lat2))
        dp = math.radians(float(lat2) - float(lat1))
        dl = math.radians(float(lon2) - float(lon1))
        a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
        return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    except Exception:
        return float("inf")


def _generate_reason(distance_km: float, hours_remaining: float, quantity_kg: float) -> str:
    """Generate a human-readable reason string for the recommendation."""
    reasons = []
    if hours_remaining <= 6:
        reasons.append(f"Expires in {hours_remaining:.1f}h — urgent action needed")
    if distance_km <= 1.5:
        reasons.append("very close to you")
    elif distance_km <= 3.0:
        reasons.append("nearby")
    if quantity_kg >= 50:
        reasons.append("large quantity")
    if not reasons:
        return "Balanced distance, urgency & quantity score"
    return " + ".join(reasons).capitalize()


def _priority_label(score: float, hours_remaining: float) -> str:
    if hours_remaining <= 6 or score >= 10:
        return "URGENT"
    if hours_remaining <= 12 or score >= 5:
        return "HIGH"
    if score >= 2:
        return "MEDIUM"
    return "LOW"


@router.get("/driver/{driver_id}/recommendations")
async def get_driver_recommendations(
    driver_id: str,
    lat: Optional[float] = Query(None, description="Driver latitude"),
    lng: Optional[float] = Query(None, description="Driver longitude"),
    limit: int = Query(6, description="Max recommendations to return"),
):
    """
    Smart AI-scored recommendations for the driver.

    Scores every available/claimed listing using a weighted formula:

        score = (1.5 / max(distance_km, 0.1))
              + (2.0 / max(hours_remaining, 0.5))
              + (0.5 * log1p(quantity_kg))

    Emergency boost: score × 2 when hours_remaining < 6h.

    Returns listings sorted by score descending with:
        - priority label (URGENT / HIGH / MEDIUM / LOW)
        - human-readable reason
        - distance, hours_remaining, quantity
    """
    from app.core.database import db
    from app.services.expiry_engine import enrich_listing

    # ── Resolve driver location ────────────────────────────────────────────
    driver_lat, driver_lng = lat, lng

    if driver_lat is None or driver_lng is None:
        # Try drivers collection first
        try:
            import bson
            doc = db["drivers"].find_one({"_id": bson.ObjectId(driver_id)})
            if doc:
                driver_lat = doc.get("latitude")
                driver_lng = doc.get("longitude")
        except Exception:
            pass

        # Fall back to driver_settings
        if driver_lat is None:
            ds = db["driver_settings"].find_one({"driver_id": driver_id})
            if ds:
                loc = ds.get("location") or {}
                driver_lat = loc.get("lat") or ds.get("latitude")
                driver_lng = loc.get("lng") or ds.get("longitude")

    if driver_lat is None or driver_lng is None:
        return {"recommendations": [], "count": 0, "message": "Driver location unknown"}

    driver_lat = float(driver_lat)
    driver_lng = float(driver_lng)

    # ── Load candidate listings ────────────────────────────────────────────
    MAX_DISTANCE_KM = 10.0
    DISTANCE_WEIGHT = 1.5
    URGENCY_WEIGHT  = 2.0
    QUANTITY_WEIGHT = 0.5

    scored: List[Dict[str, Any]] = []

    for coll_name in ["listings", "marketplace_listings"]:
        docs = list(db[coll_name].find({
            "status": {"$in": ["available", "claimed", "pending_donation"]},
        }))
        for doc in docs:
            doc["id"] = str(doc.pop("_id"))
            try:
                enrich_listing(doc)
            except Exception:
                pass

            lat_val = doc.get("latitude") or (doc.get("coordinates") or {}).get("lat") or (doc.get("location") or {}).get("coordinates", {}).get("lat")
            lng_val = doc.get("longitude") or (doc.get("coordinates") or {}).get("lng") or (doc.get("location") or {}).get("coordinates", {}).get("lng")

            if lat_val is None or lng_val is None:
                continue

            distance_km = _haversine_simple(driver_lat, driver_lng, float(lat_val), float(lng_val))
            if distance_km > MAX_DISTANCE_KM:
                continue

            hours_remaining = float(doc.get("hours_remaining") or doc.get("remaining_shelf_life_hours") or 999)
            if hours_remaining <= 0:
                continue

            quantity_kg = _parse_quantity_kg(doc.get("quantity") or doc.get("quantity_kg") or 1)

            # ── Score formula ──────────────────────────────────────────────
            score = (
                DISTANCE_WEIGHT / max(distance_km, 0.1)
                + URGENCY_WEIGHT / max(hours_remaining, 0.5)
                + QUANTITY_WEIGHT * math.log1p(max(quantity_kg, 0))
            )

            # Emergency boost
            if hours_remaining <= 6:
                score *= 2.0

            priority = _priority_label(score, hours_remaining)
            reason   = _generate_reason(distance_km, hours_remaining, quantity_kg)

            scored.append({
                "listing_id":      doc["id"],
                "title":           doc.get("title") or doc.get("crop_name") or "Food Donation",
                "quantity":        str(doc.get("quantity") or f"{quantity_kg:.0f} kg"),
                "distance_km":     round(distance_km, 2),
                "hours_remaining": round(hours_remaining, 1),
                "priority":        priority,
                "reason":          reason,
                "pickup_address":  doc.get("pickup_address") or doc.get("location") or "",
                "farmer_name":     doc.get("farmer_name") or "Farmer",
                "score":           round(score, 2),
            })

    # De-duplicate by listing_id (can appear in both collections)
    seen: set = set()
    unique_scored = []
    for item in scored:
        if item["listing_id"] not in seen:
            seen.add(item["listing_id"])
            unique_scored.append(item)

    # Sort by score descending
    unique_scored.sort(key=lambda x: x["score"], reverse=True)
    result = unique_scored[:limit]

    return {
        "recommendations":  result,
        "count":            len(result),
        "driver_location":  {"lat": driver_lat, "lng": driver_lng},
    }
