from app.core.database import get_database
from typing import Optional, Dict, Any
from datetime import datetime
from bson import ObjectId

db = get_database()


# ==================== DRIVER SETTINGS ====================

async def get_driver_settings(driver_id: str) -> Optional[Dict]:
    """Get driver settings by driver ID"""
    settings = db.driver_settings.find_one({"driver_id": driver_id})
    if settings:
        settings["_id"] = str(settings["_id"])
    return settings


async def save_driver_settings(settings_data: Dict) -> Dict:
    """Save or update driver settings"""
    driver_id = settings_data.get("driver_id")
    existing = db.driver_settings.find_one({"driver_id": driver_id})
    
    settings_data["updated_at"] = datetime.utcnow().isoformat()
    
    if existing:
        db.driver_settings.update_one(
            {"driver_id": driver_id},
            {"$set": settings_data}
        )
        settings_data["_id"] = str(existing["_id"])
    else:
        settings_data["created_at"] = datetime.utcnow().isoformat()
        result = db.driver_settings.insert_one(settings_data)
        settings_data["_id"] = str(result.inserted_id)
    
    return settings_data


# ==================== FARMER SETTINGS ====================

async def get_farmer_settings(farmer_id: str) -> Optional[Dict]:
    """Get farmer settings by farmer ID"""
    settings = db.farmer_settings.find_one({"farmer_id": farmer_id})

    # Recovery path for legacy/mismatched records:
    # if profile wasn't linked by farmer_id, try to find by the user's email and relink.
    if not settings:
        try:
            user = db.users.find_one({"_id": ObjectId(farmer_id)}, {"email": 1})
            email = user.get("email") if user else None
            if email:
                settings = db.farmer_settings.find_one({"email": email})
                if settings and settings.get("farmer_id") != farmer_id:
                    db.farmer_settings.update_one(
                        {"_id": settings["_id"]},
                        {"$set": {"farmer_id": farmer_id, "updated_at": datetime.utcnow().isoformat()}}
                    )
                    settings["farmer_id"] = farmer_id
        except Exception:
            settings = None

    if settings:
        settings["_id"] = str(settings["_id"])
    return settings


async def save_farmer_settings(settings_data: Dict) -> Dict:
    """Save or update farmer settings"""
    farmer_id = settings_data.get("farmer_id")
    existing = db.farmer_settings.find_one({"farmer_id": farmer_id})

    # If nothing is linked by farmer_id yet, try matching an older record by email.
    if not existing and settings_data.get("email"):
        existing = db.farmer_settings.find_one({"email": settings_data.get("email")})
    
    settings_data["updated_at"] = datetime.utcnow().isoformat()
    
    if existing:
        db.farmer_settings.update_one(
            {"_id": existing["_id"]},
            {"$set": settings_data}
        )
        settings_data["_id"] = str(existing["_id"])
    else:
        settings_data["created_at"] = datetime.utcnow().isoformat()
        result = db.farmer_settings.insert_one(settings_data)
        settings_data["_id"] = str(result.inserted_id)
    
    return settings_data


# ==================== NGO SETTINGS ====================

async def get_ngo_settings(ngo_id: str) -> Optional[Dict]:
    """Get NGO settings by NGO ID"""
    settings = db.ngo_settings.find_one({"ngo_id": ngo_id})
    if settings:
        settings["_id"] = str(settings["_id"])
    return settings


async def save_ngo_settings(settings_data: Dict) -> Dict:
    """Save or update NGO settings"""
    ngo_id = settings_data.get("ngo_id")
    existing = db.ngo_settings.find_one({"ngo_id": ngo_id})
    
    settings_data["updated_at"] = datetime.utcnow().isoformat()
    
    if existing:
        db.ngo_settings.update_one(
            {"ngo_id": ngo_id},
            {"$set": settings_data}
        )
        settings_data["_id"] = str(existing["_id"])
    else:
        settings_data["created_at"] = datetime.utcnow().isoformat()
        result = db.ngo_settings.insert_one(settings_data)
        settings_data["_id"] = str(result.inserted_id)
    
    return settings_data


# ==================== USER PROFILE ====================

async def get_user_profile(user_id: str) -> Optional[Dict]:
    """Get user profile from users collection"""
    from bson import ObjectId
    try:
        user = db.users.find_one({"_id": ObjectId(user_id)})
        if user:
            user["_id"] = str(user["_id"])
            # Remove password from response
            user.pop("password", None)
        return user
    except:
        return None


async def update_user_profile(user_id: str, profile_data: Dict) -> Optional[Dict]:
    """Update user profile in users collection"""
    from bson import ObjectId
    try:
        # Don't allow updating password through this endpoint
        profile_data.pop("password", None)
        profile_data["updated_at"] = datetime.utcnow().isoformat()
        
        db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": profile_data}
        )
        
        user = db.users.find_one({"_id": ObjectId(user_id)})
        if user:
            user["_id"] = str(user["_id"])
            user.pop("password", None)
        return user
    except:
        return None


# ==================== ANALYTICS DATA ====================

async def get_farmer_analytics(farmer_id: str) -> Dict:
    """Get analytics data for a farmer"""
    import re

    def _parse_quantity_kg(value: object) -> float:
        if value is None:
            return 0.0

        text = str(value).strip()
        if not text:
            return 0.0

        match = re.search(r"\d+(?:\.\d+)?", text)
        if not match:
            return 0.0

        try:
            return float(match.group(0))
        except ValueError:
            return 0.0

    # Get all listings by this farmer (handle historical numeric farmer_id values too)
    farmer_query = {
        "$or": [
            {"farmer_id": farmer_id},
            {"farmer_id": int(farmer_id) if farmer_id.isdigit() else farmer_id},
        ]
    }
    listings = list(db.listings.find(farmer_query).sort("created_at", -1))

    # Make listing docs JSON-safe for API response consumers
    normalized_listings = []
    for listing in listings:
        listing_copy = dict(listing)
        if "_id" in listing_copy:
            listing_copy["id"] = str(listing_copy["_id"])
            del listing_copy["_id"]
        normalized_listings.append(listing_copy)

    total_donations = len(normalized_listings)
    total_quantity = sum(_parse_quantity_kg(l.get("quantity")) for l in normalized_listings)
    
    # Count by status
    active = sum(1 for l in normalized_listings if l.get("status") == "available")
    claimed = sum(1 for l in normalized_listings if l.get("status") == "claimed")
    delivered = sum(1 for l in normalized_listings if l.get("status") == "delivered")
    
    # Impact estimation (simplified)
    meals_provided = int(total_quantity * 5)  # Assume 5 meals per kg
    
    return {
        "farmer_id": farmer_id,
        "total_donations": total_donations,
        "total_quantity_kg": total_quantity,
        "active_listings": active,
        "claimed_listings": claimed,
        "delivered_listings": delivered,
        "meals_provided_estimate": meals_provided,
        "carbon_saved_kg": round(total_quantity * 2.5, 2),  # Estimate
        "listings": normalized_listings
    }


async def get_ngo_analytics(ngo_id: str) -> Dict:
    """Get analytics data for an NGO"""
    # Get all listings claimed by this NGO
    listings = list(db.listings.find({"claimed_by": ngo_id}))
    
    total_received = len(listings)
    total_quantity = sum(float(l.get("quantity", "0").split()[0]) for l in listings if l.get("quantity"))
    
    pending = sum(1 for l in listings if l.get("status") == "claimed")
    delivered = sum(1 for l in listings if l.get("status") == "delivered")
    
    meals_distributed = int(total_quantity * 5)
    
    return {
        "ngo_id": ngo_id,
        "total_received": total_received,
        "total_quantity_kg": total_quantity,
        "pending_deliveries": pending,
        "completed_deliveries": delivered,
        "meals_distributed_estimate": meals_distributed,
        "beneficiaries_served": int(meals_distributed / 3),  # 3 meals per person per day
        "listings": listings
    }


async def get_driver_analytics(driver_id: str) -> Dict:
    """Get analytics data for a driver"""
    # Get all delivery tasks for this driver
    tasks = list(db.delivery_tasks.find({"driver_id": driver_id}))
    
    total_deliveries = len(tasks)
    completed = sum(1 for t in tasks if t.get("status") == "delivered")
    in_progress = sum(1 for t in tasks if t.get("status") in ["picked_up", "in_transit"])
    pending = sum(1 for t in tasks if t.get("status") == "assigned")
    
    # Calculate total distance (if stored)
    total_distance = sum(float(t.get("distance", 0)) for t in tasks)
    
    # Calculate earnings
    total_earnings = sum(float(t.get("earnings", 0)) for t in tasks if t.get("status") == "delivered")
    
    return {
        "driver_id": driver_id,
        "total_deliveries": total_deliveries,
        "completed_deliveries": completed,
        "in_progress_deliveries": in_progress,
        "pending_deliveries": pending,
        "total_distance_km": round(total_distance, 2),
        "total_earnings": round(total_earnings, 2),
        "average_rating": 4.8,  # TODO: Implement ratings
        "tasks": tasks
    }
