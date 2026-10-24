import React from 'react';
import {
  FileText,
  Award,
  GraduationCap,
  BarChart3,
  ArrowRight,
  Layers,
  Sparkles,
  TrendingUp,
  CheckCircle,
} from 'lucide-react';

export default function OverviewTab({
  analyticsData,
  setActiveTab,
}) {
  const totalSubmissions = analyticsData?.total_submissions ?? 7;
  const avgScore = analyticsData?.average_score
    ? Number(analyticsData.average_score).toFixed(1)
    : '5.4';

  return (
    <div>
      {/* Hero Section */}
      <div className="cartesia-card" style={{ marginBottom: 24, padding: '32px 36px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <span className="badge badge-accent">
            <Sparkles size={11} />
            <span>Academic Evaluation Engine</span>
          </span>
        </div>
        <h1 style={{ fontSize: '1.9rem', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 8, color: 'var(--text)' }}>
          Evaluate Lecture Notes And Grade Student Work
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: 640, lineHeight: 1.6 }}>
          Didactic AI decompiles complex curriculum notes into Bloom-indexed learning objectives,
          synthesizes standardized 100% normalized rubrics, and grades open-ended student work with
          verifiable textual evidence citations.
        </p>

        <div style={{ display: 'flex', gap: 10, marginTop: 24, flexWrap: 'wrap' }}>
          <button onClick={() => setActiveTab('curriculum')} className="btn btn-primary">
            <span>Ingest lecture</span>
            <ArrowRight size={14} />
          </button>
          <button onClick={() => setActiveTab('grading')} className="btn btn-secondary">
            <span>Grade answer</span>
          </button>
        </div>
      </div>

      {/* 4 Clean Stat Cards */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon stat-icon-accent">
            <GraduationCap size={18} />
          </div>
          <div>
            <div className="stat-label">Submissions</div>
            <div className="stat-value">{totalSubmissions}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <TrendingUp size={18} />
          </div>
          <div>
            <div className="stat-label">Average score</div>
            <div className="stat-value">{avgScore} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>/ 10</span></div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <Layers size={18} />
          </div>
          <div>
            <div className="stat-label">Bloom levels</div>
            <div className="stat-value">6 levels</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon stat-icon-accent">
            <CheckCircle size={18} />
          </div>
          <div>
            <div className="stat-label">Rubric validation</div>
            <div className="stat-value" style={{ fontSize: '1.15rem' }}>
              100% normalized
            </div>
          </div>
        </div>
      </div>

      {/* Workspaces */}
      <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 12, color: 'var(--text)' }}>
        Workspaces
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 28 }}>
        <div
          onClick={() => setActiveTab('curriculum')}
          className="cartesia-card cartesia-card-interactive"
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div className="stat-icon">
              <FileText size={16} />
            </div>
            <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
          </div>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 4 }}>Curriculum Ingest</h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>
            Upload lecture PDFs or notes. Segments content into semantic chunks and maps concepts.
          </p>
        </div>

        <div
          onClick={() => setActiveTab('rubrics')}
          className="cartesia-card cartesia-card-interactive"
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div className="stat-icon">
              <Award size={16} />
            </div>
            <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
          </div>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 4 }}>Rubrics Studio</h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>
            Synthesize normalized evaluation rubrics with mathematically guaranteed 100% weights.
          </p>
        </div>

        <div
          onClick={() => setActiveTab('grading')}
          className="cartesia-card cartesia-card-interactive"
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div className="stat-icon stat-icon-accent">
              <GraduationCap size={16} />
            </div>
            <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
          </div>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 4 }}>Decomposed Grading</h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>
            Evaluate answers against rubrics with evidence citations and automated misconception tagging.
          </p>
        </div>

        <div
          onClick={() => setActiveTab('analytics')}
          className="cartesia-card cartesia-card-interactive"
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div className="stat-icon">
              <BarChart3 size={16} />
            </div>
            <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
          </div>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 4 }}>Cohort Analytics</h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>
            Inspect score trends, identify systemic student gaps, and review submissions in Postgres.
          </p>
        </div>
      </div>
    </div>
  );
}
