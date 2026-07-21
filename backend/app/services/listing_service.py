from app.core.database import (
    db, 
    users_collection, 
    listings_collection,
    delivery_tasks_collection
)
from bson import ObjectId
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Dict, Any
from app.services.notification_service import send_whatsapp
from app.services.expiry_engine import (
    compute_expires_at,
    compute_geo_cluster_tag,
    enrich_listing,
    mark_expired_listings_batch as engine_mark_expired,
    _parse_quantity_kg,
)
import asyncio
import re
import math


DONATION_ELIGIBILITY_HOURS = 24


def _parse_iso_datetime(value: Any) -> Optional[datetime]:
    """Parse ISO-like datetime strings and normalize to UTC-aware datetime."""
    if not value:
        return None

    if isinstance(value, datetime):
        dt = value
    else:
        try:
            dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        except Exception:
            return None

    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)

    return dt.astimezone(timezone.utc)


def get_listing_age_hours(listing: dict) -> float:
    """Return listing age in hours based on created_at; 0 when unavailable/invalid."""
    created_at = _parse_iso_datetime(listing.get("created_at"))
    if not created_at:
        return 0.0

    now = datetime.now(timezone.utc)
    age_hours = (now - created_at).total_seconds() / 3600
    return max(0.0, round(age_hours, 2))


def can_farmer_donate_listing(listing: dict) -> bool:
    """A listing can be donated when remaining shelf life ≤ 24h, while still available."""
    if listing.get("status") != "available":
        return False
    if bool(listing.get("donation_mode")):
        return False
    # Use hours_remaining (set by enrich_listing) or remaining_shelf_life_hours
    shelf_hours = listing.get("hours_remaining") or listing.get("remaining_shelf_life_hours")
    if shelf_hours is None:
        return False
    return float(shelf_hours) <= DONATION_ELIGIBILITY_HOURS


def is_listing_expired(listing: dict) -> bool:
    """Check if a listing has expired — delegates to expiry engine."""
    expires_at = listing.get("expires_at")
    if expires_at:
        from app.services.expiry_engine import compute_hours_remaining
        return compute_hours_remaining(expires_at) <= 0

    # Fallback: old-style expiry_date parsing
    expiry_date_str = listing.get("expiry_date") or listing.get("expiry")
    created_at_str = listing.get("created_at")
    if not expiry_date_str:
        return False
    try:
        expiry_dt = None
        if isinstance(expiry_date_str, str) and "T" in expiry_date_str:
            expiry_dt = datetime.fromisoformat(expiry_date_str.replace("Z", "+00:00"))
        elif isinstance(expiry_date_str, str) and len(expiry_date_str) == 10 and expiry_date_str.count("-") == 2:
            try:
                expiry_dt = datetime.fromisoformat(expiry_date_str)
                expiry_dt = expiry_dt.replace(hour=23, minute=59, second=59)
            except:
                pass
        elif isinstance(expiry_date_str, str):
            match = re.match(r'(\d+)\s*(day|hour|minute)s?', expiry_date_str.lower().strip())
            if match:
                value = int(match.group(1))
                unit = match.group(2).lower()
                base_time = datetime.utcnow()
                if created_at_str:
                    try:
                        base_time = datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
                    except:
                        base_time = datetime.utcnow()
                if unit in ("day", "days"):
                    expiry_dt = base_time + timedelta(days=value)
                elif unit in ("hour", "hours"):
                    expiry_dt = base_time + timedelta(hours=value)
                elif unit in ("minute", "minutes"):
                    expiry_dt = base_time + timedelta(minutes=value)
        if not expiry_dt:
            return False
        now = datetime.utcnow() if expiry_dt.tzinfo is None else datetime.now(expiry_dt.tzinfo)
        return now > expiry_dt
    except Exception as e:
        print(f"[WARNING] Failed to parse expiry date '{expiry_date_str}': {e}")
        return False


def _safe_float(value: Any) -> Optional[float]:
    try:
        return float(value)
    except Exception:
        return None


def _extract_lat_lng_from_location(location: Any) -> tuple[Optional[float], Optional[float]]:
    if not isinstance(location, dict):
        return None, None

    coords = location.get("coordinates") or {}
    lat = (
        location.get("lat")
        or location.get("latitude")
        or coords.get("lat")
        or coords.get("latitude")
    )
    lng = (
        location.get("lng")
        or location.get("longitude")
        or coords.get("lng")
        or coords.get("longitude")
    )
    return _safe_float(lat), _safe_float(lng)


def _extract_lat_lng_from_text(text: Any) -> tuple[Optional[float], Optional[float]]:
    if not text:
        return None, None

    match = re.search(r"(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)", str(text))
    if not match:
        return None, None

    first = _safe_float(match.group(1))
    second = _safe_float(match.group(2))
    if first is None or second is None:
        return None, None

    lat = first
    lng = second
    if abs(lat) > 90 and abs(lng) <= 90:
        lat, lng = lng, lat

    if abs(lat) > 90 or abs(lng) > 180:
        return None, None

    return lat, lng


def mark_expired_listings() -> int:
    """Mark all expired listings — delegates to expiry engine."""
    return engine_mark_expired()


def notify_ngos_new_listing(listing_data: dict):
    """Send WhatsApp notification to all NGOs about a donation-ready listing."""
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
                
                message = f"""🌾 *New Donation Listing Available!*

📦 *Item:* {produce_name}
📊 *Quantity:* {quantity}
📍 *Location:* {location}

                A farmer has marked this produce for donation. Open the ANNAM app to claim this listing before it expires!

🙏 Thank you for helping reduce food waste."""

                # Send WhatsApp notification
                result = send_whatsapp(to_phone=phone, message=message)
                print(f"[NOTIFICATION] WhatsApp sent to NGO {ngo.get('name', 'Unknown')} ({phone}): {result}")
    except Exception as e:
        print(f"[ERROR] Failed to notify NGOs: {e}")


# ============== LISTINGS ==============

def _run_shelf_life_prediction(listing_data: dict) -> dict:
    """Run ML shelf-life prediction if the listing has the required fields."""
    storage_type = listing_data.get("storage_type")
    harvest_dt = listing_data.get("harvest_datetime")
    lat = listing_data.get("latitude")
    lng = listing_data.get("longitude")

    if not all([storage_type, harvest_dt, lat, lng]):
        return listing_data

    item_name = listing_data.get("title", "")
    try:
        from app.services.shelf_life_service import predict_shelf_life
        result = asyncio.get_event_loop().run_until_complete(
            predict_shelf_life(item_name, storage_type, float(lat), float(lng), harvest_dt)
        )
        listing_data["remaining_shelf_life_hours"] = result["remaining_shelf_life_hours"]
        listing_data["freshness_status"] = result["freshness_status"]
        listing_data["base_shelf_life_hours"] = result["base_shelf_life_hours"]
        listing_data["prediction_weather"] = result["weather"]
        listing_data["hours_since_harvest"] = result["hours_since_harvest"]
        print(f"[ML] Predicted shelf life for '{item_name}': {result['remaining_shelf_life_hours']}h ({result['freshness_status']})")
    except Exception as exc:
        print(f"[ML] Prediction failed for '{item_name}': {exc}")

    return listing_data


async def run_shelf_life_prediction_async(listing_data: dict) -> dict:
    """Async version of shelf-life prediction for use in async routes."""
    storage_type = listing_data.get("storage_type")
    harvest_dt = listing_data.get("harvest_datetime")
    lat = listing_data.get("latitude")
    lng = listing_data.get("longitude")

    if not all([storage_type, harvest_dt, lat, lng]):
        return listing_data

    item_name = listing_data.get("title", "")
    try:
        from app.services.shelf_life_service import predict_shelf_life
        result = await predict_shelf_life(
            item_name, storage_type, float(lat), float(lng), harvest_dt
        )
        listing_data["remaining_shelf_life_hours"] = result["remaining_shelf_life_hours"]
        listing_data["freshness_status"] = result["freshness_status"]
        listing_data["base_shelf_life_hours"] = result["base_shelf_life_hours"]
        listing_data["prediction_weather"] = result["weather"]
        listing_data["hours_since_harvest"] = result["hours_since_harvest"]
        print(f"[ML] Predicted shelf life for '{item_name}': {result['remaining_shelf_life_hours']}h ({result['freshness_status']})")
    except Exception as exc:
        print(f"[ML] Prediction failed for '{item_name}': {exc}")

    return listing_data


def create_listing(listing_data: dict) -> dict:
    """Create a new food listing with ML shelf-life prediction, expiry engine, and geo tagging."""
    # Ensure farmer_id is stored as string for consistent querying
    if "farmer_id" in listing_data:
        listing_data["farmer_id"] = str(listing_data["farmer_id"])
    
    listing_data["status"] = "available"
    listing_data["created_at"] = datetime.utcnow().isoformat()
    listing_data["updated_at"] = datetime.utcnow().isoformat()
    listing_data["claimed_by"] = None
    listing_data["assigned_driver"] = None

    # Normalize pickup address/coordinates from location payloads
    location = listing_data.get("location")
    if not listing_data.get("pickup_address") and isinstance(location, dict):
        address = location.get("address")
        if address:
            listing_data["pickup_address"] = address

    if not listing_data.get("pickup_location") and listing_data.get("pickup_address"):
        listing_data["pickup_location"] = listing_data.get("pickup_address")

    lat = listing_data.get("latitude")
    lng = listing_data.get("longitude")
    if lat is None or lng is None:
        loc_lat, loc_lng = _extract_lat_lng_from_location(location)
        lat = loc_lat if lat is None else lat
        lng = loc_lng if lng is None else lng

    if lat is None or lng is None:
        text_lat, text_lng = _extract_lat_lng_from_text(listing_data.get("pickup_address"))
        lat = text_lat if lat is None else lat
        lng = text_lng if lng is None else lng

    if lat is not None:
        listing_data["latitude"] = lat
    if lng is not None:
        listing_data["longitude"] = lng

    # Run ML shelf-life prediction only if not already done (async route does it first)
    if "remaining_shelf_life_hours" not in listing_data:
        listing_data = _run_shelf_life_prediction(listing_data)

    # If ML prediction failed or didn't run, fallback to manual shelfLife
    if "remaining_shelf_life_hours" not in listing_data:
        shelf_days = float(listing_data.get("shelfLife") or listing_data.get("shelf_life") or 5)
        if shelf_days > 0:
            listing_data["remaining_shelf_life_hours"] = shelf_days * 24

    # ── Expiry Engine: compute expires_at ──
    shelf_hours = listing_data.get("remaining_shelf_life_hours")
    if shelf_hours:
        listing_data["expires_at"] = compute_expires_at(
            listing_data["created_at"], float(shelf_hours)
        )
    
    # ── Store original_price ──
    price = listing_data.get("price")
    if price is not None and "original_price" not in listing_data:
        listing_data["original_price"] = price

    # ── Parse and store quantity_kg ──
    quantity = listing_data.get("quantity", 0)
    listing_data["quantity_kg"] = _parse_quantity_kg(quantity)

    # ── Geo cluster tag ──
    lat = listing_data.get("latitude")
    lng = listing_data.get("longitude")
    pincode = listing_data.get("pincode")
    listing_data["geo_cluster_tag"] = compute_geo_cluster_tag(lat, lng, pincode)

    # ── Initialize rescue fields ──
    listing_data["donation_mode"] = False
    listing_data["rescue_action"] = None
    listing_data["allow_auto_donate"] = bool(listing_data.get("allow_auto_donate", False))
    listing_data["coordinates"] = {"lat": lat, "lng": lng} if lat and lng else None
    
    result = listings_collection.insert_one(listing_data)
    listing_data["_id"] = result.inserted_id
    
    # ── Sync to Marketplace Collection ──
    try:
        from app.core.database import marketplace_listings_collection
        from bson import ObjectId
        
        # Enforce marketplace schema
        marketplace_doc = {
            # Core references
            "_id": ObjectId(),
            "farmer_id": str(listing_data.get("farmer_id", "unknown")),
            "title": str(listing_data.get("title", "")),
            "description": str(listing_data.get("description", str(listing_data.get("notes", "")))),
            "type": str(listing_data.get("type", "other")),
            "quantity": float(listing_data.get("quantity", 0)),
            "unit": str(listing_data.get("unit", "kg")),
            "image": str(listing_data.get("image", "")),
            
            # Nested schemas
            "pricing": {
                "original_price": float(listing_data.get("price", 0)),
                "current_price": float(listing_data.get("price", 0)),
                "unit": str(listing_data.get("unit", "kg")),
                "min_order_quantity": 1
            },
            "location": {
                "address": str(listing_data.get("pickup_address", listing_data.get("location", ""))),
                "coordinates": listing_data.get("coordinates", {"lat": listing_data.get("latitude"), "lng": listing_data.get("longitude")}) if listing_data.get("latitude") else None,
                "district": str(listing_data.get("pickup_district", "N/A")),
                "state": str(listing_data.get("pickup_state", "N/A")),
                "pincode": str(listing_data.get("pincode", "110001"))
            },
            "spoilage_indicator": {
                "level": listing_data.get("freshness_status", "fresh").lower() if listing_data.get("freshness_status") != "SAFE" else "good",
                "hours_remaining": listing_data.get("remaining_shelf_life_hours", 168),
                "message": f"{listing_data.get('remaining_shelf_life_hours', 168)}h remaining",
                "color": "#64DD17",
                "percentage": 100.0
            },
            "farmer_profile": {
                "id": str(listing_data.get("farmer_id", "unknown")),
                "name": str(listing_data.get("farmer_name", "Farmer")),
                "verified": True,
                "rating": 4.5
            },
            
            # Simple fields
            "status": "active",
            "categories": ["fresh_produce", "ngo_rescue"] if listing_data.get("freshness_status") in ["URGENT", "CRITICAL"] else ["fresh_produce"],
            "rescue_priority": "critical" if listing_data.get("freshness_status") == "CRITICAL" else "high" if listing_data.get("freshness_status") == "URGENT" else "low",
            "created_at": listing_data.get("created_at"),
            "updated_at": listing_data.get("updated_at"),
            "expires_at": listing_data.get("expires_at"),
            
            "rescue_info": {
                "urgencyStatus": listing_data.get("freshness_status", "safe").lower(),
                "hoursRemaining": listing_data.get("remaining_shelf_life_hours", 168),
                "donationMode": False,
                "isRescue": listing_data.get("freshness_status") in ["URGENT", "CRITICAL"]
            }
        }
        
        # Override with pure string mapping just in case mapping above broke types
        marketplace_listings_collection.insert_one(marketplace_doc)
        print(f"[MARKETPLACE SYNC] Successfully synced listing {result.inserted_id} to marketplace")
    except Exception as e:
        print(f"[MARKETPLACE SYNC] Failed to sync to marketplace: {e}")
    
    return listing_data


def get_all_listings(filters: dict = None, include_expired: bool = False) -> List[dict]:
    """Get all listings with optional filters
    
    Args:
        filters: Optional MongoDB filter criteria
        include_expired: If False (default), excludes expired listings from results
    """
    # First, mark any newly expired listings
    mark_expired_listings()
    
    query = dict(filters) if filters else {}
    
    # Exclude expired listings by default
    if not include_expired:
        if "$or" in query or "status" in query or "$and" in query:
            query = {"$and": [query.copy(), {"status": {"$ne": "expired"}}]}
        else:
            query["status"] = {"$ne": "expired"}
    
    listings = list(listings_collection.find(query).sort("created_at", -1))
    
    enriched_listings = []
    # Enrich every listing with dynamic urgency/discount fields
    for listing in listings:
        listing["id"] = str(listing["_id"])
        del listing["_id"]
        enrich_listing(listing)

        listing_age_hours = get_listing_age_hours(listing)
        listing["hours_since_listing"] = round(listing_age_hours, 1)
        listing["donate_available"] = can_farmer_donate_listing(listing)
        # donate_available_in_hours = how many hours until shelf life drops to 24h
        shelf_hours = listing.get("hours_remaining") or listing.get("remaining_shelf_life_hours") or 999
        listing["donate_available_in_hours"] = round(max(0.0, float(shelf_hours) - DONATION_ELIGIBILITY_HOURS), 1)
        
        # Strictly filter out all expired listings, including legacy records
        # that may only have expiry/expiry_date and stale status values.
        if not include_expired:
            if (
                listing.get("status") == "expired"
                or listing.get("hours_remaining", 1) <= 0
                or listing.get("urgency_status") == "expired"
                or is_listing_expired(listing)
            ):
                continue
                
        enriched_listings.append(listing)
    
    return enriched_listings


def get_listing_by_id(listing_id: str) -> Optional[dict]:
    """Get a single listing by ID"""
    try:
        # Mark any expired listings first
        mark_expired_listings()
        
        listing = listings_collection.find_one({"_id": ObjectId(listing_id)})
        if listing:
            listing["id"] = str(listing["_id"])
            del listing["_id"]
            enrich_listing(listing)
            listing_age_hours = get_listing_age_hours(listing)
            listing["hours_since_listing"] = round(listing_age_hours, 1)
            listing["donate_available"] = can_farmer_donate_listing(listing)
            shelf_hours = listing.get("hours_remaining") or listing.get("remaining_shelf_life_hours") or 999
            listing["donate_available_in_hours"] = round(max(0.0, float(shelf_hours) - DONATION_ELIGIBILITY_HOURS), 1)
        return listing
    except:
        return None


def get_listings_by_farmer(farmer_id: str) -> List[dict]:
    """Get all listings by a specific farmer (excludes expired by default)"""
    return get_all_listings({"farmer_id": farmer_id}, include_expired=False)


def get_available_listings() -> List[dict]:
    """Get all available listings for NGOs to claim (excludes expired)"""
    # Mark any newly expired listings
    mark_expired_listings()
    
    return get_all_listings({"status": "available"}, include_expired=False)


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


def accept_pickup(listing_id: str, driver_data: dict) -> Optional[dict]:
    """Driver accepts a claimed pickup and gets assigned to the listing."""
    listing = get_listing_by_id(listing_id)
    if not listing:
        return None

    if listing.get("status") != "claimed":
        return None

    payload = {
        "driver_id": str(driver_data.get("driver_id", "")),
        "driver_name": driver_data.get("driver_name") or "Driver",
        "driver_phone": driver_data.get("driver_phone"),
        "vehicle_number": driver_data.get("vehicle_number"),
    }
    return assign_driver_to_listing(listing_id, payload)


# ============== DELIVERY TASKS ==============

def create_delivery_task(listing: dict, driver_data: dict) -> dict:
    """Create a delivery task for a driver"""
    listing_location = listing.get("location") or {}
    if not isinstance(listing_location, dict):
        listing_location = {}
    listing_coords = listing.get("coordinates") or {}
    if not isinstance(listing_coords, dict):
        listing_coords = {}
    location_coords = listing_location.get("coordinates") or {}
    if not isinstance(location_coords, dict):
        location_coords = {}

    claimed_by = listing.get("claimed_by") or {}
    claimed_location = claimed_by.get("location") if isinstance(claimed_by, dict) else {}
    if not isinstance(claimed_location, dict):
        claimed_location = {}
    claimed_coords = claimed_location.get("coordinates") or {}
    if not isinstance(claimed_coords, dict):
        claimed_coords = {}

    pickup_lat = (
        listing.get("pickup_lat")
        or listing.get("latitude")
        or listing_coords.get("lat")
        or listing_location.get("lat")
        or listing_location.get("latitude")
        or location_coords.get("lat")
        or location_coords.get("latitude")
    )
    pickup_lng = (
        listing.get("pickup_lng")
        or listing.get("longitude")
        or listing_coords.get("lng")
        or listing_location.get("lng")
        or listing_location.get("longitude")
        or location_coords.get("lng")
        or location_coords.get("longitude")
    )

    delivery_lat = (
        listing.get("delivery_lat")
        or claimed_location.get("lat")
        or claimed_location.get("latitude")
        or claimed_coords.get("lat")
        or claimed_coords.get("latitude")
        or (claimed_by.get("gps_lat") if isinstance(claimed_by, dict) else None)
    )
    delivery_lng = (
        listing.get("delivery_lng")
        or claimed_location.get("lng")
        or claimed_location.get("longitude")
        or claimed_coords.get("lng")
        or claimed_coords.get("longitude")
        or (claimed_by.get("gps_lng") if isinstance(claimed_by, dict) else None)
    )

    pickup_lat = _safe_float(pickup_lat)
    pickup_lng = _safe_float(pickup_lng)
    delivery_lat = _safe_float(delivery_lat)
    delivery_lng = _safe_float(delivery_lng)

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
        "pickup_location": listing.get("pickup_location") or listing.get("pickup_address"),
        "pickup_lat": pickup_lat,
        "pickup_lng": pickup_lng,
        "pickup_time": listing.get("pickup_time"),
        
        "ngo_id": claimed_by.get("ngo_id") if isinstance(claimed_by, dict) else str(claimed_by) if claimed_by else None,
        "ngo_name": claimed_by.get("ngo_name") if isinstance(claimed_by, dict) else None,
        "ngo_phone": claimed_by.get("ngo_phone") if isinstance(claimed_by, dict) else None,
        "delivery_address": claimed_by.get("ngo_address") if isinstance(claimed_by, dict) else None,
        "delivery_location": claimed_by.get("ngo_address") if isinstance(claimed_by, dict) else None,
        "delivery_lat": delivery_lat,
        "delivery_lng": delivery_lng,
        
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
                listing_update = {"status": status}
                if status == "delivered":
                    listing_update["delivered_at"] = update_data.get("delivered_at")
                elif status == "picked_up":
                    listing_update["picked_up_at"] = update_data.get("picked_up_at")

                update_listing(result["listing_id"], listing_update)
        
        return result
    except:
        return None


def update_driver_location(task_id: str, location: dict) -> Optional[dict]:
    """Persist latest driver location for a delivery task."""
    update_data = {
        "current_location": {
            "lat": float(location.get("lat")),
            "lng": float(location.get("lng")),
            "heading": location.get("heading"),
            "speed": location.get("speed"),
            "updated_at": datetime.utcnow().isoformat(),
        },
        "updated_at": datetime.utcnow().isoformat(),
    }

    try:
        result = delivery_tasks_collection.find_one_and_update(
            {"_id": ObjectId(task_id)},
            {"$set": update_data},
            return_document=True,
        )
        if not result:
            return None

        result["id"] = str(result["_id"])
        del result["_id"]
        return result
    except Exception:
        return None


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

def get_available_pickups(driver_lat: Optional[float] = None, driver_lng: Optional[float] = None) -> List[dict]:
    """Get all listings that are claimed but not yet assigned to a driver. Filters geographically if location provided."""
    listings = get_all_listings({"status": "claimed"})
    
    if driver_lat is None or driver_lng is None:
        return listings
        
    filtered_listings = []
    MAX_RADIUS_KM = 30.0
    
    for doc in listings:
        # Resolve coordinates from various nested structures
        lat_val = doc.get("latitude") or (doc.get("coordinates") or {}).get("lat") or (doc.get("location") or {}).get("coordinates", {}).get("lat")
        lng_val = doc.get("longitude") or (doc.get("coordinates") or {}).get("lng") or (doc.get("location") or {}).get("coordinates", {}).get("lng")
        
        if lat_val is not None and lng_val is not None:
            dist = _haversine(float(driver_lat), float(driver_lng), float(lat_val), float(lng_val))
            if dist <= MAX_RADIUS_KM:
                filtered_listings.append(doc)
        else:
            # Drop invalid listings without coordinates
            pass
            
    return filtered_listings


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


# ============== RESCUE ACTIONS ==============

def set_rescue_action(listing_id: str, action: str, farmer_id: str = None) -> Optional[dict]:
    """
    Farmer chooses a rescue action for an urgent/rescue listing.
    action: 'donate' or 'sell_discounted'
    """
    listing = get_listing_by_id(listing_id)
    if not listing:
        return None

    if action == "donate":
        return donate_listing(listing_id, farmer_id, listing)
    elif action == "sell_discounted":
        from app.services.donation_routing_service import apply_failsafe_discount
        # By bypassing declined ids and calling apply_failsafe directly, we instantly get 50% discount and 'discounted' status
        return apply_failsafe_discount(listing_id, listing)
    
    return None


def donate_listing(listing_id: str, farmer_id: str = None, listing: dict = None) -> Optional[dict]:
    """
    Mark a listing for NGO donation and award impact points.
    """
    if not listing:
        listing = get_listing_by_id(listing_id)
    if not listing:
        return None

    if listing.get("status") != "available":
        raise ValueError("Only available listings can be donated")

    if bool(listing.get("donation_mode")):
        return listing

    # Guard: only allow donation when remaining shelf life ≤ 24h
    shelf_hours = listing.get("hours_remaining") or listing.get("remaining_shelf_life_hours")
    if shelf_hours is not None and float(shelf_hours) > DONATION_ELIGIBILITY_HOURS:
        wait_hours = round(float(shelf_hours) - DONATION_ELIGIBILITY_HOURS, 1)
        raise ValueError(f"Donation available when shelf life drops to 24h. Currently {round(float(shelf_hours), 1)}h remaining. Try again in {wait_hours}h")

    now_iso = datetime.utcnow().isoformat()
    farmer_id = farmer_id or listing.get("farmer_id")

    try:
        from app.services.donation_routing_service import initiate_donation_request
        updated = initiate_donation_request(listing_id, farmer_id)
    except Exception as e:
        print(f"[RESCUE] Routing failed: {e}")
        # manual fallback
        update_data = {
            "donation_mode": True,
            "rescue_action": "donate",
            "donation_requested_at": now_iso,
            "updated_at": now_iso,
        }
        updated = update_listing(listing_id, update_data)

    # Award reward points
    if farmer_id:
        try:
            from app.services.reward_service import award_donation_points
            quantity_kg = listing.get("quantity_kg", 0) or _parse_quantity_kg(listing.get("quantity", 0))
            urgency = listing.get("urgency_status", "normal")
            award_donation_points(
                str(farmer_id),
                quantity_kg,
                urgency,
                listing_id=listing_id,
                listing_title=listing.get("title", ""),
            )
        except Exception as e:
            print(f"[RESCUE] Failed to award points: {e}")

    # Update impact metrics
    try:
        from app.services.impact_service import update_impact_on_rescue
        update_impact_on_rescue(listing)
    except Exception as e:
        print(f"[RESCUE] Failed to update impact: {e}")

    # Notify NGOs only when listing is explicitly marked for donation.
    try:
        notify_ngos_new_listing(updated or listing)
    except Exception as e:
        print(f"[RESCUE] Failed to notify NGOs after donation action: {e}")

    return updated
