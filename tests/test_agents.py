import pytest
from src.ai.schemas import (
    BloomLevel,
    CurriculumAnalysis,
    DocumentChunk,
    IngestedDocument,
    LearningObjective,
)
from src.ai.rag import LectureRetriever, create_retriever
from src.ai.agents import (
    BaseAgent,
    CurriculumAgent,
    classify_bloom_level,
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
