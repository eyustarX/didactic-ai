import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Loader2,
  ArrowRight,
  Plus,
  Trash2,
  Lock,
  Award,
  RefreshCw,
  FileCheck,
  Search,
  AlertCircle,
  Calendar,
  Layers,
} from 'lucide-react';
import {
  fetchAssessments,
  deleteAssessment,
  generateAssessmentFromParts,
  generateAssessment,
  generateQuestionRubric,
  updateQuestionRubric,
  fetchAssessmentDetail,
} from '../services/api';

export default function AssessmentTab({
  activeNoteId,
  lectureTitle,
  lectureContent,
  assessment,
  setAssessment,
  setActiveTab,
  currentUser,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [questionCount, setQuestionCount] = useState(3);
  const [assessmentTitle, setAssessmentTitle] = useState('');
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [generatingRubricId, setGeneratingRubricId] = useState(null);

  // Created assessments library state
  const [createdAssessments, setCreatedAssessments] = useState([]);
  const [isLoadingAssessments, setIsLoadingAssessments] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadAssessments = async () => {
    setIsLoadingAssessments(true);
    setDeleteError(null);
    try {
      const list = await fetchAssessments({ lecturerId: currentUser?.id });
      setCreatedAssessments(list || []);
      // If no active assessment is currently loaded, select the first available one
      if (!assessment && list && list.length > 0) {
        try {
          const detail = await fetchAssessmentDetail(list[0].id, currentUser?.id);
          if (detail) {
            setAssessment(detail);
          }
        } catch (e) {
          console.error('Failed to load initial assessment detail:', e);
        }
      }
    } catch (err) {
      console.warn('Failed to load created assessments list:', err);
    } finally {
      setIsLoadingAssessments(false);
    }
  };

  useEffect(() => {
    loadAssessments();
  }, [currentUser?.id]);

  // Synchronize title if assessment or lectureTitle changes
  useEffect(() => {
    if (assessment?.title) {
      setAssessmentTitle(assessment.title);
    } else if (lectureTitle) {
      setAssessmentTitle(`Assessment: ${lectureTitle}`);
    }
  }, [assessment, lectureTitle]);

  const handleSelectAssessment = async (assItem) => {
    setError(null);
    setDeleteError(null);
    try {
      const detail = await fetchAssessmentDetail(assItem.id, currentUser?.id);
      setAssessment(detail);
      if (detail.title) setAssessmentTitle(detail.title);
      setActiveQuestionIndex(0);
    } catch (err) {
      setError(err.message || 'Failed to load assessment details');
    }
  };

  const handleDeleteAssessment = async (e, assId) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this assessment?')) return;

    setDeleteError(null);
    try {
      await deleteAssessment(assId, currentUser?.id);
      if (assessment?.id === assId) {
        setAssessment(null);
        setAssessmentTitle('');
      }
      await loadAssessments();
    } catch (err) {
      setDeleteError(err.message || 'Cannot delete assessment');
    }
  };

  const handleNewAssessment = () => {
    setAssessment(null);
    setAssessmentTitle(lectureTitle ? `Assessment: ${lectureTitle}` : 'New Assessment');
    setActiveQuestionIndex(0);
    setError(null);
    setDeleteError(null);
  };

  const handleGenerateAssessment = async () => {
    if (!lectureContent && !activeNoteId) {
      setError('Please upload or select lecture notes in Curriculum & Ingest first.');
      return;
    }

    setLoading(true);
    setError(null);
    setDeleteError(null);

    const count = parseInt(questionCount, 10) || 3;

    try {
      let data;
      if (activeNoteId) {
        data = await generateAssessmentFromParts({
          lecture_note_id: activeNoteId,
          question_count: count,
          title: assessmentTitle || `Assessment: ${lectureTitle || 'Lecture'}`,
          lecturerId: currentUser?.id,
        });
      } else {
        data = await generateAssessment({
          lecture_title: lectureTitle || 'Lecture Assessment',
          lecture_content: lectureContent,
          question_count: count,
        });
      }

      setAssessment(data);
      if (data.title) setAssessmentTitle(data.title);
      setActiveQuestionIndex(0);

      // Refresh list of assessments
      await loadAssessments();
    } catch (err) {
      setError(err.message || 'Failed to generate assessment');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuestion = (idx, field, value) => {
    if (!assessment?.questions) return;
    const updated = [...assessment.questions];
    updated[idx] = { ...updated[idx], [field]: value };
    setAssessment({ ...assessment, questions: updated });
  };

  const handleAddQuestion = () => {
    const newQ = {
      id: `custom_${Date.now()}`,
      text: 'New assessment question prompt...',
      student_hint: '',
      max_marks: 10,
      source: 'teacher',
      rubric: {
        criteria: [
          { description: 'Core conceptual accuracy & domain terminology', max_points: 5 },
          { description: 'Analytical depth, worked solution or constraints', max_points: 5 },
        ],
      },
    };
    const updated = [...(assessment?.questions || []), newQ];
    setAssessment({ ...assessment, questions: updated });
    setActiveQuestionIndex(updated.length - 1);
  };

  const handleDeleteQuestion = (idx) => {
    if (!assessment?.questions) return;
    const updated = assessment.questions.filter((_, i) => i !== idx);
    setAssessment({ ...assessment, questions: updated });
    if (activeQuestionIndex >= updated.length) {
      setActiveQuestionIndex(Math.max(0, updated.length - 1));
    }
  };

  const handleRegenerateRubric = async (q, qIdx) => {
    if (!q.id) return;
    setGeneratingRubricId(q.id);
    try {
      const res = await generateQuestionRubric(q.id, currentUser?.id);
      const updatedQuestions = [...assessment.questions];
      updatedQuestions[qIdx] = { ...updatedQuestions[qIdx], rubric: res };
      setAssessment({ ...assessment, questions: updatedQuestions });
    } catch (err) {
      console.error('Failed to regenerate rubric:', err);
    } finally {
      setGeneratingRubricId(null);
    }
  };

  const handleAddCriterion = (qIdx) => {
    const updated = [...assessment.questions];
    const q = updated[qIdx];
    const criteria = [...(q.rubric?.criteria || [])];
    criteria.push({
      description: 'Specific evaluation criterion description...',
      max_points: 2.5,
      source: 'teacher',
    });
    updated[qIdx] = { ...q, rubric: { ...(q.rubric || {}), criteria } };
    setAssessment({ ...assessment, questions: updated });
  };

  const handleUpdateCriterion = (qIdx, cIdx, field, value) => {
    const updated = [...assessment.questions];
    const q = updated[qIdx];
    const criteria = [...(q.rubric?.criteria || [])];
    criteria[cIdx] = { ...criteria[cIdx], [field]: value };
    updated[qIdx] = { ...q, rubric: { ...(q.rubric || {}), criteria } };
    setAssessment({ ...assessment, questions: updated });
  };

  const handleDeleteCriterion = (qIdx, cIdx) => {
    const updated = [...assessment.questions];
    const q = updated[qIdx];
    const criteria = q.rubric?.criteria.filter((_, i) => i !== cIdx) || [];
    updated[qIdx] = { ...q, rubric: { ...(q.rubric || {}), criteria } };
    setAssessment({ ...assessment, questions: updated });
  };

  const questions = assessment?.questions || [];
  const currentQ = questions[activeQuestionIndex];
  const isLocked = assessment?.status === 'locked';

  const totalMaxPoints = questions.reduce(
    (sum, q) => sum + (parseFloat(q.max_marks || q.max_points) || 10),
    0
  );

  const filteredAssessments = createdAssessments.filter((a) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (a.title && a.title.toLowerCase().includes(q)) ||
      (a.lecture_note_name && a.lecture_note_name.toLowerCase().includes(q))
    );
  });

  return (
    <div>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Assessment & Rubrics Studio</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Generate and manage custom assessments with integrated rubrics directly from your curriculum notes.
          </p>
        </div>

        {/* Generator Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface)', padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Questions count:</span>
            <input
              type="number"
              min="1"
              max="25"
              value={questionCount}
              onChange={(e) => setQuestionCount(e.target.value)}
              className="input-text"
              style={{ width: 65, textAlign: 'center', fontSize: '0.86rem', padding: '3px 6px', height: 28 }}
              disabled={loading}
            />
          </div>

          <button
            onClick={handleGenerateAssessment}
            disabled={loading || (!lectureContent && !activeNoteId)}
            className="btn btn-primary btn-sm"
          >
            {loading ? <Loader2 size={13} className="spin" /> : <Sparkles size={13} />}
            <span>{loading ? 'Synthesizing...' : 'Generate Assessment'}</span>
          </button>

          {questions.length > 0 && (
            <button
              onClick={() => setActiveTab('grading')}
              className="btn btn-primary btn-sm"
              style={{ background: 'var(--accent)' }}
            >
              <span>Proceed to Student Grading</span>
              <ArrowRight size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Created Assessments Library Panel */}
      <div className="cartesia-card" style={{ marginBottom: 20, padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileCheck size={16} style={{ color: 'var(--accent)' }} />
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Created Assessments Library</h3>
            <span className="badge badge-outline" style={{ fontSize: '0.72rem' }}>
              {createdAssessments.length} Total
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Search Input */}
            <div style={{ position: 'relative', width: 220 }}>
              <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search assessments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-text"
                style={{ paddingLeft: 28, height: 28, fontSize: '0.8rem', width: '100%' }}
              />
            </div>

            <button
              onClick={handleNewAssessment}
              className="btn btn-secondary btn-sm"
              style={{ height: 28, fontSize: '0.78rem' }}
              title="Start drafting a new assessment"
            >
              <Plus size={12} />
              <span>New Assessment</span>
            </button>

            <button
              onClick={loadAssessments}
              disabled={isLoadingAssessments}
              className="btn btn-secondary btn-sm"
              style={{ height: 28, padding: '0 8px' }}
              title="Refresh assessments list"
            >
              <RefreshCw size={12} className={isLoadingAssessments ? 'spin' : ''} />
            </button>
          </div>
        </div>

        {deleteError && (
          <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 4, background: 'var(--danger-bg)', color: 'var(--danger)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertCircle size={14} />
            <span>{deleteError}</span>
          </div>
        )}

        {/* Assessment Cards Grid */}
        {filteredAssessments.length === 0 ? (
          <div style={{ padding: '18px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', background: 'var(--bg)', borderRadius: 6, border: '1px dashed var(--border)' }}>
            {searchQuery
              ? `No assessments match "${searchQuery}".`
              : 'No assessments found. Enter the number of questions above and click "Generate Assessment" to create your first one.'}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10, maxHeight: 220, overflowY: 'auto', paddingRight: 4 }}>
            {filteredAssessments.map((item) => {
              const isSelected = assessment?.id === item.id;
              const hasSubmissions = (item.submission_count || 0) > 0;
              const itemLocked = item.status === 'locked' || hasSubmissions;

              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectAssessment(item)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 6,
                    background: isSelected ? 'var(--surface-active, rgba(59, 130, 246, 0.08))' : 'var(--bg)',
                    border: isSelected ? '1.5px solid var(--accent)' : '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                  className="cartesia-card-interactive"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem', color: isSelected ? 'var(--accent)' : 'var(--text)', lineHeight: 1.3 }}>
                      {item.title}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {itemLocked && (
                        <span title="Locked: Graded student submissions exist" style={{ color: '#eab308' }}>
                          <Lock size={12} />
                        </span>
                      )}
                      <button
                        onClick={(e) => handleDeleteAssessment(e, item.id)}
                        disabled={hasSubmissions}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 2,
                          cursor: hasSubmissions ? 'not-allowed' : 'pointer',
                          color: hasSubmissions ? 'var(--text-muted)' : 'var(--danger)',
                          opacity: hasSubmissions ? 0.3 : 0.8,
                        }}
                        title={hasSubmissions ? 'Cannot delete assessment with graded student submissions' : 'Delete assessment'}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontSize: '0.74rem' }}>
                    <span className="badge badge-outline" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                      {item.question_count || 0} Questions
                    </span>
                    <span className="badge badge-outline" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                      {item.max_score || 0} pts
                    </span>
                    {hasSubmissions && (
                      <span className="badge badge-accent" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                        {item.submission_count} Graded
                      </span>
                    )}
                    <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>
                      {item.created_at ? item.created_at.slice(0, 10) : 'Recent'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isLocked && (
        <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 6, background: 'rgba(234, 179, 8, 0.12)', border: '1px solid rgba(234, 179, 8, 0.4)', color: '#eab308', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.84rem' }}>
          <Lock size={15} />
          <span>This assessment is server-locked because student work has been submitted or graded. Questions and rubrics are immutable.</span>
        </div>
      )}

      {error && (
        <div style={{ marginBottom: 16, padding: 12, borderRadius: 6, background: 'var(--danger-bg)', color: 'var(--danger)', fontSize: '0.84rem' }}>
          {error}
        </div>
      )}

      {/* Main Studio View */}
      {questions.length === 0 ? (
        <div className="cartesia-card" style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
          <FileCheck size={36} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
          <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
            {assessment ? 'No Questions in Active Assessment' : 'No Assessment Selected'}
          </h3>
          <p style={{ fontSize: '0.84rem', maxWidth: 440, margin: '0 auto 16px' }}>
            Select an assessment from the library above or enter a question count and click <strong>Generate Assessment</strong>.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16 }}>
          {/* Left Column: Questions List */}
          <div className="cartesia-card" style={{ height: 'fit-content' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h3 style={{ fontSize: '0.88rem', fontWeight: 600 }}>Questions ({questions.length})</h3>
              <span className="badge badge-accent">{totalMaxPoints} pts total</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
              {questions.map((q, idx) => {
                const isSelected = activeQuestionIndex === idx;
                return (
                  <div
                    key={q.id || idx}
                    onClick={() => setActiveQuestionIndex(idx)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 4,
                      cursor: 'pointer',
                      background: isSelected ? 'var(--accent-subtle, rgba(59, 130, 246, 0.12))' : 'var(--surface)',
                      border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.82rem', color: isSelected ? 'var(--accent)' : 'var(--text)' }}>
                        Question {idx + 1}
                      </span>
                      <span className="badge badge-outline" style={{ fontSize: '0.68rem' }}>
                        {q.max_marks || q.max_points || 10} pts
                      </span>
                    </div>
                    <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 3 }}>
                      {q.text || q.prompt || 'Drafting question...'}
                    </p>
                  </div>
                );
              })}
            </div>

            {!isLocked && (
              <button onClick={handleAddQuestion} className="btn btn-secondary btn-sm" style={{ width: '100%' }}>
                <Plus size={13} />
                <span>Add Question</span>
              </button>
            )}
          </div>

          {/* Right Column: Question & Rubrics Detail */}
          {currentQ && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Question Editor Card */}
              <div className="cartesia-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="badge badge-accent">Question {activeQuestionIndex + 1}</span>
                    <span className="badge badge-outline">
                      {currentQ.source === 'teacher' ? 'Author: Teacher' : 'Author: AI'}
                    </span>
                  </div>

                  {!isLocked && questions.length > 1 && (
                    <button
                      onClick={() => handleDeleteQuestion(activeQuestionIndex)}
                      className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--danger)' }}
                      title="Delete question"
                    >
                      <Trash2 size={14} />
                      <span>Delete</span>
                    </button>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Question Prompt</label>
                  <textarea
                    rows={3}
                    value={currentQ.text || currentQ.prompt || ''}
                    onChange={(e) => handleUpdateQuestion(activeQuestionIndex, 'text', e.target.value)}
                    disabled={isLocked}
                    className="input-textarea"
                    style={{ fontSize: '0.88rem' }}
                    placeholder="Enter the examination question prompt..."
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Max Marks</label>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      value={currentQ.max_marks || currentQ.max_points || 10}
                      onChange={(e) => handleUpdateQuestion(activeQuestionIndex, 'max_marks', parseFloat(e.target.value) || 10)}
                      disabled={isLocked}
                      className="input-text"
                      style={{ fontSize: '0.86rem' }}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Student Hint (Optional)</label>
                    <input
                      type="text"
                      value={currentQ.student_hint || ''}
                      onChange={(e) => handleUpdateQuestion(activeQuestionIndex, 'student_hint', e.target.value)}
                      disabled={isLocked}
                      className="input-text"
                      style={{ fontSize: '0.86rem' }}
                      placeholder="e.g. Consider mutual exclusion vs deadlock conditions..."
                    />
                  </div>
                </div>
              </div>

              {/* Rubric Card for this Question */}
              <div className="cartesia-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Award size={16} style={{ color: 'var(--accent)' }} />
                    <h3 style={{ fontSize: '0.92rem', fontWeight: 600 }}>Grading Rubric for Question {activeQuestionIndex + 1}</h3>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    {currentQ.id && !isLocked && (
                      <button
                        onClick={() => handleRegenerateRubric(currentQ, activeQuestionIndex)}
                        disabled={generatingRubricId === currentQ.id}
                        className="btn btn-secondary btn-sm"
                        title="Regenerate rubric with AI"
                      >
                        <RefreshCw size={12} className={generatingRubricId === currentQ.id ? 'spin' : ''} />
                        <span>Regenerate Rubric</span>
                      </button>
                    )}
                    {!isLocked && (
                      <button
                        onClick={() => handleAddCriterion(activeQuestionIndex)}
                        className="btn btn-secondary btn-sm"
                      >
                        <Plus size={12} />
                        <span>Add Criterion</span>
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(currentQ.rubric?.criteria || []).length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      No rubric criteria defined. Click Add Criterion or Regenerate Rubric above.
                    </div>
                  ) : (
                    currentQ.rubric.criteria.map((crit, cIdx) => (
                      <div
                        key={crit.id || cIdx}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 90px auto',
                          gap: 10,
                          alignItems: 'center',
                          padding: '8px 10px',
                          borderRadius: 4,
                          background: 'var(--surface)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <input
                          type="text"
                          value={crit.description || crit.name || ''}
                          onChange={(e) => handleUpdateCriterion(activeQuestionIndex, cIdx, 'description', e.target.value)}
                          disabled={isLocked}
                          className="input-text"
                          style={{ fontSize: '0.82rem' }}
                          placeholder="Criterion description..."
                        />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <input
                            type="number"
                            step="0.5"
                            value={crit.max_points ?? crit.max_score ?? 0}
                            onChange={(e) => handleUpdateCriterion(activeQuestionIndex, cIdx, 'max_points', parseFloat(e.target.value) || 0)}
                            disabled={isLocked}
                            className="input-text"
                            style={{ fontSize: '0.82rem', textAlign: 'center' }}
                          />
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>pts</span>
                        </div>
                        {!isLocked && (
                          <button
                            onClick={() => handleDeleteCriterion(activeQuestionIndex, cIdx)}
                            className="btn btn-ghost btn-sm"
                            style={{ padding: 4, color: 'var(--text-muted)' }}
                            title="Remove criterion"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
