import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Clock, Check, X, AlertTriangle, Leaf, Apple, Wheat, Milk, Flame, Package,
  ClipboardList, Flag, Star, Eye, Search, CheckCircle, XCircle, DollarSign,
  MapPin, Calendar, MessageCircle, ArrowUp, ArrowDown, RefreshCw, Download,
  Tag, SlidersHorizontal, LayoutGrid, List, CheckSquare, Info
} from 'lucide-react';
import ListingReviewModal from './ListingReviewModal';
import { API_ENDPOINTS } from '../../../config/api';
import './ListingModeration.css';

// ============ Types ============
type ModerationStatus = 'all' | 'pending' | 'approved' | 'rejected' | 'flagged' | 'expired';
type ListingCategory = 'all' | 'vegetable' | 'fruit' | 'grain' | 'dairy' | 'spices' | 'other';
type SortField = 'title' | 'farmer' | 'price' | 'submittedAt' | 'quantity';
type SortOrder = 'asc' | 'desc';
type ViewMode = 'grid' | 'list';

interface ListingImage {
  id: string;
  url: string;
  isPrimary: boolean;
}

interface FarmerInfo {
  id: string;
  name: string;
  rating: number;
  verified: boolean;
  totalListings: number;
}

interface ModerationListing {
  id: string;
  title: string;
  description: string;
  farmer: FarmerInfo;
  category: Exclude<ListingCategory, 'all'>;
  type: string;
  quantity: number;
  unit: string;
  price: number;
  currency: string;
  status: Exclude<ModerationStatus, 'all'>;
  submittedAt: string;
  expiresAt?: string;
  images: ListingImage[];
  icon: React.ReactNode;
  location: string;
  isOrganic: boolean;
  isFeatured: boolean;
  flags?: string[];
  rejectionReason?: string;
  moderatedBy?: string;
  moderatedAt?: string;
  viewCount: number;
  inquiryCount: number;
}

interface PaginationState {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

interface FilterState {
  status: ModerationStatus;
  category: ListingCategory;
  isOrganic: boolean | null;
  dateRange: 'all' | 'today' | 'week' | 'month';
  priceRange: { min: number | null; max: number | null };
}

// ============ Constants ============
const ITEMS_PER_PAGE_OPTIONS = [12, 24, 48, 96];

const STATUS_CONFIG: Record<Exclude<ModerationStatus, 'all'>, { 
  icon: React.ReactNode; 
  color: string; 
  bgColor: string; 
  label: string;
}> = {
  pending: { icon: <Clock size={16} />, color: '#d97706', bgColor: '#fef3c7', label: 'Pending Review' },
  approved: { icon: <Check size={16} />, color: '#16a34a', bgColor: '#dcfce7', label: 'Approved' },
  rejected: { icon: <X size={16} />, color: '#dc2626', bgColor: '#fee2e2', label: 'Rejected' },
  flagged: { icon: <AlertTriangle size={16} />, color: '#ea580c', bgColor: '#ffedd5', label: 'Flagged' },
  expired: { icon: <Clock size={16} />, color: '#6b7280', bgColor: '#f3f4f6', label: 'Expired' },
};

const CATEGORY_CONFIG: Record<Exclude<ListingCategory, 'all'>, { 
  icon: React.ReactNode; 
  color: string; 
  label: string;
}> = {
  vegetable: { icon: <Leaf size={16} />, color: '#16a34a', label: 'Vegetables' },
  fruit: { icon: <Apple size={16} />, color: '#dc2626', label: 'Fruits' },
  grain: { icon: <Wheat size={16} />, color: '#d97706', label: 'Grains' },
  dairy: { icon: <Milk size={16} />, color: '#3b82f6', label: 'Dairy' },
  spices: { icon: <Flame size={16} />, color: '#ea580c', label: 'Spices' },
  other: { icon: <Package size={16} />, color: '#6b7280', label: 'Other' },
};

const REJECTION_REASONS = [
  { id: 'incomplete', label: 'Incomplete information' },
  { id: 'poor_quality', label: 'Poor image quality' },
  { id: 'price_issue', label: 'Pricing issues' },
  { id: 'policy_violation', label: 'Policy violation' },
  { id: 'duplicate', label: 'Duplicate listing' },
  { id: 'inappropriate', label: 'Inappropriate content' },
  { id: 'out_of_scope', label: 'Out of platform scope' },
  { id: 'other', label: 'Other reason' },
];

// ============ Helper Functions ============
const formatCurrency = (amount: number, currency: string = 'INR'): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const getTimeAgo = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateString);
};

// ============ Sub Components ============
const LoadingSkeletonGrid: React.FC<{ count?: number }> = ({ count = 8 }) => (
  <div className="lm-skeleton-grid">
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="lm-skeleton-card">
        <div className="skeleton lm-skeleton-image" />
        <div className="lm-skeleton-body">
          <div className="skeleton lm-skeleton-title" />
          <div className="skeleton lm-skeleton-meta" />
          <div className="lm-skeleton-details">
            <div className="skeleton lm-skeleton-detail" />
            <div className="skeleton lm-skeleton-detail" />
          </div>
          <div className="lm-skeleton-actions">
            <div className="skeleton lm-skeleton-btn" />
            <div className="skeleton lm-skeleton-btn" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

const LoadingSkeletonList: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <div className="lm-skeleton-list">
    {Array.from({ length: count }).map((_, index) => (
      <div key={index} className="lm-skeleton-row">
        <div className="skeleton lm-skeleton-row-image" />
        <div className="lm-skeleton-row-content">
          <div className="skeleton lm-skeleton-row-title" />
          <div className="skeleton lm-skeleton-row-meta" />
        </div>
        <div className="skeleton lm-skeleton-row-status" />
        <div className="skeleton lm-skeleton-row-price" />
        <div className="skeleton lm-skeleton-row-actions" />
      </div>
    ))}
  </div>
);

const EmptyState: React.FC<{ 
  filter: ModerationStatus; 
  searchQuery: string;
  onClearFilters: () => void;
}> = ({ filter, searchQuery, onClearFilters }) => (
  <div className="lm-empty-state">
    <div className="lm-empty-state__icon">
      {filter === 'pending' ? <ClipboardList size={48} /> : filter === 'flagged' ? <Flag size={48} /> : <Package size={48} />}
    </div>
    <h3 className="lm-empty-state__title">No listings found</h3>
    <p className="lm-empty-state__description">
      {searchQuery
        ? `No results for "${searchQuery}". Try different keywords.`
        : filter === 'pending'
        ? 'Great job! There are no pending listings to review.'
        : filter === 'flagged'
        ? 'No flagged listings at the moment.'
        : 'No listings match your current filters.'}
    </p>
    <button className="lm-empty-state__btn" onClick={onClearFilters}>
      Clear Filters
    </button>
  </div>
);

const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: number;
  trend?: { value: number; isPositive: boolean };
  color: string;
  onClick?: () => void;
  isActive?: boolean;
}> = ({ icon, label, value, trend, color, onClick, isActive }) => (
  <div 
    className={`lm-stat-card ${onClick ? 'clickable' : ''} ${isActive ? 'active' : ''}`}
    onClick={onClick}
    style={{ '--stat-color': color } as React.CSSProperties}
  >
    <div className="lm-stat-card__icon">
      <span>{icon}</span>
    </div>
    <div className="lm-stat-card__content">
      <span className="lm-stat-card__value">{value}</span>
      <span className="lm-stat-card__label">{label}</span>
    </div>
    {trend && (
      <div className={`lm-stat-card__trend ${trend.isPositive ? 'positive' : 'negative'}`}>
        {trend.isPositive ? <ArrowUp size={14} /> : <ArrowDown size={14} />} {Math.abs(trend.value)}%
      </div>
    )}
  </div>
);

const ListingCard: React.FC<{
  listing: ModerationListing;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onView: (listing: ModerationListing) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onFlag: (id: string) => void;
  selectionMode: boolean;
}> = ({ listing, isSelected, onSelect, onView, onApprove, onReject, onFlag, selectionMode }) => {
  const statusConfig = STATUS_CONFIG[listing.status];
  const categoryConfig = CATEGORY_CONFIG[listing.category];
  const primaryImage = listing.images.find(img => img.isPrimary) || listing.images[0];

  return (
    <div className={`lm-card ${isSelected ? 'selected' : ''} ${listing.status}`}>
      {selectionMode && (listing.status === 'pending' || listing.status === 'flagged') && (
        <label className="lm-card__checkbox">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect(listing.id)}
          />
          <span className="checkmark" />
        </label>
      )}

      <div className="lm-card__image" onClick={() => onView(listing)}>
        {primaryImage ? (
          <img src={primaryImage.url} alt={listing.title} />
        ) : (
          <div className="lm-card__image-placeholder">
            <span>{listing.icon}</span>
          </div>
        )}
        
        <div className="lm-card__badges">
          <span 
            className="lm-card__status-badge"
            style={{ backgroundColor: statusConfig.bgColor, color: statusConfig.color }}
          >
            {statusConfig.icon} {listing.status}
          </span>
          {listing.isOrganic && (
            <span className="lm-card__organic-badge"><Leaf size={14} /> Organic</span>
          )}
          {listing.isFeatured && (
            <span className="lm-card__featured-badge"><Star size={14} /> Featured</span>
          )}
        </div>

        {listing.flags && listing.flags.length > 0 && (
          <div className="lm-card__flags">
            <span className="lm-card__flag-count">
              <Flag size={14} /> {listing.flags.length} flag{listing.flags.length > 1 ? 's' : ''}
            </span>
          </div>
        )}

        <div className="lm-card__overlay">
          <button className="lm-card__view-btn" onClick={() => onView(listing)}>
            <Eye size={14} /> View Details
          </button>
        </div>
      </div>

      <div className="lm-card__body">
        <div className="lm-card__header">
          <h3 className="lm-card__title">{listing.title}</h3>
          <span 
            className="lm-card__category"
            style={{ backgroundColor: `${categoryConfig.color}15`, color: categoryConfig.color }}
          >
            {categoryConfig.icon} {listing.type}
          </span>
        </div>

        <div className="lm-card__farmer">
          <div className="lm-card__farmer-avatar">
            {listing.farmer.name.charAt(0)}
          </div>
          <div className="lm-card__farmer-info">
            <span className="lm-card__farmer-name">
              {listing.farmer.name}
              {listing.farmer.verified && <span className="verified-badge"><Check size={12} /></span>}
            </span>
            <span className="lm-card__farmer-rating">
              <Star size={14} /> {listing.farmer.rating.toFixed(1)}
            </span>
          </div>
        </div>

        <div className="lm-card__details">
          <div className="lm-card__detail">
            <span className="lm-card__detail-icon"><Package size={14} /></span>
            <span>{listing.quantity} {listing.unit}</span>
          </div>
          <div className="lm-card__detail">
            <span className="lm-card__detail-icon"><DollarSign size={14} /></span>
            <span>{formatCurrency(listing.price)}/{listing.unit}</span>
          </div>
          <div className="lm-card__detail">
            <span className="lm-card__detail-icon"><MapPin size={14} /></span>
            <span>{listing.location}</span>
          </div>
          <div className="lm-card__detail">
            <span className="lm-card__detail-icon"><Calendar size={14} /></span>
            <span>{getTimeAgo(listing.submittedAt)}</span>
          </div>
        </div>

        <div className="lm-card__stats">
          <span title="Views"><Eye size={14} /> {listing.viewCount}</span>
          <span title="Inquiries"><MessageCircle size={14} /> {listing.inquiryCount}</span>
        </div>

        <div className="lm-card__actions">
          {(listing.status === 'pending' || listing.status === 'flagged') ? (
            <>
              <button 
                className="lm-card__action-btn lm-card__action-btn--approve"
                onClick={() => onApprove(listing.id)}
                title="Approve listing"
              >
                <Check size={14} /> Approve
              </button>
              <button 
                className="lm-card__action-btn lm-card__action-btn--reject"
                onClick={() => onReject(listing.id)}
                title="Reject listing"
              >
                <X size={14} /> Reject
              </button>
              {listing.status !== 'flagged' && (
                <button 
                  className="lm-card__action-btn lm-card__action-btn--flag"
                  onClick={() => onFlag(listing.id)}
                  title="Flag for review"
                >
                  <Flag size={14} />
                </button>
              )}
            </>
          ) : (
            <button 
              className="lm-card__action-btn lm-card__action-btn--view"
              onClick={() => onView(listing)}
            >
              View Details
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const ListingRow: React.FC<{
  listing: ModerationListing;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onView: (listing: ModerationListing) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onFlag: (id: string) => void;
  selectionMode: boolean;
}> = ({ listing, isSelected, onSelect, onView, onApprove, onReject, onFlag, selectionMode }) => {
  const statusConfig = STATUS_CONFIG[listing.status];
  const categoryConfig = CATEGORY_CONFIG[listing.category];

  return (
    <div className={`lm-row ${isSelected ? 'selected' : ''} ${listing.status}`}>
      {selectionMode && (listing.status === 'pending' || listing.status === 'flagged') && (
        <div className="lm-row__checkbox">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect(listing.id)}
          />
        </div>
      )}

      <div className="lm-row__image" onClick={() => onView(listing)}>
        <span className="lm-row__icon">{listing.icon}</span>
        {listing.isOrganic && <span className="lm-row__organic"><Leaf size={12} /></span>}
      </div>

      <div className="lm-row__info" onClick={() => onView(listing)}>
        <div className="lm-row__title-row">
          <span className="lm-row__title">{listing.title}</span>
          {listing.flags && listing.flags.length > 0 && (
            <span className="lm-row__flag-badge"><Flag size={12} /> {listing.flags.length}</span>
          )}
        </div>
        <div className="lm-row__meta">
          <span className="lm-row__farmer">
            {listing.farmer.name}
            {listing.farmer.verified && <span className="verified-badge"><Check size={12} /></span>}
          </span>
          <span className="lm-row__dot">•</span>
          <span className="lm-row__location">{listing.location}</span>
          <span className="lm-row__dot">•</span>
          <span className="lm-row__date">{getTimeAgo(listing.submittedAt)}</span>
        </div>
      </div>

      <div className="lm-row__category">
        <span style={{ color: categoryConfig.color }}>
          {categoryConfig.icon} {listing.type}
        </span>
      </div>

      <div className="lm-row__quantity">
        {listing.quantity} {listing.unit}
      </div>

      <div className="lm-row__price">
        {formatCurrency(listing.price)}/{listing.unit}
      </div>

      <div className="lm-row__status">
        <span 
          className="lm-row__status-badge"
          style={{ backgroundColor: statusConfig.bgColor, color: statusConfig.color }}
        >
          {statusConfig.icon} {listing.status}
        </span>
      </div>

      <div className="lm-row__actions">
        {(listing.status === 'pending' || listing.status === 'flagged') ? (
          <>
            <button 
              className="lm-row__action-btn approve"
              onClick={() => onApprove(listing.id)}
              title="Approve"
            >
              <Check size={14} />
            </button>
            <button 
              className="lm-row__action-btn reject"
              onClick={() => onReject(listing.id)}
              title="Reject"
            >
              <X size={14} />
            </button>
            {listing.status !== 'flagged' && (
              <button 
                className="lm-row__action-btn flag"
                onClick={() => onFlag(listing.id)}
                title="Flag"
              >
                <Flag size={14} />
              </button>
            )}
          </>
        ) : (
          <button 
            className="lm-row__action-btn view"
            onClick={() => onView(listing)}
            title="View Details"
          >
            <Eye size={14} />
          </button>
        )}
      </div>
    </div>
  );
};

const ConfirmDialog: React.FC<{
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmVariant: 'danger' | 'primary' | 'warning' | 'success';
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  showReasonInput?: boolean;
  reasons?: { id: string; label: string }[];
  selectedReasons?: Set<string>;
  onToggleReason?: (id: string) => void;
  customReason?: string;
  onCustomReasonChange?: (value: string) => void;
}> = ({ 
  isOpen, 
  title, 
  message, 
  confirmLabel, 
  confirmVariant, 
  onConfirm, 
  onCancel, 
  isLoading,
  showReasonInput,
  reasons,
  selectedReasons,
  onToggleReason,
  customReason,
  onCustomReasonChange
}) => {
  if (!isOpen) return null;

  return (
    <div className="lm-confirm-overlay" onClick={onCancel}>
      <div className="lm-confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="lm-confirm-dialog__icon" data-variant={confirmVariant}>
          {confirmVariant === 'danger' ? <AlertTriangle size={24} /> : 
           confirmVariant === 'warning' ? <Flag size={24} /> : 
           confirmVariant === 'success' ? <Check size={24} /> : <Info size={24} />}
        </div>
        <h3 className="lm-confirm-dialog__title">{title}</h3>
        <p className="lm-confirm-dialog__message">{message}</p>
        
        {showReasonInput && reasons && selectedReasons && onToggleReason && (
          <div className="lm-confirm-dialog__reasons">
            {reasons.map((reason) => (
              <label 
                key={reason.id}
                className={`lm-reason-option ${selectedReasons.has(reason.id) ? 'selected' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={selectedReasons.has(reason.id)}
                  onChange={() => onToggleReason(reason.id)}
                />
                <span className="reason-checkbox">
                  {selectedReasons.has(reason.id) ? <Check size={14} /> : ''}
                </span>
                <span className="reason-label">{reason.label}</span>
              </label>
            ))}
            {selectedReasons.has('other') && onCustomReasonChange && (
              <textarea
                className="lm-reason-custom"
                value={customReason}
                onChange={(e) => onCustomReasonChange(e.target.value)}
                placeholder="Please specify..."
                rows={3}
              />
            )}
          </div>
        )}
        
        <div className="lm-confirm-dialog__actions">
          <button
            className="lm-confirm-dialog__btn lm-confirm-dialog__btn--cancel"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            className={`lm-confirm-dialog__btn lm-confirm-dialog__btn--${confirmVariant}`}
            onClick={onConfirm}
            disabled={isLoading || (showReasonInput && selectedReasons && selectedReasons.size === 0)}
          >
            {isLoading ? <span className="btn-spinner" /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

const ToastContainer: React.FC<{ toasts: Toast[]; onDismiss: (id: string) => void }> = ({
  toasts,
  onDismiss,
}) => (
  <div className="lm-toast-container">
    {toasts.map((toast) => (
      <div key={toast.id} className={`lm-toast lm-toast--${toast.type}`}>
        <span className="lm-toast__icon">
          {toast.type === 'success' && <Check size={16} />}
          {toast.type === 'error' && <X size={16} />}
          {toast.type === 'warning' && <AlertTriangle size={16} />}
          {toast.type === 'info' && <Info size={16} />}
        </span>
        <span className="lm-toast__message">{toast.message}</span>
        <button className="lm-toast__close" onClick={() => onDismiss(toast.id)}>
          ×
        </button>
      </div>
    ))}
  </div>
);

// ============ Main Component ============
const ListingModeration: React.FC = () => {
  // State
  const [listings, setListings] = useState<ModerationListing[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    category: 'all',
    isOrganic: null,
    dateRange: 'all',
    priceRange: { min: null, max: null },
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('submittedAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedListing, setSelectedListing] = useState<ModerationListing | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 1,
    itemsPerPage: 12,
    totalItems: 0,
  });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: 'approve' | 'reject' | 'flag' | 'bulk-approve' | 'bulk-reject';
    targetIds: string[];
    isLoading?: boolean;
  } | null>(null);
  const [rejectionReasons, setRejectionReasons] = useState<Set<string>>(new Set());
  const [customRejectionReason, setCustomRejectionReason] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPagination((prev) => ({ ...prev, currentPage: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load listings
  useEffect(() => {
    loadListings();
  }, []);

  const loadListings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(API_ENDPOINTS.marketplace.listings);
      if (response.ok) {
        const data = await response.json();
        setListings(data.listings || data || []);
      } else {
        setListings([]);
      }
    } catch (error) {
      showToast('error', 'Failed to load listings');
    } finally {
      setIsLoading(false);
    }
  };

  // Toast functions
  const showToast = useCallback((type: Toast['type'], message: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Statistics
  const statistics = useMemo(() => {
    return {
      total: listings.length,
      pending: listings.filter((l) => l.status === 'pending').length,
      approved: listings.filter((l) => l.status === 'approved').length,
      rejected: listings.filter((l) => l.status === 'rejected').length,
      flagged: listings.filter((l) => l.status === 'flagged').length,
      organic: listings.filter((l) => l.isOrganic).length,
      byCategory: Object.keys(CATEGORY_CONFIG).reduce((acc, cat) => {
        acc[cat as Exclude<ListingCategory, 'all'>] = listings.filter((l) => l.category === cat).length;
        return acc;
      }, {} as Record<Exclude<ListingCategory, 'all'>, number>),
    };
  }, [listings]);

  // Filtered and sorted listings
  const filteredListings = useMemo(() => {
    let result = [...listings];

    // Status filter
    if (filters.status !== 'all') {
      result = result.filter((l) => l.status === filters.status);
    }

    // Category filter
    if (filters.category !== 'all') {
      result = result.filter((l) => l.category === filters.category);
    }

    // Organic filter
    if (filters.isOrganic !== null) {
      result = result.filter((l) => l.isOrganic === filters.isOrganic);
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      let cutoff: Date;
      switch (filters.dateRange) {
        case 'today':
          cutoff = new Date(now.setHours(0, 0, 0, 0));
          break;
        case 'week':
          cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          cutoff = new Date(0);
      }
      result = result.filter((l) => new Date(l.submittedAt) >= cutoff);
    }

    // Price range filter
    if (filters.priceRange.min !== null) {
      result = result.filter((l) => l.price >= filters.priceRange.min!);
    }
    if (filters.priceRange.max !== null) {
      result = result.filter((l) => l.price <= filters.priceRange.max!);
    }

    // Search filter
    if (debouncedSearch) {
      const search = debouncedSearch.toLowerCase();
      result = result.filter(
        (l) =>
          l.title.toLowerCase().includes(search) ||
          l.farmer.name.toLowerCase().includes(search) ||
          l.type.toLowerCase().includes(search) ||
          l.location.toLowerCase().includes(search)
      );
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'farmer':
          comparison = a.farmer.name.localeCompare(b.farmer.name);
          break;
        case 'price':
          comparison = a.price - b.price;
          break;
        case 'quantity':
          comparison = a.quantity - b.quantity;
          break;
        case 'submittedAt':
          comparison = new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime();
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [listings, filters, debouncedSearch, sortField, sortOrder]);

  // Paginated listings
  const paginatedListings = useMemo(() => {
    const start = (pagination.currentPage - 1) * pagination.itemsPerPage;
    const end = start + pagination.itemsPerPage;
    return filteredListings.slice(start, end);
  }, [filteredListings, pagination.currentPage, pagination.itemsPerPage]);

  const totalPages = Math.ceil(filteredListings.length / pagination.itemsPerPage);

  // Selection handlers
  const handleSelectListing = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    const selectableListings = paginatedListings.filter(
      (l) => l.status === 'pending' || l.status === 'flagged'
    );
    if (selectedIds.size === selectableListings.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableListings.map((l) => l.id)));
    }
  };

  // Action handlers
  const handleApprove = async (id: string) => {
    setConfirmDialog({
      isOpen: true,
      type: 'approve',
      targetIds: [id],
    });
  };

  const handleReject = (id: string) => {
    setRejectionReasons(new Set());
    setCustomRejectionReason('');
    setConfirmDialog({
      isOpen: true,
      type: 'reject',
      targetIds: [id],
    });
  };

  const handleFlag = (id: string) => {
    setConfirmDialog({
      isOpen: true,
      type: 'flag',
      targetIds: [id],
    });
  };

  const handleBulkApprove = () => {
    setConfirmDialog({
      isOpen: true,
      type: 'bulk-approve',
      targetIds: Array.from(selectedIds),
    });
  };

  const handleBulkReject = () => {
    setRejectionReasons(new Set());
    setCustomRejectionReason('');
    setConfirmDialog({
      isOpen: true,
      type: 'bulk-reject',
      targetIds: Array.from(selectedIds),
    });
  };

  const executeApprove = async (ids: string[]) => {
    setConfirmDialog((prev) => prev ? { ...prev, isLoading: true } : null);
    try {
      setListings((prev) =>
        prev.map((l) =>
          ids.includes(l.id)
            ? { ...l, status: 'approved' as const, moderatedAt: new Date().toISOString(), moderatedBy: 'Admin' }
            : l
        )
      );
      showToast('success', `${ids.length} listing${ids.length > 1 ? 's' : ''} approved successfully`);
      setSelectedIds(new Set());
    } catch (error) {
      showToast('error', 'Failed to approve listings');
    } finally {
      setConfirmDialog(null);
    }
  };

  const executeReject = async (ids: string[]) => {
    setConfirmDialog((prev) => prev ? { ...prev, isLoading: true } : null);
    try {
      const reason = Array.from(rejectionReasons)
        .map((id) => REJECTION_REASONS.find((r) => r.id === id)?.label)
        .filter(Boolean)
        .join('; ');
      const fullReason = rejectionReasons.has('other') && customRejectionReason
        ? `${reason}; ${customRejectionReason}`
        : reason;
        
      setListings((prev) =>
        prev.map((l) =>
          ids.includes(l.id)
            ? {
                ...l,
                status: 'rejected' as const,
                rejectionReason: fullReason,
                moderatedAt: new Date().toISOString(),
                moderatedBy: 'Admin',
              }
            : l
        )
      );
      showToast('success', `${ids.length} listing${ids.length > 1 ? 's' : ''} rejected`);
      setSelectedIds(new Set());
    } catch (error) {
      showToast('error', 'Failed to reject listings');
    } finally {
      setConfirmDialog(null);
      setRejectionReasons(new Set());
      setCustomRejectionReason('');
    }
  };

  const handleConfirmAction = () => {
    if (!confirmDialog) return;
    
    switch (confirmDialog.type) {
      case 'approve':
      case 'bulk-approve':
        executeApprove(confirmDialog.targetIds);
        break;
      case 'reject':
      case 'bulk-reject':
        executeReject(confirmDialog.targetIds);
        break;
      case 'flag':
        // Handle flag action
        setConfirmDialog(null);
        break;
    }
  };

  const handleToggleReason = (id: string) => {
    setRejectionReasons((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Sort handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Clear filters
  const clearFilters = () => {
    setFilters({
      status: 'all',
      category: 'all',
      isOrganic: null,
      dateRange: 'all',
      priceRange: { min: null, max: null },
    });
    setSearchQuery('');
  };

  // Export function
  const handleExport = () => {
    const csvContent = [
      ['ID', 'Title', 'Farmer', 'Category', 'Type', 'Quantity', 'Unit', 'Price', 'Status', 'Location', 'Organic', 'Submitted At'],
      ...filteredListings.map((l) => [
        l.id,
        l.title,
        l.farmer.name,
        l.category,
        l.type,
        l.quantity,
        l.unit,
        l.price,
        l.status,
        l.location,
        l.isOrganic ? 'Yes' : 'No',
        formatDate(l.submittedAt),
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `listings-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('success', 'Listings exported successfully');
  };

  // Filter chips
  const statusFilters: { key: ModerationStatus; label: string; icon: React.ReactNode }[] = [
    { key: 'all', label: 'All', icon: <ClipboardList size={16} /> },
    { key: 'pending', label: 'Pending', icon: <Clock size={16} /> },
    { key: 'approved', label: 'Approved', icon: <CheckCircle size={16} /> },
    { key: 'rejected', label: 'Rejected', icon: <XCircle size={16} /> },
    { key: 'flagged', label: 'Flagged', icon: <Flag size={16} /> },
  ];

  const categoryFilters: { key: ListingCategory; label: string; icon: React.ReactNode }[] = [
    { key: 'all', label: 'All', icon: <Tag size={16} /> },
    ...Object.entries(CATEGORY_CONFIG).map(([key, config]) => ({
      key: key as ListingCategory,
      label: config.label,
      icon: config.icon,
    })),
  ];

  return (
    <div className="listing-moderation">
      {/* Statistics Dashboard */}
      <div className="lm-stats">
        <StatCard
          icon={<ClipboardList size={20} />}
          label="Total Listings"
          value={statistics.total}
          color="#3b82f6"
        />
        <StatCard
          icon={<Clock size={20} />}
          label="Pending Review"
          value={statistics.pending}
          color="#d97706"
          onClick={() => setFilters((prev) => ({ ...prev, status: 'pending' }))}
          isActive={filters.status === 'pending'}
        />
        <StatCard
          icon={<CheckCircle size={20} />}
          label="Approved"
          value={statistics.approved}
          color="#16a34a"
          onClick={() => setFilters((prev) => ({ ...prev, status: 'approved' }))}
          isActive={filters.status === 'approved'}
        />
        <StatCard
          icon={<Flag size={20} />}
          label="Flagged"
          value={statistics.flagged}
          color="#ea580c"
          onClick={() => setFilters((prev) => ({ ...prev, status: 'flagged' }))}
          isActive={filters.status === 'flagged'}
        />
        <StatCard
          icon={<Leaf size={20} />}
          label="Organic"
          value={statistics.organic}
          color="#22c55e"
        />
      </div>

      {/* Header */}
      <div className="lm-header">
        <div className="lm-header__left">
          <h1 className="lm-header__title">Listing Moderation</h1>
          <p className="lm-header__subtitle">
            Review and manage product listings
          </p>
        </div>
        <div className="lm-header__right">
          <button
            className="lm-header__btn lm-header__btn--secondary"
            onClick={loadListings}
            disabled={isLoading}
          >
            <span className={`btn-icon ${isLoading ? 'spinning' : ''}`}><RefreshCw size={16} /></span>
            Refresh
          </button>
          <button
            className="lm-header__btn lm-header__btn--secondary"
            onClick={handleExport}
          >
            <span className="btn-icon"><Download size={16} /></span>
            Export
          </button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="lm-filters-bar">
        <div className="lm-search">
          <span className="lm-search__icon"><Search size={16} /></span>
          <input
            type="text"
            className="lm-search__input"
            placeholder="Search listings, farmers, or locations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="lm-search__clear"
              onClick={() => setSearchQuery('')}
            >
              ×
            </button>
          )}
        </div>

        <div className="lm-filters-bar__actions">
          <button
            className={`lm-filter-toggle ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <span><SlidersHorizontal size={16} /></span>
            Filters
            {(filters.category !== 'all' || filters.isOrganic !== null || filters.dateRange !== 'all') && (
              <span className="lm-filter-badge">!</span>
            )}
          </button>

          <div className="lm-view-toggle">
            <button
              className={`lm-view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid view"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              className={`lm-view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List view"
            >
              <List size={16} />
            </button>
          </div>

          <button
            className={`lm-selection-toggle ${selectionMode ? 'active' : ''}`}
            onClick={() => {
              setSelectionMode(!selectionMode);
              setSelectedIds(new Set());
            }}
          >
            <CheckSquare size={16} /> {selectionMode ? 'Exit Selection' : 'Select'}
          </button>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div className="lm-filters-panel">
          <div className="lm-filters-panel__section">
            <label>Category</label>
            <div className="lm-filter-chips">
              {categoryFilters.map((cat) => (
                <button
                  key={cat.key}
                  className={`lm-filter-chip ${filters.category === cat.key ? 'active' : ''}`}
                  onClick={() => setFilters((prev) => ({ ...prev, category: cat.key }))}
                >
                  {cat.icon} {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="lm-filters-panel__section">
            <label>Date Range</label>
            <div className="lm-filter-chips">
              <button
                className={`lm-filter-chip ${filters.dateRange === 'all' ? 'active' : ''}`}
                onClick={() => setFilters((prev) => ({ ...prev, dateRange: 'all' }))}
              >
                All Time
              </button>
              <button
                className={`lm-filter-chip ${filters.dateRange === 'today' ? 'active' : ''}`}
                onClick={() => setFilters((prev) => ({ ...prev, dateRange: 'today' }))}
              >
                Today
              </button>
              <button
                className={`lm-filter-chip ${filters.dateRange === 'week' ? 'active' : ''}`}
                onClick={() => setFilters((prev) => ({ ...prev, dateRange: 'week' }))}
              >
                This Week
              </button>
              <button
                className={`lm-filter-chip ${filters.dateRange === 'month' ? 'active' : ''}`}
                onClick={() => setFilters((prev) => ({ ...prev, dateRange: 'month' }))}
              >
                This Month
              </button>
            </div>
          </div>

          <div className="lm-filters-panel__section">
            <label>Product Type</label>
            <div className="lm-filter-chips">
              <button
                className={`lm-filter-chip ${filters.isOrganic === null ? 'active' : ''}`}
                onClick={() => setFilters((prev) => ({ ...prev, isOrganic: null }))}
              >
                All
              </button>
              <button
                className={`lm-filter-chip ${filters.isOrganic === true ? 'active' : ''}`}
                onClick={() => setFilters((prev) => ({ ...prev, isOrganic: true }))}
              >
                <Leaf size={14} /> Organic Only
              </button>
              <button
                className={`lm-filter-chip ${filters.isOrganic === false ? 'active' : ''}`}
                onClick={() => setFilters((prev) => ({ ...prev, isOrganic: false }))}
              >
                Non-Organic
              </button>
            </div>
          </div>

          <div className="lm-filters-panel__actions">
            <button className="lm-clear-filters-btn" onClick={clearFilters}>
              Clear All Filters
            </button>
          </div>
        </div>
      )}

      {/* Status Filter Tabs */}
      <div className="lm-status-tabs">
        {statusFilters.map((f) => (
          <button
            key={f.key}
            className={`lm-status-tab ${filters.status === f.key ? 'active' : ''}`}
            onClick={() => setFilters((prev) => ({ ...prev, status: f.key }))}
          >
            <span className="lm-status-tab__icon">{f.icon}</span>
            <span className="lm-status-tab__label">{f.label}</span>
            <span className="lm-status-tab__count">
              {f.key === 'all' ? statistics.total : (statistics[f.key as Exclude<keyof typeof statistics, 'byCategory'>] as number) || 0}
            </span>
          </button>
        ))}
      </div>

      {/* Bulk Actions Bar */}
      {selectionMode && selectedIds.size > 0 && (
        <div className="lm-bulk-actions">
          <span className="lm-bulk-actions__count">
            {selectedIds.size} listing{selectedIds.size > 1 ? 's' : ''} selected
          </span>
          <div className="lm-bulk-actions__buttons">
            <button
              className="lm-bulk-btn lm-bulk-btn--approve"
              onClick={handleBulkApprove}
            >
              <Check size={14} /> Approve Selected
            </button>
            <button
              className="lm-bulk-btn lm-bulk-btn--reject"
              onClick={handleBulkReject}
            >
              <X size={14} /> Reject Selected
            </button>
            <button
              className="lm-bulk-btn lm-bulk-btn--secondary"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Listings Content */}
      <div className="lm-content">
        {/* Sort Bar (for list view) */}
        {viewMode === 'list' && !isLoading && filteredListings.length > 0 && (
          <div className="lm-list-header">
            {selectionMode && (
              <div className="lm-list-header__checkbox">
                <input
                  type="checkbox"
                  checked={selectedIds.size === paginatedListings.filter(l => l.status === 'pending' || l.status === 'flagged').length}
                  onChange={handleSelectAll}
                />
              </div>
            )}
            <div className="lm-list-header__image">Image</div>
            <div 
              className="lm-list-header__info sortable"
              onClick={() => handleSort('title')}
            >
              Listing
              {sortField === 'title' && (
                <span className="sort-indicator">{sortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}</span>
              )}
            </div>
            <div className="lm-list-header__category">Category</div>
            <div 
              className="lm-list-header__quantity sortable"
              onClick={() => handleSort('quantity')}
            >
              Quantity
              {sortField === 'quantity' && (
                <span className="sort-indicator">{sortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}</span>
              )}
            </div>
            <div 
              className="lm-list-header__price sortable"
              onClick={() => handleSort('price')}
            >
              Price
              {sortField === 'price' && (
                <span className="sort-indicator">{sortOrder === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}</span>
              )}
            </div>
            <div className="lm-list-header__status">Status</div>
            <div className="lm-list-header__actions">Actions</div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          viewMode === 'grid' ? (
            <LoadingSkeletonGrid count={pagination.itemsPerPage} />
          ) : (
            <LoadingSkeletonList count={6} />
          )
        )}

        {/* Empty State */}
        {!isLoading && filteredListings.length === 0 && (
          <EmptyState
            filter={filters.status}
            searchQuery={debouncedSearch}
            onClearFilters={clearFilters}
          />
        )}

        {/* Grid View */}
        {!isLoading && filteredListings.length > 0 && viewMode === 'grid' && (
          <div className="lm-grid">
            {paginatedListings.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                isSelected={selectedIds.has(listing.id)}
                onSelect={handleSelectListing}
                onView={setSelectedListing}
                onApprove={handleApprove}
                onReject={handleReject}
                onFlag={handleFlag}
                selectionMode={selectionMode}
              />
            ))}
          </div>
        )}

        {/* List View */}
        {!isLoading && filteredListings.length > 0 && viewMode === 'list' && (
          <div className="lm-list">
            {paginatedListings.map((listing) => (
              <ListingRow
                key={listing.id}
                listing={listing}
                isSelected={selectedIds.has(listing.id)}
                onSelect={handleSelectListing}
                onView={setSelectedListing}
                onApprove={handleApprove}
                onReject={handleReject}
                onFlag={handleFlag}
                selectionMode={selectionMode}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {!isLoading && filteredListings.length > 0 && (
        <div className="lm-pagination">
          <div className="lm-pagination__info">
            <span>
              Showing {(pagination.currentPage - 1) * pagination.itemsPerPage + 1} to{' '}
              {Math.min(pagination.currentPage * pagination.itemsPerPage, filteredListings.length)} of{' '}
              {filteredListings.length} listings
            </span>
            <select
              className="lm-pagination__per-page"
              value={pagination.itemsPerPage}
              onChange={(e) =>
                setPagination((prev) => ({
                  ...prev,
                  itemsPerPage: Number(e.target.value),
                  currentPage: 1,
                }))
              }
            >
              {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option} per page
                </option>
              ))}
            </select>
          </div>
          <div className="lm-pagination__controls">
            <button
              className="lm-pagination__btn"
              onClick={() => setPagination((prev) => ({ ...prev, currentPage: 1 }))}
              disabled={pagination.currentPage === 1}
            >
              ««
            </button>
            <button
              className="lm-pagination__btn"
              onClick={() => setPagination((prev) => ({ ...prev, currentPage: prev.currentPage - 1 }))}
              disabled={pagination.currentPage === 1}
            >
              ‹ Prev
            </button>
            <div className="lm-pagination__pages">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (pagination.currentPage <= 3) {
                  pageNum = i + 1;
                } else if (pagination.currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = pagination.currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    className={`lm-pagination__page ${pagination.currentPage === pageNum ? 'active' : ''}`}
                    onClick={() => setPagination((prev) => ({ ...prev, currentPage: pageNum }))}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              className="lm-pagination__btn"
              onClick={() => setPagination((prev) => ({ ...prev, currentPage: prev.currentPage + 1 }))}
              disabled={pagination.currentPage === totalPages}
            >
              Next ›
            </button>
            <button
              className="lm-pagination__btn"
              onClick={() => setPagination((prev) => ({ ...prev, currentPage: totalPages }))}
              disabled={pagination.currentPage === totalPages}
            >
              »»
            </button>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {selectedListing && (
        <ListingReviewModal
          listing={{
            id: selectedListing.id,
            title: selectedListing.title,
            farmer: selectedListing.farmer.name,
            type: selectedListing.type,
            quantity: selectedListing.quantity.toString(),
            price: selectedListing.price.toString(),
            status: selectedListing.status,
            submittedAt: selectedListing.submittedAt,
            icon: '📦',
          }}
          onClose={() => setSelectedListing(null)}
          onApprove={() => {
            executeApprove([selectedListing.id]);
            setSelectedListing(null);
          }}
          onReject={() => {
            handleReject(selectedListing.id);
            setSelectedListing(null);
          }}
        />
      )}

      {/* Confirm Dialog */}
      {confirmDialog && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={
            confirmDialog.type === 'approve' || confirmDialog.type === 'bulk-approve'
              ? 'Approve Listing'
              : confirmDialog.type === 'reject' || confirmDialog.type === 'bulk-reject'
              ? 'Reject Listing'
              : 'Flag Listing'
          }
          message={
            confirmDialog.type === 'approve'
              ? 'Are you sure you want to approve this listing? It will be visible to all users.'
              : confirmDialog.type === 'bulk-approve'
              ? `Are you sure you want to approve ${confirmDialog.targetIds.length} listings?`
              : confirmDialog.type === 'reject'
              ? 'Please select the reason(s) for rejection:'
              : confirmDialog.type === 'bulk-reject'
              ? `Please select the reason(s) for rejecting ${confirmDialog.targetIds.length} listings:`
              : 'Are you sure you want to flag this listing for further review?'
          }
          confirmLabel={
            confirmDialog.type === 'approve' || confirmDialog.type === 'bulk-approve'
              ? 'Approve'
              : confirmDialog.type === 'reject' || confirmDialog.type === 'bulk-reject'
              ? 'Reject'
              : 'Flag'
          }
          confirmVariant={
            confirmDialog.type === 'approve' || confirmDialog.type === 'bulk-approve'
              ? 'success'
              : confirmDialog.type === 'reject' || confirmDialog.type === 'bulk-reject'
              ? 'danger'
              : 'warning'
          }
          onConfirm={handleConfirmAction}
          onCancel={() => {
            setConfirmDialog(null);
            setRejectionReasons(new Set());
            setCustomRejectionReason('');
          }}
          isLoading={confirmDialog.isLoading}
          showReasonInput={confirmDialog.type === 'reject' || confirmDialog.type === 'bulk-reject'}
          reasons={REJECTION_REASONS}
          selectedReasons={rejectionReasons}
          onToggleReason={handleToggleReason}
          customReason={customRejectionReason}
          onCustomReasonChange={setCustomRejectionReason}
        />
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export default ListingModeration;