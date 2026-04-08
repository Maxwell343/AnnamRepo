"""
Driver Dispatch Routes
──────────────────────
API endpoints for the Ola-style cascade dispatch system.

  • Driver polls for incoming requests
  • Driver accepts / declines
  • Hotspot recommendations
"""

import logging
from typing import Optional
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
