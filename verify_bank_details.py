import requests

BASE_URL = "http://127.0.0.1:5000/api"

def test_profile_bank_details():
    # 1. Login
    login_res = requests.post(f"{BASE_URL}/auth/login", json={
        "email": "staff@example.com",
        "password": "password123"
    })
    if login_res.status_code != 200:
        print("Login failed")
        return
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Get Profile
    profile_res = requests.get(f"{BASE_URL}/auth/profile", headers=headers)
    print("Profile GET response:", profile_res.json())

    # 3. Update Bank Details
    update_res = requests.put(f"{BASE_URL}/auth/profile", headers=headers, json={
        "bank_name": "Test Bank",
        "account_number": "1234567890",
        "ifsc_code": "TEST0001"
    })
    print("Profile UPDATE response:", update_res.json())

    # 4. Verify Update
    profile_res = requests.get(f"{BASE_URL}/auth/profile", headers=headers)
    data = profile_res.json()
    if data.get("bank_name") == "Test Bank":
        print("✅ Bank details updated and verified via backend!")
    else:
        print("❌ Verification failed")

if __name__ == "__main__":
    test_profile_bank_details()
