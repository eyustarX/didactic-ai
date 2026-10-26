import React from 'react';
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
  Layers,
  Plus,
  MessageSquare,
  History,
  Trash2,
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'assessment', label: 'Assessment Studio', icon: FileCheck },
  { id: 'assessments_library', label: 'Assessments Library', icon: Layers },
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
  onSignOut,
  chatSessions = [],
  activeChatSessionId = null,
  onNewChat,
  onSelectChatSession,
  onDeleteChatSession,
}) {
  const [isHovered, setIsHovered] = React.useState(false);

  const handleNavClick = (id) => {
    setActiveTab(id);
    if (window.innerWidth <= 860) {
      setCollapsed(true);
    }
  };

  const isExpanded = !collapsed || isHovered;

  const userInitial = currentUser?.name
    ? currentUser.name.trim().charAt(0).toUpperCase()
    : 'U';
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
        <aside
          className={`sidebar ${collapsed ? 'collapsed' : ''} ${isHovered && collapsed ? 'hover-expanded' : ''}`}
          onMouseEnter={() => {
            if (collapsed && window.innerWidth > 860) setIsHovered(true);
          }}
          onMouseLeave={() => {
            if (collapsed) setIsHovered(false);
          }}
        >
          {/* Brand & Collapse / Uncollapse Toggle */}
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
              onClick={() => {
                if (collapsed) {
                  setCollapsed(false);
                  setIsHovered(false);
                } else {
                  setCollapsed(true);
                  setIsHovered(false);
                }
              }}
              className="sidebar-toggle-btn desktop-collapse-toggle"
              title={collapsed ? 'Uncollapse sidebar (lock open)' : 'Collapse sidebar'}
            >
              {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
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

          {/* Top: + New Chat Button (ChatGPT Style) */}
          <div className="sidebar-new-chat-wrap">
            <button
              type="button"
              onClick={() => {
                if (onNewChat) onNewChat();
                if (window.innerWidth <= 860) setCollapsed(true);
              }}
              className="sidebar-new-chat-btn"
              title="Start a fresh chat conversation"
            >
              <Plus size={16} className="new-chat-icon" />
              <span className="new-chat-text">New Chat</span>
            </button>
          </div>

          {/* Navigation Menu (Direct Items, No "MAIN NAVIGATION" Header) */}
          <nav className="nav-menu">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  title={!isExpanded ? item.label : undefined}
                >
                  <Icon size={16} className="nav-icon" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Divider */}
          <div className="sidebar-divider" />

          {/* Recent Chats Section */}
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
          <div className="sidebar-profile-section">
            {currentUser ? (
              <div
                className="sidebar-profile-card"
                onClick={onOpenAuth}
                title={!isExpanded ? `${currentUser.name} (${currentUser.role || 'Instructor'})` : 'Account details & profile'}
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
                    <span className="sidebar-profile-sub">
                      {currentUser.department || currentUser.role || 'Instructor'}
                    </span>
                    <span className="sidebar-profile-email" title={currentUser.email || userHandle}>
                      {userHandle}
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
                title={!isExpanded ? 'Instructor sign in' : 'Sign in as instructor to manage curriculum and assessments'}
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
