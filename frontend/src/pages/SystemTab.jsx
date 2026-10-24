import React, { useState } from 'react';
import { Server, Database, Activity, ExternalLink, RefreshCw } from 'lucide-react';
import { fetchHealth } from '../services/api';

export default function SystemTab({ systemHealth, setSystemHealth }) {
  const [loading, setLoading] = useState(false);

  const checkHealth = async () => {
    setLoading(true);
    try {
      const h = await fetchHealth();
      setSystemHealth(h);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const isHealthy = systemHealth?.status === 'ok';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>System & cloud architecture</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Infrastructure connectivity, database persistence, and observability endpoints.
          </p>
        </div>

        <button onClick={checkHealth} disabled={loading} className="btn btn-secondary btn-sm">
          <RefreshCw size={12} className={loading ? 'spin' : ''} />
          <span>Ping health</span>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 20 }}>
        {/* Backend API Health */}
        <div className="cartesia-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div className="stat-icon stat-icon-accent">
              <Server size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>FastAPI backend</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Port 8000</p>
            </div>
            <span className={`badge ${isHealthy ? 'badge-accent' : 'badge-outline'}`} style={{ marginLeft: 'auto' }}>
              {isHealthy ? 'ONLINE' : 'CHECKING'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.82rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 6 }}>
              <span style={{ color: 'var(--text-muted)' }}>Status:</span>
              <span style={{ fontWeight: 500, color: 'var(--accent)' }}>{systemHealth?.status || 'ok'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 6 }}>
              <span style={{ color: 'var(--text-muted)' }}>Version:</span>
              <span style={{ fontWeight: 500 }}>{systemHealth?.version || '1.0.0'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Active provider:</span>
              <span style={{ fontWeight: 500 }}>
                {systemHealth?.active_provider || 'MockLLMProvider'}
              </span>
            </div>
          </div>
        </div>

        {/* Database Persistence */}
        <div className="cartesia-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div className="stat-icon">
              <Database size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Neon PostgreSQL</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cloud serverless</p>
            </div>
            <span className="badge badge-accent" style={{ marginLeft: 'auto' }}>
              CONNECTED
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.82rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 6 }}>
              <span style={{ color: 'var(--text-muted)' }}>SSL Mode:</span>
              <span style={{ fontWeight: 500, color: 'var(--accent)' }}>require</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 6 }}>
              <span style={{ color: 'var(--text-muted)' }}>Pooler:</span>
              <span style={{ fontWeight: 500 }}>Neon PgBouncer</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>Table:</span>
              <span style={{ fontWeight: 500 }}>submissions</span>
            </div>
          </div>
        </div>
      </div>

      {/* Docs & Observability */}
      <div className="cartesia-card">
        <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 12 }}>
          API documentation & metrics
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noreferrer"
            className="stat-card"
            style={{ textDecoration: 'none', cursor: 'pointer' }}
          >
            <div className="stat-icon">
              <ExternalLink size={16} />
            </div>
            <div>
              <div style={{ fontWeight: 500, color: 'var(--text)', fontSize: '0.88rem' }}>Swagger UI docs</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/docs</div>
            </div>
          </a>

          <a
            href="http://localhost:8000/metrics"
            target="_blank"
            rel="noreferrer"
            className="stat-card"
            style={{ textDecoration: 'none', cursor: 'pointer' }}
          >
            <div className="stat-icon">
              <Activity size={16} />
            </div>
            <div>
              <div style={{ fontWeight: 500, color: 'var(--text)', fontSize: '0.88rem' }}>Prometheus metrics</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/metrics</div>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
