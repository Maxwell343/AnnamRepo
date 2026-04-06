from app.core.database import get_database
from typing import Optional, Dict, Any, List
from datetime import datetime
from bson import ObjectId

db = get_database()


def _now_iso() -> str:
    return datetime.utcnow().isoformat()


def _normalize_verification_status(value: Any) -> str:
    status = str(value or "").strip().lower()
    if status in {"approved", "verified"}:
        return "verified"
    if status in {"rejected", "resubmission_required"}:
        return "rejected"
    return "pending"


def _find_user_by_any_id(user_id: str) -> Optional[Dict[str, Any]]:
    if not user_id:
        return None

    filters: List[Dict[str, Any]] = []
    if ObjectId.is_valid(user_id):
        filters.append({"_id": ObjectId(user_id)})
    filters.append({"id": user_id})
    if user_id.isdigit():
        filters.append({"id": int(user_id)})

    return db.users.find_one({"$or": filters}) if filters else None


def _is_user_kyc_verified(user: Optional[Dict[str, Any]]) -> bool:
    if not user:
        return False
    if str(user.get("kyc_status") or "").strip().lower() == "approved":
        return True
    return bool(user.get("kycVerified") or user.get("kyc_verified") or user.get("is_verified"))


def _verification_status_from_user(user: Optional[Dict[str, Any]]) -> str:
    if not user:
        return "pending"

    kyc_status = str(user.get("kyc_status") or "").strip().lower()
    if kyc_status:
        return _normalize_verification_status(kyc_status)

    return "verified" if _is_user_kyc_verified(user) else "pending"


def _prepend_kyc_timeline_event(
    existing_timeline: Optional[List[Dict[str, Any]]],
    *,
    action: str,
    description: str,
    status: str = "info",
    actor: str = "System",
) -> List[Dict[str, Any]]:
    timeline = list(existing_timeline or [])
    timeline.insert(
        0,
        {
            "id": f"t{int(datetime.utcnow().timestamp() * 1000)}",
            "action": action,
            "description": description,
            "timestamp": _now_iso(),
            "actor": actor,
            "status": status,
        },
    )
    return timeline[:50]


def _build_farmer_kyc_documents(document_file_name: str, verified: bool) -> List[Dict[str, Any]]:
    file_name = (document_file_name or "").strip()
    if not file_name:
        return []

    return [
        {
            "id": "farmer-verification-document",
            "type": "id_proof",
            "name": "Farmer Verification Document",
            "fileName": file_name,
            "fileSize": "0 KB",
            "uploadedAt": _now_iso(),
            "status": "verified" if verified else "pending",
        }
    ]


def _build_ngo_kyc_documents(settings_data: Dict[str, Any], verified: bool) -> List[Dict[str, Any]]:
    uploaded_at = settings_data.get("updated_at") or settings_data.get("created_at") or _now_iso()

    candidates = [
        ("registration_certificate_file_name", "Registration Certificate"),
        ("certificate_80g_file_name", "80G Certificate"),
        ("certificate_12a_file_name", "12A Certificate"),
    ]

    documents: List[Dict[str, Any]] = []
    for idx, (field_name, label) in enumerate(candidates, start=1):
        file_name = str(settings_data.get(field_name) or "").strip()
        if not file_name:
            continue

        documents.append(
            {
                "id": f"ngo-document-{idx}",
                "type": "registration",
                "name": label,
                "fileName": file_name,
                "fileSize": "0 KB",
                "uploadedAt": uploaded_at,
                "status": "verified" if verified else "pending",
            }
        )

    return documents


def _sync_farmer_kyc_state(
    farmer_id: str,
    merged_settings: Dict[str, Any],
    previous_settings: Optional[Dict[str, Any]],
) -> str:
    if not farmer_id:
        return _normalize_verification_status(merged_settings.get("verification_status"))

    user = _find_user_by_any_id(str(farmer_id))
    if not user:
        return _normalize_verification_status(merged_settings.get("verification_status"))

    document_file_name = str(merged_settings.get("document_file_name") or "").strip()
    previous_document_file_name = str((previous_settings or {}).get("document_file_name") or "").strip()

    current_kyc_status = str(user.get("kyc_status") or "").strip().lower()
    current_verified = _is_user_kyc_verified(user)

    document_changed = bool(document_file_name) and document_file_name != previous_document_file_name
    was_document_missing = not previous_document_file_name
    resubmission_state = current_kyc_status in {"rejected", "resubmission_required"}
    needs_submission = bool(document_file_name) and (document_changed or was_document_missing or resubmission_state)

    user_updates: Dict[str, Any] = {"updated_at": _now_iso()}
    docs_should_be_verified = (current_kyc_status == "approved" or current_verified) and not needs_submission

    if document_file_name and (needs_submission or not user.get("kyc_documents")):
        user_updates["kyc_documents"] = _build_farmer_kyc_documents(
            document_file_name,
            verified=docs_should_be_verified,
        )

    if needs_submission:
        action = "KYC Resubmitted" if previous_document_file_name else "KYC Submitted"
        description = f"Farmer uploaded verification document: {document_file_name}"
        user_updates.update(
            {
                "kyc_status": "pending",
                "kycVerified": False,
                "kyc_verified": False,
                "kyc_rejection_reason": "",
                "kyc_submitted_at": _now_iso(),
                "kyc_timeline": _prepend_kyc_timeline_event(
                    user.get("kyc_timeline"),
                    action=action,
                    description=description,
                    status="info",
                    actor="User",
                ),
            }
        )
        current_kyc_status = "pending"
        current_verified = False

    if len(user_updates) > 1:
        db.users.update_one({"_id": user["_id"]}, {"$set": user_updates})

    if current_kyc_status == "approved" or current_verified:
        return "verified"
    if current_kyc_status in {"rejected", "resubmission_required"}:
        return "rejected"
    return "pending"


def _sync_ngo_kyc_state(
    ngo_id: str,
    merged_settings: Dict[str, Any],
    previous_settings: Optional[Dict[str, Any]],
) -> str:
    if not ngo_id:
        return _normalize_verification_status(merged_settings.get("verification_status"))

    user = _find_user_by_any_id(str(ngo_id))
    if not user:
        return _normalize_verification_status(merged_settings.get("verification_status"))

    document_fields = [
        "registration_certificate_file_name",
        "certificate_80g_file_name",
        "certificate_12a_file_name",
    ]

    current_doc_names = [str(merged_settings.get(field) or "").strip() for field in document_fields]
    previous_doc_names = [str((previous_settings or {}).get(field) or "").strip() for field in document_fields]

    has_documents_now = any(current_doc_names)
    had_documents_before = any(previous_doc_names)
    documents_changed = has_documents_now and current_doc_names != previous_doc_names

    current_kyc_status = str(user.get("kyc_status") or "").strip().lower()
    current_verified = _is_user_kyc_verified(user)
    resubmission_state = current_kyc_status in {"rejected", "resubmission_required"}

    needs_submission = has_documents_now and (documents_changed or not had_documents_before or resubmission_state)

    user_updates: Dict[str, Any] = {"updated_at": _now_iso()}
    docs_should_be_verified = (current_kyc_status == "approved" or current_verified) and not needs_submission

    if has_documents_now and (needs_submission or not user.get("kyc_documents")):
        user_updates["kyc_documents"] = _build_ngo_kyc_documents(
            merged_settings,
            verified=docs_should_be_verified,
        )

    if needs_submission:
        action = "KYC Resubmitted" if had_documents_before else "KYC Submitted"
        uploaded_count = sum(1 for doc_name in current_doc_names if doc_name)
        description = f"NGO submitted {uploaded_count} compliance document(s) for review"
        user_updates.update(
            {
                "kyc_status": "pending",
                "kycVerified": False,
                "kyc_verified": False,
                "kyc_rejection_reason": "",
                "kyc_submitted_at": _now_iso(),
                "kyc_timeline": _prepend_kyc_timeline_event(
                    user.get("kyc_timeline"),
                    action=action,
                    description=description,
                    status="info",
                    actor="User",
                ),
            }
        )
        current_kyc_status = "pending"
        current_verified = False

    if len(user_updates) > 1:
        db.users.update_one({"_id": user["_id"]}, {"$set": user_updates})

    if current_kyc_status == "approved" or current_verified:
        return "verified"
    if current_kyc_status in {"rejected", "resubmission_required"}:
        return "rejected"
    return "pending"


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

    settings_data["updated_at"] = _now_iso()

    if existing:
        db.driver_settings.update_one(
            {"driver_id": driver_id},
            {"$set": settings_data}
        )
        settings_data["_id"] = str(existing["_id"])
    else:
        settings_data["created_at"] = _now_iso()
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
                        {"$set": {"farmer_id": farmer_id, "updated_at": _now_iso()}},
                    )
                    settings["farmer_id"] = farmer_id
        except Exception:
            settings = None

    if not settings:
        return None

    user = _find_user_by_any_id(farmer_id)
    verification_status = _verification_status_from_user(user)
    if settings.get("verification_status") != verification_status:
        db.farmer_settings.update_one(
            {"_id": settings["_id"]},
            {"$set": {"verification_status": verification_status, "updated_at": _now_iso()}},
        )
        settings["verification_status"] = verification_status

    settings["_id"] = str(settings["_id"])
    return settings


async def save_farmer_settings(settings_data: Dict) -> Dict:
    """Save or update farmer settings and sync KYC state to user profile."""
    farmer_id = settings_data.get("farmer_id")
    existing = db.farmer_settings.find_one({"farmer_id": farmer_id})

    # If nothing is linked by farmer_id yet, try matching an older record by email.
    if not existing and settings_data.get("email"):
        existing = db.farmer_settings.find_one({"email": settings_data.get("email")})

    previous_settings = dict(existing) if existing else {}
    merged_settings = dict(previous_settings)
    merged_settings.update(settings_data)

    # Prevent client-side tampering of verification state; admin KYC decides this value.
    merged_settings["verification_status"] = _normalize_verification_status(
        merged_settings.get("verification_status")
    )
    merged_settings["updated_at"] = _now_iso()

    if existing:
        db.farmer_settings.update_one(
            {"_id": existing["_id"]},
            {"$set": merged_settings},
        )
        settings_id = existing["_id"]
    else:
        merged_settings["created_at"] = _now_iso()
        result = db.farmer_settings.insert_one(merged_settings)
        settings_id = result.inserted_id

    final_status = _sync_farmer_kyc_state(str(farmer_id or ""), merged_settings, previous_settings)
    final_status = _normalize_verification_status(final_status)

    if merged_settings.get("verification_status") != final_status:
        merged_settings["verification_status"] = final_status
        merged_settings["updated_at"] = _now_iso()
        db.farmer_settings.update_one(
            {"_id": settings_id},
            {"$set": {"verification_status": final_status, "updated_at": merged_settings["updated_at"]}},
        )

    merged_settings["_id"] = str(settings_id)
    return merged_settings


# ==================== NGO SETTINGS ====================

async def get_ngo_settings(ngo_id: str) -> Optional[Dict]:
    """Get NGO settings by NGO ID"""
    settings = db.ngo_settings.find_one({"ngo_id": ngo_id})
    if not settings:
        return None

    user = _find_user_by_any_id(ngo_id)
    verification_status = _verification_status_from_user(user)
    if settings.get("verification_status") != verification_status:
        db.ngo_settings.update_one(
            {"_id": settings["_id"]},
            {"$set": {"verification_status": verification_status, "updated_at": _now_iso()}},
        )
        settings["verification_status"] = verification_status

    settings["_id"] = str(settings["_id"])
    return settings


async def save_ngo_settings(settings_data: Dict) -> Dict:
    """Save or update NGO settings and sync KYC state to user profile."""
    ngo_id = settings_data.get("ngo_id")
    existing = db.ngo_settings.find_one({"ngo_id": ngo_id})

    previous_settings = dict(existing) if existing else {}
    merged_settings = dict(previous_settings)
    merged_settings.update(settings_data)

    # Prevent client-side tampering of verification state; admin KYC decides this value.
    merged_settings["verification_status"] = _normalize_verification_status(
        merged_settings.get("verification_status")
    )
    merged_settings["updated_at"] = _now_iso()

    if existing:
        db.ngo_settings.update_one(
            {"_id": existing["_id"]},
            {"$set": merged_settings},
        )
        settings_id = existing["_id"]
    else:
        merged_settings["created_at"] = _now_iso()
        result = db.ngo_settings.insert_one(merged_settings)
        settings_id = result.inserted_id

    final_status = _sync_ngo_kyc_state(str(ngo_id or ""), merged_settings, previous_settings)
    final_status = _normalize_verification_status(final_status)

    if merged_settings.get("verification_status") != final_status:
        merged_settings["verification_status"] = final_status
        merged_settings["updated_at"] = _now_iso()
        db.ngo_settings.update_one(
            {"_id": settings_id},
            {"$set": {"verification_status": final_status, "updated_at": merged_settings["updated_at"]}},
        )

    merged_settings["_id"] = str(settings_id)
    return merged_settings


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
