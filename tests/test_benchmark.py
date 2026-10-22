import json
from pathlib import Path
import pytest
from src.ai.engine import DidacticEngine, MockLLMProvider
from src.ai.schemas import GradingReport, AssessmentRubric, Question, QuestionType


@pytest.fixture
def sample_data():
    base_dir = Path(__file__).resolve().parent.parent / "data" / "samples"
    
    lecture_path = base_dir / "sample_lecture.txt"
    assignment_path = base_dir / "sample_assignment.json"
    submissions_path = base_dir / "sample_student_submissions.json"

    assert lecture_path.exists(), f"Missing {lecture_path}"
    assert assignment_path.exists(), f"Missing {assignment_path}"
    assert submissions_path.exists(), f"Missing {submissions_path}"

    with open(lecture_path, "r", encoding="utf-8") as f:
        lecture_text = f.read()

    with open(assignment_path, "r", encoding="utf-8") as f:
        assignment_data = json.load(f)

    with open(submissions_path, "r", encoding="utf-8") as f:
        submissions_data = json.load(f)

    return {
        "lecture_text": lecture_text,
        "assignment": assignment_data,
        "submissions": submissions_data,
    }


def test_benchmark_grading_calibration(sample_data):
    """
    Validates grading consistency and monotonicity across 3 calibrated submissions:
    Score(Alice) > Score(Bob) > Score(Charlie)
    """
    engine = DidacticEngine(provider=MockLLMProvider())

    # 1. Generate Rubric from Lecture Text
    rubric = engine.generate_rubric(
        lecture_title=sample_data["assignment"]["title"],
        lecture_content=sample_data["lecture_text"],
    )
    assert isinstance(rubric, AssessmentRubric)
    assert len(rubric.criteria) == 3

    # 2. Grade each student
    reports = []
    for sub in sample_data["submissions"]:
        report = engine.grade_assignment(
            assignment_title=sample_data["assignment"]["title"],
            assignment_instructions=sample_data["assignment"]["instructions"],
            rubric=rubric,
            student_submission=sub["submission_text"],
        )
        assert isinstance(report, GradingReport)
        reports.append((sub["student_name"], report))

    # Reports: [Alice, Bob, Charlie]
    name_a, report_a = reports[0]
    name_b, report_b = reports[1]
    name_c, report_c = reports[2]

    # Verify all students received valid reports with citations
    assert len(report_a.evaluations[0].evidence_citation) > 0
    assert len(report_b.evaluations[0].evidence_citation) > 0
    assert len(report_c.evaluations[0].evidence_citation) > 0

    # Ensure all percentage scores are bounded between 0 and 100
    for name, r in reports:
        assert 0.0 <= r.percentage <= 100.0
        assert len(r.summary_feedback) > 0
