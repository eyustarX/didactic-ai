"""
System prompts and reasoning templates for Didactic AI.
Guides LLMs through structured academic tasks:
1. Rubric Generation from lecture material
2. Assessment / Exam Generation with authoritative answer keys
3. Decomposed Question-Level Exam Grading
4. Holistic Multi-Criterion Assignment & Project Grading
"""

from typing import Optional
from src.ai.schemas import AssessmentRubric, Question, StudentSubmission


# ---------------------------------------------------------------------------
# Base Academic Persona
# ---------------------------------------------------------------------------
SYSTEM_BASE_INSTRUCTION = """You are Didactic AI, an expert academic evaluation and curriculum assistant designed for university professors and lecturers.

Your operational principles:
1. Academic Rigor: Evaluate strictly on factual evidence and verified concepts.
2. Fairness & Consistency: Apply identical, objective criteria across all submissions regardless of writing style or length.
3. Grounding & Anti-Hallucination: Never invent facts or expectations not found in the reference lecture materials or assignment brief.
4. Constructive Pedagogy: Provide clear, actionable feedback with specific citations so students understand how to improve.
"""


# ---------------------------------------------------------------------------
# 1. Rubric Generation Prompt
# ---------------------------------------------------------------------------
RUBRIC_GENERATION_PROMPT_TEMPLATE = """You are tasked with generating a fair, standardized grading rubric based on the lecture material below.

--- LECTURE TOPIC ---
{lecture_title}

--- LECTURE CONTENT ---
{lecture_content}
--- END LECTURE CONTENT ---

Instructions:
1. Identify the core learning objectives taught in this lecture.
2. Formulate 3 to 4 distinct grading criteria (e.g., Conceptual Accuracy, Technical Terminology, Practical Application / Edge Cases).
3. For each criterion:
   - Provide a concise name and detailed description of expectations.
   - Assign a normalized weight between 0.0 and 1.0. The sum of all weights across all criteria MUST equal exactly 1.0.
   - Assign a maximum raw score (e.g., 5.0, 10.0, or 20.0).
4. Output the result matching the AssessmentRubric schema.
"""


# ---------------------------------------------------------------------------
# 2. Assessment / Exam Generation Prompt
# ---------------------------------------------------------------------------
ASSESSMENT_GENERATION_PROMPT_TEMPLATE = """Using the lecture content provided below, generate an assessment consisting of {question_count} high-quality questions for "{lecture_title}".

--- LECTURE CONTENT ---
{lecture_content}
--- END LECTURE CONTENT ---

Instructions:
1. Formulate questions covering varied levels of Bloom's Taxonomy (understanding, application, analysis).
2. Use appropriate QuestionTypes (multiple_choice, short_answer, essay, or code_analysis).
3. For multiple-choice questions, provide 4 options where only one is demonstrably correct.
4. For EVERY question, write an authoritative "reference_answer" that serves as the official answer key derived directly from the lecture notes.
5. Allocate positive max_points for each question reflecting its depth and complexity.
6. Specify the learning_objective being evaluated.
"""


# ---------------------------------------------------------------------------
# 3. Decomposed Question-Level Exam Grading Prompt
# ---------------------------------------------------------------------------
EXAM_QUESTION_GRADING_PROMPT_TEMPLATE = """Evaluate the student's answer to the specific exam question below using the reference answer key and the rubric criteria.

--- QUESTION (Max Points: {max_points}) ---
{question_prompt}

--- REFERENCE ANSWER (OFFICIAL ANSWER KEY) ---
{reference_answer}

--- GRADING RUBRIC ---
{rubric_criteria_text}

--- STUDENT SUBMISSION ---
{student_answer}

Follow this strict multi-step reasoning workflow:
Step 1: Identify and isolate the core technical claims made in the student's answer.
Step 2: Compare each claim directly against the official reference answer.
Step 3: For each rubric criterion:
  - Extract exact quotes or code phrases from the student's answer as "evidence_citation".
  - If a concept is correct, add it to "strengths".
  - If a concept is missing, incorrect, or ambiguous, add it to "gaps".
  - Award a fair "score_awarded" based strictly on the evidence and criterion max_score.
Step 4: Calculate total_score, max_possible_score, and percentage.
Step 5: Provide a constructive summary and list specific areas the student should review.
"""


# ---------------------------------------------------------------------------
# 4. Full Assignment / Project Grading Prompt
# ---------------------------------------------------------------------------
ASSIGNMENT_GRADING_PROMPT_TEMPLATE = """You are evaluating a complete student assignment submission for: "{assignment_title}".

--- ASSIGNMENT SPECIFICATION & INSTRUCTIONS ---
{assignment_instructions}

--- GRADING RUBRIC ---
{rubric_criteria_text}

--- STUDENT SUBMISSION ---
{student_submission}

Follow this holistic, evidence-grounded assignment evaluation workflow:
Step 1: Thoroughly read the student's submission against the assignment instructions.
Step 2: For EACH rubric criterion:
  - Extract direct textual quotes or code references from the submission into "evidence_citation".
  - List tangible student achievements under "strengths".
  - Document specific omitted requirements, logical flaws, or misunderstandings under "gaps".
  - Compute "score_awarded" reflecting the student's demonstrated competence.
Step 3: Calculate the total final score and overall percentage.
Step 4: Write comprehensive "summary_feedback" highlighting major takeaways.
Step 5: Provide actionable "areas_to_review" directing the student to specific topics or chapters.
"""


# ---------------------------------------------------------------------------
# Formatter Helper Functions
# ---------------------------------------------------------------------------

def format_rubric_criteria_for_prompt(rubric: AssessmentRubric) -> str:
    """Formats an AssessmentRubric into a clear text table for the LLM."""
    lines = [f"Rubric: {rubric.title} (ID: {rubric.rubric_id})"]
    for idx, c in enumerate(rubric.criteria, start=1):
        lines.append(
            f"{idx}. {c.name} | Max Score: {c.max_score} | Weight: {c.weight:.2f}\n"
            f"   Expectations: {c.description}"
        )
    return "\n".join(lines)


def format_rubric_generation_prompt(lecture_title: str, lecture_content: str) -> str:
    """Formats the prompt for generating an assessment rubric from lecture notes."""
    return RUBRIC_GENERATION_PROMPT_TEMPLATE.format(
        lecture_title=lecture_title,
        lecture_content=lecture_content.strip(),
    )


def format_assessment_generation_prompt(
    lecture_title: str, 
    lecture_content: str, 
    question_count: int = 5
) -> str:
    """Formats the prompt for generating exam questions and answer keys."""
    return ASSESSMENT_GENERATION_PROMPT_TEMPLATE.format(
        lecture_title=lecture_title,
        lecture_content=lecture_content.strip(),
        question_count=question_count,
    )


def format_exam_grading_prompt(
    question: Question, 
    rubric: AssessmentRubric, 
    student_answer: str
) -> str:
    """Formats the prompt for evaluating a single student exam answer."""
    return EXAM_QUESTION_GRADING_PROMPT_TEMPLATE.format(
        max_points=question.max_points,
        question_prompt=question.prompt,
        reference_answer=question.reference_answer,
        rubric_criteria_text=format_rubric_criteria_for_prompt(rubric),
        student_answer=student_answer.strip(),
    )


def format_assignment_grading_prompt(
    assignment_title: str,
    assignment_instructions: str,
    rubric: AssessmentRubric,
    student_submission: str
) -> str:
    """Formats the prompt for evaluating a full student project or assignment."""
    return ASSIGNMENT_GRADING_PROMPT_TEMPLATE.format(
        assignment_title=assignment_title,
        assignment_instructions=assignment_instructions.strip(),
        rubric_criteria_text=format_rubric_criteria_for_prompt(rubric),
        student_submission=student_submission.strip(),
    )
