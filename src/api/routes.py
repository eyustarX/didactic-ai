"""
FastAPI route definitions for Didactic AI.
Provides endpoints for document upload, rubric generation,
assessment question synthesis, and automated grading.
"""

import uuid
from typing import Dict
from fastapi import APIRouter, UploadFile, File, HTTPException, status

from src.ai.engine import get_engine
from src.ai.ingest import ingest_pdf
from src.ai.schemas import (
    AssessmentRubric,
    GeneratedAssessment,
    GradingReport,
    IngestedDocument,
)
from src.schemas import (
    HealthResponse,
    UploadResponse,
    RubricGenerateRequest,
    AssessmentGenerateRequest,
    GradeExamRequest,
    GradeAssignmentRequest,
)

router = APIRouter()

# Initialize AI Engine & In-memory document cache
engine = get_engine()
DOCUMENTS_STORE: Dict[str, IngestedDocument] = {}



# Health & Status

@router.get("/health", response_model=HealthResponse, tags=["General"])
async def health():
    return HealthResponse(
        status="ok",
        version="1.0.0",
        active_provider=engine.provider.__class__.__name__,
        docs_url="/docs",
    )



# Document Ingestion & PDF Upload

@router.post("/upload", response_model=UploadResponse, tags=["Documents"])
async def upload(file: UploadFile = File(...)):
    filename = file.filename or "lecture.pdf"

    # Validate file type
    if not filename.lower().endswith(".pdf") and file.content_type != "application/pdf":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Should be a PDF document.",
        )

    try:
        file_bytes = await file.read()
        if not file_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty.",
            )

        # Ingest and semantically chunk the PDF using the AI ingest module
        doc = ingest_pdf(file_bytes, filename=filename)

        doc_id = f"doc_{uuid.uuid4().hex[:8]}"
        DOCUMENTS_STORE[doc_id] = doc

        # Generate preview and statistics
        preview = doc.full_text[:300] + "..." if len(doc.full_text) > 300 else doc.full_text
        total_words = len(doc.full_text.split())

        return UploadResponse(
            document_id=doc_id,
            filename=doc.filename,
            total_pages=doc.total_pages,
            total_chunks=len(doc.chunks),
            total_words=total_words,
            preview=preview,
            full_text=doc.full_text,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process PDF: {str(e)}",
        )


# Rubric & Assessment Generation
@router.post("/generate/rubrics", response_model=AssessmentRubric, tags=["Generation"])
async def generate_rubrics(request: RubricGenerateRequest):
    try:
        rubric = engine.generate_rubric(
            lecture_title=request.lecture_title,
            lecture_content=request.lecture_content,
        )
        return rubric
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Rubric generation failed: {str(e)}",
        )


@router.post("/generate/assessment", response_model=GeneratedAssessment, tags=["Generation"])
@router.post("/generate/assesment", response_model=GeneratedAssessment, include_in_schema=False)
async def generate_assessment(request: AssessmentGenerateRequest):
    try:
        assessment = engine.generate_assessment(
            lecture_title=request.lecture_title,
            lecture_content=request.lecture_content,
            question_count=request.question_count,
        )
        return assessment
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Assessment generation failed: {str(e)}",
        )



# Automated Grading
@router.post("/grade/exam", response_model=GradingReport, tags=["Grading"])
async def grade_exam(request: GradeExamRequest):
    try:
        report = engine.grade_exam_question(
            question=request.question,
            rubric=request.rubric,
            student_answer=request.student_answer,
        )
        return report
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Exam grading failed: {str(e)}",
        )


@router.post("/grade/assignment", response_model=GradingReport, tags=["Grading"])
async def grade_assignment(request: GradeAssignmentRequest):
    try:
        report = engine.grade_assignment(
            assignment_title=request.assignment_title,
            assignment_instructions=request.assignment_instructions,
            rubric=request.rubric,
            student_submission=request.student_submission,
        )
        return report
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Assignment grading failed: {str(e)}",
        )
