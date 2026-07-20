"""
Backend regression + P0 tests for CD Trofense.

Scope of this iteration (iteration_4):
- P0: DELETE /api/users/{id} — bug fix for user deletion + guardrail (can't delete self)
- Email/contacto on athlete: PUT /api/athletes/{id} persistence
- POST /api/athletes/{aid}/send-report — validate wired up (expect 503 without EMERGENT_EMAIL_KEY,
  or 400 if body missing). We do NOT send real emails.
"""

import os
import uuid
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")

ADMIN_EMAIL = "admin@trofense.pt"
ADMIN_PWD = "Trofense2026!"


@pytest.fixture(scope="session")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_auth(api_client):
    r = api_client.post(f"{BASE_URL}/api/auth/login",
                        json={"email": ADMIN_EMAIL, "password": ADMIN_PWD})
    assert r.status_code == 200, f"Login falhou: {r.status_code} {r.text}"
    data = r.json()
    token = data.get("token")
    admin_id = data.get("user", {}).get("id")
    assert token and admin_id
    api_client.headers.update({"Authorization": f"Bearer {token}"})
    return {"token": token, "id": admin_id}


# ---------------- Users: P0 DELETE bug ----------------
class TestUsersDelete:
    def test_create_and_delete_user_persists(self, api_client, admin_auth):
        email = f"test_{uuid.uuid4().hex[:8]}@trofense.pt"
        payload = {"email": email, "password": "TestPass123!", "name": "TEST User", "role": "viewer"}

        # CREATE
        cr = api_client.post(f"{BASE_URL}/api/users", json=payload)
        assert cr.status_code == 200, cr.text
        created = cr.json()
        assert created["email"].lower() == email.lower()
        assert created["role"] == "viewer"
        assert created["active"] is True
        assert "id" in created
        uid = created["id"]

        # LIST -> user present
        lr = api_client.get(f"{BASE_URL}/api/users")
        assert lr.status_code == 200
        assert any(u["id"] == uid for u in lr.json()), "utilizador criado não aparece em GET /api/users"

        # DELETE
        dr = api_client.delete(f"{BASE_URL}/api/users/{uid}")
        assert dr.status_code == 200, f"DELETE devia devolver 200, veio {dr.status_code} {dr.text}"
        assert dr.json() == {"ok": True}

        # LIST -> user gone
        lr2 = api_client.get(f"{BASE_URL}/api/users")
        assert lr2.status_code == 200
        assert not any(u["id"] == uid for u in lr2.json()), "utilizador ainda presente após DELETE"

    def test_delete_self_forbidden(self, api_client, admin_auth):
        r = api_client.delete(f"{BASE_URL}/api/users/{admin_auth['id']}")
        assert r.status_code == 400
        detail = r.json().get("detail", "")
        assert "próprio" in detail.lower() or "propr" in detail.lower(), detail

    def test_delete_nonexistent_returns_404(self, api_client, admin_auth):
        r = api_client.delete(f"{BASE_URL}/api/users/{uuid.uuid4()}")
        assert r.status_code == 404


# ---------------- Athletes: email + contacto ----------------
class TestAthleteEmailContacto:
    def test_update_athlete_email_contacto_persists(self, api_client, admin_auth):
        # find any athlete
        ar = api_client.get(f"{BASE_URL}/api/athletes")
        assert ar.status_code == 200
        athletes = ar.json()
        assert athletes, "nenhum atleta no seed"
        a = athletes[0]
        aid = a["id"]

        # Full PUT body (AthleteIn) — keep nome, alterar email/contacto
        payload = {
            "nome": a["nome"],
            "posicao": a.get("posicao"),
            "sexo": a.get("sexo", "M"),
            "etnia": a.get("etnia", "caucasiano"),
            "altura_cm": a.get("altura_cm"),
            "idade": a.get("idade"),
            "peso_normal_kg": a.get("peso_normal_kg"),
            "peso_atual_kg": a.get("peso_atual_kg"),
            "email": "TEST_atleta@trofense.pt",
            "contacto": "+351 912345678",
        }
        pr = api_client.put(f"{BASE_URL}/api/athletes/{aid}", json=payload)
        assert pr.status_code == 200, pr.text
        data = pr.json()
        assert data["email"] == "TEST_atleta@trofense.pt"
        assert data["contacto"] == "+351 912345678"

        # GET to confirm persistence
        gr = api_client.get(f"{BASE_URL}/api/athletes/{aid}")
        assert gr.status_code == 200
        g = gr.json()
        assert g["email"] == "TEST_atleta@trofense.pt"
        assert g["contacto"] == "+351 912345678"


# ---------------- Send-report endpoint (no real email) ----------------
class TestSendReport:
    def test_send_report_missing_body_returns_422(self, api_client, admin_auth):
        # find any athlete
        ar = api_client.get(f"{BASE_URL}/api/athletes")
        aid = ar.json()[0]["id"]
        r = api_client.post(f"{BASE_URL}/api/athletes/{aid}/send-report", json={})
        # Pydantic validation -> 422
        assert r.status_code in (422, 400)

    def test_send_report_endpoint_wired(self, api_client, admin_auth):
        """We don't actually send. Expect either 503 (no EMERGENT_EMAIL_KEY),
        502 (integration error), 404 (unknown athlete), or 200/ok.
        Should NOT be 405/404-on-route."""
        ar = api_client.get(f"{BASE_URL}/api/athletes")
        aid = ar.json()[0]["id"]
        payload = {
            "recipient_email": "test-noop@example.com",
            "message": "test",
            "pdf_base64": "JVBERi0xLjQKJcOkw7zDtsO4CjIgMCBvYmoKPDwKPj4Kc3RyZWFtCg==",
            "filename": "test.pdf",
        }
        r = api_client.post(f"{BASE_URL}/api/athletes/{aid}/send-report", json=payload)
        assert r.status_code in (200, 502, 503), f"unexpected status {r.status_code}: {r.text}"
