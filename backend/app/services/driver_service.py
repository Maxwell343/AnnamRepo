"""
Driver Service
──────────────
CRUD + state management for drivers.

Responsibilities:
  • Register / look up drivers
  • Manual status transitions (offline ↔ idle)
  • Live location updates (bumps last_active_time)
  • Auto-offline inactive drivers (called by scheduler)
"""

import logging
from datetime import datetime, timedelta
from bson import ObjectId
from typing import Optional, Dict, Any, List

from app.core.database import db

logger = logging.getLogger(__name__)

# ── Collection ────────────────────────────────────────────────────────────────
drivers_col = db["drivers"]

# How long a driver may be inactive before going offline automatically
INACTIVITY_THRESHOLD_HOURS = 1


# ══════════════════════════════════════════════════════════════════════════════
# Helpers
# ══════════════════════════════════════════════════════════════════════════════

def _fmt(doc: dict) -> dict:
    """Serialise ObjectId → str for JSON responses."""
    if doc and "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    return doc


# ══════════════════════════════════════════════════════════════════════════════
# Registration
# ══════════════════════════════════════════════════════════════════════════════

def register_driver(data: dict) -> dict:
    """
    Insert a new driver document.
    Initial status is always 'offline' — driver must manually go online.
    """
    now = datetime.utcnow()
    doc = {
        "name":           data["name"],
        "phone":          data["phone"],
        "vehicle_number": data["vehicle_number"],
        "vehicle_type":   data.get("vehicle_type", "bike"),
        "status":         "offline",
        "latitude":       data["latitude"],
        "longitude":      data["longitude"],
        "last_active_time": now,
        "created_at":     now,
        # Tracks successive failed / rejected deliveries (reset on acceptance)
        "rejection_count": 0,
        # Current active delivery_id (None when idle/offline)
        "active_delivery_id": None,
    }
    result = drivers_col.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    logger.info(f"🚗 Driver registered: {doc['name']} ({doc['id']})")
    return doc


# ══════════════════════════════════════════════════════════════════════════════
# Status Management
# ══════════════════════════════════════════════════════════════════════════════

def update_driver_status(driver_id: str, new_status: str) -> Optional[dict]:
    """
    Driver manually toggles online (idle) or offline.
    Busy state is set only by the allocation system, not by the driver directly.
    """
    if new_status not in ("idle", "offline"):
        raise ValueError("Drivers may only set status to 'idle' or 'offline' manually.")

    now = datetime.utcnow()
    result = drivers_col.find_one_and_update(
        {"_id": ObjectId(driver_id)},
        {"$set": {
            "status":           new_status,
            "last_active_time": now,
        }},
        return_document=True,
    )
    if result:
        logger.info(f"🔄 Driver {driver_id} → {new_status}")
        return _fmt(result)
    return None


def _set_driver_busy(driver_id: str, delivery_id: str) -> None:
    """Internal — called by allocation_service when a delivery is assigned."""
    drivers_col.update_one(
        {"_id": ObjectId(driver_id)},
        {"$set": {
            "status":               "busy",
            "active_delivery_id":   delivery_id,
            "last_active_time":     datetime.utcnow(),
        }},
    )
    logger.info(f"🔴 Driver {driver_id} marked BUSY for delivery {delivery_id}")


def _set_driver_idle(driver_id: str) -> None:
    """Internal — called when a driver completes/rejects/is freed from a delivery."""
    drivers_col.update_one(
        {"_id": ObjectId(driver_id)},
        {"$set": {
            "status":               "idle",
            "active_delivery_id":   None,
            "last_active_time":     datetime.utcnow(),
        }},
    )
    logger.info(f"🟢 Driver {driver_id} returned to IDLE")


# ══════════════════════════════════════════════════════════════════════════════
# Location Updates
# ══════════════════════════════════════════════════════════════════════════════

def update_driver_location(driver_id: str, lat: float, lng: float,
                           heading: Optional[float] = None,
                           speed_kmh: Optional[float] = None) -> Optional[dict]:
    """
    Store the driver's latest GPS position and bump last_active_time.
    """
    now = datetime.utcnow()
    update_fields: Dict[str, Any] = {
        "latitude":         lat,
        "longitude":        lng,
        "last_active_time": now,
    }
    if heading is not None:
        update_fields["heading"] = heading
    if speed_kmh is not None:
        update_fields["speed_kmh"] = speed_kmh

    result = drivers_col.find_one_and_update(
        {"_id": ObjectId(driver_id)},
        {"$set": update_fields},
        return_document=True,
    )
    if result:
        return _fmt(result)
    return None


# ══════════════════════════════════════════════════════════════════════════════
# Queries
# ══════════════════════════════════════════════════════════════════════════════

def get_driver_by_id(driver_id: str) -> Optional[dict]:
    doc = drivers_col.find_one({"_id": ObjectId(driver_id)})
    return _fmt(doc) if doc else None


def get_all_drivers(status_filter: Optional[str] = None) -> List[dict]:
    query: Dict[str, Any] = {}
    if status_filter:
        query["status"] = status_filter
    docs = list(drivers_col.find(query))
    return [_fmt(d) for d in docs]


def get_idle_drivers() -> List[dict]:
    """Return all currently idle drivers with their locations."""
    docs = list(drivers_col.find({"status": "idle"}))
    return [_fmt(d) for d in docs]


# ══════════════════════════════════════════════════════════════════════════════
# Auto-Offline (Scheduler Job)
# ══════════════════════════════════════════════════════════════════════════════

def auto_offline_inactive_drivers() -> int:
    """
    Set any idle driver whose last_active_time is > 1 hour ago to offline.
    Returns the count of affected drivers.
    Scheduled to run every 10 minutes.
    """
    cutoff = datetime.utcnow() - timedelta(hours=INACTIVITY_THRESHOLD_HOURS)
    result = drivers_col.update_many(
        {
            "status":           "idle",
            "last_active_time": {"$lt": cutoff},
        },
        {"$set": {"status": "offline"}},
    )
    if result.modified_count > 0:
        logger.warning(
            f"⏰ Auto-offline: {result.modified_count} inactive driver(s) set to offline."
        )
    return result.modified_count
