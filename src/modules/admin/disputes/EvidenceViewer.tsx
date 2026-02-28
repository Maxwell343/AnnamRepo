import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Camera, Video, FileText, Paperclip, Receipt, Check, X, AlertTriangle, Info,
  Search, Download, LayoutGrid, List, Inbox, RotateCcw, RotateCw, RefreshCw,
  Pin, MessageSquare, Columns2, Pause, Play, Minimize2, Maximize2, FolderOpen,
  Lock, CheckCircle, Pencil, Save, ClipboardList
} from 'lucide-react';
import './EvidenceViewer.css';

interface EvidenceItem {
  id: string;
  type: 'photo' | 'document' | 'receipt' | 'video';
  icon: React.ReactNode;
  fileName: string;
  uploadedBy: string;
  uploadedAt: string;
  uploadedDate: Date;
  fileSize: string;
  verified: boolean;
  verifiedBy?: string;
  tags: string[];
  notes: Note[];
  previewUrl?: string;
  description?: string;
}

interface Note {
  id: string;
  text: string;
  author: string;
  createdAt: string;
}

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface Annotation {
  id: string;
  x: number;
  y: number;
  text: string;
  author: string;
}

const mockEvidence: EvidenceItem[] = [
  { 
    id: '1', 
    type: 'photo', 
    icon: <Camera size={16} />, 
    fileName: 'rotten_tomatoes_1.jpg', 
    uploadedBy: 'Ravi Sharma', 
    uploadedAt: '2 hrs ago',
    uploadedDate: new Date(Date.now() - 2 * 60 * 60 * 1000),
    fileSize: '2.4 MB', 
    verified: true,
    verifiedBy: 'Admin User',
    tags: ['produce', 'quality-issue', 'tomatoes'],
    notes: [{ id: 'n1', text: 'Clear evidence of spoilage', author: 'Admin', createdAt: '1 hr ago' }],
    description: 'Photo showing rotten tomatoes received in order'
  },
  { 
    id: '2', 
    type: 'photo', 
    icon: <Camera size={16} />, 
    fileName: 'wilted_spinach.jpg', 
    uploadedBy: 'Ravi Sharma', 
    uploadedAt: '2 hrs ago',
    uploadedDate: new Date(Date.now() - 2 * 60 * 60 * 1000),
    fileSize: '1.8 MB', 
    verified: true,
    verifiedBy: 'Admin User',
    tags: ['produce', 'quality-issue', 'spinach'],
    notes: [],
    description: 'Wilted spinach leaves'
  },
  { 
    id: '3', 
    type: 'receipt', 
    icon: <Receipt size={16} />, 
    fileName: 'order_receipt_2389.pdf', 
    uploadedBy: 'System', 
    uploadedAt: '2 hrs ago',
    uploadedDate: new Date(Date.now() - 2 * 60 * 60 * 1000),
    fileSize: '145 KB', 
    verified: true,
    verifiedBy: 'System',
    tags: ['receipt', 'auto-generated'],
    notes: [],
    description: 'Original order receipt'
  },
  { 
    id: '4', 
    type: 'photo', 
    icon: <Camera size={16} />, 
    fileName: 'dispatch_photo.jpg', 
    uploadedBy: 'Green Valley Farm', 
    uploadedAt: '45 min ago',
    uploadedDate: new Date(Date.now() - 45 * 60 * 1000),
    fileSize: '3.1 MB', 
    verified: false,
    tags: ['dispatch', 'supplier-evidence'],
    notes: [],
    description: 'Photo of produce at dispatch time'
  },
  { 
    id: '5', 
    type: 'document', 
    icon: <FileText size={16} />, 
    fileName: 'quality_cert.pdf', 
    uploadedBy: 'Green Valley Farm', 
    uploadedAt: '40 min ago',
    uploadedDate: new Date(Date.now() - 40 * 60 * 1000),
    fileSize: '520 KB', 
    verified: false,
    tags: ['certificate', 'supplier-evidence'],
    notes: [],
    description: 'Quality certification document'
  },
  { 
    id: '6', 
    type: 'video', 
    icon: <Video size={16} />, 
    fileName: 'unboxing_video.mp4', 
    uploadedBy: 'Ravi Sharma', 
    uploadedAt: '1 hr ago',
    uploadedDate: new Date(Date.now() - 60 * 60 * 1000),
    fileSize: '15.2 MB', 
    verified: false,
    tags: ['video', 'unboxing'],
    notes: [],
    description: 'Video of unboxing the delivery'
  },
];

const EvidenceViewer: React.FC = () => {
  const [evidence, setEvidence] = useState<EvidenceItem[]>(mockEvidence);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [compareIdx, setCompareIdx] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [annotations, setAnnotations] = useState<Record<string, Annotation[]>>({});
  const [isAddingAnnotation, setIsAddingAnnotation] = useState(false);
  const [newAnnotationText, setNewAnnotationText] = useState('');
  const [pendingAnnotation, setPendingAnnotation] = useState<{x: number; y: number} | null>(null);
  const [noteText, setNoteText] = useState('');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid');
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState({ x: 0, y: 0 });
  const [startDragPosition, setStartDragPosition] = useState({ x: 0, y: 0 });
  const [isPlaying, setIsPlaying] = useState(false);
  const [slideInterval, setSlideInterval] = useState<ReturnType<typeof setInterval> | null>(null);

  const viewerRef = useRef<HTMLDivElement>(null);
  const displayRef = useRef<HTMLDivElement>(null);

  const filteredEvidence = evidence.filter(item => {
    const matchesType = filterType === 'all' || item.type === filterType;
    const matchesSearch = item.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          item.uploadedBy.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const selected = filteredEvidence[selectedIdx] || filteredEvidence[0];

  const showToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const goPrev = useCallback(() => {
    setSelectedIdx(i => (i > 0 ? i - 1 : filteredEvidence.length - 1));
    resetView();
  }, [filteredEvidence.length]);

  const goNext = useCallback(() => {
    setSelectedIdx(i => (i < filteredEvidence.length - 1 ? i + 1 : 0));
    resetView();
  }, [filteredEvidence.length]);

  const resetView = () => {
    setZoom(1);
    setRotation(0);
    setDragPosition({ x: 0, y: 0 });
  };

  const handleZoomIn = () => setZoom(z => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.25, 0.5));
  const handleRotateLeft = () => setRotation(r => r - 90);
  const handleRotateRight = () => setRotation(r => r + 90);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      viewerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleDisplayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isAddingAnnotation && displayRef.current) {
      const rect = displayRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setPendingAnnotation({ x, y });
    }
  };

  const saveAnnotation = () => {
    if (pendingAnnotation && newAnnotationText.trim() && selected) {
      const newAnnotation: Annotation = {
        id: Date.now().toString(),
        x: pendingAnnotation.x,
        y: pendingAnnotation.y,
        text: newAnnotationText,
        author: 'Admin User'
      };
      setAnnotations(prev => ({
        ...prev,
        [selected.id]: [...(prev[selected.id] || []), newAnnotation]
      }));
      setPendingAnnotation(null);
      setNewAnnotationText('');
      setIsAddingAnnotation(false);
      showToast('Annotation added successfully', 'success');
    }
  };

  const deleteAnnotation = (annotationId: string) => {
    if (selected) {
      setAnnotations(prev => ({
        ...prev,
        [selected.id]: prev[selected.id]?.filter(a => a.id !== annotationId) || []
      }));
      showToast('Annotation deleted', 'info');
    }
  };

  const handleSaveNote = () => {
    if (noteText.trim() && selected) {
      const newNote: Note = {
        id: Date.now().toString(),
        text: noteText,
        author: 'Admin User',
        createdAt: 'Just now'
      };
      setEvidence(prev => prev.map(item => 
        item.id === selected.id 
          ? { ...item, notes: [...item.notes, newNote] }
          : item
      ));
      setNoteText('');
      showToast('Note saved successfully', 'success');
    }
  };

  const handleVerify = (verify: boolean) => {
    if (selected) {
      setEvidence(prev => prev.map(item =>
        item.id === selected.id
          ? { ...item, verified: verify, verifiedBy: verify ? 'Admin User' : undefined }
          : item
      ));
      showToast(verify ? 'Evidence verified' : 'Verification removed', verify ? 'success' : 'warning');
    }
  };

  const handleDownload = () => {
    showToast(`Downloading ${selected.fileName}...`, 'info');
  };

  const handleDownloadAll = () => {
    showToast(`Downloading ${filteredEvidence.length} files...`, 'info');
  };

  const toggleSlideshow = () => {
    if (isPlaying) {
      if (slideInterval) clearInterval(slideInterval);
      setSlideInterval(null);
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      const interval = setInterval(goNext, 3000);
      setSlideInterval(interval);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setStartDragPosition({ x: e.clientX - dragPosition.x, y: e.clientY - dragPosition.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setDragPosition({
        x: e.clientX - startDragPosition.x,
        y: e.clientY - startDragPosition.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      switch(e.key) {
        case 'ArrowLeft': goPrev(); break;
        case 'ArrowRight': goNext(); break;
        case 'ArrowUp': handleZoomIn(); break;
        case 'ArrowDown': handleZoomOut(); break;
        case 'r': handleRotateRight(); break;
        case 'f': toggleFullscreen(); break;
        case 'Escape': 
          setIsLightboxOpen(false);
          setIsAddingAnnotation(false);
          setPendingAnnotation(null);
          break;
        case ' ': 
          e.preventDefault();
          toggleSlideshow(); 
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goPrev, goNext]);

  useEffect(() => {
    return () => {
      if (slideInterval) clearInterval(slideInterval);
    };
  }, [slideInterval]);

  const getTypeIcon = (type: string): React.ReactNode => {
    switch(type) {
      case 'photo': return <Camera size={16} />;
      case 'document': return <FileText size={16} />;
      case 'receipt': return <Receipt size={16} />;
      case 'video': return <Video size={16} />;
      default: return <Paperclip size={16} />;
    }
  };

  const currentAnnotations = selected ? (annotations[selected.id] || []) : [];

  return (
    <div className={`evidence-viewer ${isFullscreen ? 'evidence-viewer--fullscreen' : ''}`} ref={viewerRef}>
      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast toast--${toast.type}`}>
            <span className="toast__icon">
              {toast.type === 'success' && <Check size={14} />}
              {toast.type === 'error' && <X size={14} />}
              {toast.type === 'warning' && <AlertTriangle size={14} />}
              {toast.type === 'info' && <Info size={14} />}
            </span>
            {toast.message}
          </div>
        ))}
      </div>

      {/* Header */}
      <header className="evidence-viewer__header">
        <div className="evidence-viewer__header-left">
          <h1>Evidence Viewer</h1>
          <span className="evidence-viewer__dispute-ref">DSP-401 • ORD-2389</span>
          <span className="evidence-viewer__count">{filteredEvidence.length} items</span>
        </div>
        <div className="evidence-viewer__header-right">
          <div className="evidence-viewer__search">
            <span className="evidence-viewer__search-icon"><Search size={16} /></span>
            <input
              type="text"
              placeholder="Search evidence..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="evidence-viewer__search-input"
            />
            {searchQuery && (
              <button 
                className="evidence-viewer__search-clear"
                onClick={() => setSearchQuery('')}
              >
                ×
              </button>
            )}
          </div>
          <button className="admin-btn admin-btn--secondary" onClick={handleDownloadAll}>
            <Download size={16} /> Download All
          </button>
        </div>
      </header>

      {/* Filter Bar */}
      <div className="evidence-viewer__filters">
        <div className="evidence-viewer__filter-tabs">
          {['all', 'photo', 'document', 'receipt', 'video'].map(type => (
            <button
              key={type}
              className={`evidence-viewer__filter-tab ${filterType === type ? 'evidence-viewer__filter-tab--active' : ''}`}
              onClick={() => { setFilterType(type); setSelectedIdx(0); }}
            >
              {type !== 'all' && <span className="evidence-viewer__filter-icon">{getTypeIcon(type)}</span>}
              {type.charAt(0).toUpperCase() + type.slice(1)}
              <span className="evidence-viewer__filter-count">
                {type === 'all' ? evidence.length : evidence.filter(e => e.type === type).length}
              </span>
            </button>
          ))}
        </div>
        <div className="evidence-viewer__view-toggle">
          <button
            className={`evidence-viewer__view-btn ${viewMode === 'grid' ? 'evidence-viewer__view-btn--active' : ''}`}
            onClick={() => setViewMode('grid')}
            title="Grid view"
          >
            <LayoutGrid size={16} />
          </button>
          <button
            className={`evidence-viewer__view-btn ${viewMode === 'timeline' ? 'evidence-viewer__view-btn--active' : ''}`}
            onClick={() => setViewMode('timeline')}
            title="Timeline view"
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {filteredEvidence.length === 0 ? (
        <div className="evidence-viewer__empty">
          <div className="evidence-viewer__empty-icon"><Inbox size={48} /></div>
          <h3>No evidence found</h3>
          <p>Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="evidence-viewer__grid">
          {/* Main Display */}
          <div className="evidence-viewer__main">
            {/* Toolbar */}
            <div className="evidence-viewer__toolbar">
              <div className="evidence-viewer__toolbar-group">
                <button className="evidence-viewer__tool-btn" onClick={handleZoomOut} title="Zoom out (↓)">
                  <span>−</span>
                </button>
                <span className="evidence-viewer__zoom-level">{Math.round(zoom * 100)}%</span>
                <button className="evidence-viewer__tool-btn" onClick={handleZoomIn} title="Zoom in (↑)">
                  <span>+</span>
                </button>
                <div className="evidence-viewer__toolbar-divider" />
                <button className="evidence-viewer__tool-btn" onClick={handleRotateLeft} title="Rotate left">
                  <RotateCcw size={16} />
                </button>
                <button className="evidence-viewer__tool-btn" onClick={handleRotateRight} title="Rotate right (R)">
                  <RotateCw size={16} />
                </button>
                <div className="evidence-viewer__toolbar-divider" />
                <button className="evidence-viewer__tool-btn" onClick={() => resetView()} title="Reset view">
                  <RefreshCw size={16} />
                </button>
              </div>
              <div className="evidence-viewer__toolbar-group">
                <button 
                  className={`evidence-viewer__tool-btn ${isAddingAnnotation ? 'evidence-viewer__tool-btn--active' : ''}`}
                  onClick={() => setIsAddingAnnotation(!isAddingAnnotation)}
                  title="Add annotation"
                >
                  <Pin size={16} />
                </button>
                <button 
                  className={`evidence-viewer__tool-btn ${showAnnotations ? 'evidence-viewer__tool-btn--active' : ''}`}
                  onClick={() => setShowAnnotations(!showAnnotations)}
                  title="Toggle annotations"
                >
                  <MessageSquare size={16} />
                </button>
                <div className="evidence-viewer__toolbar-divider" />
                <button 
                  className={`evidence-viewer__tool-btn ${isCompareMode ? 'evidence-viewer__tool-btn--active' : ''}`}
                  onClick={() => { setIsCompareMode(!isCompareMode); setCompareIdx(null); }}
                  title="Compare mode"
                >
                  <Columns2 size={16} />
                </button>
                <div className="evidence-viewer__toolbar-divider" />
                <button 
                  className={`evidence-viewer__tool-btn ${isPlaying ? 'evidence-viewer__tool-btn--active' : ''}`}
                  onClick={toggleSlideshow}
                  title="Slideshow (Space)"
                >
                  {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <button className="evidence-viewer__tool-btn" onClick={toggleFullscreen} title="Fullscreen (F)">
                  {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
              </div>
            </div>

            {/* Display Area */}
            <div 
              className={`evidence-viewer__display ${isCompareMode ? 'evidence-viewer__display--compare' : ''}`}
            >
              {!isCompareMode && (
                <button className="evidence-viewer__nav evidence-viewer__nav--prev" onClick={goPrev}>
                  ‹
                </button>
              )}
              
              <div 
                ref={displayRef}
                className={`evidence-viewer__placeholder ${isAddingAnnotation ? 'evidence-viewer__placeholder--annotating' : ''}`}
                onClick={handleDisplayClick}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onDoubleClick={() => setIsLightboxOpen(true)}
                style={{
                  cursor: isAddingAnnotation ? 'crosshair' : zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in'
                }}
              >
                <div 
                  className="evidence-viewer__placeholder-content"
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg) translate(${dragPosition.x / zoom}px, ${dragPosition.y / zoom}px)`,
                    transition: isDragging ? 'none' : 'transform 0.2s ease'
                  }}
                >
                  <div className="evidence-viewer__placeholder-icon">{selected.icon}</div>
                  <div className="evidence-viewer__placeholder-text">{selected.fileName}</div>
                  {selected.type === 'video' && (
                    <div className="evidence-viewer__play-overlay"><Play size={24} /></div>
                  )}
                </div>

                {/* Annotations */}
                {showAnnotations && currentAnnotations.map(annotation => (
                  <div
                    key={annotation.id}
                    className="evidence-viewer__annotation"
                    style={{ left: `${annotation.x}%`, top: `${annotation.y}%` }}
                  >
                    <div className="evidence-viewer__annotation-marker"><Pin size={16} /></div>
                    <div className="evidence-viewer__annotation-tooltip">
                      <p>{annotation.text}</p>
                      <span className="evidence-viewer__annotation-author">— {annotation.author}</span>
                      <button 
                        className="evidence-viewer__annotation-delete"
                        onClick={(e) => { e.stopPropagation(); deleteAnnotation(annotation.id); }}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}

                {/* Pending Annotation */}
                {pendingAnnotation && (
                  <div
                    className="evidence-viewer__annotation evidence-viewer__annotation--pending"
                    style={{ left: `${pendingAnnotation.x}%`, top: `${pendingAnnotation.y}%` }}
                  >
                    <div className="evidence-viewer__annotation-marker"><Pin size={16} /></div>
                    <div className="evidence-viewer__annotation-input">
                      <textarea
                        value={newAnnotationText}
                        onChange={(e) => setNewAnnotationText(e.target.value)}
                        placeholder="Add annotation..."
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="evidence-viewer__annotation-actions">
                        <button onClick={(e) => { e.stopPropagation(); saveAnnotation(); }}>Save</button>
                        <button onClick={(e) => { e.stopPropagation(); setPendingAnnotation(null); setNewAnnotationText(''); }}>Cancel</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Verification Badge */}
                <div className={`evidence-viewer__badge ${selected.verified ? 'evidence-viewer__badge--verified' : 'evidence-viewer__badge--unverified'}`}>
                  {selected.verified ? <><Check size={14} /> Verified</> : <><AlertTriangle size={14} /> Unverified</>}
                </div>
              </div>

              {/* Compare Panel */}
              {isCompareMode && (
                <div className="evidence-viewer__compare-panel">
                  {compareIdx !== null ? (
                    <div className="evidence-viewer__placeholder">
                      <div className="evidence-viewer__placeholder-content">
                        <div className="evidence-viewer__placeholder-icon">{filteredEvidence[compareIdx].icon}</div>
                        <div className="evidence-viewer__placeholder-text">{filteredEvidence[compareIdx].fileName}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="evidence-viewer__compare-select">
                      <p>Select an item to compare</p>
                      <div className="evidence-viewer__compare-grid">
                        {filteredEvidence.filter((_, _idx) => _idx !== selectedIdx).map((item) => (
                          <div
                            key={item.id}
                            className="evidence-viewer__compare-item"
                            onClick={() => setCompareIdx(filteredEvidence.indexOf(item))}
                          >
                            {item.icon}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!isCompareMode && (
                <button className="evidence-viewer__nav evidence-viewer__nav--next" onClick={goNext}>
                  ›
                </button>
              )}
            </div>

            {/* Info Bar */}
            <div className="evidence-viewer__info-bar">
              <div className="evidence-viewer__info-left">
                <div className="evidence-viewer__file-name">
                  {selected.fileName}
                  {selected.verified && <span className="evidence-viewer__verified-icon"><Check size={14} /></span>}
                </div>
                <div className="evidence-viewer__file-meta">
                  {selected.fileSize} • Uploaded by <strong>{selected.uploadedBy}</strong> • {selected.uploadedAt}
                </div>
                {selected.description && (
                  <div className="evidence-viewer__description">{selected.description}</div>
                )}
              </div>
              <div className="evidence-viewer__info-actions">
                <button className="admin-btn admin-btn--secondary admin-btn--sm" onClick={handleDownload}>
                  <Download size={16} /> Download
                </button>
                <button className="admin-btn admin-btn--secondary admin-btn--sm" onClick={() => setIsLightboxOpen(true)}>
                  <Search size={16} /> View Full
                </button>
              </div>
            </div>

            {/* Tags */}
            {selected.tags.length > 0 && (
              <div className="evidence-viewer__tags">
                {selected.tags.map(tag => (
                  <span key={tag} className="evidence-viewer__tag" onClick={() => setSearchQuery(tag)}>
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Thumbnails */}
            <div className="evidence-viewer__thumbnails">
              {filteredEvidence.map((item, idx) => (
                <div
                  key={item.id}
                  className={`evidence-viewer__thumb ${idx === selectedIdx ? 'evidence-viewer__thumb--active' : ''} ${isCompareMode && idx === compareIdx ? 'evidence-viewer__thumb--compare' : ''}`}
                  onClick={() => isCompareMode ? setCompareIdx(idx) : setSelectedIdx(idx)}
                >
                  <span className="evidence-viewer__thumb-icon">{item.icon}</span>
                  {item.verified && <span className="evidence-viewer__thumb-verified"><Check size={12} /></span>}
                  {item.notes.length > 0 && <span className="evidence-viewer__thumb-notes">{item.notes.length}</span>}
                </div>
              ))}
            </div>

            {/* Keyboard Hints */}
            <div className="evidence-viewer__hints">
              <span>← → Navigate</span>
              <span>↑ ↓ Zoom</span>
              <span>R Rotate</span>
              <span>F Fullscreen</span>
              <span>Space Slideshow</span>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="evidence-viewer__sidebar">
            {/* File Details */}
            <div className="evidence-sidebar-card">
              <div className="evidence-sidebar-card__header">
                <h3 className="evidence-sidebar-card__title"><FolderOpen size={16} /> File Details</h3>
              </div>
              <div className="evidence-sidebar-card__body">
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
            </div>

            {/* Integrity Check */}
            <div className="evidence-sidebar-card">
              <div className="evidence-sidebar-card__header">
                <h3 className="evidence-sidebar-card__title"><Lock size={16} /> Integrity Check</h3>
              </div>
              <div className="evidence-sidebar-card__body">
                <div className={`evidence-viewer__integrity evidence-viewer__integrity--${selected.verified ? 'verified' : 'unverified'}`}>
                  <div className="evidence-viewer__integrity-icon">
                    {selected.verified ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                  </div>
                  <div className="evidence-viewer__integrity-info">
                    <strong>{selected.verified ? 'Verified' : 'Unverified'}</strong>
                    <span>{selected.verified ? 'No tampering detected' : 'Pending review'}</span>
                    {selected.verifiedBy && <span className="evidence-viewer__verified-by">by {selected.verifiedBy}</span>}
                  </div>
                </div>
                <div className="evidence-viewer__verify-actions">
                  {!selected.verified ? (
                    <button className="admin-btn admin-btn--success admin-btn--sm admin-btn--full" onClick={() => handleVerify(true)}>
                      <Check size={14} /> Mark as Verified
                    </button>
                  ) : (
                    <button className="admin-btn admin-btn--danger admin-btn--sm admin-btn--full" onClick={() => handleVerify(false)}>
                      <X size={14} /> Remove Verification
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Admin Notes */}
            <div className="evidence-sidebar-card">
              <div className="evidence-sidebar-card__header">
                <h3 className="evidence-sidebar-card__title"><Pencil size={16} /> Notes ({selected.notes.length})</h3>
              </div>
              <div className="evidence-sidebar-card__body">
                {selected.notes.length > 0 && (
                  <div className="evidence-sidebar-card__notes-list">
                    {selected.notes.map(note => (
                      <div key={note.id} className="evidence-sidebar-card__note">
                        <p>{note.text}</p>
                        <div className="evidence-sidebar-card__note-meta">
                          <span>{note.author}</span>
                          <span>{note.createdAt}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <textarea
                  className="evidence-sidebar-card__notes-input"
                  placeholder="Add a note about this evidence..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  rows={3}
                />
                <button 
                  className="admin-btn admin-btn--primary admin-btn--sm admin-btn--full"
                  onClick={handleSaveNote}
                  disabled={!noteText.trim()}
                >
                  <Save size={16} /> Save Note
                </button>
              </div>
            </div>

            {/* Annotations */}
            <div className="evidence-sidebar-card">
              <div className="evidence-sidebar-card__header">
                <h3 className="evidence-sidebar-card__title"><Pin size={16} /> Annotations ({currentAnnotations.length})</h3>
                <button 
                  className={`evidence-sidebar-card__toggle ${isAddingAnnotation ? 'evidence-sidebar-card__toggle--active' : ''}`}
                  onClick={() => setIsAddingAnnotation(!isAddingAnnotation)}
                >
                  + Add
                </button>
              </div>
              <div className="evidence-sidebar-card__body">
                {currentAnnotations.length === 0 ? (
                  <p className="evidence-sidebar-card__empty">No annotations yet. Click "+ Add" then click on the image.</p>
                ) : (
                  <div className="evidence-sidebar-card__annotations">
                    {currentAnnotations.map((annotation, idx) => (
                      <div key={annotation.id} className="evidence-sidebar-card__annotation-item">
                        <span className="evidence-sidebar-card__annotation-num">{idx + 1}</span>
                        <div className="evidence-sidebar-card__annotation-content">
                          <p>{annotation.text}</p>
                          <span>— {annotation.author}</span>
                        </div>
                        <button onClick={() => deleteAnnotation(annotation.id)}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* All Evidence */}
            <div className="evidence-sidebar-card evidence-sidebar-card--expandable">
              <div className="evidence-sidebar-card__header">
                <h3 className="evidence-sidebar-card__title"><ClipboardList size={16} /> All Evidence ({filteredEvidence.length})</h3>
              </div>
              <div className="evidence-sidebar-card__body evidence-sidebar-card__body--scrollable">
                {viewMode === 'timeline' ? (
                  <div className="evidence-timeline">
                    {filteredEvidence.map((item, idx) => (
                      <div 
                        key={item.id} 
                        className={`evidence-timeline__item ${idx === selectedIdx ? 'evidence-timeline__item--active' : ''}`}
                        onClick={() => setSelectedIdx(idx)}
                      >
                        <div className="evidence-timeline__marker">
                          <div className="evidence-timeline__dot" />
                          {idx < filteredEvidence.length - 1 && <div className="evidence-timeline__line" />}
                        </div>
                        <div className="evidence-timeline__content">
                          <div className="evidence-timeline__time">{item.uploadedAt}</div>
                          <div className="evidence-timeline__file">
                            <span className="evidence-timeline__icon">{item.icon}</span>
                            <span className="evidence-timeline__name">{item.fileName}</span>
                            {item.verified && <span className="evidence-timeline__verified"><Check size={12} /></span>}
                          </div>
                          <div className="evidence-timeline__meta">
                            {item.uploadedBy} • {item.fileSize}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  filteredEvidence.map((item, idx) => (
                    <div
                      key={item.id}
                      className={`evidence-sidebar-card__file ${idx === selectedIdx ? 'evidence-sidebar-card__file--active' : ''}`}
                      onClick={() => setSelectedIdx(idx)}
                    >
                      <span className="evidence-sidebar-card__file-icon">{item.icon}</span>
                      <div className="evidence-sidebar-card__file-info">
                        <span className="evidence-sidebar-card__file-name">{item.fileName}</span>
                        <span className="evidence-sidebar-card__file-meta">{item.uploadedBy} • {item.fileSize}</span>
                      </div>
                      <div className="evidence-sidebar-card__file-badges">
                        {item.verified && <span className="evidence-sidebar-card__file-verified"><Check size={12} /></span>}
                        {item.notes.length > 0 && <span className="evidence-sidebar-card__file-notes">{item.notes.length}</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Lightbox Modal */}
      {isLightboxOpen && (
        <div className="evidence-lightbox" onClick={() => setIsLightboxOpen(false)}>
          <button className="evidence-lightbox__close">×</button>
          <button className="evidence-lightbox__nav evidence-lightbox__nav--prev" onClick={(e) => { e.stopPropagation(); goPrev(); }}>‹</button>
          <div className="evidence-lightbox__content" onClick={(e) => e.stopPropagation()}>
            <div className="evidence-lightbox__placeholder">
              <div className="evidence-lightbox__icon">{selected.icon}</div>
              <div className="evidence-lightbox__filename">{selected.fileName}</div>
            </div>
          </div>
          <button className="evidence-lightbox__nav evidence-lightbox__nav--next" onClick={(e) => { e.stopPropagation(); goNext(); }}>›</button>
          <div className="evidence-lightbox__info">
            <span>{selectedIdx + 1} / {filteredEvidence.length}</span>
            <span>{selected.fileName}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default EvidenceViewer;