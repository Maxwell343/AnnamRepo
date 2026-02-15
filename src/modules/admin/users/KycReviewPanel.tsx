import React, { useState, useCallback, useEffect } from 'react';
import './KycReviewPanel.css';

// ============ Types ============
type DocumentStatus = 'pending' | 'verified' | 'rejected' | 'expired';
type KycStatus = 'pending' | 'under_review' | 'approved' | 'rejected' | 'resubmission_required';

interface KycDocument {
  id: string;
  type: 'id_proof' | 'address_proof' | 'license' | 'registration' | 'photo' | 'bank_statement';
  name: string;
  fileName: string;
  fileSize: string;
  uploadedAt: string;
  status: DocumentStatus;
  previewUrl?: string;
  rejectionReason?: string;
}

interface KycTimeline {
  id: string;
  action: string;
  description: string;
  timestamp: string;
  actor?: string;
  status?: 'info' | 'success' | 'warning' | 'error';
}

interface KycData {
  status: KycStatus;
  submittedAt: string;
  lastUpdated: string;
  documents: KycDocument[];
  timeline: KycTimeline[];
  notes?: string;
  assignedTo?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

interface UserInfo {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  avatar?: string;
  joinedAt?: string;
  address?: string;
}

interface KycReviewPanelProps {
  user: UserInfo;
  onClose: () => void;
  onApprove: (notes?: string) => void;
  onReject: (reason: string, notes?: string) => void;
  onRequestResubmission?: (documentIds: string[], reason: string) => void;
}

// ============ Constants ============
const REJECTION_REASONS = [
  { id: 'blurry', label: 'Document is blurry or unreadable' },
  { id: 'expired', label: 'Document has expired' },
  { id: 'mismatch', label: 'Information does not match' },
  { id: 'incomplete', label: 'Document is incomplete or cropped' },
  { id: 'invalid', label: 'Invalid document type' },
  { id: 'tampered', label: 'Document appears to be tampered' },
  { id: 'other', label: 'Other reason' },
];

const DOCUMENT_TYPE_CONFIG: Record<KycDocument['type'], { icon: string; label: string }> = {
  id_proof: { icon: '🪪', label: 'ID Proof' },
  address_proof: { icon: '🏠', label: 'Address Proof' },
  license: { icon: '🚗', label: 'Driving License' },
  registration: { icon: '📋', label: 'Registration Certificate' },
  photo: { icon: '📸', label: 'Photo' },
  bank_statement: { icon: '🏦', label: 'Bank Statement' },
};

const ROLE_REQUIRED_DOCS: Record<string, KycDocument['type'][]> = {
  farmer: ['id_proof', 'address_proof', 'photo'],
  driver: ['id_proof', 'address_proof', 'license', 'photo'],
  ngo: ['id_proof', 'registration', 'address_proof'],
  customer: ['id_proof', 'photo'],
};

// ============ Helper Components ============
const DocumentCard: React.FC<{
  document: KycDocument;
  onView: (doc: KycDocument) => void;
  onVerify: (docId: string) => void;
  onReject: (docId: string) => void;
  isSelected: boolean;
  onToggleSelect: (docId: string) => void;
  reviewMode: boolean;
}> = ({ document, onView, onVerify, onReject, isSelected, onToggleSelect, reviewMode }) => {
  const config = DOCUMENT_TYPE_CONFIG[document.type];
  
  return (
    <div className={`kyc-document ${document.status} ${isSelected ? 'selected' : ''}`}>
      {reviewMode && document.status === 'pending' && (
        <label className="kyc-document__checkbox">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(document.id)}
          />
          <span className="checkmark" />
        </label>
      )}
      
      <div className="kyc-document__preview" onClick={() => onView(document)}>
        {document.previewUrl ? (
          <img src={document.previewUrl} alt={document.name} />
        ) : (
          <div className="kyc-document__placeholder">
            <span className="kyc-document__icon">{config.icon}</span>
          </div>
        )}
        <div className="kyc-document__overlay">
          <span>👁️ View</span>
        </div>
      </div>
      
      <div className="kyc-document__info">
        <div className="kyc-document__header">
          <span className="kyc-document__type">{config.label}</span>
          <span className={`kyc-document__status status--${document.status}`}>
            {document.status === 'pending' && '⏳'}
            {document.status === 'verified' && '✓'}
            {document.status === 'rejected' && '✕'}
            {document.status === 'expired' && '⚠'}
            {document.status.charAt(0).toUpperCase() + document.status.slice(1)}
          </span>
        </div>
        
        <div className="kyc-document__meta">
          <span className="kyc-document__filename">{document.fileName}</span>
          <span className="kyc-document__size">{document.fileSize}</span>
        </div>
        
        <div className="kyc-document__date">
          Uploaded {new Date(document.uploadedAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
        
        {document.rejectionReason && (
          <div className="kyc-document__rejection">
            <span className="rejection-icon">⚠️</span>
            <span className="rejection-text">{document.rejectionReason}</span>
          </div>
        )}
        
        {reviewMode && document.status === 'pending' && (
          <div className="kyc-document__actions">
            <button
              className="kyc-document__btn kyc-document__btn--verify"
              onClick={(e) => {
                e.stopPropagation();
                onVerify(document.id);
              }}
            >
              ✓ Verify
            </button>
            <button
              className="kyc-document__btn kyc-document__btn--reject"
              onClick={(e) => {
                e.stopPropagation();
                onReject(document.id);
              }}
            >
              ✕ Reject
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const DocumentViewer: React.FC<{
  document: KycDocument | null;
  onClose: () => void;
  onVerify: (docId: string) => void;
  onReject: (docId: string) => void;
  documents: KycDocument[];
  onNavigate: (doc: KycDocument) => void;
}> = ({ document, onClose, onVerify, onReject, documents, onNavigate }) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  if (!document) return null;

  const currentIndex = documents.findIndex((d) => d.id === document.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < documents.length - 1;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowLeft' && hasPrev) onNavigate(documents[currentIndex - 1]);
    if (e.key === 'ArrowRight' && hasNext) onNavigate(documents[currentIndex + 1]);
    if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(z + 0.25, 3));
    if (e.key === '-') setZoom((z) => Math.max(z - 0.25, 0.5));
    if (e.key === 'r') setRotation((r) => (r + 90) % 360);
  }, [onClose, hasPrev, hasNext, onNavigate, documents, currentIndex]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const config = DOCUMENT_TYPE_CONFIG[document.type];

  return (
    <div className="document-viewer__overlay" onClick={onClose}>
      <div className="document-viewer" onClick={(e) => e.stopPropagation()}>
        <div className="document-viewer__header">
          <div className="document-viewer__title">
            <span className="document-viewer__icon">{config.icon}</span>
            <div className="document-viewer__info">
              <h3>{config.label}</h3>
              <span className="document-viewer__filename">{document.fileName}</span>
            </div>
          </div>
          <div className="document-viewer__controls">
            <button
              className="viewer-control"
              onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
              title="Zoom Out"
            >
              ➖
            </button>
            <span className="viewer-zoom">{Math.round(zoom * 100)}%</span>
            <button
              className="viewer-control"
              onClick={() => setZoom((z) => Math.min(z + 0.25, 3))}
              title="Zoom In"
            >
              ➕
            </button>
            <div className="viewer-divider" />
            <button
              className="viewer-control"
              onClick={() => setRotation((r) => (r + 90) % 360)}
              title="Rotate"
            >
              🔄
            </button>
            <button
              className="viewer-control"
              onClick={() => {
                setZoom(1);
                setRotation(0);
              }}
              title="Reset"
            >
              ↩️
            </button>
            <div className="viewer-divider" />
            <button className="viewer-control viewer-close" onClick={onClose} title="Close">
              ✕
            </button>
          </div>
        </div>

        <div className="document-viewer__body">
          {hasPrev && (
            <button
              className="document-viewer__nav document-viewer__nav--prev"
              onClick={() => onNavigate(documents[currentIndex - 1])}
            >
              ‹
            </button>
          )}
          
          <div className="document-viewer__content">
            <div
              className="document-viewer__image-container"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
              }}
            >
              {document.previewUrl ? (
                <img src={document.previewUrl} alt={document.name} />
              ) : (
                <div className="document-viewer__no-preview">
                  <span className="no-preview-icon">{config.icon}</span>
                  <span className="no-preview-text">Preview not available</span>
                  <button className="no-preview-download">📥 Download to View</button>
                </div>
              )}
            </div>
          </div>

          {hasNext && (
            <button
              className="document-viewer__nav document-viewer__nav--next"
              onClick={() => onNavigate(documents[currentIndex + 1])}
            >
              ›
            </button>
          )}
        </div>

        <div className="document-viewer__footer">
          <div className="document-viewer__meta">
            <span>
              Document {currentIndex + 1} of {documents.length}
            </span>
            <span>•</span>
            <span>{document.fileSize}</span>
            <span>•</span>
            <span>
              Uploaded {new Date(document.uploadedAt).toLocaleDateString()}
            </span>
          </div>
          
          {document.status === 'pending' && (
            <div className="document-viewer__actions">
              <button
                className="document-viewer__btn document-viewer__btn--reject"
                onClick={() => onReject(document.id)}
              >
                ✕ Reject Document
              </button>
              <button
                className="document-viewer__btn document-viewer__btn--verify"
                onClick={() => onVerify(document.id)}
              >
                ✓ Verify Document
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const TimelineItem: React.FC<{ item: KycTimeline; isLast: boolean }> = ({ item, isLast }) => {
  const getStatusIcon = () => {
    switch (item.status) {
      case 'success': return '✓';
      case 'warning': return '⚠';
      case 'error': return '✕';
      default: return '•';
    }
  };

  return (
    <div className={`timeline-item timeline-item--${item.status || 'info'}`}>
      <div className="timeline-item__marker">
        <span className="timeline-item__icon">{getStatusIcon()}</span>
        {!isLast && <div className="timeline-item__line" />}
      </div>
      <div className="timeline-item__content">
        <div className="timeline-item__header">
          <span className="timeline-item__action">{item.action}</span>
          <span className="timeline-item__time">
            {new Date(item.timestamp).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
        <p className="timeline-item__description">{item.description}</p>
        {item.actor && (
          <span className="timeline-item__actor">by {item.actor}</span>
        )}
      </div>
    </div>
  );
};

// ============ Main Component ============
const KycReviewPanel: React.FC<KycReviewPanelProps> = ({
  user,
  onClose,
  onApprove,
  onReject,
  onRequestResubmission,
}) => {
  // State
  const [activeTab, setActiveTab] = useState<'documents' | 'timeline' | 'info'>('documents');
  const [reviewMode, setReviewMode] = useState(false);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [viewingDocument, setViewingDocument] = useState<KycDocument | null>(null);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [selectedReasons, setSelectedReasons] = useState<Set<string>>(new Set());
  const [customReason, setCustomReason] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'resubmit' | null>(null);

  // Mock KYC data - Replace with actual API call
  const [kycData, setKycData] = useState<KycData>({
    status: 'pending',
    submittedAt: '2026-02-01T10:30:00Z',
    lastUpdated: '2026-02-08T14:20:00Z',
    priority: 'medium',
    documents: [
      {
        id: 'doc1',
        type: 'id_proof',
        name: 'Aadhaar Card',
        fileName: 'aadhaar_front.jpg',
        fileSize: '1.2 MB',
        uploadedAt: '2026-02-01T10:30:00Z',
        status: 'pending',
        previewUrl: 'https://via.placeholder.com/400x250/f3f4f6/6b7280?text=Aadhaar+Card',
      },
      {
        id: 'doc2',
        type: 'address_proof',
        name: 'Utility Bill',
        fileName: 'electricity_bill.pdf',
        fileSize: '856 KB',
        uploadedAt: '2026-02-01T10:32:00Z',
        status: 'pending',
        previewUrl: 'https://via.placeholder.com/400x250/f3f4f6/6b7280?text=Utility+Bill',
      },
      {
        id: 'doc3',
        type: 'photo',
        name: 'Profile Photo',
        fileName: 'selfie.jpg',
        fileSize: '420 KB',
        uploadedAt: '2026-02-01T10:35:00Z',
        status: 'pending',
        previewUrl: 'https://via.placeholder.com/400x250/f3f4f6/6b7280?text=Profile+Photo',
      },
      ...(user.role === 'driver'
        ? [
            {
              id: 'doc4',
              type: 'license' as const,
              name: 'Driving License',
              fileName: 'dl_front.jpg',
              fileSize: '980 KB',
              uploadedAt: '2026-02-01T10:38:00Z',
              status: 'pending' as const,
              previewUrl: 'https://via.placeholder.com/400x250/f3f4f6/6b7280?text=Driving+License',
            },
          ]
        : []),
      ...(user.role === 'ngo'
        ? [
            {
              id: 'doc5',
              type: 'registration' as const,
              name: 'NGO Registration',
              fileName: 'ngo_certificate.pdf',
              fileSize: '2.1 MB',
              uploadedAt: '2026-02-01T10:40:00Z',
              status: 'pending' as const,
              previewUrl: 'https://via.placeholder.com/400x250/f3f4f6/6b7280?text=NGO+Certificate',
            },
          ]
        : []),
    ],
    timeline: [
      {
        id: 't1',
        action: 'KYC Submitted',
        description: 'User submitted all required documents for verification',
        timestamp: '2026-02-01T10:40:00Z',
        status: 'info',
      },
      {
        id: 't2',
        action: 'Auto-Verification Started',
        description: 'System started automated document verification',
        timestamp: '2026-02-01T10:41:00Z',
        status: 'info',
      },
      {
        id: 't3',
        action: 'Manual Review Required',
        description: 'Documents flagged for manual review',
        timestamp: '2026-02-01T10:42:00Z',
        status: 'warning',
      },
      {
        id: 't4',
        action: 'Assigned for Review',
        description: 'KYC assigned to admin team for manual verification',
        timestamp: '2026-02-02T09:00:00Z',
        actor: 'System',
        status: 'info',
      },
    ],
  });

  // Computed values
  const pendingDocuments = kycData.documents.filter((d) => d.status === 'pending');
  const verifiedDocuments = kycData.documents.filter((d) => d.status === 'verified');
  const requiredDocs = ROLE_REQUIRED_DOCS[user.role] || ['id_proof', 'photo'];
  const completionPercentage = Math.round(
    (verifiedDocuments.length / kycData.documents.length) * 100
  );

  // Handlers
  const handleToggleSelectDoc = (docId: string) => {
    setSelectedDocIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(docId)) {
        newSet.delete(docId);
      } else {
        newSet.add(docId);
      }
      return newSet;
    });
  };

  const handleSelectAllPending = () => {
    if (selectedDocIds.size === pendingDocuments.length) {
      setSelectedDocIds(new Set());
    } else {
      setSelectedDocIds(new Set(pendingDocuments.map((d) => d.id)));
    }
  };

  const handleVerifyDocument = (docId: string) => {
    setKycData((prev) => ({
      ...prev,
      documents: prev.documents.map((d) =>
        d.id === docId ? { ...d, status: 'verified' as const } : d
      ),
      timeline: [
        {
          id: `t${Date.now()}`,
          action: 'Document Verified',
          description: `${DOCUMENT_TYPE_CONFIG[prev.documents.find((d) => d.id === docId)!.type].label} has been verified`,
          timestamp: new Date().toISOString(),
          actor: 'Admin',
          status: 'success',
        },
        ...prev.timeline,
      ],
    }));
    setSelectedDocIds((prev) => {
      const newSet = new Set(prev);
      newSet.delete(docId);
      return newSet;
    });
  };

  const handleRejectDocument = (docId: string) => {
    // For single document rejection, show a mini form
    const reason = prompt('Enter rejection reason:');
    if (reason) {
      setKycData((prev) => ({
        ...prev,
        documents: prev.documents.map((d) =>
          d.id === docId ? { ...d, status: 'rejected' as const, rejectionReason: reason } : d
        ),
        timeline: [
          {
            id: `t${Date.now()}`,
            action: 'Document Rejected',
            description: `${DOCUMENT_TYPE_CONFIG[prev.documents.find((d) => d.id === docId)!.type].label} was rejected: ${reason}`,
            timestamp: new Date().toISOString(),
            actor: 'Admin',
            status: 'error',
          },
          ...prev.timeline,
        ],
      }));
    }
  };

  const handleToggleReason = (reasonId: string) => {
    setSelectedReasons((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(reasonId)) {
        newSet.delete(reasonId);
      } else {
        newSet.add(reasonId);
      }
      return newSet;
    });
  };

  const getRejectionMessage = () => {
    const reasons = Array.from(selectedReasons)
      .map((id) => REJECTION_REASONS.find((r) => r.id === id)?.label)
      .filter(Boolean);
    
    if (selectedReasons.has('other') && customReason.trim()) {
      reasons.push(customReason.trim());
    }
    
    return reasons.join('; ');
  };

  const handleApprove = async () => {
    setIsLoading(true);
    setActionType('approve');
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));
      onApprove(notes);
    } finally {
      setIsLoading(false);
      setActionType(null);
    }
  };

  const handleReject = async () => {
    if (selectedReasons.size === 0) return;
    
    setIsLoading(true);
    setActionType('reject');
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      onReject(getRejectionMessage(), notes);
    } finally {
      setIsLoading(false);
      setActionType(null);
    }
  };

  const handleRequestResubmission = async () => {
    if (selectedDocIds.size === 0 || selectedReasons.size === 0) return;
    
    setIsLoading(true);
    setActionType('resubmit');
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      onRequestResubmission?.(Array.from(selectedDocIds), getRejectionMessage());
    } finally {
      setIsLoading(false);
      setActionType(null);
    }
  };

  const canApprove = pendingDocuments.length === 0 && verifiedDocuments.length > 0;
  const allDocsVerified = verifiedDocuments.length === kycData.documents.length;

  // Keyboard handler for escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !viewingDocument) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, viewingDocument]);

  return (
    <div className="kyc-panel__overlay" onClick={onClose}>
      <div className="kyc-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="kyc-panel__header">
          <div className="kyc-panel__header-left">
            <div className="kyc-panel__avatar">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} />
              ) : (
                <span>{user.name.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="kyc-panel__user-info">
              <h2 className="kyc-panel__title">KYC Review</h2>
              <div className="kyc-panel__user-meta">
                <span className="kyc-panel__user-name">{user.name}</span>
                <span className="kyc-panel__divider">•</span>
                <span className="kyc-panel__user-role">{user.role}</span>
                {kycData.priority && (
                  <>
                    <span className="kyc-panel__divider">•</span>
                    <span className={`kyc-panel__priority priority--${kycData.priority}`}>
                      {kycData.priority.toUpperCase()} PRIORITY
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button className="kyc-panel__close" onClick={onClose}>
            <span>✕</span>
          </button>
        </div>

        {/* Status Bar */}
        <div className="kyc-panel__status-bar">
          <div className="kyc-status">
            <div className="kyc-status__header">
              <span className={`kyc-status__badge status--${kycData.status}`}>
                {kycData.status === 'pending' && '⏳ Pending Review'}
                {kycData.status === 'under_review' && '🔍 Under Review'}
                {kycData.status === 'approved' && '✓ Approved'}
                {kycData.status === 'rejected' && '✕ Rejected'}
                {kycData.status === 'resubmission_required' && '🔄 Resubmission Required'}
              </span>
              <span className="kyc-status__date">
                Submitted {new Date(kycData.submittedAt).toLocaleDateString()}
              </span>
            </div>
            <div className="kyc-status__progress">
              <div className="progress-bar">
                <div
                  className="progress-bar__fill"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
              <span className="progress-text">
                {verifiedDocuments.length}/{kycData.documents.length} documents verified
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="kyc-panel__tabs">
          <button
            className={`kyc-panel__tab ${activeTab === 'documents' ? 'active' : ''}`}
            onClick={() => setActiveTab('documents')}
          >
            <span className="tab-icon">📄</span>
            Documents
            {pendingDocuments.length > 0 && (
              <span className="tab-badge">{pendingDocuments.length}</span>
            )}
          </button>
          <button
            className={`kyc-panel__tab ${activeTab === 'timeline' ? 'active' : ''}`}
            onClick={() => setActiveTab('timeline')}
          >
            <span className="tab-icon">📜</span>
            Timeline
          </button>
          <button
            className={`kyc-panel__tab ${activeTab === 'info' ? 'active' : ''}`}
            onClick={() => setActiveTab('info')}
          >
            <span className="tab-icon">ℹ️</span>
            User Info
          </button>
        </div>

        {/* Content */}
        <div className="kyc-panel__content">
          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div className="kyc-documents">
              {/* Toolbar */}
              <div className="kyc-documents__toolbar">
                <div className="toolbar-left">
                  <span className="toolbar-label">
                    {pendingDocuments.length} pending • {verifiedDocuments.length} verified
                  </span>
                </div>
                <div className="toolbar-right">
                  {pendingDocuments.length > 0 && (
                    <>
                      <button
                        className={`toolbar-btn ${reviewMode ? 'active' : ''}`}
                        onClick={() => {
                          setReviewMode(!reviewMode);
                          setSelectedDocIds(new Set());
                        }}
                      >
                        {reviewMode ? '✕ Exit Review Mode' : '✓ Review Mode'}
                      </button>
                      {reviewMode && (
                        <button
                          className="toolbar-btn"
                          onClick={handleSelectAllPending}
                        >
                          {selectedDocIds.size === pendingDocuments.length
                            ? 'Deselect All'
                            : 'Select All Pending'}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Required Documents Info */}
              <div className="kyc-documents__required">
                <span className="required-label">Required Documents:</span>
                <div className="required-list">
                  {requiredDocs.map((docType) => {
                    const doc = kycData.documents.find((d) => d.type === docType);
                    const config = DOCUMENT_TYPE_CONFIG[docType];
                    return (
                      <span
                        key={docType}
                        className={`required-item ${doc ? `status--${doc.status}` : 'status--missing'}`}
                      >
                        <span className="required-icon">{config.icon}</span>
                        {config.label}
                        {doc?.status === 'verified' && <span className="check">✓</span>}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Documents Grid */}
              <div className="kyc-documents__grid">
                {kycData.documents.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    document={doc}
                    onView={setViewingDocument}
                    onVerify={handleVerifyDocument}
                    onReject={handleRejectDocument}
                    isSelected={selectedDocIds.has(doc.id)}
                    onToggleSelect={handleToggleSelectDoc}
                    reviewMode={reviewMode}
                  />
                ))}
              </div>

              {/* Bulk Actions */}
              {reviewMode && selectedDocIds.size > 0 && (
                <div className="kyc-documents__bulk-actions">
                  <span className="bulk-count">
                    {selectedDocIds.size} document{selectedDocIds.size > 1 ? 's' : ''} selected
                  </span>
                  <div className="bulk-buttons">
                    <button
                      className="bulk-btn bulk-btn--verify"
                      onClick={() => {
                        selectedDocIds.forEach((id) => handleVerifyDocument(id));
                      }}
                    >
                      ✓ Verify Selected
                    </button>
                    <button
                      className="bulk-btn bulk-btn--resubmit"
                      onClick={() => setShowRejectForm(true)}
                    >
                      🔄 Request Resubmission
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Timeline Tab */}
          {activeTab === 'timeline' && (
            <div className="kyc-timeline">
              <div className="kyc-timeline__list">
                {kycData.timeline.map((item, index) => (
                  <TimelineItem
                    key={item.id}
                    item={item}
                    isLast={index === kycData.timeline.length - 1}
                  />
                ))}
              </div>
            </div>
          )}

          {/* User Info Tab */}
          {activeTab === 'info' && (
            <div className="kyc-user-info">
              <div className="info-grid">
                <div className="info-item">
                  <label>Full Name</label>
                  <span>{user.name}</span>
                </div>
                <div className="info-item">
                  <label>Email</label>
                  <span>{user.email}</span>
                </div>
                <div className="info-item">
                  <label>Phone</label>
                  <span>{user.phone || 'Not provided'}</span>
                </div>
                <div className="info-item">
                  <label>Role</label>
                  <span className="role-badge">{user.role}</span>
                </div>
                <div className="info-item">
                  <label>Joined</label>
                  <span>
                    {user.joinedAt
                      ? new Date(user.joinedAt).toLocaleDateString()
                      : 'Not available'}
                  </span>
                </div>
                <div className="info-item full-width">
                  <label>Address</label>
                  <span>{user.address || 'Not provided'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Notes Section */}
        <div className="kyc-panel__notes">
          <label className="notes-label">
            <span className="notes-icon">📝</span>
            Review Notes (Optional)
          </label>
          <textarea
            className="notes-input"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any notes about this KYC review..."
            rows={3}
          />
        </div>

        {/* Footer */}
        <div className="kyc-panel__footer">
          <button className="kyc-btn kyc-btn--secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </button>
          
          <div className="footer-actions">
            {!showRejectForm && !showApproveConfirm ? (
              <>
                <button
                  className="kyc-btn kyc-btn--danger"
                  onClick={() => setShowRejectForm(true)}
                  disabled={isLoading}
                >
                  <span className="btn-icon">✕</span>
                  Reject KYC
                </button>
                <button
                  className="kyc-btn kyc-btn--primary"
                  onClick={() => {
                    if (allDocsVerified) {
                      setShowApproveConfirm(true);
                    } else {
                      // Verify all pending and then show confirm
                      setShowApproveConfirm(true);
                    }
                  }}
                  disabled={isLoading || pendingDocuments.length === kycData.documents.length}
                >
                  <span className="btn-icon">✓</span>
                  {allDocsVerified ? 'Approve KYC' : 'Verify All & Approve'}
                </button>
              </>
            ) : showRejectForm ? (
              <button
                className="kyc-btn kyc-btn--secondary"
                onClick={() => {
                  setShowRejectForm(false);
                  setSelectedReasons(new Set());
                  setCustomReason('');
                }}
              >
                ← Back
              </button>
            ) : (
              <button
                className="kyc-btn kyc-btn--secondary"
                onClick={() => setShowApproveConfirm(false)}
              >
                ← Back
              </button>
            )}
          </div>
        </div>

        {/* Rejection Form Overlay */}
        {showRejectForm && (
          <div className="kyc-rejection-form">
            <div className="rejection-form__header">
              <h3>
                <span className="rejection-icon">⚠️</span>
                Reject KYC Application
              </h3>
              <p>Select the reason(s) for rejection:</p>
            </div>

            <div className="rejection-form__reasons">
              {REJECTION_REASONS.map((reason) => (
                <label
                  key={reason.id}
                  className={`rejection-reason ${selectedReasons.has(reason.id) ? 'selected' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedReasons.has(reason.id)}
                    onChange={() => handleToggleReason(reason.id)}
                  />
                  <span className="reason-checkbox">
                    {selectedReasons.has(reason.id) ? '✓' : ''}
                  </span>
                  <span className="reason-label">{reason.label}</span>
                </label>
              ))}
            </div>

            {selectedReasons.has('other') && (
              <div className="rejection-form__custom">
                <textarea
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Please specify the reason..."
                  rows={3}
                />
              </div>
            )}

            <div className="rejection-form__actions">
              <button
                className="kyc-btn kyc-btn--secondary"
                onClick={() => {
                  setShowRejectForm(false);
                  setSelectedReasons(new Set());
                  setCustomReason('');
                }}
                disabled={isLoading}
              >
                Cancel
              </button>
              {onRequestResubmission && selectedDocIds.size > 0 && (
                <button
                  className="kyc-btn kyc-btn--warning"
                  onClick={handleRequestResubmission}
                  disabled={isLoading || selectedReasons.size === 0}
                >
                  {isLoading && actionType === 'resubmit' ? (
                    <span className="btn-spinner" />
                  ) : (
                    <>
                      <span className="btn-icon">🔄</span>
                      Request Resubmission
                    </>
                  )}
                </button>
              )}
              <button
                className="kyc-btn kyc-btn--danger"
                onClick={handleReject}
                disabled={
                  isLoading ||
                  selectedReasons.size === 0 ||
                  (selectedReasons.has('other') && !customReason.trim())
                }
              >
                {isLoading && actionType === 'reject' ? (
                  <span className="btn-spinner" />
                ) : (
                  <>
                    <span className="btn-icon">✕</span>
                    Confirm Rejection
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Approve Confirmation Overlay */}
        {showApproveConfirm && (
          <div className="kyc-approve-confirm">
            <div className="approve-confirm__content">
              <div className="approve-confirm__icon">✓</div>
              <h3>Approve KYC Application</h3>
              <p>
                You are about to approve the KYC application for <strong>{user.name}</strong>.
                {!allDocsVerified && (
                  <span className="approve-warning">
                    <br />
                    Note: {pendingDocuments.length} document(s) will be automatically verified.
                  </span>
                )}
              </p>

              <div className="approve-confirm__summary">
                <div className="summary-item">
                  <span className="summary-label">User</span>
                  <span className="summary-value">{user.name}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Role</span>
                  <span className="summary-value">{user.role}</span>
                </div>
                <div className="summary-item">
                  <span className="summary-label">Documents</span>
                  <span className="summary-value">{kycData.documents.length} total</span>
                </div>
              </div>

              <div className="approve-confirm__actions">
                <button
                  className="kyc-btn kyc-btn--secondary"
                  onClick={() => setShowApproveConfirm(false)}
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  className="kyc-btn kyc-btn--primary"
                  onClick={handleApprove}
                  disabled={isLoading}
                >
                  {isLoading && actionType === 'approve' ? (
                    <span className="btn-spinner" />
                  ) : (
                    <>
                      <span className="btn-icon">✓</span>
                      Confirm Approval
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Document Viewer */}
        {viewingDocument && (
          <DocumentViewer
            document={viewingDocument}
            onClose={() => setViewingDocument(null)}
            onVerify={(docId) => {
              handleVerifyDocument(docId);
              // Navigate to next pending or close
              const nextPending = kycData.documents.find(
                (d) => d.id !== docId && d.status === 'pending'
              );
              if (nextPending) {
                setViewingDocument(nextPending);
              } else {
                setViewingDocument(null);
              }
            }}
            onReject={handleRejectDocument}
            documents={kycData.documents}
            onNavigate={setViewingDocument}
          />
        )}
      </div>
    </div>
  );
};

export default KycReviewPanel;