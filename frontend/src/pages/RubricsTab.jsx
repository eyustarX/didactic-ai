import React, { useState } from 'react';
import { Award, Sparkles, Loader2, ArrowRight } from 'lucide-react';
import { generateRubric } from '../services/api';

export default function RubricsTab({
  lectureTitle,
  lectureContent,
  rubric,
  setRubric,
  setActiveTab,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    if (!lectureContent) {
      setError('Please provide or upload lecture content in Curriculum first.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await generateRubric({
        lecture_title: lectureTitle || 'Lecture 07: Concurrency & Deadlocks',
        lecture_content: lectureContent,
      });
      setRubric(data);
    } catch (err) {
      setError(err.message || 'Failed to generate rubric');
    } finally {
      setLoading(false);
    }
  };

  const totalWeight = rubric?.criteria?.reduce(
    (sum, c) => sum + (typeof c.weight === 'number' ? c.weight : parseFloat(c.weight) || 0),
    0
  ) ?? 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Rubrics studio</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            We synthesize standardized evaluation rubrics with normalized weights summing to 100%.
          </p>
        </div>

        <button onClick={handleGenerate} disabled={loading} className="btn btn-primary btn-sm">
          {loading ? <Loader2 size={13} className="spin" /> : <Sparkles size={13} />}
          <span>{loading ? 'Synthesizing...' : 'Generate rubric'}</span>
        </button>
      </div>

      {error && (
        <div style={{ marginBottom: 16, padding: 12, borderRadius: 4, background: 'var(--danger-bg)', color: 'var(--danger)', fontSize: '0.84rem' }}>
          {error}
        </div>
      )}

      {rubric ? (
        <div>
          {/* Rubric Summary Card */}
          <div className="cartesia-card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
              <div>
                <span className="badge badge-outline" style={{ marginBottom: 6 }}>
                  {rubric.rubric_id || 'RUBRIC-CURR-01'}
                </span>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{rubric.title || lectureTitle}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', marginTop: 2 }}>
                  {rubric.description || 'Normalized assessment rubric based on curriculum objectives.'}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>TOTAL WEIGHT</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--accent)' }}>
                    {Math.round(totalWeight * 100)}%
                  </div>
                </div>
                <button onClick={() => setActiveTab('grading')} className="btn btn-secondary btn-sm">
                  <span>Send to grading</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>

            {/* Criteria weight distribution bar */}
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: 6 }}>
                Weight distribution
              </div>
              <div className="progress-track" style={{ height: 8 }}>
                <div className="progress-fill" style={{ width: '100%' }} />
              </div>
            </div>
          </div>

          {/* Criteria Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {rubric.criteria?.map((crit, idx) => {
              const weightPct = crit.weight <= 1 ? Math.round(crit.weight * 100) : crit.weight;
              return (
                <div key={idx} className="cartesia-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          background: 'var(--surface-muted)',
                          border: '1px solid var(--border)',
                          color: 'var(--text)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 600,
                          fontSize: '0.75rem',
                        }}
                      >
                        {idx + 1}
                      </span>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>{crit.name}</h4>
                    </div>
                    <span className="badge badge-accent">{weightPct}%</span>
                  </div>

                  <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', marginBottom: 12 }}>
                    {crit.description}
                  </p>

                  {/* 4 Performance Levels */}
                  {crit.levels && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
                      {Object.entries(crit.levels).map(([tier, desc]) => (
                        <div
                          key={tier}
                          style={{
                            background: 'var(--surface)',
                            padding: '10px 12px',
                            borderRadius: 4,
                            border: '1px solid var(--border-subtle)',
                          }}
                        >
                          <div
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              color: 'var(--text)',
                              marginBottom: 2,
                            }}
                          >
                            {tier}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            {desc}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
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
            <Award size={20} />
          </div>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 4 }}>
            No rubric synthesized yet
          </h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: 420, margin: '0 auto 16px auto', fontSize: '0.86rem' }}>
            Click below to generate a standardized rubric with criteria weights summing to 100%.
          </p>
          <button onClick={handleGenerate} disabled={loading} className="btn btn-primary">
            {loading ? <Loader2 size={13} className="spin" /> : <Sparkles size={13} />}
            <span>Generate rubric</span>
          </button>
        </div>
      )}
    </div>
  );
}
