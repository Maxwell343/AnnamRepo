from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from app.models.listing_model import (
    ListingCreate, 
    ListingUpdate, 
    ClaimRequest, 
    AssignDriverRequest,
    DeliveryStatusUpdate,
    PickupAcceptRequest,
    DriverLocationUpdate,
)
from app.services.listing_service import (
    create_listing,
    get_all_listings,
    get_listing_by_id,
    get_listings_by_farmer,
    get_available_listings,
    update_listing,
    delete_listing,
    claim_listing,
    assign_driver_to_listing,
    get_driver_tasks,
    update_task_status,
    update_driver_location,
    accept_pickup,
    get_available_pickups,
    get_driver_earnings,
    get_farmer_stats,
    get_driver_stats,
    get_ngo_stats,
    run_shelf_life_prediction_async,
)

router = APIRouter(prefix="/api", tags=["Listings"])


# ============== LISTINGS CRUD ==============

@router.post("/listings")
async def create_new_listing(listing: ListingCreate):
    """Create a new food listing (Farmer) — includes ML shelf-life prediction"""
    listing_data = listing.dict()

    # Run async ML prediction before inserting
    listing_data = await run_shelf_life_prediction_async(listing_data)

    new_listing = create_listing(listing_data)
    return {
        "message": "Listing created successfully",
        "listing": {
            "id": str(new_listing["_id"]),
            **{k: v for k, v in new_listing.items() if k != "_id"}
        }
    }


@router.get("/listings")
def get_listings(
    farmer_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    type: Optional[str] = Query(None),
    include_expired: bool = Query(False, description="Include expired listings in results")
):
    """Get all listings with optional filters
    
    By default, expired listings are excluded. Set include_expired=true to show them.
    """
    filters = {}
    
    if farmer_id:
        # Handle both string and number farmer_id stored in DB
        filters["$or"] = [
            {"farmer_id": farmer_id},
            {"farmer_id": int(farmer_id) if farmer_id.isdigit() else farmer_id}
        ]
    if status:
        filters["status"] = status
    if type:
        filters["type"] = type
    
    listings = get_all_listings(filters, include_expired=include_expired) if filters else get_all_listings(include_expired=include_expired)
    
    return {
        "listings": listings,
        "count": len(listings)
    }


@router.get("/listings/available")
def get_available():
    """Get listings explicitly marked for NGO donation."""
    listings = get_all_listings({"donation_mode": True}, include_expired=False)
    listings = [listing for listing in listings if listing.get("status") == "available"]
    return {
        "listings": listings,
        "count": len(listings)
    }


@router.get("/listings/expired")
def get_expired_listings():
    """Get all expired listings (archived)"""
    listings = get_all_listings({"status": "expired"}, include_expired=True)
    return {
        "listings": listings,
        "count": len(listings)
    }


@router.get("/listings/expired/{farmer_id}")
def get_farmer_expired_listings(farmer_id: str):
    """Get expired listings for a specific farmer"""
    listings = get_all_listings({
        "farmer_id": farmer_id,
        "status": "expired"
    }, include_expired=True)
    return {
        "listings": listings,
        "count": len(listings)
    }


@router.get("/listings/claimed/{ngo_id}")
def get_claimed_by_ngo(ngo_id: str):
    """Get all listings claimed by a specific NGO, including historical records."""
    listings = get_all_listings(include_expired=True)

    def _is_claimed_by_ngo(claimed_by: object) -> bool:
        if not claimed_by:
            return False
        if isinstance(claimed_by, dict):
            claimed_ngo_id = claimed_by.get("ngo_id") or claimed_by.get("id")
            return str(claimed_ngo_id or "") == ngo_id
        return str(claimed_by) == ngo_id

    claimed_listings = [
        listing for listing in listings
        if _is_claimed_by_ngo(listing.get("claimed_by"))
    ]

    claimed_listings.sort(
        key=lambda listing: (
            listing.get("claimed_at")
            or listing.get("updated_at")
            or listing.get("created_at")
            or ""
        ),
        reverse=True,
    )

    return {
        "listings": claimed_listings,
        "count": len(claimed_listings)
    }


@router.get("/listings/{listing_id}")
def get_single_listing(listing_id: str):
    """Get a single listing by ID"""
    listing = get_listing_by_id(listing_id)
    
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    return listing


@router.put("/listings/{listing_id}")
def update_existing_listing(listing_id: str, listing: ListingUpdate):
    """Update a listing (Farmer)"""
    update_data = {k: v for k, v in listing.dict().items() if v is not None}
    
    updated = update_listing(listing_id, update_data)
    
    if not updated:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    return {
        "message": "Listing updated successfully",
        "listing": updated
    }


@router.delete("/listings/{listing_id}")
def delete_existing_listing(listing_id: str):
    """Delete a listing (Farmer)"""
    success = delete_listing(listing_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    return {"message": "Listing deleted successfully"}


# ============== CLAIMING & ASSIGNMENT ==============

@router.post("/listings/{listing_id}/claim")
def claim_a_listing(listing_id: str, claim: ClaimRequest):
    """NGO claims a listing"""
    listing = get_listing_by_id(listing_id)
    
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    if listing.get("status") != "available":
        raise HTTPException(status_code=400, detail="Listing is not available for claiming")

    if not bool(listing.get("donation_mode")):
        raise HTTPException(
            status_code=400,
            detail="Listing is not yet available for NGO donation. Farmer must mark it as donate first.",
        )
    
    updated = claim_listing(listing_id, claim.dict())
    
    return {
        "message": "Listing claimed successfully",
        "listing": updated
    }


@router.post("/listings/{listing_id}/assign-driver")
def assign_driver(listing_id: str, assignment: AssignDriverRequest):
    """Assign a driver to a claimed listing"""
    listing = get_listing_by_id(listing_id)
    
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    if listing.get("status") != "claimed":
        raise HTTPException(status_code=400, detail="Listing must be claimed before assigning a driver")
    
    updated = assign_driver_to_listing(listing_id, assignment.dict())
    
    return {
        "message": "Driver assigned successfully",
        "listing": updated
    }


# ============== DRIVER TASKS ==============

@router.get("/drivers/{driver_id}/tasks")
def get_driver_delivery_tasks(driver_id: str):
    """Get all delivery tasks for a driver"""
    tasks = get_driver_tasks(driver_id)
    
    return {
        "tasks": tasks,
        "count": len(tasks)
    }


@router.put("/delivery-tasks/{task_id}/status")
def update_delivery_status(task_id: str, status_update: DeliveryStatusUpdate):
    """Update delivery task status"""
    updated = update_task_status(task_id, status_update.status, status_update.notes)
    
    if not updated:
        raise HTTPException(status_code=404, detail="Task not found")
    
    return {
        "message": f"Task status updated to {status_update.status}",
        "task": updated
    }


# ============== AVAILABLE PICKUPS ==============

@router.get("/available-pickups")
def get_pickups_for_drivers():
    """Get all claimed listings available for pickup (for drivers)"""
    pickups = get_available_pickups()
    
    return {
        "pickups": pickups,
        "count": len(pickups)
    }


@router.post("/pickups/{listing_id}/accept")
def accept_pickup_for_driver(listing_id: str, payload: PickupAcceptRequest):
    """Driver accepts a claimed listing for pickup and gets assigned."""
    listing = get_listing_by_id(listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    if listing.get("status") != "claimed":
        raise HTTPException(status_code=400, detail="Only claimed listings can be accepted")

    accepted = accept_pickup(listing_id, payload.dict())
    if not accepted:
        raise HTTPException(status_code=400, detail="Unable to accept pickup")

    return {
        "message": "Pickup accepted successfully",
        "listing": accepted,
    }


@router.get("/listings/{listing_id}/tracking")
def get_listing_tracking(listing_id: str):
    """Get merged listing + delivery-task tracking state for NGO/customer views."""
    listing = get_listing_by_id(listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    task = None
    for item in get_driver_tasks(str(listing.get("assigned_driver", {}).get("driver_id", ""))):
        if str(item.get("listing_id")) == str(listing_id):
            task = item
            break

    return {
        "listing": listing,
        "task": task,
        "driver_location": task.get("current_location") if task else None,
    }


@router.put("/delivery-tasks/{task_id}/location")
def update_task_driver_location(task_id: str, payload: DriverLocationUpdate):
    """Update driver's live location for a task."""
    updated = update_driver_location(task_id, payload.dict())
    if not updated:
        raise HTTPException(status_code=404, detail="Task not found")

    return {
        "message": "Driver location updated",
        "task": updated,
        "driver_location": updated.get("current_location"),
    }


# ============== EARNINGS ==============

@router.get("/drivers/{driver_id}/earnings")
def get_earnings(driver_id: str):
    """Get earnings for a driver"""
    earnings = get_driver_earnings(driver_id)
    
    total = sum(e.get("amount", 0) + e.get("tip", 0) for e in earnings)
    
    return {
        "earnings": earnings,
        "total": total,
        "count": len(earnings)
    }


# ============== STATS ==============

@router.get("/stats/farmer/{farmer_id}")
def farmer_stats(farmer_id: str):
    """Get statistics for a farmer"""
    stats = get_farmer_stats(farmer_id)
    return stats


@router.get("/stats/driver/{driver_id}")
def driver_stats(driver_id: str):
    """Get statistics for a driver"""
    stats = get_driver_stats(driver_id)
    return stats


@router.get("/stats/ngo/{ngo_id}")
def ngo_stats(ngo_id: str):
    """Get statistics for an NGO"""
    stats = get_ngo_stats(ngo_id)
    return stats


# ============== FARMER DASHBOARD ==============

@router.get("/farmer/{farmer_id}/dashboard")
def farmer_dashboard(farmer_id: str):
    """Get aggregated farmer dashboard data — stats, recent listings, activity timeline"""
    from datetime import datetime

    # Get all farmer listings (including expired for full stats)
    all_listings = get_all_listings({
        "$or": [
            {"farmer_id": farmer_id},
            {"farmer_id": int(farmer_id) if farmer_id.isdigit() else farmer_id}
        ]
    }, include_expired=True)

    # Active (non-expired) listings
    active_listings = [l for l in all_listings if l.get("status") != "expired"]

    # Counts
    total = len(all_listings)
    available = len([l for l in active_listings if l.get("status") == "available"])
    claimed = len([l for l in active_listings if l.get("status") == "claimed"])
    assigned = len([l for l in active_listings if l.get("status") in ("assigned", "in_transit")])
    delivered = len([l for l in all_listings if l.get("status") == "delivered"])
    expired = len([l for l in all_listings if l.get("status") == "expired"])

    # Total quantity donated (try to parse numeric part)
    total_kg = 0
    for l in all_listings:
        qty = l.get("quantity", "0")
        try:
            import re
            nums = re.findall(r"[\d.]+", str(qty))
            if nums:
                total_kg += float(nums[0])
        except:
            pass

    # Claim rate
    claim_rate = round((claimed + assigned + delivered) / total * 100) if total > 0 else 0

    # Recent 5 listings (sorted by created_at desc)
    recent_listings = sorted(
        active_listings,
        key=lambda x: x.get("created_at", ""),
        reverse=True
    )[:5]

    # Activity timeline from all listings
    activities = []
    for l in sorted(all_listings, key=lambda x: x.get("updated_at", x.get("created_at", "")), reverse=True)[:10]:
        status = l.get("status", "available")
        action_map = {
            "available": "Listed",
            "claimed": "Claimed by NGO",
            "assigned": "Driver Assigned",
            "in_transit": "In Transit",
            "delivered": "Delivered",
            "expired": "Expired"
        }
        icon_map = {
            "available": "📦",
            "claimed": "🤝",
            "assigned": "🚚",
            "in_transit": "🚛",
            "delivered": "✅",
            "expired": "⏰"
        }
        activities.append({
            "id": l.get("id"),
            "title": l.get("title", "Untitled"),
            "action": action_map.get(status, status),
            "icon": icon_map.get(status, "📋"),
            "status": status,
            "quantity": l.get("quantity", ""),
            "type": l.get("type", "Other"),
            "time": l.get("updated_at") or l.get("created_at") or ""
        })

    return {
        "stats": {
            "total": total,
            "available": available,
            "claimed": claimed,
            "assigned": assigned,
            "delivered": delivered,
            "expired": expired,
            "total_kg": round(total_kg, 1),
            "claim_rate": claim_rate,
            "active": len(active_listings),
        },
        "recent_listings": recent_listings,
        "activities": activities,
    }


# ============== AI SYSTEM (Hackathon Upgrades) ==============

@router.get("/farmer/{farmer_id}/nudges")
def get_farmer_nudges(farmer_id: str):
    """Get active AI recommendations (One-Click Fixes) with AI Confidence Score."""
    from datetime import datetime
    import random
    
    # 1. Look for available items expiring soon
    all_listings = get_all_listings({
        "$or": [
            {"farmer_id": farmer_id},
            {"farmer_id": int(farmer_id) if farmer_id.isdigit() else farmer_id}
        ]
    })
    
    available_listings = [l for l in all_listings if l.get("status") == "available"]
    
    nudges = []
    
    for l in available_listings:
        # Check expiry
        expiry_str = l.get("expiry_date") or l.get("expiry")
        if not expiry_str: continue
        
        try:
            # Simple parse
            from dateutil import parser
            expiry = parser.parse(expiry_str, fuzzy=True, dayfirst=True)
            now = datetime.now()
            diff_hours = (expiry - now).total_seconds() / 3600
            
            if 0 < diff_hours < 24:
                # Need an urgent action!
                conf_score = min(99, int(max(85, 100 - (diff_hours * 1.5))))  # e.g., 94%
                
                nudges.append({
                    "id": f"nudge_spoilage_{l.get('id')}",
                    "type": "spoilage_risk",
                    "title": f"High Spoilage Risk Detected ({conf_score}% AI Confidence)",
                    "message": f"You have {l.get('quantity', 'some')} of {l.get('title')} with {int(diff_hours)}h left. Regional buyer activity is exceptionally low today.",
                    "listing_id": l.get("id"),
                    "suggested_action": "Drop price by 20% & Ping Local NGOs",
                    "action_value": "price_drop_20",
                    "confidence_score": conf_score
                })
        except:
            pass
            
    # Fake one for demonstration if list is empty
    if not nudges:
        nudges.append({
            "id": "demo_nudge_1",
            "type": "market_opportunity",
            "title": "Market Opportunity (92% AI Confidence)",
            "message": "We predict a shortage of Vegetables in your district tomorrow. Consider enabling 'Autopilot' on your Active Listings to maximize yielding.",
            "suggested_action": "Enable Autopilot Setup",
            "action_value": "enable_autopilot",
            "confidence_score": 92
        })
        
    return {"nudges": nudges}

