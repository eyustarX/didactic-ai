import React, { useState } from 'react';
import ExcelJS from 'exceljs';
import ProfileMenu from '../components/ProfileMenu';
import './LandingPage.css';
import {
  FileSpreadsheet,
  BookOpen,
  Layers,
  Search,
  Users,
  Lock,
  ChevronDown,
  ChevronUp,
  RotateCcw,
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
      q: 'How does evidence citation work, and how are hallucinations prevented?',
      a: 'Didactic AI matches student answer text directly against objective rubric criteria with line-by-line evidence citations. Every awarded point references the exact phrase in the student submission. Instructors have full oversight: you can override any score with one click or trigger a complete regrade.',
    },
    {
      q: 'Can I re-grade an individual question or an entire student submission?',
      a: 'Yes. Both full-submission and single-question regrading are built into every assessment sheet. Clicking "Regrade" re-evaluates the student answer against the criteria key without losing any student records.',
    },
    {
      q: 'How do course sections and student deduplication work?',
      a: 'Assessments can be organized by Course, Section (e.g. Section A, Section B), and Academic Year. When grading multiple assessments (Quizzes, Midterms, Finals), the system automatically matches the Student ID so subsequent scores append into the student’s existing row in the Master Gradebook.',
    },
    {
      q: 'What is the Server-Side Integrity Lock?',
      a: 'Once the first student submission is graded, questions and rubric criteria are locked on the server to guarantee that every student in the cohort is evaluated against the exact same standard.',
    },
  ];

  return (
    <div className="pro-landing-wrapper">
      {/* Navbar: Simple, Crisp, Gradescope-Style */}
      <nav className="pro-nav">
        <a href="#" className="pro-nav-logo" onClick={scrollToTop} title="Didactic AI Home">
          {/* 4-Bar Graph Logo Icon */}
          <div className="pro-logo-bars">
            <span className="pro-logo-bar" style={{ height: '35%' }} />
            <span className="pro-logo-bar" style={{ height: '65%' }} />
            <span className="pro-logo-bar" style={{ height: '100%' }} />
            <span className="pro-logo-bar" style={{ height: '80%' }} />
          </div>
          <span>Didactic AI</span>
        </a>

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
            Help Center
          </a>

          {/* User Sign In / Profile or Auth Buttons */}
          {currentUser ? (
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
              <button
                type="button"
                onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 14px',
                  borderRadius: 6,
                  background: 'var(--surface-alt)',
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
                    background: 'var(--accent)',
                    color: '#0B1220',
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
                Enter Platform
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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

      {/* HERO SECTION: SPLIT 2-COLUMN LAYOUT (MATCHING GRADESCOPE REFERENCE) */}
      <header className="pro-hero-split">
        {/* Left Column: Converging Diagram (Exams, Homework, Code & Text) */}
        <div className="pro-hero-diagram-col">
          <svg viewBox="0 0 480 360" className="pro-diagram-svg" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Curved Connection Lines */}
            {/* Top Curve from EXAMS */}
            <path d="M 180 75 C 265 75 270 180 370 180" stroke="#94A3B8" strokeWidth="2.5" fill="none" />
            {/* Middle Line from HOMEWORK */}
            <path d="M 220 180 L 370 180" stroke="#94A3B8" strokeWidth="2.5" fill="none" />
            {/* Bottom Curve from CODE */}
            <path d="M 180 285 C 265 285 270 180 370 180" stroke="#94A3B8" strokeWidth="2.5" fill="none" />
            {/* Merged Line flowing right into the assessment engine */}
            <path d="M 370 180 L 470 180" stroke="#94A3B8" strokeWidth="2.5" fill="none" />

            {/* Connection Dots along lines */}
            <circle cx="280" cy="118" r="4.5" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="2.5" />
            <circle cx="370" cy="180" r="5" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="3" />
            <circle cx="280" cy="242" r="4.5" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="2.5" />
            <circle cx="470" cy="180" r="4.5" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="2.5" />

            {/* 1. TOP CARD: EXAMS */}
            <text x="135" y="24" textAnchor="middle" fill="#475569" fontSize="12" fontWeight="700" letterSpacing="0.08em">
              EXAMS
            </text>
            {/* Offset background paper */}
            <rect x="110" y="36" width="60" height="74" rx="4" fill="#E2E8F0" />
            {/* Front exam sheet */}
            <rect x="95" y="44" width="65" height="76" rx="4" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.5" />
            {/* Title line */}
            <rect x="103" y="52" width="30" height="4" rx="2" fill="#94A3B8" />
            {/* Question 1 bubbles */}
            <circle cx="106" cy="65" r="3" fill="#3B82F6" />
            <circle cx="116" cy="65" r="3" fill="#CBD5E1" />
            <circle cx="126" cy="65" r="3" fill="#CBD5E1" />
            <circle cx="136" cy="65" r="3" fill="#CBD5E1" />
            {/* Question 2 bubbles */}
            <circle cx="106" cy="78" r="3" fill="#CBD5E1" />
            <circle cx="116" cy="78" r="3" fill="#3B82F6" />
            <circle cx="126" cy="78" r="3" fill="#CBD5E1" />
            <circle cx="136" cy="78" r="3" fill="#CBD5E1" />
            {/* Question 3 bubbles */}
            <circle cx="106" cy="91" r="3" fill="#CBD5E1" />
            <circle cx="116" cy="91" r="3" fill="#CBD5E1" />
            <circle cx="126" cy="91" r="3" fill="#3B82F6" />
            <circle cx="136" cy="91" r="3" fill="#CBD5E1" />
            {/* Connector dot */}
            <circle cx="180" cy="75" r="4.5" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="2.5" />

            {/* 2. MIDDLE CARD: HOMEWORK */}
            <text x="175" y="132" textAnchor="middle" fill="#475569" fontSize="12" fontWeight="700" letterSpacing="0.08em">
              HOMEWORK
            </text>
            {/* Paper sheet */}
            <rect x="130" y="145" width="65" height="76" rx="4" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.5" />
            <rect x="140" y="156" width="45" height="4" rx="2" fill="#94A3B8" />
            <rect x="140" y="166" width="38" height="4" rx="2" fill="#E2E8F0" />
            <rect x="140" y="176" width="42" height="4" rx="2" fill="#E2E8F0" />
            <rect x="140" y="186" width="35" height="4" rx="2" fill="#E2E8F0" />
            {/* Smartphone / Scanning device in front */}
            <rect x="172" y="155" width="42" height="70" rx="6" fill="#0F172A" stroke="#334155" strokeWidth="2" />
            <rect x="176" y="161" width="34" height="56" rx="3" fill="#FFFFFF" />
            {/* Graph bars on screen */}
            <rect x="182" y="198" width="4" height="12" rx="1" fill="#14B8A6" />
            <rect x="188" y="192" width="4" height="18" rx="1" fill="#14B8A6" />
            <rect x="194" y="184" width="4" height="26" rx="1" fill="#14B8A6" />
            {/* Connector dot */}
            <circle cx="220" cy="180" r="4.5" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="2.5" />

            {/* 3. BOTTOM CARD: CODE */}
            <text x="135" y="254" textAnchor="middle" fill="#475569" fontSize="12" fontWeight="700" letterSpacing="0.08em">
              CODE
            </text>
            {/* Code terminal window */}
            <rect x="90" y="265" width="85" height="60" rx="5" fill="#0F172A" stroke="#1E293B" strokeWidth="1.5" />
            {/* Header bar */}
            <rect x="90" y="265" width="85" height="12" rx="5" fill="#1E293B" />
            <circle cx="97" cy="271" r="2" fill="#EF4444" />
            <circle cx="103" cy="271" r="2" fill="#F59E0B" />
            <circle cx="109" cy="271" r="2" fill="#10B981" />
            {/* Syntax lines */}
            <rect x="98" y="284" width="28" height="3" rx="1.5" fill="#F43F5E" />
            <rect x="130" y="284" width="34" height="3" rx="1.5" fill="#10B981" />
            <rect x="104" y="292" width="46" height="3" rx="1.5" fill="#38BDF8" />
            <rect x="104" y="300" width="30" height="3" rx="1.5" fill="#FBBF24" />
            <rect x="138" y="300" width="22" height="3" rx="1.5" fill="#A855F7" />
            <rect x="98" y="308" width="36" height="3" rx="1.5" fill="#94A3B8" />
            {/* Connector dot */}
            <circle cx="180" cy="285" r="4.5" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="2.5" />
          </svg>
        </div>

        {/* Right Column: Clean Headline & Dual Buttons */}
        <div className="pro-hero-text-col">
          <h1 className="pro-hero-heading">
            Deliver and Grade Your Assessments Anywhere
          </h1>

          <p className="pro-hero-desc">
            Didactic AI helps you seamlessly administer and grade all of your course assessments, whether in-class exams, PPTX lectures, or student papers. Save time grading and get a clear, evidence-grounded picture of how your students are doing.
          </p>

          <div className="pro-hero-btn-row">
            {currentUser ? (
              <>
                <button onClick={onEnterApp} className="pro-hero-btn-primary">
                  Enter Workspace
                </button>
                <button onClick={onSignOut} className="pro-hero-btn-outline">
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <button onClick={handleSignUpClick} className="pro-hero-btn-primary">
                  Sign Up for Free
                </button>
                <button onClick={handleLogInClick} className="pro-hero-btn-outline">
                  Log In
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 3-COLUMN FEATURE SECTION */}
      <section className="pro-features-section" id="curriculum">
        <div className="pro-features-header">
          <h2 className="pro-features-title">How Didactic AI Works for Professors</h2>
          <p className="pro-features-desc">
            Streamline your entire teaching workflow from curriculum ingestion to final registrar gradebooks.
          </p>
        </div>

        <div className="pro-features-grid">
          {/* Feature 1 */}
          <div className="pro-feature-card">
            <div className="pro-feature-icon">
              <BookOpen size={22} />
            </div>
            <h3>Curriculum Decompilation</h3>
            <p>
              Upload PPTX lecture slides or syllabus notes. Didactic AI segments concepts into Bloom's taxonomy levels so exams test true analytical depth rather than simple memorization.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="pro-feature-card" id="rubrics">
            <div className="pro-feature-icon">
              <Search size={22} />
            </div>
            <h3>Evidence-Grounded Grading</h3>
            <p id="grading">
              Grade student submissions against objective multi-criteria rubrics. Every score cites specific student phrases with one-click teacher overrides and full regrade controls.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="pro-feature-card" id="gradebook">
            <div className="pro-feature-icon">
              <Users size={22} />
            </div>
            <h3>Master Course Gradebooks</h3>
            <p>
              Organize classes by Section A and B. Student ID matching prevents duplicate records, computes weighted multi-exam percentages (Midterm + Final), and exports to Excel (.xlsx).
            </p>
          </div>
        </div>
      </section>

      {/* SAMPLE AUDIT SHEET EXCEL EXPORT */}
      <section className="pro-excel-preview-section">
        <div className="pro-excel-card">
          <div className="pro-excel-header">
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 4 }}>
                Audit-Ready Multi-Exam Gradebooks
              </h3>
              <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)' }}>
                Download a fully formatted sample spreadsheet showing how Section A and B student scores, weighted percentages, and Grade Tiers aggregate.
              </p>
            </div>
            <button
              onClick={handleExportSampleExcel}
              className="pro-btn-signup"
              style={{ gap: 8, padding: '10px 20px' }}
            >
              <FileSpreadsheet size={16} />
              <span>Download Sample Audit Sheet (.xlsx)</span>
            </button>
          </div>
        </div>
      </section>

      {/* FREQUENTLY ASKED QUESTIONS */}
      <section className="pro-faq-section" id="faq">
        <h2 style={{ fontSize: '2rem', fontWeight: 800, textAlign: 'center', marginBottom: 40, letterSpacing: '-0.02em' }}>
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

      {/* SIMPLE FOOTER */}
      <footer className="pro-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="pro-logo-bars">
            <span className="pro-logo-bar" style={{ height: '35%' }} />
            <span className="pro-logo-bar" style={{ height: '65%' }} />
            <span className="pro-logo-bar" style={{ height: '100%' }} />
            <span className="pro-logo-bar" style={{ height: '80%' }} />
          </div>
          <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>Didactic AI</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginLeft: 12 }}>
            &copy; {new Date().getFullYear()} Didactic AI. All rights reserved.
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 24, fontSize: '0.9rem' }}>
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
