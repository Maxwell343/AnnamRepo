#!/usr/bin/env python
"""Test the improved is_listing_expired function"""
from datetime import datetime, timedelta
import sys
import re

# Copy the improved is_listing_expired function
def is_listing_expired(listing: dict) -> bool:
    """Check if a listing has expired based on expiry_date or expiry"""
    expiry_date_str = listing.get("expiry_date") or listing.get("expiry")
    created_at_str = listing.get("created_at")
    
    if not expiry_date_str:
        return False  # No expiry date means never expires
    
    try:
        expiry_dt = None
        
        # Format 1: ISO format with datetime
        if isinstance(expiry_date_str, str) and "T" in expiry_date_str:
            expiry_dt = datetime.fromisoformat(expiry_date_str.replace("Z", "+00:00"))
        # Format 2: ISO date only (YYYY-MM-DD)
        elif isinstance(expiry_date_str, str) and len(expiry_date_str) == 10 and expiry_date_str.count("-") == 2:
            try:
                expiry_dt = datetime.fromisoformat(expiry_date_str)
                # Set to end of day (23:59:59)
                expiry_dt = expiry_dt.replace(hour=23, minute=59, second=59)
            except:
                pass
        # Format 3: Relative time like "3 days", "2 hours", "30 minutes"
        elif isinstance(expiry_date_str, str):
            match = re.match(r'(\d+)\s*(day|hour|minute)s?', expiry_date_str.lower().strip())
            if match:
                value = int(match.group(1))
                unit = match.group(2).lower()
                
                # Determine base time (created_at or now)
                base_time = datetime.utcnow()
                if created_at_str:
                    try:
                        base_time = datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
                    except:
                        base_time = datetime.utcnow()
                
                # Calculate expiry time
                if unit == "day" or unit == "days":
                    expiry_dt = base_time + timedelta(days=value)
                elif unit == "hour" or unit == "hours":
                    expiry_dt = base_time + timedelta(hours=value)
                elif unit == "minute" or unit == "minutes":
                    expiry_dt = base_time + timedelta(minutes=value)
        
        # If we couldn't parse to a datetime, assume not expired
        if not expiry_dt:
            return False
        
        # Check if expiry time has passed
        now = datetime.utcnow() if expiry_dt.tzinfo is None else datetime.now(expiry_dt.tzinfo)
        is_expired = now > expiry_dt
        
        return is_expired
    except Exception as e:
        print(f"[WARNING] Failed to parse expiry date '{expiry_date_str}': {e}")
        return False


print("=" * 60)
print("TESTING is_listing_expired() FUNCTION")
print("=" * 60)

# Test cases
test_cases = [
    # Test 1: Relative time - "2 days" created 3 days ago (should be expired)
    {
        "name": "2 days expiry created 3 days ago",
        "listing": {
            "title": "fresh cabbages",
            "expiry": "2 days",
            "created_at": (datetime.utcnow() - timedelta(days=3)).isoformat()
        },
        "expected": True
    },
    # Test 2: Relative time - "3 days" created 1 day ago (should NOT be expired)
    {
        "name": "3 days expiry created 1 day ago",
        "listing": {
            "title": "fresh cabbages 2",
            "expiry": "3 days",
            "created_at": (datetime.utcnow() - timedelta(days=1)).isoformat()
        },
        "expected": False
    },
    # Test 3: ISO datetime in future (should NOT be expired)
    {
        "name": "ISO datetime in future",
        "listing": {
            "title": "fresh veggies",
            "expiry_date": (datetime.utcnow() + timedelta(days=5)).isoformat()
        },
        "expected": False
    },
    # Test 4: ISO datetime in past (should be expired)
    {
        "name": "ISO datetime in past",
        "listing": {
            "title": "old produce",
            "expiry_date": (datetime.utcnow() - timedelta(hours=2)).isoformat()
        },
        "expected": True
    },
    # Test 5: Relative time - "0 hours" created now (should be expired)
    {
        "name": "0 hours expiry created now",
        "listing": {
            "title": "critically expired",
            "expiry": "0 hours",
            "created_at": datetime.utcnow().isoformat()
        },
        "expected": True
    }
]

passed = 0
failed = 0

for test in test_cases:
    result = is_listing_expired(test["listing"])
    status = "✓ PASS" if result == test["expected"] else "✗ FAIL"
    if result == test["expected"]:
        passed += 1
    else:
        failed += 1
    
    expiry_info = test["listing"].get("expiry") or test["listing"].get("expiry_date")
    print(f"\n{status}: {test['name']}")
    print(f"  Expiry: {expiry_info}")
    print(f"  Expected: {test['expected']}, Got: {result}")

print("\n" + "=" * 60)
print(f"Results: {passed} passed, {failed} failed")
print("=" * 60)
