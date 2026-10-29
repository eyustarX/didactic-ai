/**
 * Didactic AI API client.
 * Connects to the FastAPI backend with seamless fallback handling.
 */

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');

function resolveLecturerId(lecturerId) {
  if (lecturerId && typeof lecturerId === 'string') return lecturerId;
  try {
    const stored = localStorage.getItem('didactic_user');
    if (stored) {
      const u = JSON.parse(stored);
      if (u && u.id) return u.id;
    }
  } catch (e) {}
  return null;
}

function getAuthHeaders(lecturerId) {
  const headers = {};
  const id = resolveLecturerId(lecturerId);
  if (id) {
    headers['X-Lecturer-Id'] = id;
  }
  return headers;
}

/* -------------------------------------------------------------
 * Authentication API
 * ------------------------------------------------------------- */

export async function registerUser({ name, email, password }) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Registration failed' }));
    throw new Error(err.detail || 'Registration failed');
  }
  return await res.json();
}

export async function loginUser({ email, password }) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Login failed' }));
    throw new Error(err.detail || 'Invalid email or password');
  }
  return await res.json();
}

export async function fetchCurrentUser(lecturerId) {
  const id = resolveLecturerId(lecturerId);
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: getAuthHeaders(id),
  });
  if (!res.ok) throw new Error('Failed to fetch user profile');
  return await res.json();
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
  const id = resolveLecturerId(lecturerId);
  const query = id ? `?lecturer_id=${encodeURIComponent(id)}` : '';
  const res = await fetch(`${API_BASE}/lecture-notes${query}`, {
    headers: getAuthHeaders(id),
  });
  if (!res.ok) throw new Error('Failed to fetch previous uploads');
  return await res.json();
}

export async function fetchLectureNote(noteId, lecturerId) {
  const id = resolveLecturerId(lecturerId);
  const query = id ? `?lecturer_id=${encodeURIComponent(id)}` : '';
  const res = await fetch(`${API_BASE}/lecture-notes/${noteId}${query}`, {
    headers: getAuthHeaders(id),
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
    const err = await res.json().catch(() => ({ detail: 'Failed to chat with Didactic AI' }));
    throw new Error(err.detail || 'Failed to chat with Didactic AI');
  }
  return await res.json();
}

export const didacticAiChat = copilotChat;

export async function fetchChatSessions(lecturerId) {
  const id = resolveLecturerId(lecturerId);
  const params = id ? `?lecturer_id=${encodeURIComponent(id)}` : '';
  const res = await fetch(`${API_BASE}/chat/sessions${params}`, {
    headers: getAuthHeaders(lecturerId),
  });
  if (!res.ok) return [];
  return await res.json();
}

export async function fetchChatSessionDetails(sessionId, lecturerId) {
  const id = resolveLecturerId(lecturerId);
  const params = id ? `?lecturer_id=${encodeURIComponent(id)}` : '';
  const res = await fetch(`${API_BASE}/chat/sessions/${sessionId}${params}`, {
    headers: getAuthHeaders(lecturerId),
  });
  if (!res.ok) throw new Error('Failed to load chat session');
  return await res.json();
}

export async function createChatSession({ title, lecture_note_id, assessment_id, lecturerId } = {}) {
  const res = await fetch(`${API_BASE}/chat/sessions`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(lecturerId),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title, lecture_note_id, assessment_id }),
  });
  if (!res.ok) throw new Error('Failed to create chat session');
  return await res.json();
}

export async function saveChatMessage({ sessionId, role, content, readyToGenerate, suggestedPrompt, questionCount, lecturerId }) {
  const res = await fetch(`${API_BASE}/chat/sessions/${sessionId}/messages`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(lecturerId),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      role,
      content,
      ready_to_generate: readyToGenerate,
      suggested_prompt: suggestedPrompt,
      question_count: questionCount,
    }),
  });
  if (!res.ok) throw new Error('Failed to save message');
  return await res.json();
}

export async function deleteChatSession(sessionId, lecturerId) {
  const res = await fetch(`${API_BASE}/chat/sessions/${sessionId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(lecturerId),
  });
  if (!res.ok) throw new Error('Failed to delete chat session');
  return await res.json();
}

export async function fetchAssessments(arg = {}) {
  let lecture_note_id;
  let lecturerId;

  if (typeof arg === 'string') {
    lecturerId = arg;
  } else if (arg && typeof arg === 'object') {
    lecture_note_id = arg.lecture_note_id;
    lecturerId = arg.lecturerId;
  }

  const id = resolveLecturerId(lecturerId);
  const params = new URLSearchParams();
  if (lecture_note_id) params.append('lecture_note_id', lecture_note_id);
  if (id) params.append('lecturer_id', id);

  const queryStr = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${API_BASE}/assessments${queryStr}`, {
    headers: getAuthHeaders(id),
  });
  if (!res.ok) throw new Error('Failed to fetch assessments');
  return await res.json();
}

export async function deleteAssessment(assessmentId, lecturerId) {
  const id = resolveLecturerId(lecturerId);
  const query = id ? `?lecturer_id=${encodeURIComponent(id)}` : '';
  const res = await fetch(`${API_BASE}/assessments/${assessmentId}${query}`, {
    method: 'DELETE',
    headers: getAuthHeaders(id),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to delete assessment' }));
    throw new Error(err.detail || 'Failed to delete assessment');
  }
  return await res.json();
}

export async function fetchAssessment(assessmentId, lecturerId) {
  const id = resolveLecturerId(lecturerId);
  const query = id ? `?lecturer_id=${encodeURIComponent(id)}` : '';
  const res = await fetch(`${API_BASE}/assessments/${assessmentId}${query}`, {
    headers: getAuthHeaders(id),
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
  section,
  academic_year,
  course_name,
  assessment_category,
  file,
  pasted_text,
  lecturerId,
}) {
  const formData = new FormData();
  if (student_id) formData.append('student_id', student_id);
  if (student_number) formData.append('student_number', student_number);
  if (student_name) formData.append('student_name', student_name);
  if (section) formData.append('section', section);
  if (academic_year) formData.append('academic_year', academic_year);
  if (course_name) formData.append('course_name', course_name);
  if (assessment_category) formData.append('assessment_category', assessment_category);
  if (file) formData.append('file', file);
  if (pasted_text) formData.append('pasted_text', pasted_text);

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

export async function regradeSubmission(submissionId, assessmentId, lecturerId) {
  const url = assessmentId
    ? `${API_BASE}/assessments/${assessmentId}/submissions/${submissionId}/regrade`
    : `${API_BASE}/submissions/${submissionId}/regrade`;
  const res = await fetch(url, {
    method: 'POST',
    headers: getAuthHeaders(lecturerId),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Regrading failed' }));
    throw new Error(err.detail || 'Regrading failed');
  }
  return await res.json();
}

export async function regradeSubmissionQuestion(submissionId, questionId, assessmentId, lecturerId) {
  const url = assessmentId
    ? `${API_BASE}/assessments/${assessmentId}/submissions/${submissionId}/regrade-question`
    : `${API_BASE}/submissions/${submissionId}/regrade-question`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(lecturerId),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ question_id: questionId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Question re-evaluation failed' }));
    throw new Error(err.detail || 'Question re-evaluation failed');
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
  section,
  academic_year,
  course_name,
  assessment_category,
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
      section,
      academic_year,
      course_name,
      assessment_category,
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

export async function fetchMasterCourseGradebook({
  course_name,
  section,
  academic_year,
  assessment_id,
  lecturerId,
}) {
  const id = resolveLecturerId(lecturerId);
  const params = new URLSearchParams();
  if (course_name) params.append('course_name', course_name);
  if (section) params.append('section', section);
  if (academic_year) params.append('academic_year', academic_year);
  if (assessment_id) params.append('assessment_id', assessment_id);
  if (id) params.append('lecturer_id', id);

  const res = await fetch(`${API_BASE}/courses/master-gradebook?${params.toString()}`, {
    headers: getAuthHeaders(id),
  });
  if (!res.ok) throw new Error('Failed to load Master Course Gradebook');
  return await res.json();
}

export async function updateAssessmentSettings(assessmentId, settings, lecturerId) {
  const id = resolveLecturerId(lecturerId);
  const res = await fetch(`${API_BASE}/assessments/${assessmentId}/settings`, {
    method: 'PATCH',
    headers: {
      ...getAuthHeaders(id),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error('Failed to update assessment settings');
  return await res.json();
}

export async function fetchAssessmentSubmissions(assessmentId, lecturerId) {
  const id = resolveLecturerId(lecturerId);
  const query = id ? `?lecturer_id=${encodeURIComponent(id)}` : '';
  const res = await fetch(`${API_BASE}/assessments/${assessmentId}/submissions${query}`, {
    headers: getAuthHeaders(id),
  });
  if (!res.ok) throw new Error('Failed to fetch submissions');
  return await res.json();
}

export async function fetchExportExcelData(assessmentId, lecturerId) {
  const id = resolveLecturerId(lecturerId);
  const query = id ? `?lecturer_id=${encodeURIComponent(id)}` : '';
  const res = await fetch(`${API_BASE}/assessments/${assessmentId}/export-excel-data${query}`, {
    headers: getAuthHeaders(id),
  });
  if (!res.ok) throw new Error('Failed to fetch Excel export data');
  return await res.json();
}

export async function downloadAssessmentPdf(assessmentId, solutions = false, lecturerId, assessmentFallbackData = null) {
  const id = resolveLecturerId(lecturerId);
  let res = null;
  if (assessmentId && assessmentId !== 'undefined' && assessmentId !== 'null') {
    try {
      const q = new URLSearchParams({ solutions: solutions ? 'true' : 'false' });
      if (id) q.append('lecturer_id', id);
      const url = `${API_BASE}/assessments/${assessmentId}/export-pdf?${q.toString()}`;
      res = await fetch(url, {
        headers: getAuthHeaders(id),
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

export async function fetchAnalytics(courseId = null, lecturerId = null) {
  const id = resolveLecturerId(lecturerId);
  const params = new URLSearchParams();
  if (courseId) params.append('course_id', courseId);
  if (id) params.append('lecturer_id', id);
  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${API_BASE}/analytics${query}`, {
    headers: getAuthHeaders(id),
  });
  if (!res.ok) throw new Error('Failed to fetch analytics');
  return await res.json();
}
