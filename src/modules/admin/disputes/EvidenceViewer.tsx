import React, { useState } from 'react';
import './EvidenceViewer.css';

interface EvidenceItem {
  id: string;
  type: 'photo' | 'document' | 'receipt';
  icon: string;
  fileName: string;
  uploadedBy: string;
  uploadedAt: string;
  fileSize: string;
  verified: boolean;
}

const mockEvidence: EvidenceItem[] = [
  { id: '1', type: 'photo', icon: '📷', fileName: 'rotten_tomatoes_1.jpg', uploadedBy: 'Ravi Sharma', uploadedAt: '2 hrs ago', fileSize: '2.4 MB', verified: true },
  { id: '2', type: 'photo', icon: '📷', fileName: 'wilted_spinach.jpg', uploadedBy: 'Ravi Sharma', uploadedAt: '2 hrs ago', fileSize: '1.8 MB', verified: true },
  { id: '3', type: 'receipt', icon: '🧾', fileName: 'order_receipt_2389.pdf', uploadedBy: 'System', uploadedAt: '2 hrs ago', fileSize: '145 KB', verified: true },
  { id: '4', type: 'photo', icon: '📷', fileName: 'dispatch_photo.jpg', uploadedBy: 'Green Valley Farm', uploadedAt: '45 min ago', fileSize: '3.1 MB', verified: false },
  { id: '5', type: 'document', icon: '📄', fileName: 'quality_cert.pdf', uploadedBy: 'Green Valley Farm', uploadedAt: '40 min ago', fileSize: '520 KB', verified: false },
];

const EvidenceViewer: React.FC = () => {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const selected = mockEvidence[selectedIdx];

  const goPrev = () => setSelectedIdx((i) => (i > 0 ? i - 1 : mockEvidence.length - 1));
  const goNext = () => setSelectedIdx((i) => (i < mockEvidence.length - 1 ? i + 1 : 0));

  return (
    <div className="evidence-viewer">
      <div className="evidence-viewer__header">
        <h1>Evidence Viewer</h1>
        <span className="evidence-viewer__dispute-ref">DSP-401 • ORD-2389</span>
      </div>

      <div className="evidence-viewer__grid">
        <div className="evidence-viewer__main">
          <div className="evidence-viewer__display">
            <button className="evidence-viewer__nav evidence-viewer__nav--prev" onClick={goPrev}>‹</button>
            <div className="evidence-viewer__placeholder">
              <div className="evidence-viewer__placeholder-icon">{selected.icon}</div>
              <div className="evidence-viewer__placeholder-text">{selected.fileName}</div>
            </div>
            <button className="evidence-viewer__nav evidence-viewer__nav--next" onClick={goNext}>›</button>
          </div>

          <div className="evidence-viewer__info-bar">
            <div>
              <div className="evidence-viewer__file-name">{selected.fileName}</div>
              <div className="evidence-viewer__file-meta">
                {selected.fileSize} • Uploaded by {selected.uploadedBy} • {selected.uploadedAt}
              </div>
            </div>
            <button className="admin-btn admin-btn--secondary" style={{ fontSize: 12 }}>Download</button>
          </div>

          <div className="evidence-viewer__thumbnails">
            {mockEvidence.map((item, idx) => (
              <div
                key={item.id}
                className={`evidence-viewer__thumb ${idx === selectedIdx ? 'evidence-viewer__thumb--active' : ''}`}
                onClick={() => setSelectedIdx(idx)}
              >
                {item.icon}
              </div>
            ))}
          </div>
        </div>

        <div className="evidence-viewer__sidebar">
          <div className="evidence-sidebar-card">
            <div className="evidence-sidebar-card__title">File Details</div>
            {[
              ['Type', selected.type.charAt(0).toUpperCase() + selected.type.slice(1)],
              ['File Name', selected.fileName],
              ['Size', selected.fileSize],
              ['Uploaded By', selected.uploadedBy],
              ['Uploaded At', selected.uploadedAt],
            ].map(([label, value]) => (
              <div className="evidence-sidebar-card__row" key={label as string}>
                <span className="evidence-sidebar-card__label">{label}</span>
                <span className="evidence-sidebar-card__value">{value}</span>
              </div>
            ))}
          </div>

          <div className="evidence-sidebar-card">
            <div className="evidence-sidebar-card__title">Integrity Check</div>
            <div className={`evidence-viewer__integrity evidence-viewer__integrity--${selected.verified ? 'verified' : 'unverified'}`}>
              {selected.verified ? '✅ Verified — No tampering detected' : '⚠️ Unverified — Pending review'}
            </div>
          </div>

          <div className="evidence-sidebar-card">
            <div className="evidence-sidebar-card__title">Admin Notes</div>
            <textarea
              className="evidence-sidebar-card__notes"
              placeholder="Add notes about this evidence..."
            />
            <div style={{ marginTop: 10, textAlign: 'right' }}>
              <button className="admin-btn admin-btn--primary" style={{ fontSize: 12 }}>Save Note</button>
            </div>
          </div>

          <div className="evidence-sidebar-card">
            <div className="evidence-sidebar-card__title">All Evidence ({mockEvidence.length})</div>
            {mockEvidence.map((item, idx) => (
              <div
                key={item.id}
                className="evidence-sidebar-card__row"
                style={{ cursor: 'pointer', padding: '8px 0' }}
                onClick={() => setSelectedIdx(idx)}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {item.icon} <span style={{ fontSize: 12, color: idx === selectedIdx ? '#16a34a' : '#374151' }}>{item.fileName}</span>
                </span>
                <span style={{ fontSize: 11, color: '#9ca3af' }}>{item.fileSize}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EvidenceViewer;
