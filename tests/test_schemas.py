import pytest
from pydantic import ValidationError
from src.ai.schemas import (
    QuestionType,
    Question,
    GeneratedAssessment,
    RubricCriterion,
    AssessmentRubric,
    StudentSubmission,
    CriterionEvaluation,
    GradingReport,
)


def test_question_and_assessment_creation():
    q1 = Question(
        id="Q1",
        question_type=QuestionType.SHORT_ANSWER,
        prompt="Explain deadlocks in operating systems.",
        reference_answer="A deadlock occurs when a set of processes are blocked because each process is holding a resource and waiting for another resource held by another process.",
        max_points=10.0,
        learning_objective="Process synchronization and deadlocks",
    )
    assert q1.id == "Q1"
    assert q1.question_type == QuestionType.SHORT_ANSWER

    assessment = GeneratedAssessment(
        title="Operating Systems Quiz 1",
        course_name="CS301",
        source_document="lecture_04_sync.pdf",
        questions=[q1],
        total_points=10.0,
    )
    assert len(assessment.questions) == 1
    assert assessment.total_points == 10.0

    # Ensure clean JSON serializability for API Gateway & DynamoDB
    json_data = assessment.model_dump_json()
    assert "Operating Systems Quiz 1" in json_data


def test_rubric_schema_validation():
    crit1 = RubricCriterion(
        name="Conceptual Accuracy",
        description="Correctly defines the four Coffman conditions for deadlocks.",
        weight=0.6,
        max_score=6.0,
    )
    crit2 = RubricCriterion(
        name="Clarity & Terminology",
        description="Uses accurate operating systems terminology.",
        weight=0.4,
        max_score=4.0,
    )
    rubric = AssessmentRubric(
        rubric_id="RUB-001",
        title="Deadlock Short Answer Rubric",
        criteria=[crit1, crit2],
    )
    assert len(rubric.criteria) == 2

    # Weight cannot exceed 1.0
    with pytest.raises(ValidationError):
        RubricCriterion(
            name="Invalid",
            description="Exceeds max weight",
            weight=1.5,
            max_score=10.0,
        )


def test_grading_report_validation():
    eval1 = CriterionEvaluation(
        criterion_name="Conceptual Accuracy",
        score_awarded=5.0,
        max_score=6.0,
        strengths=["Mentioned mutual exclusion and hold-and-wait"],
        gaps=["Omitted circular wait condition"],
        evidence_citation="Student stated: 'processes wait indefinitely for locks held by others'",
    )
    report = GradingReport(
        submission_id="SUB-101",
        student_id="STU-007",
        total_score=8.5,
        max_possible_score=10.0,
        percentage=85.0,
        summary_feedback="Strong understanding of deadlock dynamics with minor omission.",
        evaluations=[eval1],
        areas_to_review=["Coffman Conditions: Circular Wait"],
    )
    assert report.percentage == 85.0
    assert report.evaluations[0].score_awarded == 5.0

    # Percentage cannot exceed 100
    with pytest.raises(ValidationError):
        GradingReport(
            submission_id="SUB-102",
            student_id="STU-007",
            total_score=11.0,
            max_possible_score=10.0,
            percentage=110.0,
            summary_feedback="Invalid",
            evaluations=[eval1],
        )
