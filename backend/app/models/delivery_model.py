"""
Delivery Data Models
─────────────────────
Pydantic schemas for the Delivery entity and the NGO acceptance flow.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


# ──────────────────────────────────────────
# Enums
# ──────────────────────────────────────────

class DeliveryStatus(str, Enum):
    ASSIGNED   = "assigned"    # Driver picked by the system
    ACCEPTED   = "accepted"    # Driver confirmed the assignment
    IN_TRANSIT = "in_transit"  # Driver has picked up the cargo
    DELIVERED  = "delivered"   # Cargo handed to NGO
    FAILED     = "failed"      # Driver rejected / timed out, no fallback available
    CANCELLED  = "cancelled"   # NGO or admin cancelled


# ──────────────────────────────────────────
# Route waypoint (stored in delivery.route)
# ──────────────────────────────────────────

class RoutePoint(BaseModel):
    latitude:  float
    longitude: float
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# ──────────────────────────────────────────
# Request bodies
# ──────────────────────────────────────────

class NGOAcceptRequest(BaseModel):
    """
    Payload when an NGO accepts a listing (full or partial).
    quantity_accepted is an integer (kg / units) — must be <= remaining_quantity.
    """
    listing_id:       str
    ngo_id:           str
    ngo_name:         str
    ngo_phone:        Optional[str] = None
    ngo_address:      Optional[str] = None
    # Destination coords (NGO location for route planning)
    dest_latitude:    Optional[float] = None
    dest_longitude:   Optional[float] = None
    # Partial quantity in integer units; if None → take all remaining
    quantity_accepted: Optional[int]  = None


class DriverRespondRequest(BaseModel):
    """Driver accepts or rejects an assigned delivery."""
    delivery_id: str
    driver_id:   str
    accepted:    bool
    reason:      Optional[str] = None  # filled if rejected


class DeliveryLocationUpdate(BaseModel):
    """GPS ping from driver during transit."""
    delivery_id: str
    driver_id:   str
    latitude:    float
    longitude:   float
    heading:     Optional[float] = None
    speed_kmh:   Optional[float] = None


class DeliveryStatusAdvance(BaseModel):
    """Driver advances the lifecycle stage."""
    delivery_id: str
    driver_id:   str
    # Allowed: accepted → in_transit → delivered
    new_status:  DeliveryStatus
    notes:       Optional[str] = None


class ManualAssignRequest(BaseModel):
    """Admin/system manually assigns a specific driver."""
    listing_id:  str
    driver_id:   str
    ngo_id:      Optional[str] = None
    quantity:    Optional[int] = None
