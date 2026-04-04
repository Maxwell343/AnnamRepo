"""
Impact Service — Real-World Impact Metrics
───────────────────────────────────────────
Tracks food saved, meals provided, and CO₂ emissions avoided.
"""

from datetime import datetime, timezone
from typing import Dict, Any

# ── Conversion constants ───────────────────────────────
MEALS_PER_KG = 2.5       # 1 kg food ≈ 2.5 meals
CO2_PER_KG = 2.5          # 1 kg food rescued ≈ 2.5 kg CO₂ saved
WATER_PER_KG = 1000       # 1 kg food ≈ 1000L water saved (agriculture)


def _get_impact_collection():
    from app.core.database import db
    return db["impact_metrics"]


def update_impact_on_rescue(listing_doc: dict) -> dict:
    """
    Called when a donation/rescue-sale completes.
    Increments global impact counters.
    """
    collection = _get_impact_collection()
    now_iso = datetime.now(timezone.utc).isoformat()

    # Parse quantity
    quantity_kg = _parse_quantity(listing_doc.get("quantity", 0))

    meals = round(quantity_kg * MEALS_PER_KG)
    co2 = round(quantity_kg * CO2_PER_KG, 1)
    water = round(quantity_kg * WATER_PER_KG)

    # Upsert global metrics document
    collection.update_one(
        {"type": "global_metrics"},
        {
            "$inc": {
                "total_food_saved_kg": quantity_kg,
                "total_meals_provided": meals,
                "co2_emissions_saved_kg": co2,
                "water_saved_liters": water,
                "total_rescues": 1,
            },
            "$set": {"last_updated": now_iso},
            "$setOnInsert": {"type": "global_metrics", "created_at": now_iso},
        },
        upsert=True,
    )

    print(f"[IMPACT] +{quantity_kg}kg food saved, +{meals} meals, +{co2}kg CO₂ avoided")
    return {
        "food_saved_kg": quantity_kg,
        "meals_provided": meals,
        "co2_saved_kg": co2,
    }


def get_global_impact_stats() -> dict:
    """Get aggregated global impact metrics."""
    collection = _get_impact_collection()
    doc = collection.find_one({"type": "global_metrics"})

    if not doc:
        return {
            "food_saved_kg": 0,
            "meals_provided": 0,
            "co2_saved_kg": 0,
            "water_saved_liters": 0,
            "total_rescues": 0,
            "active_rescues": _count_active_rescues(),
        }

    return {
        "food_saved_kg": round(doc.get("total_food_saved_kg", 0), 1),
        "meals_provided": doc.get("total_meals_provided", 0),
        "co2_saved_kg": round(doc.get("co2_emissions_saved_kg", 0), 1),
        "water_saved_liters": doc.get("water_saved_liters", 0),
        "total_rescues": doc.get("total_rescues", 0),
        "active_rescues": _count_active_rescues(),
    }


def recalculate_impact_metrics():
    """
    Full recalculation from all completed donations/rescue-sales.
    Called periodically by the scheduler.
    """
    from app.core.database import listings_collection, db

    marketplace_listings = db["marketplace_listings"]
    collection = _get_impact_collection()
    now_iso = datetime.now(timezone.utc).isoformat()

    total_kg = 0
    total_rescues = 0

    # Count from both collections
    for coll in [listings_collection, marketplace_listings]:
        donated = list(coll.find({
            "$or": [
                {"donation_mode": True},
                {"rescue_action": {"$in": ["donate", "auto_donate"]}},
                {"status": {"$in": ["donated", "delivered"]}},
            ]
        }))
        for doc in donated:
            qty = _parse_quantity(doc.get("quantity", 0))
            total_kg += qty
            total_rescues += 1

    total_meals = round(total_kg * MEALS_PER_KG)
    total_co2 = round(total_kg * CO2_PER_KG, 1)
    total_water = round(total_kg * WATER_PER_KG)

    collection.update_one(
        {"type": "global_metrics"},
        {
            "$set": {
                "total_food_saved_kg": round(total_kg, 1),
                "total_meals_provided": total_meals,
                "co2_emissions_saved_kg": total_co2,
                "water_saved_liters": total_water,
                "total_rescues": total_rescues,
                "last_recalculated": now_iso,
                "last_updated": now_iso,
            },
            "$setOnInsert": {"type": "global_metrics", "created_at": now_iso},
        },
        upsert=True,
    )

    print(f"[IMPACT] Recalculated: {total_kg}kg saved, {total_meals} meals, {total_co2}kg CO₂")


def _count_active_rescues() -> int:
    """Count currently active rescue/urgent listings across both collections."""
    from app.core.database import listings_collection, db
    from app.services.expiry_engine import compute_hours_remaining

    marketplace_listings = db["marketplace_listings"]
    count = 0

    for coll in [listings_collection, marketplace_listings]:
        active = list(coll.find({
            "status": {"$nin": ["expired", "delivered", "cancelled"]},
            "expires_at": {"$exists": True, "$ne": None},
        }))
        for doc in active:
            hours = compute_hours_remaining(doc.get("expires_at", ""))
            if 0 < hours < 24:  # urgent or rescue
                count += 1

    return count


def _parse_quantity(quantity) -> float:
    """Parse quantity to float kg."""
    if isinstance(quantity, (int, float)):
        return float(quantity)
    if isinstance(quantity, str):
        import re
        nums = re.findall(r"[\d.]+", str(quantity))
        if nums:
            return float(nums[0])
    return 0.0
