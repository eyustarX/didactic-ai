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
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Maximize2,
  ChevronRight,
  SlidersHorizontal,
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
  fetchChatSessionDetails,
  createChatSession,
  saveChatMessage,
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
  activeChatSessionId,
  setActiveChatSessionId,
  onChatSessionsChange,
  sidebarCollapsed,
  setSidebarCollapsed,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [questionCount, setQuestionCount] = useState(3);
  const [assessmentTitle, setAssessmentTitle] = useState('');
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [generatingRubricId, setGeneratingRubricId] = useState(null);
  const [copilotPrompt, setCopilotPrompt] = useState('');
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [showGradingBanner, setShowGradingBanner] = useState(false);

  // Assessment vs Assignment Studio Mode
  const [assessmentType, setAssessmentType] = useState('exam'); // 'exam' | 'assignment'
  const [isRubricModalOpen, setIsRubricModalOpen] = useState(false);
  const [customQuestionPrompt, setCustomQuestionPrompt] = useState('');
  const [customQuestionMarks, setCustomQuestionMarks] = useState(10);
  const [isGeneratingCustomRubric, setIsGeneratingCustomRubric] = useState(false);

  // Split-Screen & Layout State
  const [isChatCollapsed, setIsChatCollapsed] = useState(false);
  const [manualSplitView, setManualSplitView] = useState(false);

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
  const [showAnalysis, setShowAnalysis] = useState(false);
  const chatContainerRef = useRef(null);
  const chatInputRef = useRef(null);
  const heroInputRef = useRef(null);

  // Uploaded Lecture Materials / Sources state in Chat
  const [lectureNotesList, setLectureNotesList] = useState([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [isUploadingChatFile, setIsUploadingChatFile] = useState(false);
  const chatFileInputRef = useRef(null);
  const heroFileInputRef = useRef(null);

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

  // Load session messages when activeChatSessionId changes
  useEffect(() => {
    if (!activeChatSessionId) {
      setChatMessages([
        {
          id: `init-${Date.now()}`,
          role: 'assistant',
          content:
            "👋 Hello Professor! What assessment would you like to build? Tell me your topics, question formats (e.g. 5 MCQs, 2 Short Answer), and marks per question.",
          readyToGenerate: false,
        },
      ]);
      return;
    }

    const loadSession = async () => {
      setIsChatLoading(true);
      try {
        const detail = await fetchChatSessionDetails(activeChatSessionId, currentUser?.id);
        if (detail && Array.isArray(detail.messages) && detail.messages.length > 0) {
          setChatMessages(detail.messages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            readyToGenerate: !!m.ready_to_generate,
            suggestedPrompt: m.suggested_prompt,
            questionCount: m.question_count,
          })));
          if (detail.lecture_note_id && setActiveNoteId) {
            setActiveNoteId(detail.lecture_note_id);
          }
        }
      } catch (err) {
        console.warn('Could not load chat session messages:', err);
      } finally {
        setIsChatLoading(false);
      }
    };

    loadSession();
  }, [activeChatSessionId, currentUser?.id]);

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
      if (heroFileInputRef.current) {
        heroFileInputRef.current.value = '';
      }
    }
  };

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages, isChatLoading]);

  // Synchronize title if assessment or lectureTitle changes
  useEffect(() => {
    if (assessment?.title) {
      setAssessmentTitle(assessment.title);
    } else if (lectureTitle) {
      setAssessmentTitle(`Assessment: ${lectureTitle}`);
    }
  }, [assessment, lectureTitle]);

  const handleDownloadPdf = async (e, assId, solutions = false, customData = null) => {
    if (e) e.stopPropagation();
    setIsDownloadingPdf(true);
    setError(null);
    try {
      const fallback = customData || assessment;
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
    setManualSplitView(false);
    handleResetChat();
  };

  const handleGenerateAssessment = async (overridePrompt, overrideCount) => {
    setLoading(true);
    setError(null);

    const promptToUse = typeof overridePrompt === 'string' ? overridePrompt : copilotPrompt;
    const count = parseInt(overrideCount || questionCount, 10) || 3;
    if (overrideCount) setQuestionCount(count);

    try {
      let noteIdToUse = activeNoteId;
      if (!noteIdToUse) {
        const textToIngest = (lectureContent && lectureContent.trim().length >= 10)
          ? lectureContent
          : (promptToUse && promptToUse.trim().length >= 10)
            ? promptToUse
            : `Course Material and Learning Objectives: ${lectureTitle || assessmentTitle || 'Core University Curriculum'}`;
        const titleToUse = lectureTitle || assessmentTitle || (assessmentType === 'assignment' ? 'Assignment Brief' : 'Exam Document');

        try {
          const resp = await uploadLectureNote({
            pastedText: textToIngest,
            noteTitle: titleToUse,
            lecturerId: currentUser?.id,
          });
          const note = resp.lecture_note || resp;
          if (note?.id) {
            noteIdToUse = note.id;
            if (setActiveNoteId) setActiveNoteId(note.id);
            if (setLectureTitle && !lectureTitle) setLectureTitle(titleToUse);
            if (setLectureContent && !lectureContent) setLectureContent(textToIngest);
          }
        } catch (noteErr) {
          console.warn('Could not auto-create lecture note for assessment:', noteErr);
        }
      }

      let data;
      if (noteIdToUse) {
        data = await generateAssessmentFromParts({
          lecture_note_id: noteIdToUse,
          question_count: count,
          title: assessmentTitle || `Assessment: ${lectureTitle || (assessmentType === 'assignment' ? 'Assignment' : 'Exam')}`,
          prompt: promptToUse?.trim() || undefined,
          lecturerId: currentUser?.id,
        });
      } else {
        data = await generateAssessment({
          lecture_title: lectureTitle || assessmentTitle || (assessmentType === 'assignment' ? 'Course Assignment' : 'Course Exam'),
          lecture_content: (lectureContent && lectureContent.trim().length >= 10)
            ? lectureContent
            : (promptToUse && promptToUse.trim().length >= 10 ? promptToUse : 'Core course curriculum concepts and learning objectives.'),
          question_count: count,
        });
      }

      setAssessment(data);
      if (data.title) setAssessmentTitle(data.title);
      setActiveQuestionIndex(0);

      // Add instant feedback confirmation into the chat
      setChatMessages((prev) => [
        ...prev,
        {
          id: `success-${Date.now()}`,
          role: 'assistant',
          content: `🎉 Successfully created **${data.title || (assessmentType === 'assignment' ? 'Assignment' : 'Exam Paper')}** with ${data.questions?.length || count} questions!\n\nYou can review question details, refine answer keys, or add custom questions in the editor on the right.`,
          readyToGenerate: false,
        },
      ]);
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

    // Ensure active chat session exists on backend
    let currentSessId = activeChatSessionId;
    if (!currentSessId) {
      try {
        const newSess = await createChatSession({
          title: textToSend.slice(0, 40) || 'New Assessment',
          lecture_note_id: activeNoteId,
          lecturerId: currentUser?.id,
        });
        currentSessId = newSess.id;
        if (setActiveChatSessionId) setActiveChatSessionId(newSess.id);
        if (onChatSessionsChange) onChatSessionsChange();
      } catch (sessErr) {
        console.warn('Could not auto-create chat session:', sessErr);
      }
    }

    if (currentSessId) {
      saveChatMessage({
        sessionId: currentSessId,
        role: 'user',
        content: textToSend,
        lecturerId: currentUser?.id,
      }).catch(() => {});
    }
    if (chatInputRef.current) {
      chatInputRef.current.style.height = '40px';
    }
    if (heroInputRef.current) {
      heroInputRef.current.style.height = '72px';
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

      if (currentSessId) {
        saveChatMessage({
          sessionId: currentSessId,
          role: 'assistant',
          content: assistantMsg.content,
          readyToGenerate: assistantMsg.readyToGenerate,
          suggestedPrompt: assistantMsg.suggestedPrompt,
          questionCount: assistantMsg.questionCount,
          lecturerId: currentUser?.id,
        })
          .then(() => {
            if (onChatSessionsChange) onChatSessionsChange();
          })
          .catch(() => {});
      }
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
    if (setActiveChatSessionId) setActiveChatSessionId(null);
    setChatMessages([
      {
        id: `init-${Date.now()}`,
        role: 'assistant',
        content:
          "👋 Hello Professor! What assessment would you like to build? Tell me your topics, question formats (e.g. 5 MCQs, 2 Short Answer), and marks per question.",
        readyToGenerate: false,
      },
    ]);
    setChatInput('');
    if (onChatSessionsChange) onChatSessionsChange();
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
    setAssessment({
      ...(assessment || {
        id: `draft_${Date.now()}`,
        title: assessmentTitle || (assessmentType === 'assignment' ? 'Coursework Assignment' : 'Examination Paper'),
      }),
      questions: updated,
    });
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

  // Determine whether to display Hero Centered View or Split-Screen Workspace
  const isHeroView = !manualSplitView && !assessment && questions.length === 0 && chatMessages.length <= 1;

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '80vh' }}>

      {/* ========================================================================= */}
      {/* 1. INITIAL / HERO CENTERED CHATGPT-STYLE INTERFACE                        */}
      {/* ========================================================================= */}
      {isHeroView && (
        <div
          style={{
            maxWidth: 760,
            margin: '40px auto 60px auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            animation: 'fadeIn 0.25s ease',
            padding: '0 16px',
          }}
        >
          {/* Hero Greeting & Icon */}
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              background: 'var(--accent)',
              color: 'var(--on-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 18,
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <Bot size={28} />
          </div>

          <h1
            style={{
              fontSize: '1.85rem',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: 'var(--text)',
              marginBottom: 8,
            }}
          >
            What assessment would you like to build?
          </h1>

          <p
            style={{
              fontSize: '0.94rem',
              color: 'var(--text-muted)',
              maxWidth: 580,
              lineHeight: 1.5,
              marginBottom: 24,
            }}
          >
            Formulate balanced exam papers, quizzes, coursework assignments, and multi-criteria rubrics from your course lecture notes in seconds.
          </p>

          {/* Mode Pill Toggle: Exam vs Assignment */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-full)',
              padding: '3px 4px',
              marginBottom: 20,
              gap: 4,
            }}
          >
            <button
              type="button"
              onClick={() => setAssessmentType('exam')}
              style={{
                border: 'none',
                background: assessmentType === 'exam' ? 'var(--accent)' : 'transparent',
                color: assessmentType === 'exam' ? 'var(--on-accent)' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: '0.8rem',
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              📝 Examination Paper
            </button>
            <button
              type="button"
              onClick={() => setAssessmentType('assignment')}
              style={{
                border: 'none',
                background: assessmentType === 'assignment' ? 'var(--accent)' : 'transparent',
                color: assessmentType === 'assignment' ? 'var(--on-accent)' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: '0.8rem',
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              📁 Coursework Assignment
            </button>
          </div>

          {/* Large Centered ChatGPT-style Prompt Box */}
          <div
            className="cartesia-card"
            style={{
              width: '100%',
              padding: '16px 18px',
              borderRadius: 16,
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-card)',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              marginBottom: 16,
              transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
            }}
          >
            {/* Embedded Source Material Selector */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 8,
                paddingBottom: 10,
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: '0.78rem',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontWeight: 500,
                  }}
                >
                  <BookOpen size={14} style={{ color: 'var(--accent)' }} />
                  <span>Source Material:</span>
                </span>

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

              <div>
                <input
                  type="file"
                  ref={heroFileInputRef}
                  onChange={handleChatFileUpload}
                  accept=".pdf,.pptx,.docx,.txt"
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  onClick={() => heroFileInputRef.current?.click()}
                  disabled={isUploadingChatFile || isChatLoading}
                  className="btn btn-secondary btn-sm"
                  style={{
                    height: 28,
                    fontSize: '0.76rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                  }}
                  title="Upload lecture slides or PDF"
                >
                  {isUploadingChatFile ? <Loader2 size={12} className="spin" /> : <Paperclip size={12} />}
                  <span>{isUploadingChatFile ? 'Uploading & Indexing...' : '+ Upload New Material'}</span>
                </button>
              </div>
            </div>

            {/* Prompt Textarea */}
            <textarea
              ref={heroInputRef}
              rows={3}
              value={chatInput}
              onChange={(e) => {
                setChatInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = `${Math.min(e.target.scrollHeight, 220)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendChatMessage();
                }
              }}
              placeholder={
                assessmentType === 'assignment'
                  ? "Ask Didactic AI to create an assignment..."
                  : "Ask Didactic AI to create an assessment..."
              }
              className="input-textarea"
              style={{
                width: '100%',
                minHeight: 72,
                maxHeight: 220,
                resize: 'none',
                fontSize: '0.96rem',
                padding: '8px 4px',
                borderRadius: 0,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text)',
                lineHeight: 1.55,
                wordBreak: 'break-word',
                whiteSpace: 'pre-wrap',
                overflowY: 'auto',
              }}
              disabled={isChatLoading || loading}
            />

            {/* Bottom Actions inside Prompt Box */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: 8,
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => heroFileInputRef.current?.click()}
                  disabled={isUploadingChatFile || isChatLoading || loading}
                  className="btn btn-ghost btn-sm"
                  style={{
                    height: 32,
                    padding: '0 8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: '0.78rem',
                    color: 'var(--text-muted)',
                  }}
                  title="Attach lecture slides or PDF"
                >
                  <Paperclip size={14} />
                  <span>Attach Notes</span>
                </button>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  ↵ Enter to generate • Shift+Enter for new line
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleSendChatMessage()}
                disabled={!chatInput.trim() || isChatLoading || loading}
                className="btn btn-primary btn-sm"
                style={{
                  height: 36,
                  padding: '0 18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  fontSize: '0.86rem',
                  fontWeight: 600,
                  background: 'var(--accent)',
                  color: 'var(--on-accent)',
                  border: 'none',
                  cursor: !chatInput.trim() || isChatLoading ? 'not-allowed' : 'pointer',
                  opacity: !chatInput.trim() || isChatLoading ? 0.6 : 1,
                  borderRadius: 8,
                }}
              >
                {isChatLoading ? <Loader2 size={14} className="spin" /> : <Sparkles size={14} />}
                <span>Generate Assessment</span>
              </button>
            </div>
          </div>

          {/* Secondary Shortcuts: Library or Open Split View */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              type="button"
              onClick={() => setActiveTab && setActiveTab('assessments_library')}
              className="btn btn-ghost btn-sm"
              style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <BookOpen size={13} />
              <span>Browse Existing Assessments Library</span>
            </button>

            <span style={{ color: 'var(--border)' }}>•</span>

            <button
              type="button"
              onClick={() => setManualSplitView(true)}
              className="btn btn-ghost btn-sm"
              style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <SlidersHorizontal size={13} />
              <span>Open Split Workspace Directly</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. SPLIT-SCREEN DUAL PANE WORKSPACE (CHAT DIDACTIC AI + LIVE ASSESSMENT CANVAS) */}
      {/* ========================================================================= */}
      {!isHeroView && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isChatCollapsed ? '52px 1fr' : 'minmax(360px, 420px) 1fr',
            gap: 16,
            alignItems: 'start',
            transition: 'grid-template-columns 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            minHeight: 'calc(100vh - 28px)',
          }}
        >
          {/* ------------------------------------------------------------------- */}
          {/* LEFT COLUMN: INTERACTIVE DIDACTIC AI CHAT (OR COLLAPSED RAIL)       */}
          {/* ------------------------------------------------------------------- */}
          {isChatCollapsed ? (
            /* Collapsed Rail */
            <div
              className="cartesia-card"
              style={{
                position: 'sticky',
                top: 14,
                height: 'calc(100vh - 28px)',
                padding: '12px 6px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 16,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                cursor: 'pointer',
              }}
              onClick={() => setIsChatCollapsed(false)}
              title="Click to expand Didactic AI"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsChatCollapsed(false);
                }}
                className="btn btn-ghost btn-sm"
                style={{ padding: 6, color: 'var(--accent)' }}
                title="Expand Didactic AI Chat"
              >
                <PanelLeftOpen size={18} />
              </button>

              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'var(--accent)',
                  color: 'var(--on-accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Bot size={16} />
              </div>

              {chatMessages.length > 1 && (
                <span
                  className="badge badge-accent"
                  style={{
                    fontSize: '0.62rem',
                    padding: '2px 5px',
                    borderRadius: 'var(--radius-full)',
                  }}
                >
                  {chatMessages.length}
                </span>
              )}

              <div
                style={{
                  writingMode: 'vertical-rl',
                  textOrientation: 'mixed',
                  transform: 'rotate(180deg)',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  marginTop: 'auto',
                  letterSpacing: '0.05em',
                  paddingBottom: 8,
                }}
              >
                DIDACTIC AI
              </div>
            </div>
          ) : (
            /* Expanded Interactive Didactic AI Chat Column */
            <div
              className="cartesia-card"
              style={{
                position: 'sticky',
                top: 14,
                height: 'calc(100vh - 28px)',
                display: 'flex',
                flexDirection: 'column',
                padding: '14px 16px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-card)',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
              }}
            >
              {/* Chat Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: 10,
                  borderBottom: '1px solid var(--border-subtle)',
                  marginBottom: 10,
                  flexShrink: 0,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  {sidebarCollapsed && (
                    <button
                      type="button"
                      onClick={() => setSidebarCollapsed && setSidebarCollapsed(false)}
                      className="btn btn-ghost btn-sm"
                      style={{ height: 28, width: 28, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}
                      title="Open navigation sidebar"
                    >
                      <PanelLeftOpen size={16} />
                    </button>
                  )}
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      background: 'var(--accent)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--on-accent)',
                      flexShrink: 0,
                    }}
                  >
                    <Bot size={16} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                      Didactic AI
                      <span className="badge badge-accent" style={{ fontSize: '0.64rem', padding: '1px 5px' }}>
                        AI Assistant
                      </span>
                    </h3>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <button
                    type="button"
                    onClick={handleResetChat}
                    className="btn btn-ghost btn-sm"
                    style={{
                      height: 26,
                      padding: '0 8px',
                      fontSize: '0.74rem',
                      color: 'var(--text)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      border: '1px solid var(--border)',
                      borderRadius: 6,
                      background: 'var(--surface)',
                    }}
                    title="Start a fresh chat conversation"
                  >
                    <Plus size={13} style={{ color: 'var(--accent)' }} />
                    <span>New Chat</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsChatCollapsed(true)}
                    className="btn btn-ghost btn-sm"
                    style={{ height: 26, width: 26, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}
                    title="Collapse chat to expand workspace"
                  >
                    <PanelLeftClose size={15} />
                  </button>
                </div>
              </div>

              {/* Source Material Selector Bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 6,
                  padding: '6px 10px',
                  background: 'var(--bg)',
                  borderRadius: 6,
                  border: '1px solid var(--border-subtle)',
                  marginBottom: 10,
                  flexShrink: 0,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                  <BookOpen size={12} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                  <select
                    value={activeNoteId || ''}
                    onChange={(e) => handleSelectSourceNote(e.target.value)}
                    className="input-text"
                    style={{
                      height: 24,
                      fontSize: '0.74rem',
                      width: '100%',
                      padding: '0 6px',
                      background: 'transparent',
                      color: 'var(--text)',
                      borderRadius: 4,
                      border: 'none',
                      outline: 'none',
                    }}
                  >
                    {lectureNotesList.length === 0 ? (
                      <option value="">No materials uploaded</option>
                    ) : (
                      lectureNotesList.map((note) => (
                        <option key={note.id} value={note.id}>
                          {note.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

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
                  className="btn btn-ghost btn-sm"
                  style={{ height: 24, padding: '0 6px', fontSize: '0.72rem', flexShrink: 0 }}
                  title="Upload new lecture document"
                >
                  {isUploadingChatFile ? <Loader2 size={11} className="spin" /> : <Paperclip size={11} />}
                  <span>Upload</span>
                </button>
              </div>

              {/* Scrollable Message Thread */}
              <div
                ref={chatContainerRef}
                className="custom-scroll"
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  padding: '8px 4px 12px 2px',
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
                            background: 'var(--surface-alt)',
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
                          maxWidth: '88%',
                          padding: '10px 14px',
                          borderRadius: 8,
                          fontSize: '0.82rem',
                          lineHeight: 1.5,
                          background: isUser ? 'var(--accent)' : 'var(--bg)',
                          border: isUser ? '1px solid var(--accent)' : '1px solid var(--border)',
                          color: isUser ? 'var(--on-accent)' : 'var(--text)',
                        }}
                      >
                        <p style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                          {msg.content}
                        </p>

                        {/* 1-Click Blueprint Generation Card */}
                        {msg.readyToGenerate && (
                          <div
                            style={{
                              marginTop: 10,
                              padding: '10px 12px',
                              background: 'var(--surface)',
                              border: '1px solid var(--border)',
                              borderRadius: 6,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 8,
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: 'var(--accent)', fontWeight: 600 }}>
                              <CheckCircle2 size={14} />
                              <span>
                                {assessmentType === 'assignment' ? 'Assignment Blueprint Ready' : 'Exam Blueprint Ready'} ({msg.questionCount || questionCount} Questions)
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleGenerateAssessment(msg.suggestedPrompt, msg.questionCount)}
                              disabled={loading}
                              className="btn btn-primary btn-sm"
                              style={{
                                border: 'none',
                                fontSize: '0.78rem',
                                padding: '6px 14px',
                                alignSelf: 'flex-start',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                fontWeight: 600,
                              }}
                            >
                              {loading ? <Loader2 size={13} className="spin" /> : <Sparkles size={13} />}
                              <span>
                                {loading
                                  ? 'Generating with AI...'
                                  : (assessmentType === 'assignment' ? 'Generate Assignment' : 'Generate Exam Paper')
                                }
                              </span>
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
                        background: 'var(--surface-alt)',
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
                        padding: '6px 12px',
                        borderRadius: 6,
                        background: 'var(--bg)',
                        border: '1px solid var(--border)',
                        fontSize: '0.78rem',
                        color: 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <Loader2 size={12} className="spin" />
                      <span>Formulating questions & rubrics...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Pinned Chat Input Area */}
              <div
                style={{
                  flexShrink: 0,
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <textarea
                  ref={chatInputRef}
                  rows={2}
                  value={chatInput}
                  onChange={(e) => {
                    setChatInput(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendChatMessage();
                    }
                  }}
                  placeholder="Message Didactic AI..."
                  className="input-textarea"
                  style={{
                    width: '100%',
                    minHeight: 38,
                    maxHeight: 140,
                    resize: 'none',
                    fontSize: '0.84rem',
                    padding: 0,
                    borderRadius: 0,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: 'var(--text)',
                    lineHeight: 1.45,
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-wrap',
                    overflowY: 'auto',
                  }}
                  disabled={isChatLoading || loading}
                />

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: 4,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => chatFileInputRef.current?.click()}
                    disabled={isUploadingChatFile || isChatLoading || loading}
                    className="btn btn-ghost btn-sm"
                    style={{
                      height: 28,
                      width: 28,
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 6,
                      color: 'var(--text-muted)',
                    }}
                    title="Attach lecture notes (PDF, PPTX, DOCX)"
                  >
                    {isUploadingChatFile ? <Loader2 size={13} className="spin" /> : <Paperclip size={13} />}
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      ↵ Enter to send
                    </span>

                    <button
                      type="button"
                      onClick={() => handleSendChatMessage()}
                      disabled={!chatInput.trim() || isChatLoading || loading}
                      className="btn btn-primary btn-sm"
                      style={{
                        height: 28,
                        width: 28,
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'var(--accent)',
                        color: 'var(--on-accent)',
                        border: 'none',
                        cursor: !chatInput.trim() || isChatLoading ? 'not-allowed' : 'pointer',
                        opacity: !chatInput.trim() || isChatLoading ? 0.45 : 1,
                        borderRadius: 6,
                      }}
                      title="Send message"
                    >
                      {isChatLoading ? <Loader2 size={13} className="spin" /> : <Send size={13} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------------- */}
          {/* RIGHT COLUMN: LIVE ASSESSMENT CANVAS & STUDIO                      */}
          {/* ------------------------------------------------------------------- */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
            {/* Active Assessment Top Bar */}
            <div
              className="cartesia-card"
              style={{
                padding: '12px 18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 10,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {isChatCollapsed && (
                  <button
                    type="button"
                    onClick={() => setIsChatCollapsed(false)}
                    className="btn btn-secondary btn-sm"
                    style={{ height: 30, padding: '0 8px', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: 5 }}
                    title="Re-open Didactic AI"
                  >
                    <PanelLeftOpen size={13} />
                    <span>Open Didactic AI</span>
                  </button>
                )}

                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: 'var(--surface-alt)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent)',
                    flexShrink: 0,
                  }}
                >
                  <FileCheck size={16} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h2 style={{ fontSize: '0.96rem', fontWeight: 600, color: 'var(--text)', margin: 0 }}>
                      {assessmentTitle || assessment?.title || (assessmentType === 'assignment' ? 'Draft Assignment' : 'Draft Examination Paper')}
                    </h2>
                    {isLocked && (
                      <span className="badge" style={{ background: 'var(--warning-bg)', color: 'var(--warning)', border: '1px solid var(--warning)', fontSize: '0.68rem', padding: '1px 6px' }}>
                        Locked
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: 0, marginTop: 2 }}>
                    {questions.length} questions • {totalMaxPoints} total marks • Cloud Synchronized
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {assessment && (
                  <>
                    <button
                      onClick={(e) => handleDownloadPdf(e, assessment.id, false)}
                      disabled={isDownloadingPdf}
                      className="btn btn-primary btn-sm"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        border: 'none',
                        padding: '6px 12px',
                        fontSize: '0.78rem',
                        fontWeight: 500,
                      }}
                      title="Download printable student exam paper with candidate instructions and ruled answer lines"
                    >
                      {isDownloadingPdf ? <Loader2 size={12} className="spin" /> : <Download size={12} />}
                      <span>{assessmentType === 'assignment' || /assignment|project|coursework|homework/i.test(assessmentTitle || assessment?.title || '') ? 'Download Assignment (PDF)' : 'Download Exam Paper (PDF)'}</span>
                    </button>

                    <button
                      onClick={(e) => handleDownloadPdf(e, assessment.id, true)}
                      disabled={isDownloadingPdf}
                      className="btn btn-secondary btn-sm"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        border: '1px solid var(--border)',
                        color: 'var(--text)',
                        padding: '6px 12px',
                        fontSize: '0.78rem',
                        fontWeight: 500,
                      }}
                      title="Download official instructor solution key with answer keys and rubric criteria"
                    >
                      <FileText size={12} />
                      <span>{assessmentType === 'assignment' || /assignment|project|coursework|homework/i.test(assessmentTitle || assessment?.title || '') ? 'Solution & Rubric (PDF)' : 'Download Solution Key (PDF)'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab && setActiveTab('grading')}
                      className="btn btn-secondary btn-sm"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        border: '1px solid var(--border)',
                        color: 'var(--text)',
                        padding: '6px 12px',
                        fontSize: '0.78rem',
                        fontWeight: 500,
                      }}
                      title="Open Paper Grading Studio"
                    >
                      <GraduationCap size={13} />
                      <span>Grade Papers</span>
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={handleNewAssessment}
                  className="btn btn-ghost btn-sm"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    color: 'var(--text-muted)',
                    padding: '6px 10px',
                    fontSize: '0.76rem',
                  }}
                  title="Start a new assessment from scratch"
                >
                  <Plus size={13} />
                  <span>New Assessment</span>
                </button>
              </div>
            </div>

            {/* Paper Grading Workflow Banner */}
            {assessment && showGradingBanner && (
              <div
                className="cartesia-card"
                style={{
                  padding: '10px 16px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 10,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      background: 'var(--surface-alt)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--accent)',
                      flexShrink: 0,
                    }}
                  >
                    <GraduationCap size={15} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <h4 style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)', margin: 0 }}>
                        Ready to Grade Student Answer Papers?
                      </h4>
                      <span className="badge badge-accent" style={{ fontSize: '0.66rem', padding: '1px 6px' }}>
                        Paper Grading
                      </span>
                    </div>
                    <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                      Upload scanned student answer papers (PDF, DOCX, images) to evaluate automatically against these rubrics.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setActiveTab && setActiveTab('grading')}
                    className="btn btn-primary btn-sm"
                    style={{
                      border: 'none',
                      padding: '5px 12px',
                      fontSize: '0.78rem',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                    }}
                  >
                    <span>Open Paper Grading Studio</span>
                    <ArrowRight size={13} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowGradingBanner(false)}
                    className="btn btn-ghost btn-sm"
                    style={{
                      padding: '4px 6px',
                      color: 'var(--text-muted)',
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                    }}
                    title="Dismiss banner"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            )}

            {isLocked && (
              <div style={{ padding: '10px 14px', borderRadius: 6, background: 'var(--warning-bg)', border: '1px solid var(--warning)', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem' }}>
                <Lock size={15} />
                <span>This assessment is server-locked because student work has been submitted or graded. Questions and rubrics are immutable.</span>
              </div>
            )}

            {error && (
              <div style={{ padding: 12, borderRadius: 6, background: 'var(--danger-bg)', color: 'var(--danger)', fontSize: '0.82rem' }}>
                {error}
              </div>
            )}

            {/* Assessment Pedagogical Analysis & Cognitive Breakdown Matrix */}
            {questions.length > 0 && (
              <div
                className="cartesia-card"
                style={{
                  padding: '12px 16px',
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
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showAnalysis ? 10 : 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <TrendingUp size={15} style={{ color: 'var(--accent)' }} />
                          <h3 style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)', margin: 0 }}>
                            Pedagogical Analysis & Cognitive Matrix
                          </h3>
                          <span className="badge badge-accent" style={{ fontSize: '0.64rem', padding: '1px 5px' }}>
                            Blueprint
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
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, paddingTop: 4 }}>
                          {/* Question Formats */}
                          <div style={{ padding: '8px 10px', borderRadius: 6, background: 'var(--bg)', border: '1px solid var(--border-subtle)' }}>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4, fontWeight: 500 }}>Question Formats</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem' }}>
                                <span>MCQs:</span>
                                <strong style={{ color: 'var(--accent)' }}>{mcqs.length} ({mcqPts} pts)</strong>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem' }}>
                                <span>Fill in the Blank:</span>
                                <strong style={{ color: 'var(--accent)' }}>{fitbs.length} ({fitbPts} pts)</strong>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem' }}>
                                <span>Written / Essay:</span>
                                <strong style={{ color: 'var(--accent)' }}>{written.length} ({writtenPts} pts)</strong>
                              </div>
                            </div>
                          </div>

                          {/* Bloom's Depth */}
                          <div style={{ padding: '8px 10px', borderRadius: 6, background: 'var(--bg)', border: '1px solid var(--border-subtle)' }}>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4, fontWeight: 500 }}>Bloom's Depth</div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>
                              {mcqs.length + fitbs.length >= written.length ? 'Foundational Recall' : 'Analytical Synthesis'}
                            </div>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                              <span className="badge badge-outline" style={{ fontSize: '0.64rem' }}>
                                {Math.round(((mcqs.length + fitbs.length) / Math.max(questions.length, 1)) * 100)}% Foundational
                              </span>
                              <span className="badge badge-outline" style={{ fontSize: '0.64rem' }}>
                                {Math.round((written.length / Math.max(questions.length, 1)) * 100)}% Higher-Order
                              </span>
                            </div>
                          </div>

                          {/* Estimated Pacing */}
                          <div style={{ padding: '8px 10px', borderRadius: 6, background: 'var(--bg)', border: '1px solid var(--border-subtle)' }}>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 2, fontWeight: 500 }}>Estimated Pacing</div>
                            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--accent)' }}>
                              ~{pacingMins} minutes
                            </div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 2 }}>
                              1.5m MCQ • 2m FITB • 5m Written
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            {/* Main Studio View: Canvas Waiting Room OR Questions Editor */}
            {questions.length === 0 ? (
              <div
                className="cartesia-card"
                style={{
                  textAlign: 'center',
                  padding: '48px 24px',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    background: 'var(--surface-alt)',
                    color: 'var(--accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Sparkles size={24} />
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text)', margin: 0 }}>
                  Assessment Workspace
                </h3>
                <p style={{ fontSize: '0.84rem', maxWidth: 480, margin: 0, lineHeight: 1.5 }}>
                  Ask Didactic AI on the left to generate questions from your lecture notes, or choose an option below to start drafting.
                </p>

                <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="btn btn-primary btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px' }}
                  >
                    <Plus size={14} />
                    <span>+ Add Manual Question</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsRubricModalOpen(true)}
                    className="btn btn-secondary btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px' }}
                  >
                    <Sparkles size={14} />
                    <span>Build Rubrics for Question</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleGenerateAssessment('5 balanced questions with complete answer keys and rubrics', 5)}
                    disabled={loading}
                    className="btn btn-secondary btn-sm"
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px' }}
                  >
                    {loading ? <Loader2 size={13} className="spin" /> : <Sparkles size={13} />}
                    <span>Generate 5-Question Blueprint</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Canvas Question Studio: Horizontal Question Navigation Bar + Side-by-Side Question & Rubric Blocks */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* 1. Horizontal Question Selector Bar */}
                <div
                  className="cartesia-card"
                  style={{
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    overflowX: 'auto',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto', flex: 1, paddingBottom: 2 }}>
                    {questions.map((q, idx) => {
                      const isSelected = activeQuestionIndex === idx;
                      const isMcq = /\b[A-D]\)/.test(q.text || '');
                      const isFitb = /____|fill in the blank/i.test(q.text || '') || q.question_type === 'fill_in_the_blank';
                      const pts = q.max_marks || q.max_points || 10;
                      return (
                        <button
                          key={q.id || idx}
                          type="button"
                          onClick={() => setActiveQuestionIndex(idx)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 12px',
                            borderRadius: 8,
                            cursor: 'pointer',
                            background: isSelected ? 'var(--accent)' : 'var(--bg)',
                            color: isSelected ? 'var(--on-accent)' : 'var(--text)',
                            border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
                            fontSize: '0.78rem',
                            fontWeight: isSelected ? 600 : 500,
                            whiteSpace: 'nowrap',
                            transition: 'all 0.15s ease',
                            flexShrink: 0,
                          }}
                        >
                          <span>Question {idx + 1}</span>
                          <span
                            style={{
                              fontSize: '0.66rem',
                              padding: '1px 5px',
                              borderRadius: 4,
                              background: isSelected ? 'rgba(255,255,255,0.22)' : 'var(--surface-alt)',
                              color: isSelected ? 'var(--on-accent)' : 'var(--text-muted)',
                            }}
                          >
                            {isMcq ? 'MCQ • ' : isFitb ? 'FITB • ' : ''}{pts} pts
                          </span>
                        </button>
                      );
                    })}

                    {!isLocked && (
                      <button
                        type="button"
                        onClick={handleAddQuestion}
                        className="btn btn-secondary btn-sm"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '6px 12px',
                          fontSize: '0.76rem',
                          height: 32,
                          flexShrink: 0,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <Plus size={13} />
                        <span>Add Question</span>
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, paddingLeft: 8, borderLeft: '1px solid var(--border-subtle)' }}>
                    <span className="badge badge-accent" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
                      {questions.length} Questions • {totalMaxPoints} Total Marks
                    </span>
                  </div>
                </div>

                {/* 2. Side-by-Side: Question Block on Left & Rubrics Block on Right */}
                {currentQ && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
                      gap: 14,
                      alignItems: 'start',
                    }}
                  >
                    {/* Left Block: Question Prompt, Model Solution & Marks */}
                    <div className="cartesia-card" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                            style={{ color: 'var(--danger)', fontSize: '0.76rem' }}
                            title="Delete question"
                          >
                            <Trash2 size={13} />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>

                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label" style={{ fontSize: '0.8rem' }}>Question Prompt</label>
                        <textarea
                          rows={4}
                          value={currentQ.text || currentQ.prompt || ''}
                          onChange={(e) => handleUpdateQuestion(activeQuestionIndex, 'text', e.target.value)}
                          disabled={isLocked}
                          className="input-textarea"
                          style={{ fontSize: '0.86rem' }}
                          placeholder="Enter the examination question prompt..."
                        />
                      </div>

                      {/* Official Answer Key / Model Solution Box */}
                      <div
                        style={{
                          padding: '10px 14px',
                          borderRadius: 8,
                          background: 'var(--surface)',
                          border: '1px solid var(--border)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                            <CheckCircle2 size={13} />
                            <span>Official Answer Key & Model Solution</span>
                          </label>
                          <span className="badge badge-accent" style={{ fontSize: '0.64rem', padding: '1px 5px' }}>
                            Ground Truth Key
                          </span>
                        </div>
                        <textarea
                          rows={3}
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
                            fontSize: '0.82rem',
                            background: 'var(--bg)',
                            borderColor: 'var(--border)',
                            color: 'var(--text)',
                            borderRadius: 6,
                          }}
                          placeholder="Enter the official answer key or correct choice (e.g. 'B) It requires a sorted array')..."
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12 }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.8rem' }}>Max Marks</label>
                          <input
                            type="number"
                            step="0.5"
                            min="1"
                            value={currentQ.max_marks || currentQ.max_points || 10}
                            onChange={(e) => handleUpdateQuestion(activeQuestionIndex, 'max_marks', parseFloat(e.target.value) || 10)}
                            disabled={isLocked}
                            className="input-text"
                            style={{ fontSize: '0.84rem' }}
                          />
                        </div>

                        <div className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: '0.8rem' }}>Student Hint (Optional)</label>
                          <input
                            type="text"
                            value={currentQ.student_hint || ''}
                            onChange={(e) => handleUpdateQuestion(activeQuestionIndex, 'student_hint', e.target.value)}
                            disabled={isLocked}
                            className="input-text"
                            style={{ fontSize: '0.84rem' }}
                            placeholder="e.g. Consider mutual exclusion vs deadlock conditions..."
                          />
                        </div>
                      </div>
                    </div>

                    {/* Right Block: Type-Aware Evaluation Schema: Objective vs Subjective Rubric */}
                    {(() => {
                      const isCurrentQMcq = /\b[A-D]\)/.test(currentQ?.text || '');
                      const isCurrentQFitb = /____|fill in the blank/i.test(currentQ?.text || '') || currentQ?.question_type === 'fill_in_the_blank';
                      const isCurrentQObjective = isCurrentQMcq || isCurrentQFitb;

                      if (isCurrentQObjective) {
                        return (
                          <div className="cartesia-card" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <CheckCircle2 size={16} style={{ color: 'var(--accent)' }} />
                                <h3 style={{ fontSize: '0.9rem', fontWeight: 600, margin: 0 }}>
                                  Evaluation Schema: Question {activeQuestionIndex + 1}
                                </h3>
                                <span className="badge badge-accent" style={{ fontSize: '0.66rem', padding: '1px 6px' }}>
                                  {isCurrentQMcq ? 'Multiple Choice (MCQ)' : 'Fill in the Blank'}
                                </span>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span className="badge badge-outline" style={{ fontSize: '0.7rem' }}>
                                  Binary Key Scoring ({currentQ.max_marks || currentQ.max_points || 1} pt)
                                </span>
                                {!isLocked && (
                                  <button
                                    type="button"
                                    onClick={() => handleAddCriterion(activeQuestionIndex)}
                                    className="btn btn-secondary btn-sm"
                                    style={{ fontSize: '0.74rem', height: 26, padding: '0 8px' }}
                                    title="Attach custom partial credit criteria for this question if needed"
                                  >
                                    <Plus size={11} />
                                    <span>Add Custom Rubric</span>
                                  </button>
                                )}
                              </div>
                            </div>

                            <div style={{ padding: '10px 14px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--accent)' }}>
                                  {isCurrentQMcq ? 'Objective Choice Verification' : 'Exact Term Verification'}
                                </span>
                              </div>
                              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.45 }}>
                                {isCurrentQMcq
                                  ? 'This question is evaluated objectively against the Official Answer Key above (100% binary scoring). Full points are awarded when the student indicates the designated option (A, B, C, or D). Subjective multi-criteria rubrics are bypassed for objective questions to ensure fast, fair, and reliable grading.'
                                  : 'This question is evaluated directly against the target term in the Official Answer Key above. Full points are awarded when the student supplies the correct term or accepted domain synonym.'}
                              </p>
                            </div>

                            {/* If teacher added custom criteria */}
                            {(currentQ.rubric?.criteria || []).length > 0 && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                                <span style={{ fontSize: '0.74rem', color: 'var(--text)', fontWeight: 600 }}>
                                  Custom Evaluation Criteria:
                                </span>
                                {currentQ.rubric.criteria.map((crit, cIdx) => (
                                  <div
                                    key={crit.id || cIdx}
                                    style={{
                                      display: 'grid',
                                      gridTemplateColumns: '1fr 90px auto',
                                      gap: 10,
                                      alignItems: 'center',
                                      padding: '8px 10px',
                                      borderRadius: 4,
                                      background: 'var(--bg)',
                                      border: '1px solid var(--border-subtle)',
                                    }}
                                  >
                                    <input
                                      type="text"
                                      value={crit.description || crit.name || ''}
                                      onChange={(e) => handleUpdateCriterion(activeQuestionIndex, cIdx, 'description', e.target.value)}
                                      disabled={isLocked}
                                      className="input-text"
                                      style={{ fontSize: '0.8rem' }}
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
                                        style={{ fontSize: '0.8rem', textAlign: 'center' }}
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
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      }

                      return (
                        <div className="cartesia-card" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <Award size={16} style={{ color: 'var(--accent)' }} />
                              <h3 style={{ fontSize: '0.9rem', fontWeight: 600, margin: 0 }}>Grading Rubric for Question {activeQuestionIndex + 1}</h3>
                            </div>

                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
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
                                    border: '1px solid var(--border)',
                                    color: 'var(--text)',
                                    background: 'var(--surface)',
                                    fontSize: '0.76rem',
                                  }}
                                  title="Generate standardized grading criteria and point distribution with AI for this question prompt"
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
                                  style={{ fontSize: '0.76rem' }}
                                  title="Regenerate rubric with AI"
                                >
                                  <RefreshCw size={11} className={generatingRubricId === currentQ.id ? 'spin' : ''} />
                                  <span>Regenerate</span>
                                </button>
                              )}
                              {!isLocked && (
                                <button
                                  onClick={() => handleAddCriterion(activeQuestionIndex)}
                                  className="btn btn-secondary btn-sm"
                                  style={{ fontSize: '0.76rem' }}
                                >
                                  <Plus size={11} />
                                  <span>Add Criterion</span>
                                </button>
                              )}
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {(currentQ.rubric?.criteria || []).length === 0 ? (
                              <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                No rubric criteria defined. Click Add Criterion or Generate Rubric above.
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
                                    style={{ fontSize: '0.8rem' }}
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
                                      style={{ fontSize: '0.8rem', textAlign: 'center' }}
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
                      );
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. CUSTOM QUESTION RUBRIC GENERATOR MODAL                                 */}
      {/* ========================================================================= */}
      {isRubricModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
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
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-card)',
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
                  background: 'var(--surface-alt)',
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
                  Provide your custom exam or assignment question. Didactic AI will generate standardized criteria with point allocations.
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
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {isGeneratingCustomRubric ? <Loader2 size={13} className="spin" /> : <Sparkles size={13} />}
                <span>{isGeneratingCustomRubric ? 'Generating Rubric...' : 'Generate Rubric & Add Question'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
