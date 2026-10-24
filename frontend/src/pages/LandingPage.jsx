import React, { useEffect, useRef } from 'react';
import ExcelJS from 'exceljs';
import {
  Zap,
  ArrowRight,
  Quote,
  FileCode,
  ShieldCheck,
  LogIn,
  User,
  FileCheck,
  GraduationCap,
  Lock,
  FileSpreadsheet,
  CheckCircle2,
  Sparkles,
  Layers,
  FileText,
  Check,
} from 'lucide-react';

const GitHubIcon = ({ size = 16, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

export default function LandingPage({ onEnterApp, currentUser, onOpenAuth }) {
  const bloomContainerRef = useRef(null);
  const rubricBodyRef = useRef(null);
  const feedbackContainerRef = useRef(null);

  useEffect(() => {
    // 9. Scroll progress line along top edge
    const scrollLine = document.getElementById('scroll-progress-line');
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

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      document.querySelectorAll('.bloom-bar-fill').forEach((el) => {
        el.style.width = el.getAttribute('data-width') || '100%';
      });
      document.querySelectorAll('.teacher-mark').forEach((el) => el.classList.add('lit'));
      document.querySelectorAll('.reveal-on-scroll, .rubric-row, .feedback-item').forEach((el) =>
        el.classList.add('revealed')
      );
      return () => window.removeEventListener('scroll', updateScrollProgress);
    }

    // 3. Highlighted phrases in answer light up one after another (teacher marking)
    const timer1 = setTimeout(() => {
      const mark1 = document.getElementById('mark-1');
      if (mark1) mark1.classList.add('lit');
    }, 1100);

    const timer2 = setTimeout(() => {
      const mark2 = document.getElementById('mark-2');
      if (mark2) mark2.classList.add('lit');
    }, 1650);

    const timer3 = setTimeout(() => {
      const mark3 = document.getElementById('mark-3');
      if (mark3) mark3.classList.add('lit');
    }, 2200);

    // 4. Scroll reveals for section headings and text
    const revealObserver = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    document.querySelectorAll('.reveal-on-scroll').forEach((el) => revealObserver.observe(el));

    // 5. Bloom bars growth from 0 to current width when scrolled into view
    let bloomObserver;
    if (bloomContainerRef.current) {
      bloomObserver = new IntersectionObserver(
        (entries, obs) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const fills = bloomContainerRef.current.querySelectorAll('.bloom-bar-fill');
              fills.forEach((fill, idx) => {
                setTimeout(() => {
                  fill.style.width = fill.getAttribute('data-width') || '100%';
                }, idx * 120);
              });
              obs.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.2 }
      );
      bloomObserver.observe(bloomContainerRef.current);
    }

    // 6. Rubric table rows fade in one by one on entry
    let rubricObserver;
    if (rubricBodyRef.current) {
      rubricObserver = new IntersectionObserver(
        (entries, obs) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const rows = rubricBodyRef.current.querySelectorAll('.rubric-row');
              rows.forEach((row, idx) => {
                setTimeout(() => {
                  row.classList.add('revealed');
                }, idx * 140);
              });
              obs.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.2 }
      );
      rubricObserver.observe(rubricBodyRef.current);
    }

    // 6. Feedback items fade in one by one on entry
    let feedbackObserver;
    if (feedbackContainerRef.current) {
      feedbackObserver = new IntersectionObserver(
        (entries, obs) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const items = feedbackContainerRef.current.querySelectorAll('.feedback-item');
              items.forEach((item, idx) => {
                setTimeout(() => {
                  item.classList.add('revealed');
                }, idx * 160);
              });
              obs.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.2 }
      );
      feedbackObserver.observe(feedbackContainerRef.current);
    }

    return () => {
      window.removeEventListener('scroll', updateScrollProgress);
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      revealObserver.disconnect();
      if (bloomObserver) bloomObserver.disconnect();
      if (rubricObserver) rubricObserver.disconnect();
      if (feedbackObserver) feedbackObserver.disconnect();
    };
  }, []);

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToTop = (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="landing-wrapper">
      {/* 9. Thin chalk-yellow scroll progress line along top edge */}
      <div id="scroll-progress-line" role="progressbar" aria-label="Reading progress" />

      {/* Landing Navbar */}
      <nav className="landing-nav">
        {/* Logo: Always scrolls to top / stays on landing page, never launches platform */}
        <a href="#" className="landing-logo" onClick={scrollToTop} title="Didactic AI Home">
          <div className="brand-icon">
            <Zap size={15} />
          </div>
          <span>Didactic AI</span>
        </a>

        <div className="landing-links">
          <a
            href="#curriculum"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('curriculum');
            }}
            className="landing-link"
          >
            Curriculum
          </a>
          <a
            href="#rubrics"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('rubrics');
            }}
            className="landing-link"
          >
            Rubrics
          </a>
          <a
            href="#assessment"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('assessment');
            }}
            className="landing-link"
          >
            Assessment
          </a>
          <a
            href="#grading"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('grading');
            }}
            className="landing-link"
          >
            Grading
          </a>
          <a
            href="#export"
            onClick={(e) => {
              e.preventDefault();
              scrollToSection('export');
            }}
            className="landing-link"
          >
            Audit & Export
          </a>

          {/* User Sign In / Profile Button */}
          {currentUser ? (
            <button
              onClick={onOpenAuth}
              className="btn btn-secondary btn-sm"
              title="Instructor Profile"
            >
              <User size={13} style={{ color: 'var(--accent)' }} />
              <span>{currentUser.name}</span>
            </button>
          ) : (
            <button onClick={onOpenAuth} className="btn btn-secondary btn-sm">
              <LogIn size={13} />
              <span>Sign in</span>
            </button>
          )}

          <button onClick={onEnterApp} className="btn btn-primary btn-sm">
            <span>Launch platform</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </nav>

      {/* 1 & 2. Hero Section (Academic Evaluation Platform badge removed above header) */}
      <header className="hero-section">
        {/* Headline: Word-by-word reveal + 2. Wavy underline under "one student" */}
        <h1 className="hero-title" id="hero-headline">
          <span className="word" style={{ animationDelay: '0.12s' }}>Nurturing</span>{' '}
          <span className="word" style={{ animationDelay: '0.18s' }}>Understanding,</span>{' '}
          <span className="word" style={{ animationDelay: '0.24s' }}>Guided</span>{' '}
          <span className="wavy-wrapper">
            <span className="word" style={{ animationDelay: '0.30s' }}>One</span>{' '}
            <span className="word" style={{ animationDelay: '0.36s' }}>Student</span>
            {/* 2. Wavy underline drawing under "one student" */}
            <svg className="wavy-svg" viewBox="0 0 160 12" preserveAspectRatio="none">
              <path d="M 0,7 Q 10,0 20,7 T 40,7 T 60,7 T 80,7 T 100,7 T 120,7 T 140,7 T 160,7" />
            </svg>
          </span>{' '}
          <span className="word" style={{ animationDelay: '0.42s' }}>At</span>{' '}
          <span className="word" style={{ animationDelay: '0.48s' }}>A</span>{' '}
          <span className="word" style={{ animationDelay: '0.54s' }}>Time.</span>
        </h1>

        <p className="hero-lead">
          Didactic AI transforms lecture notes into comprehensive assessments, synthesizes transparent
          grading rubrics, and evaluates student answer sheets with objective criteria and decomposed feedback.
        </p>

        <div className="hero-actions">
          <button onClick={onEnterApp} className="btn btn-primary" style={{ padding: '10px 24px', fontSize: '0.95rem' }}>
            <span>Enter workspace</span>
            <ArrowRight size={15} />
          </button>
          <button
            onClick={() => scrollToSection('rubrics')}
            className="btn btn-secondary"
            style={{ padding: '10px 20px', fontSize: '0.95rem' }}
          >
            <span>Explore rubrics</span>
          </button>
        </div>
      </header>

      {/* 3. Hero Card (Fig. 1) */}
      <div className="fig1-container">
        <div className="cartesia-card fig1-card" id="hero-fig1" onClick={onEnterApp} style={{ cursor: 'pointer' }}>
          <div className="fig1-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="fig1-badge">Fig. 1 · Evidence Citations</span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                CS-301 · Concurrency & Deadlocks
              </span>
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent)' }}>
              Score: 10.0 / 10
            </span>
          </div>

          {/* Student Answer with sequential highlighter markup */}
          <div style={{ background: 'var(--surface)', padding: 18, borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', fontSize: '0.92rem', lineHeight: 1.65, color: 'var(--text)' }}>
            <p style={{ marginBottom: 8, fontSize: '0.78rem', textTransform: 'uppercase', fontWeight: 600, color: 'var(--text-muted)' }}>
              Student Response (STU-001):
            </p>
            <p id="teacher-marked-text">
              A mutex provides mutual exclusion with{' '}
              <span className="teacher-mark mark-blue" id="mark-1">
                explicit thread ownership: only the thread that locks can release it
              </span>
              . In contrast, a binary semaphore is a signaling primitive without ownership.
              A system deadlock occurs if and only if{' '}
              <span className="teacher-mark mark-yellow" id="mark-2">
                all four Coffman conditions occur simultaneously
              </span>{' '}
              (mutual exclusion, hold & wait, no preemption, and circular wait).
              To prevent deadlocks, the operating system can break circular wait by{' '}
              <span className="teacher-mark mark-cyan" id="mark-3">
                establishing a global strict ordering on all resource types
              </span>
              .
            </p>
          </div>
        </div>
      </div>

      {/* 4 & 5. Bloom's Taxonomy Section */}
      <section className="section-layout" id="curriculum">
        <div className="section-header reveal-on-scroll">
          <h2 className="section-title">Decompiled Curriculum Mapping</h2>
          <p className="section-desc">
            Every concept from lecture notes is categorized across Bloom's Taxonomy, calibrating cognitive complexity before assessment synthesis.
          </p>
        </div>

        {/* 5. Bloom bars growing from 0 to current width when scrolled into view */}
        <div className="bloom-grid" id="bloom-container" ref={bloomContainerRef}>
          <div className="bloom-card reveal-on-scroll">
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', fontWeight: 600 }}>
              <span>1. Remember</span>
              <span style={{ color: 'var(--accent)' }}>95%</span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
              Primitive terms & lock definitions
            </p>
            <div className="bloom-bar-track">
              <div className="bloom-bar-fill" data-width="95%" style={{ '--target-width': '95%' }} />
            </div>
          </div>

          <div className="bloom-card reveal-on-scroll">
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', fontWeight: 600 }}>
              <span>2. Understand</span>
              <span style={{ color: 'var(--accent)' }}>85%</span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
              Mutex vs. binary semaphore mechanisms
            </p>
            <div className="bloom-bar-track">
              <div className="bloom-bar-fill" data-width="85%" style={{ '--target-width': '85%' }} />
            </div>
          </div>

          <div className="bloom-card reveal-on-scroll">
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', fontWeight: 600 }}>
              <span>3. Apply</span>
              <span style={{ color: 'var(--accent)' }}>75%</span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
              Atomic wait() and signal() implementation
            </p>
            <div className="bloom-bar-track">
              <div className="bloom-bar-fill" data-width="75%" style={{ '--target-width': '75%' }} />
            </div>
          </div>

          <div className="bloom-card reveal-on-scroll">
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', fontWeight: 600 }}>
              <span>4. Analyze</span>
              <span style={{ color: 'var(--accent)' }}>65%</span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
              Four Coffman conditions deadlock dynamics
            </p>
            <div className="bloom-bar-track">
              <div className="bloom-bar-fill" data-width="65%" style={{ '--target-width': '65%' }} />
            </div>
          </div>

          <div className="bloom-card reveal-on-scroll">
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', fontWeight: 600 }}>
              <span>5. Evaluate</span>
              <span style={{ color: 'var(--accent)' }}>50%</span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
              Deadlock prevention vs. avoidance trade-offs
            </p>
            <div className="bloom-bar-track">
              <div className="bloom-bar-fill" data-width="50%" style={{ '--target-width': '50%' }} />
            </div>
          </div>

          <div className="bloom-card reveal-on-scroll">
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', fontWeight: 600 }}>
              <span>6. Create</span>
              <span style={{ color: 'var(--accent)' }}>35%</span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
              Synthesis of starvation-free protocols
            </p>
            <div className="bloom-bar-track">
              <div className="bloom-bar-fill" data-width="35%" style={{ '--target-width': '35%' }} />
            </div>
          </div>
        </div>
      </section>

      {/* 6. Rubrics Table & Three Feedback Items Section */}
      <section className="section-layout" id="rubrics" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="section-header reveal-on-scroll">
          <h2 className="section-title">100% Normalized Evaluation Rubrics</h2>
          <p className="section-desc">
            Mathematical criteria weights sum to 100%, paired with decomposed evidence citations.
          </p>
        </div>

        {/* Rubric Table with staggered row reveal */}
        <table className="rubric-table">
          <thead>
            <tr>
              <th>Criterion</th>
              <th>Weight</th>
              <th>Target Mastery</th>
            </tr>
          </thead>
          <tbody id="rubric-body" ref={rubricBodyRef}>
            <tr className="rubric-row">
              <td style={{ fontWeight: 600 }}>Synchronization Primitives</td>
              <td style={{ color: 'var(--accent)', fontWeight: 600 }}>35%</td>
              <td style={{ color: 'var(--text-muted)' }}>Precise distinction between lock ownership and event signaling.</td>
            </tr>
            <tr className="rubric-row">
              <td style={{ fontWeight: 600 }}>Coffman Deadlock Conditions</td>
              <td style={{ color: 'var(--accent)', fontWeight: 600 }}>35%</td>
              <td style={{ color: 'var(--text-muted)' }}>Enumeration and explanation of all four concurrent conditions.</td>
            </tr>
            <tr className="rubric-row">
              <td style={{ fontWeight: 600 }}>Prevention Strategy</td>
              <td style={{ color: 'var(--accent)', fontWeight: 600 }}>30%</td>
              <td style={{ color: 'var(--text-muted)' }}>Actionable OS protocol eliminating circular wait through hierarchy.</td>
            </tr>
          </tbody>
        </table>

        {/* 6. Three feedback items fading in one by one */}
        <div className="feedback-grid" id="feedback-container" ref={feedbackContainerRef}>
          <div className="feedback-item">
            <div style={{ fontSize: '0.76rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 6 }}>
              Criterion Strengths
            </div>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>
              Clear, explicit distinction between mutex thread ownership and semaphore signaling without ownership.
            </p>
          </div>

          <div className="feedback-item">
            <div style={{ fontSize: '0.76rem', fontWeight: 600, textTransform: 'uppercase', color: '#b45309', marginBottom: 6 }}>
              Evidence Citations
            </div>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>
              Directly cites: "establishing a global strict ordering on all resource types" to break circular wait.
            </p>
          </div>

          <div className="feedback-item">
            <div style={{ fontSize: '0.76rem', fontWeight: 600, textTransform: 'uppercase', color: '#0369a1', marginBottom: 6 }}>
              Pedagogical Guidance
            </div>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>
              Recommended next topic: compare dynamic avoidance via Dijkstra's Banker's Algorithm.
            </p>
          </div>
        </div>
      </section>

      {/* Section 03 · Assessment Synthesis & Question Authoring */}
      <section className="section-layout" id="assessment" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="section-header reveal-on-scroll">
          <h2 className="section-title">Automated Assessment Generation</h2>
          <p className="section-desc">
            Directly converts extracted lecture concepts into university-level assessment questions, complete with tailored hints, point distributions, and connected rubric criteria.
          </p>
        </div>

        <div className="cartesia-card reveal-on-scroll" style={{ padding: 24, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="badge badge-accent">Midterm Exam</span>
              <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Operating Systems: Concurrency & Deadlocks</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <span className="badge badge-outline">5 Questions Total</span>
              <span className="badge badge-accent">50.0 Points Total</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Sample Question 1 */}
            <div style={{ background: 'var(--surface)', padding: 16, borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="badge badge-outline">Q1 · Short Answer</span>
                  <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>Thread Ownership & Mutual Exclusion</span>
                </div>
                <span className="badge badge-accent">10.0 pts</span>
              </div>
              <p style={{ fontSize: '0.86rem', color: 'var(--text)', marginBottom: 8, lineHeight: 1.5 }}>
                Critically distinguish between mutex thread ownership and binary semaphore signaling. Explain the mechanisms of priority inversion when using unmanaged mutex locks in real-time operating systems.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-muted)', background: 'var(--bg)', padding: '6px 10px', borderRadius: 4 }}>
                <Sparkles size={13} style={{ color: 'var(--accent)' }} />
                <span><strong>Student Hint:</strong> Consider how scheduler priority inheritance protocols break unbounded blocking chains.</span>
              </div>
            </div>

            {/* Sample Question 2 */}
            <div style={{ background: 'var(--surface)', padding: 16, borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="badge badge-outline">Q2 · Systems Analysis</span>
                  <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>Coffman Deadlock Conditions</span>
                </div>
                <span className="badge badge-accent">10.0 pts</span>
              </div>
              <p style={{ fontSize: '0.86rem', color: 'var(--text)', marginBottom: 8, lineHeight: 1.5 }}>
                Enumerate all four Coffman deadlock conditions. Propose a concrete operating system resource hierarchy protocol that strictly prevents circular wait without severe throughput degradation.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--text-muted)', background: 'var(--bg)', padding: '6px 10px', borderRadius: 4 }}>
                <Sparkles size={13} style={{ color: 'var(--accent)' }} />
                <span><strong>Student Hint:</strong> Focus on total ordering of resource identifiers to eliminate circular wait conditions.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 04 · Decomposed Whole-Assessment PDF Grading */}
      <section className="section-layout" id="grading" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="section-header reveal-on-scroll">
          <h2 className="section-title">Whole-Assessment PDF Grading</h2>
          <p className="section-desc">
            Upload the student's complete answer sheet as a single PDF. Didactic AI segments each answer, matches it to the corresponding question, and evaluates against rubric criteria with side-by-side verification.
          </p>
        </div>

        {/* Side-by-Side Match Card */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 20 }}>
          {/* Left: Student Answer PDF Segment */}
          <div className="cartesia-card reveal-on-scroll">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Quote size={15} style={{ color: 'var(--accent)' }} />
                <h4 style={{ fontSize: '0.92rem', fontWeight: 600 }}>Matched Answer from Student PDF</h4>
              </div>
              <span className="badge badge-outline">Alice Johnson · Q1</span>
            </div>

            <div style={{ background: 'var(--bg)', padding: 14, borderRadius: 6, border: '1px solid var(--border-subtle)', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', lineHeight: 1.6, color: 'var(--text)', marginBottom: 12 }}>
              "A mutex requires explicit thread ownership: only the thread that acquired the mutex lock is legally permitted to release it. In contrast, a semaphore maintains an integer counter without ownership semantics. Priority inversion occurs when a high-priority thread blocks waiting for a lock held by a low-priority thread, which is preempted by medium-priority tasks..."
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              <CheckCircle2 size={13} style={{ color: 'var(--accent)' }} />
              <span>Matched from Page 1 of uploaded submission PDF (SHA-256 verified)</span>
            </div>
          </div>

          {/* Right: Rubric Evaluation & Score Breakdown */}
          <div className="cartesia-card reveal-on-scroll">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <GraduationCap size={16} style={{ color: 'var(--accent)' }} />
                <h4 style={{ fontSize: '0.92rem', fontWeight: 600 }}>Criterion-Level Evaluation</h4>
              </div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--accent)' }}>
                9.5 / 10.0 pts
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)', padding: '8px 10px', borderRadius: 4, border: '1px solid var(--border-subtle)', fontSize: '0.82rem' }}>
                <span>Mutex vs. semaphore thread ownership distinction</span>
                <span style={{ fontWeight: 600, color: 'var(--accent)' }}>4.5 / 5.0</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)', padding: '8px 10px', borderRadius: 4, border: '1px solid var(--border-subtle)', fontSize: '0.82rem' }}>
                <span>Priority inversion mechanics & protocol description</span>
                <span style={{ fontWeight: 600, color: 'var(--accent)' }}>5.0 / 5.0</span>
              </div>
            </div>

            <div style={{ background: 'var(--surface)', padding: '10px 12px', borderRadius: 4, border: '1px solid var(--border-subtle)', fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
              <strong style={{ color: 'var(--text)' }}>Feedback: </strong>
              Accurate articulation of thread ownership constraints. Thorough description of unbounded priority inversion with appropriate mention of priority inheritance protocols.
            </div>
          </div>
        </div>

        {/* Server Immutability Lock Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 6, background: 'var(--surface)', border: '1px solid var(--border)', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          <Lock size={15} style={{ color: '#eab308' }} />
          <span><strong>Academic Integrity Guarantee:</strong> Once the first student answer is graded, the assessment questions and rubrics are server-locked to guarantee consistent, immutable standards across the entire cohort.</span>
        </div>
      </section>

      {/* Section 05 · Total Score Confirmation & Excel Export */}
      <section className="section-layout" id="export" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="section-header reveal-on-scroll">
          <h2 className="section-title">Instructor Confirmation & Excel Export</h2>
          <p className="section-desc">
            Lecturers maintain total oversight: inspect headline scores, override individual marks where necessary, confirm final totals, and export clean, audit-ready spreadsheets.
          </p>
        </div>

        <div className="cartesia-card reveal-on-scroll" style={{ padding: 24 }}>
          {/* Header & Export Button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <span className="badge badge-accent" style={{ marginBottom: 4 }}>Confirmed Grading Record</span>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>CS-301 · Final Assessment Gradebook</h3>
            </div>

            <button
              onClick={async () => {
                const workbook = new ExcelJS.Workbook();
                const worksheet = workbook.addWorksheet('CS-301 Gradebook');
                worksheet.columns = [
                  { header: 'Student ID', key: 'id', width: 16 },
                  { header: 'Student Name', key: 'name', width: 24 },
                  { header: 'Questions', key: 'questions', width: 14 },
                  { header: 'AI Score', key: 'ai_score', width: 14 },
                  { header: 'Final Score', key: 'final_score', width: 14 },
                  { header: 'Max Score', key: 'max_score', width: 12 },
                  { header: 'Percentage', key: 'percentage', width: 14 },
                  { header: 'Tier', key: 'tier', width: 10 },
                  { header: 'Status', key: 'status', width: 14 },
                ];
                const sampleRoster = [
                  { id: 'STU-2026-081', name: 'Alice Johnson', questions: '5 / 5', ai_score: 46.5, final_score: 46.5, max_score: 50.0, percentage: '93.0%', tier: 'A', status: 'CONFIRMED' },
                  { id: 'STU-2026-082', name: 'Marcus Chen', questions: '5 / 5', ai_score: 44.5, final_score: 44.5, max_score: 50.0, percentage: '89.0%', tier: 'A-', status: 'CONFIRMED' },
                  { id: 'STU-2026-083', name: 'Sophia Rodriguez', questions: '5 / 5', ai_score: 45.5, final_score: 45.5, max_score: 50.0, percentage: '91.0%', tier: 'A', status: 'CONFIRMED' },
                  { id: 'STU-2026-084', name: 'David Kim', questions: '5 / 5', ai_score: 39.5, final_score: 39.5, max_score: 50.0, percentage: '79.0%', tier: 'B', status: 'CONFIRMED' },
                  { id: 'STU-2026-085', name: 'Fatima Al-Mansoor', questions: '5 / 5', ai_score: 48.0, final_score: 48.0, max_score: 50.0, percentage: '96.0%', tier: 'A+', status: 'CONFIRMED' },
                  { id: 'STU-2026-086', name: "Liam O'Connor", questions: '5 / 5', ai_score: 41.0, final_score: 41.0, max_score: 50.0, percentage: '82.0%', tier: 'B+', status: 'CONFIRMED' },
                  { id: 'STU-2026-087', name: 'Maya Patel', questions: '5 / 5', ai_score: 44.0, final_score: 44.0, max_score: 50.0, percentage: '88.0%', tier: 'B+', status: 'CONFIRMED' },
                  { id: 'STU-2026-088', name: 'Lucas Vance', questions: '5 / 5', ai_score: 37.5, final_score: 37.5, max_score: 50.0, percentage: '75.0%', tier: 'C+', status: 'CONFIRMED' },
                ];
                sampleRoster.forEach(row => worksheet.addRow(row));
                const buffer = await workbook.xlsx.writeBuffer();
                const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'CS-301_Final_Assessment_Gradebook.xlsx';
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="btn btn-secondary btn-sm"
            >
              <FileSpreadsheet size={14} />
              <span>Export Audit Sheet (.xlsx)</span>
            </button>
          </div>

          {/* Cohort Stats Pills */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 18 }}>
            <div style={{ background: 'var(--bg)', padding: '10px 14px', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Class Size</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)' }}>8 Students</div>
            </div>
            <div style={{ background: 'var(--bg)', padding: '10px 14px', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Cohort Average</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--accent)' }}>86.6% (43.3 / 50)</div>
            </div>
            <div style={{ background: 'var(--bg)', padding: '10px 14px', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Highest Mark</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)' }}>96.0% (Fatima A.)</div>
            </div>
            <div style={{ background: 'var(--bg)', padding: '10px 14px', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Audit Status</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)' }}>100% Confirmed</div>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="rubric-table" style={{ fontSize: '0.84rem' }}>
              <thead>
                <tr>
                  <th>Student ID</th>
                  <th>Student Name</th>
                  <th>Questions</th>
                  <th>AI Score</th>
                  <th>Final Total</th>
                  <th>Tier</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr className="gradebook-row">
                  <td style={{ fontFamily: 'var(--font-mono)' }}>STU-2026-081</td>
                  <td style={{ fontWeight: 600 }}>Alice Johnson</td>
                  <td>5 / 5</td>
                  <td>46.5 / 50.0</td>
                  <td style={{ fontWeight: 700, color: 'var(--accent)' }}>46.5 / 50.0 (93.0%)</td>
                  <td><span className="badge badge-accent" style={{ fontSize: '0.68rem' }}>Grade A</span></td>
                  <td><span className="badge badge-accent" style={{ fontSize: '0.7rem' }}>CONFIRMED</span></td>
                </tr>
                <tr className="gradebook-row">
                  <td style={{ fontFamily: 'var(--font-mono)' }}>STU-2026-082</td>
                  <td style={{ fontWeight: 600 }}>Marcus Chen</td>
                  <td>5 / 5</td>
                  <td>44.5 / 50.0</td>
                  <td style={{ fontWeight: 700, color: 'var(--accent)' }}>44.5 / 50.0 (89.0%)</td>
                  <td><span className="badge badge-accent" style={{ fontSize: '0.68rem' }}>Grade A-</span></td>
                  <td><span className="badge badge-accent" style={{ fontSize: '0.7rem' }}>CONFIRMED</span></td>
                </tr>
                <tr className="gradebook-row">
                  <td style={{ fontFamily: 'var(--font-mono)' }}>STU-2026-083</td>
                  <td style={{ fontWeight: 600 }}>Sophia Rodriguez</td>
                  <td>5 / 5</td>
                  <td>45.5 / 50.0</td>
                  <td style={{ fontWeight: 700, color: 'var(--accent)' }}>45.5 / 50.0 (91.0%)</td>
                  <td><span className="badge badge-accent" style={{ fontSize: '0.68rem' }}>Grade A</span></td>
                  <td><span className="badge badge-accent" style={{ fontSize: '0.7rem' }}>CONFIRMED</span></td>
                </tr>
                <tr className="gradebook-row">
                  <td style={{ fontFamily: 'var(--font-mono)' }}>STU-2026-084</td>
                  <td style={{ fontWeight: 600 }}>David Kim</td>
                  <td>5 / 5</td>
                  <td>39.5 / 50.0</td>
                  <td style={{ fontWeight: 700, color: 'var(--text)' }}>39.5 / 50.0 (79.0%)</td>
                  <td><span className="badge badge-outline" style={{ fontSize: '0.68rem' }}>Grade B</span></td>
                  <td><span className="badge badge-accent" style={{ fontSize: '0.7rem' }}>CONFIRMED</span></td>
                </tr>
                <tr className="gradebook-row">
                  <td style={{ fontFamily: 'var(--font-mono)' }}>STU-2026-085</td>
                  <td style={{ fontWeight: 600 }}>Fatima Al-Mansoor</td>
                  <td>5 / 5</td>
                  <td>48.0 / 50.0</td>
                  <td style={{ fontWeight: 700, color: 'var(--accent)' }}>48.0 / 50.0 (96.0%)</td>
                  <td><span className="badge badge-accent" style={{ fontSize: '0.68rem' }}>Grade A+</span></td>
                  <td><span className="badge badge-accent" style={{ fontSize: '0.7rem' }}>CONFIRMED</span></td>
                </tr>
                <tr className="gradebook-row">
                  <td style={{ fontFamily: 'var(--font-mono)' }}>STU-2026-086</td>
                  <td style={{ fontWeight: 600 }}>Liam O'Connor</td>
                  <td>5 / 5</td>
                  <td>41.0 / 50.0</td>
                  <td style={{ fontWeight: 700, color: 'var(--accent)' }}>41.0 / 50.0 (82.0%)</td>
                  <td><span className="badge badge-outline" style={{ fontSize: '0.68rem' }}>Grade B+</span></td>
                  <td><span className="badge badge-accent" style={{ fontSize: '0.7rem' }}>CONFIRMED</span></td>
                </tr>
                <tr className="gradebook-row">
                  <td style={{ fontFamily: 'var(--font-mono)' }}>STU-2026-087</td>
                  <td style={{ fontWeight: 600 }}>Maya Patel</td>
                  <td>5 / 5</td>
                  <td>44.0 / 50.0</td>
                  <td style={{ fontWeight: 700, color: 'var(--accent)' }}>44.0 / 50.0 (88.0%)</td>
                  <td><span className="badge badge-accent" style={{ fontSize: '0.68rem' }}>Grade B+</span></td>
                  <td><span className="badge badge-accent" style={{ fontSize: '0.7rem' }}>CONFIRMED</span></td>
                </tr>
                <tr className="gradebook-row">
                  <td style={{ fontFamily: 'var(--font-mono)' }}>STU-2026-088</td>
                  <td style={{ fontWeight: 600 }}>Lucas Vance</td>
                  <td>5 / 5</td>
                  <td>37.5 / 50.0</td>
                  <td style={{ fontWeight: 700, color: 'var(--text)' }}>37.5 / 50.0 (75.0%)</td>
                  <td><span className="badge badge-outline" style={{ fontSize: '0.68rem' }}>Grade C+</span></td>
                  <td><span className="badge badge-accent" style={{ fontSize: '0.7rem' }}>CONFIRMED</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 7. Closing Section with faint drifting wordmark */}
      <section className="closing-section">
        {/* 7. Faint outline of "Didactic AI" wordmark drifting subtly */}
        <div className="wordmark-bg" aria-hidden="true">Didactic AI</div>

        <div className="closing-content reveal-on-scroll">
          <h2 style={{ fontSize: '2.1rem', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 12 }}>
            Technology In Service Of Curiosity And Fairness
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', marginBottom: 28, lineHeight: 1.6 }}>
            Transforming evaluations into meaningful conversations: AI built to help teachers teach and students thrive.
          </p>
          <button onClick={onEnterApp} className="btn btn-primary" style={{ padding: '12px 28px', fontSize: '0.95rem' }}>
            <span>Enter platform</span>
            <ArrowRight size={15} />
          </button>
        </div>
      </section>

      {/* Comprehensive Academic Footer with GitHub, MIT License, Docs */}
      <footer style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)', padding: '48px 32px 32px 32px' }}>
        <div style={{ maxWidth: 1020, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 32, marginBottom: 36 }}>
          {/* Brand info */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div className="brand-icon" style={{ width: 24, height: 24 }}>
                <Zap size={13} />
              </div>
              <span style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text)' }}>Didactic AI</span>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Nurturing understanding, one student at a time. AI-powered curriculum synthesis, normalized rubrics, and decomposed academic grading.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Platform
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.84rem' }}>
              <a href="#curriculum" onClick={(e) => { e.preventDefault(); scrollToSection('curriculum'); }} style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Curriculum Decompilation</a>
              <a href="#rubrics" onClick={(e) => { e.preventDefault(); scrollToSection('rubrics'); }} style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Normalized Rubrics</a>
              <a href="#hero-fig1" onClick={(e) => { e.preventDefault(); scrollToSection('hero-fig1'); }} style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Decomposed Grading Citations</a>
            </div>
          </div>

          {/* Open Source & Community */}
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Source & License
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.84rem' }}>
              <a
                href="https://github.com/eyustarX/didactic-ai"
                target="_blank"
                rel="noreferrer"
                style={{ color: 'var(--text)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 500 }}
              >
                <GitHubIcon size={15} />
                <span>GitHub Repository</span>
              </a>
              <span style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <FileCode size={14} />
                <span>MIT Open Source License</span>
              </span>
              <span style={{ color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <ShieldCheck size={14} style={{ color: 'var(--accent)' }} />
                <span>Pedagogical Verification</span>
              </span>
            </div>
          </div>
        </div>

        {/* Sub-footer bottom bar */}
        <div style={{ maxWidth: 1020, margin: '0 auto', borderTop: '1px solid var(--border)', paddingTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <span>© 2026 Didactic AI. All rights reserved.</span>
          <div style={{ display: 'flex', gap: 16 }}>
            <span>Designed with tars.pro Design System</span>
            <span>·</span>
            <span>Neon Serverless PostgreSQL</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
