from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional

from bson import ObjectId
from fastapi import APIRouter, Body, HTTPException
from pydantic import BaseModel

from app.core.database import delivery_tasks_collection, listings_collection, users_collection, get_database

router = APIRouter(prefix="/api/admin", tags=["Admin"])
db = get_database()
farmer_settings_collection = db["farmer_settings"]
ngo_settings_collection = db["ngo_settings"]


def _iso(dt: Optional[datetime]) -> str:
    if not dt:
        return datetime.now(timezone.utc).isoformat()
    if isinstance(dt, datetime):
        return dt.astimezone(timezone.utc).isoformat()
    return str(dt)


def _coerce_id(value: Any) -> str:
    if isinstance(value, ObjectId):
        return str(value)
    return str(value or "")


def _find_user(user_id: str) -> Optional[Dict[str, Any]]:
    filters: List[Dict[str, Any]] = []
    if ObjectId.is_valid(user_id):
        filters.append({"_id": ObjectId(user_id)})
    filters.append({"id": user_id})
    if user_id.isdigit():
        filters.append({"id": int(user_id)})
    return users_collection.find_one({"$or": filters})


def _role_of(user: Dict[str, Any]) -> str:
    role = (user.get("role") or "customer").strip().lower()
    return role if role in {"farmer", "customer", "driver", "ngo"} else "customer"


def _status_of(user: Dict[str, Any]) -> str:
    if user.get("status") in {"active", "suspended", "pending"}:
        return user["status"]
    if user.get("is_suspended"):
        return "suspended"
    return "active"


def _is_kyc_verified(user: Dict[str, Any]) -> bool:
    if str(user.get("kyc_status") or "").strip().lower() == "approved":
        return True
    return bool(
        user.get("kycVerified")
        or user.get("kyc_verified")
        or user.get("is_verified")
    )


def _kyc_status_value(user: Dict[str, Any]) -> str:
    status = str(user.get("kyc_status") or "").strip().lower()
    if status:
        return status
    return "approved" if _is_kyc_verified(user) else "pending"


def _settings_verification_status(kyc_status: str) -> str:
    if kyc_status == "approved":
        return "verified"
    if kyc_status in {"rejected", "resubmission_required"}:
        return "rejected"
    return "pending"


def _sync_settings_verification_status(user: Dict[str, Any], kyc_status: str) -> None:
    user_id = _coerce_id(user.get("_id") or user.get("id"))
    role = _role_of(user)
    updates = {
        "verification_status": _settings_verification_status(kyc_status),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }

    if role == "farmer":
        farmer_settings_collection.update_one({"farmer_id": user_id}, {"$set": updates})
    elif role == "ngo":
        ngo_settings_collection.update_one({"ngo_id": user_id}, {"$set": updates})


def _document_status_from_verification(verification_status: str) -> str:
    value = str(verification_status or "").strip().lower()
    if value in {"verified", "approved"}:
        return "verified"
    if value in {"rejected", "resubmission_required"}:
        return "rejected"
    return "pending"


def _build_settings_backed_kyc_documents(user: Dict[str, Any]) -> List[Dict[str, Any]]:
    user_id = _coerce_id(user.get("_id") or user.get("id"))
    role = _role_of(user)

    if role == "farmer":
        settings = farmer_settings_collection.find_one({"farmer_id": user_id}) or {}
        file_name = str(settings.get("document_file_name") or "").strip()
        if not file_name:
            return []

        uploaded_at = settings.get("updated_at") or settings.get("created_at") or datetime.now(timezone.utc)
        return [
            {
                "id": "farmer-verification-document",
                "type": "id_proof",
                "name": "Farmer Verification Document",
                "fileName": file_name,
                "fileSize": "0 KB",
                "uploadedAt": _iso(uploaded_at),
                "status": _document_status_from_verification(settings.get("verification_status") or "pending"),
            }
        ]

    if role == "ngo":
        settings = ngo_settings_collection.find_one({"ngo_id": user_id}) or {}
        uploaded_at = settings.get("updated_at") or settings.get("created_at") or datetime.now(timezone.utc)
        status = _document_status_from_verification(settings.get("verification_status") or "pending")
        docs: List[Dict[str, Any]] = []

        candidates = [
            ("registration_certificate_file_name", "Registration Certificate"),
            ("certificate_80g_file_name", "80G Certificate"),
            ("certificate_12a_file_name", "12A Certificate"),
        ]
        for idx, (field_name, label) in enumerate(candidates, start=1):
            file_name = str(settings.get(field_name) or "").strip()
            if not file_name:
                continue

            docs.append(
                {
                    "id": f"ngo-document-{idx}",
                    "type": "registration",
                    "name": label,
                    "fileName": file_name,
                    "fileSize": "0 KB",
                    "uploadedAt": _iso(uploaded_at),
                    "status": status,
                }
            )

        return docs

    return []


def _append_kyc_timeline(
    user: Dict[str, Any],
    *,
    action: str,
    description: str,
    status: str,
    actor: str = "Admin",
) -> List[Dict[str, Any]]:
    timeline = list(user.get("kyc_timeline") or [])
    timeline.insert(
        0,
        {
            "id": f"t{int(datetime.now(timezone.utc).timestamp() * 1000)}",
            "action": action,
            "description": description,
            "timestamp": _iso(datetime.now(timezone.utc)),
            "actor": actor,
            "status": status,
        },
    )
    return timeline[:60]


def _mark_documents_status(
    docs: List[Dict[str, Any]],
    *,
    target_status: str,
    rejection_reason: Optional[str] = None,
    only_ids: Optional[set] = None,
) -> List[Dict[str, Any]]:
    updated_docs: List[Dict[str, Any]] = []
    for doc in docs:
        doc_copy = dict(doc)
        doc_id = str(doc_copy.get("id") or "")
        if only_ids and doc_id not in only_ids:
            updated_docs.append(doc_copy)
            continue

        doc_copy["status"] = target_status
        if rejection_reason:
            doc_copy["rejectionReason"] = rejection_reason
            doc_copy["rejection_reason"] = rejection_reason
        else:
            doc_copy.pop("rejectionReason", None)
            doc_copy.pop("rejection_reason", None)
        updated_docs.append(doc_copy)

    return updated_docs


def _user_record(user: Dict[str, Any]) -> Dict[str, Any]:
    joined_at = user.get("created_at") or user.get("createdAt") or datetime.now(timezone.utc)
    last_active = user.get("last_login") or user.get("lastActive") or joined_at
    return {
        "id": _coerce_id(user.get("_id") or user.get("id")),
        "name": user.get("name") or "Unknown User",
        "email": user.get("email") or "",
        "phone": user.get("phone") or "",
        "role": _role_of(user),
        "status": _status_of(user),
        "kycVerified": _is_kyc_verified(user),
        "joinedAt": _iso(joined_at),
        "lastActive": _iso(last_active),
        "avatar": user.get("avatar") or None,
        "address": user.get("address") or "",
        "totalTransactions": int(user.get("total_transactions") or 0),
        "rating": float(user.get("rating") or 0),
    }


class StatusUpdate(BaseModel):
    status: Literal["active", "suspended", "pending"]


class BulkStatusUpdate(BaseModel):
    userIds: List[str]
    status: Literal["active", "suspended", "pending"]


class KycApproveRequest(BaseModel):
    notes: Optional[str] = None


class KycRejectRequest(BaseModel):
    reason: str
    notes: Optional[str] = None


class KycResubmitRequest(BaseModel):
    documentIds: List[str]
    reason: str


@router.get("/users")
def get_admin_users():
    users = [_user_record(u) for u in users_collection.find({})]
    return {"users": users}


@router.patch("/users/{user_id}/status")
def update_user_status(user_id: str, payload: StatusUpdate):
    user = _find_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    users_collection.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "status": payload.status,
                "is_suspended": payload.status == "suspended",
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )
    return {"success": True, "status": payload.status}


@router.patch("/users/bulk-status")
def bulk_update_user_status(payload: BulkStatusUpdate):
    if not payload.userIds:
        return {"success": True, "updated": 0}

    object_ids = [ObjectId(uid) for uid in payload.userIds if ObjectId.is_valid(uid)]
    users_collection.update_many(
        {"_id": {"$in": object_ids}},
        {
            "$set": {
                "status": payload.status,
                "is_suspended": payload.status == "suspended",
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )
    return {"success": True, "updated": len(object_ids)}


@router.get("/users/{user_id}")
def get_user_details(user_id: str):
    user = _find_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    record = _user_record(user)
    details = {
        **record,
        "addresses": user.get("addresses") or [],
        "documents": user.get("documents") or [],
        "activities": user.get("activities") or [],
        "transactions": user.get("transactions") or [],
        "stats": user.get("stats")
        or {
            "totalOrders": int(user.get("total_orders") or 0),
            "totalSpent": float(user.get("total_spent") or 0),
            "totalEarned": float(user.get("total_earned") or 0),
            "averageRating": float(user.get("rating") or 0),
            "reviewsCount": int(user.get("reviews_count") or 0),
        },
        "tags": user.get("tags") or [],
        "bio": user.get("bio") or "",
        "notes": user.get("admin_notes") or "",
    }
    return details


@router.get("/users/{user_id}/kyc")
def get_user_kyc(user_id: str):
    user = _find_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    docs = user.get("kyc_documents") or _build_settings_backed_kyc_documents(user) or user.get("documents") or []
    submitted_at_raw = user.get("kyc_submitted_at")
    if not submitted_at_raw and docs:
        first_doc = docs[0]
        submitted_at_raw = first_doc.get("uploadedAt") or first_doc.get("uploaded_at")

    normalized_docs = []
    for idx, doc in enumerate(docs):
        normalized_docs.append(
            {
                "id": str(doc.get("id") or idx + 1),
                "type": doc.get("type") or "id_proof",
                "name": doc.get("name") or doc.get("type") or "Document",
                "fileName": doc.get("fileName") or doc.get("file_name") or "document.pdf",
                "fileSize": doc.get("fileSize") or doc.get("file_size") or "0 KB",
                "uploadedAt": _iso(doc.get("uploadedAt") or doc.get("uploaded_at") or datetime.now(timezone.utc)),
                "status": doc.get("status") or "pending",
                "previewUrl": doc.get("previewUrl") or doc.get("preview_url"),
                "rejectionReason": doc.get("rejectionReason") or doc.get("rejection_reason"),
            }
        )

    if not normalized_docs:
        normalized_docs = [
            {
                "id": "1",
                "type": "id_proof",
                "name": "ID Proof",
                "fileName": "id-proof.pdf",
                "fileSize": "0 KB",
                "uploadedAt": _iso(datetime.now(timezone.utc)),
                "status": "pending",
            }
        ]

    timeline = user.get("kyc_timeline") or [
        {
            "id": "t1",
            "action": "KYC Submitted",
            "description": "KYC details submitted by user",
            "timestamp": _iso(user.get("created_at") or datetime.now(timezone.utc)),
            "actor": "System",
            "status": "info",
        }
    ]

    return {
        "status": _kyc_status_value(user),
        "submittedAt": _iso(submitted_at_raw or user.get("created_at") or datetime.now(timezone.utc)),
        "lastUpdated": _iso(user.get("updated_at") or datetime.now(timezone.utc)),
        "documents": normalized_docs,
        "timeline": timeline,
        "notes": user.get("kyc_notes") or "",
        "priority": user.get("kyc_priority") or "medium",
    }


@router.post("/users/{user_id}/kyc/approve")
def approve_user_kyc(user_id: str, payload: KycApproveRequest):
    user = _find_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    now = datetime.now(timezone.utc)
    docs = user.get("kyc_documents") or _build_settings_backed_kyc_documents(user) or []
    approved_docs = _mark_documents_status(docs, target_status="verified") if docs else docs
    timeline = _append_kyc_timeline(
        user,
        action="KYC Approved",
        description="KYC verification approved by admin",
        status="success",
    )

    users_collection.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "kyc_status": "approved",
                "kycVerified": True,
                "kyc_verified": True,
                "kyc_rejection_reason": "",
                "kyc_notes": payload.notes or "",
                "kyc_documents": approved_docs,
                "kyc_timeline": timeline,
                "kyc_approved_at": now,
                "updated_at": now,
            }
        },
    )
    _sync_settings_verification_status(user, "approved")
    return {"success": True, "status": "approved"}


@router.post("/users/{user_id}/kyc/reject")
def reject_user_kyc(user_id: str, payload: KycRejectRequest):
    user = _find_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    now = datetime.now(timezone.utc)
    docs = user.get("kyc_documents") or _build_settings_backed_kyc_documents(user) or []
    rejected_docs = _mark_documents_status(
        docs,
        target_status="rejected",
        rejection_reason=payload.reason,
    ) if docs else docs
    timeline = _append_kyc_timeline(
        user,
        action="KYC Rejected",
        description=f"KYC rejected by admin: {payload.reason}",
        status="error",
    )

    users_collection.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "kyc_status": "rejected",
                "kycVerified": False,
                "kyc_verified": False,
                "kyc_rejection_reason": payload.reason,
                "kyc_notes": payload.notes or "",
                "kyc_documents": rejected_docs,
                "kyc_timeline": timeline,
                "updated_at": now,
            }
        },
    )
    _sync_settings_verification_status(user, "rejected")
    return {"success": True, "status": "rejected"}


@router.post("/users/{user_id}/kyc/resubmit")
def request_kyc_resubmission(user_id: str, payload: KycResubmitRequest):
    user = _find_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    now = datetime.now(timezone.utc)
    docs = user.get("kyc_documents") or _build_settings_backed_kyc_documents(user) or []
    selected_ids = {str(doc_id) for doc_id in payload.documentIds}
    resubmit_docs = _mark_documents_status(
        docs,
        target_status="rejected",
        rejection_reason=payload.reason,
        only_ids=selected_ids if selected_ids else None,
    ) if docs else docs
    timeline = _append_kyc_timeline(
        user,
        action="Resubmission Requested",
        description=f"Admin requested document resubmission: {payload.reason}",
        status="warning",
    )

    users_collection.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "kyc_status": "resubmission_required",
                "kycVerified": False,
                "kyc_verified": False,
                "kyc_rejection_reason": payload.reason,
                "kyc_documents": resubmit_docs,
                "kyc_timeline": timeline,
                "updated_at": now,
            }
        },
    )
    _sync_settings_verification_status(user, "resubmission_required")
    return {"success": True, "status": "resubmission_required", "documents": payload.documentIds}


@router.get("/drivers")
def get_admin_drivers():
    drivers = []
    for user in users_collection.find({"role": "driver"}):
        drivers.append(
            {
                "id": _coerce_id(user.get("_id") or user.get("id")),
                "name": user.get("name") or "Driver",
                "phone": user.get("phone") or "",
                "avatar": user.get("avatar"),
                "rating": float(user.get("rating") or 0),
                "vehicleType": user.get("vehicle_type") or "Two Wheeler",
                "vehicleNumber": user.get("vehicle_number") or "",
                "status": user.get("availability") or "available",
                "currentLocation": user.get("current_location") or "",
                "completedToday": int(user.get("completed_today") or 0),
            }
        )
    return drivers


@router.get("/orders")
def get_admin_orders():
    orders: List[Dict[str, Any]] = []

    # Prefer delivery tasks when present
    for task in delivery_tasks_collection.find({}).limit(300):
        task_id = _coerce_id(task.get("_id") or task.get("id"))
        customer_name = task.get("customer_name") or "Customer"
        order = {
            "id": task_id,
            "orderId": task.get("order_id") or f"ORD-{task_id[-6:].upper()}",
            "customer": {
                "id": str(task.get("customer_id") or ""),
                "name": customer_name,
                "type": task.get("customer_type") or "individual",
                "phone": task.get("customer_phone") or "",
                "email": task.get("customer_email") or "",
            },
            "pickup": {
                "address": task.get("pickup_location") or "",
                "city": task.get("pickup_city") or "",
            },
            "dropoff": {
                "address": task.get("delivery_location") or "",
                "city": task.get("delivery_city") or "",
            },
            "driver": task.get("driver") or None,
            "status": task.get("status") or "pending",
            "priority": task.get("priority") or "medium",
            "items": task.get("items") or [],
            "itemCount": int(task.get("item_count") or 1),
            "subtotal": float(task.get("amount") or 0),
            "deliveryFee": float(task.get("delivery_fee") or 0),
            "total": float(task.get("total") or task.get("amount") or 0),
            "currency": "INR",
            "paymentMethod": task.get("payment_method") or "cod",
            "paymentStatus": task.get("payment_status") or "pending",
            "createdAt": _iso(task.get("created_at") or datetime.now(timezone.utc)),
            "estimatedDelivery": _iso(task.get("estimated_delivery") or datetime.now(timezone.utc)),
            "notes": task.get("notes") or "",
            "timeline": task.get("timeline") or [],
            "distance": float(task.get("distance") or 0),
            "duration": float(task.get("duration") or 0),
        }
        orders.append(order)

    if not orders:
        # Fallback from listings so admin orders UI still works in new/empty DB states.
        for listing in listings_collection.find({}).limit(150):
            listing_id = _coerce_id(listing.get("_id") or listing.get("id"))
            orders.append(
                {
                    "id": listing_id,
                    "orderId": f"LST-{listing_id[-6:].upper()}",
                    "customer": {
                        "id": str(listing.get("claimed_by") or ""),
                        "name": listing.get("claimed_by_name") or "Customer",
                        "type": "individual",
                        "phone": "",
                        "email": "",
                    },
                    "pickup": {
                        "address": listing.get("location") or "",
                        "city": "",
                    },
                    "dropoff": {
                        "address": listing.get("delivery_location") or listing.get("location") or "",
                        "city": "",
                    },
                    "driver": None,
                    "status": "pending",
                    "priority": "medium",
                    "items": [],
                    "itemCount": 1,
                    "subtotal": float(listing.get("price") or 0),
                    "deliveryFee": 0,
                    "total": float(listing.get("price") or 0),
                    "currency": "INR",
                    "paymentMethod": "cod",
                    "paymentStatus": "pending",
                    "createdAt": _iso(listing.get("created_at") or datetime.now(timezone.utc)),
                    "estimatedDelivery": _iso(datetime.now(timezone.utc)),
                    "notes": "",
                    "timeline": [],
                    "distance": 0,
                    "duration": 0,
                }
            )

    return orders


@router.get("/dashboard")
def get_admin_dashboard(range: str = "month"):
    users_count = users_collection.count_documents({})
    drivers_count = users_collection.count_documents({"role": "driver"})
    listings_count = listings_collection.count_documents({})
    orders_count = delivery_tasks_collection.count_documents({})

    pending_orders = delivery_tasks_collection.count_documents({"status": "pending"})
    in_transit_orders = delivery_tasks_collection.count_documents({"status": {"$in": ["assigned", "picked-up", "in-transit"]}})
    delivered_orders = delivery_tasks_collection.count_documents({"status": "delivered"})
    cancelled_orders = delivery_tasks_collection.count_documents({"status": "cancelled"})

    stats = [
        {
            "id": "users",
            "label": "Total Users",
            "value": users_count,
            "displayValue": str(users_count),
            "change": "+0%",
            "changeValue": 0,
            "positive": True,
            "trend": [users_count] * 7,
            "description": f"Users in selected range: {range}",
        },
        {
            "id": "orders",
            "label": "Orders",
            "value": orders_count,
            "displayValue": str(orders_count),
            "change": "+0%",
            "changeValue": 0,
            "positive": True,
            "trend": [orders_count] * 7,
            "description": "Total delivery tasks",
        },
        {
            "id": "disputes",
            "label": "Listings",
            "value": listings_count,
            "displayValue": str(listings_count),
            "change": "+0%",
            "changeValue": 0,
            "positive": True,
            "trend": [listings_count] * 7,
            "description": "Published listings",
        },
        {
            "id": "drivers",
            "label": "Active Drivers",
            "value": drivers_count,
            "displayValue": str(drivers_count),
            "change": "+0%",
            "changeValue": 0,
            "positive": True,
            "trend": [drivers_count] * 7,
            "description": "Registered drivers",
        },
    ]

    recent_activity = [
        {
            "id": "a1",
            "type": "system",
            "text": "Admin dashboard synced successfully",
            "time": "just now",
            "timestamp": _iso(datetime.now(timezone.utc)),
            "status": "completed",
        }
    ]

    alerts = []
    if pending_orders > 0:
        alerts.append(
            {
                "id": "al1",
                "type": "warning",
                "message": f"{pending_orders} orders pending assignment",
                "timestamp": _iso(datetime.now(timezone.utc)),
                "dismissible": True,
            }
        )

    system_metrics = [
        {"id": "m1", "label": "API Response", "value": 99, "max": 100, "unit": "%", "status": "healthy"},
        {"id": "m2", "label": "Database", "value": 98, "max": 100, "unit": "%", "status": "healthy"},
        {"id": "m3", "label": "Memory", "value": 45, "max": 100, "unit": "%", "status": "healthy"},
        {"id": "m4", "label": "CPU Usage", "value": 32, "max": 100, "unit": "%", "status": "healthy"},
        {"id": "m5", "label": "Uptime", "value": 99, "max": 100, "unit": "%", "status": "healthy"},
    ]

    order_statuses = [
        {"status": "Pending", "count": pending_orders, "color": "#f59e0b"},
        {"status": "In Transit", "count": in_transit_orders, "color": "#06b6d4"},
        {"status": "Delivered", "count": delivered_orders, "color": "#16a34a"},
        {"status": "Cancelled", "count": cancelled_orders, "color": "#ef4444"},
    ]

    top_performers = []
    for driver in users_collection.find({"role": "driver"}).limit(5):
        top_performers.append(
            {
                "id": _coerce_id(driver.get("_id")),
                "name": driver.get("name") or "Driver",
                "role": "Driver",
                "metric": "Deliveries",
                "value": str(driver.get("completed_today") or 0),
                "trend": int(driver.get("performance_trend") or 0),
            }
        )

    return {
        "stats": stats,
        "recentActivity": recent_activity,
        "alerts": alerts,
        "systemMetrics": system_metrics,
        "orderStatuses": order_statuses,
        "topPerformers": top_performers,
    }


@router.get("/financial-overview")
def get_financial_overview():
    now = datetime.now(timezone.utc)
    transactions = [
        {
            "id": "txn_1001",
            "date": _iso(now),
            "customer": "Ravi Kumar",
            "type": "credit",
            "amount": 2450,
            "status": "completed",
            "method": "UPI",
            "orderId": "ORD-1001",
        },
        {
            "id": "txn_1002",
            "date": _iso(now),
            "customer": "Anita Traders",
            "type": "debit",
            "amount": 980,
            "status": "pending",
            "method": "Bank Transfer",
            "orderId": "ORD-1002",
        },
    ]

    payouts = [
        {
            "id": "payout_1",
            "driver": "Ramesh P",
            "amount": 3200,
            "status": "processing",
            "date": _iso(now),
            "trips": 14,
            "avatar": "R",
        },
        {
            "id": "payout_2",
            "driver": "Sonia K",
            "amount": 2850,
            "status": "paid",
            "date": _iso(now),
            "trips": 12,
            "avatar": "S",
        },
    ]

    invoices = [
        {
            "id": "inv_501",
            "vendor": "Cold Storage Co",
            "amount": 12500,
            "status": "pending",
            "dueDate": _iso(now),
            "issuedDate": _iso(now),
        },
        {
            "id": "inv_502",
            "vendor": "Fleet Fuel Services",
            "amount": 8400,
            "status": "paid",
            "dueDate": _iso(now),
            "issuedDate": _iso(now),
        },
    ]

    return {
        "transactions": transactions,
        "payouts": payouts,
        "invoices": invoices,
    }


@router.get("/transactions")
def get_admin_transactions():
    now = datetime.now(timezone.utc)
    transactions = [
        {
            "id": "t1",
            "txnId": "TXN-9001",
            "date": _iso(now),
            "type": "order",
            "description": "Order payment settled",
            "party": "Priya Foods",
            "partyType": "customer",
            "amount": 2450,
            "direction": "credit",
            "method": "UPI",
            "status": "success",
            "orderId": "ORD-1001",
            "reference": "UPI-REF-1001",
        },
        {
            "id": "t2",
            "txnId": "TXN-9002",
            "date": _iso(now),
            "type": "payout",
            "description": "Driver payout initiated",
            "party": "Ramesh P",
            "partyType": "driver",
            "amount": 3200,
            "direction": "debit",
            "method": "Bank Transfer",
            "status": "pending",
            "orderId": "ORD-1001",
            "reference": "NEFT-REF-22",
        },
    ]
    return {"transactions": transactions}


@router.get("/analytics")
def get_admin_analytics():
    return {
        "kpis": [
            {"value": "1,284", "label": "Active Users", "change": "+8.2%", "dir": "up", "rawValue": 1284, "color": "#3b82f6"},
            {"value": "862", "label": "Orders", "change": "+4.1%", "dir": "up", "rawValue": 862, "color": "#16a34a"},
            {"value": "94.3%", "label": "Delivery Success", "change": "-1.1%", "dir": "down", "rawValue": 94.3, "color": "#f59e0b"},
        ],
        "categoryData": [
            {"name": "Vegetables", "value": 34, "color": "#22c55e"},
            {"name": "Fruits", "value": 29, "color": "#f59e0b"},
            {"name": "Dairy", "value": 19, "color": "#3b82f6"},
            {"name": "Others", "value": 18, "color": "#8b5cf6"},
        ],
        "topFarmers": [
            {"rank": 1, "name": "Green Valley Farms", "revenue": "Rs 2.8L", "orders": 122, "trend": "up", "location": "Mumbai", "rating": 4.8},
            {"rank": 2, "name": "Sunrise Organics", "revenue": "Rs 2.1L", "orders": 97, "trend": "up", "location": "Pune", "rating": 4.6},
        ],
        "topDrivers": [
            {"rank": 1, "name": "Ramesh P", "deliveries": 164, "rating": "4.9", "onTime": 96, "location": "Mumbai"},
            {"rank": 2, "name": "Sonia K", "deliveries": 149, "rating": "4.8", "onTime": 94, "location": "Navi Mumbai"},
        ],
        "chartData": {
            "userGrowthData": [
                {"date": "W1", "users": 980, "previousPeriod": 910},
                {"date": "W2", "users": 1042, "previousPeriod": 950},
                {"date": "W3", "users": 1184, "previousPeriod": 990},
                {"date": "W4", "users": 1284, "previousPeriod": 1040},
            ],
            "orderVolumeData": [
                {"month": "Jan", "orders": 620, "revenue": 18},
                {"month": "Feb", "orders": 700, "revenue": 21},
                {"month": "Mar", "orders": 862, "revenue": 26},
            ],
            "deliveryPerformanceData": [
                {"week": "W1", "onTime": 92, "delayed": 8},
                {"week": "W2", "onTime": 93, "delayed": 7},
                {"week": "W3", "onTime": 94, "delayed": 6},
                {"week": "W4", "onTime": 95, "delayed": 5},
            ],
        },
    }


@router.get("/impact-metrics")
def get_admin_impact_metrics():
    return {
        "heroMetrics": [
            {"value": "2,45,000", "label": "Food Rescued (kg)", "sub": "This month", "color": "#16a34a", "trend": 11, "animatedValue": 245000},
            {"value": "5,20,000", "label": "Meals Served", "sub": "This month", "color": "#3b82f6", "trend": 9, "animatedValue": 520000},
        ],
        "foodRescuedData": [
            {"month": "Jan", "rescued": 180000, "target": 200000, "previous": 165000},
            {"month": "Feb", "rescued": 210000, "target": 220000, "previous": 180000},
            {"month": "Mar", "rescued": 245000, "target": 240000, "previous": 210000},
        ],
        "mealsDistributionData": [
            {"name": "Children", "value": 40, "color": "#f59e0b"},
            {"name": "Families", "value": 35, "color": "#16a34a"},
            {"name": "Shelters", "value": 25, "color": "#3b82f6"},
        ],
        "milestones": [
            {"name": "Monthly Rescue Goal", "desc": "Target for this month", "pct": 102, "status": "achieved", "target": 240000, "current": 245000},
            {"name": "District Expansion", "desc": "New districts onboarded", "pct": 74, "status": "in-progress", "target": 50, "current": 37},
        ],
        "ngos": [
            {"rank": 1, "name": "Helping Hands", "food": "42,000 kg", "meals": "88,000", "communities": 24, "score": 96, "trend": "up", "growth": 8},
            {"rank": 2, "name": "Food Forward", "food": "35,400 kg", "meals": "71,000", "communities": 19, "score": 91, "trend": "up", "growth": 6},
        ],
    }


@router.get("/regions")
def get_admin_regions():
    return [
        {
            "id": "r1",
            "name": "Mumbai",
            "orders": 420,
            "revenue": 1850000,
            "revenueDisplay": "Rs 18.5L",
            "farmers": 122,
            "drivers": 86,
            "heat": "high",
            "growth": 12,
            "coordinates": {"x": 62, "y": 48},
            "avgOrderValue": 4405,
            "topProducts": ["Tomato", "Milk", "Rice"],
            "deliveryTime": 32,
            "satisfaction": 4.7,
        },
        {
            "id": "r2",
            "name": "Pune",
            "orders": 280,
            "revenue": 1160000,
            "revenueDisplay": "Rs 11.6L",
            "farmers": 94,
            "drivers": 61,
            "heat": "medium",
            "growth": 8,
            "coordinates": {"x": 56, "y": 55},
            "avgOrderValue": 4142,
            "topProducts": ["Onion", "Wheat", "Spinach"],
            "deliveryTime": 36,
            "satisfaction": 4.5,
        },
        {
            "id": "r3",
            "name": "Nashik",
            "orders": 150,
            "revenue": 620000,
            "revenueDisplay": "Rs 6.2L",
            "farmers": 67,
            "drivers": 40,
            "heat": "low",
            "growth": 5,
            "coordinates": {"x": 50, "y": 44},
            "avgOrderValue": 4133,
            "topProducts": ["Grapes", "Onion", "Pulses"],
            "deliveryTime": 41,
            "satisfaction": 4.3,
        },
    ]


@router.get("/live-orders")
def get_live_orders():
    now = datetime.now(timezone.utc)
    return [
        {
            "id": "lo1",
            "orderId": "ORD-1001",
            "pickup": "Vashi",
            "dropoff": "Andheri",
            "driver": "Ramesh P",
            "status": "transit",
            "eta": _iso(now),
        },
        {
            "id": "lo2",
            "orderId": "ORD-1002",
            "pickup": "Kalyan",
            "dropoff": "Thane",
            "driver": "Sonia K",
            "status": "pickup",
            "eta": _iso(now),
        },
    ]


@router.get("/driver-statuses")
def get_driver_statuses():
    statuses = []
    for user in users_collection.find({"role": "driver"}).limit(20):
        name = user.get("name") or "Driver"
        initials = "".join(part[0] for part in name.split()[:2]).upper() or "D"
        statuses.append(
            {
                "id": _coerce_id(user.get("_id")),
                "name": name,
                "initials": initials,
                "status": user.get("availability") or "online",
                "currentTask": user.get("current_task") or "Available for dispatch",
            }
        )

    if not statuses:
        statuses = [
            {"id": "d1", "name": "Ramesh P", "initials": "RP", "status": "busy", "currentTask": "Delivering ORD-1001"},
            {"id": "d2", "name": "Sonia K", "initials": "SK", "status": "online", "currentTask": "Heading to pickup"},
        ]
    return statuses


@router.get("/disputes")
def get_admin_disputes():
    now = datetime.now(timezone.utc)
    return [
        {
            "id": "disp_1",
            "disputeId": "DSP-1001",
            "orderId": "ORD-1001",
            "orderAmount": 2450,
            "filedBy": "Priya Foods",
            "filedByRole": "customer",
            "filedByEmail": "priya@example.com",
            "filedByPhone": "+91 9000000001",
            "against": "Ramesh P",
            "againstRole": "driver",
            "category": "delivery",
            "subject": "Delivery delayed",
            "description": "Order was delayed by 2 hours.",
            "priority": "medium",
            "status": "investigating",
            "createdAt": _iso(now),
            "lastUpdate": _iso(now),
            "assignedTo": "Ops Team",
            "evidenceCount": 2,
            "messageCount": 3,
            "slaDeadline": _iso(now),
            "tags": ["delay", "driver"],
        }
    ]


@router.get("/disputes/evidence")
def get_disputes_evidence():
    now = datetime.now(timezone.utc)
    return [
        {
            "id": "ev1",
            "type": "photo",
            "fileName": "delivery-photo.jpg",
            "uploadedBy": "Priya Foods",
            "uploadedAt": _iso(now),
            "uploadedDate": _iso(now),
            "fileSize": "1.2 MB",
            "verified": False,
            "tags": ["delivery", "proof"],
            "notes": [],
            "description": "Photo from delivery location",
        }
    ]


@router.get("/disputes/{dispute_id}")
def get_dispute_details(dispute_id: str):
    now = datetime.now(timezone.utc)
    dispute = {
        "id": dispute_id,
        "disputeId": dispute_id.upper(),
        "orderId": "ORD-1001",
        "orderAmount": 2450,
        "subject": "Delivery delayed",
        "description": "Order reached later than expected.",
        "category": "delivery",
        "priority": "medium",
        "status": "investigating",
        "createdAt": _iso(now),
        "updatedAt": _iso(now),
        "slaDeadline": _iso(now),
        "assignedTo": "Ops Team",
        "complainant": {
            "name": "Priya Foods",
            "role": "customer",
            "email": "priya@example.com",
            "phone": "+91 9000000001",
            "pastDisputes": 1,
            "resolvedDisputes": 1,
            "memberSince": "2024-01-01",
            "verified": True,
        },
        "respondent": {
            "name": "Ramesh P",
            "role": "driver",
            "email": "ramesh@example.com",
            "phone": "+91 9000000002",
            "pastDisputes": 0,
            "resolvedDisputes": 0,
            "memberSince": "2024-02-01",
            "verified": True,
        },
        "refundRequested": 300,
        "refundApproved": 0,
        "tags": ["delay", "delivery"],
    }

    timeline = [
        {
            "id": "tl1",
            "type": "system",
            "actor": "System",
            "content": "Dispute created",
            "timestamp": _iso(now),
        }
    ]

    return {
        "dispute": dispute,
        "timeline": timeline,
        "attachments": [],
        "notes": [],
        "relatedDisputes": [],
    }
