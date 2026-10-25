import React, { useState, useEffect } from 'react';
import {
  Layers,
  FileCheck,
  Search,
  Plus,
  RefreshCw,
  AlertCircle,
  Lock,
  Trash2,
  Download,
  FileText,
  GraduationCap,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Sparkles,
  Loader2,
} from 'lucide-react';
import {
  fetchAssessments,
  fetchAssessmentDetail,
  deleteAssessment,
  downloadAssessmentPdf,
} from '../services/api';

export default function AssessmentsLibraryTab({
  currentUser,
  assessment,
  setAssessment,
  setActiveTab,
}) {
  const [assessments, setAssessments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'draft' | 'locked'
  const [assessmentToDelete, setAssessmentToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadError, setDownloadError] = useState(null);

  const loadAssessments = async () => {
    setIsLoading(true);
    setDeleteError(null);
    setDownloadError(null);
    try {
      const list = await fetchAssessments({ lecturerId: currentUser?.id });
      setAssessments(Array.isArray(list) ? list : []);
    } catch (err) {
      console.warn('Failed to load assessments library:', err);
      setAssessments([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAssessments();
  }, [currentUser?.id]);

  const handleOpenInStudio = async (item) => {
    try {
      const detail = await fetchAssessmentDetail(item.id, currentUser?.id);
      if (detail && setAssessment) {
        setAssessment(detail);
      }
      if (setActiveTab) {
        setActiveTab('assessment');
      }
    } catch (e) {
      console.error('Failed to open assessment in studio:', e);
      if (setAssessment) setAssessment(item);
      if (setActiveTab) setActiveTab('assessment');
    }
  };

  const handleOpenInGrading = async (item) => {
    try {
      const detail = await fetchAssessmentDetail(item.id, currentUser?.id);
      if (detail && setAssessment) {
        setAssessment(detail);
      }
      if (setActiveTab) {
        setActiveTab('grading');
      }
    } catch (e) {
      console.error('Failed to open assessment in grading:', e);
      if (setAssessment) setAssessment(item);
      if (setActiveTab) setActiveTab('grading');
    }
  };

  const handleDownloadPdf = async (e, assId, solutions = false) => {
    if (e) e.stopPropagation();
    setDownloadingId(`${assId}-${solutions ? 'key' : 'exam'}`);
    setDownloadError(null);
    try {
      const fallback = assessments.find((a) => a.id === assId);
      await downloadAssessmentPdf(assId, solutions, currentUser?.id, fallback);
    } catch (err) {
      setDownloadError(err.message || 'Failed to download PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  const confirmDelete = async () => {
    if (!assessmentToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteAssessment(assessmentToDelete.id, currentUser?.id);
      if (assessment?.id === assessmentToDelete.id && setAssessment) {
        setAssessment(null);
      }
      setAssessmentToDelete(null);
      await loadAssessments();
    } catch (err) {
      setDeleteError(err.message || 'Cannot delete assessment from database');
    } finally {
      setIsDeleting(false);
    }
  };

  const filtered = assessments.filter((a) => {
    const matchesSearch =
      !searchQuery.trim() ||
      (a.title && a.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (a.lecture_note_name && a.lecture_note_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const isLocked = a.status === 'locked' || (a.submission_count || 0) > 0;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'locked' && isLocked) ||
      (statusFilter === 'draft' && !isLocked);

    return matchesSearch && matchesStatus;
  });

  const totalQuestions = assessments.reduce((sum, a) => sum + (a.question_count || 0), 0);
  const totalSubmissions = assessments.reduce((sum, a) => sum + (a.submission_count || 0), 0);
  const lockedCount = assessments.filter((a) => a.status === 'locked' || (a.submission_count || 0) > 0).length;

  return (
    <div>
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: 'var(--accent)',
                color: 'var(--on-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Layers size={16} />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>
              Assessments & Examination Library
            </h2>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.86rem', margin: 0 }}>
            {currentUser?.name
              ? `Browse, review, download, and grade all examination papers generated by ${currentUser.name}.`
              : 'Browse, review, download, and grade all examination papers generated for your classes.'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={loadAssessments}
            disabled={isLoading}
            className="btn btn-secondary btn-sm"
            style={{ height: 32, padding: '0 10px', display: 'flex', alignItems: 'center', gap: 6 }}
            title="Refresh assessments list"
          >
            <RefreshCw size={13} className={isLoading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>

          {setActiveTab && (
            <button
              onClick={() => setActiveTab('assessment')}
              className="btn btn-primary btn-sm"
              style={{ height: 32, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={14} />
              <span>Create New Assessment</span>
            </button>
          )}
        </div>
      </div>

      {/* Overview Metric Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div className="cartesia-card" style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
            Total Assessments
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text)', marginTop: 4 }}>
            {assessments.length}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Generated by active instructor
          </div>
        </div>

        <div className="cartesia-card" style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
            Questions Synthesized
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--accent)', marginTop: 4 }}>
            {totalQuestions}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2 }}>
            MCQs & analytical questions
          </div>
        </div>

        <div className="cartesia-card" style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
            Graded Submissions
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text)', marginTop: 4 }}>
            {totalSubmissions}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Across all classes & tests
          </div>
        </div>

        <div className="cartesia-card" style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
            Active / Locked Exams
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: lockedCount > 0 ? 'var(--warning)' : 'var(--text)', marginTop: 4 }}>
            {lockedCount} <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-muted)' }}>/ {assessments.length}</span>
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Locked against rubric modifications
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div
        className="cartesia-card"
        style={{
          padding: '12px 16px',
          marginBottom: 18,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ position: 'relative', width: 320, maxWidth: '100%' }}>
          <Search
            size={15}
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
          <input
            type="text"
            placeholder="Search by title or lecture material..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-text"
            style={{ paddingLeft: 32, height: 34, fontSize: '0.84rem', width: '100%' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Status:</span>
          <div style={{ display: 'flex', gap: 4, background: 'var(--bg)', padding: 3, borderRadius: 6, border: '1px solid var(--border)' }}>
            <button
              onClick={() => setStatusFilter('all')}
              className={`btn btn-sm ${statusFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ height: 26, padding: '0 10px', fontSize: '0.76rem', border: 'none' }}
            >
              All ({assessments.length})
            </button>
            <button
              onClick={() => setStatusFilter('draft')}
              className={`btn btn-sm ${statusFilter === 'draft' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ height: 26, padding: '0 10px', fontSize: '0.76rem', border: 'none' }}
            >
              Drafts ({assessments.length - lockedCount})
            </button>
            <button
              onClick={() => setStatusFilter('locked')}
              className={`btn btn-sm ${statusFilter === 'locked' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ height: 26, padding: '0 10px', fontSize: '0.76rem', border: 'none' }}
            >
              Locked ({lockedCount})
            </button>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {deleteError && (
        <div
          style={{
            marginBottom: 16,
            padding: '10px 14px',
            borderRadius: 6,
            background: 'var(--danger-bg)',
            color: 'var(--danger)',
            fontSize: '0.82rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <AlertCircle size={15} />
          <span>{deleteError}</span>
        </div>
      )}

      {downloadError && (
        <div
          style={{
            marginBottom: 16,
            padding: '10px 14px',
            borderRadius: 6,
            background: 'var(--danger-bg)',
            color: 'var(--danger)',
            fontSize: '0.82rem',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <AlertCircle size={15} />
          <span>{downloadError}</span>
        </div>
      )}

      {/* Assessments Grid */}
      {filtered.length === 0 ? (
        <div
          className="cartesia-card"
          style={{
            textAlign: 'center',
            padding: '50px 20px',
            color: 'var(--text-muted)',
            border: '1px dashed var(--border)',
          }}
        >
          <FileCheck size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
            {searchQuery
              ? `No assessments match "${searchQuery}"`
              : currentUser?.name
              ? `No assessments generated yet by ${currentUser.name}`
              : 'No assessments found'}
          </h3>
          <p style={{ fontSize: '0.84rem', maxWidth: 460, margin: '0 auto 18px' }}>
            {searchQuery
              ? 'Try modifying your search keywords or clear the filter.'
              : 'Generate assessments from lecture notes in the Assessment Studio to build quizzes, problem sets, and exams.'}
          </p>
          {setActiveTab && (
            <button
              onClick={() => setActiveTab('assessment')}
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Sparkles size={14} />
              <span>Go to Assessment Studio</span>
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
          {filtered.map((item) => {
            const isSelected = assessment?.id === item.id;
            const hasSubmissions = (item.submission_count || 0) > 0;
            const itemLocked = item.status === 'locked' || hasSubmissions;
            const isDownloadingExam = downloadingId === `${item.id}-exam`;
            const isDownloadingKey = downloadingId === `${item.id}-key`;

            return (
              <div
                key={item.id}
                className="cartesia-card cartesia-card-interactive"
                style={{
                  padding: '16px 18px',
                  borderRadius: 8,
                  background: isSelected ? 'var(--surface-alt)' : 'var(--surface)',
                  border: isSelected ? '1.5px solid var(--accent)' : '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: 12,
                  transition: 'all 0.15s ease',
                }}
              >
                <div>
                  {/* Card Header: Source lecture note and lock badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, overflow: 'hidden' }}>
                      <BookOpen size={12} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                      <span
                        style={{
                          fontSize: '0.74rem',
                          color: 'var(--text-muted)',
                          textOverflow: 'ellipsis',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          maxWidth: 200,
                        }}
                        title={item.lecture_note_name || 'Lecture Note'}
                      >
                        {item.lecture_note_name || 'Lecture Note'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      {itemLocked ? (
                        <span
                          className="badge"
                          style={{
                            background: 'var(--warning-bg)',
                            color: 'var(--warning)',
                            fontSize: '0.68rem',
                            padding: '1px 6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 3,
                          }}
                          title="Locked: Graded submissions exist"
                        >
                          <Lock size={10} />
                          <span>Locked</span>
                        </span>
                      ) : (
                        <span
                          className="badge"
                          style={{
                            background: 'var(--surface-alt)',
                            color: 'var(--accent)',
                            fontSize: '0.68rem',
                            padding: '1px 6px',
                          }}
                        >
                          Draft
                        </span>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setAssessmentToDelete(item);
                        }}
                        disabled={hasSubmissions}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 4,
                          cursor: hasSubmissions ? 'not-allowed' : 'pointer',
                          color: hasSubmissions ? 'var(--text-muted)' : 'var(--danger)',
                          opacity: hasSubmissions ? 0.35 : 0.85,
                          borderRadius: 4,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        title={
                          hasSubmissions
                            ? 'Cannot delete assessment: Graded student submissions exist'
                            : 'Delete assessment'
                        }
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Title */}
                  <h3
                    style={{
                      fontSize: '0.98rem',
                      fontWeight: 600,
                      color: isSelected ? 'var(--accent)' : 'var(--text)',
                      margin: '0 0 8px 0',
                      lineHeight: 1.35,
                    }}
                  >
                    {item.title}
                  </h3>

                  {/* Badges / Specs */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                    <span className="badge badge-outline" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
                      {item.question_count || 0} Questions
                    </span>
                    <span className="badge badge-outline" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
                      {item.max_score || 0} Total Marks
                    </span>
                    <span className="badge badge-outline" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
                      v{item.version || 1}.0
                    </span>
                    {hasSubmissions && (
                      <span className="badge badge-accent" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
                        {item.submission_count} Graded Submissions
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Actions & Footer */}
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={11} />
                      <span>{item.created_at ? item.created_at.slice(0, 10) : 'Recent'}</span>
                    </span>
                    {isSelected && (
                      <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Active Selection</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => handleOpenInStudio(item)}
                        className="btn btn-primary btn-sm"
                        style={{ height: 28, fontSize: '0.76rem', padding: '0 10px', display: 'flex', alignItems: 'center', gap: 4 }}
                        title="Open and edit this exam in the Assessment Studio"
                      >
                        <FileCheck size={12} />
                        <span>Edit Exam</span>
                      </button>

                      <button
                        onClick={() => handleOpenInGrading(item)}
                        className="btn btn-secondary btn-sm"
                        style={{ height: 28, fontSize: '0.76rem', padding: '0 10px', display: 'flex', alignItems: 'center', gap: 4 }}
                        title="Grade student papers for this exam"
                      >
                        <GraduationCap size={12} />
                        <span>Grade Class</span>
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        onClick={(e) => handleDownloadPdf(e, item.id, false)}
                        disabled={isDownloadingExam}
                        className="btn btn-secondary btn-sm"
                        style={{ height: 28, padding: '0 8px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 4 }}
                        title="Download printable student exam paper PDF"
                      >
                        {isDownloadingExam ? <Loader2 size={11} className="spin" /> : <Download size={11} />}
                        <span>Paper</span>
                      </button>

                      <button
                        onClick={(e) => handleDownloadPdf(e, item.id, true)}
                        disabled={isDownloadingKey}
                        className="btn btn-secondary btn-sm"
                        style={{ height: 28, padding: '0 8px', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 4 }}
                        title="Download official solution key PDF with rubrics"
                      >
                        {isDownloadingKey ? <Loader2 size={11} className="spin" /> : <FileText size={11} />}
                        <span>Key</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {assessmentToDelete && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.72)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
          onClick={() => !isDeleting && setAssessmentToDelete(null)}
        >
          <div
            className="cartesia-card"
            style={{
              maxWidth: 440,
              width: '100%',
              padding: 24,
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              boxShadow: '0 12px 36px rgba(0,0,0,0.4)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'var(--danger-bg)',
                  color: 'var(--danger)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Trash2 size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: 'var(--text)' }}>
                  Delete Assessment?
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, marginTop: 2 }}>
                  This action permanently removes the assessment and rubrics from your library.
                </p>
              </div>
            </div>

            <p style={{ fontSize: '0.84rem', color: 'var(--text)', lineHeight: 1.5, marginBottom: 16 }}>
              Are you sure you want to permanently delete <strong style={{ color: 'var(--text)' }}>"{assessmentToDelete.title}"</strong>?
            </p>

            {deleteError && (
              <div
                style={{
                  marginBottom: 14,
                  padding: '8px 12px',
                  borderRadius: 4,
                  background: 'var(--danger-bg)',
                  color: 'var(--danger)',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <AlertCircle size={14} />
                <span>{deleteError}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setAssessmentToDelete(null)}
                disabled={isDeleting}
                className="btn btn-secondary btn-sm"
                style={{ height: 32 }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="btn btn-sm"
                style={{
                  height: 32,
                  background: 'var(--danger)',
                  color: '#fff',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {isDeleting ? <Loader2 size={13} className="spin" /> : <Trash2 size={13} />}
                <span>{isDeleting ? 'Deleting...' : 'Delete Permanently'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
