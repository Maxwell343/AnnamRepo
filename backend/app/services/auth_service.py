from app.core.database import users_collection
from app.utils.security import hash_password, verify_password
from bson import ObjectId

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
