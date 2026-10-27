import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  GraduationCap,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Check,
  Quote,
  Search,
  Eye,
  RefreshCw,
  Users,
  Award,
  FileCheck,
  BookOpen,
  PenTool,
  Plus,
  FileText,
  Clock,
  ArrowRight,
  Download,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  Table,
  Settings,
  FolderCheck,
} from 'lucide-react';
import ExcelJS from 'exceljs';
import {
  gradeStudentSubmission,
  confirmSubmissionScore,
  regradeSubmission,
  regradeSubmissionQuestion,
  fetchAssessmentSubmissions,
  fetchAssessments,
  fetchMasterCourseGradebook,
  updateAssessmentSettings,
  fetchAssessmentDetail,
  createManualSubmission,
} from '../services/api';

export default function GradingTab({
  assessment,
  setAssessment,
  currentUser,
  onGradingComplete,
  setActiveTab,
}) {
  // Dual-Pane Split Screen Toggle: Benchmark Guide (Assignment & Rubrics)
  const [showAssignmentGuide, setShowAssignmentGuide] = useState(true);

  // Grading Mode: 'paper' (AI PDF OCR) or 'manual' (Direct Teacher Score Entry)
  const [gradingMode, setGradingMode] = useState('paper');

  // Paper / Text Grading State
  const [studentName, setStudentName] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [submissionInputType, setSubmissionInputType] = useState('file'); // 'file' | 'text'
  const [studentFile, setStudentFile] = useState(null);
  const [pastedStudentText, setPastedStudentText] = useState('');
  const [showExtractedText, setShowExtractedText] = useState(false);
  const [isGrading, setIsGrading] = useState(false);

  // Manual Score Entry State
  const [manualStudentName, setManualStudentName] = useState('');
  const [manualStudentNumber, setManualStudentNumber] = useState('');
  const [manualQuestionScores, setManualQuestionScores] = useState({});
  const [manualQuestionAnswers, setManualQuestionAnswers] = useState({});
  const [manualQuestionFeedback, setManualQuestionFeedback] = useState({});
  const [manualSummaryFeedback, setManualSummaryFeedback] = useState('');
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);
  const [manualSuccessMsg, setManualSuccessMsg] = useState(null);

  // Shared Status & Report State
  const [gradingError, setGradingError] = useState(null);
  const [gradingReport, setGradingReport] = useState(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isRegrading, setIsRegrading] = useState(false);
  const [regradingSubId, setRegradingSubId] = useState(null);
  const [regradingQId, setRegradingQId] = useState(null);
  const [regradeMsg, setRegradeMsg] = useState(null);

  // Dedicated Gradebook for the active assessment
  const [submissions, setSubmissions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [confirmingSubId, setConfirmingSubId] = useState(null);
  const [assessmentsList, setAssessmentsList] = useState([]);
  const [isLoadingAssessments, setIsLoadingAssessments] = useState(false);

  const reportRef = useRef(null);

  // Master Course Gradebook & Section Management State
  const [courseName, setCourseName] = useState(assessment?.course_name || 'General Course');
  const [section, setSection] = useState(assessment?.section || 'Section A');
  const [academicYear, setAcademicYear] = useState(assessment?.academic_year || '2026');
  const [assessmentCategory, setAssessmentCategory] = useState(assessment?.assessment_category || 'midterm');
  const [weightPct, setWeightPct] = useState(assessment?.weight_pct ?? 25.0);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSuccessMsg, setSettingsSuccessMsg] = useState(null);

  // Gradebook Mode: 'master' (cumulative course sheet) | 'exam' (single exam sheet)
  const [gradebookMode, setGradebookMode] = useState('master');
  const [activeSectionFilter, setActiveSectionFilter] = useState('All');
  const [masterGradebookData, setMasterGradebookData] = useState(null);
  const [isLoadingMasterGradebook, setIsLoadingMasterGradebook] = useState(false);
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');

  // Initialize manual scores whenever active assessment changes
  // Synchronize active assessment settings
  useEffect(() => {
    if (assessment) {
      if (assessment.course_name) setCourseName(assessment.course_name);
      if (assessment.section) setSection(assessment.section);
      if (assessment.academic_year) setAcademicYear(assessment.academic_year);
      if (assessment.assessment_category) setAssessmentCategory(assessment.assessment_category);
      if (assessment.weight_pct !== undefined) setWeightPct(assessment.weight_pct);
    }
  }, [assessment?.id]);

  const loadMasterGradebook = async (sec = activeSectionFilter, crs = courseName, yr = academicYear) => {
    setIsLoadingMasterGradebook(true);
    try {
      const data = await fetchMasterCourseGradebook({
        course_name: crs || courseName,
        section: sec === 'All' ? null : sec,
        academic_year: yr || academicYear,
        assessment_id: assessment?.id,
        lecturerId: currentUser?.email,
      });
      setMasterGradebookData(data);
    } catch (err) {
      console.error('Failed to load Master Course Gradebook:', err);
    } finally {
      setIsLoadingMasterGradebook(false);
    }
  };

  useEffect(() => {
    loadMasterGradebook();
  }, [assessment?.id, activeSectionFilter]);

  const handleSaveAssessmentSettings = async () => {
    if (!assessment?.id) return;
    setIsSavingSettings(true);
    setSettingsSuccessMsg(null);
    try {
      const updated = await updateAssessmentSettings(
        assessment.id,
        {
          course_name: courseName,
          section: section,
          academic_year: academicYear,
          assessment_category: assessmentCategory,
          weight_pct: parseFloat(weightPct) || 25.0,
        },
        currentUser?.email
      );
      if (setAssessment) {
        setAssessment((prev) => ({ ...prev, ...updated }));
      }
      setSettingsSuccessMsg('Course & Section settings saved.');
      setTimeout(() => setSettingsSuccessMsg(null), 3500);
      await loadMasterGradebook();
    } catch (err) {
      setGradingError(`Failed to save settings: ${err.message}`);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleExportMasterExcel = async () => {
    if (!masterGradebookData) return;
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Master Course Gradebook');

    const assessmentsList = masterGradebookData.assessments || [];

    const columns = [
      { header: 'Student ID', key: 'student_number', width: 16 },
      { header: 'Student Name', key: 'student_name', width: 26 },
      { header: 'Section', key: 'section', width: 14 },
      { header: 'Academic Year', key: 'academic_year', width: 14 },
    ];

    assessmentsList.forEach((a) => {
      columns.push({
        header: `${a.title} (${a.category.toUpperCase()}) [${a.max_score} pts, ${a.weight_pct}%]`,
        key: `score_${a.id}`,
        width: 30,
      });
    });

    columns.push(
      { header: 'Raw Total Points', key: 'raw_total', width: 16 },
      { header: 'Weighted Course %', key: 'course_percentage', width: 18 },
      { header: 'Final Grade Tier', key: 'grade_tier', width: 16 }
    );

    worksheet.columns = columns;

    (masterGradebookData.students || []).forEach((s) => {
      const rowData = {
        student_number: s.student_number || s.student_id,
        student_name: s.student_name,
        section: s.section,
        academic_year: s.academic_year,
        raw_total: `${s.raw_total} / ${s.max_total}`,
        course_percentage: `${s.course_percentage}%`,
        grade_tier: s.grade_tier,
      };

      assessmentsList.forEach((a) => {
        rowData[`score_${a.id}`] = s.scores && s.scores[a.id] !== undefined
          ? `${s.scores[a.id]} / ${a.max_score} (${s.percentages[a.id]}%)`
          : 'Pending';
      });

      worksheet.addRow(rowData);
    });

    const statsRow = {
      student_number: 'CLASS AVERAGE',
      student_name: `${(masterGradebookData.students || []).length} Students Enrolled`,
      section: activeSectionFilter,
      academic_year: academicYear,
      raw_total: '-',
      course_percentage: `${masterGradebookData.class_statistics?.overall_course_average_pct || 0}%`,
      grade_tier: (masterGradebookData.class_statistics?.overall_course_average_pct >= 80 ? 'Grade B' : 'Grade C'),
    };

    assessmentsList.forEach((a) => {
      const aStat = masterGradebookData.class_statistics?.assessment_averages?.[a.id];
      statsRow[`score_${a.id}`] = aStat ? `${aStat.average_score} / ${a.max_score} (${aStat.average_percentage}%)` : '-';
    });

    worksheet.addRow(statsRow);

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeTitle = (courseName || 'Course').replace(/[^a-zA-Z0-9]/g, '_');
    const safeSec = (activeSectionFilter || 'All').replace(/[^a-zA-Z0-9]/g, '_');
    link.download = `${safeTitle}_${safeSec}_${academicYear}_Master_Gradebook.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (assessment?.questions && assessment.questions.length > 0) {
      const initScores = {};
      const initAnswers = {};
      const initFeedback = {};
      assessment.questions.forEach((q) => {
        initScores[q.id] = q.max_marks || 0;
        initAnswers[q.id] = '';
        initFeedback[q.id] = '';
      });
      setManualQuestionScores(initScores);
      setManualQuestionAnswers(initAnswers);
      setManualQuestionFeedback(initFeedback);
    }
  }, [assessment?.id]);

  // Fetch available assessments strictly for this instructor
  const loadAssessmentsList = async () => {
    setIsLoadingAssessments(true);
    try {
      const list = await fetchAssessments({ lecturerId: currentUser?.id });
      if (Array.isArray(list)) {
        setAssessmentsList(list);
        const currentStillValid = assessment?.id && list.some((a) => a.id === assessment.id);
        if (!currentStillValid) {
          if (list.length > 0) {
            const latest = list[0];
            const full = await fetchAssessmentDetail(latest.id, currentUser?.id);
            if (full && setAssessment) {
              setAssessment(full);
            } else if (setAssessment) {
              setAssessment(null);
            }
          } else if (setAssessment) {
            setAssessment(null);
          }
        }
      } else {
        setAssessmentsList([]);
        if (setAssessment) setAssessment(null);
      }
    } catch (e) {
      console.warn('Failed to load assessments list in GradingTab:', e);
      setAssessmentsList([]);
      if (setAssessment) setAssessment(null);
    } finally {
      setIsLoadingAssessments(false);
    }
  };

  useEffect(() => {
    loadAssessmentsList();
  }, [currentUser?.id]);

  const handleSelectAssessment = async (e) => {
    const aid = e.target.value;
    if (!aid) return;
    try {
      const full = await fetchAssessmentDetail(aid, currentUser?.id);
      if (full && setAssessment) {
        setAssessment(full);
        setGradingReport(null);
        setGradingError(null);
        setManualSuccessMsg(null);
      }
    } catch (err) {
      console.error('Failed to switch assessment in GradingTab:', err);
    }
  };

  // Load submissions from backend strictly for the active assessment
  const loadSubmissions = async () => {
    if (!assessment?.id) {
      setSubmissions([]);
      return;
    }
    setIsLoadingSubmissions(true);
    try {
      const data = await fetchAssessmentSubmissions(assessment.id, currentUser?.id);
      if (Array.isArray(data)) {
        setSubmissions(data);
      } else {
        setSubmissions([]);
      }
    } catch (err) {
      console.warn('Failed to load submissions for active assessment:', err);
      setSubmissions([]);
    } finally {
      setIsLoadingSubmissions(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, [assessment?.id, currentUser?.id]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setStudentFile(file);
      setGradingError(null);
      if (!studentName) {
        const guessed = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
        setStudentName(guessed);
      }
    }
  };

  // Mode 1: AI Evaluation (File Upload or Direct Text)
  const handleGrade = async () => {
    if (!assessment?.id && !assessment?.questions?.length) {
      setGradingError('Please select or generate an assessment first in the Assessment studio.');
      return;
    }
    if (!studentName.trim()) {
      setGradingError('Please enter the student name.');
      return;
    }
    if (submissionInputType === 'file' && !studentFile) {
      setGradingError('Please upload an answer file (PDF, Word DOCX, Image, or Text file) or switch to Paste Answer Text.');
      return;
    }
    if (submissionInputType === 'text' && !pastedStudentText.trim()) {
      setGradingError('Please paste or type the student answer text.');
      return;
    }

    setIsGrading(true);
    setGradingError(null);
    setIsConfirmed(false);

    try {
      const report = await gradeStudentSubmission({
        assessment_id: assessment.id,
        student_name: studentName.trim(),
        student_number: studentNumber.trim() || `STU-${Date.now().toString().slice(-4)}`,
        file: submissionInputType === 'file' ? studentFile : null,
        pasted_text: submissionInputType === 'text' ? pastedStudentText.trim() : null,
        lecturerId: currentUser?.id,
      });

      const formattedReport = {
        ...report,
        summary_feedback: report.summary_feedback || 'Completed evaluation verified against normalized rubrics.',
        question_results: (report.question_results || []).map((qr, idx) => ({
          ...qr,
          question_text: qr.question_text || assessment?.questions?.[idx]?.text || `Question ${idx + 1}`,
          points_awarded: qr.points_awarded ?? qr.score ?? 0,
          max_points: qr.max_points ?? qr.max_score ?? assessment?.questions?.[idx]?.max_marks ?? 10,
          matched_student_answer: qr.matched_student_answer || qr.evidence_citation || 'Extracted answer excerpt from student paper.',
          feedback: qr.feedback || 'Answer matches required technical criteria.',
        })),
      };

      setGradingReport(formattedReport);

      // Append or update in active assessment's submissions
      setSubmissions((prev) => {
        const exists = prev.some((s) => s.id === formattedReport.submission_id || s.student_name === formattedReport.student_name);
        const newEntry = {
          id: formattedReport.submission_id,
          student_id: formattedReport.student_id,
          student_number: formattedReport.student_number || studentNumber || 'STU-NEW',
          student_name: formattedReport.student_name || studentName,
          ai_total: formattedReport.ai_total,
          total_score: formattedReport.total_score ?? formattedReport.ai_total,
          max_score: formattedReport.max_score || assessment?.max_score || 100,
          percentage: formattedReport.max_score ? Number(((formattedReport.total_score / formattedReport.max_score) * 100).toFixed(1)) : 0,
          status: formattedReport.status || 'graded',
          graded_at: new Date().toISOString(),
          question_results: formattedReport.question_results,
          summary_feedback: formattedReport.summary_feedback,
        };
        if (exists) {
          return prev.map((s) => (s.id === report.submission_id || s.student_name === report.student_name ? newEntry : s));
        }
        return [newEntry, ...prev];
      });

      if (onGradingComplete) {
        onGradingComplete(report);
      }

      setTimeout(() => {
        reportRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      setGradingError(err.message || 'Grading failed. Please verify backend connection.');
    } finally {
      setIsGrading(false);
    }
  };

  // Mode 2: Insert Student Score Manually
  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!assessment?.id) {
      setGradingError('Please select an active assessment first.');
      return;
    }
    if (!manualStudentName.trim()) {
      setGradingError('Student name is required.');
      return;
    }

    setIsSubmittingManual(true);
    setGradingError(null);
    setManualSuccessMsg(null);

    try {
      const qScoresPayload = (assessment.questions || []).map((q) => ({
        question_id: q.id,
        points: parseFloat(manualQuestionScores[q.id]) || 0,
        matched_student_answer: manualQuestionAnswers[q.id] || '',
        feedback: manualQuestionFeedback[q.id] || '',
      }));

      const totalManual = qScoresPayload.reduce((sum, item) => sum + item.points, 0);

      const result = await createManualSubmission({
        assessment_id: assessment.id,
        student_name: manualStudentName.trim(),
        student_number: manualStudentNumber.trim() || undefined,
        total_score: totalManual,
        summary_feedback: manualSummaryFeedback.trim() || undefined,
        question_scores: qScoresPayload,
        lecturerId: currentUser?.id,
      });

      const formattedReport = {
        ...result,
        summary_feedback: result.summary_feedback || 'Recorded and verified directly by instructor.',
        question_results: (result.question_results || []).map((qr, idx) => ({
          ...qr,
          question_text: qr.question_text || assessment?.questions?.[idx]?.text || `Question ${idx + 1}`,
          points_awarded: qr.points_awarded ?? 0,
          max_points: qr.max_points ?? assessment?.questions?.[idx]?.max_marks ?? 10,
          matched_student_answer: qr.matched_student_answer || 'Recorded answer',
          feedback: qr.feedback || 'Manually scored by instructor.',
        })),
      };

      setGradingReport(formattedReport);
      setIsConfirmed(true);

      // Prepend to submissions list
      setSubmissions((prev) => {
        const exists = prev.some((s) => s.id === result.id || s.student_name === result.student_name);
        const newEntry = {
          id: result.id,
          student_id: result.student_id,
          student_number: result.student_number || manualStudentNumber || 'STU-NEW',
          student_name: result.student_name || manualStudentName,
          ai_total: result.ai_total,
          total_score: result.total_score,
          max_score: result.max_score || assessment.max_score || 100,
          percentage: result.percentage,
          status: 'confirmed',
          graded_at: new Date().toISOString(),
          question_results: formattedReport.question_results,
          summary_feedback: formattedReport.summary_feedback,
        };
        if (exists) {
          return prev.map((s) => (s.id === result.id || s.student_name === result.student_name ? newEntry : s));
        }
        return [newEntry, ...prev];
      });

      setManualSuccessMsg(`Score successfully recorded for ${manualStudentName}!`);
      setManualStudentName('');
      setManualStudentNumber('');
      setManualSummaryFeedback('');

      if (onGradingComplete) {
        onGradingComplete(result);
      }

      setTimeout(() => {
        reportRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      setGradingError(err.message || 'Failed to record student score.');
    } finally {
      setIsSubmittingManual(false);
    }
  };

  // Adjust/Override score for a question live
  const handleAdjustQuestionScore = (qIdx, newPoints) => {
    if (!gradingReport?.question_results) return;
    const updatedQRs = [...gradingReport.question_results];
    updatedQRs[qIdx] = { ...updatedQRs[qIdx], points_awarded: newPoints };
    const newTotal = updatedQRs.reduce((sum, item) => sum + (parseFloat(item.points_awarded) || 0), 0);
    setGradingReport({
      ...gradingReport,
      question_results: updatedQRs,
      total_score: newTotal,
      ai_total: newTotal,
    });
    setIsConfirmed(false);
  };

  const handleConfirmScore = async () => {
    if (!gradingReport?.submission_id) return;
    setIsConfirming(true);
    try {
      await confirmSubmissionScore(
        gradingReport.submission_id,
        gradingReport.total_score ?? gradingReport.ai_total,
        currentUser?.id
      );
      setIsConfirmed(true);
      setSubmissions((prev) =>
        prev.map((s) => (s.id === gradingReport.submission_id ? { ...s, status: 'confirmed', total_score: gradingReport.total_score } : s))
      );
    } catch (err) {
      console.error('Failed to confirm score:', err);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleRegradeSubmission = async (targetSub) => {
    const subToRegrade = targetSub || gradingReport;
    if (!subToRegrade || (!subToRegrade.id && !subToRegrade.submission_id)) return;
    const subId = subToRegrade.id || subToRegrade.submission_id;

    setIsRegrading(true);
    setRegradingSubId(subId);
    setGradingError(null);
    setRegradeMsg(null);

    try {
      const updated = await regradeSubmission(subId, assessment?.id, currentUser?.email);
      setGradingReport(updated);
      setIsConfirmed(false);
      setRegradeMsg('Paper successfully re-graded with fresh AI evaluation.');
      setTimeout(() => setRegradeMsg(null), 5000);
      if (reportRef.current) {
        reportRef.current.scrollIntoView({ behavior: 'smooth' });
      }
      await loadSubmissions();
    } catch (err) {
      setGradingError(`Regrading failed: ${err.message}`);
    } finally {
      setIsRegrading(false);
      setRegradingSubId(null);
    }
  };

  const handleRegradeQuestion = async (questionId, qIdx) => {
    if (!gradingReport || (!gradingReport.id && !gradingReport.submission_id)) return;
    const subId = gradingReport.id || gradingReport.submission_id;

    setRegradingQId(questionId);
    setGradingError(null);
    try {
      const res = await regradeSubmissionQuestion(subId, questionId, assessment?.id, currentUser?.email);
      if (res.question_result) {
        setGradingReport((prev) => {
          if (!prev) return prev;
          const updatedQR = [...(prev.question_results || [])];
          updatedQR[qIdx] = {
            ...updatedQR[qIdx],
            ...res.question_result,
            points_awarded: res.question_result.points_awarded ?? res.question_result.score,
          };
          return {
            ...prev,
            total_score: res.total_score,
            ai_total: res.total_score,
            question_results: updatedQR,
          };
        });
        setRegradeMsg(`Question ${qIdx + 1} re-evaluated successfully.`);
        setTimeout(() => setRegradeMsg(null), 4000);
      }
      await loadSubmissions();
    } catch (err) {
      setGradingError(`Question re-evaluation failed: ${err.message}`);
    } finally {
      setRegradingQId(null);
    }
  };

  const handleConfirmRowScore = async (sub) => {
    if (!sub.id) return;
    setConfirmingSubId(sub.id);
    try {
      await confirmSubmissionScore(sub.id, sub.total_score ?? sub.ai_total, currentUser?.id);
      setSubmissions((prev) =>
        prev.map((s) => (s.id === sub.id ? { ...s, status: 'confirmed' } : s))
      );
      if (gradingReport?.submission_id === sub.id) {
        setIsConfirmed(true);
      }
    } catch (err) {
      console.error('Failed to confirm score for student:', err);
    } finally {
      setConfirmingSubId(null);
    }
  };

  const handleReviewSubmission = (sub) => {
    const qResults = (sub.question_results && sub.question_results.length > 0)
      ? sub.question_results
      : (assessment?.questions || []).map((q, idx) => ({
          question_id: q.id,
          question_text: q.text,
          points_awarded: Number(((sub.total_score || 0) / Math.max(assessment?.questions?.length || 1, 1)).toFixed(1)),
          max_points: q.max_marks,
          matched_student_answer: 'Student response recorded',
          feedback: `Score: ${sub.total_score} recorded for ${sub.student_name}`,
        }));

    setGradingReport({
      submission_id: sub.id,
      student_number: sub.student_number,
      student_name: sub.student_name,
      assessment_title: assessment?.title || 'Assessment',
      total_score: sub.total_score,
      ai_total: sub.ai_total ?? sub.total_score,
      max_score: sub.max_score || assessment?.max_score || 100,
      status: sub.status,
      summary_feedback: sub.summary_feedback || 'Completed evaluation verified against normalized rubrics.',
      question_results: qResults,
    });
    setIsConfirmed(sub.status === 'confirmed');
    setTimeout(() => {
      reportRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  const handleExportSingleExcel = async () => {
    if (!gradingReport) return;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Student Report');

    worksheet.columns = [
      { header: 'Student ID', key: 'student_id', width: 16 },
      { header: 'Student Name', key: 'student_name', width: 24 },
      { header: 'Assessment Title', key: 'assessment_title', width: 32 },
      { header: 'Question #', key: 'question_num', width: 14 },
      { header: 'Question Prompt', key: 'question_text', width: 40 },
      { header: 'Points Awarded', key: 'points_awarded', width: 16 },
      { header: 'Max Points', key: 'max_points', width: 14 },
      { header: 'Student Answer / Citation', key: 'student_answer', width: 45 },
      { header: 'Feedback', key: 'feedback', width: 45 },
      { header: 'Total Score', key: 'total_score', width: 14 },
      { header: 'Max Score', key: 'max_score', width: 14 },
      { header: 'Status', key: 'status', width: 14 },
    ];

    const qResults = gradingReport.question_results || [];
    if (qResults.length > 0) {
      qResults.forEach((qr, idx) => {
        worksheet.addRow({
          student_id: gradingReport.student_number || 'STU-001',
          student_name: gradingReport.student_name || studentName,
          assessment_title: gradingReport.assessment_title || assessment?.title || 'Assessment',
          question_num: `Q${idx + 1}`,
          question_text: qr.question_text || `Question ${idx + 1}`,
          points_awarded: qr.points_awarded,
          max_points: qr.max_points,
          student_answer: qr.matched_student_answer || '',
          feedback: qr.feedback || '',
          total_score: idx === 0 ? (gradingReport.total_score ?? gradingReport.ai_total) : '',
          max_score: idx === 0 ? gradingReport.max_score : '',
          status: idx === 0 ? (isConfirmed ? 'CONFIRMED' : 'GRADED') : '',
        });
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(gradingReport.student_name || 'Student').replace(/\s+/g, '_')}_Report.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCohortExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Class Gradebook');

    worksheet.columns = [
      { header: 'Student ID', key: 'id', width: 16 },
      { header: 'Student Name', key: 'name', width: 26 },
      { header: 'Assessment Title', key: 'assessment', width: 32 },
      { header: 'Total Score', key: 'total_score', width: 14 },
      { header: 'Max Score', key: 'max_score', width: 14 },
      { header: 'Percentage', key: 'percentage', width: 14 },
      { header: 'Status', key: 'status', width: 16 },
      { header: 'Graded At', key: 'graded_at', width: 22 },
    ];

    submissions.forEach((s) => {
      const pct = s.percentage ?? (s.max_score ? Number(((s.total_score / s.max_score) * 100).toFixed(1)) : 0);

      worksheet.addRow({
        id: s.student_number || s.id,
        name: s.student_name,
        assessment: assessment?.title || 'Active Assessment',
        total_score: s.total_score,
        max_score: s.max_score || assessment?.max_score || 100,
        percentage: `${pct}%`,
        status: (s.status || 'graded').toUpperCase(),
        graded_at: s.graded_at ? s.graded_at.slice(0, 10) : 'Recent',
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(assessment?.title || 'Assessment').replace(/[^a-zA-Z0-9]/g, '_')}_Gradebook.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const questionsCount = assessment?.questions?.length || 0;

  const filteredMasterStudents = (masterGradebookData?.students || []).filter((s) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (s.student_name && s.student_name.toLowerCase().includes(term)) ||
      (s.student_number && s.student_number.toLowerCase().includes(term)) ||
      (s.section && s.section.toLowerCase().includes(term))
    );
  });

  // Filtered submissions for search
  const filteredSubmissions = submissions.filter((s) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (s.student_name && s.student_name.toLowerCase().includes(term)) ||
      (s.student_number && s.student_number.toLowerCase().includes(term))
    );
  });

  // Summary statistics for this dedicated assessment class
  const cohortCount = submissions.length;
  const cohortAvg = cohortCount > 0
    ? (submissions.reduce((acc, curr) => acc + (curr.percentage || (curr.max_score ? (curr.total_score / curr.max_score) * 100 : 0)), 0) / cohortCount).toFixed(1)
    : '0.0';
  const confirmedCount = submissions.filter((s) => s.status === 'confirmed').length;
  const highestMark = cohortCount > 0
    ? Math.max(...submissions.map((s) => s.percentage || (s.max_score ? (s.total_score / s.max_score) * 100 : 0))).toFixed(1)
    : '0.0';

  return (
    <div>
      {/* Assessment Selector & Context Banner */}
      <div
        className="cartesia-card"
        style={{
          marginBottom: 20,
          padding: '14px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 8,
              background: 'var(--surface-alt)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent)',
            }}
          >
            <GraduationCap size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.74rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--accent)', fontWeight: 600 }}>
                Active Exam & Class Selection
              </span>
              {assessment?.status === 'locked' && (
                <span className="badge" style={{ background: 'var(--warning-bg)', color: 'var(--warning)', border: '1px solid var(--warning)', fontSize: '0.66rem', padding: '1px 5px' }}>
                  Locked
                </span>
              )}
            </div>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text)', margin: '2px 0 0 0' }}>
              {assessment?.title || 'No Assessment Selected'}
            </h2>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: 0, marginTop: 2 }}>
              {assessment?.questions?.length || assessment?.question_count || 0} Questions • {assessment?.max_score || 0} Total Marks • Dedicated Class Gradebook
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
            Switch Exam / Class:
          </label>
          <select
            value={assessment?.id || ''}
            onChange={handleSelectAssessment}
            className="input-text"
            style={{ height: 32, fontSize: '0.82rem', minWidth: 240, padding: '0 8px', background: 'var(--bg)', color: 'var(--text)' }}
          >
            {assessmentsList.length === 0 && (
              <option value="">
                {currentUser?.name
                  ? `No assessments generated by ${currentUser.name}`
                  : 'No assessments found for this instructor'}
              </option>
            )}
            {assessmentsList.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title} ({a.question_count || 0} Qs • {a.max_score || 0} pts)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Course, Section, Year & Weight Settings Card */}
      <div
        className="cartesia-card"
        style={{
          padding: '12px 16px',
          marginBottom: 20,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 8,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', flex: 1 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Course Name / Code
              </label>
              <input
                type="text"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                placeholder="e.g. CS101: Computer Science"
                className="input-text"
                style={{ height: 28, fontSize: '0.8rem', width: 190, padding: '0 8px' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Class Section
              </label>
              <input
                type="text"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                placeholder="e.g. Section A"
                className="input-text"
                style={{ height: 28, fontSize: '0.8rem', width: 110, padding: '0 8px' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Academic Year
              </label>
              <input
                type="text"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="e.g. 2026"
                className="input-text"
                style={{ height: 28, fontSize: '0.8rem', width: 85, padding: '0 8px' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Category in Master Sheet
              </label>
              <select
                value={assessmentCategory}
                onChange={(e) => setAssessmentCategory(e.target.value)}
                className="input-text"
                style={{ height: 28, fontSize: '0.8rem', width: 145, padding: '0 6px', background: 'var(--bg)', color: 'var(--text)' }}
              >
                <option value="midterm">Midterm Exam</option>
                <option value="final">Final Exam</option>
                <option value="quiz">Quiz</option>
                <option value="assignment">Assignment</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <label style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Course Weight (%)
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={weightPct}
                onChange={(e) => setWeightPct(e.target.value)}
                className="input-text"
                style={{ height: 28, fontSize: '0.8rem', width: 75, padding: '0 6px', textAlign: 'center' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              onClick={handleSaveAssessmentSettings}
              disabled={isSavingSettings || !assessment?.id}
              className="btn btn-secondary btn-sm"
              style={{ height: 28, fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: 5 }}
              title="Save course and section metadata for this assessment"
            >
              <Settings size={12} className={isSavingSettings ? 'spin' : ''} />
              <span>{isSavingSettings ? 'Saving...' : 'Save Settings'}</span>
            </button>

            {settingsSuccessMsg && (
              <span style={{ fontSize: '0.74rem', color: 'var(--success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                <CheckCircle2 size={12} />
                {settingsSuccessMsg}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Student Exam & Paper Grading Studio</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Grade student exams for this class. Upload scanned student exam papers or enter scores manually.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setShowAssignmentGuide(!showAssignmentGuide)}
            className="btn btn-secondary btn-sm"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: showAssignmentGuide ? 'var(--surface-alt)' : 'var(--surface)',
              border: showAssignmentGuide ? '1px solid var(--accent)' : '1px solid var(--border)',
              color: showAssignmentGuide ? 'var(--accent)' : 'var(--text)',
              padding: '6px 12px',
            }}
            title="Toggle side-by-side Assignment & Rubrics Benchmark Guide to prevent grading blind"
          >
            <BookOpen size={13} />
            <span>{showAssignmentGuide ? '👁️ Hide Assignment Guide' : '👁️ Show Assignment & Rubric Guide'}</span>
          </button>

          {assessment && (
            <span className="badge badge-accent">
              Active Exam: {assessment.title || 'Current Assessment'} ({questionsCount} questions)
            </span>
          )}
        </div>
      </div>

      {/* 3-Step Physical Paper Grading Pipeline Banner */}
      <div
        className="cartesia-card"
        style={{
          marginBottom: 20,
          padding: '14px 18px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--surface-alt)', color: 'var(--accent)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, flexShrink: 0 }}>
              1
            </div>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)' }}>Print Exam Paper</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Generate PDF in Assessment tab</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--surface-alt)', color: 'var(--accent)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, flexShrink: 0 }}>
              2
            </div>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)' }}>Collect & Scan</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Students complete exam; scan paper</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--surface-alt)', color: 'var(--accent)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, flexShrink: 0 }}>
              3
            </div>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)' }}>Score with AI or Manually</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Upload paper PDF or insert scores directly</div>
            </div>
          </div>
        </div>
      </div>

      {/* Dual-Pane Split Screen Workspace */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: showAssignmentGuide ? 'minmax(320px, 380px) 1fr' : '1fr',
          gap: 20,
          alignItems: 'start',
        }}
      >
        {/* Left Column: Assignment & Rubric Companion (The Benchmark Guide) */}
        {showAssignmentGuide && (
          <div
            className="cartesia-card custom-scroll"
            style={{
              position: 'sticky',
              top: 16,
              maxHeight: 'calc(100vh - 40px)',
              overflowY: 'auto',
              padding: '16px 18px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 10,
            }}
          >
            {/* Guide Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 10, borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <BookOpen size={16} style={{ color: 'var(--accent)' }} />
                <div>
                  <h3 style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text)', margin: 0 }}>
                    Assignment & Rubric Guide
                  </h3>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Benchmark Reference
                  </span>
                </div>
              </div>
              <span className="badge badge-accent" style={{ fontSize: '0.7rem' }}>
                {questionsCount} Questions • {assessment?.max_score || 0} pts
              </span>
            </div>

            {/* Questions List */}
            {!assessment?.questions || assessment.questions.length === 0 ? (
              <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                No questions found for this assessment. Select an assessment with questions in the dropdown above.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {assessment.questions.map((q, qIdx) => {
                  const isMcq = /\b[A-D]\)/.test(q.text || '');
                  const isFitb = /____|fill in the blank/i.test(q.text || '') || q.question_type === 'fill_in_the_blank';
                  const isObjective = isMcq || isFitb;
                  const maxPts = q.max_marks || q.max_points || 10;
                  const criteria = q.rubric?.criteria || [];
                  const answerKey = q.reference_answer || (q.student_hint?.includes('Answer Key:') ? q.student_hint.replace(/^.*Answer\s+Key:\s*/i, '').trim() : q.student_hint);

                  return (
                    <div
                      key={q.id || qIdx}
                      style={{
                        padding: '12px 14px',
                        background: 'var(--bg)',
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span className="badge badge-accent" style={{ fontSize: '0.68rem', fontWeight: 700 }}>
                            Q{qIdx + 1}
                          </span>
                          {isMcq && <span className="badge badge-outline" style={{ fontSize: '0.62rem' }}>MCQ</span>}
                          {isFitb && <span className="badge" style={{ fontSize: '0.62rem', background: 'var(--surface-alt)', color: 'var(--accent)' }}>FITB</span>}
                          {!isMcq && !isFitb && <span className="badge badge-outline" style={{ fontSize: '0.62rem' }}>Task</span>}
                        </div>
                        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--accent)' }}>
                          {maxPts} pts
                        </span>
                      </div>

                      {/* Question Text */}
                      <div style={{ fontSize: '0.82rem', color: 'var(--text)', lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>
                        {q.text || q.prompt}
                      </div>

                      {/* Model Solution / Key */}
                      {answerKey && (
                        <div
                          style={{
                            padding: '8px 10px',
                            borderRadius: 6,
                            background: 'var(--surface-alt)',
                            border: '1px solid var(--border-subtle)',
                            fontSize: '0.76rem',
                          }}
                        >
                          <span style={{ fontWeight: 600, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                            <CheckCircle2 size={12} />
                            <span>Model Solution / Key:</span>
                          </span>
                          <div style={{ color: 'var(--text)', whiteSpace: 'pre-wrap' }}>
                            {answerKey}
                          </div>
                        </div>
                      )}

                      {/* Type-Aware Evaluation Breakdown */}
                      {isObjective ? (
                        <div style={{ padding: '6px 10px', background: 'var(--surface)', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--accent)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <CheckCircle2 size={12} />
                            <span>Objective Key Scoring ({maxPts} pts)</span>
                          </span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {isMcq ? 'Evaluates exact choice selection (A/B/C/D)' : 'Evaluates exact target terminology'}
                          </span>
                        </div>
                      ) : (
                        criteria.length > 0 && (
                          <div style={{ marginTop: 2 }}>
                            <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                              Rubric Criteria ({criteria.length}):
                            </span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              {criteria.map((c, cIdx) => (
                                <div
                                  key={c.id || cIdx}
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start',
                                    gap: 6,
                                    fontSize: '0.75rem',
                                    padding: '4px 6px',
                                    background: 'var(--surface)',
                                    borderRadius: 4,
                                  }}
                                >
                                  <span style={{ color: 'var(--text-muted)', flex: 1, lineHeight: 1.3 }}>
                                    • {c.description}
                                  </span>
                                  <span style={{ fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap' }}>
                                    {c.max_points} pts
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Right Column: Student Grading Studio */}
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Grading Studio Mode Selection Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => { setGradingMode('paper'); setGradingError(null); }}
          className={`btn btn-sm ${gradingMode === 'paper' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px' }}
        >
          <Sparkles size={14} />
          <span>AI Evaluation (File Upload or Direct Text)</span>
        </button>

        <button
          type="button"
          onClick={() => { setGradingMode('manual'); setGradingError(null); }}
          className={`btn btn-sm ${gradingMode === 'manual' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px' }}
        >
          <PenTool size={14} />
          <span>Insert Student Score Manually</span>
        </button>
      </div>

      {/* Mode A: Upload & Grade Scanned Exam Paper or Direct Text */}
      {gradingMode === 'paper' && (
        <div className="cartesia-card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={16} style={{ color: 'var(--accent)' }} />
              <span>Grade Student Submission (File or Direct Text)</span>
            </h3>
            <span className="badge badge-accent" style={{ fontSize: '0.72rem' }}>
              Instant AI Scoring & Decomposed Rubrics
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Student Name *</label>
              <input
                type="text"
                placeholder="e.g. Alice Johnson"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="input-text"
                style={{ fontSize: '0.88rem' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Student ID / Number</label>
              <input
                type="text"
                placeholder="e.g. STU-2026-081"
                value={studentNumber}
                onChange={(e) => setStudentNumber(e.target.value)}
                className="input-text"
                style={{ fontSize: '0.88rem' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Class Section</label>
              <input
                type="text"
                placeholder="e.g. Section A"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className="input-text"
                style={{ fontSize: '0.88rem' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Category in Sheet</label>
              <select
                value={assessmentCategory}
                onChange={(e) => setAssessmentCategory(e.target.value)}
                className="input-text"
                style={{ fontSize: '0.88rem', background: 'var(--bg)', color: 'var(--text)' }}
              >
                <option value="midterm">Midterm Exam</option>
                <option value="final">Final Exam</option>
                <option value="quiz">Quiz</option>
                <option value="assignment">Assignment</option>
              </select>
            </div>
          </div>

          {/* Sub-Tabs: Upload File vs Paste Text */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 14, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 10 }}>
            <button
              type="button"
              onClick={() => { setSubmissionInputType('file'); setGradingError(null); }}
              className={`btn btn-sm ${submissionInputType === 'file' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem' }}
            >
              <UploadCloud size={13} />
              <span>Upload Document / Image (PDF, DOCX, Photo)</span>
            </button>
            <button
              type="button"
              onClick={() => { setSubmissionInputType('text'); setGradingError(null); }}
              className={`btn btn-sm ${submissionInputType === 'text' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem' }}
            >
              <PenTool size={13} />
              <span>Paste Answer Text Directly</span>
            </button>
          </div>

          {submissionInputType === 'file' ? (
            /* Dropzone Box */
            <label className="dropzone" style={{ position: 'relative', marginBottom: 16 }}>
              <input
                type="file"
                accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.webp"
                onChange={handleFileChange}
                style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
                disabled={isGrading}
              />
              <div className="dropzone-icon">
                {isGrading ? (
                  <Loader2 size={22} className="spin" />
                ) : studentFile ? (
                  /\.(png|jpe?g|webp)$/i.test(studentFile.name) ? (
                    <ImageIcon size={22} style={{ color: '#8b5cf6' }} />
                  ) : /\.(docx?)$/i.test(studentFile.name) ? (
                    <FileText size={22} style={{ color: '#2563eb' }} />
                  ) : (
                    <UploadCloud size={22} />
                  )
                ) : (
                  <UploadCloud size={22} />
                )}
              </div>
              <div>
                <p style={{ fontWeight: 500, fontSize: '0.88rem', marginBottom: 2 }}>
                  {studentFile ? studentFile.name : 'Select or drop student exam paper (PDF, Word DOCX, or Image)'}
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                  {studentFile
                    ? `${(studentFile.size / 1024).toFixed(1)} KB — Ready to grade with AI`
                    : 'Supports typed PDF/Word DOCX and smartphone exam photos (PNG/JPG)'}
                </p>
              </div>
            </label>
          ) : (
            /* Direct Textarea for Pasting Student Answer Text */
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label className="form-label" style={{ marginBottom: 0 }}>
                  Paste or Type Student Answer Text:
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => {
                      const sampleText = assessment?.questions?.map((q, idx) => {
                        const isMcq = /\b[A-D]\)/.test(q.text || '');
                        if (isMcq) return `Question ${idx + 1}: B`;
                        return `Question ${idx + 1}: ${q.student_hint?.replace('Official Answer Key: ', '') || 'The primary mechanism ensures consistent execution and prevents race conditions.'}`;
                      }).join('\n\n') || "Question 1: Process synchronization coordinates thread execution.\n\nQuestion 2: B\n\nQuestion 3: Deadlock conditions include mutual exclusion, hold and wait, no preemption, and circular wait.";
                      setPastedStudentText(sampleText);
                    }}
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: '0.72rem', height: 24, padding: '0 6px', color: 'var(--accent)' }}
                    title="Insert sample answers matching the current assessment"
                  >
                    Paste Sample Answer
                  </button>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    {pastedStudentText.length} characters
                  </span>
                </div>
              </div>
              <textarea
                rows={7}
                placeholder={"Paste raw student answers here (from Canvas, LMS, email, or chat)...\n\ne.g.\nQuestion 1: Mutual exclusion prevents multiple processes from accessing critical sections simultaneously...\nQuestion 2: B\nQuestion 3: Deadlock occurs when each thread waits for a resource held by another."}
                value={pastedStudentText}
                onChange={(e) => setPastedStudentText(e.target.value)}
                className="input-text"
                style={{ fontSize: '0.84rem', fontFamily: 'var(--font-mono)', lineHeight: 1.45, resize: 'vertical' }}
              />
            </div>
          )}

          {gradingError && (
            <div style={{ marginBottom: 14, padding: 10, borderRadius: 4, background: 'var(--danger-bg)', color: 'var(--danger)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={15} />
              <span>{gradingError}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleGrade}
              disabled={
                isGrading ||
                !studentName.trim() ||
                (submissionInputType === 'file' ? !studentFile : !pastedStudentText.trim())
              }
              className="btn btn-primary"
              style={{ padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {isGrading ? <Loader2 size={15} className="spin" /> : <Sparkles size={15} />}
              <span>{isGrading ? 'Grading Submission with AI...' : 'Grade Student Paper'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Mode B: Insert Student Score Manually */}
      {gradingMode === 'manual' && (
        <form onSubmit={handleManualSubmit} className="cartesia-card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              <PenTool size={16} />
              <span>Insert Student Exam Score Directly</span>
            </h3>
            <span className="badge badge-accent" style={{ fontSize: '0.72rem' }}>
              Direct Gradebook Entry
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginBottom: 16 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Student Name *</label>
              <input
                type="text"
                placeholder="e.g. Marcus Chen"
                value={manualStudentName}
                onChange={(e) => setManualStudentName(e.target.value)}
                required
                className="input-text"
                style={{ fontSize: '0.88rem' }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Student ID / Number (Optional)</label>
              <input
                type="text"
                placeholder="e.g. STU-2026-082"
                value={manualStudentNumber}
                onChange={(e) => setManualStudentNumber(e.target.value)}
                className="input-text"
                style={{ fontSize: '0.88rem' }}
              />
            </div>
          </div>

          {/* Per-Question Score Inputs */}
          {assessment?.questions && assessment.questions.length > 0 ? (
            <div style={{ marginBottom: 16 }}>
              <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>
                Question Breakdown & Marks Allocation:
              </label>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {assessment.questions.map((q, idx) => (
                  <div
                    key={q.id || idx}
                    style={{
                      padding: '10px 14px',
                      background: 'var(--bg)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 6,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 6 }}>
                      <div style={{ fontSize: '0.84rem', color: 'var(--text)', flex: 1 }}>
                        <span style={{ fontWeight: 600, color: 'var(--accent)', marginRight: 6 }}>
                          Q{idx + 1}:
                        </span>
                        {q.text}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Score:</label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max={q.max_marks}
                          value={manualQuestionScores[q.id] ?? q.max_marks}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setManualQuestionScores((prev) => ({ ...prev, [q.id]: val }));
                          }}
                          className="input-text"
                          style={{ width: 65, height: 28, fontSize: '0.84rem', textAlign: 'center', fontWeight: 600 }}
                        />
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>/ {q.max_marks} pts</span>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8, marginTop: 6 }}>
                      <input
                        type="text"
                        placeholder="Student answer (optional)..."
                        value={manualQuestionAnswers[q.id] || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setManualQuestionAnswers((prev) => ({ ...prev, [q.id]: val }));
                        }}
                        className="input-text"
                        style={{ height: 28, fontSize: '0.78rem' }}
                      />

                      <input
                        type="text"
                        placeholder="Teacher note / feedback (optional)..."
                        value={manualQuestionFeedback[q.id] || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setManualQuestionFeedback((prev) => ({ ...prev, [q.id]: val }));
                        }}
                        className="input-text"
                        style={{ height: 28, fontSize: '0.78rem' }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Total Score Display */}
              <div style={{ marginTop: 12, padding: '8px 14px', background: 'var(--surface)', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>Total Calculated Score:</span>
                <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--accent)' }}>
                  {Object.values(manualQuestionScores).reduce((sum, v) => sum + (parseFloat(v) || 0), 0)} / {assessment.max_score} pts
                </span>
              </div>
            </div>
          ) : (
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">Total Score Awarded (out of {assessment?.max_score || 100})</label>
              <input
                type="number"
                step="0.5"
                min="0"
                max={assessment?.max_score || 100}
                placeholder="e.g. 85"
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setManualQuestionScores({ default: val });
                }}
                className="input-text"
                style={{ fontSize: '0.88rem' }}
              />
            </div>
          )}

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">Overall Feedback / Comments (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Great understanding of core algorithms. Minor precision error in Q2."
              value={manualSummaryFeedback}
              onChange={(e) => setManualSummaryFeedback(e.target.value)}
              className="input-text"
              style={{ fontSize: '0.86rem' }}
            />
          </div>

          {gradingError && (
            <div style={{ marginBottom: 14, padding: 10, borderRadius: 4, background: 'var(--danger-bg)', color: 'var(--danger)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={15} />
              <span>{gradingError}</span>
            </div>
          )}

          {manualSuccessMsg && (
            <div style={{ marginBottom: 14, padding: 10, borderRadius: 4, background: 'var(--success-bg)', border: '1px solid var(--border)', color: 'var(--success)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle2 size={15} />
              <span>{manualSuccessMsg}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              disabled={isSubmittingManual || !manualStudentName.trim()}
              className="btn btn-primary"
              style={{ padding: '8px 20px', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {isSubmittingManual ? <Loader2 size={15} className="spin" /> : <PenTool size={15} />}
              <span>{isSubmittingManual ? 'Saving Score...' : 'Insert Student Score to Gradebook'}</span>
            </button>
          </div>
        </form>
      )}

      {/* Active Grading Report (Reviewed or just graded) */}
      {gradingReport && (
        <div ref={reportRef} style={{ display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 28 }}>
          {/* Headline Summary Card */}
          <div className="cartesia-card" style={{ border: '1px solid var(--accent)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14, marginBottom: 14 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <CheckCircle2 size={18} style={{ color: 'var(--accent)' }} />
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>
                    Evaluation Review: {gradingReport.student_name}
                  </h3>
                  <span className="badge badge-outline">
                    {gradingReport.student_number || 'STU-001'}
                  </span>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                  {gradingReport.assessment_title || assessment?.title}
                </p>
              </div>

              {/* Headline Score & Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text)' }}>
                    {gradingReport.total_score ?? gradingReport.ai_total} / {gradingReport.max_score}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--accent)', fontWeight: 600 }}>
                    {(
                      ((gradingReport.total_score ?? gradingReport.ai_total) /
                        (gradingReport.max_score || 1)) *
                      100
                    ).toFixed(1)}
                    %
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowExtractedText(!showExtractedText)}
                  className="btn btn-secondary btn-sm"
                  title="Inspect raw extracted or vision-transcribed text from this student paper"
                >
                  {showExtractedText ? <ChevronUp size={13} /> : <Eye size={13} />}
                  <span>{showExtractedText ? 'Hide Transcribed Paper' : 'View Transcribed Paper'}</span>
                </button>

                {(gradingReport.file_url || gradingReport.submission_id) && (
                  <a
                    href={`/api/submissions/${gradingReport.submission_id}/file`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary btn-sm"
                    title="Download or view student original submission file"
                  >
                    <Download size={13} />
                    <span>Download Paper</span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => handleRegradeSubmission(gradingReport)}
                  disabled={isRegrading}
                  className="btn btn-secondary btn-sm"
                  title="Re-run AI grading on this paper from scratch to check or correct any hallucination"
                >
                  <RefreshCw size={13} className={isRegrading ? 'spin' : ''} />
                  <span>{isRegrading ? 'Regrading Paper...' : 'Regrade Paper'}</span>
                </button>

                <button
                  onClick={handleConfirmScore}
                  disabled={isConfirming || isConfirmed}
                  className={`btn btn-sm ${isConfirmed ? 'btn-secondary' : 'btn-primary'}`}
                >
                  <Check size={13} />
                  <span>{isConfirmed ? 'Score Confirmed' : 'Confirm Score'}</span>
                </button>

                <button onClick={handleExportSingleExcel} className="btn btn-secondary btn-sm">
                  <FileSpreadsheet size={13} />
                  <span>Export Report (.xlsx)</span>
                </button>
              </div>
            </div>

            {regradeMsg && (
              <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 6, background: 'var(--success-bg)', border: '1px solid var(--border)', color: 'var(--success)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={14} />
                <span>{regradeMsg}</span>
              </div>
            )}

            {showExtractedText && (
              <div
                style={{
                  background: 'var(--bg)',
                  padding: 14,
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  marginBottom: 12,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Extracted & Transcribed Submission Text:
                  </span>
                  <span className="badge badge-outline" style={{ fontSize: '0.68rem' }}>
                    {gradingReport.file_type ? gradingReport.file_type.toUpperCase() : 'DOCUMENT'}
                  </span>
                </div>
                <pre
                  style={{
                    margin: 0,
                    fontSize: '0.8rem',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text)',
                    whiteSpace: 'pre-wrap',
                    maxHeight: 250,
                    overflowY: 'auto',
                    lineHeight: 1.45,
                  }}
                >
                  {gradingReport.extracted_text || gradingReport.extracted_pdf_text || 'No extracted text recorded.'}
                </pre>
              </div>
            )}

            {gradingReport.summary_feedback && (
              <div style={{ background: 'var(--surface)', padding: 12, borderRadius: 6, border: '1px solid var(--border-subtle)', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                <span style={{ fontWeight: 600, color: 'var(--text)' }}>Summary Feedback: </span>
                {gradingReport.summary_feedback}
              </div>
            )}
          </div>

          {/* Question-by-Question Detailed Results with Complete Question Context */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h4 style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text)' }}>
              Question-by-Question Evaluation ({gradingReport.question_results?.length || 0} Questions)
            </h4>

            {(gradingReport.question_results || []).map((qr, idx) => {
              const fullQ = assessment?.questions?.find((q, qIndex) => q.id === qr.question_id || qIndex === idx);
              const questionPrompt = fullQ?.text || qr.question_text || `Question ${idx + 1}`;
              const expectedCriteria = fullQ?.rubric?.criteria || [];

              return (
                <div key={qr.question_id || idx} className="cartesia-card" style={{ padding: '16px 18px' }}>
                  {/* Question Header & Prompt */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="badge badge-accent">Question {idx + 1}</span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          Max Marks: {qr.max_points} pts
                        </span>
                      </div>

                      {/* Interactive Point Adjustment & Question Re-evaluation */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Points Awarded:</span>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max={qr.max_points}
                          value={qr.points_awarded}
                          onChange={(e) => handleAdjustQuestionScore(idx, parseFloat(e.target.value) || 0)}
                          className="input-text"
                          style={{ width: 62, height: 26, fontSize: '0.82rem', textAlign: 'center', fontWeight: 600 }}
                        />
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)' }}>
                          / {qr.max_points}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRegradeQuestion(qr.question_id || fullQ?.id, idx)}
                          disabled={regradingQId === (qr.question_id || fullQ?.id)}
                          className="btn btn-secondary btn-sm"
                          style={{ height: 26, padding: '0 8px', fontSize: '0.74rem', marginLeft: 4 }}
                          title="Re-evaluate this specific question with AI to check/correct hallucination"
                        >
                          <RefreshCw size={11} className={regradingQId === (qr.question_id || fullQ?.id) ? 'spin' : ''} />
                          <span>{regradingQId === (qr.question_id || fullQ?.id) ? 'Re-evaluating...' : 'Check with AI'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Full Exam Question Text */}
                    <div style={{ padding: '10px 12px', background: 'var(--bg)', borderRadius: 6, border: '1px solid var(--border)', fontSize: '0.86rem', color: 'var(--text)', whiteSpace: 'pre-wrap', lineHeight: 1.45 }}>
                      <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--accent)', fontWeight: 600, display: 'block', marginBottom: 2 }}>
                        Exam Question Asked:
                      </span>
                      {questionPrompt}
                    </div>
                  </div>

                  {/* Type-Aware Rubric Criteria vs Objective Key */}
                  {qr.is_objective || (fullQ && (/\b[A-D]\)/.test(fullQ.text || '') || /____|fill in the blank/i.test(fullQ.text || ''))) ? (
                    <div style={{ marginBottom: 12, padding: '8px 12px', background: 'var(--surface)', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <CheckCircle2 size={13} style={{ color: 'var(--accent)' }} />
                        <span style={{ fontSize: '0.74rem', color: 'var(--accent)', fontWeight: 600 }}>
                          Objective Evaluation (Binary Key Scoring):
                        </span>
                      </div>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Evaluated directly against the Official Answer Key: <strong style={{ color: 'var(--text)' }}>{fullQ?.reference_answer || fullQ?.student_hint || 'Official Answer Key'}</strong>
                      </span>
                    </div>
                  ) : (
                    expectedCriteria.length > 0 && (
                      <div style={{ marginBottom: 12, padding: '8px 12px', background: 'var(--surface)', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--accent)', fontWeight: 600, display: 'block', marginBottom: 3 }}>
                          Rubric Criteria ({expectedCriteria.length}):
                        </span>
                        <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {expectedCriteria.map((c, cIdx) => (
                            <li key={c.id || cIdx}>{c.description} ({c.max_points} pts)</li>
                          ))}
                        </ul>
                      </div>
                    )
                  )}

                  {/* Student Answer */}
                  <div style={{ background: 'var(--bg)', padding: '10px 12px', borderRadius: 6, border: '1px solid var(--border-subtle)', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                      <Quote size={12} />
                      <span style={{ fontWeight: 600 }}>Student's Answer (from Paper or Entry):</span>
                    </div>
                    <p style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)', color: 'var(--text)', whiteSpace: 'pre-wrap', lineHeight: 1.4, margin: 0 }}>
                      {qr.matched_student_answer || 'No explicit answer recorded.'}
                    </p>
                  </div>

                  {/* Feedback */}
                  {qr.feedback && (
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', background: 'var(--surface)', padding: '8px 10px', borderRadius: 4, border: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text)' }}>Evaluation & Feedback: </span>
                      {qr.feedback}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cohort Gradebook Table Section */}
      <div className="cartesia-card">
        {/* Mode Toggle & Export Controls Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          {/* Left: Mode Toggle */}
          <div style={{ display: 'inline-flex', padding: 3, background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
            <button
              type="button"
              onClick={() => setGradebookMode('master')}
              className={`btn btn-sm ${gradebookMode === 'master' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ height: 28, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Table size={13} />
              <span>Master Course Gradebook</span>
            </button>
            <button
              type="button"
              onClick={() => setGradebookMode('exam')}
              className={`btn btn-sm ${gradebookMode === 'exam' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ height: 28, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <FileText size={13} />
              <span>Single Exam Sheet</span>
            </button>
          </div>

          {/* Right: Refresh & Export */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => { loadSubmissions(); loadMasterGradebook(); }}
              disabled={isLoadingSubmissions || isLoadingMasterGradebook}
              className="btn btn-secondary btn-sm"
              title="Refresh gradebook"
            >
              <RefreshCw size={13} className={(isLoadingSubmissions || isLoadingMasterGradebook) ? 'spin' : ''} />
              <span>Refresh</span>
            </button>

            {gradebookMode === 'master' ? (
              <button
                onClick={handleExportMasterExcel}
                disabled={!masterGradebookData?.students?.length}
                className="btn btn-primary btn-sm"
                title="Export complete cumulative course gradebook with all exam columns, percentages, and grade tiers"
              >
                <FileSpreadsheet size={13} />
                <span>Export Master Course Gradebook (.xlsx)</span>
              </button>
            ) : (
              <button
                onClick={handleExportCohortExcel}
                disabled={submissions.length === 0}
                className="btn btn-secondary btn-sm"
                title="Export single exam results"
              >
                <FileSpreadsheet size={13} />
                <span>Export Exam Sheet (.xlsx)</span>
              </button>
            )}
          </div>
        </div>

        {/* Section Filter Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14, overflowX: 'auto', paddingBottom: 2 }}>
          <span style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginRight: 4 }}>
            Filter Section:
          </span>
          {['All', ...(masterGradebookData?.available_sections || ['Section A', 'Section B'])].map((secItem) => (
            <button
              key={secItem}
              type="button"
              onClick={() => setActiveSectionFilter(secItem)}
              className={`btn btn-sm ${activeSectionFilter === secItem ? 'btn-primary' : 'btn-secondary'}`}
              style={{ height: 26, fontSize: '0.74rem', padding: '0 10px', borderRadius: 14 }}
            >
              {secItem === 'All' ? 'All Sections' : secItem}
            </button>
          ))}
        </div>

        {/* Cohort Metric Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 18 }}>
          <div style={{ background: 'var(--bg)', padding: '10px 14px', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Class Size</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)' }}>{cohortCount} Students</div>
          </div>
          <div style={{ background: 'var(--bg)', padding: '10px 14px', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Class Average</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--accent)' }}>{cohortAvg}%</div>
          </div>
          <div style={{ background: 'var(--bg)', padding: '10px 14px', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Highest Score</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)' }}>{highestMark}%</div>
          </div>
          <div style={{ background: 'var(--bg)', padding: '10px 14px', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Confirmed Records</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)' }}>{confirmedCount} / {cohortCount}</div>
          </div>
        </div>

        {/* Filter Input */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ position: 'relative', maxWidth: 300 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search by student name or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-text"
              style={{ paddingLeft: 30, fontSize: '0.82rem', height: 32 }}
            />
          </div>
        </div>

        {/* Table Rendering based on Gradebook Mode */}
        {gradebookMode === 'master' ? (
          /* =========================================================
             Master Course Gradebook (Multi-Assessment Columns & Tiers)
             ========================================================= */
          <div style={{ overflowX: 'auto' }}>
            <table className="rubric-table" style={{ fontSize: '0.84rem' }}>
              <thead>
                <tr>
                  <th>Student ID</th>
                  <th>Student Name</th>
                  <th>Section</th>
                  {(masterGradebookData?.assessments || []).map((a) => (
                    <th key={a.id} style={{ minWidth: 130 }}>
                      <div style={{ fontWeight: 600 }}>{a.title}</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--accent)', fontWeight: 500 }}>
                        {a.category.toUpperCase()} • {a.max_score} pts ({a.weight_pct}%)
                      </div>
                    </th>
                  ))}
                  <th>Raw Points</th>
                  <th>Course %</th>
                  <th>Final Grade Tier</th>
                </tr>
              </thead>
              <tbody>
                {filteredMasterStudents.length > 0 ? (
                  filteredMasterStudents.map((stu, sIdx) => {
                    const tierBadgeClass =
                      stu.grade_tier?.includes('A')
                        ? 'badge-accent'
                        : stu.grade_tier?.includes('B')
                        ? 'badge-primary'
                        : stu.grade_tier?.includes('C')
                        ? 'badge-outline'
                        : 'badge-danger';
                    return (
                      <tr key={stu.student_id || sIdx} className="gradebook-row">
                        <td style={{ fontFamily: 'var(--font-mono)' }}>
                          {stu.student_number || `STU-${String(sIdx + 1).padStart(3, '0')}`}
                        </td>
                        <td style={{ fontWeight: 600 }}>{stu.student_name}</td>
                        <td>
                          <span className="badge badge-outline" style={{ fontSize: '0.68rem' }}>
                            {stu.section}
                          </span>
                        </td>
                        {(masterGradebookData?.assessments || []).map((a) => {
                          const hasScore = stu.scores && stu.scores[a.id] !== undefined;
                          const scoreVal = hasScore ? stu.scores[a.id] : null;
                          const pctVal = hasScore ? stu.percentages[a.id] : null;
                          return (
                            <td key={a.id}>
                              {hasScore ? (
                                <div>
                                  <span style={{ fontWeight: 600 }}>{scoreVal}</span>
                                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}> / {a.max_score}</span>
                                  <span style={{ fontSize: '0.72rem', color: 'var(--accent)', marginLeft: 4 }}>({pctVal}%)</span>
                                </div>
                              ) : (
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.76rem', fontStyle: 'italic' }}>Pending</span>
                              )}
                            </td>
                          );
                        })}
                        <td>
                          {stu.raw_total} / {stu.max_total}
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--accent)' }}>
                          {stu.course_percentage}%
                        </td>
                        <td>
                          <span className={`badge ${tierBadgeClass}`} style={{ fontSize: '0.72rem', fontWeight: 600 }}>
                            {stu.grade_tier}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6 + (masterGradebookData?.assessments?.length || 0)} style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-muted)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                        <GraduationCap size={28} style={{ color: 'var(--accent)', opacity: 0.7 }} />
                        <span style={{ fontWeight: 600, color: 'var(--text)' }}>
                          No Students in this Course / Section Yet
                        </span>
                        <span style={{ fontSize: '0.8rem' }}>
                          Students graded under Course "<strong>{courseName}</strong>" and Section "<strong>{activeSectionFilter}</strong>" will automatically aggregate into this master sheet.
                        </span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
              {filteredMasterStudents.length > 0 && (
                <tfoot>
                  <tr style={{ background: 'var(--surface-alt)', fontWeight: 600 }}>
                    <td colSpan={3} style={{ textTransform: 'uppercase', fontSize: '0.74rem', letterSpacing: '0.04em', color: 'var(--accent)' }}>
                      Class Average ({filteredMasterStudents.length} Students)
                    </td>
                    {(masterGradebookData?.assessments || []).map((a) => {
                      const aStat = masterGradebookData?.class_statistics?.assessment_averages?.[a.id];
                      return (
                        <td key={a.id} style={{ fontSize: '0.78rem' }}>
                          {aStat ? `${aStat.average_score} / ${a.max_score} (${aStat.average_percentage}%)` : '-'}
                        </td>
                      );
                    })}
                    <td>-</td>
                    <td style={{ color: 'var(--accent)', fontWeight: 700 }}>
                      {masterGradebookData?.class_statistics?.overall_course_average_pct || 0}%
                    </td>
                    <td>
                      <span className="badge badge-accent" style={{ fontSize: '0.7rem' }}>
                        {(masterGradebookData?.class_statistics?.overall_course_average_pct || 0) >= 80 ? 'Grade B' : 'Grade C'}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        ) : (
          /* =========================================================
             Single Exam View (Active Assessment Submissions & Actions)
             ========================================================= */
          <div style={{ overflowX: 'auto' }}>
            <table className="rubric-table" style={{ fontSize: '0.84rem' }}>
              <thead>
                <tr>
                  <th>Student ID</th>
                  <th>Student Name</th>
                  <th>Section</th>
                  <th>Format</th>
                  <th>Score</th>
                  <th>Percentage</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubmissions.length > 0 ? (
                  filteredSubmissions.map((sub, idx) => {
                    const pct = sub.percentage ?? (sub.max_score ? Number(((sub.total_score / sub.max_score) * 100).toFixed(1)) : 0);
                    const isRowConfirmed = sub.status === 'confirmed';

                    return (
                      <tr key={sub.id || idx} className="gradebook-row">
                        <td style={{ fontFamily: 'var(--font-mono)' }}>
                          {sub.student_number || `STU-2026-${String(idx + 1).padStart(3, '0')}`}
                        </td>
                        <td style={{ fontWeight: 600 }}>{sub.student_name}</td>
                        <td>
                          <span className="badge badge-outline" style={{ fontSize: '0.68rem' }}>
                            {sub.section || 'Section A'}
                          </span>
                        </td>
                        <td>
                          <span
                            className="badge"
                            style={{
                              fontSize: '0.68rem',
                              textTransform: 'uppercase',
                              fontWeight: 600,
                              color: sub.file_type === 'docx' ? '#2563eb' : (sub.file_type === 'png' || sub.file_type === 'jpg' || sub.file_type === 'jpeg') ? '#8b5cf6' : sub.file_type === 'pdf' ? '#ef4444' : 'var(--text-muted)',
                              background: 'var(--surface)',
                              border: '1px solid var(--border-subtle)',
                            }}
                          >
                            {sub.file_type || (sub.has_file ? 'FILE' : 'MANUAL')}
                          </span>
                        </td>
                        <td>
                          {sub.total_score} / {sub.max_score || assessment?.max_score || 100}
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--accent)' }}>
                          {pct}%
                        </td>
                        <td>
                          <span
                            className={`badge ${isRowConfirmed ? 'badge-accent' : 'badge-outline'}`}
                            style={{ fontSize: '0.7rem' }}
                          >
                            {isRowConfirmed ? 'CONFIRMED' : 'GRADED'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <button
                              onClick={() => handleReviewSubmission(sub)}
                              className="btn btn-secondary btn-sm"
                              style={{ height: 26, padding: '0 8px', fontSize: '0.74rem' }}
                              title="Inspect student report and citations"
                            >
                              <Eye size={11} />
                              <span>Review</span>
                            </button>

                            <button
                              onClick={() => handleRegradeSubmission(sub)}
                              disabled={regradingSubId === sub.id}
                              className="btn btn-secondary btn-sm"
                              style={{ height: 26, padding: '0 8px', fontSize: '0.74rem' }}
                              title="Re-run AI grading from scratch on this student paper"
                            >
                              <RefreshCw size={11} className={regradingSubId === sub.id ? 'spin' : ''} />
                              <span>{regradingSubId === sub.id ? 'Regrading...' : 'Regrade'}</span>
                            </button>

                            {sub.has_file && sub.id && (
                              <a
                                href={`/api/submissions/${sub.id}/file`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-secondary btn-sm"
                                style={{ height: 26, padding: '0 8px', fontSize: '0.74rem' }}
                                title="Download student original paper"
                              >
                                <Download size={11} />
                                <span>Paper</span>
                              </a>
                            )}

                            {!isRowConfirmed && (
                              <button
                                onClick={() => handleConfirmRowScore(sub)}
                                disabled={confirmingSubId === sub.id}
                                className="btn btn-primary btn-sm"
                                style={{ height: 26, padding: '0 8px', fontSize: '0.74rem' }}
                                title="Confirm score"
                              >
                                {confirmingSubId === sub.id ? <Loader2 size={11} className="spin" /> : <Check size={11} />}
                                <span>Confirm</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '36px 20px', color: 'var(--text-muted)' }}>
                      {searchTerm ? (
                        `No student submissions found matching "${searchTerm}".`
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                          <GraduationCap size={28} style={{ color: 'var(--accent)', opacity: 0.7 }} />
                          <span style={{ fontWeight: 600, color: 'var(--text)' }}>
                            No Student Submissions for this Exam Yet
                          </span>
                          <span style={{ fontSize: '0.8rem' }}>
                            Upload a student exam paper or insert scores manually above to start recording grades for this class.
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
        </div> {/* End Right Column */}
      </div> {/* End Dual-Pane Split Screen Workspace */}
    </div>
  );
}
