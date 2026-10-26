import React, { useState } from 'react';
import ExcelJS from 'exceljs';
import ProfileMenu from '../components/ProfileMenu';
import './LandingPage.css';
import {
  Zap,
  ArrowRight,
  FileSpreadsheet,
  BookOpen,
  Layers,
  Search,
  Users,
  Lock,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Award,
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
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToTop = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSignUpClick = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (currentUser) {
      if (onEnterApp) onEnterApp();
      return;
    }
    if (onOpenAuth) onOpenAuth('register');
  };

  const handleLogInClick = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (currentUser) {
      if (onEnterApp) onEnterApp();
      return;
    }
    if (onOpenAuth) onOpenAuth('signin');
  };

  const handleExportSampleExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('CS-301 Master Gradebook');

    worksheet.columns = [
      { header: 'Student ID', key: 'id', width: 16 },
      { header: 'Student Name', key: 'name', width: 24 },
      { header: 'Section', key: 'section', width: 14 },
      { header: 'Midterm [40%]', key: 'midterm', width: 18 },
      { header: 'Final Exam [60%]', key: 'final', width: 18 },
      { header: 'Course % (Weighted)', key: 'weighted', width: 22 },
      { header: 'Final Grade Tier', key: 'tier', width: 16 },
    ];

    const sampleRoster = [
      { id: 'STU-2026-001', name: 'Alice Johnson', section: 'Section A', midterm: '46.5 / 50 (93%)', final: '48.0 / 50 (96%)', weighted: '94.8%', tier: 'Grade A' },
      { id: 'STU-2026-002', name: 'Marcus Chen', section: 'Section A', midterm: '44.5 / 50 (89%)', final: '42.0 / 50 (84%)', weighted: '86.0%', tier: 'Grade A-' },
      { id: 'STU-2026-003', name: 'Sophia Rodriguez', section: 'Section B', midterm: '45.5 / 50 (91%)', final: '46.0 / 50 (92%)', weighted: '91.6%', tier: 'Grade A' },
      { id: 'STU-2026-004', name: 'David Kim', section: 'Section B', midterm: '39.5 / 50 (79%)', final: '40.5 / 50 (81%)', weighted: '80.2%', tier: 'Grade B+' },
      { id: 'STU-2026-005', name: 'Fatima Al-Mansoor', section: 'Section A', midterm: '48.0 / 50 (96%)', final: '49.0 / 50 (98%)', weighted: '97.2%', tier: 'Grade A' },
    ];

    sampleRoster.forEach((row) => worksheet.addRow(row));
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Didactic_AI_Master_Gradebook_Sample.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  const faqItems = [
    {
      q: 'How does evidence citation work, and how are hallucinations handled?',
      a: 'Didactic AI matches student answer text directly against objective rubric criteria with line-by-line evidence citations. Every awarded mark references the exact phrase in the student submission. Instructors retain full oversight: you can override any score with one click or trigger a complete regrade.',
    },
    {
      q: 'Can I re-grade an individual question or an entire student submission?',
      a: 'Yes. Both full-submission and single-question regrading are built into every assessment sheet. Clicking "Regrade" re-evaluates the student answer against the criteria key without losing any student records.',
    },
    {
      q: 'How do course sections and student deduplication work?',
      a: 'Assessments can be organized by Course, Section (e.g. Section A, Section B), and Academic Year. When grading multiple assessments (Quizzes, Midterms, Finals), the system automatically matches the Student ID so subsequent scores append into the student’s existing row in the Master Gradebook without creating duplicate records.',
    },
    {
      q: 'What is the Server-Side Integrity Lock?',
      a: 'Once the first student submission is graded, questions and rubric criteria are locked on the server to guarantee that every student in the cohort is evaluated against the exact same standard.',
    },
  ];

  return (
    <div className="pro-landing-wrapper">
      {/* Subtle Brand Background Glow */}
      <div className="pro-brand-glow" />

      {/* Modern Brand Navigation */}
      <nav className="pro-nav">
        {/* Brand Logo with Original Zap Tile */}
        <a href="#" className="pro-nav-logo" onClick={scrollToTop} title="Didactic AI Home">
          <div className="pro-brand-icon-tile">
            <Zap size={18} strokeWidth={2.4} />
          </div>
          <span>Didactic AI</span>
        </a>

        {/* Center Links */}
        <div className="pro-nav-links">
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
            href="#grading"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('grading');
            }}
            className="pro-nav-link"
          >
            Grading
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

          {/* Right Auth Controls */}
          {currentUser ? (
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                type="button"
                onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '7px 14px',
                  borderRadius: 8,
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.88rem',
                }}
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: '#14B8A6',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.72rem',
                  }}
                >
                  {currentUser.name ? currentUser.name.trim().slice(0, 1).toUpperCase() : 'U'}
                </div>
                <span>{currentUser.name}</span>
              </button>

              <button onClick={onEnterApp} className="pro-btn-signup">
                <span>Enter Platform</span>
                <ArrowRight size={14} />
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={handleSignUpClick} className="pro-btn-signup">
                Sign Up
              </button>
              <button onClick={handleLogInClick} className="pro-btn-login">
                Log In
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* HERO SECTION: UNIQUE DIDACTIC PEDAGOGICAL SYNTHESIS */}
      <header className="pro-hero-unique">
        {/* Left Column: Crisp Headline, Subtext, and Single Action */}
        <div className="pro-hero-copy">
          <div className="pro-hero-eyebrow">
            <Sparkles size={13} />
            <span>Pedagogical AI &bull; Master Gradebook</span>
          </div>

          <h1 className="pro-hero-headline">
            From Lecture Notes to Graded Exams.{' '}
            <span className="pro-hero-highlight">Fair, Evidence-Backed Grading.</span>
          </h1>

          <p className="pro-hero-subtext">
            Didactic AI helps university educators decompile course materials into balanced examinations, generate objective multi-criteria rubrics, and evaluate student papers with line-by-line evidence citations.
          </p>

          <div className="pro-hero-actions-row">
            {currentUser ? (
              <button onClick={onEnterApp} className="pro-cta-primary">
                <span>Enter Workspace</span>
                <ArrowRight size={16} />
              </button>
            ) : (
              <>
                <button onClick={handleSignUpClick} className="pro-cta-primary">
                  <span>Sign Up for Free</span>
                  <ArrowRight size={16} />
                </button>
                <button onClick={handleLogInClick} className="pro-cta-secondary">
                  <span>Log In</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Right Column: Unique Didactic Synthesis Diagram */}
        <div className="pro-hero-visual">
          <svg viewBox="0 0 520 380" className="pro-synthesis-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Luminous Connecting Circuit Paths */}
            <path d="M 185 85 C 270 85 280 190 350 190" stroke="#14B8A6" strokeWidth="2.5" strokeOpacity="0.75" />
            <path d="M 195 190 L 350 190" stroke="#14B8A6" strokeWidth="2.5" strokeOpacity="0.85" />
            <path d="M 185 295 C 270 295 280 190 350 190" stroke="#14B8A6" strokeWidth="2.5" strokeOpacity="0.75" />
            <path d="M 410 190 L 500 190" stroke="#5EEAD4" strokeWidth="3" />

            {/* Glowing Connection Nodes */}
            <circle cx="280" cy="120" r="4.5" fill="#5EEAD4" stroke="#14B8A6" strokeWidth="2" />
            <circle cx="280" cy="260" r="4.5" fill="#5EEAD4" stroke="#14B8A6" strokeWidth="2" />
            <circle cx="500" cy="190" r="5" fill="#5EEAD4" stroke="#14B8A6" strokeWidth="2.5" />

            {/* NODE 1 (TOP): LECTURE NOTES & PPTX */}
            <g transform="translate(25, 45)">
              <text x="70" y="-8" textAnchor="middle" fill="#64748B" fontSize="11" fontWeight="700" letterSpacing="0.08em">
                LECTURE NOTES (PPTX)
              </text>
              {/* Back card */}
              <rect x="25" y="0" width="115" height="70" rx="8" fill="#111C30" stroke="#1E2D4A" strokeWidth="1.2" opacity="0.6" />
              {/* Front card */}
              <rect x="15" y="8" width="120" height="74" rx="8" fill="#0B1220" stroke="#1E2D4A" strokeWidth="1.5" />
              {/* Slide Presentation Graphic */}
              <rect x="25" y="18" width="40" height="26" rx="4" fill="#16243D" stroke="#14B8A6" strokeWidth="1" />
              <circle cx="45" cy="31" r="5" fill="#5EEAD4" opacity="0.8" />
              {/* Concept tags */}
              <rect x="72" y="18" width="50" height="6" rx="3" fill="#5EEAD4" opacity="0.9" />
              <rect x="72" y="28" width="40" height="5" rx="2.5" fill="#94A3B8" opacity="0.6" />
              <rect x="72" y="37" width="44" height="5" rx="2.5" fill="#94A3B8" opacity="0.4" />
              {/* Bloom level indicator */}
              <rect x="25" y="52" width="70" height="14" rx="4" fill="rgba(20, 184, 166, 0.15)" stroke="rgba(94, 234, 212, 0.3)" strokeWidth="1" />
              <text x="60" y="62" textAnchor="middle" fill="#5EEAD4" fontSize="8" fontWeight="700">BLOOM LEVEL 4</text>
              {/* Connector Pin */}
              <circle cx="135" cy="45" r="4.5" fill="#0B1220" stroke="#14B8A6" strokeWidth="2.5" />
            </g>

            {/* NODE 2 (MIDDLE): OBJECTIVE RUBRICS */}
            <g transform="translate(15, 150)">
              <text x="85" y="-8" textAnchor="middle" fill="#64748B" fontSize="11" fontWeight="700" letterSpacing="0.08em">
                OBJECTIVE RUBRICS
              </text>
              <rect x="15" y="0" width="135" height="76" rx="8" fill="#0B1220" stroke="#1E2D4A" strokeWidth="1.5" />
              {/* Question header */}
              <rect x="25" y="12" width="60" height="6" rx="3" fill="#14B8A6" />
              <rect x="95" y="11" width="42" height="12" rx="3" fill="rgba(20, 184, 166, 0.15)" />
              <text x="116" y="20" textAnchor="middle" fill="#5EEAD4" fontSize="7.5" fontWeight="700">10.0 PTS</text>
              {/* Criteria Weight Bars */}
              <rect x="25" y="26" width="112" height="4" rx="2" fill="#1E2D4A" />
              <rect x="25" y="36" width="70" height="5" rx="2.5" fill="#94A3B8" opacity="0.7" />
              <text x="122" y="41" textAnchor="end" fill="#5EEAD4" fontSize="8" fontWeight="700">35%</text>
              <rect x="25" y="46" width="60" height="5" rx="2.5" fill="#94A3B8" opacity="0.7" />
              <text x="122" y="51" textAnchor="end" fill="#5EEAD4" fontSize="8" fontWeight="700">35%</text>
              <rect x="25" y="56" width="50" height="5" rx="2.5" fill="#94A3B8" opacity="0.7" />
              <text x="122" y="61" textAnchor="end" fill="#5EEAD4" fontSize="8" fontWeight="700">30%</text>
              {/* Connector Pin */}
              <circle cx="150" cy="38" r="4.5" fill="#0B1220" stroke="#14B8A6" strokeWidth="2.5" />
            </g>

            {/* NODE 3 (BOTTOM): STUDENT PAPERS */}
            <g transform="translate(25, 255)">
              <text x="70" y="-8" textAnchor="middle" fill="#64748B" fontSize="11" fontWeight="700" letterSpacing="0.08em">
                STUDENT PAPERS
              </text>
              <rect x="15" y="0" width="120" height="74" rx="8" fill="#0B1220" stroke="#1E2D4A" strokeWidth="1.5" />
              {/* Student Answer Text lines */}
              <rect x="25" y="14" width="40" height="5" rx="2.5" fill="#94A3B8" opacity="0.5" />
              {/* Highlighted Evidence Citation */}
              <rect x="25" y="24" width="98" height="14" rx="3" fill="rgba(20, 184, 166, 0.2)" stroke="#14B8A6" strokeWidth="1" />
              <text x="74" y="34" textAnchor="middle" fill="#5EEAD4" fontSize="7.5" fontWeight="700">"STRICT MUTEX OWNERSHIP"</text>
              <rect x="25" y="43" width="70" height="5" rx="2.5" fill="#94A3B8" opacity="0.5" />
              <rect x="25" y="52" width="55" height="5" rx="2.5" fill="#94A3B8" opacity="0.5" />
              {/* Score badge */}
              <rect x="90" y="47" width="35" height="15" rx="4" fill="#14B8A6" />
              <text x="107" y="58" textAnchor="middle" fill="#0B1220" fontSize="8.5" fontWeight="800">9.5 / 10</text>
              {/* Connector Pin */}
              <circle cx="135" cy="37" r="4.5" fill="#0B1220" stroke="#14B8A6" strokeWidth="2.5" />
            </g>

            {/* CENTRAL DIDACTIC AI SYNTHESIS CORE */}
            <g transform="translate(345, 150)">
              {/* Luminous aura rings */}
              <circle cx="40" cy="40" r="42" fill="none" stroke="#14B8A6" strokeWidth="1.5" strokeOpacity="0.4" strokeDasharray="4 4" />
              <circle cx="40" cy="40" r="34" fill="#0B1220" stroke="#14B8A6" strokeWidth="2.5" />
              {/* Inner Zap Mark */}
              <path d="M 43 25 L 32 41 L 39 41 L 37 55 L 48 38 L 41 38 Z" fill="#5EEAD4" />
            </g>

            {/* RIGHT OUTPUT CARD: MASTER GRADEBOOK & AUDIT */}
            <g transform="translate(430, 140)">
              <rect x="0" y="0" width="80" height="95" rx="8" fill="#0B1220" stroke="#14B8A6" strokeWidth="1.8" />
              <rect x="8" y="10" width="64" height="6" rx="3" fill="#14B8A6" />
              {/* Section Row A */}
              <rect x="8" y="24" width="22" height="5" rx="2.5" fill="#94A3B8" />
              <rect x="44" y="22" width="28" height="10" rx="3" fill="rgba(20, 184, 166, 0.2)" />
              <text x="58" y="29" textAnchor="middle" fill="#5EEAD4" fontSize="7" fontWeight="700">SEC A</text>
              {/* Scores */}
              <rect x="8" y="37" width="48" height="4" rx="2" fill="#1E2D4A" />
              <rect x="8" y="47" width="55" height="4" rx="2" fill="#1E2D4A" />
              {/* Grade A Badge */}
              <rect x="8" y="60" width="64" height="18" rx="4" fill="#14B8A6" />
              <text x="40" y="72" textAnchor="middle" fill="#0B1220" fontSize="9" fontWeight="800">GRADE A</text>
              {/* Sub-label */}
              <text x="40" y="86" textAnchor="middle" fill="#94A3B8" fontSize="6.5" fontWeight="600">94.8% &bull; XLSX</text>
            </g>
          </svg>
        </div>
      </header>

      {/* 3-PILLAR FEATURE SECTION */}
      <section className="pro-pillars-section" id="curriculum">
        <div className="pro-pillars-header">
          <span className="pro-pillars-tag">Platform Pillars</span>
          <h2 className="pro-pillars-title">The Complete Pedagogical Engine</h2>
          <p className="pro-pillars-desc">
            From lecture ingestion to weighted registrar gradebooks—everything built for university academic standards.
          </p>
        </div>

        <div className="pro-pillars-grid">
          {/* Pillar 1 */}
          <div className="pro-pillar-card">
            <div className="pro-pillar-icon">
              <BookOpen size={20} strokeWidth={2.2} />
            </div>
            <h3>Curriculum Decompilation</h3>
            <p>
              Upload PPTX lecture slides or syllabus notes. Didactic AI maps concepts across Bloom's taxonomy cognitive levels so your assessments test analytical understanding, not simple memorization.
            </p>
          </div>

          {/* Pillar 2 */}
          <div className="pro-pillar-card" id="rubrics">
            <div className="pro-pillar-icon">
              <Search size={20} strokeWidth={2.2} />
            </div>
            <h3>Evidence-Grounded Grading</h3>
            <p id="grading">
              Student submissions are matched against objective rubrics. Every awarded point cites specific student phrases with one-click teacher overrides and full regrade controls.
            </p>
          </div>

          {/* Pillar 3 */}
          <div className="pro-pillar-card" id="gradebook">
            <div className="pro-pillar-icon">
              <Users size={20} strokeWidth={2.2} />
            </div>
            <h3>Master Course Gradebooks</h3>
            <p>
              Group cohorts into Section A and B without duplicate records. Configure multi-exam percentage weights (Quizzes, Midterm, Final) and export directly to Excel (.xlsx).
            </p>
          </div>
        </div>
      </section>

      {/* SAMPLE AUDIT SHEET EXCEL EXPORT */}
      <section className="pro-audit-section">
        <div className="pro-audit-card">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Award size={18} style={{ color: '#14B8A6' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)' }}>
                Audit-Ready Multi-Exam Gradebooks
              </h3>
            </div>
            <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', maxWidth: 640 }}>
              Download a sample multi-exam spreadsheet showing how Section A and B student scores, weighted percentages, and Grade Tiers aggregate.
            </p>
          </div>

          <button
            onClick={handleExportSampleExcel}
            className="pro-btn-signup"
            style={{ padding: '11px 22px' }}
          >
            <FileSpreadsheet size={16} />
            <span>Download Sample Excel (.xlsx)</span>
          </button>
        </div>
      </section>

      {/* FREQUENTLY ASKED QUESTIONS */}
      <section className="pro-faq-section" id="faq">
        <h2 style={{ fontSize: '2rem', fontWeight: 800, textAlign: 'center', marginBottom: 36, letterSpacing: '-0.02em', color: 'var(--text)' }}>
          Frequently Asked Questions
        </h2>

        <div>
          {faqItems.map((item, index) => (
            <div key={index} className="pro-faq-item">
              <button
                className="pro-faq-btn"
                onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
              >
                <span>{item.q}</span>
                {openFaqIndex === index ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </button>
              {openFaqIndex === index && (
                <div className="pro-faq-content">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* MINIMAL FOOTER */}
      <footer className="pro-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="pro-brand-icon-tile" style={{ width: 26, height: 26, borderRadius: 7 }}>
            <Zap size={14} />
          </div>
          <span style={{ fontWeight: 700, fontSize: '0.98rem', color: 'var(--text)' }}>Didactic AI</span>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginLeft: 8 }}>
            &copy; {new Date().getFullYear()} Didactic AI. All rights reserved.
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 24, fontSize: '0.88rem' }}>
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
        </div>
      </footer>
    </div>
  );
}
