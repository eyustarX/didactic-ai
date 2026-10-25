"""
Core AI Engine and Provider Architecture for Didactic AI.

Implements the Strategy Pattern (BaseLLMProvider) supporting:
1. MockLLMProvider: 100% free, offline deterministic simulator for instant testing and CI/CD.
2. GeminiLiveProvider: Free live API provider via Google AI Studio (zero credit card needed).
3. BedrockLiveProvider: Production-ready AWS Bedrock Converse API adapter via boto3.
"""

import os
import json
import re
import urllib.request
import urllib.error
from abc import ABC, abstractmethod
from typing import Optional, List, Dict, Any

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from src.ai.schemas import (
    AssessmentRubric,
    RubricCriterion,
    GeneratedAssessment,
    Question,
    QuestionType,
    GradingReport,
    CriterionEvaluation,
)
from src.ai.prompts import (
    SYSTEM_BASE_INSTRUCTION,
    format_rubric_generation_prompt,
    format_assessment_generation_prompt,
    format_exam_grading_prompt,
    format_assignment_grading_prompt,
)


# ---------------------------------------------------------------------------
# Abstract Provider Interface
# ---------------------------------------------------------------------------

class BaseLLMProvider(ABC):
    """Abstract contract for all Didactic AI model providers."""

    @abstractmethod
    def generate_rubric(self, lecture_title: str, lecture_content: str) -> AssessmentRubric:
        """Extracts key concepts and generates a standardized grading rubric."""
        pass

    @abstractmethod
    def generate_assessment(
        self, lecture_title: str, lecture_content: str, question_count: int = 3
    ) -> GeneratedAssessment:
        """Generates exam questions with official answer keys from lecture content."""
        pass

    @abstractmethod
    def grade_exam_question(
        self, question: Question, rubric: AssessmentRubric, student_answer: str
    ) -> GradingReport:
        """Grades a single student question response using decomposed reasoning."""
        pass

    @abstractmethod
    def grade_assignment(
        self, assignment_title: str, assignment_instructions: str, rubric: AssessmentRubric, student_submission: str
    ) -> GradingReport:
        """Grades a full assignment or project report against a holistic rubric."""
        pass


# ---------------------------------------------------------------------------
# 1. MockLLMProvider (100% Free, Offline Simulator)
# ---------------------------------------------------------------------------

class MockLLMProvider(BaseLLMProvider):
    """
    High-fidelity offline simulator.
    Performs deterministic NLP analysis, extracts verbatim citations,
    and returns 100% valid Pydantic domain models without internet or API keys.
    """

    def generate_rubric(self, lecture_title: str, lecture_content: str) -> AssessmentRubric:
        rubric_id = f"RUB-{abs(hash(lecture_title)) % 10000:04d}"
        criteria = [
            RubricCriterion(
                name="Core Conceptual Understanding",
                description=f"Demonstrates sound knowledge of fundamental principles covered in '{lecture_title}'.",
                weight=0.45,
                max_score=4.5,
            ),
            RubricCriterion(
                name="Technical Precision & Terminology",
                description="Uses domain-specific technical terminology accurately without vague generalizations.",
                weight=0.35,
                max_score=3.5,
            ),
            RubricCriterion(
                name="Practical Application & Edge Cases",
                description="Correctly addresses practical implications, constraints, or corner conditions.",
                weight=0.20,
                max_score=2.0,
            ),
        ]
        return AssessmentRubric(
            rubric_id=rubric_id,
            title=f"Standardized Rubric for {lecture_title}",
            criteria=criteria,
        )

    def generate_assessment(
        self, lecture_title: str, lecture_content: str, question_count: int = 3
    ) -> GeneratedAssessment:
        questions: List[Question] = []
        
        # Extract sample sentences or key terms from lecture
        content_lines = [line.strip() for line in lecture_content.splitlines() if len(line.strip()) > 20]
        ref_text = content_lines[0] if content_lines else f"Key concept in {lecture_title}."

        q1 = Question(
            id="Q1",
            question_type=QuestionType.SHORT_ANSWER,
            prompt=f"Explain the primary purpose and mechanism of {lecture_title}.",
            reference_answer=ref_text,
            max_points=5.0,
            learning_objective=f"Understand core mechanisms of {lecture_title}",
        )
        questions.append(q1)

        if question_count >= 2:
            q2 = Question(
                id="Q2",
                question_type=QuestionType.MULTIPLE_CHOICE,
                prompt=f"Which of the following is a primary characteristic of {lecture_title}?",
                options=[
                    "It ensures deterministic execution and consistency",
                    "It eliminates all hardware dependencies completely",
                    "It replaces the need for any storage media",
                    "It guarantees infinite processing bandwidth",
                ],
                reference_answer="It ensures deterministic execution and consistency",
                max_points=2.5,
                learning_objective=f"Identify key properties of {lecture_title}",
            )
            questions.append(q2)

        if question_count >= 3:
            q3 = Question(
                id="Q3",
                question_type=QuestionType.ESSAY,
                prompt=f"Analyze potential edge cases, trade-offs, and failure modes when applying {lecture_title}.",
                reference_answer=f"When implementing {lecture_title}, key trade-offs include latency vs. consistency, resource overhead, and failure recovery handling.",
                max_points=7.5,
                learning_objective=f"Evaluate trade-offs and edge cases in {lecture_title}",
            )
            questions.append(q3)

        total_pts = sum(q.max_points for q in questions)
        return GeneratedAssessment(
            title=f"Assessment: {lecture_title}",
            course_name="Computer Science & Engineering",
            source_document="lecture_notes.pdf",
            questions=questions,
            total_points=total_pts,
        )

    def grade_exam_question(
        self, question: Question, rubric: AssessmentRubric, student_answer: str
    ) -> GradingReport:
        cleaned_answer = student_answer.strip()
        answer_words = set(re.findall(r"\w+", cleaned_answer.lower()))
        ref_words = set(re.findall(r"\w+", question.reference_answer.lower()))
        
        # Calculate semantic keyword overlap
        overlap = answer_words.intersection(ref_words)
        coverage_ratio = len(overlap) / max(len(ref_words), 1)

        # Extract real citation quote from student answer
        sentences = [s.strip() for s in re.split(r"[.!?\n]", cleaned_answer) if s.strip()]
        citation = f"Student wrote: '{sentences[0]}'" if sentences else "No substantial response provided."

        evaluations: List[CriterionEvaluation] = []
        total_awarded = 0.0

        for c in rubric.criteria:
            # Score awarded is proportional to coverage
            score = round(min(c.max_score, max(0.5, c.max_score * min(1.0, coverage_ratio + 0.3))), 2)
            total_awarded += score

            strengths = [f"Directly addressed concepts matching: {', '.join(list(overlap)[:3])}"] if overlap else ["Attempted the question"]
            gaps = [f"Could elaborate more on: {c.name}"] if coverage_ratio < 0.7 else []

            evaluations.append(
                CriterionEvaluation(
                    criterion_name=c.name,
                    score_awarded=score,
                    max_score=c.max_score,
                    strengths=strengths,
                    gaps=gaps,
                    evidence_citation=citation,
                )
            )

        max_possible = sum(c.max_score for c in rubric.criteria)
        percentage = round((total_awarded / max_possible) * 100, 1)

        return GradingReport(
            submission_id=f"SUB-{abs(hash(student_answer)) % 10000:04d}",
            student_id="STUDENT-DEMO",
            total_score=round(total_awarded, 2),
            max_possible_score=round(max_possible, 2),
            percentage=percentage,
            summary_feedback=f"Good effort. The response demonstrates basic conceptual clarity with {len(overlap)} matching core technical terms.",
            evaluations=evaluations,
            areas_to_review=["Review technical terminology in reference materials", "Deepen coverage of edge cases"],
        )

    def grade_assignment(
        self, assignment_title: str, assignment_instructions: str, rubric: AssessmentRubric, student_submission: str
    ) -> GradingReport:
        cleaned_sub = student_submission.strip()
        sub_words = set(re.findall(r"\w+", cleaned_sub.lower()))
        instruct_words = set(re.findall(r"\w+", assignment_instructions.lower()))

        # Extract real excerpt for citation
        sentences = [s.strip() for s in re.split(r"[.!?\n]", cleaned_sub) if s.strip()]
        citation = f"Submission excerpt: '{sentences[0]}'" if sentences else "Empty submission."

        # Extract key concept targets from instructions and criteria
        instruct_words = set(re.findall(r"\w+", assignment_instructions.lower()))
        crit_words = set(re.findall(r"\w+", " ".join(c.name + " " + c.description for c in rubric.criteria).lower()))
        target_words = instruct_words.union(crit_words)
        stopwords = {"the", "a", "an", "and", "or", "in", "on", "of", "to", "for", "with", "is", "are", "that", "this", "all", "each", "from"}
        meaningful_targets = [w for w in target_words if len(w) > 3 and w not in stopwords]

        matched = [w for w in meaningful_targets if w in cleaned_sub.lower()]
        concept_coverage = len(matched) / max(len(meaningful_targets), 1)

        evaluations: List[CriterionEvaluation] = []
        total_awarded = 0.0

        for idx, c in enumerate(rubric.criteria):
            if concept_coverage >= 0.45:  # Exemplary (e.g., Alice)
                ratio = min(1.0, 0.85 + (concept_coverage - 0.45) * 0.35)
                strengths = [
                    f"Thoroughly addressed requirements of '{c.name}'.",
                    f"Demonstrated solid grasp of key principles ({', '.join(matched[:4])})."
                ]
                gaps = ["Minor formatting or stylistic refinements recommended."]
            elif concept_coverage >= 0.22:  # Average (e.g., Bob)
                ratio = 0.62 + (concept_coverage - 0.22) * 0.4
                strengths = [f"Covered basic concepts for '{c.name}' ({', '.join(matched[:2])})."]
                gaps = [f"Lacks depth on specific mechanics or edge cases for '{c.name}'."]
            else:  # Substandard (e.g., Charlie)
                ratio = max(0.25, concept_coverage * 1.5)
                strengths = ["Attempted submission."]
                gaps = [f"Severe conceptual gaps or erroneous assertions regarding '{c.name}'."]

            score = round(c.max_score * ratio, 2)
            total_awarded += score

            evaluations.append(
                CriterionEvaluation(
                    criterion_name=c.name,
                    score_awarded=score,
                    max_score=c.max_score,
                    strengths=strengths,
                    gaps=gaps,
                    evidence_citation=citation,
                )
            )

        max_possible = sum(c.max_score for c in rubric.criteria)
        percentage = round((total_awarded / max_possible) * 100, 1)

        if percentage >= 80.0:
            summary = f"Exemplary submission for '{assignment_title}'. Technical precision and rubric requirements were thoroughly satisfied."
            review = ["Continue with advanced concurrency topics (e.g., lock-free data structures)."]
        elif percentage >= 60.0:
            summary = f"Satisfactory submission for '{assignment_title}'. Basic requirements were met, but several technical details and edge cases were omitted."
            review = ["Review Coffman deadlock conditions", "Refine explanation of mutex ownership vs semaphore signaling."]
        else:
            summary = f"Substandard submission for '{assignment_title}'. Significant misconceptions and missing criteria detected."
            review = ["Mandatory review of Chapter 7 lecture notes on concurrency primitives and deadlock conditions."]

        return GradingReport(
            submission_id=f"SUB-ASSIGN-{abs(hash(student_submission)) % 10000:04d}",
            student_id="STUDENT-DEMO",
            total_score=round(total_awarded, 2),
            max_possible_score=round(max_possible, 2),
            percentage=percentage,
            summary_feedback=summary,
            evaluations=evaluations,
            areas_to_review=review,
        )


# ---------------------------------------------------------------------------
# 2. GeminiLiveProvider (Free Live API via Google AI Studio)
# ---------------------------------------------------------------------------

class GeminiLiveProvider(BaseLLMProvider):
    """
    Zero-credit-card live LLM provider using Google Gemini 1.5/2.0 Flash.
    Uses Python standard library (urllib) to guarantee zero extra dependencies.
    """

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY", "")
        self.model = model or os.getenv("GEMINI_MODEL", "gemini-flash-lite-latest")
        self.base_url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent"

    def _call_gemini_json(self, prompt: str, schema_dict: Dict[str, Any]) -> Dict[str, Any]:
        """Calls Gemini with strict JSON schema enforcement."""
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY is not set. Use MockLLMProvider or set GEMINI_API_KEY.")

        url = f"{self.base_url}?key={self.api_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "systemInstruction": {"parts": [{"text": SYSTEM_BASE_INSTRUCTION}]},
            "generationConfig": {
                "responseMimeType": "application/json",
                "temperature": 0.2,
            },
        }

        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        with urllib.request.urlopen(req, timeout=30) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            raw_text = res_data["candidates"][0]["content"]["parts"][0]["text"].strip()
            if raw_text.startswith("```json"):
                raw_text = raw_text[7:]
            elif raw_text.startswith("```"):
                raw_text = raw_text[3:]
            if raw_text.endswith("```"):
                raw_text = raw_text[:-3]
            return json.loads(raw_text.strip())

    def generate_rubric(self, lecture_title: str, lecture_content: str) -> AssessmentRubric:
        prompt = format_rubric_generation_prompt(lecture_title, lecture_content)
        data = self._call_gemini_json(prompt, AssessmentRubric.model_json_schema())
        if "assessment_rubric" in data and isinstance(data["assessment_rubric"], dict):
            data = data["assessment_rubric"]
        elif "rubric" in data and isinstance(data["rubric"], dict):
            data = data["rubric"]
        if "rubric_id" not in data or not data["rubric_id"]:
            data["rubric_id"] = f"RUB-{abs(hash(lecture_title)) % 10000:04d}"
        if "title" not in data or not data["title"]:
            data["title"] = f"Rubric: {lecture_title}"
        if "criteria" in data and isinstance(data["criteria"], list):
            for c in data["criteria"]:
                if isinstance(c, dict) and "max_score" not in c and "max_raw_score" in c:
                    c["max_score"] = c["max_raw_score"]
        return AssessmentRubric.model_validate(data)

    def generate_assessment(
        self, lecture_title: str, lecture_content: str, question_count: int = 3
    ) -> GeneratedAssessment:
        prompt = format_assessment_generation_prompt(lecture_title, lecture_content, question_count)
        data = self._call_gemini_json(prompt, GeneratedAssessment.model_json_schema())
        if isinstance(data, list):
            data = {"questions": data}
        elif isinstance(data, dict):
            if "generated_assessment" in data and isinstance(data["generated_assessment"], dict):
                data = data["generated_assessment"]
            elif "assessment" in data and isinstance(data["assessment"], dict):
                data = data["assessment"]

        if not isinstance(data, dict):
            data = {"questions": []}

        if "questions" in data and isinstance(data["questions"], list):
            for idx, q in enumerate(data["questions"]):
                if isinstance(q, dict):
                    if "id" not in q or not q["id"]:
                        q["id"] = q.get("question_id") or f"Q{idx + 1}"
                    if "prompt" not in q or not q["prompt"]:
                        q["prompt"] = q.get("question_text") or q.get("question") or f"Explain the concept of {lecture_title}."
                    if "reference_answer" not in q or not q["reference_answer"]:
                        q["reference_answer"] = q.get("answer_key") or q.get("correct_answer") or q.get("answer") or "See lecture notes."
                    if "max_points" not in q and "points" in q:
                        q["max_points"] = q["points"]
                    elif "max_points" not in q:
                        q["max_points"] = 5.0
                    if "question_type" not in q:
                        q["question_type"] = "short_answer"
                    if "learning_objective" not in q or not q["learning_objective"]:
                        q["learning_objective"] = f"Understand {lecture_title}"

        total_pts = sum(q.get("max_points", 5.0) for q in data.get("questions", []))
        if "total_points" not in data or not data["total_points"]:
            data["total_points"] = max(1.0, float(total_pts))
        if "title" not in data or not data["title"]:
            data["title"] = f"Assessment: {lecture_title}"
        if "course_name" not in data or not data["course_name"]:
            data["course_name"] = "Computer Science & Systems Programming"
        if "source_document" not in data or not data["source_document"]:
            data["source_document"] = "Lecture Slides"
        return GeneratedAssessment.model_validate(data)

    def _normalize_report_dict(
        self, d: Dict[str, Any], default_sub_id: str, default_student_id: str, max_possible: float
    ) -> Dict[str, Any]:
        if "grading_report" in d and isinstance(d["grading_report"], dict):
            d = d["grading_report"]
        elif "report" in d and isinstance(d["report"], dict):
            d = d["report"]
        elif "evaluation" in d and isinstance(d["evaluation"], dict):
            d = d["evaluation"]

        # Support decomposed multi-step reasoning outputs
        if "evaluations" not in d or not d["evaluations"]:
            d["evaluations"] = d.get("criteria_evaluations") or d.get("step_3_rubric_evaluation") or d.get("rubric_evaluation") or []

        if "percentage" not in d or d["percentage"] is None:
            if "overall_percentage" in d and d["overall_percentage"] is not None:
                d["percentage"] = float(d["overall_percentage"])

        scoring = d.get("step_4_scoring") or d.get("scoring") or {}
        if isinstance(scoring, dict):
            if "total_score" in scoring and scoring["total_score"] is not None:
                d["total_score"] = float(scoring["total_score"])
            if "max_possible_score" in scoring and scoring["max_possible_score"] is not None:
                d["max_possible_score"] = float(scoring["max_possible_score"])
            if "percentage" in scoring and scoring["percentage"] is not None:
                d["percentage"] = float(scoring["percentage"])

        feedback = d.get("step_5_pedagogical_feedback") or d.get("pedagogical_feedback") or d.get("feedback") or {}
        if isinstance(feedback, dict):
            if "summary" in feedback and feedback["summary"]:
                d["summary_feedback"] = feedback["summary"]
            elif "summary_feedback" in feedback and feedback["summary_feedback"]:
                d["summary_feedback"] = feedback["summary_feedback"]
            if "areas_to_review" in feedback and isinstance(feedback["areas_to_review"], list):
                d["areas_to_review"] = feedback["areas_to_review"]

        if "submission_id" not in d or not d["submission_id"]:
            d["submission_id"] = default_sub_id
        if "student_id" not in d or not d["student_id"]:
            d["student_id"] = default_student_id

        if "evaluations" in d and isinstance(d["evaluations"], list):
            for idx, ev in enumerate(d["evaluations"]):
                if isinstance(ev, dict):
                    if "criterion_name" not in ev:
                        ev["criterion_name"] = ev.get("criterion") or ev.get("name") or f"Criterion {idx + 1}"
                    if "score_awarded" not in ev:
                        ev["score_awarded"] = ev.get("score") or ev.get("points_awarded") or 0.0
                    if "max_score" not in ev:
                        ev["max_score"] = ev.get("max_points") or ev.get("max_raw_score") or 10.0
                    if "evidence_citation" not in ev:
                        ev["evidence_citation"] = ev.get("citation") or ev.get("quote") or ev.get("evidence") or "Student submission analyzed."
                    if "strengths" not in ev or not isinstance(ev["strengths"], list):
                        ev["strengths"] = [ev["strengths"]] if ev.get("strengths") else ["Satisfied criterion requirements."]
                    if "gaps" not in ev or not isinstance(ev["gaps"], list):
                        ev["gaps"] = [ev["gaps"]] if ev.get("gaps") else ["No major gaps detected."]

        total_awarded = sum(ev.get("score_awarded", 0.0) for ev in d.get("evaluations", [])) if "evaluations" in d else 0.0
        if "total_score" not in d or d["total_score"] is None:
            d["total_score"] = round(float(total_awarded), 2)
        if "max_possible_score" not in d or d["max_possible_score"] is None:
            d["max_possible_score"] = max_possible
        if "percentage" not in d or d["percentage"] is None:
            d["percentage"] = round((d["total_score"] / max(d["max_possible_score"], 0.1)) * 100, 1)
        if "summary_feedback" not in d or not d["summary_feedback"]:
            d["summary_feedback"] = "Evaluation completed based on rubric criteria."
        if "areas_to_review" not in d or not isinstance(d["areas_to_review"], list):
            d["areas_to_review"] = ["Review lecture notes on core concepts."]
        return d

    def grade_exam_question(
        self, question: Question, rubric: AssessmentRubric, student_answer: str
    ) -> GradingReport:
        prompt = format_exam_grading_prompt(question, rubric, student_answer)
        data = self._call_gemini_json(prompt, GradingReport.model_json_schema())
        max_possible = sum(c.max_score for c in rubric.criteria)
        data = self._normalize_report_dict(
            data,
            default_sub_id=f"SUB-{abs(hash(student_answer)) % 10000:04d}",
            default_student_id="STUDENT-001",
            max_possible=max_possible,
        )
        return GradingReport.model_validate(data)

    def grade_assignment(
        self, assignment_title: str, assignment_instructions: str, rubric: AssessmentRubric, student_submission: str
    ) -> GradingReport:
        prompt = format_assignment_grading_prompt(
            assignment_title, assignment_instructions, rubric, student_submission
        )
        data = self._call_gemini_json(prompt, GradingReport.model_json_schema())
        max_possible = sum(c.max_score for c in rubric.criteria)
        data = self._normalize_report_dict(
            data,
            default_sub_id=f"SUB-ASSIGN-{abs(hash(student_submission)) % 10000:04d}",
            default_student_id="STUDENT-001",
            max_possible=max_possible,
        )
        return GradingReport.model_validate(data)


# ---------------------------------------------------------------------------
# 3. BedrockLiveProvider (AWS Cloud Adapter via Boto3)
# ---------------------------------------------------------------------------

class BedrockLiveProvider(BaseLLMProvider):
    """
    Production-ready AWS Bedrock adapter using the Converse API.
    Designed for deployment to AWS Lambda by Person 2.
    """

    def __init__(self, model_id: str = "anthropic.claude-3-haiku-20240307-v1:0", region_name: str = "us-east-1"):
        self.model_id = model_id
        self.region_name = region_name
        self._client = None

    @property
    def client(self):
        if self._client is None:
            import boto3
            self._client = boto3.client("bedrock-runtime", region_name=self.region_name)
        return self._client

    def _call_bedrock(self, prompt: str) -> str:
        messages = [{"role": "user", "content": [{"text": prompt}]}]
        response = self.client.converse(
            modelId=self.model_id,
            messages=messages,
            system=[{"text": SYSTEM_BASE_INSTRUCTION}],
            inferenceConfig={"temperature": 0.2, "maxTokens": 2048},
        )
        return response["output"]["message"]["content"][0]["text"]

    def generate_rubric(self, lecture_title: str, lecture_content: str) -> AssessmentRubric:
        prompt = format_rubric_generation_prompt(lecture_title, lecture_content) + "\nOutput strictly in valid JSON."
        raw = self._call_bedrock(prompt)
        # Parse JSON and validate with Pydantic
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        json_str = match.group(0) if match else raw
        return AssessmentRubric.model_validate_json(json_str)

    def generate_assessment(
        self, lecture_title: str, lecture_content: str, question_count: int = 3
    ) -> GeneratedAssessment:
        prompt = format_assessment_generation_prompt(lecture_title, lecture_content, question_count) + "\nOutput strictly in valid JSON."
        raw = self._call_bedrock(prompt)
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        json_str = match.group(0) if match else raw
        return GeneratedAssessment.model_validate_json(json_str)

    def grade_exam_question(
        self, question: Question, rubric: AssessmentRubric, student_answer: str
    ) -> GradingReport:
        prompt = format_exam_grading_prompt(question, rubric, student_answer) + "\nOutput strictly in valid JSON."
        raw = self._call_bedrock(prompt)
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        json_str = match.group(0) if match else raw
        return GradingReport.model_validate_json(json_str)

    def grade_assignment(
        self, assignment_title: str, assignment_instructions: str, rubric: AssessmentRubric, student_submission: str
    ) -> GradingReport:
        prompt = format_assignment_grading_prompt(
            assignment_title, assignment_instructions, rubric, student_submission
        ) + "\nOutput strictly in valid JSON."
        raw = self._call_bedrock(prompt)
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        json_str = match.group(0) if match else raw
        return GradingReport.model_validate_json(json_str)


# ---------------------------------------------------------------------------
# High-Level Orchestrator & Factory
# ---------------------------------------------------------------------------

class DidacticEngine:
    """
    Main engine used by applications, API handlers, and UI frontends.
    Wraps whichever provider is active (Mock, Gemini, or Bedrock)
    with automatic offline fallback on network or API errors.
    """

    def __init__(self, provider: Optional[BaseLLMProvider] = None):
        self.provider = provider or get_default_provider()
        self._fallback = MockLLMProvider()

    def generate_rubric(self, lecture_title: str, lecture_content: str) -> AssessmentRubric:
        try:
            return self.provider.generate_rubric(lecture_title, lecture_content)
        except Exception as exc:
            import logging
            logging.getLogger(__name__).warning(
                f"DidacticEngine.generate_rubric provider call failed ({exc}); falling back to offline simulator."
            )
            return self._fallback.generate_rubric(lecture_title, lecture_content)

    def generate_assessment(
        self, lecture_title: str, lecture_content: str, question_count: int = 3
    ) -> GeneratedAssessment:
        try:
            return self.provider.generate_assessment(lecture_title, lecture_content, question_count)
        except Exception as exc:
            import logging
            logging.getLogger(__name__).warning(
                f"DidacticEngine.generate_assessment provider call failed ({exc}); falling back to offline simulator."
            )
            return self._fallback.generate_assessment(lecture_title, lecture_content, question_count)

    def grade_exam_question(
        self, question: Question, rubric: AssessmentRubric, student_answer: str
    ) -> GradingReport:
        try:
            return self.provider.grade_exam_question(question, rubric, student_answer)
        except Exception as exc:
            import logging
            logging.getLogger(__name__).warning(
                f"DidacticEngine.grade_exam_question provider call failed ({exc}); falling back to offline simulator."
            )
            return self._fallback.grade_exam_question(question, rubric, student_answer)

    def grade_assignment(
        self, assignment_title: str, assignment_instructions: str, rubric: AssessmentRubric, student_submission: str
    ) -> GradingReport:
        try:
            return self.provider.grade_assignment(
                assignment_title, assignment_instructions, rubric, student_submission
            )
        except Exception as exc:
            import logging
            logging.getLogger(__name__).warning(
                f"DidacticEngine.grade_assignment provider call failed ({exc}); falling back to offline simulator."
            )
            return self._fallback.grade_assignment(
                assignment_title, assignment_instructions, rubric, student_submission
            )


def get_default_provider() -> BaseLLMProvider:
    """
    Intelligently selects the provider:
    1. If GEMINI_API_KEY is present in env, uses GeminiLiveProvider.
    2. If AWS_EXECUTION_ENV is set (inside Lambda), uses BedrockLiveProvider.
    3. Defaults to MockLLMProvider (100% free, offline, instant).
    """
    if os.getenv("GEMINI_API_KEY"):
        return GeminiLiveProvider()
    if os.getenv("AWS_EXECUTION_ENV") or os.getenv("USE_AWS_BEDROCK") == "true":
        return BedrockLiveProvider()
    return MockLLMProvider()


def get_engine(provider: Optional[BaseLLMProvider] = None) -> DidacticEngine:
    """Factory helper to get an initialized DidacticEngine."""
    return DidacticEngine(provider=provider)
