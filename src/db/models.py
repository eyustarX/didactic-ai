"""
SQLAlchemy ORM models for Didactic AI.
Implements data schemas for lecture notes, key parts, assessments, questions,
rubrics, rubric criteria, students, submissions, and question scores.
"""

import hashlib
import secrets
import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    Text,
    DateTime,
    ForeignKey,
    Table,
    UniqueConstraint,
    JSON,
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


def generate_uuid() -> str:
    return str(uuid.uuid4())


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100_000)
    return f"{salt}:{key.hex()}"


def verify_password(password: str, hashed: str) -> bool:
    try:
        if not hashed or ":" not in hashed:
            return False
        salt, key_hex = hashed.split(":", 1)
        check_key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100_000)
        return secrets.compare_digest(check_key.hex(), key_hex)
    except Exception:
        return False


class User(Base):
    """Registered instructor/user account."""
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    role = Column(String(50), default="Instructor")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


# Association table between Question and LectureNoteKeyPoint
question_key_points = Table(
    "question_key_points",
    Base.metadata,
    Column("question_id", String(36), ForeignKey("questions.id", ondelete="CASCADE"), primary_key=True),
    Column("key_point_id", String(36), ForeignKey("lecture_note_key_points.id", ondelete="CASCADE"), primary_key=True),
)


class LectureNote(Base):
    """Stores uploaded lecture notes and their extracted text."""
    __tablename__ = "lecture_notes"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    lecturer_id = Column(String(100), nullable=False, default="default_lecturer", index=True)
    name = Column(String(255), nullable=False)
    file_type = Column(String(20), nullable=False)  # pdf | pptx | docx | text
    file_path = Column(String(500), nullable=True)
    extracted_text = Column(Text, nullable=True)
    ingest_status = Column(String(20), nullable=False, default="pending", index=True)  # pending | done | failed
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    # Relationships
    key_points = relationship("LectureNoteKeyPoint", back_populates="lecture_note", cascade="all, delete-orphan", order_by="LectureNoteKeyPoint.position")
    assessments = relationship("Assessment", back_populates="lecture_note", cascade="all, delete-orphan")


class LectureNoteKeyPoint(Base):
    """Pivotal concept, definition, formula, example or objective extracted from lecture note."""
    __tablename__ = "lecture_note_key_points"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    lecture_note_id = Column(String(36), ForeignKey("lecture_notes.id", ondelete="CASCADE"), nullable=False, index=True)
    position = Column(Integer, default=0)
    title = Column(String(255), nullable=False)
    summary = Column(Text, nullable=True)
    type = Column(String(30), nullable=False)  # concept | definition | formula | example | objective
    source_ref = Column(String(100), nullable=True)  # e.g. "slide 7" or "page 3"
    included = Column(Boolean, default=True)
    source = Column(String(20), default="ai")  # ai | teacher
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    lecture_note = relationship("LectureNote", back_populates="key_points")
    questions = relationship("Question", secondary=question_key_points, back_populates="key_points")


class Assessment(Base):
    """An assessment drafted and refined from lecture note key points."""
    __tablename__ = "assessments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    lecture_note_id = Column(String(36), ForeignKey("lecture_notes.id", ondelete="CASCADE"), nullable=False, index=True)
    lecturer_id = Column(String(100), nullable=False, default="default_lecturer", index=True)
    title = Column(String(255), nullable=False)
    version = Column(Integer, default=1)
    status = Column(String(30), default="draft")  # draft | questions_approved | rubrics_approved | locked
    max_score = Column(Float, default=0.0)
    course_name = Column(String(150), nullable=True, default="General Course", index=True)
    section = Column(String(50), nullable=True, default="Section A", index=True)
    academic_year = Column(String(50), nullable=True, default="2026", index=True)
    assessment_category = Column(String(50), nullable=True, default="midterm", index=True)  # midterm | quiz | final | assignment
    weight_pct = Column(Float, nullable=True, default=25.0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    lecture_note = relationship("LectureNote", back_populates="assessments")
    questions = relationship("Question", back_populates="assessment", cascade="all, delete-orphan", order_by="Question.position")
    submissions = relationship("Submission", back_populates="assessment", cascade="all, delete-orphan")


class Question(Base):
    """Assessment question linked to key points and mapped to a unique rubric."""
    __tablename__ = "questions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    assessment_id = Column(String(36), ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False, index=True)
    position = Column(Integer, default=0)
    text = Column(Text, nullable=False)
    student_hint = Column(Text, nullable=True)
    max_marks = Column(Float, default=0.0)
    source = Column(String(20), default="ai")  # ai | teacher
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    assessment = relationship("Assessment", back_populates="questions")
    key_points = relationship("LectureNoteKeyPoint", secondary=question_key_points, back_populates="questions")
    rubric = relationship("Rubric", back_populates="question", uselist=False, cascade="all, delete-orphan")


class Rubric(Base):
    """
    Rubric strictly bound to a single question.
    Rule: Rubrics belong to a question, not directly to a lecture note.
    """
    __tablename__ = "rubrics"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    question_id = Column(String(36), ForeignKey("questions.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    status = Column(String(30), default="ai_draft")  # ai_draft | edited | approved | needs_review
    locked_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    question = relationship("Question", back_populates="rubric")
    criteria = relationship("RubricCriterion", back_populates="rubric", cascade="all, delete-orphan", order_by="RubricCriterion.position")


class RubricCriterion(Base):
    """Individual marking criteria for a rubric."""
    __tablename__ = "rubric_criteria"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    rubric_id = Column(String(36), ForeignKey("rubrics.id", ondelete="CASCADE"), nullable=False, index=True)
    position = Column(Integer, default=0)
    description = Column(Text, nullable=False)
    max_points = Column(Float, default=0.0)
    source = Column(String(20), default="ai")  # ai | teacher
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    rubric = relationship("Rubric", back_populates="criteria")


class Student(Base):
    """Teacher-managed student record."""
    __tablename__ = "students"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    lecturer_id = Column(String(100), nullable=False, default="default_lecturer", index=True)
    student_number = Column(String(100), nullable=False)
    name = Column(String(255), nullable=False)
    section = Column(String(50), nullable=True, default="Section A", index=True)
    academic_year = Column(String(50), nullable=True, default="2026", index=True)
    course_name = Column(String(150), nullable=True, default="General Course", index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    __table_args__ = (
        UniqueConstraint("lecturer_id", "student_number", name="uq_lecturer_student_number"),
    )

    # Relationships
    submissions = relationship("Submission", back_populates="student", cascade="all, delete-orphan")


class Submission(Base):
    """Student answer submission against an assessment."""
    __tablename__ = "submissions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    student_id = Column(String(36), ForeignKey("students.id", ondelete="CASCADE"), nullable=True, index=True)
    assessment_id = Column(String(36), ForeignKey("assessments.id", ondelete="CASCADE"), nullable=True, index=True)
    pdf_path = Column(String(500), nullable=True)
    pdf_hash = Column(String(64), nullable=True)
    extracted_text = Column(Text, nullable=True)
    ai_total = Column(Float, nullable=True)
    total_score = Column(Float, nullable=True)
    status = Column(String(20), default="graded")  # graded | confirmed
    graded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Compatibility fields for legacy analytics/reporting if needed
    kind = Column(String(50), nullable=False, default="exam")
    course_id = Column(String(100), nullable=True, index=True)
    score = Column(Float, nullable=True)
    max_score = Column(Float, nullable=True)
    error_tag = Column(String(100), nullable=True, default="uncategorized", index=True)
    report = Column(JSON, nullable=True)
    section = Column(String(50), nullable=True, default="Section A", index=True)
    academic_year = Column(String(50), nullable=True, default="2026", index=True)
    course_name = Column(String(150), nullable=True, default="General Course", index=True)
    assessment_category = Column(String(50), nullable=True, default="midterm", index=True)

    __table_args__ = (
        UniqueConstraint("student_id", "assessment_id", name="uq_student_assessment"),
    )

    # Relationships
    student = relationship("Student", back_populates="submissions")
    assessment = relationship("Assessment", back_populates="submissions")
    question_scores = relationship("SubmissionQuestionScore", back_populates="submission", cascade="all, delete-orphan")


class SubmissionQuestionScore(Base):
    """Optional per-question score and feedback breakdown."""
    __tablename__ = "submission_question_scores"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    submission_id = Column(Integer, ForeignKey("submissions.id", ondelete="CASCADE"), nullable=False, index=True)
    question_id = Column(String(36), ForeignKey("questions.id"), nullable=False, index=True)
    points = Column(Float, default=0.0)
    feedback = Column(Text, nullable=True)

    # Relationships
    submission = relationship("Submission", back_populates="question_scores")
    question = relationship("Question")


class ChatSession(Base):
    """Conversational Didactic AI chat thread for drafting assessments."""
    __tablename__ = "chat_sessions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    lecturer_id = Column(String(100), nullable=False, default="default_lecturer", index=True)
    title = Column(String(255), nullable=False, default="New Conversation")
    lecture_note_id = Column(String(36), ForeignKey("lecture_notes.id", ondelete="SET NULL"), nullable=True)
    assessment_id = Column(String(36), ForeignKey("assessments.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relationships
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan", order_by="ChatMessage.created_at")
    lecture_note = relationship("LectureNote")
    assessment = relationship("Assessment")


class ChatMessage(Base):
    """Single message within a chat session."""
    __tablename__ = "chat_messages"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(36), ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(20), nullable=False)  # 'user' | 'assistant'
    content = Column(Text, nullable=False)
    ready_to_generate = Column(Boolean, default=False)
    suggested_prompt = Column(Text, nullable=True)
    question_count = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    session = relationship("ChatSession", back_populates="messages")
