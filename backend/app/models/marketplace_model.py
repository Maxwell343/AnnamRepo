"""
ANNAM Marketplace Models
Pydantic models for the marketplace functionality
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime
from enum import Enum


class ProductType(str, Enum):
    VEGETABLES = "vegetables"
    FRUITS = "fruits"
    GRAINS = "grains"
    DAIRY = "dairy"
    PULSES = "pulses"
    SPICES = "spices"
    PREPARED = "prepared"
    OTHER = "other"


class ListingCategory(str, Enum):
    FRESH_PRODUCE = "fresh_produce"
    NEAR_EXPIRY = "near_expiry"
    NGO_RESCUE = "ngo_rescue"
    BULK_LOTS = "bulk_lots"
    FLASH_SALE = "flash_sale"


class FreshnessLevel(str, Enum):
    EXCELLENT = "excellent"
    GOOD = "good"
    FAIR = "fair"
    URGENT = "urgent"


class SellingMode(str, Enum):
    SELL = "sell"
    DONATE = "donate"
    AUTO_DONATE = "auto_donate"
    FLEXIBLE = "flexible"


class ListingStatus(str, Enum):
    ACTIVE = "active"
    SOLD = "sold"
    EXPIRED = "expired"
    DONATED = "donated"
    CANCELLED = "cancelled"


class Coordinates(BaseModel):
    lat: float
    lng: float


class Location(BaseModel):
    city: str
    state: str
    pincode: str
    coordinates: Optional[Coordinates] = None


class TrustIndicator(BaseModel):
    type: Literal["verified", "rating", "organic", "local", "fast_responder", "top_seller"]
    value: Optional[float] = None
    label: str


class FarmerProfile(BaseModel):
    id: str
    name: str
    avatar: Optional[str] = None
    farm_name: Optional[str] = None
    location: Location
    rating: float = 0.0
    total_sales: int = 0
    joined_date: datetime
    trust_indicators: List[TrustIndicator] = []
    response_time: Optional[int] = None  # in minutes
    verified: bool = False


class SpoilageIndicator(BaseModel):
    level: Literal["fresh", "good", "fair", "urgent", "critical"]
    hours_remaining: int
    percentage: float
    message: str
    color: str


class PriceInfo(BaseModel):
    current: float
    original: Optional[float] = None
    discount_percent: Optional[float] = None
    bulk_discount: Optional[float] = None
    bulk_min_quantity: Optional[int] = None
    auto_reduce: bool = False
    auto_reduce_percent: Optional[float] = None


# Create Listing Request
class MarketplaceListingCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=100)
    description: str = Field(..., max_length=1000)
    product_type: ProductType
    category: ListingCategory = ListingCategory.FRESH_PRODUCE
    quantity: float = Field(..., gt=0)
    unit: str = Field(default="kg")
    
    # Pricing
    price_per_unit: float = Field(..., ge=0)
    original_price: Optional[float] = None
    bulk_discount_percent: Optional[float] = None
    bulk_min_quantity: Optional[int] = None
    auto_reduce_price: bool = False
    auto_reduce_percent: Optional[float] = None
    
    # Dates
    harvest_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    
    # Options
    selling_mode: SellingMode = SellingMode.SELL
    auto_donate_hours: Optional[int] = None
    ngo_only: bool = False
    
    # Location
    location: Location
    
    # Media
    images: List[str] = []
    
    # Tags
    tags: List[str] = []


class MarketplaceListingUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    quantity: Optional[float] = None
    price_per_unit: Optional[float] = None
    original_price: Optional[float] = None
    status: Optional[ListingStatus] = None
    images: Optional[List[str]] = None
    tags: Optional[List[str]] = None


class MarketplaceListingResponse(BaseModel):
    id: str
    farmer_id: str
    farmer_name: str
    farmer_profile: Optional[FarmerProfile] = None
    
    title: str
    description: str
    product_type: ProductType
    category: ListingCategory
    
    quantity: float
    quantity_sold: float = 0
    unit: str
    
    price_per_unit: float
    original_price: Optional[float] = None
    discount_percent: Optional[float] = None
    
    harvest_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    freshness_level: FreshnessLevel
    spoilage_indicator: Optional[SpoilageIndicator] = None
    
    location: Location
    images: List[str] = []
    tags: List[str] = []
    
    selling_mode: SellingMode
    status: ListingStatus
    
    views: int = 0
    saves: int = 0
    
    created_at: datetime
    updated_at: Optional[datetime] = None


# Cart & Order Models
class CartItem(BaseModel):
    listing_id: str
    quantity: float


class Cart(BaseModel):
    user_id: str
    items: List[CartItem] = []
    updated_at: datetime = Field(default_factory=datetime.now)


class DeliveryAddress(BaseModel):
    full_name: str
    phone: str
    address: str
    city: str
    state: str
    pincode: str
    landmark: Optional[str] = None


class OrderItem(BaseModel):
    listing_id: str
    listing_title: str
    farmer_id: str
    farmer_name: str
    quantity: float
    unit: str
    price_per_unit: float
    total_price: float


class OrderStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    PROCESSING = "processing"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class Order(BaseModel):
    id: str
    user_id: str
    items: List[OrderItem]
    
    delivery_address: DeliveryAddress
    
    subtotal: float
    delivery_fee: float
    platform_fee: float
    total: float
    savings: float = 0
    
    payment_method: str
    payment_status: str = "pending"
    
    status: OrderStatus = OrderStatus.PENDING
    
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: Optional[datetime] = None
    
    estimated_delivery: Optional[datetime] = None
    delivered_at: Optional[datetime] = None


# Impact Models
class ImpactMetrics(BaseModel):
    food_saved_kg: float = 0
    meals_provided: int = 0
    carbon_saved_kg: float = 0
    water_saved_liters: float = 0
    farmers_supported: int = 0
    ngos_partnered: int = 0
    districts_served: int = 0
    transactions_completed: int = 0


class DistrictAnalytics(BaseModel):
    district_name: str
    state: str
    total_listings: int
    active_listings: int
    food_rescued_kg: float
    top_products: List[dict]  # {name: str, quantity: float}
    ngo_activity: int
    waste_prevention_rate: float


class TrendData(BaseModel):
    date: str
    food_saved: float
    transactions: int
    meals_provided: int


class GovernmentReport(BaseModel):
    report_type: str
    date_range: dict  # {start: date, end: date}
    metrics: ImpactMetrics
    district_data: List[DistrictAnalytics]
    trends: List[TrendData]
    generated_at: datetime = Field(default_factory=datetime.now)


# Smart Pricing Models
class PriceSuggestionRequest(BaseModel):
    product_type: ProductType
    quantity: float
    location: Location
    harvest_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    quality: Optional[str] = None


class PriceSuggestionResponse(BaseModel):
    suggested_price: float
    min_price: float
    max_price: float
    market_average: float
    confidence: float
    factors: List[dict]  # {factor: str, impact: str, value: float}


# Search & Filter Models
class MarketplaceFilters(BaseModel):
    category: Optional[ListingCategory] = None
    product_types: Optional[List[ProductType]] = None
    price_min: Optional[float] = None
    price_max: Optional[float] = None
    freshness_levels: Optional[List[FreshnessLevel]] = None
    location_city: Optional[str] = None
    location_state: Optional[str] = None
    distance_km: Optional[float] = None
    verified_only: bool = False
    ngo_only: bool = False
    sort_by: Optional[str] = None  # price_asc, price_desc, freshness, distance, newest
    page: int = 1
    limit: int = 20


class SearchQuery(BaseModel):
    query: str
    filters: Optional[MarketplaceFilters] = None
