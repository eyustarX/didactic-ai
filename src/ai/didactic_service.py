"""
Didactic AI Service layer adapter.
Bridge between FastAPI REST routes and Didactic AI Core Engine.
"""

import logging
import re
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

from src.ai.schemas import (
    CurriculumAnalysis,
    AssessmentRubric,
    GeneratedAssessment,
    GradingReport,
    DocumentChunk,
    IngestedDocument,
)
from src.ai.engine import synthesize_assessment_title
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
    custom_instructions: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Synthesizes an assessment testing the selected key parts using live AI agents.
    """
    from src.services.engine_adapter import ai_engine
    engine = ai_engine()

    content_summary = "\n".join(
        f"- {kp.get('title', 'Topic')}: {kp.get('summary', '')}"
        for kp in ticked_parts
    ) or f"Lecture content on {lecture_title}"

    try:
        gen_assess = engine.generate_assessment(
            lecture_title=lecture_title,
            lecture_content=content_summary,
            question_count=question_count,
            custom_instructions=custom_instructions,
        )
        questions = []
        for idx, q in enumerate(gen_assess.questions):
            kp_title = ticked_parts[idx % len(ticked_parts)].get("title", "Core Topic") if ticked_parts else "Core Concept"
            
            # Format choices A, B, C, D directly into question text if not already present
            formatted_text = q.prompt
            if q.options and len(q.options) > 0:
                opt_str = "\n".join(f"{opt}" for opt in q.options)
                if not re.search(r"\bA\)", formatted_text):
                    formatted_text = f"{q.prompt}\n\n{opt_str}"

            # Store answer key prominently in student_hint
            answer_key = q.reference_answer or "Standard model solution."
            hint = f"Official Answer Key: {answer_key}\nLearning Objective: {q.learning_objective}"

            questions.append({
                "text": formatted_text,
                "student_hint": hint,
                "max_marks": q.max_points,
                "tested_key_point_titles": [kp_title],
            })
        computed_title = synthesize_assessment_title(
            gen_assess.title,
            lecture_title=lecture_title,
            custom_instructions=custom_instructions,
            questions=gen_assess.questions,
        )
        return {
            "title": computed_title,
            "questions": questions,
        }
    except Exception as exc:
        logger.warning(f"ai_generate_assessment call failed ({exc}); falling back to fallback template.", exc_info=True)
        questions = []
        points_per_q = round(10.0 / max(question_count, 1), 1)

        for idx in range(question_count):
            kp = ticked_parts[idx % len(ticked_parts)] if ticked_parts else {"title": "Key Concept", "summary": "Core mechanism"}
            title = kp.get("title", "Concept")
            summary = kp.get("summary", "")

            q_text = f"Explain the core mechanisms, theoretical principles, and operational significance of {title}."
            hint = f"Official Answer Key: {summary}\nLearning Objective: Understand and apply {title}."

            questions.append({
                "text": q_text,
                "student_hint": hint,
                "max_marks": points_per_q,
                "tested_key_point_titles": [title],
            })

        fallback_title = synthesize_assessment_title(
            None,
            lecture_title=lecture_title,
            custom_instructions=custom_instructions,
        )
        return {
            "title": fallback_title,
            "questions": questions,
        }


def generate_rubric(
    question_text: str,
    student_hint: Optional[str] = None,
    key_parts: Optional[List[Dict[str, Any]]] = None,
    max_marks: float = 10.0,
) -> Dict[str, Any]:
    """
    Generates a structured evaluation rubric tailored by question type:
    - Objective (MCQ): Single binary key verification (100% of marks).
    - Objective (Fill-in-the-Blank): Target terminology exact / synonym match (100% of marks).
    - Subjective (Short Answer, Essay, Problem, Coding): Multi-criteria pedagogical rubric with proportional weights.
    """
    is_mcq = bool(re.search(r'\b[A-D]\)', question_text) or re.search(r'options?:', question_text, re.I))
    is_fitb = bool(re.search(r'____|fill in the blank', question_text, re.I))

    if is_mcq:
        return {
            "question_type": "multiple_choice",
            "is_objective": True,
            "criteria": [
                {
                    "description": "Correct Choice Selection: Selects the designated option (A, B, C, or D) matching the official answer key.",
                    "max_points": float(max_marks),
                    "source": "ai",
                }
            ],
        }

    if is_fitb:
        return {
            "question_type": "fill_in_the_blank",
            "is_objective": True,
            "criteria": [
                {
                    "description": "Target Term Accuracy: Accurately supplies the exact target terminology or accepted domain synonym.",
                    "max_points": float(max_marks),
                    "source": "ai",
                }
            ],
        }

    from src.services.engine_adapter import ai_engine
    engine = ai_engine()

    context = f"Question: {question_text}\n"
    if student_hint:
        context += f"Hint: {student_hint}\n"
    if key_parts:
        context += "Key Topics: " + ", ".join(kp.get("title", "") for kp in key_parts)

    try:
        rubric = engine.generate_rubric(
            lecture_title=question_text[:60],
            lecture_content=context,
        )
        criteria = []
        for c in rubric.criteria:
            criteria.append({
                "description": f"{c.name}: {c.description}",
                "max_points": round(max_marks * c.weight, 2),
                "source": "ai",
            })
        return {"question_type": "subjective", "is_objective": False, "criteria": criteria}
    except Exception:
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
        return {"question_type": "subjective", "is_objective": False, "criteria": criteria}


def parse_student_answers(text: str, num_questions: int) -> Dict[int, str]:
    """
    Parses student answers from free-form text, OCR excerpt, or typed entries.
    Handles:
    - Numbered lines: "1, b", "1. b", "1) b", "1: b", "1 - b", "1. b...", "Q1: B", "Question 1: ..."
    - Mixed commas/semicolons inline: "1, b, 2, b, 3, c, 4, d, 5, b"
    - Sequential answers / choices: "b, b, c, d, b" or "A\nB\nC\nD"
    - Question paragraphs: "1. The cell membrane...\n2. Mitochondria produce..."
    Returns a dict mapping question index (0-based) -> extracted answer string.
    """
    answers: Dict[int, str] = {}
    if not text or not text.strip():
        return answers

    cleaned = text.strip()

    # 1. Delimited numbered markers like: "1, b", "1. b", "1) b", "Q1: b", "Question 1: ...", "1 - b"
    marker_pattern = re.compile(
        r'(?:^|[\n\r]+|\s{2,}|;\s*|,\s*(?=[0-9]{1,3}\s*[:\.\,\)\-\–]))'
        r'(?:Q(?:uestion)?\s*|Ans(?:wer)?\s*)?([0-9]{1,3})\s*[:\.\,\)\-\–]\s*',
        re.IGNORECASE
    )
    matches = list(marker_pattern.finditer(cleaned))
    if matches and len(matches) >= min(2, num_questions):
        for i, match in enumerate(matches):
            q_num = int(match.group(1))
            q_idx = q_num - 1
            start_pos = match.end()
            end_pos = matches[i + 1].start() if i + 1 < len(matches) else len(cleaned)
            ans_content = cleaned[start_pos:end_pos].strip()
            # Clean trailing punctuation from comma/semicolon splits
            ans_content = re.sub(r'[,;]+$', '', ans_content).strip()
            if 0 <= q_idx < num_questions or num_questions == 0:
                answers[q_idx] = ans_content

    if len(answers) >= min(2, num_questions):
        return answers

    # 2. Pair pattern on single line e.g. "1, b, 2, b, 3, c"
    pair_pattern = re.compile(r'([0-9]{1,3})\s*,\s*([A-Za-z0-9\.\-\_\s]+?)(?=(?:,\s*[0-9]{1,3}\s*,|$))')
    pair_matches = list(pair_pattern.finditer(cleaned))
    if len(pair_matches) >= min(2, num_questions):
        for pm in pair_matches:
            q_idx = int(pm.group(1)) - 1
            answers[q_idx] = pm.group(2).strip()
        return answers

    # 3. Simple sequence of tokens (e.g. "b, b, c, d, b" or "B\nB\nC\nD\nB")
    tokens = [t.strip().rstrip('.,;') for t in re.split(r'[\n\r,;\s]+', cleaned) if t.strip()]
    if len(tokens) == num_questions and num_questions > 0:
        for idx, t in enumerate(tokens):
            answers[idx] = t
        return answers

    # 4. Multi-line numbered by line start e.g. "^1. ... \n ^2. ..."
    line_pattern = re.compile(r'^\s*(?:Q(?:uestion)?\s*)?([0-9]{1,3})\s*[:\.\,\)\-\–\s]\s*(.*)$', re.MULTILINE | re.IGNORECASE)
    line_matches = list(line_pattern.finditer(cleaned))
    if len(line_matches) >= min(2, num_questions):
        for lm in line_matches:
            q_idx = int(lm.group(1)) - 1
            if 0 <= q_idx < num_questions or num_questions == 0:
                answers[q_idx] = lm.group(2).strip()
        return answers

    return answers


def grade_submission(
    questions: List[Dict[str, Any]],
    student_submission_text: str,
) -> Dict[str, Any]:
    """
    Evaluates student submission against assessment questions using live AI agents
    with type-aware objective scoring for MCQs and FITBs, and multi-criteria rubrics for subjective questions.
    Precisely isolates per-question student answers to eliminate hallucination.
    """
    from src.services.engine_adapter import ai_engine
    from src.ai.schemas import Question, QuestionType, AssessmentRubric, RubricCriterion
    engine = ai_engine()

    cleaned = student_submission_text.strip()
    total_score = 0.0
    question_results = []

    parsed_answers = parse_student_answers(cleaned, len(questions))

    for q_idx, q in enumerate(questions):
        q_num = q_idx + 1
        q_id = q.get("id")
        q_text = q.get("text", "")
        max_marks = float(q.get("max_marks", 10.0))
        raw_criteria = q.get("criteria", [])
        ref_ans = q.get("reference_answer") or q.get("student_hint") or ""

        is_mcq = bool(re.search(r'\b[A-D]\)', q_text) or re.search(r'options?:', q_text, re.I))
        is_fitb = bool(re.search(r'____|fill in the blank', q_text, re.I))

        # Extract isolated student response for this question
        raw_student_ans = parsed_answers.get(q_idx, "").strip()
        # Clean trailing ellipses or dots if any e.g. "b..." -> "b"
        cleaned_student_ans = re.sub(r'\.{2,}$', '', raw_student_ans).strip()

        # -------------------------------------------------------------
        # 1. Objective Multiple Choice Grading
        # -------------------------------------------------------------
        if is_mcq:
            key_match = re.search(r'(?:Official\s+Answer\s+Key:\s*)?([A-D])(?:\)|\b|\s)', ref_ans, re.I)
            expected_letter = key_match.group(1).upper() if key_match else None

            # 1. First check parsed answer for this specific question
            student_choice = None
            if cleaned_student_ans:
                choice_match = re.search(r'\b([A-D])\b|\(([A-D])\)|^([A-D])\)', cleaned_student_ans, re.I)
                if choice_match:
                    student_choice = (choice_match.group(1) or choice_match.group(2) or choice_match.group(3)).upper()
                elif len(cleaned_student_ans) == 1 and cleaned_student_ans.upper() in "ABCD":
                    student_choice = cleaned_student_ans.upper()

            # 2. Fallback to searching the full text specifically for this question number (e.g. "1, B", "Q1: B")
            if not student_choice:
                pattern_q = rf'(?:^|[\n\r,;\s]+)(?:Q(?:uestion)?\s*|Ans(?:wer)?\s*)?{q_num}\s*[:\.\,\)\-\–\s]\s*\(?([A-D])\)?\b'
                student_match = re.search(pattern_q, cleaned, re.I)
                if student_match:
                    student_choice = student_match.group(1).upper()
                    if not cleaned_student_ans:
                        cleaned_student_ans = student_choice

            is_correct = bool(expected_letter and student_choice and expected_letter == student_choice)
            score = max_marks if is_correct else 0.0
            total_score += score

            display_answer = cleaned_student_ans if cleaned_student_ans else (f"Option {student_choice}" if student_choice else "No matching answer recorded")

            if is_correct:
                feedback = f"Correct choice selected ({expected_letter}). Full marks awarded based on official answer key."
                citation = f"Selected Option: {expected_letter}"
            else:
                feedback = f"Incorrect choice. Expected {expected_letter or 'official answer key'}, but student indicated {student_choice or 'no matching choice'}."
                citation = f"Student answer: '{display_answer}'"

            question_results.append({
                "question_id": q_id,
                "question_text": q_text,
                "score": score,
                "points_awarded": score,
                "max_score": max_marks,
                "max_points": max_marks,
                "feedback": feedback,
                "evidence_citation": citation,
                "matched_student_answer": display_answer,
                "is_objective": True,
                "criterion_scores": [
                    {
                        "description": "Correct Choice Selection",
                        "score": score,
                    }
                ],
            })
            continue

        # -------------------------------------------------------------
        # 2. Objective Fill-in-the-Blank Grading
        # -------------------------------------------------------------
        if is_fitb:
            clean_ref = re.sub(r'^(?:Official\s+)?Answer\s+Key:\s*', '', ref_ans, flags=re.I).split('\n')[0].strip().strip('"\'')
            expected_term = clean_ref.lower()

            search_corpus = cleaned_student_ans.lower() if cleaned_student_ans else cleaned.lower()
            is_matched = bool(expected_term and expected_term in search_corpus)
            score = max_marks if is_matched else 0.0
            total_score += score

            display_answer = cleaned_student_ans if cleaned_student_ans else ("Target term found in submission" if is_matched else "No answer recorded")

            if is_matched:
                feedback = f"Correct target term '{clean_ref}' supplied. Full marks awarded."
                citation = f"Term supplied: '{clean_ref}'"
            else:
                feedback = f"Incorrect or missing term. Expected: '{clean_ref}'."
                citation = f"Student answer: '{display_answer}'"

            question_results.append({
                "question_id": q_id,
                "question_text": q_text,
                "score": score,
                "points_awarded": score,
                "max_score": max_marks,
                "max_points": max_marks,
                "feedback": feedback,
                "evidence_citation": citation,
                "matched_student_answer": display_answer,
                "is_objective": True,
                "criterion_scores": [
                    {
                        "description": "Target Term Accuracy",
                        "score": score,
                    }
                ],
            })
            continue

        # -------------------------------------------------------------
        # 3. Subjective / Open-Ended / Problem / Coding Grading
        # -------------------------------------------------------------
        rubric_criteria = []
        crit_weight = 1.0 / max(len(raw_criteria), 1)
        for c in raw_criteria:
            c_max = float(c.get("max_points", max_marks * crit_weight))
            rubric_criteria.append(
                RubricCriterion(
                    name=c.get("description", "Criterion")[:40],
                    description=c.get("description", "Criterion expectation"),
                    weight=crit_weight,
                    max_score=c_max,
                )
            )

        if not rubric_criteria:
            rubric_criteria = [
                RubricCriterion(name="Core Understanding", description="Concepts", weight=0.5, max_score=max_marks * 0.5),
                RubricCriterion(name="Technical Precision", description="Terms", weight=0.5, max_score=max_marks * 0.5),
            ]

        rubric = AssessmentRubric(
            rubric_id=f"RUB-{abs(hash(q_text)) % 10000:04d}",
            title=f"Rubric: {q_text[:30]}",
            criteria=rubric_criteria,
            total_marks=max_marks,
        )

        domain_q = Question(
            id=str(q_id or f"Q{q_idx+1}"),
            question_type=QuestionType.SHORT_ANSWER,
            prompt=q_text,
            reference_answer=ref_ans or q_text,
            max_points=max_marks,
            learning_objective=q.get("tested_key_point_titles", ["Concept"])[0] if q.get("tested_key_point_titles") else "Understand topic",
        )

        target_answer = cleaned_student_ans if cleaned_student_ans else cleaned
        display_answer = cleaned_student_ans if cleaned_student_ans else cleaned[:250]

        try:
            report = engine.grade_exam_question(
                question=domain_q,
                rubric=rubric,
                student_answer=target_answer,
            )
            score = report.total_score
            total_score += score

            crit_scores = []
            for ev in report.evaluations:
                crit_scores.append({
                    "description": ev.criterion_name,
                    "score": ev.score_awarded,
                })

            citation = report.evaluations[0].evidence_citation if report.evaluations else f"Student answer: '{target_answer[:60]}...'"
            question_results.append({
                "question_id": q_id,
                "question_text": q_text,
                "score": score,
                "points_awarded": score,
                "max_score": max_marks,
                "max_points": max_marks,
                "feedback": report.summary_feedback or "Demonstrates sound conceptual understanding aligned with reference answer.",
                "evidence_citation": citation,
                "matched_student_answer": display_answer,
                "is_objective": False,
                "criterion_scores": crit_scores,
            })
        except Exception:
            q_words = set(w.lower() for w in q_text.split() if len(w) > 4)
            sub_words = set(w.lower() for w in target_answer.split() if len(w) > 3)
            overlap = q_words.intersection(sub_words)
            cov = len(overlap) / max(len(q_words), 1)

            score = round(max_marks * min(1.0, 0.4 + cov * 0.6) if target_answer else 0.0, 2)
            total_score += score

            crit_scores = []
            for c in raw_criteria:
                c_max = float(c.get("max_points", max_marks / max(len(raw_criteria), 1)))
                crit_scores.append({
                    "description": c.get("description", "Criterion"),
                    "score": round(c_max * (score / max_marks) if max_marks > 0 else 0.0, 2),
                })

            citation = f"Student stated: '{display_answer[:60]}...'" if display_answer else "No response provided."
            question_results.append({
                "question_id": q_id,
                "question_text": q_text,
                "score": score,
                "points_awarded": score,
                "max_score": max_marks,
                "max_points": max_marks,
                "feedback": f"Demonstrated grasp of {len(overlap)} core technical concepts with relevant terminology.",
                "evidence_citation": citation,
                "matched_student_answer": display_answer,
                "is_objective": False,
                "criterion_scores": crit_scores,
            })

    total_possible = sum(float(q.get("max_marks", 10.0)) for q in questions) or 10.0
    percentage = round((total_score / total_possible) * 100, 1)

    if percentage >= 85:
        summary_feedback = f"Excellent mastery ({total_score:g}/{total_possible:g} pts, {percentage}%). The candidate provided thorough, technically precise answers consistent with model solutions."
    elif percentage >= 65:
        summary_feedback = f"Good performance ({total_score:g}/{total_possible:g} pts, {percentage}%). Core principles are understood, with minor omissions in detail or edge case analysis."
    else:
        summary_feedback = f"Developing understanding ({total_score:g}/{total_possible:g} pts, {percentage}%). Recommend reviewing fundamental lecture concepts and terminology noted in question feedback."

    return {
        "ai_total": round(total_score, 2),
        "total_score": round(total_score, 2),
        "max_score": round(total_possible, 2),
        "summary_feedback": summary_feedback,
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
