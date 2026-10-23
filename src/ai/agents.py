"""
Multi-Agent System for Didactic AI.

Each agent is a specialized AI worker with a single responsibility.
All agents share access to:
  - The RAG Retriever (to search lecture slides)
  - The LLM Provider (to call the AI model)

Agents are built one at a time and coordinated by the
MultiAgentCoordinator (added in a later step).

Current Agents:
  1. CurriculumAgent: Reads lecture slides via RAG and extracts
     structured learning objectives classified by Bloom's Taxonomy.
"""

import re
from typing import List, Optional

from src.ai.rag import LectureRetriever, RetrievalResult
from src.ai.schemas import (
    BloomLevel,
    CurriculumAnalysis,
    DocumentChunk,
    IngestedDocument,
    LearningObjective,
)


# ---------------------------------------------------------------------------
# Base Agent (Shared foundation for all agents)
# ---------------------------------------------------------------------------

class BaseAgent:
    """
    Base class that every Didactic AI agent inherits from.
    Provides shared access to the RAG retriever and the LLM provider.
    """

    def __init__(self, retriever: LectureRetriever, provider=None):
        self.retriever = retriever   # Central RAG search engine
        self.provider = provider     # LLM provider (Mock, Gemini, or Bedrock)


# ---------------------------------------------------------------------------
# Agent 1: CurriculumAgent (The Syllabus Expert)
# ---------------------------------------------------------------------------

# Keyword patterns that indicate Bloom's Taxonomy cognitive levels
# These are used by the Mock provider to classify objectives without calling an API
BLOOM_INDICATORS = {
    BloomLevel.REMEMBER: [
        "definition", "define", "list", "identify", "name", "recall", "state",
        "label", "recognize", "describe",
    ],
    BloomLevel.UNDERSTAND: [
        "explain", "summarize", "interpret", "classify", "compare",
        "distinguish", "difference", "contrast", "overview", "concept",
    ],
    BloomLevel.APPLY: [
        "implement", "execute", "use", "solve", "demonstrate", "calculate",
        "apply", "construct", "produce", "operation", "algorithm",
    ],
    BloomLevel.ANALYZE: [
        "analyze", "examine", "differentiate", "organize", "attribute",
        "deconstruct", "trade-off", "tradeoff", "compare", "evaluate",
        "condition", "requirement", "strategy", "prevention", "detection",
    ],
    BloomLevel.EVALUATE: [
        "evaluate", "judge", "justify", "critique", "assess", "defend",
        "argue", "support", "prioritize",
    ],
    BloomLevel.CREATE: [
        "design", "create", "construct", "develop", "formulate", "propose",
        "invent", "compose", "plan",
    ],
}


def classify_bloom_level(text: str) -> BloomLevel:
    """
    Determines the Bloom's Taxonomy level of a text chunk by scanning
    for indicator keywords. Higher-order levels take priority.

    This allows the CurriculumAgent to work offline with MockLLMProvider
    without needing any API calls.
    """
    text_lower = text.lower()
    scores = {}

    # Score each Bloom level by counting matching indicator keywords
    for level, keywords in BLOOM_INDICATORS.items():
        count = sum(1 for kw in keywords if kw in text_lower)
        scores[level] = count

    # Return the level with the highest match count
    # Priority order (highest cognitive level wins on ties)
    priority = [
        BloomLevel.CREATE, BloomLevel.EVALUATE, BloomLevel.ANALYZE,
        BloomLevel.APPLY, BloomLevel.UNDERSTAND, BloomLevel.REMEMBER,
    ]

    best_level = BloomLevel.UNDERSTAND  # Default if no indicators found
    best_score = 0

    for level in priority:
        if scores.get(level, 0) > best_score:
            best_score = scores[level]
            best_level = level

    return best_level


def extract_topic_from_chunk(chunk: DocumentChunk) -> str:
    """
    Extracts a concise topic name from a chunk's content.
    Uses the first meaningful sentence or heading as the topic.
    """
    lines = [line.strip() for line in chunk.content.split("\n") if line.strip()]
    if not lines:
        return f"Topic from Slide {chunk.page_number}"

    # Look for a heading-style line (short, capitalized, no period at the end)
    for line in lines[:3]:
        if len(line) < 80 and not line.endswith("."):
            return line

    # Fallback: use the first sentence, truncated
    first_sentence = re.split(r"[.!?]", lines[0])[0].strip()
    if len(first_sentence) > 60:
        first_sentence = first_sentence[:57] + "..."
    return first_sentence


class CurriculumAgent(BaseAgent):
    """
    Agent 1: The Syllabus Expert.

    Reads lecture slides via the RAG retriever and extracts
    structured learning objectives, each classified by:
      - Topic name (specific concept, not vague slide title)
      - Description (what the student should be able to do)
      - Bloom's Taxonomy level (remember / understand / apply / analyze)
      - Source page number (which slide teaches this concept)

    The output (CurriculumAnalysis) feeds directly into the RubricAgent
    and AssessmentAgent so that exams and rubrics are grounded in
    what was actually taught.
    """

    def extract_objectives(
        self,
        lecture_title: str,
        document: IngestedDocument,
    ) -> CurriculumAnalysis:
        """
        Analyzes all lecture chunks and produces structured learning objectives.

        Args:
            lecture_title: The name/title of the lecture.
            document: The ingested document with slide chunks.

        Returns:
            CurriculumAnalysis containing all identified learning objectives.
        """
        objectives: List[LearningObjective] = []

        for chunk in document.chunks:
            # Skip very short chunks (e.g., title-only slides)
            if chunk.token_estimate < 5:
                continue

            # Step 1: Extract the topic name from the chunk content
            topic = extract_topic_from_chunk(chunk)

            # Step 2: Classify the cognitive level using Bloom's indicators
            bloom_level = classify_bloom_level(chunk.content)

            # Step 3: Generate a description of what the student should know
            description = self._generate_objective_description(topic, bloom_level, chunk)

            # Step 4: Build the LearningObjective with the source page from RAG
            objective = LearningObjective(
                topic=topic,
                description=description,
                bloom_level=bloom_level,
                source_page=chunk.page_number,
            )
            objectives.append(objective)

        # Ensure we always have at least one objective
        if not objectives:
            objectives.append(
                LearningObjective(
                    topic=lecture_title,
                    description=f"Understand the core concepts presented in {lecture_title}.",
                    bloom_level=BloomLevel.UNDERSTAND,
                    source_page=1,
                )
            )

        return CurriculumAnalysis(
            lecture_title=lecture_title,
            objectives=objectives,
            total_concepts=len(objectives),
        )

    def _generate_objective_description(
        self,
        topic: str,
        bloom_level: BloomLevel,
        chunk: DocumentChunk,
    ) -> str:
        """
        Creates a student-facing description of what they should be able to do.
        Maps Bloom's level to an action verb for clarity.
        """
        verb_map = {
            BloomLevel.REMEMBER: "Recall and define",
            BloomLevel.UNDERSTAND: "Explain and describe",
            BloomLevel.APPLY: "Apply and implement",
            BloomLevel.ANALYZE: "Analyze and evaluate",
            BloomLevel.EVALUATE: "Critically assess and justify",
            BloomLevel.CREATE: "Design and construct",
        }

        verb = verb_map.get(bloom_level, "Understand")
        return f"{verb} the key concepts of '{topic}' as covered on Slide {chunk.page_number}."
