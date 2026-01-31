from app.core.database import users_collection
from app.utils.security import hash_password, verify_password
from bson import ObjectId
import random
import string
from datetime import datetime, timedelta

# In-memory store for OTPs (use Redis in production)
otp_store = {}

def create_user(user_data: dict):
    existing = users_collection.find_one({"email": user_data["email"]})
    if existing:
        return None

    user_data["password"] = hash_password(user_data["password"])
    result = users_collection.insert_one(user_data)

    user_data["_id"] = result.inserted_id
    return user_data

def authenticate_user(email: str, password: str):
    user = users_collection.find_one({"email": email})
    if not user:
        return None

    if not verify_password(password, user["password"]):
        return None

    return user


def get_user_by_email(email: str):
    """Get user by email address"""
    return users_collection.find_one({"email": email})


def generate_otp(email: str) -> str:
    """Generate a 6-digit OTP and store it with expiry"""
    otp = ''.join(random.choices(string.digits, k=6))
    
    # Store OTP with 10 minute expiry
    otp_store[email] = {
        "otp": otp,
        "expires_at": datetime.now() + timedelta(minutes=10),
        "reset_token": None
    }
    
    return otp


def verify_otp(email: str, otp: str):
    """Verify OTP and generate reset token if valid"""
    if email not in otp_store:
        return None
    
    stored = otp_store[email]
    
    # Check if expired
    if datetime.now() > stored["expires_at"]:
        del otp_store[email]
        return None
    
    # Check if OTP matches
    if stored["otp"] != otp:
        return None
    
    # Generate reset token
    reset_token = ''.join(random.choices(string.ascii_letters + string.digits, k=32))
    
    # Update store with reset token (valid for 15 minutes)
    otp_store[email] = {
        "otp": None,
        "reset_token": reset_token,
        "expires_at": datetime.now() + timedelta(minutes=15)
    }
    
    return {"reset_token": reset_token}


def reset_password(email: str, reset_token: str, new_password: str) -> bool:
    """Reset password using reset token"""
    if email not in otp_store:
        return False
    
    stored = otp_store[email]
    
    # Check if expired
    if datetime.now() > stored["expires_at"]:
        del otp_store[email]
        return False
    
    # Check if reset token matches
    if stored["reset_token"] != reset_token:
        return False
    
    # Update password in database
    hashed_password = hash_password(new_password)
    result = users_collection.update_one(
        {"email": email},
        {"$set": {"password": hashed_password}}
    )
    
    # Clean up OTP store
    del otp_store[email]
    
    return result.modified_count > 0


def create_google_user(user_data: dict):
    """Create a new user via Google OAuth (no password required)"""
    existing = users_collection.find_one({"email": user_data["email"]})
    if existing:
        return None

    # No password hash needed for Google users
    user_data["password"] = None  # Google users don't have a password
    result = users_collection.insert_one(user_data)

    user_data["_id"] = result.inserted_id
    return user_data


def authenticate_google_user(email: str):
    """Authenticate a user via Google OAuth (just check if exists)"""
    user = users_collection.find_one({"email": email})
    return user
