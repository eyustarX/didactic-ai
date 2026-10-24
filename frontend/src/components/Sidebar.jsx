import React from 'react';
import {
  LayoutDashboard,
  FileText,
  Award,
  FileCheck,
  GraduationCap,
  BarChart3,
  Zap,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'curriculum', label: 'Curriculum & Ingest', icon: FileText },
  { id: 'rubrics', label: 'Rubrics Studio', icon: Award },
  { id: 'assessment', label: 'Assessment Gen', icon: FileCheck },
  { id: 'grading', label: 'Decomposed Grading', icon: GraduationCap },
  { id: 'analytics', label: 'Cohort Analytics', icon: BarChart3 },
];

export default function Sidebar({
  activeTab,
  setActiveTab,
  collapsed,
  setCollapsed,
  onGoToLanding,
}) {
  const [isHovered, setIsHovered] = React.useState(false);

  const handleNavClick = (id) => {
    setActiveTab(id);
    // On small screens, close sidebar drawer after selecting a tab
    if (window.innerWidth <= 860) {
      setCollapsed(true);
    }
  };

  const isExpanded = !collapsed || isHovered;

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

          {/* Navigation Menu */}
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
        </aside>
      </div>
    </>
  );
}
