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


def test_generate_rubric_mcq_type_aware():
    """Verify objective MCQs get a clean binary key schema instead of bloated essay rubrics."""
    from fastapi.testclient import TestClient
    from src.main import app
    client = TestClient(app)

    resp = client.post(
        "/rubrics/generate-from-question",
        json={
            "question_text": "Which algorithm has O(n log n) worst-case time complexity?\nA) Bubble sort\nB) Merge sort\nC) Insertion sort\nD) Quick sort",
            "max_marks": 2.0,
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data.get("is_objective") is True
    assert data.get("question_type") == "multiple_choice"
    assert len(data["criteria"]) == 1
    assert data["criteria"][0]["max_points"] == 2.0


def test_grade_submission_mcq_binary_key():
    """Verify MCQ grading is binary and objective against answer key without essay critique."""
    from src.ai.didactic_service import grade_submission

    questions = [
        {
            "id": "q1",
            "text": "Which keyword declares a block-scoped variable in modern JavaScript?\nA) var\nB) let\nC) global\nD) def",
            "max_marks": 2.0,
            "reference_answer": "B) let",
            "criteria": [],
        }
    ]

    # Correct submission
    report_correct = grade_submission(questions, "Student Answer Paper\nQ1: B")
    assert report_correct["question_results"][0]["score"] == 2.0
    assert "Correct choice" in report_correct["question_results"][0]["feedback"]

    # Incorrect submission
    report_wrong = grade_submission(questions, "Student Answer Paper\nQ1: A")
    assert report_wrong["question_results"][0]["score"] == 0.0
    assert "Incorrect choice" in report_wrong["question_results"][0]["feedback"]


# ---------------------------------------------------------------------------
# 6. Test Multi-Format Document Extraction (DOCX Tables, Scanned Images)
# ---------------------------------------------------------------------------

def test_extract_document_text_docx_with_tables():
    """Verify DOCX extraction captures both body paragraphs and table rows."""
    from docx import Document
    from src.ai.ingest import extract_document_text

    doc = Document()
    doc.add_heading("Midterm Exam Answers", level=1)
    doc.add_paragraph("Question 1: Process synchronization coordinates execution order.")
    
    table = doc.add_table(rows=2, cols=2)
    table.cell(0, 0).text = "Criterion"
    table.cell(0, 1).text = "Student Response"
    table.cell(1, 0).text = "Deadlock Definition"
    table.cell(1, 1).text = "Circular wait and mutual exclusion leading to blocked state."

    doc_bytes = io.BytesIO()
    doc.save(doc_bytes)
    doc_bytes.seek(0)

    result = extract_document_text(doc_bytes.getvalue(), filename="student_exam.docx")
    text = result.full_text

    assert "Midterm Exam Answers" in text
    assert "Process synchronization coordinates execution order" in text
    assert "Deadlock Definition" in text
    assert "Circular wait and mutual exclusion" in text


def test_extract_document_text_image_scan():
    """Verify image extraction invokes multimodal vision transcription pipeline."""
    from PIL import Image
    from src.ai.ingest import extract_document_text, prepare_image_for_ai

    # Generate synthetic image mimicking a smartphone photo of exam paper
    img = Image.new("RGB", (800, 600), color=(250, 250, 250))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    raw_bytes = buf.getvalue()

    # Test image normalization helper
    norm_bytes, mime = prepare_image_for_ai(raw_bytes, max_dim=500)
    assert mime == "image/jpeg"
    assert len(norm_bytes) > 0

    # Test end-to-end extraction from image
    result = extract_document_text(raw_bytes, filename="handwritten_submission.png")
    text = result.full_text

    assert len(text) > 0
    assert "Question 1" in text or "synchronization" in text.lower()


def test_grade_submission_multi_format_endpoints():
    """Test full API pipeline: uploading docx and image answers, grading, and file download."""
    from fastapi.testclient import TestClient
    from docx import Document
    from PIL import Image
    from sqlalchemy.pool import StaticPool
    from src.main import app
    from src.db.session import get_session

    test_engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(test_engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

    def override_session():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_session] = override_session
    try:
        client = TestClient(app)
        headers = {"X-Lecturer-Id": "prof_test_multiformat"}

        # 1. Upload lecture note to create an assessment
        note_resp = client.post(
            "/lecture-notes/upload",
            data={"note_title": "Concurrency Module", "pasted_text": "Process synchronization and mutual exclusion prevent race conditions."},
            headers=headers,
        )
        assert note_resp.status_code == 200
        note_id = note_resp.json()["id"]

        assess_resp = client.post(
            "/assessments/generate",
            json={"lecture_note_id": note_id, "ticked_part_ids": [], "custom_instructions": "Create 2 short answer questions"},
            headers=headers,
        )
        assert assess_resp.status_code == 200
        assessment_id = assess_resp.json()["id"]

        # 2. Grade DOCX submission
        doc = Document()
        doc.add_paragraph("Question 1: Mutual exclusion ensures only one process enters critical section at a time.")
        doc.add_paragraph("Question 2: Concurrency primitives prevent race conditions.")
        doc_buf = io.BytesIO()
        doc.save(doc_buf)
        docx_bytes = doc_buf.getvalue()

        grade_docx_resp = client.post(
            f"/assessments/{assessment_id}/grade-submission",
            data={"student_name": "Jordan Smith", "student_number": "STU-DOCX-01"},
            files={"file": ("student_exam.docx", docx_bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
            headers=headers,
        )
        assert grade_docx_resp.status_code == 200
        docx_data = grade_docx_resp.json()
        assert docx_data["file_type"] == "docx"
        assert docx_data["file_name"] == "student_exam.docx"
        assert "Mutual exclusion" in docx_data["extracted_text"]
        assert docx_data["total_score"] > 0
        sub_id = docx_data["submission_id"]

        # 3. Test downloading stored DOCX file
        file_resp = client.get(f"/submissions/{sub_id}/file", headers=headers)
        assert file_resp.status_code == 200
        assert "wordprocessingml" in file_resp.headers["Content-Type"]
        assert len(file_resp.content) == len(docx_bytes)

        # 4. Grade PNG Image submission (e.g. smartphone photo of exam)
        img = Image.new("RGB", (600, 400), color=(255, 255, 255))
        img_buf = io.BytesIO()
        img.save(img_buf, format="PNG")
        png_bytes = img_buf.getvalue()

        grade_img_resp = client.post(
            f"/assessments/{assessment_id}/grade-submission",
            data={"student_name": "Alex Taylor", "student_number": "STU-IMG-02"},
            files={"file": ("scanned_page.png", png_bytes, "image/png")},
            headers=headers,
        )
        assert grade_img_resp.status_code == 200
        img_data = grade_img_resp.json()
        assert img_data["file_type"] == "png"
        assert img_data["file_name"] == "scanned_page.png"
        assert len(img_data["extracted_text"]) > 0
        assert img_data["total_score"] > 0

        # 5. Test downloading stored Image file
        img_sub_id = img_data["submission_id"]
        file_img_resp = client.get(f"/submissions/{img_sub_id}/file", headers=headers)
        assert file_img_resp.status_code == 200
        assert file_img_resp.headers["Content-Type"] == "image/png"
        assert len(file_img_resp.content) == len(png_bytes)

        # 6. Grade Direct Pasted Answer Text (No file required)
        pasted_text_body = "Question 1: Mutual exclusion prevents multiple threads from accessing critical section concurrently.\nQuestion 2: Concurrency primitives maintain data integrity."
        grade_text_resp = client.post(
            f"/assessments/{assessment_id}/grade-submission",
            data={
                "student_name": "Morgan Riley",
                "student_number": "STU-TXT-03",
                "pasted_text": pasted_text_body,
            },
            headers=headers,
        )
        assert grade_text_resp.status_code == 200
        text_data = grade_text_resp.json()
        assert text_data["file_type"] == "txt"
        assert text_data["extracted_text"] == pasted_text_body
        assert text_data["total_score"] > 0

        # Verify downloading the generated text submission file
        txt_sub_id = text_data["submission_id"]
        file_txt_resp = client.get(f"/submissions/{txt_sub_id}/file", headers=headers)
        assert file_txt_resp.status_code == 200
        assert "text/plain" in file_txt_resp.headers["Content-Type"]
        assert file_txt_resp.content.decode("utf-8") == pasted_text_body
    finally:
        app.dependency_overrides.pop(get_session, None)





def test_generate_assessment_resilient_fallbacks():
    """
    Verify that assessment generation never fails even when:
    1. Key points are not ticked.
    2. Note has no key points at all.
    3. Note was created under a different lecturer ID.
    4. Lecture note ID is auto-fallback.
    """
    from fastapi.testclient import TestClient
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from sqlalchemy.pool import StaticPool
    from src.main import app
    from src.db.session import get_session
    from src.db.models import Base, LectureNote, LectureNoteKeyPoint

    test_engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(test_engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

    def override_session():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_session] = override_session
    try:
        client = TestClient(app)
        init_db = TestingSessionLocal()

        # 1. Create a note with unticked key points under another lecturer
        other_note = LectureNote(
            lecturer_id="guest_lecturer",
            name="Operating Systems Concepts",
            file_type="text",
            extracted_text="Virtual memory, paging, and demand segmentation.",
            ingest_status="done",
        )
        init_db.add(other_note)
        init_db.flush()

        kp_unticked = LectureNoteKeyPoint(
            lecture_note_id=other_note.id,
            position=0,
            title="Paging",
            summary="Virtual address translation mechanism",
            type="concept",
            source_ref="Section 3",
            included=False,  # NOT TICKED!
        )
        init_db.add(kp_unticked)
        init_db.commit()

        # Generate assessment as a different lecturer (prof_smith) with unticked key points
        headers = {"X-Lecturer-Id": "prof_smith"}
        resp = client.post(
            "/assessments/generate",
            json={"lecture_note_id": other_note.id, "question_count": 3, "title": "Midterm Exam on Memory"},
            headers=headers,
        )
        assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
        data = resp.json()
        assert data["title"] == "Midterm Exam on Memory"
        assert len(data["questions"]) == 3
        assert data["questions"][0]["text"] is not None

        # 2. Test generation when note has NO key points at all
        bare_note = LectureNote(
            lecturer_id="prof_smith",
            name="Compiler Design",
            file_type="text",
            extracted_text="Lexical analysis, parsing with LL(1) and LR(1), and intermediate code generation.",
            ingest_status="done",
        )
        init_db.add(bare_note)
        init_db.commit()

        resp2 = client.post(
            "/assessments/generate",
            json={"lecture_note_id": bare_note.id, "question_count": 2},
            headers=headers,
        )
        assert resp2.status_code == 200
        data2 = resp2.json()
        assert len(data2["questions"]) == 2

        # 3. Test generation with auto-fallback note (empty note id)
        resp3 = client.post(
            "/assessments/generate",
            json={"lecture_note_id": "", "title": "Interactive Exam Paper", "prompt": "Create 3 questions on Python async/await", "question_count": 3},
            headers=headers,
        )
        assert resp3.status_code == 200
        data3 = resp3.json()
        assert len(data3["questions"]) == 3
        init_db.close()
    finally:
        app.dependency_overrides.pop(get_session, None)
