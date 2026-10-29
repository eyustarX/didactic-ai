from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.db.models import Assessment, Submission


def get_analytics(
    session: Session,
    course_id: str | None = None,
    lecturer_id: str | None = None,
) -> dict:
    filters = []
    if course_id:
        filters.append(Submission.course_id == course_id)
    if lecturer_id:
        lecturer_assessments = (
            select(Assessment.id)
            .where(Assessment.lecturer_id == lecturer_id)
            .scalar_subquery()
        )
        filters.append(Submission.assessment_id.in_(lecturer_assessments))

    tags = session.execute(
        select(Submission.error_tag, func.count())
        .where(*filters)
        .group_by(Submission.error_tag)
        .order_by(func.count().desc())
    ).all()
    total, average = session.execute(
        select(func.count(), func.avg(Submission.score)).where(*filters)
    ).one()

    return {
        "total_submissions": total or 0,
        "average_score": float(average) if average is not None else None,
        "error_patterns": [{"tag": tag, "count": n} for tag, n in tags],
    }