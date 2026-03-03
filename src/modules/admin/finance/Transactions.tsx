import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  AlertTriangle, ArrowDown, ArrowDownLeft, ArrowUp, ArrowUpRight,
  Banknote, BarChart3, Building2, Car, Check, CheckCircle,
  ChevronDown, ChevronUp, Circle, ClipboardList, CreditCard,
  DollarSign, Download, Eye, Factory, Handshake, Info,
  RefreshCw, Scale, Search, ShoppingCart, Undo2, User, X, XCircle,
} from 'lucide-react';
import { API_BASE_URL } from '../../../config/api';
import './Transactions.css';

/* ─── Types ─── */
type TxnType = 'order' | 'payout' | 'refund' | 'commission' | 'adjustment' | 'subscription';
type TxnStatus = 'success' | 'pending' | 'failed' | 'reversed';
type TxnDirection = 'credit' | 'debit';
type SortField = 'date' | 'amount' | 'type' | 'status' | 'party';
type SortDirection = 'asc' | 'desc';
type DateRange = 'today' | '7d' | '30d' | '90d' | 'custom';
type ActiveTab = 'all' | 'credits' | 'debits';

interface Transaction {
  id: string;
  txnId: string;
  date: string;
  type: TxnType;
  description: string;
  party: string;
  partyType: 'customer' | 'driver' | 'vendor' | 'platform' | 'ngo';
  amount: number;
  direction: TxnDirection;
  method: string;
  status: TxnStatus;
  orderId?: string;
  notes?: string;
  fee?: number;
  reference?: string;
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

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const formatTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

const formatFullDate = (iso: string): string =>
  new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const typeConfig: Record<TxnType, { icon: React.ReactNode; label: string; color: string }> = {
  order: { icon: <ShoppingCart size={14} />, label: 'Order', color: '#4f46e5' },
  payout: { icon: <Banknote size={14} />, label: 'Payout', color: '#16a34a' },
  refund: { icon: <Undo2 size={14} />, label: 'Refund', color: '#f59e0b' },
  commission: { icon: <Building2 size={14} />, label: 'Commission', color: '#06b6d4' },
  adjustment: { icon: <Scale size={14} />, label: 'Adjustment', color: '#8b5cf6' },
  subscription: { icon: <RefreshCw size={14} />, label: 'Subscription', color: '#ec4899' },
};

const statusConfig: Record<TxnStatus, { icon: React.ReactNode; label: string }> = {
  success: { icon: <Check size={14} />, label: 'Success' },
  pending: { icon: <Circle size={14} />, label: 'Pending' },
  failed: { icon: <X size={14} />, label: 'Failed' },
  reversed: { icon: <Undo2 size={14} />, label: 'Reversed' },
};

const partyIcons: Record<string, React.ReactNode> = {
  customer: <User size={14} />,
  driver: <Car size={14} />,
  vendor: <Factory size={14} />,
  platform: <Building2 size={14} />,
  ngo: <Handshake size={14} />,
};

/* ─── Animated Counter ─── */
const AnimatedCounter: React.FC<{ target: number; prefix?: string; duration?: number }> = ({
  target, prefix = '', duration = 900,
}) => {
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

  return <>{prefix}{val.toLocaleString('en-IN')}</>;
};

/* ─── Mini Bar Chart ─── */
const MiniBarChart: React.FC<{ data: number[]; color: string; height?: number }> = ({
  data, color, height = 40,
}) => {
  const max = Math.max(...data, 1);
  const barW = 100 / data.length;

  return (
    <svg width="100%" height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="txn-mini-chart">
      {data.map((v, i) => {
        const h = (v / max) * (height - 4);
        return (
          <rect
            key={i}
            x={i * barW + barW * 0.15}
            y={height - h - 2}
            width={barW * 0.7}
            height={h}
            rx={1.5}
            fill={color}
            opacity={0.7 + (i / data.length) * 0.3}
          />
        );
      })}
    </svg>
  );
};

/* ─── Toast ─── */
const Toast: React.FC<{ toast: ToastNotification; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), 4000);
    return () => clearTimeout(t);
  }, [toast.id, onDismiss]);

  const icons: Record<string, React.ReactNode> = { success: <CheckCircle size={16} />, error: <XCircle size={16} />, warning: <AlertTriangle size={16} />, info: <Info size={16} /> };

  return (
    <div className={`txn-toast txn-toast--${toast.type}`}>
      <span className="txn-toast__icon">{icons[toast.type]}</span>
      <div className="txn-toast__content">
        <div className="txn-toast__title">{toast.title}</div>
        <div className="txn-toast__message">{toast.message}</div>
      </div>
      <button className="txn-toast__close" onClick={() => onDismiss(toast.id)}><X size={14} /></button>
      <div className="txn-toast__progress" style={{ animationDuration: '4s' }} />
    </div>
  );
};

/* ─── Transaction Detail Modal ─── */
const TransactionModal: React.FC<{
  txn: Transaction;
  onClose: () => void;
  onRetry?: () => void;
  onRefund?: () => void;
}> = ({ txn, onClose, onRetry, onRefund }) => {
  const cfg = typeConfig[txn.type];
  const stCfg = statusConfig[txn.status];

  return (
    <div className="txn-modal-overlay" onClick={onClose}>
      <div className="txn-modal" onClick={(e) => e.stopPropagation()}>
        <div className="txn-modal__header">
          <div className="txn-modal__header-left">
            <div className="txn-modal__type-icon" style={{ background: `${cfg.color}15`, color: cfg.color }}>
              {cfg.icon}
            </div>
            <div>
              <h2 className="txn-modal__title">{txn.txnId}</h2>
              <p className="txn-modal__subtitle">{txn.description}</p>
            </div>
          </div>
          <button className="txn-modal__close" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="txn-modal__content">
          {/* Amount Section */}
          <div className="txn-modal__amount-section">
            <span className={`txn-modal__amount txn-modal__amount--${txn.direction}`}>
              {txn.direction === 'credit' ? '+' : '-'} {formatCurrency(txn.amount)}
            </span>
            <div className="txn-modal__badges">
              <span className={`txn-status-badge txn-status-badge--${txn.status}`}>
                {stCfg.icon} {stCfg.label}
              </span>
              <span className="txn-type-badge" style={{ background: `${cfg.color}15`, color: cfg.color }}>
                {cfg.icon} {cfg.label}
              </span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="txn-modal__details">
            <div className="txn-modal__detail-row">
              <span className="txn-modal__detail-label">Date & Time</span>
              <span className="txn-modal__detail-value">{formatFullDate(txn.date)}</span>
            </div>
            <div className="txn-modal__detail-row">
              <span className="txn-modal__detail-label">Party</span>
              <span className="txn-modal__detail-value">
                <span className="txn-modal__party-icon">{partyIcons[txn.partyType]}</span>
                {txn.party}
                <span className="txn-modal__party-type">{txn.partyType}</span>
              </span>
            </div>
            <div className="txn-modal__detail-row">
              <span className="txn-modal__detail-label">Payment Method</span>
              <span className="txn-modal__detail-value">{txn.method}</span>
            </div>
            {txn.orderId && (
              <div className="txn-modal__detail-row">
                <span className="txn-modal__detail-label">Order ID</span>
                <span className="txn-modal__detail-value txn-modal__detail-value--link">{txn.orderId}</span>
              </div>
            )}
            <div className="txn-modal__detail-row">
              <span className="txn-modal__detail-label">Reference</span>
              <span className="txn-modal__detail-value txn-modal__detail-value--mono">{txn.reference}</span>
            </div>
            {txn.fee !== undefined && (
              <div className="txn-modal__detail-row">
                <span className="txn-modal__detail-label">Transaction Fee</span>
                <span className="txn-modal__detail-value">{formatCurrency(txn.fee)}</span>
              </div>
            )}
            <div className="txn-modal__detail-row">
              <span className="txn-modal__detail-label">Direction</span>
              <span className={`txn-modal__detail-value txn-direction-tag txn-direction-tag--${txn.direction}`}>
                {txn.direction === 'credit' ? <><ArrowUpRight size={14} /> Credit (Incoming)</> : <><ArrowDownLeft size={14} /> Debit (Outgoing)</>}
              </span>
            </div>
            {txn.notes && (
              <div className="txn-modal__detail-row txn-modal__detail-row--full">
                <span className="txn-modal__detail-label">Notes</span>
                <span className="txn-modal__detail-value txn-modal__notes">{txn.notes}</span>
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="txn-modal__timeline">
            <h4>Transaction Timeline</h4>
            <div className="txn-timeline">
              <div className="txn-timeline__item txn-timeline__item--completed">
                <div className="txn-timeline__dot" />
                <div className="txn-timeline__content">
                  <span className="txn-timeline__title">Transaction Initiated</span>
                  <span className="txn-timeline__time">{formatFullDate(txn.date)}</span>
                </div>
              </div>
              <div className={`txn-timeline__item ${txn.status !== 'failed' ? 'txn-timeline__item--completed' : 'txn-timeline__item--failed'}`}>
                <div className="txn-timeline__dot" />
                <div className="txn-timeline__content">
                  <span className="txn-timeline__title">
                    {txn.status === 'failed' ? 'Processing Failed' : 'Payment Processed'}
                  </span>
                  <span className="txn-timeline__time">
                    {txn.status === 'pending' ? 'In progress...' : formatFullDate(txn.date)}
                  </span>
                </div>
              </div>
              {txn.status === 'success' && (
                <div className="txn-timeline__item txn-timeline__item--completed">
                  <div className="txn-timeline__dot" />
                  <div className="txn-timeline__content">
                    <span className="txn-timeline__title">Settlement Complete</span>
                    <span className="txn-timeline__time">{formatFullDate(txn.date)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="txn-modal__footer">
          <button className="txn-btn txn-btn--secondary" onClick={onClose}>Close</button>
          <div className="txn-modal__footer-actions">
            {txn.status === 'failed' && onRetry && (
              <button className="txn-btn txn-btn--warning" onClick={onRetry}><RefreshCw size={14} /> Retry</button>
            )}
            {txn.status === 'success' && txn.direction === 'credit' && onRefund && (
              <button className="txn-btn txn-btn--danger" onClick={onRefund}><Undo2 size={14} /> Refund</button>
            )}
            <button className="txn-btn txn-btn--primary"><Download size={14} /> Download Receipt</button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Main Component ─── */
const Transactions: React.FC = () => {
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | TxnType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | TxnStatus>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [activeTab, setActiveTab] = useState<ActiveTab>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [isExporting, setIsExporting] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/admin/transactions`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setAllTransactions(data);
        else if (data.transactions) setAllTransactions(data.transactions);
      })
      .catch(() => {});
  }, []);

  const addToast = useCallback((type: ToastNotification['type'], title: string, message: string) => {
    setToasts((prev) => [...prev, { id: Date.now().toString(), type, title, message }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  /* ─── Filter & Sort ─── */
  const filtered = useMemo(() => {
    let data = [...allTransactions];

    // Date range
    const now = new Date();
    if (dateRange !== 'custom') {
      const days = dateRange === 'today' ? 1 : dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
      const cutoff = new Date(now.getTime() - days * 86400000);
      data = data.filter((t) => new Date(t.date) >= cutoff);
    }

    // Tab
    if (activeTab === 'credits') data = data.filter((t) => t.direction === 'credit');
    if (activeTab === 'debits') data = data.filter((t) => t.direction === 'debit');

    // Filters
    if (typeFilter !== 'all') data = data.filter((t) => t.type === typeFilter);
    if (statusFilter !== 'all') data = data.filter((t) => t.status === statusFilter);
    if (methodFilter !== 'all') data = data.filter((t) => t.method === methodFilter);

    // Search
    if (search) {
      const q = search.toLowerCase();
      data = data.filter((t) =>
        t.txnId.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.party.toLowerCase().includes(q) ||
        t.orderId?.toLowerCase().includes(q) ||
        t.reference?.toLowerCase().includes(q)
      );
    }

    // Sort
    data.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'date': cmp = new Date(a.date).getTime() - new Date(b.date).getTime(); break;
        case 'amount': cmp = a.amount - b.amount; break;
        case 'type': cmp = a.type.localeCompare(b.type); break;
        case 'status': cmp = a.status.localeCompare(b.status); break;
        case 'party': cmp = a.party.localeCompare(b.party); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return data;
  }, [allTransactions, search, typeFilter, statusFilter, methodFilter, dateRange, activeTab, sortField, sortDir]);

  /* ─── Pagination ─── */
  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((currentPage - 1) * perPage, currentPage * perPage);

  useEffect(() => { setCurrentPage(1); }, [search, typeFilter, statusFilter, methodFilter, dateRange, activeTab, perPage]);

  /* ─── Stats ─── */
  const stats = useMemo(() => {
    const totalCredits = filtered.filter((t) => t.direction === 'credit').reduce((s, t) => s + t.amount, 0);
    const totalDebits = filtered.filter((t) => t.direction === 'debit').reduce((s, t) => s + t.amount, 0);
    const successCount = filtered.filter((t) => t.status === 'success').length;
    const pendingCount = filtered.filter((t) => t.status === 'pending').length;
    const failedCount = filtered.filter((t) => t.status === 'failed').length;
    const avgAmount = filtered.length ? Math.round(filtered.reduce((s, t) => s + t.amount, 0) / filtered.length) : 0;

    // Daily volumes for chart (last 7 entries grouped)
    const dailyMap = new Map<string, number>();
    filtered.forEach((t) => {
      const key = new Date(t.date).toLocaleDateString();
      dailyMap.set(key, (dailyMap.get(key) || 0) + t.amount);
    });
    const dailyVolumes = Array.from(dailyMap.values()).slice(0, 7);

    return { totalCredits, totalDebits, successCount, pendingCount, failedCount, avgAmount, net: totalCredits - totalDebits, dailyVolumes };
  }, [filtered]);

  const methods = useMemo(() => [...new Set(allTransactions.map((t) => t.method))].sort(), [allTransactions]);
  const activeFilterCount = [typeFilter !== 'all', statusFilter !== 'all', methodFilter !== 'all'].filter(Boolean).length;

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
    else setSelectedIds(new Set(paginated.map((t) => t.id)));
  };

  const handleExport = () => {
    setIsExporting(true);
    {
      const headers = ['TXN ID', 'Date', 'Time', 'Type', 'Description', 'Party', 'Party Type', 'Direction', 'Amount (INR)', 'Fee (INR)', 'Net Amount (INR)', 'Method', 'Status', 'Order ID', 'Reference', 'Notes'];
      const rows = filtered.map((t) => [
        t.txnId, formatDate(t.date), formatTime(t.date), typeConfig[t.type].label,
        t.description, t.party, t.partyType, t.direction,
        t.amount, t.fee || 0, t.amount - (t.fee || 0),
        t.method, t.status, t.orderId || '', t.reference || '', t.notes || '',
      ]);
      const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Annam_Transactions_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setIsExporting(false);
      addToast('success', 'Export Complete', `${filtered.length} transactions exported to CSV`);
    }
  };

  const handleRetry = (txn: Transaction) => {
    addToast('info', 'Retry Initiated', `Retrying transaction ${txn.txnId}`);
    setSelectedTxn(null);
  };

  const handleRefund = (txn: Transaction) => {
    addToast('warning', 'Refund Initiated', `Refund for ${formatCurrency(txn.amount)} is being processed`);
    setSelectedTxn(null);
  };

  const dateRanges: { key: DateRange; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: '7d', label: '7 Days' },
    { key: '30d', label: '30 Days' },
    { key: '90d', label: '90 Days' },
  ];

  const tabs: { key: ActiveTab; label: string; icon: React.ReactNode; count: number }[] = [
    { key: 'all', label: 'All', icon: <ClipboardList size={14} />, count: filtered.length },
    { key: 'credits', label: 'Credits', icon: <ArrowUpRight size={14} />, count: filtered.filter((t) => t.direction === 'credit').length },
    { key: 'debits', label: 'Debits', icon: <ArrowDownLeft size={14} />, count: filtered.filter((t) => t.direction === 'debit').length },
  ];

  return (
    <div className="txn">
      {/* Toasts */}
      <div className="txn-toast-container">
        {toasts.map((t) => <Toast key={t.id} toast={t} onDismiss={removeToast} />)}
      </div>

      {/* Header */}
      <header className="txn-header">
        <div className="txn-header__left">
          <h1 className="txn-header__title"><CreditCard size={20} /> Transactions</h1>
          <p className="txn-header__subtitle">Track all financial movements across your platform</p>
        </div>
        <div className="txn-header__right">
          <div className="txn-date-range">
            {dateRanges.map((r) => (
              <button
                key={r.key}
                className={`txn-date-range__btn ${dateRange === r.key ? 'txn-date-range__btn--active' : ''}`}
                onClick={() => setDateRange(r.key)}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button className="txn-btn txn-btn--secondary" onClick={handleExport} disabled={isExporting}>
            {isExporting ? <><span className="txn-btn-spinner" /> Exporting...</> : <><Download size={14} /> Export CSV</>}
          </button>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="txn-summary-cards">
        <div className="txn-summary-card" style={{ '--sc-color': '#16a34a' } as React.CSSProperties}>
          <div className="txn-summary-card__top">
            <div className="txn-summary-card__icon"><ArrowUpRight size={18} /></div>
            <div className="txn-summary-card__chart">
              <MiniBarChart data={stats.dailyVolumes.length ? stats.dailyVolumes : [0]} color="#16a34a" />
            </div>
          </div>
          <div className="txn-summary-card__value">
            <AnimatedCounter target={stats.totalCredits} prefix="₹" />
          </div>
          <div className="txn-summary-card__label">Total Credits</div>
        </div>

        <div className="txn-summary-card" style={{ '--sc-color': '#dc2626' } as React.CSSProperties}>
          <div className="txn-summary-card__top">
            <div className="txn-summary-card__icon"><ArrowDownLeft size={18} /></div>
            <div className="txn-summary-card__chart">
              <MiniBarChart data={stats.dailyVolumes.length ? stats.dailyVolumes : [0]} color="#dc2626" />
            </div>
          </div>
          <div className="txn-summary-card__value">
            <AnimatedCounter target={stats.totalDebits} prefix="₹" />
          </div>
          <div className="txn-summary-card__label">Total Debits</div>
        </div>

        <div className="txn-summary-card" style={{ '--sc-color': '#4f46e5' } as React.CSSProperties}>
          <div className="txn-summary-card__top">
            <div className="txn-summary-card__icon"><DollarSign size={18} /></div>
            <span className={`txn-summary-card__trend ${stats.net >= 0 ? 'txn-summary-card__trend--up' : 'txn-summary-card__trend--down'}`}>
              {stats.net >= 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
            </span>
          </div>
          <div className="txn-summary-card__value">
            <AnimatedCounter target={Math.abs(stats.net)} prefix={stats.net >= 0 ? '₹' : '-₹'} />
          </div>
          <div className="txn-summary-card__label">Net Balance</div>
        </div>

        <div className="txn-summary-card" style={{ '--sc-color': '#f59e0b' } as React.CSSProperties}>
          <div className="txn-summary-card__top">
            <div className="txn-summary-card__icon"><BarChart3 size={18} /></div>
          </div>
          <div className="txn-summary-card__value">
            <AnimatedCounter target={stats.avgAmount} prefix="₹" />
          </div>
          <div className="txn-summary-card__label">Avg. Transaction</div>
        </div>

        <div className="txn-summary-card" style={{ '--sc-color': '#06b6d4' } as React.CSSProperties}>
          <div className="txn-summary-card__top">
            <div className="txn-summary-card__icon"><CheckCircle size={18} /></div>
          </div>
          <div className="txn-summary-card__stats-row">
            <span className="txn-summary-card__stat txn-summary-card__stat--success">{stats.successCount}</span>
            <span className="txn-summary-card__stat txn-summary-card__stat--pending">{stats.pendingCount}</span>
            <span className="txn-summary-card__stat txn-summary-card__stat--failed">{stats.failedCount}</span>
          </div>
          <div className="txn-summary-card__label">Success / Pending / Failed</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="txn-tabs-bar">
        <div className="txn-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`txn-tab ${activeTab === tab.key ? 'txn-tab--active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <span className="txn-tab__icon">{tab.icon}</span>
              {tab.label}
              <span className="txn-tab__count">{tab.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div className="txn-toolbar">
        <div className="txn-toolbar__left">
          <div className="txn-search">
            <span className="txn-search__icon"><Search size={16} /></span>
            <input
              ref={searchRef}
              className="txn-search__input"
              placeholder="Search by TXN ID, description, party, order..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="txn-search__clear" onClick={() => { setSearch(''); searchRef.current?.focus(); }}><X size={14} /></button>
            )}
          </div>
          <button
            className={`txn-filter-toggle ${showFilters ? 'txn-filter-toggle--active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <ChevronDown size={14} /> Filters
            {activeFilterCount > 0 && <span className="txn-filter-badge">{activeFilterCount}</span>}
          </button>
        </div>
        <div className="txn-toolbar__right">
          <span className="txn-results-count">{filtered.length} transactions</span>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="txn-filters-panel">
          <div className="txn-filters-row">
            <div className="txn-filter-group">
              <label>Type</label>
              <select className="txn-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)}>
                <option value="all">All Types</option>
                {Object.entries(typeConfig).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
            </div>
            <div className="txn-filter-group">
              <label>Status</label>
              <select className="txn-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
                <option value="all">All Statuses</option>
                <option value="success">Success</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="reversed">Reversed</option>
              </select>
            </div>
            <div className="txn-filter-group">
              <label>Method</label>
              <select className="txn-select" value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)}>
                <option value="all">All Methods</option>
                {methods.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <button
              className="txn-clear-filters"
              onClick={() => { setTypeFilter('all'); setStatusFilter('all'); setMethodFilter('all'); }}
            >
              Clear All
            </button>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="txn-bulk-bar">
          <span className="txn-bulk-bar__count">{selectedIds.size} selected</span>
          <div className="txn-bulk-bar__actions">
            <button className="txn-btn txn-btn--sm txn-btn--secondary" onClick={() => setSelectedIds(new Set())}>
              Deselect
            </button>
            <button className="txn-btn txn-btn--sm txn-btn--primary" onClick={() => {
              addToast('success', 'Exported', `${selectedIds.size} transactions exported`);
              setSelectedIds(new Set());
            }}>
              <Download size={14} /> Export Selected
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="txn-content">
        <div className="txn-table-wrapper">
          <table className="txn-table">
            <thead>
              <tr>
                <th className="txn-th-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === paginated.length && paginated.length > 0}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="txn-th-sortable" onClick={() => handleSort('date')}>
                  Date {sortField === 'date' && <span className="txn-sort-icon">{sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />}</span>}
                </th>
                <th>TXN ID</th>
                <th className="txn-th-sortable" onClick={() => handleSort('type')}>
                  Type {sortField === 'type' && <span className="txn-sort-icon">{sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />}</span>}
                </th>
                <th>Description</th>
                <th className="txn-th-sortable" onClick={() => handleSort('party')}>
                  Party {sortField === 'party' && <span className="txn-sort-icon">{sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />}</span>}
                </th>
                <th>Method</th>
                <th className="txn-th-sortable" onClick={() => handleSort('amount')}>
                  Amount {sortField === 'amount' && <span className="txn-sort-icon">{sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />}</span>}
                </th>
                <th className="txn-th-sortable" onClick={() => handleSort('status')}>
                  Status {sortField === 'status' && <span className="txn-sort-icon">{sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />}</span>}
                </th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((t) => {
                const cfg = typeConfig[t.type];
                const stCfg = statusConfig[t.status];
                return (
                  <React.Fragment key={t.id}>
                    <tr
                      className={`txn-table__row ${selectedIds.has(t.id) ? 'txn-table__row--selected' : ''} ${expandedRow === t.id ? 'txn-table__row--expanded' : ''}`}
                    >
                      <td className="txn-td-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(t.id)}
                          onChange={() => toggleSelect(t.id)}
                        />
                      </td>
                      <td>
                        <div className="txn-date-cell">
                          <span className="txn-date-cell__date">{formatDate(t.date)}</span>
                          <span className="txn-date-cell__time">{formatTime(t.date)}</span>
                        </div>
                      </td>
                      <td>
                        <span className="txn-id-cell" onClick={() => setSelectedTxn(t)}>{t.txnId}</span>
                      </td>
                      <td>
                        <span className="txn-type-pill" style={{ background: `${cfg.color}12`, color: cfg.color }}>
                          {cfg.icon} {cfg.label}
                        </span>
                      </td>
                      <td>
                        <div className="txn-desc-cell">
                          <span className="txn-desc-cell__text">{t.description}</span>
                          {t.notes && <span className="txn-desc-cell__flag"><AlertTriangle size={14} /></span>}
                        </div>
                      </td>
                      <td>
                        <div className="txn-party-cell">
                          <span className="txn-party-cell__icon">{partyIcons[t.partyType]}</span>
                          <div className="txn-party-cell__info">
                            <span className="txn-party-cell__name">{t.party}</span>
                            <span className="txn-party-cell__type">{t.partyType}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="txn-method-cell">{t.method}</span>
                      </td>
                      <td>
                        <span className={`txn-amount-cell txn-amount-cell--${t.direction}`}>
                          {t.direction === 'credit' ? '+' : '-'} {formatCurrency(t.amount)}
                        </span>
                      </td>
                      <td>
                        <span className={`txn-status-badge txn-status-badge--${t.status}`}>
                          {stCfg.icon} {stCfg.label}
                        </span>
                      </td>
                      <td>
                        <div className="txn-actions-cell">
                          <button
                            className="txn-action-btn txn-action-btn--view"
                            onClick={() => setSelectedTxn(t)}
                            title="View Details"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            className="txn-action-btn txn-action-btn--expand"
                            onClick={() => setExpandedRow(expandedRow === t.id ? null : t.id)}
                            title="Quick View"
                          >
                            {expandedRow === t.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Quick View */}
                    {expandedRow === t.id && (
                      <tr className="txn-expanded-row">
                        <td colSpan={10}>
                          <div className="txn-expanded-content">
                            <div className="txn-expanded-item">
                              <span className="txn-expanded-label">Reference</span>
                              <span className="txn-expanded-value txn-expanded-value--mono">{t.reference}</span>
                            </div>
                            {t.orderId && (
                              <div className="txn-expanded-item">
                                <span className="txn-expanded-label">Order ID</span>
                                <span className="txn-expanded-value txn-expanded-value--link">{t.orderId}</span>
                              </div>
                            )}
                            <div className="txn-expanded-item">
                              <span className="txn-expanded-label">Fee</span>
                              <span className="txn-expanded-value">{formatCurrency(t.fee || 0)}</span>
                            </div>
                            <div className="txn-expanded-item">
                              <span className="txn-expanded-label">Net Amount</span>
                              <span className="txn-expanded-value">{formatCurrency(t.amount - (t.fee || 0))}</span>
                            </div>
                            {t.notes && (
                              <div className="txn-expanded-item txn-expanded-item--full">
                                <span className="txn-expanded-label">Notes</span>
                                <span className="txn-expanded-value txn-expanded-value--warning">{t.notes}</span>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>

          {paginated.length === 0 && (
            <div className="txn-empty-state">
              <span className="txn-empty-state__icon"><Search size={40} /></span>
              <h3>No transactions found</h3>
              <p>Try adjusting your search or filter criteria</p>
              <button className="txn-btn txn-btn--secondary" onClick={() => {
                setSearch(''); setTypeFilter('all'); setStatusFilter('all'); setMethodFilter('all');
              }}>
                Clear All Filters
              </button>
            </div>
          )}
        </div>

        {/* Pagination */}
        {filtered.length > 0 && (
          <div className="txn-pagination">
            <div className="txn-pagination__info">
              <span>
                Showing <strong>{(currentPage - 1) * perPage + 1}</strong>–<strong>{Math.min(currentPage * perPage, filtered.length)}</strong> of <strong>{filtered.length}</strong>
              </span>
              <select
                className="txn-pagination__per-page"
                value={perPage}
                onChange={(e) => setPerPage(Number(e.target.value))}
              >
                <option value={10}>10 / page</option>
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
              </select>
            </div>
            <div className="txn-pagination__controls">
              <button
                className="txn-pagination__btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(1)}
              >
                ««
              </button>
              <button
                className="txn-pagination__btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                ‹
              </button>
              <span className="txn-pagination__current">
                Page {currentPage} of {totalPages}
              </span>
              <button
                className="txn-pagination__btn"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                ›
              </button>
              <button
                className="txn-pagination__btn"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(totalPages)}
              >
                »»
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedTxn && (
        <TransactionModal
          txn={selectedTxn}
          onClose={() => setSelectedTxn(null)}
          onRetry={() => handleRetry(selectedTxn)}
          onRefund={() => handleRefund(selectedTxn)}
        />
      )}
    </div>
  );
};

export default Transactions;