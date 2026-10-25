import io
import re
from typing import Any, Dict, List
import reportlab
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    HRFlowable,
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            super().showPage()
        super().save()

    def draw_page_number(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawString(54, 36, "Didactic AI \u2022 Academic Assessment Architecture")
        page_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(612 - 54, 36, page_text)
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.75)
        self.line(54, 48, 612 - 54, 48)
        self.restoreState()


def generate_assessment_exam_pdf(
    assessment_data: Dict[str, Any], include_solutions: bool = False
) -> bytes:
    """
    Generates a high-fidelity, printable academic exam paper or solution key in PDF format.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54,
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        "ExamTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#0F172A"),
        spaceAfter=4,
    )
    subtitle_style = ParagraphStyle(
        "ExamSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#475569"),
        spaceAfter=12,
    )
    section_head = ParagraphStyle(
        "SectionHead",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=14,
        textColor=colors.HexColor("#1E293B"),
        spaceAfter=6,
    )
    body_style = ParagraphStyle(
        "ExamBody",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=15,
        textColor=colors.HexColor("#1E293B"),
    )
    q_stem_style = ParagraphStyle(
        "QuestionStem",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=10.5,
        leading=15,
        textColor=colors.HexColor("#0F172A"),
    )
    mcq_opt_style = ParagraphStyle(
        "MCQOption",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=14,
        textColor=colors.HexColor("#334155"),
        leftIndent=18,
    )
    solution_style = ParagraphStyle(
        "SolutionText",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#065F46"),
    )

    story = []

    # 1. Header Banner
    exam_title = assessment_data.get("title") or "Academic Examination"
    course_name = assessment_data.get("course_name") or "Course Examination"
    total_score = float(assessment_data.get("max_score") or 0.0)
    questions = assessment_data.get("questions") or []

    if not total_score and questions:
        total_score = sum(float(q.get("max_marks", 5.0)) for q in questions)

    is_assignment = any(kw in exam_title.lower() for kw in ["assignment", "homework", "coursework", "project", "problem set"])
    if is_assignment:
        badge_text = (
            "OFFICIAL ASSIGNMENT SOLUTION KEY & RUBRICS"
            if include_solutions
            else "OFFICIAL COURSEWORK & ASSIGNMENT BRIEF"
        )
    else:
        badge_text = (
            "OFFICIAL INSTRUCTOR SOLUTION KEY & MARKING SCHEME"
            if include_solutions
            else "OFFICIAL EXAMINATION PAPER"
        )
    badge_color = "#047857" if include_solutions else "#1E40AF"

    story.append(
        Paragraph(
            f"<font color='{badge_color}'><b>{badge_text}</b></font>",
            subtitle_style,
        )
    )
    story.append(Paragraph(exam_title, title_style))
    story.append(
        Paragraph(
            f"<b>Module:</b> {course_name} &nbsp;&nbsp;|&nbsp;&nbsp; <b>Total Marks:</b> {total_score:g} Marks &nbsp;&nbsp;|&nbsp;&nbsp; <b>Questions:</b> {len(questions)}",
            subtitle_style,
        )
    )
    story.append(
        HRFlowable(
            width="100%",
            thickness=1.5,
            color=colors.HexColor("#0F172A"),
            spaceAfter=12,
        )
    )

    # 2. Candidate Information Block (Only on Student Paper)
    if not include_solutions:
        info_data = [
            [
                Paragraph("<b>Student Full Name:</b>", body_style),
                Paragraph("___________________________________________", body_style),
                Paragraph("<b>Student ID:</b>", body_style),
                Paragraph("___________________", body_style),
            ],
            [
                Paragraph("<b>Degree Program:</b>", body_style),
                Paragraph("___________________________________________", body_style),
                Paragraph("<b>Date:</b>", body_style),
                Paragraph("___________________", body_style),
            ],
            [
                Paragraph("<b>Invigilator Signature:</b>", body_style),
                Paragraph("___________________________________________", body_style),
                Paragraph("<b>Score:</b>", body_style),
                Paragraph(f"_____ / {total_score:g}", body_style),
            ],
        ]
        info_table = Table(
            info_data, colWidths=[110, 210, 90, 94], hAlign="LEFT"
        )
        info_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
                    ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor("#CBD5E1")),
                    ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
                    ("TOPPADDING", (0, 0), (-1, -1), 5),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                    ("LEFTPADDING", (0, 0), (-1, -1), 6),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ]
            )
        )
        story.append(info_table)
        story.append(Spacer(1, 12))

        # Instructions to Candidates Box
        instructions_text = (
            "<b>INSTRUCTIONS TO CANDIDATES:</b><br/>"
            "1. Check that this paper contains all listed questions before proceeding.<br/>"
            "2. For Multiple-Choice Questions, clearly mark your chosen answer in the space provided.<br/>"
            "3. For Short Answer / Written Questions, write your answers legibly in the designated answer areas.<br/>"
            f"4. Total marks allocated for this assessment: <b>{total_score:g} marks</b>."
        )
        inst_table = Table(
            [[Paragraph(instructions_text, body_style)]],
            colWidths=[504],
            hAlign="LEFT",
        )
        inst_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F1F5F9")),
                    ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#94A3B8")),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                    ("LEFTPADDING", (0, 0), (-1, -1), 8),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ]
            )
        )
        story.append(inst_table)
        story.append(Spacer(1, 16))
    else:
        # Solution Key Banner
        sol_banner = Table(
            [[
                Paragraph(
                    "<b>CONFIDENTIAL INSTRUCTOR DOCUMENT</b> \u2014 Contains official grading rubrics, model solutions, and scoring criteria.",
                    body_style,
                )
            ]],
            colWidths=[504],
            hAlign="LEFT",
        )
        sol_banner.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FEF3C7")),
                    ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor("#D97706")),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                    ("LEFTPADDING", (0, 0), (-1, -1), 8),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ]
            )
        )
        story.append(sol_banner)
        story.append(Spacer(1, 14))

    story.append(
        Paragraph("<b>EXAMINATION QUESTIONS</b>", section_head)
    )
    story.append(Spacer(1, 4))

    # 3. Render Each Question
    for idx, q in enumerate(questions):
        q_elements = []
        q_num = idx + 1
        q_marks = float(q.get("max_marks", 5.0))
        raw_text = (q.get("text") or q.get("prompt") or "").strip()

        # Parse stem vs choices
        lines = [ln.strip() for ln in raw_text.splitlines() if ln.strip()]
        stem_lines = []
        option_lines = []
        for line in lines:
            if re.match(r"^[A-E]\)", line):
                option_lines.append(line)
            else:
                if not option_lines:
                    stem_lines.append(line)
                else:
                    option_lines.append(line)

        stem_text = " ".join(stem_lines) if stem_lines else raw_text
        # Clean meta-phrases from stem
        stem_text = re.sub(
            r"(?i),?\s*\b(?:according to|based on|as covered in)\s+(?:the\s+)?(?:lecture|slides?|notes?)\b",
            "",
            stem_text,
        ).strip()

        # Header for question: [Question 1] ........ [X Marks]
        q_header_table = Table(
            [
                [
                    Paragraph(f"<b>Question {q_num}</b>", q_stem_style),
                    Paragraph(
                        f"<b>[{q_marks:g} Mark{'s' if q_marks != 1 else ''}]</b>",
                        ParagraphStyle(
                            "RightMarks",
                            parent=q_stem_style,
                            alignment=2,
                            textColor=colors.HexColor("#2563EB"),
                        ),
                    ),
                ]
            ],
            colWidths=[400, 104],
            hAlign="LEFT",
        )
        q_header_table.setStyle(
            TableStyle(
                [
                    ("TOPPADDING", (0, 0), (-1, -1), 2),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
                    ("LEFTPADDING", (0, 0), (-1, -1), 0),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ]
            )
        )
        q_elements.append(q_header_table)
        q_elements.append(Spacer(1, 4))

        # Question Prompt
        q_elements.append(Paragraph(stem_text, body_style))
        q_elements.append(Spacer(1, 6))

        # MCQ Options or Ruled Writing Lines
        if option_lines:
            for opt in option_lines:
                # Add check box [  ] in student mode
                opt_display = f"<font color='#64748B'><b>[ &nbsp; ]</b></font> &nbsp; {opt}"
                q_elements.append(Paragraph(opt_display, mcq_opt_style))
                q_elements.append(Spacer(1, 3))
            q_elements.append(Spacer(1, 8))
        else:
            # Fill-in-the-blank or Short answer / essay
            if not include_solutions:
                is_fitb = "___" in stem_text or q.get("question_type") == "fill_in_the_blank"
                if is_fitb:
                    q_elements.append(Spacer(1, 3))
                    q_elements.append(Paragraph("<b>Answer:</b> ________________________________________________", body_style))
                    q_elements.append(Spacer(1, 8))
                else:
                    # Provide ruled lines for writing
                    line_count = 5 if q_marks <= 2 else (8 if q_marks <= 5 else 12)
                    ruled_lines_data = [
                        [Paragraph("<font color='#CBD5E1'>____________________________________________________________________________________</font>", body_style)]
                        for _ in range(line_count)
                    ]
                    ruled_table = Table(
                        ruled_lines_data, colWidths=[504], hAlign="LEFT"
                    )
                    ruled_table.setStyle(
                        TableStyle(
                            [
                                ("TOPPADDING", (0, 0), (-1, -1), 1),
                                ("BOTTOMPADDING", (0, 0), (-1, -1), 1),
                                ("LEFTPADDING", (0, 0), (-1, -1), 0),
                                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                            ]
                        )
                    )
                    q_elements.append(Spacer(1, 4))
                    q_elements.append(Paragraph("<i>Answer:</i>", ParagraphStyle("AnsLabel", parent=body_style, fontSize=8.5, textColor=colors.HexColor("#64748B"))))
                    q_elements.append(ruled_table)
                    q_elements.append(Spacer(1, 10))

        # If solutions requested, show the Answer Key and Rubrics
        if include_solutions:
            ans_key = q.get("student_hint") or q.get("reference_answer") or "Model solution."
            ans_key = re.sub(r"^Official Answer Key:\s*", "", ans_key).strip()
            
            sol_content = f"<b>Official Answer Key & Model Solution:</b><br/>{ans_key}"
            
            rubric = q.get("rubric") or {}
            criteria = rubric.get("criteria") if isinstance(rubric, dict) else []
            if criteria:
                sol_content += "<br/><br/><b>Grading Rubric Criteria:</b>"
                for c in criteria:
                    c_name = c.get("name") or "Criterion"
                    c_max = c.get("max_score") or c.get("max_raw_score") or 1.0
                    c_desc = c.get("description") or ""
                    sol_content += f"<br/>\u2022 <b>{c_name}</b> ({c_max:g} pts): {c_desc}"

            sol_table = Table(
                [[Paragraph(sol_content, solution_style)]],
                colWidths=[504],
                hAlign="LEFT",
            )
            sol_table.setStyle(
                TableStyle(
                    [
                        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#ECFDF5")),
                        ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor("#059669")),
                        ("TOPPADDING", (0, 0), (-1, -1), 6),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                        ("LEFTPADDING", (0, 0), (-1, -1), 8),
                        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                    ]
                )
            )
            q_elements.append(Spacer(1, 4))
            q_elements.append(sol_table)
            q_elements.append(Spacer(1, 12))

        # Subtle divider between questions
        q_elements.append(
            HRFlowable(
                width="100%",
                thickness=0.5,
                color=colors.HexColor("#E2E8F0"),
                spaceAfter=12,
            )
        )

        story.append(KeepTogether(q_elements))

    # Build the document
    doc.build(story, canvasmaker=NumberedCanvas)
    return buffer.getvalue()
