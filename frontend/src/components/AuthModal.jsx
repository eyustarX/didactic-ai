import React, { useState } from 'react';
import { X, User, Lock, Mail, CheckCircle } from 'lucide-react';

export default function AuthModal({ isOpen, onClose, onAuthSuccess, currentUser }) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const user = {
      name: name || (email ? email.split('@')[0] : 'Instructor'),
      email: email || 'instructor@university.edu',
      role: 'Instructor',
      department: department || 'Computer Science',
      id: `usr_${Math.random().toString(36).substr(2, 6)}`,
    };

    localStorage.setItem('didactic_user', JSON.stringify(user));
    onAuthSuccess(user);
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        background: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="cartesia-card"
        style={{
          width: '100%',
          maxWidth: 440,
          background: 'var(--bg)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.12)',
          position: 'relative',
          padding: 28,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: 4,
          }}
          title="Close"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em' }}>
            {isRegister ? 'Create instructor account' : 'Instructor Sign In'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
            Sign in to your instructor profile to manage curriculum, author assessments, and grade student submissions.
          </p>
        </div>

        {/* Guest Access Restriction Notice */}
        <div
          style={{
            marginBottom: 16,
            padding: '10px 14px',
            borderRadius: 8,
            background: 'var(--surface-alt)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
            lineHeight: 1.45,
          }}
        >
          <Lock size={15} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          <span>
            <strong style={{ color: 'var(--text)' }}>Instructor Access Required:</strong> Guest access is restricted. Please sign in or register an account to enter the workspace.
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {isRegister && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Full Name & Title</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  required
                  className="input-text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dr. Sarah Chen"
                  style={{ paddingLeft: 34 }}
                />
                <User size={14} style={{ position: 'absolute', left: 12, top: 13, color: 'var(--text-muted)' }} />
              </div>
            </div>
          )}

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Academic Email</label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                required
                className="input-text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="faculty@university.edu"
                style={{ paddingLeft: 34 }}
              />
              <Mail size={14} style={{ position: 'absolute', left: 12, top: 13, color: 'var(--text-muted)' }} />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                required
                className="input-text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ paddingLeft: 34 }}
              />
              <Lock size={14} style={{ position: 'absolute', left: 12, top: 13, color: 'var(--text-muted)' }} />
            </div>
          </div>

          {isRegister && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Department / Course</label>
              <input
                type="text"
                className="input-text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Computer Science (CS-301)"
              />
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: 8, padding: '10px 0' }}
          >
            <CheckCircle size={15} />
            <span>{isRegister ? 'Create Instructor Account' : 'Sign in as Instructor'}</span>
          </button>
        </form>

        {/* Toggle between Login and Register */}
        <div style={{ marginTop: 18, textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          {isRegister ? (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setIsRegister(false)}
                style={{ background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 600, cursor: 'pointer' }}
              >
                Sign in
              </button>
            </span>
          ) : (
            <span>
              Need a new instructor profile?{' '}
              <button
                type="button"
                onClick={() => setIsRegister(true)}
                style={{ background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 600, cursor: 'pointer' }}
              >
                Create account
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
