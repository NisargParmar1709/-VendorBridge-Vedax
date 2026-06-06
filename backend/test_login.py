import requests

url = "http://localhost:5000/api/v1/auth/login"
payload = {
    "email": "test@example.com",
    "password": "Password123!"
}
response = requests.post(url, json=payload)
print(f"Status: {response.status_code}")
print(f"Response: {response.text}")
