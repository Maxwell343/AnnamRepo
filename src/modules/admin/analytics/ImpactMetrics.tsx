import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  UtensilsCrossed,
  Users,
  Globe,
  Handshake,
  Trophy,
  Target,
  Sprout,
  Truck,
  Award,
  ChefHat,
  HeartHandshake,
  Leaf,
  Building2,
  Wheat,
  Share2,
  Download,
  FileText,
  BarChart3,
  ClipboardList,
  TrendingUp,
  Scale,
  Sparkles,
  PartyPopper,
  Maximize,
  CheckCircle,
  RefreshCw,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  ArrowUp,
  Home,
} from 'lucide-react';
import './ImpactMetrics.css';

interface HeroMetric {
  icon: React.ReactNode;
  value: string;
  label: string;
  sub: string;
  color: string;
  trend: number;
  animatedValue: number;
}

interface Milestone {
  icon: React.ReactNode;
  name: string;
  desc: string;
  pct: number;
  status: 'achieved' | 'in-progress';
  target: number;
  current: number;
  date?: string;
}

interface NGO {
  rank: number;
  name: string;
  food: string;
  meals: string;
  communities: number;
  score: number;
  logo: React.ReactNode;
  trend: 'up' | 'down' | 'stable';
  growth: number;
}

const ImpactMetrics: React.FC = () => {
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'month' | 'quarter' | 'year'>('month');
  const [showCelebration, setShowCelebration] = useState(false);
  const [selectedNGO, setSelectedNGO] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'achieved' | 'in-progress'>('all');
  const [chartView, setChartView] = useState<'area' | 'bar'>('area');
  const [showComparison, setShowComparison] = useState(false);
  const [showDownloadDropdown, setShowDownloadDropdown] = useState(false);
  const [showAllNGOs, setShowAllNGOs] = useState(false);

  const heroMetrics: HeroMetric[] = [
    {
      icon: <UtensilsCrossed size={16} />,
      value: '45,200',
      label: 'Food Rescued',
      sub: 'Equivalent to 90,400 meals',
      color: '#10b981',
      trend: 15,
      animatedValue: 0,
    },
    {
      icon: <Users size={16} />,
      value: '12,800',
      label: 'People Fed',
      sub: 'Across 45 communities',
      color: '#3b82f6',
      trend: 22,
      animatedValue: 0,
    },
    {
      icon: <Globe size={16} />,
      value: '28.4',
      label: 'CO₂ Prevented (T)',
      sub: 'Equivalent to 62 trees planted',
      color: '#059669',
      trend: 18,
      animatedValue: 0,
    },
    {
      icon: <Handshake size={16} />,
      value: '38',
      label: 'NGO Partners',
      sub: 'Active in 12 cities',
      color: '#8b5cf6',
      trend: 8,
      animatedValue: 0,
    },
  ];

  const [metrics, setMetrics] = useState(heroMetrics);

  // Animate numbers on mount
  useEffect(() => {
      const duration = 2000;
      const steps = 60;
      const interval = duration / steps;

      metrics.forEach((metric, index) => {
        const target = parseFloat(metric.value.replace(',', ''));
        const increment = target / steps;
        let current = 0;
        let step = 0;

        const timer = setInterval(() => {
          step++;
          current = Math.min(current + increment, target);

          setMetrics((prev) =>
            prev.map((m, i) =>
              i === index ? { ...m, animatedValue: current } : m
            )
          );

          if (step >= steps) clearInterval(timer);
        }, interval);
      });
  }, []);

  const foodRescuedData = [
    { month: 'Jan', rescued: 3200, target: 3500, previous: 2800 },
    { month: 'Feb', rescued: 3800, target: 3500, previous: 3100 },
    { month: 'Mar', rescued: 4200, target: 4000, previous: 3600 },
    { month: 'Apr', rescued: 4600, target: 4000, previous: 3900 },
    { month: 'May', rescued: 5100, target: 4500, previous: 4200 },
    { month: 'Jun', rescued: 5400, target: 4500, previous: 4800 },
  ];

  const mealsDistributionData = [
    { name: 'Hope NGO', value: 32, color: '#3b82f6' },
    { name: 'Annapurna', value: 25, color: '#10b981' },
    { name: 'City Food Bank', value: 18, color: '#f59e0b' },
    { name: 'Helping Hands', value: 15, color: '#8b5cf6' },
    { name: 'Others', value: 10, color: '#6b7280' },
  ];

  const milestones: Milestone[] = [
    {
      icon: <Trophy size={16} />,
      name: '50,000 kg Food Rescued',
      desc: 'Target: 50,000 kg',
      pct: 90,
      status: 'in-progress',
      target: 50000,
      current: 45200,
    },
    {
      icon: <Target size={16} />,
      name: '10,000 People Fed',
      desc: 'Reached on Dec 15, 2024',
      pct: 100,
      status: 'achieved',
      target: 10000,
      current: 12800,
      date: 'Dec 15, 2024',
    },
    {
      icon: <Sprout size={16} />,
      name: '25 Tons CO₂ Prevented',
      desc: 'Current: 28.4T — exceeded target!',
      pct: 100,
      status: 'achieved',
      target: 25,
      current: 28.4,
      date: 'Nov 28, 2024',
    },
    {
      icon: <Handshake size={16} />,
      name: '50 NGO Partners',
      desc: 'Target: 50 active NGOs',
      pct: 76,
      status: 'in-progress',
      target: 50,
      current: 38,
    },
    {
      icon: <Truck size={16} />,
      name: '1,000 Deliveries in a Month',
      desc: 'Best month: 892 deliveries',
      pct: 89,
      status: 'in-progress',
      target: 1000,
      current: 892,
    },
  ];

  const ngos: NGO[] = [
    {
      rank: 1,
      name: 'Hope NGO',
      food: '8,200 kg',
      meals: '16,400',
      communities: 8,
      score: 98,
      logo: <Trophy size={16} />,
      trend: 'up',
      growth: 12,
    },
    {
      rank: 2,
      name: 'Annapurna Shelter',
      food: '6,800 kg',
      meals: '13,600',
      communities: 6,
      score: 94,
      logo: <Award size={16} />,
      trend: 'up',
      growth: 8,
    },
    {
      rank: 3,
      name: 'City Food Bank',
      food: '5,400 kg',
      meals: '10,800',
      communities: 5,
      score: 89,
      logo: <Award size={16} />,
      trend: 'stable',
      growth: 0,
    },
    {
      rank: 4,
      name: 'Helping Hands',
      food: '4,200 kg',
      meals: '8,400',
      communities: 4,
      score: 82,
      logo: <Handshake size={16} />,
      trend: 'up',
      growth: 15,
    },
    {
      rank: 5,
      name: 'Community Kitchen',
      food: '3,100 kg',
      meals: '6,200',
      communities: 3,
      score: 76,
      logo: <UtensilsCrossed size={16} />,
      trend: 'down',
      growth: -3,
    },
    {
      rank: 6,
      name: 'Meal Makers Foundation',
      food: '2,850 kg',
      meals: '5,700',
      communities: 2,
      score: 71,
      logo: <ChefHat size={16} />,
      trend: 'up',
      growth: 5,
    },
    {
      rank: 7,
      name: 'Social Serve',
      food: '2,450 kg',
      meals: '4,900',
      communities: 2,
      score: 68,
      logo: <HeartHandshake size={16} />,
      trend: 'up',
      growth: 10,
    },
    {
      rank: 8,
      name: 'Green Earth Initiative',
      food: '2,000 kg',
      meals: '4,000',
      communities: 1,
      score: 64,
      logo: <Leaf size={16} />,
      trend: 'stable',
      growth: 0,
    },
    {
      rank: 9,
      name: 'Urban Hunger Relief',
      food: '1,750 kg',
      meals: '3,500',
      communities: 1,
      score: 60,
      logo: <Building2 size={16} />,
      trend: 'down',
      growth: -2,
    },
    {
      rank: 10,
      name: 'Rural Development Corp',
      food: '1,450 kg',
      meals: '2,900',
      communities: 1,
      score: 55,
      logo: <Wheat size={16} />,
      trend: 'up',
      growth: 8,
    },
  ];

  const filteredMilestones = milestones.filter((m) =>
    filterStatus === 'all' ? true : m.status === filterStatus
  );

  const displayedNGOs = showAllNGOs ? ngos : ngos.slice(0, 5);

  const exportToCSV = () => {
    const timestamp = new Date().toLocaleDateString('en-IN');
    const csvContent = [
      ['IMPACT METRICS REPORT'],
      ['Generated:', new Date().toLocaleString('en-IN')],
      [''],
      ['HERO METRICS'],
      ['Metric', 'Value', 'Trend (%)'],
      ...metrics.map((m) => [m.label, m.value, `+${m.trend}%`]),
      [''],
      ['IMPACT MILESTONES'],
      ['Milestone', 'Status', 'Current', 'Target', 'Progress (%)'],
      ...milestones.map((m) => [
        m.name,
        m.status.toUpperCase(),
        formatNumber(m.current),
        formatNumber(m.target),
        `${m.pct}%`,
      ]),
      [''],
      ['NGO LEADERBOARD'],
      ['Rank', 'NGO Name', 'Food Received', 'Meals Served', 'Communities', 'Score', 'Growth'],
      ...ngos.map((n) => [
        n.rank,
        n.name,
        n.food,
        n.meals,
        n.communities,
        n.score,
        `${n.growth > 0 ? '+' : ''}${n.growth}%`,
      ]),
      [''],
      ['MONTHLY DATA'],
      ['Month', 'Rescued (kg)', 'Target (kg)'],
      ...foodRescuedData.map((d) => [d.month, d.rescued, d.target]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `impact-report-${timestamp}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToExcel = () => {
    const timestamp = new Date().toLocaleDateString('en-IN');
    const wb = XLSX.utils.book_new();

    // Hero Metrics Sheet
    const heroData = metrics.map((m) => ({
      Metric: m.label,
      Value: m.value,
      'Trend (%)': `+${m.trend}%`,
      Sub: m.sub,
    }));
    const heroSheet = XLSX.utils.json_to_sheet(heroData);
    XLSX.utils.book_append_sheet(wb, heroSheet, 'Hero Metrics');

    // Milestones Sheet
    const milestonesData = milestones.map((m) => ({
      Milestone: m.name,
      Status: m.status.toUpperCase(),
      Current: formatNumber(m.current),
      Target: formatNumber(m.target),
      'Progress (%)': `${m.pct}%`,
      Description: m.desc,
    }));
    const milestonesSheet = XLSX.utils.json_to_sheet(milestonesData);
    XLSX.utils.book_append_sheet(wb, milestonesSheet, 'Milestones');

    // NGO Leaderboard Sheet
    const ngosData = ngos.map((n) => ({
      Rank: n.rank,
      'NGO Name': n.name,
      'Food Received': n.food,
      'Meals Served': n.meals,
      Communities: n.communities,
      Score: n.score,
      'Growth (%)': `${n.growth > 0 ? '+' : ''}${n.growth}%`,
    }));
    const ngosSheet = XLSX.utils.json_to_sheet(ngosData);
    XLSX.utils.book_append_sheet(wb, ngosSheet, 'NGO Leaderboard');

    // Monthly Data Sheet
    const monthlyDataSheet = XLSX.utils.json_to_sheet(foodRescuedData);
    XLSX.utils.book_append_sheet(wb, monthlyDataSheet, 'Monthly Data');

    XLSX.writeFile(wb, `impact-report-${timestamp}.xlsx`);
  };

  const exportToPDF = () => {
    const timestamp = new Date().toLocaleDateString('en-IN');
    const doc = new jsPDF();
    let yPosition = 10;

    // Title
    doc.setFontSize(18);
    doc.text('IMPACT METRICS REPORT', 10, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 10, yPosition);
    yPosition += 8;

    // Hero Metrics
    doc.setFontSize(14);
    doc.text('Hero Metrics', 10, yPosition);
    yPosition += 8;

    doc.setFontSize(9);
    const heroRows = metrics.map((m) => [m.label, m.value, `+${m.trend}%`]);
    (doc as any).autoTable({
      startY: yPosition,
      head: [['Metric', 'Value', 'Trend (%)']],
      body: heroRows,
      margin: { left: 10, right: 10 },
    });
    yPosition = (doc as any).lastAutoTable.finalY + 10;

    // Milestones
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 10;
    }
    doc.setFontSize(14);
    doc.text('Impact Milestones', 10, yPosition);
    yPosition += 8;

    doc.setFontSize(9);
    const milestonesRows = milestones.map((m) => [
      m.name,
      m.status.toUpperCase(),
      formatNumber(m.current),
      formatNumber(m.target),
      `${m.pct}%`,
    ]);
    (doc as any).autoTable({
      startY: yPosition,
      head: [['Milestone', 'Status', 'Current', 'Target', 'Progress (%)']],
      body: milestonesRows,
      margin: { left: 10, right: 10 },
    });
    yPosition = (doc as any).lastAutoTable.finalY + 10;

    // NGO Leaderboard
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 10;
    }
    doc.setFontSize(14);
    doc.text('NGO Impact Leaderboard', 10, yPosition);
    yPosition += 8;

    doc.setFontSize(9);
    const ngosRows = ngos.map((n) => [
      n.rank.toString(),
      n.name,
      n.food,
      n.meals,
      n.communities.toString(),
      n.score.toString(),
      `${n.growth > 0 ? '+' : ''}${n.growth}%`,
    ]);
    (doc as any).autoTable({
      startY: yPosition,
      head: [['Rank', 'NGO Name', 'Food Received', 'Meals Served', 'Communities', 'Score', 'Growth (%)']],
      body: ngosRows,
      margin: { left: 10, right: 10 },
    });

    doc.save(`impact-report-${timestamp}.pdf`);
  };

  const handleDownloadReport = () => {
    setShowDownloadDropdown(!showDownloadDropdown);
  };

  const handleDownloadFormat = (format: 'csv' | 'excel' | 'pdf') => {
    if (format === 'csv') {
      exportToCSV();
    } else if (format === 'excel') {
      exportToExcel();
    } else if (format === 'pdf') {
      exportToPDF();
    }
    setShowDownloadDropdown(false);
  };

  const handleShareImpact = () => {
    const reportSummary = `
IMPACT METRICS SUMMARY

Food Rescued: ${metrics[0].value} kg
People Fed: ${metrics[1].value}
CO₂ Prevented: ${metrics[2].value} T
NGO Partners: ${metrics[3].value}

Key Achievements:
Milestones Achieved: ${milestones.filter((m) => m.status === 'achieved').length}/${milestones.length}
Top NGO Partner: ${ngos[0].name} (${ngos[0].food})

Generated: ${new Date().toLocaleString('en-IN')}
    `.trim();

    if (navigator.share) {
      navigator.share({
        title: 'Impact Metrics Report',
        text: reportSummary,
      });
    } else {
      // Fallback: Copy to clipboard
      navigator.clipboard.writeText(reportSummary).then(() => {
        alert('Impact summary copied to clipboard!');
      }).catch(() => {
        alert('Impact Summary:\n\n' + reportSummary);
      });
    }
  };

  const celebrateAchievement = (milestone: Milestone) => {
    if (milestone.status === 'achieved') {
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 3000);
    }
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString('en-IN', { maximumFractionDigits: 1 });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="im-custom-tooltip">
          <p className="im-custom-tooltip__label">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="im-custom-tooltip__value" style={{ color: entry.color }}>
              {entry.name}: {entry.value} kg
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="impact-metrics">
      {/* Celebration Animation */}
      {showCelebration && (
        <div className="im-celebration">
          <div className="im-celebration__content">
            <PartyPopper size={16} /> <Sparkles size={16} /> Achievement Unlocked! <Sparkles size={16} /> <PartyPopper size={16} />
          </div>
        </div>
      )}

      {/* Header */}
      <div className="im-header">
        <div className="im-header__left">
          <h1 className="im-header__title">Impact Metrics</h1>
          <p className="im-header__subtitle">
            Making a difference, one meal at a time
          </p>
        </div>
        <div className="im-header__actions">
          <button
            className="im-btn im-btn--secondary"
            onClick={handleShareImpact}
          >
            <Share2 size={16} /> Share Impact
          </button>
          <div className="im-download-dropdown">
            <button
              className="im-btn im-btn--primary"
              onClick={handleDownloadReport}
            >
              <Download size={16} /> Download Report
            </button>
            {showDownloadDropdown && (
              <div className="im-dropdown-menu">
                <button
                  className="im-dropdown-item"
                  onClick={() => handleDownloadFormat('pdf')}
                >
                  <FileText size={16} /> PDF
                </button>
                <button
                  className="im-dropdown-item"
                  onClick={() => handleDownloadFormat('excel')}
                >
                  <BarChart3 size={16} /> Excel
                </button>
                <button
                  className="im-dropdown-item"
                  onClick={() => handleDownloadFormat('csv')}
                >
                  <ClipboardList size={16} /> CSV
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hero Metrics */}
      <div className="im-hero">
        {metrics.map((metric, index) => (
          <div
            key={metric.label}
            className={`im-hero-card ${selectedMetric === metric.label ? 'im-hero-card--selected' : ''}`}
            onClick={() =>
              setSelectedMetric(
                selectedMetric === metric.label ? null : metric.label
              )
            }
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div
              className="im-hero-card__icon"
              style={{ background: `${metric.color}20`, color: metric.color }}
            >
              {metric.icon}
            </div>
            <div className="im-hero-card__content">
              <div className="im-hero-card__value">
                {formatNumber(metric.animatedValue)}
                {metric.label.includes('kg') && ' kg'}
              </div>
              <div className="im-hero-card__label">{metric.label}</div>
              <div className="im-hero-card__sub">{metric.sub}</div>
            </div>
            <div className="im-hero-card__trend">
              <span className="im-hero-card__trend-icon"><ArrowUpRight size={14} /></span>
              <span className="im-hero-card__trend-value">+{metric.trend}%</span>
            </div>
            {/* Progress Ring */}
            <svg className="im-hero-card__ring" viewBox="0 0 36 36">
              <path
                className="im-hero-card__ring-bg"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="im-hero-card__ring-progress"
                stroke={metric.color}
                strokeDasharray={`${metric.trend}, 100`}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
          </div>
        ))}
      </div>

      {/* Time Range Selector */}
      <div className="im-controls">
        <div className="im-time-range">
          {(['month', 'quarter', 'year'] as const).map((range) => (
            <button
              key={range}
              className={`im-time-btn ${timeRange === range ? 'im-time-btn--active' : ''}`}
              onClick={() => setTimeRange(range)}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
        <div className="im-controls__right">
          <button
            className={`im-control-btn ${showComparison ? 'im-control-btn--active' : ''}`}
            onClick={() => setShowComparison(!showComparison)}
          >
            <Scale size={16} /> Compare
          </button>
          <div className="im-chart-toggle">
            <button
              className={`im-chart-toggle-btn ${chartView === 'area' ? 'im-chart-toggle-btn--active' : ''}`}
              onClick={() => setChartView('area')}
            >
              <TrendingUp size={16} />
            </button>
            <button
              className={`im-chart-toggle-btn ${chartView === 'bar' ? 'im-chart-toggle-btn--active' : ''}`}
              onClick={() => setChartView('bar')}
            >
              <BarChart3 size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="im-charts">
        <div className="im-chart im-chart--primary">
          <div className="im-chart__header">
            <div>
              <h3 className="im-chart__title">
                <span className="im-chart__icon"><TrendingUp size={16} /></span>
                Food Rescued Over Time
              </h3>
              <p className="im-chart__subtitle">Monthly progress tracking</p>
            </div>
            <button className="im-chart__fullscreen"><Maximize size={16} /></button>
          </div>
          <div className="im-chart__body">
            <ResponsiveContainer width="100%" height={350}>
              {chartView === 'area' ? (
                <AreaChart data={foodRescuedData}>
                  <defs>
                    <linearGradient id="colorRescued" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorTarget" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="rescued"
                    stroke="#10b981"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorRescued)"
                  />
                  <Area
                    type="monotone"
                    dataKey="target"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    fillOpacity={1}
                    fill="url(#colorTarget)"
                  />
                  {showComparison && (
                    <Area
                      type="monotone"
                      dataKey="previous"
                      stroke="#9ca3af"
                      strokeWidth={2}
                      strokeDasharray="3 3"
                      fillOpacity={0}
                    />
                  )}
                </AreaChart>
              ) : (
                <BarChart data={foodRescuedData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="rescued" fill="#10b981" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="target" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                  {showComparison && (
                    <Bar dataKey="previous" fill="#9ca3af" radius={[8, 8, 0, 0]} />
                  )}
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        <div className="im-chart">
          <div className="im-chart__header">
            <div>
              <h3 className="im-chart__title">
                <span className="im-chart__icon"><UtensilsCrossed size={16} /></span>
                Meals Served Distribution
              </h3>
              <p className="im-chart__subtitle">By NGO partner</p>
            </div>
            <button className="im-chart__fullscreen"><Maximize size={16} /></button>
          </div>
          <div className="im-chart__body">
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={mealsDistributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }: { name?: string; percent?: number }) =>
                    `${name || ''} ${(percent ? (percent * 100).toFixed(0) : '0')}%`
                  }
                  outerRadius={100}
                  innerRadius={60}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {mealsDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="im-chart__legend">
              {mealsDistributionData.map((item) => (
                <div key={item.name} className="im-chart__legend-item">
                  <span
                    className="im-chart__legend-color"
                    style={{ background: item.color }}
                  />
                  <span className="im-chart__legend-label">{item.name}</span>
                  <span className="im-chart__legend-value">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Milestones */}
      <div className="im-milestones">
        <div className="im-milestones__header">
          <div>
            <h2 className="im-milestones__title">
              <span className="im-milestones__icon"><Target size={16} /></span>
              Impact Milestones
            </h2>
            <p className="im-milestones__subtitle">
              {milestones.filter((m) => m.status === 'achieved').length} of{' '}
              {milestones.length} achieved
            </p>
          </div>
          <div className="im-milestone-filter">
            {(['all', 'achieved', 'in-progress'] as const).map((status) => (
              <button
                key={status}
                className={`im-filter-btn ${filterStatus === status ? 'im-filter-btn--active' : ''}`}
                onClick={() => setFilterStatus(status)}
              >
                {status === 'all'
                  ? 'All'
                  : status === 'achieved'
                  ? <><CheckCircle size={14} /> Achieved</>
                  : <><RefreshCw size={14} /> In Progress</>}
              </button>
            ))}
          </div>
        </div>

        <div className="im-milestones__grid">
          {filteredMilestones.map((milestone, index) => (
            <div
              key={milestone.name}
              className={`im-milestone im-milestone--${milestone.status}`}
              onClick={() => celebrateAchievement(milestone)}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="im-milestone__header">
                <div
                  className={`im-milestone__icon ${milestone.status === 'achieved' ? 'im-milestone__icon--achieved' : ''}`}
                >
                  {milestone.icon}
                </div>
                <span
                  className={`im-milestone__badge im-milestone__badge--${milestone.status}`}
                >
                  {milestone.status === 'achieved'
                    ? <><CheckCircle size={14} /> Achieved</>
                    : `${milestone.pct}%`}
                </span>
              </div>
              <div className="im-milestone__content">
                <h3 className="im-milestone__name">{milestone.name}</h3>
                <p className="im-milestone__desc">{milestone.desc}</p>
                {milestone.date && (
                  <span className="im-milestone__date"><Calendar size={14} /> {milestone.date}</span>
                )}
              </div>
              <div className="im-milestone__progress">
                <div className="im-milestone__progress-info">
                  <span className="im-milestone__current">
                    {formatNumber(milestone.current)}
                  </span>
                  <span className="im-milestone__target">
                    / {formatNumber(milestone.target)}
                  </span>
                </div>
                <div className="im-milestone__progress-bar">
                  <div
                    className="im-milestone__progress-fill"
                    style={{ width: `${milestone.pct}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* NGO Leaderboard */}
      <div className="im-leaderboard">
        <div className="im-leaderboard__header">
          <div>
            <h2 className="im-leaderboard__title">
              <span className="im-leaderboard__icon"><Trophy size={16} /></span>
              NGO Impact Leaderboard
            </h2>
            <p className="im-leaderboard__subtitle">
              Top performers this {timeRange}
            </p>
          </div>
          <button 
            className="im-btn im-btn--secondary"
            onClick={() => setShowAllNGOs(!showAllNGOs)}
          >
            {showAllNGOs ? <>View Top 5 <ArrowUp size={14} /></> : <>View All NGOs <ArrowRight size={14} /></>}
          </button>
        </div>

        <div className="im-leaderboard__table-wrapper">
          <table className="im-leaderboard__table">
            <thead>
              <tr>
                <th>#</th>
                <th>NGO</th>
                <th>Food Received</th>
                <th>Meals Served</th>
                <th>Communities</th>
                <th>Score</th>
                <th>Growth</th>
              </tr>
            </thead>
            <tbody>
              {displayedNGOs.map((ngo) => (
                <tr
                  key={ngo.rank}
                  className={`im-leaderboard__row ${selectedNGO === ngo.rank ? 'im-leaderboard__row--selected' : ''}`}
                  onClick={() =>
                    setSelectedNGO(selectedNGO === ngo.rank ? null : ngo.rank)
                  }
                >
                  <td>
                    <span className={`im-rank im-rank--${ngo.rank}`}>
                      {ngo.rank}
                    </span>
                  </td>
                  <td>
                    <div className="im-ngo">
                      <span className="im-ngo__logo">{ngo.logo}</span>
                      <span className="im-ngo__name">{ngo.name}</span>
                    </div>
                  </td>
                  <td className="im-food">{ngo.food}</td>
                  <td className="im-meals">{ngo.meals}</td>
                  <td>
                    <div className="im-communities">
                      <span className="im-communities__icon"><Home size={16} /></span>
                      <span>{ngo.communities}</span>
                    </div>
                  </td>
                  <td>
                    <div className="im-score">
                      <div className="im-score__bar">
                        <div
                          className="im-score__fill"
                          style={{
                            width: `${ngo.score}%`,
                            background:
                              ngo.score >= 90
                                ? '#10b981'
                                : ngo.score >= 80
                                ? '#f59e0b'
                                : '#6b7280',
                          }}
                        />
                      </div>
                      <span className="im-score__value">{ngo.score}</span>
                    </div>
                  </td>
                  <td>
                    <span
                      className={`im-growth im-growth--${ngo.trend}`}
                    >
                      {ngo.trend === 'up' ? <ArrowUpRight size={14} /> : ngo.trend === 'down' ? <ArrowDownRight size={14} /> : <ArrowRight size={14} />}{' '}
                      {Math.abs(ngo.growth)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ImpactMetrics;