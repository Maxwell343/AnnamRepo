from fastapi import APIRouter, HTTPException
from database import users_collection
from models import UserCreate, UserLogin
from datetime import datetime
from passlib.context import CryptContext
from models import CompleteProfile

router = APIRouter(prefix="/api/auth", tags=["Auth"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str):
    return pwd_context.hash(password)

def verify_password(password: str, hashed: str):
    return pwd_context.verify(password, hashed)

# ---------------- SIGNUP ----------------
@router.post("/signup")
def signup(user: UserCreate):
    existing = users_collection.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")

    users_collection.insert_one({
        "name": user.name,
        "email": user.email,
        "password": hash_password(user.password),

        # NEW FIELDS
        "roles": [],
        "profileCompleted": False,
        "verifications": {},

        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    })

    return {"message": "Account created successfully"}

# ---------------- LOGIN ----------------
@router.post("/login")
def login(user: UserLogin):
    db_user = users_collection.find_one({"email": user.email})
    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not verify_password(user.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return {
        "user": {
            "id": str(db_user["_id"]),
            "name": db_user["name"],
            "email": db_user["email"],
            "roles": db_user.get("roles", []),
            "profileCompleted": db_user.get("profileCompleted", False),
            "verifications": db_user.get("verifications", {})
        }
    }

@router.post("/complete-profile")
def complete_profile(data: CompleteProfile):
    update_data = {
        "roles": data.roles,
        "phone": data.phone,
        "city": data.city,
        "profileCompleted": True,
        "updatedAt": datetime.utcnow()
    }
    
    # Add optional fields if provided
    if data.fullName:
        update_data["name"] = data.fullName
    if data.farmName:
        update_data["farmName"] = data.farmName
    if data.farmLocation:
        update_data["farmLocation"] = data.farmLocation
    if data.language:
        update_data["language"] = data.language
    
    # Add notification preferences
    update_data["notifications"] = {
        "whatsapp": data.notificationsWhatsApp,
        "sms": data.notificationsSMS
    }
    
    result = users_collection.update_one(
        {"email": data.email},
        {"$set": update_data}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    return {"message": "Profile completed successfully"}
