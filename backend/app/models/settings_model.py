from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class DriverSettingsModel(BaseModel):
    driver_id: str
    
    # Profile
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    
    # Vehicle
    vehicle_type: Optional[str] = None
    vehicle_number: Optional[str] = None
    vehicle_model: Optional[str] = None
    license_number: Optional[str] = None
    
    # Payment
    bank_account_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_ifsc: Optional[str] = None
    upi_id: Optional[str] = None
    
    # Preferences
    language: Optional[str] = "English"
    notifications_email: Optional[bool] = True
    notifications_sms: Optional[bool] = False
    notifications_push: Optional[bool] = True
    
    # Work preferences
    max_distance: Optional[int] = 25
    available_from: Optional[str] = "09:00"
    available_to: Optional[str] = "21:00"
    working_days: Optional[List[str]] = None


class FarmerSettingsModel(BaseModel):
    farmer_id: str
    
    # Profile
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    
    # Farm details
    farm_name: Optional[str] = None
    farm_location: Optional[str] = None
    farm_size: Optional[str] = None
    farm_type: Optional[str] = None
    crops: Optional[List[str]] = None
    
    # Address
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    
    # Preferences
    language: Optional[str] = "English"
    notifications_email: Optional[bool] = True
    notifications_sms: Optional[bool] = False
    notifications_whatsapp: Optional[bool] = True


class NgoSettingsModel(BaseModel):
    ngo_id: str
    
    # Admin details
    admin_name: Optional[str] = None
    admin_email: Optional[str] = None
    admin_phone: Optional[str] = None
    
    # Organization details
    organization_name: Optional[str] = None
    organization_email: Optional[str] = None
    organization_phone: Optional[str] = None


class FarmerProfileModel(BaseModel):
    farmer_id: str

    # Personal
    full_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    aadhaar: Optional[str] = None
    profile_photo: Optional[str] = None

    # Farm Location
    farm_address: Optional[str] = None
    village: Optional[str] = None
    taluka: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    gps_lat: Optional[str] = None
    gps_lng: Optional[str] = None

    # Farm Details
    farm_size: Optional[str] = None
    farm_size_unit: Optional[str] = "acres"
    farming_type: Optional[str] = None
    storage_facilities: Optional[List[str]] = None

    # Crops
    primary_crops: Optional[List[str]] = None

    # Rescue Preferences
    auto_ngo_rescue: Optional[bool] = False
    min_selling_price: Optional[str] = None
    discount_threshold: Optional[str] = None
    preferred_ngos: Optional[List[str]] = None

    # Status
    profile_complete: Optional[bool] = False
    completed_at: Optional[str] = None
    registration_number: Optional[str] = None
    pan_number: Optional[str] = None
    
    # Mission
    mission: Optional[str] = None
    vision: Optional[str] = None
    cause_areas: Optional[List[str]] = None
    
    # Address
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    
    # Payment
    bank_account_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_ifsc: Optional[str] = None
    upi_id: Optional[str] = None
    
    # Preferences
    language: Optional[str] = "English"
    notifications_email: Optional[bool] = True
    notifications_sms: Optional[bool] = False
    notifications_whatsapp: Optional[bool] = True
