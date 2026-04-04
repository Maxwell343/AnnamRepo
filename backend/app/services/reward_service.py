"""
Reward Service — Farmer Incentive Points & Badges
──────────────────────────────────────────────────
Tracks donation rewards, badges, and leaderboard.
"""

from datetime import datetime, timezone
from typing import List, Dict, Any, Optional


# ── Badge definitions ──────────────────────────────────
BADGES = {
    "food_saver": {
        "id": "food_saver",
        "name": "Food Saver",
        "icon": "🌱",
        "description": "Made 5+ donations",
        "requirement": "5+ donations",
        "check": lambda r: r.get("donation_count", 0) >= 5,
    },
    "community_hero": {
        "id": "community_hero",
        "name": "Community Hero",
        "icon": "🦸",
        "description": "Earned 500+ impact points",
        "requirement": "500+ points",
        "check": lambda r: r.get("total_points", 0) >= 500,
    },
    "rescue_champion": {
        "id": "rescue_champion",
        "name": "Rescue Champion",
        "icon": "🏆",
        "description": "10+ rescue-mode donations",
        "requirement": "10+ rescue donations",
        "check": lambda r: r.get("rescue_donation_count", 0) >= 10,
    },
    "top_contributor": {
        "id": "top_contributor",
        "name": "Top Contributor",
        "icon": "⭐",
        "description": "#1 on the leaderboard",
        "requirement": "#1 rank",
        "check": lambda r: r.get("leaderboard_rank", 999) == 1,
    },
    "green_warrior": {
        "id": "green_warrior",
        "name": "Green Warrior",
        "icon": "💚",
        "description": "Donated 100+ kg of food",
        "requirement": "100+ kg donated",
        "check": lambda r: r.get("total_kg_donated", 0) >= 100,
    },
}

# ── Points multiplier ─────────────────────────────────
BASE_POINTS_PER_KG = 10
URGENCY_MULTIPLIERS = {
    "normal": 1.0,
    "urgent": 1.5,
    "rescue": 2.0,
    "auto_donate": 2.0,
}


def _get_rewards_collection():
    from app.core.database import db
    return db["farmer_rewards"]


def award_donation_points(
    farmer_id: str,
    quantity_kg: float,
    urgency_status: str,
    listing_id: str = None,
    listing_title: str = None,
) -> dict:
    """
    Award impact points to a farmer for a donation.
    Returns the updated reward record.
    """
    collection = _get_rewards_collection()
    multiplier = URGENCY_MULTIPLIERS.get(urgency_status, 1.0)
    points = round(quantity_kg * BASE_POINTS_PER_KG * multiplier)

    now_iso = datetime.now(timezone.utc).isoformat()
    is_rescue = urgency_status in ("rescue", "auto_donate")

    # Create donation history entry
    history_entry = {
        "listing_id": listing_id,
        "listing_title": listing_title or "Unknown",
        "quantity_kg": quantity_kg,
        "points_earned": points,
        "urgency_status": urgency_status,
        "timestamp": now_iso,
    }

    # Upsert farmer reward record
    result = collection.find_one({"farmer_id": farmer_id})
    if result:
        collection.update_one(
            {"farmer_id": farmer_id},
            {
                "$inc": {
                    "total_points": points,
                    "donation_count": 1,
                    "rescue_donation_count": 1 if is_rescue else 0,
                    "total_kg_donated": quantity_kg,
                },
                "$push": {"donation_history": history_entry},
                "$set": {"updated_at": now_iso},
            },
        )
    else:
        collection.insert_one({
            "farmer_id": farmer_id,
            "total_points": points,
            "donation_count": 1,
            "rescue_donation_count": 1 if is_rescue else 0,
            "total_kg_donated": quantity_kg,
            "donation_history": [history_entry],
            "created_at": now_iso,
            "updated_at": now_iso,
        })

    print(f"[REWARDS] Awarded {points} pts to farmer {farmer_id} (qty={quantity_kg}kg, urgency={urgency_status})")
    return {"farmer_id": farmer_id, "points_awarded": points, "urgency": urgency_status}


def get_farmer_rewards(farmer_id: str) -> dict:
    """Get a farmer's full reward profile: points, badges, history."""
    collection = _get_rewards_collection()
    record = collection.find_one({"farmer_id": farmer_id})

    if not record:
        return {
            "farmer_id": farmer_id,
            "total_points": 0,
            "donation_count": 0,
            "rescue_donation_count": 0,
            "total_kg_donated": 0,
            "badges": [],
            "all_badges": _get_all_badges_status({}),
            "donation_history": [],
            "leaderboard_rank": _get_rank(farmer_id),
        }

    # Compute badges
    record["leaderboard_rank"] = _get_rank(farmer_id)
    earned_badges = _compute_earned_badges(record)
    all_badges = _get_all_badges_status(record)

    return {
        "farmer_id": farmer_id,
        "total_points": record.get("total_points", 0),
        "donation_count": record.get("donation_count", 0),
        "rescue_donation_count": record.get("rescue_donation_count", 0),
        "total_kg_donated": round(record.get("total_kg_donated", 0), 1),
        "badges": earned_badges,
        "all_badges": all_badges,
        "donation_history": record.get("donation_history", [])[-20:],  # last 20
        "leaderboard_rank": record.get("leaderboard_rank", 0),
    }


def get_leaderboard(limit: int = 10) -> List[dict]:
    """Get top farmers by total points."""
    collection = _get_rewards_collection()
    top = list(
        collection.find({}, {"_id": 0, "donation_history": 0})
        .sort("total_points", -1)
        .limit(limit)
    )
    for i, entry in enumerate(top, 1):
        entry["rank"] = i
        entry["badges"] = _compute_earned_badges(entry)
    return top


def _get_rank(farmer_id: str) -> int:
    """Get the leaderboard rank for a specific farmer."""
    collection = _get_rewards_collection()
    record = collection.find_one({"farmer_id": farmer_id})
    if not record:
        return 0

    farmer_points = record.get("total_points", 0)
    rank = collection.count_documents({"total_points": {"$gt": farmer_points}}) + 1
    return rank


def _compute_earned_badges(record: dict) -> List[dict]:
    """Compute which badges a farmer has earned."""
    earned = []
    for badge_id, badge in BADGES.items():
        if badge["check"](record):
            earned.append({
                "id": badge["id"],
                "name": badge["name"],
                "icon": badge["icon"],
                "description": badge["description"],
                "earned": True,
            })
    return earned


def _get_all_badges_status(record: dict) -> List[dict]:
    """Get all badges with earned/locked status and progress."""
    result = []
    for badge_id, badge in BADGES.items():
        earned = badge["check"](record) if record else False
        progress = _compute_badge_progress(badge_id, record)
        result.append({
            "id": badge["id"],
            "name": badge["name"],
            "icon": badge["icon"],
            "description": badge["description"],
            "requirement": badge["requirement"],
            "earned": earned,
            "progress": progress,
        })
    return result


def _compute_badge_progress(badge_id: str, record: dict) -> float:
    """Compute progress (0-100) towards earning a badge."""
    if not record:
        return 0.0

    progress_map = {
        "food_saver": min(100, (record.get("donation_count", 0) / 5) * 100),
        "community_hero": min(100, (record.get("total_points", 0) / 500) * 100),
        "rescue_champion": min(100, (record.get("rescue_donation_count", 0) / 10) * 100),
        "top_contributor": 100 if record.get("leaderboard_rank") == 1 else 0,
        "green_warrior": min(100, (record.get("total_kg_donated", 0) / 100) * 100),
    }
    return round(progress_map.get(badge_id, 0), 1)
