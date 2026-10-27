import React, { useState, useEffect } from 'react';
import { Database, RefreshCw, Users, TrendingUp, Tag } from 'lucide-react';
import { fetchAnalytics } from '../services/api';

export default function AnalyticsTab({ analyticsData, setAnalyticsData }) {
  const [courseFilter, setCourseFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadData = async (filter = courseFilter) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAnalytics(filter || null);
      setAnalyticsData(data);
    } catch (err) {
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(courseFilter);
  }, [courseFilter]);

  const total = analyticsData?.total_submissions ?? 0;
  const avg = analyticsData?.average_score != null ? Number(analyticsData.average_score).toFixed(2) : 'N/A';
  const patterns = analyticsData?.error_patterns || [];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Cohort analytics</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Live PostgreSQL aggregations tracking cohort score distributions and error tags.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="text"
            className="input-text"
            placeholder="Filter by course (e.g. CS-301)"
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            style={{ width: 180, padding: '6px 10px', fontSize: '0.82rem', height: 32 }}
          />

          <button onClick={() => loadData(courseFilter)} disabled={loading} className="btn btn-secondary btn-sm" style={{ height: 32 }}>
            <RefreshCw size={12} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div style={{ marginBottom: 16, padding: 12, borderRadius: 4, background: 'var(--danger-bg)', color: 'var(--danger)', fontSize: '0.84rem' }}>
          {error}
        </div>
      )}

      {/* Metric Cards */}
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-icon stat-icon-accent">
            <Users size={18} />
          </div>
          <div>
            <div className="stat-label">Submissions</div>
            <div className="stat-value">{total}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <TrendingUp size={18} />
          </div>
          <div>
            <div className="stat-label">Cohort average</div>
            <div className="stat-value">{avg} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>/ 10</span></div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <Tag size={18} />
          </div>
          <div>
            <div className="stat-label">Error clusters</div>
            <div className="stat-value">{patterns.length}</div>
          </div>
        </div>
      </div>

      {/* Error Patterns Breakdown */}
      <div className="cartesia-card">
        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 4 }}>
          Common error patterns
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: 16 }}>
          Categorized tags automatically assigned by the grading engine across evaluated submissions.
        </p>

        {patterns.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {patterns.map((item, idx) => {
              const count = item.count || 1;
              const pct = total > 0 ? Math.round((count / total) * 100) : 100;
              return (
                <div key={idx}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.82rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="badge badge-outline">{item.tag || 'uncategorized'}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{count} occurrences</span>
                    </div>
                    <span style={{ fontWeight: 500, color: 'var(--text)' }}>{pct}%</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '0.84rem' }}>
            No submissions recorded yet for this course filter.
          </div>
        )}
      </div>
    </div>
  );
}
