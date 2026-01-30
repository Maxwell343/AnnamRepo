from fastapi import APIRouter, HTTPException
from app.models.user_model import UserCreate, UserLogin
from app.services.auth_service import create_user, authenticate_user

router = APIRouter(prefix="/api", tags=["Auth"])

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
