"""
Didactic AI - Academic Teaching & Assessment Assistant.

Core AI/ML Engine for university lecturers:
  - Lecture Ingestion & RAG Slide Indexing
  - Multi-Agent Orchestration (Curriculum, Rubric, Assessment, Grading, Auditor)
  - Monotonic & Calibrated Evidence-Based Grading
  - Anti-Hallucination Evidence Verification & Targeted Remediation
  - Cohort Misconception Analytics & Teaching Prescriptions
  - Zero-Cost Local Simulation & Cloud-Ready Bedrock/Gemini Providers
"""

import io
import re
from pathlib import Path
from typing import List, Optional, Tuple, Union

# ---------------------------------------------------------------------------
# Version & Metadata
# ---------------------------------------------------------------------------
__version__ = "1.0.0"
__author__ = "Didactic AI Engineering Team"

# ---------------------------------------------------------------------------
# Core Domain Schemas
# ---------------------------------------------------------------------------
from src.ai.schemas import (
    AssessmentRubric,
    BloomLevel,
    CohortAnalyticsReport,
    CohortMisconception,
    CriterionEvaluation,
    CriterionMastery,
    CurriculumAnalysis,
    DocumentChunk,
    GeneratedAssessment,
    GradingReport,
    IngestedDocument,
    LearningObjective,
    Question,
    QuestionType,
    RubricCriterion,
    StudentSubmission,
)

# ---------------------------------------------------------------------------
# Document Ingestion
# ---------------------------------------------------------------------------
from src.ai.ingest import (
    chunk_document,
    clean_text,
    extract_text_from_pdf,
    ingest_pdf,
)

# ---------------------------------------------------------------------------
# RAG Retrieval Engine
# ---------------------------------------------------------------------------
from src.ai.rag import (
    LectureRetriever,
    RetrievalResult,
    create_retriever,
)

# ---------------------------------------------------------------------------
# Specialized Multi-Agent System
# ---------------------------------------------------------------------------
from src.ai.agents import (
    AssessmentAgent,
    AuditorAgent,
    BaseAgent,
    CurriculumAgent,
    GradingAgent,
    MultiAgentCoordinator,
    RubricAgent,
    create_coordinator,
)

# ---------------------------------------------------------------------------
# Cohort Analytics Engine
# ---------------------------------------------------------------------------
from src.ai.analytics import (
    CohortAnalyticsEngine,
    analyze_cohort,
)

# ---------------------------------------------------------------------------
# Pluggable AI Engine & LLM Providers
# ---------------------------------------------------------------------------
from src.ai.engine import (
    BaseLLMProvider,
    BedrockLiveProvider,
    DidacticEngine,
    GeminiLiveProvider,
    MockLLMProvider,
    get_engine,
)


# ---------------------------------------------------------------------------
# High-Level Cloud & Lambda Facade API
# ---------------------------------------------------------------------------

def analyze_lecture(
    source: Union[str, bytes, Path, io.BytesIO],
    filename: str = "lecture.pdf",
    target_criteria_count: int = 4,
    total_marks: float = 10.0,
    provider=None,
) -> Tuple[CurriculumAnalysis, AssessmentRubric, MultiAgentCoordinator]:
    """
    High-Level Cloud Facade 1:
    Ingests lecture slides (PDF bytes, file path, or raw text),
    extracts Bloom learning objectives, synthesizes a normalized rubric,
    indexes slide chunks into an in-memory RAG retriever, and returns
    (CurriculumAnalysis, AssessmentRubric, MultiAgentCoordinator).
    """
    if isinstance(source, bytes) or hasattr(source, "read") or (isinstance(source, (str, Path)) and str(source).lower().endswith(".pdf")):
        doc = ingest_pdf(source, filename=filename)
    elif isinstance(source, Path) or (isinstance(source, str) and "\n" not in source and Path(source).exists()):
        content = Path(source).read_text(encoding="utf-8")
        cleaned = clean_text(content)
        raw_sections = [s.strip() for s in re.split(r"\n(?=###?\s+)", cleaned) if s.strip()]
        pages = [(idx + 1, sec) for idx, sec in enumerate(raw_sections)] if raw_sections else [(1, cleaned)]
        doc = chunk_document(pages, filename=filename)
    else:
        content = str(source)
        cleaned = clean_text(content)
        raw_sections = [s.strip() for s in re.split(r"\n(?=###?\s+)", cleaned) if s.strip()]
        pages = [(idx + 1, sec) for idx, sec in enumerate(raw_sections)] if raw_sections else [(1, cleaned)]
        doc = chunk_document(pages, filename=filename)

    coordinator = create_coordinator(chunks=doc.chunks, provider=provider)
    curriculum, rubric = coordinator.analyze_lecture_and_create_rubric(
        document=doc,
        target_criteria_count=target_criteria_count,
        total_marks=total_marks,
    )
    return curriculum, rubric, coordinator


def create_assessment(
    coordinator: MultiAgentCoordinator,
    curriculum: CurriculumAnalysis,
    rubric: Optional[AssessmentRubric] = None,
    question_count: int = 3,
    total_points: float = 10.0,
    source_document: str = "lecture_slides.pdf",
) -> GeneratedAssessment:
    """
    High-Level Cloud Facade 2:
    Generates a balanced multi-format assessment with RAG-anchored answer keys.
    """
    return coordinator.generate_assessment(
        curriculum=curriculum,
        rubric=rubric,
        question_count=question_count,
        total_points=total_points,
        source_document=source_document,
    )


def grade_submission(
    coordinator: MultiAgentCoordinator,
    rubric: AssessmentRubric,
    student_answer: str,
    question: Optional[Question] = None,
    assignment_title: Optional[str] = None,
    assignment_instructions: Optional[str] = None,
    student_id: str = "STUDENT-001",
    submission_id: Optional[str] = None,
) -> GradingReport:
    """
    High-Level Cloud Facade 3:
    Grades an exam question or assignment submission, runs anti-hallucination
    evidence verification, clamps score bounds, and generates a personalized
    remediation practice question.
    """
    if question is not None:
        return coordinator.grade_and_audit_question(
            question=question,
            rubric=rubric,
            student_answer=student_answer,
            student_id=student_id,
            submission_id=submission_id,
        )
    else:
        title = assignment_title or "Assignment Submission"
        instructions = assignment_instructions or "Evaluate against course rubric."
        return coordinator.grade_and_audit_assignment(
            assignment_title=title,
            assignment_instructions=instructions,
            rubric=rubric,
            student_submission=student_answer,
            student_id=student_id,
            submission_id=submission_id,
        )


def analyze_cohort_reports(
    reports: List[GradingReport],
    coordinator: Optional[MultiAgentCoordinator] = None,
) -> CohortAnalyticsReport:
    """
    High-Level Cloud Facade 4:
    Aggregates multiple student GradingReports into class-wide statistics,
    weakest rubric criteria, mined misconceptions, and slide-grounded recap plan.
    """
    retriever = coordinator.retriever if coordinator else None
    return analyze_cohort(reports=reports, retriever=retriever)


__all__ = [
    # Metadata
    "__version__",
    "__author__",
    # Schemas
    "BloomLevel",
    "DocumentChunk",
    "IngestedDocument",
    "LearningObjective",
    "CurriculumAnalysis",
    "QuestionType",
    "Question",
    "GeneratedAssessment",
    "RubricCriterion",
    "AssessmentRubric",
    "StudentSubmission",
    "CriterionEvaluation",
    "GradingReport",
    "CohortMisconception",
    "CriterionMastery",
    "CohortAnalyticsReport",
    # Ingestion
    "clean_text",
    "chunk_document",
    "extract_text_from_pdf",
    "ingest_pdf",
    # RAG
    "LectureRetriever",
    "RetrievalResult",
    "create_retriever",
    # Agents & Coordinator
    "BaseAgent",
    "CurriculumAgent",
    "RubricAgent",
    "AssessmentAgent",
    "GradingAgent",
    "AuditorAgent",
    "MultiAgentCoordinator",
    "create_coordinator",
    # Analytics
    "CohortAnalyticsEngine",
    "analyze_cohort",
    # Engine & Providers
    "BaseLLMProvider",
    "MockLLMProvider",
    "GeminiLiveProvider",
    "BedrockLiveProvider",
    "DidacticEngine",
    "get_engine",
    # High-Level Cloud Facades
    "analyze_lecture",
    "create_assessment",
    "grade_submission",
    "analyze_cohort_reports",
]
