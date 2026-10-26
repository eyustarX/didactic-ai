import React, { useState, useEffect, useRef } from 'react';
import ExcelJS from 'exceljs';
import ProfileMenu from '../components/ProfileMenu';
import './LandingPage.css';
import {
  Zap,
  ArrowRight,
  ShieldCheck,
  Lock,
  FileSpreadsheet,
  CheckCircle2,
  Sparkles,
  GraduationCap,
  BookOpen,
  Layers,
  Cpu,
  BarChart3,
  RotateCcw,
  Sliders,
  ChevronDown,
  ChevronUp,
  Users,
  Award,
  HelpCircle,
  LogIn,
  Check,
  X,
  Clock,
  FileText,
  Search,
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
  const [activeTab, setActiveTab] = useState('curriculum');
  const [activeSectionFilter, setActiveSectionFilter] = useState('All');
  const [selectedTopic, setSelectedTopic] = useState('cs');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [hasEvaluated, setHasEvaluated] = useState(false);
  const [cohortSize, setCohortSize] = useState(75);
  const [openFaqIndex, setOpenFaqIndex] = useState(0);

  // Curriculum key points demo state
  const [keyPoints, setKeyPoints] = useState([
    { id: 1, text: 'Lock ownership vs binary semaphore signaling primitives', bloom: 'Remember (L1)', checked: true },
    { id: 2, text: 'All four Coffman conditions occurring simultaneously for deadlocks', bloom: 'Analyze (L4)', checked: true },
    { id: 3, text: 'Breaking circular wait via strict global resource hierarchy', bloom: 'Evaluate (L5)', checked: true },
  ]);

  // Regrade demo simulation state
  const [demoScore, setDemoScore] = useState(9.5);
  const [isRegrading, setIsRegrading] = useState(false);

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

  const handleLaunchPlatform = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!currentUser) {
      if (onOpenAuth) onOpenAuth();
      return;
    }
    if (onEnterApp) onEnterApp();
  };

  const handleSimulateRegrade = () => {
    setIsRegrading(true);
    setTimeout(() => {
      setDemoScore((prev) => (prev === 9.5 ? 10.0 : 9.5));
      setIsRegrading(false);
    }, 600);
  };

  const handleRunSandboxGrading = () => {
    setIsEvaluating(true);
    setTimeout(() => {
      setIsEvaluating(false);
      setHasEvaluated(true);
    }, 500);
  };

  const toggleKeyPoint = (id) => {
    setKeyPoints((prev) =>
      prev.map((kp) => (kp.id === id ? { ...kp, checked: !kp.checked } : kp))
    );
  };

  // Sample data for the interactive Sandbox
  const sandboxTopics = {
    cs: {
      name: 'Computer Science',
      question: 'Explain how circular wait is prevented in resource allocation and why thread lock ownership is vital for priority inheritance.',
      rubric: [
        { title: 'Lock ownership & thread scheduling', max: 5.0, score: 5.0 },
        { title: 'Circular wait prevention hierarchy', max: 5.0, score: 4.5 },
      ],
      studentAnswer: 'Mutexes have strict thread ownership so real-time schedulers can raise lock-holder priority to eliminate priority inversion. Circular wait is broken by imposing a total ordering on all resource acquisition requests.',
      citation: 'imposing a total ordering on all resource acquisition requests',
      feedback: 'Excellent explanation of priority inheritance mechanics and resource ordering.',
      totalScore: 9.5,
    },
    bio: {
      name: 'Cell Biology',
      question: 'Detail the role of the proton gradient across the inner mitochondrial membrane in driving ATP synthase during oxidative phosphorylation.',
      rubric: [
        { title: 'Chemiosmotic proton gradient establishment', max: 5.0, score: 5.0 },
        { title: 'ATP Synthase rotational catalysis mechanism', max: 5.0, score: 4.0 },
      ],
      studentAnswer: 'Electrons passing through Complex I, III, and IV pump protons into the intermembrane space. The resulting electrochemical proton-motive force flows back through the F0 rotor of ATP synthase, synthesizing ATP from ADP and Pi.',
      citation: 'electrochemical proton-motive force flows back through the F0 rotor of ATP synthase',
      feedback: 'Accurate chemiosmotic flow description; could specify ADP binding site conformational shifts.',
      totalScore: 9.0,
    },
    econ: {
      name: 'Macroeconomics',
      question: 'Analyze how supply-side shocks shift the short-run aggregate supply (SRAS) curve and evaluate central bank policy trade-offs.',
      rubric: [
        { title: 'SRAS curve shift dynamics', max: 5.0, score: 5.0 },
        { title: 'Stagflation & policy trade-off evaluation', max: 5.0, score: 4.5 },
      ],
      studentAnswer: 'An adverse supply shock like an oil price surge shifts SRAS leftward, causing higher inflation with falling real output (stagflation). If the central bank raises rates to fight inflation, it risks deeper recessionary output contraction.',
      citation: 'shifts SRAS leftward, causing higher inflation with falling real output (stagflation)',
      feedback: 'Strong grasp of the inflation-unemployment dilemma during supply disruptions.',
      totalScore: 9.5,
    },
  };

  const currentSandbox = sandboxTopics[selectedTopic];

  // Master Gradebook Sample Roster
  const sampleRoster = [
    { id: 'STU-101', name: 'Alice Johnson', section: 'Section A', midterm: '46.5 / 50 (93%)', final: '48.0 / 50 (96%)', weighted: 94.8, tier: 'Grade A' },
    { id: 'STU-102', name: 'Marcus Chen', section: 'Section A', midterm: '44.5 / 50 (89%)', final: '42.0 / 50 (84%)', weighted: 86.0, tier: 'Grade A-' },
    { id: 'STU-103', name: 'Sophia Rodriguez', section: 'Section B', midterm: '45.5 / 50 (91%)', final: '46.0 / 50 (92%)', weighted: 91.6, tier: 'Grade A' },
    { id: 'STU-104', name: 'David Kim', section: 'Section B', midterm: '39.5 / 50 (79%)', final: '40.5 / 50 (81%)', weighted: 80.2, tier: 'Grade B+' },
    { id: 'STU-105', name: 'Fatima Al-Mansoor', section: 'Section A', midterm: '48.0 / 50 (96%)', final: '49.0 / 50 (98%)', weighted: 97.2, tier: 'Grade A' },
  ];

  const filteredRoster = activeSectionFilter === 'All'
    ? sampleRoster
    : sampleRoster.filter((s) => s.section === activeSectionFilter);

  const handleExportMasterExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('CS-301 Master Gradebook');

    worksheet.columns = [
      { header: 'Student ID', key: 'id', width: 16 },
      { header: 'Student Name', key: 'name', width: 22 },
      { header: 'Section', key: 'section', width: 14 },
      { header: 'Midterm [40%]', key: 'midterm', width: 20 },
      { header: 'Final Exam [60%]', key: 'final', width: 20 },
      { header: 'Weighted %', key: 'weighted', width: 16 },
      { header: 'Final Tier', key: 'tier', width: 14 },
    ];

    filteredRoster.forEach((row) => {
      worksheet.addRow({
        id: row.id,
        name: row.name,
        section: row.section,
        midterm: row.midterm,
        final: row.final,
        weighted: `${row.weighted}%`,
        tier: row.tier,
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CS301_Master_Gradebook_${activeSectionFilter.replace(' ', '_')}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const faqItems = [
    {
      q: 'How does evidence citation work, and how are hallucinations handled?',
      a: 'Didactic AI does not guess or generate subjective marks without context. Every point awarded or deducted directly cites specific student answer excerpts and compares them against objective rubric criteria. In addition, teachers retain complete authority: you can inspect evidence citations, override any score with a single click, or trigger a full regrade if needed.',
    },
    {
      q: 'Can I re-grade an individual question or an entire student submission?',
      a: 'Yes! Both full-submission and single-question regrading are built into every exam sheet. If you want to check an answer again or verify against updated criteria, clicking "Regrade" re-runs the rubric matcher without losing existing student records.',
    },
    {
      q: 'How do course sections and student deduplication work?',
      a: 'You can organize assessments by Course, Section (e.g. Section A, Section B), and Academic Year. When grading multiple assessments (Quizzes, Midterms, Finals), the system automatically matches the Student ID. Subsequent exam submissions are added into the student’s existing row in the Master Gradebook without creating duplicate records.',
    },
    {
      q: 'How does percentage weighting and the Final Grade Tier calculate?',
      a: 'You assign percentage weights to each assessment (e.g., Quizzes = 20%, Midterm = 30%, Final = 50%). The Master Course Gradebook computes the cumulative weighted percentage across all completed exams and automatically awards final letter grade badges (Grade A, A-, B+, B, C+, C, D, F).',
    },
    {
      q: 'What is the Server-Side Immutability Lock?',
      a: 'To guarantee absolute academic fairness across student cohorts, once the first student submission is graded, questions and rubric criteria are locked server-side. This ensures that every student in the cohort is evaluated against the exact same baseline standard.',
    },
  ];

  return (
    <div className="pro-landing-wrapper">
      {/* Top Reading Progress Bar */}
      <div id="pro-scroll-line" role="progressbar" aria-label="Reading progress" />

      {/* Ambient Mesh Glow */}
      <div className="pro-landing-mesh" />

      {/* Modern Sticky Navigation */}
      <nav className="pro-nav">
        <a href="#" className="pro-nav-logo" onClick={scrollToTop} title="Didactic AI Home">
          <div className="brand-icon-pro">
            <Zap size={16} />
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
            href="#sandbox"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('sandbox');
            }}
            className="pro-nav-link"
          >
            Live Sandbox
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

          {/* User Sign In / Profile Menu */}
          {currentUser ? (
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setIsProfileMenuOpen((prev) => !prev)}
                className="pro-btn-secondary"
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
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
            <button onClick={onOpenAuth} className="pro-btn-secondary" style={{ padding: '8px 18px', fontSize: '0.86rem' }}>
              <LogIn size={14} />
              <span>Sign In</span>
            </button>
          )}

          <button onClick={handleLaunchPlatform} className="pro-btn-glow" style={{ padding: '8px 20px', fontSize: '0.88rem' }}>
            <span>Launch Platform</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </nav>

      {/* HERO SECTION */}
      <header className="pro-hero-section">
        <div className="pro-hero-badge">
          <Sparkles size={14} />
          <span>Next-Gen Pedagogical AI &bull; Evidence-Grounded Grading Engine</span>
        </div>

        <h1 className="pro-hero-title">
          Turn Course Material into Rigorous Exams.{' '}
          <span className="pro-hero-gradient-text">Grade Faster with Verifiable Evidence.</span>
        </h1>

        <p className="pro-hero-lead">
          Decompile lecture slides and curriculum notes into Bloom-aligned exams, generate objective rubrics,
          and grade student papers with line-by-line evidence citations and master section gradebooks.
        </p>

        <div className="pro-hero-actions">
          <button onClick={handleLaunchPlatform} className="pro-btn-glow">
            <span>Launch Platform Free</span>
            <ArrowRight size={16} />
          </button>
          <button
            onClick={() => scrollToSection('sandbox')}
            className="pro-btn-secondary"
          >
            <Sliders size={16} style={{ color: 'var(--accent)' }} />
            <span>Try Live Sandbox</span>
          </button>
        </div>

        {/* Feature Pills */}
        <div className="pro-trust-strip">
          <div className="pro-trust-item">
            <Lock size={14} style={{ color: '#EAB308' }} />
            <span>Server-Side Integrity Lock</span>
          </div>
          <div className="pro-trust-item">
            <Award size={14} style={{ color: 'var(--accent)' }} />
            <span>Weighted Master Gradebook</span>
          </div>
          <div className="pro-trust-item">
            <FileSpreadsheet size={14} style={{ color: '#10B981' }} />
            <span>Audit-Ready Excel (.xlsx) Export</span>
          </div>
          <div className="pro-trust-item">
            <RotateCcw size={14} style={{ color: '#38BDF8' }} />
            <span>1-Click Teacher Regrading</span>
          </div>
        </div>
      </header>

      {/* 3D FLOATING INTERACTIVE APP SHOWCASE */}
      <section className="pro-preview-3d-wrapper" id="curriculum">
        <div className="pro-preview-card">
          {/* Window Header & Tabs */}
          <div className="pro-window-header">
            <div className="pro-window-dots">
              <span className="pro-window-dot pro-dot-red" />
              <span className="pro-window-dot pro-dot-yellow" />
              <span className="pro-window-dot pro-dot-green" />
            </div>

            <div className="pro-showcase-tabs">
              <button
                className={`pro-showcase-tab ${activeTab === 'curriculum' ? 'active' : ''}`}
                onClick={() => setActiveTab('curriculum')}
              >
                <BookOpen size={13} />
                <span>1. Curriculum Ingest</span>
              </button>
              <button
                className={`pro-showcase-tab ${activeTab === 'exam' ? 'active' : ''}`}
                onClick={() => setActiveTab('exam')}
              >
                <Layers size={13} />
                <span>2. Exam & Rubric</span>
              </button>
              <button
                className={`pro-showcase-tab ${activeTab === 'grading' ? 'active' : ''}`}
                onClick={() => setActiveTab('grading')}
              >
                <Search size={13} />
                <span>3. Evidence Grading</span>
              </button>
              <button
                className={`pro-showcase-tab ${activeTab === 'gradebook' ? 'active' : ''}`}
                onClick={() => setActiveTab('gradebook')}
              >
                <FileSpreadsheet size={13} />
                <span>4. Master Gradebook</span>
              </button>
            </div>
          </div>

          {/* Interactive Window Body */}
          <div className="pro-showcase-body">
            {activeTab === 'curriculum' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div>
                    <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--accent)' }}>
                      Source Document: lecture-04-concurrency.pptx
                    </span>
                    <h3 style={{ fontSize: '1.08rem', fontWeight: 700, marginTop: 2 }}>
                      CS-301: Operating Systems &bull; Concurrency & Deadlocks
                    </h3>
                  </div>
                  <span style={{ fontSize: '0.78rem', background: 'rgba(20, 184, 166, 0.1)', color: 'var(--accent)', padding: '4px 10px', borderRadius: 6, fontWeight: 600 }}>
                    Bloom Depth: Analyzed
                  </span>
                </div>

                <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginBottom: 16 }}>
                  Didactic AI extracts key conceptual topics and maps them across cognitive taxonomy levels. Select which key points you want to test in the upcoming exam:
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {keyPoints.map((kp) => (
                    <div
                      key={kp.id}
                      onClick={() => toggleKeyPoint(kp.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        borderRadius: 10,
                        background: kp.checked ? 'rgba(20, 184, 166, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                        border: kp.checked ? '1px solid rgba(94, 234, 212, 0.3)' : '1px solid var(--border)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: 4,
                            background: kp.checked ? 'var(--accent)' : 'transparent',
                            border: kp.checked ? 'none' : '1px solid var(--border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#000000',
                          }}
                        >
                          {kp.checked && <Check size={12} strokeWidth={3} />}
                        </div>
                        <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{kp.text}</span>
                      </div>
                      <span style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)', background: 'var(--bg)', padding: '2px 8px', borderRadius: 4 }}>
                        {kp.bloom}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'exam' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ background: 'var(--accent)', color: 'var(--on-accent)', fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: 4 }}>
                      Q1 &bull; 10.0 Marks
                    </span>
                    <span style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>Bloom Level 4 (Analyze)</span>
                  </div>
                  <span style={{ fontSize: '0.78rem', color: '#10B981', fontWeight: 600 }}>100% Balanced Rubric</span>
                </div>

                <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border)', padding: '14px 16px', borderRadius: 10, marginBottom: 14 }}>
                  <p style={{ fontSize: '0.92rem', lineHeight: 1.55, fontWeight: 500 }}>
                    Distinguish between mutex lock ownership and binary semaphore signaling. Explain how scheduler priority inheritance protocols break unbounded priority inversion chains in concurrent systems.
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: '0.78rem', color: 'var(--accent)' }}>
                    <Sparkles size={13} />
                    <span><strong>Student Hint:</strong> Consider the mechanism of raising the lock-holder's dynamic priority.</span>
                  </div>
                </div>

                <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
                  Normalized Evaluation Rubric
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                  <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: '0.82rem' }}>
                      <span>Lock Ownership Dynamics</span>
                      <span style={{ color: 'var(--accent)' }}>35% (3.5 pts)</span>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      Explains that only the acquiring thread can release a mutex.
                    </p>
                  </div>
                  <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: '0.82rem' }}>
                      <span>Priority Inversion Mechanics</span>
                      <span style={{ color: 'var(--accent)' }}>35% (3.5 pts)</span>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      Medium priority thread preempting low-priority mutex holder.
                    </p>
                  </div>
                  <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: '0.82rem' }}>
                      <span>Inheritance Protocol</span>
                      <span style={{ color: 'var(--accent)' }}>30% (3.0 pts)</span>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      Dynamic elevation of thread priority to break unbounded block.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'grading' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <GraduationCap size={16} style={{ color: 'var(--accent)' }} />
                    <span style={{ fontWeight: 700, fontSize: '0.94rem' }}>Alice Johnson &bull; STU-101 (Section A)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--accent)' }}>
                      {demoScore.toFixed(1)} / 10.0 pts
                    </span>
                    <button
                      onClick={handleSimulateRegrade}
                      disabled={isRegrading}
                      className="pro-btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '0.75rem', gap: 5 }}
                      title="Trigger full regrade or adjust score"
                    >
                      <RotateCcw size={12} className={isRegrading ? 'animate-spin' : ''} />
                      <span>{isRegrading ? 'Regrading...' : 'Simulate Regrade'}</span>
                    </button>
                  </div>
                </div>

                <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border)', padding: '14px 16px', borderRadius: 10, fontSize: '0.88rem', lineHeight: 1.6, marginBottom: 14 }}>
                  <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                    Student Answer Text (Matched & Grounded):
                  </span>
                  A mutex provides mutual exclusion with{' '}
                  <span style={{ background: 'rgba(20, 184, 166, 0.25)', color: '#5EEAD4', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
                    strict thread ownership where only the locker thread can release it
                  </span>
                  . In contrast, binary semaphores are signaling primitives. Under priority inversion, a high-priority thread waits on a mutex held by a low-priority thread; the OS resolves this by{' '}
                  <span style={{ background: 'rgba(99, 102, 241, 0.25)', color: '#A5B4FC', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
                    temporarily elevating the low thread to the high thread’s priority level
                  </span>
                  .
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div style={{ background: 'rgba(20, 184, 166, 0.06)', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(94, 234, 212, 0.2)' }}>
                    <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase' }}>
                      Evidence Citation
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text)', marginTop: 2 }}>
                      "strict thread ownership where only the locker thread can release it" &rarr; Fully meets Criterion 1.
                    </p>
                  </div>
                  <div style={{ background: 'rgba(99, 102, 241, 0.06)', padding: '10px 14px', borderRadius: 8, border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                    <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#A5B4FC', textTransform: 'uppercase' }}>
                      Instructor Oversight
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text)', marginTop: 2 }}>
                      Scores are editable by teacher; zero lock-in. 1-click regrade guarantees verification without hallucination.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'gradebook' && (
              <div id="gradebook">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>
                      CS-301 Master Course Gradebook (2025/2026)
                    </h3>
                    <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                      Weighted Percentage: Midterm (40%) + Final Exam (60%)
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.05)', borderRadius: 6, padding: 2 }}>
                      {['All', 'Section A', 'Section B'].map((sec) => (
                        <button
                          key={sec}
                          onClick={() => setActiveSectionFilter(sec)}
                          style={{
                            padding: '4px 10px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            borderRadius: 4,
                            border: 'none',
                            cursor: 'pointer',
                            background: activeSectionFilter === sec ? 'var(--accent)' : 'transparent',
                            color: activeSectionFilter === sec ? 'var(--on-accent)' : 'var(--text-muted)',
                          }}
                        >
                          {sec}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={handleExportMasterExcel}
                      className="pro-btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.76rem', gap: 6 }}
                    >
                      <FileSpreadsheet size={13} style={{ color: '#10B981' }} />
                      <span>Export Excel (.xlsx)</span>
                    </button>
                  </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                        <th style={{ padding: '8px 10px' }}>Student ID</th>
                        <th style={{ padding: '8px 10px' }}>Name</th>
                        <th style={{ padding: '8px 10px' }}>Section</th>
                        <th style={{ padding: '8px 10px' }}>Midterm [40%]</th>
                        <th style={{ padding: '8px 10px' }}>Final [60%]</th>
                        <th style={{ padding: '8px 10px' }}>Course %</th>
                        <th style={{ padding: '8px 10px' }}>Tier</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRoster.map((s) => (
                        <tr key={s.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '8px 10px', fontFamily: 'var(--font-mono)' }}>{s.id}</td>
                          <td style={{ padding: '8px 10px', fontWeight: 600 }}>{s.name}</td>
                          <td style={{ padding: '8px 10px' }}>{s.section}</td>
                          <td style={{ padding: '8px 10px' }}>{s.midterm}</td>
                          <td style={{ padding: '8px 10px' }}>{s.final}</td>
                          <td style={{ padding: '8px 10px', fontWeight: 700, color: 'var(--accent)' }}>
                            {s.weighted}%
                          </td>
                          <td style={{ padding: '8px 10px' }}>
                            <span style={{ background: 'rgba(20, 184, 166, 0.15)', color: 'var(--accent)', padding: '2px 8px', borderRadius: 4, fontWeight: 700, fontSize: '0.74rem' }}>
                              {s.tier}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* INTERACTIVE PLAYGROUND / LIVE SANDBOX */}
      <section className="pro-sandbox-section" id="sandbox">
        <div className="pro-section-title-wrap">
          <span className="pro-section-tag">Interactive Sandbox</span>
          <h2 className="pro-section-heading">Try Evidence-Grounded Grading Live</h2>
          <p className="pro-section-subheading">
            Experience how Didactic AI evaluates answers with transparent evidence matching. Pick a subject below and simulate grading in real time:
          </p>
        </div>

        <div className="pro-sandbox-card">
          <div className="pro-sandbox-header">
            <div className="pro-topic-selector">
              <button
                className={`pro-topic-btn ${selectedTopic === 'cs' ? 'active' : ''}`}
                onClick={() => {
                  setSelectedTopic('cs');
                  setHasEvaluated(false);
                }}
              >
                Computer Science
              </button>
              <button
                className={`pro-topic-btn ${selectedTopic === 'bio' ? 'active' : ''}`}
                onClick={() => {
                  setSelectedTopic('bio');
                  setHasEvaluated(false);
                }}
              >
                Cell Biology
              </button>
              <button
                className={`pro-topic-btn ${selectedTopic === 'econ' ? 'active' : ''}`}
                onClick={() => {
                  setSelectedTopic('econ');
                  setHasEvaluated(false);
                }}
              >
                Macroeconomics
              </button>
            </div>

            <button
              onClick={handleRunSandboxGrading}
              disabled={isEvaluating}
              className="pro-btn-glow"
              style={{ padding: '8px 20px', fontSize: '0.86rem' }}
            >
              <Zap size={14} className={isEvaluating ? 'animate-spin' : ''} />
              <span>{isEvaluating ? 'Scanning Rubric...' : 'Run Evidence Grading'}</span>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
            {/* Left: Question & Input */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: 12, border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase' }}>
                Course Examination Prompt
              </span>
              <p style={{ fontSize: '0.9rem', fontWeight: 600, marginTop: 4, marginBottom: 12, lineHeight: 1.5 }}>
                {currentSandbox.question}
              </p>

              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Student Response Excerpt
              </span>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.55 }}>
                "{currentSandbox.studentAnswer}"
              </p>
            </div>

            {/* Right: Real-time Evaluation & Citation */}
            <div style={{ background: 'rgba(20, 184, 166, 0.04)', padding: '16px', borderRadius: 12, border: '1px solid rgba(94, 234, 212, 0.25)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase' }}>
                  Grounded Evaluation Output
                </span>
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: hasEvaluated ? 'var(--accent)' : 'var(--text-muted)' }}>
                  {hasEvaluated ? `${currentSandbox.totalScore} / 10.0 pts` : 'Ready to Evaluate'}
                </span>
              </div>

              {hasEvaluated ? (
                <div>
                  <div style={{ marginBottom: 10 }}>
                    {currentSandbox.rubric.map((r, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', padding: '4px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                        <span>{r.title}</span>
                        <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{r.score} / {r.max}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ background: 'rgba(0, 0, 0, 0.2)', padding: '8px 12px', borderRadius: 6, fontSize: '0.8rem', marginBottom: 8 }}>
                    <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Evidence Citation: </span>
                    <span style={{ fontStyle: 'italic' }}>"{currentSandbox.citation}"</span>
                  </div>

                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    <strong>Pedagogical Note:</strong> {currentSandbox.feedback}
                  </p>
                </div>
              ) : (
                <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                  Click <strong>"Run Evidence Grading"</strong> to see line-by-line rubric scoring and evidence verification.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* MODERN BENTO GRID (PLATFORM SUPERPOWERS) */}
      <section className="pro-bento-section" id="rubrics">
        <div className="pro-section-title-wrap">
          <span className="pro-section-tag">Platform Superpowers</span>
          <h2 className="pro-section-heading">Designed for High Academic Integrity</h2>
          <p className="pro-section-subheading">
            Everything professors need to design exams, evaluate papers transparently, and manage multi-section gradebooks.
          </p>
        </div>

        <div className="pro-bento-grid">
          {/* Card 1: Bloom's Progression (Span 2) */}
          <div className="pro-bento-card pro-bento-span-2">
            <div className="pro-bento-icon-box">
              <Cpu size={22} />
            </div>
            <h3 className="pro-bento-title">Curriculum Decompilation & Bloom's Cognitive Progression</h3>
            <p className="pro-bento-desc">
              Upload PPTX slides or syllabus PDFs. Didactic AI segments complex ideas across cognitive taxonomy levels so your exams test deep analytical understanding, not just rote recall.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
                  <span>1. Remember & Understand</span>
                  <span style={{ color: 'var(--accent)' }}>95%</span>
                </div>
                <div style={{ height: 6, background: 'var(--surface-alt)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: '95%', height: '100%', background: 'linear-gradient(90deg, #14B8A6, #5EEAD4)' }} />
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
                  <span>2. Application & Analysis</span>
                  <span style={{ color: 'var(--accent)' }}>80%</span>
                </div>
                <div style={{ height: 6, background: 'var(--surface-alt)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: '80%', height: '100%', background: 'linear-gradient(90deg, #14B8A6, #5EEAD4)' }} />
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, marginBottom: 4 }}>
                  <span>3. Evaluation & Synthesis</span>
                  <span style={{ color: 'var(--accent)' }}>65%</span>
                </div>
                <div style={{ height: 6, background: 'var(--surface-alt)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: '65%', height: '100%', background: 'linear-gradient(90deg, #14B8A6, #5EEAD4)' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Transparent Evidence Matching */}
          <div className="pro-bento-card">
            <div className="pro-bento-icon-box">
              <Search size={22} />
            </div>
            <h3 className="pro-bento-title">Evidence-Grounded Citations</h3>
            <p className="pro-bento-desc">
              Every score is tied directly to extracted student phrases. Instructors retain 100% control with one-click regrading and score adjustments to eliminate grading discrepancies.
            </p>
            <div style={{ background: 'rgba(20, 184, 166, 0.08)', padding: '10px 14px', borderRadius: 8, fontSize: '0.78rem', color: 'var(--accent)', fontWeight: 600 }}>
              &check; Verifiable citation matching with full manual teacher override.
            </div>
          </div>

          {/* Card 3: Multi-Section Roster Management */}
          <div className="pro-bento-card">
            <div className="pro-bento-icon-box">
              <Users size={22} />
            </div>
            <h3 className="pro-bento-title">Section Management & Deduplication</h3>
            <p className="pro-bento-desc">
              Seamlessly group students into Section A, B, and Academic Years. Student ID matching automatically updates records across all exams without duplicating rows.
            </p>
          </div>

          {/* Card 4: Weighted Category Engine */}
          <div className="pro-bento-card">
            <div className="pro-bento-icon-box">
              <BarChart3 size={22} />
            </div>
            <h3 className="pro-bento-title">Weighted Category Engine</h3>
            <p className="pro-bento-desc">
              Configure weights (Midterm 30%, Final 50%, Quizzes 20%). The Master Gradebook computes cumulative weighted percentages and awards final Grade Tiers automatically.
            </p>
          </div>

          {/* Card 5: Server-Side Integrity Lock */}
          <div className="pro-bento-card">
            <div className="pro-bento-icon-box">
              <Lock size={22} />
            </div>
            <h3 className="pro-bento-title">Server-Side Integrity Lock</h3>
            <p className="pro-bento-desc">
              Once grading starts on an exam, the rubric and questions lock server-side. No criteria drift, no retroactive alterations—guaranteeing fairness across the entire cohort.
            </p>
          </div>
        </div>
      </section>

      {/* THE OLD WAY VS THE DIDACTIC AI WAY */}
      <section className="pro-compare-section">
        <div className="pro-section-title-wrap">
          <span className="pro-section-tag">Comparison</span>
          <h2 className="pro-section-heading">The Old Way vs. Didactic AI</h2>
          <p className="pro-section-subheading">
            Why leading departments are replacing manual grading spreadsheets with evidence-backed evaluation workflows.
          </p>
        </div>

        <div className="pro-compare-grid">
          {/* Old Way */}
          <div className="pro-compare-card-old">
            <div className="pro-compare-header" style={{ color: '#EF4444' }}>
              <X size={20} />
              <span>The Old Way (Manual & Fragmented)</span>
            </div>
            <ul className="pro-compare-list">
              <li className="pro-compare-item">
                <X size={16} style={{ color: '#EF4444', flexShrink: 0, marginTop: 2 }} />
                <span>20+ hours of repetitive weekend grading resulting in cognitive fatigue.</span>
              </li>
              <li className="pro-compare-item">
                <X size={16} style={{ color: '#EF4444', flexShrink: 0, marginTop: 2 }} />
                <span>Subjective scoring drift between paper #1 and paper #100.</span>
              </li>
              <li className="pro-compare-item">
                <X size={16} style={{ color: '#EF4444', flexShrink: 0, marginTop: 2 }} />
                <span>Manual Excel formula errors when aggregating multi-exam weighted tiers.</span>
              </li>
              <li className="pro-compare-item">
                <X size={16} style={{ color: '#EF4444', flexShrink: 0, marginTop: 2 }} />
                <span>No audit trail or evidence citations when students challenge grades.</span>
              </li>
            </ul>
          </div>

          {/* New Way */}
          <div className="pro-compare-card-new">
            <div className="pro-compare-header" style={{ color: 'var(--accent)' }}>
              <CheckCircle2 size={20} />
              <span>The Didactic AI Way (Evidence-Grounded)</span>
            </div>
            <ul className="pro-compare-list">
              <li className="pro-compare-item">
                <Check size={16} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
                <span>Automated whole-paper evaluation with line-by-line evidence citations.</span>
              </li>
              <li className="pro-compare-item">
                <Check size={16} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
                <span>Server-locked rubrics guaranteeing consistent evaluation standards.</span>
              </li>
              <li className="pro-compare-item">
                <Check size={16} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
                <span>Unified multi-exam Master Gradebook with automatic student deduplication.</span>
              </li>
              <li className="pro-compare-item">
                <Check size={16} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 2 }} />
                <span>1-click audit-ready Excel (.xlsx) export formatted for university records.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* INTERACTIVE TIME SAVED CALCULATOR */}
      <section className="pro-calculator-card">
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <span className="pro-section-tag">Productivity Estimator</span>
          <h3 style={{ fontSize: '1.6rem', fontWeight: 700, marginTop: 4 }}>
            How Much Time Will You Save Every Semester?
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Move the slider to match your total active cohort size:
          </p>
        </div>

        <div className="pro-slider-wrap">
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, marginBottom: 8 }}>
            <span>Cohort Size:</span>
            <span style={{ color: 'var(--accent)', fontSize: '1.2rem' }}>{cohortSize} Students</span>
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
            <div className="pro-calc-stat-num">{Math.round(cohortSize * 2.5)} hrs</div>
            <div className="pro-calc-stat-lbl">Grading Hours Saved</div>
          </div>
          <div className="pro-calc-stat-box">
            <div className="pro-calc-stat-num">{cohortSize * 4} papers</div>
            <div className="pro-calc-stat-lbl">Evaluated per Semester</div>
          </div>
          <div className="pro-calc-stat-box">
            <div className="pro-calc-stat-num">Instant</div>
            <div className="pro-calc-stat-lbl">Master Gradebook Sync</div>
          </div>
        </div>
      </section>

      {/* FREQUENTLY ASKED QUESTIONS (ACCORDION) */}
      <section className="pro-faq-section" id="faq">
        <div className="pro-section-title-wrap">
          <span className="pro-section-tag">Clarity & Trust</span>
          <h2 className="pro-section-heading">Frequently Asked Questions</h2>
          <p className="pro-section-subheading">
            Transparent answers regarding pedagogical design, evidence matching, and student records.
          </p>
        </div>

        <div>
          {faqItems.map((item, index) => (
            <div key={index} className="pro-faq-item">
              <button
                className="pro-faq-btn"
                onClick={() => setOpenFaqIndex(openFaqIndex === index ? -1 : index)}
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

      {/* CLOSING CALL TO ACTION */}
      <section className="pro-closing-cta">
        <h2 style={{ fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-0.025em', marginBottom: 12 }}>
          Experience Fair, Evidence-Backed Grading
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: 600, margin: '0 auto 28px auto', lineHeight: 1.6 }}>
          Join educators delivering rigorous exams, objective feedback, and audit-ready gradebooks without weekend grading fatigue.
        </p>
        <button onClick={handleLaunchPlatform} className="pro-btn-glow" style={{ padding: '14px 34px', fontSize: '1.02rem' }}>
          <span>Launch Didactic AI Platform</span>
          <ArrowRight size={16} />
        </button>
      </section>

      {/* ACADEMIC FOOTER */}
      <footer className="pro-footer">
        <div style={{ maxWidth: 1040, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="brand-icon-pro" style={{ width: 26, height: 26 }}>
              <Zap size={14} />
            </div>
            <span style={{ fontWeight: 700, fontSize: '0.98rem' }}>Didactic AI</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: 8 }}>
              &copy; {new Date().getFullYear()} Didactic AI. All rights reserved.
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 20, fontSize: '0.85rem' }}>
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
        </div>
      </footer>
    </div>
  );
}
