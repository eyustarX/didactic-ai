import logging
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.orm import Session

from src.ai.ingest import ingest_pdf
from src.ai.schemas import AssessmentRubric, GeneratedAssessment, GradingReport
from src.core.config import settings
from src.db.session import get_session
from src.schemas import (
    AssessmentGenerateRequest,
    GradeAssignmentRequest,
    GradeExamRequest,
    HealthResponse,
    RubricGenerateRequest,
    UploadResponse,
)
from src.services import analytics_service, grading_service
from src.services.engine_adapter import ai_engine

router = APIRouter()
logger = logging.getLogger(__name__)


def _server_error(message: str) -> HTTPException:
    # Full details go to the logs; the user only sees a short message
    logger.exception(message)
    return HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, f"{message}. Please try again.")


# Health
@router.get("/health", response_model=HealthResponse, tags=["General"])
def health():
    try:
        provider = ai_engine().provider.__class__.__name__
    except Exception:
        logger.exception("The AI engine could not start")
        provider = "unavailable"
    return HealthResponse(status="ok", version="1.0.0", active_provider=provider, docs_url="/docs")


# Upload
@router.post("/upload", response_model=UploadResponse, tags=["Documents"])
async def upload(file: UploadFile = File(...)):
    filename = file.filename or "lecture.pdf"
    if not filename.lower().endswith(".pdf") and file.content_type != "application/pdf":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Should be a PDF document.")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Uploaded file is empty.")
    if len(file_bytes) > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "File is too large.")

    try:
        # PDF parsing is blocking, so it runs in a thread and does not freeze the server
        doc = await run_in_threadpool(ingest_pdf, file_bytes, filename=filename)
    except Exception:
        raise _server_error("Failed to process the PDF")

    full_text = doc.full_text
    return UploadResponse(
        document_id=f"doc_{uuid.uuid4().hex[:8]}",
        filename=doc.filename,
        total_pages=doc.total_pages,
        total_chunks=len(doc.chunks),
        total_words=len(full_text.split()),
        preview=full_text[:300] + "..." if len(full_text) > 300 else full_text,
        full_text=full_text,
    )


# Rubric and assessment generation (plain def: FastAPI runs these in a thread pool)
@router.post("/generate/rubrics", response_model=AssessmentRubric, tags=["Generation"])
def generate_rubrics(request: RubricGenerateRequest):
    try:
        return ai_engine().generate_rubric(
            lecture_title=request.lecture_title,
            lecture_content=request.lecture_content,
        )
    except Exception:
        raise _server_error("Rubric generation failed")


@router.post("/generate/assessment", response_model=GeneratedAssessment, tags=["Generation"])
def generate_assessment(request: AssessmentGenerateRequest):
    try:
        return ai_engine().generate_assessment(
            lecture_title=request.lecture_title,
            lecture_content=request.lecture_content,
            question_count=request.question_count,
        )
    except Exception:
        raise _server_error("Assessment generation failed")


# Grading (also saves the result to Postgres)
@router.post("/grade/exam", response_model=GradingReport, tags=["Grading"])
def grade_exam(request: GradeExamRequest, session: Session = Depends(get_session)):
    try:
        return grading_service.grade_exam_and_save(session, request)
    except Exception:
        raise _server_error("Exam grading failed")


@router.post("/grade/assignment", response_model=GradingReport, tags=["Grading"])
def grade_assignment(request: GradeAssignmentRequest, session: Session = Depends(get_session)):
    try:
        return grading_service.grade_assignment_and_save(session, request)
    except Exception:
        raise _server_error("Assignment grading failed")


# Analytics for the cohort chart
@router.get("/analytics", tags=["Analytics"])
def analytics(course_id: str | None = None, session: Session = Depends(get_session)):
    return analytics_service.get_analytics(session, course_id)


# Mount Didactic AI routes
from src.api.didactic_routes import router as didactic_router
router.include_router(didactic_router)
router.include_router(didactic_router, prefix="/api")
