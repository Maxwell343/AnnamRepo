"""
Driver Routes
─────────────
REST endpoints for driver registration, status management,
location updates, and availability queries.

Prefix: /driver  (or /available-drivers)
"""

import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Query

from app.models.driver_model import (
    DriverCreate,
    DriverStatusUpdate,
    DriverLocationUpdate,
)
from app.services import driver_service

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Drivers"])


# ══════════════════════════════════════════════════════════════════════════════
# POST /driver/register
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/driver/register", status_code=201)
async def register_driver(payload: DriverCreate):
    """
    Register a new driver in the system.

    - Initial status is **offline** — driver must call `/driver/update-status`
      with `status=idle` to start receiving assignments.
    """
    try:
        driver = driver_service.register_driver(payload.model_dump())
        return {
            "message": "Driver registered successfully.",
            "driver":  driver,
        }
    except Exception as exc:
        logger.exception("register_driver failed")
        raise HTTPException(status_code=500, detail=str(exc))


# ══════════════════════════════════════════════════════════════════════════════
# POST /driver/update-status
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/driver/update-status")
async def update_driver_status(payload: DriverStatusUpdate):
    """
    Driver manually toggles between **idle** (online, available) and
    **offline**.  The system (not the driver) sets the status to *busy*.

    - `idle`    → available for new delivery assignments
    - `offline` → not available; auto-set after 1 h of inactivity
    """
    if payload.status.value == "busy":
        raise HTTPException(
            status_code=400,
            detail="The 'busy' status is managed by the system, not by the driver.",
        )

    try:
        result = driver_service.update_driver_status(
            payload.driver_id, payload.status.value
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    if not result:
        raise HTTPException(status_code=404, detail="Driver not found.")

    return {
        "message": f"Status updated to '{payload.status.value}'.",
        "driver":  result,
    }


# ══════════════════════════════════════════════════════════════════════════════
# POST /driver/update-location
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/driver/update-location")
async def update_driver_location(payload: DriverLocationUpdate):
    """
    Periodic GPS ping from the driver app.
    Updates the driver's stored coordinates and bumps `last_active_time`
    (preventing auto-offline while the driver is physically active).
    """
    result = driver_service.update_driver_location(
        driver_id=payload.driver_id,
        lat=payload.latitude,
        lng=payload.longitude,
        heading=payload.heading,
        speed_kmh=payload.speed_kmh,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Driver not found.")

    return {
        "message": "Location updated.",
        "driver":  result,
    }


# ══════════════════════════════════════════════════════════════════════════════
# GET /available-drivers
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/available-drivers")
async def get_available_drivers(
    lat:       Optional[float] = Query(None, description="Pickup latitude"),
    lng:       Optional[float] = Query(None, description="Pickup longitude"),
    radius_km: float           = Query(10.0, description="Search radius in kilometres"),
    status:    Optional[str]   = Query(None, description="Filter by status (idle/busy/offline)"),
):
    """
    List drivers.

    - With `lat` + `lng` → returns only *idle* drivers within `radius_km`.
      The list is sorted by distance (nearest first).
    - Without coordinates → returns all drivers (optionally filtered by `status`).
    """
    from app.services.allocation_service import haversine

    if lat is not None and lng is not None:
        # Geo-filtered + distance-sorted
        idle = driver_service.get_idle_drivers()
        results = []
        for d in idle:
            dist = haversine(lat, lng, d["latitude"], d["longitude"])
            if dist <= radius_km:
                d["distance_km"] = round(dist, 3)
                results.append(d)
        results.sort(key=lambda d: d["distance_km"])
        return {
            "drivers":    results,
            "count":      len(results),
            "radius_km":  radius_km,
            "center":     {"lat": lat, "lng": lng},
        }

    # Flat list (optional status filter)
    drivers = driver_service.get_all_drivers(status_filter=status)
    return {"drivers": drivers, "count": len(drivers)}


# ══════════════════════════════════════════════════════════════════════════════
# GET /driver/{driver_id}
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/driver/{driver_id}")
async def get_driver(driver_id: str):
    """Fetch a single driver's profile."""
    driver = driver_service.get_driver_by_id(driver_id)
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found.")
    return {"driver": driver}
