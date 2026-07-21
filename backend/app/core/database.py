from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.errors import ConnectionFailure
from app.core.config import MONGO_URI, DB_NAME
from datetime import datetime

try:
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    # Test the connection
    client.admin.command('ping')
    print(f"[SUCCESS] Connected to MongoDB successfully!")
    db = client[DB_NAME]
except ConnectionFailure as e:
    print(f"[ERROR] Failed to connect to MongoDB: {e}")
    raise

# Collections
users_collection = db["users"]
listings_collection = db["listings"]
delivery_tasks_collection = db["delivery_tasks"]
notifications_collection = db["notifications"]
farmer_rewards_collection = db["farmer_rewards"]
marketplace_listings_collection = db["marketplace_listings"]

# ── Smart Mobility collections ────────────────────────────────────────────────
drivers_collection    = db["drivers"]
deliveries_collection = db["deliveries"]
driver_requests_collection = db["driver_requests"]

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
        listings_collection.create_index([("expires_at", ASCENDING)])
        listings_collection.create_index([("donation_mode", ASCENDING)])
        listings_collection.create_index([("rescue_action", ASCENDING)])
        listings_collection.create_index([("geo_cluster_tag", ASCENDING)])
        
        # Create indexes for marketplace listings (expiry/rescue)
        marketplace_listings_collection.create_index([("expires_at", ASCENDING)])
        marketplace_listings_collection.create_index([("donation_mode", ASCENDING)])
        marketplace_listings_collection.create_index([("rescue_action", ASCENDING)])
        marketplace_listings_collection.create_index([("geo_cluster_tag", ASCENDING)])
        
        # Create indexes for delivery tasks
        delivery_tasks_collection.create_index([("driver_id", ASCENDING)])
        delivery_tasks_collection.create_index([("listing_id", ASCENDING)])
        delivery_tasks_collection.create_index([("status", ASCENDING)])
        
        # Create indexes for notifications
        notifications_collection.create_index([("user_id", ASCENDING)])
        notifications_collection.create_index([("created_at", DESCENDING)])
        notifications_collection.create_index([("read", ASCENDING)])
        
        # Create indexes for farmer rewards (leaderboard)
        farmer_rewards_collection.create_index([("farmer_id", ASCENDING)], unique=True)
        farmer_rewards_collection.create_index([("total_points", DESCENDING)])

        # ── Smart Mobility: Driver indexes ────────────────────────────────────
        drivers_collection.create_index([("status", ASCENDING)])
        drivers_collection.create_index([("last_active_time", ASCENDING)])
        drivers_collection.create_index([("phone", ASCENDING)], unique=True, sparse=True)
        # 2dsphere index enables native MongoDB geo queries if needed in future
        try:
            drivers_collection.create_index(
                [("latitude", ASCENDING), ("longitude", ASCENDING)]
            )
        except Exception:
            pass  # geo index may already exist

        # ── Smart Mobility: Delivery indexes ─────────────────────────────────
        deliveries_collection.create_index([("driver_id", ASCENDING)])
        deliveries_collection.create_index([("listing_id", ASCENDING)])
        deliveries_collection.create_index([("ngo_id", ASCENDING)])
        deliveries_collection.create_index([("status", ASCENDING)])
        deliveries_collection.create_index([("created_at", DESCENDING)])

        # ── Smart Mobility: Driver Requests (dispatch) indexes ────────────
        driver_requests_collection.create_index(
            [("driver_id", ASCENDING), ("status", ASCENDING)]
        )
        driver_requests_collection.create_index([("listing_id", ASCENDING)])
        driver_requests_collection.create_index([("expires_at", ASCENDING)])
        driver_requests_collection.create_index([("status", ASCENDING)])
        
        print("[SUCCESS] Database collections and indexes initialized successfully!")
        return True
    except Exception as e:
        print(f"[WARNING] Could not create indexes: {e}")
        return False

# Initialize collections when module is imported
init_collections()

def get_collection_stats():
    """Get statistics about all collections"""
    stats = {
        "users": users_collection.count_documents({}),
        "listings": listings_collection.count_documents({}),
        "delivery_tasks": delivery_tasks_collection.count_documents({}),
        "notifications": notifications_collection.count_documents({}),
        "farmer_rewards": farmer_rewards_collection.count_documents({}),
        "marketplace_listings": marketplace_listings_collection.count_documents({})
    }
    return stats

