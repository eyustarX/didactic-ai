import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import AuthModal from './components/AuthModal';
import LandingPage from './pages/LandingPage';
import OverviewTab from './pages/OverviewTab';
import CurriculumTab from './pages/CurriculumTab';
import AssessmentTab from './pages/AssessmentTab';
import GradingTab from './pages/GradingTab';
import AnalyticsTab from './pages/AnalyticsTab';
import { fetchAnalytics, fetchLectureNotes, fetchLectureNoteDetail, fetchAssessment } from './services/api';
import { SAMPLE_LECTURE_TITLE, SAMPLE_LECTURE_CONTENT } from './data/sampleData';

export default function App() {
  const [view, setView] = useState('landing'); // 'landing' | 'app'
  const [activeTab, setActiveTab] = useState('overview');
  const [collapsed, setCollapsed] = useState(() => {
    return typeof window !== 'undefined' && window.innerWidth <= 860;
  });

  // User Authentication State (defaults to cached user or unauthenticated)
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('didactic_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Shared workflow state
  const [activeNoteId, setActiveNoteId] = useState(null);
  const [lectureTitle, setLectureTitle] = useState(SAMPLE_LECTURE_TITLE);
  const [lectureContent, setLectureContent] = useState(SAMPLE_LECTURE_CONTENT);
  const [assessment, setAssessment] = useState(null);
  const [rubric, setRubric] = useState(null);

  // Analytics state
  const [analyticsData, setAnalyticsData] = useState(null);

  useEffect(() => {
    fetchAnalytics().then((a) => setAnalyticsData(a)).catch(() => {});

    // Automatically load initial lecture note & assessment if available
    fetchLectureNotes(currentUser?.id)
      .then(async (notes) => {
        if (notes && notes.length > 0) {
          const firstNote = notes[0];
          setActiveNoteId(firstNote.id);
          if (firstNote.name) setLectureTitle(firstNote.name);
          try {
            const detail = await fetchLectureNoteDetail(firstNote.id, currentUser?.id);
            if (detail?.assessments && detail.assessments.length > 0) {
              const firstAssId = detail.assessments[0].id;
              const fullAss = await fetchAssessment(firstAssId, currentUser?.id);
              if (fullAss) setAssessment(fullAss);
            }
          } catch (e) {
            console.error('Failed to auto-load initial assessment:', e);
          }
        }
      })
      .catch(() => {});

    const handleResize = () => {
      if (window.innerWidth <= 860) {
        setCollapsed(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [currentUser?.id]);

  const handleGradingComplete = () => {
    fetchAnalytics().then((a) => setAnalyticsData(a)).catch(() => {});
  };

  const handleSignOut = () => {
    localStorage.removeItem('didactic_user');
    setCurrentUser(null);
  };

  if (view === 'landing') {
    return (
      <>
        <LandingPage
          onEnterApp={() => setView('app')}
          currentUser={currentUser}
          onOpenAuth={() => setIsAuthOpen(true)}
        />
        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          currentUser={currentUser}
          onAuthSuccess={(user) => setCurrentUser(user)}
        />
      </>
    );
  }

  return (
    <div className="app-container">
      {/* Collapsible Sidebar Navigation with mobile drawer support */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        onGoToLanding={() => setView('landing')}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        onSignOut={handleSignOut}
      />

      {/* Main Content Area */}
      <div className="main-wrapper">
        <Header
          activeTab={activeTab}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          currentUser={currentUser}
          onOpenAuth={() => setIsAuthOpen(true)}
          onSignOut={handleSignOut}
        />

        <main className="content-body">
          {activeTab === 'overview' && (
            <OverviewTab
              analyticsData={analyticsData}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === 'curriculum' && (
            <CurriculumTab
              lectureTitle={lectureTitle}
              setLectureTitle={setLectureTitle}
              lectureContent={lectureContent}
              setLectureContent={setLectureContent}
              activeNoteId={activeNoteId}
              setActiveNoteId={setActiveNoteId}
              setActiveTab={setActiveTab}
              currentUser={currentUser}
            />
          )}


          {activeTab === 'assessment' && (
            <AssessmentTab
              activeNoteId={activeNoteId}
              setActiveNoteId={setActiveNoteId}
              lectureTitle={lectureTitle}
              setLectureTitle={setLectureTitle}
              lectureContent={lectureContent}
              setLectureContent={setLectureContent}
              assessment={assessment}
              setAssessment={setAssessment}
              setActiveTab={setActiveTab}
              currentUser={currentUser}
            />
          )}

          {activeTab === 'grading' && (
            <GradingTab
              assessment={assessment}
              setAssessment={setAssessment}
              currentUser={currentUser}
              onGradingComplete={handleGradingComplete}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsTab
              analyticsData={analyticsData}
              setAnalyticsData={setAnalyticsData}
            />
          )}
        </main>
      </div>

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        currentUser={currentUser}
        onAuthSuccess={(user) => setCurrentUser(user)}
      />
    </div>
  );
}
