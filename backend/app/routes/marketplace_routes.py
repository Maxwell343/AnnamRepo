"""
ANNAM Marketplace Routes
FastAPI routes for marketplace functionality (MongoDB-backed)
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Optional
from datetime import datetime, timedelta
import uuid

from bson import ObjectId
from pymongo import DESCENDING, ASCENDING

from ..core.database import db
from ..models.marketplace_model import (
    MarketplaceListingCreate,
    MarketplaceListingUpdate,
    MarketplaceListingResponse,
    MarketplaceFilters,
    SearchQuery,
    PriceSuggestionRequest,
    PriceSuggestionResponse,
    Cart,
    CartItem,
    Order,
    OrderItem,
    OrderStatus,
    DeliveryAddress,
    ImpactMetrics,
    DistrictAnalytics,
    TrendData,
    GovernmentReport,
    ProductType,
    ListingCategory,
    FreshnessLevel,
    ListingStatus,
    SellingMode,
    SpoilageIndicator,
    FarmerProfile,
    TrustIndicator,
    Location,
    Coordinates,
)

router = APIRouter(prefix="/api/marketplace", tags=["Marketplace"])

# ============================================
# MONGODB COLLECTIONS
# ============================================

marketplace_listings_collection = db["marketplace_listings"]
marketplace_carts_collection = db["marketplace_carts"]
marketplace_orders_collection = db["marketplace_orders"]
impact_collection = db["impact_metrics"]


# ============================================
# HELPER FUNCTIONS
# ============================================

def is_listing_expired(listing: dict) -> bool:
    """Check if a listing is expired based on its expiry_date"""
    expiry_date = listing.get("expiry_date")
    if expiry_date:
        if isinstance(expiry_date, str):
            try:
                expiry_date = datetime.fromisoformat(expiry_date.replace("Z", "+00:00"))
            except (ValueError, TypeError):
                return False
        if isinstance(expiry_date, datetime):
            now = datetime.utcnow() if expiry_date.tzinfo is None else datetime.now(expiry_date.tzinfo)
            return now >= expiry_date
    return False


def _doc_to_id(doc: dict) -> dict:
    """Convert MongoDB _id to string id field if no custom id exists"""
    if doc and "_id" in doc:
        if "id" not in doc:
            doc["id"] = str(doc["_id"])
        del doc["_id"]
    return doc


# ============================================
# LISTINGS ENDPOINTS
# ============================================

@router.get("/listings", response_model=List[MarketplaceListingResponse])
async def get_listings(
    category: Optional[ListingCategory] = None,
    product_type: Optional[ProductType] = None,
    price_min: Optional[float] = None,
    price_max: Optional[float] = None,
    freshness: Optional[FreshnessLevel] = None,
    city: Optional[str] = None,
    state: Optional[str] = None,
    verified_only: bool = False,
    sort_by: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    include_expired: bool = False,
):
    """Get all marketplace listings with optional filters"""
    query: dict = {}

    if not include_expired:
        query["status"] = {"$ne": ListingStatus.EXPIRED.value}

    if category:
        query["category"] = category.value
    if product_type:
        query["product_type"] = product_type.value
    if price_min is not None or price_max is not None:
        price_filter: dict = {}
        if price_min is not None:
            price_filter["$gte"] = price_min
        if price_max is not None:
            price_filter["$lte"] = price_max
        query["price_per_unit"] = price_filter
    if freshness:
        query["freshness_level"] = freshness.value
    if city:
        query["location.city"] = {"$regex": f"^{city}$", "$options": "i"}
    if state:
        query["location.state"] = {"$regex": f"^{state}$", "$options": "i"}
    if verified_only:
        query["farmer_profile.verified"] = True

    sort_spec = [("created_at", DESCENDING)]
    if sort_by == "price_asc":
        sort_spec = [("price_per_unit", ASCENDING)]
    elif sort_by == "price_desc":
        sort_spec = [("price_per_unit", DESCENDING)]
    elif sort_by == "newest":
        sort_spec = [("created_at", DESCENDING)]

    skip = (page - 1) * limit

    docs = list(
        marketplace_listings_collection.find(query)
        .sort(sort_spec)
        .skip(skip)
        .limit(limit)
    )

    results: List[MarketplaceListingResponse] = []
    for doc in docs:
        _doc_to_id(doc)
        if not include_expired and is_listing_expired(doc):
            continue
        results.append(MarketplaceListingResponse(**doc))

    return results


@router.get("/listings/farmer/{farmer_id}", response_model=List[MarketplaceListingResponse])
async def get_farmer_listings(farmer_id: str, include_expired: bool = False):
    """Get all listings by a specific farmer"""
    query: dict = {"farmer_id": farmer_id}
    if not include_expired:
        query["status"] = {"$ne": ListingStatus.EXPIRED.value}

    docs = list(
        marketplace_listings_collection.find(query).sort("created_at", DESCENDING)
    )
    results: List[MarketplaceListingResponse] = []
    for doc in docs:
        _doc_to_id(doc)
        if not include_expired and is_listing_expired(doc):
            continue
        results.append(MarketplaceListingResponse(**doc))
    return results


@router.get("/listings/farmer/{farmer_id}/expired", response_model=List[MarketplaceListingResponse])
async def get_farmer_expired_listings(farmer_id: str):
    """Get all expired listings by a specific farmer (for archives)"""
    docs = list(
        marketplace_listings_collection.find({"farmer_id": farmer_id}).sort(
            "created_at", DESCENDING
        )
    )
    results: List[MarketplaceListingResponse] = []
    for doc in docs:
        _doc_to_id(doc)
        if doc.get("status") == ListingStatus.EXPIRED.value or is_listing_expired(doc):
            results.append(MarketplaceListingResponse(**doc))
    return results


@router.get("/listings/{listing_id}", response_model=MarketplaceListingResponse)
async def get_listing(listing_id: str):
    """Get a single listing by ID"""
    doc = marketplace_listings_collection.find_one({"id": listing_id})
    if not doc:
        try:
            doc = marketplace_listings_collection.find_one({"_id": ObjectId(listing_id)})
        except Exception:
            pass
    if not doc:
        raise HTTPException(status_code=404, detail="Listing not found")
    _doc_to_id(doc)
    return MarketplaceListingResponse(**doc)


@router.post("/listings", response_model=MarketplaceListingResponse)
async def create_listing(listing: MarketplaceListingCreate):
    """Create a new marketplace listing"""
    new_id = f"lst_{uuid.uuid4().hex[:8]}"

    freshness_level = FreshnessLevel.EXCELLENT
    spoilage = None

    if listing.expiry_date:
        hours_remaining = (listing.expiry_date - datetime.now()).total_seconds() / 3600

        if hours_remaining > 72:
            freshness_level = FreshnessLevel.EXCELLENT
        elif hours_remaining > 48:
            freshness_level = FreshnessLevel.GOOD
        elif hours_remaining > 24:
            freshness_level = FreshnessLevel.FAIR
        else:
            freshness_level = FreshnessLevel.URGENT

        spoilage = SpoilageIndicator(
            level=freshness_level.value,
            hours_remaining=int(hours_remaining),
            percentage=max(0, min(100, (hours_remaining / 168) * 100)),
            message=(
                "Excellent freshness" if hours_remaining > 72
                else "Good condition" if hours_remaining > 48
                else "Use soon" if hours_remaining > 24
                else "Urgent!"
            ),
            color=(
                "#4CAF50" if hours_remaining > 72
                else "#FFA000" if hours_remaining > 24
                else "#D32F2F"
            ),
        )

    discount = None
    if listing.original_price and listing.original_price > listing.price_per_unit:
        discount = (
            (listing.original_price - listing.price_per_unit) / listing.original_price
        ) * 100

    now = datetime.utcnow()

    doc = {
        "id": new_id,
        "farmer_id": "current_user_id",  # TODO: replace with actual user ID from auth
        "farmer_name": "Current Farmer",  # TODO: replace with actual user name from auth
        "farmer_profile": None,
        "title": listing.title,
        "description": listing.description,
        "product_type": listing.product_type.value,
        "category": listing.category.value,
        "quantity": listing.quantity,
        "quantity_sold": 0,
        "unit": listing.unit,
        "price_per_unit": listing.price_per_unit,
        "original_price": listing.original_price,
        "discount_percent": discount,
        "harvest_date": listing.harvest_date.isoformat() if listing.harvest_date else None,
        "expiry_date": listing.expiry_date.isoformat() if listing.expiry_date else None,
        "freshness_level": freshness_level.value,
        "spoilage_indicator": spoilage.dict() if spoilage else None,
        "location": listing.location.dict(),
        "images": listing.images,
        "tags": listing.tags,
        "selling_mode": listing.selling_mode.value,
        "status": ListingStatus.ACTIVE.value,
        "views": 0,
        "saves": 0,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
    }

    marketplace_listings_collection.insert_one(doc)
    doc.pop("_id", None)

    return MarketplaceListingResponse(**doc)


@router.put("/listings/{listing_id}", response_model=MarketplaceListingResponse)
async def update_listing(listing_id: str, updates: MarketplaceListingUpdate):
    """Update an existing listing"""
    update_dict = updates.dict(exclude_unset=True)
    for key, value in update_dict.items():
        if hasattr(value, "value"):
            update_dict[key] = value.value
    update_dict["updated_at"] = datetime.utcnow().isoformat()

    result = marketplace_listings_collection.find_one_and_update(
        {"id": listing_id},
        {"$set": update_dict},
        return_document=True,
    )
    if not result:
        try:
            result = marketplace_listings_collection.find_one_and_update(
                {"_id": ObjectId(listing_id)},
                {"$set": update_dict},
                return_document=True,
            )
        except Exception:
            pass

    if not result:
        raise HTTPException(status_code=404, detail="Listing not found")

    _doc_to_id(result)
    return MarketplaceListingResponse(**result)


@router.delete("/listings/{listing_id}")
async def delete_listing(listing_id: str):
    """Delete a listing"""
    result = marketplace_listings_collection.delete_one({"id": listing_id})
    if result.deleted_count == 0:
        try:
            result = marketplace_listings_collection.delete_one({"_id": ObjectId(listing_id)})
        except Exception:
            pass
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Listing not found")
    return {"message": "Listing deleted successfully"}


# ============================================
# CATEGORY ENDPOINTS
# ============================================

@router.get("/categories")
async def get_marketplace_categories():
    """Return category list for admin marketplace category manager."""
    return {
        "categories": [
            {
                "id": "cat_veg",
                "name": "Vegetables",
                "slug": "vegetables",
                "icon": "leaf",
                "color": "#16a34a",
                "parent": None,
                "listingCount": 0,
                "active": True,
                "featured": True,
                "description": "Fresh vegetables",
                "order": 1,
                "createdAt": datetime.utcnow().isoformat(),
                "updatedAt": datetime.utcnow().isoformat(),
            },
            {
                "id": "cat_fruit",
                "name": "Fruits",
                "slug": "fruits",
                "icon": "apple",
                "color": "#f59e0b",
                "parent": None,
                "listingCount": 0,
                "active": True,
                "featured": True,
                "description": "Seasonal fruits",
                "order": 2,
                "createdAt": datetime.utcnow().isoformat(),
                "updatedAt": datetime.utcnow().isoformat(),
            },
        ]
    }

@router.get("/near-expiry", response_model=List[MarketplaceListingResponse])
async def get_near_expiry_listings():
    """Get listings that are near expiry (priority rescue)"""
    docs = list(marketplace_listings_collection.find({
        "category": ListingCategory.NEAR_EXPIRY.value,
        "status": {"$ne": ListingStatus.EXPIRED.value},
    }))
    results: List[MarketplaceListingResponse] = []
    for doc in docs:
        _doc_to_id(doc)
        if not is_listing_expired(doc):
            results.append(MarketplaceListingResponse(**doc))
    return results


@router.get("/ngo-rescue", response_model=List[MarketplaceListingResponse])
async def get_ngo_rescue_listings():
    """Get listings available for NGO rescue"""
    docs = list(marketplace_listings_collection.find({
        "$or": [
            {"category": ListingCategory.NGO_RESCUE.value},
            {"selling_mode": SellingMode.DONATE.value},
        ],
        "status": {"$ne": ListingStatus.EXPIRED.value},
    }))
    results: List[MarketplaceListingResponse] = []
    for doc in docs:
        _doc_to_id(doc)
        if not is_listing_expired(doc):
            results.append(MarketplaceListingResponse(**doc))
    return results


@router.get("/flash-sales", response_model=List[MarketplaceListingResponse])
async def get_flash_sales():
    """Get flash sale listings with high discounts"""
    docs = list(marketplace_listings_collection.find({
        "discount_percent": {"$gte": 30},
        "status": {"$ne": ListingStatus.EXPIRED.value},
    }))
    results: List[MarketplaceListingResponse] = []
    for doc in docs:
        _doc_to_id(doc)
        if not is_listing_expired(doc):
            results.append(MarketplaceListingResponse(**doc))
    return results


@router.get("/bulk-lots", response_model=List[MarketplaceListingResponse])
async def get_bulk_lots():
    """Get bulk quantity listings for processors"""
    docs = list(marketplace_listings_collection.find({
        "quantity": {"$gte": 100},
        "status": {"$ne": ListingStatus.EXPIRED.value},
    }))
    results: List[MarketplaceListingResponse] = []
    for doc in docs:
        _doc_to_id(doc)
        if not is_listing_expired(doc):
            results.append(MarketplaceListingResponse(**doc))
    return results


# ============================================
# SEARCH ENDPOINT
# ============================================

@router.post("/search", response_model=List[MarketplaceListingResponse])
async def search_listings(search: SearchQuery):
    """Search listings with query and filters"""
    query_text = search.query

    docs = list(marketplace_listings_collection.find({
        "$or": [
            {"title": {"$regex": query_text, "$options": "i"}},
            {"description": {"$regex": query_text, "$options": "i"}},
            {"tags": {"$regex": query_text, "$options": "i"}},
        ],
        "status": {"$ne": ListingStatus.EXPIRED.value},
    }))

    results: List[MarketplaceListingResponse] = []
    for doc in docs:
        _doc_to_id(doc)
        if not is_listing_expired(doc):
            results.append(MarketplaceListingResponse(**doc))
    return results


# ============================================
# SMART PRICING ENDPOINT
# ============================================

@router.post("/price-suggestion", response_model=PriceSuggestionResponse)
async def get_price_suggestion(request: PriceSuggestionRequest):
    """Get price suggestion based on market conditions"""
    base_prices = {
        ProductType.VEGETABLES: 35,
        ProductType.FRUITS: 60,
        ProductType.GRAINS: 45,
        ProductType.DAIRY: 55,
        ProductType.PULSES: 80,
        ProductType.SPICES: 200,
        ProductType.PREPARED: 100,
        ProductType.OTHER: 50,
    }

    base = base_prices.get(request.product_type, 50)

    freshness_factor = 1.0
    if request.expiry_date:
        hours = (request.expiry_date - datetime.now()).total_seconds() / 3600
        if hours < 24:
            freshness_factor = 0.5
        elif hours < 48:
            freshness_factor = 0.7
        elif hours < 72:
            freshness_factor = 0.85

    suggested = base * freshness_factor

    return PriceSuggestionResponse(
        suggested_price=round(suggested, 2),
        min_price=round(suggested * 0.7, 2),
        max_price=round(suggested * 1.3, 2),
        market_average=base,
        confidence=0.85,
        factors=[
            {"factor": "Market Average", "impact": "baseline", "value": base},
            {"factor": "Freshness", "impact": "reduction" if freshness_factor < 1 else "none", "value": freshness_factor},
            {"factor": "Demand", "impact": "neutral", "value": 1.0},
        ],
    )


# ============================================
# IMPACT ENDPOINTS
# ============================================

def _get_impact_metrics() -> dict:
    """Fetch global impact metrics from the database with fallback to zeros"""
    doc = impact_collection.find_one({"type": "global_metrics"})
    if doc:
        _doc_to_id(doc)
        return doc
    return {
        "food_saved_kg": 0,
        "meals_provided": 0,
        "carbon_saved_kg": 0,
        "water_saved_liters": 0,
        "farmers_supported": 0,
        "ngos_partnered": 0,
        "districts_served": 0,
        "transactions_completed": 0,
    }


@router.get("/impact", response_model=ImpactMetrics)
async def get_impact_metrics():
    """Get overall platform impact metrics"""
    data = _get_impact_metrics()
    return ImpactMetrics(
        food_saved_kg=data.get("food_saved_kg", 0),
        meals_provided=data.get("meals_provided", 0),
        carbon_saved_kg=data.get("carbon_saved_kg", 0),
        water_saved_liters=data.get("water_saved_liters", 0),
        farmers_supported=data.get("farmers_supported", 0),
        ngos_partnered=data.get("ngos_partnered", 0),
        districts_served=data.get("districts_served", 0),
        transactions_completed=data.get("transactions_completed", 0),
    )


@router.get("/impact/districts", response_model=List[DistrictAnalytics])
async def get_district_analytics(state: Optional[str] = None):
    """Get district-wise analytics"""
    query: dict = {"type": "district_analytics"}
    if state:
        query["state"] = {"$regex": f"^{state}$", "$options": "i"}

    docs = list(impact_collection.find(query))
    if not docs:
        return []

    results: List[DistrictAnalytics] = []
    for doc in docs:
        _doc_to_id(doc)
        results.append(DistrictAnalytics(
            district_name=doc.get("district_name", ""),
            state=doc.get("state", ""),
            total_listings=doc.get("total_listings", 0),
            active_listings=doc.get("active_listings", 0),
            food_rescued_kg=doc.get("food_rescued_kg", 0),
            top_products=doc.get("top_products", []),
            ngo_activity=doc.get("ngo_activity", 0),
            waste_prevention_rate=doc.get("waste_prevention_rate", 0),
        ))
    return results


@router.get("/impact/trends", response_model=List[TrendData])
async def get_impact_trends():
    """Get impact trends over time"""
    docs = list(impact_collection.find({"type": "trend"}).sort("date", ASCENDING))
    if not docs:
        return []

    results: List[TrendData] = []
    for doc in docs:
        results.append(TrendData(
            date=doc.get("date", ""),
            food_saved=doc.get("food_saved", 0),
            transactions=doc.get("transactions", 0),
            meals_provided=doc.get("meals_provided", 0),
        ))
    return results


@router.get("/impact/government-report", response_model=GovernmentReport)
async def generate_government_report(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
):
    """Generate a government-ready impact report"""
    metrics_data = _get_impact_metrics()
    metrics = ImpactMetrics(
        food_saved_kg=metrics_data.get("food_saved_kg", 0),
        meals_provided=metrics_data.get("meals_provided", 0),
        carbon_saved_kg=metrics_data.get("carbon_saved_kg", 0),
        water_saved_liters=metrics_data.get("water_saved_liters", 0),
        farmers_supported=metrics_data.get("farmers_supported", 0),
        ngos_partnered=metrics_data.get("ngos_partnered", 0),
        districts_served=metrics_data.get("districts_served", 0),
        transactions_completed=metrics_data.get("transactions_completed", 0),
    )

    district_docs = list(impact_collection.find({"type": "district_analytics"}))
    district_data: List[DistrictAnalytics] = []
    for doc in district_docs:
        _doc_to_id(doc)
        district_data.append(DistrictAnalytics(
            district_name=doc.get("district_name", ""),
            state=doc.get("state", ""),
            total_listings=doc.get("total_listings", 0),
            active_listings=doc.get("active_listings", 0),
            food_rescued_kg=doc.get("food_rescued_kg", 0),
            top_products=doc.get("top_products", []),
            ngo_activity=doc.get("ngo_activity", 0),
            waste_prevention_rate=doc.get("waste_prevention_rate", 0),
        ))

    trend_docs = list(impact_collection.find({"type": "trend"}).sort("date", ASCENDING))
    trends: List[TrendData] = []
    for doc in trend_docs:
        trends.append(TrendData(
            date=doc.get("date", ""),
            food_saved=doc.get("food_saved", 0),
            transactions=doc.get("transactions", 0),
            meals_provided=doc.get("meals_provided", 0),
        ))

    return GovernmentReport(
        report_type="Monthly Impact Summary",
        date_range={"start": start_date or "2024-01-01", "end": end_date or "2024-12-31"},
        metrics=metrics,
        district_data=district_data,
        trends=trends,
    )


# ============================================
# CART & ORDERS ENDPOINTS
# ============================================

@router.get("/cart/{user_id}", response_model=Cart)
async def get_cart(user_id: str):
    """Get user's cart"""
    doc = marketplace_carts_collection.find_one({"user_id": user_id})
    if doc:
        _doc_to_id(doc)
        return Cart(**doc)
    return Cart(user_id=user_id, items=[])


@router.post("/cart/{user_id}/add")
async def add_to_cart(user_id: str, item: CartItem):
    """Add item to cart"""
    cart_doc = marketplace_carts_collection.find_one({"user_id": user_id})

    if not cart_doc:
        marketplace_carts_collection.insert_one({
            "user_id": user_id,
            "items": [item.dict()],
            "updated_at": datetime.utcnow().isoformat(),
        })
        return {"message": "Item added to cart"}

    items = cart_doc.get("items", [])
    for existing in items:
        if existing.get("listing_id") == item.listing_id:
            existing["quantity"] += item.quantity
            marketplace_carts_collection.update_one(
                {"user_id": user_id},
                {"$set": {"items": items, "updated_at": datetime.utcnow().isoformat()}},
            )
            return {"message": "Cart updated"}

    marketplace_carts_collection.update_one(
        {"user_id": user_id},
        {"$push": {"items": item.dict()}, "$set": {"updated_at": datetime.utcnow().isoformat()}},
    )
    return {"message": "Item added to cart"}


@router.delete("/cart/{user_id}/remove/{listing_id}")
async def remove_from_cart(user_id: str, listing_id: str):
    """Remove item from cart"""
    marketplace_carts_collection.update_one(
        {"user_id": user_id},
        {"$pull": {"items": {"listing_id": listing_id}}, "$set": {"updated_at": datetime.utcnow().isoformat()}},
    )
    return {"message": "Item removed from cart"}


@router.post("/orders", response_model=Order)
async def create_order(user_id: str, address: DeliveryAddress, payment_method: str):
    """Create a new order from cart"""
    cart_doc = marketplace_carts_collection.find_one({"user_id": user_id})
    if not cart_doc or not cart_doc.get("items"):
        raise HTTPException(status_code=400, detail="Cart is empty")

    order_items: List[dict] = []
    subtotal = 0.0

    for cart_item in cart_doc["items"]:
        listing_doc = marketplace_listings_collection.find_one({"id": cart_item["listing_id"]})
        if not listing_doc:
            try:
                listing_doc = marketplace_listings_collection.find_one({"_id": ObjectId(cart_item["listing_id"])})
            except Exception:
                pass

        if listing_doc:
            item_total = listing_doc["price_per_unit"] * cart_item["quantity"]
            order_items.append({
                "listing_id": cart_item["listing_id"],
                "listing_title": listing_doc.get("title", ""),
                "farmer_id": listing_doc.get("farmer_id", ""),
                "farmer_name": listing_doc.get("farmer_name", ""),
                "quantity": cart_item["quantity"],
                "unit": listing_doc.get("unit", "kg"),
                "price_per_unit": listing_doc["price_per_unit"],
                "total_price": item_total,
            })
            subtotal += item_total

    delivery_fee = 0 if subtotal > 500 else 49
    platform_fee = 9
    total = subtotal + delivery_fee + platform_fee

    now = datetime.utcnow()
    order_id = f"ANNAM{uuid.uuid4().hex[:8].upper()}"

    order_doc = {
        "id": order_id,
        "user_id": user_id,
        "items": order_items,
        "delivery_address": address.dict(),
        "subtotal": subtotal,
        "delivery_fee": delivery_fee,
        "platform_fee": platform_fee,
        "total": total,
        "savings": 0,
        "payment_method": payment_method,
        "payment_status": "pending",
        "status": OrderStatus.PENDING.value,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
        "estimated_delivery": (now + timedelta(days=2)).isoformat(),
        "delivered_at": None,
    }

    marketplace_orders_collection.insert_one(order_doc)

    marketplace_carts_collection.update_one(
        {"user_id": user_id},
        {"$set": {"items": [], "updated_at": now.isoformat()}},
    )

    order_doc.pop("_id", None)
    return Order(**order_doc)


@router.get("/orders/{order_id}", response_model=Order)
async def get_order(order_id: str):
    """Get order by ID"""
    doc = marketplace_orders_collection.find_one({"id": order_id})
    if not doc:
        try:
            doc = marketplace_orders_collection.find_one({"_id": ObjectId(order_id)})
        except Exception:
            pass
    if not doc:
        raise HTTPException(status_code=404, detail="Order not found")
    _doc_to_id(doc)
    return Order(**doc)


@router.get("/orders/user/{user_id}", response_model=List[Order])
async def get_user_orders(user_id: str):
    """Get all orders for a user"""
    docs = list(marketplace_orders_collection.find({"user_id": user_id}).sort("created_at", DESCENDING))
    results: List[Order] = []
    for doc in docs:
        _doc_to_id(doc)
        results.append(Order(**doc))
    return results
