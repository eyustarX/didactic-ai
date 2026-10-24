import React, { useState } from 'react';
import { UploadCloud, FileText, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import { uploadDocument } from '../services/api';

const BLOOM_LEVELS = [
  { level: 'Remember', desc: 'Recall definitions and primitives' },
  { level: 'Understand', desc: 'Explain differences between mutex and semaphores' },
  { level: 'Apply', desc: 'Implement synchronization protocols' },
  { level: 'Analyze', desc: 'Inspect deadlock Coffman conditions' },
  { level: 'Evaluate', desc: 'Assess prevention and recovery trade-offs' },
  { level: 'Create', desc: 'Design resilient resource allocation algorithms' },
];

export default function CurriculumTab({
  lectureTitle,
  setLectureTitle,
  lectureContent,
  setLectureContent,
  setActiveTab,
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadStats, setUploadStats] = useState(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const data = await uploadDocument(file);
      setUploadStats(data);
      setLectureTitle(file.name.replace(/\.[^/.]+$/, ''));
      setLectureContent(data.full_text || data.preview || '');
    } catch (err) {
      setUploadError(err.message || 'Error parsing PDF document');
    } finally {
      setIsUploading(false);
    }
  };

  const wordCount = lectureContent ? lectureContent.trim().split(/\s+/).length : 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Curriculum & slide ingest</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Upload lecture slides or paste lecture content to analyze learning objectives.
          </p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16, marginBottom: 20 }}>
        {/* Upload Card */}
        <div className="cartesia-card">
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 12 }}>Upload lecture PDF</h3>

          <label className="dropzone" style={{ position: 'relative' }}>
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }}
              disabled={isUploading}
            />
            <div className="dropzone-icon">
              {isUploading ? <Loader2 size={20} className="spin" /> : <UploadCloud size={20} />}
            </div>
            <div>
              <p style={{ fontWeight: 500, fontSize: '0.88rem', marginBottom: 2 }}>
                {isUploading ? 'Extracting document...' : 'Click to select or drop PDF here'}
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                PDF files up to 15MB
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
                <span style={{ fontWeight: 500, fontSize: '0.82rem' }}>Document processed</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, textAlign: 'center' }}>
                <div style={{ background: 'var(--bg)', padding: '6px', borderRadius: 4, border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Pages</div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{uploadStats.total_pages || 1}</div>
                </div>
                <div style={{ background: 'var(--bg)', padding: '6px', borderRadius: 4, border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Chunks</div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{uploadStats.total_chunks || 4}</div>
                </div>
                <div style={{ background: 'var(--bg)', padding: '6px', borderRadius: 4, border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Words</div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{uploadStats.total_words || wordCount}</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bloom Classification */}
        <div className="cartesia-card">
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: 12 }}>
            Cognitive taxonomy levels
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {BLOOM_LEVELS.map((b) => (
              <div
                key={b.level}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '6px 10px',
                  borderRadius: 4,
                  background: 'var(--surface)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <span style={{ fontWeight: 600, fontSize: '0.82rem', width: 85, color: 'var(--text)' }}>
                  {b.level}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {b.desc}
                </span>
              </div>
            ))}
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
            onClick={() => setActiveTab('rubrics')}
            disabled={!lectureContent}
            className="btn btn-primary btn-sm"
          >
            <span>Proceed to rubrics</span>
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
            placeholder="Paste raw lecture text or upload a PDF above..."
          />
        </div>
      </div>
    </div>
  );
}
