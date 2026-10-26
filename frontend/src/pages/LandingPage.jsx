import React, { useState, useEffect } from 'react';
import ProfileMenu from '../components/ProfileMenu';
import DidacticLogo from '../components/DidacticLogo';
import './LandingPage.css';
import {
  Zap,
  ArrowRight,
  Lock,
  FileSpreadsheet,
  CheckCircle2,
  Sparkles,
  GraduationCap,
  BookOpen,
  Layers,
  BarChart3,
  RotateCcw,
  Users,
  Award,
  ChevronDown,
  ChevronUp,
  LogIn,
  Check,
} from 'lucide-react';

export default function LandingPage({
  onEnterApp,
  currentUser,
  onOpenAuth,
  onOpenProfile,
  onSignOut,
  theme = 'dark',
  themeMode = 'dark',
  onSelectThemeMode,
  onToggleTheme,
}) {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState(0);

  useEffect(() => {
    // Scroll progress line
    const scrollLine = document.getElementById('pro-scroll-line');
    const updateScrollProgress = () => {
      const docElem = document.documentElement;
      const totalHeight = docElem.scrollHeight - docElem.clientHeight;
      if (totalHeight > 0 && scrollLine) {
        const scrollRatio = window.scrollY / totalHeight;
        scrollLine.style.width = Math.min(100, Math.max(0, scrollRatio * 100)) + '%';
      }
    };

    window.addEventListener('scroll', updateScrollProgress, { passive: true });
    updateScrollProgress();

    return () => window.removeEventListener('scroll', updateScrollProgress);
  }, []);

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToTop = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEnterPlatform = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!currentUser) {
      if (onOpenAuth) onOpenAuth();
      return;
    }
    if (onEnterApp) onEnterApp();
  };

  const faqItems = [
    {
      q: 'How does evidence-grounded grading work?',
      a: 'Didactic AI compares student answers against objective rubric criteria and extracts exact evidence citations directly from the student’s text. Teachers can inspect evidence citations, adjust scores, or trigger a full regrade with one click.',
    },
    {
      q: 'How does section management and student deduplication work?',
      a: 'Assessments are grouped by Course, Section (e.g. Section A, Section B), and Academic Year. When grading multiple assessments, the system matches on Student ID and updates the student’s record in the Master Gradebook without creating duplicates.',
    },
    {
      q: 'How do percentage weights and final Grade Tiers calculate?',
      a: 'Instructors assign percentage weights to each exam (e.g., Quizzes = 20%, Midterm = 30%, Final = 50%). The Master Gradebook computes the cumulative weighted percentage and automatically awards final letter grade tiers (Grade A, B+, etc.).',
    },
    {
      q: 'What is the Server-Side Integrity Lock?',
      a: 'Once the first student submission on an exam is graded, the rubric criteria and questions lock automatically server-side to guarantee that every student in the cohort is evaluated under identical, uncompromised standards.',
    },
  ];

  return (
    <div className="pro-landing-wrapper">
      {/* Top Reading Progress Bar */}
      <div id="pro-scroll-line" role="progressbar" aria-label="Reading progress" />

      {/* Ambient Mesh Glow */}
      <div className="pro-landing-mesh" />

      {/* Top Navigation Bar */}
      <nav className="pro-nav">
        <a href="#" className="pro-nav-logo" onClick={scrollToTop} title="Didactic AI Home">
          <DidacticLogo size={28} variant="icon" theme={themeMode === 'light' ? 'light' : 'dark'} />
          <span>Didactic AI</span>
        </a>

        {/* Center Navigation Links */}
        <div className="pro-nav-center-links">
          <a
            href="#curriculum"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('curriculum');
            }}
            className="pro-nav-link"
          >
            Curriculum
          </a>
          <a
            href="#rubrics"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('rubrics');
            }}
            className="pro-nav-link"
          >
            Rubrics
          </a>
          <a
            href="#gradebook"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('gradebook');
            }}
            className="pro-nav-link"
          >
            Master Gradebook
          </a>
          <a
            href="#faq"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('faq');
            }}
            className="pro-nav-link"
          >
            FAQ
          </a>
        </div>

        {/* Right Corner: Sign In / Log In and Enter Platform Buttons */}
        <div className="pro-nav-right-actions">
          {currentUser ? (
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                className="pro-nav-btn-signin"
                style={{ display: 'flex', alignItems: 'center', gap: 7 }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: 'var(--accent)',
                    color: 'var(--on-accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.7rem',
                  }}
                >
                  {currentUser.name ? currentUser.name.trim().slice(0, 1).toUpperCase() : 'U'}
                </div>
                <span>{currentUser.name}</span>
              </button>

              <ProfileMenu
                isOpen={isProfileMenuOpen}
                onClose={() => setIsProfileMenuOpen(false)}
                currentUser={currentUser}
                onOpenProfile={onOpenProfile}
                onSignOut={onSignOut}
                theme={theme}
                themeMode={themeMode}
                onSelectThemeMode={onSelectThemeMode}
                onToggleTheme={onToggleTheme}
                position="header"
              />
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="pro-nav-btn-signin"
              title="Sign In or Log In"
            >
              Sign In / Log In
            </button>
          )}

          <button onClick={handleEnterPlatform} className="pro-btn-enter-primary">
            <span>Enter Platform</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </nav>

      {/* SPLIT HERO SECTION: Left Copy + Right Visual Idea Showcase */}
      <header className="pro-split-hero-container">
        {/* Left Side: Headline, Pitch & Enter Platform CTA */}
        <div className="pro-hero-left">
          <div className="pro-hero-badge">
            <Sparkles size={14} />
            <span>Next-Gen Pedagogical AI &bull; Evidence-Grounded Grading Engine</span>
          </div>

          <h1 className="pro-hero-main-title">
            Turn Course Material into Rigorous Exams.
            <span className="pro-hero-gradient-text">
              Grade Faster with Verifiable Evidence.
            </span>
          </h1>

          <p className="pro-hero-description">
            Decompile lecture slides and curriculum notes into Bloom-aligned exams, generate objective rubrics,
            and grade student papers with line-by-line evidence citations and master section gradebooks.
          </p>

          <div className="pro-hero-cta-wrap">
            <button onClick={handleEnterPlatform} className="pro-hero-btn-large">
              <span>Enter Platform</span>
              <ArrowRight size={18} />
            </button>
          </div>

          {/* 4 Clean Feature Bullets */}
          <div className="pro-hero-features-list">
            <div className="pro-hero-feat-item">
              <Lock size={15} style={{ color: '#EAB308', flexShrink: 0 }} />
              <span>Server-Side Integrity Lock</span>
            </div>
            <div className="pro-hero-feat-item">
              <Award size={15} style={{ color: 'var(--accent)', flexShrink: 0 }} />
              <span>Weighted Master Gradebook</span>
            </div>
            <div className="pro-hero-feat-item">
              <FileSpreadsheet size={15} style={{ color: '#10B981', flexShrink: 0 }} />
              <span>Audit-Ready Excel (.xlsx) Export</span>
            </div>
            <div className="pro-hero-feat-item">
              <RotateCcw size={15} style={{ color: '#38BDF8', flexShrink: 0 }} />
              <span>1-Click Teacher Regrading</span>
            </div>
          </div>
        </div>

        {/* Right Side: Visual Graphic Aligning with Didactic AI */}
        <div className="pro-hero-right-visual">
          <div className="pro-visual-card-wrapper">
            {/* Visual Header */}
            <div className="pro-visual-topbar">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="pro-visual-pill">CS-301 &bull; Section A</span>
                <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Midterm Exam</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.74rem', color: '#EAB308' }}>
                <Lock size={12} />
                <span>Rubric Locked</span>
              </div>
            </div>

            {/* Step 1: Lecture Concept */}
            <div className="pro-visual-step">
              <div className="pro-visual-step-header">
                <span>Ingested Source &bull; Slide 14</span>
                <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Bloom Level 4 (Analyze)</span>
              </div>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                <strong>Topic:</strong> Mutex ownership vs binary semaphore signaling; dynamic priority inheritance.
              </p>
            </div>

            {/* Step 2: Student Response with Highlighted Evidence Citation */}
            <div className="pro-visual-step" style={{ borderLeft: '3px solid var(--accent)' }}>
              <div className="pro-visual-step-header">
                <span style={{ color: 'var(--text)' }}>Student Answer &bull; STU-101 (Alice J.)</span>
                <span style={{ color: 'var(--accent)' }}>Score: 9.5 / 10</span>
              </div>
              <p className="pro-visual-answer-text">
                "A mutex enforces{' '}
                <span className="pro-evidence-highlight">
                  strict thread ownership: only the locker thread can release it
                </span>
                . In real-time kernels, priority inversion is resolved by{' '}
                <span className="pro-evidence-highlight">
                  elevating the lock-holder's dynamic priority
                </span>{' '}
                to eliminate unbounded blocking."
              </p>
            </div>

            {/* Step 3: Evidence Evaluation & Gradebook Sync */}
            <div className="pro-visual-eval-stats">
              <div className="pro-visual-stat-item">
                <div className="pro-visual-stat-lbl">Evidence Citation</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--accent)', marginTop: 2, fontWeight: 600 }}>
                  &check; Line-by-Line Match
                </div>
              </div>
              <div className="pro-visual-stat-item">
                <div className="pro-visual-stat-lbl">Master Grade Tier</div>
                <div className="pro-visual-stat-val">Grade A (95%)</div>
              </div>
            </div>

            {/* Floating Badge */}
            <div className="pro-floating-card-badge">
              <CheckCircle2 size={15} />
              <span>Confirmed in Master Excel (.xlsx)</span>
            </div>
          </div>
        </div>
      </header>

      {/* CONCISE 3-FEATURE SECTION BELOW HERO (SIMPLE & CLEAR) */}
      <section className="pro-simple-features-section" id="curriculum">
        <span id="rubrics" style={{ display: 'block', position: 'relative', top: '-70px', visibility: 'hidden' }} />
        <span id="gradebook" style={{ display: 'block', position: 'relative', top: '-70px', visibility: 'hidden' }} />

        <div className="pro-simple-grid">
          {/* Card 1 */}
          <div className="pro-simple-card">
            <div className="pro-simple-icon-box">
              <BookOpen size={20} />
            </div>
            <h3 className="pro-simple-card-title">1. Curriculum Decompilation</h3>
            <p className="pro-simple-card-desc">
              Upload PPTX presentations or syllabus PDFs. Didactic AI maps key points across Bloom’s cognitive levels and builds balanced multi-criteria rubrics.
            </p>
          </div>

          {/* Card 2 */}
          <div className="pro-simple-card">
            <div className="pro-simple-icon-box">
              <Sparkles size={20} />
            </div>
            <h3 className="pro-simple-card-title">2. Evidence-Grounded Grading</h3>
            <p className="pro-simple-card-desc">
              Grades student papers line by line with transparent citations. Teachers stay in complete control with 1-click manual score overrides and regrading.
            </p>
          </div>

          {/* Card 3 */}
          <div className="pro-simple-card">
            <div className="pro-simple-icon-box">
              <FileSpreadsheet size={20} />
            </div>
            <h3 className="pro-simple-card-title">3. Master Section Gradebook</h3>
            <p className="pro-simple-card-desc">
              Organize students by Section (Sec A, B). Matches on Student ID to prevent duplicate rows, computes weighted course percentages, and exports to Excel (.xlsx).
            </p>
          </div>
        </div>
      </section>

      {/* CONCISE FAQ ACCORDION */}
      <section className="pro-faq-section-simple" id="faq">
        <h2 className="pro-faq-simple-title">Frequently Asked Questions</h2>
        <div>
          {faqItems.map((item, index) => (
            <div key={index} className="pro-faq-simple-item">
              <button
                className="pro-faq-simple-btn"
                onClick={() => setOpenFaqIndex(openFaqIndex === index ? -1 : index)}
              >
                <span>{item.q}</span>
                {openFaqIndex === index ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              {openFaqIndex === index && (
                <div className="pro-faq-simple-ans">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CLEAN SIMPLE FOOTER */}
      <footer className="pro-simple-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <DidacticLogo size={24} variant="icon" theme={themeMode === 'light' ? 'light' : 'dark'} />
          <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>Didactic AI</span>
          <span>&copy; {new Date().getFullYear()} All rights reserved.</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <a href="#curriculum" onClick={(e) => { e.preventDefault(); scrollToSection('curriculum'); }} className="pro-nav-link">
            Curriculum
          </a>
          <a href="#rubrics" onClick={(e) => { e.preventDefault(); scrollToSection('rubrics'); }} className="pro-nav-link">
            Rubrics
          </a>
          <a href="#gradebook" onClick={(e) => { e.preventDefault(); scrollToSection('gradebook'); }} className="pro-nav-link">
            Gradebook
          </a>
          <a href="#faq" onClick={(e) => { e.preventDefault(); scrollToSection('faq'); }} className="pro-nav-link">
            FAQ
          </a>
          <button
            onClick={handleEnterPlatform}
            className="pro-btn-enter-primary"
            style={{ padding: '6px 14px', fontSize: '0.8rem' }}
          >
            Enter Platform
          </button>
        </div>
      </footer>
    </div>
  );
}
