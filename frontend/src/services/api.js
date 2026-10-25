/**
 * Didactic AI API client.
 * Connects to the FastAPI backend with seamless fallback handling.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

function getAuthHeaders(lecturerId) {
  const headers = {};
  if (lecturerId) {
    headers['X-Lecturer-Id'] = lecturerId;
  } else {
    try {
      const stored = localStorage.getItem('didactic_user');
      if (stored) {
        const u = JSON.parse(stored);
        if (u.id) headers['X-Lecturer-Id'] = u.id;
      }
    } catch (e) {}
  }
  return headers;
}

export async function fetchHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    return { status: 'offline', active_provider: 'unavailable', error: err.message };
  }
}

export async function fetchRoot() {
  try {
    const res = await fetch(`${API_BASE}/`);
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    return await res.json();
  } catch (err) {
    return { status: 'offline', version: '1.0.0', error: err.message };
  }
}

/* -------------------------------------------------------------
 * 1. Lecture Notes & Previous Uploads
 * ------------------------------------------------------------- */

export async function uploadLectureNote({ file, pastedText, noteTitle, lecturerId }) {
  const formData = new FormData();
  if (file) formData.append('file', file);
  if (pastedText) formData.append('pasted_text', pastedText);
  if (noteTitle) formData.append('note_title', noteTitle);

  const res = await fetch(`${API_BASE}/lecture-notes/upload`, {
    method: 'POST',
    headers: getAuthHeaders(lecturerId),
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(err.detail || 'Upload failed');
  }
  return await res.json();
}

export async function fetchPreviousUploads(lecturerId) {
  const res = await fetch(`${API_BASE}/lecture-notes`, {
    headers: getAuthHeaders(lecturerId),
  });
  if (!res.ok) throw new Error('Failed to fetch previous uploads');
  return await res.json();
}

export async function fetchLectureNote(noteId, lecturerId) {
  const res = await fetch(`${API_BASE}/lecture-notes/${noteId}`, {
    headers: getAuthHeaders(lecturerId),
  });
  if (!res.ok) throw new Error('Failed to fetch lecture note details');
  return await res.json();
}

export const fetchLectureNotes = fetchPreviousUploads;
export const fetchLectureNoteDetail = fetchLectureNote;

export async function deleteLectureNote(noteId, lecturerId) {
  const res = await fetch(`${API_BASE}/lecture-notes/${noteId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(lecturerId),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to delete note' }));
    throw new Error(err.detail || 'Failed to delete note');
  }
  return await res.json();
}

/* -------------------------------------------------------------
 * 2. Key-Part Extraction & Review
 * ------------------------------------------------------------- */

export async function extractKeyParts(noteId, lecturerId) {
  const res = await fetch(`${API_BASE}/lecture-notes/${noteId}/extract-key-parts`, {
    method: 'POST',
    headers: getAuthHeaders(lecturerId),
  });
  if (!res.ok) throw new Error('Failed to extract key parts');
  return await res.json();
}

export async function updateKeyPoints(noteId, keyPoints, lecturerId) {
  const res = await fetch(`${API_BASE}/lecture-notes/${noteId}/key-points`, {
    method: 'PUT',
    headers: {
      ...getAuthHeaders(lecturerId),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ key_points: keyPoints }),
  });
  if (!res.ok) throw new Error('Failed to update key points');
  return await res.json();
}

/* -------------------------------------------------------------
 * 3. Assessment & Questions
 * ------------------------------------------------------------- */

export async function generateAssessmentFromParts({ lecture_note_id, question_count = 3, title, prompt, lecturerId }) {
  const res = await fetch(`${API_BASE}/assessments/generate`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(lecturerId),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ lecture_note_id, question_count, title, prompt }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to generate assessment' }));
    throw new Error(err.detail || 'Failed to generate assessment');
  }
  return await res.json();
}

export async function copilotChat({ messages, lecture_note_id, lecture_title, lecturerId }) {
  const res = await fetch(`${API_BASE}/assessments/copilot-chat`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(lecturerId),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages, lecture_note_id, lecture_title }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to chat with Copilot' }));
    throw new Error(err.detail || 'Failed to chat with Copilot');
  }
  return await res.json();
}

export async function fetchAssessments({ lecture_note_id, lecturerId } = {}) {
  let url = `${API_BASE}/assessments`;
  if (lecture_note_id) {
    url += `?lecture_note_id=${encodeURIComponent(lecture_note_id)}`;
  }
  const res = await fetch(url, {
    headers: getAuthHeaders(lecturerId),
  });
  if (!res.ok) throw new Error('Failed to fetch assessments');
  return await res.json();
}

export async function deleteAssessment(assessmentId, lecturerId) {
  const res = await fetch(`${API_BASE}/assessments/${assessmentId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(lecturerId),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to delete assessment' }));
    throw new Error(err.detail || 'Failed to delete assessment');
  }
  return await res.json();
}

export async function fetchAssessment(assessmentId, lecturerId) {
  const res = await fetch(`${API_BASE}/assessments/${assessmentId}`, {
    headers: getAuthHeaders(lecturerId),
  });
  if (!res.ok) throw new Error('Failed to fetch assessment');
  return await res.json();
}

export const fetchAssessmentDetail = fetchAssessment;

export async function updateAssessmentQuestions(assessmentId, questions, lecturerId) {
  const res = await fetch(`${API_BASE}/assessments/${assessmentId}/questions`, {
    method: 'PUT',
    headers: {
      ...getAuthHeaders(lecturerId),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ questions }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to update questions' }));
    throw new Error(err.detail || 'Failed to update questions');
  }
  return await res.json();
}

export async function approveQuestions(assessmentId, lecturerId) {
  const res = await fetch(`${API_BASE}/assessments/${assessmentId}/approve-questions`, {
    method: 'POST',
    headers: getAuthHeaders(lecturerId),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to approve questions' }));
    throw new Error(err.detail || 'Failed to approve questions');
  }
  return await res.json();
}

/* -------------------------------------------------------------
 * 4. Rubrics
 * ------------------------------------------------------------- */

export async function generateRubricsForAssessment(assessmentId, lecturerId) {
  const res = await fetch(`${API_BASE}/assessments/${assessmentId}/generate-rubrics`, {
    method: 'POST',
    headers: getAuthHeaders(lecturerId),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to generate rubrics' }));
    throw new Error(err.detail || 'Failed to generate rubrics');
  }
  return await res.json();
}

export async function regenerateQuestionRubric(questionId, lecturerId) {
  const res = await fetch(`${API_BASE}/questions/${questionId}/regenerate-rubric`, {
    method: 'POST',
    headers: getAuthHeaders(lecturerId),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to regenerate rubric' }));
    throw new Error(err.detail || 'Failed to regenerate rubric');
  }
  return await res.json();
}

export const generateQuestionRubric = regenerateQuestionRubric;

export async function generateRubricFromQuestion({
  question_text,
  max_marks,
  student_hint,
  lecture_note_id,
  lecturerId,
}) {
  const res = await fetch(`${API_BASE}/rubrics/generate-from-question`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(lecturerId),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      question_text,
      max_marks: parseFloat(max_marks) || 10,
      student_hint,
      lecture_note_id,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to generate rubric' }));
    throw new Error(err.detail || 'Failed to generate rubric');
  }
  return await res.json();
}

export async function updateQuestionRubric(questionId, criteria, lecturerId) {
  const res = await fetch(`${API_BASE}/questions/${questionId}/rubric`, {
    method: 'PUT',
    headers: {
      ...getAuthHeaders(lecturerId),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ criteria }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to update rubric' }));
    throw new Error(err.detail || 'Failed to update rubric');
  }
  return await res.json();
}

export async function approveRubrics(assessmentId, lecturerId) {
  const res = await fetch(`${API_BASE}/assessments/${assessmentId}/approve-rubrics`, {
    method: 'POST',
    headers: getAuthHeaders(lecturerId),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to approve rubrics' }));
    throw new Error(err.detail || 'Failed to approve rubrics');
  }
  return await res.json();
}

export async function createAssessmentNewVersion(assessmentId, lecturerId) {
  const res = await fetch(`${API_BASE}/assessments/${assessmentId}/new-version`, {
    method: 'POST',
    headers: getAuthHeaders(lecturerId),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to create new version' }));
    throw new Error(err.detail || 'Failed to create new version');
  }
  return await res.json();
}

/* -------------------------------------------------------------
 * 5. Students & Grading
 * ------------------------------------------------------------- */

export async function fetchStudents(lecturerId) {
  const res = await fetch(`${API_BASE}/students`, {
    headers: getAuthHeaders(lecturerId),
  });
  if (!res.ok) throw new Error('Failed to fetch students');
  return await res.json();
}

export async function createStudent({ student_number, name, lecturerId }) {
  const res = await fetch(`${API_BASE}/students`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(lecturerId),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ student_number, name }),
  });
  if (!res.ok) throw new Error('Failed to create student');
  return await res.json();
}

export async function gradeStudentSubmission({
  assessment_id,
  student_id,
  student_number,
  student_name,
  file,
  lecturerId,
}) {
  const formData = new FormData();
  if (student_id) formData.append('student_id', student_id);
  if (student_number) formData.append('student_number', student_number);
  if (student_name) formData.append('student_name', student_name);
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/assessments/${assessment_id}/grade-submission`, {
    method: 'POST',
    headers: getAuthHeaders(lecturerId),
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Grading failed' }));
    throw new Error(err.detail || 'Grading failed');
  }
  return await res.json();
}

export async function confirmSubmissionScore(submissionId, totalScore, lecturerId) {
  const res = await fetch(`${API_BASE}/submissions/${submissionId}/confirm`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(lecturerId),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ total_score: totalScore }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Confirmation failed' }));
    throw new Error(err.detail || 'Confirmation failed');
  }
  return await res.json();
}

export async function createManualSubmission({
  assessment_id,
  student_name,
  student_number,
  total_score,
  summary_feedback,
  question_scores,
  lecturerId,
}) {
  const res = await fetch(`${API_BASE}/assessments/${assessment_id}/manual-submission`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(lecturerId),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      student_name,
      student_number,
      total_score,
      summary_feedback,
      question_scores,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to record manual grade' }));
    throw new Error(err.detail || 'Failed to record manual grade');
  }
  return await res.json();
}

export async function fetchAssessmentSubmissions(assessmentId, lecturerId) {
  const res = await fetch(`${API_BASE}/assessments/${assessmentId}/submissions`, {
    headers: getAuthHeaders(lecturerId),
  });
  if (!res.ok) throw new Error('Failed to fetch submissions');
  return await res.json();
}

export async function fetchExportExcelData(assessmentId, lecturerId) {
  const res = await fetch(`${API_BASE}/assessments/${assessmentId}/export-excel-data`, {
    headers: getAuthHeaders(lecturerId),
  });
  if (!res.ok) throw new Error('Failed to fetch Excel export data');
  return await res.json();
}

export async function downloadAssessmentPdf(assessmentId, solutions = false, lecturerId, assessmentFallbackData = null) {
  let res = null;
  if (assessmentId && assessmentId !== 'undefined' && assessmentId !== 'null') {
    try {
      const url = `${API_BASE}/assessments/${assessmentId}/export-pdf?solutions=${solutions ? 'true' : 'false'}`;
      res = await fetch(url, {
        headers: getAuthHeaders(lecturerId),
      });
    } catch (e) {
      console.warn('GET /export-pdf failed, attempting fallback...', e);
    }
  }

  if ((!res || !res.ok) && assessmentFallbackData) {
    try {
      const url = `${API_BASE}/assessments/export-pdf-custom`;
      res = await fetch(url, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(lecturerId),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assessment_data: assessmentFallbackData,
          solutions,
        }),
      });
    } catch (e) {
      console.error('Custom PDF export failed:', e);
    }
  }

  if (!res || !res.ok) {
    const err = await res?.json().catch(() => ({ detail: 'Failed to download assessment PDF' }));
    throw new Error(err?.detail || 'Failed to download assessment PDF');
  }

  const blob = await res.blob();
  const disposition = res.headers.get('content-disposition');
  let filename = solutions ? 'Assessment_Solution_Key.pdf' : 'Assessment_Exam_Paper.pdf';
  if (disposition && disposition.includes('filename=')) {
    const match = disposition.match(/filename="?([^";]+)"?/);
    if (match && match[1]) filename = match[1];
  }
  const blobUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(blobUrl);
}

/* -------------------------------------------------------------
 * Legacy Compatibility Helpers
 * ------------------------------------------------------------- */

export async function uploadDocument(file) {
  return uploadLectureNote({ file });
}

export async function generateRubric({ lecture_title, lecture_content }) {
  const res = await fetch(`${API_BASE}/generate/rubrics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lecture_title, lecture_content }),
  });
  if (!res.ok) throw new Error('Failed to generate rubric');
  return await res.json();
}

export async function generateAssessment({ lecture_title, lecture_content, question_count = 3 }) {
  const res = await fetch(`${API_BASE}/generate/assessment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lecture_title, lecture_content, question_count }),
  });
  if (!res.ok) throw new Error('Failed to generate assessment');
  return await res.json();
}

export async function gradeExamSubmission(data) {
  const res = await fetch(`${API_BASE}/grade/exam`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to grade exam');
  return await res.json();
}

export async function fetchAnalytics(courseId = null) {
  const url = courseId ? `${API_BASE}/analytics?course_id=${encodeURIComponent(courseId)}` : `${API_BASE}/analytics`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch analytics');
  return await res.json();
}
