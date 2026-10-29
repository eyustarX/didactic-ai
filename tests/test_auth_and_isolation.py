"""
Tests for user authentication and multi-tenant data isolation.
Verifies that accounts have completely separate data and never leak between users.
"""

import uuid
from fastapi.testclient import TestClient
from src.main import app
from src.db.models import Base
from src.db.session import engine, get_session

client = TestClient(app)


def test_user_registration_and_login():
    """Verify user registration, duplicate prevention, and login credentials verification."""
    unique_email = f"user_{uuid.uuid4().hex[:8]}@example.com"
    pwd = "securepassword123"

    # 1. Register new user
    reg_res = client.post("/api/auth/register", json={
        "name": "Dr. Alice Smith",
        "email": unique_email,
        "password": pwd,
    })
    assert reg_res.status_code == 200, reg_res.text
    user_data = reg_res.json()
    assert "id" in user_data
    assert user_data["id"].startswith("usr_")
    assert user_data["email"] == unique_email
    assert user_data["name"] == "Dr. Alice Smith"
    user_a_id = user_data["id"]

    # 2. Prevent duplicate email registration
    dup_res = client.post("/api/auth/register", json={
        "name": "Dr. Alice Smith",
        "email": unique_email,
        "password": "anotherpassword",
    })
    assert dup_res.status_code == 400
    assert "already exists" in dup_res.json()["detail"].lower()

    # 3. Successful login
    login_res = client.post("/api/auth/login", json={
        "email": unique_email,
        "password": pwd,
    })
    assert login_res.status_code == 200
    assert login_res.json()["id"] == user_a_id

    # 4. Failed login with wrong password
    bad_login = client.post("/api/auth/login", json={
        "email": unique_email,
        "password": "wrongpassword",
    })
    assert bad_login.status_code == 401

    # 5. Register User B with different email -> get distinct ID
    b_email = f"user_{uuid.uuid4().hex[:8]}@example.com"
    reg_b = client.post("/api/auth/register", json={
        "name": "Prof. Bob Jones",
        "email": b_email,
        "password": pwd,
    })
    assert reg_b.status_code == 200
    user_b_id = reg_b.json()["id"]
    assert user_b_id != user_a_id


def test_account_data_isolation():
    """
    Verify complete tenant isolation between two distinct user accounts.
    User B must NEVER see or access User A's lecture notes, assessments, chat sessions, or analytics.
    """
    email_a = f"alice_{uuid.uuid4().hex[:8]}@test.com"
    email_b = f"bob_{uuid.uuid4().hex[:8]}@test.com"

    res_a = client.post("/api/auth/register", json={"name": "Alice", "email": email_a, "password": "password123"})
    res_b = client.post("/api/auth/register", json={"name": "Bob", "email": email_b, "password": "password123"})
    id_a = res_a.json()["id"]
    id_b = res_b.json()["id"]

    headers_a = {"X-Lecturer-Id": id_a}
    headers_b = {"X-Lecturer-Id": id_b}

    # 1. User A creates a lecture note
    up_res = client.post(
        "/api/lecture-notes/upload",
        headers=headers_a,
        data={"pasted_text": "Photosynthesis is the process by which green plants make food.", "note_title": "Botany 101"},
    )
    assert up_res.status_code == 200
    note_a_id = up_res.json()["id"]

    # 2. User A creates an assessment
    gen_res = client.post(
        "/api/assessments/generate",
        headers=headers_a,
        json={"lecture_note_id": note_a_id, "question_count": 2, "title": "Botany Midterm"},
    )
    assert gen_res.status_code == 200
    assessment_a_id = gen_res.json()["id"]

    # 3. User A creates a chat session
    chat_res = client.post(
        "/api/chat/sessions",
        headers=headers_a,
        json={"title": "Botany Discussion", "lecture_note_id": note_a_id},
    )
    assert chat_res.status_code == 200
    session_a_id = chat_res.json()["id"]

    # --- VERIFY USER A SEES THEIR OWN DATA ---
    a_notes = client.get("/api/lecture-notes", headers=headers_a).json()
    assert any(n["id"] == note_a_id for n in a_notes)

    a_assessments = client.get("/api/assessments", headers=headers_a).json()
    assert any(a["id"] == assessment_a_id for a in a_assessments)

    a_chats = client.get("/api/chat/sessions", headers=headers_a).json()
    assert any(c["id"] == session_a_id for c in a_chats)

    # --- VERIFY USER B SEES ZERO OF USER A'S DATA ---
    b_notes = client.get("/api/lecture-notes", headers=headers_b).json()
    assert not any(n["id"] == note_a_id for n in b_notes)
    assert len(b_notes) == 0

    b_assessments = client.get("/api/assessments", headers=headers_b).json()
    assert not any(a["id"] == assessment_a_id for a in b_assessments)
    assert len(b_assessments) == 0

    b_chats = client.get("/api/chat/sessions", headers=headers_b).json()
    assert not any(c["id"] == session_a_id for c in b_chats)
    assert len(b_chats) == 0

    # User B's analytics must be empty
    b_analytics = client.get("/api/analytics", headers=headers_b).json()
    assert b_analytics["total_submissions"] == 0

    # --- VERIFY USER B CANNOT ACCESS USER A'S INDIVIDUAL RESOURCES (404) ---
    note_detail_b = client.get(f"/api/lecture-notes/{note_a_id}", headers=headers_b)
    assert note_detail_b.status_code == 404

    ass_detail_b = client.get(f"/api/assessments/{assessment_a_id}", headers=headers_b)
    assert ass_detail_b.status_code == 404

    chat_detail_b = client.get(f"/api/chat/sessions/{session_a_id}", headers=headers_b)
    assert chat_detail_b.status_code == 404

    subs_b = client.get(f"/api/assessments/{assessment_a_id}/submissions", headers=headers_b)
    assert subs_b.status_code == 404
