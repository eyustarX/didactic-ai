from sqlalchemy import func, select
from sqlalchemy.orm import Session

from src.db.models import Submission


def get_analytics(session: Session, course_id: str | None = None) -> dict:
    filters = [Submission.course_id == course_id] if course_id else []

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
        "total_submissions": total,
        "average_score": float(average) if average is not None else None,
        "error_patterns": [{"tag": tag, "count": n} for tag, n in tags],
    }