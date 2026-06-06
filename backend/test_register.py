import requests

url = "http://localhost:5000/api/v1/auth/register"
payload = {
    "first_name": "Test",
    "last_name": "User",
    "email": "test@example.com",
    "password": "Password123!",
    "role": "vendor",
    "phone": "1234567890"
}
response = requests.post(url, json=payload)
print(f"Status: {response.status_code}")
print(f"Response: {response.text}")
