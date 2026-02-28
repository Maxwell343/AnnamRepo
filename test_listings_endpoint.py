#!/usr/bin/env python
"""Test /api/listings endpoint"""
import requests
import json

BASE_URL = "http://localhost:5000/api"

print("=" * 60)
print("TESTING /api/listings ENDPOINT")
print("=" * 60)

# Test 1: Get all listings from database
print("\n1. GET /listings:")
r = requests.get(f"{BASE_URL}/listings")
print(f"Status: {r.status_code}")
data = r.json()
print(f"Response keys: {list(data.keys())}")

if isinstance(data, dict):
    listings = data.get('listings', [])
    count = data.get('count', len(listings))
    print(f"Total count: {count}")
    print(f"Listings returned: {len(listings)}")
else:
    listings = data if isinstance(data, list) else []
    print(f"Listings returned: {len(listings)}")

print("\nListings details:")
for item in listings[:5]:  # Show first 5
    title = item.get('title', 'N/A')
    status = item.get('status', 'N/A')
    expiry = item.get('expiry_date') or item.get('expiry', 'N/A')
    print(f"  ✓ {title}")
    print(f"    Status: {status}, Expires: {expiry}")

if len(listings) > 5:
    print(f"\n  ... and {len(listings) - 5} more")

print("\n" + "=" * 60)
