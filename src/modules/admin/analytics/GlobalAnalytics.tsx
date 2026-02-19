import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as XLSX from 'xlsx';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import jsPDF from 'jspdf';
import './GlobalAnalytics.css';

type TimeRange = '7d' | '30d' | '90d' | '1y';
type ViewMode = 'overview' | 'detailed';
type ChartType = 'line' | 'bar' | 'area';

interface KPI {
  icon: string;
  value: string;
  label: string;
  change: string;
  dir: 'up' | 'down';
  rawValue: number;
  target?: number;
  color: string;
}

interface Farmer {
  rank: number;
  name: string;
  revenue: string;
  orders: number;
  trend: 'up' | 'down' | 'stable';
  location: string;
  rating: number;
}

interface Driver {
  rank: number;
  name: string;
  deliveries: number;
  rating: string;
  onTime: number;
  location: string;
}

const GlobalAnalytics: React.FC = () => {
  const [range, setRange] = useState<TimeRange>('30d');
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [selectedKPI, setSelectedKPI] = useState<string | null>(null);
  const [chartType, setChartType] = useState<ChartType>('area');
  const [isComparing, setIsComparing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [hoveredKPI, setHoveredKPI] = useState<string | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [animateCharts, setAnimateCharts] = useState(true);

  const ranges: { key: TimeRange; label: string }[] = [
    { key: '7d', label: '7 Days' },
    { key: '30d', label: '30 Days' },
    { key: '90d', label: '90 Days' },
    { key: '1y', label: '1 Year' },
  ];

  const kpis: KPI[] = [
    {
      icon: '👥',
      value: '2,847',
      label: 'Total Users',
      change: '+12%',
      dir: 'up',
      rawValue: 2847,
      target: 3000,
      color: '#3b82f6',
    },
    {
      icon: '📦',
      value: '1,248',
      label: 'Orders',
      change: '+18%',
      dir: 'up',
      rawValue: 1248,
      target: 1500,
      color: '#10b981',
    },
    {
      icon: '💰',
      value: '₹12.4L',
      label: 'GMV',
      change: '+22%',
      dir: 'up',
      rawValue: 1240000,
      target: 1500000,
      color: '#f59e0b',
    },
    {
      icon: '🚛',
      value: '892',
      label: 'Deliveries',
      change: '+15%',
      dir: 'up',
      rawValue: 892,
      target: 1000,
      color: '#8b5cf6',
    },
    {
      icon: '🌿',
      value: '45.2T',
      label: 'Food Saved (kg)',
      change: '-3%',
      dir: 'down',
      rawValue: 45200,
      target: 50000,
      color: '#059669',
    },
  ];

  // Generate data based on selected time range
  const generateChartData = () => {
    const getDataPoints = () => {
      switch (range) {
        case '7d':
          return [
            { date: 'Mon', month: 'Mon', users: 2100, previousPeriod: 1900, orders: 120, revenue: 1.2, week: 'Week 1', onTime: 94, delayed: 6 },
            { date: 'Tue', month: 'Tue', users: 2250, previousPeriod: 2050, orders: 135, revenue: 1.35, week: 'Week 2', onTime: 91, delayed: 9 },
            { date: 'Wed', month: 'Wed', users: 2400, previousPeriod: 2200, orders: 150, revenue: 1.5, week: 'Week 3', onTime: 96, delayed: 4 },
            { date: 'Thu', month: 'Thu', users: 2550, previousPeriod: 2300, orders: 165, revenue: 1.65, week: 'Week 4', onTime: 93, delayed: 7 },
            { date: 'Fri', month: 'Fri', users: 2700, previousPeriod: 2450, orders: 180, revenue: 1.8, week: 'Week 1', onTime: 98, delayed: 2 },
            { date: 'Sat', month: 'Sat', users: 2800, previousPeriod: 2550, orders: 200, revenue: 2.0, week: 'Week 2', onTime: 95, delayed: 5 },
            { date: 'Sun', month: 'Sun', users: 2847, previousPeriod: 2650, orders: 210, revenue: 2.1, week: 'Week 3', onTime: 92, delayed: 8 },
          ];
        case '30d':
          return [
            { date: 'Week 1', month: 'Wk1', users: 1800, previousPeriod: 1600, orders: 850, revenue: 8.2, week: 'Week 1', onTime: 92, delayed: 8 },
            { date: 'Week 2', month: 'Wk2', users: 2100, previousPeriod: 1850, orders: 920, revenue: 9.1, week: 'Week 2', onTime: 88, delayed: 12 },
            { date: 'Week 3', month: 'Wk3', users: 2400, previousPeriod: 2200, orders: 1050, revenue: 10.5, week: 'Week 3', onTime: 95, delayed: 5 },
            { date: 'Week 4', month: 'Wk4', users: 2847, previousPeriod: 2550, orders: 1248, revenue: 12.4, week: 'Week 4', onTime: 91, delayed: 9 },
          ];
        case '90d':
          return [
            { date: 'Jan', month: 'Jan', users: 1800, previousPeriod: 1600, orders: 850, revenue: 8.2, week: 'Week 1', onTime: 90, delayed: 10 },
            { date: 'Feb', month: 'Feb', users: 2100, previousPeriod: 1850, orders: 920, revenue: 9.1, week: 'Week 2', onTime: 89, delayed: 11 },
            { date: 'Mar', month: 'Mar', users: 2400, previousPeriod: 2200, orders: 1050, revenue: 10.5, week: 'Week 3', onTime: 93, delayed: 7 },
          ];
        case '1y':
          return [
            { date: 'Q1', month: 'Q1', users: 1900, previousPeriod: 1700, orders: 850, revenue: 8.5, week: 'Week 1', onTime: 88, delayed: 12 },
            { date: 'Q2', month: 'Q2', users: 2250, previousPeriod: 1950, orders: 1050, revenue: 10.5, week: 'Week 2', onTime: 91, delayed: 9 },
            { date: 'Q3', month: 'Q3', users: 2500, previousPeriod: 2200, orders: 1150, revenue: 11.5, week: 'Week 3', onTime: 94, delayed: 6 },
            { date: 'Q4', month: 'Q4', users: 2847, previousPeriod: 2550, orders: 1248, revenue: 12.4, week: 'Week 4', onTime: 92, delayed: 8 },
          ];
        default:
          return [];
      }
    };

    const dataPoints = getDataPoints();
    
    return {
      userGrowthData: dataPoints.map(d => ({ date: d.date, users: d.users, previousPeriod: d.previousPeriod })),
      orderVolumeData: dataPoints.map(d => ({ month: d.month, orders: d.orders, revenue: d.revenue })),
      deliveryPerformanceData: dataPoints.map(d => ({ week: d.week, onTime: d.onTime, delayed: d.delayed })),
    };
  };

  const { userGrowthData: dynamicUserGrowthData, orderVolumeData: dynamicOrderVolumeData, deliveryPerformanceData: dynamicDeliveryPerformanceData } = generateChartData();

  const categoryData = [
    { name: 'Vegetables', value: 35, color: '#10b981' },
    { name: 'Fruits', value: 25, color: '#f59e0b' },
    { name: 'Grains', value: 20, color: '#3b82f6' },
    { name: 'Dairy', value: 12, color: '#8b5cf6' },
    { name: 'Others', value: 8, color: '#6b7280' },
  ];

  const topFarmers: Farmer[] = [
    {
      rank: 1,
      name: 'Green Valley Farm',
      revenue: '₹2,84,000',
      orders: 142,
      trend: 'up',
      location: 'Pune',
      rating: 4.8,
    },
    {
      rank: 2,
      name: 'Sunrise Organics',
      revenue: '₹1,96,000',
      orders: 98,
      trend: 'up',
      location: 'Nashik',
      rating: 4.6,
    },
    {
      rank: 3,
      name: 'Fresh Fields',
      revenue: '₹1,52,000',
      orders: 76,
      trend: 'stable',
      location: 'Satara',
      rating: 4.7,
    },
    {
      rank: 4,
      name: 'Organic Roots',
      revenue: '₹1,18,000',
      orders: 59,
      trend: 'down',
      location: 'Kolhapur',
      rating: 4.5,
    },
    {
      rank: 5,
      name: 'Harvest Hub',
      revenue: '₹92,000',
      orders: 46,
      trend: 'up',
      location: 'Sangli',
      rating: 4.4,
    },
  ];

  const topDrivers: Driver[] = [
    {
      rank: 1,
      name: 'Priya Kulkarni',
      deliveries: 182,
      rating: '4.9',
      onTime: 98,
      location: 'Pune',
    },
    {
      rank: 2,
      name: 'Rakesh Patil',
      deliveries: 156,
      rating: '4.7',
      onTime: 94,
      location: 'Mumbai',
    },
    {
      rank: 3,
      name: 'Deepa Rao',
      deliveries: 134,
      rating: '4.8',
      onTime: 96,
      location: 'Nashik',
    },
    {
      rank: 4,
      name: 'Sunil More',
      deliveries: 121,
      rating: '4.5',
      onTime: 91,
      location: 'Satara',
    },
    {
      rank: 5,
      name: 'Amit Shah',
      deliveries: 98,
      rating: '4.3',
      onTime: 87,
      location: 'Kolhapur',
    },
  ];

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        setLastUpdated(new Date());
      }, 30000); // Refresh every 30 seconds

      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const exportToCSV = (filename: string) => {
    const headers = ['Metric', 'Value', 'Change', 'Status'];
    const kpiRows = kpis.map(k => [
      k.label,
      k.value,
      k.change,
      k.dir === 'up' ? 'Increasing' : 'Decreasing'
    ]);
    
    const userGrowthHeaders = ['Date', 'Users', 'Previous Period'];
    const userGrowthRows = dynamicUserGrowthData.map(d => [d.date, d.users, d.previousPeriod]);
    
    const orderHeaders = ['Month', 'Orders', 'Revenue (L)'];
    const orderRows = dynamicOrderVolumeData.map(o => [o.month, o.orders, o.revenue]);
    
    const categoryHeaders = ['Category', 'Revenue Share %'];
    const categoryRows = categoryData.map(c => [c.name, c.value]);
    
    const farmerHeaders = ['Rank', 'Farmer', 'Location', 'Revenue', 'Orders', 'Rating', 'Trend'];
    const farmerRows = topFarmers.map(f => [
      f.rank,
      f.name,
      f.location,
      f.revenue,
      f.orders,
      f.rating,
      f.trend.toUpperCase()
    ]);
    
    const driverHeaders = ['Rank', 'Driver', 'Location', 'Deliveries', 'On-Time %', 'Rating'];
    const driverRows = topDrivers.map(d => [
      d.rank,
      d.name,
      d.location,
      d.deliveries,
      d.onTime,
      d.rating
    ]);
    
    const csv = [
      'GLOBAL ANALYTICS REPORT',
      `Generated: ${new Date().toLocaleString()}`,
      `Time Range: ${range}`,
      '',
      'KEY PERFORMANCE INDICATORS',
      headers.join(','),
      ...kpiRows.map(r => r.join(',')),
      '',
      'USER GROWTH',
      userGrowthHeaders.join(','),
      ...userGrowthRows.map(r => r.join(',')),
      '',
      'ORDER VOLUME & REVENUE',
      orderHeaders.join(','),
      ...orderRows.map(r => r.join(',')),
      '',
      'REVENUE BY CATEGORY',
      categoryHeaders.join(','),
      ...categoryRows.map(r => r.join(',')),
      '',
      'TOP FARMERS',
      farmerHeaders.join(','),
      ...farmerRows.map(r => r.join(',')),
      '',
      'TOP DRIVERS',
      driverHeaders.join(','),
      ...driverRows.map(r => r.join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToExcel = (filename: string) => {
    const timestamp = new Date().toLocaleString();
    
    // Create workbook and sheets
    const wb = XLSX.utils.book_new();
    
    // KPIs sheet
    const kpiData = [
      ['GLOBAL ANALYTICS REPORT - KEY PERFORMANCE INDICATORS'],
      [`Generated: ${timestamp}`],
      [`Time Range: ${range}`],
      [],
      ['Metric', 'Value', 'Change', 'Status'],
      ...kpis.map(k => [k.label, k.value, k.change, k.dir === 'up' ? 'Increasing' : 'Decreasing'])
    ];
    const kpiSheet = XLSX.utils.aoa_to_sheet(kpiData);
    XLSX.utils.book_append_sheet(wb, kpiSheet, 'KPIs');
    
    // User Growth sheet
    const userGrowthData2 = [
      ['USER GROWTH'],
      [`Generated: ${timestamp}`],
      [],
      ['Date', 'Users', 'Previous Period'],
      ...dynamicUserGrowthData.map(d => [d.date, d.users, d.previousPeriod])
    ];
    const userSheet = XLSX.utils.aoa_to_sheet(userGrowthData2);
    XLSX.utils.book_append_sheet(wb, userSheet, 'User Growth');
    
    // Orders sheet
    const orderData2 = [
      ['ORDER VOLUME & REVENUE'],
      [`Generated: ${timestamp}`],
      [],
      ['Month', 'Orders', 'Revenue (L)'],
      ...dynamicOrderVolumeData.map(o => [o.month, o.orders, o.revenue])
    ];
    const orderSheet = XLSX.utils.aoa_to_sheet(orderData2);
    XLSX.utils.book_append_sheet(wb, orderSheet, 'Orders');
    
    // Category sheet
    const categoryData2 = [
      ['REVENUE BY CATEGORY'],
      [`Generated: ${timestamp}`],
      [],
      ['Category', 'Revenue Share %'],
      ...categoryData.map(c => [c.name, c.value])
    ];
    const categorySheet = XLSX.utils.aoa_to_sheet(categoryData2);
    XLSX.utils.book_append_sheet(wb, categorySheet, 'Categories');
    
    // Farmers sheet
    const farmerData2 = [
      ['TOP FARMERS BY REVENUE'],
      [`Generated: ${timestamp}`],
      [],
      ['Rank', 'Farmer', 'Location', 'Revenue', 'Orders', 'Rating', 'Trend'],
      ...topFarmers.map(f => [f.rank, f.name, f.location, f.revenue, f.orders, f.rating, f.trend.toUpperCase()])
    ];
    const farmerSheet = XLSX.utils.aoa_to_sheet(farmerData2);
    XLSX.utils.book_append_sheet(wb, farmerSheet, 'Top Farmers');
    
    // Drivers sheet
    const driverData2 = [
      ['TOP DRIVERS BY DELIVERIES'],
      [`Generated: ${timestamp}`],
      [],
      ['Rank', 'Driver', 'Location', 'Deliveries', 'On-Time %', 'Rating'],
      ...topDrivers.map(d => [d.rank, d.name, d.location, d.deliveries, d.onTime, d.rating])
    ];
    const driverSheet = XLSX.utils.aoa_to_sheet(driverData2);
    XLSX.utils.book_append_sheet(wb, driverSheet, 'Top Drivers');
    
    // Download
    XLSX.writeFile(wb, filename);
  };

  const exportToPDF = (filename: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdf: any = new jsPDF();
    const timestamp = new Date().toLocaleString();
    
    let yPosition = 20;
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const lineHeight = 7;
    
    // Helper function to add text with wrapping
    const addText = (text: string, fontSize: number, isBold: boolean = false) => {
      if (yPosition > pageHeight - 15) {
        pdf.addPage();
        yPosition = 20;
      }
      pdf.setFontSize(fontSize);
      pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
      pdf.text(text, margin, yPosition);
      yPosition += lineHeight + (fontSize > 10 ? 3 : 0);
    };
    
    // Title
    addText('Global Analytics Report', 16, true);
    addText(`Generated: ${timestamp}`, 10);
    addText(`Time Range: ${range}`, 10);
    yPosition += 5;
    
    // KPIs Section
    addText('Key Performance Indicators', 12, true);
    kpis.forEach(k => {
      addText(
        `${k.label}: ${k.value} (${k.change} ${k.dir === 'up' ? '↗' : '↘'})`,
        9
      );
    });
    yPosition += 5;
    
    // User Growth Section
    addText('User Growth', 12, true);
    addText('Date | Users | Previous Period', 9, true);
    dynamicUserGrowthData.forEach(d => {
      addText(`${d.date} | ${d.users} | ${d.previousPeriod}`, 8);
    });
    yPosition += 5;
    
    // Orders Section
    addText('Order Volume & Revenue', 12, true);
    addText('Month | Orders | Revenue (L)', 9, true);
    dynamicOrderVolumeData.forEach(o => {
      addText(`${o.month} | ${o.orders} | ${o.revenue}`, 8);
    });
    yPosition += 5;
    
    // Categories Section
    addText('Revenue by Category', 12, true);
    addText('Category | Share %', 9, true);
    categoryData.forEach(c => {
      addText(`${c.name} | ${c.value}%`, 8);
    });
    yPosition += 5;
    
    // Farmers Section
    addText('Top Farmers by Revenue', 12, true);
    addText('Farmer | Location | Revenue | Orders | Rating', 9, true);
    topFarmers.forEach(f => {
      addText(
        `${f.name} | ${f.location} | ${f.revenue} | ${f.orders} | ⭐${f.rating}`,
        8
      );
    });
    yPosition += 5;
    
    // Drivers Section
    addText('Top Drivers by Deliveries', 12, true);
    addText('Driver | Location | Deliveries | OnTime % | Rating', 9, true);
    topDrivers.forEach(d => {
      addText(
        `${d.name} | ${d.location} | ${d.deliveries} | ${d.onTime}% | ⭐${d.rating}`,
        8
      );
    });
    
    // Save
    pdf.save(filename);
  };

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    const timestamp = new Date().toISOString().split('T')[0];
    
    switch (format) {
      case 'csv':
        exportToCSV(`analytics-report-${timestamp}.csv`);
        break;
      case 'excel':
        exportToExcel(`analytics-report-${timestamp}.xlsx`);
        break;
      case 'pdf':
        exportToPDF(`analytics-report-${timestamp}.pdf`);
        break;
    }
    
    setShowExport(false);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="ga-custom-tooltip">
          <p className="ga-custom-tooltip__label">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="ga-custom-tooltip__value" style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="global-analytics">
      {/* Header */}
      <div className="ga-header">
        <div className="ga-header__left">
          <h1 className="ga-header__title">Global Analytics</h1>
          <div className="ga-header__meta">
            <span className="ga-header__time">
              Last updated: {formatTime(lastUpdated)}
            </span>
            <button
              className={`ga-header__refresh ${autoRefresh ? 'ga-header__refresh--active' : ''}`}
              onClick={() => setAutoRefresh(!autoRefresh)}
              title={autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
            >
              {autoRefresh ? '🔄' : '⏸️'}
            </button>
          </div>
        </div>

        <div className="ga-header__controls">
          {/* View Mode Toggle */}
          <div className="ga-view-toggle">
            <button
              className={`ga-view-toggle__btn ${viewMode === 'overview' ? 'ga-view-toggle__btn--active' : ''}`}
              onClick={() => setViewMode('overview')}
            >
              <span>📊</span> Overview
            </button>
            <button
              className={`ga-view-toggle__btn ${viewMode === 'detailed' ? 'ga-view-toggle__btn--active' : ''}`}
              onClick={() => setViewMode('detailed')}
            >
              <span>📈</span> Detailed
            </button>
          </div>

          {/* Date Range */}
          <div className="ga-date-range">
            {ranges.map((r) => (
              <button
                key={r.key}
                className={`ga-range-btn ${range === r.key ? 'ga-range-btn--active' : ''}`}
                onClick={() => setRange(r.key)}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Export Dropdown */}
          <div className="ga-export-wrapper">
            <button
              className="ga-export-btn"
              onClick={() => setShowExport(!showExport)}
            >
              📥 Export
            </button>
            {showExport && (
              <div className="ga-export-menu">
                <button onClick={() => handleExport('csv')}>
                  <span>📄</span> Export as CSV
                </button>
                <button onClick={() => handleExport('excel')}>
                  <span>📊</span> Export as Excel
                </button>
                <button onClick={() => handleExport('pdf')}>
                  <span>📕</span> Export as PDF
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="ga-kpis">
        {kpis.map((kpi, index) => (
          <div
            key={kpi.label}
            className={`ga-kpi ${selectedKPI === kpi.label ? 'ga-kpi--selected' : ''} ${hoveredKPI === kpi.label ? 'ga-kpi--hovered' : ''}`}
            onClick={() => setSelectedKPI(selectedKPI === kpi.label ? null : kpi.label)}
            onMouseEnter={() => setHoveredKPI(kpi.label)}
            onMouseLeave={() => setHoveredKPI(null)}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="ga-kpi__header">
              <div className="ga-kpi__icon" style={{ background: `${kpi.color}20`, color: kpi.color }}>
                {kpi.icon}
              </div>
              <span className={`ga-kpi__change ga-kpi__change--${kpi.dir}`}>
                {kpi.dir === 'up' ? '↗' : '↘'} {kpi.change}
              </span>
            </div>
            <div className="ga-kpi__value">{kpi.value}</div>
            <div className="ga-kpi__label">{kpi.label}</div>
            
            {/* Progress to Target */}
            {kpi.target && (
              <div className="ga-kpi__progress">
                <div className="ga-kpi__progress-bar">
                  <div
                    className="ga-kpi__progress-fill"
                    style={{
                      width: `${(kpi.rawValue / kpi.target) * 100}%`,
                      background: kpi.color,
                    }}
                  />
                </div>
                <span className="ga-kpi__progress-text">
                  {Math.round((kpi.rawValue / kpi.target) * 100)}% of target
                </span>
              </div>
            )}

            {/* Mini Sparkline */}
            <div className="ga-kpi__sparkline">
              <svg width="100%" height="30" viewBox="0 0 100 30">
                <polyline
                  points="0,25 20,20 40,22 60,15 80,18 100,10"
                  fill="none"
                  stroke={kpi.color}
                  strokeWidth="2"
                  opacity="0.6"
                />
              </svg>
            </div>
          </div>
        ))}
      </div>

      {/* Chart Controls */}
      <div className="ga-chart-controls">
        <div className="ga-chart-controls__left">
          <button
            className={`ga-chart-control ${isComparing ? 'ga-chart-control--active' : ''}`}
            onClick={() => setIsComparing(!isComparing)}
          >
            <span>⚖️</span> Compare Periods
          </button>
          <button
            className={`ga-chart-control ${animateCharts ? 'ga-chart-control--active' : ''}`}
            onClick={() => setAnimateCharts(!animateCharts)}
          >
            <span>✨</span> Animations
          </button>
        </div>
        <div className="ga-chart-type-selector">
          <button
            className={`ga-chart-type ${chartType === 'line' ? 'ga-chart-type--active' : ''}`}
            onClick={() => setChartType('line')}
            title="Line Chart"
          >
            📈
          </button>
          <button
            className={`ga-chart-type ${chartType === 'bar' ? 'ga-chart-type--active' : ''}`}
            onClick={() => setChartType('bar')}
            title="Bar Chart"
          >
            📊
          </button>
          <button
            className={`ga-chart-type ${chartType === 'area' ? 'ga-chart-type--active' : ''}`}
            onClick={() => setChartType('area')}
            title="Area Chart"
          >
            📉
          </button>
        </div>
      </div>

      {/* Charts Grid */}
      <div className={`ga-charts ${viewMode === 'detailed' ? 'ga-charts--detailed' : ''}`}>
        {/* User Growth Chart */}
        <div className="ga-chart ga-chart--primary">
          <div className="ga-chart__header">
            <h3 className="ga-chart__title">
              <span className="ga-chart__icon">👥</span>
              User Growth
            </h3>
            <button className="ga-chart__fullscreen" title="View Fullscreen">
              ⛶
            </button>
          </div>
          <div className="ga-chart__body">
            <ResponsiveContainer width="100%" height={300}>
              {chartType === 'area' ? (
                <AreaChart data={dynamicUserGrowthData}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="users"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorUsers)"
                    animationDuration={animateCharts ? 1000 : 0}
                  />
                  {isComparing && (
                    <Area
                      type="monotone"
                      dataKey="previousPeriod"
                      stroke="#9ca3af"
                      strokeDasharray="5 5"
                      fillOpacity={0}
                      animationDuration={animateCharts ? 1000 : 0}
                    />
                  )}
                </AreaChart>
              ) : chartType === 'line' ? (
                <LineChart data={dynamicUserGrowthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="users"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ fill: '#3b82f6', r: 4 }}
                    animationDuration={animateCharts ? 1000 : 0}
                  />
                  {isComparing && (
                    <Line
                      type="monotone"
                      dataKey="previousPeriod"
                      stroke="#9ca3af"
                      strokeDasharray="5 5"
                      strokeWidth={2}
                      animationDuration={animateCharts ? 1000 : 0}
                    />
                  )}
                </LineChart>
              ) : (
                <BarChart data={dynamicUserGrowthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="users" fill="#3b82f6" radius={[8, 8, 0, 0]} animationDuration={animateCharts ? 1000 : 0} />
                  {isComparing && (
                    <Bar dataKey="previousPeriod" fill="#9ca3af" radius={[8, 8, 0, 0]} animationDuration={animateCharts ? 1000 : 0} />
                  )}
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Order Volume Chart */}
        <div className="ga-chart">
          <div className="ga-chart__header">
            <h3 className="ga-chart__title">
              <span className="ga-chart__icon">📦</span>
              Order Volume & Revenue
            </h3>
            <button className="ga-chart__fullscreen" title="View Fullscreen">
              ⛶
            </button>
          </div>
          <div className="ga-chart__body">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dynamicOrderVolumeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#6b7280" />
                <YAxis yAxisId="left" stroke="#6b7280" />
                <YAxis yAxisId="right" orientation="right" stroke="#6b7280" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar
                  yAxisId="left"
                  dataKey="orders"
                  fill="#10b981"
                  radius={[8, 8, 0, 0]}
                  animationDuration={animateCharts ? 1000 : 0}
                />
                <Bar
                  yAxisId="right"
                  dataKey="revenue"
                  fill="#f59e0b"
                  radius={[8, 8, 0, 0]}
                  animationDuration={animateCharts ? 1000 : 0}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Distribution */}
        <div className="ga-chart">
          <div className="ga-chart__header">
            <h3 className="ga-chart__title">
              <span className="ga-chart__icon">🥬</span>
              Revenue by Category
            </h3>
            <button className="ga-chart__fullscreen" title="View Fullscreen">
              ⛶
            </button>
          </div>
          <div className="ga-chart__body">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  animationDuration={animateCharts ? 1000 : 0}
                  label={(props: any) => `${props.name || ''} ${(props.percent ? (props.percent * 100).toFixed(0) : '0')}%`}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Delivery Performance */}
        <div className="ga-chart">
          <div className="ga-chart__header">
            <h3 className="ga-chart__title">
              <span className="ga-chart__icon">🚛</span>
              Delivery Performance
            </h3>
            <button className="ga-chart__fullscreen" title="View Fullscreen">
              ⛶
            </button>
          </div>
          <div className="ga-chart__body">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dynamicDeliveryPerformanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="week" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar
                  dataKey="onTime"
                  stackId="a"
                  fill="#10b981"
                  radius={[8, 8, 0, 0]}
                  animationDuration={animateCharts ? 1000 : 0}
                />
                <Bar
                  dataKey="delayed"
                  stackId="a"
                  fill="#ef4444"
                  radius={[8, 8, 0, 0]}
                  animationDuration={animateCharts ? 1000 : 0}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tables */}
      <div className="ga-tables">
        {/* Top Farmers */}
        <div className="ga-table">
          <div className="ga-table__header">
            <h3 className="ga-table__title">
              <span className="ga-table__icon">🌾</span>
              Top Farmers by Revenue
            </h3>
            <button className="ga-table__export">Export ↓</button>
          </div>
          <div className="ga-table__body">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Farmer</th>
                  <th>Location</th>
                  <th>Revenue</th>
                  <th>Orders</th>
                  <th>Rating</th>
                  <th>Trend</th>
                </tr>
              </thead>
              <tbody>
                {topFarmers.map((farmer) => (
                  <tr key={farmer.rank} className="ga-table__row">
                    <td>
                      <span className={`ga-table__rank ga-table__rank--${farmer.rank}`}>
                        {farmer.rank}
                      </span>
                    </td>
                    <td className="ga-table__name">{farmer.name}</td>
                    <td>
                      <span className="ga-table__location">📍 {farmer.location}</span>
                    </td>
                    <td className="ga-table__revenue">{farmer.revenue}</td>
                    <td className="ga-table__orders">{farmer.orders}</td>
                    <td>
                      <div className="ga-table__rating">
                        <span>⭐</span>
                        <span>{farmer.rating}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`ga-table__trend ga-table__trend--${farmer.trend}`}>
                        {farmer.trend === 'up' ? '↗' : farmer.trend === 'down' ? '↘' : '→'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Drivers */}
        <div className="ga-table">
          <div className="ga-table__header">
            <h3 className="ga-table__title">
              <span className="ga-table__icon">🚗</span>
              Top Drivers by Deliveries
            </h3>
            <button className="ga-table__export">Export ↓</button>
          </div>
          <div className="ga-table__body">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Driver</th>
                  <th>Location</th>
                  <th>Deliveries</th>
                  <th>On-Time %</th>
                  <th>Rating</th>
                </tr>
              </thead>
              <tbody>
                {topDrivers.map((driver) => (
                  <tr key={driver.rank} className="ga-table__row">
                    <td>
                      <span className={`ga-table__rank ga-table__rank--${driver.rank}`}>
                        {driver.rank}
                      </span>
                    </td>
                    <td className="ga-table__name">{driver.name}</td>
                    <td>
                      <span className="ga-table__location">📍 {driver.location}</span>
                    </td>
                    <td className="ga-table__deliveries">{driver.deliveries}</td>
                    <td>
                      <div className="ga-table__on-time">
                        <div className="ga-table__on-time-bar">
                          <div
                            className="ga-table__on-time-fill"
                            style={{ width: `${driver.onTime}%` }}
                          />
                        </div>
                        <span>{driver.onTime}%</span>
                      </div>
                    </td>
                    <td>
                      <div className="ga-table__rating">
                        <span>⭐</span>
                        <span>{driver.rating}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalAnalytics;