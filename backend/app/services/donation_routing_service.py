import math
from typing import Optional, Dict, List, Tuple
from datetime import datetime, timezone
from app.core.database import db

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great-circle distance between two points on the Earth surface."""
    try:
        R = 6371.0 # Earth radius in km
        
        phi1 = math.radians(float(lat1))
        phi2 = math.radians(float(lat2))
        delta_phi = math.radians(float(lat2) - float(lat1))
        delta_lambda = math.radians(float(lon2) - float(lon1))
        
        a = math.sin(delta_phi / 2.0)**2 + \
            math.cos(phi1) * math.cos(phi2) * \
            math.sin(delta_lambda / 2.0)**2
            
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c
    except Exception as e:
        print(f"[RESCUE] haversine_distance error: {e}")
        return float('inf')

def find_nearest_eligible_ngo(listing_lat: float, listing_lng: float, declined_ngo_ids: List[str]) -> Tuple[Optional[str], Optional[str]]:
    """Finds the nearest NGO that hasn't declined the listing. Strictly requires location data."""
    # Find all NGOs
    # In Annam, NGO profiles are primarily in ngo_settings
    ngos = list(db.ngo_settings.find({}))
    
    # If no listing coordinates, just pick the first eligible one that HAS location
    if listing_lat is None or listing_lng is None:
        for ngo in ngos:
            ngo_id = str(ngo.get("ngo_id") or ngo.get("user_id") or "")
            location = ngo.get("location") or {}
            
            lat = location.get("lat") or ngo.get("gps_lat")
            lng = location.get("lng") or ngo.get("gps_lng")
            
            if ngo_id and ngo_id not in declined_ngo_ids and lat is not None and lng is not None:
                return ngo_id, ngo.get("organization_name") or ngo.get("admin_name") or "NGO"
        return None, None

    best_ngo_id = None
    best_ngo_name = None
    min_dist = float('inf')
    
    for ngo in ngos:
        ngo_id = str(ngo.get("ngo_id") or ngo.get("user_id") or "")
        if not ngo_id or ngo_id in declined_ngo_ids:
            continue
            
        location = ngo.get("location") or {}
        ngo_lat = location.get("lat") or ngo.get("gps_lat")
        ngo_lng = location.get("lng") or ngo.get("gps_lng")
        
        # Strictly enforce location constraints
        if ngo_lat is None or ngo_lng is None or ngo_lat == "" or ngo_lng == "":
            continue
            
        dist = haversine_distance(listing_lat, listing_lng, ngo_lat, ngo_lng)
        if dist < min_dist:
            min_dist = dist
            best_ngo_id = ngo_id
            best_ngo_name = ngo.get("organization_name") or ngo.get("admin_name") or "NGO"
            
    return best_ngo_id, best_ngo_name

def initiate_donation_request(listing_id: str, farmer_id: str) -> Optional[Dict]:
    """
    Called when a farmer clicks "Donate to NGO".
    Finds nearest NGO and routes the donatin request to them.
    Changes status to pending_donation.
    """
    from bson import ObjectId
    
    if ObjectId.is_valid(listing_id):
        listing_query = {"_id": ObjectId(listing_id)}
    else:
        listing_query = {"id": listing_id}
        
    listing = db.listings.find_one(listing_query)
    if not listing:
        listing = db.marketplace_listings.find_one(listing_query)
        if not listing:
            raise ValueError("Listing not found")
            
    declined_ids = listing.get("declined_ngo_ids", [])
    
    lat = listing.get("latitude")
    lng = listing.get("longitude")
    
    try:
        lat = float(lat) if lat is not None and lat != "" else 0.0
        lng = float(lng) if lng is not None and lng != "" else 0.0
    except (ValueError, TypeError):
        lat, lng = 0.0, 0.0
        
    nearest_ngo_id, nearest_ngo_name = find_nearest_eligible_ngo(lat, lng, declined_ids)
    
    if not nearest_ngo_id:
        # Failsafe: if ALL NGOs decline or no NGOs available -> auto convert to discounted
        return apply_failsafe_discount(listing_id, listing)
        
    update_data = {
        "status": "pending_donation",
        "pending_ngo_id": nearest_ngo_id,
        "pending_ngo_name": nearest_ngo_name,
        "donation_mode": True,
        "rescue_action": "donate",
        "updated_at": _now_iso()
    }
    
    db.listings.update_one(listing_query, {"$set": update_data})
    db.marketplace_listings.update_one(listing_query, {"$set": update_data})
    
    listing.update(update_data)
    listing["_id"] = str(listing["_id"])
    return listing

def handle_ngo_decline(listing_id: str, declining_ngo_id: str) -> Dict:
    """
    Called when an NGO declines a donation request.
    Finds the next nearest NGO.
    """
    from bson import ObjectId
    
    if ObjectId.is_valid(listing_id):
        listing_query = {"_id": ObjectId(listing_id)}
    else:
        listing_query = {"id": listing_id}
        
    listing = db.listings.find_one(listing_query)
    if not listing:
        listing = db.marketplace_listings.find_one(listing_query)
        if not listing:
            raise ValueError("Listing not found")
            
    declined_ids = listing.get("declined_ngo_ids", [])
    if declining_ngo_id not in declined_ids:
        declined_ids.append(declining_ngo_id)
        
    lat = listing.get("latitude")
    lng = listing.get("longitude")
    
    try:
        lat = float(lat) if lat is not None and lat != "" else 0.0
        lng = float(lng) if lng is not None and lng != "" else 0.0
    except (ValueError, TypeError):
        lat, lng = 0.0, 0.0
        
    # Auto re-route to next closest
    next_ngo_id, next_ngo_name = find_nearest_eligible_ngo(lat, lng, declined_ids)
    
    if not next_ngo_id:
        return apply_failsafe_discount(listing_id, listing, declined_ids)
        
    update_data = {
        "pending_ngo_id": next_ngo_id,
        "pending_ngo_name": next_ngo_name,
        "declined_ngo_ids": declined_ids,
        "status": "pending_donation",
        "updated_at": _now_iso()
    }
    
    db.listings.update_one(listing_query, {"$set": update_data})
    db.marketplace_listings.update_one(listing_query, {"$set": update_data})
    
    listing.update(update_data)
    listing["_id"] = str(listing["_id"])
    return listing

def apply_failsafe_discount(listing_id: str, listing: Dict, declined_ids: List[str] = None) -> Dict:
    """Fallback: ALL NGOs declined or no NGOs exist -> sell at 50% discount"""
    from bson import ObjectId
    
    if ObjectId.is_valid(listing_id):
        listing_query = {"_id": ObjectId(listing_id)}
    else:
        listing_query = {"id": listing_id}
    
    original_price = float(listing.get("price") or listing.get("original_price") or 0)
    discounted_val = max(0, round(original_price * 0.5, 2))
    
    update_data = {
        "status": "discounted",
        "price": discounted_val,
        "discounted_price": discounted_val,
        "rescue_action": "sell_discounted",
        "pending_ngo_id": None,
        "updated_at": _now_iso()
    }
    
    if declined_ids is not None:
        update_data["declined_ngo_ids"] = declined_ids
        
    db.listings.update_one(listing_query, {"$set": update_data})
    db.marketplace_listings.update_one(listing_query, {"$set": update_data})
    
    listing.update(update_data)
    listing["_id"] = str(listing["_id"])
    return listing
