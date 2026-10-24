import logging

from sqlalchemy.orm import Session

from src.ai.schemas import GradingReport
from src.db.models import Submission
from src.schemas import GradeAssignmentRequest, GradeExamRequest
from src.services.engine_adapter import ai_engine

logger = logging.getLogger(__name__)

# Field names to look for inside GradingReport. Change them to match src/ai/schemas.py.
SCORE_FIELDS = ("total_score", "score", "overall_score")
MAX_SCORE_FIELDS = ("max_score", "total_possible", "max_points")
ERROR_FIELDS = ("error_type", "misconception", "error_tag", "category")


def _first(data: dict, names: tuple):
    for name in names:
        value = data.get(name)
        if value not in (None, "", []):
            return value
    return None


def _number(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _save(session: Session, kind: str, request, report: GradingReport) -> None:
    data = report.model_dump(mode="json")
    tag = _first(data, ERROR_FIELDS)
    if isinstance(tag, list):
        tag = tag[0]
    try:
        session.add(Submission(
            kind=kind,
            course_id=request.course_id,
            student_id=request.student_id,
            score=_number(_first(data, SCORE_FIELDS)),
            max_score=_number(_first(data, MAX_SCORE_FIELDS)),
            error_tag=str(tag) if tag else "uncategorized",
            report=data,
        ))
        session.commit()
    except Exception:
        # A database problem must not lose the grade the student is waiting for
        session.rollback()
        logger.exception("Could not save the submission")


def grade_exam_and_save(session: Session, request: GradeExamRequest) -> GradingReport:
    report = ai_engine().grade_exam_question(
        question=request.question,
        rubric=request.rubric,
        student_answer=request.student_answer,
    )
    _save(session, "exam", request, report)
    return report


def grade_assignment_and_save(session: Session, request: GradeAssignmentRequest) -> GradingReport:
    report = ai_engine().grade_assignment(
        assignment_title=request.assignment_title,
        assignment_instructions=request.assignment_instructions,
        rubric=request.rubric,
        student_submission=request.student_submission,
    )
    _save(session, "assignment", request, report)
    return report