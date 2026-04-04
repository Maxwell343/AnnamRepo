"""
ANNAM Rescue, Rewards & Impact Routes
──────────────────────────────────────
API endpoints for:
  • Rescue actions (donate / sell discounted)
  • NGO priority listing feeds
  • Farmer reward points & leaderboard
  • Platform impact metrics
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from datetime import datetime

from app.models.listing_model import RescueActionRequest
from app.services.listing_service import (
    get_listing_by_id,
    get_all_listings,
    set_rescue_action,
    claim_listing,
    update_listing,
)
from app.services.expiry_engine import enrich_listing, compute_hours_remaining
from app.services.reward_service import get_farmer_rewards, get_leaderboard
from app.services.impact_service import get_global_impact_stats
from app.core.database import listings_collection, db

router = APIRouter(prefix="/api", tags=["Rescue & Rewards"])

marketplace_listings = db["marketplace_listings"]


# ============================================
# RESCUE ACTIONS
# ============================================

@router.post("/rescue/{listing_id}/action")
async def rescue_action(listing_id: str, payload: RescueActionRequest):
    """
    Farmer sets a rescue action for an urgent/rescue listing.
    Actions: 'donate' or 'sell_discounted'
    """
    if payload.action not in ("donate", "sell_discounted"):
        raise HTTPException(status_code=400, detail="Action must be 'donate' or 'sell_discounted'")

    result = set_rescue_action(listing_id, payload.action, payload.farmer_id)
    if not result:
        raise HTTPException(status_code=404, detail="Listing not found")

    return {
        "message": f"Rescue action '{payload.action}' applied successfully",
        "listing": result,
    }


# ============================================
# RESCUE LISTING FEEDS
# ============================================

@router.get("/rescue/listings")
async def get_rescue_listings():
    """
    Get all urgent + rescue listings from both collections.
    Sorted by hours_remaining ASC (most urgent first).
    """
    results = []

    # listings collection
    for coll in [listings_collection, marketplace_listings]:
        docs = list(coll.find({
            "status": {"$nin": ["expired", "delivered", "cancelled"]},
            "expires_at": {"$exists": True, "$ne": None},
        }))
        for doc in docs:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
            enrich_listing(doc)
            if doc.get("urgency_status") in ("urgent", "rescue"):
                doc["source"] = coll.name
                results.append(doc)

    # Sort by most urgent first
    results.sort(key=lambda x: x.get("hours_remaining", 999))

    return {
        "listings": results,
        "count": len(results),
    }


@router.get("/rescue/ngo-priority")
async def get_ngo_priority_listings():
    """
    NGO priority feed: only urgent + rescue listings.
    donation_mode listings appear at top, sorted most-urgent-first.
    """
    results = []

    for coll in [listings_collection, marketplace_listings]:
        docs = list(coll.find({
            "status": {"$nin": ["expired", "delivered", "cancelled"]},
            "expires_at": {"$exists": True, "$ne": None},
        }))
        for doc in docs:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
            enrich_listing(doc)
            if doc.get("urgency_status") in ("urgent", "rescue"):
                results.append(doc)

    # Sort: donation_mode first, then by hours_remaining ASC
    results.sort(key=lambda x: (
        0 if x.get("donation_mode") else 1,
        x.get("hours_remaining", 999),
    ))

    return {
        "listings": results,
        "count": len(results),
    }


@router.get("/rescue/ngo-critical")
async def get_ngo_critical_listings():
    """
    Critical NGO feed: ONLY listings with < 12 hours remaining.
    """
    results = []

    for coll in [listings_collection, marketplace_listings]:
        docs = list(coll.find({
            "status": {"$nin": ["expired", "delivered", "cancelled"]},
            "expires_at": {"$exists": True, "$ne": None},
        }))
        for doc in docs:
            doc["id"] = str(doc["_id"])
            del doc["_id"]
            enrich_listing(doc)
            if doc.get("hours_remaining", 999) < 12 and doc.get("urgency_status") != "expired":
                results.append(doc)

    results.sort(key=lambda x: x.get("hours_remaining", 999))

    return {
        "listings": results,
        "count": len(results),
    }


@router.post("/rescue/{listing_id}/claim-donation")
async def claim_donation_listing(listing_id: str, ngo_id: str, ngo_name: str = "NGO"):
    """NGO claims a donation listing."""
    listing = get_listing_by_id(listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    if not listing.get("donation_mode"):
        raise HTTPException(status_code=400, detail="This listing is not in donation mode")

    ngo_data = {
        "ngo_id": ngo_id,
        "ngo_name": ngo_name,
    }
    updated = claim_listing(listing_id, ngo_data)

    return {
        "message": "Donation claimed successfully",
        "listing": updated,
    }


# ============================================
# FARMER REWARDS
# ============================================

@router.get("/rewards/farmer/{farmer_id}")
async def farmer_rewards(farmer_id: str):
    """Get a farmer's reward points, badges, and donation history."""
    rewards = get_farmer_rewards(farmer_id)
    return rewards


@router.get("/rewards/leaderboard")
async def rewards_leaderboard(limit: int = Query(10, ge=1, le=50)):
    """Get top contributing farmers by impact points."""
    leaderboard = get_leaderboard(limit)
    return {
        "leaderboard": leaderboard,
        "count": len(leaderboard),
    }


# ============================================
# IMPACT METRICS
# ============================================

@router.get("/impact/stats")
async def impact_stats():
    """Get global platform impact metrics — food saved, meals, CO₂."""
    stats = get_global_impact_stats()
    return stats
