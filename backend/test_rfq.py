"""Quick test: login as procurement officer and create RFQ"""
import requests
import traceback

BASE = "http://localhost:5000/api/v1"

# 1. Login
r = requests.post(f"{BASE}/auth/login", json={"email": "rohan@vendorbridge.com", "password": "Rohan@123"})
assert r.status_code == 200, f"Login failed: {r.text}"
token = r.json()["access_token"]
headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

# 2. List vendors
r = requests.get(f"{BASE}/vendors", headers=headers, params={"per_page": 10})
vendors = r.json().get("vendors", [])
print(f"Found {len(vendors)} vendors")

# 3. Create RFQ — try with minimal payload first
rfq_data = {
    "title": "Test RFQ",
    "category": "Electronics",
    "description": "Test description",
    "deadline": "2026-07-15",
    "line_items": [
        {"item_name": "Laptop", "quantity": 10, "unit": "pcs"}
    ],
    "vendor_ids": [vendors[0]["id"]] if vendors else [],
}
print(f"Sending RFQ payload: {rfq_data}")
r = requests.post(f"{BASE}/rfqs", headers=headers, json=rfq_data)
print(f"Status: {r.status_code}")
print(f"Response: {r.text}")
