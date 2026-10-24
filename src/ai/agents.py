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
    AssessmentRubric,
    BloomLevel,
    CurriculumAnalysis,
    DocumentChunk,
    IngestedDocument,
    LearningObjective,
    RubricCriterion,
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


# ---------------------------------------------------------------------------
# Agent 2: RubricAgent (The Standards Officer)
# ---------------------------------------------------------------------------

class RubricAgent(BaseAgent):
    """
    Agent 2: The Standards Officer.

    Converts learning objectives from CurriculumAgent into a canonical,
    mathematically normalized grading rubric (AssessmentRubric).

    Key Principles:
      1. Normalized Weights: Criteria weights strictly sum to 1.0 (100%).
      2. Grounded Criteria: References the specific topics and slide pages
         discovered by the CurriculumAgent.
      3. Proportional Scoring: max_score = total_marks * weight.
    """

    def generate_rubric(
        self,
        curriculum: CurriculumAnalysis,
        target_criteria_count: int = 4,
        total_marks: float = 10.0,
    ) -> AssessmentRubric:
        """
        Synthesizes a standardized AssessmentRubric from a CurriculumAnalysis.

        Args:
            curriculum: The CurriculumAnalysis produced by CurriculumAgent.
            target_criteria_count: Desired number of criteria (typically 3 or 4).
            total_marks: Total score of the assessment (default: 10.0).

        Returns:
            AssessmentRubric: Validated Pydantic rubric model with normalized weights.
        """
        rubric_id = f"RUB-{abs(hash(curriculum.lecture_title)) % 10000:04d}"

        # Collect topics and slide pages by cognitive domain
        foundational_topics = []
        applied_topics = []
        analytical_topics = []

        for obj in curriculum.objectives:
            ref = f"'{obj.topic}' (Slide {obj.source_page})"
            if obj.bloom_level in (BloomLevel.REMEMBER, BloomLevel.UNDERSTAND):
                foundational_topics.append(ref)
            elif obj.bloom_level == BloomLevel.APPLY:
                applied_topics.append(ref)
            else:  # ANALYZE, EVALUATE, CREATE
                analytical_topics.append(ref)

        # Build raw criteria templates
        raw_criteria = []

        # Criterion 1: Foundational / Conceptual Accuracy
        foundational_summary = ", ".join(foundational_topics[:3]) if foundational_topics else f"core concepts of {curriculum.lecture_title}"
        raw_criteria.append({
            "name": "Core Conceptual Understanding",
            "description": f"Demonstrates comprehensive mastery of foundational principles, specifically covering {foundational_summary}.",
            "base_weight": 0.35,
        })

        # Criterion 2: Technical Precision & Terminology
        raw_criteria.append({
            "name": "Technical Precision & Terminology",
            "description": "Uses precise, domain-specific academic terminology without vague assertions or conceptual conflation.",
            "base_weight": 0.25,
        })

        # Criterion 3: Practical Application / Implementation
        if target_criteria_count >= 3:
            applied_summary = ", ".join(applied_topics[:2]) if applied_topics else "algorithmic steps and practical mechanics"
            raw_criteria.append({
                "name": "Practical Application & Mechanics",
                "description": f"Correctly applies concepts to problem scenarios, accurately addressing {applied_summary}.",
                "base_weight": 0.25,
            })

        # Criterion 4: Analysis, Edge Cases & Trade-offs
        if target_criteria_count >= 4:
            analytical_summary = ", ".join(analytical_topics[:2]) if analytical_topics else "failure modes, constraints, and prevention strategies"
            raw_criteria.append({
                "name": "Critical Analysis & Edge Cases",
                "description": f"Evaluates constraints, trade-offs, and boundary conditions, especially regarding {analytical_summary}.",
                "base_weight": 0.15,
            })

        # --- Mathematical Normalization Layer ---
        # Guarantees that sum(weights) == 1.000 exactly
        total_raw = sum(c["base_weight"] for c in raw_criteria)
        normalized_criteria: List[RubricCriterion] = []
        running_weight_sum = 0.0

        for idx, rc in enumerate(raw_criteria):
            if idx == len(raw_criteria) - 1:
                # Last item absorbs any tiny float rounding difference to guarantee exact 1.0
                weight = round(1.0 - running_weight_sum, 4)
            else:
                weight = round(rc["base_weight"] / total_raw, 4)
                running_weight_sum += weight

            max_score = round(total_marks * weight, 2)

            normalized_criteria.append(
                RubricCriterion(
                    name=rc["name"],
                    description=rc["description"],
                    weight=weight,
                    max_score=max_score,
                )
            )

        return AssessmentRubric(
            rubric_id=rubric_id,
            title=f"Standardized Rubric: {curriculum.lecture_title}",
            criteria=normalized_criteria,
        )
