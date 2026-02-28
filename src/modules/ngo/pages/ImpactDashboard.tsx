import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ImpactDashboard.css';
import type { ImpactMetrics, DistrictAnalytics } from '../../../types/marketplace';
import { ArrowLeft, Globe, BarChart3, TrendingUp, Map, ClipboardList, Leaf, UtensilsCrossed, Sprout, Droplet, User, Handshake, MapPin, CheckCircle, Trophy, Radio, AlertCircle, Banknote, Package, Settings, Link2, Wheat } from 'lucide-react';

// ============================================
// MOCK DATA
// ============================================

const mockImpactMetrics: ImpactMetrics = {
  foodSaved: 125000,
  mealsProvided: 416666,
  carbonSaved: 62500,
  waterSaved: 3750000,
  farmersSupported: 2456,
  ngosPartnered: 187,
  districtsServed: 342,
  transactionsCompleted: 15678,
  averageTimeSaved: 18
};

const mockDistrictData: DistrictAnalytics[] = [
  {
    districtName: 'Sonipat',
    state: 'Haryana',
    totalListings: 456,
    activeListings: 89,
    foodRescued: 12500,
    topProducts: [
      { name: 'Tomatoes', quantity: 3200 },
      { name: 'Wheat', quantity: 2800 },
      { name: 'Potatoes', quantity: 2100 }
    ],
    topFarmers: [
      { id: '1', name: 'Ramesh Kumar', score: 94 },
      { id: '2', name: 'Sunita Devi', score: 88 }
    ],
    ngoActivity: 23,
    wastePreventionRate: 87
  },
  {
    districtName: 'Gurugram',
    state: 'Haryana',
    totalListings: 678,
    activeListings: 134,
    foodRescued: 18200,
    topProducts: [
      { name: 'Leafy Greens', quantity: 4100 },
      { name: 'Dairy', quantity: 3200 },
      { name: 'Fruits', quantity: 2900 }
    ],
    topFarmers: [
      { id: '3', name: 'Vikram Singh', score: 96 },
      { id: '4', name: 'Priya Sharma', score: 93 }
    ],
    ngoActivity: 31,
    wastePreventionRate: 92
  },
  {
    districtName: 'Lucknow',
    state: 'Uttar Pradesh',
    totalListings: 534,
    activeListings: 98,
    foodRescued: 15800,
    topProducts: [
      { name: 'Rice', quantity: 5200 },
      { name: 'Vegetables', quantity: 4100 },
      { name: 'Pulses', quantity: 2800 }
    ],
    topFarmers: [
      { id: '5', name: 'Lakshmi Bai', score: 82 },
      { id: '6', name: 'Rajesh Yadav', score: 79 }
    ],
    ngoActivity: 27,
    wastePreventionRate: 85
  },
  {
    districtName: 'Jaipur',
    state: 'Rajasthan',
    totalListings: 412,
    activeListings: 76,
    foodRescued: 11200,
    topProducts: [
      { name: 'Spices', quantity: 3800 },
      { name: 'Pulses', quantity: 2900 },
      { name: 'Grains', quantity: 2400 }
    ],
    topFarmers: [
      { id: '7', name: 'Mohammed Ismail', score: 91 },
      { id: '8', name: 'Geeta Kumari', score: 85 }
    ],
    ngoActivity: 19,
    wastePreventionRate: 81
  },
  {
    districtName: 'Mohali',
    state: 'Punjab',
    totalListings: 389,
    activeListings: 67,
    foodRescued: 10500,
    topProducts: [
      { name: 'Wheat', quantity: 4200 },
      { name: 'Mangoes', quantity: 2800 },
      { name: 'Dairy', quantity: 1900 }
    ],
    topFarmers: [
      { id: '9', name: 'Harpreet Singh', score: 89 },
      { id: '10', name: 'Baldev Singh', score: 86 }
    ],
    ngoActivity: 15,
    wastePreventionRate: 88
  }
];

const mockTrendData = [
  { date: 'Jan', foodSaved: 8500, transactions: 1200, mealsProvided: 28333 },
  { date: 'Feb', foodSaved: 9200, transactions: 1350, mealsProvided: 30666 },
  { date: 'Mar', foodSaved: 10800, transactions: 1480, mealsProvided: 36000 },
  { date: 'Apr', foodSaved: 11500, transactions: 1620, mealsProvided: 38333 },
  { date: 'May', foodSaved: 12300, transactions: 1780, mealsProvided: 41000 },
  { date: 'Jun', foodSaved: 13200, transactions: 1920, mealsProvided: 44000 },
  { date: 'Jul', foodSaved: 14100, transactions: 2050, mealsProvided: 47000 },
  { date: 'Aug', foodSaved: 15500, transactions: 2180, mealsProvided: 51666 },
  { date: 'Sep', foodSaved: 16800, transactions: 2340, mealsProvided: 56000 },
  { date: 'Oct', foodSaved: 18200, transactions: 2480, mealsProvided: 60666 },
  { date: 'Nov', foodSaved: 19500, transactions: 2650, mealsProvided: 65000 },
  { date: 'Dec', foodSaved: 21000, transactions: 2800, mealsProvided: 70000 }
];

// ============================================
// UTILITY FUNCTIONS
// ============================================

const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toLocaleString();
};

const getStateColor = (state: string): string => {
  const colors: Record<string, string> = {
    'Haryana': '#4CAF50',
    'Punjab': '#FF9800',
    'Uttar Pradesh': '#2196F3',
    'Rajasthan': '#E91E63',
    'Delhi': '#9C27B0',
    'Maharashtra': '#00BCD4'
  };
  return colors[state] || '#607D8B';
};

// ============================================
// COMPONENTS
// ============================================

// Stat Card Component
const StatCard: React.FC<{
  icon: React.ReactNode;
  value: string | number;
  label: string;
  subValue?: string;
  trend?: { value: number; positive: boolean };
  color?: string;
}> = ({ icon, value, label, subValue, trend, color = '#1B5E20' }) => (
  <div className="stat-card" style={{ borderTopColor: color }}>
    <div className="stat-icon" style={{ background: `${color}15`, color }}>
      {icon}
    </div>
    <div className="stat-content">
      <div className="stat-value">{typeof value === 'number' ? formatNumber(value) : value}</div>
      <div className="stat-label">{label}</div>
      {subValue && <div className="stat-sub">{subValue}</div>}
      {trend && (
        <div className={`stat-trend ${trend.positive ? 'positive' : 'negative'}`}>
          {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}% vs last month
        </div>
      )}
    </div>
  </div>
);

// Mini Bar Chart Component
const MiniBarChart: React.FC<{ data: { label: string; value: number }[]; maxValue?: number }> = ({ data, maxValue }) => {
  const max = maxValue || Math.max(...data.map(d => d.value));
  
  return (
    <div className="mini-bar-chart">
      {data.map((item, idx) => (
        <div key={idx} className="bar-item">
          <div className="bar-label">{item.label}</div>
          <div className="bar-track">
            <div 
              className="bar-fill" 
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
          <div className="bar-value">{formatNumber(item.value)}</div>
        </div>
      ))}
    </div>
  );
};

// Trend Chart Component (Simple SVG line chart)
const TrendChart: React.FC<{ data: typeof mockTrendData; dataKey: string }> = ({ data, dataKey }) => {
  const values = data.map(d => d[dataKey as keyof typeof d] as number);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  
  const width = 100;
  const height = 40;
  const padding = 2;
  
  const points = values.map((v, i) => {
    const x = padding + (i / (values.length - 1)) * (width - padding * 2);
    const y = height - padding - ((v - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');
  
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="trend-chart">
      <defs>
        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1B5E20" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#1B5E20" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon 
        points={`${padding},${height - padding} ${points} ${width - padding},${height - padding}`}
        fill="url(#chartGradient)"
      />
      <polyline
        points={points}
        fill="none"
        stroke="#1B5E20"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// District Card Component
const DistrictCard: React.FC<{ district: DistrictAnalytics }> = ({ district }) => (
  <div className="district-card">
    <div className="district-header">
      <div className="district-info">
        <h4>{district.districtName}</h4>
        <span className="district-state" style={{ color: getStateColor(district.state) }}>
          {district.state}
        </span>
      </div>
      <div className="prevention-rate" style={{ 
        background: district.wastePreventionRate > 85 ? '#E8F5E9' : district.wastePreventionRate > 70 ? '#FFF8E1' : '#FFEBEE',
        color: district.wastePreventionRate > 85 ? '#1B5E20' : district.wastePreventionRate > 70 ? '#F57F17' : '#C62828'
      }}>
        {district.wastePreventionRate}% saved
      </div>
    </div>
    
    <div className="district-stats">
      <div className="district-stat">
        <span className="value">{formatNumber(district.foodRescued)}</span>
        <span className="label">kg Rescued</span>
      </div>
      <div className="district-stat">
        <span className="value">{district.activeListings}</span>
        <span className="label">Active</span>
      </div>
      <div className="district-stat">
        <span className="value">{district.ngoActivity}</span>
        <span className="label">NGOs</span>
      </div>
    </div>
    
    <div className="district-products">
      <span className="products-label">Top Products:</span>
      <div className="products-list">
        {district.topProducts.slice(0, 3).map((product, idx) => (
          <span key={idx} className="product-tag">
            {product.name}
          </span>
        ))}
      </div>
    </div>
  </div>
);

// ============================================
// MAIN COMPONENT
// ============================================

const ImpactDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'districts' | 'trends' | 'reports'>('overview');
  const [dateRange, setDateRange] = useState('year');
  const [selectedState, setSelectedState] = useState('all');
  
  const states = ['all', 'Haryana', 'Punjab', 'Uttar Pradesh', 'Rajasthan', 'Delhi'];
  
  const filteredDistricts = selectedState === 'all' 
    ? mockDistrictData 
    : mockDistrictData.filter(d => d.state === selectedState);
  
  const totalFoodRescued = filteredDistricts.reduce((sum, d) => sum + d.foodRescued, 0);
  const totalNGOs = filteredDistricts.reduce((sum, d) => sum + d.ngoActivity, 0);
  const avgPreventionRate = filteredDistricts.reduce((sum, d) => sum + d.wastePreventionRate, 0) / filteredDistricts.length;
  
  return (
    <div className="impact-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <button className="back-btn" onClick={() => navigate('/marketplace')}>
              <ArrowLeft size={16} /> Marketplace
            </button>
            <div className="header-title">
              <h1><Globe size={24} /> Impact Dashboard</h1>
              <p>Real-time food waste prevention analytics</p>
            </div>
          </div>
          <div className="header-right">
            <select 
              value={dateRange} 
              onChange={(e) => setDateRange(e.target.value)}
              className="date-select"
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
              <option value="all">All Time</option>
            </select>
            <button className="export-btn">
              <BarChart3 size={16} /> Export Report
            </button>
          </div>
        </div>
      </header>
      
      {/* Navigation Tabs */}
      <nav className="dashboard-nav">
        <div className="nav-content">
          <button 
            className={`nav-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <TrendingUp size={16} /> Overview
          </button>
          <button 
            className={`nav-tab ${activeTab === 'districts' ? 'active' : ''}`}
            onClick={() => setActiveTab('districts')}
          >
            <Map size={16} /> District Analytics
          </button>
          <button 
            className={`nav-tab ${activeTab === 'trends' ? 'active' : ''}`}
            onClick={() => setActiveTab('trends')}
          >
            <BarChart3 size={16} /> Trends
          </button>
          <button 
            className={`nav-tab ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            <ClipboardList size={16} /> Government Reports
          </button>
        </div>
      </nav>
      
      {/* Main Content */}
      <main className="dashboard-main">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="overview-tab">
            {/* Key Metrics */}
            <section className="metrics-section">
              <h2>Key Impact Metrics</h2>
              <div className="metrics-grid">
                <StatCard
                  icon={<Leaf size={20} />}
                  value={mockImpactMetrics.foodSaved}
                  label="Food Saved (kg)"
                  trend={{ value: 18, positive: true }}
                  color="#4CAF50"
                />
                <StatCard
                  icon={<UtensilsCrossed size={20} />}
                  value={mockImpactMetrics.mealsProvided}
                  label="Meals Provided"
                  trend={{ value: 22, positive: true }}
                  color="#FF9800"
                />
                <StatCard
                  icon={<Sprout size={20} />}
                  value={mockImpactMetrics.carbonSaved}
                  label="CO₂ Saved (kg)"
                  subValue="Equivalent to planting 2,500 trees"
                  color="#00BCD4"
                />
                <StatCard
                  icon={<Droplet size={20} />}
                  value={mockImpactMetrics.waterSaved}
                  label="Water Saved (L)"
                  subValue="3.75 million liters"
                  color="#2196F3"
                />
                <StatCard
                  icon={<User size={20} />}
                  value={mockImpactMetrics.farmersSupported}
                  label="Farmers Supported"
                  trend={{ value: 15, positive: true }}
                  color="#8BC34A"
                />
                <StatCard
                  icon={<Handshake size={20} />}
                  value={mockImpactMetrics.ngosPartnered}
                  label="NGO Partners"
                  color="#E91E63"
                />
                <StatCard
                  icon={<MapPin size={20} />}
                  value={mockImpactMetrics.districtsServed}
                  label="Districts Served"
                  color="#9C27B0"
                />
                <StatCard
                  icon={<CheckCircle size={20} />}
                  value={mockImpactMetrics.transactionsCompleted}
                  label="Transactions"
                  trend={{ value: 25, positive: true }}
                  color="#607D8B"
                />
              </div>
            </section>
            
            {/* Quick Insights */}
            <section className="insights-section">
              <div className="insights-grid">
                <div className="insight-card">
                  <h3><BarChart3 size={18} /> Monthly Trend</h3>
                  <div className="insight-chart">
                    <TrendChart data={mockTrendData} dataKey="foodSaved" />
                  </div>
                  <div className="insight-summary">
                    <span className="trend-value positive">+147%</span>
                    <span className="trend-label">Growth this year</span>
                  </div>
                </div>
                
                <div className="insight-card">
                  <h3><Trophy size={18} /> Top Performing States</h3>
                  <MiniBarChart 
                    data={[
                      { label: 'Haryana', value: 30700 },
                      { label: 'Punjab', value: 25400 },
                      { label: 'UP', value: 22100 },
                      { label: 'Rajasthan', value: 18500 },
                      { label: 'Delhi', value: 15200 }
                    ]}
                  />
                </div>
                
                <div className="insight-card">
                  <h3><Leaf size={18} /> Top Products Rescued</h3>
                  <MiniBarChart 
                    data={[
                      { label: 'Vegetables', value: 45000 },
                      { label: 'Grains', value: 32000 },
                      { label: 'Fruits', value: 28000 },
                      { label: 'Dairy', value: 12000 },
                      { label: 'Pulses', value: 8000 }
                    ]}
                  />
                </div>
              </div>
            </section>
            
            {/* Live Activity Feed */}
            <section className="activity-section">
              <h2><Radio size={20} /> Live Activity</h2>
              <div className="activity-feed">
                {[
                  { time: '2 min ago', action: 'Rescue', detail: '50kg Tomatoes rescued by Akshaya Patra, Gurugram', icon: <AlertCircle size={16} /> },
                  { time: '5 min ago', action: 'Sale', detail: '200kg Wheat sold to processor in Sonipat', icon: <Banknote size={16} /> },
                  { time: '8 min ago', action: 'Listing', detail: 'New listing: 150kg Organic Mangoes in Mohali', icon: <Package size={16} /> },
                  { time: '12 min ago', action: 'Donation', detail: 'Auto-donation triggered: 80kg Spinach to Food Bank', icon: <Handshake size={16} /> },
                  { time: '15 min ago', action: 'Rescue', detail: '120kg Rice rescued by Feeding India, Lucknow', icon: <AlertCircle size={16} /> }
                ].map((activity, idx) => (
                  <div key={idx} className="activity-item">
                    <span className="activity-icon">{activity.icon}</span>
                    <div className="activity-content">
                      <span className="activity-time">{activity.time}</span>
                      <span className="activity-action">{activity.action}</span>
                      <span className="activity-detail">{activity.detail}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
        
        {/* Districts Tab */}
        {activeTab === 'districts' && (
          <div className="districts-tab">
            <div className="districts-header">
              <h2><Map size={20} /> District-wise Analytics</h2>
              <div className="districts-filters">
                <select 
                  value={selectedState} 
                  onChange={(e) => setSelectedState(e.target.value)}
                  className="state-select"
                >
                  {states.map(state => (
                    <option key={state} value={state}>
                      {state === 'all' ? 'All States' : state}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="districts-summary">
              <div className="summary-stat">
                <span className="value">{filteredDistricts.length}</span>
                <span className="label">Districts</span>
              </div>
              <div className="summary-stat">
                <span className="value">{formatNumber(totalFoodRescued)}</span>
                <span className="label">kg Rescued</span>
              </div>
              <div className="summary-stat">
                <span className="value">{totalNGOs}</span>
                <span className="label">Active NGOs</span>
              </div>
              <div className="summary-stat">
                <span className="value">{avgPreventionRate.toFixed(1)}%</span>
                <span className="label">Avg Prevention Rate</span>
              </div>
            </div>
            
            <div className="districts-grid">
              {filteredDistricts.map((district, idx) => (
                <DistrictCard key={idx} district={district} />
              ))}
            </div>
          </div>
        )}
        
        {/* Trends Tab */}
        {activeTab === 'trends' && (
          <div className="trends-tab">
            <h2><BarChart3 size={20} /> Performance Trends</h2>
            
            <div className="trends-grid">
              <div className="trend-card large">
                <h3>Food Saved Over Time</h3>
                <div className="trend-chart-large">
                  <svg viewBox="0 0 400 200" className="line-chart">
                    {/* Grid lines */}
                    {[0, 1, 2, 3, 4].map(i => (
                      <line 
                        key={i}
                        x1="40" 
                        y1={20 + i * 40} 
                        x2="380" 
                        y2={20 + i * 40} 
                        stroke="#E0E0E0" 
                        strokeDasharray="4"
                      />
                    ))}
                    
                    {/* Y-axis labels */}
                    {['20K', '15K', '10K', '5K', '0'].map((label, i) => (
                      <text 
                        key={i} 
                        x="35" 
                        y={25 + i * 40} 
                        textAnchor="end" 
                        fontSize="10" 
                        fill="#9E9E9E"
                      >
                        {label}
                      </text>
                    ))}
                    
                    {/* X-axis labels */}
                    {mockTrendData.map((d, i) => (
                      <text 
                        key={i}
                        x={50 + i * 30}
                        y="195"
                        textAnchor="middle"
                        fontSize="10"
                        fill="#9E9E9E"
                      >
                        {d.date}
                      </text>
                    ))}
                    
                    {/* Line */}
                    <polyline
                      points={mockTrendData.map((d, i) => {
                        const x = 50 + i * 30;
                        const y = 180 - (d.foodSaved / 21000) * 160;
                        return `${x},${y}`;
                      }).join(' ')}
                      fill="none"
                      stroke="#1B5E20"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    
                    {/* Area fill */}
                    <polygon
                      points={`50,180 ${mockTrendData.map((d, i) => {
                        const x = 50 + i * 30;
                        const y = 180 - (d.foodSaved / 21000) * 160;
                        return `${x},${y}`;
                      }).join(' ')} 380,180`}
                      fill="url(#areaGradient)"
                    />
                    
                    <defs>
                      <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1B5E20" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#1B5E20" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                <div className="trend-summary">
                  <div className="summary-item">
                    <span className="label">Total This Year</span>
                    <span className="value">125,000 kg</span>
                  </div>
                  <div className="summary-item">
                    <span className="label">Avg Monthly</span>
                    <span className="value">10,416 kg</span>
                  </div>
                  <div className="summary-item positive">
                    <span className="label">YoY Growth</span>
                    <span className="value">+147%</span>
                  </div>
                </div>
              </div>
              
              <div className="trend-card">
                <h3>Meals Provided</h3>
                <div className="metric-large">
                  <span className="value">416,666</span>
                  <span className="trend positive">↑ 22% this month</span>
                </div>
                <TrendChart data={mockTrendData} dataKey="mealsProvided" />
              </div>
              
              <div className="trend-card">
                <h3>Transactions</h3>
                <div className="metric-large">
                  <span className="value">15,678</span>
                  <span className="trend positive">↑ 25% this month</span>
                </div>
                <TrendChart data={mockTrendData} dataKey="transactions" />
              </div>
            </div>
          </div>
        )}
        
        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="reports-tab">
            <h2><ClipboardList size={20} /> Government-Ready Reports</h2>
            <p className="reports-subtitle">
              Generate comprehensive reports for policy makers and government stakeholders
            </p>
            
            <div className="reports-grid">
              {[
                {
                  title: 'Monthly Impact Summary',
                  description: 'Complete overview of food waste prevention metrics for the month',
                  icon: <BarChart3 size={20} />,
                  format: 'PDF / Excel'
                },
                {
                  title: 'District-wise Analysis',
                  description: 'Detailed breakdown by district with comparative analytics',
                  icon: <Map size={20} />,
                  format: 'PDF / Excel'
                },
                {
                  title: 'Farmer Participation Report',
                  description: 'Statistics on farmer engagement, listings, and success rates',
                  icon: <User size={20} />,
                  format: 'PDF'
                },
                {
                  title: 'NGO Activity Report',
                  description: 'Food rescue operations, meals distributed, and partner performance',
                  icon: <Handshake size={20} />,
                  format: 'PDF / Excel'
                },
                {
                  title: 'Environmental Impact Report',
                  description: 'Carbon footprint reduction, water savings, and sustainability metrics',
                  icon: <Globe size={20} />,
                  format: 'PDF'
                },
                {
                  title: 'Custom Report Builder',
                  description: 'Create custom reports with selected metrics and date ranges',
                  icon: <Settings size={20} />,
                  format: 'Custom'
                }
              ].map((report, idx) => (
                <div key={idx} className="report-card">
                  <div className="report-icon">{report.icon}</div>
                  <div className="report-content">
                    <h4>{report.title}</h4>
                    <p>{report.description}</p>
                    <span className="report-format">{report.format}</span>
                  </div>
                  <button className="generate-btn">Generate</button>
                </div>
              ))}
            </div>
            
            <div className="api-section">
              <h3><Link2 size={18} /> Data API Access</h3>
              <p>Integrate ANNAM impact data directly into government dashboards and portals</p>
              <div className="api-info">
                <code>GET /api/v1/impact/metrics</code>
                <code>GET /api/v1/impact/districts</code>
                <code>GET /api/v1/impact/reports</code>
              </div>
              <button className="api-docs-btn">View API Documentation</button>
            </div>
          </div>
        )}
      </main>
      
      {/* Footer */}
      <footer className="dashboard-footer">
        <div className="footer-content">
          <div className="footer-left">
            <span><Wheat size={16} /> ANNAM Impact Dashboard</span>
            <span className="separator">•</span>
            <span>Last updated: {new Date().toLocaleString()}</span>
          </div>
          <div className="footer-right">
            <span>Data refreshes every 5 minutes</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ImpactDashboard;
