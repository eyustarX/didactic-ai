import pytest
from src.ai.schemas import DocumentChunk, IngestedDocument
from src.ai.rag import (
    tokenize,
    compute_tf,
    LectureRetriever,
    RetrievalResult,
    create_retriever,
)


@pytest.fixture
def sample_lecture_document():
    """Simulates a 5-slide Operating Systems lecture."""
    chunks = [
        DocumentChunk(
            chunk_id="chunk_001",
            page_number=1,
            content="Introduction to Operating Systems. This course covers process management, memory, and file systems.",
            token_estimate=15,
        ),
        DocumentChunk(
            chunk_id="chunk_002",
            page_number=2,
            content="The critical section problem requires mutual exclusion, progress, and bounded waiting.",
            token_estimate=12,
        ),
        DocumentChunk(
            chunk_id="chunk_003",
            page_number=3,
            content="A mutex is a locking mechanism with thread ownership. Only the thread that locked the mutex can unlock it. A semaphore is a signaling mechanism without ownership using wait and signal operations.",
            token_estimate=30,
        ),
        DocumentChunk(
            chunk_id="chunk_004",
            page_number=7,
            content="Deadlock occurs when processes are permanently blocked. The four Coffman conditions are mutual exclusion, hold and wait, no preemption, and circular wait.",
            token_estimate=25,
        ),
        DocumentChunk(
            chunk_id="chunk_005",
            page_number=14,
            content="Deadlock prevention eliminates one Coffman condition. Resource ordering prevents circular wait by requiring processes to request resources in strict ascending numerical order.",
            token_estimate=25,
        ),
    ]
    full_text = "\n\n".join(c.content for c in chunks)
    return IngestedDocument(
        filename="lecture_07_concurrency.pdf",
        total_pages=5,
        chunks=chunks,
        full_text=full_text,
    )


# ---------------------------------------------------------------------------
# Unit Tests: Text Processing Utilities
# ---------------------------------------------------------------------------

def test_tokenize_basic():
    tokens = tokenize("The mutex provides Mutual Exclusion for threads.")
    assert "mutex" in tokens
    assert "mutual" in tokens
    assert "exclusion" in tokens
    assert "threads" in tokens
    # Stopwords should be removed
    assert "the" not in tokens
    assert "for" not in tokens


def test_tokenize_empty():
    assert tokenize("") == []
    assert tokenize("a the is") == []  # All stopwords


def test_compute_tf():
    tokens = ["mutex", "lock", "mutex", "thread"]
    tf = compute_tf(tokens)
    assert tf["mutex"] == 2 / 4  # 0.5
    assert tf["lock"] == 1 / 4   # 0.25
    assert tf["thread"] == 1 / 4  # 0.25


def test_compute_tf_empty():
    assert compute_tf([]) == {}


# ---------------------------------------------------------------------------
# Unit Tests: LectureRetriever Indexing
# ---------------------------------------------------------------------------

def test_indexing(sample_lecture_document):
    retriever = LectureRetriever()
    assert not retriever.is_indexed
    assert retriever.chunk_count == 0

    retriever.index_document(sample_lecture_document)
    assert retriever.is_indexed
    assert retriever.chunk_count == 5


def test_create_retriever_factory(sample_lecture_document):
    retriever = create_retriever(sample_lecture_document)
    assert retriever.is_indexed
    assert retriever.chunk_count == 5


# ---------------------------------------------------------------------------
# Unit Tests: Retrieval & Relevance Scoring
# ---------------------------------------------------------------------------

def test_retrieve_deadlock_query(sample_lecture_document):
    retriever = create_retriever(sample_lecture_document)
    results = retriever.retrieve("What are the four Coffman conditions for deadlock?", top_k=3)

    assert len(results) > 0
    assert len(results) <= 3

    # The top result should be Slide 7 (Coffman conditions) or Slide 14 (prevention)
    top = results[0]
    assert isinstance(top, RetrievalResult)
    assert top.relevance_score == 1.0  # Best match is always normalized to 1.0
    assert top.chunk.page_number in (7, 14)  # These slides discuss deadlock conditions


def test_retrieve_mutex_semaphore_query(sample_lecture_document):
    retriever = create_retriever(sample_lecture_document)
    results = retriever.retrieve("mutex ownership vs semaphore signaling", top_k=2)

    assert len(results) > 0
    top = results[0]
    # Slide 3 covers mutex vs semaphore
    assert top.chunk.page_number == 3
    assert "mutex" in top.match_rationale.lower() or "semaphore" in top.match_rationale.lower()


def test_retrieve_unrelated_query(sample_lecture_document):
    retriever = create_retriever(sample_lecture_document)
    results = retriever.retrieve("quantum physics photon entanglement", top_k=3)

    # No slides should match quantum physics in an OS lecture
    assert len(results) == 0


def test_retrieve_empty_query(sample_lecture_document):
    retriever = create_retriever(sample_lecture_document)
    results = retriever.retrieve("", top_k=3)
    assert len(results) == 0


def test_retrieve_before_indexing():
    retriever = LectureRetriever()
    results = retriever.retrieve("deadlock", top_k=3)
    assert len(results) == 0


# ---------------------------------------------------------------------------
# Unit Tests: Context Formatting for Agent Prompts
# ---------------------------------------------------------------------------

def test_format_retrieved_context(sample_lecture_document):
    retriever = create_retriever(sample_lecture_document)
    results = retriever.retrieve("circular wait prevention ordering", top_k=2)

    formatted = retriever.format_retrieved_context(results)
    assert "[RETRIEVED LECTURE EVIDENCE]" in formatted
    assert "[END RETRIEVED CONTEXT]" in formatted
    assert "Slide Page" in formatted
    assert "Relevance:" in formatted


def test_format_empty_context():
    retriever = LectureRetriever()
    formatted = retriever.format_retrieved_context([])
    assert "No relevant lecture context retrieved" in formatted
