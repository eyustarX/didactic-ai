import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import AuthModal from './components/AuthModal';
import LandingPage from './pages/LandingPage';
import OverviewTab from './pages/OverviewTab';
import CurriculumTab from './pages/CurriculumTab';
import RubricsTab from './pages/RubricsTab';
import AssessmentTab from './pages/AssessmentTab';
import GradingTab from './pages/GradingTab';
import AnalyticsTab from './pages/AnalyticsTab';
import { fetchAnalytics } from './services/api';
import { SAMPLE_LECTURE_TITLE, SAMPLE_LECTURE_CONTENT } from './data/sampleData';

export default function App() {
  const [view, setView] = useState('landing'); // 'landing' | 'app'
  const [activeTab, setActiveTab] = useState('overview');
  const [collapsed, setCollapsed] = useState(() => {
    return typeof window !== 'undefined' && window.innerWidth <= 860;
  });

  // User Authentication State (defaults to unauthenticated)
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Shared workflow state
  const [lectureTitle, setLectureTitle] = useState(SAMPLE_LECTURE_TITLE);
  const [lectureContent, setLectureContent] = useState(SAMPLE_LECTURE_CONTENT);
  const [rubric, setRubric] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [selectedQuestion, setSelectedQuestion] = useState(null);

  // Analytics state
  const [analyticsData, setAnalyticsData] = useState(null);

  useEffect(() => {
    fetchAnalytics().then((a) => setAnalyticsData(a)).catch(() => {});

    const handleResize = () => {
      if (window.innerWidth <= 860) {
        setCollapsed(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === 'rubrics' && (
            <RubricsTab
              lectureTitle={lectureTitle}
              lectureContent={lectureContent}
              rubric={rubric}
              setRubric={setRubric}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === 'assessment' && (
            <AssessmentTab
              lectureTitle={lectureTitle}
              lectureContent={lectureContent}
              assessment={assessment}
              setAssessment={setAssessment}
              setSelectedQuestion={setSelectedQuestion}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === 'grading' && (
            <GradingTab
              selectedQuestion={selectedQuestion}
              rubric={rubric}
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
