# Product Expiry Auto-Removal Implementation

## Overview
This document describes the automatic product expiry feature implemented in the ANNAM application. When products expire, they are automatically marked as "expired" in the database but their data is preserved for historical records.

## Features Implemented

### 1. **Backend - Expiry Detection & Marking** 
**File**: `backend/app/services/listing_service.py`

#### New Functions Added:

##### `is_listing_expired(listing: dict) -> bool`
- Checks if a listing's expiry date has passed
- Handles multiple date formats (ISO format with datetime, date-only)
- Automatically sets expired products to end-of-day (23:59:59) for fair comparison
- Returns `False` if no expiry date is set (never expires)

**Usage:**
```python
listing = get_listing_by_id("lst_123")
if is_listing_expired(listing):
    print("This listing has expired")
```

##### `mark_expired_listings() -> int`
- Scans all active listings (available, claimed, assigned, picked_up)
- Marks expired ones with status = "expired"
- Sets `expired_at` timestamp for audit trail
- Returns count of newly expired listings
- Runs automatically before retrieving listings to ensure real-time accuracy

**Returns**: Number of listings marked as expired

### 2. **Backend - API Methods Updated**

#### `get_all_listings(filters: dict = None, include_expired: bool = False)`
- **New parameter**: `include_expired` (default: False)
- **Behavior**: 
  - Automatically calls `mark_expired_listings()` before returning data
  - Excludes expired listings by default
  - Set `include_expired=True` to retrieve expired listings (for archive views)
  
**Usage:**
```python
# Get active listings only
active = get_all_listings()

# Get all listings including expired ones
all_with_expired = get_all_listings(include_expired=True)

# Get only expired listings
expired_only = get_all_listings({"status": "expired"}, include_expired=True)
```

#### `get_listing_by_id(listing_id: str)`
- Marks expired listings before returning
- Returns data regardless of expiry status

#### `get_listings_by_farmer(farmer_id: str)`
- Excludes expired listings by default
- Allows farmers to see only active listings

#### `get_available_listings()`
- Excludes expired products automatically
- Only returns items available for NGO claims

### 3. **API Endpoints**

#### GET `/api/listings`
- **Query Parameters**:
  - `farmer_id` (optional)
  - `status` (optional) 
  - `type` (optional)
  - `include_expired` (optional, default: false) - Set to `true` to include expired listings

**Example Requests:**
```bash
# Get all active listings
GET http://localhost:5000/api/listings

# Get expired listings only
GET http://localhost:5000/api/listings?status=expired&include_expired=true

# Get all listings including expired
GET http://localhost:5000/api/listings?include_expired=true
```

#### GET `/api/listings/expired`
- Returns all expired listings
- Useful for archive/history views
- Response includes `expired_at` timestamp

#### GET `/api/listings/expired/{farmer_id}`
- Returns expired listings for a specific farmer
- Helpful for farmers to see their expired products

#### GET `/api/listings/available`
- Returns only available listings (excludes expired)
- Used for NGO marketplace

#### GET `/api/listings/claimed/{ngo_id}`
- Returns listings claimed by an NGO
- Excludes expired listings

### 4. **Database Schema**

Listings now track expiry with these fields:
```python
{
    "_id": ObjectId,
    "title": str,
    "expiry_date": str,  # ISO format or YYYY-MM-DD
    "status": "available|claimed|assigned|picked_up|in_transit|delivered|expired|cancelled",
    "created_at": str,   # ISO timestamp
    "updated_at": str,   # ISO timestamp
    "expired_at": str    # ISO timestamp (set when marked as expired)
}
```

### 5. **Automatic Expiry Process**

The expiry checking happens automatically:

1. **On Every API Request**: `mark_expired_listings()` is called before fetching listings
2. **Real-time Marking**: Expired listings are immediately marked with status "expired"
3. **Data Preservation**: Original data remains in the database (not deleted)
4. **Timestamp Tracking**: `expired_at` field records when the product was marked as expired

**Flow Diagram:**
```
API Request (GET /api/listings)
    ↓
1. mark_expired_listings() runs
    - Finds all active listings
    - Checks each against expiry_date
    - Marks expired ones: status = "expired", expired_at = now
    ↓
2. get_all_listings() retrieves data
    - Filters out "expired" status by default
    - Only returns active listings
    ↓
3. Response sent to frontend
    - Client sees only non-expired products
```

### 6. **Frontend Integration**

The frontend already supports expired status:

**Available in `src/types/marketplace.ts`:**
```typescript
type ListingStatus = 'available' | 'claimed' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'expired' | 'cancelled';
```

**Display Components:**
- Status badges show "Expired" for products with status = "expired"
- Separate filters allow farmers to view expired listings
- UI styling distinguishes expired items (different color/styling)

### 7. **Testing**

#### Manual Test Steps:

1. **Create a test listing with past expiry date:**
```python
import requests
from datetime import datetime, timedelta

# Create listing that expires today at 2 PM (but it's now after 2 PM)
yesterday = (datetime.now() - timedelta(days=1)).isoformat()
requests.post('http://localhost:5000/api/listings', json={
    "title": "Test Expired Tomatoes",
    "expiry_date": yesterday,
    "quantity": "10",
    # ... other fields
})
```

2. **Fetch listings:**
```bash
# Should NOT return the expired listing
curl http://localhost:5000/api/listings

# Should return the expired listing
curl http://localhost:5000/api/listings?include_expired=true
```

3. **Check expired listings endpoint:**
```bash
curl http://localhost:5000/api/listings/expired
```

### 8. **Configuration & Customization**

#### Supported Date Formats:
- ISO 8601 with time: `"2026-02-28T14:30:00Z"`
- ISO 8601 date only: `"2026-02-28"`
- Unix timestamp parsing can be added if needed

#### Expiry Logic:
- Date-only formats expire at end of day (23:59:59)
- Datetime formats use exact time specified
- No expiry date = never expires (always available)

#### Future Enhancements:
- Automatic notification to farmers when product is about to expire (24 hours before)
- Batch archival of old expired listings to separate archive collection
- Expiry extension requests from farmers
- Shelf-life management based on product type

## Files Modified

1. **`backend/app/services/listing_service.py`**
   - Added `is_listing_expired()`
   - Added `mark_expired_listings()`
   - Updated `get_all_listings()` with `include_expired` parameter
   - Updated `get_listing_by_id()` to mark expired before returning
   - Updated `get_listings_by_farmer()` to exclude expired
   - Updated `get_available_listings()` for clarity

2. **`backend/app/routes/listing_routes.py`**
   - Updated `GET /api/listings` to support `include_expired` query parameter
   - Added `GET /api/listings/expired` endpoint
   - Added `GET /api/listings/expired/{farmer_id}` endpoint
   - Updated documentation

3. **Frontend** (no changes needed - already supports expired status)
   - Pre-existing status type includes "expired"
   - UI displays expired items correctly

## Benefits

✅ **Data Preservation**: No data loss - expired listings stay in DB
✅ **Real-time**: Automatic checking on each API request
✅ **Transparent**: Clear audit trail with `expired_at` timestamp
✅ **Flexible**: Can retrieve expired listings for archive/reporting
✅ **User-friendly**: Expired products automatically hidden from active marketplace
✅ **No Manual Intervention**: Farmers don't need to delete or archive listings

## Usage Examples

### Frontend - Displaying Active Listings:
```typescript
// Active listings (automatically excludes expired)
const response = await fetch('/api/listings');
const { listings } = await response.json();
// listings will only contain status: 'available' | 'claimed' | ... but NOT 'expired'
```

### Frontend - Viewing Expired Listings:
```typescript
// All listings including expired
const response = await fetch('/api/listings?include_expired=true');
const { listings } = await response.json();
// Filter for expired ones if needed
const expiredListings = listings.filter(l => l.status === 'expired');
```

### Backend - Checking Expiry Programmatically:
```python
from app.services.listing_service import is_listing_expired

listing = get_listing_by_id("lst_123")
if is_listing_expired(listing):
    # Handle expired listing
    notify_farmer_about_expiry(listing)
```

## Troubleshooting

**Problem**: Expired listings still showing in marketplace
- **Solution**: Ensure frontend is calling `/api/listings` without `include_expired=true`

**Problem**: Listings not being marked as expired
- **Solution**: Check that `expiry_date` format is correct (ISO format preferred)
- **Check**: Run `mark_expired_listings()` manually to see logs

**Problem**: Cannot retrieve expired listings
- **Solution**: Use `/api/listings/expired` endpoint or add `?include_expired=true` to any listings query

## Summary

The automatic product expiry feature is now fully implemented in the ANNAM application. Products automatically expire based on their `expiry_date` field, are marked with status "expired", but their data is preserved in the database. The frontend automatically hides expired products from the active marketplace while still allowing access to expired listings through dedicated endpoints for historical reference.
