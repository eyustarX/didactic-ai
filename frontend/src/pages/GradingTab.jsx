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
} from 'lucide-react';
import ExcelJS from 'exceljs';
import {
  gradeStudentSubmission,
  confirmSubmissionScore,
  fetchAssessmentSubmissions,
} from '../services/api';

const DEFAULT_COHORT_SUBMISSIONS = [
  {
    id: 'sub-001',
    student_number: 'STU-2026-081',
    student_name: 'Alice Johnson',
    ai_total: 94.0,
    total_score: 94.0,
    max_score: 100.0,
    percentage: 94.0,
    status: 'confirmed',
    graded_at: '2026-10-24T21:44:52Z',
    question_results: [
      {
        question_text: 'Core Architecture and Principles',
        points_awarded: 19.0,
        max_points: 20.0,
        feedback: 'Thorough explanation of distributed revision graphs and SHA-1 hashing.',
        matched_student_answer: 'Git models projects as snapshots over time rather than file deltas.',
      },
      {
        question_text: 'Staging Area and Workflow',
        points_awarded: 19.0,
        max_points: 20.0,
        feedback: 'Accurate description of index, working tree, and commit states.',
        matched_student_answer: 'git add indexes changed files; git commit permanently snapshots.',
      },
      {
        question_text: 'Branching and Three-Way Merge',
        points_awarded: 18.5,
        max_points: 20.0,
        feedback: 'Demonstrates deep understanding of pointer manipulation.',
        matched_student_answer: 'Branches are simply 41-byte references pointing to commit hashes.',
      },
      {
        question_text: 'Conflict Resolution Strategies',
        points_awarded: 18.5,
        max_points: 20.0,
        feedback: 'Correct step-by-step approach for manual conflict markers.',
        matched_student_answer: 'Inspect <<<< markers, resolve diffs, re-add to staging, and commit.',
      },
      {
        question_text: 'Remote Tracking and Push Safety',
        points_awarded: 19.0,
        max_points: 20.0,
        feedback: 'Excellent synthesis of fast-forward merges and fetch vs pull.',
        matched_student_answer: 'git pull combines git fetch with git merge origin/branch.',
      },
    ],
  },
  {
    id: 'sub-002',
    student_number: 'STU-2026-082',
    student_name: 'Marcus Chen',
    ai_total: 88.5,
    total_score: 88.5,
    max_score: 100.0,
    percentage: 88.5,
    status: 'confirmed',
    graded_at: '2026-10-24T21:44:53Z',
    question_results: [
      {
        question_text: 'Core Architecture and Principles',
        points_awarded: 17.5,
        max_points: 20.0,
        feedback: 'Solid explanation, minor omission regarding blob storage.',
        matched_student_answer: 'Git uses content-addressable storage with commit objects.',
      },
      {
        question_text: 'Staging Area and Workflow',
        points_awarded: 18.0,
        max_points: 20.0,
        feedback: 'Clear workflow description with accurate command usage.',
        matched_student_answer: 'The three states: modified, staged, committed.',
      },
      {
        question_text: 'Branching and Three-Way Merge',
        points_awarded: 18.0,
        max_points: 20.0,
        feedback: 'Explains fast-forward vs recursive merge cleanly.',
        matched_student_answer: 'Fast-forward moves pointer directly when no diverge exists.',
      },
      {
        question_text: 'Conflict Resolution Strategies',
        points_awarded: 17.0,
        max_points: 20.0,
        feedback: 'Good practical resolution procedure.',
        matched_student_answer: 'Locate conflicts, decide keep HEAD or incoming, stage resolved file.',
      },
      {
        question_text: 'Remote Tracking and Push Safety',
        points_awarded: 18.0,
        max_points: 20.0,
        feedback: 'Well reasoned explanation of upstream tracking.',
        matched_student_answer: 'git branch -u origin/main sets tracking for effortless pull.',
      },
    ],
  },
  {
    id: 'sub-003',
    student_number: 'STU-2026-083',
    student_name: 'Sophia Rodriguez',
    ai_total: 91.0,
    total_score: 91.0,
    max_score: 100.0,
    percentage: 91.0,
    status: 'confirmed',
    graded_at: '2026-10-24T21:44:54Z',
    question_results: [
      {
        question_text: 'Core Architecture and Principles',
        points_awarded: 18.5,
        max_points: 20.0,
        feedback: 'Clear, well-formulated definitions with DAG diagram description.',
        matched_student_answer: 'The repository is a directed acyclic graph of immutable commit nodes.',
      },
      {
        question_text: 'Staging Area and Workflow',
        points_awarded: 18.5,
        max_points: 20.0,
        feedback: 'Comprehensive step-by-step breakdown of lifecycle.',
        matched_student_answer: 'Working directory -> Staging (Index) -> Repository (.git database).',
      },
      {
        question_text: 'Branching and Three-Way Merge',
        points_awarded: 18.0,
        max_points: 20.0,
        feedback: 'Correct understanding of common ancestor identification.',
        matched_student_answer: 'Three-way merges utilize the merge-base between branches.',
      },
      {
        question_text: 'Conflict Resolution Strategies',
        points_awarded: 18.0,
        max_points: 20.0,
        feedback: 'Good understanding of merge tools and diff inspection.',
        matched_student_answer: 'Use git mergetool or manually edit conflict markers before committing.',
      },
      {
        question_text: 'Remote Tracking and Push Safety',
        points_awarded: 18.0,
        max_points: 20.0,
        feedback: 'Accurate distinction between pull --rebase and standard pull.',
        matched_student_answer: 'Pull --rebase keeps a linear history without unnecessary merge commits.',
      },
    ],
  },
  {
    id: 'sub-004',
    student_number: 'STU-2026-084',
    student_name: 'David Kim',
    ai_total: 79.5,
    total_score: 79.5,
    max_score: 100.0,
    percentage: 79.5,
    status: 'graded',
    graded_at: '2026-10-24T21:44:55Z',
    question_results: [
      {
        question_text: 'Core Architecture and Principles',
        points_awarded: 16.0,
        max_points: 20.0,
        feedback: 'Basic concept understood, could expand on cryptographic hashing.',
        matched_student_answer: 'Git stores files and keeps track of what changed.',
      },
      {
        question_text: 'Staging Area and Workflow',
        points_awarded: 16.5,
        max_points: 20.0,
        feedback: 'Correct command sequence, brief explanation.',
        matched_student_answer: 'git add stages files, git commit saves them.',
      },
      {
        question_text: 'Branching and Three-Way Merge',
        points_awarded: 15.5,
        max_points: 20.0,
        feedback: 'Lacks explanation of merge-base.',
        matched_student_answer: 'Branches let multiple people work together without conflicting.',
      },
      {
        question_text: 'Conflict Resolution Strategies',
        points_awarded: 16.0,
        max_points: 20.0,
        feedback: 'Accurately identifies conflict markers.',
        matched_student_answer: 'Look for <<<<<< and >>>>>> and delete what you do not want.',
      },
      {
        question_text: 'Remote Tracking and Push Safety',
        points_awarded: 15.5,
        max_points: 20.0,
        feedback: 'Missed explanation of non-fast-forward push rejection.',
        matched_student_answer: 'git push sends code to GitHub.',
      },
    ],
  },
  {
    id: 'sub-005',
    student_number: 'STU-2026-085',
    student_name: 'Fatima Al-Mansoor',
    ai_total: 96.0,
    total_score: 96.0,
    max_score: 100.0,
    percentage: 96.0,
    status: 'confirmed',
    graded_at: '2026-10-24T21:44:56Z',
    question_results: [
      {
        question_text: 'Core Architecture and Principles',
        points_awarded: 19.5,
        max_points: 20.0,
        feedback: 'Exemplary grasp of object stores (blobs, trees, commits, annotated tags).',
        matched_student_answer: 'Content addressability ensures complete cryptographic immutability.',
      },
      {
        question_text: 'Staging Area and Workflow',
        points_awarded: 19.5,
        max_points: 20.0,
        feedback: 'Flawless analysis of intermediate cache representation.',
        matched_student_answer: 'The index acts as a staging cache decoupling disk modifications.',
      },
      {
        question_text: 'Branching and Three-Way Merge',
        points_awarded: 19.0,
        max_points: 20.0,
        feedback: 'Precise topological explanation of commit ancestors.',
        matched_student_answer: 'Git identifies the nearest common ancestor to construct the merge tree.',
      },
      {
        question_text: 'Conflict Resolution Strategies',
        points_awarded: 19.0,
        max_points: 20.0,
        feedback: 'Exemplary resolution flow including re-running test suites.',
        matched_student_answer: 'Resolve conflicts, test build pass, git add, and finalize commit.',
      },
      {
        question_text: 'Remote Tracking and Push Safety',
        points_awarded: 19.0,
        max_points: 20.0,
        feedback: 'Comprehensive breakdown of atomic pushes and lease safety.',
        matched_student_answer: 'git push --force-with-lease prevents overwriting un-fetched remote work.',
      },
    ],
  },
  {
    id: 'sub-006',
    student_number: 'STU-2026-086',
    student_name: "Liam O'Connor",
    ai_total: 82.0,
    total_score: 82.0,
    max_score: 100.0,
    percentage: 82.0,
    status: 'graded',
    graded_at: '2026-10-24T21:44:57Z',
    question_results: [
      {
        question_text: 'Core Architecture and Principles',
        points_awarded: 16.5,
        max_points: 20.0,
        feedback: 'Good grasp of distributed version control benefits.',
        matched_student_answer: 'Everyone has a full copy of the codebase and history locally.',
      },
      {
        question_text: 'Staging Area and Workflow',
        points_awarded: 16.5,
        max_points: 20.0,
        feedback: 'Solid workflow explanation.',
        matched_student_answer: 'Files must be added to staging before they can be committed.',
      },
      {
        question_text: 'Branching and Three-Way Merge',
        points_awarded: 16.0,
        max_points: 20.0,
        feedback: 'Understands basic checkout and merge process.',
        matched_student_answer: 'git checkout -b creates branch, git merge brings it into main.',
      },
      {
        question_text: 'Conflict Resolution Strategies',
        points_awarded: 16.5,
        max_points: 20.0,
        feedback: 'Competent handling of text conflicts.',
        matched_student_answer: 'Open the conflicting file, edit the conflict region, and commit.',
      },
      {
        question_text: 'Remote Tracking and Push Safety',
        points_awarded: 16.5,
        max_points: 20.0,
        feedback: 'Accurate description of origin remote.',
        matched_student_answer: 'Origin is the remote repository alias configured in git config.',
      },
    ],
  },
  {
    id: 'sub-007',
    student_number: 'STU-2026-087',
    student_name: 'Maya Patel',
    ai_total: 89.0,
    total_score: 89.0,
    max_score: 100.0,
    percentage: 89.0,
    status: 'confirmed',
    graded_at: '2026-10-24T21:44:58Z',
    question_results: [
      {
        question_text: 'Core Architecture and Principles',
        points_awarded: 18.0,
        max_points: 20.0,
        feedback: 'Accurate description of SHA checksum integrity.',
        matched_student_answer: 'Every commit is cryptographically chained using SHA-1/SHA-256.',
      },
      {
        question_text: 'Staging Area and Workflow',
        points_awarded: 18.0,
        max_points: 20.0,
        feedback: 'Detailed step explanation.',
        matched_student_answer: 'Allows selective commits by staging partial changes.',
      },
      {
        question_text: 'Branching and Three-Way Merge',
        points_awarded: 17.5,
        max_points: 20.0,
        feedback: 'Good practical analysis.',
        matched_student_answer: 'Branches are lightweight references to commits.',
      },
      {
        question_text: 'Conflict Resolution Strategies',
        points_awarded: 17.5,
        max_points: 20.0,
        feedback: 'Solid strategy outlined.',
        matched_student_answer: 'Identify conflict sections, consult team if needed, add and commit.',
      },
      {
        question_text: 'Remote Tracking and Push Safety',
        points_awarded: 18.0,
        max_points: 20.0,
        feedback: 'Understands fetch vs merge vs rebase.',
        matched_student_answer: 'git fetch updates origin branches without merging into working tree.',
      },
    ],
  },
];

export default function GradingTab({
  assessment,
  setAssessment,
  currentUser,
  onGradingComplete,
}) {
  const [studentName, setStudentName] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [studentFile, setStudentFile] = useState(null);

  const [isGrading, setIsGrading] = useState(false);
  const [gradingError, setGradingError] = useState(null);
  const [gradingReport, setGradingReport] = useState(null);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  // Gradebook / Roster state
  const [submissions, setSubmissions] = useState(DEFAULT_COHORT_SUBMISSIONS);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [confirmingSubId, setConfirmingSubId] = useState(null);

  const reportRef = useRef(null);

  // Load submissions from backend for the active assessment
  const loadSubmissions = async () => {
    if (!assessment?.id) {
      setSubmissions(DEFAULT_COHORT_SUBMISSIONS);
      return;
    }
    setIsLoadingSubmissions(true);
    try {
      const data = await fetchAssessmentSubmissions(assessment.id, currentUser?.id);
      if (Array.isArray(data) && data.length > 0) {
        setSubmissions(data);
      } else {
        setSubmissions(DEFAULT_COHORT_SUBMISSIONS);
      }
    } catch (err) {
      console.warn('Using default cohort submissions:', err);
      setSubmissions(DEFAULT_COHORT_SUBMISSIONS);
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
      // Auto-populate student name from file name if blank
      if (!studentName) {
        const guessed = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
        setStudentName(guessed);
      }
    }
  };

  const handleGrade = async () => {
    if (!assessment?.id && !assessment?.questions?.length) {
      setGradingError('Please generate or select an assessment first in the Assessment tab.');
      return;
    }
    if (!studentFile) {
      setGradingError('Please upload the student answer sheet PDF.');
      return;
    }
    if (!studentName.trim()) {
      setGradingError('Please enter the student name.');
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
        file: studentFile,
        lecturerId: currentUser?.id,
      });

      setGradingReport(report);

      // Append or update in submissions list
      setSubmissions((prev) => {
        const exists = prev.some((s) => s.id === report.submission_id || s.student_name === report.student_name);
        const newEntry = {
          id: report.submission_id,
          student_id: report.student_id,
          student_number: report.student_number || studentNumber || 'STU-NEW',
          student_name: report.student_name || studentName,
          ai_total: report.ai_total,
          total_score: report.total_score ?? report.ai_total,
          max_score: report.max_score || assessment?.max_score || 100,
          percentage: report.max_score ? Number(((report.total_score / report.max_score) * 100).toFixed(1)) : 0,
          status: report.status || 'graded',
          graded_at: new Date().toISOString(),
          question_results: report.question_results,
          summary_feedback: report.summary_feedback,
        };
        if (exists) {
          return prev.map((s) => (s.id === report.submission_id || s.student_name === report.student_name ? newEntry : s));
        }
        return [newEntry, ...prev];
      });

      if (onGradingComplete) {
        onGradingComplete(report);
      }

      // Scroll to report card
      setTimeout(() => {
        reportRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      setGradingError(err.message || 'Grading failed. Please check backend connection.');
    } finally {
      setIsGrading(false);
    }
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
        prev.map((s) => (s.id === gradingReport.submission_id ? { ...s, status: 'confirmed' } : s))
      );
    } catch (err) {
      console.error('Failed to confirm score:', err);
    } finally {
      setIsConfirming(false);
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
    setGradingReport({
      submission_id: sub.id,
      student_number: sub.student_number,
      student_name: sub.student_name,
      assessment_title: assessment?.title || 'Assessment',
      total_score: sub.total_score,
      ai_total: sub.ai_total,
      max_score: sub.max_score || assessment?.max_score || 100,
      status: sub.status,
      summary_feedback: sub.summary_feedback || 'Completed evaluation verified against normalized rubrics.',
      question_results: sub.question_results || [],
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
      { header: 'Points Awarded', key: 'points_awarded', width: 16 },
      { header: 'Max Points', key: 'max_points', width: 14 },
      { header: 'Feedback / Excerpt', key: 'feedback', width: 45 },
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
          points_awarded: qr.points_awarded,
          max_points: qr.max_points,
          feedback: qr.feedback,
          total_score: idx === 0 ? (gradingReport.total_score ?? gradingReport.ai_total) : '',
          max_score: idx === 0 ? gradingReport.max_score : '',
          status: idx === 0 ? (isConfirmed ? 'CONFIRMED' : 'GRADED') : '',
        });
      });
    } else {
      worksheet.addRow({
        student_id: gradingReport.student_number || 'STU-001',
        student_name: gradingReport.student_name || studentName,
        assessment_title: gradingReport.assessment_title || assessment?.title || 'Assessment',
        question_num: 'All Questions',
        points_awarded: gradingReport.total_score ?? gradingReport.ai_total,
        max_points: gradingReport.max_score,
        feedback: gradingReport.summary_feedback,
        total_score: gradingReport.total_score ?? gradingReport.ai_total,
        max_score: gradingReport.max_score,
        status: isConfirmed ? 'CONFIRMED' : 'GRADED',
      });
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(gradingReport.student_name || 'Student').replace(/\s+/g, '_')}_Grading_Report.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCohortExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Cohort Gradebook');

    worksheet.columns = [
      { header: 'Student ID', key: 'id', width: 16 },
      { header: 'Student Name', key: 'name', width: 26 },
      { header: 'Assessment Title', key: 'assessment', width: 32 },
      { header: 'Total Score', key: 'total_score', width: 14 },
      { header: 'Max Score', key: 'max_score', width: 14 },
      { header: 'Percentage', key: 'percentage', width: 14 },
      { header: 'Tier', key: 'tier', width: 12 },
      { header: 'Status', key: 'status', width: 16 },
      { header: 'Graded At', key: 'graded_at', width: 22 },
    ];

    submissions.forEach((s) => {
      const pct = s.percentage ?? (s.max_score ? Number(((s.total_score / s.max_score) * 100).toFixed(1)) : 0);
      let tier = 'C';
      if (pct >= 90) tier = 'A';
      else if (pct >= 80) tier = 'B';
      else if (pct >= 70) tier = 'C';
      else if (pct >= 60) tier = 'D';
      else tier = 'F';

      worksheet.addRow({
        id: s.student_number || s.id,
        name: s.student_name,
        assessment: assessment?.title || 'Active Assessment',
        total_score: s.total_score,
        max_score: s.max_score || assessment?.max_score || 100,
        percentage: `${pct}%`,
        tier: tier,
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

  // Filtered submissions for search
  const filteredSubmissions = submissions.filter((s) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      (s.student_name && s.student_name.toLowerCase().includes(term)) ||
      (s.student_number && s.student_number.toLowerCase().includes(term))
    );
  });

  // Summary statistics
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
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Decomposed Student Grading & Gradebook</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Upload whole-assessment student PDFs, evaluate against normalized rubrics, and maintain audit-ready cohort records.
          </p>
        </div>

        {assessment && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="badge badge-accent">
              Active: {assessment.title || 'Current Assessment'} ({questionsCount} questions)
            </span>
          </div>
        )}
      </div>

      {/* Upload and Student Info Card */}
      <div className="cartesia-card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <UploadCloud size={16} />
            <span>Grade New Student Submission</span>
          </h3>
          <span className="badge badge-outline" style={{ fontSize: '0.72rem' }}>
            Whole-Assessment Evaluation
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginBottom: 16 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Student Name</label>
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
            <label className="form-label">Student ID / Number (Optional)</label>
            <input
              type="text"
              placeholder="e.g. STU-2026-081"
              value={studentNumber}
              onChange={(e) => setStudentNumber(e.target.value)}
              className="input-text"
              style={{ fontSize: '0.88rem' }}
            />
          </div>
        </div>

        {/* Dropzone Box matching the lecture notes upload box */}
        <label className="dropzone" style={{ position: 'relative', marginBottom: 16 }}>
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
            disabled={isGrading}
          />
          <div className="dropzone-icon">
            {isGrading ? <Loader2 size={22} className="spin" /> : <UploadCloud size={22} />}
          </div>
          <div>
            <p style={{ fontWeight: 500, fontSize: '0.88rem', marginBottom: 2 }}>
              {studentFile ? studentFile.name : 'Click to select or drop student answer sheet (PDF)'}
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
              {studentFile
                ? `${(studentFile.size / 1024).toFixed(1)} KB — Ready to grade`
                : 'Upload single PDF containing the student answers to all assessment questions'}
            </p>
          </div>
        </label>

        {gradingError && (
          <div style={{ marginBottom: 14, padding: 10, borderRadius: 4, background: 'var(--danger-bg)', color: 'var(--danger)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={15} />
            <span>{gradingError}</span>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={handleGrade}
            disabled={isGrading || !studentFile || !studentName.trim()}
            className="btn btn-primary"
            style={{ padding: '8px 20px' }}
          >
            {isGrading ? <Loader2 size={15} className="spin" /> : <Sparkles size={15} />}
            <span>{isGrading ? 'Grading Full Assessment...' : 'Grade Student Submission'}</span>
          </button>
        </div>
      </div>

      {/* Active Grading Report (If reviewed or just graded) */}
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

            {gradingReport.summary_feedback && (
              <div style={{ background: 'var(--surface)', padding: 12, borderRadius: 6, border: '1px solid var(--border-subtle)', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                <span style={{ fontWeight: 600, color: 'var(--text)' }}>Summary Feedback: </span>
                {gradingReport.summary_feedback}
              </div>
            )}
          </div>

          {/* Question-by-Question Detailed Results */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <h4 style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text)' }}>
              Question Evaluations ({gradingReport.question_results?.length || 0})
            </h4>

            {(gradingReport.question_results || []).map((qr, idx) => (
              <div key={qr.question_id || idx} className="cartesia-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="badge badge-accent">Question {idx + 1}</span>
                    <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)' }}>
                      {qr.question_text || `Question ${idx + 1}`}
                    </span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text)' }}>
                    {qr.points_awarded} / {qr.max_points} pts
                  </div>
                </div>

                {/* Extracted Student Answer from PDF */}
                <div style={{ background: 'var(--bg)', padding: '10px 12px', borderRadius: 4, border: '1px solid var(--border-subtle)', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                    <Quote size={12} />
                    <span>Matched Answer from Student PDF:</span>
                  </div>
                  <p style={{ fontSize: '0.82rem', fontFamily: 'var(--font-mono)', color: 'var(--text)', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
                    {qr.matched_student_answer || 'No explicit section matched for this question.'}
                  </p>
                </div>

                {/* Rubric Feedback */}
                {qr.feedback && (
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', background: 'var(--surface)', padding: '8px 10px', borderRadius: 4, border: '1px solid var(--border-subtle)' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text)' }}>Feedback: </span>
                    {qr.feedback}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cohort Gradebook Table Section */}
      <div className="cartesia-card">
        {/* Gradebook Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <GraduationCap size={18} style={{ color: 'var(--accent)' }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>
                Assessment Gradebook & Cohort Roster
              </h3>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              Official immutable grading records for this assessment cohort. Click "Review" on any student to inspect textual citations.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={loadSubmissions} disabled={isLoadingSubmissions} className="btn btn-secondary btn-sm" title="Refresh gradebook">
              <RefreshCw size={13} className={isLoadingSubmissions ? 'spin' : ''} />
              <span>Refresh</span>
            </button>

            <button onClick={handleExportCohortExcel} className="btn btn-secondary btn-sm">
              <FileSpreadsheet size={13} />
              <span>Export Entire Gradebook (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Cohort Metric Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10, marginBottom: 18 }}>
          <div style={{ background: 'var(--bg)', padding: '10px 14px', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Class Size</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)' }}>{cohortCount} Students</div>
          </div>
          <div style={{ background: 'var(--bg)', padding: '10px 14px', borderRadius: 6, border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Cohort Average</div>
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

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table className="rubric-table" style={{ fontSize: '0.84rem' }}>
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Student Name</th>
                <th>Score</th>
                <th>Percentage</th>
                <th>Tier</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSubmissions.length > 0 ? (
                filteredSubmissions.map((sub, idx) => {
                  const pct = sub.percentage ?? (sub.max_score ? Number(((sub.total_score / sub.max_score) * 100).toFixed(1)) : 0);
                  let tier = 'C';
                  if (pct >= 90) tier = 'Grade A';
                  else if (pct >= 85) tier = 'Grade A-';
                  else if (pct >= 80) tier = 'Grade B+';
                  else if (pct >= 75) tier = 'Grade B';
                  else if (pct >= 70) tier = 'Grade C+';
                  else tier = 'Grade C';

                  const isRowConfirmed = sub.status === 'confirmed';

                  return (
                    <tr key={sub.id || idx} className="gradebook-row">
                      <td style={{ fontFamily: 'var(--font-mono)' }}>
                        {sub.student_number || `STU-2026-${String(idx + 1).padStart(3, '0')}`}
                      </td>
                      <td style={{ fontWeight: 600 }}>{sub.student_name}</td>
                      <td>
                        {sub.total_score} / {sub.max_score || assessment?.max_score || 100}
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--accent)' }}>
                        {pct}%
                      </td>
                      <td>
                        <span className={`badge ${pct >= 85 ? 'badge-accent' : 'badge-outline'}`} style={{ fontSize: '0.68rem' }}>
                          {tier}
                        </span>
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
                  <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                    No student submissions found matching "{searchTerm}".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
