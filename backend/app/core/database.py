from pymongo import MongoClient
from app.core.config import MONGO_URI, DB_NAME

client = MongoClient(MONGO_URI)
db = client[DB_NAME]

users_collection = db["users"]

def get_database():
    """Get the MongoDB database instance"""
    return db
