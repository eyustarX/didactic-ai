import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import AuthModal from './components/AuthModal';
import LandingPage from './pages/LandingPage';
import OverviewTab from './pages/OverviewTab';
import CurriculumTab from './pages/CurriculumTab';
import AssessmentTab from './pages/AssessmentTab';
import AssessmentsLibraryTab from './pages/AssessmentsLibraryTab';
import GradingTab from './pages/GradingTab';
import AnalyticsTab from './pages/AnalyticsTab';
import { fetchAnalytics, fetchLectureNotes, fetchLectureNoteDetail, fetchAssessment, fetchChatSessions, deleteChatSession } from './services/api';
import { SAMPLE_LECTURE_TITLE, SAMPLE_LECTURE_CONTENT } from './data/sampleData';

export default function App() {
  const [view, setView] = useState('landing'); // 'landing' | 'app'
  const [activeTab, setActiveTab] = useState('assessment');
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

  // Chat History & Session State (ChatGPT Style)
  const [chatSessions, setChatSessions] = useState([]);
  const [activeChatSessionId, setActiveChatSessionId] = useState(null);

  const loadChatSessions = async () => {
    try {
      const sessions = await fetchChatSessions(currentUser?.id);
      if (Array.isArray(sessions)) {
        setChatSessions(sessions);
      }
    } catch (err) {
      console.warn('Failed to load chat sessions:', err);
    }
  };

  useEffect(() => {
    loadChatSessions();
  }, [currentUser?.id]);

  const handleNewChat = () => {
    setActiveChatSessionId(null);
    setActiveTab('assessment');
  };

  const handleSelectChatSession = (session) => {
    setActiveChatSessionId(session.id);
    setActiveTab('assessment');
  };

  const handleDeleteChatSession = async (sessionId) => {
    try {
      await deleteChatSession(sessionId, currentUser?.id);
      setChatSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeChatSessionId === sessionId) {
        setActiveChatSessionId(null);
      }
    } catch (err) {
      console.error('Failed to delete chat session:', err);
    }
  };

  useEffect(() => {
    fetchAnalytics().then((a) => setAnalyticsData(a)).catch(() => {});

    // Clear previous instructor's assessment & active lecture note state
    setAssessment(null);
    setRubric(null);
    setActiveNoteId(null);

    // Automatically load initial lecture note & assessment if available for this instructor
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
            } else {
              setAssessment(null);
            }
          } catch (e) {
            console.error('Failed to auto-load initial assessment:', e);
            setAssessment(null);
          }
        } else {
          setAssessment(null);
          setActiveNoteId(null);
        }
      })
      .catch(() => {
        setAssessment(null);
        setActiveNoteId(null);
      });

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
    setAssessment(null);
    setRubric(null);
    setActiveNoteId(null);
    setView('landing');
  };

  const handleEnterWorkspace = () => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }
    setView('app');
  };

  // Restrict guest access: Guests cannot use the app
  useEffect(() => {
    if (view === 'app' && !currentUser) {
      setView('landing');
      setIsAuthOpen(true);
    }
  }, [view, currentUser]);

  if (view === 'landing' || !currentUser) {
    return (
      <>
        <LandingPage
          onEnterApp={handleEnterWorkspace}
          currentUser={currentUser}
          onOpenAuth={() => setIsAuthOpen(true)}
        />
        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          currentUser={currentUser}
          onAuthSuccess={(user) => {
            setCurrentUser(user);
            setView('app');
          }}
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
        chatSessions={chatSessions}
        activeChatSessionId={activeChatSessionId}
        onNewChat={handleNewChat}
        onSelectChatSession={handleSelectChatSession}
        onDeleteChatSession={handleDeleteChatSession}
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
              activeChatSessionId={activeChatSessionId}
              setActiveChatSessionId={setActiveChatSessionId}
              onChatSessionsChange={loadChatSessions}
            />
          )}

          {activeTab === 'assessments_library' && (
            <AssessmentsLibraryTab
              currentUser={currentUser}
              assessment={assessment}
              setAssessment={setAssessment}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === 'grading' && (
            <GradingTab
              assessment={assessment}
              setAssessment={setAssessment}
              currentUser={currentUser}
              onGradingComplete={handleGradingComplete}
              setActiveTab={setActiveTab}
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
