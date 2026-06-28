import requests

url = "https://vtu-backend-8gsi.onrender.com/api/v1/login/access-token"
data = {"username": "admin@axisvtu.com", "password": "securepassword"}
r = requests.post(url, data=data)
if r.status_code == 200:
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    r2 = requests.get("https://vtu-backend-8gsi.onrender.com/api/v1/endpoints/admin/analytics", headers=headers)
    print(r2.status_code)
    print(r2.text[:200])
else:
    print("Login failed:", r.status_code)
