import json
import pytest
from pathlib import Path

from src.ai.analytics import CohortAnalyticsEngine, analyze_cohort
from src.ai.rag import LectureRetriever, create_retriever
from src.ai.schemas import (
    CohortAnalyticsReport,
    CohortMisconception,
    CriterionEvaluation,
    CriterionMastery,
    DocumentChunk,
    GradingReport,
    IngestedDocument,
)


@pytest.fixture
def sample_reports():
    """Generates three distinct grading reports: Alice (95%), Bob (70%), Charlie (40%)."""
    eval_alice = [
        CriterionEvaluation(
            criterion_name="Conceptual Accuracy",
            score_awarded=4.8,
            max_score=5.0,
            strengths=["Thorough explanation of mutex vs semaphore."],
            gaps=[],
            evidence_citation="Student stated: 'mutex provides mutual exclusion with explicit thread ownership'",
        ),
        CriterionEvaluation(
            criterion_name="Technical Terminology",
            score_awarded=4.7,
            max_score=5.0,
            strengths=["Correctly identified Coffman conditions."],
            gaps=[],
            evidence_citation="Student stated: 'establishing a global strict ordering'",
        ),
    ]

    eval_bob = [
        CriterionEvaluation(
            criterion_name="Conceptual Accuracy",
            score_awarded=3.5,
            max_score=5.0,
            strengths=["Identified wait and signal."],
            gaps=["Lacks depth on specific mechanics or edge cases for Coffman conditions."],
            evidence_citation="Student stated: 'semaphore uses wait and signal while mutex is a lock'",
        ),
        CriterionEvaluation(
            criterion_name="Technical Terminology",
            score_awarded=3.5,
            max_score=5.0,
            strengths=["Mentioned circular waiting."],
            gaps=["Vague definitions regarding circular wait prevention."],
            evidence_citation="Student stated: 'processes wait in a circle'",
        ),
    ]

    eval_charlie = [
        CriterionEvaluation(
            criterion_name="Conceptual Accuracy",
            score_awarded=2.0,
            max_score=5.0,
            strengths=["Attempted submission."],
            gaps=["Severe conceptual gaps regarding mutex and semaphore."],
            evidence_citation="Student stated: 'hardware wire that connects the CPU to RAM'",
        ),
        CriterionEvaluation(
            criterion_name="Technical Terminology",
            score_awarded=2.0,
            max_score=5.0,
            strengths=["Attempted response."],
            gaps=["Critical misconceptions regarding deadlock conditions and circular wait."],
            evidence_citation="Student stated: 'deadlock means the computer crashed'",
        ),
    ]

    return [
        GradingReport(
            submission_id="SUB-ALICE",
            student_id="STU-ALICE",
            total_score=9.5,
            max_possible_score=10.0,
            percentage=95.0,
            summary_feedback="Exemplary submission.",
            evaluations=eval_alice,
            areas_to_review=[],
        ),
        GradingReport(
            submission_id="SUB-BOB",
            student_id="STU-BOB",
            total_score=7.0,
            max_possible_score=10.0,
            percentage=70.0,
            summary_feedback="Satisfactory submission.",
            evaluations=eval_bob,
            areas_to_review=["Review lecture Slide 4 regarding circular wait."],
        ),
        GradingReport(
            submission_id="SUB-CHARLIE",
            student_id="STU-CHARLIE",
            total_score=4.0,
            max_possible_score=10.0,
            percentage=40.0,
            summary_feedback="Substandard submission.",
            evaluations=eval_charlie,
            areas_to_review=[
                "Mandatory review of lecture Slide 3 regarding mutex and semaphore.",
                "Mandatory review of lecture Slide 4 regarding Coffman deadlock conditions.",
            ],
        ),
    ]


@pytest.fixture
def indexed_retriever():
    retriever = LectureRetriever()
    chunks = [
        DocumentChunk(
            chunk_id="chunk_001",
            page_number=1,
            content="Introduction to Operating Systems",
            token_estimate=10,
        ),
        DocumentChunk(
            chunk_id="chunk_002",
            page_number=2,
            content="Critical Section Problem and Bounded Waiting",
            token_estimate=20,
        ),
        DocumentChunk(
            chunk_id="chunk_003",
            page_number=3,
            content="Mutex vs. Semaphore: A mutex has thread ownership while semaphores use wait() and signal() for signaling.",
            token_estimate=30,
        ),
        DocumentChunk(
            chunk_id="chunk_004",
            page_number=4,
            content="Deadlock Conditions: 1. Mutual Exclusion 2. Hold and Wait 3. No Preemption 4. Circular Wait. Resource ordering eliminates circular wait.",
            token_estimate=35,
        ),
    ]
    retriever.index_chunks(chunks)
    return retriever


def test_empty_cohort_analysis():
    engine = CohortAnalyticsEngine()
    report = engine.analyze_cohort([])

    assert isinstance(report, CohortAnalyticsReport)
    assert report.total_submissions == 0
    assert report.class_average == 0.0
    assert report.class_median == 0.0
    assert report.min_score == 0.0
    assert report.max_score == 0.0
    assert report.standard_deviation == 0.0
    assert len(report.criterion_masteries) == 0
    assert len(report.top_misconceptions) == 0
    assert len(report.recommended_lecture_recap) > 0


def test_single_student_analysis(sample_reports):
    engine = CohortAnalyticsEngine()
    report = engine.analyze_cohort([sample_reports[0]])

    assert report.total_submissions == 1
    assert report.class_average == 95.0
    assert report.class_median == 95.0
    assert report.min_score == 95.0
    assert report.max_score == 95.0
    assert report.standard_deviation == 0.0


def test_cohort_statistics_accuracy(sample_reports):
    engine = CohortAnalyticsEngine()
    report = engine.analyze_cohort(sample_reports)

    # Alice (95.0), Bob (70.0), Charlie (40.0)
    # Mean: (95 + 70 + 40) / 3 = 68.3
    # Median: 70.0
    # Min: 40.0, Max: 95.0
    assert report.total_submissions == 3
    assert abs(report.class_average - 68.3) < 0.2
    assert report.class_median == 70.0
    assert report.min_score == 40.0
    assert report.max_score == 95.0
    assert report.standard_deviation > 20.0


def test_criterion_mastery_breakdown(sample_reports):
    engine = CohortAnalyticsEngine()
    report = engine.analyze_cohort(sample_reports)

    assert len(report.criterion_masteries) == 2
    for mastery in report.criterion_masteries:
        assert isinstance(mastery, CriterionMastery)
        assert mastery.max_score == 5.0
        assert 0.0 <= mastery.mastery_percentage <= 100.0
        assert mastery.mastery_level in ["High Mastery", "Moderate Mastery", "Low Mastery (Needs Review)"]


def test_misconception_mining_with_rag(sample_reports, indexed_retriever):
    engine = CohortAnalyticsEngine(retriever=indexed_retriever)
    report = engine.analyze_cohort(sample_reports)

    assert len(report.top_misconceptions) > 0
    top_misconception = report.top_misconceptions[0]
    assert isinstance(top_misconception, CohortMisconception)
    assert top_misconception.affected_students_count >= 1
    assert top_misconception.affected_percentage > 0.0
    assert len(top_misconception.sample_gaps) > 0
    # Source page should be anchored to slide 3 or 4
    assert top_misconception.source_page in [3, 4]


def test_recommended_lecture_recap_actionable(sample_reports, indexed_retriever):
    engine = CohortAnalyticsEngine(retriever=indexed_retriever)
    report = engine.analyze_cohort(sample_reports)

    assert len(report.recommended_lecture_recap) >= 2
    combined_recap = " ".join(report.recommended_lecture_recap)
    assert "[PRIORITY RECAP]" in combined_recap
    assert "[ACTION ITEM]" in combined_recap
    assert "Slide" in combined_recap


def test_convenience_analyze_cohort_function(sample_reports):
    report = analyze_cohort(sample_reports)
    assert isinstance(report, CohortAnalyticsReport)
    assert report.total_submissions == 3
