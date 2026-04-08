"""
Mobility Routes
───────────────
Endpoints for the full Smart Mobility allocation & tracking pipeline.

  • NGO accepts a listing  → triggers driver allocation
  • Manual driver override
  • Driver accept / reject a delivery
  • Driver location ping during transit
  • Driver advances delivery lifecycle
  • Real-time delivery tracking
  • Delivery list queries
"""

import logging
from typing import Optional
from fastapi import APIRouter, HTTPException, Query

from app.models.delivery_model import (
    NGOAcceptRequest,
    DriverRespondRequest,
    DeliveryLocationUpdate,
    DeliveryStatusAdvance,
    ManualAssignRequest,
)
from app.services import allocation_service, tracking_service

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Mobility & Delivery"])


# ══════════════════════════════════════════════════════════════════════════════
# POST /ngo/accept-listing
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/ngo/accept-listing")
async def ngo_accept_listing(payload: NGOAcceptRequest):
    """
    An NGO accepts a listing (full or partial quantity).

    **This is the entry point that triggers auto driver allocation.**

    - Validates listing availability and remaining quantity
    - Finds the nearest idle driver via geo-fence (with progressive radius expansion)
    - Ranks candidates by spoilage-weighted priority score
    - Creates a `Delivery` document and fires a simulated push notification
    - Decrements `remaining_quantity`; marks listing `completed` when 0

    Returns the created delivery, assigned driver info, and updated listing.
    """
    try:
        result = allocation_service.assign_driver(
            listing_id=payload.listing_id,
            ngo_id=payload.ngo_id,
            ngo_name=payload.ngo_name,
            quantity=payload.quantity_accepted,
            ngo_phone=payload.ngo_phone,
            dest_lat=payload.dest_latitude,
            dest_lng=payload.dest_longitude,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.exception("ngo_accept_listing error")
        raise HTTPException(status_code=500, detail=str(exc))

    if "error" in result:
        # No drivers available → not a server error, communicate clearly
        raise HTTPException(
            status_code=503,
            detail={
                "code":    result["error"],
                "message": result["message"],
            },
        )

    return {
        "message":  "Driver successfully assigned.",
        "delivery": result["delivery"],
        "driver":   result["driver"],
        "listing":  result["listing"],
        "note":     (
            "The driver has been notified and has 120 seconds to accept. "
            "Track via GET /track-delivery/{delivery_id}."
        ),
    }


# ══════════════════════════════════════════════════════════════════════════════
# POST /assign-driver  (manual override)
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/assign-driver")
async def manual_assign_driver(payload: ManualAssignRequest):
    """
    Manually assign a specific driver to a listing (admin / ops override).
    The chosen driver must be **idle**.
    """
    from app.services.driver_service import get_driver_by_id
    from app.services.allocation_service import haversine

    driver = get_driver_by_id(payload.driver_id)
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found.")
    if driver["status"] != "idle":
        raise HTTPException(
            status_code=400,
            detail=f"Driver is not idle (current status: '{driver['status']}').",
        )

    # Inject the driver as the only candidate so assign_driver picks it
    listing = allocation_service._get_listing(payload.listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found.")

    pickup_lat = listing.get("latitude", 0.0)
    pickup_lng = listing.get("longitude", 0.0)
    dist = haversine(
        pickup_lat, pickup_lng,
        driver["latitude"], driver["longitude"]
    )
    driver["_distance_km"]    = round(dist, 3)
    driver["_priority_score"] = round(dist, 3)  # distance-only for manual

    try:
        result = allocation_service.assign_driver(
            listing_id=payload.listing_id,
            ngo_id=payload.ngo_id or "manual",
            ngo_name="Manual Assignment",
            quantity=payload.quantity,
            _ranked_candidates=[driver],
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    if "error" in result:
        raise HTTPException(status_code=400, detail=result["message"])

    return {
        "message":  "Manual driver assignment successful.",
        "delivery": result["delivery"],
        "driver":   result["driver"],
    }


# ══════════════════════════════════════════════════════════════════════════════
# POST /driver/respond
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/driver/respond")
async def driver_respond(payload: DriverRespondRequest):
    """
    Driver explicitly **accepts** or **rejects** an assigned delivery.

    - Accept  → status moves to `accepted`
    - Reject  → driver freed, system automatically tries the next ranked driver
    """
    try:
        result = tracking_service.driver_respond(
            delivery_id=payload.delivery_id,
            driver_id=payload.driver_id,
            accepted=payload.accepted,
            reason=payload.reason,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    return result


# ══════════════════════════════════════════════════════════════════════════════
# POST /delivery/update-location
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/delivery/update-location")
async def delivery_location_update(payload: DeliveryLocationUpdate):
    """
    GPS ping from the driver during active transit.

    - Appends a waypoint to `delivery.route`
    - Updates the driver's live location document
    - Only accepted for deliveries in `accepted` or `in_transit` status
    """
    try:
        result = tracking_service.record_location_update(
            delivery_id=payload.delivery_id,
            driver_id=payload.driver_id,
            lat=payload.latitude,
            lng=payload.longitude,
            heading=payload.heading,
            speed_kmh=payload.speed_kmh,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    return result


# ══════════════════════════════════════════════════════════════════════════════
# POST /delivery/advance-status
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/delivery/advance-status")
async def advance_delivery_status(payload: DeliveryStatusAdvance):
    """
    Driver advances the delivery lifecycle.

    Valid transitions:
    ```
    assigned → accepted → in_transit → delivered
    ```
    Completing (`delivered`) or failing (`failed`) automatically frees the driver.
    """
    try:
        result = tracking_service.advance_delivery_status(
            delivery_id=payload.delivery_id,
            driver_id=payload.driver_id,
            new_status=payload.new_status.value,
            notes=payload.notes,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    return result


# ══════════════════════════════════════════════════════════════════════════════
# GET /track-delivery/{delivery_id}
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/track-delivery/{delivery_id}")
async def track_delivery(delivery_id: str):
    """
    Real-time delivery tracking.

    Returns:
    - Full delivery document
    - Assigned driver info (current lat/lng)
    - Lifecycle timeline (event + timestamp)
    - Full GPS route array
    """
    try:
        result = tracking_service.get_delivery_track(delivery_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))

    return result


# ══════════════════════════════════════════════════════════════════════════════
# GET /deliveries
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/deliveries")
async def list_deliveries(
    driver_id:  Optional[str] = Query(None),
    listing_id: Optional[str] = Query(None),
    status:     Optional[str] = Query(None),
):
    """
    Query deliveries with optional filters.

    Examples:
    - `/deliveries?driver_id=abc` → all deliveries for a driver
    - `/deliveries?status=in_transit` → all active in-transit deliveries
    - `/deliveries?listing_id=xyz` → all partial pickups for a listing
    """
    deliveries = tracking_service.list_deliveries(
        driver_id=driver_id,
        listing_id=listing_id,
        status=status,
    )
    return {"deliveries": deliveries, "count": len(deliveries)}
