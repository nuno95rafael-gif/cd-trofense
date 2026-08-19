import os, requests
BASE = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
s = requests.Session()
r = s.post(f"{BASE}/api/auth/login", json={"email":"admin@trofense.pt","password":"Trofense2026!"})
tok = r.json().get("token") or r.json().get("access_token")
h = {"Authorization": f"Bearer {tok}"}
AID = "d191ac87-61cb-4e64-9bf9-bd5a3d699494"
evs = s.get(f"{BASE}/api/athletes/{AID}/evaluations", headers=h).json()
for e in evs:
    if e.get("notas") == "TEST_EVAL_ITER11":
        r = s.delete(f"{BASE}/api/evaluations/{e['id']}", headers=h)
        print("delete", e["id"], r.status_code)
# Verify only 1 remaining
evs = s.get(f"{BASE}/api/athletes/{AID}/evaluations", headers=h).json()
print("remaining:", len(evs))
