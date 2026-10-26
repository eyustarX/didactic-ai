import React from 'react';

/**
 * Didactic AI Official Brand Logo & Emblem Component.
 * Supports:
 * - 'emblem': The book-and-checkmark icon on a transparent background
 * - 'icon': The squircle app icon matching the favicon / app tile
 * - 'full': The emblem + "Didactic AI" brand title
 */
export default function DidacticLogo({
  size = 28,
  variant = 'emblem', // 'emblem' | 'icon' | 'full'
  className = '',
  style = {},
  theme = null, // 'dark' | 'light' | null (auto)
}) {
  // Determine if light mode or dark mode for styling
  const isLight = theme === 'light';

  // App squircle icon variant (like favicon)
  if (variant === 'icon') {
    return (
      <div
        className={`didactic-logo-icon ${className}`}
        style={{
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.26),
          overflow: 'hidden',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          background: isLight ? '#f0fbf6' : '#0a1219',
          border: isLight ? '1px solid rgba(20, 184, 166, 0.3)' : '1px solid rgba(45, 212, 191, 0.35)',
          boxShadow: isLight
            ? '0 2px 8px rgba(0, 0, 0, 0.06)'
            : '0 2px 10px rgba(0, 0, 0, 0.35)',
          ...style,
        }}
      >
        <img
          src={isLight ? '/favicon-light.png' : '/favicon.png'}
          alt="Didactic AI"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
        />
      </div>
    );
  }

  // Emblem vector / image
  const emblemElement = (
    <div
      className={`didactic-emblem-wrap ${className}`}
      style={{
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        position: 'relative',
        ...style,
      }}
    >
      <img
        src={isLight ? '/logo-emblem-light.png' : '/logo-emblem-dark.png'}
        alt="Didactic AI Logo"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          display: 'block',
        }}
      />
    </div>
  );

  if (variant === 'emblem') {
    return emblemElement;
  }

  // Full brand lockup: Emblem + Typography
  return (
    <div
      className={`didactic-logo-full ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: Math.max(8, Math.round(size * 0.3)),
        userSelect: 'none',
        ...style,
      }}
    >
      {emblemElement}
      <span
        style={{
          fontSize: Math.round(size * 0.65),
          fontWeight: 700,
          letterSpacing: '-0.02em',
          color: 'var(--text)',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          lineHeight: 1,
        }}
      >
        Didactic AI
      </span>
    </div>
  );
}
