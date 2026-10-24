import React, { useState } from 'react';
import {
  GraduationCap,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Quote,
  Database,
  User,
  ThumbsUp,
} from 'lucide-react';
import { gradeExamSubmission } from '../services/api';
import { SAMPLE_STUDENTS } from '../data/sampleData';

const DEFAULT_QUESTION_PROMPT =
  'Compare a mutex and a binary semaphore. State the four Coffman conditions for system deadlock, and describe one concrete operating system strategy to prevent deadlock by eliminating one of these conditions.';

export default function GradingTab({
  selectedQuestion,
  rubric,
  onGradingComplete,
}) {
  const [questionPrompt, setQuestionPrompt] = useState(
    selectedQuestion?.prompt || selectedQuestion?.question_text || DEFAULT_QUESTION_PROMPT
  );
  const [studentId, setStudentId] = useState('STU-001');
  const [courseId, setCourseId] = useState('CS-301');
  const [studentAnswer, setStudentAnswer] = useState(SAMPLE_STUDENTS[0].submission_text);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [report, setReport] = useState(null);

  const selectStudentPreset = (stu) => {
    setStudentId(stu.student_id);
    setStudentAnswer(stu.submission_text);
  };

  const handleGrade = async () => {
    if (!studentAnswer.trim()) {
      setError('Please provide a student answer to grade.');
      return;
    }

    setLoading(true);
    setError(null);

    const questionPayload = {
      id: selectedQuestion?.id || 'Q1',
      question_type: selectedQuestion?.question_type || 'short_answer',
      prompt: questionPrompt,
      reference_answer:
        selectedQuestion?.reference_answer ||
        'A mutex provides mutual exclusion with thread ownership. A semaphore provides counting/signaling without ownership. The four Coffman conditions are mutual exclusion, hold and wait, no preemption, and circular wait. Prevention orders resources strictly to eliminate circular wait.',
      max_points: selectedQuestion?.max_points || 10,
      learning_objective: selectedQuestion?.learning_objective || 'Concurrency and Deadlock Prevention',
    };

    const rubricPayload = rubric && rubric.criteria && rubric.criteria.length > 0 ? rubric : {
      rubric_id: 'RUBRIC-CS301-01',
      title: 'Concurrency & Deadlocks Evaluation Rubric',
      criteria: [
        {
          name: 'Synchronization Concepts',
          description: 'Clear distinction between mutex ownership and semaphore signaling',
          weight: 0.35,
          max_score: 4,
        },
        {
          name: 'Coffman Deadlock Conditions',
          description: 'Enumeration and understanding of all four Coffman deadlock conditions',
          weight: 0.35,
          max_score: 4,
        },
        {
          name: 'Deadlock Prevention Strategies',
          description: 'Valid operating system prevention strategy addressing at least one condition',
          weight: 0.30,
          max_score: 4,
        },
      ],
    };

    try {
      const result = await gradeExamSubmission({
        question: questionPayload,
        rubric: rubricPayload,
        student_answer: studentAnswer,
        course_id: courseId,
        student_id: studentId,
      });

      setReport(result);
      if (onGradingComplete) {
        onGradingComplete(result);
      }
    } catch (err) {
      setError(err.message || 'Grading failed');
    } finally {
      setLoading(false);
    }
  };

  const totalScore = report?.total_score ?? 0;
  const maxScore = report?.max_possible_score ?? 10;
  const percentage = report?.percentage != null ? Math.round(report.percentage) : Math.round((totalScore / maxScore) * 100);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Decomposed grading</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Multi-criteria decomposition with evidence citations and automated PostgreSQL persistence.
          </p>
        </div>

        <button onClick={handleGrade} disabled={loading} className="btn btn-primary btn-sm">
          {loading ? <Loader2 size={13} className="spin" /> : <GraduationCap size={13} />}
          <span>{loading ? 'Evaluating...' : 'Grade answer'}</span>
        </button>
      </div>

      {error && (
        <div style={{ marginBottom: 16, padding: 12, borderRadius: 4, background: 'var(--danger-bg)', color: 'var(--danger)', fontSize: '0.84rem' }}>
          {error}
        </div>
      )}

      {/* Preset Selectors */}
      <div className="cartesia-card" style={{ marginBottom: 16, padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <User size={14} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-muted)' }}>Student answer presets:</span>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {SAMPLE_STUDENTS.map((stu) => {
              const isActive = studentId === stu.student_id;
              return (
                <button
                  key={stu.student_id}
                  onClick={() => selectStudentPreset(stu)}
                  className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ height: 28, fontSize: '0.78rem' }}
                >
                  <span>{stu.student_name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 24 }}>
        {/* Input Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="cartesia-card">
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 10 }}>Exam question</h3>
            <textarea
              className="input-textarea"
              style={{ minHeight: 80 }}
              value={questionPrompt}
              onChange={(e) => setQuestionPrompt(e.target.value)}
              placeholder="Enter exam question..."
            />
          </div>

          <div className="cartesia-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 600 }}>Student submission</h3>
              <div style={{ display: 'flex', gap: 6 }}>
                <span className="badge badge-outline">{studentId}</span>
                <span className="badge badge-outline">{courseId}</span>
              </div>
            </div>
            <textarea
              className="input-textarea"
              style={{ minHeight: 180, fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}
              value={studentAnswer}
              onChange={(e) => setStudentAnswer(e.target.value)}
              placeholder="Paste student response..."
            />
          </div>
        </div>

        {/* Results Column */}
        <div>
          {report ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Score Highlight Card */}
              <div className="cartesia-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span className="badge badge-accent" style={{ marginBottom: 6 }}>
                      <Database size={11} />
                      <span>Saved to Neon Postgres</span>
                    </span>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 600 }}>Grading report</h4>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                      {report.submission_id || 'SUB-EVAL'} • {studentId}
                    </p>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div
                      style={{
                        fontSize: '2rem',
                        fontWeight: 600,
                        letterSpacing: '-0.02em',
                        color: percentage >= 70 ? 'var(--accent)' : percentage >= 50 ? 'var(--warning)' : 'var(--danger)',
                      }}
                    >
                      {totalScore.toFixed(1)}
                      <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}> / {maxScore}</span>
                    </div>
                    <span className="badge badge-outline">{percentage}% score</span>
                  </div>
                </div>

                {report.summary_feedback && (
                  <p style={{ marginTop: 12, fontSize: '0.86rem', color: 'var(--text-muted)', lineHeight: 1.5, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                    {report.summary_feedback}
                  </p>
                )}
              </div>

              {/* Decomposed Evaluations */}
              {report.evaluations && report.evaluations.length > 0 && (
                <div className="cartesia-card">
                  <h4 style={{ fontSize: '0.92rem', fontWeight: 600, marginBottom: 12 }}>
                    Criterion evaluations
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {report.evaluations.map((ev, i) => (
                      <div
                        key={i}
                        style={{
                          background: 'var(--surface)',
                          padding: 12,
                          borderRadius: 4,
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontWeight: 500, fontSize: '0.86rem' }}>{ev.criterion_name}</span>
                          <span style={{ fontWeight: 600, color: 'var(--accent)' }}>
                            {ev.score_awarded} / {ev.max_score}
                          </span>
                        </div>

                        {ev.evidence_citation && (
                          <div
                            style={{
                              background: 'var(--bg)',
                              borderLeft: '2px solid var(--accent)',
                              padding: '6px 10px',
                              borderRadius: 2,
                              fontSize: '0.78rem',
                              fontStyle: 'italic',
                              color: 'var(--text-muted)',
                              marginBottom: 6,
                            }}
                          >
                            <Quote size={10} style={{ display: 'inline', marginRight: 4 }} />
                            "{ev.evidence_citation}"
                          </div>
                        )}

                        {ev.strengths && ev.strengths.length > 0 && (
                          <div style={{ marginBottom: 4 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.74rem', color: 'var(--accent)', fontWeight: 500 }}>
                              <ThumbsUp size={11} />
                              <span>Strengths:</span>
                            </div>
                            <ul style={{ paddingLeft: 16, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              {ev.strengths.map((s, idx) => (
                                <li key={idx}>{s}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {ev.gaps && ev.gaps.length > 0 && (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.74rem', color: 'var(--warning)', fontWeight: 500 }}>
                              <AlertTriangle size={11} />
                              <span>Gaps:</span>
                            </div>
                            <ul style={{ paddingLeft: 16, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              {ev.gaps.map((g, idx) => (
                                <li key={idx}>{g}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="cartesia-card" style={{ textAlign: 'center', padding: '48px 20px', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'var(--surface-muted)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 12,
                }}
              >
                <GraduationCap size={20} />
              </div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 4 }}>Ready to evaluate</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', maxWidth: 280 }}>
                Select a student preset above and click "Grade answer" to evaluate with criteria decomposition.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
