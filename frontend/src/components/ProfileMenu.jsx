import React, { useEffect, useRef } from 'react';
import { User, Moon, Sun, Monitor, LogOut } from 'lucide-react';

export default function ProfileMenu({
  isOpen,
  onClose,
  currentUser,
  onOpenProfile,
  onSignOut,
  theme,
  themeMode = 'dark',
  onSelectThemeMode,
  onToggleTheme,
  position = 'sidebar-expanded', // 'sidebar-expanded' | 'sidebar-collapsed' | 'header'
}) {
  const menuRef = useRef(null);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const userInitial = currentUser?.name
    ? currentUser.name.trim().slice(0, 1).toUpperCase()
    : 'Y';

  const userDisplayName = currentUser?.name || 'You';
  const userPlanText = currentUser?.role ? `${currentUser.role} plan` : 'Free plan';

  // Position classes / inline styles based on trigger location
  let positionStyles = {};
  if (position === 'sidebar-expanded') {
    positionStyles = {
      position: 'absolute',
      bottom: 'calc(100% + 8px)',
      left: 0,
      right: 0,
      width: '100%',
      zIndex: 100,
    };
  } else if (position === 'sidebar-collapsed') {
    positionStyles = {
      position: 'fixed',
      left: '64px',
      bottom: '16px',
      width: '260px',
      zIndex: 1000,
    };
  } else if (position === 'header') {
    positionStyles = {
      position: 'absolute',
      top: 'calc(100% + 10px)',
      right: 0,
      width: '260px',
      zIndex: 100,
    };
  }

  const currentMode = themeMode || theme || 'dark';

  const handleSelectTheme = (mode) => {
    if (onSelectThemeMode) {
      onSelectThemeMode(mode);
    } else if (onToggleTheme) {
      onToggleTheme();
    }
  };

  return (
    <div
      ref={menuRef}
      className="profile-popover-menu"
      style={{
        ...positionStyles,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: '14px 12px',
        boxShadow: 'var(--shadow-pop)',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        animation: 'profileMenuFadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* 1. Header: Avatar + You + Plan */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '4px 6px 12px 6px',
          borderBottom: '1px solid var(--border-subtle)',
          marginBottom: 4,
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            background: 'var(--accent)',
            color: 'var(--on-accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '1rem',
            flexShrink: 0,
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
          }}
        >
          {userInitial}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, lineHeight: 1.25 }}>
          <span
            style={{
              fontSize: '0.94rem',
              fontWeight: 600,
              color: 'var(--text)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {userDisplayName}
          </span>
          <span
            style={{
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
              marginTop: 2,
            }}
          >
            {userPlanText}
          </span>
        </div>
      </div>

      {/* 2. My profile */}
      <button
        type="button"
        className="profile-menu-item"
        onClick={() => {
          if (onOpenProfile) onOpenProfile();
          onClose();
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          width: '100%',
          padding: '9px 10px',
          borderRadius: 8,
          border: 'none',
          background: 'transparent',
          color: 'var(--text)',
          fontSize: '0.86rem',
          fontWeight: 400,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          textAlign: 'left',
        }}
      >
        <User size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        <span>My profile</span>
      </button>

      {/* 3. Appearance Row with Sun / Moon / System switcher */}
      <div
        className="profile-menu-item profile-menu-appearance-row"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '6px 10px',
          borderRadius: 8,
          color: 'var(--text)',
          fontSize: '0.86rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {currentMode === 'system' ? (
            <Monitor size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          ) : theme === 'light' ? (
            <Sun size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          ) : (
            <Moon size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          )}
          <span>Appearance</span>
        </div>

        {/* Theme Segmented Switcher */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            background: 'var(--surface-alt)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 8,
            padding: 2,
            gap: 2,
          }}
        >
          {/* Light (Sun) */}
          <button
            type="button"
            onClick={() => handleSelectTheme('light')}
            className={`profile-theme-pill-btn ${currentMode === 'light' ? 'active' : ''}`}
            title="Light theme"
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              border: 'none',
              background: currentMode === 'light' ? 'var(--surface)' : 'transparent',
              color: currentMode === 'light' ? 'var(--accent)' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: currentMode === 'light' ? 'var(--shadow-sm)' : 'none',
            }}
          >
            <Sun size={13} />
          </button>

          {/* Dark (Moon) */}
          <button
            type="button"
            onClick={() => handleSelectTheme('dark')}
            className={`profile-theme-pill-btn ${currentMode === 'dark' ? 'active' : ''}`}
            title="Dark theme"
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              border: 'none',
              background: currentMode === 'dark' ? 'var(--surface)' : 'transparent',
              color: currentMode === 'dark' ? 'var(--accent)' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: currentMode === 'dark' ? 'var(--shadow-sm)' : 'none',
            }}
          >
            <Moon size={13} />
          </button>

          {/* System (Monitor) */}
          <button
            type="button"
            onClick={() => handleSelectTheme('system')}
            className={`profile-theme-pill-btn ${currentMode === 'system' ? 'active' : ''}`}
            title="Match system theme"
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              border: 'none',
              background: currentMode === 'system' ? 'var(--surface)' : 'transparent',
              color: currentMode === 'system' ? 'var(--accent)' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: currentMode === 'system' ? 'var(--shadow-sm)' : 'none',
            }}
          >
            <Monitor size={13} />
          </button>
        </div>
      </div>

      {/* Divider */}
      <div
        style={{
          height: 1,
          background: 'var(--border-subtle)',
          margin: '4px 0',
        }}
      />

      {/* 4. Sign out */}
      <button
        type="button"
        className="profile-menu-item profile-menu-signout"
        onClick={() => {
          if (onSignOut) onSignOut();
          onClose();
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          width: '100%',
          padding: '9px 10px',
          borderRadius: 8,
          border: 'none',
          background: 'transparent',
          color: 'var(--danger)',
          fontSize: '0.86rem',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          textAlign: 'left',
        }}
      >
        <LogOut size={16} style={{ color: 'var(--danger)', flexShrink: 0 }} />
        <span>Sign out</span>
      </button>
    </div>
  );
}
