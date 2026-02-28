import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, Apple, ArrowDown, ArrowUp, Banknote, Building2, Calendar, Car,
  CheckCircle, ChevronDown, ChevronUp, Circle, Clock, ClipboardList, CreditCard,
  Download, Eye, Factory, Filter, Flame, Handshake, HeartCrack, HelpCircle, Info,
  Lock, Mail, MessageSquare, Package, Paperclip, Phone, Plus, PlusCircle,
  RefreshCw, Scale, Search, Smartphone, Timer, Truck, User, Wheat, X, XCircle
} from 'lucide-react';
import './DisputeCenter.css';

/* ─── Types ─── */
type DisputePriority = 'critical' | 'high' | 'medium' | 'low';
type DisputeStatus = 'open' | 'investigating' | 'awaiting_response' | 'resolved' | 'escalated' | 'closed';
type DisputeCategory = 'quality' | 'delivery' | 'payment' | 'quantity' | 'no_show' | 'damage' | 'other';
type PartyRole = 'customer' | 'ngo' | 'driver' | 'farmer' | 'vendor' | 'platform';
type SortField = 'createdAt' | 'priority' | 'status' | 'category';
type SortDirection = 'asc' | 'desc';
type ActiveTab = 'details' | 'timeline' | 'messages' | 'resolution';

interface DisputeMessage {
  id: string;
  author: string;
  authorRole: PartyRole;
  message: string;
  timestamp: string;
  isInternal: boolean;
  attachments?: string[];
}

interface TimelineEvent {
  id: string;
  type: 'created' | 'status_change' | 'message' | 'escalated' | 'assigned' | 'resolved' | 'attachment';
  description: string;
  timestamp: string;
  actor: string;
  actorRole?: PartyRole;
  metadata?: Record<string, string>;
}

interface Dispute {
  id: string;
  disputeId: string;
  orderId: string;
  orderAmount: number;
  filedBy: string;
  filedByRole: PartyRole;
  filedByEmail: string;
  filedByPhone: string;
  against: string;
  againstRole: PartyRole;
  category: DisputeCategory;
  subject: string;
  description: string;
  priority: DisputePriority;
  status: DisputeStatus;
  createdAt: string;
  lastUpdate: string;
  assignedTo?: string;
  resolvedAt?: string;
  resolution?: string;
  refundAmount?: number;
  evidenceCount: number;
  messageCount: number;
  slaDeadline?: string;
  tags: string[];
}

interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
}

/* ─── Generate Mock Data ─── */
const generateDisputes = (): Dispute[] => {
  const categories: DisputeCategory[] = ['quality', 'delivery', 'payment', 'quantity', 'no_show', 'damage', 'other'];
  const priorities: DisputePriority[] = ['critical', 'high', 'medium', 'low'];
  const statuses: DisputeStatus[] = ['open', 'investigating', 'awaiting_response', 'resolved', 'escalated', 'closed'];
  const tags = ['urgent', 'vip', 'repeat', 'refund_requested', 'legal_review', 'first_time'];

  const parties: { name: string; role: PartyRole; email: string; phone: string }[] = [
    { name: 'Ravi Sharma', role: 'customer', email: 'ravi.s@email.com', phone: '+91 98765 43210' },
    { name: 'Hope NGO', role: 'ngo', email: 'contact@hopnego.org', phone: '+91 98765 43211' },
    { name: 'Helping Hands NGO', role: 'ngo', email: 'info@helpinghands.org', phone: '+91 98765 43212' },
    { name: 'City Food Bank', role: 'ngo', email: 'admin@cityfoodbank.org', phone: '+91 98765 43213' },
    { name: 'Rakesh Patil', role: 'driver', email: 'rakesh.p@email.com', phone: '+91 98765 43214' },
    { name: 'Priya Kulkarni', role: 'driver', email: 'priya.k@email.com', phone: '+91 98765 43215' },
    { name: 'Green Valley Farm', role: 'farmer', email: 'contact@greenvalley.com', phone: '+91 98765 43216' },
    { name: 'Sunrise Organics', role: 'farmer', email: 'info@sunriseorg.com', phone: '+91 98765 43217' },
    { name: 'Fresh Fields', role: 'vendor', email: 'sales@freshfields.com', phone: '+91 98765 43218' },
    { name: 'Amit Shah', role: 'driver', email: 'amit.s@email.com', phone: '+91 98765 43219' },
  ];

  const subjects: Record<DisputeCategory, string[]> = {
    quality: ['Received rotten vegetables', 'Food quality below standard', 'Contaminated produce', 'Spoiled items in delivery'],
    delivery: ['Late delivery — food spoiled', 'Delivery never arrived', 'Wrong address delivery', 'Damaged during transit'],
    payment: ['Payout not received', 'Overcharged for order', 'Refund not processed', 'Commission dispute'],
    quantity: ['Only 50% of ordered quantity received', 'Missing items in order', 'Short weight delivery', 'Incorrect item count'],
    no_show: ['Recipient not present at dropoff', 'Driver did not arrive', 'Pickup location closed', 'Contact unreachable'],
    damage: ['Package arrived damaged', 'Items crushed during delivery', 'Wet/water damaged goods', 'Packaging compromised'],
    other: ['Account access issue', 'Rating dispute', 'Communication problem', 'Terms violation concern'],
  };

  const assignees = ['Priya M.', 'Rahul K.', 'Anita S.', 'Vikram T.', 'Deepa R.', null];

  return Array.from({ length: 25 }, (_, i) => {
    const category = categories[Math.floor(Math.random() * categories.length)];
    const priority = priorities[Math.floor(Math.random() * priorities.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const filer = parties[Math.floor(Math.random() * parties.length)];
    const opponent = parties.filter((p) => p.name !== filer.name)[Math.floor(Math.random() * (parties.length - 1))];
    const subjectOptions = subjects[category];
    const subject = subjectOptions[Math.floor(Math.random() * subjectOptions.length)];

    const createdDate = new Date();
    createdDate.setHours(createdDate.getHours() - Math.floor(Math.random() * 720));
    const lastUpdateDate = new Date(createdDate);
    lastUpdateDate.setMinutes(lastUpdateDate.getMinutes() + Math.floor(Math.random() * 120));

    const slaDate = new Date(createdDate);
    slaDate.setHours(slaDate.getHours() + (priority === 'critical' ? 4 : priority === 'high' ? 24 : priority === 'medium' ? 72 : 168));

    const randomTags = tags.filter(() => Math.random() > 0.7);

    return {
      id: String(i + 1),
      disputeId: `DSP-${400 - i}`,
      orderId: `ORD-${2350 + Math.floor(Math.random() * 100)}`,
      orderAmount: Math.round(500 + Math.random() * 10000),
      filedBy: filer.name,
      filedByRole: filer.role,
      filedByEmail: filer.email,
      filedByPhone: filer.phone,
      against: opponent?.name || 'Platform',
      againstRole: opponent?.role || 'platform',
      category,
      subject,
      description: `This dispute was filed regarding ${subject.toLowerCase()}. The complainant has provided evidence and is requesting immediate resolution. ${priority === 'critical' || priority === 'high' ? 'This is a high-priority case requiring urgent attention.' : ''}`,
      priority,
      status,
      createdAt: createdDate.toISOString(),
      lastUpdate: lastUpdateDate.toISOString(),
      assignedTo: assignees[Math.floor(Math.random() * assignees.length)] || undefined,
      resolvedAt: status === 'resolved' || status === 'closed' ? lastUpdateDate.toISOString() : undefined,
      resolution: status === 'resolved' || status === 'closed' ? 'Issue has been investigated and resolved per platform policies.' : undefined,
      refundAmount: status === 'resolved' && Math.random() > 0.5 ? Math.round(200 + Math.random() * 2000) : undefined,
      evidenceCount: Math.floor(Math.random() * 5),
      messageCount: Math.floor(Math.random() * 12),
      slaDeadline: slaDate.toISOString(),
      tags: randomTags,
    };
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

const generateTimeline = (dispute: Dispute): TimelineEvent[] => {
  const events: TimelineEvent[] = [
    {
      id: '1',
      type: 'created',
      description: `Dispute created by ${dispute.filedBy}`,
      timestamp: dispute.createdAt,
      actor: dispute.filedBy,
      actorRole: dispute.filedByRole,
    },
  ];

  if (dispute.assignedTo) {
    events.push({
      id: '2',
      type: 'assigned',
      description: `Dispute assigned to ${dispute.assignedTo}`,
      timestamp: new Date(new Date(dispute.createdAt).getTime() + 30 * 60000).toISOString(),
      actor: 'System',
    });
  }

  if (dispute.status === 'investigating' || dispute.status === 'awaiting_response' || dispute.status === 'resolved' || dispute.status === 'escalated' || dispute.status === 'closed') {
    events.push({
      id: '3',
      type: 'status_change',
      description: 'Status changed to Investigating',
      timestamp: new Date(new Date(dispute.createdAt).getTime() + 60 * 60000).toISOString(),
      actor: dispute.assignedTo || 'Support Team',
      metadata: { from: 'open', to: 'investigating' },
    });
  }

  if (dispute.messageCount > 0) {
    events.push({
      id: '4',
      type: 'message',
      description: `${dispute.messageCount} messages exchanged`,
      timestamp: new Date(new Date(dispute.createdAt).getTime() + 90 * 60000).toISOString(),
      actor: 'Multiple parties',
    });
  }

  if (dispute.status === 'escalated') {
    events.push({
      id: '5',
      type: 'escalated',
      description: 'Dispute escalated to senior management',
      timestamp: new Date(new Date(dispute.createdAt).getTime() + 180 * 60000).toISOString(),
      actor: dispute.assignedTo || 'System',
    });
  }

  if (dispute.status === 'resolved' || dispute.status === 'closed') {
    events.push({
      id: '6',
      type: 'resolved',
      description: dispute.resolution || 'Dispute resolved',
      timestamp: dispute.resolvedAt || dispute.lastUpdate,
      actor: dispute.assignedTo || 'Support Team',
    });
  }

  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

const generateMessages = (dispute: Dispute): DisputeMessage[] => {
  const messages: DisputeMessage[] = [
    {
      id: '1',
      author: dispute.filedBy,
      authorRole: dispute.filedByRole,
      message: dispute.description,
      timestamp: dispute.createdAt,
      isInternal: false,
    },
  ];

  if (dispute.messageCount > 1) {
    messages.push({
      id: '2',
      author: 'Support Team',
      authorRole: 'platform',
      message: 'Thank you for reporting this issue. We are looking into it and will update you shortly.',
      timestamp: new Date(new Date(dispute.createdAt).getTime() + 45 * 60000).toISOString(),
      isInternal: false,
    });
  }

  if (dispute.messageCount > 2) {
    messages.push({
      id: '3',
      author: dispute.assignedTo || 'Support Agent',
      authorRole: 'platform',
      message: 'Internal note: Contacted vendor for clarification. Awaiting response.',
      timestamp: new Date(new Date(dispute.createdAt).getTime() + 120 * 60000).toISOString(),
      isInternal: true,
    });
  }

  return messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
};

/* ─── Helpers ─── */
const formatCurrency = (val: number): string =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(val);

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const formatTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

const formatRelativeTime = (iso: string): string => {
  const now = new Date();
  const date = new Date(iso);
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hr ago`;
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  return formatDate(iso);
};

const getSLAStatus = (deadline: string): { status: 'ok' | 'warning' | 'breach'; label: string } => {
  const now = new Date();
  const sla = new Date(deadline);
  const diff = sla.getTime() - now.getTime();
  const hours = Math.floor(diff / 3600000);

  if (diff < 0) return { status: 'breach', label: 'SLA Breached' };
  if (hours < 4) return { status: 'warning', label: `${hours}h remaining` };
  if (hours < 24) return { status: 'ok', label: `${hours}h remaining` };
  return { status: 'ok', label: `${Math.floor(hours / 24)}d remaining` };
};

const categoryConfig: Record<DisputeCategory, { icon: React.ReactNode; label: string; color: string }> = {
  quality: { icon: <Apple size={16} />, label: 'Quality', color: '#ef4444' },
  delivery: { icon: <Truck size={16} />, label: 'Delivery', color: '#3b82f6' },
  payment: { icon: <CreditCard size={16} />, label: 'Payment', color: '#16a34a' },
  quantity: { icon: <Package size={16} />, label: 'Quantity', color: '#f59e0b' },
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

/* ─── Animated Counter ─── */
const AnimatedCounter: React.FC<{ target: number; duration?: number }> = ({ target, duration = 800 }) => {
  const [val, setVal] = useState(0);
  const prev = useRef(0);

  useEffect(() => {
    const start = prev.current;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(start + (target - start) * eased));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    prev.current = target;
  }, [target, duration]);

  return <>{val}</>;
};

/* ─── Toast ─── */
const Toast: React.FC<{ toast: ToastNotification; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), 4000);
    return () => clearTimeout(t);
  }, [toast.id, onDismiss]);

  const icons: Record<string, React.ReactNode> = { success: <CheckCircle size={16} />, error: <XCircle size={16} />, warning: <AlertTriangle size={16} />, info: <Info size={16} /> };

  return (
    <div className={`dsp-toast dsp-toast--${toast.type}`}>
      <span className="dsp-toast__icon">{icons[toast.type]}</span>
      <div className="dsp-toast__content">
        <div className="dsp-toast__title">{toast.title}</div>
        <div className="dsp-toast__message">{toast.message}</div>
      </div>
      <button className="dsp-toast__close" onClick={() => onDismiss(toast.id)}><X size={14} /></button>
      <div className="dsp-toast__progress" style={{ animationDuration: '4s' }} />
    </div>
  );
};

/* ─── Priority Badge ─── */
const PriorityBadge: React.FC<{ priority: DisputePriority; size?: 'sm' | 'md' }> = ({ priority, size = 'md' }) => {
  const cfg = priorityConfig[priority];
  return (
    <span className={`dsp-priority-badge dsp-priority-badge--${priority} dsp-priority-badge--${size}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
};

/* ─── Status Badge ─── */
const StatusBadge: React.FC<{ status: DisputeStatus }> = ({ status }) => {
  const cfg = statusConfig[status];
  return (
    <span className={`dsp-status-badge dsp-status-badge--${status}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
};

/* ─── Category Badge ─── */
const CategoryBadge: React.FC<{ category: DisputeCategory }> = ({ category }) => {
  const cfg = categoryConfig[category];
  return (
    <span className="dsp-category-badge" style={{ background: `${cfg.color}15`, color: cfg.color }}>
      {cfg.icon} {cfg.label}
    </span>
  );
};

/* ─── SLA Indicator ─── */
const SLAIndicator: React.FC<{ deadline: string }> = ({ deadline }) => {
  const sla = getSLAStatus(deadline);
  return (
    <span className={`dsp-sla-indicator dsp-sla-indicator--${sla.status}`}>
      <Timer size={14} /> {sla.label}
    </span>
  );
};

/* ─── Dispute Detail Modal ─── */
const DisputeModal: React.FC<{
  dispute: Dispute;
  onClose: () => void;
  onStatusChange: (id: string, status: DisputeStatus, note?: string) => void;
  onAddMessage: (id: string, message: string, isInternal: boolean) => void;
}> = ({ dispute, onClose, onStatusChange, onAddMessage }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('details');
  const [timeline] = useState<TimelineEvent[]>(generateTimeline(dispute));
  const [messages] = useState<DisputeMessage[]>(generateMessages(dispute));
  const [newMessage, setNewMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [newStatus, setNewStatus] = useState<DisputeStatus>(dispute.status);
  const [resolutionNote, setResolutionNote] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canResolve = dispute.status !== 'resolved' && dispute.status !== 'closed';
  const canEscalate = dispute.status === 'open' || dispute.status === 'investigating' || dispute.status === 'awaiting_response';

  const handleStatusUpdate = async () => {
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 1000));
    onStatusChange(dispute.id, newStatus, resolutionNote);
    setIsSubmitting(false);
  };

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      onAddMessage(dispute.id, newMessage, isInternal);
      setNewMessage('');
    }
  };

  const tabs: { key: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { key: 'details', label: 'Details', icon: <ClipboardList size={16} /> },
    { key: 'timeline', label: 'Timeline', icon: <Calendar size={16} /> },
    { key: 'messages', label: 'Messages', icon: <MessageSquare size={16} /> },
    { key: 'resolution', label: 'Resolution', icon: <CheckCircle size={16} /> },
  ];

  return (
    <div className="dsp-modal-overlay" onClick={onClose}>
      <div className="dsp-modal" onClick={(e) => e.stopPropagation()}>
        <div className="dsp-modal__header">
          <div className="dsp-modal__header-left">
            <div className="dsp-modal__id">{dispute.disputeId}</div>
            <h2 className="dsp-modal__title">{dispute.subject}</h2>
            <div className="dsp-modal__badges">
              <PriorityBadge priority={dispute.priority} />
              <StatusBadge status={dispute.status} />
              {dispute.slaDeadline && dispute.status !== 'resolved' && dispute.status !== 'closed' && (
                <SLAIndicator deadline={dispute.slaDeadline} />
              )}
            </div>
          </div>
          <button className="dsp-modal__close" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="dsp-modal__tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`dsp-modal__tab ${activeTab === tab.key ? 'dsp-modal__tab--active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <span>{tab.icon}</span> {tab.label}
              {tab.key === 'messages' && dispute.messageCount > 0 && (
                <span className="dsp-modal__tab-count">{dispute.messageCount}</span>
              )}
            </button>
          ))}
        </div>

        <div className="dsp-modal__content">
          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="dsp-modal__details">
              {/* Quick Info */}
              <div className="dsp-quick-info">
                <div className="dsp-quick-info__item">
                  <span className="dsp-quick-info__label">Order ID</span>
                  <span className="dsp-quick-info__value dsp-quick-info__value--link">{dispute.orderId}</span>
                </div>
                <div className="dsp-quick-info__item">
                  <span className="dsp-quick-info__label">Order Amount</span>
                  <span className="dsp-quick-info__value">{formatCurrency(dispute.orderAmount)}</span>
                </div>
                <div className="dsp-quick-info__item">
                  <span className="dsp-quick-info__label">Category</span>
                  <CategoryBadge category={dispute.category} />
                </div>
                <div className="dsp-quick-info__item">
                  <span className="dsp-quick-info__label">Filed</span>
                  <span className="dsp-quick-info__value">{formatRelativeTime(dispute.createdAt)}</span>
                </div>
              </div>

              {/* Parties */}
              <div className="dsp-parties">
                <div className="dsp-party-card">
                  <div className="dsp-party-card__header">
                    <span className="dsp-party-card__icon">{roleIcons[dispute.filedByRole]}</span>
                    <span className="dsp-party-card__label">Filed By</span>
                  </div>
                  <div className="dsp-party-card__name">{dispute.filedBy}</div>
                  <div className="dsp-party-card__role">{dispute.filedByRole}</div>
                  <div className="dsp-party-card__contact">
                    <span><Mail size={14} /> {dispute.filedByEmail}</span>
                    <span><Smartphone size={14} /> {dispute.filedByPhone}</span>
                  </div>
                </div>
                <div className="dsp-party-vs">VS</div>
                <div className="dsp-party-card">
                  <div className="dsp-party-card__header">
                    <span className="dsp-party-card__icon">{roleIcons[dispute.againstRole]}</span>
                    <span className="dsp-party-card__label">Against</span>
                  </div>
                  <div className="dsp-party-card__name">{dispute.against}</div>
                  <div className="dsp-party-card__role">{dispute.againstRole}</div>
                </div>
              </div>

              {/* Description */}
              <div className="dsp-description">
                <h4>Description</h4>
                <p>{dispute.description}</p>
              </div>

              {/* Tags */}
              {dispute.tags.length > 0 && (
                <div className="dsp-tags">
                  <h4>Tags</h4>
                  <div className="dsp-tags__list">
                    {dispute.tags.map((tag, i) => (
                      <span key={i} className="dsp-tag">#{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Evidence */}
              <div className="dsp-evidence">
                <h4>Evidence & Attachments</h4>
                {dispute.evidenceCount > 0 ? (
                  <div className="dsp-evidence__list">
                    {Array.from({ length: dispute.evidenceCount }, (_, i) => (
                      <div key={i} className="dsp-evidence__item">
                        <span className="dsp-evidence__icon"><Paperclip size={16} /></span>
                        <span className="dsp-evidence__name">evidence_{i + 1}.jpg</span>
                        <button className="dsp-evidence__view">View</button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="dsp-evidence__empty">No evidence uploaded</p>
                )}
              </div>

              {/* Assignment */}
              <div className="dsp-assignment">
                <h4>Assignment</h4>
                <div className="dsp-assignment__info">
                  {dispute.assignedTo ? (
                    <div className="dsp-assignee">
                      <div className="dsp-assignee__avatar">{dispute.assignedTo.charAt(0)}</div>
                      <div>
                        <div className="dsp-assignee__name">{dispute.assignedTo}</div>
                        <div className="dsp-assignee__role">Support Agent</div>
                      </div>
                    </div>
                  ) : (
                    <span className="dsp-assignment__unassigned">Unassigned</span>
                  )}
                  <button className="dsp-btn dsp-btn--sm dsp-btn--secondary">
                    {dispute.assignedTo ? 'Reassign' : 'Assign'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Timeline Tab */}
          {activeTab === 'timeline' && (
            <div className="dsp-modal__timeline">
              <div className="dsp-timeline">
                {timeline.map((event, i) => (
                  <div key={event.id} className={`dsp-timeline__item dsp-timeline__item--${event.type}`}>
                    <div className="dsp-timeline__marker">
                      <div className="dsp-timeline__dot">
                        {event.type === 'created' && <PlusCircle size={16} />}
                        {event.type === 'status_change' && <RefreshCw size={16} />}
                        {event.type === 'message' && <MessageSquare size={16} />}
                        {event.type === 'escalated' && <AlertTriangle size={16} />}
                        {event.type === 'assigned' && <User size={16} />}
                        {event.type === 'resolved' && <CheckCircle size={16} />}
                        {event.type === 'attachment' && <Paperclip size={16} />}
                      </div>
                      {i < timeline.length - 1 && <div className="dsp-timeline__line" />}
                    </div>
                    <div className="dsp-timeline__content">
                      <div className="dsp-timeline__header">
                        <span className="dsp-timeline__title">{event.description}</span>
                        <span className="dsp-timeline__time">{formatRelativeTime(event.timestamp)}</span>
                      </div>
                      <div className="dsp-timeline__meta">
                        by {event.actor}
                        {event.actorRole && <span className="dsp-timeline__role">({event.actorRole})</span>}
                      </div>
                      {event.metadata && (
                        <div className="dsp-timeline__metadata">
                          {Object.entries(event.metadata).map(([k, v]) => (
                            <span key={k}>{k}: {v}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Messages Tab */}
          {activeTab === 'messages' && (
            <div className="dsp-modal__messages">
              <div className="dsp-messages-list">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`dsp-message ${msg.isInternal ? 'dsp-message--internal' : ''} ${msg.authorRole === 'platform' ? 'dsp-message--staff' : ''}`}
                  >
                    <div className="dsp-message__header">
                      <div className="dsp-message__author">
                        <span className="dsp-message__avatar">{roleIcons[msg.authorRole]}</span>
                        <span className="dsp-message__name">{msg.author}</span>
                        {msg.isInternal && <span className="dsp-message__internal-tag">Internal</span>}
                      </div>
                      <span className="dsp-message__time">{formatRelativeTime(msg.timestamp)}</span>
                    </div>
                    <div className="dsp-message__body">{msg.message}</div>
                  </div>
                ))}
              </div>

              <div className="dsp-message-composer">
                <div className="dsp-message-composer__toggle">
                  <label className="dsp-toggle">
                    <input
                      type="checkbox"
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                    />
                    <span className="dsp-toggle__slider" />
                  </label>
                  <span className={isInternal ? 'dsp-internal-label' : ''}>
                    {isInternal ? <><Lock size={14} /> Internal Note</> : <><MessageSquare size={14} /> Public Reply</>}
                  </span>
                </div>
                <div className="dsp-message-composer__input-wrap">
                  <textarea
                    className="dsp-message-composer__input"
                    placeholder={isInternal ? 'Add internal note...' : 'Type your reply...'}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    rows={3}
                  />
                  <button
                    className="dsp-btn dsp-btn--primary dsp-message-composer__send"
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Resolution Tab */}
          {activeTab === 'resolution' && (
            <div className="dsp-modal__resolution">
              {dispute.status === 'resolved' || dispute.status === 'closed' ? (
                <div className="dsp-resolution-summary">
                  <div className="dsp-resolution-summary__icon"><CheckCircle size={32} /></div>
                  <h3>Dispute Resolved</h3>
                  <p>{dispute.resolution}</p>
                  {dispute.refundAmount && (
                    <div className="dsp-resolution-summary__refund">
                      Refund Issued: <strong>{formatCurrency(dispute.refundAmount)}</strong>
                    </div>
                  )}
                  <div className="dsp-resolution-summary__date">
                    Resolved on {formatDate(dispute.resolvedAt || dispute.lastUpdate)}
                  </div>
                </div>
              ) : (
                <div className="dsp-resolution-form">
                  <div className="dsp-form-group">
                    <label>Update Status</label>
                    <select
                      className="dsp-select"
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as DisputeStatus)}
                    >
                      <option value="open">Open</option>
                      <option value="investigating">Investigating</option>
                      <option value="awaiting_response">Awaiting Response</option>
                      {canEscalate && <option value="escalated">Escalate</option>}
                      {canResolve && <option value="resolved">Resolve</option>}
                      <option value="closed">Close</option>
                    </select>
                  </div>

                  {(newStatus === 'resolved' || newStatus === 'closed') && (
                    <>
                      <div className="dsp-form-group">
                        <label>Resolution Note</label>
                        <textarea
                          className="dsp-textarea"
                          placeholder="Describe how this dispute was resolved..."
                          value={resolutionNote}
                          onChange={(e) => setResolutionNote(e.target.value)}
                          rows={4}
                        />
                      </div>

                      <div className="dsp-form-group">
                        <label>Refund Amount (Optional)</label>
                        <div className="dsp-input-with-prefix">
                          <span>₹</span>
                          <input
                            type="number"
                            className="dsp-input"
                            placeholder="0"
                            value={refundAmount}
                            onChange={(e) => setRefundAmount(e.target.value)}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {newStatus === 'escalated' && (
                    <div className="dsp-escalation-warning">
                      <span><AlertTriangle size={16} /></span>
                      <div>
                        <strong>Escalation Notice</strong>
                        <p>This will notify senior management and mark the dispute as high priority.</p>
                      </div>
                    </div>
                  )}

                  <button
                    className="dsp-btn dsp-btn--primary dsp-btn--full"
                    onClick={handleStatusUpdate}
                    disabled={isSubmitting || newStatus === dispute.status}
                  >
                    {isSubmitting ? (
                      <><span className="dsp-btn-spinner" /> Updating...</>
                    ) : (
                      <>Update Status</>
                    )}
                  </button>
                </div>
              )}

              {/* Quick Actions */}
              <div className="dsp-quick-actions">
                <h4>Quick Actions</h4>
                <div className="dsp-quick-actions__grid">
                  <button className="dsp-quick-action">
                    <span><Mail size={16} /></span>
                    <span>Email Parties</span>
                  </button>
                  <button className="dsp-quick-action">
                    <span><Phone size={16} /></span>
                    <span>Schedule Call</span>
                  </button>
                  <button className="dsp-quick-action">
                    <span><Banknote size={16} /></span>
                    <span>Process Refund</span>
                  </button>
                  <button className="dsp-quick-action">
                    <span><ClipboardList size={16} /></span>
                    <span>Generate Report</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="dsp-modal__footer">
          <button className="dsp-btn dsp-btn--secondary" onClick={onClose}>Close</button>
          <div className="dsp-modal__footer-actions">
            <button className="dsp-btn dsp-btn--secondary" onClick={() => {
              const csv = [
                ['Dispute ID','Order ID','Filed By','Against','Category','Subject','Priority','Status','Created','Assigned To','Resolution','Refund Amount'].join(','),
                [dispute.disputeId, dispute.orderId, dispute.filedBy, dispute.against,
                  categoryConfig[dispute.category].label, `"${dispute.subject.replace(/"/g,'""')}"`,
                  priorityConfig[dispute.priority].label, statusConfig[dispute.status].label,
                  formatDate(dispute.createdAt), dispute.assignedTo || 'Unassigned',
                  dispute.resolution ? `"${dispute.resolution.replace(/"/g,'""')}"` : '',
                  dispute.refundAmount != null ? dispute.refundAmount : ''].join(',')
              ].join('\n');
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${dispute.disputeId}_export.csv`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}><Download size={14} /> Export</button>
            {canEscalate && (
              <button className="dsp-btn dsp-btn--warning" onClick={() => onStatusChange(dispute.id, 'escalated')}>
                <AlertTriangle size={14} /> Escalate
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Main Component ─── */
const DisputeCenter: React.FC = () => {
  const navigate = useNavigate();
  const [disputes, setDisputes] = useState<Dispute[]>(generateDisputes());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | DisputeStatus>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | DisputePriority>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | DisputeCategory>('all');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  const addToast = useCallback((type: ToastNotification['type'], title: string, message: string) => {
    setToasts((prev) => [...prev, { id: Date.now().toString(), type, title, message }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /* ─── Filter & Sort ─── */
  const filtered = useMemo(() => {
    let data = [...disputes];

    if (statusFilter !== 'all') data = data.filter((d) => d.status === statusFilter);
    if (priorityFilter !== 'all') data = data.filter((d) => d.priority === priorityFilter);
    if (categoryFilter !== 'all') data = data.filter((d) => d.category === categoryFilter);

    if (search) {
      const q = search.toLowerCase();
      data = data.filter(
        (d) =>
          d.disputeId.toLowerCase().includes(q) ||
          d.subject.toLowerCase().includes(q) ||
          d.filedBy.toLowerCase().includes(q) ||
          d.against.toLowerCase().includes(q) ||
          d.orderId.toLowerCase().includes(q)
      );
    }

    data.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'createdAt':
          cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'priority':
          const pOrder: Record<DisputePriority, number> = { critical: 0, high: 1, medium: 2, low: 3 };
          cmp = pOrder[a.priority] - pOrder[b.priority];
          break;
        case 'status':
          cmp = a.status.localeCompare(b.status);
          break;
        case 'category':
          cmp = a.category.localeCompare(b.category);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return data;
  }, [disputes, search, statusFilter, priorityFilter, categoryFilter, sortField, sortDir]);

  /* ─── Pagination ─── */
  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  useEffect(() => { setCurrentPage(1); }, [search, statusFilter, priorityFilter, categoryFilter, perPage]);

  /* ─── Stats ─── */
  const stats = useMemo(() => ({
    open: disputes.filter((d) => d.status === 'open').length,
    investigating: disputes.filter((d) => d.status === 'investigating' || d.status === 'awaiting_response').length,
    escalated: disputes.filter((d) => d.status === 'escalated').length,
    resolved: disputes.filter((d) => d.status === 'resolved' || d.status === 'closed').length,
    critical: disputes.filter((d) => d.priority === 'critical' && d.status !== 'resolved' && d.status !== 'closed').length,
    avgResolutionTime: '18h', // Mock
  }), [disputes]);

  const activeFilterCount = [statusFilter !== 'all', priorityFilter !== 'all', categoryFilter !== 'all'].filter(Boolean).length;

  /* ─── Actions ─── */
  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginated.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(paginated.map((d) => d.id)));
  };

  const handleStatusChange = (id: string, status: DisputeStatus, note?: string) => {
    setDisputes((prev) =>
      prev.map((d) =>
        d.id === id
          ? {
              ...d,
              status,
              lastUpdate: new Date().toISOString(),
              ...(status === 'resolved' || status === 'closed'
                ? { resolvedAt: new Date().toISOString(), resolution: note || 'Resolved' }
                : {}),
            }
          : d
      )
    );
    addToast('success', 'Status Updated', `Dispute ${disputes.find((d) => d.id === id)?.disputeId} status changed to ${status}`);
  };

  const handleAddMessage = (id: string, message: string, isInternal: boolean) => {
    addToast('success', 'Message Sent', isInternal ? 'Internal note added' : 'Reply sent to parties');
  };

  const exportDisputesToCSV = (disputeList: Dispute[], filename: string) => {
    const headers = [
      'Dispute ID', 'Order ID', 'Order Amount', 'Filed By', 'Filed By Role', 'Filed By Email',
      'Filed By Phone', 'Against', 'Against Role', 'Category', 'Subject', 'Description',
      'Priority', 'Status', 'Created At', 'Last Update', 'Assigned To', 'Resolved At',
      'Resolution', 'Refund Amount', 'Evidence Count', 'Message Count', 'SLA Deadline', 'Tags'
    ];
    const rows = disputeList.map(d => [
      d.disputeId, d.orderId, d.orderAmount, d.filedBy, d.filedByRole, d.filedByEmail,
      d.filedByPhone, d.against, d.againstRole,
      categoryConfig[d.category].label, `"${d.subject.replace(/"/g, '""')}"`,
      `"${d.description.replace(/"/g, '""')}"`,
      priorityConfig[d.priority].label, statusConfig[d.status].label,
      formatDate(d.createdAt), formatDate(d.lastUpdate),
      d.assignedTo || 'Unassigned', d.resolvedAt ? formatDate(d.resolvedAt) : '',
      d.resolution ? `"${d.resolution.replace(/"/g, '""')}"` : '',
      d.refundAmount != null ? d.refundAmount : '',
      d.evidenceCount, d.messageCount,
      d.slaDeadline ? formatDate(d.slaDeadline) : '',
      d.tags.join('; ')
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExport = () => {
    setIsExporting(true);
    try {
      exportDisputesToCSV(filtered, `disputes_report_${new Date().toISOString().slice(0, 10)}.csv`);
      addToast('success', 'Export Complete', `${filtered.length} disputes exported as CSV`);
    } catch {
      addToast('error', 'Export Failed', 'Could not export disputes');
    }
    setIsExporting(false);
  };

  const handleExportSelected = () => {
    const selectedDisputes = disputes.filter(d => selectedIds.has(d.id));
    if (selectedDisputes.length === 0) return;
    try {
      exportDisputesToCSV(selectedDisputes, `disputes_selected_${new Date().toISOString().slice(0, 10)}.csv`);
      addToast('success', 'Export Complete', `${selectedDisputes.length} selected disputes exported as CSV`);
    } catch {
      addToast('error', 'Export Failed', 'Could not export selected disputes');
    }
  };

  return (
    <div className="dsp">
      {/* Toasts */}
      <div className="dsp-toast-container">
        {toasts.map((t) => <Toast key={t.id} toast={t} onDismiss={removeToast} />)}
      </div>

      {/* Header */}
      <header className="dsp-header">
        <div className="dsp-header__left">
          <h1 className="dsp-header__title"><Scale size={24} /> Dispute Center</h1>
          <p className="dsp-header__subtitle">Manage and resolve platform disputes efficiently</p>
        </div>
        <div className="dsp-header__right">
          <button className="dsp-btn dsp-btn--secondary" onClick={handleExport} disabled={isExporting}>
            {isExporting ? <><span className="dsp-btn-spinner" /> Exporting...</> : <><Download size={16} /> Export Report</>}
          </button>
          <button className="dsp-btn dsp-btn--primary"><Plus size={16} /> Log Dispute</button>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="dsp-stats">
        <div className="dsp-stat-card" style={{ '--stat-color': '#3b82f6' } as React.CSSProperties} onClick={() => setStatusFilter('open')}>
          <div className="dsp-stat-card__icon"><Circle size={20} fill="#3b82f6" color="#3b82f6" /></div>
          <div className="dsp-stat-card__content">
            <div className="dsp-stat-card__value"><AnimatedCounter target={stats.open} /></div>
            <div className="dsp-stat-card__label">Open</div>
          </div>
          <div className="dsp-stat-card__glow" />
        </div>
        <div className="dsp-stat-card" style={{ '--stat-color': '#8b5cf6' } as React.CSSProperties} onClick={() => setStatusFilter('investigating')}>
          <div className="dsp-stat-card__icon"><Search size={20} /></div>
          <div className="dsp-stat-card__content">
            <div className="dsp-stat-card__value"><AnimatedCounter target={stats.investigating} /></div>
            <div className="dsp-stat-card__label">Investigating</div>
          </div>
          <div className="dsp-stat-card__glow" />
        </div>
        <div className="dsp-stat-card" style={{ '--stat-color': '#dc2626' } as React.CSSProperties} onClick={() => setStatusFilter('escalated')}>
          <div className="dsp-stat-card__icon"><AlertTriangle size={20} /></div>
          <div className="dsp-stat-card__content">
            <div className="dsp-stat-card__value"><AnimatedCounter target={stats.escalated} /></div>
            <div className="dsp-stat-card__label">Escalated</div>
          </div>
          {stats.escalated > 0 && <div className="dsp-stat-card__pulse" />}
          <div className="dsp-stat-card__glow" />
        </div>
        <div className="dsp-stat-card" style={{ '--stat-color': '#16a34a' } as React.CSSProperties} onClick={() => setStatusFilter('resolved')}>
          <div className="dsp-stat-card__icon"><CheckCircle size={20} /></div>
          <div className="dsp-stat-card__content">
            <div className="dsp-stat-card__value"><AnimatedCounter target={stats.resolved} /></div>
            <div className="dsp-stat-card__label">Resolved</div>
          </div>
          <div className="dsp-stat-card__glow" />
        </div>
        <div className="dsp-stat-card" style={{ '--stat-color': '#f59e0b' } as React.CSSProperties}>
          <div className="dsp-stat-card__icon"><Circle size={20} fill="#dc2626" color="#dc2626" /></div>
          <div className="dsp-stat-card__content">
            <div className="dsp-stat-card__value"><AnimatedCounter target={stats.critical} /></div>
            <div className="dsp-stat-card__label">Critical</div>
          </div>
          {stats.critical > 0 && <div className="dsp-stat-card__pulse" />}
          <div className="dsp-stat-card__glow" />
        </div>
        <div className="dsp-stat-card" style={{ '--stat-color': '#06b6d4' } as React.CSSProperties}>
          <div className="dsp-stat-card__icon"><Timer size={20} /></div>
          <div className="dsp-stat-card__content">
            <div className="dsp-stat-card__value">{stats.avgResolutionTime}</div>
            <div className="dsp-stat-card__label">Avg. Resolution</div>
          </div>
          <div className="dsp-stat-card__glow" />
        </div>
      </div>

      {/* Toolbar */}
      <div className="dsp-toolbar">
        <div className="dsp-toolbar__left">
          <div className="dsp-search">
            <span className="dsp-search__icon"><Search size={16} /></span>
            <input
              ref={searchRef}
              className="dsp-search__input"
              placeholder="Search disputes by ID, subject, parties..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="dsp-search__clear" onClick={() => { setSearch(''); searchRef.current?.focus(); }}><X size={14} /></button>
            )}
          </div>
          <button
            className={`dsp-filter-toggle ${showFilters ? 'dsp-filter-toggle--active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={16} /> Filters
            {activeFilterCount > 0 && <span className="dsp-filter-badge">{activeFilterCount}</span>}
          </button>
        </div>
        <div className="dsp-toolbar__right">
          <span className="dsp-results-count">{filtered.length} disputes</span>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="dsp-filters-panel">
          <div className="dsp-filters-row">
            <div className="dsp-filter-group">
              <label>Status</label>
              <select className="dsp-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
                <option value="all">All Statuses</option>
                {Object.entries(statusConfig).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
            </div>
            <div className="dsp-filter-group">
              <label>Priority</label>
              <select className="dsp-select" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as any)}>
                <option value="all">All Priorities</option>
                {Object.entries(priorityConfig).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
            </div>
            <div className="dsp-filter-group">
              <label>Category</label>
              <select className="dsp-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as any)}>
                <option value="all">All Categories</option>
                {Object.entries(categoryConfig).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
            </div>
            <button
              className="dsp-clear-filters"
              onClick={() => { setStatusFilter('all'); setPriorityFilter('all'); setCategoryFilter('all'); }}
            >
              Clear All
            </button>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="dsp-bulk-bar">
          <span className="dsp-bulk-bar__count">{selectedIds.size} selected</span>
          <div className="dsp-bulk-bar__actions">
            <button className="dsp-btn dsp-btn--sm dsp-btn--secondary" onClick={() => setSelectedIds(new Set())}>
              Deselect
            </button>
            <button className="dsp-btn dsp-btn--sm dsp-btn--secondary"><User size={14} /> Bulk Assign</button>
            <button className="dsp-btn dsp-btn--sm dsp-btn--primary" onClick={handleExportSelected}><Download size={14} /> Export Selected</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="dsp-content">
        <div className="dsp-table-wrapper">
          <table className="dsp-table">
            <thead>
              <tr>
                <th className="dsp-th-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === paginated.length && paginated.length > 0}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th>Dispute</th>
                <th>Order</th>
                <th>Filed By</th>
                <th>Against</th>
                <th className="dsp-th-sortable" onClick={() => handleSort('category')}>
                  Category {sortField === 'category' && <span className="dsp-sort-icon">{sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}</span>}
                </th>
                <th>Subject</th>
                <th className="dsp-th-sortable" onClick={() => handleSort('priority')}>
                  Priority {sortField === 'priority' && <span className="dsp-sort-icon">{sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}</span>}
                </th>
                <th className="dsp-th-sortable" onClick={() => handleSort('status')}>
                  Status {sortField === 'status' && <span className="dsp-sort-icon">{sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}</span>}
                </th>
                <th className="dsp-th-sortable" onClick={() => handleSort('createdAt')}>
                  Updated {sortField === 'createdAt' && <span className="dsp-sort-icon">{sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}</span>}
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((d) => (
                <React.Fragment key={d.id}>
                  <tr
                    className={`dsp-table__row ${selectedIds.has(d.id) ? 'dsp-table__row--selected' : ''} ${expandedRow === d.id ? 'dsp-table__row--expanded' : ''}`}
                  >
                    <td className="dsp-td-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(d.id)}
                        onChange={() => toggleSelect(d.id)}
                      />
                    </td>
                    <td>
                      <span className="dsp-dispute-id" onClick={() => navigate(`/admin/disputes/${d.id}`)}>{d.disputeId}</span>
                    </td>
                    <td>
                      <span className="dsp-order-id">{d.orderId}</span>
                    </td>
                    <td>
                      <div className="dsp-party-cell">
                        <span className="dsp-party-cell__icon">{roleIcons[d.filedByRole]}</span>
                        <div>
                          <div className="dsp-party-cell__name">{d.filedBy}</div>
                          <div className="dsp-party-cell__role">{d.filedByRole}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="dsp-party-cell">
                        <span className="dsp-party-cell__icon">{roleIcons[d.againstRole]}</span>
                        <div className="dsp-party-cell__name">{d.against}</div>
                      </div>
                    </td>
                    <td>
                      <CategoryBadge category={d.category} />
                    </td>
                    <td>
                      <div className="dsp-subject-cell">
                        <span className="dsp-subject-cell__text">{d.subject}</span>
                        {d.evidenceCount > 0 && <span className="dsp-subject-cell__attach"><Paperclip size={12} />{d.evidenceCount}</span>}
                        {d.tags.includes('urgent') && <span className="dsp-subject-cell__urgent"><Flame size={14} /></span>}
                      </div>
                    </td>
                    <td>
                      <PriorityBadge priority={d.priority} size="sm" />
                    </td>
                    <td>
                      <StatusBadge status={d.status} />
                    </td>
                    <td>
                      <div className="dsp-time-cell">
                        <span className="dsp-time-cell__relative">{formatRelativeTime(d.lastUpdate)}</span>
                        {d.slaDeadline && d.status !== 'resolved' && d.status !== 'closed' && (
                          <SLAIndicator deadline={d.slaDeadline} />
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="dsp-actions-cell">
                        <button
                          className="dsp-action-btn dsp-action-btn--view"
                          onClick={() => navigate(`/admin/disputes/${d.id}`)}
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          className="dsp-action-btn dsp-action-btn--expand"
                          onClick={() => setExpandedRow(expandedRow === d.id ? null : d.id)}
                          title="Quick View"
                        >
                          {expandedRow === d.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded Quick View */}
                  {expandedRow === d.id && (
                    <tr className="dsp-expanded-row">
                      <td colSpan={11}>
                        <div className="dsp-expanded-content">
                          <div className="dsp-expanded-section">
                            <h4>Description</h4>
                            <p>{d.description}</p>
                          </div>
                          <div className="dsp-expanded-grid">
                            <div className="dsp-expanded-item">
                              <span className="dsp-expanded-label">Order Amount</span>
                              <span className="dsp-expanded-value">{formatCurrency(d.orderAmount)}</span>
                            </div>
                            <div className="dsp-expanded-item">
                              <span className="dsp-expanded-label">Assigned To</span>
                              <span className="dsp-expanded-value">{d.assignedTo || 'Unassigned'}</span>
                            </div>
                            <div className="dsp-expanded-item">
                              <span className="dsp-expanded-label">Evidence</span>
                              <span className="dsp-expanded-value">{d.evidenceCount} files</span>
                            </div>
                            <div className="dsp-expanded-item">
                              <span className="dsp-expanded-label">Messages</span>
                              <span className="dsp-expanded-value">{d.messageCount} messages</span>
                            </div>
                          </div>
                          {d.tags.length > 0 && (
                            <div className="dsp-expanded-tags">
                              {d.tags.map((tag, i) => (
                                <span key={i} className="dsp-tag">#{tag}</span>
                              ))}
                            </div>
                          )}
                          <div className="dsp-expanded-actions">
                            <button className="dsp-btn dsp-btn--sm dsp-btn--primary" onClick={() => navigate(`/admin/disputes/${d.id}`)}>
                              View Full Details
                            </button>
                            <button className="dsp-btn dsp-btn--sm dsp-btn--secondary"><MessageSquare size={14} /> Add Note</button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>

          {paginated.length === 0 && (
            <div className="dsp-empty-state">
              <span className="dsp-empty-state__icon"><Search size={32} /></span>
              <h3>No disputes found</h3>
              <p>Try adjusting your search or filter criteria</p>
              <button className="dsp-btn dsp-btn--secondary" onClick={() => {
                setSearch(''); setStatusFilter('all'); setPriorityFilter('all'); setCategoryFilter('all');
              }}>
                Clear All Filters
              </button>
            </div>
          )}
        </div>

        {/* Pagination */}
        {filtered.length > 0 && (
          <div className="dsp-pagination">
            <div className="dsp-pagination__info">
              <span>
                Showing <strong>{(currentPage - 1) * perPage + 1}</strong>–<strong>{Math.min(currentPage * perPage, filtered.length)}</strong> of <strong>{filtered.length}</strong>
              </span>
              <select
                className="dsp-pagination__per-page"
                value={perPage}
                onChange={(e) => setPerPage(Number(e.target.value))}
              >
                <option value={10}>10 / page</option>
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
              </select>
            </div>
            <div className="dsp-pagination__controls">
              <button
                className="dsp-pagination__btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(1)}
              >
                ««
              </button>
              <button
                className="dsp-pagination__btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                ‹
              </button>
              <span className="dsp-pagination__current">
                Page {currentPage} of {totalPages}
              </span>
              <button
                className="dsp-pagination__btn"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                ›
              </button>
              <button
                className="dsp-pagination__btn"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(totalPages)}
              >
                »»
              </button>
            </div>
          </div>
        )}
      </div>


    </div>
  );
};

export default DisputeCenter;