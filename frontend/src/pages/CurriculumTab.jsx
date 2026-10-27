import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Trash2,
  Search,
  RefreshCw,
  AlertCircle,
  FileCode,
} from 'lucide-react';
import {
  uploadLectureNote,
  fetchPreviousUploads,
  deleteLectureNote,
  fetchLectureNote,
} from '../services/api';

export default function CurriculumTab({
  lectureTitle,
  setLectureTitle,
  lectureContent,
  setLectureContent,
  activeNoteId,
  setActiveNoteId,
  setActiveTab,
  currentUser,
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadStats, setUploadStats] = useState(null);

  // Previous uploads state
  const [previousUploads, setPreviousUploads] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingUploads, setIsLoadingUploads] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [noteToDelete, setNoteToDelete] = useState(null);
  const [isDeletingNote, setIsDeletingNote] = useState(false);

  // Load previous uploads on mount
  useEffect(() => {
    loadUploads();
  }, [currentUser]);

  const loadUploads = async () => {
    setIsLoadingUploads(true);
    setDeleteError(null);
    try {
      const data = await fetchPreviousUploads(currentUser?.id);
      setPreviousUploads(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load uploads:', err);
    } finally {
      setIsLoadingUploads(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const resp = await uploadLectureNote({
        file,
        noteTitle: file.name.replace(/\.[^/.]+$/, ''),
        lecturerId: currentUser?.id,
      });

      const note = resp.lecture_note || resp;
      if (note.id) {
        if (setActiveNoteId) setActiveNoteId(note.id);
        setLectureTitle(note.name || file.name);
        const text = note.extracted_text || note.raw_text || note.full_text || '';
        setLectureContent(text);
        setUploadStats({
          file_type: note.file_type,
          word_count: text ? text.trim().split(/\s+/).length : (note.total_words || 0),
        });
      }
      await loadUploads();
    } catch (err) {
      setUploadError(err.message || 'Error processing document');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSelectUpload = async (note) => {
    if (setActiveNoteId) setActiveNoteId(note.id);
    setLectureTitle(note.name);
    const initialText = note.extracted_text || note.raw_text || '';
    if (initialText) setLectureContent(initialText);
    setUploadError(null);
    setDeleteError(null);

    try {
      const details = await fetchLectureNote(note.id, currentUser?.id);
      const text = details.extracted_text || details.raw_text || details.full_text || initialText;
      setLectureContent(text);
    } catch (err) {
      console.error('Failed to load note details:', err);
    }
  };

  const confirmDeleteNote = async () => {
    if (!noteToDelete) return;
    setIsDeletingNote(true);
    setDeleteError(null);
    try {
      await deleteLectureNote(noteToDelete.id, currentUser?.id);
      if (activeNoteId === noteToDelete.id) {
        if (setActiveNoteId) setActiveNoteId(null);
        setLectureTitle('');
        setLectureContent('');
      }
      setNoteToDelete(null);
      await loadUploads();
    } catch (err) {
      setDeleteError(err.message || 'Cannot delete lecture note from database');
    } finally {
      setIsDeletingNote(false);
    }
  };

  const filteredUploads = previousUploads.filter((item) =>
    (item.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const wordCount = lectureContent ? lectureContent.trim().split(/\s+/).length : 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Curriculum & slide ingest</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Upload lecture slides or documents (PDF, PPTX, DOCX, text) to extract lecture content and generate assessments.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16, marginBottom: 20 }}>
        {/* Upload Card */}
        <div className="cartesia-card">
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 12 }}>
            Upload lecture document
          </h3>

          <label className="dropzone" style={{ position: 'relative' }}>
            <input
              type="file"
              accept=".pdf,.pptx,.ppt,.docx,.doc,.txt"
              onChange={handleFileUpload}
              style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
              disabled={isUploading}
            />
            <div className="dropzone-icon">
              {isUploading ? <Loader2 size={20} className="spin" /> : <UploadCloud size={20} />}
            </div>
            <div>
              <p style={{ fontWeight: 500, fontSize: '0.88rem', marginBottom: 2 }}>
                {isUploading ? 'Extracting text & notes...' : 'Click to select or drop file here'}
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                PDF, PPTX (slides & notes), DOCX, or plain text
              </p>
            </div>
          </label>

          {uploadError && (
            <div style={{ marginTop: 12, padding: 10, borderRadius: 4, background: 'var(--danger-bg)', color: 'var(--danger)', fontSize: '0.82rem' }}>
              {uploadError}
            </div>
          )}

          {uploadStats && (
            <div style={{ marginTop: 14, padding: 12, borderRadius: 6, background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <CheckCircle2 size={14} style={{ color: 'var(--accent)' }} />
                <span style={{ fontWeight: 500, fontSize: '0.82rem' }}>Ingestion complete</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, textAlign: 'center' }}>
                <div style={{ background: 'var(--bg)', padding: '6px', borderRadius: 4, border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Format</div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', textTransform: 'uppercase' }}>
                    {uploadStats.file_type || 'PDF'}
                  </div>
                </div>
                <div style={{ background: 'var(--bg)', padding: '6px', borderRadius: 4, border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Words</div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{uploadStats.word_count || wordCount}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Previous Uploads Panel */}
        <div className="cartesia-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Previous uploads</h3>
            <button
              onClick={loadUploads}
              className="btn btn-ghost btn-sm"
              style={{ padding: '2px 6px' }}
              title="Refresh uploads"
            >
              <RefreshCw size={13} className={isLoadingUploads ? 'spin' : ''} />
            </button>
          </div>

          <div style={{ position: 'relative', marginBottom: 12 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: 9, color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search previous uploads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-text"
              style={{ paddingLeft: 30, fontSize: '0.82rem', height: 32 }}
            />
          </div>

          {deleteError && (
            <div style={{ marginBottom: 10, padding: 8, borderRadius: 4, background: 'var(--danger-bg)', color: 'var(--danger)', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertCircle size={14} />
              <span>{deleteError}</span>
            </div>
          )}

          <div style={{ maxHeight: 210, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filteredUploads.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                {isLoadingUploads ? 'Loading uploads...' : 'No previous uploads found.'}
              </div>
            ) : (
              filteredUploads.map((note) => {
                const isSelected = activeNoteId === note.id;
                return (
                  <div
                    key={note.id}
                    onClick={() => handleSelectUpload(note)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      borderRadius: 4,
                      cursor: 'pointer',
                      background: isSelected ? 'var(--accent-subtle, rgba(59, 130, 246, 0.1))' : 'var(--surface)',
                      border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
                      transition: 'border-color 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                      <FileCode size={15} style={{ color: isSelected ? 'var(--accent)' : 'var(--text-muted)', flexShrink: 0 }} />
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: isSelected ? 600 : 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {note.name}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', gap: 6, marginTop: 2 }}>
                          <span className="badge badge-outline" style={{ fontSize: '0.65rem', padding: '0 4px', textTransform: 'uppercase' }}>
                            {note.file_type || 'note'}
                          </span>
                          <span>{new Date(note.created_at || Date.now()).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setNoteToDelete(note);
                      }}
                      className="btn btn-ghost btn-sm"
                      style={{ padding: '4px', color: 'var(--text-muted)', flexShrink: 0 }}
                      title="Delete upload from database"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Content Editor */}
      <div className="cartesia-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={16} style={{ color: 'var(--text-muted)' }} />
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Active lecture notes</h3>
            <span className="badge badge-outline">{wordCount} words</span>
          </div>

          <button
            onClick={() => setActiveTab('assessment')}
            disabled={!lectureContent}
            className="btn btn-primary btn-sm"
          >
            <span>Proceed to assessment generation</span>
            <ArrowRight size={13} />
          </button>
        </div>

        <div className="form-group">
          <label className="form-label">Course or lecture title</label>
          <input
            type="text"
            className="input-text"
            value={lectureTitle}
            onChange={(e) => setLectureTitle(e.target.value)}
            placeholder="e.g. Operating Systems: Concurrency & Deadlocks"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Lecture notes</label>
          <textarea
            className="input-textarea"
            style={{ minHeight: 220, fontFamily: 'var(--font-mono)', fontSize: '0.84rem' }}
            value={lectureContent}
            onChange={(e) => setLectureContent(e.target.value)}
            placeholder="Paste raw lecture text or upload a document above..."
          />
        </div>
      </div>

      {/* Database Deletion Confirmation Modal */}
      {noteToDelete && (
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
            if (!isDeletingNote) setNoteToDelete(null);
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
                  Delete Lecture Note from Database
                </h3>
                <span style={{ fontSize: '0.74rem', color: '#10b981', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981' }}></span>
                  Neon PostgreSQL Cloud Database
                </span>
              </div>
            </div>

            <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 18 }}>
              Are you sure you want to permanently delete <strong style={{ color: 'var(--text)' }}>"{noteToDelete.name}"</strong>? 
              This will permanently delete this document and its extracted curriculum key points from the <strong>Neon PostgreSQL Cloud Database</strong>.
              This action cannot be undone.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => setNoteToDelete(null)}
                disabled={isDeletingNote}
                className="btn btn-secondary btn-sm"
                style={{ padding: '8px 16px', fontSize: '0.82rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteNote}
                disabled={isDeletingNote}
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
                  cursor: isDeletingNote ? 'not-allowed' : 'pointer',
                }}
              >
                {isDeletingNote ? <Loader2 size={13} className="spin" /> : <Trash2 size={13} />}
                <span>{isDeletingNote ? 'Deleting from Cloud DB...' : 'Delete from Database'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
