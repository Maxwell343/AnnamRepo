from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum

class ListingType(str, Enum):
    VEGETABLE = "Vegetable"
    FRUIT = "Fruit"
    GRAIN = "Grain"
    DAIRY = "Dairy"
    OTHER = "Other"

class ListingStatus(str, Enum):
    AVAILABLE = "available"
    CLAIMED = "claimed"
    ASSIGNED = "assigned"
    PICKED_UP = "picked_up"
    IN_TRANSIT = "in_transit"
    DELIVERED = "delivered"
    EXPIRED = "expired"
    CANCELLED = "cancelled"
    RESCUE = "rescue"
    DONATION = "donation"
    PENDING_DONATION = "pending_donation"
    DISCOUNTED = "discounted"

class ListingCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    quantity: str
    type: ListingType = ListingType.OTHER
    price: Optional[float] = None
    expiry_date: Optional[str] = None
    pickup_address: str
    pickup_time: Optional[str] = None
    farmer_id: str
    farmer_name: str
    farmer_phone: Optional[str] = None
    image: Optional[str] = None
    notes: Optional[str] = None
    # ML prediction fields
    storage_type: Optional[str] = None
    harvest_datetime: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    pending_ngo_id: Optional[str] = None
    declined_ngo_ids: Optional[List[str]] = []

class ListingUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    quantity: Optional[str] = None
    type: Optional[ListingType] = None
    price: Optional[float] = None
    expiry_date: Optional[str] = None
    pickup_address: Optional[str] = None
    pickup_time: Optional[str] = None
    image: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[ListingStatus] = None

class ClaimRequest(BaseModel):
    ngo_id: str
    ngo_name: str
    ngo_phone: Optional[str] = None
    ngo_address: Optional[str] = None
    claim_quantity: Optional[str] = None

class AssignDriverRequest(BaseModel):
    driver_id: str
    driver_name: str
    driver_phone: Optional[str] = None
    vehicle_number: Optional[str] = None

class DeliveryStatusUpdate(BaseModel):
    status: str
    notes: Optional[str] = None
    location: Optional[str] = None


class PickupAcceptRequest(BaseModel):
    driver_id: str
    driver_name: Optional[str] = None
    driver_phone: Optional[str] = None
    vehicle_number: Optional[str] = None


class DriverLocationUpdate(BaseModel):
    lat: float
    lng: float
    heading: Optional[float] = None
    speed: Optional[float] = None


class RescueActionRequest(BaseModel):
    action: str  # "donate" or "sell_discounted"
    farmer_id: Optional[str] = None
