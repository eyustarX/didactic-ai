"""
Tests for top-level package exports and high-level cloud facades in src.ai.__init__.py.
"""

from pathlib import Path
import pytest

import src.ai as ai


def test_package_metadata():
    assert hasattr(ai, "__version__")
    assert hasattr(ai, "__author__")
    assert ai.__version__ == "1.0.0"


def test_all_symbols_in_dunder_all():
    for symbol_name in ai.__all__:
        assert hasattr(ai, symbol_name), f"Exported symbol '{symbol_name}' missing from src.ai"


def test_facade_analyze_lecture_from_text():
    sample_text = (
        "# Operating Systems: Processes\n"
        "## Section 1: Process States\n"
        "Processes transition between ready, running, and waiting states.\n"
        "## Section 2: Context Switching\n"
        "The OS kernel saves CPU registers to the PCB during a context switch."
    )
    curriculum, rubric, coordinator = ai.analyze_lecture(
        source=sample_text,
        filename="processes.pdf",
        target_criteria_count=3,
        total_marks=10.0,
    )

    assert isinstance(curriculum, ai.CurriculumAnalysis)
    assert isinstance(rubric, ai.AssessmentRubric)
    assert isinstance(coordinator, ai.MultiAgentCoordinator)
    assert len(curriculum.objectives) >= 2
    assert len(rubric.criteria) == 3
    assert coordinator.retriever.is_indexed


def test_facade_create_assessment_and_grading():
    sample_text = (
        "# Operating Systems: Concurrency\n"
        "A mutex is a mutual exclusion lock with thread ownership. Only the acquiring thread unlocks it.\n"
        "A semaphore uses wait() and signal() for signaling without ownership."
    )
    curriculum, rubric, coordinator = ai.analyze_lecture(
        source=sample_text,
        filename="concurrency.pdf",
        target_criteria_count=3,
        total_marks=10.0,
    )

    assessment = ai.create_assessment(
        coordinator=coordinator,
        curriculum=curriculum,
        rubric=rubric,
        question_count=2,
        total_points=10.0,
    )

    assert isinstance(assessment, ai.GeneratedAssessment)
    assert len(assessment.questions) == 2

    # Grade a question submission
    q = assessment.questions[0]
    report = ai.grade_submission(
        coordinator=coordinator,
        rubric=rubric,
        student_answer="A mutex ensures mutual exclusion through explicit thread ownership.",
        question=q,
        student_id="STU-FACADE-01",
    )

    assert isinstance(report, ai.GradingReport)
    assert report.total_score > 0
    assert report.student_id == "STU-FACADE-01"

    # Grade an assignment submission
    assign_report = ai.grade_submission(
        coordinator=coordinator,
        rubric=rubric,
        student_answer="Mutex locks provide thread ownership while semaphores synchronize using wait and signal.",
        assignment_title="Concurrency Lab",
        assignment_instructions="Explain mutex and semaphore primitives.",
        student_id="STU-FACADE-02",
    )

    assert isinstance(assign_report, ai.GradingReport)
    assert assign_report.total_score > 0

    # Cohort analysis facade
    cohort_report = ai.analyze_cohort_reports(
        reports=[report, assign_report],
        coordinator=coordinator,
    )

    assert isinstance(cohort_report, ai.CohortAnalyticsReport)
    assert cohort_report.total_submissions == 2
