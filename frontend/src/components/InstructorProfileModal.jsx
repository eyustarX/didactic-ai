import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Building2,
  Mail,
  GraduationCap,
  BookOpen,
  CheckCircle2,
  Plus,
  Trash2,
  ShieldCheck,
  Save,
  Award,
} from 'lucide-react';

export default function InstructorProfileModal({
  isOpen,
  onClose,
  currentUser,
  onSave,
}) {
  const [title, setTitle] = useState('Dr.');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [institution, setInstitution] = useState('University Faculty of Science');
  const [department, setDepartment] = useState('Computer Science & AI');
  const [facultyId, setFacultyId] = useState('FAC-2026-8842');
  const [courses, setCourses] = useState([
    { id: 'c1', code: 'CS301', name: 'Machine Learning & Neural Systems', term: 'Fall 2026', students: 64 },
    { id: 'c2', code: 'DATA102', name: 'Advanced Data Structures & Algorithms', term: 'Fall 2026', students: 82 },
    { id: 'c3', code: 'AI404', name: 'Deep Learning & NLP', term: 'Spring 2027', students: 45 },
  ]);

  // Inline state for adding a new course
  const [isAddingCourse, setIsAddingCourse] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newTerm, setNewTerm] = useState('Fall 2026');
  const [newStudents, setNewStudents] = useState(40);
  const [isSaved, setIsSaved] = useState(false);

  // Sync state with currentUser whenever modal opens or currentUser updates
  useEffect(() => {
    if (currentUser) {
      setTitle(currentUser.title || 'Dr.');
      setName(currentUser.name || 'Dr. Sarah Chen');
      setEmail(currentUser.email || 'instructor@university.edu');
      setInstitution(currentUser.institution || 'Stanford University');
      setDepartment(currentUser.department || 'Computer Science & AI');
      setFacultyId(currentUser.facultyId || 'FAC-2026-8842');
      if (Array.isArray(currentUser.courses) && currentUser.courses.length > 0) {
        setCourses(currentUser.courses);
      }
    }
  }, [currentUser, isOpen]);

  if (!isOpen) return null;

  const handleAddCourse = (e) => {
    e.preventDefault();
    if (!newCode.trim() || !newName.trim()) return;

    const newCourseObj = {
      id: `course_${Date.now()}`,
      code: newCode.trim().toUpperCase(),
      name: newName.trim(),
      term: newTerm.trim() || 'Fall 2026',
      students: Number(newStudents) || 30,
    };

    setCourses((prev) => [...prev, newCourseObj]);
    setNewCode('');
    setNewName('');
    setIsAddingCourse(false);
  };

  const handleRemoveCourse = (courseId) => {
    setCourses((prev) => prev.filter((c) => c.id !== courseId));
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();
    const updatedUser = {
      ...currentUser,
      title,
      name: name.trim() || 'Instructor',
      email: email.trim() || 'instructor@university.edu',
      institution: institution.trim() || 'University',
      department: department.trim() || 'Academic Department',
      facultyId: facultyId.trim() || 'FAC-2026-0001',
      courses,
    };

    if (onSave) {
      onSave(updatedUser);
    }

    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 600);
  };

  const userInitial = name
    ? name.trim().replace(/^(Dr\.|Prof\.|Mr\.|Ms\.|Mrs\.)\s*/i, '').slice(0, 1).toUpperCase()
    : 'U';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2100,
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        animation: 'fadeIn 0.2s ease',
      }}
      onClick={onClose}
    >
      <div
        className="cartesia-card"
        style={{
          width: '100%',
          maxWidth: 620,
          maxHeight: '92vh',
          overflowY: 'auto',
          background: 'var(--surface)',
          borderRadius: 20,
          border: '1px solid var(--border)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.45)',
          position: 'relative',
          padding: 0,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Banner with Academic Accent Glow */}
        <div
          style={{
            position: 'relative',
            padding: '28px 28px 20px 28px',
            background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.14) 0%, rgba(94, 234, 212, 0.05) 100%)',
            borderBottom: '1px solid var(--border)',
            borderRadius: '20px 20px 0 0',
          }}
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="btn btn-ghost"
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              width: 44,
              height: 44,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text)',
              background: 'var(--surface-alt)',
              border: '1px solid var(--border)',
              cursor: 'pointer',
              transition: 'all 0.18s ease',
              padding: 0,
            }}
            title="Close profile"
            aria-label="Close profile"
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--accent)';
              e.currentTarget.style.borderColor = 'var(--accent)';
              e.currentTarget.style.transform = 'scale(1.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text)';
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <X size={22} strokeWidth={2.5} />
          </button>

          {/* Profile Identity Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'var(--accent)',
                color: 'var(--on-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '1.6rem',
                flexShrink: 0,
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.2)',
                border: '3px solid var(--surface)',
              }}
            >
              {userInitial}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <h2
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    color: 'var(--text)',
                    margin: 0,
                  }}
                >
                  {title} {name}
                </h2>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    background: 'rgba(20, 184, 166, 0.15)',
                    border: '1px solid rgba(94, 234, 212, 0.3)',
                    color: 'var(--accent)',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                  }}
                >
                  <CheckCircle2 size={12} />
                  Verified Faculty
                </span>
              </div>

              <span
                style={{
                  fontSize: '0.84rem',
                  color: 'var(--text-muted)',
                  marginTop: 3,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>{department}</span>
                <span>•</span>
                <span>{institution}</span>
              </span>

              <span
                style={{
                  fontSize: '0.74rem',
                  color: 'var(--accent)',
                  fontFamily: 'var(--font-mono)',
                  marginTop: 2,
                }}
              >
                ID: {facultyId}
              </span>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSaveProfile} style={{ padding: '24px 28px 28px 28px' }}>
          {/* SECTION 1: INSTRUCTOR CREDENTIALS */}
          <div style={{ marginBottom: 24 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: '0.86rem',
                fontWeight: 600,
                color: 'var(--text)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                marginBottom: 14,
              }}
            >
              <GraduationCap size={16} style={{ color: 'var(--accent)' }} />
              <span>Academic Credentials & Institution</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 12, marginBottom: 12 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.76rem' }}>Academic Title</label>
                <select
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input-select"
                  style={{ height: 38, padding: '0 8px', fontSize: '0.82rem' }}
                >
                  <option value="Dr.">Dr.</option>
                  <option value="Prof.">Prof.</option>
                  <option value="Assoc. Prof.">Assoc. Prof.</option>
                  <option value="Asst. Prof.">Asst. Prof.</option>
                  <option value="Lecturer">Lecturer</option>
                  <option value="Dean">Dean</option>
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.76rem' }}>Full Legal Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-text"
                  style={{ height: 38, fontSize: '0.84rem' }}
                  placeholder="e.g. Sarah Chen"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.76rem' }}>Faculty / Department</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    required
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="input-text"
                    style={{ height: 38, fontSize: '0.84rem', paddingLeft: 32 }}
                    placeholder="e.g. Computer Science & AI"
                  />
                  <Building2 size={14} style={{ position: 'absolute', left: 10, top: 12, color: 'var(--text-muted)' }} />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.76rem' }}>Institution / University</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    required
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    className="input-text"
                    style={{ height: 38, fontSize: '0.84rem', paddingLeft: 32 }}
                    placeholder="e.g. Stanford University"
                  />
                  <ShieldCheck size={14} style={{ position: 'absolute', left: 10, top: 12, color: 'var(--text-muted)' }} />
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.76rem' }}>Academic Email</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-text"
                    style={{ height: 38, fontSize: '0.84rem', paddingLeft: 32 }}
                    placeholder="faculty@university.edu"
                  />
                  <Mail size={14} style={{ position: 'absolute', left: 10, top: 12, color: 'var(--text-muted)' }} />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.76rem' }}>Faculty ID Number</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={facultyId}
                    onChange={(e) => setFacultyId(e.target.value)}
                    className="input-text"
                    style={{ height: 38, fontSize: '0.84rem', paddingLeft: 32, fontFamily: 'var(--font-mono)' }}
                    placeholder="FAC-2026-XXXX"
                  />
                  <Award size={14} style={{ position: 'absolute', left: 10, top: 12, color: 'var(--text-muted)' }} />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: ACTIVE COURSES & COHORTS */}
          <div style={{ marginBottom: 24, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: '0.86rem',
                  fontWeight: 600,
                  color: 'var(--text)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                <BookOpen size={16} style={{ color: 'var(--accent)' }} />
                <span>Active Courses & Cohorts ({courses.length})</span>
              </div>

              {!isAddingCourse && (
                <button
                  type="button"
                  onClick={() => setIsAddingCourse(true)}
                  className="btn btn-secondary btn-sm"
                  style={{
                    height: 28,
                    fontSize: '0.74rem',
                    padding: '0 8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Plus size={13} style={{ color: 'var(--accent)' }} />
                  <span>Assign Course</span>
                </button>
              )}
            </div>

            {/* Inline Add Course Panel */}
            {isAddingCourse && (
              <div
                style={{
                  background: 'var(--surface-alt)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  padding: 12,
                  marginBottom: 12,
                  animation: 'fadeIn 0.15s ease',
                }}
              >
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>
                  Assign New Course or Cohort
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 8, marginBottom: 8 }}>
                  <input
                    type="text"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    placeholder="Code (e.g. CS202)"
                    className="input-text"
                    style={{ height: 32, fontSize: '0.8rem', padding: '0 8px' }}
                  />
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Course Title (e.g. Algorithms)"
                    className="input-text"
                    style={{ height: 32, fontSize: '0.8rem', padding: '0 8px' }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="text"
                      value={newTerm}
                      onChange={(e) => setNewTerm(e.target.value)}
                      placeholder="Term (e.g. Fall 2026)"
                      className="input-text"
                      style={{ height: 30, fontSize: '0.76rem', width: 110, padding: '0 6px' }}
                    />
                    <input
                      type="number"
                      value={newStudents}
                      onChange={(e) => setNewStudents(e.target.value)}
                      placeholder="Students"
                      className="input-text"
                      style={{ height: 30, fontSize: '0.76rem', width: 90, padding: '0 6px' }}
                      title="Enrolled students count"
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => setIsAddingCourse(false)}
                      className="btn btn-ghost btn-sm"
                      style={{ height: 28, fontSize: '0.75rem', padding: '0 8px' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddCourse}
                      className="btn btn-primary btn-sm"
                      style={{ height: 28, fontSize: '0.75rem', padding: '0 10px' }}
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Courses List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {courses.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: 8 }}>
                  No active courses assigned yet.
                </div>
              ) : (
                courses.map((course) => (
                  <div
                    key={course.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      background: 'var(--surface)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 10,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <span
                        style={{
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 6,
                          background: 'rgba(94, 234, 212, 0.12)',
                          color: 'var(--accent)',
                          border: '1px solid rgba(94, 234, 212, 0.25)',
                          fontFamily: 'var(--font-mono)',
                          flexShrink: 0,
                        }}
                      >
                        {course.code}
                      </span>

                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <span
                          style={{
                            fontSize: '0.84rem',
                            fontWeight: 500,
                            color: 'var(--text)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {course.name}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {course.term} • {course.students || 45} enrolled students
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveCourse(course.id)}
                      className="btn btn-ghost btn-sm"
                      style={{
                        height: 26,
                        width: 26,
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--text-muted)',
                      }}
                      title="Remove course"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 10,
              paddingTop: 16,
              borderTop: '1px solid var(--border)',
            }}
          >
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary btn-sm"
              style={{ padding: '7px 14px', fontSize: '0.84rem' }}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="btn btn-primary btn-sm"
              style={{
                padding: '7px 16px',
                fontSize: '0.84rem',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {isSaved ? <CheckCircle2 size={14} /> : <Save size={14} />}
              <span>{isSaved ? 'Saved!' : 'Save Profile'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
