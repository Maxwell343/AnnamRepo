from pydantic import BaseModel, EmailStr
from typing import List, Optional

# ---------- AUTH ----------
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str


# ---------- PROFILE COMPLETION ----------
class CompleteProfile(BaseModel):
    email: EmailStr
    fullName: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    roles: List[str]  # ["farmer", "buyer"]
    farmName: Optional[str] = None
    farmLocation: Optional[str] = None
    language: Optional[str] = "English"
    notificationsWhatsApp: Optional[bool] = True
    notificationsSMS: Optional[bool] = False


# ---------- VERIFICATION ----------
class BuyerVerification(BaseModel):
    gstin: str

class NgoVerification(BaseModel):
    registrationNumber: str
