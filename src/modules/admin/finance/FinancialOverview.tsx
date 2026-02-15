import React, { useState, useEffect, useRef, useCallback } from 'react';
import './FinancialOverview.css';

type TimeRange = '7d' | '30d' | '90d' | '1y';
type ChartType = 'revenue' | 'orders' | 'commission';
type ActiveTab = 'overview' | 'transactions' | 'payouts' | 'invoices';

interface Transaction {
  id: string;
  date: string;
  customer: string;
  type: 'credit' | 'debit' | 'refund';
  amount: number;
  status: 'completed' | 'pending' | 'failed';
  method: string;
  orderId: string;
}

interface PayoutRecord {
  id: string;
  driver: string;
  amount: number;
  status: 'paid' | 'pending' | 'processing';
  date: string;
  trips: number;
  avatar: string;
}

interface Invoice {
  id: string;
  vendor: string;
  amount: number;
  status: 'paid' | 'overdue' | 'pending';
  dueDate: string;
  issuedDate: string;
}

interface ChartDataPoint {
  label: string;
  revenue: number;
  orders: number;
  commission: number;
}

interface FinanceCardData {
  label: string;
  value: string;
  rawValue: number;
  trend: number;
  icon: string;
  color: string;
  sparkline: number[];
}

const generateChartData = (range: TimeRange): ChartDataPoint[] => {
  const data: ChartDataPoint[] = [];
  const points = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 12 : 12;

  for (let i = 0; i < points; i++) {
    const base = 30000 + Math.random() * 50000;
    let label = '';
    if (range === '7d') {
      const d = new Date();
      d.setDate(d.getDate() - (points - 1 - i));
      label = d.toLocaleDateString('en-IN', { weekday: 'short' });
    } else if (range === '30d') {
      label = `${i + 1}`;
    } else if (range === '90d') {
      label = `W${i + 1}`;
    } else {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      label = months[i];
    }

    data.push({
      label,
      revenue: Math.round(base),
      orders: Math.round(100 + Math.random() * 200),
      commission: Math.round(base * 0.15),
    });
  }
  return data;
};

const generateTransactions = (): Transaction[] => {
  const customers = ['Rajesh Kumar', 'Priya Sharma', 'Amit Patel', 'Sneha Gupta', 'Vikram Singh', 'Anita Desai', 'Mohan Rao', 'Kavita Iyer', 'Suresh Nair', 'Deepa Menon', 'Arjun Reddy', 'Meera Joshi'];
  const methods = ['UPI', 'Credit Card', 'Debit Card', 'Net Banking', 'COD', 'Wallet'];
  const types: ('credit' | 'debit' | 'refund')[] = ['credit', 'credit', 'credit', 'debit', 'refund'];
  const statuses: ('completed' | 'pending' | 'failed')[] = ['completed', 'completed', 'completed', 'pending', 'failed'];

  return Array.from({ length: 20 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - Math.floor(Math.random() * 30));
    return {
      id: `TXN${String(100000 + i).slice(1)}`,
      date: d.toISOString(),
      customer: customers[Math.floor(Math.random() * customers.length)],
      type: types[Math.floor(Math.random() * types.length)],
      amount: Math.round(500 + Math.random() * 15000),
      status: statuses[Math.floor(Math.random() * statuses.length)],
      method: methods[Math.floor(Math.random() * methods.length)],
      orderId: `ORD${String(200000 + i).slice(1)}`,
    };
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

const generatePayouts = (): PayoutRecord[] => {
  const drivers = [
    { name: 'Ramesh Yadav', avatar: 'RY' },
    { name: 'Sunil Patil', avatar: 'SP' },
    { name: 'Ganesh More', avatar: 'GM' },
    { name: 'Anil Shinde', avatar: 'AS' },
    { name: 'Prakash Jadhav', avatar: 'PJ' },
    { name: 'Vijay Kulkarni', avatar: 'VK' },
    { name: 'Manoj Tiwari', avatar: 'MT' },
    { name: 'Ravi Verma', avatar: 'RV' },
  ];
  const statuses: ('paid' | 'pending' | 'processing')[] = ['paid', 'paid', 'pending', 'processing'];

  return drivers.map((driver, i) => {
    const d = new Date();
    d.setDate(d.getDate() - Math.floor(Math.random() * 15));
    return {
      id: `PAY${String(300000 + i).slice(1)}`,
      driver: driver.name,
      amount: Math.round(8000 + Math.random() * 25000),
      status: statuses[Math.floor(Math.random() * statuses.length)],
      date: d.toISOString(),
      trips: Math.round(15 + Math.random() * 40),
      avatar: driver.avatar,
    };
  });
};

const generateInvoices = (): Invoice[] => {
  const vendors = ['FreshFarm Supplies', 'Green Valley Dairy', 'Organic Fields Co.', 'AgroPure Ltd.', 'Krishna Grains', 'Sunrise Fruits'];
  const statuses: ('paid' | 'overdue' | 'pending')[] = ['paid', 'paid', 'overdue', 'pending', 'pending'];

  return vendors.map((vendor, i) => {
    const issued = new Date();
    issued.setDate(issued.getDate() - Math.floor(Math.random() * 30 + 10));
    const due = new Date(issued);
    due.setDate(due.getDate() + 30);
    return {
      id: `INV-${2024}-${String(i + 1).padStart(4, '0')}`,
      vendor,
      amount: Math.round(15000 + Math.random() * 100000),
      status: statuses[Math.floor(Math.random() * statuses.length)],
      dueDate: due.toISOString(),
      issuedDate: issued.toISOString(),
    };
  });
};

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

/* ─── Mini Sparkline ─── */
const Sparkline: React.FC<{ data: number[]; color: string; width?: number; height?: number }> = ({
  data,
  color,
  width = 80,
  height = 32,
}) => {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 2;
  const innerW = width - padding * 2;
  const innerH = height - padding * 2;

  const points = data
    .map((v, i) => {
      const x = padding + (i / (data.length - 1)) * innerW;
      const y = padding + innerH - ((v - min) / range) * innerH;
      return `${x},${y}`;
    })
    .join(' ');

  const areaPoints = `${padding},${height - padding} ${points} ${width - padding},${height - padding}`;

  return (
    <svg width={width} height={height} className="fo-sparkline">
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0.02} />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#grad-${color.replace('#', '')})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

/* ─── Interactive Chart ─── */
const InteractiveChart: React.FC<{
  data: ChartDataPoint[];
  chartType: ChartType;
  animated: boolean;
}> = ({ data, chartType, animated }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  const width = 800;
  const height = 320;
  const paddingLeft = 70;
  const paddingRight = 30;
  const paddingTop = 20;
  const paddingBottom = 50;
  const chartW = width - paddingLeft - paddingRight;
  const chartH = height - paddingTop - paddingBottom;

  const values = data.map((d) => d[chartType]);
  const maxVal = Math.max(...values) * 1.15;
  const minVal = 0;
  const range = maxVal - minVal || 1;

  const getX = (i: number) => paddingLeft + (i / (data.length - 1)) * chartW;
  const getY = (v: number) => paddingTop + chartH - ((v - minVal) / range) * chartH;

  const linePoints = values.map((v, i) => `${getX(i)},${getY(v)}`).join(' ');
  const areaPoints = `${getX(0)},${paddingTop + chartH} ${linePoints} ${getX(data.length - 1)},${paddingTop + chartH}`;

  const gridLines = 5;
  const gridValues = Array.from({ length: gridLines + 1 }, (_, i) => minVal + (range / gridLines) * i);

  const chartColors: Record<ChartType, string> = {
    revenue: '#4f46e5',
    orders: '#06b6d4',
    commission: '#16a34a',
  };

  const color = chartColors[chartType];

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const mouseX = ((e.clientX - rect.left) / rect.width) * width;
      let closest = 0;
      let closestDist = Infinity;
      data.forEach((_, i) => {
        const dist = Math.abs(mouseX - getX(i));
        if (dist < closestDist) {
          closestDist = dist;
          closest = i;
        }
      });
      setHoveredIndex(closest);
      setTooltipPos({ x: getX(closest), y: getY(values[closest]) });
    },
    [data, values],
  );

  return (
    <div className="fo-chart-container">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className={`fo-chart-svg ${animated ? 'fo-chart-svg--animated' : ''}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredIndex(null)}
      >
        <defs>
          <linearGradient id={`chartGrad-${chartType}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.2} />
            <stop offset="100%" stopColor={color} stopOpacity={0.01} />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid */}
        {gridValues.map((v, i) => {
          const y = getY(v);
          return (
            <g key={i}>
              <line x1={paddingLeft} y1={y} x2={width - paddingRight} y2={y} stroke="#e5e7eb" strokeWidth={1} strokeDasharray={i === 0 ? 'none' : '4,4'} />
              <text x={paddingLeft - 12} y={y + 4} textAnchor="end" fontSize={11} fill="#9ca3af">
                {chartType === 'orders' ? Math.round(v) : `₹${(v / 1000).toFixed(0)}k`}
              </text>
            </g>
          );
        })}

        {/* X-axis labels */}
        {data.map((d, i) => {
          const showLabel = data.length <= 12 || i % Math.ceil(data.length / 12) === 0;
          return showLabel ? (
            <text key={i} x={getX(i)} y={height - 10} textAnchor="middle" fontSize={11} fill="#9ca3af">
              {d.label}
            </text>
          ) : null;
        })}

        {/* Area */}
        <polygon points={areaPoints} fill={`url(#chartGrad-${chartType})`} className="fo-chart-area" />

        {/* Line */}
        <polyline points={linePoints} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="fo-chart-line" />

        {/* Data points */}
        {values.map((v, i) => (
          <circle
            key={i}
            cx={getX(i)}
            cy={getY(v)}
            r={hoveredIndex === i ? 6 : 3}
            fill={hoveredIndex === i ? color : 'white'}
            stroke={color}
            strokeWidth={2}
            className="fo-chart-dot"
            style={{ transition: 'r 0.15s ease, fill 0.15s ease' }}
          />
        ))}

        {/* Hover line */}
        {hoveredIndex !== null && (
          <>
            <line
              x1={tooltipPos.x}
              y1={paddingTop}
              x2={tooltipPos.x}
              y2={paddingTop + chartH}
              stroke={color}
              strokeWidth={1}
              strokeDasharray="4,4"
              opacity={0.5}
            />
          </>
        )}
      </svg>

      {/* Tooltip */}
      {hoveredIndex !== null && (
        <div
          className="fo-chart-tooltip"
          style={{
            left: `${(tooltipPos.x / width) * 100}%`,
            top: `${(tooltipPos.y / height) * 100}%`,
          }}
        >
          <div className="fo-chart-tooltip__label">{data[hoveredIndex].label}</div>
          <div className="fo-chart-tooltip__value">
            {chartType === 'orders'
              ? `${values[hoveredIndex]} orders`
              : formatCurrency(values[hoveredIndex])}
          </div>
        </div>
      )}
    </div>
  );
};

/* ─── Donut Chart ─── */
const DonutChart: React.FC<{
  segments: { label: string; value: number; color: string }[];
  size?: number;
}> = ({ segments, size = 160 }) => {
  const [hovered, setHovered] = useState<number | null>(null);
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  const radius = size / 2 - 10;
  const innerRadius = radius * 0.62;
  const cx = size / 2;
  const cy = size / 2;

  let cumAngle = -90;

  const arcs = segments.map((seg, i) => {
    const angle = (seg.value / total) * 360;
    const startAngle = cumAngle;
    const endAngle = cumAngle + angle;
    cumAngle = endAngle;

    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const r = hovered === i ? radius + 4 : radius;
    const ir = hovered === i ? innerRadius - 2 : innerRadius;

    const x1 = cx + r * Math.cos(toRad(startAngle));
    const y1 = cy + r * Math.sin(toRad(startAngle));
    const x2 = cx + r * Math.cos(toRad(endAngle));
    const y2 = cy + r * Math.sin(toRad(endAngle));
    const ix1 = cx + ir * Math.cos(toRad(endAngle));
    const iy1 = cy + ir * Math.sin(toRad(endAngle));
    const ix2 = cx + ir * Math.cos(toRad(startAngle));
    const iy2 = cy + ir * Math.sin(toRad(startAngle));

    const largeArc = angle > 180 ? 1 : 0;

    const path = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${ir} ${ir} 0 ${largeArc} 0 ${ix2} ${iy2} Z`;

    return (
      <path
        key={i}
        d={path}
        fill={seg.color}
        opacity={hovered !== null && hovered !== i ? 0.4 : 1}
        onMouseEnter={() => setHovered(i)}
        onMouseLeave={() => setHovered(null)}
        style={{ transition: 'all 0.2s ease', cursor: 'pointer' }}
      />
    );
  });

  return (
    <div className="fo-donut-wrapper">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {arcs}
        <text x={cx} y={cy - 6} textAnchor="middle" fontSize={14} fontWeight={700} fill="#1f2937">
          {hovered !== null ? `${((segments[hovered].value / total) * 100).toFixed(0)}%` : formatCurrency(total)}
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize={11} fill="#9ca3af">
          {hovered !== null ? segments[hovered].label : 'Total'}
        </text>
      </svg>
      <div className="fo-donut-legend">
        {segments.map((seg, i) => (
          <div
            key={i}
            className={`fo-donut-legend__item ${hovered === i ? 'fo-donut-legend__item--active' : ''}`}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            <span className="fo-donut-legend__dot" style={{ background: seg.color }} />
            <span className="fo-donut-legend__label">{seg.label}</span>
            <span className="fo-donut-legend__value">{formatCurrency(seg.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─── Animated Counter ─── */
const AnimatedCounter: React.FC<{ target: string; duration?: number }> = ({ target, duration = 1200 }) => {
  const [display, setDisplay] = useState(target);
  const prevRef = useRef(target);

  useEffect(() => {
    const numericTarget = parseFloat(target.replace(/[^0-9.-]/g, ''));
    const numericPrev = parseFloat(prevRef.current.replace(/[^0-9.-]/g, ''));

    if (isNaN(numericTarget) || isNaN(numericPrev)) {
      setDisplay(target);
      prevRef.current = target;
      return;
    }

    const prefix = target.match(/^[^0-9.-]*/)?.[0] || '';
    const suffix = target.match(/[^0-9.,]*$/)?.[0] || '';
    const hasCommas = target.includes(',');
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = numericPrev + (numericTarget - numericPrev) * eased;

      let formatted = Math.round(current).toString();
      if (hasCommas) {
        formatted = Math.round(current).toLocaleString('en-IN');
      }

      setDisplay(`${prefix}${formatted}${suffix}`);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
    prevRef.current = target;
  }, [target, duration]);

  return <>{display}</>;
};

/* ─── Main Component ─── */
const FinancialOverview: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [chartType, setChartType] = useState<ChartType>('revenue');
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [chartAnimated, setChartAnimated] = useState(false);
  const [transactions] = useState<Transaction[]>(generateTransactions());
  const [payouts] = useState<PayoutRecord[]>(generatePayouts());
  const [invoices] = useState<Invoice[]>(generateInvoices());
  const [txnFilter, setTxnFilter] = useState<string>('all');
  const [txnSearch, setTxnSearch] = useState('');
  const [expandedTxn, setExpandedTxn] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showQuickAction, setShowQuickAction] = useState(false);

  // Quick Action modal states
  const [showSendInvoice, setShowSendInvoice] = useState(false);
  const [showProcessPayouts, setShowProcessPayouts] = useState(false);
  const [showGenerateReport, setShowGenerateReport] = useState(false);
  const [showReconcile, setShowReconcile] = useState(false);
  const [quickActionLoading, setQuickActionLoading] = useState(false);
  const [quickActionSuccess, setQuickActionSuccess] = useState<string | null>(null);

  // Send Invoice form state
  const [invoiceForm, setInvoiceForm] = useState({
    vendor: '',
    amount: '',
    dueDate: '',
    description: '',
  });

  // Generate Report form state
  const [reportForm, setReportForm] = useState({
    type: 'revenue' as 'revenue' | 'payouts' | 'transactions' | 'tax' | 'full',
    dateFrom: '',
    dateTo: '',
    format: 'pdf' as 'pdf' | 'csv' | 'xlsx',
  });

  // Reconcile state
  const [reconcileChecked, setReconcileChecked] = useState<string[]>([]);

  const ranges: { key: TimeRange; label: string }[] = [
    { key: '7d', label: '7 Days' },
    { key: '30d', label: '30 Days' },
    { key: '90d', label: '90 Days' },
    { key: '1y', label: '1 Year' },
  ];

  const tabs: { key: ActiveTab; label: string; icon: string }[] = [
    { key: 'overview', label: 'Overview', icon: '📊' },
    { key: 'transactions', label: 'Transactions', icon: '💳' },
    { key: 'payouts', label: 'Payouts', icon: '💰' },
    { key: 'invoices', label: 'Invoices', icon: '📄' },
  ];

  const chartTypes: { key: ChartType; label: string }[] = [
    { key: 'revenue', label: 'Revenue' },
    { key: 'orders', label: 'Orders' },
    { key: 'commission', label: 'Commission' },
  ];

  useEffect(() => {
    setChartAnimated(false);
    const newData = generateChartData(timeRange);
    setChartData(newData);
    requestAnimationFrame(() => {
      setChartAnimated(true);
    });
  }, [timeRange]);

  const financeCards: FinanceCardData[] = [
    {
      label: 'Total Revenue',
      value: '₹12,48,500',
      rawValue: 1248500,
      trend: 12.4,
      icon: '💰',
      color: '#4f46e5',
      sparkline: [28, 35, 32, 45, 42, 55, 52],
    },
    {
      label: 'Platform Commission',
      value: '₹1,87,275',
      rawValue: 187275,
      trend: 8.2,
      icon: '🏢',
      color: '#06b6d4',
      sparkline: [18, 22, 20, 28, 25, 30, 28],
    },
    {
      label: 'Driver Payouts',
      value: '₹3,74,550',
      rawValue: 374550,
      trend: 15.1,
      icon: '🚗',
      color: '#16a34a',
      sparkline: [35, 40, 38, 48, 45, 55, 50],
    },
    {
      label: 'Pending Settlements',
      value: '₹86,200',
      rawValue: 86200,
      trend: -3.5,
      icon: '⏳',
      color: '#f59e0b',
      sparkline: [22, 20, 18, 15, 17, 14, 12],
    },
  ];

  const filteredTransactions = transactions.filter((t) => {
    const matchesFilter = txnFilter === 'all' || t.status === txnFilter;
    const matchesSearch =
      !txnSearch ||
      t.customer.toLowerCase().includes(txnSearch.toLowerCase()) ||
      t.id.toLowerCase().includes(txnSearch.toLowerCase()) ||
      t.orderId.toLowerCase().includes(txnSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleExport = () => {
    setIsExporting(true);

    setTimeout(() => {
      const now = new Date().toISOString().slice(0, 10);
      const lines: string[] = [];

      if (activeTab === 'transactions') {
        lines.push(['ID', 'Date', 'Customer', 'Type', 'Amount (INR)', 'Status', 'Method', 'Order ID'].map((h) => `"${h}"`).join(','));
        filteredTransactions.forEach((t) => {
          lines.push([t.id, formatDate(t.date), t.customer, t.type, t.amount.toString(), t.status, t.method, t.orderId].map((c) => `"${c}"`).join(','));
        });
        const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
        triggerDownload(blob, `Annam_Transactions_${now}.csv`);
      } else if (activeTab === 'payouts') {
        lines.push(['ID', 'Driver', 'Amount (INR)', 'Status', 'Trips', 'Date'].map((h) => `"${h}"`).join(','));
        payouts.forEach((p) => {
          lines.push([p.id, p.driver, p.amount.toString(), p.status, p.trips.toString(), formatDate(p.date)].map((c) => `"${c}"`).join(','));
        });
        const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
        triggerDownload(blob, `Annam_Payouts_${now}.csv`);
      } else if (activeTab === 'invoices') {
        lines.push(['ID', 'Vendor', 'Amount (INR)', 'Status', 'Issued Date', 'Due Date'].map((h) => `"${h}"`).join(','));
        invoices.forEach((inv) => {
          lines.push([inv.id, inv.vendor, inv.amount.toString(), inv.status, formatDate(inv.issuedDate), formatDate(inv.dueDate)].map((c) => `"${c}"`).join(','));
        });
        const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
        triggerDownload(blob, `Annam_Invoices_${now}.csv`);
      } else {
        // Overview — export finance summary + chart data
        lines.push('"Annam Financial Overview"');
        lines.push(`"Time Range: ${timeRange}"`);
        lines.push(`"Generated: ${new Date().toLocaleString('en-IN')}"`);
        lines.push('');
        lines.push('"Metric","Value","Trend"');
        financeCards.forEach((c) => {
          lines.push(`"${c.label}","${c.value}","${c.trend > 0 ? '+' : ''}${c.trend}%"`);
        });
        lines.push('');
        lines.push('"Period","Revenue (INR)","Orders","Commission (INR)"');
        chartData.forEach((d) => {
          lines.push(`"${d.label}","${d.revenue}","${d.orders}","${d.commission}"`);
        });
        const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
        triggerDownload(blob, `Annam_Financial_Overview_${now}.csv`);
      }

      setIsExporting(false);
    }, 400);
  };

  const totalRevenue = chartData.reduce((s, d) => s + d.revenue, 0);
  const totalOrders = chartData.reduce((s, d) => s + d.orders, 0);
  const avgOrderValue = totalOrders ? totalRevenue / totalOrders : 0;

  // ─── Report Download Logic ───
  const buildReportData = (type: string) => {
    const typeLabels: Record<string, string> = {
      revenue: 'Revenue Summary',
      payouts: 'Driver Payouts',
      transactions: 'Transaction History',
      tax: 'Tax Report',
      full: 'Full Financial Report',
    };
    const title = typeLabels[type] || 'Report';
    const dateRange = `${reportForm.dateFrom || 'All time'} to ${reportForm.dateTo || 'Present'}`;

    const sections: { heading: string; headers: string[]; rows: string[][] }[] = [];

    if (type === 'revenue' || type === 'full') {
      sections.push({
        heading: 'Revenue Summary',
        headers: ['Metric', 'Value', 'Trend'],
        rows: financeCards.map((c) => [c.label, c.value, `${c.trend > 0 ? '+' : ''}${c.trend}%`]),
      });
      sections.push({
        heading: 'Revenue by Period',
        headers: ['Period', 'Revenue (INR)', 'Orders', 'Commission (INR)'],
        rows: chartData.map((d) => [d.label, d.revenue.toString(), d.orders.toString(), d.commission.toString()]),
      });
    }
    if (type === 'transactions' || type === 'full') {
      sections.push({
        heading: 'Transaction History',
        headers: ['ID', 'Date', 'Customer', 'Type', 'Amount (INR)', 'Status', 'Method', 'Order ID'],
        rows: transactions.map((t) => [
          t.id, formatDate(t.date), t.customer, t.type,
          t.amount.toString(), t.status, t.method, t.orderId,
        ]),
      });
    }
    if (type === 'payouts' || type === 'full') {
      sections.push({
        heading: 'Driver Payouts',
        headers: ['ID', 'Driver', 'Amount (INR)', 'Status', 'Trips', 'Date'],
        rows: payouts.map((p) => [
          p.id, p.driver, p.amount.toString(), p.status, p.trips.toString(), formatDate(p.date),
        ]),
      });
    }
    if (type === 'tax' || type === 'full') {
      const totalCredits = transactions.filter((t) => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
      const gst = Math.round(totalCredits * 0.18);
      const tds = Math.round(totalCredits * 0.01);
      sections.push({
        heading: 'Tax Summary',
        headers: ['Tax Type', 'Taxable Amount (INR)', 'Rate', 'Tax Amount (INR)'],
        rows: [
          ['GST (CGST + SGST)', totalCredits.toString(), '18%', gst.toString()],
          ['TDS', totalCredits.toString(), '1%', tds.toString()],
          ['Total Tax Liability', '', '', (gst + tds).toString()],
        ],
      });
    }

    return { title, dateRange, sections };
  };

  const triggerDownload = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadCSV = (type: string) => {
    const { title, dateRange, sections } = buildReportData(type);
    const lines: string[] = [];
    lines.push(`"${title}"`);
    lines.push(`"Date Range: ${dateRange}"`);
    lines.push(`"Generated: ${new Date().toLocaleString('en-IN')}"`);
    lines.push('');

    sections.forEach((sec) => {
      lines.push(`"${sec.heading}"`);
      lines.push(sec.headers.map((h) => `"${h}"`).join(','));
      sec.rows.forEach((row) => {
        lines.push(row.map((cell) => `"${cell}"`).join(','));
      });
      lines.push('');
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    triggerDownload(blob, `Annam_${title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const downloadExcel = (type: string) => {
    const { title, dateRange, sections } = buildReportData(type);

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<?mso-application progid="Excel.Sheet"?>\n';
    xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"';
    xml += ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n';
    xml += '<Styles>';
    xml += '<Style ss:ID="hdr"><Font ss:Bold="1" ss:Size="11"/><Interior ss:Color="#E5E7EB" ss:Pattern="Solid"/></Style>';
    xml += '<Style ss:ID="title"><Font ss:Bold="1" ss:Size="14"/></Style>';
    xml += '</Styles>\n';

    xml += `<Worksheet ss:Name="${title.slice(0, 31)}">\n<Table>\n`;
    xml += `<Row><Cell ss:StyleID="title"><Data ss:Type="String">${title}</Data></Cell></Row>\n`;
    xml += `<Row><Cell><Data ss:Type="String">Date Range: ${dateRange}</Data></Cell></Row>\n`;
    xml += `<Row><Cell><Data ss:Type="String">Generated: ${new Date().toLocaleString('en-IN')}</Data></Cell></Row>\n`;
    xml += '<Row></Row>\n';

    sections.forEach((sec) => {
      xml += `<Row><Cell ss:StyleID="title"><Data ss:Type="String">${sec.heading}</Data></Cell></Row>\n`;
      xml += '<Row>' + sec.headers.map((h) => `<Cell ss:StyleID="hdr"><Data ss:Type="String">${h}</Data></Cell>`).join('') + '</Row>\n';
      sec.rows.forEach((row) => {
        xml += '<Row>' + row.map((cell) => {
          const isNum = /^\d+$/.test(cell);
          return `<Cell><Data ss:Type="${isNum ? 'Number' : 'String'}">${cell}</Data></Cell>`;
        }).join('') + '</Row>\n';
      });
      xml += '<Row></Row>\n';
    });

    xml += '</Table>\n</Worksheet>\n</Workbook>';
    const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
    triggerDownload(blob, `Annam_${title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xls`);
  };

  const downloadPDF = (type: string) => {
    const { title, dateRange, sections } = buildReportData(type);

    let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${title}</title>`;
    html += '<style>';
    html += 'body{font-family:"Segoe UI",Arial,sans-serif;padding:40px;color:#111827;max-width:900px;margin:auto}';
    html += 'h1{font-size:22px;margin-bottom:4px;color:#1e1b4b}';
    html += '.meta{color:#6b7280;font-size:13px;margin-bottom:24px}';
    html += 'h2{font-size:16px;color:#374151;margin-top:28px;margin-bottom:10px;border-bottom:2px solid #e5e7eb;padding-bottom:6px}';
    html += 'table{width:100%;border-collapse:collapse;margin-bottom:20px;font-size:13px}';
    html += 'th{background:#f3f4f6;text-align:left;padding:10px 12px;font-weight:600;border-bottom:2px solid #d1d5db}';
    html += 'td{padding:8px 12px;border-bottom:1px solid #e5e7eb}';
    html += 'tr:nth-child(even){background:#f9fafb}';
    html += '.footer{margin-top:32px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center}';
    html += '@media print{body{padding:20px}}';
    html += '</style></head><body>';
    html += `<h1>${title}</h1>`;
    html += `<div class="meta">Date Range: ${dateRange} &nbsp;|&nbsp; Generated: ${new Date().toLocaleString('en-IN')}</div>`;

    sections.forEach((sec) => {
      html += `<h2>${sec.heading}</h2><table><thead><tr>`;
      sec.headers.forEach((h) => { html += `<th>${h}</th>`; });
      html += '</tr></thead><tbody>';
      sec.rows.forEach((row) => {
        html += '<tr>' + row.map((cell) => `<td>${cell}</td>`).join('') + '</tr>';
      });
      html += '</tbody></table>';
    });

    html += '<div class="footer">Annam Platform • Financial Report • Confidential</div>';
    html += '</body></html>';

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      setTimeout(() => { printWindow.print(); }, 500);
    }
  };

  const handleGenerateReport = () => {
    setQuickActionLoading(true);
    const typeLabels: Record<string, string> = {
      revenue: 'Revenue Summary',
      payouts: 'Driver Payouts',
      transactions: 'Transaction History',
      tax: 'Tax Report',
      full: 'Full Financial Report',
    };

    setTimeout(() => {
      if (reportForm.format === 'csv') {
        downloadCSV(reportForm.type);
      } else if (reportForm.format === 'xlsx') {
        downloadExcel(reportForm.type);
      } else {
        downloadPDF(reportForm.type);
      }
      setQuickActionLoading(false);
      setQuickActionSuccess(`${typeLabels[reportForm.type]} (${reportForm.format.toUpperCase()}) downloaded successfully`);
    }, 800);
  };

  return (
    <div className="fo">
      {/* Header */}
      <header className="fo-header">
        <div className="fo-header__left">
          <h1 className="fo-header__title">Financial Overview</h1>
          <p className="fo-header__subtitle">Monitor your business performance and financial health</p>
        </div>
        <div className="fo-header__right">
          <div className="fo-date-range">
            {ranges.map((r) => (
              <button
                key={r.key}
                className={`fo-date-range__btn ${timeRange === r.key ? 'fo-date-range__btn--active' : ''}`}
                onClick={() => setTimeRange(r.key)}
              >
                {r.label}
              </button>
            ))}
          </div>
          <div className="fo-header__actions">
            <button className="fo-btn fo-btn--secondary" onClick={handleExport} disabled={isExporting}>
              {isExporting ? (
                <>
                  <span className="fo-btn-spinner" />
                  Exporting...
                </>
              ) : (
                <>📥 Export</>
              )}
            </button>
            <div className="fo-quick-actions-wrapper">
              <button className="fo-btn fo-btn--primary" onClick={() => setShowQuickAction(!showQuickAction)}>
                ⚡ Quick Actions
              </button>
              {showQuickAction && (
                <div className="fo-quick-actions-menu">
                  <button className="fo-quick-actions-menu__item" onClick={() => { setShowQuickAction(false); setShowSendInvoice(true); }}>
                    <span>📤</span> Send Invoice
                  </button>
                  <button className="fo-quick-actions-menu__item" onClick={() => { setShowQuickAction(false); setShowProcessPayouts(true); }}>
                    <span>💸</span> Process Payouts
                  </button>
                  <button className="fo-quick-actions-menu__item" onClick={() => { setShowQuickAction(false); setShowGenerateReport(true); }}>
                    <span>📊</span> Generate Report
                  </button>
                  <button className="fo-quick-actions-menu__item" onClick={() => { setShowQuickAction(false); setShowReconcile(true); }}>
                    <span>🔄</span> Reconcile
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Finance Cards */}
      <div className="fo-cards">
        {financeCards.map((card, i) => (
          <div key={i} className="fo-card" style={{ '--card-color': card.color } as React.CSSProperties}>
            <div className="fo-card__top">
              <div className="fo-card__icon">{card.icon}</div>
              <span className={`fo-card__trend ${card.trend >= 0 ? 'fo-card__trend--up' : 'fo-card__trend--down'}`}>
                {card.trend >= 0 ? '↑' : '↓'} {Math.abs(card.trend)}%
              </span>
            </div>
            <div className="fo-card__value">
              <AnimatedCounter target={card.value} />
            </div>
            <div className="fo-card__label">{card.label}</div>
            <div className="fo-card__sparkline">
              <Sparkline data={card.sparkline} color={card.color} />
            </div>
            <div className="fo-card__glow" />
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="fo-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`fo-tabs__btn ${activeTab === tab.key ? 'fo-tabs__btn--active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            <span className="fo-tabs__icon">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="fo-tab-content">
        {/* ─── OVERVIEW TAB ─── */}
        {activeTab === 'overview' && (
          <div className="fo-overview">
            {/* Chart */}
            <div className="fo-chart-section">
              <div className="fo-chart-header">
                <div>
                  <h3 className="fo-chart-header__title">Performance Metrics</h3>
                  <div className="fo-chart-header__summary">
                    <span className="fo-chart-header__metric">
                      Total: <strong>{formatCurrency(totalRevenue)}</strong>
                    </span>
                    <span className="fo-chart-header__divider">|</span>
                    <span className="fo-chart-header__metric">
                      Orders: <strong>{totalOrders}</strong>
                    </span>
                    <span className="fo-chart-header__divider">|</span>
                    <span className="fo-chart-header__metric">
                      AOV: <strong>{formatCurrency(avgOrderValue)}</strong>
                    </span>
                  </div>
                </div>
                <div className="fo-chart-type-toggle">
                  {chartTypes.map((ct) => (
                    <button
                      key={ct.key}
                      className={`fo-chart-type-btn ${chartType === ct.key ? 'fo-chart-type-btn--active' : ''}`}
                      onClick={() => setChartType(ct.key)}
                    >
                      {ct.label}
                    </button>
                  ))}
                </div>
              </div>
              <InteractiveChart data={chartData} chartType={chartType} animated={chartAnimated} />
            </div>

            {/* Breakdown Grid */}
            <div className="fo-breakdown-grid">
              <div className="fo-breakdown-section">
                <h3 className="fo-breakdown-section__title">Revenue by Category</h3>
                <DonutChart
                  segments={[
                    { label: 'Vegetables', value: 482000, color: '#16a34a' },
                    { label: 'Fruits', value: 312000, color: '#3b82f6' },
                    { label: 'Grains & Cereals', value: 248000, color: '#f59e0b' },
                    { label: 'Dairy & Others', value: 206500, color: '#8b5cf6' },
                  ]}
                />
              </div>
              <div className="fo-breakdown-section">
                <h3 className="fo-breakdown-section__title">Payment Methods</h3>
                <DonutChart
                  segments={[
                    { label: 'UPI / GPay / PhonePe', value: 724000, color: '#16a34a' },
                    { label: 'Debit / Credit Card', value: 287000, color: '#3b82f6' },
                    { label: 'Net Banking', value: 149500, color: '#f59e0b' },
                    { label: 'Cash on Delivery', value: 88000, color: '#8b5cf6' },
                  ]}
                />
              </div>
            </div>

            {/* Quick Stats */}
            <div className="fo-quick-stats">
              <div className="fo-quick-stat">
                <div className="fo-quick-stat__icon">📦</div>
                <div className="fo-quick-stat__content">
                  <div className="fo-quick-stat__value">{totalOrders}</div>
                  <div className="fo-quick-stat__label">Total Orders</div>
                </div>
              </div>
              <div className="fo-quick-stat">
                <div className="fo-quick-stat__icon">🧾</div>
                <div className="fo-quick-stat__content">
                  <div className="fo-quick-stat__value">{formatCurrency(avgOrderValue)}</div>
                  <div className="fo-quick-stat__label">Avg. Order Value</div>
                </div>
              </div>
              <div className="fo-quick-stat">
                <div className="fo-quick-stat__icon">🔄</div>
                <div className="fo-quick-stat__content">
                  <div className="fo-quick-stat__value">2.8%</div>
                  <div className="fo-quick-stat__label">Refund Rate</div>
                </div>
              </div>
              <div className="fo-quick-stat">
                <div className="fo-quick-stat__icon">⭐</div>
                <div className="fo-quick-stat__content">
                  <div className="fo-quick-stat__value">4.6</div>
                  <div className="fo-quick-stat__label">Customer Rating</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── TRANSACTIONS TAB ─── */}
        {activeTab === 'transactions' && (
          <div className="fo-transactions">
            <div className="fo-transactions__toolbar">
              <div className="fo-transactions__search">
                <span className="fo-transactions__search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={txnSearch}
                  onChange={(e) => setTxnSearch(e.target.value)}
                  className="fo-transactions__search-input"
                />
                {txnSearch && (
                  <button className="fo-transactions__search-clear" onClick={() => setTxnSearch('')}>
                    ✕
                  </button>
                )}
              </div>
              <div className="fo-transactions__filters">
                {['all', 'completed', 'pending', 'failed'].map((f) => (
                  <button
                    key={f}
                    className={`fo-filter-btn ${txnFilter === f ? 'fo-filter-btn--active' : ''}`}
                    onClick={() => setTxnFilter(f)}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                    {f !== 'all' && (
                      <span className="fo-filter-btn__count">
                        {transactions.filter((t) => t.status === f).length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="fo-transactions__table-wrapper">
              <table className="fo-transactions__table">
                <thead>
                  <tr>
                    <th>Transaction ID</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Type</th>
                    <th>Method</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((txn) => (
                    <React.Fragment key={txn.id}>
                      <tr
                        className={`fo-transactions__row ${expandedTxn === txn.id ? 'fo-transactions__row--expanded' : ''}`}
                        onClick={() => setExpandedTxn(expandedTxn === txn.id ? null : txn.id)}
                      >
                        <td>
                          <span className="fo-txn-id">{txn.id}</span>
                        </td>
                        <td>{formatDate(txn.date)}</td>
                        <td>
                          <div className="fo-txn-customer">
                            <div className="fo-txn-customer__avatar">{txn.customer.charAt(0)}</div>
                            {txn.customer}
                          </div>
                        </td>
                        <td>
                          <span className={`fo-txn-type fo-txn-type--${txn.type}`}>
                            {txn.type === 'credit' ? '↗' : txn.type === 'debit' ? '↙' : '↩'}{' '}
                            {txn.type.charAt(0).toUpperCase() + txn.type.slice(1)}
                          </span>
                        </td>
                        <td>{txn.method}</td>
                        <td>
                          <span className={`fo-txn-amount fo-txn-amount--${txn.type}`}>
                            {txn.type === 'debit' || txn.type === 'refund' ? '- ' : '+ '}
                            {formatCurrency(txn.amount)}
                          </span>
                        </td>
                        <td>
                          <span className={`fo-status-badge fo-status-badge--${txn.status}`}>
                            {txn.status}
                          </span>
                        </td>
                        <td>
                          <button className="fo-action-btn" title="View Details">
                            👁
                          </button>
                        </td>
                      </tr>
                      {expandedTxn === txn.id && (
                        <tr className="fo-transactions__detail-row">
                          <td colSpan={8}>
                            <div className="fo-txn-details">
                              <div className="fo-txn-details__item">
                                <span className="fo-txn-details__label">Order ID</span>
                                <span className="fo-txn-details__value">{txn.orderId}</span>
                              </div>
                              <div className="fo-txn-details__item">
                                <span className="fo-txn-details__label">Payment Method</span>
                                <span className="fo-txn-details__value">{txn.method}</span>
                              </div>
                              <div className="fo-txn-details__item">
                                <span className="fo-txn-details__label">Timestamp</span>
                                <span className="fo-txn-details__value">
                                  {new Date(txn.date).toLocaleString('en-IN')}
                                </span>
                              </div>
                              <div className="fo-txn-details__item">
                                <span className="fo-txn-details__label">Transaction Fee</span>
                                <span className="fo-txn-details__value">
                                  {formatCurrency(Math.round(txn.amount * 0.02))}
                                </span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
              {filteredTransactions.length === 0 && (
                <div className="fo-empty-state">
                  <span className="fo-empty-state__icon">🔍</span>
                  <h3>No transactions found</h3>
                  <p>Try adjusting your search or filter criteria</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── PAYOUTS TAB ─── */}
        {activeTab === 'payouts' && (
          <div className="fo-payouts">
            <div className="fo-payouts__summary">
              <div className="fo-payouts__summary-card">
                <div className="fo-payouts__summary-icon" style={{ background: '#dcfce7' }}>
                  ✅
                </div>
                <div>
                  <div className="fo-payouts__summary-value">
                    {formatCurrency(payouts.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount, 0))}
                  </div>
                  <div className="fo-payouts__summary-label">Paid</div>
                </div>
              </div>
              <div className="fo-payouts__summary-card">
                <div className="fo-payouts__summary-icon" style={{ background: '#fef3c7' }}>
                  ⏳
                </div>
                <div>
                  <div className="fo-payouts__summary-value">
                    {formatCurrency(payouts.filter((p) => p.status === 'pending').reduce((s, p) => s + p.amount, 0))}
                  </div>
                  <div className="fo-payouts__summary-label">Pending</div>
                </div>
              </div>
              <div className="fo-payouts__summary-card">
                <div className="fo-payouts__summary-icon" style={{ background: '#dbeafe' }}>
                  🔄
                </div>
                <div>
                  <div className="fo-payouts__summary-value">
                    {formatCurrency(
                      payouts.filter((p) => p.status === 'processing').reduce((s, p) => s + p.amount, 0),
                    )}
                  </div>
                  <div className="fo-payouts__summary-label">Processing</div>
                </div>
              </div>
            </div>

            <div className="fo-payouts__list">
              {payouts.map((payout) => (
                <div key={payout.id} className="fo-payout-card">
                  <div className="fo-payout-card__left">
                    <div className="fo-payout-card__avatar">{payout.avatar}</div>
                    <div className="fo-payout-card__info">
                      <div className="fo-payout-card__name">{payout.driver}</div>
                      <div className="fo-payout-card__meta">
                        {payout.trips} trips • {formatDate(payout.date)}
                      </div>
                    </div>
                  </div>
                  <div className="fo-payout-card__right">
                    <div className="fo-payout-card__amount">{formatCurrency(payout.amount)}</div>
                    <span className={`fo-status-badge fo-status-badge--${payout.status}`}>
                      {payout.status}
                    </span>
                  </div>
                  <div className="fo-payout-card__actions">
                    {payout.status === 'pending' && (
                      <button className="fo-btn fo-btn--sm fo-btn--primary">Process</button>
                    )}
                    <button className="fo-btn fo-btn--sm fo-btn--ghost">Details</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── INVOICES TAB ─── */}
        {activeTab === 'invoices' && (
          <div className="fo-invoices">
            <div className="fo-invoices__header">
              <h3>Invoices</h3>
              <button className="fo-btn fo-btn--primary">+ New Invoice</button>
            </div>
            <div className="fo-invoices__list">
              {invoices.map((invoice) => (
                <div key={invoice.id} className="fo-invoice-card">
                  <div className="fo-invoice-card__left">
                    <div className="fo-invoice-card__icon">📄</div>
                    <div className="fo-invoice-card__info">
                      <div className="fo-invoice-card__id">{invoice.id}</div>
                      <div className="fo-invoice-card__vendor">{invoice.vendor}</div>
                      <div className="fo-invoice-card__dates">
                        Issued: {formatDate(invoice.issuedDate)} • Due: {formatDate(invoice.dueDate)}
                      </div>
                    </div>
                  </div>
                  <div className="fo-invoice-card__right">
                    <div className="fo-invoice-card__amount">{formatCurrency(invoice.amount)}</div>
                    <span className={`fo-status-badge fo-status-badge--${invoice.status}`}>
                      {invoice.status}
                    </span>
                  </div>
                  <div className="fo-invoice-card__actions">
                    <button className="fo-btn fo-btn--sm fo-btn--ghost">View</button>
                    <button className="fo-btn fo-btn--sm fo-btn--ghost">Download</button>
                    {invoice.status !== 'paid' && (
                      <button className="fo-btn fo-btn--sm fo-btn--primary">Pay Now</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Click outside to close quick actions */}
      {showQuickAction && <div className="fo-overlay" onClick={() => setShowQuickAction(false)} />}

      {/* ─── SEND INVOICE MODAL ─── */}
      {showSendInvoice && (
        <div className="fo-overlay fo-overlay--modal" onClick={() => setShowSendInvoice(false)}>
          <div className="fo-modal" onClick={(e) => e.stopPropagation()}>
            <div className="fo-modal__header">
              <h2 className="fo-modal__title">📤 Send Invoice</h2>
              <button className="fo-modal__close" onClick={() => setShowSendInvoice(false)}>✕</button>
            </div>
            <div className="fo-modal__body">
              {quickActionSuccess ? (
                <div className="fo-modal__success">
                  <span style={{ fontSize: 48 }}>✅</span>
                  <h3>{quickActionSuccess}</h3>
                  <button className="fo-btn fo-btn--primary" onClick={() => { setQuickActionSuccess(null); setShowSendInvoice(false); }}>Done</button>
                </div>
              ) : (
                <div className="fo-modal__form">
                  <div className="fo-modal__field">
                    <label className="fo-modal__label">Vendor / Customer <span style={{ color: '#dc2626' }}>*</span></label>
                    <input
                      type="text"
                      className="fo-modal__input"
                      placeholder="e.g. FreshFarm Supplies"
                      value={invoiceForm.vendor}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, vendor: e.target.value })}
                    />
                  </div>
                  <div className="fo-modal__row">
                    <div className="fo-modal__field">
                      <label className="fo-modal__label">Amount (₹) <span style={{ color: '#dc2626' }}>*</span></label>
                      <input
                        type="number"
                        className="fo-modal__input"
                        placeholder="0"
                        value={invoiceForm.amount}
                        onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })}
                      />
                    </div>
                    <div className="fo-modal__field">
                      <label className="fo-modal__label">Due Date <span style={{ color: '#dc2626' }}>*</span></label>
                      <input
                        type="date"
                        className="fo-modal__input"
                        value={invoiceForm.dueDate}
                        onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="fo-modal__field">
                    <label className="fo-modal__label">Description</label>
                    <textarea
                      className="fo-modal__textarea"
                      placeholder="Invoice description or notes..."
                      rows={3}
                      value={invoiceForm.description}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, description: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>
            {!quickActionSuccess && (
              <div className="fo-modal__footer">
                <button className="fo-btn fo-btn--ghost" onClick={() => setShowSendInvoice(false)}>Cancel</button>
                <button
                  className="fo-btn fo-btn--primary"
                  disabled={quickActionLoading || !invoiceForm.vendor.trim() || !invoiceForm.amount || !invoiceForm.dueDate}
                  onClick={() => {
                    setQuickActionLoading(true);
                    setTimeout(() => {
                      setQuickActionLoading(false);
                      setQuickActionSuccess(`Invoice for ${formatCurrency(Number(invoiceForm.amount))} sent to ${invoiceForm.vendor}`);
                      setInvoiceForm({ vendor: '', amount: '', dueDate: '', description: '' });
                    }, 1200);
                  }}
                >
                  {quickActionLoading ? 'Sending...' : 'Send Invoice'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── PROCESS PAYOUTS MODAL ─── */}
      {showProcessPayouts && (
        <div className="fo-overlay fo-overlay--modal" onClick={() => setShowProcessPayouts(false)}>
          <div className="fo-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <div className="fo-modal__header">
              <h2 className="fo-modal__title">💸 Process Payouts</h2>
              <button className="fo-modal__close" onClick={() => setShowProcessPayouts(false)}>✕</button>
            </div>
            <div className="fo-modal__body">
              {quickActionSuccess ? (
                <div className="fo-modal__success">
                  <span style={{ fontSize: 48 }}>✅</span>
                  <h3>{quickActionSuccess}</h3>
                  <button className="fo-btn fo-btn--primary" onClick={() => { setQuickActionSuccess(null); setShowProcessPayouts(false); }}>Done</button>
                </div>
              ) : (
                <>
                  <div className="fo-modal__summary-bar">
                    <div>
                      <span style={{ fontSize: 13, color: '#6b7280' }}>Pending Payouts</span>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#111827' }}>
                        {payouts.filter((p) => p.status === 'pending').length} drivers
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 13, color: '#6b7280' }}>Total Amount</span>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#16a34a' }}>
                        {formatCurrency(payouts.filter((p) => p.status === 'pending').reduce((s, p) => s + p.amount, 0))}
                      </div>
                    </div>
                  </div>
                  <div className="fo-modal__payout-list">
                    {payouts.filter((p) => p.status === 'pending').length === 0 ? (
                      <div className="fo-modal__empty">
                        <span style={{ fontSize: 36 }}>🎉</span>
                        <p>All payouts are processed! No pending payouts.</p>
                      </div>
                    ) : (
                      payouts
                        .filter((p) => p.status === 'pending')
                        .map((payout) => (
                          <label key={payout.id} className="fo-modal__payout-item">
                            <input
                              type="checkbox"
                              checked={reconcileChecked.includes(payout.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setReconcileChecked((prev) => [...prev, payout.id]);
                                } else {
                                  setReconcileChecked((prev) => prev.filter((id) => id !== payout.id));
                                }
                              }}
                            />
                            <div className="fo-payout-card__avatar" style={{ width: 36, height: 36, fontSize: 13 }}>{payout.avatar}</div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, fontSize: 14 }}>{payout.driver}</div>
                              <div style={{ fontSize: 12, color: '#6b7280' }}>{payout.trips} trips • {formatDate(payout.date)}</div>
                            </div>
                            <div style={{ fontWeight: 700, color: '#16a34a' }}>{formatCurrency(payout.amount)}</div>
                          </label>
                        ))
                    )}
                  </div>
                </>
              )}
            </div>
            {!quickActionSuccess && payouts.filter((p) => p.status === 'pending').length > 0 && (
              <div className="fo-modal__footer">
                <button className="fo-btn fo-btn--ghost" onClick={() => setShowProcessPayouts(false)}>Cancel</button>
                <button
                  className="fo-btn fo-btn--primary"
                  disabled={quickActionLoading || reconcileChecked.length === 0}
                  onClick={() => {
                    setQuickActionLoading(true);
                    const selectedCount = reconcileChecked.length;
                    const selectedAmount = payouts
                      .filter((p) => reconcileChecked.includes(p.id))
                      .reduce((s, p) => s + p.amount, 0);
                    setTimeout(() => {
                      setQuickActionLoading(false);
                      setReconcileChecked([]);
                      setQuickActionSuccess(`${selectedCount} payouts totaling ${formatCurrency(selectedAmount)} processed successfully`);
                    }, 1500);
                  }}
                >
                  {quickActionLoading ? 'Processing...' : `Process ${reconcileChecked.length} Payout${reconcileChecked.length !== 1 ? 's' : ''}`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── GENERATE REPORT MODAL ─── */}
      {showGenerateReport && (
        <div className="fo-overlay fo-overlay--modal" onClick={() => setShowGenerateReport(false)}>
          <div className="fo-modal" onClick={(e) => e.stopPropagation()}>
            <div className="fo-modal__header">
              <h2 className="fo-modal__title">📊 Generate Report</h2>
              <button className="fo-modal__close" onClick={() => setShowGenerateReport(false)}>✕</button>
            </div>
            <div className="fo-modal__body">
              {quickActionSuccess ? (
                <div className="fo-modal__success">
                  <span style={{ fontSize: 48 }}>📥</span>
                  <h3>{quickActionSuccess}</h3>
                  <button className="fo-btn fo-btn--primary" onClick={() => { setQuickActionSuccess(null); setShowGenerateReport(false); }}>Done</button>
                </div>
              ) : (
                <div className="fo-modal__form">
                  <div className="fo-modal__field">
                    <label className="fo-modal__label">Report Type</label>
                    <div className="fo-modal__radio-group">
                      {[
                        { value: 'revenue', label: '💰 Revenue Summary', desc: 'Revenue, commissions, and growth metrics' },
                        { value: 'payouts', label: '🚗 Driver Payouts', desc: 'All payout records and pending amounts' },
                        { value: 'transactions', label: '💳 Transaction History', desc: 'Detailed transaction log with filters' },
                        { value: 'tax', label: '🧾 Tax Report', desc: 'GST, TDS, and tax-related summaries' },
                        { value: 'full', label: '📋 Full Financial Report', desc: 'Comprehensive report with all sections' },
                      ].map((opt) => (
                        <label key={opt.value} className={`fo-modal__radio-card ${reportForm.type === opt.value ? 'fo-modal__radio-card--active' : ''}`}>
                          <input
                            type="radio"
                            name="reportType"
                            value={opt.value}
                            checked={reportForm.type === opt.value}
                            onChange={(e) => setReportForm({ ...reportForm, type: e.target.value as typeof reportForm.type })}
                            style={{ display: 'none' }}
                          />
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{opt.label}</div>
                          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>{opt.desc}</div>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="fo-modal__row">
                    <div className="fo-modal__field">
                      <label className="fo-modal__label">From Date</label>
                      <input
                        type="date"
                        className="fo-modal__input"
                        value={reportForm.dateFrom}
                        onChange={(e) => setReportForm({ ...reportForm, dateFrom: e.target.value })}
                      />
                    </div>
                    <div className="fo-modal__field">
                      <label className="fo-modal__label">To Date</label>
                      <input
                        type="date"
                        className="fo-modal__input"
                        value={reportForm.dateTo}
                        onChange={(e) => setReportForm({ ...reportForm, dateTo: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="fo-modal__field">
                    <label className="fo-modal__label">Format</label>
                    <div style={{ display: 'flex', gap: 10 }}>
                      {[
                        { value: 'pdf', label: '📄 PDF' },
                        { value: 'csv', label: '📊 CSV' },
                        { value: 'xlsx', label: '📗 Excel' },
                      ].map((fmt) => (
                        <button
                          key={fmt.value}
                          className={`fo-btn ${reportForm.format === fmt.value ? 'fo-btn--primary' : 'fo-btn--ghost'}`}
                          style={{ flex: 1 }}
                          onClick={() => setReportForm({ ...reportForm, format: fmt.value as typeof reportForm.format })}
                        >
                          {fmt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            {!quickActionSuccess && (
              <div className="fo-modal__footer">
                <button className="fo-btn fo-btn--ghost" onClick={() => setShowGenerateReport(false)}>Cancel</button>
                <button
                  className="fo-btn fo-btn--primary"
                  disabled={quickActionLoading}
                  onClick={handleGenerateReport}
                >
                  {quickActionLoading ? 'Generating...' : 'Generate Report'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── RECONCILE MODAL ─── */}
      {showReconcile && (
        <div className="fo-overlay fo-overlay--modal" onClick={() => setShowReconcile(false)}>
          <div className="fo-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 580 }}>
            <div className="fo-modal__header">
              <h2 className="fo-modal__title">🔄 Reconciliation</h2>
              <button className="fo-modal__close" onClick={() => setShowReconcile(false)}>✕</button>
            </div>
            <div className="fo-modal__body">
              {quickActionSuccess ? (
                <div className="fo-modal__success">
                  <span style={{ fontSize: 48 }}>✅</span>
                  <h3>{quickActionSuccess}</h3>
                  <button className="fo-btn fo-btn--primary" onClick={() => { setQuickActionSuccess(null); setShowReconcile(false); }}>Done</button>
                </div>
              ) : (
                <div className="fo-modal__form">
                  <div className="fo-modal__reconcile-summary">
                    <div className="fo-modal__reconcile-item">
                      <div className="fo-modal__reconcile-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>✅</div>
                      <div>
                        <div style={{ fontSize: 13, color: '#6b7280' }}>Matched Transactions</div>
                        <div style={{ fontSize: 20, fontWeight: 700 }}>{transactions.filter((t) => t.status === 'completed').length}</div>
                      </div>
                    </div>
                    <div className="fo-modal__reconcile-item">
                      <div className="fo-modal__reconcile-icon" style={{ background: '#fef3c7', color: '#d97706' }}>⚠️</div>
                      <div>
                        <div style={{ fontSize: 13, color: '#6b7280' }}>Pending Review</div>
                        <div style={{ fontSize: 20, fontWeight: 700 }}>{transactions.filter((t) => t.status === 'pending').length}</div>
                      </div>
                    </div>
                    <div className="fo-modal__reconcile-item">
                      <div className="fo-modal__reconcile-icon" style={{ background: '#fee2e2', color: '#dc2626' }}>❌</div>
                      <div>
                        <div style={{ fontSize: 13, color: '#6b7280' }}>Discrepancies</div>
                        <div style={{ fontSize: 20, fontWeight: 700 }}>{transactions.filter((t) => t.status === 'failed').length}</div>
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: '16px', background: '#f9fafb', borderRadius: 10, border: '1px solid #e5e7eb' }}>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Reconciliation Details</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                      <span style={{ color: '#6b7280' }}>Total Credits</span>
                      <span style={{ fontWeight: 600, color: '#16a34a' }}>
                        {formatCurrency(transactions.filter((t) => t.type === 'credit').reduce((s, t) => s + t.amount, 0))}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                      <span style={{ color: '#6b7280' }}>Total Debits</span>
                      <span style={{ fontWeight: 600, color: '#dc2626' }}>
                        {formatCurrency(transactions.filter((t) => t.type === 'debit').reduce((s, t) => s + t.amount, 0))}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                      <span style={{ color: '#6b7280' }}>Total Refunds</span>
                      <span style={{ fontWeight: 600, color: '#f59e0b' }}>
                        {formatCurrency(transactions.filter((t) => t.type === 'refund').reduce((s, t) => s + t.amount, 0))}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700, borderTop: '1px solid #e5e7eb', paddingTop: 10, marginTop: 6 }}>
                      <span>Net Balance</span>
                      <span style={{ color: '#111827' }}>
                        {formatCurrency(
                          transactions.filter((t) => t.type === 'credit').reduce((s, t) => s + t.amount, 0) -
                          transactions.filter((t) => t.type === 'debit').reduce((s, t) => s + t.amount, 0) -
                          transactions.filter((t) => t.type === 'refund').reduce((s, t) => s + t.amount, 0)
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {!quickActionSuccess && (
              <div className="fo-modal__footer">
                <button className="fo-btn fo-btn--ghost" onClick={() => setShowReconcile(false)}>Cancel</button>
                <button
                  className="fo-btn fo-btn--primary"
                  disabled={quickActionLoading}
                  onClick={() => {
                    setQuickActionLoading(true);
                    setTimeout(() => {
                      setQuickActionLoading(false);
                      setQuickActionSuccess('Reconciliation completed. All records are up to date.');
                    }, 1800);
                  }}
                >
                  {quickActionLoading ? 'Reconciling...' : 'Run Reconciliation'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialOverview;