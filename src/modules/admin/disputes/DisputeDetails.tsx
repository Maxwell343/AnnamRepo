import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Apple, Truck, CreditCard, Package, User, HeartCrack, HelpCircle,
  Circle, Search, Clock, CheckCircle, AlertTriangle, Lock,
  Handshake, Car, Wheat, Factory, Building2, Settings,
  MessageSquare, Wrench, RefreshCw, Paperclip, XCircle, Info, X,
  Target, Megaphone, Check, Mail, Phone, DollarSign, Banknote,
  Calendar, Link2, Download, Trash2, ClipboardList, Pencil,
  ArrowLeft, Send, Upload, FileText, Eye, Pin, BarChart3, Zap,
  Image, AlertOctagon
} from 'lucide-react';
import './DisputeDetails.css';

/* ─── Types ─── */
type DisputePriority = 'critical' | 'high' | 'medium' | 'low';
type DisputeStatus = 'open' | 'investigating' | 'awaiting_response' | 'resolved' | 'escalated' | 'closed';
type DisputeCategory = 'quality' | 'delivery' | 'payment' | 'quantity' | 'no_show' | 'damage' | 'other';
type EventType = 'system' | 'message' | 'action' | 'escalation' | 'resolution' | 'attachment' | 'status_change';
type PartyRole = 'customer' | 'ngo' | 'driver' | 'farmer' | 'vendor' | 'platform';
type ActiveTab = 'timeline' | 'evidence' | 'notes' | 'related';

interface TimelineEvent {
  id: string;
  type: EventType;
  actor: string;
  actorRole?: PartyRole;
  actorAvatar?: string;
  content: string;
  timestamp: string;
  isInternal?: boolean;
  attachments?: { name: string; type: string; size: string }[];
  metadata?: Record<string, string>;
}

interface Attachment {
  id: string;
  name: string;
  type: 'image' | 'document' | 'video';
  size: string;
  uploadedBy: string;
  uploadedAt: string;
  url: string;
  thumbnail?: React.ReactNode;
}

interface InternalNote {
  id: string;
  author: string;
  content: string;
  timestamp: string;
  isPinned?: boolean;
}

interface RelatedDispute {
  id: string;
  disputeId: string;
  subject: string;
  status: DisputeStatus;
  date: string;
}

interface Party {
  name: string;
  role: PartyRole;
  email: string;
  phone: string;
  avatar?: string;
  rating?: number;
  totalOrders?: number;
  pastDisputes: number;
  resolvedDisputes: number;
  memberSince: string;
  verified: boolean;
}

interface DisputeData {
  id: string;
  disputeId: string;
  orderId: string;
  orderAmount: number;
  subject: string;
  description: string;
  category: DisputeCategory;
  priority: DisputePriority;
  status: DisputeStatus;
  createdAt: string;
  updatedAt: string;
  slaDeadline: string;
  assignedTo?: string;
  complainant: Party;
  respondent: Party;
  refundRequested?: number;
  refundApproved?: number;
  tags: string[];
}

interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
}

/* ─── Mock Data ─── */
const mockDispute: DisputeData = {
  id: '1',
  disputeId: 'DSP-401',
  orderId: 'ORD-2389',
  orderAmount: 2450,
  subject: 'Received rotten vegetables',
  description: 'I ordered fresh vegetables for an event but received rotten tomatoes and wilted spinach. The quality was terrible and completely unfit for consumption. This caused significant inconvenience as I had to rush to find alternatives.',
  category: 'quality',
  priority: 'high',
  status: 'investigating',
  createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  updatedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  slaDeadline: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
  assignedTo: 'Priya M.',
  complainant: {
    name: 'Ravi Sharma',
    role: 'customer',
    email: 'ravi.sharma@email.com',
    phone: '+91 98765 43210',
    rating: 4.8,
    totalOrders: 23,
    pastDisputes: 0,
    resolvedDisputes: 0,
    memberSince: '2023-06-15',
    verified: true,
  },
  respondent: {
    name: 'Green Valley Farm',
    role: 'farmer',
    email: 'contact@greenvalley.com',
    phone: '+91 98765 43211',
    rating: 4.2,
    totalOrders: 156,
    pastDisputes: 3,
    resolvedDisputes: 2,
    memberSince: '2022-03-10',
    verified: true,
  },
  refundRequested: 2450,
  tags: ['quality', 'urgent', 'first_dispute'],
};

const mockTimeline: TimelineEvent[] = [
  {
    id: '1',
    type: 'system',
    actor: 'System',
    content: 'Dispute DSP-401 created for order ORD-2389',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    metadata: { orderId: 'ORD-2389', amount: '₹2,450' },
  },
  {
    id: '2',
    type: 'message',
    actor: 'Ravi Sharma',
    actorRole: 'customer',
    content: 'I received rotten tomatoes and wilted spinach. The quality was terrible and unfit for consumption. Attaching photos as evidence.',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000 + 5 * 60 * 1000).toISOString(),
    attachments: [
      { name: 'rotten_tomatoes.jpg', type: 'image', size: '2.4 MB' },
      { name: 'wilted_spinach.jpg', type: 'image', size: '1.8 MB' },
    ],
  },
  {
    id: '3',
    type: 'action',
    actor: 'Support Bot',
    actorRole: 'platform',
    content: 'Auto-assigned to investigation queue based on category: Quality Issue',
    timestamp: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '4',
    type: 'status_change',
    actor: 'Priya M.',
    actorRole: 'platform',
    content: 'Changed status from "Open" to "Investigating"',
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    metadata: { from: 'open', to: 'investigating' },
  },
  {
    id: '5',
    type: 'message',
    actor: 'Priya M.',
    actorRole: 'platform',
    content: 'Hello Ravi, thank you for reporting this issue. We\'re looking into it and have contacted the supplier for clarification.',
    timestamp: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
  },
  {
    id: '6',
    type: 'message',
    actor: 'Green Valley Farm',
    actorRole: 'farmer',
    content: 'The produce was fresh when dispatched. There may have been a delay in delivery causing spoilage. We can provide dispatch photos if needed.',
    timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
  {
    id: '7',
    type: 'action',
    actor: 'Priya M.',
    actorRole: 'platform',
    content: 'Requested delivery timeline from logistics',
    timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    isInternal: true,
  },
  {
    id: '8',
    type: 'escalation',
    actor: 'System',
    content: 'Auto-escalated: Approaching SLA deadline (30 minutes remaining)',
    timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    metadata: { reason: 'SLA Warning', deadline: '30 min' },
  },
];

const mockAttachments: Attachment[] = [
  { id: '1', name: 'rotten_tomatoes.jpg', type: 'image', size: '2.4 MB', uploadedBy: 'Ravi Sharma', uploadedAt: mockTimeline[1].timestamp, url: '#', thumbnail: <Image size={20} /> },
  { id: '2', name: 'wilted_spinach.jpg', type: 'image', size: '1.8 MB', uploadedBy: 'Ravi Sharma', uploadedAt: mockTimeline[1].timestamp, url: '#', thumbnail: <Image size={20} /> },
  { id: '3', name: 'order_receipt.pdf', type: 'document', size: '156 KB', uploadedBy: 'System', uploadedAt: mockDispute.createdAt, url: '#' },
];

const mockNotes: InternalNote[] = [
  { id: '1', author: 'Priya M.', content: 'Customer seems genuine. Photos clearly show spoiled produce. Recommend partial refund.', timestamp: new Date(Date.now() - 40 * 60 * 1000).toISOString(), isPinned: true },
  { id: '2', author: 'System', content: 'Delivery log shows package was in transit for 6 hours (normally 2 hours). Weather delay reported.', timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString() },
];

const mockRelatedDisputes: RelatedDispute[] = [
  { id: '1', disputeId: 'DSP-312', subject: 'Delayed delivery', status: 'resolved', date: '2024-01-05' },
  { id: '2', disputeId: 'DSP-287', subject: 'Wrong items received', status: 'closed', date: '2023-12-20' },
];

/* ─── Helpers ─── */
const formatCurrency = (val: number): string =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(val);

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const formatTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

const formatDateTime = (iso: string): string =>
  `${formatDate(iso)} at ${formatTime(iso)}`;

const formatRelativeTime = (iso: string): string => {
  const now = new Date();
  const date = new Date(iso);
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hr${hours > 1 ? 's' : ''} ago`;
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  return formatDate(iso);
};

const getSLAStatus = (deadline: string): { status: 'ok' | 'warning' | 'critical' | 'breach'; timeLeft: string; percent: number } => {
  const now = new Date();
  const sla = new Date(deadline);
  const diff = sla.getTime() - now.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);

  if (diff < 0) return { status: 'breach', timeLeft: 'Breached', percent: 0 };
  if (minutes < 30) return { status: 'critical', timeLeft: `${minutes}m left`, percent: Math.max((minutes / 30) * 25, 5) };
  if (hours < 2) return { status: 'warning', timeLeft: `${minutes}m left`, percent: 25 + ((minutes - 30) / 90) * 25 };
  return { status: 'ok', timeLeft: `${hours}h ${minutes % 60}m left`, percent: 50 + Math.min((hours / 24) * 50, 50) };
};

const categoryConfig: Record<DisputeCategory, { icon: React.ReactNode; label: string; color: string }> = {
  quality: { icon: <Apple size={16} />, label: 'Quality Issue', color: '#ef4444' },
  delivery: { icon: <Truck size={16} />, label: 'Delivery Issue', color: '#3b82f6' },
  payment: { icon: <CreditCard size={16} />, label: 'Payment Issue', color: '#16a34a' },
  quantity: { icon: <Package size={16} />, label: 'Quantity Issue', color: '#f59e0b' },
  no_show: { icon: <User size={16} />, label: 'No-Show', color: '#8b5cf6' },
  damage: { icon: <HeartCrack size={16} />, label: 'Damage', color: '#ec4899' },
  other: { icon: <HelpCircle size={16} />, label: 'Other', color: '#6b7280' },
};

const priorityConfig: Record<DisputePriority, { icon: React.ReactNode; label: string; color: string }> = {
  critical: { icon: <Circle size={16} fill="#dc2626" color="#dc2626" />, label: 'Critical', color: '#dc2626' },
  high: { icon: <Circle size={16} fill="#f59e0b" color="#f59e0b" />, label: 'High', color: '#f59e0b' },
  medium: { icon: <Circle size={16} fill="#eab308" color="#eab308" />, label: 'Medium', color: '#eab308' },
  low: { icon: <Circle size={16} fill="#16a34a" color="#16a34a" />, label: 'Low', color: '#16a34a' },
};

const statusConfig: Record<DisputeStatus, { icon: React.ReactNode; label: string; color: string }> = {
  open: { icon: <Circle size={16} fill="#3b82f6" color="#3b82f6" />, label: 'Open', color: '#3b82f6' },
  investigating: { icon: <Search size={16} />, label: 'Investigating', color: '#8b5cf6' },
  awaiting_response: { icon: <Clock size={16} />, label: 'Awaiting Response', color: '#f59e0b' },
  resolved: { icon: <CheckCircle size={16} />, label: 'Resolved', color: '#16a34a' },
  escalated: { icon: <AlertTriangle size={16} />, label: 'Escalated', color: '#dc2626' },
  closed: { icon: <Lock size={16} />, label: 'Closed', color: '#6b7280' },
};

const roleIcons: Record<PartyRole, React.ReactNode> = {
  customer: <User size={16} />,
  ngo: <Handshake size={16} />,
  driver: <Car size={16} />,
  farmer: <Wheat size={16} />,
  vendor: <Factory size={16} />,
  platform: <Building2 size={16} />,
};

const eventTypeConfig: Record<EventType, { icon: React.ReactNode; color: string }> = {
  system: { icon: <Settings size={16} />, color: '#6b7280' },
  message: { icon: <MessageSquare size={16} />, color: '#3b82f6' },
  action: { icon: <Wrench size={16} />, color: '#8b5cf6' },
  escalation: { icon: <AlertTriangle size={16} />, color: '#dc2626' },
  resolution: { icon: <CheckCircle size={16} />, color: '#16a34a' },
  attachment: { icon: <Paperclip size={16} />, color: '#f59e0b' },
  status_change: { icon: <RefreshCw size={16} />, color: '#06b6d4' },
};

/* ─── Toast Component ─── */
const Toast: React.FC<{ toast: ToastNotification; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), 4000);
    return () => clearTimeout(t);
  }, [toast.id, onDismiss]);

  const icons: Record<string, React.ReactNode> = { success: <CheckCircle size={16} />, error: <XCircle size={16} />, warning: <AlertTriangle size={16} />, info: <Info size={16} /> };

  return (
    <div className={`dd-toast dd-toast--${toast.type}`}>
      <span className="dd-toast__icon">{icons[toast.type]}</span>
      <div className="dd-toast__content">
        <div className="dd-toast__title">{toast.title}</div>
        <div className="dd-toast__message">{toast.message}</div>
      </div>
      <button className="dd-toast__close" onClick={() => onDismiss(toast.id)}><X size={14} /></button>
      <div className="dd-toast__progress" style={{ animationDuration: '4s' }} />
    </div>
  );
};

/* ─── SLA Progress Bar ─── */
const SLAProgressBar: React.FC<{ deadline: string }> = ({ deadline }) => {
  const sla = getSLAStatus(deadline);

  return (
    <div className={`dd-sla-bar dd-sla-bar--${sla.status}`}>
      <div className="dd-sla-bar__header">
        <span className="dd-sla-bar__label">SLA Deadline</span>
        <span className="dd-sla-bar__time">{sla.timeLeft}</span>
      </div>
      <div className="dd-sla-bar__track">
        <div className="dd-sla-bar__fill" style={{ width: `${sla.percent}%` }} />
      </div>
      <div className="dd-sla-bar__deadline">{formatDateTime(deadline)}</div>
    </div>
  );
};

/* ─── Star Rating ─── */
const StarRating: React.FC<{ rating: number; showValue?: boolean }> = ({ rating, showValue = true }) => {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

  return (
    <div className="dd-star-rating">
      {Array.from({ length: fullStars }, (_, i) => (
        <span key={`f${i}`} className="dd-star dd-star--full">★</span>
      ))}
      {hasHalf && <span className="dd-star dd-star--half">★</span>}
      {Array.from({ length: emptyStars }, (_, i) => (
        <span key={`e${i}`} className="dd-star dd-star--empty">★</span>
      ))}
      {showValue && <span className="dd-star-value">{rating.toFixed(1)}</span>}
    </div>
  );
};

/* ─── Timeline Item ─── */
const TimelineItem: React.FC<{ event: TimelineEvent; isLast: boolean }> = ({ event, isLast }) => {
  const config = eventTypeConfig[event.type];

  return (
    <div className={`dd-timeline-item dd-timeline-item--${event.type} ${event.isInternal ? 'dd-timeline-item--internal' : ''}`}>
      <div className="dd-timeline-item__marker">
        <div className="dd-timeline-item__dot" style={{ background: `${config.color}20`, borderColor: config.color }}>
          {config.icon}
        </div>
        {!isLast && <div className="dd-timeline-item__line" />}
      </div>

      <div className="dd-timeline-item__content">
        <div className="dd-timeline-item__header">
          <div className="dd-timeline-item__actor">
            {event.actorRole && <span className="dd-timeline-item__actor-icon">{roleIcons[event.actorRole]}</span>}
            <span className="dd-timeline-item__actor-name">{event.actor}</span>
            {event.isInternal && <span className="dd-timeline-item__internal-badge">Internal</span>}
          </div>
          <span className="dd-timeline-item__time">{formatRelativeTime(event.timestamp)}</span>
        </div>

        <div className="dd-timeline-item__body">{event.content}</div>

        {event.attachments && event.attachments.length > 0 && (
          <div className="dd-timeline-item__attachments">
            {event.attachments.map((att, i) => (
              <div key={i} className="dd-timeline-attachment">
                <span className="dd-timeline-attachment__icon"><Paperclip size={14} /></span>
                <span className="dd-timeline-attachment__name">{att.name}</span>
                <span className="dd-timeline-attachment__size">{att.size}</span>
              </div>
            ))}
          </div>
        )}

        {event.metadata && (
          <div className="dd-timeline-item__meta">
            {Object.entries(event.metadata).map(([k, v]) => (
              <span key={k} className="dd-timeline-meta-tag">{k}: {v}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/* ─── Party Card ─── */
const PartyCard: React.FC<{
  party: Party;
  role: 'complainant' | 'respondent';
  onContact: (method: 'email' | 'phone') => void;
}> = ({ party, role, onContact }) => (
  <div className={`dd-party-card dd-party-card--${role}`}>
    <div className="dd-party-card__header">
      <div className="dd-party-card__role-badge">{role === 'complainant' ? <><Megaphone size={14} /> Complainant</> : <><Target size={14} /> Respondent</>}</div>
      {party.verified && <span className="dd-party-card__verified" title="Verified"><Check size={14} /></span>}
    </div>

    <div className="dd-party-card__main">
      <div className="dd-party-card__avatar">{roleIcons[party.role]}</div>
      <div className="dd-party-card__info">
        <div className="dd-party-card__name">{party.name}</div>
        <div className="dd-party-card__role-type">{party.role}</div>
        {party.rating && <StarRating rating={party.rating} />}
      </div>
    </div>

    <div className="dd-party-card__stats">
      <div className="dd-party-card__stat">
        <span className="dd-party-card__stat-value">{party.totalOrders || 0}</span>
        <span className="dd-party-card__stat-label">Orders</span>
      </div>
      <div className="dd-party-card__stat">
        <span className="dd-party-card__stat-value">{party.pastDisputes}</span>
        <span className="dd-party-card__stat-label">Disputes</span>
      </div>
      <div className="dd-party-card__stat">
        <span className="dd-party-card__stat-value">{party.resolvedDisputes}</span>
        <span className="dd-party-card__stat-label">Resolved</span>
      </div>
    </div>

    <div className="dd-party-card__contact">
      <button className="dd-party-card__contact-btn" onClick={() => onContact('email')}>
        <span><Mail size={14} /></span> Email
      </button>
      <button className="dd-party-card__contact-btn" onClick={() => onContact('phone')}>
        <span><Phone size={14} /></span> Call
      </button>
    </div>

    <div className="dd-party-card__details">
      <div className="dd-party-card__detail">
        <span className="dd-party-card__detail-label">Email</span>
        <span className="dd-party-card__detail-value">{party.email}</span>
      </div>
      <div className="dd-party-card__detail">
        <span className="dd-party-card__detail-label">Phone</span>
        <span className="dd-party-card__detail-value">{party.phone}</span>
      </div>
      <div className="dd-party-card__detail">
        <span className="dd-party-card__detail-label">Member Since</span>
        <span className="dd-party-card__detail-value">{formatDate(party.memberSince)}</span>
      </div>
    </div>
  </div>
);

/* ─── Resolution Modal ─── */
const ResolutionModal: React.FC<{
  dispute: DisputeData;
  onClose: () => void;
  onResolve: (resolution: { outcome: string; refund: number; note: string }) => void;
}> = ({ dispute, onClose, onResolve }) => {
  const [outcome, setOutcome] = useState<'full_refund' | 'partial_refund' | 'no_refund' | 'replacement'>('partial_refund');
  const [refundAmount, setRefundAmount] = useState(dispute.refundRequested || 0);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 1500));
    onResolve({ outcome, refund: refundAmount, note });
    setIsSubmitting(false);
  };

  return (
    <div className="dd-modal-overlay" onClick={onClose}>
      <div className="dd-modal dd-modal--resolution" onClick={(e) => e.stopPropagation()}>
        <div className="dd-modal__header">
          <h2 className="dd-modal__title">Resolve Dispute</h2>
          <button className="dd-modal__close" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="dd-modal__content">
          <div className="dd-resolution-summary">
            <div className="dd-resolution-summary__item">
              <span>Dispute ID</span>
              <strong>{dispute.disputeId}</strong>
            </div>
            <div className="dd-resolution-summary__item">
              <span>Order Amount</span>
              <strong>{formatCurrency(dispute.orderAmount)}</strong>
            </div>
            <div className="dd-resolution-summary__item">
              <span>Refund Requested</span>
              <strong>{formatCurrency(dispute.refundRequested || 0)}</strong>
            </div>
          </div>

          <div className="dd-form-group">
            <label>Resolution Outcome</label>
            <div className="dd-outcome-options">
              {[
                { value: 'full_refund', label: 'Full Refund', icon: <DollarSign size={16} />, desc: 'Refund entire order amount' },
                { value: 'partial_refund', label: 'Partial Refund', icon: <Banknote size={16} />, desc: 'Refund portion of order' },
                { value: 'no_refund', label: 'No Refund', icon: <XCircle size={16} />, desc: 'Reject refund request' },
                { value: 'replacement', label: 'Replacement', icon: <RefreshCw size={16} />, desc: 'Send replacement items' },
              ].map((opt) => (
                <div
                  key={opt.value}
                  className={`dd-outcome-option ${outcome === opt.value ? 'dd-outcome-option--selected' : ''}`}
                  onClick={() => {
                    setOutcome(opt.value as any);
                    if (opt.value === 'full_refund') setRefundAmount(dispute.orderAmount);
                    else if (opt.value === 'no_refund' || opt.value === 'replacement') setRefundAmount(0);
                  }}
                >
                  <span className="dd-outcome-option__icon">{opt.icon}</span>
                  <div className="dd-outcome-option__content">
                    <span className="dd-outcome-option__label">{opt.label}</span>
                    <span className="dd-outcome-option__desc">{opt.desc}</span>
                  </div>
                  <div className="dd-outcome-option__radio" />
                </div>
              ))}
            </div>
          </div>

          {(outcome === 'partial_refund' || outcome === 'full_refund') && (
            <div className="dd-form-group">
              <label>Refund Amount</label>
              <div className="dd-input-with-prefix">
                <span>₹</span>
                <input
                  type="number"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(Math.min(Number(e.target.value), dispute.orderAmount))}
                  max={dispute.orderAmount}
                  disabled={outcome === 'full_refund'}
                />
              </div>
              <div className="dd-refund-slider">
                <input
                  type="range"
                  min={0}
                  max={dispute.orderAmount}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(Number(e.target.value))}
                  disabled={outcome === 'full_refund'}
                />
                <div className="dd-refund-slider__labels">
                  <span>₹0</span>
                  <span>{formatCurrency(dispute.orderAmount)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="dd-form-group">
            <label>Resolution Note</label>
            <textarea
              className="dd-textarea"
              placeholder="Add details about this resolution..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
            />
          </div>

          <div className="dd-resolution-preview">
            <div className="dd-resolution-preview__header">Resolution Preview</div>
            <div className="dd-resolution-preview__content">
              <p>
                <strong>{outcome.replace('_', ' ').charAt(0).toUpperCase() + outcome.replace('_', ' ').slice(1)}</strong>
                {(outcome === 'full_refund' || outcome === 'partial_refund') && (
                  <> - {formatCurrency(refundAmount)} will be refunded to {dispute.complainant.name}</>
                )}
                {outcome === 'replacement' && <> - Replacement items will be sent to {dispute.complainant.name}</>}
              </p>
            </div>
          </div>
        </div>

        <div className="dd-modal__footer">
          <button className="dd-btn dd-btn--secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button className="dd-btn dd-btn--success" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <><span className="dd-btn-spinner" /> Resolving...</> : <><CheckCircle size={16} /> Confirm Resolution</>}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Escalation Modal ─── */
const EscalationModal: React.FC<{
  dispute: DisputeData;
  onClose: () => void;
  onEscalate: (reason: string, assignTo: string) => void;
}> = ({ dispute, onClose, onEscalate }) => {
  const [reason, setReason] = useState('');
  const [assignTo, setAssignTo] = useState('senior_management');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 1500));
    onEscalate(reason, assignTo);
    setIsSubmitting(false);
  };

  return (
    <div className="dd-modal-overlay" onClick={onClose}>
      <div className="dd-modal dd-modal--escalation" onClick={(e) => e.stopPropagation()}>
        <div className="dd-modal__header">
          <h2 className="dd-modal__title"><AlertTriangle size={18} /> Escalate Dispute</h2>
          <button className="dd-modal__close" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="dd-modal__content">
          <div className="dd-escalation-warning">
            <span className="dd-escalation-warning__icon"><AlertTriangle size={18} /></span>
            <div>
              <strong>This action will escalate the dispute</strong>
              <p>The dispute will be flagged as high priority and assigned to senior staff for immediate attention.</p>
            </div>
          </div>

          <div className="dd-form-group">
            <label>Escalate To</label>
            <select className="dd-select" value={assignTo} onChange={(e) => setAssignTo(e.target.value)}>
              <option value="senior_management">Senior Management</option>
              <option value="legal_team">Legal Team</option>
              <option value="quality_team">Quality Assurance</option>
              <option value="finance_team">Finance Team</option>
            </select>
          </div>

          <div className="dd-form-group">
            <label>Escalation Reason *</label>
            <textarea
              className="dd-textarea"
              placeholder="Explain why this dispute needs escalation..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              required
            />
          </div>
        </div>

        <div className="dd-modal__footer">
          <button className="dd-btn dd-btn--secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button
            className="dd-btn dd-btn--warning"
            onClick={handleSubmit}
            disabled={isSubmitting || !reason.trim()}
          >
            {isSubmitting ? <><span className="dd-btn-spinner" /> Escalating...</> : <><AlertTriangle size={16} /> Confirm Escalation</>}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Main Component ─── */
const DisputeDetails: React.FC = () => {
  const [dispute, setDispute] = useState<DisputeData>(mockDispute);
  const [timeline, setTimeline] = useState<TimelineEvent[]>(mockTimeline);
  const [attachments] = useState<Attachment[]>(mockAttachments);
  const [notes, setNotes] = useState<InternalNote[]>(mockNotes);
  const [relatedDisputes] = useState<RelatedDispute[]>(mockRelatedDisputes);
  const [activeTab, setActiveTab] = useState<ActiveTab>('timeline');
  const [replyText, setReplyText] = useState('');
  const [isInternalReply, setIsInternalReply] = useState(false);
  const [showResolutionModal, setShowResolutionModal] = useState(false);
  const [showEscalationModal, setShowEscalationModal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<React.ReactNode | null>(null);
  const replyRef = useRef<HTMLTextAreaElement>(null);

  const addToast = useCallback((type: ToastNotification['type'], title: string, message: string) => {
    setToasts((prev) => [...prev, { id: Date.now().toString(), type, title, message }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const slaStatus = useMemo(() => getSLAStatus(dispute.slaDeadline), [dispute.slaDeadline]);

  const handleSendReply = async () => {
    if (!replyText.trim()) return;

    setIsSending(true);
    await new Promise((r) => setTimeout(r, 1000));

    const newEvent: TimelineEvent = {
      id: Date.now().toString(),
      type: 'message',
      actor: 'Admin (You)',
      actorRole: 'platform',
      content: replyText,
      timestamp: new Date().toISOString(),
      isInternal: isInternalReply,
    };

    setTimeline((prev) => [...prev, newEvent]);
    setReplyText('');
    setIsSending(false);
    addToast('success', isInternalReply ? 'Note Added' : 'Reply Sent', isInternalReply ? 'Internal note has been added' : 'Your reply has been sent to all parties');
  };

  const handleStatusChange = (newStatus: DisputeStatus) => {
    const oldStatus = dispute.status;
    setDispute((prev) => ({ ...prev, status: newStatus, updatedAt: new Date().toISOString() }));

    const statusEvent: TimelineEvent = {
      id: Date.now().toString(),
      type: 'status_change',
      actor: 'Admin (You)',
      actorRole: 'platform',
      content: `Changed status from "${statusConfig[oldStatus].label}" to "${statusConfig[newStatus].label}"`,
      timestamp: new Date().toISOString(),
      metadata: { from: oldStatus, to: newStatus },
    };

    setTimeline((prev) => [...prev, statusEvent]);
    addToast('success', 'Status Updated', `Dispute status changed to ${statusConfig[newStatus].label}`);
  };

  const handleResolve = (resolution: { outcome: string; refund: number; note: string }) => {
    setDispute((prev) => ({
      ...prev,
      status: 'resolved',
      refundApproved: resolution.refund,
      updatedAt: new Date().toISOString(),
    }));

    const resolutionEvent: TimelineEvent = {
      id: Date.now().toString(),
      type: 'resolution',
      actor: 'Admin (You)',
      actorRole: 'platform',
      content: `Dispute resolved: ${resolution.outcome.replace('_', ' ')}${resolution.refund > 0 ? ` - ${formatCurrency(resolution.refund)} refund approved` : ''}. ${resolution.note}`,
      timestamp: new Date().toISOString(),
    };

    setTimeline((prev) => [...prev, resolutionEvent]);
    setShowResolutionModal(false);
    addToast('success', 'Dispute Resolved', `Resolution applied successfully`);
  };

  const handleEscalate = (reason: string, assignTo: string) => {
    setDispute((prev) => ({ ...prev, status: 'escalated', updatedAt: new Date().toISOString() }));

    const escalationEvent: TimelineEvent = {
      id: Date.now().toString(),
      type: 'escalation',
      actor: 'Admin (You)',
      actorRole: 'platform',
      content: `Dispute escalated to ${assignTo.replace('_', ' ')}. Reason: ${reason}`,
      timestamp: new Date().toISOString(),
    };

    setTimeline((prev) => [...prev, escalationEvent]);
    setShowEscalationModal(false);
    addToast('warning', 'Dispute Escalated', 'The dispute has been escalated for further review');
  };

  const handleContact = (party: Party, method: 'email' | 'phone') => {
    addToast('info', `Contacting ${party.name}`, method === 'email' ? `Opening email to ${party.email}` : `Initiating call to ${party.phone}`);
  };

  const handleAddNote = () => {
    if (!replyText.trim()) return;

    const newNote: InternalNote = {
      id: Date.now().toString(),
      author: 'Admin (You)',
      content: replyText,
      timestamp: new Date().toISOString(),
    };

    setNotes((prev) => [newNote, ...prev]);
    setReplyText('');
    addToast('success', 'Note Added', 'Internal note has been saved');
  };

  const togglePinNote = (noteId: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, isPinned: !n.isPinned } : n))
    );
  };

  const canResolve = dispute.status !== 'resolved' && dispute.status !== 'closed';
  const canEscalate = dispute.status === 'open' || dispute.status === 'investigating' || dispute.status === 'awaiting_response';

  const tabs: { key: ActiveTab; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'timeline', label: 'Timeline', icon: <Calendar size={14} />, count: timeline.length },
    { key: 'evidence', label: 'Evidence', icon: <Paperclip size={14} />, count: attachments.length },
    { key: 'notes', label: 'Internal Notes', icon: <Pencil size={14} />, count: notes.length },
    { key: 'related', label: 'Related', icon: <Link2 size={14} />, count: relatedDisputes.length },
  ];

  return (
    <div className="dd">
      {/* Toasts */}
      <div className="dd-toast-container">
        {toasts.map((t) => <Toast key={t.id} toast={t} onDismiss={removeToast} />)}
      </div>

      {/* Back Button */}
      <button className="dd-back-btn" onClick={() => window.history.back()}>
        <ArrowLeft size={16} /> Back to Dispute Center
      </button>

      {/* Header */}
      <header className="dd-header">
        <div className="dd-header__main">
          <div className="dd-header__title-row">
            <h1 className="dd-header__title">
              <span className="dd-header__id">{dispute.disputeId}</span>
              <span className="dd-header__separator">—</span>
              {dispute.subject}
            </h1>
          </div>

          <div className="dd-header__badges">
            <span className={`dd-priority-badge dd-priority-badge--${dispute.priority}`}>
              {priorityConfig[dispute.priority].icon} {priorityConfig[dispute.priority].label}
            </span>
            <span className={`dd-status-badge dd-status-badge--${dispute.status}`}>
              {statusConfig[dispute.status].icon} {statusConfig[dispute.status].label}
            </span>
            <span className="dd-category-badge" style={{ background: `${categoryConfig[dispute.category].color}15`, color: categoryConfig[dispute.category].color }}>
              {categoryConfig[dispute.category].icon} {categoryConfig[dispute.category].label}
            </span>
          </div>

          <div className="dd-header__meta">
            <span><Package size={14} /> Order: <strong>{dispute.orderId}</strong></span>
            <span className="dd-header__divider">•</span>
            <span><DollarSign size={14} /> Amount: <strong>{formatCurrency(dispute.orderAmount)}</strong></span>
            <span className="dd-header__divider">•</span>
            <span><Calendar size={14} /> Filed: <strong>{formatRelativeTime(dispute.createdAt)}</strong></span>
            {dispute.assignedTo && (
              <>
                <span className="dd-header__divider">•</span>
                <span><User size={14} /> Assigned: <strong>{dispute.assignedTo}</strong></span>
              </>
            )}
          </div>
        </div>

        <div className="dd-header__actions">
          <div className="dd-quick-actions-wrapper">
            <button
              className="dd-btn dd-btn--secondary dd-btn--icon"
              onClick={() => setShowQuickActions(!showQuickActions)}
            >
              ⋯
            </button>
            {showQuickActions && (
              <div className="dd-quick-actions-menu">
                <button className="dd-quick-actions-menu__item" onClick={() => { handleStatusChange('awaiting_response'); setShowQuickActions(false); }}>
                  <span><Clock size={14} /></span> Mark Awaiting Response
                </button>
                <button className="dd-quick-actions-menu__item" onClick={() => { addToast('info', 'Copied', 'Dispute link copied to clipboard'); setShowQuickActions(false); }}>
                  <span><Link2 size={14} /></span> Copy Link
                </button>
                <button className="dd-quick-actions-menu__item" onClick={() => { addToast('info', 'Downloading', 'Generating report...'); setShowQuickActions(false); }}>
                  <span><Download size={14} /></span> Export Report
                </button>
                <button className="dd-quick-actions-menu__item dd-quick-actions-menu__item--danger" onClick={() => setShowQuickActions(false)}>
                  <span><Trash2 size={14} /></span> Delete Dispute
                </button>
              </div>
            )}
          </div>

          {canEscalate && (
            <button className="dd-btn dd-btn--warning" onClick={() => setShowEscalationModal(true)}>
              <AlertTriangle size={16} /> Escalate
            </button>
          )}
          <button
            className="dd-btn dd-btn--danger"
            onClick={() => handleStatusChange('closed')}
            disabled={dispute.status === 'closed'}
          >
            <XCircle size={16} /> Reject
          </button>
          {canResolve && (
            <button className="dd-btn dd-btn--success" onClick={() => setShowResolutionModal(true)}>
              <CheckCircle size={16} /> Resolve
            </button>
          )}
        </div>
      </header>

      {/* SLA Bar */}
      {canResolve && <SLAProgressBar deadline={dispute.slaDeadline} />}

      {/* Main Grid */}
      <div className="dd-grid">
        {/* Left Column - Timeline & Content */}
        <div className="dd-main-column">
          {/* Description Card */}
          <div className="dd-description-card">
            <div className="dd-description-card__header">
              <h3><ClipboardList size={16} /> Dispute Description</h3>
            </div>
            <div className="dd-description-card__content">
              <p>{dispute.description}</p>
            </div>
            {dispute.tags.length > 0 && (
              <div className="dd-description-card__tags">
                {dispute.tags.map((tag, i) => (
                  <span key={i} className="dd-tag">#{tag}</span>
                ))}
              </div>
            )}
            {dispute.refundRequested && (
              <div className="dd-description-card__refund">
                <span><DollarSign size={14} /> Refund Requested:</span>
                <strong>{formatCurrency(dispute.refundRequested)}</strong>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="dd-tabs">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                className={`dd-tab ${activeTab === tab.key ? 'dd-tab--active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                <span className="dd-tab__icon">{tab.icon}</span>
                {tab.label}
                {tab.count !== undefined && <span className="dd-tab__count">{tab.count}</span>}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="dd-tab-content">
            {/* Timeline Tab */}
            {activeTab === 'timeline' && (
              <div className="dd-timeline-section">
                <div className="dd-timeline">
                  {timeline.map((event, i) => (
                    <TimelineItem key={event.id} event={event} isLast={i === timeline.length - 1} />
                  ))}
                </div>

                {/* Reply Composer */}
                <div className="dd-composer">
                  <div className="dd-composer__toggle">
                    <label className="dd-toggle">
                      <input
                        type="checkbox"
                        checked={isInternalReply}
                        onChange={(e) => setIsInternalReply(e.target.checked)}
                      />
                      <span className="dd-toggle__slider" />
                    </label>
                    <span className={isInternalReply ? 'dd-internal-label' : ''}>
                      {isInternalReply ? <><Lock size={14} /> Internal Note</> : <><MessageSquare size={14} /> Public Reply</>}
                    </span>
                  </div>
                  <div className="dd-composer__input-wrapper">
                    <textarea
                      ref={replyRef}
                      className="dd-composer__textarea"
                      placeholder={isInternalReply ? 'Add internal note (only visible to staff)...' : 'Write a response to all parties...'}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      rows={4}
                    />
                    <div className="dd-composer__actions">
                      <button className="dd-btn dd-btn--secondary dd-btn--sm">
                        <Paperclip size={14} /> Attach
                      </button>
                      <button
                        className={`dd-btn dd-btn--sm ${isInternalReply ? 'dd-btn--warning' : 'dd-btn--primary'}`}
                        onClick={handleSendReply}
                        disabled={!replyText.trim() || isSending}
                      >
                        {isSending ? <><span className="dd-btn-spinner dd-btn-spinner--small" /> Sending...</> : isInternalReply ? <><Pencil size={14} /> Add Note</> : <><Send size={14} /> Send Reply</>}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Evidence Tab */}
            {activeTab === 'evidence' && (
              <div className="dd-evidence-section">
                <div className="dd-evidence-header">
                  <h3>Evidence & Attachments ({attachments.length})</h3>
                  <button className="dd-btn dd-btn--secondary dd-btn--sm"><Upload size={14} /> Upload</button>
                </div>
                <div className="dd-evidence-grid">
                  {attachments.map((att) => (
                    <div key={att.id} className="dd-evidence-card" onClick={() => att.type === 'image' && setLightboxImage(att.thumbnail || <FileText size={20} />)}>
                      <div className="dd-evidence-card__preview">
                        {att.type === 'image' ? (
                          <span className="dd-evidence-card__thumbnail">{att.thumbnail}</span>
                        ) : (
                          <span className="dd-evidence-card__icon"><FileText size={20} /></span>
                        )}
                      </div>
                      <div className="dd-evidence-card__info">
                        <span className="dd-evidence-card__name">{att.name}</span>
                        <span className="dd-evidence-card__meta">{att.size} • {formatRelativeTime(att.uploadedAt)}</span>
                        <span className="dd-evidence-card__uploader">by {att.uploadedBy}</span>
                      </div>
                      <div className="dd-evidence-card__actions">
                        <button className="dd-icon-btn" title="Download"><Download size={14} /></button>
                        <button className="dd-icon-btn" title="View"><Eye size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
                {attachments.length === 0 && (
                  <div className="dd-empty-state">
                    <span className="dd-empty-state__icon"><Paperclip size={24} /></span>
                    <h4>No evidence uploaded</h4>
                    <p>Attachments and evidence files will appear here</p>
                  </div>
                )}
              </div>
            )}

            {/* Notes Tab */}
            {activeTab === 'notes' && (
              <div className="dd-notes-section">
                <div className="dd-notes-composer">
                  <textarea
                    className="dd-notes-composer__input"
                    placeholder="Add internal note..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={3}
                  />
                  <button
                    className="dd-btn dd-btn--primary dd-btn--sm"
                    onClick={handleAddNote}
                    disabled={!replyText.trim()}
                  >
                    <Pencil size={14} /> Add Note
                  </button>
                </div>

                <div className="dd-notes-list">
                  {notes
                    .sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0))
                    .map((note) => (
                      <div key={note.id} className={`dd-note-card ${note.isPinned ? 'dd-note-card--pinned' : ''}`}>
                        <div className="dd-note-card__header">
                          <span className="dd-note-card__author">{note.author}</span>
                          <div className="dd-note-card__actions">
                            <button
                              className={`dd-icon-btn ${note.isPinned ? 'dd-icon-btn--active' : ''}`}
                              onClick={() => togglePinNote(note.id)}
                              title={note.isPinned ? 'Unpin' : 'Pin'}
                            >
                              <Pin size={14} />
                            </button>
                            <span className="dd-note-card__time">{formatRelativeTime(note.timestamp)}</span>
                          </div>
                        </div>
                        <div className="dd-note-card__content">{note.content}</div>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Related Tab */}
            {activeTab === 'related' && (
              <div className="dd-related-section">
                <h3>Related Disputes</h3>
                {relatedDisputes.length > 0 ? (
                  <div className="dd-related-list">
                    {relatedDisputes.map((rd) => (
                      <div key={rd.id} className="dd-related-card">
                        <div className="dd-related-card__main">
                          <span className="dd-related-card__id">{rd.disputeId}</span>
                          <span className="dd-related-card__subject">{rd.subject}</span>
                        </div>
                        <div className="dd-related-card__meta">
                          <span className={`dd-status-badge dd-status-badge--${rd.status} dd-status-badge--sm`}>
                            {statusConfig[rd.status].icon} {statusConfig[rd.status].label}
                          </span>
                          <span className="dd-related-card__date">{formatDate(rd.date)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="dd-empty-state">
                    <span className="dd-empty-state__icon"><Link2 size={24} /></span>
                    <h4>No related disputes</h4>
                    <p>Related disputes from same parties will appear here</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Info Cards */}
        <div className="dd-sidebar">
          {/* Quick Info */}
          <div className="dd-info-card">
            <div className="dd-info-card__header">
              <h3><BarChart3 size={16} /> Dispute Info</h3>
              <select
                className="dd-status-select"
                value={dispute.status}
                onChange={(e) => handleStatusChange(e.target.value as DisputeStatus)}
                disabled={dispute.status === 'resolved' || dispute.status === 'closed'}
              >
                {Object.entries(statusConfig).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
            </div>
            <div className="dd-info-card__rows">
              <div className="dd-info-row">
                <span className="dd-info-row__label">Created</span>
                <span className="dd-info-row__value">{formatDateTime(dispute.createdAt)}</span>
              </div>
              <div className="dd-info-row">
                <span className="dd-info-row__label">Last Updated</span>
                <span className="dd-info-row__value">{formatRelativeTime(dispute.updatedAt)}</span>
              </div>
              <div className="dd-info-row">
                <span className="dd-info-row__label">SLA Status</span>
                <span className={`dd-sla-badge dd-sla-badge--${slaStatus.status}`}>
                  {slaStatus.status === 'breach' ? <AlertOctagon size={14} /> : slaStatus.status === 'critical' ? <Clock size={14} /> : <Check size={14} />} {slaStatus.timeLeft}
                </span>
              </div>
              <div className="dd-info-row">
                <span className="dd-info-row__label">Assigned To</span>
                <span className="dd-info-row__value">
                  {dispute.assignedTo || <span className="dd-unassigned">Unassigned</span>}
                </span>
              </div>
            </div>
          </div>

          {/* Parties */}
          <PartyCard
            party={dispute.complainant}
            role="complainant"
            onContact={(method) => handleContact(dispute.complainant, method)}
          />

          <PartyCard
            party={dispute.respondent}
            role="respondent"
            onContact={(method) => handleContact(dispute.respondent, method)}
          />

          {/* Quick Actions */}
          <div className="dd-info-card">
            <div className="dd-info-card__header">
              <h3><Zap size={16} /> Quick Actions</h3>
            </div>
            <div className="dd-quick-action-grid">
              <button className="dd-quick-action-btn" onClick={() => addToast('info', 'Template', 'Loading response templates...')}>
                <span><FileText size={16} /></span>
                <span>Templates</span>
              </button>
              <button className="dd-quick-action-btn" onClick={() => addToast('info', 'Scheduling', 'Opening scheduler...')}>
                <span><Calendar size={16} /></span>
                <span>Schedule Call</span>
              </button>
              <button className="dd-quick-action-btn" onClick={() => addToast('info', 'Refund', 'Opening refund calculator...')}>
                <span><DollarSign size={16} /></span>
                <span>Calculate Refund</span>
              </button>
              <button className="dd-quick-action-btn" onClick={() => addToast('info', 'History', 'Loading order history...')}>
                <span><Package size={16} /></span>
                <span>Order Details</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showResolutionModal && (
        <ResolutionModal
          dispute={dispute}
          onClose={() => setShowResolutionModal(false)}
          onResolve={handleResolve}
        />
      )}

      {showEscalationModal && (
        <EscalationModal
          dispute={dispute}
          onClose={() => setShowEscalationModal(false)}
          onEscalate={handleEscalate}
        />
      )}

      {/* Image Lightbox */}
      {lightboxImage && (
        <div className="dd-lightbox" onClick={() => setLightboxImage(null)}>
          <div className="dd-lightbox__content">
            <span className="dd-lightbox__image">{lightboxImage}</span>
            <button className="dd-lightbox__close"><X size={16} /></button>
          </div>
        </div>
      )}

      {/* Click outside handler for quick actions */}
      {showQuickActions && <div className="dd-overlay" onClick={() => setShowQuickActions(false)} />}
    </div>
  );
};

export default DisputeDetails;