"""
ANNAM Marketplace Routes
FastAPI routes for marketplace functionality
"""

from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Optional
from datetime import datetime, timedelta
import uuid

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
# MOCK DATA STORE (Replace with MongoDB in production)
# ============================================

mock_listings = []
mock_carts = {}
mock_orders = []

# Generate some mock listings
def generate_mock_listings():
    farmers = [
        FarmerProfile(
            id="f1",
            name="Ramesh Kumar",
            farm_name="Green Valley Farms",
            location=Location(city="Sonipat", state="Haryana", pincode="131001", coordinates=Coordinates(lat=28.9, lng=77.0)),
            rating=4.8,
            total_sales=156,
            joined_date=datetime.now() - timedelta(days=365),
            trust_indicators=[
                TrustIndicator(type="verified", label="Verified Farmer"),
                TrustIndicator(type="organic", label="Organic Certified"),
            ],
            response_time=15,
            verified=True
        ),
        FarmerProfile(
            id="f2",
            name="Sunita Devi",
            farm_name="Sunrise Organics",
            location=Location(city="Karnal", state="Haryana", pincode="132001", coordinates=Coordinates(lat=29.6, lng=76.9)),
            rating=4.6,
            total_sales=89,
            joined_date=datetime.now() - timedelta(days=200),
            trust_indicators=[
                TrustIndicator(type="verified", label="Verified Farmer"),
                TrustIndicator(type="fast_responder", label="Fast Responder"),
            ],
            response_time=10,
            verified=True
        ),
    ]
    
    listings = [
        {
            "id": "lst_001",
            "farmer_id": "f1",
            "farmer_name": "Ramesh Kumar",
            "farmer_profile": farmers[0],
            "title": "Fresh Organic Tomatoes",
            "description": "Freshly harvested organic tomatoes from our farm. Perfect for cooking and salads.",
            "product_type": ProductType.VEGETABLES,
            "category": ListingCategory.NEAR_EXPIRY,
            "quantity": 50,
            "quantity_sold": 12,
            "unit": "kg",
            "price_per_unit": 25,
            "original_price": 40,
            "discount_percent": 37.5,
            "harvest_date": datetime.now() - timedelta(days=3),
            "expiry_date": datetime.now() + timedelta(days=2),
            "freshness_level": FreshnessLevel.GOOD,
            "spoilage_indicator": SpoilageIndicator(
                level="good",
                hours_remaining=48,
                percentage=65,
                message="Best consumed within 2 days",
                color="#FFA000"
            ),
            "location": Location(city="Sonipat", state="Haryana", pincode="131001", coordinates=Coordinates(lat=28.9, lng=77.0)),
            "images": [],
            "tags": ["organic", "fresh", "local"],
            "selling_mode": SellingMode.FLEXIBLE,
            "status": ListingStatus.ACTIVE,
            "views": 145,
            "saves": 23,
            "created_at": datetime.now() - timedelta(hours=6),
        },
        {
            "id": "lst_002",
            "farmer_id": "f2",
            "farmer_name": "Sunita Devi",
            "farmer_profile": farmers[1],
            "title": "Premium Basmati Rice",
            "description": "Long-grain premium basmati rice. Aged for 12 months for best aroma and taste.",
            "product_type": ProductType.GRAINS,
            "category": ListingCategory.FRESH_PRODUCE,
            "quantity": 200,
            "quantity_sold": 45,
            "unit": "kg",
            "price_per_unit": 85,
            "original_price": None,
            "discount_percent": None,
            "harvest_date": datetime.now() - timedelta(days=30),
            "expiry_date": datetime.now() + timedelta(days=180),
            "freshness_level": FreshnessLevel.EXCELLENT,
            "spoilage_indicator": None,
            "location": Location(city="Karnal", state="Haryana", pincode="132001", coordinates=Coordinates(lat=29.6, lng=76.9)),
            "images": [],
            "tags": ["premium", "basmati", "aged"],
            "selling_mode": SellingMode.SELL,
            "status": ListingStatus.ACTIVE,
            "views": 234,
            "saves": 45,
            "created_at": datetime.now() - timedelta(days=2),
        },
        {
            "id": "lst_003",
            "farmer_id": "f1",
            "farmer_name": "Ramesh Kumar",
            "farmer_profile": farmers[0],
            "title": "Surplus Spinach - Rescue Priority",
            "description": "Fresh spinach that needs to be consumed soon. Perfect for NGOs and food banks.",
            "product_type": ProductType.VEGETABLES,
            "category": ListingCategory.NGO_RESCUE,
            "quantity": 80,
            "quantity_sold": 0,
            "unit": "kg",
            "price_per_unit": 0,
            "original_price": 30,
            "discount_percent": 100,
            "harvest_date": datetime.now() - timedelta(days=2),
            "expiry_date": datetime.now() + timedelta(hours=18),
            "freshness_level": FreshnessLevel.URGENT,
            "spoilage_indicator": SpoilageIndicator(
                level="urgent",
                hours_remaining=18,
                percentage=25,
                message="Rescue immediately! Only 18 hours left",
                color="#D32F2F"
            ),
            "location": Location(city="Sonipat", state="Haryana", pincode="131001", coordinates=Coordinates(lat=28.9, lng=77.0)),
            "images": [],
            "tags": ["rescue", "donation", "urgent"],
            "selling_mode": SellingMode.DONATE,
            "status": ListingStatus.ACTIVE,
            "views": 67,
            "saves": 12,
            "created_at": datetime.now() - timedelta(hours=12),
        },
    ]
    
    return [MarketplaceListingResponse(**lst) for lst in listings]

mock_listings = generate_mock_listings()

# ============================================
# HELPER FUNCTIONS
# ============================================

def is_listing_expired(listing) -> bool:
    """Check if a listing is expired based on its expiry_date"""
    expiry_date = getattr(listing, 'expiry_date', None)
    if expiry_date and isinstance(expiry_date, datetime):
        return datetime.now() >= expiry_date
    return False


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
    include_expired: bool = False
):
    """Get all marketplace listings with optional filters
    
    By default, expired listings are excluded. Set include_expired=true to show them.
    """
    filtered = mock_listings.copy()
    
    # Exclude expired listings by default (check both status and expiry_date)
    if not include_expired:
        filtered = [l for l in filtered if l.status != ListingStatus.EXPIRED and not is_listing_expired(l)]
    
    # Apply filters
    if category:
        filtered = [l for l in filtered if l.category == category]
    if product_type:
        filtered = [l for l in filtered if l.product_type == product_type]
    if price_min is not None:
        filtered = [l for l in filtered if l.price_per_unit >= price_min]
    if price_max is not None:
        filtered = [l for l in filtered if l.price_per_unit <= price_max]
    if freshness:
        filtered = [l for l in filtered if l.freshness_level == freshness]
    if city:
        filtered = [l for l in filtered if l.location.city.lower() == city.lower()]
    if state:
        filtered = [l for l in filtered if l.location.state.lower() == state.lower()]
    if verified_only:
        filtered = [l for l in filtered if l.farmer_profile and l.farmer_profile.verified]
    
    # Sort
    if sort_by == "price_asc":
        filtered.sort(key=lambda x: x.price_per_unit)
    elif sort_by == "price_desc":
        filtered.sort(key=lambda x: x.price_per_unit, reverse=True)
    elif sort_by == "newest":
        filtered.sort(key=lambda x: x.created_at, reverse=True)
    
    # Paginate
    start = (page - 1) * limit
    end = start + limit
    
    return filtered[start:end]


@router.get("/listings/farmer/{farmer_id}", response_model=List[MarketplaceListingResponse])
async def get_farmer_listings(farmer_id: str, include_expired: bool = False):
    """Get all listings by a specific farmer
    
    By default, expired listings are excluded. Set include_expired=true to show them.
    """
    farmer_listings = []
    for listing in mock_listings:
        # Handle both dict and object access
        farm_id = listing.get("farmer_id") if isinstance(listing, dict) else getattr(listing, "farmer_id", None)
        if str(farm_id) == str(farmer_id):
            # Exclude expired unless specifically requested
            if include_expired or (hasattr(listing, 'status') and listing.status != ListingStatus.EXPIRED and not is_listing_expired(listing)):
                farmer_listings.append(listing)
    return farmer_listings


@router.get("/listings/farmer/{farmer_id}/expired", response_model=List[MarketplaceListingResponse])
async def get_farmer_expired_listings(farmer_id: str):
    """Get all expired listings by a specific farmer (for archives)"""
    farmer_listings = []
    for listing in mock_listings:
        # Handle both dict and object access
        farm_id = listing.get("farmer_id") if isinstance(listing, dict) else getattr(listing, "farmer_id", None)
        if str(farm_id) == str(farmer_id):
            # Include items that are either marked expired OR have passed expiry date
            if (hasattr(listing, 'status') and listing.status == ListingStatus.EXPIRED) or is_listing_expired(listing):
                farmer_listings.append(listing)
    return farmer_listings


@router.get("/listings/{listing_id}", response_model=MarketplaceListingResponse)
async def get_listing(listing_id: str):
    """Get a single listing by ID"""
    for listing in mock_listings:
        if listing.id == listing_id:
            return listing
    raise HTTPException(status_code=404, detail="Listing not found")


@router.post("/listings", response_model=MarketplaceListingResponse)
async def create_listing(listing: MarketplaceListingCreate):
    """Create a new marketplace listing"""
    new_id = f"lst_{uuid.uuid4().hex[:8]}"
    
    # Calculate freshness level based on expiry
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
        
        # Create spoilage indicator for items with expiry
        spoilage = SpoilageIndicator(
            level=freshness_level.value,
            hours_remaining=int(hours_remaining),
            percentage=max(0, min(100, (hours_remaining / 168) * 100)),
            message=f"{'Excellent freshness' if hours_remaining > 72 else 'Good condition' if hours_remaining > 48 else 'Use soon' if hours_remaining > 24 else 'Urgent!'}",
            color="#4CAF50" if hours_remaining > 72 else "#FFA000" if hours_remaining > 24 else "#D32F2F"
        )
    
    # Calculate discount
    discount = None
    if listing.original_price and listing.original_price > listing.price_per_unit:
        discount = ((listing.original_price - listing.price_per_unit) / listing.original_price) * 100
    
    new_listing = MarketplaceListingResponse(
        id=new_id,
        farmer_id="current_user_id",  # Replace with actual user ID
        farmer_name="Current Farmer",  # Replace with actual user name
        title=listing.title,
        description=listing.description,
        product_type=listing.product_type,
        category=listing.category,
        quantity=listing.quantity,
        unit=listing.unit,
        price_per_unit=listing.price_per_unit,
        original_price=listing.original_price,
        discount_percent=discount,
        harvest_date=listing.harvest_date,
        expiry_date=listing.expiry_date,
        freshness_level=freshness_level,
        spoilage_indicator=spoilage,
        location=listing.location,
        images=listing.images,
        tags=listing.tags,
        selling_mode=listing.selling_mode,
        status=ListingStatus.ACTIVE,
        created_at=datetime.now()
    )
    
    mock_listings.append(new_listing)
    return new_listing


@router.put("/listings/{listing_id}", response_model=MarketplaceListingResponse)
async def update_listing(listing_id: str, updates: MarketplaceListingUpdate):
    """Update an existing listing"""
    for i, listing in enumerate(mock_listings):
        if listing.id == listing_id:
            listing_dict = listing.dict()
            update_dict = updates.dict(exclude_unset=True)
            listing_dict.update(update_dict)
            listing_dict["updated_at"] = datetime.now()
            mock_listings[i] = MarketplaceListingResponse(**listing_dict)
            return mock_listings[i]
    raise HTTPException(status_code=404, detail="Listing not found")


@router.delete("/listings/{listing_id}")
async def delete_listing(listing_id: str):
    """Delete a listing"""
    for i, listing in enumerate(mock_listings):
        if listing.id == listing_id:
            del mock_listings[i]
            return {"message": "Listing deleted successfully"}
    raise HTTPException(status_code=404, detail="Listing not found")


# ============================================
# CATEGORY ENDPOINTS
# ============================================

@router.get("/near-expiry", response_model=List[MarketplaceListingResponse])
async def get_near_expiry_listings():
    """Get listings that are near expiry (priority rescue)"""
    return [l for l in mock_listings if l.category == ListingCategory.NEAR_EXPIRY and l.status != ListingStatus.EXPIRED and not is_listing_expired(l)]


@router.get("/ngo-rescue", response_model=List[MarketplaceListingResponse])
async def get_ngo_rescue_listings():
    """Get listings available for NGO rescue"""
    return [l for l in mock_listings if (l.category == ListingCategory.NGO_RESCUE or l.selling_mode == SellingMode.DONATE) and l.status != ListingStatus.EXPIRED and not is_listing_expired(l)]


@router.get("/flash-sales", response_model=List[MarketplaceListingResponse])
async def get_flash_sales():
    """Get flash sale listings with high discounts"""
    return [l for l in mock_listings if l.discount_percent and l.discount_percent >= 30 and l.status != ListingStatus.EXPIRED and not is_listing_expired(l)]


@router.get("/bulk-lots", response_model=List[MarketplaceListingResponse])
async def get_bulk_lots():
    """Get bulk quantity listings for processors"""
    return [l for l in mock_listings if l.quantity >= 100 and l.status != ListingStatus.EXPIRED and not is_listing_expired(l)]


# ============================================
# SEARCH ENDPOINT
# ============================================

@router.post("/search", response_model=List[MarketplaceListingResponse])
async def search_listings(search: SearchQuery):
    """Search listings with query and filters"""
    query = search.query.lower()
    
    results = [
        l for l in mock_listings
        if (query in l.title.lower() 
        or query in l.description.lower()
        or any(query in tag.lower() for tag in l.tags))
        and l.status != ListingStatus.EXPIRED
        and not is_listing_expired(l)
    ]
    
    return results


# ============================================
# SMART PRICING ENDPOINT
# ============================================

@router.post("/price-suggestion", response_model=PriceSuggestionResponse)
async def get_price_suggestion(request: PriceSuggestionRequest):
    """Get AI-powered price suggestion based on market conditions"""
    # Mock pricing logic - replace with actual ML model
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
    
    # Adjust for freshness
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
        ]
    )


# ============================================
# IMPACT ENDPOINTS
# ============================================

@router.get("/impact", response_model=ImpactMetrics)
async def get_impact_metrics():
    """Get overall platform impact metrics"""
    return ImpactMetrics(
        food_saved_kg=125000,
        meals_provided=416666,
        carbon_saved_kg=62500,
        water_saved_liters=3750000,
        farmers_supported=2456,
        ngos_partnered=187,
        districts_served=342,
        transactions_completed=15678
    )


@router.get("/impact/districts", response_model=List[DistrictAnalytics])
async def get_district_analytics(state: Optional[str] = None):
    """Get district-wise analytics"""
    districts = [
        DistrictAnalytics(
            district_name="Sonipat",
            state="Haryana",
            total_listings=456,
            active_listings=89,
            food_rescued_kg=12500,
            top_products=[
                {"name": "Tomatoes", "quantity": 3200},
                {"name": "Wheat", "quantity": 2800},
            ],
            ngo_activity=23,
            waste_prevention_rate=87
        ),
        DistrictAnalytics(
            district_name="Gurugram",
            state="Haryana",
            total_listings=678,
            active_listings=134,
            food_rescued_kg=18200,
            top_products=[
                {"name": "Leafy Greens", "quantity": 4100},
                {"name": "Dairy", "quantity": 3200},
            ],
            ngo_activity=31,
            waste_prevention_rate=92
        ),
    ]
    
    if state:
        return [d for d in districts if d.state.lower() == state.lower()]
    return districts


@router.get("/impact/trends", response_model=List[TrendData])
async def get_impact_trends():
    """Get impact trends over time"""
    return [
        TrendData(date="Jan", food_saved=8500, transactions=1200, meals_provided=28333),
        TrendData(date="Feb", food_saved=9200, transactions=1350, meals_provided=30666),
        TrendData(date="Mar", food_saved=10800, transactions=1480, meals_provided=36000),
        TrendData(date="Apr", food_saved=11500, transactions=1620, meals_provided=38333),
        TrendData(date="May", food_saved=12300, transactions=1780, meals_provided=41000),
        TrendData(date="Jun", food_saved=13200, transactions=1920, meals_provided=44000),
    ]


@router.get("/impact/government-report", response_model=GovernmentReport)
async def generate_government_report(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """Generate a government-ready impact report"""
    return GovernmentReport(
        report_type="Monthly Impact Summary",
        date_range={"start": start_date or "2024-01-01", "end": end_date or "2024-12-31"},
        metrics=ImpactMetrics(
            food_saved_kg=125000,
            meals_provided=416666,
            carbon_saved_kg=62500,
            water_saved_liters=3750000,
            farmers_supported=2456,
            ngos_partnered=187,
            districts_served=342,
            transactions_completed=15678
        ),
        district_data=[
            DistrictAnalytics(
                district_name="Sonipat",
                state="Haryana",
                total_listings=456,
                active_listings=89,
                food_rescued_kg=12500,
                top_products=[{"name": "Tomatoes", "quantity": 3200}],
                ngo_activity=23,
                waste_prevention_rate=87
            )
        ],
        trends=[
            TrendData(date="Jan", food_saved=8500, transactions=1200, meals_provided=28333),
        ]
    )


# ============================================
# CART & ORDERS ENDPOINTS
# ============================================

@router.get("/cart/{user_id}", response_model=Cart)
async def get_cart(user_id: str):
    """Get user's cart"""
    if user_id in mock_carts:
        return mock_carts[user_id]
    return Cart(user_id=user_id, items=[])


@router.post("/cart/{user_id}/add")
async def add_to_cart(user_id: str, item: CartItem):
    """Add item to cart"""
    if user_id not in mock_carts:
        mock_carts[user_id] = Cart(user_id=user_id, items=[])
    
    # Check if item already in cart
    for existing in mock_carts[user_id].items:
        if existing.listing_id == item.listing_id:
            existing.quantity += item.quantity
            return {"message": "Cart updated"}
    
    mock_carts[user_id].items.append(item)
    return {"message": "Item added to cart"}


@router.delete("/cart/{user_id}/remove/{listing_id}")
async def remove_from_cart(user_id: str, listing_id: str):
    """Remove item from cart"""
    if user_id in mock_carts:
        mock_carts[user_id].items = [
            i for i in mock_carts[user_id].items if i.listing_id != listing_id
        ]
    return {"message": "Item removed from cart"}


@router.post("/orders", response_model=Order)
async def create_order(
    user_id: str,
    address: DeliveryAddress,
    payment_method: str
):
    """Create a new order from cart"""
    if user_id not in mock_carts or not mock_carts[user_id].items:
        raise HTTPException(status_code=400, detail="Cart is empty")
    
    cart = mock_carts[user_id]
    order_items = []
    subtotal = 0
    
    for cart_item in cart.items:
        listing = next((l for l in mock_listings if l.id == cart_item.listing_id), None)
        if listing:
            item_total = listing.price_per_unit * cart_item.quantity
            order_items.append(OrderItem(
                listing_id=listing.id,
                listing_title=listing.title,
                farmer_id=listing.farmer_id,
                farmer_name=listing.farmer_name,
                quantity=cart_item.quantity,
                unit=listing.unit,
                price_per_unit=listing.price_per_unit,
                total_price=item_total
            ))
            subtotal += item_total
    
    delivery_fee = 0 if subtotal > 500 else 49
    platform_fee = 9
    total = subtotal + delivery_fee + platform_fee
    
    order = Order(
        id=f"ANNAM{uuid.uuid4().hex[:8].upper()}",
        user_id=user_id,
        items=order_items,
        delivery_address=address,
        subtotal=subtotal,
        delivery_fee=delivery_fee,
        platform_fee=platform_fee,
        total=total,
        payment_method=payment_method,
        estimated_delivery=datetime.now() + timedelta(days=2)
    )
    
    mock_orders.append(order)
    
    # Clear cart
    mock_carts[user_id] = Cart(user_id=user_id, items=[])
    
    return order


@router.get("/orders/{order_id}", response_model=Order)
async def get_order(order_id: str):
    """Get order by ID"""
    for order in mock_orders:
        if order.id == order_id:
            return order
    raise HTTPException(status_code=404, detail="Order not found")


@router.get("/orders/user/{user_id}", response_model=List[Order])
async def get_user_orders(user_id: str):
    """Get all orders for a user"""
    return [o for o in mock_orders if o.user_id == user_id]
