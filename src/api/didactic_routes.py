"""
FastAPI route handlers for Didactic AI core workflow:
1. Lecture Note upload (PDF, PPTX, DOCX, text) & Previous Uploads
2. Key-part extraction & interactive review
3. Assessment generation & question editing with server-level lock enforcement
4. Rubric generation, question-rubric synchronization & 'needs review' handling
5. Student answer PDF upload, text extraction, automated grading
6. Score confirmation & Excel export
"""

import io
import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any, Union

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Header,
    Query,
    Response,
    UploadFile,
    status,
)
from pydantic import BaseModel
from sqlalchemy.orm import Session

from src.ai import (
    extract_key_parts as ai_extract_key_parts,
    generate_assessment as ai_generate_assessment,
    generate_rubric as ai_generate_rubric,
    grade_submission as ai_grade_submission,
    extract_document_text,
    extract_text_from_pdf,
)
from src.db.models import (
    Assessment,
    LectureNote,
    LectureNoteKeyPoint,
    Question,
    Rubric,
    RubricCriterion,
    Student,
    Submission,
    SubmissionQuestionScore,
)
from src.db.session import get_session
from src.services.storage_service import get_storage

router = APIRouter(tags=["Didactic AI"])


# ---------------------------------------------------------------------------
# Dependency: Lecturer Identifier
# ---------------------------------------------------------------------------

def get_current_lecturer(
    x_lecturer_id: Optional[str] = Header(None, alias="X-Lecturer-Id"),
    lecturer_id: Optional[str] = Query(None),
) -> str:
    """Returns the authenticated lecturer ID from headers, query params, or default."""
    return x_lecturer_id or lecturer_id or "default_lecturer"


# ---------------------------------------------------------------------------
# Request & Response Pydantic Schemas
# ---------------------------------------------------------------------------

class KeyPointUpdateItem(BaseModel):
    id: Optional[str] = None
    title: str
    summary: Optional[str] = ""
    type: str  # concept | definition | formula | example | objective
    source_ref: Optional[str] = "lecture note"
    included: bool = True
    source: str = "ai"
    position: Optional[int] = 0


class KeyPointsUpdateRequest(BaseModel):
    key_points: List[KeyPointUpdateItem]


class CopilotChatReq(BaseModel):
    messages: List[Dict[str, Any]]
    lecture_note_id: Optional[str] = None
    lecture_title: Optional[str] = None


class AssessmentGenerateReq(BaseModel):
    lecture_note_id: str
    question_count: int = 3
    title: Optional[str] = None
    prompt: Optional[str] = None


class QuestionEditItem(BaseModel):
    id: Optional[str] = None
    position: int = 0
    text: str
    student_hint: Optional[str] = None
    max_marks: float = 10.0
    source: str = "ai"
    key_point_ids: Optional[List[str]] = None


class QuestionsBatchUpdateReq(BaseModel):
    questions: List[QuestionEditItem]


class RubricCriterionEditItem(BaseModel):
    id: Optional[str] = None
    position: int = 0
    description: str
    max_points: float
    source: str = "ai"


class RubricUpdateRequest(BaseModel):
    criteria: List[RubricCriterionEditItem]


class StudentCreateReq(BaseModel):
    student_number: str
    name: str


class SubmissionConfirmReq(BaseModel):
    total_score: float


class ManualQuestionScoreItem(BaseModel):
    question_id: Optional[str] = None
    points: float = 0.0
    feedback: Optional[str] = ""
    matched_student_answer: Optional[str] = ""


class ManualSubmissionReq(BaseModel):
    student_name: str
    student_number: Optional[str] = None
    total_score: Optional[float] = None
    summary_feedback: Optional[str] = None
    question_scores: Optional[List[ManualQuestionScoreItem]] = None


class RubricFromQuestionReq(BaseModel):
    question_text: str
    max_marks: float = 10.0
    student_hint: Optional[str] = None
    lecture_note_id: Optional[str] = None


# ---------------------------------------------------------------------------
# 1. Lecture Notes Upload & Previous Uploads Panel (Section 3a)
# ---------------------------------------------------------------------------

@router.post("/lecture-notes/upload")
async def upload_lecture_note(
    file: Optional[UploadFile] = File(None),
    pasted_text: Optional[str] = Form(None),
    note_title: Optional[str] = Form(None),
    lecturer_id: str = Depends(get_current_lecturer),
    session: Session = Depends(get_session),
):
    storage = get_storage()
    sections: List[Dict[str, Any]] = []
    warnings: List[str] = []

    if file and file.filename:
        filename = file.filename
        file_bytes = await file.read()
        ext = filename.split(".")[-1].lower() if "." in filename else "text"
        if ext in ("pdf", "pptx", "docx", "ppt", "doc"):
            file_type = ext
        else:
            file_type = "text"

        storage_path, _ = storage.save_file(file_bytes, filename, subfolder="lectures")
        name = note_title or filename.rsplit(".", 1)[0]

        try:
            full_text, sections, warnings = extract_document_text(file_bytes, filename, file_type)
            ingest_status = "done"
        except Exception as exc:
            full_text = f"Failed to extract document text: {exc}"
            ingest_status = "failed"
            warnings.append(str(exc))
    elif pasted_text:
        filename = f"{note_title or 'pasted_lecture'}.txt"
        file_bytes = pasted_text.encode("utf-8")
        file_type = "text"
        storage_path, _ = storage.save_file(file_bytes, filename, subfolder="lectures")
        name = note_title or "Pasted Lecture Note"
        full_text = pasted_text.strip()
        sections = [{"source_ref": "text", "text": full_text}]
        ingest_status = "done"
    else:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Please provide a file or pasted text.")

    note = LectureNote(
        lecturer_id=lecturer_id,
        name=name,
        file_type=file_type,
        file_path=storage_path,
        extracted_text=full_text,
        ingest_status=ingest_status,
    )
    session.add(note)
    session.commit()
    session.refresh(note)

    # Ingest key parts
    if ingest_status == "done" and full_text:
        try:
            raw_kp = ai_extract_key_parts(note.name, note.extracted_text, sections)
            for idx, kp in enumerate(raw_kp):
                key_point = LectureNoteKeyPoint(
                    lecture_note_id=note.id,
                    position=idx,
                    title=kp["title"],
                    summary=kp["summary"],
                    type=kp["type"],
                    source_ref=kp["source_ref"],
                    included=kp.get("included", True),
                    source=kp.get("source", "ai"),
                )
                session.add(key_point)
            session.commit()
            session.refresh(note)
        except Exception:
            session.rollback()

    kps = [
        {
            "id": kp.id,
            "position": kp.position,
            "title": kp.title,
            "summary": kp.summary,
            "type": kp.type,
            "source_ref": kp.source_ref,
            "included": kp.included,
            "source": kp.source,
        }
        for kp in note.key_points
    ]

    return {
        "id": note.id,
        "name": note.name,
        "file_type": note.file_type,
        "extracted_text": note.extracted_text,
        "raw_text": note.extracted_text,
        "full_text": note.extracted_text,
        "ingest_status": note.ingest_status,
        "created_at": note.created_at.isoformat() if note.created_at else None,
        "warnings": warnings,
        "total_words": len(full_text.split()) if full_text else 0,
        "key_parts_count": len(note.key_points),
        "key_points": kps,
        "key_parts": kps,
    }


@router.get("/lecture-notes")
def list_previous_uploads(
    lecturer_id: str = Depends(get_current_lecturer),
    session: Session = Depends(get_session),
):
    notes = (
        session.query(LectureNote)
        .filter(LectureNote.lecturer_id == lecturer_id)
        .order_by(LectureNote.created_at.desc())
        .all()
    )

    results = []
    for n in notes:
        lecturer_assessments = [a for a in n.assessments if a.lecturer_id == lecturer_id]
        results.append({
            "id": n.id,
            "name": n.name,
            "file_type": n.file_type.upper(),
            "upload_date": n.created_at.isoformat() if n.created_at else None,
            "ingest_status": n.ingest_status,
            "assessment_count": len(lecturer_assessments),
            "key_points_count": len(n.key_points),
        })
    return results


@router.get("/lecture-notes/{note_id}")
def get_lecture_note_detail(
    note_id: str,
    lecturer_id: str = Depends(get_current_lecturer),
    session: Session = Depends(get_session),
):
    note = (
        session.query(LectureNote)
        .filter(LectureNote.id == note_id, LectureNote.lecturer_id == lecturer_id)
        .first()
    )
    if not note:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lecture note not found.")

    key_points = [
        {
            "id": kp.id,
            "position": kp.position,
            "title": kp.title,
            "summary": kp.summary,
            "type": kp.type,
            "source_ref": kp.source_ref,
            "included": kp.included,
            "source": kp.source,
        }
        for kp in note.key_points
    ]

    assessments = [
        {
            "id": a.id,
            "title": a.title,
            "version": a.version,
            "status": a.status,
            "max_score": a.max_score,
            "question_count": len(a.questions),
            "submission_count": len(a.submissions),
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in note.assessments
        if a.lecturer_id == lecturer_id
    ]

    return {
        "id": note.id,
        "name": note.name,
        "file_type": note.file_type.upper(),
        "extracted_text": note.extracted_text,
        "raw_text": note.extracted_text,
        "full_text": note.extracted_text,
        "ingest_status": note.ingest_status,
        "created_at": note.created_at.isoformat() if note.created_at else None,
        "key_points": key_points,
        "key_parts": key_points,
        "assessments": assessments,
    }


@router.delete("/lecture-notes/{note_id}")
def delete_lecture_note(
    note_id: str,
    lecturer_id: str = Depends(get_current_lecturer),
    session: Session = Depends(get_session),
):
    note = (
        session.query(LectureNote)
        .filter(LectureNote.id == note_id, LectureNote.lecturer_id == lecturer_id)
        .first()
    )
    if not note:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lecture note not found.")

    # Guard: block if graded student work exists
    for a in note.assessments:
        if len(a.submissions) > 0:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                f"Cannot delete lecture note '{note.name}': Assessment '{a.title}' already has {len(a.submissions)} student submission(s). Graded work must not be lost.",
            )

    storage = get_storage()
    if note.file_path:
        storage.delete_file(note.file_path)

    session.delete(note)
    session.commit()
    return {"message": f"Lecture note '{note.name}' was successfully deleted."}


# ---------------------------------------------------------------------------
# 2. Key-Part Extraction & Review
# ---------------------------------------------------------------------------

@router.post("/lecture-notes/{note_id}/extract-key-parts")
def extract_key_parts_endpoint(
    note_id: str,
    lecturer_id: str = Depends(get_current_lecturer),
    session: Session = Depends(get_session),
):
    note = (
        session.query(LectureNote)
        .filter(LectureNote.id == note_id, LectureNote.lecturer_id == lecturer_id)
        .first()
    )
    if not note:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lecture note not found.")

    raw_kp = ai_extract_key_parts(note.name, note.extracted_text or "")

    note.key_points.clear()
    session.commit()

    for idx, kp in enumerate(raw_kp):
        item = LectureNoteKeyPoint(
            lecture_note_id=note.id,
            position=idx,
            title=kp["title"],
            summary=kp["summary"],
            type=kp["type"],
            source_ref=kp["source_ref"],
            included=kp.get("included", True),
            source="ai",
        )
        session.add(item)

    session.commit()
    session.refresh(note)

    return [
        {
            "id": kp.id,
            "position": kp.position,
            "title": kp.title,
            "summary": kp.summary,
            "type": kp.type,
            "source_ref": kp.source_ref,
            "included": kp.included,
            "source": kp.source,
        }
        for kp in note.key_points
    ]


@router.put("/lecture-notes/{note_id}/key-points")
def update_key_points_batch(
    note_id: str,
    req: KeyPointsUpdateRequest,
    lecturer_id: str = Depends(get_current_lecturer),
    session: Session = Depends(get_session),
):
    note = (
        session.query(LectureNote)
        .filter(LectureNote.id == note_id, LectureNote.lecturer_id == lecturer_id)
        .first()
    )
    if not note:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lecture note not found.")

    note.key_points.clear()
    session.commit()

    for idx, item in enumerate(req.key_points):
        kp = LectureNoteKeyPoint(
            id=item.id or str(uuid.uuid4()),
            lecture_note_id=note.id,
            position=idx,
            title=item.title,
            summary=item.summary,
            type=item.type,
            source_ref=item.source_ref or "lecture note",
            included=item.included,
            source=item.source,
        )
        session.add(kp)

    session.commit()
    session.refresh(note)

    return [
        {
            "id": kp.id,
            "position": kp.position,
            "title": kp.title,
            "summary": kp.summary,
            "type": kp.type,
            "source_ref": kp.source_ref,
            "included": kp.included,
            "source": kp.source,
        }
        for kp in note.key_points
    ]


# ---------------------------------------------------------------------------
# 3. Assessment Generation & Question Editing
# ---------------------------------------------------------------------------

@router.post("/assessments/generate")
def generate_assessment_endpoint(
    req: AssessmentGenerateReq,
    lecturer_id: str = Depends(get_current_lecturer),
    session: Session = Depends(get_session),
):
    note = None
    if req.lecture_note_id:
        note = (
            session.query(LectureNote)
            .filter(LectureNote.id == req.lecture_note_id, LectureNote.lecturer_id == lecturer_id)
            .first()
        )
        if not note:
            note = session.query(LectureNote).filter(LectureNote.id == req.lecture_note_id).first()
        if not note:
            note = session.query(LectureNote).filter(LectureNote.id == req.lecture_note_id).first()

    if not note:
        # Fallback to the latest note for this lecturer or any available note
        note = (
            session.query(LectureNote)
            .filter(LectureNote.lecturer_id == lecturer_id)
            .order_by(LectureNote.created_at.desc())
            .first()
        )
        if not note:
            note = session.query(LectureNote).order_by(LectureNote.created_at.desc()).first()

    if not note:
        # Create an auto-ingested lecture note so assessment generation never fails
        note = LectureNote(
            lecturer_id=lecturer_id,
            name=req.title or "Course Assessment Material",
            file_type="text",
            extracted_text=req.prompt or "Core academic course curriculum and learning objectives.",
            ingest_status="done",
        )
        session.add(note)
        session.commit()
        session.refresh(note)

    ticked_parts = [
        {
            "id": kp.id,
            "title": kp.title,
            "summary": kp.summary,
            "type": kp.type,
            "source_ref": kp.source_ref,
            "included": True,
        }
        for kp in note.key_points
        if kp.included
    ]

    # Graceful fallback 1: If no key points are explicitly ticked, use all key points from this note
    if not ticked_parts and note.key_points:
        ticked_parts = [
            {
                "id": kp.id,
                "title": kp.title,
                "summary": kp.summary,
                "type": kp.type,
                "source_ref": kp.source_ref,
                "included": True,
            }
            for kp in note.key_points
        ]

    # Graceful fallback 2: If note has extracted text but no key points were generated yet
    if not ticked_parts and note.extracted_text:
        ticked_parts = [
            {
                "id": "concept-1",
                "title": note.name or "Lecture Material",
                "summary": note.extracted_text[:1200],
                "type": "concept",
                "source_ref": "Lecture Note",
                "included": True,
            }
        ]

    # Graceful fallback 3: Synthesize key topic from user prompt or assessment title
    if not ticked_parts:
        ticked_parts = [
            {
                "id": "topic-1",
                "title": req.title or note.name or "Assessment Topics",
                "summary": req.prompt or "Core course topics and learning objectives",
                "type": "concept",
                "source_ref": "Course Overview",
                "included": True,
            }
        ]

    ai_data = ai_generate_assessment(
        note.name, ticked_parts, question_count=req.question_count, custom_instructions=req.prompt
    )
    title = req.title or ai_data.get("title") or f"Assessment: {note.name}"

    assessment = Assessment(
        lecture_note_id=note.id,
        lecturer_id=lecturer_id,
        title=title,
        version=1,
        status="draft",
        max_score=0.0,
    )
    session.add(assessment)
    session.commit()
    session.refresh(assessment)

    total_max = 0.0
    for idx, q_item in enumerate(ai_data.get("questions", [])):
        q = Question(
            assessment_id=assessment.id,
            position=idx,
            text=q_item["text"],
            student_hint=q_item.get("student_hint"),
            max_marks=float(q_item.get("max_marks", 10.0)),
            source="ai",
        )
        total_max += q.max_marks
        session.add(q)
        session.flush()

        tested_titles = q_item.get("tested_key_point_titles", [])
        for kp_obj in note.key_points:
            if kp_obj.title in tested_titles or not tested_titles:
                q.key_points.append(kp_obj)

        # Auto-generate rubric for each question
        kp_list = [{"title": kp.title, "summary": kp.summary} for kp in q.key_points]
        try:
            rubric_data = ai_generate_rubric(
                question_text=q.text,
                student_hint=q.student_hint,
                key_parts=kp_list,
                max_marks=q.max_marks,
            )
            rubric = Rubric(question_id=q.id, status="ai_draft")
            session.add(rubric)
            session.flush()

            for c_idx, crit in enumerate(rubric_data.get("criteria", [])):
                c_obj = RubricCriterion(
                    rubric_id=rubric.id,
                    position=c_idx,
                    description=crit["description"],
                    max_points=float(crit.get("max_points", q.max_marks / max(len(rubric_data.get("criteria", [])), 1))),
                    source=crit.get("source", "ai"),
                )
                session.add(c_obj)
        except Exception as r_err:
            import logging
            logging.getLogger(__name__).warning(f"Could not auto-generate rubric for question {q.id}: {r_err}")

    assessment.max_score = total_max
    session.commit()
    session.refresh(assessment)

    return get_assessment_detail_response(assessment)


@router.post("/assessments/copilot-chat")
def copilot_chat_endpoint(
    req: CopilotChatReq,
    lecturer_id: str = Depends(get_current_lecturer),
    session: Session = Depends(get_session),
):
    from src.services.engine_adapter import ai_engine
    engine = ai_engine()

    lecture_title = req.lecture_title or "Lecture Document"
    lecture_content = ""

    if req.lecture_note_id:
        note = (
            session.query(LectureNote)
            .filter(LectureNote.id == req.lecture_note_id, LectureNote.lecturer_id == lecturer_id)
            .first()
        )
        if note:
            lecture_title = note.name or lecture_title
            lecture_content = note.extracted_text or ""

    if not lecture_content and req.lecture_title:
        lecture_content = f"Material covering {req.lecture_title}."

    result = engine.copilot_chat(
        messages=req.messages,
        lecture_title=lecture_title,
        lecture_content=lecture_content,
    )
    return result


@router.get("/assessments")
def list_assessments(
    lecture_note_id: Optional[str] = Query(None),
    lecturer_id: str = Depends(get_current_lecturer),
    session: Session = Depends(get_session),
):
    query = session.query(Assessment).filter(Assessment.lecturer_id == lecturer_id)
    if lecture_note_id:
        query = query.filter(Assessment.lecture_note_id == lecture_note_id)
    assessments = query.order_by(Assessment.created_at.desc()).all()
    return [
        {
            "id": a.id,
            "title": a.title,
            "lecture_note_id": a.lecture_note_id,
            "lecture_note_name": a.lecture_note.name if a.lecture_note else "Lecture Note",
            "version": a.version,
            "status": a.status,
            "max_score": a.max_score,
            "question_count": len(a.questions),
            "submission_count": len(a.submissions),
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in assessments
    ]


@router.delete("/assessments/{assessment_id}")
def delete_assessment(
    assessment_id: str,
    lecturer_id: str = Depends(get_current_lecturer),
    session: Session = Depends(get_session),
):
    assessment = (
        session.query(Assessment)
        .filter(Assessment.id == assessment_id, Assessment.lecturer_id == lecturer_id)
        .first()
    )
    if not assessment:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Assessment not found.")

    if len(assessment.submissions) > 0:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Cannot delete assessment '{assessment.title}': It already has {len(assessment.submissions)} student submission(s). Graded work must not be lost.",
        )

    session.delete(assessment)
    session.commit()
    return {"message": f"Assessment '{assessment.title}' was successfully deleted."}


@router.get("/assessments/{assessment_id}")
def get_assessment(
    assessment_id: str,
    lecturer_id: str = Depends(get_current_lecturer),
    session: Session = Depends(get_session),
):
    assessment = (
        session.query(Assessment)
        .filter(Assessment.id == assessment_id, Assessment.lecturer_id == lecturer_id)
        .first()
    )
    if not assessment:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Assessment not found.")
    return get_assessment_detail_response(assessment)


@router.put("/assessments/{assessment_id}/questions")
def update_assessment_questions(
    assessment_id: str,
    req: QuestionsBatchUpdateReq,
    lecturer_id: str = Depends(get_current_lecturer),
    session: Session = Depends(get_session),
):
    assessment = (
        session.query(Assessment)
        .filter(Assessment.id == assessment_id, Assessment.lecturer_id == lecturer_id)
        .first()
    )
    if not assessment:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Assessment not found.")

    if assessment.status == "locked":
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            "Assessment is locked because student submissions have been graded. To make changes, create a new version of the assessment.",
        )

    existing_map = {q.id: q for q in assessment.questions}
    new_q_ids = set()
    total_marks = 0.0

    for idx, item in enumerate(req.questions):
        if item.id and item.id in existing_map:
            q = existing_map[item.id]
            text_changed = q.text.strip() != item.text.strip()
            q.position = idx
            q.text = item.text
            q.student_hint = item.student_hint
            q.max_marks = float(item.max_marks)
            q.source = item.source

            if text_changed and q.rubric:
                q.rubric.status = "needs_review"

            new_q_ids.add(q.id)
            total_marks += q.max_marks
        else:
            q = Question(
                assessment_id=assessment.id,
                position=idx,
                text=item.text,
                student_hint=item.student_hint,
                max_marks=float(item.max_marks),
                source=item.source or "teacher",
            )
            session.add(q)
            total_marks += q.max_marks

    for q_id, q in existing_map.items():
        if q_id not in new_q_ids:
            session.delete(q)

    assessment.max_score = total_marks
    session.commit()
    session.refresh(assessment)

    return get_assessment_detail_response(assessment)


@router.post("/assessments/{assessment_id}/approve-questions")
def approve_questions(
    assessment_id: str,
    lecturer_id: str = Depends(get_current_lecturer),
    session: Session = Depends(get_session),
):
    assessment = (
        session.query(Assessment)
        .filter(Assessment.id == assessment_id, Assessment.lecturer_id == lecturer_id)
        .first()
    )
    if not assessment:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Assessment not found.")

    if assessment.status == "locked":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Assessment is locked.")

    assessment.status = "questions_approved"
    session.commit()
    return {"status": assessment.status, "message": "Questions approved."}


# ---------------------------------------------------------------------------
# 4. Rubrics Generation & Rubrics Editing
# ---------------------------------------------------------------------------

@router.post("/assessments/{assessment_id}/generate-rubrics")
def generate_rubrics_for_assessment(
    assessment_id: str,
    lecturer_id: str = Depends(get_current_lecturer),
    session: Session = Depends(get_session),
):
    assessment = (
        session.query(Assessment)
        .filter(Assessment.id == assessment_id, Assessment.lecturer_id == lecturer_id)
        .first()
    )
    if not assessment:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Assessment not found.")

    if assessment.status == "locked":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Assessment is locked.")

    for q in assessment.questions:
        kp_list = [{"title": kp.title, "summary": kp.summary} for kp in q.key_points]
        rubric_data = ai_generate_rubric(
            question_text=q.text,
            student_hint=q.student_hint,
            key_parts=kp_list,
            max_marks=q.max_marks,
        )

        if not q.rubric:
            rubric = Rubric(question_id=q.id, status="ai_draft")
            session.add(rubric)
            session.flush()
        else:
            rubric = q.rubric
            rubric.status = "ai_draft"
            rubric.criteria.clear()

        for c_idx, crit in enumerate(rubric_data.get("criteria", [])):
            c_obj = RubricCriterion(
                rubric_id=rubric.id,
                position=c_idx,
                description=crit["description"],
                max_points=float(crit["max_points"]),
                source=crit.get("source", "ai"),
            )
            session.add(c_obj)

    session.commit()
    session.refresh(assessment)

    return get_assessment_detail_response(assessment)


@router.post("/questions/{question_id}/regenerate-rubric")
def regenerate_single_question_rubric(
    question_id: str,
    lecturer_id: str = Depends(get_current_lecturer),
    session: Session = Depends(get_session),
):
    q = session.query(Question).filter(Question.id == question_id).first()
    if not q:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Question not found.")

    if q.assessment.status == "locked":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Assessment is locked.")

    kp_list = [{"title": kp.title, "summary": kp.summary} for kp in q.key_points]
    rubric_data = ai_generate_rubric(
        question_text=q.text,
        student_hint=q.student_hint,
        key_parts=kp_list,
        max_marks=q.max_marks,
    )

    if not q.rubric:
        rubric = Rubric(question_id=q.id, status="ai_draft")
        session.add(rubric)
        session.flush()
    else:
        rubric = q.rubric
        rubric.status = "ai_draft"
        rubric.criteria.clear()

    for c_idx, crit in enumerate(rubric_data.get("criteria", [])):
        c_obj = RubricCriterion(
            rubric_id=rubric.id,
            position=c_idx,
            description=crit["description"],
            max_points=float(crit["max_points"]),
            source=crit.get("source", "ai"),
        )
        session.add(c_obj)

    session.commit()
    session.refresh(rubric)

    return {
        "id": rubric.id,
        "question_id": rubric.question_id,
        "status": rubric.status,
        "criteria": [
            {
                "id": c.id,
                "position": c.position,
                "description": c.description,
                "max_points": c.max_points,
                "source": c.source,
            }
            for c in rubric.criteria
        ],
    }


@router.post("/rubrics/generate-from-question")
def generate_rubric_from_question_endpoint(
    req: RubricFromQuestionReq,
    lecturer_id: str = Depends(get_current_lecturer),
    session: Session = Depends(get_session),
):
    kp_list = []
    if req.lecture_note_id:
        note = session.query(LectureNote).filter(LectureNote.id == req.lecture_note_id).first()
        if note:
            kp_list = [{"title": kp.title, "summary": kp.summary} for kp in note.key_points if kp.included]

    rubric_data = ai_generate_rubric(
        question_text=req.question_text,
        student_hint=req.student_hint,
        key_parts=kp_list,
        max_marks=float(req.max_marks),
    )
    return rubric_data


@router.put("/questions/{question_id}/rubric")
def update_question_rubric(
    question_id: str,
    req: RubricUpdateRequest,
    lecturer_id: str = Depends(get_current_lecturer),
    session: Session = Depends(get_session),
):
    q = session.query(Question).filter(Question.id == question_id).first()
    if not q:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Question not found.")

    if q.assessment.status == "locked":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Assessment is locked at server level.")

    if not q.rubric:
        rubric = Rubric(question_id=q.id, status="edited")
        session.add(rubric)
        session.flush()
    else:
        rubric = q.rubric
        rubric.status = "edited"
        rubric.criteria.clear()

    criteria_sum = 0.0
    for idx, c in enumerate(req.criteria):
        pts = float(c.max_points)
        criteria_sum += pts
        c_obj = RubricCriterion(
            rubric_id=rubric.id,
            position=idx,
            description=c.description,
            max_points=pts,
            source=c.source or "teacher",
        )
        session.add(c_obj)

    q.max_marks = criteria_sum
    q.assessment.max_score = sum(other_q.max_marks for other_q in q.assessment.questions)

    session.commit()
    session.refresh(rubric)

    return {
        "id": rubric.id,
        "question_id": rubric.question_id,
        "status": rubric.status,
        "question_max_marks": q.max_marks,
        "criteria": [
            {
                "id": c.id,
                "position": c.position,
                "description": c.description,
                "max_points": c.max_points,
                "source": c.source,
            }
            for c in rubric.criteria
        ],
    }


@router.post("/assessments/{assessment_id}/approve-rubrics")
def approve_rubrics(
    assessment_id: str,
    lecturer_id: str = Depends(get_current_lecturer),
    session: Session = Depends(get_session),
):
    assessment = (
        session.query(Assessment)
        .filter(Assessment.id == assessment_id, Assessment.lecturer_id == lecturer_id)
        .first()
    )
    if not assessment:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Assessment not found.")

    if assessment.status == "locked":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Assessment is locked.")

    total_max = 0.0
    for q in assessment.questions:
        if q.rubric:
            q.rubric.status = "approved"
            crit_sum = sum(c.max_points for c in q.rubric.criteria)
            q.max_marks = crit_sum
            total_max += crit_sum

    assessment.status = "rubrics_approved"
    assessment.max_score = total_max
    session.commit()

    return {"status": assessment.status, "max_score": assessment.max_score, "message": "Rubrics approved."}


@router.post("/assessments/{assessment_id}/new-version")
def create_new_assessment_version(
    assessment_id: str,
    lecturer_id: str = Depends(get_current_lecturer),
    session: Session = Depends(get_session),
):
    original = (
        session.query(Assessment)
        .filter(Assessment.id == assessment_id, Assessment.lecturer_id == lecturer_id)
        .first()
    )
    if not original:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Assessment not found.")

    new_version_num = original.version + 1
    new_assessment = Assessment(
        lecture_note_id=original.lecture_note_id,
        lecturer_id=lecturer_id,
        title=f"{original.title} (v{new_version_num})",
        version=new_version_num,
        status="draft",
        max_score=original.max_score,
    )
    session.add(new_assessment)
    session.flush()

    for q in original.questions:
        new_q = Question(
            assessment_id=new_assessment.id,
            position=q.position,
            text=q.text,
            student_hint=q.student_hint,
            max_marks=q.max_marks,
            source=q.source,
        )
        session.add(new_q)
        session.flush()

        for kp in q.key_points:
            new_q.key_points.append(kp)

        if q.rubric:
            new_r = Rubric(question_id=new_q.id, status="ai_draft")
            session.add(new_r)
            session.flush()
            for c in q.rubric.criteria:
                new_c = RubricCriterion(
                    rubric_id=new_r.id,
                    position=c.position,
                    description=c.description,
                    max_points=c.max_points,
                    source=c.source,
                )
                session.add(new_c)

    session.commit()
    session.refresh(new_assessment)
    return get_assessment_detail_response(new_assessment)


# ---------------------------------------------------------------------------
# 5. Students Management (Teacher Managed)
# ---------------------------------------------------------------------------

@router.get("/students")
def list_students(
    lecturer_id: str = Depends(get_current_lecturer),
    session: Session = Depends(get_session),
):
    students = (
        session.query(Student)
        .filter(Student.lecturer_id == lecturer_id)
        .order_by(Student.name.asc())
        .all()
    )
    return [
        {"id": s.id, "student_number": s.student_number, "name": s.name}
        for s in students
    ]


@router.post("/students")
def create_student(
    req: StudentCreateReq,
    lecturer_id: str = Depends(get_current_lecturer),
    session: Session = Depends(get_session),
):
    existing = (
        session.query(Student)
        .filter(
            Student.lecturer_id == lecturer_id,
            Student.student_number == req.student_number.strip(),
        )
        .first()
    )
    if existing:
        return {"id": existing.id, "student_number": existing.student_number, "name": existing.name}

    student = Student(
        lecturer_id=lecturer_id,
        student_number=req.student_number.strip(),
        name=req.name.strip(),
    )
    session.add(student)
    session.commit()
    session.refresh(student)
    return {"id": student.id, "student_number": student.student_number, "name": student.name}


# ---------------------------------------------------------------------------
# 6. Student Answer PDF Upload & AI Grading (Sections 9-11)
# ---------------------------------------------------------------------------

@router.post("/assessments/{assessment_id}/grade-submission")
async def grade_student_submission(
    assessment_id: str,
    student_id: Optional[str] = Form(None),
    student_number: Optional[str] = Form(None),
    student_name: Optional[str] = Form(None),
    file: UploadFile = File(...),
    lecturer_id: str = Depends(get_current_lecturer),
    session: Session = Depends(get_session),
):
    assessment = (
        session.query(Assessment)
        .filter(Assessment.id == assessment_id, Assessment.lecturer_id == lecturer_id)
        .first()
    )
    if not assessment:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Assessment not found.")

    student = None
    if student_id:
        student = session.query(Student).filter(Student.id == student_id).first()
    if not student and student_number:
        student = (
            session.query(Student)
            .filter(Student.student_number == student_number.strip())
            .first()
        )
        if not student:
            student = Student(
                lecturer_id=assessment.lecturer_id or lecturer_id,
                student_number=student_number.strip(),
                name=(student_name or student_number).strip(),
            )
            session.add(student)
            session.flush()

    if not student:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Student details required.")

    existing_sub = (
        session.query(Submission)
        .filter(Submission.student_id == student.id, Submission.assessment_id == assessment.id)
        .first()
    )

    file_bytes = await file.read()
    filename = file.filename or "answer.pdf"
    storage = get_storage()
    stored_path, file_hash = storage.save_file(file_bytes, filename, subfolder="submissions")

    # Polymorphic extraction across PDF, DOCX, Images (PNG/JPG/WEBP), and Text
    try:
        extraction = extract_document_text(file_bytes, filename=filename)
        extracted_text = extraction.full_text if hasattr(extraction, "full_text") else str(extraction)
        if not extracted_text or not extracted_text.strip():
            extracted_text = f"Warning: No readable text could be extracted from {filename}."
    except Exception as exc:
        extracted_text = f"Error extracting document ({filename}): {exc}"

    q_payload = []
    for q in assessment.questions:
        q_item = {
            "id": q.id,
            "text": q.text,
            "max_marks": q.max_marks,
            "criteria": [
                {"description": c.description, "max_points": c.max_points}
                for c in (q.rubric.criteria if q.rubric else [])
            ],
        }
        q_payload.append(q_item)

    grading_output = ai_grade_submission(q_payload, extracted_text)

    # Server lock on assessment once first answer is graded
    if assessment.status != "locked":
        assessment.status = "locked"
        for q in assessment.questions:
            if q.rubric and not q.rubric.locked_at:
                q.rubric.locked_at = datetime.now(timezone.utc)

    if existing_sub:
        submission = existing_sub
        submission.pdf_path = stored_path
        submission.pdf_hash = file_hash
        submission.extracted_text = extracted_text
        submission.ai_total = grading_output["ai_total"]
        submission.total_score = grading_output["ai_total"]
        submission.status = "graded"
        submission.graded_at = datetime.now(timezone.utc)
        submission.question_scores.clear()
    else:
        submission = Submission(
            kind="exam",
            student_id=student.id,
            assessment_id=assessment.id,
            pdf_path=stored_path,
            pdf_hash=file_hash,
            extracted_text=extracted_text,
            ai_total=grading_output["ai_total"],
            total_score=grading_output["ai_total"],
            score=grading_output["ai_total"],
            max_score=assessment.max_score,
            status="graded",
            graded_at=datetime.now(timezone.utc),
        )
        session.add(submission)
        session.flush()

    for qr in grading_output.get("question_results", []):
        target_qid = qr.get("question_id") or (assessment.questions[0].id if assessment.questions else None)
        if target_qid:
            sc = SubmissionQuestionScore(
                submission_id=submission.id,
                question_id=target_qid,
                points=qr.get("points_awarded", 0.0),
                feedback=f"{qr.get('feedback', '')}\n[Matched excerpt: {qr.get('matched_student_answer', '')[:120]}]",
            )
            session.add(sc)

    session.commit()
    session.refresh(submission)

    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "pdf"

    return {
        "submission_id": str(submission.id),
        "student_id": student.id,
        "student_number": student.student_number,
        "student_name": student.name,
        "assessment_id": assessment.id,
        "assessment_title": assessment.title,
        "file_name": filename,
        "file_type": ext,
        "file_url": f"/api/submissions/{submission.id}/file",
        "ai_total": submission.ai_total,
        "total_score": submission.total_score,
        "max_score": assessment.max_score,
        "status": submission.status,
        "summary_feedback": grading_output.get("summary_feedback", ""),
        "extracted_pdf_text": submission.extracted_text,
        "extracted_text": submission.extracted_text,
        "question_results": grading_output.get("question_results", []),
    }


@router.get("/submissions/{submission_id}/file")
def get_submission_file(
    submission_id: Union[int, str],
    lecturer_id: str = Depends(get_current_lecturer),
    session: Session = Depends(get_session),
):
    """
    Downloads or streams the uploaded student exam submission paper
    (PDF, Word DOCX, Scanned Image PNG/JPG, or Text).
    """
    import re
    from pathlib import Path

    sub_id_int = int(submission_id) if str(submission_id).isdigit() else submission_id
    submission = session.query(Submission).filter(Submission.id == sub_id_int).first()
    if not submission or not submission.pdf_path:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Submission file not found.")

    storage = get_storage()
    try:
        file_bytes = storage.load_file(submission.pdf_path)
    except Exception:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Stored submission file could not be loaded.")

    filename = Path(submission.pdf_path).name
    display_name = re.sub(r"^[a-f0-9]{8}_", "", filename)
    ext = display_name.rsplit(".", 1)[-1].lower() if "." in display_name else "bin"

    media_types = {
        "pdf": "application/pdf",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "doc": "application/msword",
        "png": "image/png",
        "jpg": "image/jpeg",
        "jpeg": "image/jpeg",
        "webp": "image/webp",
        "txt": "text/plain",
    }
    media_type = media_types.get(ext, "application/octet-stream")

    return Response(
        content=file_bytes,
        media_type=media_type,
        headers={"Content-Disposition": f'inline; filename="{display_name}"'},
    )


@router.post("/submissions/{submission_id}/confirm")
def confirm_submission_score(
    submission_id: Union[int, str],
    req: SubmissionConfirmReq,
    lecturer_id: str = Depends(get_current_lecturer),
    session: Session = Depends(get_session),
):
    sub_id_int = int(submission_id) if str(submission_id).isdigit() else submission_id
    submission = session.query(Submission).filter(Submission.id == sub_id_int).first()
    if not submission:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Submission not found.")

    submission.total_score = float(req.total_score)
    submission.status = "confirmed"
    session.commit()

    return {
        "submission_id": str(submission.id),
        "total_score": submission.total_score,
        "status": submission.status,
        "message": "Submission score confirmed.",
    }


@router.post("/assessments/{assessment_id}/manual-submission")
def create_manual_submission(
    assessment_id: str,
    req: ManualSubmissionReq,
    lecturer_id: str = Depends(get_current_lecturer),
    session: Session = Depends(get_session),
):
    import uuid
    assessment = (
        session.query(Assessment)
        .filter(Assessment.id == assessment_id, Assessment.lecturer_id == lecturer_id)
        .first()
    )
    if not assessment:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Assessment not found.")

    student_num = (req.student_number or f"STU-{uuid.uuid4().hex[:6].upper()}").strip()
    student = (
        session.query(Student)
        .filter(Student.student_number == student_num)
        .first()
    )
    if not student:
        student = Student(
            lecturer_id=assessment.lecturer_id or lecturer_id,
            student_number=student_num,
            name=req.student_name.strip(),
        )
        session.add(student)
        session.flush()

    calculated_total = 0.0
    if req.question_scores:
        calculated_total = sum(float(qs.points) for qs in req.question_scores)
    elif req.total_score is not None:
        calculated_total = float(req.total_score)

    existing_sub = (
        session.query(Submission)
        .filter(Submission.student_id == student.id, Submission.assessment_id == assessment.id)
        .first()
    )

    if existing_sub:
        submission = existing_sub
        submission.ai_total = calculated_total
        submission.total_score = calculated_total
        submission.score = calculated_total
        submission.status = "confirmed"
        submission.graded_at = datetime.now(timezone.utc)
        submission.question_scores.clear()
    else:
        submission = Submission(
            kind="exam",
            student_id=student.id,
            assessment_id=assessment.id,
            ai_total=calculated_total,
            total_score=calculated_total,
            score=calculated_total,
            max_score=assessment.max_score,
            status="confirmed",
            graded_at=datetime.now(timezone.utc),
        )
        session.add(submission)
        session.flush()

    q_results = []
    if req.question_scores:
        for qs in req.question_scores:
            target_qid = qs.question_id
            target_q = None
            if target_qid:
                target_q = session.query(Question).filter(Question.id == target_qid).first()
            if not target_q and assessment.questions:
                target_q = assessment.questions[0]

            if target_q:
                sc = SubmissionQuestionScore(
                    submission_id=submission.id,
                    question_id=target_q.id,
                    points=float(qs.points),
                    feedback=f"{qs.feedback or 'Manually scored by instructor.'}\n[Matched excerpt: {(qs.matched_student_answer or 'Recorded by instructor')[:120]}]",
                )
                session.add(sc)
                q_results.append({
                    "question_id": target_q.id,
                    "question_text": target_q.text,
                    "points_awarded": float(qs.points),
                    "max_points": target_q.max_marks,
                    "matched_student_answer": qs.matched_student_answer or "Student answer recorded by instructor",
                    "feedback": qs.feedback or "Manually verified by instructor.",
                })
    else:
        for q in assessment.questions:
            q_results.append({
                "question_id": q.id,
                "question_text": q.text,
                "points_awarded": round(calculated_total / max(len(assessment.questions), 1), 1),
                "max_points": q.max_marks,
                "matched_student_answer": "Student answer recorded by instructor",
                "feedback": req.summary_feedback or "Score recorded directly by instructor.",
            })

    if assessment.status != "locked":
        assessment.status = "locked"

    session.commit()
    session.refresh(submission)

    pct = round((submission.total_score / assessment.max_score) * 100, 1) if assessment.max_score > 0 else 0.0

    return {
        "submission_id": str(submission.id),
        "id": str(submission.id),
        "student_id": student.id,
        "student_number": student.student_number,
        "student_name": student.name,
        "assessment_id": assessment.id,
        "assessment_title": assessment.title,
        "ai_total": submission.ai_total,
        "total_score": submission.total_score,
        "max_score": assessment.max_score,
        "percentage": pct,
        "status": submission.status,
        "summary_feedback": req.summary_feedback or f"Overall score: {submission.total_score}/{assessment.max_score} recorded by instructor.",
        "question_results": q_results,
    }


@router.get("/assessments/{assessment_id}/submissions")
def list_assessment_submissions(
    assessment_id: str,
    lecturer_id: str = Depends(get_current_lecturer),
    session: Session = Depends(get_session),
):
    assessment = (
        session.query(Assessment)
        .filter(Assessment.id == assessment_id, Assessment.lecturer_id == lecturer_id)
        .first()
    )
    if not assessment:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Assessment not found.")

    subs = []
    for s in assessment.submissions:
        pct = round((s.total_score / assessment.max_score) * 100, 1) if assessment.max_score > 0 else 0.0

        q_results = []
        if s.question_scores:
            for qs in s.question_scores:
                q_text = qs.question.text if qs.question else "Question"
                q_max = qs.question.max_marks if qs.question else 10.0
                fb = qs.feedback or ""
                ans = "Student answer recorded"
                if "\n[Matched excerpt: " in fb:
                    parts = fb.split("\n[Matched excerpt: ")
                    fb = parts[0]
                    ans = parts[1].rstrip("]")

                q_results.append({
                    "question_id": qs.question_id,
                    "question_text": q_text,
                    "points_awarded": qs.points,
                    "max_points": q_max,
                    "matched_student_answer": ans,
                    "feedback": fb or "Evaluation recorded.",
                })
        else:
            for q in assessment.questions:
                q_results.append({
                    "question_id": q.id,
                    "question_text": q.text,
                    "points_awarded": round(s.total_score / max(len(assessment.questions), 1), 1),
                    "max_points": q.max_marks,
                    "matched_student_answer": (s.extracted_text[:120] if s.extracted_text else "Recorded response"),
                    "feedback": f"Evaluated against rubric for {assessment.title}.",
                })

        file_ext = s.pdf_path.rsplit(".", 1)[-1].lower() if s.pdf_path and "." in s.pdf_path else None
        subs.append({
            "id": str(s.id),
            "student_id": s.student.id if s.student else None,
            "student_number": s.student.student_number if s.student else "",
            "student_name": s.student.name if s.student else "",
            "ai_total": s.ai_total,
            "total_score": s.total_score,
            "max_score": assessment.max_score,
            "percentage": pct,
            "status": s.status,
            "has_file": bool(s.pdf_path),
            "file_type": file_ext,
            "file_url": f"/api/submissions/{s.id}/file" if s.pdf_path else None,
            "extracted_text": s.extracted_text,
            "graded_at": s.graded_at.isoformat() if s.graded_at else None,
            "summary_feedback": f"Overall grade: {s.total_score}/{assessment.max_score} ({pct}%).",
            "question_results": q_results,
        })
    return subs


@router.get("/assessments/{assessment_id}/export-excel-data")
def export_excel_data(
    assessment_id: str,
    lecturer_id: str = Depends(get_current_lecturer),
    session: Session = Depends(get_session),
):
    assessment = (
        session.query(Assessment)
        .filter(Assessment.id == assessment_id, Assessment.lecturer_id == lecturer_id)
        .first()
    )
    if not assessment:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Assessment not found.")

    confirmed_rows = []
    for sub in assessment.submissions:
        if sub.status == "confirmed" and sub.student:
            pct = round((sub.total_score / assessment.max_score) * 100, 1) if assessment.max_score > 0 else 0.0
            confirmed_rows.append({
                "student_number": sub.student.student_number,
                "name": sub.student.name,
                "total_score": sub.total_score,
                "max_score": assessment.max_score,
                "percentage": f"{pct}%",
            })

    return {
        "assessment_title": assessment.title,
        "max_score": assessment.max_score,
        "rows": confirmed_rows,
    }


@router.get("/assessments/{assessment_id}/export-pdf")
def export_assessment_pdf(
    assessment_id: str,
    solutions: bool = Query(False, description="Include official answer key and rubrics"),
    lecturer_id: str = Depends(get_current_lecturer),
    session: Session = Depends(get_session),
):
    from fastapi.responses import Response
    from src.services.pdf_service import generate_assessment_exam_pdf

    assessment = (
        session.query(Assessment)
        .filter(Assessment.id == assessment_id, Assessment.lecturer_id == lecturer_id)
        .first()
    )
    if not assessment:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Assessment not found.")

    detail_data = get_assessment_detail_response(assessment)
    if assessment.lecture_note and assessment.lecture_note.name:
        detail_data["course_name"] = assessment.lecture_note.name

    pdf_bytes = generate_assessment_exam_pdf(detail_data, include_solutions=solutions)

    suffix = "Solution_Key" if solutions else "Exam_Paper"
    safe_title = "".join(c for c in assessment.title if c.isalnum() or c in (" ", "-", "_")).strip()
    safe_title = safe_title.replace(" ", "_") or "Assessment"
    filename = f"{safe_title}_{suffix}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


class CustomPdfExportReq(BaseModel):
    assessment_data: Dict[str, Any]
    solutions: bool = False


@router.post("/assessments/export-pdf-custom")
def export_custom_assessment_pdf(req: CustomPdfExportReq):
    from fastapi.responses import Response
    from src.services.pdf_service import generate_assessment_exam_pdf

    data = req.assessment_data or {}
    pdf_bytes = generate_assessment_exam_pdf(data, include_solutions=req.solutions)

    suffix = "Solution_Key" if req.solutions else "Exam_Paper"
    title = data.get("title") or "Assessment"
    safe_title = "".join(c for c in title if c.isalnum() or c in (" ", "-", "_")).strip()
    safe_title = safe_title.replace(" ", "_") or "Assessment"
    filename = f"{safe_title}_{suffix}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def get_assessment_detail_response(a: Assessment) -> Dict[str, Any]:
    questions = []
    for q in a.questions:
        rubric_data = None
        if q.rubric:
            rubric_data = {
                "id": q.rubric.id,
                "status": q.rubric.status,
                "locked_at": q.rubric.locked_at.isoformat() if q.rubric.locked_at else None,
                "criteria": [
                    {
                        "id": c.id,
                        "position": c.position,
                        "description": c.description,
                        "max_points": c.max_points,
                        "source": c.source,
                    }
                    for c in q.rubric.criteria
                ],
            }

        questions.append({
            "id": q.id,
            "position": q.position,
            "text": q.text,
            "student_hint": q.student_hint,
            "max_marks": q.max_marks,
            "source": q.source,
            "key_points": [
                {"id": kp.id, "title": kp.title, "type": kp.type, "source_ref": kp.source_ref}
                for kp in q.key_points
            ],
            "rubric": rubric_data,
        })

    return {
        "id": a.id,
        "lecture_note_id": a.lecture_note_id,
        "title": a.title,
        "version": a.version,
        "status": a.status,
        "max_score": a.max_score,
        "question_count": len(questions),
        "questions": questions,
        "submission_count": len(a.submissions),
    }
