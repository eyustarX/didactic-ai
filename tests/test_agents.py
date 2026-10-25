import pytest
from src.ai.schemas import (
    AssessmentRubric,
    BloomLevel,
    CriterionEvaluation,
    CurriculumAnalysis,
    DocumentChunk,
    GeneratedAssessment,
    GradingReport,
    IngestedDocument,
    LearningObjective,
    Question,
    QuestionType,
    RubricCriterion,
)
from src.ai.rag import LectureRetriever, create_retriever
from src.ai.engine import MockLLMProvider, BaseLLMProvider
from src.ai.agents import (
    AssessmentAgent,
    AuditorAgent,
    BaseAgent,
    CurriculumAgent,
    GradingAgent,
    MultiAgentCoordinator,
    RubricAgent,
    classify_bloom_level,
    create_coordinator,
    create_live_coordinator,
    extract_topic_from_chunk,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def os_lecture_document():
    """Simulates a 5-slide Operating Systems lecture on Concurrency."""
    chunks = [
        DocumentChunk(
            chunk_id="chunk_001",
            page_number=1,
            content="Introduction to Operating Systems\nThis course covers process management, memory management, and file systems.",
            token_estimate=14,
        ),
        DocumentChunk(
            chunk_id="chunk_002",
            page_number=2,
            content="The Critical Section Problem\nThe critical section problem requires three conditions: mutual exclusion, progress, and bounded waiting. Define mutual exclusion as the requirement that only one process may execute in its critical section at a time.",
            token_estimate=35,
        ),
        DocumentChunk(
            chunk_id="chunk_003",
            page_number=3,
            content="Mutex vs. Semaphore\nA mutex is a locking mechanism with thread ownership. Only the thread that locked the mutex can unlock it. A semaphore is a signaling mechanism without ownership, using wait() and signal() operations. Compare and contrast these two synchronization primitives.",
            token_estimate=40,
        ),
        DocumentChunk(
            chunk_id="chunk_004",
            page_number=7,
            content="Deadlock Conditions and Analysis\nA deadlock occurs when processes are permanently blocked. The four Coffman conditions are mutual exclusion, hold and wait, no preemption, and circular wait. Analyze how each condition contributes to system deadlock.",
            token_estimate=35,
        ),
        DocumentChunk(
            chunk_id="chunk_005",
            page_number=14,
            content="Deadlock Prevention Strategies\nDeadlock prevention eliminates one Coffman condition. Implement resource ordering to prevent circular wait by requiring processes to request resources in strict ascending numerical order. Evaluate trade-offs between prevention and detection.",
            token_estimate=35,
        ),
    ]
    full_text = "\n\n".join(c.content for c in chunks)
    return IngestedDocument(
        filename="lecture_07_concurrency.pdf",
        total_pages=5,
        chunks=chunks,
        full_text=full_text,
    )


@pytest.fixture
def retriever(os_lecture_document):
    return create_retriever(os_lecture_document)


@pytest.fixture
def curriculum_agent(retriever):
    return CurriculumAgent(retriever=retriever)


# ---------------------------------------------------------------------------
# Tests: Bloom's Taxonomy Classification
# ---------------------------------------------------------------------------

def test_classify_bloom_remember():
    text = "Define mutual exclusion. List the three requirements of the critical section problem. Identify each condition by name."
    level = classify_bloom_level(text)
    assert level == BloomLevel.REMEMBER


def test_classify_bloom_understand():
    text = "Explain the concept of deadlocks. Summarize the difference between mutex and semaphore."
    level = classify_bloom_level(text)
    assert level == BloomLevel.UNDERSTAND


def test_classify_bloom_analyze():
    text = "Analyze the four Coffman conditions. Evaluate the trade-offs between deadlock prevention and detection strategies."
    level = classify_bloom_level(text)
    assert level in (BloomLevel.ANALYZE, BloomLevel.EVALUATE)


def test_classify_bloom_apply():
    text = "Implement a solution using semaphores. Execute the algorithm and calculate the result."
    level = classify_bloom_level(text)
    assert level == BloomLevel.APPLY


def test_classify_bloom_default():
    text = "Operating systems are important for computers."
    level = classify_bloom_level(text)
    assert level == BloomLevel.UNDERSTAND  # Default when no strong indicators


# ---------------------------------------------------------------------------
# Tests: Topic Extraction from Chunks
# ---------------------------------------------------------------------------

def test_extract_topic_heading_style():
    chunk = DocumentChunk(
        chunk_id="c1", page_number=3,
        content="Mutex vs. Semaphore\nA mutex is a locking mechanism with thread ownership.",
        token_estimate=10,
    )
    topic = extract_topic_from_chunk(chunk)
    assert topic == "Mutex vs. Semaphore"


def test_extract_topic_long_content():
    chunk = DocumentChunk(
        chunk_id="c2", page_number=5,
        content="This is a very long introductory sentence about how modern operating systems handle memory management and virtual address translation through page tables. More details follow.",
        token_estimate=25,
    )
    topic = extract_topic_from_chunk(chunk)
    assert len(topic) <= 63  # Truncated to reasonable length


def test_extract_topic_empty_content():
    chunk = DocumentChunk(
        chunk_id="c3", page_number=1,
        content="",
        token_estimate=0,
    )
    topic = extract_topic_from_chunk(chunk)
    assert "Slide 1" in topic


# ---------------------------------------------------------------------------
# Tests: CurriculumAgent.extract_objectives()
# ---------------------------------------------------------------------------

def test_extract_objectives_returns_curriculum_analysis(curriculum_agent, os_lecture_document):
    analysis = curriculum_agent.extract_objectives(
        lecture_title="Concurrency & Deadlocks",
        document=os_lecture_document,
    )

    assert isinstance(analysis, CurriculumAnalysis)
    assert analysis.lecture_title == "Concurrency & Deadlocks"
    assert analysis.total_concepts >= 3  # At least 3 meaningful slides


def test_objectives_have_valid_fields(curriculum_agent, os_lecture_document):
    analysis = curriculum_agent.extract_objectives(
        lecture_title="Concurrency & Deadlocks",
        document=os_lecture_document,
    )

    for obj in analysis.objectives:
        assert isinstance(obj, LearningObjective)
        assert len(obj.topic) > 0
        assert len(obj.description) > 0
        assert obj.bloom_level in BloomLevel
        assert obj.source_page >= 1


def test_objectives_include_source_pages(curriculum_agent, os_lecture_document):
    analysis = curriculum_agent.extract_objectives(
        lecture_title="Concurrency & Deadlocks",
        document=os_lecture_document,
    )

    source_pages = [obj.source_page for obj in analysis.objectives]
    # Should reference actual slide pages from our test data
    assert 7 in source_pages or 14 in source_pages  # Deadlock slides


def test_objectives_bloom_levels_vary(curriculum_agent, os_lecture_document):
    analysis = curriculum_agent.extract_objectives(
        lecture_title="Concurrency & Deadlocks",
        document=os_lecture_document,
    )

    bloom_levels = set(obj.bloom_level for obj in analysis.objectives)
    # With our varied test data, we should see at least 2 different Bloom levels
    assert len(bloom_levels) >= 2


def test_objectives_empty_document(curriculum_agent):
    empty_doc = IngestedDocument(
        filename="empty.pdf",
        total_pages=0,
        chunks=[],
        full_text="",
    )
    analysis = curriculum_agent.extract_objectives(
        lecture_title="Empty Lecture",
        document=empty_doc,
    )

    # Should produce at least one fallback objective
    assert isinstance(analysis, CurriculumAnalysis)
    assert analysis.total_concepts >= 1
    assert analysis.objectives[0].topic == "Empty Lecture"


# ---------------------------------------------------------------------------
# Tests: RubricAgent (Agent 2)
# ---------------------------------------------------------------------------

@pytest.fixture
def sample_curriculum(curriculum_agent, os_lecture_document):
    return curriculum_agent.extract_objectives(
        lecture_title="Operating Systems: Concurrency & Deadlocks",
        document=os_lecture_document,
    )


@pytest.fixture
def rubric_agent(retriever):
    return RubricAgent(retriever=retriever)


def test_rubric_agent_generates_valid_rubric(rubric_agent, sample_curriculum):
    rubric = rubric_agent.generate_rubric(
        curriculum=sample_curriculum,
        target_criteria_count=4,
        total_marks=10.0,
    )

    assert isinstance(rubric, AssessmentRubric)
    assert "Operating Systems: Concurrency & Deadlocks" in rubric.title
    assert len(rubric.criteria) == 4
    assert rubric.rubric_id.startswith("RUB-")


def test_rubric_weights_sum_to_exact_one(rubric_agent, sample_curriculum):
    """Guarantees the mathematical normalization layer works with zero float drift."""
    for count in [3, 4]:
        rubric = rubric_agent.generate_rubric(
            curriculum=sample_curriculum,
            target_criteria_count=count,
            total_marks=10.0,
        )
        total_weight = sum(c.weight for c in rubric.criteria)
        assert abs(total_weight - 1.0) < 1e-4, f"Weights {total_weight} do not sum to 1.0 for count {count}"


def test_rubric_scores_proportional_to_total_marks(rubric_agent, sample_curriculum):
    rubric = rubric_agent.generate_rubric(
        curriculum=sample_curriculum,
        target_criteria_count=4,
        total_marks=20.0,  # Custom total marks
    )

    total_max_score = sum(c.max_score for c in rubric.criteria)
    # 20.0 total marks should match sum of max scores (allowing for rounding)
    assert abs(total_max_score - 20.0) <= 0.1

    for c in rubric.criteria:
        assert c.max_score > 0
        assert 0.0 < c.weight <= 1.0


def test_rubric_descriptions_reference_curriculum_slides(rubric_agent, sample_curriculum):
    """Verifies that criteria descriptions are grounded in the actual lecture slides."""
    rubric = rubric_agent.generate_rubric(
        curriculum=sample_curriculum,
        target_criteria_count=4,
        total_marks=10.0,
    )

    all_descriptions = " ".join(c.description for c in rubric.criteria)
    # Should mention actual slide numbers or concepts extracted by CurriculumAgent
    assert "Slide" in all_descriptions or "Deadlock" in all_descriptions


def test_rubric_agent_criteria_count_options(rubric_agent, sample_curriculum):
    rubric_3 = rubric_agent.generate_rubric(
        curriculum=sample_curriculum,
        target_criteria_count=3,
        total_marks=10.0,
    )
    assert len(rubric_3.criteria) == 3

    rubric_4 = rubric_agent.generate_rubric(
        curriculum=sample_curriculum,
        target_criteria_count=4,
        total_marks=10.0,
    )
    assert len(rubric_4.criteria) == 4


# ---------------------------------------------------------------------------
# Tests: AssessmentAgent (Agent 3)
# ---------------------------------------------------------------------------

@pytest.fixture
def assessment_agent(retriever):
    return AssessmentAgent(retriever=retriever)


def test_assessment_agent_generates_valid_assessment(assessment_agent, sample_curriculum):
    assessment = assessment_agent.generate_assessment(
        curriculum=sample_curriculum,
        question_count=3,
        total_points=10.0,
    )

    assert isinstance(assessment, GeneratedAssessment)
    assert len(assessment.questions) == 3
    assert "Operating Systems" in assessment.title
    assert assessment.course_name is not None


def test_assessment_questions_have_answer_keys(assessment_agent, sample_curriculum):
    assessment = assessment_agent.generate_assessment(
        curriculum=sample_curriculum,
        question_count=4,
        total_points=20.0,
    )

    for q in assessment.questions:
        assert isinstance(q, Question)
        assert len(q.prompt) > 10
        assert len(q.reference_answer) > 10
        assert len(q.learning_objective) > 0
        assert q.max_points > 0


def test_assessment_points_sum_to_total(assessment_agent, sample_curriculum):
    """Guarantees the point normalization layer works across question configurations."""
    for total in [10.0, 25.0, 100.0]:
        assessment = assessment_agent.generate_assessment(
            curriculum=sample_curriculum,
            question_count=4,
            total_points=total,
        )
        calculated_sum = sum(q.max_points for q in assessment.questions)
        assert abs(calculated_sum - total) < 0.05, f"Points sum {calculated_sum} != {total}"
        assert abs(assessment.total_points - total) < 0.05


def test_assessment_multiple_choice_has_options(assessment_agent, sample_curriculum):
    assessment = assessment_agent.generate_assessment(
        curriculum=sample_curriculum,
        question_count=3,
        total_points=10.0,
    )

    mcq_questions = [q for q in assessment.questions if q.question_type == QuestionType.MULTIPLE_CHOICE]
    assert len(mcq_questions) >= 1

    for mcq in mcq_questions:
        assert mcq.options is not None
        assert len(mcq.options) == 4
        # Reference answer must be one of the choices
        assert mcq.reference_answer in mcq.options


def test_assessment_rag_grounding(assessment_agent, sample_curriculum):
    """Verifies that questions and answer keys cite actual slide content."""
    assessment = assessment_agent.generate_assessment(
        curriculum=sample_curriculum,
        question_count=3,
        total_points=10.0,
    )

    # Learning objectives should include slide references
    for q in assessment.questions:
        assert "Slide" in q.learning_objective

    # Combined text of prompts and answer keys should contain actual topics from lecture
    combined_text = " ".join(q.prompt + " " + q.reference_answer for q in assessment.questions)
    assert any(term in combined_text.lower() for term in ["mutex", "semaphore", "deadlock", "coffman", "critical section"])


def test_assessment_custom_question_counts(assessment_agent, sample_curriculum):
    for count in [2, 5]:
        assessment = assessment_agent.generate_assessment(
            curriculum=sample_curriculum,
            question_count=count,
            total_points=15.0,
        )
        assert len(assessment.questions) == count
        assert len(assessment.questions) == count


# ---------------------------------------------------------------------------
# Tests: GradingAgent (Agent 4)
# ---------------------------------------------------------------------------

@pytest.fixture
def grading_agent(retriever):
    return GradingAgent(retriever=retriever)


@pytest.fixture
def sample_rubric_and_question(assessment_agent, rubric_agent, sample_curriculum):
    rubric = rubric_agent.generate_rubric(
        curriculum=sample_curriculum,
        target_criteria_count=3,
        total_marks=10.0,
    )
    assessment = assessment_agent.generate_assessment(
        curriculum=sample_curriculum,
        question_count=2,
        total_points=10.0,
    )
    return rubric, assessment.questions[0]


def test_grading_agent_grades_question_submission(grading_agent, sample_rubric_and_question):
    rubric, question = sample_rubric_and_question
    student_answer = (
        "A mutex is a synchronization lock with ownership, where only the acquiring thread "
        "can unlock it. In contrast, a semaphore is a signaling primitive."
    )

    report = grading_agent.grade_question_submission(
        question=question,
        rubric=rubric,
        student_answer=student_answer,
        student_id="STU-ALICE",
    )

    assert isinstance(report, GradingReport)
    assert report.student_id == "STU-ALICE"
    assert report.total_score > 0
    assert report.max_possible_score == 10.0
    assert 0.0 <= report.percentage <= 100.0
    assert len(report.evaluations) == len(rubric.criteria)


def test_grading_agent_extracts_student_verbatim_quote(grading_agent, sample_rubric_and_question):
    rubric, question = sample_rubric_and_question
    student_answer = "Deadlock requires circular wait and hold and wait to occur simultaneously."

    report = grading_agent.grade_question_submission(
        question=question,
        rubric=rubric,
        student_answer=student_answer,
    )

    # Verbatim citation must be extracted from the student's text
    citation = report.evaluations[0].evidence_citation
    assert "Student stated:" in citation
    assert "Deadlock requires circular wait" in citation


def test_grading_agent_evaluates_strengths_and_gaps(grading_agent, sample_rubric_and_question):
    rubric, question = sample_rubric_and_question
    partial_answer = "Deadlock happens."

    report = grading_agent.grade_question_submission(
        question=question,
        rubric=rubric,
        student_answer=partial_answer,
    )

    # For an incomplete answer, gaps must be flagged
    has_gaps = any(len(ev.gaps) > 0 for ev in report.evaluations)
    assert has_gaps
    assert len(report.areas_to_review) > 0


def test_grading_agent_grades_assignment_submission(grading_agent, sample_rubric_and_question):
    rubric, _ = sample_rubric_and_question
    assignment_title = "Concurrency Control Lab"
    assignment_instructions = "Explain mutex vs semaphore and describe deadlock prevention."
    student_submission = (
        "In this lab, we analyze mutex locks and binary semaphores. A mutex has thread ownership, "
        "while semaphores use wait() and signal() for signaling. To prevent deadlocks, the operating system "
        "imposes strict resource ordering to break the circular wait condition."
    )

    report = grading_agent.grade_assignment_submission(
        assignment_title=assignment_title,
        assignment_instructions=assignment_instructions,
        rubric=rubric,
        student_submission=student_submission,
        student_id="STU-001",
    )

    assert isinstance(report, GradingReport)
    assert report.percentage >= 70.0
    assert len(report.evaluations) == len(rubric.criteria)
    assert "Submission excerpt:" in report.evaluations[0].evidence_citation


def test_grading_agent_calibrated_scoring(grading_agent, sample_rubric_and_question):
    """Verifies that an exemplary answer scores strictly higher than a poor/failing answer."""
    rubric, _ = sample_rubric_and_question

    mutex_question = Question(
        id="Q-CALIB-01",
        question_type=QuestionType.SHORT_ANSWER,
        prompt="Explain the core difference between a mutex and a binary semaphore.",
        reference_answer=(
            "A mutex is a mutual exclusion lock with thread ownership. Only the locking thread can unlock it. "
            "A binary semaphore is a signaling mechanism without ownership using wait and signal operations."
        ),
        max_points=10.0,
        learning_objective="Differentiate between mutexes and semaphores (Slide 3, Bloom: analyze)",
    )

    good_answer = (
        "A mutex is a mutual exclusion lock with thread ownership. Only the locking thread can unlock. "
        "A semaphore is a signaling mechanism without ownership using wait and signal operations."
    )
    poor_answer = "A mutex is a wire. It speeds up the CPU."

    report_good = grading_agent.grade_question_submission(
        question=mutex_question, rubric=rubric, student_answer=good_answer
    )
    report_poor = grading_agent.grade_question_submission(
        question=mutex_question, rubric=rubric, student_answer=poor_answer
    )

    assert report_good.percentage > report_poor.percentage
    assert report_good.total_score > report_poor.total_score
    assert report_good.percentage >= 75.0
    assert report_poor.percentage <= 40.0


# ---------------------------------------------------------------------------
# Tests: AuditorAgent (Agent 5)
# ---------------------------------------------------------------------------

@pytest.fixture
def auditor_agent(retriever):
    return AuditorAgent(retriever=retriever)


def test_auditor_agent_verifies_valid_evidence(auditor_agent, grading_agent, sample_rubric_and_question):
    rubric, _ = sample_rubric_and_question
    student_submission = (
        "A mutex is a mutual exclusion lock with thread ownership. Only the acquiring thread can unlock it."
    )
    mutex_question = Question(
        id="Q-AUDIT-01",
        question_type=QuestionType.SHORT_ANSWER,
        prompt="Explain mutex locks.",
        reference_answer="A mutex ensures mutual exclusion with thread ownership semantics.",
        max_points=10.0,
        learning_objective="Understand mutex mechanisms (Slide 3)",
    )

    report = grading_agent.grade_question_submission(
        question=mutex_question,
        rubric=rubric,
        student_answer=student_submission,
    )

    audited = auditor_agent.audit_grading_report(
        report=report,
        student_submission=student_submission,
        assessment_question=mutex_question,
    )

    assert isinstance(audited, GradingReport)
    assert audited.percentage == report.percentage
    assert audited.total_score == report.total_score
    # No unverified flags should exist
    assert not any("[AUDIT FLAG: Unverified Quote]" in ev.evidence_citation for ev in audited.evaluations)
    assert "[AUDIT WARNING" not in audited.summary_feedback


def test_auditor_agent_flags_hallucinated_evidence(auditor_agent):
    student_submission = "A mutex is a simple locking primitive."
    rubric_criterion = RubricCriterion(
        name="Conceptual Accuracy",
        description="Core conceptual accuracy",
        weight=1.0,
        max_score=10.0,
    )

    # Fabricate a grading report with a hallucinated quote
    fake_evaluation = CriterionEvaluation(
        criterion_name="Conceptual Accuracy",
        score_awarded=8.0,
        max_score=10.0,
        strengths=["Good response."],
        gaps=[],
        evidence_citation="Student stated: 'Quantum entanglement prevents deadlocks across CPU threads'",
    )
    report = GradingReport(
        submission_id="SUB-FAKE-01",
        student_id="STU-FAKE",
        total_score=8.0,
        max_possible_score=10.0,
        percentage=80.0,
        summary_feedback="Acceptable submission.",
        evaluations=[fake_evaluation],
        areas_to_review=[],
    )

    audited = auditor_agent.audit_grading_report(
        report=report,
        student_submission=student_submission,
    )

    # Auditor must flag the fabricated quote
    assert "[AUDIT FLAG: Unverified Quote]" in audited.evaluations[0].evidence_citation
    assert "[AUDIT WARNING: Flagged 1 unverified evidence citation(s)]" in audited.summary_feedback


def test_auditor_agent_verifies_mathematical_bounds(auditor_agent):
    student_submission = "A mutex locks critical sections."
    # Fabricate a report with out-of-bounds score (15.0 awarded out of 10.0 max)
    out_of_bounds_eval = CriterionEvaluation(
        criterion_name="Conceptual Accuracy",
        score_awarded=15.0,  # Exceeds max_score!
        max_score=10.0,
        strengths=["Great points."],
        gaps=[],
        evidence_citation="Student stated: 'A mutex locks critical sections'",
    )
    report = GradingReport(
        submission_id="SUB-BOUNDS-01",
        student_id="STU-BOUNDS",
        total_score=10.0,
        max_possible_score=10.0,
        percentage=100.0,
        summary_feedback="High score.",
        evaluations=[out_of_bounds_eval],
        areas_to_review=[],
    )

    audited = auditor_agent.audit_grading_report(
        report=report,
        student_submission=student_submission,
    )

    # Must clamp score_awarded to max_score
    assert audited.evaluations[0].score_awarded == 10.0
    assert audited.total_score == 10.0
    assert audited.percentage == 100.0
    assert audited.total_score <= audited.max_possible_score


def test_auditor_agent_generates_remediation_question(auditor_agent, sample_rubric_and_question):
    rubric, _ = sample_rubric_and_question
    student_submission = "Deadlock happens sometimes when things get stuck."

    deadlock_question = Question(
        id="Q-REMED-01",
        question_type=QuestionType.SHORT_ANSWER,
        prompt="Explain the four Coffman conditions required for deadlock.",
        reference_answer="Deadlock requires mutual exclusion, hold and wait, no preemption, and circular wait.",
        max_points=10.0,
        learning_objective="Analyze deadlock conditions and prevention strategies (Slide 4, Bloom: analyze)",
    )

    gaps = ["Failed to identify the four Coffman conditions."]
    evaluations = [
        CriterionEvaluation(
            criterion_name=c.name,
            score_awarded=c.max_score * 0.3,
            max_score=c.max_score,
            strengths=["Attempted response."],
            gaps=gaps,
            evidence_citation="Student stated: 'Deadlock happens sometimes'",
        )
        for c in rubric.criteria
    ]
    raw_total = sum(e.score_awarded for e in evaluations)
    raw_max = sum(e.max_score for e in evaluations)

    report = GradingReport(
        submission_id="SUB-REMED-01",
        student_id="STU-REMED",
        total_score=round(raw_total, 2),
        max_possible_score=round(raw_max, 2),
        percentage=round((raw_total / raw_max) * 100, 1),
        summary_feedback="Substandard response. Critical gaps detected.",
        evaluations=evaluations,
        areas_to_review=["Review lecture Slide 4 regarding deadlock prevention."],
    )

    audited = auditor_agent.audit_grading_report(
        report=report,
        student_submission=student_submission,
        assessment_question=deadlock_question,
    )

    # Must append a tailored remediation practice question referencing course slides
    assert any("[REMEDIATION PRACTICE]" in area for area in audited.areas_to_review)
    remediation = next(area for area in audited.areas_to_review if "[REMEDIATION PRACTICE]" in area)
    assert "Slide 4" in remediation or "Deadlock" in remediation


def test_auditor_agent_provides_enrichment_for_perfect_score(auditor_agent):
    student_submission = "Perfect comprehensive analysis of mutexes and semaphores."
    evaluations = [
        CriterionEvaluation(
            criterion_name="Mastery",
            score_awarded=10.0,
            max_score=10.0,
            strengths=["Flawless technical precision."],
            gaps=[],
            evidence_citation="Student stated: 'Perfect comprehensive analysis'",
        )
    ]
    report = GradingReport(
        submission_id="SUB-PERFECT-01",
        student_id="STU-PERFECT",
        total_score=10.0,
        max_possible_score=10.0,
        percentage=100.0,
        summary_feedback="Outstanding performance.",
        evaluations=evaluations,
        areas_to_review=[],
    )

    audited = auditor_agent.audit_grading_report(
        report=report,
        student_submission=student_submission,
    )

    assert any("[ENRICHMENT CHALLENGE]" in area for area in audited.areas_to_review)


# ---------------------------------------------------------------------------
# Tests: MultiAgentCoordinator (The Conductor)
# ---------------------------------------------------------------------------

@pytest.fixture
def coordinator(retriever):
    return MultiAgentCoordinator(retriever=retriever)


def test_coordinator_initialization(coordinator):
    assert isinstance(coordinator.curriculum_agent, CurriculumAgent)
    assert isinstance(coordinator.rubric_agent, RubricAgent)
    assert isinstance(coordinator.assessment_agent, AssessmentAgent)
    assert isinstance(coordinator.grading_agent, GradingAgent)
    assert isinstance(coordinator.auditor_agent, AuditorAgent)


def test_coordinator_analyze_lecture_and_create_rubric(coordinator, os_lecture_document):
    curriculum, rubric = coordinator.analyze_lecture_and_create_rubric(
        document=os_lecture_document,
        target_criteria_count=3,
        total_marks=10.0,
    )

    assert isinstance(curriculum, CurriculumAnalysis)
    assert isinstance(rubric, AssessmentRubric)
    assert len(curriculum.objectives) > 0
    assert len(rubric.criteria) == 3
    assert abs(sum(c.weight for c in rubric.criteria) - 1.0) < 1e-4


def test_coordinator_generate_assessment(coordinator, sample_curriculum):
    assessment = coordinator.generate_assessment(
        curriculum=sample_curriculum,
        question_count=3,
        total_points=15.0,
    )

    assert isinstance(assessment, GeneratedAssessment)
    assert len(assessment.questions) == 3
    assert abs(sum(q.max_points for q in assessment.questions) - 15.0) < 1e-3


def test_coordinator_grade_and_audit_question(coordinator, sample_rubric_and_question):
    rubric, _ = sample_rubric_and_question
    question = Question(
        id="Q-COORD-01",
        question_type=QuestionType.SHORT_ANSWER,
        prompt="Explain mutex locks and thread ownership.",
        reference_answer="A mutex ensures mutual exclusion with thread ownership semantics.",
        max_points=10.0,
        learning_objective="Understand mutex primitives (Slide 3)",
    )
    student_answer = "A mutex is a mutual exclusion lock with thread ownership. Only the acquiring thread unlocks it."

    audited_report = coordinator.grade_and_audit_question(
        question=question,
        rubric=rubric,
        student_answer=student_answer,
        student_id="STU-COORD-01",
    )

    assert isinstance(audited_report, GradingReport)
    assert audited_report.percentage >= 70.0
    assert audited_report.total_score <= audited_report.max_possible_score
    # Citation must be verified without flags
    assert not any("[AUDIT FLAG" in ev.evidence_citation for ev in audited_report.evaluations)


def test_coordinator_grade_and_audit_assignment(coordinator, sample_rubric_and_question):
    rubric, _ = sample_rubric_and_question
    title = "Concurrency Control Lab"
    instructions = "Explain mutex vs semaphore and describe deadlock prevention."
    submission = (
        "In this lab, we analyze mutex locks and binary semaphores. A mutex has thread ownership, "
        "while semaphores use wait() and signal() for signaling. To prevent deadlocks, the operating system "
        "imposes strict resource ordering to break the circular wait condition."
    )

    audited_report = coordinator.grade_and_audit_assignment(
        assignment_title=title,
        assignment_instructions=instructions,
        rubric=rubric,
        student_submission=submission,
        student_id="STU-COORD-02",
    )

    assert isinstance(audited_report, GradingReport)
    assert audited_report.percentage >= 70.0
    assert len(audited_report.evaluations) == len(rubric.criteria)


def test_create_coordinator_factory(os_lecture_document):
    coord = create_coordinator(chunks=os_lecture_document.chunks)
    assert isinstance(coord, MultiAgentCoordinator)
    assert coord.retriever.is_indexed
    assert coord.retriever.chunk_count == len(os_lecture_document.chunks)


def test_rubric_agent_with_llm_provider(retriever, sample_curriculum):
    """Verifies RubricAgent executes via provider and enforces mathematical normalization."""
    mock_provider = MockLLMProvider()
    agent = RubricAgent(retriever=retriever, provider=mock_provider)
    rubric = agent.generate_rubric(sample_curriculum, total_marks=20.0)

    assert isinstance(rubric, AssessmentRubric)
    assert len(rubric.criteria) == 3
    assert abs(sum(c.weight for c in rubric.criteria) - 1.0) < 1e-4
    assert abs(sum(c.max_score for c in rubric.criteria) - 20.0) < 1e-2


def test_assessment_agent_with_llm_provider(retriever, sample_curriculum):
    """Verifies AssessmentAgent executes via provider and normalizes question point allocations."""
    mock_provider = MockLLMProvider()
    agent = AssessmentAgent(retriever=retriever, provider=mock_provider)
    assessment = agent.generate_assessment(sample_curriculum, question_count=3, total_points=15.0)

    assert isinstance(assessment, GeneratedAssessment)
    assert len(assessment.questions) == 3
    assert abs(assessment.total_points - 15.0) < 1e-2
    for q in assessment.questions:
        assert q.max_points > 0
        assert len(q.prompt) > 0
        assert len(q.reference_answer) > 0


def test_grading_agent_with_llm_provider(retriever, sample_rubric_and_question):
    """Verifies GradingAgent executes via provider for both question and assignment grading."""
    rubric, question = sample_rubric_and_question
    mock_provider = MockLLMProvider()
    agent = GradingAgent(retriever=retriever, provider=mock_provider)

    # 1. Question grading
    student_ans = "A mutex has thread ownership while semaphore is a signaling mechanism."
    report_q = agent.grade_question_submission(question=question, rubric=rubric, student_answer=student_ans)
    assert isinstance(report_q, GradingReport)
    assert report_q.total_score > 0
    assert report_q.max_possible_score == sum(c.max_score for c in rubric.criteria)

    # 2. Assignment grading
    report_assign = agent.grade_assignment_submission(
        assignment_title="Concurrency Lab",
        assignment_instructions="Compare mutex and semaphore.",
        rubric=rubric,
        student_submission=student_ans,
    )
    assert isinstance(report_assign, GradingReport)
    assert report_assign.total_score > 0


def test_agent_automatic_fallback_on_provider_error(retriever, sample_curriculum, sample_rubric_and_question):
    """
    CRITICAL RESILIENCE TEST:
    Verifies that if an LLM provider throws an exception (simulating API rate limits or network timeout),
    the agents catch it gracefully and fall back to deterministic heuristics without crashing!
    """
    class FailingProvider(BaseLLMProvider):
        def generate_rubric(self, lecture_title, lecture_content):
            raise ConnectionError("Simulated LLM API 503 Service Unavailable")

        def generate_assessment(self, lecture_title, lecture_content, question_count=3):
            raise TimeoutError("Simulated LLM API Rate Limit 429")

        def grade_exam_question(self, question, rubric, student_answer):
            raise RuntimeError("Simulated Bedrock/Gemini Quota Exceeded")

        def grade_assignment(self, assignment_title, assignment_instructions, rubric, student_submission):
            raise RuntimeError("Simulated Cloud Auth Failure")

    failing_provider = FailingProvider()

    # 1. RubricAgent fallback
    rubric_agent = RubricAgent(retriever=retriever, provider=failing_provider)
    rubric = rubric_agent.generate_rubric(sample_curriculum, total_marks=10.0)
    assert isinstance(rubric, AssessmentRubric)
    assert abs(sum(c.weight for c in rubric.criteria) - 1.0) < 1e-4

    # 2. AssessmentAgent fallback
    assessment_agent = AssessmentAgent(retriever=retriever, provider=failing_provider)
    assessment = assessment_agent.generate_assessment(sample_curriculum, question_count=2, total_points=10.0)
    assert isinstance(assessment, GeneratedAssessment)
    assert len(assessment.questions) == 2

    # 3. GradingAgent fallback
    rubric_sample, question_sample = sample_rubric_and_question
    grading_agent = GradingAgent(retriever=retriever, provider=failing_provider)
    ans = "A mutex has thread ownership and semaphores use wait and signal."
    report = grading_agent.grade_question_submission(question=question_sample, rubric=rubric_sample, student_answer=ans)
    assert isinstance(report, GradingReport)
    assert report.total_score > 0


def test_create_live_coordinator_factory(os_lecture_document):
    """Verifies create_live_coordinator factory initializes with GeminiLiveProvider or Mock."""
    coord = create_live_coordinator(chunks=os_lecture_document.chunks)
    assert isinstance(coord, MultiAgentCoordinator)
    assert coord.retriever.is_indexed
    assert coord.provider is not None






