import requests
import os

# Login to get token
login_url = "http://127.0.0.1:5000/api/auth/login"
login_data = {
    "email": "admin@retail.com",
    "password": "admin123"
}

try:
    session = requests.Session()
    response = session.post(login_url, json=login_data)
    
    if response.status_code != 200:
        print(f"Login failed: {response.text}")
        exit(1)
        
    token = response.json().get('access_token')
    print("Login successful, token obtained.")
    
    # Upload File
    import_url = "http://127.0.0.1:5000/api/products/import"
    
    file_path = "test_products.csv"
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        # Create it if missing (recovery)
        with open(file_path, 'w') as f:
            f.write("Name,Price,Category,Quantity\nTestA,100,CatA,10\nTestB,200,CatB,20")
            
    with open(file_path, 'rb') as f:
        files = {'file': (file_path, f, 'text/csv')}
        headers = {'Authorization': f'Bearer {token}'}
        
        print(f"Uploading {file_path}...")
        resp = requests.post(import_url, headers=headers, files=files)
        
        print(f"Status Code: {resp.status_code}")
        print(f"Response: {resp.text}")

except Exception as e:
    print(f"An error occurred: {e}")
