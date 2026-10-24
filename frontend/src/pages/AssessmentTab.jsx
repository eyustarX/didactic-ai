import React, { useState } from 'react';
import { FileCheck, Sparkles, Loader2, ArrowRight, CheckCircle } from 'lucide-react';
import { generateAssessment } from '../services/api';

export default function AssessmentTab({
  lectureTitle,
  lectureContent,
  assessment,
  setAssessment,
  setSelectedQuestion,
  setActiveTab,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [count, setCount] = useState(3);

  const handleGenerate = async () => {
    if (!lectureContent) {
      setError('Please provide or upload lecture content in Curriculum first.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await generateAssessment({
        lecture_title: lectureTitle || 'Lecture 07: Concurrency & Deadlocks',
        lecture_content: lectureContent,
        question_count: count,
      });
      setAssessment(data);
    } catch (err) {
      setError(err.message || 'Failed to generate assessment');
    } finally {
      setLoading(false);
    }
  };

  const handleSendToGrading = (q) => {
    if (setSelectedQuestion) {
      setSelectedQuestion(q);
    }
    setActiveTab('grading');
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Assessment synthesis</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Synthesize exam questions, model answer keys, and point distributions.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface)', padding: '4px 10px', borderRadius: 4, border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Questions:</span>
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="input-select"
              style={{ width: 'auto', padding: '2px 6px', fontSize: '0.82rem', height: 28 }}
            >
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={5}>5</option>
            </select>
          </div>

          <button onClick={handleGenerate} disabled={loading} className="btn btn-primary btn-sm">
            {loading ? <Loader2 size={13} className="spin" /> : <Sparkles size={13} />}
            <span>Synthesize</span>
          </button>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: 16, padding: 12, borderRadius: 4, background: 'var(--danger-bg)', color: 'var(--danger)', fontSize: '0.84rem' }}>
          {error}
        </div>
      )}

      {assessment?.questions && assessment.questions.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {assessment.questions.map((q, idx) => (
            <div key={idx} className="cartesia-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="badge badge-outline">Question {idx + 1}</span>
                  {q.bloom_level && <span className="badge badge-outline">{q.bloom_level}</span>}
                  {q.max_points && <span className="badge badge-accent">{q.max_points} points</span>}
                </div>

                <button onClick={() => handleSendToGrading(q)} className="btn btn-secondary btn-sm">
                  <span>Grade this question</span>
                  <ArrowRight size={13} />
                </button>
              </div>

              <h4 style={{ fontSize: '0.98rem', fontWeight: 600, marginBottom: 10, lineHeight: 1.45, color: 'var(--text)' }}>
                {q.prompt || q.question_text || q.text}
              </h4>

              {q.reference_answer && (
                <div style={{ background: 'var(--surface)', borderRadius: 4, padding: 12, border: '1px solid var(--border-subtle)', marginTop: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, color: 'var(--accent)', fontWeight: 500, fontSize: '0.8rem' }}>
                    <CheckCircle size={13} />
                    <span>Reference answer</span>
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', lineHeight: 1.5 }}>
                    {q.reference_answer}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="cartesia-card" style={{ textAlign: 'center', padding: '48px 20px' }}>
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
              margin: '0 auto 12px auto',
            }}
          >
            <FileCheck size={20} />
          </div>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 4 }}>
            No assessment generated yet
          </h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: 420, margin: '0 auto 16px auto', fontSize: '0.86rem' }}>
            Generate questions, model answers, and point allocations from active lecture notes.
          </p>
          <button onClick={handleGenerate} disabled={loading} className="btn btn-primary">
            {loading ? <Loader2 size={13} className="spin" /> : <Sparkles size={13} />}
            <span>Synthesize assessment</span>
          </button>
        </div>
      )}
    </div>
  );
}
