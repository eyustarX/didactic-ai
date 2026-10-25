"""
Didactic AI Service layer adapter.
Bridge between FastAPI REST routes and Didactic AI Core Engine.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from src.ai.schemas import (
    CurriculumAnalysis,
    AssessmentRubric,
    GeneratedAssessment,
    GradingReport,
    DocumentChunk,
    IngestedDocument,
)
from src.ai.agents import (
    CurriculumAgent,
    RubricAgent,
    AssessmentAgent,
    GradingAgent,
    AuditorAgent,
    MultiAgentCoordinator,
    create_coordinator,
)
from src.ai.ingest import clean_text, chunk_document


class KeyPartItem(BaseModel):
    title: str
    summary: str
    type: str = "concept"
    source_ref: str = "lecture notes"
    included: bool = True
    source: str = "ai"


class KeyPartsList(BaseModel):
    key_parts: List[KeyPartItem] = Field(default_factory=list)


class AssessmentQuestionItem(BaseModel):
    text: str
    student_hint: Optional[str] = None
    max_marks: float = 10.0
    tested_key_point_titles: List[str] = Field(default_factory=list)


class AssessmentOutput(BaseModel):
    title: str
    questions: List[AssessmentQuestionItem] = Field(default_factory=list)


class RubricCriterionItem(BaseModel):
    description: str
    max_points: float = 2.5
    source: str = "ai"


class RubricOutput(BaseModel):
    criteria: List[RubricCriterionItem] = Field(default_factory=list)


class QuestionGradingResult(BaseModel):
    question_id: Optional[str] = None
    score: float
    max_score: float
    feedback: str
    evidence_citation: str = ""
    criterion_scores: List[Dict[str, Any]] = Field(default_factory=list)


class SubmissionGradingOutput(BaseModel):
    ai_total: float
    question_results: List[QuestionGradingResult] = Field(default_factory=list)


def extract_key_parts(
    lecture_title: str,
    text: str,
    sections: Optional[List[Dict[str, Any]]] = None,
) -> List[Dict[str, Any]]:
    """
    Extracts key curriculum topics and learning objectives from lecture text.
    """
    cleaned = clean_text(text)
    if not cleaned:
        return []

    lines = [line.strip() for line in cleaned.split("\n") if line.strip()]
    raw_sections = [s for s in lines if len(s) > 10]
    pages_text = [(idx + 1, sec) for idx, sec in enumerate(raw_sections[:8])] or [(1, cleaned)]
    doc = chunk_document(pages_text, filename=f"{lecture_title}.pdf")

    agent = CurriculumAgent(retriever=None)
    curriculum = agent.extract_objectives(lecture_title=lecture_title, document=doc)

    results = []
    for idx, obj in enumerate(curriculum.objectives):
        results.append({
            "title": obj.topic,
            "summary": obj.description,
            "type": obj.bloom_level.value,
            "source_ref": f"Slide {obj.source_page}",
            "included": True,
            "source": "ai",
        })
    return results


def generate_assessment(
    lecture_title: str,
    ticked_parts: List[Dict[str, Any]],
    question_count: int = 3,
) -> Dict[str, Any]:
    """
    Synthesizes an assessment testing the selected key parts.
    """
    questions = []
    points_per_q = round(10.0 / max(question_count, 1), 1)

    for idx in range(question_count):
        kp = ticked_parts[idx % len(ticked_parts)] if ticked_parts else {"title": "Key Concept", "summary": "Core mechanism"}
        title = kp.get("title", "Concept")
        summary = kp.get("summary", "")

        q_text = f"Explain the core mechanisms and significance of {title}. {summary}"
        hint = f"Focus on definition, operation, and edge cases for {title}."

        questions.append({
            "text": q_text,
            "student_hint": hint,
            "max_marks": points_per_q,
            "tested_key_point_titles": [title],
        })

    return {
        "title": f"Assessment: {lecture_title}",
        "questions": questions,
    }


def generate_rubric(
    question_text: str,
    student_hint: Optional[str] = None,
    key_parts: Optional[List[Dict[str, Any]]] = None,
    max_marks: float = 10.0,
) -> Dict[str, Any]:
    """
    Generates a structured rubric for a question.
    """
    p1 = round(max_marks * 0.40, 2)
    p2 = round(max_marks * 0.30, 2)
    p3 = round(max_marks - p1 - p2, 2)

    criteria = [
        {
            "description": f"Core Conceptual Understanding: Accurately explains fundamental principles addressed in '{question_text[:50]}...'",
            "max_points": p1,
            "source": "ai",
        },
        {
            "description": "Technical Precision & Terminology: Uses domain-specific academic terminology without vague assertions.",
            "max_points": p2,
            "source": "ai",
        },
        {
            "description": "Critical Analysis & Application: Evaluates constraints, mechanics, or edge cases accurately.",
            "max_points": p3,
            "source": "ai",
        },
    ]
    return {"criteria": criteria}


def grade_submission(
    questions: List[Dict[str, Any]],
    student_submission_text: str,
) -> Dict[str, Any]:
    """
    Evaluates student submission against assessment questions.
    """
    cleaned = student_submission_text.strip()
    total_score = 0.0
    question_results = []

    for q in questions:
        q_id = q.get("id")
        q_text = q.get("text", "")
        max_marks = float(q.get("max_marks", 10.0))
        criteria = q.get("criteria", [])

        # Word overlap evaluation
        q_words = set(w.lower() for w in q_text.split() if len(w) > 4)
        sub_words = set(w.lower() for w in cleaned.split() if len(w) > 3)
        overlap = q_words.intersection(sub_words)
        cov = len(overlap) / max(len(q_words), 1)

        score = round(max_marks * min(1.0, 0.4 + cov * 0.6) if cleaned else 0.0, 2)
        total_score += score

        crit_scores = []
        for c in criteria:
            c_max = float(c.get("max_points", max_marks / max(len(criteria), 1)))
            crit_scores.append({
                "description": c.get("description", "Criterion"),
                "score": round(c_max * (score / max_marks) if max_marks > 0 else 0.0, 2),
            })

        sentences = [s.strip() for s in cleaned.split(".") if len(s.strip()) > 5]
        citation = f"Student stated: '{sentences[0]}'" if sentences else "No substantial response provided."

        question_results.append({
            "question_id": q_id,
            "score": score,
            "max_score": max_marks,
            "feedback": f"Demonstrated grasp of {len(overlap)} key technical terms.",
            "evidence_citation": citation,
            "criterion_scores": crit_scores,
        })

    return {
        "ai_total": round(total_score, 2),
        "question_results": question_results,
    }


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
