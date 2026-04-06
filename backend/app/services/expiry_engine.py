"""
Expiry Engine — Real-Time Status & Rescue System
─────────────────────────────────────────────────
Core engine with pure functions for computing urgency, discounts,
pickup priorities, and geo-cluster tags.

RULES:
  • urgency_status and hours_remaining are NEVER stored in DB
  • They are always computed dynamically at read time via enrich_listing()
  • Only expires_at, donation_mode, rescue_action are persisted
"""

from datetime import datetime, timezone, timedelta
from typing import Optional
import math


# ── Urgency thresholds (hours) ─────────────────────────
URGENT_THRESHOLD = 24   # < 24h → urgent
RESCUE_THRESHOLD = 12   # < 12h → rescue
AUTO_DONATE_THRESHOLD = 6  # < 6h → auto-donate if no action taken


# ────────────────────────────────────────────────────────
# Pure computation functions
# ────────────────────────────────────────────────────────

def compute_expires_at(created_at_iso: str, remaining_shelf_life_hours: float) -> str:
    """Compute absolute expiry datetime from creation time + predicted shelf life."""
    try:
        created = datetime.fromisoformat(created_at_iso.replace("Z", "+00:00"))
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        expires = created + timedelta(hours=remaining_shelf_life_hours)
        return expires.isoformat()
    except Exception:
        # Fallback: now + shelf life
        expires = datetime.now(timezone.utc) + timedelta(hours=remaining_shelf_life_hours)
        return expires.isoformat()


def compute_hours_remaining(expires_at_iso: str) -> float:
    """Compute hours remaining until expiry. Returns 0 if already expired."""
    try:
        expires = datetime.fromisoformat(expires_at_iso.replace("Z", "+00:00"))
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        now = datetime.now(timezone.utc)
        delta = (expires - now).total_seconds() / 3600
        return round(max(0, delta), 1)
    except Exception:
        return 0.0


def compute_urgency_status(expires_at_iso: str) -> str:
    """
    Compute real-time urgency status. NEVER store this value.
    Returns: 'normal' | 'urgent' | 'rescue' | 'expired'
    """
    hours = compute_hours_remaining(expires_at_iso)
    if hours <= 0:
        return "expired"
    elif hours < RESCUE_THRESHOLD:
        return "rescue"
    elif hours < URGENT_THRESHOLD:
        return "urgent"
    return "normal"


def compute_discount(original_price: float, hours_remaining: float) -> float:
    """
    Compute discounted price based on remaining time.
    • < 24h → 50% off
    • < 12h → 60% off
    • <  6h → 70% off
    """
    if original_price is None or original_price <= 0:
        return 0.0

    if hours_remaining <= 0:
        return round(original_price * 0.3, 2)  # 70% off
    elif hours_remaining < AUTO_DONATE_THRESHOLD:
        return round(original_price * 0.3, 2)  # 70% off
    elif hours_remaining < RESCUE_THRESHOLD:
        return round(original_price * 0.4, 2)  # 60% off
    elif hours_remaining < URGENT_THRESHOLD:
        return round(original_price * 0.5, 2)  # 50% off
    return original_price  # no discount


def compute_pickup_priority(hours_remaining: float) -> str:
    """
    Map remaining hours to driver pickup priority.
    normal → low, urgent → medium, rescue → high, <6h → critical
    """
    if hours_remaining <= 0:
        return "critical"
    elif hours_remaining < AUTO_DONATE_THRESHOLD:
        return "critical"
    elif hours_remaining < RESCUE_THRESHOLD:
        return "high"
    elif hours_remaining < URGENT_THRESHOLD:
        return "medium"
    return "low"


def compute_geo_cluster_tag(
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    pincode: Optional[str] = None,
) -> str:
    """
    Compute a geo-cluster tag for future driver AI allocation.
    Uses grid-based bucketing from coordinates, or pincode-prefix grouping.
    """
    if latitude is not None and longitude is not None:
        # Grid-based: 0.1° ≈ 11km cells
        lat_bucket = math.floor(latitude * 10) / 10
        lng_bucket = math.floor(longitude * 10) / 10
        return f"geo_{lat_bucket:.1f}_{lng_bucket:.1f}"

    if pincode and len(str(pincode)) >= 3:
        prefix = str(pincode)[:3]
        return f"pin_{prefix}_zone"

    return "unknown_zone"


# ────────────────────────────────────────────────────────
# Listing enrichment (called at read-time)
# ────────────────────────────────────────────────────────

def enrich_listing(listing: dict) -> dict:
    """
    Dynamically compute and attach real-time fields to a listing dict.
    These fields are NEVER persisted in the database.

    Adds:
      - urgency_status
      - hours_remaining
      - discounted_price
      - pickup_priority
      - is_rescue
      - is_donation
    """
    expires_at = listing.get("expires_at")
    if not expires_at:
        # Try computing from created_at + remaining_shelf_life_hours
        created_at = listing.get("created_at")
        shelf_hours = listing.get("remaining_shelf_life_hours")
        if created_at and shelf_hours:
            expires_at = compute_expires_at(created_at, float(shelf_hours))
        else:
            # No expiry data — return as normal
            listing["urgency_status"] = "normal"
            listing["hours_remaining"] = 999
            listing["discounted_price"] = listing.get("price") or listing.get("original_price") or 0
            listing["pickup_priority"] = "low"
            listing["is_rescue"] = False
            listing["is_donation"] = bool(listing.get("donation_mode"))
            return listing

    hours_remaining = compute_hours_remaining(expires_at)
    urgency = compute_urgency_status(expires_at)

    original_price = (
        listing.get("original_price")
        or listing.get("price")
        or listing.get("price_per_unit")
        or 0
    )

    listing["urgency_status"] = urgency
    listing["hours_remaining"] = hours_remaining
    listing["discounted_price"] = compute_discount(original_price, hours_remaining)
    listing["pickup_priority"] = compute_pickup_priority(hours_remaining)
    listing["is_rescue"] = urgency in ("urgent", "rescue")
    listing["is_donation"] = bool(listing.get("donation_mode"))
    listing["expires_at"] = expires_at  # ensure it's set even if computed on-the-fly

    return listing


# ────────────────────────────────────────────────────────
# Batch operations (called by scheduler)
# ────────────────────────────────────────────────────────

def mark_expired_listings_batch() -> int:
    """
    Scan BOTH collections, mark expired listings.
    Sets status='expired' + expired_at timestamp.
    Returns count of newly expired listings.
    """
    from app.core.database import listings_collection
    from app.core.database import db

    marketplace_listings = db["marketplace_listings"]
    now_iso = datetime.now(timezone.utc).isoformat()
    expired_count = 0

    for collection in [listings_collection, marketplace_listings]:
        # Find active listings that have expires_at
        active = list(collection.find({
            "status": {"$nin": ["expired", "delivered", "cancelled"]},
            "expires_at": {"$exists": True, "$ne": None},
        }))

        for doc in active:
            expires_at = doc.get("expires_at")
            if expires_at and compute_hours_remaining(expires_at) <= 0:
                collection.update_one(
                    {"_id": doc["_id"]},
                    {"$set": {
                        "status": "expired",
                        "expired_at": now_iso,
                        "updated_at": now_iso,
                    }},
                )
                expired_count += 1

    if expired_count > 0:
        print(f"[EXPIRY-ENGINE] Marked {expired_count} listings as expired")

    return expired_count


def auto_donate_abandoned_listings() -> int:
    """
    Find listings with < 6h remaining that have NO rescue_action set
    and are explicitly opted-in (`allow_auto_donate=True`).
    Auto-convert them to donation mode for zero food wastage.
    """
    from app.core.database import listings_collection
    from app.core.database import db

    marketplace_listings = db["marketplace_listings"]
    now_iso = datetime.now(timezone.utc).isoformat()
    auto_donated = 0

    for collection in [listings_collection, marketplace_listings]:
        active = list(collection.find({
            "status": {"$nin": ["expired", "delivered", "cancelled", "donated"]},
            "expires_at": {"$exists": True, "$ne": None},
            "rescue_action": {"$in": [None, ""]},
            "donation_mode": {"$ne": True},
            "allow_auto_donate": True,
        }))

        for doc in active:
            expires_at = doc.get("expires_at")
            if expires_at and compute_hours_remaining(expires_at) < AUTO_DONATE_THRESHOLD:
                collection.update_one(
                    {"_id": doc["_id"]},
                    {"$set": {
                        "donation_mode": True,
                        "rescue_action": "auto_donate",
                        "pickup_priority_stored": "critical",
                        "auto_donated_at": now_iso,
                        "updated_at": now_iso,
                    }},
                )
                auto_donated += 1

                # Award points for auto-donation
                farmer_id = doc.get("farmer_id")
                quantity = doc.get("quantity", 0)
                if farmer_id:
                    try:
                        from app.services.reward_service import award_donation_points
                        # Parse quantity if it's a string
                        qty_kg = _parse_quantity_kg(quantity)
                        award_donation_points(str(farmer_id), qty_kg, "rescue")
                    except Exception as e:
                        print(f"[EXPIRY-ENGINE] Failed to award auto-donate points: {e}")

    if auto_donated > 0:
        print(f"[EXPIRY-ENGINE] Auto-donated {auto_donated} abandoned listings")

    return auto_donated


def process_autopilot_price_drops() -> int:
    """
    Find listings with enable_auto_reduction=True.
    Apply sliding price drop based on expiry:
    - < 48h: 10% drop
    - < 24h: 30% drop
    - < 12h: 50% drop
    Ensures price NEVER drops below autopilot_min_price.
    """
    from app.core.database import listings_collection
    from app.core.database import db

    marketplace_listings = db["marketplace_listings"]
    now_iso = datetime.now(timezone.utc).isoformat()
    dropped_count = 0

    for collection in [listings_collection, marketplace_listings]:
        active = list(collection.find({
            "status": "available",
            "enable_auto_reduction": True,
            "expires_at": {"$exists": True, "$ne": None},
        }))

        for doc in active:
            expires_at = doc.get("expires_at")
            original_price = float(doc.get("original_price") or doc.get("price") or 0)
            if not expires_at or original_price <= 0:
                continue

            min_price = float(doc.get("autopilot_min_price") or 1)
            hours_remaining = compute_hours_remaining(expires_at)
            
            # Determine target drop %
            target_multiplier = 1.0
            if hours_remaining <= 12:
                target_multiplier = 0.5   # 50% drop
            elif hours_remaining <= 24:
                target_multiplier = 0.7   # 30% drop
            elif hours_remaining <= 48:
                target_multiplier = 0.9   # 10% drop
                
            if target_multiplier < 1.0:
                target_price = round(original_price * target_multiplier, 2)
                # Respect control limit
                if target_price < min_price:
                    target_price = min_price
                    
                current_price = float(doc.get("price", original_price))
                if current_price > target_price:
                    # Apply the drop
                    collection.update_one(
                        {"_id": doc["_id"]},
                        {"$set": {
                            "price": target_price,
                            "updated_at": now_iso
                        }}
                    )
                    dropped_count += 1

    if dropped_count > 0:
        print(f"[EXPIRY-ENGINE] Applied Autopilot price drops to {dropped_count} listings")

    return dropped_count


def _parse_quantity_kg(quantity) -> float:
    """Parse a quantity value (could be string like '50 kg' or int) to float kg."""
    if isinstance(quantity, (int, float)):
        return float(quantity)
    if isinstance(quantity, str):
        import re
        nums = re.findall(r"[\d.]+", quantity)
        if nums:
            return float(nums[0])
    return 0.0
