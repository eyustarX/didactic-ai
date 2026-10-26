import React, { useState } from 'react';
import { X, User, Lock, Mail, CheckCircle } from 'lucide-react';
import DidacticLogo from './DidacticLogo';

export default function AuthModal({ isOpen, onClose, onAuthSuccess, currentUser }) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [password, setPassword] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    // Deterministic user ID: map by email or name so logging in always accesses the exact same data
    let userId;
    if (cleanName.toLowerCase().includes('eyob') || cleanEmail.includes('eyob')) {
      userId = 'usr_byz6ij';
    } else if (currentUser?.id) {
      userId = currentUser.id;
    } else {
      const key = cleanEmail || cleanName.toLowerCase() || 'default_lecturer';
      let hash = 0;
      for (let i = 0; i < key.length; i++) {
        hash = (hash << 5) - hash + key.charCodeAt(i);
        hash |= 0;
      }
      const hex = Math.abs(hash).toString(36).padStart(6, '0').slice(0, 6);
      userId = `usr_${hex}`;
    }

    const user = {
      name: cleanName || (cleanEmail ? cleanEmail.split('@')[0] : 'Instructor'),
      email: cleanEmail || 'instructor@didactic.ai',
      role: 'Instructor',
      id: userId,
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
          <X size={22} strokeWidth={2.4} />
        </button>

        {/* Modal Header */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 12 }}>
            <DidacticLogo size={38} variant="icon" />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em' }}>
            {isRegister ? 'Create Instructor Account' : 'Instructor Sign In'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
            {isRegister
              ? 'Sign up to ingest curriculum, author assessments, and automatically grade student submissions.'
              : 'Sign in to access your teaching curriculum, assessments, and grading workspace.'}
          </p>
        </div>

        {/* Instructor Access Notice */}
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
            <strong style={{ color: 'var(--text)' }}>Instructor Workspace:</strong>{' '}
            {isRegister
              ? 'Create your free account to get started immediately.'
              : 'Please enter your credentials to enter the workspace.'}
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {isRegister && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Full Name</label>
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
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                required
                className="input-text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="sarah.chen@example.com"
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

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: 8, padding: '10px 0' }}
          >
            <CheckCircle size={15} />
            <span>{isRegister ? 'Create Free Account' : 'Sign In as Instructor'}</span>
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
              Need an instructor account?{' '}
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
