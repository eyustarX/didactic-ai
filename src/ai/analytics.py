"""
Cohort Misconception Analytics Engine for Didactic AI.

Aggregates individual student GradingReports across an entire class or cohort to:
  1. Compute descriptive cohort statistics (mean, median, min, max, standard deviation).
  2. Compute per-criterion cohort mastery levels and identify weak rubric dimensions.
  3. Mine and cluster frequent student misconceptions using RAG slide grounding.
  4. Generate actionable lecture recap recommendations for the instructor's next session.
"""

import math
import re
from collections import Counter, defaultdict
from typing import Dict, List, Optional, Set, Tuple

from src.ai.rag import LectureRetriever
from src.ai.schemas import (
    CohortAnalyticsReport,
    CohortMisconception,
    CriterionMastery,
    GradingReport,
)


# Canonical topic signatures for clustering common student misconceptions
CANONICAL_TOPIC_PATTERNS = [
    {
        "topic": "Deadlock Conditions & Circular Wait",
        "keywords": ["deadlock", "circular wait", "coffman", "hold and wait", "preemption"],
        "default_slide": 4,
    },
    {
        "topic": "Mutex Ownership vs. Semaphore Signaling",
        "keywords": ["mutex", "semaphore", "ownership", "signaling", "wait()", "signal()"],
        "default_slide": 3,
    },
    {
        "topic": "Critical Section Problem & Bounded Waiting",
        "keywords": ["critical section", "mutual exclusion", "progress", "bounded waiting", "race condition"],
        "default_slide": 2,
    },
    {
        "topic": "Resource Ordering Protocols",
        "keywords": ["ordering", "resource allocation", "prevention", "detection", "recovery"],
        "default_slide": 4,
    },
]


class CohortAnalyticsEngine:
    """
    Cohort Misconception Analytics Engine.

    Aggregates student GradingReports to provide class-wide pedagogical intelligence
    for university lecturers.
    """

    def __init__(self, retriever: Optional[LectureRetriever] = None):
        self.retriever = retriever

    def analyze_cohort(
        self,
        reports: List[GradingReport],
    ) -> CohortAnalyticsReport:
        """
        Performs holistic class-wide analytics across a list of student GradingReports.

        Args:
            reports: List of student GradingReport models.

        Returns:
            CohortAnalyticsReport: Validated Pydantic cohort analytics model.
        """
        if not reports:
            return CohortAnalyticsReport(
                total_submissions=0,
                class_average=0.0,
                class_median=0.0,
                min_score=0.0,
                max_score=0.0,
                standard_deviation=0.0,
                criterion_masteries=[],
                top_misconceptions=[],
                recommended_lecture_recap=["No student submissions available for cohort analysis."],
            )

        percentages = [r.percentage for r in reports]
        mean_score, median_score, min_score, max_score, std_dev = self._compute_statistics(percentages)

        criterion_masteries = self._compute_criterion_masteries(reports)
        top_misconceptions = self._mine_misconceptions(reports)
        lecture_recap = self._generate_lecture_recap(
            class_average=mean_score,
            criterion_masteries=criterion_masteries,
            misconceptions=top_misconceptions,
        )

        return CohortAnalyticsReport(
            total_submissions=len(reports),
            class_average=mean_score,
            class_median=median_score,
            min_score=min_score,
            max_score=max_score,
            standard_deviation=std_dev,
            criterion_masteries=criterion_masteries,
            top_misconceptions=top_misconceptions,
            recommended_lecture_recap=lecture_recap,
        )

    def _compute_statistics(
        self,
        scores: List[float],
    ) -> Tuple[float, float, float, float, float]:
        """
        Computes (mean, median, min, max, standard deviation) for a list of scores.
        """
        n = len(scores)
        if n == 0:
            return 0.0, 0.0, 0.0, 0.0, 0.0

        mean_val = round(sum(scores) / n, 1)

        sorted_scores = sorted(scores)
        if n % 2 == 1:
            median_val = sorted_scores[n // 2]
        else:
            median_val = round((sorted_scores[n // 2 - 1] + sorted_scores[n // 2]) / 2.0, 1)

        min_val = min(scores)
        max_val = max(scores)

        if n > 1:
            variance = sum((s - mean_val) ** 2 for s in scores) / n
            std_dev = round(math.sqrt(variance), 1)
        else:
            std_dev = 0.0

        return mean_val, median_val, min_val, max_val, std_dev

    def _compute_criterion_masteries(
        self,
        reports: List[GradingReport],
    ) -> List[CriterionMastery]:
        """
        Aggregates performance across each rubric criterion.
        """
        totals_awarded: Dict[str, float] = defaultdict(float)
        max_scores: Dict[str, float] = {}
        counts: Dict[str, int] = defaultdict(int)

        for report in reports:
            for ev in report.evaluations:
                name = ev.criterion_name
                totals_awarded[name] += ev.score_awarded
                max_scores[name] = ev.max_score
                counts[name] += 1

        masteries: List[CriterionMastery] = []
        for name, total_awarded in totals_awarded.items():
            count = counts[name]
            max_score = max_scores[name]
            avg_score = round(total_awarded / count, 2)
            mastery_pct = round((avg_score / max_score) * 100.0, 1) if max_score > 0 else 0.0

            if mastery_pct >= 80.0:
                level = "High Mastery"
            elif mastery_pct >= 60.0:
                level = "Moderate Mastery"
            else:
                level = "Low Mastery (Needs Review)"

            masteries.append(
                CriterionMastery(
                    criterion_name=name,
                    average_score=avg_score,
                    max_score=max_score,
                    mastery_percentage=mastery_pct,
                    mastery_level=level,
                )
            )

        # Sort by mastery percentage ascending (weakest dimensions first)
        masteries.sort(key=lambda m: m.mastery_percentage)
        return masteries

    def _mine_misconceptions(
        self,
        reports: List[GradingReport],
    ) -> List[CohortMisconception]:
        """
        Mines student gap statements and areas to review to cluster common misconceptions.
        Anchors each cluster to the course slide deck via RAG.
        """
        total_students = len(reports)
        if total_students == 0:
            return []

        # Student-level topic tracking
        students_per_pattern: Dict[str, Set[str]] = defaultdict(set)
        samples_per_pattern: Dict[str, List[str]] = defaultdict(list)
        slide_per_pattern: Dict[str, int] = {}

        for report in reports:
            student_id = report.student_id

            # Collect all student gaps and review notes
            student_notes = []
            for ev in report.evaluations:
                student_notes.extend(ev.gaps)
            student_notes.extend(report.areas_to_review)

            combined_text = " ".join(student_notes).lower()

            for pattern in CANONICAL_TOPIC_PATTERNS:
                topic = pattern["topic"]
                keywords = pattern["keywords"]

                # If student notes match keywords for this pattern
                if any(kw in combined_text for kw in keywords):
                    students_per_pattern[topic].add(student_id)
                    # Save a sample gap statement
                    for note in student_notes:
                        if any(kw in note.lower() for kw in keywords) and note not in samples_per_pattern[topic]:
                            samples_per_pattern[topic].append(note)
                            if len(samples_per_pattern[topic]) >= 2:
                                break

                    # Determine slide reference
                    slide_num = pattern["default_slide"]
                    if self.retriever and self.retriever.is_indexed:
                        results = self.retriever.retrieve(topic, top_k=1)
                        if results:
                            slide_num = results[0].chunk.page_number
                    slide_per_pattern[topic] = slide_num

        misconceptions: List[CohortMisconception] = []
        for topic, student_ids in students_per_pattern.items():
            count = len(student_ids)
            pct = round((count / total_students) * 100.0, 1)

            misconceptions.append(
                CohortMisconception(
                    topic=topic,
                    affected_students_count=count,
                    affected_percentage=pct,
                    sample_gaps=samples_per_pattern[topic][:2],
                    source_page=slide_per_pattern.get(topic, 1),
                )
            )

        # Sort by affected percentage descending (most prevalent misconceptions first)
        misconceptions.sort(key=lambda m: m.affected_percentage, reverse=True)
        return misconceptions

    def _generate_lecture_recap(
        self,
        class_average: float,
        criterion_masteries: List[CriterionMastery],
        misconceptions: List[CohortMisconception],
    ) -> List[str]:
        """
        Synthesizes actionable, slide-grounded recommendations for the instructor's next lecture.
        """
        recap: List[str] = []

        # 1. Performance Overview Insight
        if class_average >= 80.0:
            recap.append(f"[COHORT MASTERY]: Strong overall performance ({class_average}% class average). Proceed with planned syllabus and introduce advanced concepts.")
        elif class_average >= 60.0:
            recap.append(f"[COHORT MASTERY]: Moderate overall performance ({class_average}% class average). Allocate 10-15 minutes in next lecture for concept clarification.")
        else:
            recap.append(f"[ALERT - CRITICAL GAPS]: Substandard cohort performance ({class_average}% class average). A dedicated review session is strongly recommended before advancing.")

        # 2. Top Misconception Remediation Prescriptions
        for m in misconceptions[:2]:
            slide_ref = f"Slide {m.source_page}" if m.source_page else "the lecture notes"
            recap.append(
                f"[PRIORITY RECAP]: {m.affected_percentage}% of students struggled with '{m.topic}'. "
                f"Dedicate 5-7 minutes reviewing {slide_ref} with concrete examples."
            )

        # 3. Weakest Rubric Criterion Insight
        low_masteries = [cm for cm in criterion_masteries if cm.mastery_percentage < 70.0]
        if low_masteries:
            weakest = low_masteries[0]
            recap.append(
                f"[RUBRIC FOCUS]: '{weakest.criterion_name}' exhibited the lowest cohort mastery ({weakest.mastery_percentage}%). "
                f"Highlight expected technical rigor and precise terminology."
            )

        # 4. Formative Assessment Action
        if misconceptions:
            top_topic = misconceptions[0].topic
            recap.append(
                f"[ACTION ITEM]: Administer a 2-question formative quiz at the start of next class testing '{top_topic}' to reinforce recovery."
            )

        return recap


def analyze_cohort(
    reports: List[GradingReport],
    retriever: Optional[LectureRetriever] = None,
) -> CohortAnalyticsReport:
    """
    Convenience functional entry point for Cohort Misconception Analytics.
    """
    engine = CohortAnalyticsEngine(retriever=retriever)
    return engine.analyze_cohort(reports=reports)
