from pydantic import BaseModel, EmailStr
from typing import Literal, Optional

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: str
    city: str
    role: Literal["farmer", "ngo", "driver"]

    ngoName: Optional[str] = None
    vehicleType: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: str
