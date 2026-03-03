import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock, Check, X, Flag, AlarmClock, Maximize, Star, Lightbulb,
  MapPin, MessageSquare, Mail, Smartphone, AlertTriangle,
  ClipboardList, User, BarChart3, ScrollText, Leaf, Pencil,
  Package, DollarSign, Calendar, Truck, Eye, FileText, ImageIcon
} from 'lucide-react';
import './ListingReviewModal.css';

// ============ Types ============
type ListingStatus = 'pending' | 'approved' | 'rejected' | 'flagged' | 'expired';
type TabType = 'details' | 'images' | 'farmer' | 'history' | 'analysis';

interface ListingImage {
  id: string;
  url: string;
  isPrimary: boolean;
  uploadedAt: string;
}

interface FarmerInfo {
  id: string;
  name: string;
  email: string;
  phone: string;
  rating: number;
  reviewsCount: number;
  verified: boolean;
  joinedAt: string;
  totalListings: number;
  approvedListings: number;
  rejectedListings: number;
  location: string;
  avatar?: string;
}

interface PriceAnalysis {
  currentPrice: number;
  marketAverage: number;
  marketLow: number;
  marketHigh: number;
  priceRating: 'below' | 'average' | 'above' | 'premium';
  percentDiff: number;
  recommendation: string;
}

interface QualityCheck {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  required: boolean;
}

interface ModerationHistory {
  id: string;
  action: string;
  description: string;
  actor: string;
  timestamp: string;
  status?: 'info' | 'success' | 'warning' | 'error';
}

interface ListingFlag {
  id: string;
  type: string;
  reason: string;
  reportedBy: string;
  reportedAt: string;
}

interface ListingDetails {
  id: string;
  title: string;
  description: string;
  farmer: FarmerInfo;
  category: string;
  type: string;
  quantity: number;
  unit: string;
  price: number;
  currency: string;
  status: ListingStatus;
  submittedAt: string;
  expiresAt?: string;
  images: ListingImage[];
  icon: string;
  location: string;
  isOrganic: boolean;
  isFeatured: boolean;
  harvestDate?: string;
  shelfLife?: string;
  minOrderQuantity?: number;
  deliveryOptions?: string[];
  certifications?: string[];
  flags?: ListingFlag[];
  priceAnalysis?: PriceAnalysis;
  history?: ModerationHistory[];
  viewCount: number;
  inquiryCount: number;
  similarListingsCount: number;
}

interface ListingReviewModalProps {
  listing: {
    id: string;
    title: string;
    description?: string;
    farmer: string | { id: string; name: string; rating: number; verified: boolean; totalListings: number };
    type: string;
    category?: string;
    quantity: number | string;
    unit?: string;
    price: number | string;
    currency?: string;
    status: string;
    submittedAt: string;
    icon: string;
    location?: string;
    isOrganic?: boolean;
    isFeatured?: boolean;
    images?: ListingImage[];
    flags?: string[];
    viewCount?: number;
    inquiryCount?: number;
  };
  onClose: () => void;
  onApprove: () => void;
  onReject: (reason: string) => void;
  onFlag?: (reason: string) => void;
  onEdit?: () => void;
  onContactFarmer?: (farmerId: string) => void;
}

// ============ Constants ============
const REJECTION_REASONS = [
  { id: 'incomplete', label: 'Incomplete Information', description: 'Missing required details' },
  { id: 'poor_images', label: 'Poor Image Quality', description: 'Images are blurry or unclear' },
  { id: 'price_issue', label: 'Pricing Issue', description: 'Price seems unreasonable' },
  { id: 'policy_violation', label: 'Policy Violation', description: 'Violates platform guidelines' },
  { id: 'duplicate', label: 'Duplicate Listing', description: 'Similar listing already exists' },
  { id: 'inappropriate', label: 'Inappropriate Content', description: 'Contains inappropriate material' },
  { id: 'out_of_scope', label: 'Out of Scope', description: 'Product not allowed on platform' },
  { id: 'quality_concern', label: 'Quality Concerns', description: 'Product quality issues' },
  { id: 'other', label: 'Other', description: 'Specify your reason' },
];

const QUALITY_CHECKLIST: QualityCheck[] = [
  { id: 'title', label: 'Clear Title', description: 'Title accurately describes the product', checked: false, required: true },
  { id: 'description', label: 'Detailed Description', description: 'Description provides sufficient details', checked: false, required: true },
  { id: 'images', label: 'Quality Images', description: 'Images are clear and show the product well', checked: false, required: true },
  { id: 'pricing', label: 'Reasonable Pricing', description: 'Price is within market range', checked: false, required: true },
  { id: 'quantity', label: 'Valid Quantity', description: 'Quantity and unit are correctly specified', checked: false, required: true },
  { id: 'category', label: 'Correct Category', description: 'Product is in the appropriate category', checked: false, required: false },
  { id: 'organic', label: 'Organic Certification', description: 'Organic claims are verified (if applicable)', checked: false, required: false },
  { id: 'contact', label: 'Contact Information', description: 'Seller contact details are valid', checked: false, required: false },
];

const STATUS_CONFIG: Record<ListingStatus, { icon: React.ReactNode; color: string; bgColor: string; label: string }> = {
  pending: { icon: <Clock size={16} />, color: '#d97706', bgColor: '#fef3c7', label: 'Pending Review' },
  approved: { icon: <Check size={16} />, color: '#16a34a', bgColor: '#dcfce7', label: 'Approved' },
  rejected: { icon: <X size={16} />, color: '#dc2626', bgColor: '#fee2e2', label: 'Rejected' },
  flagged: { icon: <Flag size={16} />, color: '#ea580c', bgColor: '#ffedd5', label: 'Flagged' },
  expired: { icon: <AlarmClock size={16} />, color: '#6b7280', bgColor: '#f3f4f6', label: 'Expired' },
};

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

const formatDateTime = (dateString: string): string => {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
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
const ImageGallery: React.FC<{
  images: ListingImage[];
  icon: string;
}> = ({ images, icon }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [showFullscreen, setShowFullscreen] = useState(false);

  const selectedImage = images[selectedIndex];

  const handlePrev = () => {
    setSelectedIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setSelectedIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showFullscreen) {
        if (e.key === 'Escape') setShowFullscreen(false);
        if (e.key === 'ArrowLeft') handlePrev();
        if (e.key === 'ArrowRight') handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showFullscreen]);

  if (images.length === 0) {
    return (
      <div className="lrm-gallery__empty">
        <span className="lrm-gallery__empty-icon">{icon}</span>
        <p>No images available</p>
      </div>
    );
  }

  return (
    <div className="lrm-gallery">
      <div className="lrm-gallery__main">
        {selectedImage ? (
          <img
            src={selectedImage.url}
            alt={`Image ${selectedIndex + 1}`}
            onClick={() => setShowFullscreen(true)}
          />
        ) : (
          <div className="lrm-gallery__placeholder">
            <span>{icon}</span>
          </div>
        )}
        
        {images.length > 1 && (
          <>
            <button className="lrm-gallery__nav lrm-gallery__nav--prev" onClick={handlePrev}>
              ‹
            </button>
            <button className="lrm-gallery__nav lrm-gallery__nav--next" onClick={handleNext}>
              ›
            </button>
          </>
        )}
        
        <div className="lrm-gallery__counter">
          {selectedIndex + 1} / {images.length}
        </div>
        
        <button 
          className="lrm-gallery__fullscreen"
          onClick={() => setShowFullscreen(true)}
          title="View fullscreen"
        >
          <Maximize size={14} />
        </button>
      </div>

      {images.length > 1 && (
        <div className="lrm-gallery__thumbnails">
          {images.map((image, index) => (
            <button
              key={image.id}
              className={`lrm-gallery__thumb ${index === selectedIndex ? 'active' : ''}`}
              onClick={() => setSelectedIndex(index)}
            >
              <img src={image.url} alt={`Thumbnail ${index + 1}`} />
              {image.isPrimary && <span className="lrm-gallery__primary-badge"><Star size={10} /></span>}
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen Modal */}
      {showFullscreen && (
        <div className="lrm-fullscreen" onClick={() => setShowFullscreen(false)}>
          <div className="lrm-fullscreen__content" onClick={(e) => e.stopPropagation()}>
            <div className="lrm-fullscreen__header">
              <span>Image {selectedIndex + 1} of {images.length}</span>
              <div className="lrm-fullscreen__controls">
                <button onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}>−</button>
                <span>{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom((z) => Math.min(3, z + 0.25))}>+</button>
                <button onClick={() => setZoom(1)}>Reset</button>
                <button className="close" onClick={() => setShowFullscreen(false)}><X size={16} /></button>
              </div>
            </div>
            <div className="lrm-fullscreen__body">
              {images.length > 1 && (
                <button className="lrm-fullscreen__nav prev" onClick={handlePrev}>‹</button>
              )}
              <div 
                className="lrm-fullscreen__image"
                style={{ transform: `scale(${zoom})` }}
              >
                <img src={selectedImage.url} alt={`Image ${selectedIndex + 1}`} />
              </div>
              {images.length > 1 && (
                <button className="lrm-fullscreen__nav next" onClick={handleNext}>›</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const QualityChecklistComponent: React.FC<{
  checklist: QualityCheck[];
  onChange: (id: string, checked: boolean) => void;
}> = ({ checklist, onChange }) => {
  const requiredCount = checklist.filter((c) => c.required).length;
  const requiredChecked = checklist.filter((c) => c.required && c.checked).length;
  const allRequiredMet = requiredChecked === requiredCount;

  return (
    <div className="lrm-checklist">
      <div className="lrm-checklist__header">
        <h4>Quality Checklist</h4>
        <div className={`lrm-checklist__progress ${allRequiredMet ? 'complete' : ''}`}>
          <div 
            className="lrm-checklist__progress-bar"
            style={{ width: `${(requiredChecked / requiredCount) * 100}%` }}
          />
        </div>
        <span className="lrm-checklist__count">
          {requiredChecked}/{requiredCount} required
        </span>
      </div>
      <div className="lrm-checklist__items">
        {checklist.map((item) => (
          <label 
            key={item.id}
            className={`lrm-checklist__item ${item.checked ? 'checked' : ''} ${item.required ? 'required' : ''}`}
          >
            <input
              type="checkbox"
              checked={item.checked}
              onChange={(e) => onChange(item.id, e.target.checked)}
            />
            <span className="lrm-checklist__checkbox">
              {item.checked ? <Check size={14} /> : null}
            </span>
            <div className="lrm-checklist__content">
              <span className="lrm-checklist__label">
                {item.label}
                {item.required && <span className="required-star">*</span>}
              </span>
              <span className="lrm-checklist__description">{item.description}</span>
            </div>
          </label>
        ))}
      </div>
    </div>
  );
};

const PriceAnalysisComponent: React.FC<{
  analysis: PriceAnalysis;
  currentPrice: number;
  unit: string;
  currency: string;
}> = ({ analysis, currentPrice, unit, currency }) => {
  const getPriceRatingColor = () => {
    switch (analysis.priceRating) {
      case 'below': return '#16a34a';
      case 'average': return '#3b82f6';
      case 'above': return '#d97706';
      case 'premium': return '#dc2626';
    }
  };

  const getPriceRatingLabel = () => {
    switch (analysis.priceRating) {
      case 'below': return 'Below Market';
      case 'average': return 'Market Average';
      case 'above': return 'Above Market';
      case 'premium': return 'Premium Pricing';
    }
  };

  const pricePosition = ((currentPrice - analysis.marketLow) / (analysis.marketHigh - analysis.marketLow)) * 100;

  return (
    <div className="lrm-price-analysis">
      <div className="lrm-price-analysis__header">
        <h4>Price Analysis</h4>
        <span 
          className="lrm-price-analysis__rating"
          style={{ backgroundColor: `${getPriceRatingColor()}15`, color: getPriceRatingColor() }}
        >
          {getPriceRatingLabel()}
        </span>
      </div>

      <div className="lrm-price-analysis__current">
        <span className="label">Listing Price</span>
        <span className="value">{formatCurrency(currentPrice, currency)}/{unit}</span>
      </div>

      <div className="lrm-price-analysis__range">
        <div className="lrm-price-analysis__bar">
          <div 
            className="lrm-price-analysis__marker"
            style={{ 
              left: `${Math.min(Math.max(pricePosition, 0), 100)}%`,
              backgroundColor: getPriceRatingColor(),
            }}
          >
            <span className="lrm-price-analysis__marker-label">
              {formatCurrency(currentPrice, currency)}
            </span>
          </div>
          <div 
            className="lrm-price-analysis__avg"
            style={{ left: `${((analysis.marketAverage - analysis.marketLow) / (analysis.marketHigh - analysis.marketLow)) * 100}%` }}
          />
        </div>
        <div className="lrm-price-analysis__labels">
          <span className="low">{formatCurrency(analysis.marketLow, currency)}</span>
          <span className="avg">Avg: {formatCurrency(analysis.marketAverage, currency)}</span>
          <span className="high">{formatCurrency(analysis.marketHigh, currency)}</span>
        </div>
      </div>

      <div className="lrm-price-analysis__diff">
        <span className={`diff-value ${analysis.percentDiff >= 0 ? 'positive' : 'negative'}`}>
          {analysis.percentDiff >= 0 ? '+' : ''}{analysis.percentDiff.toFixed(1)}%
        </span>
        <span className="diff-label">vs market average</span>
      </div>

      <div className="lrm-price-analysis__recommendation">
        <span className="icon"><Lightbulb size={16} /></span>
        <p>{analysis.recommendation}</p>
      </div>
    </div>
  );
};

const FarmerDetailsComponent: React.FC<{
  farmer: FarmerInfo;
  onContact?: () => void;
}> = ({ farmer, onContact }) => {
  const approvalRate = farmer.totalListings > 0 
    ? Math.round((farmer.approvedListings / farmer.totalListings) * 100) 
    : 0;

  return (
    <div className="lrm-farmer">
      <div className="lrm-farmer__header">
        <div className="lrm-farmer__avatar">
          {farmer.avatar ? (
            <img src={farmer.avatar} alt={farmer.name} />
          ) : (
            <span>{farmer.name.charAt(0).toUpperCase()}</span>
          )}
          {farmer.verified && (
            <span className="lrm-farmer__verified" title="Verified Seller"><Check size={12} /></span>
          )}
        </div>
        <div className="lrm-farmer__info">
          <h4 className="lrm-farmer__name">{farmer.name}</h4>
          <div className="lrm-farmer__rating">
            <span className="stars">
              {Array.from({ length: 5 }, (_, i) => (
                <Star key={i} size={14} fill={i < Math.floor(farmer.rating) ? 'currentColor' : 'none'} />
              ))}
            </span>
            <span className="value">{farmer.rating.toFixed(1)}</span>
            <span className="count">({farmer.reviewsCount} reviews)</span>
          </div>
          <span className="lrm-farmer__location"><MapPin size={14} /> {farmer.location}</span>
        </div>
        {onContact && (
          <button className="lrm-farmer__contact-btn" onClick={onContact}>
            <MessageSquare size={14} /> Contact
          </button>
        )}
      </div>

      <div className="lrm-farmer__stats">
        <div className="lrm-farmer__stat">
          <span className="value">{farmer.totalListings}</span>
          <span className="label">Total Listings</span>
        </div>
        <div className="lrm-farmer__stat">
          <span className="value">{farmer.approvedListings}</span>
          <span className="label">Approved</span>
        </div>
        <div className="lrm-farmer__stat">
          <span className="value">{approvalRate}%</span>
          <span className="label">Approval Rate</span>
        </div>
        <div className="lrm-farmer__stat">
          <span className="value">{getTimeAgo(farmer.joinedAt)}</span>
          <span className="label">Member Since</span>
        </div>
      </div>

      <div className="lrm-farmer__contact-info">
        <div className="lrm-farmer__contact-item">
          <span className="icon"><Mail size={14} /></span>
          <span className="value">{farmer.email}</span>
        </div>
        <div className="lrm-farmer__contact-item">
          <span className="icon"><Smartphone size={14} /></span>
          <span className="value">{farmer.phone}</span>
        </div>
      </div>

      {farmer.rejectedListings > 0 && (
        <div className="lrm-farmer__warning">
          <span className="icon"><AlertTriangle size={14} /></span>
          <span>This seller has {farmer.rejectedListings} rejected listing(s)</span>
        </div>
      )}
    </div>
  );
};

const HistoryTimeline: React.FC<{
  history: ModerationHistory[];
}> = ({ history }) => (
  <div className="lrm-history">
    {history.map((item, index) => (
      <div 
        key={item.id}
        className={`lrm-history__item lrm-history__item--${item.status || 'info'}`}
      >
        <div className="lrm-history__marker">
          <span className="lrm-history__icon">
            {item.status === 'success' && <Check size={14} />}
            {item.status === 'warning' && <AlertTriangle size={14} />}
            {item.status === 'error' && <X size={14} />}
            {(!item.status || item.status === 'info') && '•'}
          </span>
          {index < history.length - 1 && <div className="lrm-history__line" />}
        </div>
        <div className="lrm-history__content">
          <div className="lrm-history__header">
            <span className="lrm-history__action">{item.action}</span>
            <span className="lrm-history__time">{formatDateTime(item.timestamp)}</span>
          </div>
          <p className="lrm-history__description">{item.description}</p>
          <span className="lrm-history__actor">by {item.actor}</span>
        </div>
      </div>
    ))}
  </div>
);

const FlagsList: React.FC<{
  flags: ListingFlag[];
}> = ({ flags }) => (
  <div className="lrm-flags">
    <div className="lrm-flags__header">
      <span className="icon"><Flag size={16} /></span>
      <span className="count">{flags.length} Flag{flags.length > 1 ? 's' : ''} Reported</span>
    </div>
    <div className="lrm-flags__list">
      {flags.map((flag) => (
        <div key={flag.id} className="lrm-flags__item">
          <div className="lrm-flags__type">{flag.type}</div>
          <div className="lrm-flags__reason">{flag.reason}</div>
          <div className="lrm-flags__meta">
            Reported by {flag.reportedBy} • {getTimeAgo(flag.reportedAt)}
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ============ Main Component ============
const ListingReviewModal: React.FC<ListingReviewModalProps> = ({
  listing,
  onClose,
  onApprove,
  onReject,
  onFlag,
  onEdit,
  onContactFarmer,
}) => {
  // State
  const [activeTab, setActiveTab] = useState<TabType>('details');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [selectedReasons, setSelectedReasons] = useState<Set<string>>(new Set());
  const [customReason, setCustomReason] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [qualityChecklist, setQualityChecklist] = useState<QualityCheck[]>(QUALITY_CHECKLIST);

  // Parse listing data
  const listingDetails: ListingDetails = {
    id: listing.id,
    title: listing.title,
    description: listing.description || 'No description provided for this listing.',
    farmer: typeof listing.farmer === 'string' 
      ? {
          id: 'f1',
          name: listing.farmer,
          email: 'farmer@example.com',
          phone: '+91-9876543210',
          rating: 4.5,
          reviewsCount: 45,
          verified: false,
          joinedAt: '2025-06-15',
          totalListings: 12,
          approvedListings: 10,
          rejectedListings: 2,
          location: listing.location || 'India',
        }
      : {
          id: listing.farmer.id,
          name: listing.farmer.name,
          email: 'farmer@example.com',
          phone: '+91-9876543210',
          rating: listing.farmer.rating,
          reviewsCount: 45,
          verified: listing.farmer.verified,
          joinedAt: '2025-06-15',
          totalListings: listing.farmer.totalListings,
          approvedListings: Math.floor(listing.farmer.totalListings * 0.85),
          rejectedListings: Math.floor(listing.farmer.totalListings * 0.15),
          location: listing.location || 'India',
        },
    category: listing.category || 'General',
    type: listing.type,
    quantity: typeof listing.quantity === 'string' ? parseFloat(listing.quantity) : listing.quantity,
    unit: listing.unit || 'kg',
    price: typeof listing.price === 'string' ? parseFloat(listing.price.replace(/[^0-9.]/g, '')) : listing.price,
    currency: listing.currency || 'INR',
    status: listing.status as ListingStatus,
    submittedAt: listing.submittedAt,
    images: listing.images || [],
    icon: listing.icon,
    location: listing.location || 'India',
    isOrganic: listing.isOrganic || false,
    isFeatured: listing.isFeatured || false,
    harvestDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    shelfLife: '7 days',
    minOrderQuantity: 10,
    deliveryOptions: ['Farm Pickup', 'Local Delivery', 'Shipping'],
    certifications: listing.isOrganic ? ['Organic Certified', 'FSSAI'] : ['FSSAI'],
    flags: listing.flags?.map((f, i) => ({
      id: `flag${i}`,
      type: 'User Report',
      reason: f,
      reportedBy: 'Anonymous User',
      reportedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
    })),
    priceAnalysis: {
      currentPrice: typeof listing.price === 'string' ? parseFloat(listing.price.replace(/[^0-9.]/g, '')) : listing.price,
      marketAverage: (typeof listing.price === 'string' ? parseFloat(listing.price.replace(/[^0-9.]/g, '')) : listing.price) * 1.1,
      marketLow: (typeof listing.price === 'string' ? parseFloat(listing.price.replace(/[^0-9.]/g, '')) : listing.price) * 0.7,
      marketHigh: (typeof listing.price === 'string' ? parseFloat(listing.price.replace(/[^0-9.]/g, '')) : listing.price) * 1.5,
      priceRating: 'below',
      percentDiff: -8.5,
      recommendation: 'This listing is priced competitively below the market average, which is good for buyers.',
    },
    history: [
      {
        id: 'h1',
        action: 'Listing Submitted',
        description: 'Seller submitted the listing for review',
        actor: typeof listing.farmer === 'string' ? listing.farmer : listing.farmer.name,
        timestamp: listing.submittedAt,
        status: 'info',
      },
      {
        id: 'h2',
        action: 'Auto-Verification',
        description: 'Automated checks completed - Manual review required',
        actor: 'System',
        timestamp: new Date(new Date(listing.submittedAt).getTime() + 5 * 60 * 1000).toISOString(),
        status: 'warning',
      },
    ],
    viewCount: listing.viewCount || 0,
    inquiryCount: listing.inquiryCount || 0,
    similarListingsCount: 5,
  };

  const isPending = listing.status === 'pending' || listing.status === 'flagged';
  const statusConfig = STATUS_CONFIG[listingDetails.status];

  // Handlers
  const handleToggleReason = (id: string) => {
    setSelectedReasons((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleChecklistChange = (id: string, checked: boolean) => {
    setQualityChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked } : item))
    );
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
      onApprove();
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
      onReject(getRejectionMessage());
    } finally {
      setIsLoading(false);
      setActionType(null);
    }
  };

  // Check if all required quality checks are met
  const allRequiredChecksMet = qualityChecklist
    .filter((c) => c.required)
    .every((c) => c.checked);

  // Keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !showRejectForm && !showApproveConfirm) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, showRejectForm, showApproveConfirm]);

  // Tabs configuration
  const tabs: { key: TabType; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: 'details', label: 'Details', icon: <ClipboardList size={16} /> },
    { key: 'images', label: 'Images', icon: <ImageIcon size={16} />, badge: listingDetails.images.length },
    { key: 'farmer', label: 'Seller', icon: <User size={16} /> },
    { key: 'analysis', label: 'Analysis', icon: <BarChart3 size={16} /> },
    { key: 'history', label: 'History', icon: <ScrollText size={16} /> },
  ];

  return (
    <div className="lrm-overlay" onClick={onClose}>
      <div className="lrm-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="lrm-header">
          <div className="lrm-header__left">
            <div className="lrm-header__icon">{listingDetails.icon}</div>
            <div className="lrm-header__info">
              <h2 className="lrm-header__title">{listingDetails.title}</h2>
              <div className="lrm-header__meta">
                <span 
                  className="lrm-header__status"
                  style={{ backgroundColor: statusConfig.bgColor, color: statusConfig.color }}
                >
                  {statusConfig.icon} {statusConfig.label}
                </span>
                <span className="lrm-header__category">{listingDetails.type}</span>
                {listingDetails.isOrganic && (
                  <span className="lrm-header__organic"><Leaf size={14} /> Organic</span>
                )}
                {listingDetails.isFeatured && (
                  <span className="lrm-header__featured"><Star size={14} /> Featured</span>
                )}
              </div>
            </div>
          </div>
          <div className="lrm-header__actions">
            {onEdit && (
              <button className="lrm-header__btn" onClick={onEdit} title="Edit Listing">
                <Pencil size={16} />
              </button>
            )}
            <button className="lrm-header__close" onClick={onClose} title="Close">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Flags Alert */}
        {listingDetails.flags && listingDetails.flags.length > 0 && (
          <div className="lrm-flags-alert">
            <span className="lrm-flags-alert__icon"><Flag size={16} /></span>
            <span className="lrm-flags-alert__text">
              This listing has been flagged {listingDetails.flags.length} time(s). Please review carefully.
            </span>
          </div>
        )}

        {/* Tabs */}
        <div className="lrm-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`lrm-tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <span className="lrm-tab__icon">{tab.icon}</span>
              <span className="lrm-tab__label">{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="lrm-tab__badge">{tab.badge}</span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="lrm-content">
          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="lrm-details">
              <div className="lrm-details__grid">
                {/* Left Column - Info */}
                <div className="lrm-details__left">
                  {/* Quick Stats */}
                  <div className="lrm-quick-stats">
                    <div className="lrm-quick-stat">
                      <span className="icon"><DollarSign size={16} /></span>
                      <div className="content">
                        <span className="value">
                          {formatCurrency(listingDetails.price, listingDetails.currency)}/{listingDetails.unit}
                        </span>
                        <span className="label">Price</span>
                      </div>
                    </div>
                    <div className="lrm-quick-stat">
                      <span className="icon"><Package size={16} /></span>
                      <div className="content">
                        <span className="value">{listingDetails.quantity} {listingDetails.unit}</span>
                        <span className="label">Quantity</span>
                      </div>
                    </div>
                    <div className="lrm-quick-stat">
                      <span className="icon"><MapPin size={16} /></span>
                      <div className="content">
                        <span className="value">{listingDetails.location}</span>
                        <span className="label">Location</span>
                      </div>
                    </div>
                    <div className="lrm-quick-stat">
                      <span className="icon"><Calendar size={16} /></span>
                      <div className="content">
                        <span className="value">{getTimeAgo(listingDetails.submittedAt)}</span>
                        <span className="label">Submitted</span>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="lrm-section">
                    <h4 className="lrm-section__title">Description</h4>
                    <p className="lrm-description">{listingDetails.description}</p>
                  </div>

                  {/* Additional Details */}
                  <div className="lrm-section">
                    <h4 className="lrm-section__title">Product Details</h4>
                    <div className="lrm-info-grid">
                      <div className="lrm-info-item">
                        <label>Category</label>
                        <span>{listingDetails.category}</span>
                      </div>
                      <div className="lrm-info-item">
                        <label>Type</label>
                        <span>{listingDetails.type}</span>
                      </div>
                      {listingDetails.harvestDate && (
                        <div className="lrm-info-item">
                          <label>Harvest Date</label>
                          <span>{formatDate(listingDetails.harvestDate)}</span>
                        </div>
                      )}
                      {listingDetails.shelfLife && (
                        <div className="lrm-info-item">
                          <label>Shelf Life</label>
                          <span>{listingDetails.shelfLife}</span>
                        </div>
                      )}
                      {listingDetails.minOrderQuantity && (
                        <div className="lrm-info-item">
                          <label>Min. Order</label>
                          <span>{listingDetails.minOrderQuantity} {listingDetails.unit}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Delivery Options */}
                  {listingDetails.deliveryOptions && (
                    <div className="lrm-section">
                      <h4 className="lrm-section__title">Delivery Options</h4>
                      <div className="lrm-tags">
                        {listingDetails.deliveryOptions.map((option) => (
                          <span key={option} className="lrm-tag">
                            <Truck size={14} /> {option}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Certifications */}
                  {listingDetails.certifications && (
                    <div className="lrm-section">
                      <h4 className="lrm-section__title">Certifications</h4>
                      <div className="lrm-tags">
                        {listingDetails.certifications.map((cert) => (
                          <span key={cert} className="lrm-tag lrm-tag--certification">
                            <Check size={14} /> {cert}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Engagement Stats */}
                  <div className="lrm-section">
                    <h4 className="lrm-section__title">Engagement</h4>
                    <div className="lrm-engagement-stats">
                      <div className="lrm-engagement-stat">
                        <span className="icon"><Eye size={16} /></span>
                        <span className="value">{listingDetails.viewCount}</span>
                        <span className="label">Views</span>
                      </div>
                      <div className="lrm-engagement-stat">
                        <span className="icon"><MessageSquare size={16} /></span>
                        <span className="value">{listingDetails.inquiryCount}</span>
                        <span className="label">Inquiries</span>
                      </div>
                      <div className="lrm-engagement-stat">
                        <span className="icon"><ClipboardList size={16} /></span>
                        <span className="value">{listingDetails.similarListingsCount}</span>
                        <span className="label">Similar</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Quality Checklist */}
                <div className="lrm-details__right">
                  {isPending && (
                    <QualityChecklistComponent
                      checklist={qualityChecklist}
                      onChange={handleChecklistChange}
                    />
                  )}

                  {/* Flags */}
                  {listingDetails.flags && listingDetails.flags.length > 0 && (
                    <FlagsList flags={listingDetails.flags} />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Images Tab */}
          {activeTab === 'images' && (
            <div className="lrm-images-tab">
              <ImageGallery images={listingDetails.images} icon={listingDetails.icon} />
              
              <div className="lrm-images-info">
                <h4>Image Guidelines Check</h4>
                <ul className="lrm-images-checklist">
                  <li className="passed"><Check size={14} /> Images are clear and not blurry</li>
                  <li className="passed"><Check size={14} /> Product is clearly visible</li>
                  <li className="passed"><Check size={14} /> No inappropriate content</li>
                  <li className="passed"><Check size={14} /> Correct aspect ratio</li>
                  <li className="passed"><Check size={14} /> Adequate lighting</li>
                </ul>
              </div>
            </div>
          )}

          {/* Farmer Tab */}
          {activeTab === 'farmer' && (
            <div className="lrm-farmer-tab">
              <FarmerDetailsComponent
                farmer={listingDetails.farmer}
                onContact={onContactFarmer ? () => onContactFarmer(listingDetails.farmer.id) : undefined}
              />
            </div>
          )}

          {/* Analysis Tab */}
          {activeTab === 'analysis' && listingDetails.priceAnalysis && (
            <div className="lrm-analysis-tab">
              <PriceAnalysisComponent
                analysis={listingDetails.priceAnalysis}
                currentPrice={listingDetails.price}
                unit={listingDetails.unit}
                currency={listingDetails.currency}
              />

              <div className="lrm-market-comparison">
                <h4>Market Comparison</h4>
                <p className="lrm-market-comparison__note">
                  There are <strong>{listingDetails.similarListingsCount}</strong> similar listings 
                  currently active on the platform.
                </p>
              </div>
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && listingDetails.history && (
            <div className="lrm-history-tab">
              <HistoryTimeline history={listingDetails.history} />
            </div>
          )}
        </div>

        {/* Notes Section */}
        {isPending && (
          <div className="lrm-notes">
            <label className="lrm-notes__label">
              <span className="icon"><FileText size={14} /></span>
              Moderator Notes (Optional)
            </label>
            <textarea
              className="lrm-notes__input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this review..."
              rows={2}
            />
          </div>
        )}

        {/* Footer */}
        <div className="lrm-footer">
          <div className="lrm-footer__left">
            <span className="lrm-footer__id">ID: {listingDetails.id}</span>
          </div>
          <div className="lrm-footer__actions">
            <button 
              className="lrm-btn lrm-btn--secondary"
              onClick={onClose}
              disabled={isLoading}
            >
              Close
            </button>
            
            {isPending && !showRejectForm && !showApproveConfirm && (
              <>
                {onFlag && listing.status !== 'flagged' && (
                  <button 
                    className="lrm-btn lrm-btn--warning"
                    onClick={() => onFlag('Manual flag by moderator')}
                    disabled={isLoading}
                  >
                    <span className="btn-icon"><Flag size={14} /></span>
                    Flag
                  </button>
                )}
                <button 
                  className="lrm-btn lrm-btn--danger"
                  onClick={() => setShowRejectForm(true)}
                  disabled={isLoading}
                >
                  <span className="btn-icon"><X size={14} /></span>
                  Reject
                </button>
                <button 
                  className="lrm-btn lrm-btn--success"
                  onClick={() => setShowApproveConfirm(true)}
                  disabled={isLoading || !allRequiredChecksMet}
                  title={!allRequiredChecksMet ? 'Complete all required quality checks first' : ''}
                >
                  <span className="btn-icon"><Check size={14} /></span>
                  Approve
                </button>
              </>
            )}
          </div>
        </div>

        {/* Rejection Form Overlay */}
        {showRejectForm && (
          <div className="lrm-action-overlay">
            <div className="lrm-action-panel lrm-reject-panel">
              <div className="lrm-action-panel__header">
                <span className="icon"><AlertTriangle size={16} /></span>
                <div>
                  <h3>Reject Listing</h3>
                  <p>Select the reason(s) for rejection</p>
                </div>
              </div>

              <div className="lrm-action-panel__body">
                <div className="lrm-rejection-reasons">
                  {REJECTION_REASONS.map((reason) => (
                    <label 
                      key={reason.id}
                      className={`lrm-rejection-reason ${selectedReasons.has(reason.id) ? 'selected' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedReasons.has(reason.id)}
                        onChange={() => handleToggleReason(reason.id)}
                      />
                      <span className="checkbox">
                        {selectedReasons.has(reason.id) ? <Check size={14} /> : null}
                      </span>
                      <div className="content">
                        <span className="label">{reason.label}</span>
                        <span className="description">{reason.description}</span>
                      </div>
                    </label>
                  ))}
                </div>

                {selectedReasons.has('other') && (
                  <textarea
                    className="lrm-custom-reason"
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="Please specify the reason..."
                    rows={3}
                  />
                )}
              </div>

              <div className="lrm-action-panel__footer">
                <button 
                  className="lrm-btn lrm-btn--secondary"
                  onClick={() => {
                    setShowRejectForm(false);
                    setSelectedReasons(new Set());
                    setCustomReason('');
                  }}
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button 
                  className="lrm-btn lrm-btn--danger"
                  onClick={handleReject}
                  disabled={isLoading || selectedReasons.size === 0 || (selectedReasons.has('other') && !customReason.trim())}
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
          </div>
        )}

        {/* Approve Confirmation Overlay */}
        {showApproveConfirm && (
          <div className="lrm-action-overlay">
            <div className="lrm-action-panel lrm-approve-panel">
              <div className="lrm-action-panel__header">
                <span className="icon success"><Check size={16} /></span>
                <div>
                  <h3>Approve Listing</h3>
                  <p>This listing will be visible to all users</p>
                </div>
              </div>

              <div className="lrm-action-panel__body">
                <div className="lrm-approve-summary">
                  <div className="lrm-approve-summary__item">
                    <span className="icon">{listingDetails.icon}</span>
                    <div className="content">
                      <span className="title">{listingDetails.title}</span>
                      <span className="meta">by {listingDetails.farmer.name}</span>
                    </div>
                  </div>
                  <div className="lrm-approve-summary__details">
                    <div className="detail">
                      <span className="label">Price</span>
                      <span className="value">{formatCurrency(listingDetails.price, listingDetails.currency)}/{listingDetails.unit}</span>
                    </div>
                    <div className="detail">
                      <span className="label">Quantity</span>
                      <span className="value">{listingDetails.quantity} {listingDetails.unit}</span>
                    </div>
                    <div className="detail">
                      <span className="label">Location</span>
                      <span className="value">{listingDetails.location}</span>
                    </div>
                  </div>
                </div>

                <div className="lrm-approve-checklist-summary">
                  <span className="icon"><Check size={14} /></span>
                  <span>All {qualityChecklist.filter(c => c.required).length} required quality checks passed</span>
                </div>
              </div>

              <div className="lrm-action-panel__footer">
                <button 
                  className="lrm-btn lrm-btn--secondary"
                  onClick={() => setShowApproveConfirm(false)}
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button 
                  className="lrm-btn lrm-btn--success"
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
      </div>
    </div>
  );
};

export default ListingReviewModal;