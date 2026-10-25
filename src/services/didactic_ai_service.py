"""
Didactic AI Service layer adapter.
Re-exports core operations directly from src.ai.didactic_service.
"""

from src.ai.didactic_service import (
    KeyPartItem,
    KeyPartsList,
    AssessmentQuestionItem,
    AssessmentOutput,
    RubricCriterionItem,
    RubricOutput,
    QuestionGradingResult,
    SubmissionGradingOutput,
    extract_key_parts,
    generate_assessment,
    generate_rubric,
    grade_submission,
)

__all__ = [
    "KeyPartItem",
    "KeyPartsList",
    "AssessmentQuestionItem",
    "AssessmentOutput",
    "RubricCriterionItem",
    "RubricOutput",
    "QuestionGradingResult",
    "SubmissionGradingOutput",
    "extract_key_parts",
    "generate_assessment",
    "generate_rubric",
    "grade_submission",
]
