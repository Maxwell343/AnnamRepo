#!/usr/bin/env python
"""Test marketplace expiry filtering"""
import requests
import json
from datetime import datetime

BASE_URL = "http://localhost:5000/api/marketplace"

print("=" * 60)
print("MARKETPLACE EXPIRY FILTERING TEST")
print("=" * 60)

# Test 1: Get all listings (expired should be excluded)
print("\n1. GET /listings (should exclude expired):")
r = requests.get(f"{BASE_URL}/listings?limit=100")
print(f"Status: {r.status_code}")
listings = r.json()
print(f"Listings returned: {len(listings)}")
for item in listings:
    expiry = item.get('expiry_date', 'N/A')
    print(f"  ✓ {item['title']}")
    print(f"    Expires: {expiry}")

# Test 2: Get listings with include_expired=true
print("\n2. GET /listings?include_expired=true:")
r = requests.get(f"{BASE_URL}/listings?limit=100&include_expired=true")
print(f"Status: {r.status_code}")
listings_with_expired = r.json()
print(f"Listings returned: {len(listings_with_expired)}")
for item in listings_with_expired:
    expiry = item.get('expiry_date', 'N/A')
    print(f"  ✓ {item['title']}")
    print(f"    Expires: {expiry}")

# Test 3: Check near-expiry category
print("\n3. GET /near-expiry (should exclude actual expired):")
r = requests.get(f"{BASE_URL}/near-expiry")
print(f"Status: {r.status_code}")
near_expiry = r.json()
print(f"Near-expiry listings: {len(near_expiry)}")
for item in near_expiry:
    print(f"  ✓ {item['title']} (expires: {item.get('expiry_date', 'N/A')})")

print("\n" + "=" * 60)
print("TEST COMPLETE")
print("=" * 60)
