import requests

BASE = "http://localhost:5000/api/v1"

# 1. Login as procurement officer
print("=== Login as Procurement Officer ===")
r = requests.post(f"{BASE}/auth/login", json={"email": "rohan@vendorbridge.com", "password": "Rohan@123"})
print(f"Status: {r.status_code}")
if r.status_code != 200:
    print(f"Error: {r.text}")
    exit(1)
token = r.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}
print(f"Role: {r.json()['user']['role']}")

# 2. List vendors
print("\n=== List Vendors ===")
r = requests.get(f"{BASE}/vendors", headers=headers, params={"per_page": 10})
print(f"Status: {r.status_code}")
vendors = r.json().get("vendors", [])
print(f"Vendors found: {len(vendors)}")
for v in vendors:
    print(f"  - {v['name']} ({v['category']}) [status: {v['status']}]")

# 3. Create RFQ
print("\n=== Create RFQ ===")
rfq_data = {
    "title": "Office Laptop Procurement Q3 2026",
    "category": "Electronics",
    "description": "Procurement of high-performance laptops for engineering team.",
    "deadline": "2026-07-15",
    "line_items": [
        {"item_name": "Laptop - i7 16GB RAM", "quantity": 25, "unit": "pcs", "description": "14-inch, SSD 512GB"},
        {"item_name": "Laptop Bag", "quantity": 25, "unit": "pcs", "description": "Premium leather"},
        {"item_name": "Wireless Mouse", "quantity": 25, "unit": "pcs", "description": "Ergonomic, Bluetooth"},
    ],
    "vendor_ids": [str(v["id"]) for v in vendors[:2]] if vendors else [],
}
r = requests.post(f"{BASE}/rfqs", headers=headers, json=rfq_data)
print(f"Status: {r.status_code}")
if r.status_code == 201:
    rfq = r.json()
    print(f"RFQ created: {rfq.get('rfq_number')} - {rfq.get('title')}")
    print(f"RFQ ID: {rfq.get('id')}")
else:
    print(f"Error: {r.text}")

print("\n=== ALL TESTS PASSED ===")
