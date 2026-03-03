import React, { useState, useEffect, useCallback } from 'react';
import {
  Wheat, ShoppingCart, Truck, Heart, Check, Ban, Clock, Lock, Package,
  ClipboardList, User, DollarSign, Headphones, Star, Undo2, ArrowUp,
  ArrowDown, Pencil, FileText, MessageSquare, Mail, Phone, BarChart3,
  Monitor, Globe, MapPin, Zap, Target, X
} from 'lucide-react';
import { API_BASE_URL } from '../../../config/api';
import './UserDetailsModal.css';

// ============ Types ============
type UserRole = 'farmer' | 'customer' | 'driver' | 'ngo';
type UserStatus = 'active' | 'suspended' | 'pending';
type ActivityType = 'login' | 'order' | 'kyc' | 'profile' | 'transaction' | 'support' | 'review';

interface UserActivity {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, string | number>;
}

interface UserTransaction {
  id: string;
  type: 'purchase' | 'sale' | 'donation' | 'delivery' | 'refund';
  amount: number;
  currency: string;
  status: 'completed' | 'pending' | 'failed' | 'refunded';
  date: string;
  counterparty?: string;
  description: string;
}

interface UserStats {
  totalOrders: number;
  totalSpent: number;
  totalEarned: number;
  completedDeliveries?: number;
  donationsReceived?: number;
  donationsMade?: number;
  averageRating: number;
  reviewsCount: number;
  responseRate?: number;
  onTimeDeliveryRate?: number;
}

interface UserAddress {
  street: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isDefault?: boolean;
  label?: string;
}

interface UserDocument {
  id: string;
  type: string;
  name: string;
  status: 'verified' | 'pending' | 'rejected';
  uploadedAt: string;
}

interface UserDetails {
  id: string;
  name: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  role: UserRole;
  status: UserStatus;
  kycVerified: boolean;
  joinedAt: string;
  lastActive: string;
  avatar?: string;
  bio?: string;
  dateOfBirth?: string;
  gender?: string;
  language?: string;
  addresses?: UserAddress[];
  documents?: UserDocument[];
  stats?: UserStats;
  activities?: UserActivity[];
  transactions?: UserTransaction[];
  tags?: string[];
  notes?: string;
  referredBy?: string;
  referralCode?: string;
  deviceInfo?: {
    lastDevice: string;
    lastIP: string;
    lastLocation: string;
  };
}

interface UserDetailsModalProps {
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: string;
    status: string;
    kycVerified: boolean;
    joinedAt: string;
    lastActive: string;
    avatar?: string;
    totalTransactions?: number;
    rating?: number;
  };
  onClose: () => void;
  onEdit?: (user: UserDetails) => void;
  onSuspend?: (userId: string) => void;
  onActivate?: (userId: string) => void;
  onSendMessage?: (userId: string) => void;
  onViewKyc?: (userId: string) => void;
}

// ============ Constants ============
const ROLE_CONFIG: Record<UserRole, { icon: React.ReactNode; color: string; label: string; bgColor: string }> = {
  farmer: { icon: <Wheat size={16} />, color: '#16a34a', label: 'Farmer', bgColor: '#dcfce7' },
  customer: { icon: <ShoppingCart size={16} />, color: '#3b82f6', label: 'Customer', bgColor: '#dbeafe' },
  driver: { icon: <Truck size={16} />, color: '#f59e0b', label: 'Driver', bgColor: '#fef3c7' },
  ngo: { icon: <Heart size={16} />, color: '#8b5cf6', label: 'NGO', bgColor: '#ede9fe' },
};

const STATUS_CONFIG: Record<UserStatus, { icon: React.ReactNode; color: string; label: string; bgColor: string }> = {
  active: { icon: <Check size={16} />, color: '#16a34a', label: 'Active', bgColor: '#dcfce7' },
  suspended: { icon: <Ban size={16} />, color: '#dc2626', label: 'Suspended', bgColor: '#fee2e2' },
  pending: { icon: <Clock size={16} />, color: '#d97706', label: 'Pending', bgColor: '#fef3c7' },
};

const ACTIVITY_CONFIG: Record<ActivityType, { icon: React.ReactNode; color: string }> = {
  login: { icon: <Lock size={16} />, color: '#6b7280' },
  order: { icon: <Package size={16} />, color: '#3b82f6' },
  kyc: { icon: <ClipboardList size={16} />, color: '#8b5cf6' },
  profile: { icon: <User size={16} />, color: '#06b6d4' },
  transaction: { icon: <DollarSign size={16} />, color: '#16a34a' },
  support: { icon: <Headphones size={16} />, color: '#f59e0b' },
  review: { icon: <Star size={16} />, color: '#eab308' },
};

const TRANSACTION_CONFIG: Record<UserTransaction['type'], { icon: React.ReactNode; color: string }> = {
  purchase: { icon: <ShoppingCart size={16} />, color: '#3b82f6' },
  sale: { icon: <DollarSign size={16} />, color: '#16a34a' },
  donation: { icon: <Heart size={16} />, color: '#8b5cf6' },
  delivery: { icon: <Truck size={16} />, color: '#f59e0b' },
  refund: { icon: <Undo2 size={16} />, color: '#dc2626' },
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

const formatDate = (dateString: string, options?: Intl.DateTimeFormatOptions): string => {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };
  return new Date(dateString).toLocaleDateString('en-US', options || defaultOptions);
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
const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: { value: number; isPositive: boolean };
  color?: string;
}> = ({ icon, label, value, trend, color }) => (
  <div className="udm-stat-card">
    <div className="udm-stat-card__icon" style={{ backgroundColor: color ? `${color}15` : undefined }}>
      <span style={{ color }}>{icon}</span>
    </div>
    <div className="udm-stat-card__content">
      <span className="udm-stat-card__value">{value}</span>
      <span className="udm-stat-card__label">{label}</span>
      {trend && (
        <span className={`udm-stat-card__trend ${trend.isPositive ? 'positive' : 'negative'}`}>
          {trend.isPositive ? <ArrowUp size={12} /> : <ArrowDown size={12} />} {Math.abs(trend.value)}%
        </span>
      )}
    </div>
  </div>
);

const RatingStars: React.FC<{ rating: number; maxRating?: number; showValue?: boolean }> = ({
  rating,
  maxRating = 5,
  showValue = true,
}) => (
  <div className="udm-rating">
    <div className="udm-rating__stars">
      {Array.from({ length: maxRating }, (_, i) => (
        <span
          key={i}
          className={`udm-rating__star ${i < Math.floor(rating) ? 'filled' : i < rating ? 'half' : ''}`}
        >
          <Star size={16} />
        </span>
      ))}
    </div>
    {showValue && <span className="udm-rating__value">{rating.toFixed(1)}</span>}
  </div>
);

const ActivityItem: React.FC<{ activity: UserActivity }> = ({ activity }) => {
  const config = ACTIVITY_CONFIG[activity.type];
  
  return (
    <div className="udm-activity-item">
      <div className="udm-activity-item__icon" style={{ backgroundColor: `${config.color}15` }}>
        <span>{config.icon}</span>
      </div>
      <div className="udm-activity-item__content">
        <div className="udm-activity-item__header">
          <span className="udm-activity-item__title">{activity.title}</span>
          <span className="udm-activity-item__time">{getTimeAgo(activity.timestamp)}</span>
        </div>
        <p className="udm-activity-item__description">{activity.description}</p>
        {activity.metadata && (
          <div className="udm-activity-item__metadata">
            {Object.entries(activity.metadata).map(([key, value]) => (
              <span key={key} className="udm-activity-item__meta-tag">
                {key}: {value}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const TransactionItem: React.FC<{ transaction: UserTransaction }> = ({ transaction }) => {
  const config = TRANSACTION_CONFIG[transaction.type];
  const isCredit = ['sale', 'refund'].includes(transaction.type);
  
  return (
    <div className="udm-transaction-item">
      <div className="udm-transaction-item__icon" style={{ backgroundColor: `${config.color}15` }}>
        <span>{config.icon}</span>
      </div>
      <div className="udm-transaction-item__content">
        <div className="udm-transaction-item__header">
          <span className="udm-transaction-item__title">{transaction.description}</span>
          <span className={`udm-transaction-item__amount ${isCredit ? 'credit' : 'debit'}`}>
            {isCredit ? '+' : '-'}{formatCurrency(transaction.amount, transaction.currency)}
          </span>
        </div>
        <div className="udm-transaction-item__meta">
          <span className={`udm-transaction-item__status status--${transaction.status}`}>
            {transaction.status}
          </span>
          {transaction.counterparty && (
            <span className="udm-transaction-item__counterparty">
              {isCredit ? 'From' : 'To'}: {transaction.counterparty}
            </span>
          )}
          <span className="udm-transaction-item__date">{formatDate(transaction.date)}</span>
        </div>
      </div>
    </div>
  );
};

const AddressCard: React.FC<{ address: UserAddress; onEdit?: () => void }> = ({ address, onEdit }) => (
  <div className={`udm-address-card ${address.isDefault ? 'default' : ''}`}>
    {address.isDefault && <span className="udm-address-card__badge">Default</span>}
    {address.label && <span className="udm-address-card__label">{address.label}</span>}
    <p className="udm-address-card__text">
      {address.street}
      <br />
      {address.city}, {address.state} {address.pincode}
      <br />
      {address.country}
    </p>
    {onEdit && (
      <button className="udm-address-card__edit" onClick={onEdit}>
        <Pencil size={14} /> Edit
      </button>
    )}
  </div>
);

const DocumentItem: React.FC<{ document: UserDocument }> = ({ document }) => (
  <div className={`udm-document-item status--${document.status}`}>
    <div className="udm-document-item__icon"><FileText size={16} /></div>
    <div className="udm-document-item__content">
      <span className="udm-document-item__name">{document.name}</span>
      <span className="udm-document-item__type">{document.type}</span>
    </div>
    <div className="udm-document-item__status">
      {document.status === 'verified' && <span className="status-verified"><Check size={14} /> Verified</span>}
      {document.status === 'pending' && <span className="status-pending"><Clock size={14} /> Pending</span>}
      {document.status === 'rejected' && <span className="status-rejected"><X size={14} /> Rejected</span>}
    </div>
  </div>
);

const QuickActionButton: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'primary' | 'danger' | 'success';
  disabled?: boolean;
}> = ({ icon, label, onClick, variant = 'default', disabled }) => (
  <button
    className={`udm-quick-action udm-quick-action--${variant}`}
    onClick={onClick}
    disabled={disabled}
  >
    <span className="udm-quick-action__icon">{icon}</span>
    <span className="udm-quick-action__label">{label}</span>
  </button>
);

// ============ Main Component ============
const UserDetailsModal: React.FC<UserDetailsModalProps> = ({
  user,
  onClose,
  onEdit,
  onSuspend,
  onActivate,
  onSendMessage,
  onViewKyc,
}) => {
  // State
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'transactions' | 'documents'>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [showActions, setShowActions] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Load user details
  useEffect(() => {
    const loadUserDetails = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/api/admin/users/${user.id}`);
        if (response.ok) {
          const details = await response.json();
          setUserDetails(details);
        } else {
          // Fallback: use basic user info if API fails
          setUserDetails({
            ...user,
            role: user.role as UserRole,
            status: user.status as UserStatus,
          } as UserDetails);
        }
      } catch (error) {
        console.error('Failed to load user details:', error);
        setUserDetails({
          ...user,
          role: user.role as UserRole,
          status: user.status as UserStatus,
        } as UserDetails);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserDetails();
  }, [user]);

  // Copy to clipboard
  const copyToClipboard = useCallback((text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }, []);

  // Keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const roleConfig = ROLE_CONFIG[user.role as UserRole] || ROLE_CONFIG.customer;
  const statusConfig = STATUS_CONFIG[user.status as UserStatus] || STATUS_CONFIG.pending;

  // Tabs configuration
  const tabs: Array<{ key: 'overview' | 'activity' | 'transactions' | 'documents'; label: string; icon: React.ReactNode }> = [
    { key: 'overview', label: 'Overview', icon: <ClipboardList size={16} /> },
    { key: 'activity', label: 'Activity', icon: <BarChart3 size={16} /> },
    { key: 'transactions', label: 'Transactions', icon: <DollarSign size={16} /> },
    { key: 'documents', label: 'Documents', icon: <FileText size={16} /> },
  ];

  return (
    <div className="udm-overlay" onClick={onClose}>
      <div className="udm-modal" onClick={(e) => e.stopPropagation()}>
        {/* Loading State */}
        {isLoading && (
          <div className="udm-loading">
            <div className="udm-loading__spinner" />
            <span>Loading user details...</span>
          </div>
        )}

        {/* Header */}
        <div className="udm-header">
          <div className="udm-header__user">
            <div className="udm-header__avatar" style={{ backgroundColor: roleConfig.color }}>
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} />
              ) : (
                <span>{user.name.charAt(0).toUpperCase()}</span>
              )}
              <span
                className="udm-header__avatar-status"
                style={{ backgroundColor: statusConfig.color }}
                title={statusConfig.label}
              />
            </div>
            <div className="udm-header__info">
              <div className="udm-header__name-row">
                <h2 className="udm-header__name">{user.name}</h2>
                {userDetails?.tags?.map((tag) => (
                  <span key={tag} className="udm-header__tag">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="udm-header__meta">
                <span
                  className="udm-header__role"
                  style={{ backgroundColor: roleConfig.bgColor, color: roleConfig.color }}
                >
                  {roleConfig.icon} {roleConfig.label}
                </span>
                <span
                  className="udm-header__status"
                  style={{ backgroundColor: statusConfig.bgColor, color: statusConfig.color }}
                >
                  {statusConfig.icon} {statusConfig.label}
                </span>
                <span className="udm-header__kyc">
                  {user.kycVerified ? (
                    <span className="kyc-verified"><Check size={14} /> KYC Verified</span>
                  ) : (
                    <span className="kyc-pending"><Clock size={14} /> KYC Pending</span>
                  )}
                </span>
              </div>
              <div className="udm-header__dates">
                <span>Joined {formatDate(user.joinedAt)}</span>
                <span className="udm-header__dot">•</span>
                <span>Last active {getTimeAgo(user.lastActive)}</span>
              </div>
            </div>
          </div>
          
          <div className="udm-header__actions">
            <button
              className="udm-header__action-btn"
              onClick={() => setShowActions(!showActions)}
              title="More Actions"
            >
              ⋮
            </button>
            <button className="udm-header__close" onClick={onClose} title="Close">
              <X size={16} />
            </button>
            
            {showActions && (
              <div className="udm-header__dropdown">
                {onEdit && (
                  <button onClick={() => { onEdit(userDetails!); setShowActions(false); }}>
                    <Pencil size={14} /> Edit User
                  </button>
                )}
                {onSendMessage && (
                  <button onClick={() => { onSendMessage(user.id); setShowActions(false); }}>
                    <MessageSquare size={14} /> Send Message
                  </button>
                )}
                {onViewKyc && (
                  <button onClick={() => { onViewKyc(user.id); setShowActions(false); }}>
                    <ClipboardList size={14} /> View KYC
                  </button>
                )}
                <div className="dropdown-divider" />
                {user.status === 'suspended' && onActivate ? (
                  <button className="action-activate" onClick={() => { onActivate(user.id); setShowActions(false); }}>
                    <Check size={14} /> Activate User
                  </button>
                ) : onSuspend && (
                  <button className="action-suspend" onClick={() => { onSuspend(user.id); setShowActions(false); }}>
                    <Ban size={14} /> Suspend User
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="udm-quick-actions">
          {onSendMessage && (
            <QuickActionButton
              icon={<MessageSquare size={16} />}
              label="Message"
              onClick={() => onSendMessage(user.id)}
            />
          )}
          <QuickActionButton
            icon={<Mail size={16} />}
            label="Email"
            onClick={() => window.location.href = `mailto:${user.email}`}
          />
          <QuickActionButton
            icon={<Phone size={16} />}
            label="Call"
            onClick={() => window.location.href = `tel:${user.phone}`}
          />
          {!user.kycVerified && onViewKyc && (
            <QuickActionButton
              icon={<ClipboardList size={16} />}
              label="Review KYC"
              onClick={() => onViewKyc(user.id)}
              variant="primary"
            />
          )}
          {onEdit && (
            <QuickActionButton
              icon={<Pencil size={16} />}
              label="Edit"
              onClick={() => onEdit(userDetails!)}
            />
          )}
        </div>

        {/* Tabs */}
        <div className="udm-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`udm-tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <span className="udm-tab__icon">{tab.icon}</span>
              <span className="udm-tab__label">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="udm-content">
          {/* Overview Tab */}
          {activeTab === 'overview' && userDetails && (
            <div className="udm-overview">
              {/* Stats Section */}
              {userDetails.stats && (
                <div className="udm-section">
                  <h3 className="udm-section__title">Statistics</h3>
                  <div className="udm-stats-grid">
                    <StatCard
                      icon={<Package size={16} />}
                      label="Total Orders"
                      value={userDetails.stats.totalOrders}
                      color="#3b82f6"
                    />
                    <StatCard
                      icon={<DollarSign size={16} />}
                      label="Total Earned"
                      value={formatCurrency(userDetails.stats.totalEarned)}
                      color="#16a34a"
                    />
                    <StatCard
                      icon={<Star size={16} />}
                      label="Rating"
                      value={userDetails.stats.averageRating.toFixed(1)}
                      color="#eab308"
                    />
                    <StatCard
                      icon={<MessageSquare size={16} />}
                      label="Reviews"
                      value={userDetails.stats.reviewsCount}
                      color="#8b5cf6"
                    />
                    {userDetails.stats.responseRate && (
                      <StatCard
                        icon={<Zap size={16} />}
                        label="Response Rate"
                        value={`${userDetails.stats.responseRate}%`}
                        color="#06b6d4"
                      />
                    )}
                    {userDetails.stats.onTimeDeliveryRate && (
                      <StatCard
                        icon={<Target size={16} />}
                        label="On-Time Rate"
                        value={`${userDetails.stats.onTimeDeliveryRate}%`}
                        color="#16a34a"
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Contact Information */}
              <div className="udm-section">
                <h3 className="udm-section__title">Contact Information</h3>
                <div className="udm-info-grid">
                  <div className="udm-info-item">
                    <label>Email</label>
                    <div className="udm-info-value">
                      <span>{user.email}</span>
                      <button
                        className="udm-copy-btn"
                        onClick={() => copyToClipboard(user.email, 'email')}
                        title="Copy email"
                      >
                        {copiedField === 'email' ? <Check size={14} /> : <ClipboardList size={14} />}
                      </button>
                    </div>
                  </div>
                  <div className="udm-info-item">
                    <label>Phone</label>
                    <div className="udm-info-value">
                      <span>{user.phone}</span>
                      <button
                        className="udm-copy-btn"
                        onClick={() => copyToClipboard(user.phone, 'phone')}
                        title="Copy phone"
                      >
                        {copiedField === 'phone' ? <Check size={14} /> : <ClipboardList size={14} />}
                      </button>
                    </div>
                  </div>
                  {userDetails.alternatePhone && (
                    <div className="udm-info-item">
                      <label>Alternate Phone</label>
                      <span>{userDetails.alternatePhone}</span>
                    </div>
                  )}
                  {userDetails.dateOfBirth && (
                    <div className="udm-info-item">
                      <label>Date of Birth</label>
                      <span>{formatDate(userDetails.dateOfBirth)}</span>
                    </div>
                  )}
                  {userDetails.gender && (
                    <div className="udm-info-item">
                      <label>Gender</label>
                      <span>{userDetails.gender}</span>
                    </div>
                  )}
                  {userDetails.language && (
                    <div className="udm-info-item">
                      <label>Languages</label>
                      <span>{userDetails.language}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Bio */}
              {userDetails.bio && (
                <div className="udm-section">
                  <h3 className="udm-section__title">Bio</h3>
                  <p className="udm-bio">{userDetails.bio}</p>
                </div>
              )}

              {/* Addresses */}
              {userDetails.addresses && userDetails.addresses.length > 0 && (
                <div className="udm-section">
                  <h3 className="udm-section__title">Addresses</h3>
                  <div className="udm-addresses">
                    {userDetails.addresses.map((address, index) => (
                      <AddressCard key={index} address={address} />
                    ))}
                  </div>
                </div>
              )}

              {/* Device Info */}
              {userDetails.deviceInfo && (
                <div className="udm-section">
                  <h3 className="udm-section__title">Last Login Info</h3>
                  <div className="udm-device-info">
                    <div className="udm-device-info__item">
                      <span className="udm-device-info__icon"><Monitor size={16} /></span>
                      <div>
                        <label>Device</label>
                        <span>{userDetails.deviceInfo.lastDevice}</span>
                      </div>
                    </div>
                    <div className="udm-device-info__item">
                      <span className="udm-device-info__icon"><Globe size={16} /></span>
                      <div>
                        <label>IP Address</label>
                        <span>{userDetails.deviceInfo.lastIP}</span>
                      </div>
                    </div>
                    <div className="udm-device-info__item">
                      <span className="udm-device-info__icon"><MapPin size={16} /></span>
                      <div>
                        <label>Location</label>
                        <span>{userDetails.deviceInfo.lastLocation}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Admin Notes */}
              {userDetails.notes && (
                <div className="udm-section">
                  <h3 className="udm-section__title">Admin Notes</h3>
                  <div className="udm-admin-notes">
                    <span className="udm-admin-notes__icon"><Pencil size={16} /></span>
                    <p>{userDetails.notes}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && userDetails && (
            <div className="udm-activity">
              {userDetails.activities && userDetails.activities.length > 0 ? (
                <div className="udm-activity-list">
                  {userDetails.activities.map((activity) => (
                    <ActivityItem key={activity.id} activity={activity} />
                  ))}
                </div>
              ) : (
                <div className="udm-empty-state">
                  <span className="udm-empty-state__icon"><BarChart3 size={20} /></span>
                  <h4>No Recent Activity</h4>
                  <p>This user hasn't performed any tracked activities yet.</p>
                </div>
              )}
            </div>
          )}

          {/* Transactions Tab */}
          {activeTab === 'transactions' && userDetails && (
            <div className="udm-transactions">
              {/* Transaction Summary */}
              {userDetails.stats && (
                <div className="udm-transaction-summary">
                  <div className="udm-transaction-summary__item">
                    <span className="summary-label">Total Earned</span>
                    <span className="summary-value positive">
                      {formatCurrency(userDetails.stats.totalEarned)}
                    </span>
                  </div>
                  <div className="udm-transaction-summary__item">
                    <span className="summary-label">Total Spent</span>
                    <span className="summary-value negative">
                      {formatCurrency(userDetails.stats.totalSpent)}
                    </span>
                  </div>
                  <div className="udm-transaction-summary__item">
                    <span className="summary-label">Net Balance</span>
                    <span className="summary-value">
                      {formatCurrency(userDetails.stats.totalEarned - userDetails.stats.totalSpent)}
                    </span>
                  </div>
                </div>
              )}

              {userDetails.transactions && userDetails.transactions.length > 0 ? (
                <div className="udm-transaction-list">
                  {userDetails.transactions.map((transaction) => (
                    <TransactionItem key={transaction.id} transaction={transaction} />
                  ))}
                </div>
              ) : (
                <div className="udm-empty-state">
                  <span className="udm-empty-state__icon"><DollarSign size={20} /></span>
                  <h4>No Transactions</h4>
                  <p>This user hasn't made any transactions yet.</p>
                </div>
              )}
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && userDetails && (
            <div className="udm-documents">
              {/* KYC Status Banner */}
              <div className={`udm-kyc-banner ${user.kycVerified ? 'verified' : 'pending'}`}>
                <div className="udm-kyc-banner__icon">
                  {user.kycVerified ? <Check size={20} /> : <Clock size={20} />}
                </div>
                <div className="udm-kyc-banner__content">
                  <h4>{user.kycVerified ? 'KYC Verified' : 'KYC Verification Pending'}</h4>
                  <p>
                    {user.kycVerified
                      ? 'All documents have been verified and approved.'
                      : 'User documents are awaiting verification.'}
                  </p>
                </div>
                {!user.kycVerified && onViewKyc && (
                  <button className="udm-kyc-banner__action" onClick={() => onViewKyc(user.id)}>
                    Review KYC
                  </button>
                )}
              </div>

              {/* Documents List */}
              {userDetails.documents && userDetails.documents.length > 0 ? (
                <div className="udm-document-list">
                  {userDetails.documents.map((doc) => (
                    <DocumentItem key={doc.id} document={doc} />
                  ))}
                </div>
              ) : (
                <div className="udm-empty-state">
                  <span className="udm-empty-state__icon"><FileText size={20} /></span>
                  <h4>No Documents</h4>
                  <p>No documents have been uploaded for this user.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="udm-footer">
          <div className="udm-footer__info">
            <span>User ID: {user.id}</span>
            {userDetails?.referralCode && (
              <>
                <span className="udm-footer__dot">•</span>
                <span>Referral: {userDetails.referralCode}</span>
              </>
            )}
          </div>
          <div className="udm-footer__actions">
            <button className="udm-btn udm-btn--secondary" onClick={onClose}>
              Close
            </button>
            {onEdit && userDetails && (
              <button className="udm-btn udm-btn--primary" onClick={() => onEdit(userDetails)}>
                Edit User
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDetailsModal;