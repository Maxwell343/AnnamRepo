from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.errors import ConnectionFailure
from app.core.config import MONGO_URI, DB_NAME
from datetime import datetime

try:
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    # Test the connection
    client.admin.command('ping')
    print(f"✅ Connected to MongoDB successfully!")
    db = client[DB_NAME]
except ConnectionFailure as e:
    print(f"❌ Failed to connect to MongoDB: {e}")
    raise

# Collections
users_collection = db["users"]
listings_collection = db["listings"]
delivery_tasks_collection = db["delivery_tasks"]
notifications_collection = db["notifications"]

def get_database():
    """Get the MongoDB database instance"""
    return db

def init_collections():
    """Initialize collections with indexes for better performance"""
    try:
        # Create indexes for users collection
        users_collection.create_index([("email", ASCENDING)], unique=True, sparse=True)
        users_collection.create_index([("phone", ASCENDING)])
        users_collection.create_index([("role", ASCENDING)])
        
        # Create indexes for listings collection
        listings_collection.create_index([("farmer_id", ASCENDING)])
        listings_collection.create_index([("status", ASCENDING)])
        listings_collection.create_index([("type", ASCENDING)])
        listings_collection.create_index([("created_at", DESCENDING)])
        listings_collection.create_index([("expiry_date", ASCENDING)])
        
        # Create indexes for delivery tasks
        delivery_tasks_collection.create_index([("driver_id", ASCENDING)])
        delivery_tasks_collection.create_index([("listing_id", ASCENDING)])
        delivery_tasks_collection.create_index([("status", ASCENDING)])
        
        # Create indexes for notifications
        notifications_collection.create_index([("user_id", ASCENDING)])
        notifications_collection.create_index([("created_at", DESCENDING)])
        notifications_collection.create_index([("read", ASCENDING)])
        
        print("✅ Database collections and indexes initialized successfully!")
        return True
    except Exception as e:
        print(f"⚠️  Warning: Could not create indexes: {e}")
        return False

# Initialize collections when module is imported
init_collections()

def get_collection_stats():
    """Get statistics about all collections"""
    stats = {
        "users": users_collection.count_documents({}),
        "listings": listings_collection.count_documents({}),
        "delivery_tasks": delivery_tasks_collection.count_documents({}),
        "notifications": notifications_collection.count_documents({})
    }
    return stats

