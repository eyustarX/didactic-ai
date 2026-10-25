import React from 'react';
import { Menu, User, LogOut, LogIn } from 'lucide-react';

const TAB_TITLES = {
  overview: 'Platform overview',
  curriculum: 'Curriculum & slide ingest',
  rubrics: 'Rubrics studio',
  assessment: 'Assessment generation',
  grading: 'Decomposed grading',
  analytics: 'Cohort analytics',
};

export default function Header({
  activeTab,
  collapsed,
  setCollapsed,
  currentUser,
  onOpenAuth,
  onSignOut,
}) {
  return (
    <header className="top-header">
      <div className="header-left">
        {/* Mobile Hamburger / Expand Button */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="sidebar-toggle-btn mobile-menu-toggle"
          title={collapsed ? 'Open menu' : 'Close menu'}
        >
          <Menu size={18} />
        </button>

        <h2 className="page-title">{TAB_TITLES[activeTab] || 'Didactic AI'}</h2>
      </div>

      <div className="header-right">
        {currentUser ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.8rem',
              }}
            >
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: 'var(--accent)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 600,
                  fontSize: '0.72rem',
                }}
              >
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.78rem' }}>
                  {currentUser.name}
                </span>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                  {currentUser.role}
                </span>
              </div>
            </div>

            <button
              onClick={onSignOut}
              className="btn btn-ghost btn-sm"
              style={{ padding: '4px 8px' }}
              title="Sign out"
            >
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <button onClick={onOpenAuth} className="btn btn-secondary btn-sm">
            <LogIn size={13} />
            <span>Sign in</span>
          </button>
        )}
      </div>
    </header>
  );
}
