import json

def test_health_check(client):
    """Test standard health check endpoint"""
    response = client.get('/')
    assert response.status_code == 200
    assert response.get_json() == {"status": "Backend running successfully"}

def test_login_fail(client):
    """Test login with wrong credentials"""
    response = client.post('/api/auth/login', 
        data=json.dumps({"email": "wrong@example.com", "password": "wrong"}),
        content_type='application/json'
    )
    assert response.status_code == 401

def test_get_profile(client, auth_headers):
    """Test getting profile of authenticated user"""
    response = client.get('/api/auth/profile', headers=auth_headers)
    assert response.status_code == 200
    data = response.get_json()
    assert data['email'] == "testadmin@example.com"
    assert data['role'] == "admin"

def test_get_branches(client, auth_headers):
    """Test listing branches (requires auth)"""
    response = client.get('/api/branches', headers=auth_headers)
    assert response.status_code == 200
    assert 'branches' in response.get_json()

def test_unauthorized_access(client):
    """Test that unauthorized requests are blocked"""
    response = client.get('/api/admin/users')
    assert response.status_code == 401
