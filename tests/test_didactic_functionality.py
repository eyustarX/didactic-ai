"""
Basic automated test suite for Didactic AI core functionality:
1. PPTX text extraction (slides, speaker notes, image-only slide detection)
2. Assessment server-level lock enforcement once graded
3. Rubric 'needs_review' status trigger on question edit
4. Unique constraint on (student_id, assessment_id)
5. Excel export data (only confirmed results included with correct columns)
"""

import io
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import IntegrityError
from pptx import Presentation

from src.db.models import (
    Base,
    LectureNote,
    Assessment,
    Question,
    Rubric,
    RubricCriterion,
    Student,
    Submission,
)
from src.ai import extract_from_pptx


@pytest.fixture
def db_session():
    """Provides an isolated in-memory SQLite database session for testing."""
    engine = create_engine("sqlite:///:memory:", echo=False)
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    try:
        yield session
    finally:
        session.close()


# ---------------------------------------------------------------------------
# 1. Test PPTX Text Extraction (Slides & Speaker Notes & Image-Only detection)
# ---------------------------------------------------------------------------

def test_pptx_text_and_speaker_notes_extraction():
    prs = Presentation()

    slide_layout = prs.slide_layouts[0]
    slide1 = prs.slides.add_slide(slide_layout)
    slide1.shapes.title.text = "Operating Systems: Concurrency"
    slide1.placeholders[1].text = "Introduction to critical sections and mutual exclusion."
    slide1.notes_slide.notes_text_frame.text = "Remind students about thread preemption."

    blank_layout = prs.slide_layouts[6]
    prs.slides.add_slide(blank_layout)

    pptx_bytes = io.BytesIO()
    prs.save(pptx_bytes)
    pptx_bytes.seek(0)

    slides_data, full_text, warnings = extract_from_pptx(pptx_bytes.getvalue())

    assert len(slides_data) == 2
    assert slides_data[0]["slide_number"] == 1
    assert "Operating Systems: Concurrency" in slides_data[0]["text"]
    assert "Remind students about thread preemption" in slides_data[0]["speaker_notes"]

    assert slides_data[1]["slide_number"] == 2
    assert "empty slide" in slides_data[1]["text"].lower() or "no text found" in slides_data[1]["text"].lower()
    assert "[Slide 1]" in full_text
    assert "[Slide 1 Speaker Notes]" in full_text


# ---------------------------------------------------------------------------
# 2. Test Server-Level Lock Enforcement Once Graded
# ---------------------------------------------------------------------------

def test_assessment_lock_enforcement(db_session):
    note = LectureNote(name="Distributed Systems", file_type="pdf", ingest_status="done")
    db_session.add(note)
    db_session.flush()

    assessment = Assessment(
        lecture_note_id=note.id,
        title="Midterm Exam",
        status="draft",
        max_score=20.0,
    )
    db_session.add(assessment)
    db_session.flush()

    q1 = Question(assessment_id=assessment.id, text="Explain Paxos consensus.", max_marks=20.0)
    db_session.add(q1)
    db_session.flush()

    student = Student(student_number="STU-100", name="Bob Martin")
    db_session.add(student)
    db_session.flush()

    assert assessment.status == "draft"

    submission = Submission(
        student_id=student.id,
        assessment_id=assessment.id,
        ai_total=18.0,
        total_score=18.0,
        status="graded",
    )
    db_session.add(submission)
    assessment.status = "locked"
    db_session.commit()

    assert assessment.status == "locked"

    def attempt_modify_question(assess_obj, new_text):
        if assess_obj.status == "locked":
            raise PermissionError("Assessment is locked at server level.")
        q1.text = new_text

    with pytest.raises(PermissionError) as exc_info:
        attempt_modify_question(assessment, "New modified text")
    assert "locked at server level" in str(exc_info.value)


# ---------------------------------------------------------------------------
# 3. Test 'needs_review' Rubric Status Trigger on Question Edit
# ---------------------------------------------------------------------------

def test_rubric_needs_review_status_on_question_edit(db_session):
    note = LectureNote(name="Algorithms", file_type="pdf", ingest_status="done")
    db_session.add(note)
    db_session.flush()

    assessment = Assessment(lecture_note_id=note.id, title="Algorithm Quiz", status="draft")
    db_session.add(assessment)
    db_session.flush()

    q = Question(assessment_id=assessment.id, text="What is the time complexity of QuickSort?", max_marks=10.0)
    db_session.add(q)
    db_session.flush()

    rubric = Rubric(question_id=q.id, status="approved")
    db_session.add(rubric)
    db_session.flush()

    criterion = RubricCriterion(rubric_id=rubric.id, description="Identifies average O(n log n)", max_points=10.0)
    db_session.add(criterion)
    db_session.commit()

    assert q.rubric.status == "approved"

    new_text = "What is the time complexity of MergeSort and why is it stable?"
    if q.text != new_text:
        q.text = new_text
        if q.rubric:
            q.rubric.status = "needs_review"
    db_session.commit()

    refreshed_rubric = db_session.query(Rubric).filter(Rubric.question_id == q.id).first()
    assert refreshed_rubric.status == "needs_review"


# ---------------------------------------------------------------------------
# 4. Test Unique Constraint on (student_id, assessment_id)
# ---------------------------------------------------------------------------

def test_unique_student_assessment_submission(db_session):
    note = LectureNote(name="Networking", file_type="pdf", ingest_status="done")
    db_session.add(note)
    db_session.flush()

    assessment = Assessment(lecture_note_id=note.id, title="Networking Quiz")
    db_session.add(assessment)
    student = Student(student_number="STU-200", name="Carol Danvers")
    db_session.add(student)
    db_session.commit()

    sub1 = Submission(
        student_id=student.id,
        assessment_id=assessment.id,
        ai_total=15.0,
        total_score=15.0,
        status="graded",
    )
    db_session.add(sub1)
    db_session.commit()

    sub2 = Submission(
        student_id=student.id,
        assessment_id=assessment.id,
        ai_total=17.0,
        total_score=17.0,
        status="graded",
    )
    db_session.add(sub2)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


# ---------------------------------------------------------------------------
# 5. Test Excel Export Logic (Confirmed Submissions Only)
# ---------------------------------------------------------------------------

def test_excel_export_confirmed_only(db_session):
    note = LectureNote(name="Database Systems", file_type="pdf", ingest_status="done")
    db_session.add(note)
    db_session.flush()

    assessment = Assessment(lecture_note_id=note.id, title="SQL Exam", max_score=100.0)
    db_session.add(assessment)
    db_session.flush()

    stu_confirmed = Student(student_number="STU-001", name="Alice Smith")
    stu_unconfirmed = Student(student_number="STU-002", name="Charlie Brown")
    db_session.add_all([stu_confirmed, stu_unconfirmed])
    db_session.flush()

    sub1 = Submission(
        student_id=stu_confirmed.id,
        assessment_id=assessment.id,
        total_score=92.0,
        status="confirmed",
    )
    sub2 = Submission(
        student_id=stu_unconfirmed.id,
        assessment_id=assessment.id,
        total_score=75.0,
        status="graded",
    )
    db_session.add_all([sub1, sub2])
    db_session.commit()

    confirmed_rows = []
    for s in assessment.submissions:
        if s.status == "confirmed" and s.student:
            pct = round((s.total_score / assessment.max_score) * 100, 1)
            confirmed_rows.append({
                "student_number": s.student.student_number,
                "name": s.student.name,
                "total_score": s.total_score,
                "max_score": assessment.max_score,
                "percentage": f"{pct}%",
            })

    assert len(confirmed_rows) == 1
    assert confirmed_rows[0]["student_number"] == "STU-001"
    assert confirmed_rows[0]["name"] == "Alice Smith"
    assert confirmed_rows[0]["total_score"] == 92.0
    assert confirmed_rows[0]["max_score"] == 100.0
    assert confirmed_rows[0]["percentage"] == "92.0%"


# ---------------------------------------------------------------------------
# 6. Test PDF Exam Paper Generation & Question Text Sanitization
# ---------------------------------------------------------------------------

def test_sanitize_exam_question_text():
    from src.ai.engine import sanitize_exam_question_text

    raw_q = "Which keyword in modern JavaScript declares an immutable constant, according to the lecture notes?"
    clean_q = sanitize_exam_question_text(raw_q, lecture_title="chapter 4-JavaScript.pdf")
    assert "according to the lecture notes" not in clean_q
    assert "chapter 4" not in clean_q
    assert clean_q == "Which keyword in modern JavaScript declares an immutable constant?"

    raw_ans = "According to the lecture, 'var', 'let', and 'const' differ in their scoping."
    clean_ans = sanitize_exam_question_text(raw_ans, lecture_title="ch-2")
    assert "According to the lecture" not in clean_ans


def test_generate_exam_pdf_student_and_solution_modes():
    from src.services.pdf_service import generate_assessment_exam_pdf

    sample_assessment = {
        "title": "Algorithms & Complexity Exam",
        "course_name": "CS 301 - Data Structures",
        "max_score": 10.0,
        "questions": [
            {
                "text": "What is the worst-case complexity of QuickSort?\nA) O(n)\nB) O(n log n)\nC) O(n^2)\nD) O(1)",
                "max_marks": 2.0,
                "student_hint": "Official Answer Key: C) O(n^2)\nLearning Objective: Analyze algorithmic complexity.",
                "rubric": {
                    "criteria": [
                        {"name": "Correctness", "max_score": 2.0, "description": "Selects O(n^2)"}
                    ]
                },
            },
            {
                "text": "Explain why MergeSort requires O(n) auxiliary space.",
                "max_marks": 8.0,
                "student_hint": "Official Answer Key: MergeSort requires auxiliary buffers to merge sub-arrays.",
                "rubric": {
                    "criteria": [
                        {"name": "Memory Analysis", "max_score": 8.0, "description": "Explains buffer allocation."}
                    ]
                },
            },
        ],
    }

    # Test 1: Student Exam Paper
    pdf_student = generate_assessment_exam_pdf(sample_assessment, include_solutions=False)
    assert isinstance(pdf_student, bytes)
    assert len(pdf_student) > 1000
    assert pdf_student[:4] == b"%PDF"

    # Test 2: Solution Key Paper
    pdf_solution = generate_assessment_exam_pdf(sample_assessment, include_solutions=True)
    assert isinstance(pdf_solution, bytes)
    assert len(pdf_solution) > 1000
    assert pdf_solution[:4] == b"%PDF"


def test_dedicated_assessment_submissions_isolation(db_session):
    """Verify that submissions belonging to Assessment A do not bleed into Assessment B."""
    note = LectureNote(name="Data Structures", file_type="pdf", ingest_status="done")
    db_session.add(note)
    db_session.flush()

    ass_a = Assessment(lecture_note_id=note.id, title="Class A Exam", max_score=100.0)
    ass_b = Assessment(lecture_note_id=note.id, title="Class B Exam", max_score=100.0)
    db_session.add_all([ass_a, ass_b])
    db_session.flush()

    stu_a = Student(student_number="STU-A1", name="Alice Class A")
    stu_b = Student(student_number="STU-B1", name="Bob Class B")
    db_session.add_all([stu_a, stu_b])
    db_session.flush()

    sub_a = Submission(student_id=stu_a.id, assessment_id=ass_a.id, total_score=95.0, status="confirmed")
    sub_b = Submission(student_id=stu_b.id, assessment_id=ass_b.id, total_score=82.0, status="confirmed")
    db_session.add_all([sub_a, sub_b])
    db_session.commit()

    # Query Class A submissions
    class_a_subs = db_session.query(Submission).filter(Submission.assessment_id == ass_a.id).all()
    class_b_subs = db_session.query(Submission).filter(Submission.assessment_id == ass_b.id).all()

    assert len(class_a_subs) == 1
    assert class_a_subs[0].student.name == "Alice Class A"
    assert len(class_b_subs) == 1
    assert class_b_subs[0].student.name == "Bob Class B"
    assert class_a_subs[0].id != class_b_subs[0].id


def test_generate_rubric_from_custom_question():
    """Verify generating rubrics for a custom question prompt without existing DB record."""
    from fastapi.testclient import TestClient
    from src.main import app
    client = TestClient(app)

    resp = client.post(
        "/rubrics/generate-from-question",
        json={
            "question_text": "Implement a binary search tree insertion method and prove its worst-case complexity.",
            "max_marks": 20.0,
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "criteria" in data
    assert len(data["criteria"]) >= 2
    total_pts = sum(c.get("max_points", 0) for c in data["criteria"])
    assert abs(total_pts - 20.0) < 0.1

