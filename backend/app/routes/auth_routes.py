from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.models.user_model import UserCreate, UserLogin, ForgotPasswordRequest, VerifyOTPRequest, ResetPasswordRequest
from app.services.auth_service import create_user, authenticate_user, generate_otp, verify_otp, reset_password, get_user_by_email, create_google_user, authenticate_google_user

router = APIRouter(prefix="/api", tags=["Auth"])


# Google Auth Models
class GoogleCheckRequest(BaseModel):
    email: str

class GoogleLoginRequest(BaseModel):
    email: str
    credential: str

class GoogleSignupRequest(BaseModel):
    email: str
    name: str
    credential: str
    phone: str
    city: str
    role: str
    ngoName: Optional[str] = None
    vehicleType: Optional[str] = None


@router.post("/signup")
def signup(user: UserCreate):
    new_user = create_user(user.dict())

    if not new_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    return {
        "message": "User created successfully"
    }

@router.post("/login")
def login(user: UserLogin):
    db_user = authenticate_user(user.email, user.password)

    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return {
        "user": {
            "id": str(db_user["_id"]),
            "name": db_user.get("name"),
            "email": db_user.get("email"),
            "role": db_user.get("role")
        }
    }


# Google OAuth Endpoints
@router.post("/google-auth/check")
def google_check(request: GoogleCheckRequest):
    """Check if user with this email already exists"""
    user = get_user_by_email(request.email)
    return {"exists": user is not None}


@router.post("/google-auth/login")
def google_login(request: GoogleLoginRequest):
    """Login existing user via Google"""
    user = authenticate_google_user(request.email)
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found. Please sign up first.")
    
    return {
        "user": {
            "id": str(user["_id"]),
            "name": user.get("name"),
            "email": user.get("email"),
            "role": user.get("role")
        }
    }


@router.post("/google-auth/signup")
def google_signup(request: GoogleSignupRequest):
    """Create new user via Google OAuth"""
    user_data = {
        "email": request.email,
        "name": request.name,
        "phone": request.phone,
        "city": request.city,
        "role": request.role,
        "auth_provider": "google",
        "ngoName": request.ngoName,
        "vehicleType": request.vehicleType
    }
    
    new_user = create_google_user(user_data)
    
    if not new_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    return {
        "user": {
            "id": str(new_user["_id"]),
            "name": new_user.get("name"),
            "email": new_user.get("email"),
            "role": new_user.get("role")
        }
    }


@router.post("/forgot-password")
def forgot_password(request: ForgotPasswordRequest):
    # Check if user exists
    user = get_user_by_email(request.email)
    if not user:
        raise HTTPException(status_code=404, detail="Email not registered")
    
    # Generate and store OTP
    otp = generate_otp(request.email)
    
    # In production, you would send this OTP via email
    # For now, we'll just return success (and log OTP for testing)
    print(f"[DEV] OTP for {request.email}: {otp}")
    
    return {
        "message": "OTP sent to your email address",
        "dev_otp": otp  # Remove this in production!
    }


@router.post("/verify-otp")
def verify_otp_endpoint(request: VerifyOTPRequest):
    result = verify_otp(request.email, request.otp)
    
    if not result:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
    
    return {
        "message": "OTP verified successfully",
        "resetToken": result["reset_token"]
    }


@router.post("/reset-password")
def reset_password_endpoint(request: ResetPasswordRequest):
    result = reset_password(request.email, request.resetToken, request.newPassword)
    
    if not result:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    return {
        "message": "Password reset successfully"
    }
