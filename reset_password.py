#!/usr/bin/env python3

import requests
import json

# First login with current password (newtest123) and change back to admin123
base_url = "https://fintrack-572.preview.emergentagent.com"

# Login with current password
login_url = f"{base_url}/api/auth/login"
response = requests.post(login_url, json={"password": "newtest123"}, headers={'Content-Type': 'application/json'})

if response.status_code == 200:
    token = response.json()['token']
    print(f"✅ Logged in with newtest123, token: {token[:20]}...")
    
    # Change password back to admin123
    change_url = f"{base_url}/api/auth/change-password?token={token}"
    change_data = {
        "current_password": "newtest123",
        "new_password": "admin123"
    }
    
    response = requests.post(change_url, json=change_data, headers={'Content-Type': 'application/json'})
    
    if response.status_code == 200:
        print("✅ Password changed back to admin123")
        
        # Verify login with admin123 works
        verify_response = requests.post(login_url, json={"password": "admin123"}, headers={'Content-Type': 'application/json'})
        if verify_response.status_code == 200:
            print("✅ Verified: Login with admin123 now works")
        else:
            print(f"❌ Login with admin123 still fails: {verify_response.status_code}")
    else:
        print(f"❌ Failed to change password: {response.status_code}")
        try:
            print(f"Error: {response.json()}")
        except:
            pass
else:
    print(f"❌ Failed to login with newtest123: {response.status_code}")
    try:
        print(f"Error: {response.json()}")
    except:
        pass