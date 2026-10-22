import pytest
from src.ai.schemas import (
    Question,
    QuestionType,
    RubricCriterion,
    AssessmentRubric,
)
from src.ai.prompts import (
    SYSTEM_BASE_INSTRUCTION,
    format_rubric_criteria_for_prompt,
    format_rubric_generation_prompt,
    format_assessment_generation_prompt,
    format_exam_grading_prompt,
    format_assignment_grading_prompt,
)


@pytest.fixture
def sample_rubric():
    return AssessmentRubric(
        rubric_id="RUB-OS-01",
        title="Deadlock Handling Rubric",
        criteria=[
            RubricCriterion(
                name="Deadlock Conditions",
                description="Accurately identifies all four Coffman conditions.",
                weight=0.6,
                max_score=6.0,
            ),
            RubricCriterion(
                name="Prevention Techniques",
                description="Explains resource preemption or hold-and-wait elimination.",
                weight=0.4,
                max_score=4.0,
            ),
        ],
    )


@pytest.fixture
def sample_question():
    return Question(
        id="Q1",
        question_type=QuestionType.SHORT_ANSWER,
        prompt="Describe the four Coffman conditions necessary for deadlock.",
        reference_answer="Mutual Exclusion, Hold and Wait, No Preemption, Circular Wait.",
        max_points=10.0,
        learning_objective="Understand deadlock conditions.",
    )


def test_system_base_instruction():
    assert "Didactic AI" in SYSTEM_BASE_INSTRUCTION
    assert "Grounding" in SYSTEM_BASE_INSTRUCTION


def test_format_rubric_criteria(sample_rubric):
    formatted = format_rubric_criteria_for_prompt(sample_rubric)
    assert "Deadlock Handling Rubric" in formatted
    assert "Deadlock Conditions | Max Score: 6.0 | Weight: 0.60" in formatted
    assert "Prevention Techniques | Max Score: 4.0 | Weight: 0.40" in formatted


def test_format_rubric_generation_prompt():
    prompt = format_rubric_generation_prompt(
        lecture_title="Distributed Systems Consensus",
        lecture_content="Paxos and Raft consensus algorithms.",
    )
    assert "Distributed Systems Consensus" in prompt
    assert "Paxos and Raft" in prompt
    assert "MUST equal exactly 1.0" in prompt


def test_format_assessment_generation_prompt():
    prompt = format_assessment_generation_prompt(
        lecture_title="Memory Management",
        lecture_content="Paging and Virtual Memory.",
        question_count=4,
    )
    assert "Memory Management" in prompt
    assert "4 high-quality questions" in prompt
    assert "reference_answer" in prompt


def test_format_exam_grading_prompt(sample_question, sample_rubric):
    student_answer = "Deadlock needs mutual exclusion, no preemption, hold and wait, and circular wait."
    prompt = format_exam_grading_prompt(
        question=sample_question,
        rubric=sample_rubric,
        student_answer=student_answer,
    )
    assert "Describe the four Coffman conditions" in prompt
    assert "Mutual Exclusion, Hold and Wait" in prompt
    assert "Deadlock Conditions | Max Score: 6.0" in prompt
    assert student_answer in prompt
    assert "evidence_citation" in prompt


def test_format_assignment_grading_prompt(sample_rubric):
    assignment_title = "Lab 1: Deadlock Detector"
    assignment_instructions = "Implement a cycle-finding algorithm on a resource allocation graph."
    student_submission = "def detect_cycle(graph): return True"

    prompt = format_assignment_grading_prompt(
        assignment_title=assignment_title,
        assignment_instructions=assignment_instructions,
        rubric=sample_rubric,
        student_submission=student_submission,
    )
    assert assignment_title in prompt
    assert assignment_instructions in prompt
    assert "Deadlock Handling Rubric" in prompt
    assert student_submission in prompt
    assert "strengths" in prompt
    assert "gaps" in prompt
