from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


# ---------------------------------------------------------
# Document Ingestion Schemas
# ---------------------------------------------------------

class DocumentChunk(BaseModel):
    chunk_id: str = Field(..., description="Unique chunk identifier, e.g. chunk_001")
    page_number: int = Field(..., ge=1, description="Source PDF page/slide number")
    content: str = Field(..., description="Cleaned textual content of the chunk")
    token_estimate: int = Field(..., ge=0, description="Approximate token count")


class IngestedDocument(BaseModel):
    filename: str = Field(..., description="Source document file name")
    total_pages: int = Field(..., ge=0, description="Total number of pages extracted")
    chunks: List[DocumentChunk] = Field(default_factory=list, description="List of semantic document chunks")
    full_text: str = Field(..., description="Aggregated cleaned text of the entire document")


# ---------------------------------------------------------
# Curriculum & Learning Objective Schemas
# ---------------------------------------------------------

class BloomLevel(str, Enum):
    """Bloom's Taxonomy cognitive levels used in curriculum analysis."""
    REMEMBER = "remember"
    UNDERSTAND = "understand"
    APPLY = "apply"
    ANALYZE = "analyze"
    EVALUATE = "evaluate"
    CREATE = "create"


class LearningObjective(BaseModel):
    topic: str = Field(..., description="Specific concept or skill, e.g. 'Coffman Deadlock Conditions'")
    description: str = Field(..., description="What the student should be able to do, e.g. 'List and explain all four conditions'")
    bloom_level: BloomLevel = Field(..., description="Bloom's Taxonomy cognitive level required")
    source_page: int = Field(..., ge=1, description="Slide/page number where this concept is taught (from RAG)")


class CurriculumAnalysis(BaseModel):
    lecture_title: str = Field(..., description="Title of the lecture analyzed")
    objectives: List[LearningObjective] = Field(..., min_length=1, description="Extracted learning objectives")
    total_concepts: int = Field(..., ge=1, description="Number of distinct concepts identified")


# ---------------------------------------------------------
# Assessment & Question Schemas
# ---------------------------------------------------------

class QuestionType(str, Enum):
    MULTIPLE_CHOICE = "multiple_choice"
    SHORT_ANSWER = "short_answer"
    FILL_IN_THE_BLANK = "fill_in_the_blank"
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


# ---------------------------------------------------------
# Cohort Analytics Schemas
# ---------------------------------------------------------

class CohortMisconception(BaseModel):
    topic: str = Field(..., description="Concept or topic students struggled with")
    affected_students_count: int = Field(..., ge=0, description="Number of students exhibiting this misconception")
    affected_percentage: float = Field(..., ge=0.0, le=100.0, description="Percentage of the cohort affected")
    sample_gaps: List[str] = Field(default_factory=list, description="Representative gap descriptions from grading reports")
    source_page: Optional[int] = Field(default=None, description="Recommended slide page to review from RAG")


class CriterionMastery(BaseModel):
    criterion_name: str = Field(..., description="Rubric criterion name")
    average_score: float = Field(..., ge=0.0, description="Mean raw score achieved across the cohort")
    max_score: float = Field(..., gt=0.0, description="Max score possible for this criterion")
    mastery_percentage: float = Field(..., ge=0.0, le=100.0, description="Cohort average percentage score on this criterion")
    mastery_level: str = Field(..., description="Mastery tier: High (>=80%), Moderate (60-79%), Low (<60%)")


class CohortAnalyticsReport(BaseModel):
    total_submissions: int = Field(..., ge=0, description="Total number of graded student submissions")
    class_average: float = Field(..., ge=0.0, le=100.0, description="Mean class percentage")
    class_median: float = Field(..., ge=0.0, le=100.0, description="Median class percentage")
    min_score: float = Field(..., ge=0.0, le=100.0, description="Lowest percentage score in cohort")
    max_score: float = Field(..., ge=0.0, le=100.0, description="Highest percentage score in cohort")
    standard_deviation: float = Field(..., ge=0.0, description="Standard deviation of class percentages")
    criterion_masteries: List[CriterionMastery] = Field(default_factory=list, description="Per-criterion cohort mastery breakdown")
    top_misconceptions: List[CohortMisconception] = Field(default_factory=list, description="Most frequent class-wide conceptual gaps")
    recommended_lecture_recap: List[str] = Field(default_factory=list, description="Actionable slide-by-slide teaching prescriptions for the lecturer")

