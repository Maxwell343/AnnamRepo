import React, { useState, useCallback, useEffect } from 'react';
import {
  CreditCard, Home, Car, ClipboardList, Camera, Building,
  Eye, Clock, Check, X, AlertTriangle,
  ZoomIn, ZoomOut, RotateCw, Undo2, Download,
  Search, RefreshCw, FileText, ScrollText, Info,
  Pencil, ArrowLeft,
} from 'lucide-react';
import { API_BASE_URL } from '../../../config/api';
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

const DOCUMENT_TYPE_CONFIG: Record<KycDocument['type'], { icon: React.ReactNode; label: string }> = {
  id_proof: { icon: <CreditCard size={16} />, label: 'ID Proof' },
  address_proof: { icon: <Home size={16} />, label: 'Address Proof' },
  license: { icon: <Car size={16} />, label: 'Driving License' },
  registration: { icon: <ClipboardList size={16} />, label: 'Registration Certificate' },
  photo: { icon: <Camera size={16} />, label: 'Photo' },
  bank_statement: { icon: <Building size={16} />, label: 'Bank Statement' },
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
          <span><Eye size={16} /> View</span>
        </div>
      </div>
      
      <div className="kyc-document__info">
        <div className="kyc-document__header">
          <span className="kyc-document__type">{config.label}</span>
          <span className={`kyc-document__status status--${document.status}`}>
            {document.status === 'pending' && <Clock size={14} />}
            {document.status === 'verified' && <Check size={14} />}
            {document.status === 'rejected' && <X size={14} />}
            {document.status === 'expired' && <AlertTriangle size={14} />}
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
            <span className="rejection-icon"><AlertTriangle size={14} /></span>
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
              <Check size={14} /> Verify
            </button>
            <button
              className="kyc-document__btn kyc-document__btn--reject"
              onClick={(e) => {
                e.stopPropagation();
                onReject(document.id);
              }}
            >
              <X size={14} /> Reject
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
              <ZoomOut size={16} />
            </button>
            <span className="viewer-zoom">{Math.round(zoom * 100)}%</span>
            <button
              className="viewer-control"
              onClick={() => setZoom((z) => Math.min(z + 0.25, 3))}
              title="Zoom In"
            >
              <ZoomIn size={16} />
            </button>
            <div className="viewer-divider" />
            <button
              className="viewer-control"
              onClick={() => setRotation((r) => (r + 90) % 360)}
              title="Rotate"
            >
              <RotateCw size={16} />
            </button>
            <button
              className="viewer-control"
              onClick={() => {
                setZoom(1);
                setRotation(0);
              }}
              title="Reset"
            >
              <Undo2 size={16} />
            </button>
            <div className="viewer-divider" />
            <button className="viewer-control viewer-close" onClick={onClose} title="Close">
              <X size={16} />
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
                  <button className="no-preview-download"><Download size={16} /> Download to View</button>
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
                <X size={14} /> Reject Document
              </button>
              <button
                className="document-viewer__btn document-viewer__btn--verify"
                onClick={() => onVerify(document.id)}
              >
                <Check size={14} /> Verify Document
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
      case 'success': return <Check size={14} />;
      case 'warning': return <AlertTriangle size={14} />;
      case 'error': return <X size={14} />;
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

  // KYC data state - fetched from API
  const [kycData, setKycData] = useState<KycData>({
    status: 'pending',
    submittedAt: '',
    lastUpdated: '',
    documents: [],
    timeline: [],
  });

  // Fetch KYC data from API
  useEffect(() => {
    const loadKycData = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/admin/users/${user.id}/kyc`);
        if (response.ok) {
          const data = await response.json();
          setKycData(data);
        }
      } catch (error) {
        console.error('Failed to load KYC data:', error);
      }
    };
    loadKycData();
  }, [user.id]);

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
      const response = await fetch(`${API_BASE_URL}/api/admin/users/${user.id}/kyc/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      if (!response.ok) throw new Error('Failed to approve KYC');
      onApprove(notes);
    } catch (error) {
      console.error('Failed to approve KYC:', error);
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
      const response = await fetch(`${API_BASE_URL}/api/admin/users/${user.id}/kyc/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: getRejectionMessage(), notes }),
      });
      if (!response.ok) throw new Error('Failed to reject KYC');
      onReject(getRejectionMessage(), notes);
    } catch (error) {
      console.error('Failed to reject KYC:', error);
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
      const response = await fetch(`${API_BASE_URL}/api/admin/users/${user.id}/kyc/resubmit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentIds: Array.from(selectedDocIds), reason: getRejectionMessage() }),
      });
      if (!response.ok) throw new Error('Failed to request resubmission');
      onRequestResubmission?.(Array.from(selectedDocIds), getRejectionMessage());
    } catch (error) {
      console.error('Failed to request resubmission:', error);
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
            <span><X size={16} /></span>
          </button>
        </div>

        {/* Status Bar */}
        <div className="kyc-panel__status-bar">
          <div className="kyc-status">
            <div className="kyc-status__header">
              <span className={`kyc-status__badge status--${kycData.status}`}>
                {kycData.status === 'pending' && <><Clock size={14} /> Pending Review</>}
                {kycData.status === 'under_review' && <><Search size={14} /> Under Review</>}
                {kycData.status === 'approved' && <><Check size={14} /> Approved</>}
                {kycData.status === 'rejected' && <><X size={14} /> Rejected</>}
                {kycData.status === 'resubmission_required' && <><RefreshCw size={14} /> Resubmission Required</>}
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
            <span className="tab-icon"><FileText size={16} /></span>
            Documents
            {pendingDocuments.length > 0 && (
              <span className="tab-badge">{pendingDocuments.length}</span>
            )}
          </button>
          <button
            className={`kyc-panel__tab ${activeTab === 'timeline' ? 'active' : ''}`}
            onClick={() => setActiveTab('timeline')}
          >
            <span className="tab-icon"><ScrollText size={16} /></span>
            Timeline
          </button>
          <button
            className={`kyc-panel__tab ${activeTab === 'info' ? 'active' : ''}`}
            onClick={() => setActiveTab('info')}
          >
            <span className="tab-icon"><Info size={16} /></span>
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
                        {reviewMode ? <><X size={14} /> Exit Review Mode</> : <><Check size={14} /> Review Mode</>}
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
                        {doc?.status === 'verified' && <span className="check"><Check size={12} /></span>}
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
                      <Check size={14} /> Verify Selected
                    </button>
                    <button
                      className="bulk-btn bulk-btn--resubmit"
                      onClick={() => setShowRejectForm(true)}
                    >
                      <RefreshCw size={14} /> Request Resubmission
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
            <span className="notes-icon"><Pencil size={16} /></span>
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
                  <span className="btn-icon"><X size={14} /></span>
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
                  <span className="btn-icon"><Check size={14} /></span>
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
                <ArrowLeft size={14} /> Back
              </button>
            ) : (
              <button
                className="kyc-btn kyc-btn--secondary"
                onClick={() => setShowApproveConfirm(false)}
              >
                <ArrowLeft size={14} /> Back
              </button>
            )}
          </div>
        </div>

        {/* Rejection Form Overlay */}
        {showRejectForm && (
          <div className="kyc-rejection-form">
            <div className="rejection-form__header">
              <h3>
                <span className="rejection-icon"><AlertTriangle size={18} /></span>
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
                    {selectedReasons.has(reason.id) ? <Check size={12} /> : ''}
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
                      <span className="btn-icon"><RefreshCw size={14} /></span>
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
                    <span className="btn-icon"><X size={14} /></span>
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
              <div className="approve-confirm__icon"><Check size={24} /></div>
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
                      <span className="btn-icon"><Check size={14} /></span>
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