"""
RAG (Retrieval-Augmented Generation) Engine for Didactic AI.

Indexes lecture slide chunks from IngestedDocument and provides
semantic search to retrieve the most relevant slides for any query.
All agents (Curriculum, Assessment, Grading, Auditor) use this
single centralized retriever as their knowledge source.

Architecture:
- Zero external dependencies (no Pinecone, no Weaviate, no vector DB fees).
- In-memory TF-IDF sparse retrieval runs inside AWS Lambda for $0.00.
- Designed for lecture-sized documents (20-60 slides) where full vector
  databases are unnecessary overhead.
"""

import math
import re
from collections import Counter
from dataclasses import dataclass, field
from typing import Dict, List, Optional

from src.ai.schemas import DocumentChunk, IngestedDocument


# ---------------------------------------------------------------------------
# Retrieval Result Schema
# ---------------------------------------------------------------------------

@dataclass
class RetrievalResult:
    """A single retrieved chunk with its relevance score and match rationale."""
    chunk: DocumentChunk
    relevance_score: float  # 0.0 to 1.0 (higher = more relevant)
    match_rationale: str    # Human-readable explanation of why this slide matched


# ---------------------------------------------------------------------------
# Text Processing Utilities
# ---------------------------------------------------------------------------

# Common English stopwords that carry no semantic meaning
STOPWORDS = frozenset({
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "is", "it", "as", "was", "are", "be",
    "has", "had", "have", "been", "this", "that", "which", "who", "whom",
    "not", "no", "do", "does", "did", "will", "would", "could", "should",
    "may", "might", "shall", "can", "if", "then", "than", "so", "such",
    "each", "every", "all", "any", "both", "few", "more", "most", "other",
    "some", "only", "own", "same", "too", "very", "just", "about", "above",
    "also", "into", "over", "after", "before", "between", "through", "during",
    "its", "their", "our", "your", "my", "his", "her", "we", "they", "you",
})


def tokenize(text: str) -> List[str]:
    """
    Converts raw text into a list of cleaned, lowercase tokens.
    Removes stopwords and tokens shorter than 2 characters.
    """
    raw_tokens = re.findall(r"[a-zA-Z0-9]+", text.lower())
    return [t for t in raw_tokens if t not in STOPWORDS and len(t) >= 2]


def compute_tf(tokens: List[str]) -> Dict[str, float]:
    """
    Computes Term Frequency (TF) for a list of tokens.
    TF(term) = count(term) / total_tokens
    """
    counts = Counter(tokens)
    total = len(tokens)
    if total == 0:
        return {}
    return {term: count / total for term, count in counts.items()}


# ---------------------------------------------------------------------------
# The Central RAG Retriever
# ---------------------------------------------------------------------------

class LectureRetriever:
    """
    Central Retrieval-Augmented Generation engine for Didactic AI.

    Indexes lecture slide chunks using TF-IDF (Term Frequency - Inverse
    Document Frequency) scoring and provides semantic search to find
    the most relevant slides for any text query.

    Usage:
        retriever = LectureRetriever()
        retriever.index_document(ingested_doc)
        results = retriever.retrieve("What is circular wait?", top_k=3)
    """

    def __init__(self):
        self._chunks: List[DocumentChunk] = []
        self._chunk_tokens: List[List[str]] = []  # Tokenized version of each chunk
        self._chunk_tf: List[Dict[str, float]] = []  # TF scores per chunk
        self._idf: Dict[str, float] = {}  # IDF scores across all chunks
        self._indexed: bool = False

    def index_document(self, document: IngestedDocument) -> None:
        """
        Indexes all chunks from an IngestedDocument.
        Builds the TF-IDF index for fast retrieval.
        
        This is called once when the teacher uploads a lecture PDF.
        """
        self._chunks = list(document.chunks)
        self._chunk_tokens = []
        self._chunk_tf = []

        # Step 1: Tokenize every chunk and compute Term Frequency
        for chunk in self._chunks:
            tokens = tokenize(chunk.content)
            self._chunk_tokens.append(tokens)
            self._chunk_tf.append(compute_tf(tokens))

        # Step 2: Compute Inverse Document Frequency (IDF) across all chunks
        # IDF(term) = log(N / df(term)) where df = number of chunks containing the term
        num_chunks = len(self._chunks)
        doc_freq: Dict[str, int] = Counter()
        for tokens in self._chunk_tokens:
            unique_terms = set(tokens)
            for term in unique_terms:
                doc_freq[term] += 1

        self._idf = {}
        for term, df in doc_freq.items():
            # Add 1 to denominator to prevent division by zero (smoothed IDF)
            self._idf[term] = math.log((num_chunks + 1) / (df + 1)) + 1.0

        self._indexed = True

    def retrieve(self, query: str, top_k: int = 3) -> List[RetrievalResult]:
        """
        Retrieves the top-k most relevant lecture chunks for a given query.
        Uses TF-IDF cosine-like scoring to rank chunks by relevance.

        Args:
            query: The search text (e.g., a student's answer or a topic question).
            top_k: Number of top results to return (default: 3).

        Returns:
            List of RetrievalResult objects sorted by relevance (highest first).
        """
        if not self._indexed or not self._chunks:
            return []

        query_tokens = tokenize(query)
        if not query_tokens:
            return []

        query_tf = compute_tf(query_tokens)

        # Score each chunk against the query using TF-IDF dot product
        scored_results: List[tuple] = []

        for idx, chunk in enumerate(self._chunks):
            chunk_tf = self._chunk_tf[idx]
            score = 0.0

            # For each query term, compute: query_tf * chunk_tf * idf^2
            for term, q_tf in query_tf.items():
                if term in chunk_tf:
                    idf = self._idf.get(term, 1.0)
                    score += q_tf * chunk_tf[term] * (idf ** 2)

            if score > 0:
                scored_results.append((score, idx, chunk))

        # Sort by score descending and take top_k
        scored_results.sort(key=lambda x: x[0], reverse=True)
        top_results = scored_results[:top_k]

        if not top_results:
            return []

        # Normalize scores to 0.0 - 1.0 range (relative to the best match)
        max_score = top_results[0][0]
        results: List[RetrievalResult] = []

        for raw_score, idx, chunk in top_results:
            normalized = round(raw_score / max_score, 4) if max_score > 0 else 0.0

            # Build human-readable match rationale
            query_terms_set = set(query_tokens)
            chunk_terms_set = set(self._chunk_tokens[idx])
            matched_terms = query_terms_set.intersection(chunk_terms_set)

            rationale = (
                f"Slide {chunk.page_number} matched {len(matched_terms)} query terms "
                f"({', '.join(sorted(list(matched_terms)[:5]))})"
            )

            results.append(RetrievalResult(
                chunk=chunk,
                relevance_score=normalized,
                match_rationale=rationale,
            ))

        return results

    def format_retrieved_context(self, results: List[RetrievalResult]) -> str:
        """
        Formats retrieved chunks into clean prompt-ready context text
        with slide page numbers and relevance scores.

        This text is injected into agent prompts so the AI knows
        exactly which lecture slides to reference when grading.
        """
        if not results:
            return "[No relevant lecture context retrieved.]"

        lines = ["[RETRIEVED LECTURE EVIDENCE]"]
        for r in results:
            score_pct = round(r.relevance_score * 100, 1)
            # Truncate very long chunks to keep prompts within token limits
            content_preview = r.chunk.content[:500]
            lines.append(
                f"\n--- Slide Page {r.chunk.page_number} (Relevance: {score_pct}%) ---\n"
                f"{content_preview}"
            )
        lines.append("\n[END RETRIEVED CONTEXT]")
        return "\n".join(lines)

    @property
    def is_indexed(self) -> bool:
        """Returns True if a document has been indexed and is ready for queries."""
        return self._indexed

    @property
    def chunk_count(self) -> int:
        """Returns the number of indexed chunks."""
        return len(self._chunks)


# ---------------------------------------------------------------------------
# Factory Helper
# ---------------------------------------------------------------------------

def create_retriever(document: Optional[IngestedDocument] = None) -> LectureRetriever:
    """
    Creates a LectureRetriever, optionally indexing a document immediately.
    """
    retriever = LectureRetriever()
    if document is not None:
        retriever.index_document(document)
    return retriever
