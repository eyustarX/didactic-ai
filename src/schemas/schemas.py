"""
FastAPI Request and Response schemas for Didactic AI API.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

from src.ai.schemas import (
    AssessmentRubric,
    GeneratedAssessment,
    Question,
    QuestionType,
    GradingReport,
    DocumentChunk,
    IngestedDocument,
)

# Health & Status Schemas


class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = "1.0.0"
    active_provider: str = "MockLLMProvider"
    docs_url: str = "/docs"


# Document Ingestion Schemas


class UploadResponse(BaseModel):
    document_id: str
    filename: str
    total_pages: int
    total_chunks: int
    total_words: int
    preview: str
    full_text: Optional[str] = None


# Rubric Generation Schemas

class RubricGenerateRequest(BaseModel):
    lecture_title: str = Field(..., min_length=2, description="Lecture topic or course module name")
    lecture_content: str = Field(..., min_length=10, description="Full lecture notes or slide text")


# Assessment Generation Schemas

class AssessmentGenerateRequest(BaseModel):
    lecture_title: str = Field(..., min_length=2, description="Lecture topic name")
    lecture_content: str = Field(..., min_length=10, description="Lecture text content")
    question_count: int = Field(default=3, ge=1, le=15, description="Number of questions to synthesize")



# Grading Schemas


class GradeExamRequest(BaseModel):
    question: Question
    rubric: AssessmentRubric
    student_answer: str = Field(..., min_length=1, description="Student's response to the exam question")


class GradeAssignmentRequest(BaseModel):
    assignment_title: str = Field(..., min_length=2, description="Title of the assignment")
    assignment_instructions: str = Field(..., min_length=5, description="Official instructions / prompt")
    rubric: AssessmentRubric
    student_submission: str = Field(..., min_length=1, description="Student's submission text")
