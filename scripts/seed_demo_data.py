import uuid
from datetime import datetime, timezone
from src.db.session import get_session
from src.db.models import (
    User,
    LectureNote,
    Assessment,
    Question,
    Rubric,
    RubricCriterion,
    Student,
    Submission,
    SubmissionQuestionScore,
)

def seed():
    session = next(get_session())
    try:
        eyob = session.query(User).filter(User.email == 'eyob@gmail.com').first()
        if not eyob:
            print('Error: Eyob Tamiru (eyob@gmail.com) not found in database!')
            return

        lecturer_id = eyob.id
        print(f'Seeding demo data for: {eyob.name} ({eyob.email}) [ID: {lecturer_id}]')

        # 1. Create Source Lecture Material
        note_id = str(uuid.uuid4())
        note = LectureNote(
            id=note_id,
            lecturer_id=lecturer_id,
            name='CS101 - Algorithms and Programming Fundamentals.pdf',
            file_type='PDF',
            extracted_text='Introduction to Computer Science: Compiled vs Interpreted languages, Asymptotic Time Complexity (Big-O notation), and Recursive vs Iterative algorithms.',
            ingest_status='completed',
        )
        session.add(note)
        session.flush()
        print(f'1. Created Lecture Note: {note.name}')

        # 2. Create Assessment (Exam)
        ass_id = str(uuid.uuid4())
        assessment = Assessment(
            id=ass_id,
            lecture_note_id=note_id,
            lecturer_id=lecturer_id,
            title='CS101: Midterm Examination',
            version=1,
            status='locked',
            max_score=100.0,
            course_name='Computer Science 101',
            section='Section A',
            academic_year='2026',
            assessment_category='midterm',
            weight_pct=30.0,
        )
        session.add(assessment)
        session.flush()
        print(f'2. Created Assessment: {assessment.title} (Max: {assessment.max_score} pts)')

        # 3. Create Questions with Rubric Criteria
        questions_data = [
            {
                'pos': 1,
                'text': 'Explain the difference between compiled and interpreted programming languages, giving two real-world examples of each.',
                'hint': 'Consider execution speed, portability, and compilation stages.',
                'marks': 30.0,
                'criteria': [
                    ('Definition of compilation vs interpretation', 15.0),
                    ('Real-world language examples and performance trade-offs', 15.0),
                ]
            },
            {
                'pos': 2,
                'text': 'Describe the concept of asymptotic time complexity (Big-O notation). Compare linear search O(n) and binary search O(log n).',
                'hint': 'Explain prerequisites (e.g. sorted array) and best/worst-case scenarios.',
                'marks': 35.0,
                'criteria': [
                    ('Mathematical definition and purpose of Big-O notation', 15.0),
                    ('Detailed comparison of linear search vs binary search', 20.0),
                ]
            },
            {
                'pos': 3,
                'text': 'Design a modular function in pseudocode to calculate the factorial of an integer n both iteratively and recursively.',
                'hint': 'Be sure to include base conditions and parameter validations.',
                'marks': 35.0,
                'criteria': [
                    ('Iterative algorithm with proper loop control', 15.0),
                    ('Recursive algorithm with base case and inductive step', 20.0),
                ]
            },
        ]

        q_objs = []
        for qd in questions_data:
            qid = str(uuid.uuid4())
            q = Question(
                id=qid,
                assessment_id=ass_id,
                position=qd['pos'],
                text=qd['text'],
                student_hint=qd['hint'],
                max_marks=qd['marks'],
                source='ai',
            )
            session.add(q)
            session.flush()

            rub = Rubric(
                id=str(uuid.uuid4()),
                question_id=qid,
                status='locked',
                locked_at=datetime.now(timezone.utc),
            )
            session.add(rub)
            session.flush()

            for c_pos, (c_desc, c_pts) in enumerate(qd['criteria'], 1):
                crit = RubricCriterion(
                    id=str(uuid.uuid4()),
                    rubric_id=rub.id,
                    position=c_pos,
                    description=c_desc,
                    max_points=c_pts,
                    source='ai',
                )
                session.add(crit)
            q_objs.append(q)

        print(f'3. Created {len(q_objs)} exam questions with rubrics')

        # 4. 5 Ethiopian Students divided into 2 Sections
        # Section A: 3 students, Section B: 2 students
        students_data = [
            # --- Section A (3 Students) ---
            {
                'num': 'ETS-2026-001',
                'name': 'Dawit Tadesse',
                'sec': 'Section A',
                'scores': [
                    (28.0, 'Comprehensive definition with clear examples of C++ and Python.'),
                    (32.0, 'Accurate explanation of O(1), O(n), and O(log n); well articulated.'),
                    (32.0, 'Both iterative and recursive functions correctly written with proper base condition.'),
                ],
                'total': 92.0,
            },
            {
                'num': 'ETS-2026-002',
                'name': 'Almaz Ayana',
                'sec': 'Section A',
                'scores': [
                    (26.0, 'Good contrast between bytecode and machine code execution.'),
                    (30.0, 'Correct Big-O definitions; slight omission on sorted array requirement.'),
                    (29.0, 'Solid logic; minor syntax slip in recursive call return statement.'),
                ],
                'total': 85.0,
            },
            {
                'num': 'ETS-2026-003',
                'name': 'Bethlehem Alemu',
                'sec': 'Section A',
                'scores': [
                    (24.0, 'Clear overview of compilation pipeline with good illustrations.'),
                    (27.0, 'Solid grasp of worst-case complexity; good comparison table.'),
                    (27.0, 'Iterative loop correctly terminates; recursion handled well.'),
                ],
                'total': 78.0,
            },

            # --- Section B (2 Students) ---
            {
                'num': 'ETS-2026-004',
                'name': 'Yohannes Girma',
                'sec': 'Section B',
                'scores': [
                    (27.0, 'Well-reasoned trade-off analysis between developer speed and execution efficiency.'),
                    (31.0, 'Logarithmic division tree explained clearly.'),
                    (30.0, 'Clear pseudocode with comments and correct base case check.'),
                ],
                'total': 88.0,
            },
            {
                'num': 'ETS-2026-005',
                'name': 'Selamawit Desta',
                'sec': 'Section B',
                'scores': [
                    (29.0, 'Flawless explanation of JIT compilers, bytecode, and machine code.'),
                    (33.0, 'Exceptional mathematical rigor in explaining logarithmic growth rates.'),
                    (33.0, 'Elegant recursive and iterative solutions with edge-case handling for n=0.'),
                ],
                'total': 95.0,
            },
        ]

        print('4. Inserting 5 Ethiopian students and graded submissions across 2 sections:')
        for sd in students_data:
            stu_id = str(uuid.uuid4())
            student = Student(
                id=stu_id,
                lecturer_id=lecturer_id,
                student_number=sd['num'],
                name=sd['name'],
                section=sd['sec'],
                academic_year='2026',
                course_name='Computer Science 101',
            )
            session.add(student)
            session.flush()

            submission = Submission(
                kind='exam',
                student_id=stu_id,
                assessment_id=ass_id,
                total_score=sd['total'],
                ai_total=sd['total'],
                score=sd['total'],
                max_score=100.0,
                status='confirmed',
                section=sd['sec'],
                academic_year='2026',
                course_name='Computer Science 101',
                assessment_category='midterm',
                graded_at=datetime.now(timezone.utc),
            )
            session.add(submission)
            session.flush()

            for q_obj, (pts, fback) in zip(q_objs, sd['scores']):
                sqs = SubmissionQuestionScore(
                    submission_id=submission.id,
                    question_id=q_obj.id,
                    points=pts,
                    feedback=fback,
                )
                session.add(sqs)
            print(f'   -> {student.name} ({student.section}) | ID: {student.student_number} | Score: {submission.total_score}/100.0 ({submission.total_score}%)')

        session.commit()
        print('\nSUCCESS: All demo data successfully seeded into Neon PostgreSQL for Eyob Tamiru!')
    finally:
        session.close()

if __name__ == '__main__':
    seed()
