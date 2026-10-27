import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import AuthModal from './components/AuthModal';
import InstructorProfileModal from './components/InstructorProfileModal';
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

  // Theme Mode ('dark' | 'light' | 'system') - defaults to 'dark'
  const [themeMode, setThemeMode] = useState(() => {
    try {
      const saved = localStorage.getItem('didactic_theme_mode');
      return saved || 'dark';
    } catch {
      return 'dark';
    }
  });

  // Effective resolved theme ('dark' | 'light')
  const [theme, setTheme] = useState(() => {
    try {
      const savedMode = localStorage.getItem('didactic_theme_mode') || 'dark';
      if (savedMode === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return savedMode;
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const resolveAndApply = () => {
      const resolved =
        themeMode === 'system'
          ? mediaQuery.matches
            ? 'dark'
            : 'light'
          : themeMode;

      setTheme(resolved);
      document.documentElement.setAttribute('data-theme', resolved);

      try {
        localStorage.setItem('didactic_theme_mode', themeMode);
        localStorage.setItem('didactic_theme', resolved);
      } catch {}
    };

    resolveAndApply();

    const handleSystemChange = (e) => {
      if (themeMode === 'system') {
        const newResolved = e.matches ? 'dark' : 'light';
        setTheme(newResolved);
        document.documentElement.setAttribute('data-theme', newResolved);
        try {
          localStorage.setItem('didactic_theme', newResolved);
        } catch {}
      }
    };

    mediaQuery.addEventListener('change', handleSystemChange);
    return () => mediaQuery.removeEventListener('change', handleSystemChange);
  }, [themeMode]);

  const toggleTheme = () => {
    setThemeMode((prev) => {
      const currentResolved =
        prev === 'system'
          ? window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light'
          : prev;
      return currentResolved === 'dark' ? 'light' : 'dark';
    });
  };

  const handleSelectThemeMode = (mode) => {
    setThemeMode(mode);
  };

  // User Authentication State (defaults to cached user or unauthenticated)
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('didactic_user');
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      if (parsed) {
        if (parsed.department) {
          delete parsed.department;
        }
        if (
          (parsed.name && parsed.name.toLowerCase().includes('eyob')) ||
          (parsed.email && parsed.email.toLowerCase().includes('eyob'))
        ) {
          if (parsed.id !== 'usr_byz6ij') {
            parsed.id = 'usr_byz6ij';
            localStorage.setItem('didactic_user', JSON.stringify(parsed));
          }
        }
      }
      return parsed;
    } catch {
      return null;
    }
  });
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('signin');
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleOpenAuth = (mode = 'signin') => {
    setAuthMode(mode);
    setIsAuthOpen(true);
  };

  const handleSaveProfile = (updatedUser) => {
    setCurrentUser(updatedUser);
    try {
      localStorage.setItem('didactic_user', JSON.stringify(updatedUser));
    } catch (e) {
      console.warn('Failed to persist user profile:', e);
    }
  };

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
          onOpenAuth={handleOpenAuth}
          onOpenProfile={() => setIsProfileOpen(true)}
          onSignOut={handleSignOut}
          theme={theme}
          themeMode={themeMode}
          onSelectThemeMode={handleSelectThemeMode}
          onToggleTheme={toggleTheme}
        />
        <AuthModal
          isOpen={isAuthOpen}
          initialMode={authMode}
          onClose={() => setIsAuthOpen(false)}
          currentUser={currentUser}
          onAuthSuccess={(user) => {
            setCurrentUser(user);
            setView('app');
          }}
        />
        <InstructorProfileModal
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          currentUser={currentUser}
          onSave={handleSaveProfile}
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
        onOpenProfile={() => setIsProfileOpen(true)}
        onSignOut={handleSignOut}
        chatSessions={chatSessions}
        activeChatSessionId={activeChatSessionId}
        onNewChat={handleNewChat}
        onSelectChatSession={handleSelectChatSession}
        onDeleteChatSession={handleDeleteChatSession}
        theme={theme}
        themeMode={themeMode}
        onSelectThemeMode={handleSelectThemeMode}
        onToggleTheme={toggleTheme}
      />

      {/* Main Content Area */}
      <div className="main-wrapper">
        {activeTab !== 'assessment' && (
          <Header
            activeTab={activeTab}
            collapsed={collapsed}
            setCollapsed={setCollapsed}
            currentUser={currentUser}
            onOpenAuth={() => setIsAuthOpen(true)}
            onOpenProfile={() => setIsProfileOpen(true)}
            onSignOut={handleSignOut}
            theme={theme}
            themeMode={themeMode}
            onSelectThemeMode={handleSelectThemeMode}
            onToggleTheme={toggleTheme}
          />
        )}

        <main className={`content-body ${activeTab === 'assessment' ? 'content-body-assessment' : ''}`}>
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
              chatSessions={chatSessions}
              activeChatSessionId={activeChatSessionId}
              setActiveChatSessionId={setActiveChatSessionId}
              onSelectChatSession={handleSelectChatSession}
              onNewChat={handleNewChat}
              onChatSessionsChange={loadChatSessions}
              sidebarCollapsed={collapsed}
              setSidebarCollapsed={setCollapsed}
              theme={theme}
              onToggleTheme={toggleTheme}
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

      <InstructorProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        currentUser={currentUser}
        onSave={handleSaveProfile}
      />
    </div>
  );
}
