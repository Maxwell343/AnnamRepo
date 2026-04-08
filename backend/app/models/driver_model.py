"""
Driver Data Models
──────────────────
Pydantic schemas for the Driver entity used in the Smart Mobility system.
"""

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


# ──────────────────────────────────────────
# Enums
# ──────────────────────────────────────────

class DriverStatus(str, Enum):
    OFFLINE = "offline"
    IDLE    = "idle"
    BUSY    = "busy"


class VehicleType(str, Enum):
    BIKE        = "bike"
    AUTO        = "auto"
    MINI_TRUCK  = "mini_truck"
    TRUCK       = "truck"
    VAN         = "van"


# ──────────────────────────────────────────
# Request bodies
# ──────────────────────────────────────────

class DriverCreate(BaseModel):
    """Register a new driver."""
    name:           str
    phone:          str
    vehicle_number: str
    vehicle_type:   VehicleType = VehicleType.BIKE
    # Starting coordinates (e.g. driver's home / depot)
    latitude:       float
    longitude:      float


class DriverStatusUpdate(BaseModel):
    """Driver manually going online (idle) or offline."""
    driver_id: str
    status:    DriverStatus  # only 'idle' or 'offline' allowed from this endpoint


class DriverLocationUpdate(BaseModel):
    """Periodic GPS ping from the driver app."""
    driver_id: str
    latitude:  float
    longitude: float
    heading:   Optional[float] = None   # degrees 0-360
    speed_kmh: Optional[float] = None   # km/h


# ──────────────────────────────────────────
# Response helpers
# ──────────────────────────────────────────

class DriverOut(BaseModel):
    """Public-facing driver representation (no sensitive fields)."""
    id:             str
    name:           str
    phone:          str
    vehicle_number: str
    vehicle_type:   str
    status:         DriverStatus
    latitude:       float
    longitude:      float
    last_active_time: Optional[datetime] = None
    created_at:     Optional[datetime]   = None
