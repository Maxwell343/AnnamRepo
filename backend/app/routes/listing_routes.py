from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from app.models.listing_model import (
    ListingCreate, 
    ListingUpdate, 
    ClaimRequest, 
    AssignDriverRequest,
    DeliveryStatusUpdate
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
    get_available_pickups,
    get_driver_earnings,
    get_farmer_stats,
    get_driver_stats,
    get_ngo_stats
)

router = APIRouter(prefix="/api", tags=["Listings"])


# ============== LISTINGS CRUD ==============

@router.post("/listings")
def create_new_listing(listing: ListingCreate):
    """Create a new food listing (Farmer)"""
    new_listing = create_listing(listing.dict())
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
    type: Optional[str] = Query(None)
):
    """Get all listings with optional filters"""
    filters = {}
    
    if farmer_id:
        filters["farmer_id"] = farmer_id
    if status:
        filters["status"] = status
    if type:
        filters["type"] = type
    
    listings = get_all_listings(filters) if filters else get_all_listings()
    
    return {
        "listings": listings,
        "count": len(listings)
    }


@router.get("/listings/available")
def get_available():
    """Get all available listings for NGOs"""
    listings = get_available_listings()
    return {
        "listings": listings,
        "count": len(listings)
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
