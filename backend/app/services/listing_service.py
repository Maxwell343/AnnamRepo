from app.core.database import (
    db, 
    users_collection, 
    listings_collection,
    delivery_tasks_collection
)
from bson import ObjectId
from datetime import datetime
from typing import Optional, List, Dict, Any
from app.services.notification_service import send_whatsapp


def notify_ngos_new_listing(listing_data: dict):
    """Send WhatsApp notification to all NGOs about a new listing"""
    try:
        # Find all NGO users
        ngos = users_collection.find({"role": "ngo"})
        
        for ngo in ngos:
            ngo_id = str(ngo.get("_id"))
            # First try to get phone from ngo_settings (updated settings)
            ngo_settings = db["ngo_settings"].find_one({"ngo_id": ngo_id})
            
            # Check for phone in ngo_settings first, then fall back to user record
            phone = None
            if ngo_settings:
                phone = ngo_settings.get("organization_phone") or ngo_settings.get("admin_phone")
            
            # Fallback to user's phone if not in settings
            if not phone:
                phone = ngo.get("phone")
            
            if phone:
                # Create notification message
                produce_name = listing_data.get("produce_name", listing_data.get("title", "Food items"))
                quantity = listing_data.get("quantity", "")
                location = listing_data.get("location", listing_data.get("pickup_location", ""))
                
                message = f"""🌾 *New Food Listing Available!*

📦 *Item:* {produce_name}
📊 *Quantity:* {quantity}
📍 *Location:* {location}

A farmer has listed fresh produce for donation. Open the ANNAM app to claim this listing before it expires!

🙏 Thank you for helping reduce food waste."""

                # Send WhatsApp notification
                result = send_whatsapp(to_phone=phone, message=message)
                print(f"[NOTIFICATION] WhatsApp sent to NGO {ngo.get('name', 'Unknown')} ({phone}): {result}")
    except Exception as e:
        print(f"[ERROR] Failed to notify NGOs: {e}")


# ============== LISTINGS ==============

def create_listing(listing_data: dict) -> dict:
    """Create a new food listing"""
    # Ensure farmer_id is stored as string for consistent querying
    if "farmer_id" in listing_data:
        listing_data["farmer_id"] = str(listing_data["farmer_id"])
    
    listing_data["status"] = "available"
    listing_data["created_at"] = datetime.utcnow().isoformat()
    listing_data["updated_at"] = datetime.utcnow().isoformat()
    listing_data["claimed_by"] = None
    listing_data["assigned_driver"] = None
    
    result = listings_collection.insert_one(listing_data)
    listing_data["_id"] = result.inserted_id
    
    # Notify all NGOs about the new listing
    notify_ngos_new_listing(listing_data)
    
    return listing_data


def get_all_listings(filters: dict = None) -> List[dict]:
    """Get all listings with optional filters"""
    query = filters or {}
    listings = list(listings_collection.find(query).sort("created_at", -1))
    
    # Convert ObjectId to string
    for listing in listings:
        listing["id"] = str(listing["_id"])
        del listing["_id"]
    
    return listings


def get_listing_by_id(listing_id: str) -> Optional[dict]:
    """Get a single listing by ID"""
    try:
        listing = listings_collection.find_one({"_id": ObjectId(listing_id)})
        if listing:
            listing["id"] = str(listing["_id"])
            del listing["_id"]
        return listing
    except:
        return None


def get_listings_by_farmer(farmer_id: str) -> List[dict]:
    """Get all listings by a specific farmer"""
    return get_all_listings({"farmer_id": farmer_id})


def get_available_listings() -> List[dict]:
    """Get all available listings for NGOs to claim"""
    return get_all_listings({"status": "available"})


def update_listing(listing_id: str, update_data: dict) -> Optional[dict]:
    """Update a listing"""
    update_data["updated_at"] = datetime.utcnow().isoformat()
    
    try:
        result = listings_collection.find_one_and_update(
            {"_id": ObjectId(listing_id)},
            {"$set": update_data},
            return_document=True
        )
        if result:
            result["id"] = str(result["_id"])
            del result["_id"]
        return result
    except:
        return None


def delete_listing(listing_id: str) -> bool:
    """Delete a listing"""
    try:
        result = listings_collection.delete_one({"_id": ObjectId(listing_id)})
        return result.deleted_count > 0
    except:
        return False


def claim_listing(listing_id: str, ngo_data: dict) -> Optional[dict]:
    """NGO claims a listing"""
    update_data = {
        "status": "claimed",
        "claimed_by": ngo_data,
        "claimed_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    }
    return update_listing(listing_id, update_data)


def assign_driver_to_listing(listing_id: str, driver_data: dict) -> Optional[dict]:
    """Assign a driver to a claimed listing"""
    listing = get_listing_by_id(listing_id)
    if not listing:
        return None
    
    # Update listing status
    update_data = {
        "status": "assigned",
        "assigned_driver": driver_data,
        "assigned_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    }
    updated_listing = update_listing(listing_id, update_data)
    
    # Create delivery task
    if updated_listing:
        create_delivery_task(updated_listing, driver_data)
    
    return updated_listing


# ============== DELIVERY TASKS ==============

def create_delivery_task(listing: dict, driver_data: dict) -> dict:
    """Create a delivery task for a driver"""
    task = {
        "listing_id": listing["id"],
        "driver_id": driver_data["driver_id"],
        "driver_name": driver_data.get("driver_name"),
        "driver_phone": driver_data.get("driver_phone"),
        "vehicle_number": driver_data.get("vehicle_number"),
        
        "title": listing.get("title"),
        "type": listing.get("type"),
        "quantity": listing.get("quantity"),
        
        "farmer_id": listing.get("farmer_id"),
        "farmer_name": listing.get("farmer_name"),
        "farmer_phone": listing.get("farmer_phone"),
        "pickup_address": listing.get("pickup_address"),
        "pickup_time": listing.get("pickup_time"),
        
        "ngo_id": listing.get("claimed_by", {}).get("ngo_id"),
        "ngo_name": listing.get("claimed_by", {}).get("ngo_name"),
        "ngo_phone": listing.get("claimed_by", {}).get("ngo_phone"),
        "delivery_address": listing.get("claimed_by", {}).get("ngo_address"),
        
        "status": "pending",
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
        
        "picked_up_at": None,
        "delivered_at": None,
        "notes": listing.get("notes")
    }
    
    result = delivery_tasks_collection.insert_one(task)
    task["_id"] = result.inserted_id
    task["id"] = str(result.inserted_id)
    return task


def get_driver_tasks(driver_id: str) -> List[dict]:
    """Get all tasks assigned to a driver"""
    tasks = list(delivery_tasks_collection.find({"driver_id": driver_id}).sort("created_at", -1))
    
    for task in tasks:
        task["id"] = str(task["_id"])
        del task["_id"]
    
    return tasks


def get_task_by_id(task_id: str) -> Optional[dict]:
    """Get a single task by ID"""
    try:
        task = delivery_tasks_collection.find_one({"_id": ObjectId(task_id)})
        if task:
            task["id"] = str(task["_id"])
            del task["_id"]
        return task
    except:
        return None


def update_task_status(task_id: str, status: str, notes: str = None) -> Optional[dict]:
    """Update delivery task status"""
    update_data = {
        "status": status,
        "updated_at": datetime.utcnow().isoformat()
    }
    
    if notes:
        update_data["notes"] = notes
    
    if status == "picked_up":
        update_data["picked_up_at"] = datetime.utcnow().isoformat()
    elif status == "delivered":
        update_data["delivered_at"] = datetime.utcnow().isoformat()
    
    try:
        result = delivery_tasks_collection.find_one_and_update(
            {"_id": ObjectId(task_id)},
            {"$set": update_data},
            return_document=True
        )
        
        if result:
            result["id"] = str(result["_id"])
            del result["_id"]
            
            # Also update the listing status
            if result.get("listing_id"):
                update_listing(result["listing_id"], {"status": status})
        
        return result
    except:
        return None


def get_available_pickups() -> List[dict]:
    """Get all listings that are claimed but not yet assigned to a driver"""
    listings = get_all_listings({"status": "claimed"})
    return listings


# ============== EARNINGS ==============

def get_driver_earnings(driver_id: str) -> List[dict]:
    """Get earnings for a driver based on completed deliveries"""
    tasks = list(delivery_tasks_collection.find({
        "driver_id": driver_id,
        "status": "delivered"
    }).sort("delivered_at", -1))
    
    earnings = []
    for task in tasks:
        earnings.append({
            "id": str(task["_id"]),
            "date": task.get("delivered_at", task.get("created_at")),
            "deliveryId": str(task["_id"]),
            "title": task.get("title"),
            "from": task.get("pickup_address"),
            "to": task.get("delivery_address"),
            "distance": "N/A",  # Would need real distance calculation
            "amount": 100,  # Base amount - would be calculated based on distance/type
            "tip": 0,
            "status": "paid"
        })
    
    return earnings


# ============== STATS ==============

def get_farmer_stats(farmer_id: str) -> dict:
    """Get statistics for a farmer"""
    listings = get_listings_by_farmer(farmer_id)
    
    total = len(listings)
    available = len([l for l in listings if l.get("status") == "available"])
    claimed = len([l for l in listings if l.get("status") == "claimed"])
    delivered = len([l for l in listings if l.get("status") == "delivered"])
    
    return {
        "total_listings": total,
        "available": available,
        "claimed": claimed,
        "delivered": delivered
    }


def get_driver_stats(driver_id: str) -> dict:
    """Get statistics for a driver"""
    tasks = get_driver_tasks(driver_id)
    
    total = len(tasks)
    pending = len([t for t in tasks if t.get("status") == "pending"])
    in_progress = len([t for t in tasks if t.get("status") in ["picked_up", "in_transit"]])
    delivered = len([t for t in tasks if t.get("status") == "delivered"])
    
    # Calculate total earnings
    total_earnings = delivered * 100  # Simplified calculation
    
    return {
        "total_deliveries": total,
        "pending": pending,
        "in_progress": in_progress,
        "delivered": delivered,
        "total_earnings": total_earnings
    }


def get_ngo_stats(ngo_id: str) -> dict:
    """Get statistics for an NGO"""
    claimed_listings = get_all_listings({"claimed_by.ngo_id": ngo_id})
    
    total = len(claimed_listings)
    pending = len([l for l in claimed_listings if l.get("status") in ["claimed", "assigned"]])
    received = len([l for l in claimed_listings if l.get("status") == "delivered"])
    
    return {
        "total_claimed": total,
        "pending": pending,
        "received": received
    }
