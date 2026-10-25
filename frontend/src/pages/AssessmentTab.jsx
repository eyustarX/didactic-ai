import React, { useState, useEffect, useRef } from 'react';
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
  Bot,
  Send,
  MessageSquare,
  RotateCcw,
  CheckCircle2,
  Download,
  FileText,
  TrendingUp,
  GraduationCap,
  Paperclip,
  Upload,
  BookOpen,
} from 'lucide-react';
import {
  fetchAssessments,
  deleteAssessment,
  generateAssessmentFromParts,
  generateAssessment,
  generateQuestionRubric,
  generateRubricFromQuestion,
  updateQuestionRubric,
  fetchAssessmentDetail,
  copilotChat,
  downloadAssessmentPdf,
  fetchLectureNotes,
  fetchLectureNoteDetail,
  uploadLectureNote,
} from '../services/api';

export default function AssessmentTab({
  activeNoteId,
  setActiveNoteId,
  lectureTitle,
  setLectureTitle,
  lectureContent,
  setLectureContent,
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
  const [copilotPrompt, setCopilotPrompt] = useState('');
  const [assessmentToDelete, setAssessmentToDelete] = useState(null);
  const [isDeletingAssessment, setIsDeletingAssessment] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Assessment vs Assignment Studio Mode
  const [assessmentType, setAssessmentType] = useState('exam'); // 'exam' | 'assignment'
  const [isRubricModalOpen, setIsRubricModalOpen] = useState(false);
  const [customQuestionPrompt, setCustomQuestionPrompt] = useState('');
  const [customQuestionMarks, setCustomQuestionMarks] = useState(10);
  const [isGeneratingCustomRubric, setIsGeneratingCustomRubric] = useState(false);

  // Interactive Assessment Chatbot State (Didactic AI)
  const [chatMessages, setChatMessages] = useState([
    {
      id: 'init-1',
      role: 'assistant',
      content:
        "👋 Hello Professor! What assessment would you like to build? Tell me your topics, question formats (e.g. 5 MCQs, 2 Short Answer), and marks per question.",
      readyToGenerate: false,
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(true);
  const chatContainerRef = useRef(null);
  const chatInputRef = useRef(null);

  // Uploaded Lecture Materials / Sources state in Chat
  const [lectureNotesList, setLectureNotesList] = useState([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [isUploadingChatFile, setIsUploadingChatFile] = useState(false);
  const chatFileInputRef = useRef(null);

  const loadNotesList = async () => {
    setIsLoadingNotes(true);
    try {
      const notes = await fetchLectureNotes(currentUser?.id);
      if (Array.isArray(notes)) {
        setLectureNotesList(notes);
        if (!activeNoteId && notes.length > 0 && setActiveNoteId) {
          const first = notes[0];
          setActiveNoteId(first.id);
          if (setLectureTitle && first.name) setLectureTitle(first.name);
          try {
            const detail = await fetchLectureNoteDetail(first.id, currentUser?.id);
            if (detail?.extracted_text && setLectureContent) {
              setLectureContent(detail.extracted_text);
            }
          } catch (e) {}
        }
      }
    } catch (e) {
      console.warn('Failed to load lecture notes list in AssessmentTab:', e);
    } finally {
      setIsLoadingNotes(false);
    }
  };

  useEffect(() => {
    loadNotesList();
  }, [currentUser?.id]);

  const handleSelectSourceNote = async (noteId) => {
    if (!noteId) return;
    try {
      const detail = await fetchLectureNoteDetail(noteId, currentUser?.id);
      if (detail) {
        if (setActiveNoteId) setActiveNoteId(detail.id);
        if (setLectureTitle) setLectureTitle(detail.name);
        if (setLectureContent) setLectureContent(detail.extracted_text || '');

        setChatMessages((prev) => [
          ...prev,
          {
            id: `source-change-${Date.now()}`,
            role: 'assistant',
            content: `📚 Source material switched to: **${detail.name}** (${(detail.file_type || 'PDF').toUpperCase()}).\nTell me what topics or questions you'd like to build from this document!`,
            readyToGenerate: false,
          },
        ]);
      }
    } catch (err) {
      console.error('Failed to switch lecture note in chat:', err);
    }
  };

  const handleChatFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingChatFile(true);
    try {
      const uploadedNote = await uploadLectureNote({
        file,
        noteTitle: file.name.replace(/\.[^/.]+$/, ''),
        lecturerId: currentUser?.id,
      });

      if (setActiveNoteId) setActiveNoteId(uploadedNote.id);
      if (setLectureTitle) setLectureTitle(uploadedNote.name);
      if (setLectureContent) setLectureContent(uploadedNote.extracted_text || '');

      loadNotesList();

      setChatMessages((prev) => [
        ...prev,
        {
          id: `upload-${Date.now()}`,
          role: 'assistant',
          content: `📄 Successfully uploaded and indexed **${uploadedNote.name}**!\n\nI am ready to build questions from this material. What question formats (e.g. 5 MCQs, 2 Short Answer) and marks would you like?`,
          readyToGenerate: false,
        },
      ]);
    } catch (err) {
      console.error('Chat file upload failed:', err);
      setChatMessages((prev) => [
        ...prev,
        {
          id: `upload-err-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ Failed to upload file: ${err.message || 'Please check connection'}.`,
          readyToGenerate: false,
        },
      ]);
    } finally {
      setIsUploadingChatFile(false);
      if (chatFileInputRef.current) {
        chatFileInputRef.current.value = '';
      }
    }
  };

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages, isChatLoading]);

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

  const confirmDeleteAssessment = async () => {
    if (!assessmentToDelete) return;
    setIsDeletingAssessment(true);
    setDeleteError(null);
    try {
      await deleteAssessment(assessmentToDelete.id, currentUser?.id);
      if (assessment?.id === assessmentToDelete.id) {
        setAssessment(null);
        setAssessmentTitle('');
      }
      setAssessmentToDelete(null);
      await loadAssessments();
    } catch (err) {
      setDeleteError(err.message || 'Cannot delete assessment from database');
    } finally {
      setIsDeletingAssessment(false);
    }
  };

  const handleDownloadPdf = async (e, assId, solutions = false, customData = null) => {
    if (e) e.stopPropagation();
    setIsDownloadingPdf(true);
    setError(null);
    try {
      const fallback = customData || (assessment?.id === assId ? assessment : createdAssessments.find((a) => a.id === assId)) || assessment;
      await downloadAssessmentPdf(assId, solutions, currentUser?.id, fallback);
    } catch (err) {
      setError(err.message || 'Failed to download exam PDF');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleNewAssessment = () => {
    setAssessment(null);
    setAssessmentTitle(lectureTitle ? `Assessment: ${lectureTitle}` : 'New Assessment');
    setActiveQuestionIndex(0);
    setError(null);
    setDeleteError(null);
  };

  const handleGenerateAssessment = async (overridePrompt, overrideCount) => {
    if (!lectureContent && !activeNoteId) {
      setError('Please upload or select lecture notes in Curriculum & Ingest first.');
      return;
    }

    setLoading(true);
    setError(null);
    setDeleteError(null);

    const promptToUse = typeof overridePrompt === 'string' ? overridePrompt : copilotPrompt;
    const count = parseInt(overrideCount || questionCount, 10) || 3;
    if (overrideCount) setQuestionCount(count);

    try {
      let data;
      if (activeNoteId) {
        data = await generateAssessmentFromParts({
          lecture_note_id: activeNoteId,
          question_count: count,
          title: assessmentTitle || `Assessment: ${lectureTitle || 'Lecture'}`,
          prompt: promptToUse?.trim() || undefined,
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

  const handleSendChatMessage = async (presetText) => {
    const textToSend = (typeof presetText === 'string' ? presetText : chatInput).trim();
    if (!textToSend || isChatLoading) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend,
    };

    const newHistory = [...chatMessages, userMsg];
    setChatMessages(newHistory);
    setChatInput('');
    if (chatInputRef.current) {
      chatInputRef.current.style.height = '40px';
    }
    setIsChatLoading(true);
    setError(null);

    try {
      const payloadMessages = newHistory.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const resp = await copilotChat({
        messages: payloadMessages,
        lecture_note_id: activeNoteId,
        lecture_title: lectureTitle,
        lecturerId: currentUser?.id,
      });

      const assistantMsg = {
        id: `asst-${Date.now()}`,
        role: 'assistant',
        content: resp.reply || "I've noted that! What else would you like to configure?",
        readyToGenerate: !!resp.ready_to_generate,
        suggestedPrompt: resp.suggested_prompt || textToSend,
        questionCount: resp.question_count || questionCount,
      };

      if (resp.question_count) {
        setQuestionCount(resp.question_count);
      }
      if (resp.suggested_prompt) {
        setCopilotPrompt(resp.suggested_prompt);
      }

      setChatMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Chat error:', err);
      setChatMessages((prev) => [
        ...prev,
        {
          id: `asst-err-${Date.now()}`,
          role: 'assistant',
          content:
            "I ran into an issue connecting to the AI agent. Please ensure the backend is reachable and try again.",
          readyToGenerate: false,
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleResetChat = () => {
    setChatMessages([
      {
        id: `init-${Date.now()}`,
        role: 'assistant',
        content:
          "Chat reset. What assessment would you like to build next?",
        readyToGenerate: false,
      },
    ]);
    setChatInput('');
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

  const handleBuildRubricFromPrompt = async (q, qIdx) => {
    const prompt = (q.text || q.prompt || '').trim();
    if (!prompt) {
      setError('Please enter a question prompt first before generating a rubric.');
      return;
    }
    setGeneratingRubricId(q.id || `q-${qIdx}`);
    setError(null);
    try {
      const maxMarks = parseFloat(q.max_marks || q.max_points) || 10;
      const res = await generateRubricFromQuestion({
        question_text: prompt,
        max_marks: maxMarks,
        lecture_note_id: activeNoteId,
        lecturerId: currentUser?.id,
      });

      const updatedQuestions = [...(assessment?.questions || [])];
      const currentItem = updatedQuestions[qIdx] || q;
      updatedQuestions[qIdx] = {
        ...currentItem,
        rubric: res,
        student_hint: res.model_solution ? `Official Model Solution: ${res.model_solution}` : currentItem.student_hint,
        reference_answer: res.model_solution || currentItem.reference_answer,
      };
      setAssessment({ ...(assessment || {}), questions: updatedQuestions });
    } catch (err) {
      console.error('Failed to generate rubric for question:', err);
      setError(err.message || 'Failed to generate rubric criteria for this question.');
    } finally {
      setGeneratingRubricId(null);
    }
  };

  const handleCreateCustomQuestionWithRubric = async () => {
    if (!customQuestionPrompt.trim()) return;
    setIsGeneratingCustomRubric(true);
    setError(null);
    try {
      const marks = parseFloat(customQuestionMarks) || 10;
      const res = await generateRubricFromQuestion({
        question_text: customQuestionPrompt.trim(),
        max_marks: marks,
        lecture_note_id: activeNoteId,
        lecturerId: currentUser?.id,
      });

      const newQ = {
        id: `custom_${Date.now()}`,
        text: customQuestionPrompt.trim(),
        student_hint: res.model_solution ? `Official Model Solution: ${res.model_solution}` : '',
        reference_answer: res.model_solution || '',
        max_marks: marks,
        source: 'teacher',
        rubric: res,
      };

      const updated = [...(assessment?.questions || []), newQ];
      setAssessment({
        ...(assessment || {
          id: `draft_${Date.now()}`,
          title: assessmentTitle || (assessmentType === 'assignment' ? 'Coursework Assignment' : 'Examination Paper'),
        }),
        questions: updated,
      });
      setActiveQuestionIndex(updated.length - 1);
      setCustomQuestionPrompt('');
      setIsRubricModalOpen(false);
    } catch (err) {
      console.error('Failed to create custom question with rubric:', err);
      setError(err.message || 'Failed to generate rubric for custom question.');
    } finally {
      setIsGeneratingCustomRubric(false);
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>
            {assessmentType === 'assignment' ? 'Assignment & Coursework Project Studio' : 'Assessment & Examination Studio'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            {assessmentType === 'assignment'
              ? 'Generate multi-part assignments, problem sets, and projects with instructions, deliverables, deadlines, and multi-criteria rubrics.'
              : 'Generate and manage timed exams, quizzes, and assessments with integrated rubrics directly from your curriculum notes.'}
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

      {/* Studio Mode Selector (Exam vs Assignment) & Quick Rubric Builder */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
          marginBottom: 18,
          padding: '10px 14px',
          background: 'var(--surface)',
          borderRadius: 8,
          border: '1px solid var(--border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600, marginRight: 4 }}>
            Studio Mode:
          </span>
          <button
            type="button"
            onClick={() => {
              setAssessmentType('exam');
              if (!assessmentTitle || /assignment|coursework|project/i.test(assessmentTitle)) {
                setAssessmentTitle(lectureTitle ? `Exam: ${lectureTitle}` : 'Examination Paper');
              }
            }}
            className={`btn btn-sm ${assessmentType === 'exam' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', padding: '6px 14px' }}
          >
            <FileText size={13} />
            <span>📝 Timed Exam / Quiz</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setAssessmentType('assignment');
              if (!assessmentTitle || /exam|assessment/i.test(assessmentTitle)) {
                setAssessmentTitle(lectureTitle ? `Coursework Assignment: ${lectureTitle}` : 'Coursework Assignment');
              }
            }}
            className={`btn btn-sm ${assessmentType === 'assignment' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', padding: '6px 14px' }}
          >
            <BookOpen size={13} />
            <span>📁 Assignment / Coursework Project</span>
          </button>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setIsRubricModalOpen(true)}
            className="btn btn-secondary btn-sm"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '0.8rem',
              padding: '6px 14px',
              border: '1px solid rgba(99, 102, 241, 0.4)',
              background: 'rgba(99, 102, 241, 0.1)',
              color: 'var(--accent)',
            }}
            title="Paste any question prompt and generate normalized rubrics with AI"
          >
            <Sparkles size={13} />
            <span>✨ Build Rubric for Custom Question</span>
          </button>
        </div>
      </div>

      {/* Didactic AI Multi-Turn Chatbot */}
      <div
        className="cartesia-card"
        style={{
          marginBottom: 20,
          padding: '16px 20px',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(30, 41, 59, 0.6) 100%)',
          border: '1px solid rgba(99, 102, 241, 0.28)',
          borderRadius: 10,
        }}
      >
        {/* Chatbot Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 2px 8px rgba(99, 102, 241, 0.35)',
              }}
            >
              <Bot size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '0.94rem', fontWeight: 600, color: 'var(--text)', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                Didactic AI Assistant
                <span className="badge badge-accent" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                  Interactive
                </span>
              </h3>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: 0, marginTop: 1 }}>
                Create exams, quizzes & rubrics with AI assistance
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleResetChat}
            className="btn btn-secondary btn-sm"
            style={{ height: 26, fontSize: '0.74rem', gap: 4 }}
            title="Start a new conversation"
          >
            <RotateCcw size={12} />
            <span>Reset</span>
          </button>
        </div>

        {/* Source Material Selector Bar inside the Chat */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10,
            padding: '8px 12px',
            background: 'rgba(15, 23, 42, 0.6)',
            borderRadius: 8,
            border: '1px solid rgba(99, 102, 241, 0.25)',
            marginBottom: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <BookOpen size={13} style={{ color: 'var(--accent)' }} />
              <span>Source Material:</span>
            </span>

            {/* Dropdown to choose already uploaded materials */}
            <select
              value={activeNoteId || ''}
              onChange={(e) => handleSelectSourceNote(e.target.value)}
              className="input-text"
              style={{
                height: 28,
                fontSize: '0.78rem',
                minWidth: 200,
                maxWidth: 320,
                padding: '0 8px',
                background: 'var(--surface)',
                color: 'var(--text)',
                borderRadius: 6,
                border: '1px solid var(--border)',
              }}
            >
              {lectureNotesList.length === 0 ? (
                <option value="">No materials uploaded yet</option>
              ) : (
                lectureNotesList.map((note) => (
                  <option key={note.id} value={note.id}>
                    {note.name} ({note.file_type || 'DOC'})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Quick Upload Button directly in the chat */}
          <div>
            <input
              type="file"
              ref={chatFileInputRef}
              onChange={handleChatFileUpload}
              accept=".pdf,.pptx,.docx,.txt"
              style={{ display: 'none' }}
            />
            <button
              type="button"
              onClick={() => chatFileInputRef.current?.click()}
              disabled={isUploadingChatFile || isChatLoading}
              className="btn btn-secondary btn-sm"
              style={{
                height: 28,
                fontSize: '0.76rem',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                background: 'rgba(99, 102, 241, 0.12)',
                border: '1px solid rgba(99, 102, 241, 0.35)',
                color: 'var(--accent)',
              }}
              title="Upload lecture slides or PDF directly to the chat"
            >
              {isUploadingChatFile ? <Loader2 size={12} className="spin" /> : <Paperclip size={12} />}
              <span>{isUploadingChatFile ? 'Uploading & Indexing...' : '+ Upload New Material'}</span>
            </button>
          </div>
        </div>

        {/* Message Stream */}
        <div
          ref={chatContainerRef}
          className="custom-scroll"
          style={{
            maxHeight: 260,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            padding: '10px 12px',
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            marginBottom: 10,
          }}
        >
          {chatMessages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  justifyContent: isUser ? 'flex-end' : 'flex-start',
                  alignItems: 'flex-start',
                  gap: 8,
                }}
              >
                {!isUser && (
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 6,
                      background: 'rgba(99, 102, 241, 0.2)',
                      color: 'var(--accent)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  >
                    <Bot size={13} />
                  </div>
                )}

                <div
                  style={{
                    maxWidth: '82%',
                    padding: '8px 12px',
                    borderRadius: 8,
                    fontSize: '0.82rem',
                    lineHeight: 1.45,
                    background: isUser ? 'rgba(99, 102, 241, 0.28)' : 'var(--surface)',
                    border: isUser ? '1px solid rgba(99, 102, 241, 0.5)' : '1px solid var(--border)',
                    color: isUser ? '#fff' : 'var(--text)',
                  }}
                >
                  <p style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{msg.content}</p>

                  {/* If agent flagged readyToGenerate, show 1-click synthesis button */}
                  {msg.readyToGenerate && (
                    <div
                      style={{
                        marginTop: 10,
                        padding: '8px 10px',
                        background: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        borderRadius: 6,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.76rem', color: 'var(--accent)', fontWeight: 600 }}>
                        <CheckCircle2 size={13} />
                        <span>Specifications ready ({msg.questionCount || questionCount} Questions)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleGenerateAssessment(msg.suggestedPrompt, msg.questionCount)}
                        disabled={loading || (!lectureContent && !activeNoteId)}
                        className="btn btn-primary btn-sm"
                        style={{
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          border: 'none',
                          fontSize: '0.78rem',
                          padding: '6px 12px',
                          alignSelf: 'flex-start',
                        }}
                      >
                        {loading ? <Loader2 size={12} className="spin" /> : <Sparkles size={12} />}
                        <span>Synthesize Assessment Now</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isChatLoading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px' }}>
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 6,
                  background: 'rgba(99, 102, 241, 0.2)',
                  color: 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Bot size={13} />
              </div>
              <div
                style={{
                  padding: '6px 10px',
                  borderRadius: 6,
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  fontSize: '0.78rem',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Loader2 size={12} className="spin" />
                <span>Didactic AI is formulating follow-up questions...</span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Suggestion Response Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Quick prompts:</span>
          {(assessmentType === 'assignment'
            ? [
                { label: '📁 3 Homework Problems & Rubrics', prompt: 'Create 3 multi-part assignment problems (10 marks each) with clear multi-criteria grading rubrics, deliverables, and hints.' },
                { label: '💻 2 Coding Tasks + 1 Analysis', prompt: 'Generate an assignment consisting of 2 practical programming tasks and 1 architectural analysis problem with detailed rubrics.' },
                { label: '✨ Build Rubrics for my Question', prompt: 'I have a custom question. Can you help me formulate the grading rubric criteria and point distribution?' },
                { label: '📑 Project Brief with Milestones', prompt: 'Design an in-depth coursework project brief with milestone deliverables, evaluation criteria, and academic guidelines.' },
              ]
            : [
                { label: '⚡ 5 MCQs & 2 Short Answer', prompt: '5 MCQs (1 mark each) and 2 Short Answer (3 marks each)' },
                { label: '📝 3 Fill in the Blank', prompt: '3 Fill in the Blank (1 mark each) and 2 Short Answer (3 marks each)' },
                { label: '🎯 Focus on Key Concepts', prompt: 'Focus specifically on the key algorithms and core concepts from the lecture' },
                { label: '🔑 Include Complete Answer Key', prompt: 'Include distinct 4-choice options A, B, C, D and an exact answer key for all questions' },
                { label: '✨ Build Rubrics for my Question', prompt: 'I have a custom question. Can you help me formulate the grading rubric criteria and point distribution?' },
              ]
          ).map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendChatMessage(item.prompt)}
              disabled={isChatLoading || loading}
              style={{
                fontSize: '0.72rem',
                padding: '3px 10px',
                borderRadius: 6,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                cursor: isChatLoading || loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!isChatLoading) {
                  e.currentTarget.style.color = '#fff';
                  e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.6)';
                  e.currentTarget.style.background = 'rgba(99, 102, 241, 0.15)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text)';
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.background = 'var(--surface)';
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Auto-Resizing Vertical Chat Input Bar */}
        <div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <button
              type="button"
              onClick={() => chatFileInputRef.current?.click()}
              disabled={isUploadingChatFile || isChatLoading || loading}
              className="btn btn-secondary btn-sm"
              style={{
                height: 40,
                width: 40,
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 8,
                flexShrink: 0,
                color: 'var(--accent)',
                border: '1px solid rgba(99, 102, 241, 0.35)',
                background: 'var(--bg)',
              }}
              title="Attach and upload lecture document (PDF, PPTX, DOCX)"
            >
              {isUploadingChatFile ? <Loader2 size={16} className="spin" /> : <Paperclip size={16} />}
            </button>

            <textarea
              ref={chatInputRef}
              rows={1}
              value={chatInput}
              onChange={(e) => {
                setChatInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendChatMessage();
                }
              }}
              placeholder="Ask Didactic AI to create an assessment (e.g. 5 MCQs on sorting, 2 short answers)..."
              className="input-textarea"
              style={{
                flex: 1,
                minHeight: 40,
                maxHeight: 180,
                resize: 'none',
                fontSize: '0.84rem',
                padding: '9px 12px',
                borderRadius: 8,
                background: 'var(--bg)',
                border: '1px solid rgba(99, 102, 241, 0.35)',
                color: 'var(--text)',
                lineHeight: 1.45,
                wordBreak: 'break-word',
                whiteSpace: 'pre-wrap',
                overflowY: 'auto',
              }}
              disabled={isChatLoading || loading}
            />

            <button
              type="button"
              onClick={() => handleSendChatMessage()}
              disabled={!chatInput.trim() || isChatLoading || loading}
              className="btn btn-primary btn-sm"
              style={{
                height: 40,
                padding: '0 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                border: 'none',
                cursor: !chatInput.trim() || isChatLoading ? 'not-allowed' : 'pointer',
                opacity: !chatInput.trim() || isChatLoading ? 0.6 : 1,
                flexShrink: 0,
              }}
            >
              {isChatLoading ? <Loader2 size={13} className="spin" /> : <Send size={13} />}
              <span>Send</span>
            </button>
          </div>
          <div style={{ marginTop: 5, fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', paddingLeft: 2 }}>
            <span>↵ Enter to send • Shift+Enter for new line</span>
            {isChatLoading && <span style={{ color: 'var(--accent)' }}>AI generating response...</span>}
          </div>
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
                        onClick={(e) => {
                          e.stopPropagation();
                          setAssessmentToDelete(item);
                        }}
                        disabled={hasSubmissions}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 2,
                          cursor: hasSubmissions ? 'not-allowed' : 'pointer',
                          color: hasSubmissions ? 'var(--text-muted)' : 'var(--danger)',
                          opacity: hasSubmissions ? 0.3 : 0.8,
                        }}
                        title={hasSubmissions ? 'Cannot delete assessment with graded student submissions' : 'Delete assessment from database'}
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
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, paddingTop: 6, borderTop: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        onClick={(e) => handleDownloadPdf(e, item.id, false)}
                        disabled={isDownloadingPdf}
                        className="btn btn-secondary btn-sm"
                        style={{ height: 22, padding: '0 6px', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: 3 }}
                        title="Download Printable Student Exam Paper PDF"
                      >
                        <Download size={10} />
                        <span>Exam PDF</span>
                      </button>
                      <button
                        onClick={(e) => handleDownloadPdf(e, item.id, true)}
                        disabled={isDownloadingPdf}
                        className="btn btn-secondary btn-sm"
                        style={{ height: 22, padding: '0 6px', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: 3, color: '#10b981' }}
                        title="Download Official Solution Key PDF"
                      >
                        <FileText size={10} />
                        <span>Key PDF</span>
                      </button>
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                      {item.created_at ? item.created_at.slice(0, 10) : 'Recent'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Active Assessment Top Banner with PDF Download Controls */}
      {assessment && (
        <div
          className="cartesia-card"
          style={{
            marginBottom: 16,
            padding: '14px 18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: 'rgba(99, 102, 241, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent)',
              }}
            >
              <FileCheck size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text)', margin: 0 }}>
                  {assessmentTitle || assessment.title}
                </h2>
                {isLocked ? (
                  <span className="badge" style={{ background: '#ca8a04', color: '#fff', fontSize: '0.68rem', padding: '1px 6px' }}>
                    Locked
                  </span>
                ) : (
                  <span className="badge badge-accent" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                    Active Studio
                  </span>
                )}
              </div>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: 0, marginTop: 2 }}>
                {questions.length} questions • {totalMaxPoints} total marks • Stored in Neon Cloud Database
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={(e) => handleDownloadPdf(e, assessment.id, false)}
              disabled={isDownloadingPdf}
              className="btn btn-primary btn-sm"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                border: 'none',
                padding: '7px 14px',
                fontSize: '0.8rem',
                fontWeight: 500,
              }}
              title="Download printable student exam paper with candidate instructions and ruled answer lines"
            >
              {isDownloadingPdf ? <Loader2 size={13} className="spin" /> : <Download size={13} />}
              <span>{assessmentType === 'assignment' || /assignment|project|coursework|homework/i.test(assessmentTitle || assessment?.title || '') ? 'Download Assignment Brief (PDF)' : 'Download Exam Paper (PDF)'}</span>
            </button>

            <button
              onClick={(e) => handleDownloadPdf(e, assessment.id, true)}
              disabled={isDownloadingPdf}
              className="btn btn-secondary btn-sm"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                border: '1px solid rgba(16, 185, 129, 0.4)',
                color: '#10b981',
                padding: '7px 14px',
                fontSize: '0.8rem',
                fontWeight: 500,
              }}
              title="Download official instructor solution key with answer keys and rubric criteria"
            >
              <FileText size={13} />
              <span>{assessmentType === 'assignment' || /assignment|project|coursework|homework/i.test(assessmentTitle || assessment?.title || '') ? 'Download Rubrics & Guide (PDF)' : 'Download Solution Key (PDF)'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Paper Grading Workflow Banner */}
      {assessment && (
        <div
          className="cartesia-card"
          style={{
            marginBottom: 16,
            padding: '14px 18px',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(15, 23, 42, 0.9) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 14,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 8,
                background: 'rgba(16, 185, 129, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10b981',
                flexShrink: 0,
              }}
            >
              <GraduationCap size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h4 style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text)', margin: 0 }}>
                  Ready to Grade Student Answer Papers?
                </h4>
                <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', fontSize: '0.68rem', padding: '1px 6px' }}>
                  Paper Grading
                </span>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Print the exam PDF, have students write their answers, scan their papers, and upload them to evaluate automatically against the rubric.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab && setActiveTab('grading')}
            className="btn btn-primary btn-sm"
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              border: 'none',
              padding: '8px 16px',
              fontSize: '0.82rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              whiteSpace: 'nowrap',
            }}
          >
            <span>Open Paper Grading Studio</span>
            <ArrowRight size={14} />
          </button>
        </div>
      )}

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

      {/* Assessment Pedagogical Analysis & Cognitive Breakdown Matrix */}
      {questions.length > 0 && (
        <div
          className="cartesia-card"
          style={{
            marginBottom: 16,
            padding: '14px 18px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
          }}
        >
          {(() => {
            const mcqs = questions.filter((q) => /\b[A-D]\)/.test(q.text || ''));
            const fitbs = questions.filter((q) => /____|fill in the blank/i.test(q.text || ''));
            const written = questions.filter((q) => !/\b[A-D]\)/.test(q.text || '') && !/____|fill in the blank/i.test(q.text || ''));
            const mcqPts = mcqs.reduce((sum, q) => sum + (parseFloat(q.max_marks || q.max_points) || 1), 0);
            const fitbPts = fitbs.reduce((sum, q) => sum + (parseFloat(q.max_marks || q.max_points) || 1), 0);
            const writtenPts = written.reduce((sum, q) => sum + (parseFloat(q.max_marks || q.max_points) || 5), 0);
            const pacingMins = Math.round(mcqs.length * 1.5 + fitbs.length * 2 + written.length * 5);

            return (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showAnalysis ? 12 : 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <TrendingUp size={16} style={{ color: 'var(--accent)' }} />
                    <h3 style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text)', margin: 0 }}>
                      Assessment Pedagogical Analysis & Cognitive Matrix
                    </h3>
                    <span className="badge badge-accent" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                      Academic Blueprint
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAnalysis(!showAnalysis)}
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: '0.74rem', padding: '2px 8px', color: 'var(--text-muted)' }}
                  >
                    {showAnalysis ? 'Collapse Analysis' : 'Show Analysis'}
                  </button>
                </div>

                {showAnalysis && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12, paddingTop: 6 }}>
                    {/* Format breakdown */}
                    <div style={{ padding: '10px 12px', borderRadius: 6, background: 'var(--bg)', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: 4, fontWeight: 500 }}>Question Formats</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                          <span>Multiple Choice (MCQ):</span>
                          <strong style={{ color: 'var(--accent)' }}>{mcqs.length} ({mcqPts} pts)</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                          <span>Fill in the Blank:</span>
                          <strong style={{ color: '#10b981' }}>{fitbs.length} ({fitbPts} pts)</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                          <span>Short Answer / Essay:</span>
                          <strong style={{ color: '#f59e0b' }}>{written.length} ({writtenPts} pts)</strong>
                        </div>
                      </div>
                    </div>

                    {/* Bloom's Depth */}
                    <div style={{ padding: '10px 12px', borderRadius: 6, background: 'var(--bg)', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: 4, fontWeight: 500 }}>Bloom's Cognitive Depth</div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
                        {mcqs.length + fitbs.length >= written.length ? 'Balanced Recall & Application' : 'Analytical & Synthesis Focus'}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                        <span className="badge badge-outline" style={{ fontSize: '0.66rem' }}>
                          {Math.round(((mcqs.length + fitbs.length) / Math.max(questions.length, 1)) * 100)}% Foundational
                        </span>
                        <span className="badge badge-outline" style={{ fontSize: '0.66rem' }}>
                          {Math.round((written.length / Math.max(questions.length, 1)) * 100)}% Higher-Order
                        </span>
                      </div>
                    </div>

                    {/* Exam Pacing */}
                    <div style={{ padding: '10px 12px', borderRadius: 6, background: 'var(--bg)', border: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: 4, fontWeight: 500 }}>Estimated Exam Pacing</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent)' }}>
                        ~{pacingMins} minutes
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        Normed at 1.5 min/MCQ, 2 min/FITB, 5 min/Written
                      </div>
                    </div>
                  </div>
                )}
              </>
            );
          })()}
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {/\b[A-D]\)/.test(q.text || '') && (
                          <span className="badge badge-accent" style={{ fontSize: '0.62rem', padding: '1px 5px' }}>
                            MCQ
                          </span>
                        )}
                        {(/____|fill in the blank/i.test(q.text || '') || q.question_type === 'fill_in_the_blank') && (
                          <span className="badge" style={{ fontSize: '0.62rem', padding: '1px 5px', background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
                            FITB
                          </span>
                        )}
                        <span className="badge badge-outline" style={{ fontSize: '0.68rem' }}>
                          {q.max_marks || q.max_points || 10} pts
                        </span>
                      </div>
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

                {/* Official Answer Key / Model Solution Box */}
                <div
                  style={{
                    margin: '12px 0',
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                      <CheckCircle2 size={14} />
                      <span>Official Answer Key & Model Solution</span>
                    </label>
                    <span className="badge badge-accent" style={{ fontSize: '0.68rem', padding: '1px 6px' }}>
                      Ground Truth Key
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    value={
                      currentQ.reference_answer ||
                      (currentQ.student_hint?.includes('Answer Key:')
                        ? currentQ.student_hint.split(/\n(?:Learning Objective|Objective|Hint):/i)[0].replace(/^(?:Official\s+)?Answer\s+Key:\s*/i, '').trim()
                        : currentQ.student_hint || '')
                    }
                    onChange={(e) => {
                      const newKey = e.target.value;
                      handleUpdateQuestion(activeQuestionIndex, 'reference_answer', newKey);
                      handleUpdateQuestion(activeQuestionIndex, 'student_hint', `Official Answer Key: ${newKey}`);
                    }}
                    disabled={isLocked}
                    className="input-textarea"
                    style={{
                      fontSize: '0.84rem',
                      background: 'var(--bg)',
                      borderColor: 'rgba(16, 185, 129, 0.35)',
                      color: 'var(--text)',
                      borderRadius: 6,
                    }}
                    placeholder="Enter the official answer key or correct choice (e.g. 'B) It requires a sorted array')..."
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

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {!isLocked && (
                      <button
                        type="button"
                        onClick={() => handleBuildRubricFromPrompt(currentQ, activeQuestionIndex)}
                        disabled={generatingRubricId === (currentQ.id || `q-${activeQuestionIndex}`)}
                        className="btn btn-secondary btn-sm"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          border: '1px solid rgba(99, 102, 241, 0.4)',
                          color: 'var(--accent)',
                          background: 'rgba(99, 102, 241, 0.1)',
                        }}
                        title="Synthesize normalized grading criteria and point distribution with AI for this question prompt"
                      >
                        {generatingRubricId === (currentQ.id || `q-${activeQuestionIndex}`) ? (
                          <Loader2 size={12} className="spin" />
                        ) : (
                          <Sparkles size={12} />
                        )}
                        <span>✨ Generate Rubric with AI</span>
                      </button>
                    )}
                    {currentQ.id && !isLocked && (
                      <button
                        onClick={() => handleRegenerateRubric(currentQ, activeQuestionIndex)}
                        disabled={generatingRubricId === currentQ.id}
                        className="btn btn-secondary btn-sm"
                        title="Regenerate rubric with AI"
                      >
                        <RefreshCw size={12} className={generatingRubricId === currentQ.id ? 'spin' : ''} />
                        <span>Regenerate</span>
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

      {/* Custom Question Rubric Generator Modal */}
      {isRubricModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
          onClick={() => {
            if (!isGeneratingCustomRubric) setIsRubricModalOpen(false);
          }}
        >
          <div
            className="cartesia-card"
            style={{
              maxWidth: 540,
              width: '100%',
              padding: 24,
              background: 'var(--card)',
              border: '1px solid rgba(99, 102, 241, 0.4)',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
              borderRadius: 12,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 8,
                  background: 'rgba(99, 102, 241, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent)',
                  flexShrink: 0,
                }}
              >
                <Sparkles size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text)', margin: 0 }}>
                  Build Rubrics for Your Question
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                  Provide your custom exam or assignment question. Didactic AI will synthesize normalized criteria with point allocations.
                </p>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 14 }}>
              <label className="form-label" style={{ fontSize: '0.82rem' }}>
                Your Question Prompt *
              </label>
              <textarea
                rows={4}
                value={customQuestionPrompt}
                onChange={(e) => setCustomQuestionPrompt(e.target.value)}
                placeholder="e.g. Implement Dijkstra's algorithm in Python and prove its time complexity using min-heap. Discuss edge cases with negative cycle detection."
                className="input-textarea"
                style={{ fontSize: '0.86rem', resize: 'vertical' }}
                disabled={isGeneratingCustomRubric}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label" style={{ fontSize: '0.82rem' }}>
                Total Max Marks for this Question
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="number"
                  min="1"
                  max="100"
                  step="1"
                  value={customQuestionMarks}
                  onChange={(e) => setCustomQuestionMarks(parseFloat(e.target.value) || 10)}
                  className="input-text"
                  style={{ width: 90, textAlign: 'center', fontSize: '0.86rem' }}
                  disabled={isGeneratingCustomRubric}
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Marks will be allocated proportionally across 3–4 rubric criteria
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setIsRubricModalOpen(false)}
                disabled={isGeneratingCustomRubric}
                className="btn btn-secondary btn-sm"
                style={{ padding: '8px 16px', fontSize: '0.82rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateCustomQuestionWithRubric}
                disabled={isGeneratingCustomRubric || !customQuestionPrompt.trim()}
                className="btn btn-primary btn-sm"
                style={{
                  padding: '8px 18px',
                  fontSize: '0.82rem',
                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {isGeneratingCustomRubric ? <Loader2 size={13} className="spin" /> : <Sparkles size={13} />}
                <span>{isGeneratingCustomRubric ? 'Synthesizing Rubric...' : 'Synthesize Rubric & Add Question'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Database Deletion Confirmation Modal */}
      {assessmentToDelete && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 16,
          }}
          onClick={() => {
            if (!isDeletingAssessment) setAssessmentToDelete(null);
          }}
        >
          <div
            className="cartesia-card"
            style={{
              maxWidth: 480,
              width: '100%',
              padding: 24,
              background: 'var(--card)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
              borderRadius: 12,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 8,
                  background: 'rgba(239, 68, 68, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ef4444',
                  flexShrink: 0,
                }}
              >
                <Trash2 size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text)', margin: 0 }}>
                  Delete Assessment from Database
                </h3>
                <span style={{ fontSize: '0.74rem', color: '#10b981', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }}></span>
                  Neon PostgreSQL Cloud Database
                </span>
              </div>
            </div>

            <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 18 }}>
              Are you sure you want to permanently delete <strong style={{ color: 'var(--text)' }}>"{assessmentToDelete.title}"</strong>? 
              This will permanently erase this assessment record, all its questions, and criteria from the <strong>Neon PostgreSQL Cloud Database</strong>.
              This action is permanent and cannot be undone.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setAssessmentToDelete(null)}
                disabled={isDeletingAssessment}
                className="btn btn-secondary btn-sm"
                style={{ padding: '8px 16px', fontSize: '0.82rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteAssessment}
                disabled={isDeletingAssessment}
                className="btn btn-danger btn-sm"
                style={{
                  padding: '8px 18px',
                  fontSize: '0.82rem',
                  background: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  cursor: isDeletingAssessment ? 'not-allowed' : 'pointer',
                }}
              >
                {isDeletingAssessment ? <Loader2 size={13} className="spin" /> : <Trash2 size={13} />}
                <span>{isDeletingAssessment ? 'Deleting from Cloud DB...' : 'Delete from Database'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
