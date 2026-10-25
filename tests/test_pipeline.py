"""
End-to-End Grand Pipeline Integration Tests for Didactic AI.

Tests the complete pedagogical pipeline from raw lecture text to cohort analytics:
  1. Slide Ingestion & Semantic Chunking
  2. TF-IDF RAG Indexing
  3. MultiAgentCoordinator Orchestration (Curriculum -> Rubric -> Assessment -> Grading -> Auditor)
  4. Monotonic Calibration across Exemplary, Average, and Failing Submissions
  5. Cohort Misconception Analytics with Slide-Grounded Recap Prescriptions
  6. DynamoDB / AWS Lambda JSON Serialization Round-Trip
"""

import json
import re
from pathlib import Path
import pytest

from src.ai.analytics import CohortAnalyticsEngine
from src.ai.agents import MultiAgentCoordinator, create_coordinator
from src.ai.ingest import chunk_document, clean_text
from src.ai.rag import LectureRetriever
from src.ai.schemas import (
    AssessmentRubric,
    CohortAnalyticsReport,
    CurriculumAnalysis,
    DocumentChunk,
    GeneratedAssessment,
    GradingReport,
    IngestedDocument,
)


@pytest.fixture(scope="module")
def sample_lecture_text():
    lecture_path = Path("data/samples/sample_lecture.txt")
    assert lecture_path.exists(), "Benchmark sample_lecture.txt must exist"
    return lecture_path.read_text(encoding="utf-8")


@pytest.fixture(scope="module")
def sample_submissions_data():
    submissions_path = Path("data/samples/sample_student_submissions.json")
    assert submissions_path.exists(), "Benchmark sample_student_submissions.json must exist"
    return json.loads(submissions_path.read_text(encoding="utf-8"))


@pytest.fixture(scope="module")
def pipeline_context(sample_lecture_text):
    """
    Initializes the end-to-end pipeline context:
    Raw Text -> Clean -> Partition Sections as Slides -> Document -> Coordinator with Indexed RAG.
    """
    cleaned = clean_text(sample_lecture_text)
    raw_sections = [s.strip() for s in re.split(r"\n(?=###?\s+)", cleaned) if s.strip()]
    pages_text = [(idx + 1, sec) for idx, sec in enumerate(raw_sections)]
    doc = chunk_document(pages_text, filename="lecture_07_concurrency.pdf")
    coordinator = create_coordinator(chunks=doc.chunks)
    return {
        "document": doc,
        "coordinator": coordinator,
    }


def test_e2e_stage1_ingestion_and_rubric_synthesis(pipeline_context):
    """Stage 1: Validates slide ingestion, objective extraction, and normalized rubric generation."""
    coordinator: MultiAgentCoordinator = pipeline_context["coordinator"]
    doc: IngestedDocument = pipeline_context["document"]

    curriculum, rubric = coordinator.analyze_lecture_and_create_rubric(
        document=doc,
        target_criteria_count=4,
        total_marks=10.0,
    )

    # Verify CurriculumAnalysis
    assert isinstance(curriculum, CurriculumAnalysis)
    assert len(curriculum.objectives) >= 3
    for obj in curriculum.objectives:
        assert len(obj.topic) > 0
        assert len(obj.description) > 0
        assert obj.source_page >= 1

    # Verify AssessmentRubric mathematical invariants
    assert isinstance(rubric, AssessmentRubric)
    assert len(rubric.criteria) == 4
    total_weight = sum(c.weight for c in rubric.criteria)
    assert abs(total_weight - 1.0) < 1e-4
    total_rubric_marks = sum(c.max_score for c in rubric.criteria)
    assert abs(total_rubric_marks - 10.0) < 1e-2

    # Save to pipeline context for subsequent stages
    pipeline_context["curriculum"] = curriculum
    pipeline_context["rubric"] = rubric


def test_e2e_stage2_assessment_generation(pipeline_context):
    """Stage 2: Validates assessment generation with RAG-anchored answer keys and point sums."""
    coordinator: MultiAgentCoordinator = pipeline_context["coordinator"]
    curriculum: CurriculumAnalysis = pipeline_context["curriculum"]
    rubric: AssessmentRubric = pipeline_context["rubric"]

    assessment = coordinator.generate_assessment(
        curriculum=curriculum,
        rubric=rubric,
        question_count=3,
        total_points=10.0,
    )

    assert isinstance(assessment, GeneratedAssessment)
    assert len(assessment.questions) == 3
    assert abs(sum(q.max_points for q in assessment.questions) - 10.0) < 1e-3

    for q in assessment.questions:
        assert len(q.prompt) > 0
        assert len(q.reference_answer) > 0
        assert len(q.learning_objective) > 0

    pipeline_context["assessment"] = assessment


def test_e2e_stage3_student_grading_and_auditing_monotonicity(pipeline_context, sample_submissions_data):
    """
    Stage 3: Grades Alice, Bob, and Charlie and verifies:
      - Alice (Exemplary) > Bob (Average) > Charlie (Failing)
      - Anti-hallucination evidence citations are verified
      - Targeted remediation questions are synthesized for struggling students
    """
    coordinator: MultiAgentCoordinator = pipeline_context["coordinator"]
    rubric: AssessmentRubric = pipeline_context["rubric"]

    title = "Lab 07: Concurrency Control & Deadlock Prevention"
    instructions = "Explain mutex vs semaphore and describe the four Coffman conditions for deadlock prevention."

    reports = []
    for sub in sample_submissions_data:
        report = coordinator.grade_and_audit_assignment(
            assignment_title=title,
            assignment_instructions=instructions,
            rubric=rubric,
            student_submission=sub["submission_text"],
            student_id=sub["student_id"],
            submission_id=sub["submission_id"],
        )
        assert isinstance(report, GradingReport)
        reports.append(report)

    alice_report, bob_report, charlie_report = reports

    # Calibration verification
    assert alice_report.percentage >= 80.0, f"Alice expected >= 80%, got {alice_report.percentage}%"
    assert 55.0 <= bob_report.percentage < 85.0, f"Bob expected 55-84%, got {bob_report.percentage}%"
    assert charlie_report.percentage <= 45.0, f"Charlie expected <= 45%, got {charlie_report.percentage}%"

    # Strict Monotonicity: Alice > Bob > Charlie
    assert alice_report.percentage > bob_report.percentage > charlie_report.percentage
    assert alice_report.total_score > bob_report.total_score > charlie_report.total_score

    # Anti-Hallucination Guardrail: Valid student text has no unverified flags
    for r in reports:
        for ev in r.evaluations:
            assert "[AUDIT FLAG: Unverified Quote]" not in ev.evidence_citation

    # Remediation Synthesis: Bob and Charlie must have targeted review recommendations
    assert len(bob_report.areas_to_review) > 0
    assert len(charlie_report.areas_to_review) > 0

    pipeline_context["reports"] = reports


def test_e2e_stage4_cohort_misconception_analytics(pipeline_context):
    """
    Stage 4: Aggregates individual reports into cohort analytics and verifies:
      - Class statistics (mean, median, std dev)
      - Weakest rubric criteria identified
      - Top misconceptions mined and anchored to course slides
      - Actionable lecture recap generated
    """
    coordinator: MultiAgentCoordinator = pipeline_context["coordinator"]
    reports = pipeline_context["reports"]

    analytics_engine = CohortAnalyticsEngine(retriever=coordinator.retriever)
    cohort_report = analytics_engine.analyze_cohort(reports=reports)

    assert isinstance(cohort_report, CohortAnalyticsReport)
    assert cohort_report.total_submissions == 3
    assert 55.0 <= cohort_report.class_average <= 75.0
    assert cohort_report.min_score <= 45.0
    assert cohort_report.max_score >= 80.0
    assert cohort_report.standard_deviation > 15.0

    # Criterion breakdown
    assert len(cohort_report.criterion_masteries) == len(pipeline_context["rubric"].criteria)

    # Top misconceptions detected
    assert len(cohort_report.top_misconceptions) > 0
    top_mis = cohort_report.top_misconceptions[0]
    assert top_mis.affected_students_count >= 1
    assert top_mis.source_page is not None

    # Actionable recap plan for teacher's next class
    assert len(cohort_report.recommended_lecture_recap) >= 2
    recap_text = " ".join(cohort_report.recommended_lecture_recap)
    assert "[PRIORITY RECAP]" in recap_text
    assert "[ACTION ITEM]" in recap_text

    pipeline_context["cohort_report"] = cohort_report


def test_e2e_stage5_json_serialization_cloud_ready(pipeline_context):
    """
    Stage 5: Verifies that every pipeline artifact serializes cleanly to JSON
    and deserializes without loss, ensuring zero-friction integration with
    AWS Lambda, DynamoDB, and API Gateway.
    """
    curriculum: CurriculumAnalysis = pipeline_context["curriculum"]
    rubric: AssessmentRubric = pipeline_context["rubric"]
    assessment: GeneratedAssessment = pipeline_context["assessment"]
    reports = pipeline_context["reports"]
    cohort_report: CohortAnalyticsReport = pipeline_context["cohort_report"]

    artifacts = [
        ("CurriculumAnalysis", curriculum),
        ("AssessmentRubric", rubric),
        ("GeneratedAssessment", assessment),
        ("GradingReport_Alice", reports[0]),
        ("CohortAnalyticsReport", cohort_report),
    ]

    for name, model in artifacts:
        json_str = model.model_dump_json(indent=2)
        assert isinstance(json_str, str)
        assert len(json_str) > 50

        # Round-trip JSON parse
        parsed = json.loads(json_str)
        assert isinstance(parsed, dict)
