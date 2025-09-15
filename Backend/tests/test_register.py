from fastapi.testclient import TestClient
from app import app

client = TestClient(app)

def run_test():
    payload = {
        "username": "testuser1",
        "email": "testuser1@example.com",
        "full_name": "Test User",
        "password": "password123",
        "role": "user"
    }
    resp = client.post("/auth/register", json=payload)
    print('Status code:', resp.status_code)
    try:
        print('Response JSON:', resp.json())
    except Exception as e:
        print('Response text:', resp.text)

if __name__ == '__main__':
    run_test()
