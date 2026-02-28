#!/usr/bin/env python3
"""
Test script for the product expiry feature
Tests the automatic marking and filtering of expired listings
"""

import requests
import json
from datetime import datetime, timedelta

BASE_URL = "http://localhost:5000"
API_LISTINGS = f"{BASE_URL}/api/listings"

def test_expiry_feature():
    """Test the automatic expiry feature"""
    
    print("=" * 60)
    print("ANNAM Product Expiry Feature - Test Suite")
    print("=" * 60)
    
    # Test 1: Get all current listings
    print("\n[TEST 1] Fetching all active listings...")
    try:
        response = requests.get(API_LISTINGS, timeout=5)
        if response.status_code == 200:
            data = response.json()
            active_count = data.get('count', 0)
            print(f"✓ Success! Found {active_count} active listings")
            
            # Check for any expired listings in active list
            expired_in_active = [l for l in data.get('listings', []) if l.get('status') == 'expired']
            if expired_in_active:
                print(f"   Warning: Found {len(expired_in_active)} expired in active list (should be 0)")
            else:
                print(f"✓ Verified: No expired listings in active results")
        else:
            print(f"✗ Failed with status {response.status_code}")
    except Exception as e:
        print(f"✗ Error: {e}")
    
    # Test 2: Get all listings including expired
    print("\n[TEST 2] Fetching all listings (including expired)...")
    try:
        response = requests.get(f"{API_LISTINGS}?include_expired=true", timeout=5)
        if response.status_code == 200:
            data = response.json()
            total_count = data.get('count', 0)
            all_listings = data.get('listings', [])
            expired_count = len([l for l in all_listings if l.get('status') == 'expired'])
            
            print(f"✓ Success! Found {total_count} total listings")
            print(f"  - Active: {total_count - expired_count}")
            print(f"  - Expired: {expired_count}")
        else:
            print(f"✗ Failed with status {response.status_code}")
    except Exception as e:
        print(f"✗ Error: {e}")
    
    # Test 3: Get expired listings only
    print("\n[TEST 3] Fetching expired listings only...")
    try:
        response = requests.get(f"{API_LISTINGS}/expired", timeout=5)
        if response.status_code == 200:
            data = response.json()
            expired_count = data.get('count', 0)
            print(f"✓ Success! Found {expired_count} expired listings")
            
            if expired_count > 0:
                expired_list = data.get('listings', [])[0]  # Show first one
                print(f"\n  First expired listing:")
                print(f"    - Title: {expired_list.get('title')}")
                print(f"    - Status: {expired_list.get('status')}")
                print(f"    - Expiry Date: {expired_list.get('expiry_date', 'N/A')}")
                if 'expired_at' in expired_list:
                    print(f"    - Marked Expired At: {expired_list.get('expired_at')}")
        else:
            print(f"✗ Failed with status {response.status_code}")
    except Exception as e:
        print(f"✗ Error: {e}")
    
    # Test 4: Create a test listing with past expiry
    print("\n[TEST 4] Creating test listing with past expiry date...")
    try:
        past_date = (datetime.now() - timedelta(days=1)).isoformat()
        
        test_listing = {
            "title": "TEST: Expired Tomatoes",
            "description": "This is a test listing that should be marked as expired",
            "quantity": "25 kg",
            "type": "Vegetable",
            "expiry_date": past_date,
            "pickup_address": "Test Farm, Haryana",
            "farmer_id": "test_farmer_1",
            "farmer_name": "Test Farmer",
            "farmer_phone": "+919876543210"
        }
        
        response = requests.post(API_LISTINGS, json=test_listing, timeout=5)
        if response.status_code == 200:
            result = response.json()
            listing_id = result.get('listing', {}).get('id')
            print(f"✓ Created test listing: {listing_id}")
            
            # Now fetch to verify it's marked as expired
            # Note: The next request will auto-mark it as expired
            print(f"\n  Fetching the created listing to trigger expiry check...")
            response2 = requests.get(f"{API_LISTINGS}/{listing_id}", timeout=5)
            if response2.status_code == 200:
                created_listing = response2.json()
                print(f"  - Status: {created_listing.get('status')}")
                if created_listing.get('status') == 'expired':
                    print(f"✓ Verified: Listing automatically marked as expired!")
                else:
                    print(f"  Listing status: {created_listing.get('status')}")
            else:
                print(f"  Note: Individual listing fetch returned {response2.status_code}")
        else:
            print(f"✗ Failed with status {response.status_code}")
            print(f"  Response: {response.text}")
    except Exception as e:
        print(f"✗ Error: {e}")
    
    # Test 5: Verify expiry checking
    print("\n[TEST 5] Verifying expiry check logic...")
    try:
        # Fetch active listings (should exclude the test listing we created)
        response = requests.get(API_LISTINGS, timeout=5)
        if response.status_code == 200:
            data = response.json()
            all_listings = data.get('listings', [])
            
            # Check if test listing is in active list
            test_in_active = [l for l in all_listings if 'TEST' in l.get('title', '')]
            
            if test_in_active:
                print(f"✗ Test listing found in active listings (should be filtered)")
            else:
                print(f"✓ Test listing correctly excluded from active listings")
            
            # Now fetch with include_expired
            response2 = requests.get(f"{API_LISTINGS}?include_expired=true", timeout=5)
            if response2.status_code == 200:
                data2 = response2.json()
                all_listings2 = data2.get('listings', [])
                test_in_all = [l for l in all_listings2 if 'TEST' in l.get('title', '')]
                
                if test_in_all:
                    print(f"✓ Test listing found in all listings (with include_expired=true)")
                else:
                    print(f"  Note: Test listing not found (may not have been created)")
    except Exception as e:
        print(f"✗ Error: {e}")
    
    print("\n" + "=" * 60)
    print("Test suite completed!")
    print("=" * 60)

if __name__ == "__main__":
    test_expiry_feature()
