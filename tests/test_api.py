"""
Integration tests for FastAPI REST endpoints in src.main and src.api.routes.
"""

import io
from pypdf import PdfWriter
from fastapi.testclient import TestClient

from src.main import app

client = TestClient(app)


def test_root_endpoint():
    """Verify root status endpoint returns API metadata."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "running"
    assert "version" in data
    assert "active_provider" in data


def test_health_endpoint():
    """Verify health check probe returns status ok."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["version"] == "1.0.0"


def test_generate_rubric_endpoint():
    """Verify rubric generation produces valid normalized criteria."""
    payload = {
        "lecture_title": "Operating Systems: Concurrency",
        "lecture_content": "A mutex provides mutual exclusion. Semaphores manage resource counting.",
    }
    response = client.post("/generate/rubrics", json=payload)
    assert response.status_code == 200
    rubric = response.json()
    assert "rubric_id" in rubric
    assert len(rubric["criteria"]) >= 3
    # Check that weights sum to approx 1.0
    total_weight = sum(c["weight"] for c in rubric["criteria"])
    assert round(total_weight, 2) == 1.0


def test_generate_assessment_endpoint():
    """Verify assessment synthesis produces requested question count."""
    payload = {
        "lecture_title": "Operating Systems: Concurrency",
        "lecture_content": "A mutex provides mutual exclusion. Semaphores manage resource counting.",
        "question_count": 3,
    }
    response = client.post("/generate/assessment", json=payload)
    assert response.status_code == 200
    assessment = response.json()
    assert len(assessment["questions"]) == 3
    assert assessment["total_points"] > 0


def test_grade_exam_endpoint():
    """Verify single question evaluation returns score and feedback."""
    # First generate rubric and question
    rubric_res = client.post("/generate/rubrics", json={
        "lecture_title": "Concurrency",
        "lecture_content": "Mutex and Semaphore primitives."
    })
    rubric = rubric_res.json()

    assess_res = client.post("/generate/assessment", json={
        "lecture_title": "Concurrency",
        "lecture_content": "Mutex and Semaphore primitives.",
        "question_count": 1
    })
    question = assess_res.json()["questions"][0]

    grade_res = client.post("/grade/exam", json={
        "question": question,
        "rubric": rubric,
        "student_answer": "A mutex guarantees mutual exclusion by allowing only one thread in critical section."
    })
    assert grade_res.status_code == 200
    report = grade_res.json()
    assert report["total_score"] > 0
    assert report["max_possible_score"] > 0
    assert len(report["evaluations"]) > 0


def test_upload_pdf_endpoint():
    """Verify PDF upload parses document and returns chunk metadata."""
    # Create small valid in-memory PDF
    writer = PdfWriter()
    writer.add_blank_page(width=200, height=200)
    pdf_bytes = io.BytesIO()
    writer.write(pdf_bytes)
    pdf_bytes.seek(0)

    response = client.post(
        "/upload",
        files={"file": ("lecture_sample.pdf", pdf_bytes, "application/pdf")}
    )
    assert response.status_code == 200
    data = response.json()
    assert "document_id" in data
    assert data["filename"] == "lecture_sample.pdf"
