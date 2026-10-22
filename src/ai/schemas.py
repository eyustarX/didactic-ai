from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


# ---------------------------------------------------------
# Assessment & Question Schemas
# ---------------------------------------------------------

class QuestionType(str, Enum):
    MULTIPLE_CHOICE = "multiple_choice"
    SHORT_ANSWER = "short_answer"
    ESSAY = "essay"
    CODE_ANALYSIS = "code_analysis"


class Question(BaseModel):
    id: str = Field(..., description="Unique question identifier, e.g. Q1")
    question_type: QuestionType = Field(..., description="Format of question")
    prompt: str = Field(..., description="The question text presented to the student")
    options: Optional[List[str]] = Field(
        default=None, 
        description="Options for multiple choice questions (empty for open-ended)"
    )
    reference_answer: str = Field(..., description="Ideal model answer or answer key")
    max_points: float = Field(..., gt=0, description="Maximum points allocated to this question")
    learning_objective: str = Field(..., description="Core lecture concept being tested")


class GeneratedAssessment(BaseModel):
    title: str = Field(..., description="Assessment title (e.g., Quiz 1: Concurrency)")
    course_name: str = Field(..., description="Course code or subject name")
    source_document: str = Field(..., description="Source lecture or slide deck reference")
    questions: List[Question] = Field(..., description="List of generated questions")
    total_points: float = Field(..., gt=0, description="Sum of all question points")


# ---------------------------------------------------------
# Rubric Schemas
# ---------------------------------------------------------

class RubricCriterion(BaseModel):
    name: str = Field(..., description="Criterion name, e.g. 'Conceptual Accuracy'")
    description: str = Field(..., description="Specific performance expectations for this criterion")
    weight: float = Field(..., ge=0.0, le=1.0, description="Normalized weight (0.0 to 1.0)")
    max_score: float = Field(..., gt=0, description="Maximum raw score for this criterion")


class AssessmentRubric(BaseModel):
    rubric_id: str = Field(..., description="Unique rubric identifier")
    title: str = Field(..., description="Rubric title")
    criteria: List[RubricCriterion] = Field(..., min_length=1, description="List of grading criteria")


# ---------------------------------------------------------
# Submission Schemas
# ---------------------------------------------------------

class StudentSubmission(BaseModel):
    submission_id: str = Field(..., description="Unique submission identifier")
    student_id: str = Field(..., description="Student identifier")
    assessment_id: Optional[str] = Field(default=None, description="Associated assessment ID")
    question_id: Optional[str] = Field(default=None, description="Associated question ID if single question")
    student_response: str = Field(..., description="Student's submitted answer text or code")


# ---------------------------------------------------------
# Multi-Step Grading & Evaluation Schemas
# ---------------------------------------------------------

class CriterionEvaluation(BaseModel):
    criterion_name: str = Field(..., description="Name of the rubric criterion evaluated")
    score_awarded: float = Field(..., ge=0, description="Points awarded")
    max_score: float = Field(..., gt=0, description="Points possible")
    strengths: List[str] = Field(default_factory=list, description="Points the student got right")
    gaps: List[str] = Field(default_factory=list, description="Misconceptions or missing elements")
    evidence_citation: str = Field(..., description="Direct quote or concept cited from the student answer")


class GradingReport(BaseModel):
    submission_id: str = Field(..., description="Unique submission ID")
    student_id: str = Field(..., description="Student identifier")
    total_score: float = Field(..., ge=0, description="Final score awarded")
    max_possible_score: float = Field(..., gt=0, description="Total maximum score possible")
    percentage: float = Field(..., ge=0, le=100, description="Calculated percentage score")
    summary_feedback: str = Field(..., description="High-level feedback for the student")
    evaluations: List[CriterionEvaluation] = Field(..., description="Decomposed per-criterion breakdown")
    areas_to_review: List[str] = Field(default_factory=list, description="Specific topics to revisit")
