/**
 * Didactic AI API client.
 * Connects to the FastAPI backend with seamless fallback handling.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

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

export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Failed to upload document' }));
    throw new Error(err.detail || 'Upload failed');
  }

  return await res.json();
}

export async function generateRubric({ lecture_title, lecture_content }) {
  const res = await fetch(`${API_BASE}/generate/rubrics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lecture_title, lecture_content }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Rubric generation failed' }));
    throw new Error(err.detail || 'Failed to generate rubric');
  }

  return await res.json();
}

export async function generateAssessment({ lecture_title, lecture_content, question_count = 3 }) {
  const res = await fetch(`${API_BASE}/generate/assessment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lecture_title, lecture_content, question_count }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Assessment generation failed' }));
    throw new Error(err.detail || 'Failed to generate assessment');
  }

  return await res.json();
}

export async function gradeExamSubmission({ question, rubric, student_answer, course_id, student_id }) {
  const res = await fetch(`${API_BASE}/grade/exam`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, rubric, student_answer, course_id, student_id }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Exam grading failed' }));
    throw new Error(err.detail || 'Failed to grade exam');
  }

  return await res.json();
}

export async function gradeAssignmentSubmission({ assignment_brief, rubric, student_submission, course_id, student_id }) {
  const res = await fetch(`${API_BASE}/grade/assignment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ assignment_brief, rubric, student_submission, course_id, student_id }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Assignment grading failed' }));
    throw new Error(err.detail || 'Failed to grade assignment');
  }

  return await res.json();
}

export async function fetchAnalytics(courseId = null) {
  const url = courseId ? `${API_BASE}/analytics?course_id=${encodeURIComponent(courseId)}` : `${API_BASE}/analytics`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch analytics (status: ${res.status})`);
  }
  return await res.json();
}
