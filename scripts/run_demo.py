"""
Interactive / Terminal Demonstration Script for Didactic AI.
Runs the complete end-to-end evaluation pipeline on the sample benchmark dataset.

Usage:
    python scripts/run_demo.py
"""

import sys
import json
from pathlib import Path

# Ensure UTF-8 output encoding for cross-platform terminals (Windows/Linux/Mac)
if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Add project root to sys.path
root_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root_dir))

from src.ai.engine import get_engine
from src.ai.schemas import AssessmentRubric


def run_demo():
    print("=" * 72)
    print(">>> DIDACTIC AI - ACADEMIC EVALUATION & GRADING BENCHMARK DEMO <<<")
    print("=" * 72)

    # 1. Load Sample Data
    samples_dir = root_dir / "data" / "samples"
    with open(samples_dir / "sample_lecture.txt", "r", encoding="utf-8") as f:
        lecture_text = f.read()

    with open(samples_dir / "sample_assignment.json", "r", encoding="utf-8") as f:
        assignment_info = json.load(f)

    with open(samples_dir / "sample_student_submissions.json", "r", encoding="utf-8") as f:
        submissions = json.load(f)

    print(f"\n[Step 1] Ingested Lecture: '{assignment_info['course_name']}'")
    print(f"         Topic: {assignment_info['title']}")
    print(f"         Lecture content size: {len(lecture_text)} characters.")

    # 2. Initialize Engine
    engine = get_engine()
    print(f"\n[Step 2] Engine initialized using Provider: {engine.provider.__class__.__name__}")

    # 3. Generate Rubric
    print("\n[Step 3] Generating Standardized Rubric from Lecture Notes...")
    rubric = engine.generate_rubric(
        lecture_title=assignment_info["title"],
        lecture_content=lecture_text,
    )
    print(f"         [SUCCESS] Generated Rubric: '{rubric.title}' (ID: {rubric.rubric_id})")
    for idx, c in enumerate(rubric.criteria, 1):
        print(f"         - Criterion {idx}: {c.name:<32} | Weight: {c.weight*100:>2.0f}% | Max: {c.max_score} pts")

    # 4. Grade Benchmark Submissions
    print("\n[Step 4] Evaluating Student Submissions against Rubric...")
    print("-" * 72)

    for sub in submissions:
        print(f"\nStudent: {sub['student_name']} ({sub['student_id']})")
        print(f"Target Performance Tier: {sub['expected_grade_tier']}")
        
        report = engine.grade_assignment(
            assignment_title=assignment_info["title"],
            assignment_instructions=assignment_info["instructions"],
            rubric=rubric,
            student_submission=sub["submission_text"],
        )

        print(f"Final Grade: {report.total_score:.2f} / {report.max_possible_score:.2f} ({report.percentage:.1f}%)")
        print(f"Summary Feedback: {report.summary_feedback}")
        print("Evidence Citations & Breakdown:")
        for ev in report.evaluations:
            print(f"  * {ev.criterion_name}: {ev.score_awarded:.2f}/{ev.max_score:.2f} pts")
            print(f"    Evidence: {ev.evidence_citation[:75]}...")
            if ev.gaps:
                print(f"    Identified Gap: {ev.gaps[0]}")
        print("-" * 72)

    print("\n[SUCCESS] Benchmark Demonstration Complete! Ready for Hackathon Presentation.")


if __name__ == "__main__":
    run_demo()
