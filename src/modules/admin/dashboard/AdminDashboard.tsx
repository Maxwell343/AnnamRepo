import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';

// Types
interface StatCard {
  id: string;
  label: string;
  value: number;
  displayValue: string;
  change: string;
  changeValue: number;
  positive: boolean;
  icon: string;
  iconClass: string;
  trend: number[];
  description: string;
}

interface ActivityItem {
  id: string;
  icon: string;
  text: React.ReactNode;
  time: string;
  timestamp: Date;
  type: 'user' | 'order' | 'dispute' | 'kyc' | 'listing' | 'system';
  status?: 'pending' | 'completed' | 'urgent';
  actionable?: boolean;
}

interface Alert {
  id: string;
  type: 'warning' | 'critical' | 'info' | 'success';
  icon: string;
  message: string;
  timestamp: Date;
  dismissible: boolean;
  action?: { label: string; onClick: () => void };
}

interface QuickAction {
  id: string;
  icon: string;
  label: string;
  description: string;
  color: string;
  badge?: number;
}

interface SystemMetric {
  id: string;
  label: string;
  value: number;
  max: number;
  unit: string;
  status: 'healthy' | 'warning' | 'critical';
  icon: string;
}

interface OrderStatus {
  status: string;
  count: number;
  color: string;
  icon: string;
}

interface TopPerformer {
  id: string;
  name: string;
  avatar: string;
  role: string;
  metric: string;
  value: string;
  trend: number;
}

type TimeRange = 'today' | 'week' | 'month' | 'quarter' | 'year';
type ActivityFilter = 'all' | 'user' | 'order' | 'dispute' | 'kyc' | 'listing' | 'system';
type RevenueTab = 'daily' | 'weekly' | 'monthly';

interface GeoRegion {
  region: string;
  value: number;
  color: string;
  cx: number;
  cy: number;
  orders: number;
  revenue: string;
}

// Animated Counter Component
const AnimatedCounter: React.FC<{ 
  value: number; 
  prefix?: string; 
  suffix?: string;
  duration?: number;
  decimals?: number;
}> = ({ value, prefix = '', suffix = '', duration = 1000, decimals = 0 }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const startTime = useRef<number | null>(null);
  const startValue = useRef(0);

  useEffect(() => {
    startValue.current = displayValue;
    startTime.current = null;
    
    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp;
      const progress = Math.min((timestamp - startTime.current) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = startValue.current + (value - startValue.current) * easeOut;
      setDisplayValue(decimals > 0 ? parseFloat(current.toFixed(decimals)) : Math.floor(current));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value, duration, decimals]);

  return <span>{prefix}{displayValue.toLocaleString()}{suffix}</span>;
};

// Mini Sparkline Chart Component
const Sparkline: React.FC<{ data: number[]; color: string; height?: number }> = ({ 
  data, 
  color, 
  height = 40 
}) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `0,${height} ${points} 100,${height}`;

  return (
    <svg className="sparkline" viewBox={`0 0 100 ${height}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon 
        points={areaPoints} 
        fill={`url(#gradient-${color})`}
      />
      <polyline 
        points={points} 
        fill="none" 
        stroke={color} 
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle 
        cx="100" 
        cy={height - ((data[data.length - 1] - min) / range) * height}
        r="3"
        fill={color}
      />
    </svg>
  );
};

// Donut Chart Component
const DonutChart: React.FC<{ data: OrderStatus[] }> = ({ data }) => {
  const total = data.reduce((sum, item) => sum + item.count, 0);
  let currentAngle = 0;

  return (
    <div className="donut-chart">
      <svg viewBox="0 0 100 100" className="donut-chart__svg">
        {data.map((item, index) => {
          const percentage = (item.count / total) * 100;
          const angle = (percentage / 100) * 360;
          const startAngle = currentAngle;
          currentAngle += angle;
          
          const x1 = 50 + 35 * Math.cos((startAngle - 90) * Math.PI / 180);
          const y1 = 50 + 35 * Math.sin((startAngle - 90) * Math.PI / 180);
          const x2 = 50 + 35 * Math.cos((startAngle + angle - 90) * Math.PI / 180);
          const y2 = 50 + 35 * Math.sin((startAngle + angle - 90) * Math.PI / 180);
          
          const largeArc = angle > 180 ? 1 : 0;
          
          return (
            <path
              key={index}
              d={`M 50 50 L ${x1} ${y1} A 35 35 0 ${largeArc} 1 ${x2} ${y2} Z`}
              fill={item.color}
              className="donut-chart__segment"
              style={{ '--delay': `${index * 100}ms` } as React.CSSProperties}
            />
          );
        })}
        <circle cx="50" cy="50" r="22" fill="white" />
        <text x="50" y="47" textAnchor="middle" className="donut-chart__total">
          {total}
        </text>
        <text x="50" y="57" textAnchor="middle" className="donut-chart__label">
          Orders
        </text>
      </svg>
      <div className="donut-chart__legend">
        {data.map((item, index) => (
          <div key={index} className="donut-chart__legend-item">
            <span className="donut-chart__legend-dot" style={{ background: item.color }} />
            <span className="donut-chart__legend-label">{item.status}</span>
            <span className="donut-chart__legend-value">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Revenue data by tab
const revenueDataMap: Record<RevenueTab, { bars: number[]; labels: string[]; summary: { total: string; avg: string; avgChange: string; txns: string; txnsChange: string; totalChange: string } }> = {
  daily: {
    bars: [45, 62, 38, 75, 52, 68, 80, 55, 72, 90, 65, 78, 82, 60, 70, 88, 50, 76, 84, 58, 66, 92, 74, 86, 48, 70, 95, 64, 78, 100],
    labels: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30'],
    summary: { total: '₹4,28,000', avg: '₹14,267', avgChange: '↑ 8%', txns: '342', txnsChange: '↑ 15%', totalChange: '↑ 23% vs last month' }
  },
  weekly: {
    bars: [60, 78, 85, 72, 65, 80, 45, 90, 75, 88, 95, 68],
    labels: ['W1 Jan', 'W2 Jan', 'W3 Jan', 'W4 Jan', 'W1 Feb', 'W2 Feb', 'W3 Feb', 'W4 Feb', 'W1 Mar', 'W2 Mar', 'W3 Mar', 'W4 Mar'],
    summary: { total: '₹12,84,000', avg: '₹1,07,000', avgChange: '↑ 12%', txns: '1,026', txnsChange: '↑ 18%', totalChange: '↑ 19% vs last quarter' }
  },
  monthly: {
    bars: [65, 80, 45, 90, 75, 85, 95, 70, 88, 92, 78, 100],
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    summary: { total: '₹51,36,000', avg: '₹4,28,000', avgChange: '↑ 23%', txns: '4,104', txnsChange: '↑ 22%', totalChange: '↑ 31% vs last year' }
  }
};

// Geo regions with map coordinates (India SVG viewbox positions)
const geoRegions: GeoRegion[] = [
  { region: 'Maharashtra', value: 45, color: '#10b981', cx: 250, cy: 340, orders: 1420, revenue: '₹18.5L' },
  { region: 'Karnataka', value: 25, color: '#3b82f6', cx: 248, cy: 410, orders: 780, revenue: '₹10.2L' },
  { region: 'Gujarat', value: 15, color: '#f59e0b', cx: 185, cy: 280, orders: 468, revenue: '₹6.1L' },
  { region: 'Rajasthan', value: 10, color: '#8b5cf6', cx: 210, cy: 210, orders: 312, revenue: '₹4.1L' },
  { region: 'Delhi NCR', value: 8, color: '#ec4899', cx: 248, cy: 175, orders: 250, revenue: '₹3.3L' },
  { region: 'Tamil Nadu', value: 7, color: '#06b6d4', cx: 270, cy: 460, orders: 218, revenue: '₹2.8L' },
  { region: 'Madhya Pradesh', value: 6, color: '#f97316', cx: 265, cy: 280, orders: 187, revenue: '₹2.4L' },
  { region: 'Uttar Pradesh', value: 5, color: '#14b8a6', cx: 290, cy: 200, orders: 156, revenue: '₹2.0L' },
];

// Main Component
const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [stats, setStats] = useState<StatCard[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetric[]>([]);
  const [orderStatuses, setOrderStatuses] = useState<OrderStatus[]>([]);
  const [topPerformers, setTopPerformers] = useState<TopPerformer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('all');
  const [selectedStat, setSelectedStat] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [liveUpdates, setLiveUpdates] = useState(true);
  const [revenueTab, setRevenueTab] = useState<RevenueTab>('daily');
  const [showGeoMap, setShowGeoMap] = useState(false);
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [showAllPerformers, setShowAllPerformers] = useState(false);
  const [showAllActivity, setShowAllActivity] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  // Quick Actions
  const quickActions: (QuickAction & { route: string })[] = [
    { id: '1', icon: '👥', label: 'Manage Users', description: 'View and edit user accounts', color: '#3b82f6', badge: 12, route: '/admin/users' },
    { id: '2', icon: '📦', label: 'Orders', description: 'Track and manage orders', color: '#10b981', badge: 156, route: '/admin/orders' },
    { id: '3', icon: '⚖️', label: 'Disputes', description: 'Resolve customer disputes', color: '#f59e0b', badge: 7, route: '/admin/disputes' },
    { id: '4', icon: '✅', label: 'KYC Approvals', description: 'Verify user documents', color: '#8b5cf6', badge: 23, route: '/admin/users' },
    { id: '5', icon: '🏷️', label: 'Listings', description: 'Moderate product listings', color: '#ec4899', badge: 45, route: '/admin/listings' },
    { id: '6', icon: '💳', label: 'Payouts', description: 'Process payments', color: '#06b6d4', badge: 8, route: '/admin/payouts' },
  ];

  // Time range options
  const timeRanges: { value: TimeRange; label: string }[] = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'quarter', label: 'Quarter' },
    { value: 'year', label: 'Year' },
  ];

  // Activity filter options
  const activityFilters: { value: ActivityFilter; label: string; icon: string }[] = [
    { value: 'all', label: 'All', icon: '📋' },
    { value: 'user', label: 'Users', icon: '👤' },
    { value: 'order', label: 'Orders', icon: '📦' },
    { value: 'dispute', label: 'Disputes', icon: '⚠️' },
    { value: 'kyc', label: 'KYC', icon: '✅' },
    { value: 'listing', label: 'Listings', icon: '🏷️' },
    { value: 'system', label: 'System', icon: '⚙️' },
  ];

  // Load dashboard data
  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Stats data with trends
      setStats([
        { 
          id: 'users',
          label: 'Total Users', 
          value: 2847,
          displayValue: '2,847', 
          change: '+12%', 
          changeValue: 12,
          positive: true, 
          icon: '👥', 
          iconClass: 'users',
          trend: [2100, 2250, 2380, 2520, 2650, 2720, 2847],
          description: 'Active registered users on the platform'
        },
        { 
          id: 'orders',
          label: 'Active Orders', 
          value: 156,
          displayValue: '156', 
          change: '+8%', 
          changeValue: 8,
          positive: true, 
          icon: '📦', 
          iconClass: 'orders',
          trend: [120, 135, 142, 138, 150, 148, 156],
          description: 'Orders currently being processed'
        },
        { 
          id: 'revenue',
          label: 'Revenue (MTD)', 
          value: 420000,
          displayValue: '₹4.2L', 
          change: '+23%', 
          changeValue: 23,
          positive: true, 
          icon: '💰', 
          iconClass: 'revenue',
          trend: [280000, 310000, 350000, 380000, 395000, 410000, 420000],
          description: 'Month-to-date revenue collected'
        },
        { 
          id: 'impact',
          label: 'Food Saved (kg)', 
          value: 12450,
          displayValue: '12,450', 
          change: '+15%', 
          changeValue: 15,
          positive: true, 
          icon: '🌍', 
          iconClass: 'impact',
          trend: [8500, 9200, 10100, 10800, 11400, 12000, 12450],
          description: 'Kilograms of food waste prevented'
        },
        { 
          id: 'disputes',
          label: 'Open Disputes', 
          value: 7,
          displayValue: '7', 
          change: '-3', 
          changeValue: -3,
          positive: true, 
          icon: '⚖️', 
          iconClass: 'disputes',
          trend: [15, 12, 10, 11, 9, 8, 7],
          description: 'Disputes awaiting resolution'
        },
        { 
          id: 'drivers',
          label: 'Active Drivers', 
          value: 42,
          displayValue: '42', 
          change: '+5', 
          changeValue: 5,
          positive: true, 
          icon: '🚗', 
          iconClass: 'drivers',
          trend: [32, 34, 36, 37, 39, 41, 42],
          description: 'Drivers currently online'
        },
      ]);

      // Activity data
      setRecentActivity([
        { 
          id: '1', 
          icon: '👤', 
          text: <><strong>Ramesh Kumar</strong> registered as a new farmer</>, 
          time: '5 min ago',
          timestamp: new Date(Date.now() - 5 * 60 * 1000),
          type: 'user',
          status: 'completed'
        },
        { 
          id: '2', 
          icon: '📦', 
          text: <><strong>Order #1234</strong> marked as delivered</>, 
          time: '12 min ago',
          timestamp: new Date(Date.now() - 12 * 60 * 1000),
          type: 'order',
          status: 'completed'
        },
        { 
          id: '3', 
          icon: '⚠️', 
          text: <>Dispute raised on <strong>Order #1198</strong></>, 
          time: '25 min ago',
          timestamp: new Date(Date.now() - 25 * 60 * 1000),
          type: 'dispute',
          status: 'urgent',
          actionable: true
        },
        { 
          id: '4', 
          icon: '✅', 
          text: <>KYC approved for <strong>Priya Devi</strong></>, 
          time: '1 hour ago',
          timestamp: new Date(Date.now() - 60 * 60 * 1000),
          type: 'kyc',
          status: 'completed'
        },
        { 
          id: '5', 
          icon: '🏷️', 
          text: <>New listing <strong>"Organic Basmati"</strong> submitted for review</>, 
          time: '2 hours ago',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
          type: 'listing',
          status: 'pending',
          actionable: true
        },
        { 
          id: '6', 
          icon: '💳', 
          text: <>Payout of <strong>₹15,000</strong> processed for Farmer Collective</>, 
          time: '3 hours ago',
          timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
          type: 'order',
          status: 'completed'
        },
        { 
          id: '7', 
          icon: '🚗', 
          text: <>Driver <strong>Suresh M.</strong> completed 50 deliveries</>, 
          time: '4 hours ago',
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
          type: 'user',
          status: 'completed'
        },
        { 
          id: '8', 
          icon: '⚙️', 
          text: <>System backup completed successfully</>, 
          time: '5 hours ago',
          timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
          type: 'system',
          status: 'completed'
        },
      ]);

      // Alerts
      setAlerts([
        {
          id: '1',
          type: 'warning',
          icon: '⚠️',
          message: '3 listings pending moderation for over 24 hours',
          timestamp: new Date(),
          dismissible: true,
          action: { label: 'Review Now', onClick: () => console.log('Review listings') }
        },
        {
          id: '2',
          type: 'critical',
          icon: '🚨',
          message: '2 drivers have unresolved payout failures',
          timestamp: new Date(),
          dismissible: true,
          action: { label: 'Fix Payouts', onClick: () => console.log('Fix payouts') }
        },
        {
          id: '3',
          type: 'info',
          icon: '📊',
          message: 'Weekly analytics report is ready for download',
          timestamp: new Date(),
          dismissible: true,
          action: { label: 'Download', onClick: () => console.log('Download report') }
        },
      ]);

      // System Metrics
      setSystemMetrics([
        { id: '1', label: 'API Response', value: 120, max: 500, unit: 'ms', status: 'healthy', icon: '📡' },
        { id: '2', label: 'Database', value: 87, max: 100, unit: '%', status: 'warning', icon: '🗄️' },
        { id: '3', label: 'Memory', value: 62, max: 100, unit: '%', status: 'healthy', icon: '💾' },
        { id: '4', label: 'CPU Usage', value: 45, max: 100, unit: '%', status: 'healthy', icon: '⚡' },
        { id: '5', label: 'Uptime', value: 99.9, max: 100, unit: '%', status: 'healthy', icon: '🟢' },
      ]);

      // Order Statuses
      setOrderStatuses([
        { status: 'Pending', count: 45, color: '#f59e0b', icon: '⏳' },
        { status: 'Processing', count: 62, color: '#3b82f6', icon: '⚙️' },
        { status: 'In Transit', count: 38, color: '#8b5cf6', icon: '🚚' },
        { status: 'Delivered', count: 156, color: '#10b981', icon: '✅' },
        { status: 'Cancelled', count: 12, color: '#ef4444', icon: '❌' },
      ]);

      // Top Performers
      setTopPerformers([
        { id: '1', name: 'Ramesh Farms', avatar: '👨‍🌾', role: 'Farmer', metric: 'Revenue', value: '₹1.2L', trend: 23 },
        { id: '2', name: 'Suresh M.', avatar: '🚗', role: 'Driver', metric: 'Deliveries', value: '287', trend: 15 },
        { id: '3', name: 'Green Valley Co.', avatar: '🏢', role: 'Supplier', metric: 'Orders', value: '156', trend: 18 },
        { id: '4', name: 'Priya Store', avatar: '🏪', role: 'Buyer', metric: 'Purchases', value: '₹85K', trend: 12 },
      ]);

      setLastUpdated(new Date());
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadDashboard();
  }, [loadDashboard, timeRange]);

  // Live updates simulation
  useEffect(() => {
    if (!liveUpdates) return;
    
    const interval = setInterval(() => {
      setStats(prev => prev.map(stat => ({
        ...stat,
        value: stat.value + Math.floor(Math.random() * 3 - 1),
        trend: [...stat.trend.slice(1), stat.value + Math.floor(Math.random() * 10 - 5)]
      })));
    }, 5000);

    return () => clearInterval(interval);
  }, [liveUpdates]);

  // Click outside to close notifications
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Dark mode effect
  useEffect(() => {
    document.documentElement.classList.toggle('dark-mode', darkMode);
  }, [darkMode]);

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadDashboard();
    setIsRefreshing(false);
  }, [loadDashboard]);

  // Dismiss alert
  const dismissAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  }, []);

  // Filtered activities
  const filteredActivities = useMemo(() => {
    return recentActivity.filter(activity => {
      const matchesFilter = activityFilter === 'all' || activity.type === activityFilter;
      const matchesSearch = searchQuery === '' || 
        activity.text?.toString().toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [recentActivity, activityFilter, searchQuery]);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className={`admin-dashboard ${darkMode ? 'dark' : ''}`}>
        <div className="admin-dashboard__skeleton">
          <div className="skeleton-header">
            <div className="skeleton-title" />
            <div className="skeleton-actions" />
          </div>
          <div className="skeleton-stats">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="skeleton-stat-card">
                <div className="skeleton-icon" />
                <div className="skeleton-content">
                  <div className="skeleton-line short" />
                  <div className="skeleton-line" />
                </div>
              </div>
            ))}
          </div>
          <div className="skeleton-grid">
            <div className="skeleton-card large" />
            <div className="skeleton-card" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`admin-dashboard ${darkMode ? 'dark' : ''}`}>
      {/* Header */}
      <header className="admin-dashboard__header">
        <div className="header-left">
          <div className="header-title-section">
            <h1 className="header-title">
              <span className="header-icon">📊</span>
              Dashboard
            </h1>
            <p className="header-subtitle">
              Welcome back! Here's what's happening today.
            </p>
          </div>
        </div>

        <div className="header-right">
          {/* Search */}
          <div className="header-search">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search anything..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="header-divider" />

          {/* Time Range Selector */}
          <div className="time-range-selector">
            {timeRanges.map(range => (
              <button
                key={range.value}
                className={`time-range-btn ${timeRange === range.value ? 'active' : ''}`}
                onClick={() => setTimeRange(range.value)}
              >
                {range.label}
              </button>
            ))}
          </div>

          {/* Live Updates Toggle */}
          <button 
            className={`live-toggle ${liveUpdates ? 'active' : ''}`}
            onClick={() => setLiveUpdates(!liveUpdates)}
            title={liveUpdates ? 'Disable live updates' : 'Enable live updates'}
          >
            <span className="live-dot" />
            Live
          </button>

          <div className="header-divider" />

          {/* Utility Controls */}
          <div className="header-utils">
            {/* Notifications */}
            <div className="notifications-wrapper" ref={notificationRef}>
              <button 
                className="notification-btn"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                🔔
                {alerts.length > 0 && (
                  <span className="notification-badge">{alerts.length}</span>
                )}
              </button>
              
              {showNotifications && (
                <div className="notifications-dropdown">
                  <div className="notifications-header">
                    <h4>Notifications</h4>
                    <button onClick={() => setAlerts([])}>Clear All</button>
                  </div>
                  <div className="notifications-list">
                    {alerts.length === 0 ? (
                      <div className="notifications-empty">
                        <span>🎉</span>
                        <p>No new notifications</p>
                      </div>
                    ) : (
                      alerts.map(alert => (
                        <div key={alert.id} className={`notification-item ${alert.type}`}>
                          <span className="notification-icon">{alert.icon}</span>
                          <div className="notification-content">
                            <p>{alert.message}</p>
                            {alert.action && (
                              <button 
                                className="notification-action"
                                onClick={alert.action.onClick}
                              >
                                {alert.action.label}
                              </button>
                            )}
                          </div>
                          <button 
                            className="notification-dismiss"
                            onClick={() => dismissAlert(alert.id)}
                          >
                            ×
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Refresh */}
            <button 
              className={`refresh-btn ${isRefreshing ? 'spinning' : ''}`}
              onClick={handleRefresh}
              disabled={isRefreshing}
              title="Refresh data"
            >
              🔄
            </button>

            {/* Dark Mode Toggle */}
            <button 
              className="theme-toggle"
              onClick={() => setDarkMode(!darkMode)}
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>

          {/* User Menu */}
          <div className="user-menu">
            <div className="user-avatar-placeholder">A</div>
            <div className="user-info">
              <span className="user-name">Admin</span>
              <span className="user-role">Super Admin</span>
            </div>
          </div>
        </div>
      </header>

      {/* Last Updated */}
      <div className="last-updated">
        <span>Last updated: {lastUpdated.toLocaleTimeString()}</span>
        {liveUpdates && <span className="live-indicator">● Live</span>}
      </div>

      {/* Alerts Section */}
      <div className="admin-dashboard__alerts">
        {alerts.map((alert, index) => (
          <div 
            key={alert.id} 
            className={`admin-alert ${alert.type}`}
            style={{ '--index': index } as React.CSSProperties}
          >
            <span className="admin-alert__icon">{alert.icon}</span>
            <span className="admin-alert__message">{alert.message}</span>
            {alert.action && (
              <button 
                className="admin-alert__action"
                onClick={alert.action.onClick}
              >
                {alert.action.label}
              </button>
            )}
            {alert.dismissible && (
              <button 
                className="admin-alert__dismiss"
                onClick={() => dismissAlert(alert.id)}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Stat Cards */}
      <div className="admin-dashboard__stats">
        {stats.map((stat, index) => (
          <div 
            key={stat.id} 
            className={`admin-stat-card ${selectedStat === stat.id ? 'selected' : ''}`}
            onClick={() => setSelectedStat(selectedStat === stat.id ? null : stat.id)}
            style={{ '--index': index } as React.CSSProperties}
          >
            <div className={`admin-stat-card__icon ${stat.iconClass}`}>
              {stat.icon}
            </div>
            <div className="admin-stat-card__content">
              <span className="admin-stat-card__label">{stat.label}</span>
              <span className="admin-stat-card__value">
                <AnimatedCounter value={stat.value} />
              </span>
              <span className={`admin-stat-card__change ${stat.positive ? 'positive' : 'negative'}`}>
                {stat.positive ? '↑' : '↓'} {stat.change}
              </span>
            </div>
            <div className="admin-stat-card__chart">
              <Sparkline 
                data={stat.trend} 
                color={stat.positive ? '#10b981' : '#ef4444'}
              />
            </div>
            
            {/* Expanded Details */}
            {selectedStat === stat.id && (
              <div className="admin-stat-card__details">
                <p>{stat.description}</p>
                <div className="stat-details-grid">
                  <div className="stat-detail">
                    <span className="stat-detail__label">Today</span>
                    <span className="stat-detail__value">+{Math.floor(stat.value * 0.05)}</span>
                  </div>
                  <div className="stat-detail">
                    <span className="stat-detail__label">This Week</span>
                    <span className="stat-detail__value">+{Math.floor(stat.value * 0.12)}</span>
                  </div>
                  <div className="stat-detail">
                    <span className="stat-detail__label">Avg/Day</span>
                    <span className="stat-detail__value">{Math.floor(stat.value / 30)}</span>
                  </div>
                </div>
                <button className="stat-details-btn" onClick={(e) => { e.stopPropagation(); navigate('/admin/analytics'); }}>View Full Report →</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="admin-dashboard__quick-actions">
        <h3 className="section-title">Quick Actions</h3>
        <div className="quick-actions-grid">
          {quickActions.map((action, index) => (
            <button 
              key={action.id} 
              className="quick-action-btn"
              onClick={() => navigate(action.route)}
              style={{ 
                '--color': action.color,
                '--index': index 
              } as React.CSSProperties}
            >
              <span className="quick-action-btn__icon">{action.icon}</span>
              <div className="quick-action-btn__content">
                <span className="quick-action-btn__label">{action.label}</span>
                <span className="quick-action-btn__description">{action.description}</span>
              </div>
              {action.badge !== undefined && action.badge > 0 && (
                <span className="quick-action-btn__badge">{action.badge}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="admin-dashboard__grid">
        {/* Activity Feed */}
        <div className="admin-dashboard__card activity-card">
          <div className="admin-dashboard__card-header">
            <h3 className="admin-dashboard__card-title">
              <span>📋</span> Recent Activity
            </h3>
            <div className="card-header-actions">
              <div className="activity-filters">
                {activityFilters.map(filter => (
                  <button
                    key={filter.value}
                    className={`activity-filter-btn ${activityFilter === filter.value ? 'active' : ''}`}
                    onClick={() => setActivityFilter(filter.value)}
                    title={filter.label}
                  >
                    {filter.icon}
                  </button>
                ))}
              </div>
              <button className="admin-dashboard__card-action" onClick={() => setShowAllActivity(!showAllActivity)}>
                {showAllActivity ? 'Show Less' : 'View All'}
              </button>
            </div>
          </div>
          <div className={`activity-list ${showAllActivity ? 'expanded' : ''}`}>
            {filteredActivities.length === 0 ? (
              <div className="activity-empty">
                <span>🔍</span>
                <p>No activities match your filter</p>
              </div>
            ) : (
              filteredActivities.map((activity, index) => (
                <div 
                  key={activity.id} 
                  className={`admin-activity-item ${activity.status || ''}`}
                  style={{ '--index': index } as React.CSSProperties}
                >
                  <div className="admin-activity-item__icon">{activity.icon}</div>
                  <div className="admin-activity-item__content">
                    <div className="admin-activity-item__text">{activity.text}</div>
                    <div className="admin-activity-item__meta">
                      <span className="admin-activity-item__time">{activity.time}</span>
                      {activity.status && (
                        <span className={`admin-activity-item__status ${activity.status}`}>
                          {activity.status}
                        </span>
                      )}
                    </div>
                  </div>
                  {activity.actionable && (
                    <button className="admin-activity-item__action">
                      Take Action
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Order Status */}
        <div className="admin-dashboard__card orders-card">
          <div className="admin-dashboard__card-header">
            <h3 className="admin-dashboard__card-title">
              <span>📦</span> Order Status
            </h3>
            <button className="admin-dashboard__card-action" onClick={() => setShowOrderDetails(!showOrderDetails)}>
              {showOrderDetails ? 'Chart View' : 'Details'}
            </button>
          </div>
          {showOrderDetails ? (
            <div className="order-details-list">
              {orderStatuses.map((status, index) => (
                <div key={index} className="order-detail-row" style={{ '--index': index } as React.CSSProperties}>
                  <div className="order-detail-row__left">
                    <span className="order-detail-row__icon">{status.icon}</span>
                    <span className="order-detail-row__status">{status.status}</span>
                  </div>
                  <div className="order-detail-row__right">
                    <span className="order-detail-row__count">{status.count}</span>
                    <div className="order-detail-row__bar">
                      <div 
                        className="order-detail-row__bar-fill"
                        style={{ 
                          width: `${(status.count / Math.max(...orderStatuses.map(s => s.count))) * 100}%`,
                          background: status.color 
                        }}
                      />
                    </div>
                    <span className="order-detail-row__pct">
                      {Math.round((status.count / orderStatuses.reduce((s, o) => s + o.count, 0)) * 100)}%
                    </span>
                  </div>
                </div>
              ))}
              <div className="order-details-footer">
                <button className="order-details-nav-btn" onClick={() => navigate('/admin/orders')}>
                  Go to Order Control Panel →
                </button>
              </div>
            </div>
          ) : (
            <DonutChart data={orderStatuses} />
          )}
        </div>

        {/* Revenue Chart */}
        <div className="admin-dashboard__card revenue-card">
          <div className="admin-dashboard__card-header">
            <h3 className="admin-dashboard__card-title">
              <span>💰</span> Revenue Overview
            </h3>
            <div className="card-header-tabs">
              {(['daily', 'weekly', 'monthly'] as RevenueTab[]).map(tab => (
                <button
                  key={tab}
                  className={`tab-btn ${revenueTab === tab ? 'active' : ''}`}
                  onClick={() => setRevenueTab(tab)}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="revenue-chart">
            <div className="revenue-chart__summary">
              <div className="revenue-summary-item">
                <span className="revenue-summary-label">Total Revenue</span>
                <span className="revenue-summary-value">{revenueDataMap[revenueTab].summary.total}</span>
                <span className="revenue-summary-change positive">{revenueDataMap[revenueTab].summary.totalChange}</span>
              </div>
              <div className="revenue-summary-item">
                <span className="revenue-summary-label">Average {revenueTab === 'daily' ? 'Daily' : revenueTab === 'weekly' ? 'Weekly' : 'Monthly'}</span>
                <span className="revenue-summary-value">{revenueDataMap[revenueTab].summary.avg}</span>
                <span className="revenue-summary-change positive">{revenueDataMap[revenueTab].summary.avgChange}</span>
              </div>
              <div className="revenue-summary-item">
                <span className="revenue-summary-label">Transactions</span>
                <span className="revenue-summary-value">{revenueDataMap[revenueTab].summary.txns}</span>
                <span className="revenue-summary-change positive">{revenueDataMap[revenueTab].summary.txnsChange}</span>
              </div>
            </div>
            <div className="revenue-chart__bars" key={revenueTab}>
              {revenueDataMap[revenueTab].bars.map((height, index) => (
                <div 
                  key={`${revenueTab}-${index}`} 
                  className="revenue-bar"
                  style={{ 
                    '--height': `${height}%`,
                    '--delay': `${index * 30}ms`
                  } as React.CSSProperties}
                >
                  <div className="revenue-bar__fill" />
                  <span className="revenue-bar__label">
                    {revenueDataMap[revenueTab].labels[index]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* System Status */}
        <div className="admin-dashboard__card system-card">
          <div className="admin-dashboard__card-header">
            <h3 className="admin-dashboard__card-title">
              <span>⚡</span> System Health
            </h3>
            <span className="system-status-badge healthy">All Systems Operational</span>
          </div>
          <div className="system-metrics-grid">
            {systemMetrics.map((metric, index) => (
              <div 
                key={metric.id} 
                className={`system-metric ${metric.status}`}
                style={{ '--index': index } as React.CSSProperties}
              >
                <div className="system-metric__header">
                  <span className="system-metric__icon">{metric.icon}</span>
                  <span className="system-metric__label">{metric.label}</span>
                </div>
                <div className="system-metric__value">
                  {metric.value}{metric.unit}
                </div>
                <div className="system-metric__bar">
                  <div 
                    className="system-metric__bar-fill"
                    style={{ width: `${(metric.value / metric.max) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Performers */}
        <div className="admin-dashboard__card performers-card">
          <div className="admin-dashboard__card-header">
            <h3 className="admin-dashboard__card-title">
              <span>🏆</span> Top Performers
            </h3>
            <button className="admin-dashboard__card-action" onClick={() => setShowAllPerformers(!showAllPerformers)}>
              {showAllPerformers ? 'Show Less' : 'View All'}
            </button>
          </div>
          <div className="performers-list">
            {(showAllPerformers ? [...topPerformers, 
              { id: '5', name: 'Anita Dairy', avatar: '🐄', role: 'Farmer', metric: 'Volume', value: '₹72K', trend: 10 },
              { id: '6', name: 'Kisan Express', avatar: '🚚', role: 'Driver', metric: 'Deliveries', value: '198', trend: 8 },
              { id: '7', name: 'Fresh Mart', avatar: '🏬', role: 'Buyer', metric: 'Purchases', value: '₹65K', trend: 14 },
              { id: '8', name: 'Organic Fields', avatar: '🌱', role: 'Supplier', metric: 'Orders', value: '112', trend: 9 },
            ] : topPerformers).map((performer, index) => (
              <div 
                key={performer.id} 
                className="performer-item"
                style={{ '--index': index } as React.CSSProperties}
              >
                <div className="performer-item__rank">#{index + 1}</div>
                <div className="performer-item__avatar">{performer.avatar}</div>
                <div className="performer-item__info">
                  <span className="performer-item__name">{performer.name}</span>
                  <span className="performer-item__role">{performer.role}</span>
                </div>
                <div className="performer-item__metric">
                  <span className="performer-item__value">{performer.value}</span>
                  <span className="performer-item__trend positive">↑ {performer.trend}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Geographic Distribution */}
        <div className="admin-dashboard__card geo-card">
          <div className="admin-dashboard__card-header">
            <h3 className="admin-dashboard__card-title">
              <span>🗺️</span> Geographic Distribution
            </h3>
            <button className="admin-dashboard__card-action" onClick={() => setShowGeoMap(true)}>View Map</button>
          </div>
          <div className="geo-distribution">
            {[
              { region: 'Maharashtra', value: 45, color: '#10b981' },
              { region: 'Karnataka', value: 25, color: '#3b82f6' },
              { region: 'Gujarat', value: 15, color: '#f59e0b' },
              { region: 'Rajasthan', value: 10, color: '#8b5cf6' },
              { region: 'Others', value: 5, color: '#6b7280' },
            ].map((item, index) => (
              <div 
                key={item.region} 
                className="geo-item"
                style={{ '--index': index } as React.CSSProperties}
              >
                <div className="geo-item__info">
                  <span 
                    className="geo-item__dot" 
                    style={{ background: item.color }} 
                  />
                  <span className="geo-item__name">{item.region}</span>
                </div>
                <div className="geo-item__bar-container">
                  <div 
                    className="geo-item__bar" 
                    style={{ 
                      width: `${item.value}%`,
                      background: item.color
                    }} 
                  />
                </div>
                <span className="geo-item__value">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Geographic Map Modal */}
      {showGeoMap && (
        <div className="geo-map-overlay" onClick={() => setShowGeoMap(false)}>
          <div className="geo-map-modal" onClick={(e) => e.stopPropagation()}>
            <div className="geo-map-modal__header">
              <h3>🗺️ Geographic Distribution Map</h3>
              <button className="geo-map-modal__close" onClick={() => setShowGeoMap(false)}>×</button>
            </div>
            <div className="geo-map-modal__body">
              <svg viewBox="0 0 500 600" className="geo-map-svg">
                {/* India outline (simplified) */}
                <path 
                  d="M248 50 L310 70 L340 100 L360 140 L370 180 L350 200 L330 180 L310 190 
                     L320 220 L340 260 L350 300 L340 340 L330 370 L310 400 L290 430 
                     L280 460 L260 490 L250 520 L240 500 L242 470 L230 440 L220 420 
                     L200 400 L185 380 L170 350 L160 320 L150 290 L145 260 L140 230 
                     L150 200 L165 170 L175 140 L190 120 L210 90 L230 70 Z"
                  fill="var(--bg-tertiary)"
                  stroke="var(--border-color)"
                  strokeWidth="2"
                />
                
                {/* Region distribution circles */}
                {geoRegions.map((r) => {
                  const radiusBase = Math.max(r.value * 0.7, 12);
                  const isHovered = hoveredRegion === r.region;
                  return (
                    <g 
                      key={r.region}
                      onMouseEnter={() => setHoveredRegion(r.region)}
                      onMouseLeave={() => setHoveredRegion(null)}
                      style={{ cursor: 'pointer' }}
                    >
                      {/* Pulse ring */}
                      <circle 
                        cx={r.cx} cy={r.cy} 
                        r={radiusBase + 5}
                        fill="none"
                        stroke={r.color}
                        strokeWidth="2"
                        opacity={isHovered ? 0.6 : 0.2}
                        className="geo-pulse-ring"
                      />
                      {/* Main circle */}
                      <circle 
                        cx={r.cx} cy={r.cy} 
                        r={radiusBase}
                        fill={r.color}
                        opacity={isHovered ? 0.9 : 0.7}
                        style={{ transition: 'all 0.2s ease' }}
                      />
                      {/* Percentage label */}
                      <text 
                        x={r.cx} y={r.cy + 1} 
                        textAnchor="middle" 
                        dominantBaseline="middle"
                        fill="white" 
                        fontSize={radiusBase > 18 ? "11" : "9"} 
                        fontWeight="700"
                      >
                        {r.value}%
                      </text>
                      {/* Region name */}
                      <text 
                        x={r.cx} y={r.cy + radiusBase + 14} 
                        textAnchor="middle" 
                        fill="var(--text-primary)" 
                        fontSize="10" 
                        fontWeight="600"
                      >
                        {r.region}
                      </text>
                    </g>
                  );
                })}
              </svg>
              
              {/* Hover info panel */}
              {hoveredRegion && (() => {
                const r = geoRegions.find(g => g.region === hoveredRegion);
                if (!r) return null;
                return (
                  <div className="geo-map-info-panel">
                    <div className="geo-map-info-panel__dot" style={{ background: r.color }} />
                    <div className="geo-map-info-panel__details">
                      <strong>{r.region}</strong>
                      <span>{r.value}% share · {r.orders} orders · {r.revenue} revenue</span>
                    </div>
                  </div>
                );
              })()}

              {/* Legend */}
              <div className="geo-map-legend">
                {geoRegions.map(r => (
                  <div 
                    key={r.region} 
                    className={`geo-map-legend__item ${hoveredRegion === r.region ? 'active' : ''}`}
                    onMouseEnter={() => setHoveredRegion(r.region)}
                    onMouseLeave={() => setHoveredRegion(null)}
                  >
                    <span className="geo-map-legend__dot" style={{ background: r.color }} />
                    <span className="geo-map-legend__name">{r.region}</span>
                    <span className="geo-map-legend__value">{r.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="admin-dashboard__footer">
        <div className="footer-left">
          <span>© 2024 Annam Admin Panel. All rights reserved.</span>
        </div>
        <div className="footer-right">
          <a href="#help">Help Center</a>
          <a href="#docs">Documentation</a>
          <a href="#support">Support</a>
        </div>
      </footer>
    </div>
  );
};

export default AdminDashboard;