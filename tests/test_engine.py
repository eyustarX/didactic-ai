import pytest
from src.ai.engine import (
    DidacticEngine,
    MockLLMProvider,
    BaseLLMProvider,
    get_engine,
    get_default_provider,
)
from src.ai.schemas import (
    AssessmentRubric,
    GeneratedAssessment,
    GradingReport,
    Question,
    QuestionType,
)


@pytest.fixture
def engine():
    # Force MockLLMProvider for fast, deterministic unit testing
    return DidacticEngine(provider=MockLLMProvider())


def test_engine_initialization_defaults_to_mock(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("AWS_EXECUTION_ENV", raising=False)
    monkeypatch.delenv("USE_AWS_BEDROCK", raising=False)

    provider = get_default_provider()
    assert isinstance(provider, MockLLMProvider)

    eng = get_engine()
    assert isinstance(eng.provider, MockLLMProvider)


def test_generate_rubric(engine):
    lecture_title = "Operating Systems: Concurrency & Semaphores"
    lecture_content = (
        "Semaphores are synchronization tools. A semaphore S is an integer variable "
        "accessed only through wait() and signal() operations. Used to prevent race conditions."
    )
    rubric = engine.generate_rubric(lecture_title, lecture_content)

    assert isinstance(rubric, AssessmentRubric)
    assert "Concurrency & Semaphores" in rubric.title
    assert len(rubric.criteria) == 3

    # Weights MUST sum to 1.0 (with slight floating-point tolerance)
    total_weight = sum(c.weight for c in rubric.criteria)
    assert abs(total_weight - 1.0) < 1e-4

    # Every criterion has positive max score
    for c in rubric.criteria:
        assert c.max_score > 0
        assert len(c.description) > 0


def test_generate_assessment(engine):
    lecture_title = "Relational Database Indexing"
    lecture_content = (
        "B-trees and B+ trees are balanced search trees used in relational database indexes. "
        "They minimize disk I/O operations by storing multiple keys per node."
    )
    assessment = engine.generate_assessment(lecture_title, lecture_content, question_count=3)

    assert isinstance(assessment, GeneratedAssessment)
    assert len(assessment.questions) == 3
    assert assessment.total_points > 0

    # Ensure all questions have reference answers and learning objectives
    for q in assessment.questions:
        assert len(q.prompt) > 0
        assert len(q.reference_answer) > 0
        assert len(q.learning_objective) > 0
        assert q.max_points > 0


def test_grade_exam_question(engine):
    lecture_title = "Memory Virtualization"
    rubric = engine.generate_rubric(lecture_title, "Virtual memory uses page tables and TLB.")
    question = Question(
        id="Q1",
        question_type=QuestionType.SHORT_ANSWER,
        prompt="What is the role of the TLB in virtual memory?",
        reference_answer="The Translation Lookaside Buffer is a hardware cache that stores recent virtual-to-physical address translations to speed up memory access.",
        max_points=10.0,
        learning_objective="Understand TLB caching.",
    )
    student_answer = (
        "The TLB is a translation lookaside buffer. It is a cache that speeds up memory access "
        "by storing recent virtual to physical translations."
    )

    report = engine.grade_exam_question(question=question, rubric=rubric, student_answer=student_answer)

    assert isinstance(report, GradingReport)
    assert report.total_score > 0
    assert report.max_possible_score == sum(c.max_score for c in rubric.criteria)
    assert 0 <= report.percentage <= 100
    assert len(report.evaluations) == len(rubric.criteria)

    # Verbatim citation must be extracted from student's text
    citation = report.evaluations[0].evidence_citation
    assert "Student wrote" in citation or "TLB" in citation


def test_grade_assignment(engine):
    rubric = engine.generate_rubric("Compiler Design", "Lexical analysis, parsing, AST generation.")
    assignment_title = "Project 1: Tokenizer Implementation"
    assignment_instructions = "Implement a finite automaton tokenizer in Python that handles identifiers and numbers."
    student_submission = (
        "class Tokenizer:\n"
        "    def tokenize(self, text):\n"
        "        # Implemented finite automaton DFA state machine\n"
        "        # Handles identifiers, numbers, and tokens\n"
        "        return tokens\n"
    )

    report = engine.grade_assignment(
        assignment_title=assignment_title,
        assignment_instructions=assignment_instructions,
        rubric=rubric,
        student_submission=student_submission,
    )

    assert isinstance(report, GradingReport)
    assert 0.0 <= report.percentage <= 100.0
    assert len(report.evaluations) == len(rubric.criteria)
    assert len(report.summary_feedback) > 0
