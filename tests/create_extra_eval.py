import os, requests
BASE = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')
s = requests.Session()
r = s.post(f"{BASE}/api/auth/login", json={"email":"admin@trofense.pt","password":"Trofense2026!"})
tok = r.json().get("token") or r.json().get("access_token")
h = {"Authorization": f"Bearer {tok}", "Content-Type":"application/json"}
AID = "d191ac87-61cb-4e64-9bf9-bd5a3d699494"

# Create a second evaluation slightly earlier & different peso to see chart variation
payload = {
    "date": "2026-06-01",
    "peso_kg": 82.7,
    "age_at_eval": 22,
    "pregas": {"peito":0,"tricipital":15,"bicipital":10,"axilar":19,"subescapular":21,"suprailiaca":18,"abdominal":26,"supraespinhal":15,"coxa":0,"gemeo":11},
    "perimetros": {"braco":35,"coxaD":63,"coxaE":64,"gemeo":39,"cintura":86,"anca":106},
    "notas": "TEST_EVAL_ITER11"
}
r = s.post(f"{BASE}/api/athletes/{AID}/evaluations", headers=h, json=payload)
print("create", r.status_code, r.text[:300])
