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
  BookOpen,
  FileText,
  RotateCcw,
  Award,
  ChevronDown,
  ChevronUp,
  Check,
  Cpu,
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
  const [cohortSize, setCohortSize] = useState(75);

  useEffect(() => {
    // Scroll progress line along top edge
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
            href="#productivity"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('productivity');
            }}
            className="pro-nav-link"
          >
            Time Saved
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

      {/* SPLIT HERO SECTION: Left Copy + Right Convergence Funnel Graphic */}
      <header className="pro-split-hero-container">
        {/* Left Side: Headline, Pitch & Enter Platform CTA */}
        <div className="pro-hero-left">


          <h1 className="pro-hero-main-title">
            Grade Faster with Verifiable Evidence.

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

        {/* Right Side: Convergence Funnel Illustration (Exams, Notes, Papers -> Didactic AI) */}
        <div className="pro-hero-pipeline-wrapper">
          {/* SVG Connector Curves */}
          <svg className="pro-funnel-svg" viewBox="0 0 540 420" fill="none" preserveAspectRatio="none">
            <defs>
              <linearGradient id="funnelGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#14B8A6" stopOpacity="0.4" />
                <stop offset="70%" stopColor="#5EEAD4" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#14B8A6" stopOpacity="1" />
              </linearGradient>
            </defs>

            {/* Path 1: Exams (Top) to Center Hub */}
            <path
              d="M 165 75 C 270 75, 290 210, 345 210"
              stroke="url(#funnelGrad)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle cx="255" cy="115" r="4.5" fill="#5EEAD4" />
            <circle cx="255" cy="115" r="9" fill="#5EEAD4" fillOpacity="0.25" />

            {/* Path 2: Notes & PPTX (Middle) to Center Hub */}
            <path
              d="M 165 210 L 345 210"
              stroke="url(#funnelGrad)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle cx="255" cy="210" r="4.5" fill="#5EEAD4" />
            <circle cx="255" cy="210" r="9" fill="#5EEAD4" fillOpacity="0.25" />

            {/* Path 3: Papers & Submissions (Bottom) to Center Hub */}
            <path
              d="M 165 345 C 270 345, 290 210, 345 210"
              stroke="url(#funnelGrad)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <circle cx="255" cy="305" r="4.5" fill="#5EEAD4" />
            <circle cx="255" cy="305" r="9" fill="#5EEAD4" fillOpacity="0.25" />
          </svg>

          {/* Left Inputs Column */}
          <div className="pro-pipeline-sources">
            {/* Source 1: Exams */}
            <div className="pro-source-badge-card">
              <div className="pro-source-tag">
                <FileText size={12} />
                <span>Exams & MCQs</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, margin: '4px 0' }}>
                <span style={{ width: 14, height: 14, borderRadius: '50%', background: 'rgba(20, 184, 166, 0.2)', color: 'var(--accent)', fontSize: '0.62rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>A</span>
                <span style={{ width: 14, height: 14, borderRadius: '50%', background: 'var(--accent)', color: '#000', fontSize: '0.62rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>B</span>
                <span style={{ width: 14, height: 14, borderRadius: '50%', background: 'rgba(20, 184, 166, 0.2)', color: 'var(--accent)', fontSize: '0.62rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>C</span>
                <span style={{ width: 14, height: 14, borderRadius: '50%', background: 'rgba(20, 184, 166, 0.2)', color: 'var(--accent)', fontSize: '0.62rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>D</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Question sheets & rubrics</div>
            </div>

            {/* Source 2: Curriculum Notes */}
            <div className="pro-source-badge-card">
              <div className="pro-source-tag">
                <BookOpen size={12} />
                <span>Lecture Notes</span>
              </div>
              <div style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text)', margin: '2px 0' }}>
                slides-concurrency.pptx
              </div>
              <div style={{ fontSize: '0.68rem', color: 'var(--accent)', fontWeight: 600 }}>
                Bloom's Taxonomy L4
              </div>
            </div>

            {/* Source 3: Student Papers */}
            <div className="pro-source-badge-card">
              <div className="pro-source-tag">
                <Cpu size={12} />
                <span>Student Papers</span>
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                "Mutex enforces{' '}
                <span style={{ color: 'var(--accent)', fontWeight: 600, background: 'rgba(20, 184, 166, 0.15)', padding: '1px 3px', borderRadius: 2 }}>
                  strict thread ownership
                </span>..."
              </div>
            </div>
          </div>

          {/* Right Destination: Didactic AI Unified Engine */}
          <div className="pro-pipeline-target">
            <div className="pro-target-engine-card">
              <div className="pro-target-badge">
                <Sparkles size={13} />
                <span>Didactic AI Engine</span>
              </div>

              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
                CS-301 Midterm &bull; Sec A
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                <CheckCircle2 size={12} style={{ color: 'var(--accent)' }} />
                <span>Grounded Evidence Citations</span>
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Alice J. (STU-101)</span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--accent)' }}>Grade A</span>
                </div>
                <div className="pro-target-score-pill">
                  9.5 / 10.0 pts (95%)
                </div>
              </div>

              <div style={{ marginTop: 10, fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <FileSpreadsheet size={11} style={{ color: '#10B981' }} />
                <span>Master Gradebook Sync (.xlsx)</span>
              </div>
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

      {/* INTERACTIVE TIME SAVED CALCULATOR */}
      <section className="pro-calculator-card" id="productivity">
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <span className="pro-section-tag">Productivity Estimator</span>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginTop: 4 }}>
            How Much Time Does It Save Per Student?
          </h2>
          <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)' }}>
            Adjust the slider to match your active class or cohort size:
          </p>
        </div>

        <div className="pro-slider-wrap">
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginBottom: 8 }}>
            <span>Cohort Size:</span>
            <span style={{ color: 'var(--accent)', fontSize: '1.25rem' }}>{cohortSize} Students</span>
          </div>
          <input
            type="range"
            min={20}
            max={300}
            step={5}
            value={cohortSize}
            onChange={(e) => setCohortSize(Number(e.target.value))}
            className="pro-slider"
          />
        </div>

        <div className="pro-calc-stats">
          <div className="pro-calc-stat-box">
            <div className="pro-calc-stat-num">~2.5 hrs</div>
            <div className="pro-calc-stat-lbl">Saved Per Student Each Term</div>
          </div>
          <div className="pro-calc-stat-box">
            <div className="pro-calc-stat-num">{Math.round(cohortSize * 2.5)} hrs</div>
            <div className="pro-calc-stat-lbl">Total Grading Hours Saved</div>
          </div>
          <div className="pro-calc-stat-box">
            <div className="pro-calc-stat-num">{cohortSize * 4} papers</div>
            <div className="pro-calc-stat-lbl">Exams & Quizzes Automated</div>
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
          <DidacticLogo size={22} variant="icon" theme={themeMode === 'light' ? 'light' : 'dark'} />
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
          <a href="#productivity" onClick={(e) => { e.preventDefault(); scrollToSection('productivity'); }} className="pro-nav-link">
            Time Saved
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
