"""
SQLAlchemy ORM models for Didactic AI.
"""

from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, JSON, DateTime
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class Submission(Base):
    """Stores student assessment submission grading reports and analytics."""
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    kind = Column(String(50), nullable=False)  # "exam" or "assignment"
    course_id = Column(String(100), nullable=True, index=True)
    student_id = Column(String(100), nullable=True, index=True)
    score = Column(Float, nullable=True)
    max_score = Column(Float, nullable=True)
    error_tag = Column(String(100), nullable=True, default="uncategorized", index=True)
    report = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

