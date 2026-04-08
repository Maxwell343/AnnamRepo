from fastapi import APIRouter, HTTPException
from datetime import datetime
from app.models.settings_model import DriverSettingsModel, FarmerSettingsModel, NgoSettingsModel, FarmerProfileModel
from app.services.settings_service import (
    get_driver_settings, save_driver_settings,
    get_farmer_settings, save_farmer_settings,
    get_ngo_settings, save_ngo_settings,
    get_user_profile, update_user_profile,
    get_farmer_analytics, get_ngo_analytics, get_driver_analytics
)

router = APIRouter()


# ==================== DRIVER SETTINGS ====================

@router.get("/api/settings/driver/{driver_id}")
async def get_driver_settings_route(driver_id: str):
    """Get driver settings"""
    settings = await get_driver_settings(driver_id)
    if not settings:
        # Return empty settings if none exist
        return {"driver_id": driver_id}
    return settings


@router.post("/api/settings/driver")
async def save_driver_settings_route(settings: DriverSettingsModel):
    """Save driver settings"""
    settings_dict = settings.dict(exclude_unset=True)
    is_profile_complete = bool(
        (settings_dict.get("name") or "").strip()
        and (settings_dict.get("phone") or "").strip()
        and (settings_dict.get("vehicle_number") or "").strip()
        and (settings_dict.get("license_number") or "").strip()
    )
    result = await save_driver_settings(settings_dict)

    if settings_dict.get("driver_id"):
        await update_user_profile(settings_dict["driver_id"], {
            "name": settings_dict.get("name"),
            "email": settings_dict.get("email"),
            "phone": settings_dict.get("phone"),
            "vehicle_number": settings_dict.get("vehicle_number"),
            "profile_complete": is_profile_complete,
            "profileComplete": is_profile_complete,
            "profileCompleted": is_profile_complete,
        })

    return {"message": "Settings saved successfully", "settings": result}


@router.put("/api/settings/driver/{driver_id}")
async def update_driver_settings_route(driver_id: str, settings: DriverSettingsModel):
    """Update driver settings"""
    settings_dict = settings.dict(exclude_unset=True)
    settings_dict["driver_id"] = driver_id
    is_profile_complete = bool(
        (settings_dict.get("name") or "").strip()
        and (settings_dict.get("phone") or "").strip()
        and (settings_dict.get("vehicle_number") or "").strip()
        and (settings_dict.get("license_number") or "").strip()
    )
    result = await save_driver_settings(settings_dict)
    
    await update_user_profile(driver_id, {
        "name": settings_dict.get("name"),
        "email": settings_dict.get("email"),
        "phone": settings_dict.get("phone"),
        "vehicle_number": settings_dict.get("vehicle_number"),
        "profile_complete": is_profile_complete,
        "profileComplete": is_profile_complete,
        "profileCompleted": is_profile_complete,
    })

    return {"message": "Settings updated successfully", "settings": result}


# ==================== FARMER SETTINGS ====================

@router.get("/api/settings/farmer/{farmer_id}")
async def get_farmer_settings_route(farmer_id: str):
    """Get farmer settings"""
    settings = await get_farmer_settings(farmer_id)
    if not settings:
        return {"farmer_id": farmer_id}
    return settings


@router.post("/api/settings/farmer")
async def save_farmer_settings_route(settings: FarmerSettingsModel):
    """Save farmer settings"""
    settings_dict = settings.dict(exclude_unset=True)
    settings_dict.pop("verification_status", None)
    settings_dict.pop("kyc_status", None)
    is_profile_complete = bool(
        (settings_dict.get("name") or "").strip()
        and (settings_dict.get("phone") or "").strip()
        and (settings_dict.get("farm_location") or "").strip()
    )
    settings_dict["profile_complete"] = is_profile_complete
    result = await save_farmer_settings(settings_dict)

    if settings_dict.get("farmer_id"):
        await update_user_profile(settings_dict["farmer_id"], {
            "name": settings_dict.get("name"),
            "email": settings_dict.get("email"),
            "phone": settings_dict.get("phone"),
            "address": settings_dict.get("farm_location"),
            "profile_complete": is_profile_complete,
            "profileComplete": is_profile_complete,
            "profileCompleted": is_profile_complete,
        })

    return {"message": "Settings saved successfully", "settings": result}


@router.put("/api/settings/farmer/{farmer_id}")
async def update_farmer_settings_route(farmer_id: str, settings: FarmerSettingsModel):
    """Update farmer settings"""
    settings_dict = settings.dict(exclude_unset=True)
    settings_dict["farmer_id"] = farmer_id
    settings_dict.pop("verification_status", None)
    settings_dict.pop("kyc_status", None)
    is_profile_complete = bool(
        (settings_dict.get("name") or "").strip()
        and (settings_dict.get("phone") or "").strip()
        and (settings_dict.get("farm_location") or "").strip()
    )
    settings_dict["profile_complete"] = is_profile_complete
    result = await save_farmer_settings(settings_dict)

    await update_user_profile(farmer_id, {
        "name": settings_dict.get("name"),
        "email": settings_dict.get("email"),
        "phone": settings_dict.get("phone"),
        "address": settings_dict.get("farm_location"),
        "profile_complete": is_profile_complete,
        "profileComplete": is_profile_complete,
        "profileCompleted": is_profile_complete,
    })

    return {"message": "Settings updated successfully", "settings": result}


# ==================== NGO SETTINGS ====================

@router.get("/api/settings/ngo/{ngo_id}")
async def get_ngo_settings_route(ngo_id: str):
    """Get NGO settings"""
    settings = await get_ngo_settings(ngo_id)
    if not settings:
        return {"ngo_id": ngo_id}
    return settings


@router.post("/api/settings/ngo")
async def save_ngo_settings_route(settings: NgoSettingsModel):
    """Save NGO settings"""
    settings_dict = settings.dict(exclude_unset=True)
    settings_dict.pop("verification_status", None)
    settings_dict.pop("kyc_status", None)
    is_profile_complete = bool(
        (settings_dict.get("admin_name") or "").strip()
        and (settings_dict.get("admin_phone") or "").strip()
        and (settings_dict.get("organization_name") or "").strip()
    )
    settings_dict["profile_complete"] = is_profile_complete
    if is_profile_complete:
        settings_dict["completed_at"] = datetime.utcnow().isoformat()
    result = await save_ngo_settings(settings_dict)

    if settings_dict.get("ngo_id"):
        await update_user_profile(settings_dict["ngo_id"], {
            "name": settings_dict.get("admin_name") or settings_dict.get("organization_name"),
            "email": settings_dict.get("admin_email") or settings_dict.get("organization_email"),
            "phone": settings_dict.get("admin_phone") or settings_dict.get("organization_phone"),
            "address": settings_dict.get("address"),
            "city": settings_dict.get("city"),
            "state": settings_dict.get("state"),
            "pincode": settings_dict.get("pincode"),
            "profile_complete": is_profile_complete,
            "profileComplete": is_profile_complete,
            "profileCompleted": is_profile_complete,
            "ngo_profile": {
                "organization_name": settings_dict.get("organization_name"),
                "organization_email": settings_dict.get("organization_email"),
                "organization_phone": settings_dict.get("organization_phone"),
                "admin_name": settings_dict.get("admin_name"),
                "admin_email": settings_dict.get("admin_email"),
                "admin_phone": settings_dict.get("admin_phone"),
            }
        })
    return {"message": "Settings saved successfully", "settings": result}


@router.put("/api/settings/ngo/{ngo_id}")
async def update_ngo_settings_route(ngo_id: str, settings: NgoSettingsModel):
    """Update NGO settings"""
    settings_dict = settings.dict(exclude_unset=True)
    settings_dict["ngo_id"] = ngo_id
    settings_dict.pop("verification_status", None)
    settings_dict.pop("kyc_status", None)
    is_profile_complete = bool(
        (settings_dict.get("admin_name") or "").strip()
        and (settings_dict.get("admin_phone") or "").strip()
        and (settings_dict.get("organization_name") or "").strip()
    )
    settings_dict["profile_complete"] = is_profile_complete
    if is_profile_complete:
        settings_dict["completed_at"] = datetime.utcnow().isoformat()

    result = await save_ngo_settings(settings_dict)

    await update_user_profile(ngo_id, {
        "name": settings_dict.get("admin_name") or settings_dict.get("organization_name"),
        "email": settings_dict.get("admin_email") or settings_dict.get("organization_email"),
        "phone": settings_dict.get("admin_phone") or settings_dict.get("organization_phone"),
        "address": settings_dict.get("address"),
        "city": settings_dict.get("city"),
        "state": settings_dict.get("state"),
        "pincode": settings_dict.get("pincode"),
        "profile_complete": is_profile_complete,
        "profileComplete": is_profile_complete,
        "profileCompleted": is_profile_complete,
        "ngo_profile": {
            "organization_name": settings_dict.get("organization_name"),
            "organization_email": settings_dict.get("organization_email"),
            "organization_phone": settings_dict.get("organization_phone"),
            "admin_name": settings_dict.get("admin_name"),
            "admin_email": settings_dict.get("admin_email"),
            "admin_phone": settings_dict.get("admin_phone"),
        }
    })

    return {"message": "Settings updated successfully", "settings": result}


# ==================== FARMER PROFILE (SETUP WIZARD) ====================

@router.get("/api/farmer/profile/{farmer_id}")
async def get_farmer_profile_route(farmer_id: str):
    """Get farmer profile setup data"""
    profile = await get_farmer_settings(farmer_id)
    if not profile:
        return {"farmer_id": farmer_id, "profile_complete": False}
    return profile


@router.put("/api/farmer/profile/{farmer_id}")
async def update_farmer_profile_route(farmer_id: str, profile: FarmerProfileModel):
    """Save farmer profile from the setup wizard"""
    profile_dict = profile.dict(exclude_unset=True)
    profile_dict["farmer_id"] = farmer_id
    profile_dict["profile_complete"] = True
    profile_dict["completed_at"] = datetime.utcnow().isoformat()
    result = await save_farmer_settings(profile_dict)

    # Keep the main user document in sync so admin/user views see latest profile state.
    await update_user_profile(farmer_id, {
        "name": profile_dict.get("full_name"),
        "email": profile_dict.get("email"),
        "phone": profile_dict.get("phone"),
        "address": profile_dict.get("farm_address"),
        "city": profile_dict.get("village"),
        "district": profile_dict.get("district"),
        "state": profile_dict.get("state"),
        "pincode": profile_dict.get("pincode"),
        "profile_complete": True,
        "profileComplete": True,
        "profileCompleted": True,
        "farmer_profile": {
            "farm_size": profile_dict.get("farm_size"),
            "farm_size_unit": profile_dict.get("farm_size_unit"),
            "farming_type": profile_dict.get("farming_type"),
            "primary_crops": profile_dict.get("primary_crops", []),
            "storage_facilities": profile_dict.get("storage_facilities", []),
        }
    })

    return {"message": "Profile saved successfully", "profile": result}


# ==================== USER PROFILE ====================

@router.get("/api/users/{user_id}/profile")
async def get_user_profile_route(user_id: str):
    """Get user profile"""
    profile = await get_user_profile(user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")
    return profile


@router.put("/api/users/{user_id}/profile")
async def update_user_profile_route(user_id: str, profile_data: dict):
    """Update user profile"""
    result = await update_user_profile(user_id, profile_data)
    if not result:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "Profile updated successfully", "profile": result}


# ==================== ANALYTICS ====================

@router.get("/api/analytics/farmer/{farmer_id}")
async def get_farmer_analytics_route(farmer_id: str):
    """Get farmer analytics and impact data"""
    return await get_farmer_analytics(farmer_id)


@router.get("/api/analytics/ngo/{ngo_id}")
async def get_ngo_analytics_route(ngo_id: str):
    """Get NGO analytics and impact data"""
    return await get_ngo_analytics(ngo_id)


@router.get("/api/analytics/driver/{driver_id}")
async def get_driver_analytics_route(driver_id: str):
    """Get driver analytics data"""
    return await get_driver_analytics(driver_id)
