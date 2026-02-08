import React, { useState } from 'react';

interface KycReviewPanelProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}

const KycReviewPanel: React.FC<KycReviewPanelProps> = ({ user, onClose, onApprove, onReject }) => {
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
        <div className="admin-modal__header">
          <h2>KYC Review — {user.name}</h2>
          <button className="admin-modal__close" onClick={onClose}>✕</button>
        </div>

        <div className="admin-modal__body">
          <div style={{ marginBottom: 16, padding: 12, background: '#fef3c7', borderRadius: 8, fontSize: 13 }}>
            ⏳ This {user.role} has submitted documents for KYC verification.
          </div>

          {/* Document placeholders */}
          <div style={{ marginBottom: 16 }}>
            <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Submitted Documents</h4>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{
                width: 140, height: 100, background: '#f3f4f6', borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, color: '#6b7280', border: '1px dashed #d1d5db',
              }}>
                📄 ID Proof
              </div>
              <div style={{
                width: 140, height: 100, background: '#f3f4f6', borderRadius: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, color: '#6b7280', border: '1px dashed #d1d5db',
              }}>
                📄 Address Proof
              </div>
              {user.role === 'driver' && (
                <div style={{
                  width: 140, height: 100, background: '#f3f4f6', borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, color: '#6b7280', border: '1px dashed #d1d5db',
                }}>
                  📄 License
                </div>
              )}
            </div>
          </div>

          {showRejectForm && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Rejection Reason
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Explain why the KYC is being rejected..."
                style={{
                  width: '100%', minHeight: 80, padding: 10, borderRadius: 8,
                  border: '1px solid #e5e7eb', fontSize: 13, resize: 'vertical',
                }}
              />
            </div>
          )}
        </div>

        <div className="admin-modal__footer" style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="admin-btn admin-btn--secondary" onClick={onClose}>Cancel</button>
          {!showRejectForm ? (
            <>
              <button
                className="admin-btn admin-btn--danger"
                onClick={() => setShowRejectForm(true)}
              >
                Reject
              </button>
              <button className="admin-btn admin-btn--primary" onClick={onApprove}>
                ✓ Approve KYC
              </button>
            </>
          ) : (
            <button
              className="admin-btn admin-btn--danger"
              onClick={onReject}
              disabled={!rejectReason.trim()}
            >
              Confirm Rejection
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default KycReviewPanel;
