import React, { useState, useEffect } from 'react';
import { X, User, Lock, Mail, CheckCircle } from 'lucide-react';

export default function AuthModal({ isOpen, onClose, onAuthSuccess, currentUser, initialMode = 'signin' }) {
  const [isRegister, setIsRegister] = useState(initialMode === 'register');
  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (isOpen) {
      setIsRegister(initialMode === 'register');
    }
  }, [initialMode, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const user = {
      name: name.trim() || (email ? email.split('@')[0] : 'Instructor'),
      email: email.trim() || 'instructor@didactic.ai',
      role: 'Instructor',
      id: currentUser?.id || `usr_${Math.random().toString(36).substr(2, 6)}`,
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
            width: 36,
            height: 36,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--surface-alt)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            cursor: 'pointer',
            padding: 0,
            transition: 'all 0.18s ease',
          }}
          title="Close"
          aria-label="Close"
        >
          <X size={20} strokeWidth={2.4} />
        </button>

        {/* Modal Header */}
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em' }}>
            {isRegister ? 'Create Instructor Account' : 'Instructor Sign In'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
            {isRegister
              ? 'Join Didactic AI to create curriculum-aligned assessments and evidence-grounded rubrics.'
              : 'Sign in to access your course assessments, student submissions, and master gradebooks.'}
          </p>
        </div>

        {/* Notice */}
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
            <strong style={{ color: 'var(--text)' }}>Instructor Portal:</strong> Secure access for university educators and teaching assistants.
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {isRegister && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 4, display: 'block' }}>
                Full Name & Title
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Jane Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input"
                  style={{ width: '100%', paddingLeft: 34, height: 38, fontSize: '0.9rem' }}
                />
                <User
                  size={15}
                  style={{ position: 'absolute', left: 11, top: 11, color: 'var(--text-muted)', pointerEvents: 'none' }}
                />
              </div>
            </div>
          )}

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 4, display: 'block' }}>
              Institutional Email
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                required
                placeholder="professor@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                style={{ width: '100%', paddingLeft: 34, height: 38, fontSize: '0.9rem' }}
              />
              <Mail
                size={15}
                style={{ position: 'absolute', left: 11, top: 11, color: 'var(--text-muted)', pointerEvents: 'none' }}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 4, display: 'block' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                required
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                style={{ width: '100%', paddingLeft: 34, height: 38, fontSize: '0.9rem' }}
              />
              <Lock
                size={15}
                style={{ position: 'absolute', left: 11, top: 11, color: 'var(--text-muted)', pointerEvents: 'none' }}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', height: 40, marginTop: 6, fontWeight: 600, fontSize: '0.92rem' }}
          >
            {isRegister ? 'Create Free Account' : 'Sign In to Workspace'}
          </button>
        </form>

        {/* Toggle between Login and Register */}
        <div style={{ marginTop: 18, textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {isRegister ? (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setIsRegister(false)}
                style={{ background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                Sign In
              </button>
            </>
          ) : (
            <>
              Don't have an instructor profile?{' '}
              <button
                type="button"
                onClick={() => setIsRegister(true)}
                style={{ background: 'none', border: 'none', color: 'var(--accent)', fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                Sign up free
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
