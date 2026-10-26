import React, { useState } from 'react';
import ProfileMenu from './ProfileMenu';
import {
  FileCheck,
  GraduationCap,
  Zap,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  User,
  LogOut,
  LogIn,
  Library,
  SquarePen,
  MessageSquare,
  History,
  Trash2,
  Sun,
  Moon,
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'assessment', label: 'Assessment Studio', icon: FileCheck },
  { id: 'assessments_library', label: 'Assessments Library', icon: Library },
  { id: 'grading', label: 'Exam & Paper Grading', icon: GraduationCap },
];

export default function Sidebar({
  activeTab,
  setActiveTab,
  collapsed,
  setCollapsed,
  onGoToLanding,
  currentUser,
  onOpenAuth,
  onOpenProfile,
  onSignOut,
  chatSessions = [],
  activeChatSessionId = null,
  onNewChat,
  onSelectChatSession,
  onDeleteChatSession,
  theme = 'dark',
  themeMode = 'dark',
  onSelectThemeMode,
  onToggleTheme,
}) {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const handleNavClick = (id) => {
    setActiveTab(id);
    if (window.innerWidth <= 860) {
      setCollapsed(true);
    }
  };

  const userInitial = currentUser?.name
    ? currentUser.name.trim().slice(0, 2).toUpperCase()
    : 'ET';
  const userHandle = currentUser?.email
    ? `@${currentUser.email.split('@')[0]}`
    : '@academic';

  return (
    <>
      {/* Mobile Backdrop when drawer is open */}
      {!collapsed && (
        <div
          className="sidebar-backdrop"
          onClick={() => setCollapsed(true)}
          aria-hidden="true"
        />
      )}

      <div className={`sidebar-wrapper ${collapsed ? 'collapsed' : ''}`}>
        <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
          {/* Brand & Collapse / Uncollapse Toggle */}
          {collapsed ? (
            <div className="sidebar-collapsed-brand-wrap">
              <button
                type="button"
                onClick={() => setCollapsed(false)}
                className="sidebar-collapsed-brand-btn"
                title="Expand sidebar"
              >
                <div className="brand-icon">
                  <Zap size={16} />
                </div>
              </button>
            </div>
          ) : (
            <div className="brand-section">
              <div
                className="brand-left"
                onClick={onGoToLanding}
                title="Go to landing page"
                style={{ cursor: 'pointer' }}
              >
                <div className="brand-icon">
                  <Zap size={15} />
                </div>
                <h1 className="brand-title">Didactic AI</h1>
              </div>

              <button
                type="button"
                onClick={() => setCollapsed(true)}
                className="sidebar-toggle-btn desktop-collapse-toggle"
                title="Collapse sidebar"
              >
                <PanelLeftClose size={15} />
              </button>

              {/* Close button inside mobile drawer */}
              <button
                onClick={() => setCollapsed(true)}
                className="sidebar-toggle-btn mobile-close-btn"
                title="Close menu"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Top: + New Chat Button (SquarePen ChatGPT Style) */}
          <div className="sidebar-new-chat-wrap">
            <button
              type="button"
              onClick={() => {
                if (onNewChat) onNewChat();
                if (window.innerWidth <= 860) setCollapsed(true);
              }}
              className="sidebar-new-chat-btn"
              title="New Chat"
            >
              <SquarePen size={16} className="new-chat-icon" />
              <span className="new-chat-text">New Chat</span>
            </button>
          </div>

          {/* Navigation Menu (Direct Items: Studio, Library, Grading) */}
          <nav className="nav-menu">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  title={item.label}
                >
                  <Icon size={16} className="nav-icon" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Divider */}
          <div className="sidebar-divider" />

          {/* Recent Chats Section (Shown when expanded) */}
          <div className="sidebar-recent-section">
            <div className="sidebar-recent-header">
              <span className="sidebar-recent-title">
                <History size={12} style={{ opacity: 0.7 }} />
                <span>Recent Chats</span>
              </span>
            </div>

            <div className="sidebar-recent-chats-list custom-scroll">
              {chatSessions.length === 0 ? (
                <div className="sidebar-empty-chats">No previous chats</div>
              ) : (
                chatSessions.map((session) => {
                  const isSelected = activeChatSessionId === session.id && activeTab === 'assessment';
                  return (
                    <div
                      key={session.id}
                      className={`sidebar-chat-item ${isSelected ? 'active' : ''}`}
                      onClick={() => {
                        if (onSelectChatSession) onSelectChatSession(session);
                        if (window.innerWidth <= 860) setCollapsed(true);
                      }}
                      title={session.title || 'Conversation'}
                    >
                      <MessageSquare size={13} className="chat-item-icon" />
                      <span className="chat-item-title">{session.title || 'Conversation'}</span>
                      <button
                        type="button"
                        className="chat-item-delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onDeleteChatSession) onDeleteChatSession(session.id);
                        }}
                        title="Delete chat"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Lower Sidebar Profile Section */}
          <div className="sidebar-profile-section" style={{ position: 'relative' }}>
            {/* Popover Profile Menu */}
            <ProfileMenu
              isOpen={isProfileMenuOpen}
              onClose={() => setIsProfileMenuOpen(false)}
              currentUser={currentUser}
              onOpenProfile={onOpenProfile || onOpenAuth}
              onSignOut={onSignOut}
              theme={theme}
              themeMode={themeMode}
              onSelectThemeMode={onSelectThemeMode}
              onToggleTheme={onToggleTheme}
              position={collapsed ? 'sidebar-collapsed' : 'sidebar-expanded'}
            />

            {currentUser ? (
              <div
                className="sidebar-profile-card"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsProfileMenuOpen((prev) => !prev);
                }}
                title={`${currentUser.name} (${currentUser.role || 'Instructor'})`}
              >
                <div className="sidebar-profile-avatar-wrap">
                  <div className="sidebar-profile-avatar">
                    {userInitial}
                  </div>
                  <span className="sidebar-status-dot" title="Active session" />
                </div>

                <div className="sidebar-profile-info">
                  <div className="sidebar-profile-name-row">
                    <span className="sidebar-profile-name" title={currentUser.name}>
                      {currentUser.name}
                    </span>
                  </div>
                  <div className="sidebar-profile-meta-row">
                    <span className="sidebar-profile-email" title={currentUser.email || userHandle}>
                      {currentUser.email || userHandle}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onSignOut) onSignOut();
                  }}
                  className="sidebar-profile-action-btn"
                  title="Sign out"
                >
                  <LogOut size={13} />
                </button>
              </div>
            ) : (
              <div
                className="sidebar-profile-card guest"
                onClick={onOpenAuth}
                title="Instructor sign in"
              >
                <div className="sidebar-profile-avatar-wrap">
                  <div className="sidebar-profile-avatar guest-avatar">
                    <User size={14} />
                  </div>
                </div>

                <div className="sidebar-profile-info">
                  <span className="sidebar-profile-name">Instructor Access</span>
                  <span className="sidebar-profile-sub">Sign in to workspace</span>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onOpenAuth) onOpenAuth();
                  }}
                  className="sidebar-profile-action-btn"
                  title="Instructor sign in"
                >
                  <LogIn size={13} />
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>
    </>
  );
}
