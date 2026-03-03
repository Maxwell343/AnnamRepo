import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  CheckCircle, XCircle, AlertTriangle, Info, X, User, DollarSign,
  ClipboardList, Smartphone, Mail, Building, Calendar, Rocket, Timer,
  Check, Clock, RefreshCw, Download, Zap, Users, Search, Filter,
  List, LayoutGrid, ArrowUp, ArrowDown, Eye, Circle
} from 'lucide-react';
import { API_BASE_URL } from '../../../config/api';
import './DriverPayouts.css';

/* ─── Types ─── */
type PayoutStatus = 'paid' | 'pending' | 'processing' | 'failed';
type SortField = 'name' | 'deliveries' | 'earnings' | 'netPayout' | 'status' | 'paidDate';
type SortDirection = 'asc' | 'desc';
type ViewMode = 'table' | 'cards';
type PayoutCycle = 'current' | 'previous' | 'custom';

interface DriverPayout {
  id: string;
  driverId: string;
  name: string;
  initials: string;
  phone: string;
  email: string;
  deliveries: number;
  earnings: number;
  commission: number;
  netPayout: number;
  tips: number;
  bonuses: number;
  deductions: number;
  status: PayoutStatus;
  paidDate: string;
  bankAccount: string;
  bankName: string;
  ifscCode: string;
  rating: number;
  completionRate: number;
  avgDeliveryTime: string;
  joinDate: string;
  vehicleType: string;
  zone: string;
  avatar?: string;
}

interface PayoutHistory {
  id: string;
  date: string;
  amount: number;
  status: PayoutStatus;
  transactionId: string;
}

interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
}

/* ─── Helpers ─── */
const formatCurrency = (val: number): string =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(val);

const formatDate = (s: string): string => {
  if (s === '—') return '—';
  return new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

/* ─── Animated Counter ─── */
const AnimatedCounter: React.FC<{ target: number; prefix?: string; duration?: number }> = ({
  target,
  prefix = '',
  duration = 1000,
}) => {
  const [val, setVal] = useState(0);
  const prev = useRef(0);

  useEffect(() => {
    const start = prev.current;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + (target - start) * eased);
      setVal(current);
      if (progress < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
    prev.current = target;
  }, [target, duration]);

  return (
    <>
      {prefix}
      {val.toLocaleString('en-IN')}
    </>
  );
};

/* ─── Progress Ring ─── */
const ProgressRing: React.FC<{ percent: number; size?: number; strokeWidth?: number; color?: string }> = ({
  percent,
  size = 44,
  strokeWidth = 4,
  color = '#4f46e5',
}) => {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;

  return (
    <svg width={size} height={size} className="dp-progress-ring">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700} fill={color}>
        {percent}%
      </text>
    </svg>
  );
};

/* ─── Star Rating ─── */
const StarRating: React.FC<{ rating: number }> = ({ rating }) => {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

  return (
    <div className="dp-star-rating">
      {Array.from({ length: fullStars }, (_, i) => (
        <span key={`f${i}`} className="dp-star dp-star--full">★</span>
      ))}
      {hasHalf && <span className="dp-star dp-star--half">★</span>}
      {Array.from({ length: emptyStars }, (_, i) => (
        <span key={`e${i}`} className="dp-star dp-star--empty">★</span>
      ))}
      <span className="dp-star-value">{rating.toFixed(1)}</span>
    </div>
  );
};

/* ─── Toast Component ─── */
const Toast: React.FC<{ toast: ToastNotification; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const icons: Record<string, React.ReactNode> = { success: <CheckCircle size={16} />, error: <XCircle size={16} />, warning: <AlertTriangle size={16} />, info: <Info size={16} /> };

  return (
    <div className={`dp-toast dp-toast--${toast.type}`}>
      <span className="dp-toast__icon">{icons[toast.type]}</span>
      <div className="dp-toast__content">
        <div className="dp-toast__title">{toast.title}</div>
        <div className="dp-toast__message">{toast.message}</div>
      </div>
      <button className="dp-toast__close" onClick={() => onDismiss(toast.id)}><X size={16} /></button>
      <div className="dp-toast__progress" style={{ animationDuration: '4s' }} />
    </div>
  );
};

/* ─── Detail Modal ─── */
const DriverDetailModal: React.FC<{
  driver: DriverPayout;
  onClose: () => void;
  onProcess: (id: string) => void;
  processing: boolean;
}> = ({ driver, onClose, onProcess, processing }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'earnings' | 'history'>('overview');
  const [history] = useState<PayoutHistory[]>([]);

  const tabs = [
    { key: 'overview' as const, label: 'Overview', icon: <User size={16} /> },
    { key: 'earnings' as const, label: 'Earnings', icon: <DollarSign size={16} /> },
    { key: 'history' as const, label: 'History', icon: <ClipboardList size={16} /> },
  ];

  return (
    <div className="dp-modal-overlay" onClick={onClose}>
      <div className="dp-modal" onClick={(e) => e.stopPropagation()}>
        <div className="dp-modal__header">
          <div className="dp-modal__header-left">
            <div className="dp-modal__avatar">{driver.initials}</div>
            <div>
              <h2 className="dp-modal__title">{driver.name}</h2>
              <p className="dp-modal__subtitle">{driver.driverId} • {driver.zone} • {driver.vehicleType}</p>
              <div className="dp-modal__badges">
                <span className={`dp-status-badge dp-status-badge--${driver.status}`}>
                  {driver.status.charAt(0).toUpperCase() + driver.status.slice(1)}
                </span>
                <StarRating rating={driver.rating} />
              </div>
            </div>
          </div>
          <button className="dp-modal__close" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="dp-modal__tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`dp-modal__tab ${activeTab === tab.key ? 'dp-modal__tab--active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <span>{tab.icon}</span> {tab.label}
            </button>
          ))}
        </div>

        <div className="dp-modal__content">
          {activeTab === 'overview' && (
            <div className="dp-modal__overview">
              <div className="dp-detail-grid">
                <div className="dp-detail-card">
                  <div className="dp-detail-card__icon"><Smartphone size={18} /></div>
                  <div className="dp-detail-card__content">
                    <span className="dp-detail-card__label">Phone</span>
                    <span className="dp-detail-card__value">{driver.phone}</span>
                  </div>
                </div>
                <div className="dp-detail-card">
                  <div className="dp-detail-card__icon"><Mail size={18} /></div>
                  <div className="dp-detail-card__content">
                    <span className="dp-detail-card__label">Email</span>
                    <span className="dp-detail-card__value">{driver.email}</span>
                  </div>
                </div>
                <div className="dp-detail-card">
                  <div className="dp-detail-card__icon"><Building size={18} /></div>
                  <div className="dp-detail-card__content">
                    <span className="dp-detail-card__label">Bank Account</span>
                    <span className="dp-detail-card__value">{driver.bankName} ({driver.bankAccount})</span>
                  </div>
                </div>
                <div className="dp-detail-card">
                  <div className="dp-detail-card__icon"><Calendar size={18} /></div>
                  <div className="dp-detail-card__content">
                    <span className="dp-detail-card__label">Joined</span>
                    <span className="dp-detail-card__value">{formatDate(driver.joinDate)}</span>
                  </div>
                </div>
              </div>

              <div className="dp-performance-grid">
                <div className="dp-performance-item">
                  <ProgressRing percent={driver.completionRate} color="#16a34a" />
                  <div>
                    <div className="dp-performance-item__value">{driver.completionRate}%</div>
                    <div className="dp-performance-item__label">Completion Rate</div>
                  </div>
                </div>
                <div className="dp-performance-item">
                  <div className="dp-performance-item__icon"><Rocket size={18} /></div>
                  <div>
                    <div className="dp-performance-item__value">{driver.deliveries}</div>
                    <div className="dp-performance-item__label">Deliveries</div>
                  </div>
                </div>
                <div className="dp-performance-item">
                  <div className="dp-performance-item__icon"><Timer size={18} /></div>
                  <div>
                    <div className="dp-performance-item__value">{driver.avgDeliveryTime}</div>
                    <div className="dp-performance-item__label">Avg. Time</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'earnings' && (
            <div className="dp-modal__earnings">
              <div className="dp-earnings-summary">
                <div className="dp-earnings-item dp-earnings-item--highlight">
                  <span className="dp-earnings-item__label">Net Payout</span>
                  <span className="dp-earnings-item__value dp-earnings-item__value--large">
                    {formatCurrency(driver.netPayout)}
                  </span>
                </div>
              </div>

              <div className="dp-earnings-breakdown">
                <h4>Breakdown</h4>
                <div className="dp-breakdown-list">
                  <div className="dp-breakdown-row">
                    <span className="dp-breakdown-row__label">
                      <span className="dp-breakdown-row__dot dp-breakdown-row__dot--green" />
                      Delivery Earnings
                    </span>
                    <span className="dp-breakdown-row__value dp-breakdown-row__value--positive">
                      +{formatCurrency(driver.earnings)}
                    </span>
                  </div>
                  <div className="dp-breakdown-row">
                    <span className="dp-breakdown-row__label">
                      <span className="dp-breakdown-row__dot dp-breakdown-row__dot--blue" />
                      Tips
                    </span>
                    <span className="dp-breakdown-row__value dp-breakdown-row__value--positive">
                      +{formatCurrency(driver.tips)}
                    </span>
                  </div>
                  <div className="dp-breakdown-row">
                    <span className="dp-breakdown-row__label">
                      <span className="dp-breakdown-row__dot dp-breakdown-row__dot--purple" />
                      Bonuses
                    </span>
                    <span className="dp-breakdown-row__value dp-breakdown-row__value--positive">
                      +{formatCurrency(driver.bonuses)}
                    </span>
                  </div>
                  <div className="dp-breakdown-row dp-breakdown-row--divider" />
                  <div className="dp-breakdown-row">
                    <span className="dp-breakdown-row__label">
                      <span className="dp-breakdown-row__dot dp-breakdown-row__dot--red" />
                      Platform Commission (10%)
                    </span>
                    <span className="dp-breakdown-row__value dp-breakdown-row__value--negative">
                      -{formatCurrency(driver.commission)}
                    </span>
                  </div>
                  {driver.deductions > 0 && (
                    <div className="dp-breakdown-row">
                      <span className="dp-breakdown-row__label">
                        <span className="dp-breakdown-row__dot dp-breakdown-row__dot--orange" />
                        Deductions
                      </span>
                      <span className="dp-breakdown-row__value dp-breakdown-row__value--negative">
                        -{formatCurrency(driver.deductions)}
                      </span>
                    </div>
                  )}
                  <div className="dp-breakdown-row dp-breakdown-row--total">
                    <span className="dp-breakdown-row__label">Net Payout</span>
                    <span className="dp-breakdown-row__value">{formatCurrency(driver.netPayout)}</span>
                  </div>
                </div>
              </div>

              {/* Earnings Bar Visual */}
              <div className="dp-earnings-bar-section">
                <h4>Earnings Composition</h4>
                <div className="dp-earnings-bar">
                  <div
                    className="dp-earnings-bar__segment dp-earnings-bar__segment--earnings"
                    style={{ width: `${(driver.earnings / (driver.earnings + driver.tips + driver.bonuses)) * 100}%` }}
                    title={`Earnings: ${formatCurrency(driver.earnings)}`}
                  />
                  <div
                    className="dp-earnings-bar__segment dp-earnings-bar__segment--tips"
                    style={{ width: `${(driver.tips / (driver.earnings + driver.tips + driver.bonuses)) * 100}%` }}
                    title={`Tips: ${formatCurrency(driver.tips)}`}
                  />
                  <div
                    className="dp-earnings-bar__segment dp-earnings-bar__segment--bonuses"
                    style={{ width: `${(driver.bonuses / (driver.earnings + driver.tips + driver.bonuses)) * 100}%` }}
                    title={`Bonuses: ${formatCurrency(driver.bonuses)}`}
                  />
                </div>
                <div className="dp-earnings-bar__legend">
                  <span><span className="dp-dot dp-dot--green" /> Earnings</span>
                  <span><span className="dp-dot dp-dot--blue" /> Tips</span>
                  <span><span className="dp-dot dp-dot--purple" /> Bonuses</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="dp-modal__history">
              <div className="dp-history-list">
                {history.map((h) => (
                  <div key={h.id} className="dp-history-item">
                    <div className="dp-history-item__left">
                      <div className={`dp-history-item__icon dp-history-item__icon--${h.status}`}>
                        {h.status === 'paid' ? <Check size={16} /> : h.status === 'failed' ? <X size={16} /> : <Clock size={16} />}
                      </div>
                      <div>
                        <div className="dp-history-item__amount">{formatCurrency(h.amount)}</div>
                        <div className="dp-history-item__date">{formatDate(h.date)}</div>
                      </div>
                    </div>
                    <div className="dp-history-item__right">
                      <span className={`dp-status-badge dp-status-badge--${h.status}`}>
                        {h.status}
                      </span>
                      <span className="dp-history-item__txn">{h.transactionId}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="dp-modal__footer">
          <button className="dp-btn dp-btn--secondary" onClick={onClose}>Close</button>
          {driver.status !== 'paid' && (
            <button
              className="dp-btn dp-btn--primary"
              onClick={() => onProcess(driver.id)}
              disabled={processing}
            >
              {processing ? (
                <><span className="dp-btn-spinner" /> Processing...</>
              ) : driver.status === 'failed' ? (
                <><RefreshCw size={16} /> Retry Payment</>
              ) : (
                <><DollarSign size={16} /> Process Payment</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─── Confirm Dialog ─── */
const ConfirmDialog: React.FC<{
  title: string;
  message: string;
  detail?: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  variant?: 'primary' | 'danger';
}> = ({ title, message, detail, confirmLabel, onConfirm, onCancel, loading, variant = 'primary' }) => (
  <div className="dp-modal-overlay" onClick={onCancel}>
    <div className="dp-confirm-dialog" onClick={(e) => e.stopPropagation()}>
      <div className="dp-confirm-dialog__icon">
        {variant === 'danger' ? <AlertTriangle size={24} /> : <DollarSign size={24} />}
      </div>
      <h3 className="dp-confirm-dialog__title">{title}</h3>
      <p className="dp-confirm-dialog__message">{message}</p>
      {detail && <p className="dp-confirm-dialog__detail">{detail}</p>}
      <div className="dp-confirm-dialog__actions">
        <button className="dp-btn dp-btn--secondary" onClick={onCancel} disabled={loading}>
          Cancel
        </button>
        <button
          className={`dp-btn dp-btn--${variant}`}
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? <><span className="dp-btn-spinner" /> Processing...</> : confirmLabel}
        </button>
      </div>
    </div>
  </div>
);

/* ─── Main Component ─── */
const DriverPayouts: React.FC = () => {
  const [payouts, setPayouts] = useState<DriverPayout[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | PayoutStatus>('all');
  const [zoneFilter, setZoneFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [payoutCycle, setPayoutCycle] = useState<PayoutCycle>('current');
  const [selectedDrivers, setSelectedDrivers] = useState<Set<string>>(new Set());
  const [selectedDriver, setSelectedDriver] = useState<DriverPayout | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/admin/driver-payouts`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setPayouts(data);
        else if (data.payouts) setPayouts(data.payouts);
      })
      .catch(() => {});
  }, []);

  const zones = useMemo(() => {
    const z = [...new Set(payouts.map((p) => p.zone))];
    return z.sort();
  }, [payouts]);

  const addToast = useCallback((type: ToastNotification['type'], title: string, message: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, title, message }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /* ─── Filtering & Sorting ─── */
  const filtered = useMemo(() => {
    let data = [...payouts];

    if (statusFilter !== 'all') data = data.filter((p) => p.status === statusFilter);
    if (zoneFilter !== 'all') data = data.filter((p) => p.zone === zoneFilter);
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.driverId.toLowerCase().includes(q) ||
          p.phone.includes(q) ||
          p.zone.toLowerCase().includes(q)
      );
    }

    data.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'deliveries': cmp = a.deliveries - b.deliveries; break;
        case 'earnings': cmp = a.earnings - b.earnings; break;
        case 'netPayout': cmp = a.netPayout - b.netPayout; break;
        case 'status': cmp = a.status.localeCompare(b.status); break;
        case 'paidDate': cmp = a.paidDate.localeCompare(b.paidDate); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return data;
  }, [payouts, statusFilter, zoneFilter, search, sortField, sortDir]);

  /* ─── Stats ─── */
  const stats = useMemo(() => {
    const totalPaid = payouts.filter((p) => p.status === 'paid').reduce((s, p) => s + p.netPayout, 0);
    const totalPending = payouts.filter((p) => p.status === 'pending').reduce((s, p) => s + p.netPayout, 0);
    const totalProcessing = payouts.filter((p) => p.status === 'processing').reduce((s, p) => s + p.netPayout, 0);
    const totalFailed = payouts.filter((p) => p.status === 'failed').reduce((s, p) => s + p.netPayout, 0);
    const pendingCount = payouts.filter((p) => p.status === 'pending' || p.status === 'failed').length;
    const totalEarnings = payouts.reduce((s, p) => s + p.earnings, 0);
    const totalCommission = payouts.reduce((s, p) => s + p.commission, 0);
    return { totalPaid, totalPending, totalProcessing, totalFailed, pendingCount, totalEarnings, totalCommission, activeDrivers: payouts.length };
  }, [payouts]);

  /* ─── Actions ─── */
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedDrivers((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const pending = filtered.filter((p) => p.status !== 'paid');
    if (selectedDrivers.size === pending.length) {
      setSelectedDrivers(new Set());
    } else {
      setSelectedDrivers(new Set(pending.map((p) => p.id)));
    }
  };

  const processPayment = useCallback(
    async (id: string) => {
      setProcessingId(id);
      setPayouts((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, status: 'paid' as PayoutStatus, paidDate: new Date().toISOString() }
            : p
        )
      );
      setProcessingId(null);
      setSelectedDriver(null);
      const driver = payouts.find((p) => p.id === id);
      addToast('success', 'Payment Processed', `${formatCurrency(driver?.netPayout || 0)} paid to ${driver?.name}`);
    },
    [payouts, addToast]
  );

  const processBulkPayments = useCallback(async () => {
    setBulkProcessing(true);
    const ids = new Set(selectedDrivers);
    setPayouts((prev) =>
      prev.map((p) =>
        ids.has(p.id)
          ? { ...p, status: 'paid' as PayoutStatus, paidDate: new Date().toISOString() }
          : p
      )
    );
    setBulkProcessing(false);
    setShowBulkConfirm(false);
    addToast('success', 'Bulk Payment Complete', `${ids.size} payouts processed successfully`);
    setSelectedDrivers(new Set());
  }, [selectedDrivers, addToast]);

  const activeFilterCount = [statusFilter !== 'all', zoneFilter !== 'all'].filter(Boolean).length;

  const cycleLabels: Record<PayoutCycle, string> = {
    current: 'Jan 1 – Jan 15, 2024',
    previous: 'Dec 16 – Dec 31, 2023',
    custom: 'Custom Range',
  };

  return (
    <div className="dp">
      {/* Toasts */}
      <div className="dp-toast-container">
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onDismiss={removeToast} />
        ))}
      </div>

      {/* Header */}
      <header className="dp-header">
        <div className="dp-header__left">
          <h1 className="dp-header__title"><DollarSign size={20} /> Driver Payouts</h1>
          <p className="dp-header__subtitle">Manage and process driver payment settlements</p>
        </div>
        <div className="dp-header__right">
          <div className="dp-cycle-selector">
            {(['current', 'previous'] as PayoutCycle[]).map((c) => (
              <button
                key={c}
                className={`dp-cycle-btn ${payoutCycle === c ? 'dp-cycle-btn--active' : ''}`}
                onClick={() => setPayoutCycle(c)}
              >
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </button>
            ))}
          </div>
          <button
            className="dp-btn dp-btn--secondary"
            onClick={() => {
              const headers = ['Driver ID', 'Name', 'Phone', 'Email', 'Zone', 'Vehicle', 'Deliveries', 'Gross Earnings (INR)', 'Commission (INR)', 'Tips (INR)', 'Bonuses (INR)', 'Deductions (INR)', 'Net Payout (INR)', 'Status', 'Paid Date', 'Bank', 'Account', 'Rating', 'Completion Rate (%)'];
              const rows = filtered.map((p) => [
                p.driverId, p.name, p.phone, p.email, p.zone, p.vehicleType,
                p.deliveries, p.earnings, p.commission, p.tips, p.bonuses, p.deductions, p.netPayout,
                p.status, p.paidDate === '—' ? '' : formatDate(p.paidDate),
                p.bankName, p.bankAccount, p.rating, p.completionRate,
              ]);
              const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `Annam_Driver_Payouts_${new Date().toISOString().slice(0, 10)}.csv`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              addToast('success', 'Export Complete', `${filtered.length} driver payouts exported to CSV`);
            }}
          >
            <Download size={16} /> Export CSV
          </button>
          <button
            className="dp-btn dp-btn--primary"
            onClick={() => {
              if (stats.pendingCount > 0) setShowBulkConfirm(true);
              else addToast('info', 'No Pending', 'All payouts are already processed');
            }}
          >
            <Zap size={16} /> Process All Pending
          </button>
        </div>
      </header>

      {/* Cycle Info */}
      <div className="dp-cycle-info">
        <span className="dp-cycle-info__icon"><Calendar size={16} /></span>
        <span>Settlement Cycle: <strong>{cycleLabels[payoutCycle]}</strong></span>
      </div>

      {/* Summary Cards */}
      <div className="dp-summary-cards">
        <div className="dp-summary-card" style={{ '--sc-color': '#16a34a' } as React.CSSProperties}>
          <div className="dp-summary-card__icon"><CheckCircle size={20} /></div>
          <div className="dp-summary-card__content">
            <div className="dp-summary-card__value">
              <AnimatedCounter target={stats.totalPaid} prefix="₹" />
            </div>
            <div className="dp-summary-card__label">Total Paid</div>
            <div className="dp-summary-card__sub">
              {payouts.filter((p) => p.status === 'paid').length} drivers
            </div>
          </div>
          <div className="dp-summary-card__glow" />
        </div>

        <div className="dp-summary-card" style={{ '--sc-color': '#f59e0b' } as React.CSSProperties}>
          <div className="dp-summary-card__icon"><Clock size={20} /></div>
          <div className="dp-summary-card__content">
            <div className="dp-summary-card__value">
              <AnimatedCounter target={stats.totalPending} prefix="₹" />
            </div>
            <div className="dp-summary-card__label">Pending Payouts</div>
            <div className="dp-summary-card__sub">
              {payouts.filter((p) => p.status === 'pending').length} drivers
            </div>
          </div>
          <div className="dp-summary-card__glow" />
        </div>

        <div className="dp-summary-card" style={{ '--sc-color': '#06b6d4' } as React.CSSProperties}>
          <div className="dp-summary-card__icon"><RefreshCw size={20} /></div>
          <div className="dp-summary-card__content">
            <div className="dp-summary-card__value">
              <AnimatedCounter target={stats.totalProcessing} prefix="₹" />
            </div>
            <div className="dp-summary-card__label">Processing</div>
            <div className="dp-summary-card__sub">
              {payouts.filter((p) => p.status === 'processing').length} drivers
            </div>
          </div>
          <div className="dp-summary-card__glow" />
        </div>

        <div className="dp-summary-card" style={{ '--sc-color': '#dc2626' } as React.CSSProperties}>
          <div className="dp-summary-card__icon"><XCircle size={20} /></div>
          <div className="dp-summary-card__content">
            <div className="dp-summary-card__value">
              <AnimatedCounter target={stats.totalFailed} prefix="₹" />
            </div>
            <div className="dp-summary-card__label">Failed</div>
            <div className="dp-summary-card__sub">
              {payouts.filter((p) => p.status === 'failed').length} drivers
            </div>
          </div>
          <div className="dp-summary-card__glow" />
        </div>

        <div className="dp-summary-card" style={{ '--sc-color': '#4f46e5' } as React.CSSProperties}>
          <div className="dp-summary-card__icon"><Users size={20} /></div>
          <div className="dp-summary-card__content">
            <div className="dp-summary-card__value">
              <AnimatedCounter target={stats.activeDrivers} />
            </div>
            <div className="dp-summary-card__label">Active Drivers</div>
            <div className="dp-summary-card__sub">This cycle</div>
          </div>
          <div className="dp-summary-card__glow" />
        </div>

        <div className="dp-summary-card" style={{ '--sc-color': '#8b5cf6' } as React.CSSProperties}>
          <div className="dp-summary-card__icon"><Building size={20} /></div>
          <div className="dp-summary-card__content">
            <div className="dp-summary-card__value">
              <AnimatedCounter target={stats.totalCommission} prefix="₹" />
            </div>
            <div className="dp-summary-card__label">Total Commission</div>
            <div className="dp-summary-card__sub">Platform revenue</div>
          </div>
          <div className="dp-summary-card__glow" />
        </div>
      </div>

      {/* Toolbar */}
      <div className="dp-toolbar">
        <div className="dp-toolbar__left">
          <div className="dp-search">
            <span className="dp-search__icon"><Search size={16} /></span>
            <input
              ref={searchRef}
              className="dp-search__input"
              placeholder="Search drivers by name, ID, phone, or zone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="dp-search__clear" onClick={() => { setSearch(''); searchRef.current?.focus(); }}>
                <X size={16} />
              </button>
            )}
          </div>

          <button
            className={`dp-filter-toggle ${showFilters ? 'dp-filter-toggle--active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={16} /> Filters
            {activeFilterCount > 0 && <span className="dp-filter-badge">{activeFilterCount}</span>}
          </button>
        </div>

        <div className="dp-toolbar__right">
          <div className="dp-view-toggle">
            <button
              className={`dp-view-btn ${viewMode === 'table' ? 'dp-view-btn--active' : ''}`}
              onClick={() => setViewMode('table')}
              title="Table View"
            >
              <List size={16} />
            </button>
            <button
              className={`dp-view-btn ${viewMode === 'cards' ? 'dp-view-btn--active' : ''}`}
              onClick={() => setViewMode('cards')}
              title="Card View"
            >
              <LayoutGrid size={16} />
            </button>
          </div>

          <span className="dp-results-count">{filtered.length} of {payouts.length} drivers</span>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="dp-filters-panel">
          <div className="dp-filters-row">
            <div className="dp-filter-group">
              <label>Status</label>
              <select
                className="dp-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | PayoutStatus)}
              >
                <option value="all">All Statuses</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            <div className="dp-filter-group">
              <label>Zone</label>
              <select
                className="dp-select"
                value={zoneFilter}
                onChange={(e) => setZoneFilter(e.target.value)}
              >
                <option value="all">All Zones</option>
                {zones.map((z) => (
                  <option key={z} value={z}>{z}</option>
                ))}
              </select>
            </div>
            <button
              className="dp-clear-filters"
              onClick={() => { setStatusFilter('all'); setZoneFilter('all'); }}
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedDrivers.size > 0 && (
        <div className="dp-bulk-bar">
          <span className="dp-bulk-bar__count">{selectedDrivers.size} driver(s) selected</span>
          <div className="dp-bulk-bar__actions">
            <button className="dp-btn dp-btn--sm dp-btn--secondary" onClick={() => setSelectedDrivers(new Set())}>
              Deselect All
            </button>
            <button className="dp-btn dp-btn--sm dp-btn--primary" onClick={() => setShowBulkConfirm(true)}>
              <DollarSign size={16} /> Process Selected
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="dp-content">
        {viewMode === 'table' ? (
          /* ─── TABLE VIEW ─── */
          <div className="dp-table-wrapper">
            <table className="dp-table">
              <thead>
                <tr>
                  <th className="dp-th-checkbox">
                    <input
                      type="checkbox"
                      checked={
                        selectedDrivers.size > 0 &&
                        selectedDrivers.size === filtered.filter((p) => p.status !== 'paid').length
                      }
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="dp-th-sortable" onClick={() => handleSort('name')}>
                    Driver {sortField === 'name' && <span className="dp-sort-icon">{sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}</span>}
                  </th>
                  <th className="dp-th-sortable" onClick={() => handleSort('deliveries')}>
                    Deliveries {sortField === 'deliveries' && <span className="dp-sort-icon">{sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}</span>}
                  </th>
                  <th className="dp-th-sortable" onClick={() => handleSort('earnings')}>
                    Gross {sortField === 'earnings' && <span className="dp-sort-icon">{sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}</span>}
                  </th>
                  <th>Commission</th>
                  <th className="dp-th-sortable" onClick={() => handleSort('netPayout')}>
                    Net Payout {sortField === 'netPayout' && <span className="dp-sort-icon">{sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}</span>}
                  </th>
                  <th className="dp-th-sortable" onClick={() => handleSort('status')}>
                    Status {sortField === 'status' && <span className="dp-sort-icon">{sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}</span>}
                  </th>
                  <th>Bank</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr
                    key={p.id}
                    className={`dp-table__row ${selectedDrivers.has(p.id) ? 'dp-table__row--selected' : ''}`}
                  >
                    <td className="dp-td-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedDrivers.has(p.id)}
                        disabled={p.status === 'paid'}
                        onChange={() => toggleSelect(p.id)}
                      />
                    </td>
                    <td>
                      <div className="dp-driver-cell" onClick={() => setSelectedDriver(p)}>
                        <div className="dp-driver-cell__avatar">{p.initials}</div>
                        <div className="dp-driver-cell__info">
                          <span className="dp-driver-cell__name">{p.name}</span>
                          <span className="dp-driver-cell__id">{p.driverId} • {p.zone}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="dp-deliveries-cell">
                        <span className="dp-deliveries-cell__count">{p.deliveries}</span>
                        <div className="dp-deliveries-cell__bar">
                          <div
                            className="dp-deliveries-cell__fill"
                            style={{ width: `${(p.deliveries / 50) * 100}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="dp-amount-cell">{formatCurrency(p.earnings)}</td>
                    <td className="dp-amount-cell dp-amount-cell--negative">-{formatCurrency(p.commission)}</td>
                    <td className="dp-amount-cell dp-amount-cell--bold">{formatCurrency(p.netPayout)}</td>
                    <td>
                      <span className={`dp-status-badge dp-status-badge--${p.status}`}>
                        {p.status === 'paid' && <><Check size={12} />{' '}</>}
                        {p.status === 'processing' && <><RefreshCw size={12} />{' '}</>}
                        {p.status === 'failed' && <><X size={12} />{' '}</>}
                        {p.status === 'pending' && <><Circle size={12} />{' '}</>}
                        {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                      </span>
                    </td>
                    <td>
                      <div className="dp-bank-cell">
                        <span className="dp-bank-cell__name">{p.bankName}</span>
                        <span className="dp-bank-cell__account">{p.bankAccount}</span>
                      </div>
                    </td>
                    <td>
                      <div className="dp-actions-cell">
                        <button
                          className="dp-action-btn dp-action-btn--view"
                          onClick={() => setSelectedDriver(p)}
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        {p.status !== 'paid' && (
                          <button
                            className={`dp-action-btn ${p.status === 'failed' ? 'dp-action-btn--retry' : 'dp-action-btn--pay'}`}
                            onClick={() => processPayment(p.id)}
                            disabled={processingId === p.id}
                            title={p.status === 'failed' ? 'Retry' : 'Pay Now'}
                          >
                            {processingId === p.id ? (
                              <span className="dp-btn-spinner dp-btn-spinner--small" />
                            ) : p.status === 'failed' ? <RefreshCw size={16} /> : <DollarSign size={16} />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filtered.length === 0 && (
              <div className="dp-empty-state">
                <span className="dp-empty-state__icon"><Search size={32} /></span>
                <h3>No drivers found</h3>
                <p>Try adjusting your search or filter criteria</p>
                <button
                  className="dp-btn dp-btn--secondary"
                  onClick={() => { setSearch(''); setStatusFilter('all'); setZoneFilter('all'); }}
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </div>
        ) : (
          /* ─── CARD VIEW ─── */
          <div className="dp-card-grid">
            {filtered.map((p) => (
              <div
                key={p.id}
                className={`dp-payout-card ${selectedDrivers.has(p.id) ? 'dp-payout-card--selected' : ''}`}
              >
                <div className="dp-payout-card__header">
                  <div className="dp-payout-card__driver">
                    <div className="dp-payout-card__avatar">{p.initials}</div>
                    <div>
                      <div className="dp-payout-card__name">{p.name}</div>
                      <div className="dp-payout-card__meta">{p.driverId} • {p.zone}</div>
                    </div>
                  </div>
                  <span className={`dp-status-badge dp-status-badge--${p.status}`}>
                    {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                  </span>
                </div>

                <div className="dp-payout-card__stats">
                  <div className="dp-payout-card__stat">
                    <span className="dp-payout-card__stat-label">Deliveries</span>
                    <span className="dp-payout-card__stat-value">{p.deliveries}</span>
                  </div>
                  <div className="dp-payout-card__stat">
                    <span className="dp-payout-card__stat-label">Rating</span>
                    <span className="dp-payout-card__stat-value">⭐ {p.rating}</span>
                  </div>
                  <div className="dp-payout-card__stat">
                    <span className="dp-payout-card__stat-label">Completion</span>
                    <span className="dp-payout-card__stat-value">{p.completionRate}%</span>
                  </div>
                </div>

                <div className="dp-payout-card__amounts">
                  <div className="dp-payout-card__amount-row">
                    <span>Gross Earnings</span>
                    <span className="dp-payout-card__amount--positive">{formatCurrency(p.earnings)}</span>
                  </div>
                  <div className="dp-payout-card__amount-row">
                    <span>Commission</span>
                    <span className="dp-payout-card__amount--negative">-{formatCurrency(p.commission)}</span>
                  </div>
                  <div className="dp-payout-card__amount-row dp-payout-card__amount-row--total">
                    <span>Net Payout</span>
                    <span>{formatCurrency(p.netPayout)}</span>
                  </div>
                </div>

                <div className="dp-payout-card__footer">
                  <button
                    className="dp-btn dp-btn--sm dp-btn--ghost"
                    onClick={() => setSelectedDriver(p)}
                  >
                    View Details
                  </button>
                  {p.status !== 'paid' ? (
                    <button
                      className="dp-btn dp-btn--sm dp-btn--primary"
                      onClick={() => processPayment(p.id)}
                      disabled={processingId === p.id}
                    >
                      {processingId === p.id ? (
                        <><span className="dp-btn-spinner dp-btn-spinner--small" /> ...</>
                      ) : p.status === 'failed' ? <><RefreshCw size={14} /> Retry</> : <><DollarSign size={14} /> Pay</>}
                    </button>
                  ) : (
                    <span className="dp-payout-card__paid-label"><Check size={14} /> Paid on {formatDate(p.paidDate)}</span>
                  )}
                </div>

                {p.status !== 'paid' && (
                  <div className="dp-payout-card__select">
                    <input
                      type="checkbox"
                      checked={selectedDrivers.has(p.id)}
                      onChange={() => toggleSelect(p.id)}
                    />
                  </div>
                )}
              </div>
            ))}

            {filtered.length === 0 && (
              <div className="dp-empty-state dp-empty-state--cards">
                <span className="dp-empty-state__icon"><Search size={32} /></span>
                <h3>No drivers found</h3>
                <p>Try adjusting your search or filter criteria</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="dp-footer">
        <div className="dp-footer__left">
          Showing <strong>{filtered.length}</strong> of <strong>{payouts.length}</strong> drivers
        </div>
        <div className="dp-footer__right">
          Total Net Payout: <strong>{formatCurrency(filtered.reduce((s, p) => s + p.netPayout, 0))}</strong>
        </div>
      </div>

      {/* Modals */}
      {selectedDriver && (
        <DriverDetailModal
          driver={selectedDriver}
          onClose={() => setSelectedDriver(null)}
          onProcess={processPayment}
          processing={processingId === selectedDriver.id}
        />
      )}

      {showBulkConfirm && (
        <ConfirmDialog
          title="Process Bulk Payments"
          message={`Are you sure you want to process payouts for ${selectedDrivers.size > 0 ? selectedDrivers.size : stats.pendingCount} driver(s)?`}
          detail={`Total amount: ${formatCurrency(
            payouts
              .filter((p) =>
                selectedDrivers.size > 0
                  ? selectedDrivers.has(p.id)
                  : p.status === 'pending' || p.status === 'failed'
              )
              .reduce((s, p) => s + p.netPayout, 0)
          )}`}
          confirmLabel="Process Payments"
          onConfirm={processBulkPayments}
          onCancel={() => setShowBulkConfirm(false)}
          loading={bulkProcessing}
        />
      )}
    </div>
  );
};

export default DriverPayouts;