import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Analytics.css';

// --- Types ---
interface User {
  id: number;
  name: string;
  role: 'farmer' | 'ngo' | 'driver';
}

interface DonationStats {
  total: number;
  claimed: number;
  delivered: number;
  expired: number;
  active: number;
}

interface MonthlyData {
  month: string;
  donations: number;
  claimed: number;
}

interface FoodTypeData {
  type: string;
  count: number;
  percentage: number;
  color: string;
}

interface RecentActivity {
  id: number;
  action: string;
  item: string;
  time: string;
  icon: string;
}

interface ImpactMetrics {
  foodSaved: number;
  peopleFed: number;
  co2Saved: number;
  waterSaved: number;
}

const Analytics: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'impact'>('overview');
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // State for API data
  const [stats, setStats] = useState<DonationStats>({
    total: 0,
    claimed: 0,
    delivered: 0,
    expired: 0,
    active: 0
  });

  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([
    { month: 'Jan', donations: 0, claimed: 0 },
    { month: 'Feb', donations: 0, claimed: 0 },
    { month: 'Mar', donations: 0, claimed: 0 },
    { month: 'Apr', donations: 0, claimed: 0 },
    { month: 'May', donations: 0, claimed: 0 },
    { month: 'Jun', donations: 0, claimed: 0 },
    { month: 'Jul', donations: 0, claimed: 0 },
    { month: 'Aug', donations: 0, claimed: 0 },
  ]);

  const [foodTypeData, setFoodTypeData] = useState<FoodTypeData[]>([
    { type: 'Vegetables', count: 0, percentage: 0, color: '#4caf50' },
    { type: 'Fruits', count: 0, percentage: 0, color: '#ff9800' },
    { type: 'Grains', count: 0, percentage: 0, color: '#8d6e63' },
    { type: 'Other', count: 0, percentage: 0, color: '#9e9e9e' },
  ]);

  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);

  const [impactMetrics, setImpactMetrics] = useState<ImpactMetrics>({
    foodSaved: 0,
    peopleFed: 0,
    co2Saved: 0,
    waterSaved: 0
  });

  // Fetch analytics data from API
  const fetchAnalyticsData = async (farmerId: number) => {
    try {
      const response = await fetch(`http://localhost:8000/api/analytics/farmer/${farmerId}`);
      const data = await response.json();
      
      if (response.ok) {
        // Update stats
        setStats({
          total: data.total_donations || 0,
          claimed: data.claimed_listings || 0,
          delivered: data.delivered_listings || 0,
          expired: 0,
          active: data.active_listings || 0
        });
        
        // Update impact metrics
        setImpactMetrics({
          foodSaved: data.total_quantity_kg || 0,
          peopleFed: data.meals_provided_estimate || 0,
          co2Saved: data.carbon_saved_kg || 0,
          waterSaved: Math.round((data.total_quantity_kg || 0) * 100)
        });

        // Calculate food type distribution from listings
        if (data.listings && data.listings.length > 0) {
          const typeCounts: { [key: string]: number } = { Vegetable: 0, Fruit: 0, Grain: 0, Other: 0 };
          data.listings.forEach((listing: any) => {
            const type = listing.type || 'Other';
            typeCounts[type] = (typeCounts[type] || 0) + 1;
          });
          
          const total = data.listings.length;
          setFoodTypeData([
            { type: 'Vegetables', count: typeCounts['Vegetable'], percentage: Math.round((typeCounts['Vegetable'] / total) * 100), color: '#4caf50' },
            { type: 'Fruits', count: typeCounts['Fruit'], percentage: Math.round((typeCounts['Fruit'] / total) * 100), color: '#ff9800' },
            { type: 'Grains', count: typeCounts['Grain'], percentage: Math.round((typeCounts['Grain'] / total) * 100), color: '#8d6e63' },
            { type: 'Other', count: typeCounts['Other'], percentage: Math.round((typeCounts['Other'] / total) * 100), color: '#9e9e9e' },
          ]);

          // Create recent activity from listings
          const activities = data.listings.slice(0, 5).map((listing: any, index: number) => ({
            id: index + 1,
            action: listing.status === 'delivered' ? 'Delivery Completed' : listing.status === 'claimed' ? 'Donation Claimed' : 'New Listing Created',
            item: `${listing.title} (${listing.quantity})`,
            time: listing.created_at ? new Date(listing.created_at).toLocaleDateString() : 'Recently',
            icon: listing.status === 'delivered' ? '✅' : listing.status === 'claimed' ? '🤝' : '📦'
          }));
          setRecentActivity(activities);
        }
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      if (parsedUser.role !== 'farmer') {
        navigate('/home');
        return;
      }
      setUser(parsedUser);
      
      // Fetch analytics data
      fetchAnalyticsData(parsedUser.id);
    } else {
      navigate('/');
      return;
    }
    
    setLoading(false);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  // Calculate max value for chart scaling
  const maxDonations = Math.max(...monthlyData.map(d => d.donations));

  // Success rate calculation
  const successRate = stats.total > 0 
    ? Math.round((stats.delivered / stats.total) * 100) 
    : 0;

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading analytics...</p>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
        <header className="top-header">
          <div className="header-left">
            <h1 className="page-title">📊 Analytics</h1>
            <p className="page-subtitle">Track your donation impact and trends</p>
          </div>
          
          <div className="header-right">
            <div className="time-range-selector">
              {(['week', 'month', 'year'] as const).map((range) => (
                <button
                  key={range}
                  className={`range-btn ${timeRange === range ? 'active' : ''}`}
                  onClick={() => setTimeRange(range)}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </button>
              ))}
            </div>
            <div className="user-avatar">
              {user?.name.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Tab Navigation */}
        <div className="analytics-tabs">
          <button 
            className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <span className="tab-icon">📈</span>
            Overview
          </button>
          <button 
            className={`tab-btn ${activeTab === 'trends' ? 'active' : ''}`}
            onClick={() => setActiveTab('trends')}
          >
            <span className="tab-icon">📉</span>
            Trends
          </button>
          <button 
            className={`tab-btn ${activeTab === 'impact' ? 'active' : ''}`}
            onClick={() => setActiveTab('impact')}
          >
            <span className="tab-icon">🌍</span>
            Impact
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {/* Stats Cards */}
            <section className="analytics-stats">
              <div className="stat-card-analytics primary">
                <div className="stat-icon-wrapper">
                  <span className="stat-icon">📦</span>
                </div>
                <div className="stat-info">
                  <span className="stat-number">{stats.total}</span>
                  <span className="stat-title">Total Donations</span>
                </div>
                <div className="stat-trend positive">
                  <span>↗ +12%</span>
                </div>
              </div>

              <div className="stat-card-analytics success">
                <div className="stat-icon-wrapper">
                  <span className="stat-icon">✅</span>
                </div>
                <div className="stat-info">
                  <span className="stat-number">{stats.delivered}</span>
                  <span className="stat-title">Delivered</span>
                </div>
                <div className="stat-trend positive">
                  <span>↗ +8%</span>
                </div>
              </div>

              <div className="stat-card-analytics warning">
                <div className="stat-icon-wrapper">
                  <span className="stat-icon">🔄</span>
                </div>
                <div className="stat-info">
                  <span className="stat-number">{stats.active}</span>
                  <span className="stat-title">Active Listings</span>
                </div>
                <div className="stat-trend neutral">
                  <span>→ 0%</span>
                </div>
              </div>

              <div className="stat-card-analytics danger">
                <div className="stat-icon-wrapper">
                  <span className="stat-icon">⏰</span>
                </div>
                <div className="stat-info">
                  <span className="stat-number">{stats.expired}</span>
                  <span className="stat-title">Expired</span>
                </div>
                <div className="stat-trend negative">
                  <span>↘ -5%</span>
                </div>
              </div>
            </section>

            {/* Charts Section */}
            <section className="charts-section">
              {/* Bar Chart */}
              <div className="chart-card">
                <div className="chart-header">
                  <h3>Monthly Donations</h3>
                  <div className="chart-legend">
                    <span className="legend-item">
                      <span className="legend-color donations"></span>
                      Donations
                    </span>
                    <span className="legend-item">
                      <span className="legend-color claimed"></span>
                      Claimed
                    </span>
                  </div>
                </div>
                <div className="bar-chart">
                  {monthlyData.map((data, index) => (
                    <div key={index} className="bar-group">
                      <div className="bars">
                        <div 
                          className="bar donations"
                          style={{ height: `${(data.donations / maxDonations) * 100}%` }}
                        >
                          <span className="bar-value">{data.donations}</span>
                        </div>
                        <div 
                          className="bar claimed"
                          style={{ height: `${(data.claimed / maxDonations) * 100}%` }}
                        >
                          <span className="bar-value">{data.claimed}</span>
                        </div>
                      </div>
                      <span className="bar-label">{data.month}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Donut Chart */}
              <div className="chart-card">
                <div className="chart-header">
                  <h3>Food Type Distribution</h3>
                </div>
                <div className="donut-chart-container">
                  <div className="donut-chart">
                    <svg viewBox="0 0 100 100">
                      {foodTypeData.reduce((acc, item, index) => {
                        const prevPercentage = foodTypeData
                          .slice(0, index)
                          .reduce((sum, d) => sum + d.percentage, 0);
                        const circumference = 2 * Math.PI * 35;
                        const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
                        const rotation = (prevPercentage / 100) * 360 - 90;
                        
                        acc.push(
                          <circle
                            key={item.type}
                            cx="50"
                            cy="50"
                            r="35"
                            fill="none"
                            stroke={item.color}
                            strokeWidth="12"
                            strokeDasharray={strokeDasharray}
                            transform={`rotate(${rotation} 50 50)`}
                            className="donut-segment"
                          />
                        );
                        return acc;
                      }, [] as Array<React.ReactElement>)}
                    </svg>
                    <div className="donut-center">
                      <span className="donut-total">{stats.total}</span>
                      <span className="donut-label">Total</span>
                    </div>
                  </div>
                  <div className="donut-legend">
                    {foodTypeData.map((item) => (
                      <div key={item.type} className="legend-row">
                        <span 
                          className="legend-dot"
                          style={{ background: item.color }}
                        ></span>
                        <span className="legend-name">{item.type}</span>
                        <span className="legend-value">{item.count}</span>
                        <span className="legend-percentage">{item.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Success Rate & Recent Activity */}
            <section className="bottom-section">
              {/* Success Rate */}
              <div className="success-rate-card">
                <h3>Success Rate</h3>
                <div className="progress-ring-container">
                  <svg className="progress-ring" viewBox="0 0 120 120">
                    <circle
                      className="progress-ring-bg"
                      cx="60"
                      cy="60"
                      r="50"
                    />
                    <circle
                      className="progress-ring-fill"
                      cx="60"
                      cy="60"
                      r="50"
                      style={{
                        strokeDasharray: `${(successRate / 100) * 314} 314`,
                      }}
                    />
                  </svg>
                  <div className="progress-text">
                    <span className="progress-value">{successRate}%</span>
                    <span className="progress-label">Delivered</span>
                  </div>
                </div>
                <div className="rate-details">
                  <div className="rate-item">
                    <span className="rate-dot claimed"></span>
                    <span>Claimed: {stats.claimed}</span>
                  </div>
                  <div className="rate-item">
                    <span className="rate-dot delivered"></span>
                    <span>Delivered: {stats.delivered}</span>
                  </div>
                  <div className="rate-item">
                    <span className="rate-dot expired"></span>
                    <span>Expired: {stats.expired}</span>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="recent-activity-card">
                <h3>Recent Activity</h3>
                <div className="activity-list">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="activity-item">
                      <div className="activity-icon">{activity.icon}</div>
                      <div className="activity-content">
                        <span className="activity-action">{activity.action}</span>
                        <span className="activity-item-name">{activity.item}</span>
                      </div>
                      <span className="activity-time">{activity.time}</span>
                    </div>
                  ))}
                </div>
                <button className="view-all-btn" onClick={() => navigate('/history')}>
                  View All Activity →
                </button>
              </div>
            </section>
          </>
        )}

        {/* Trends Tab */}
        {activeTab === 'trends' && (
          <section className="trends-section">
            <div className="trend-card full-width">
              <div className="chart-header">
                <h3>Donation Trends Over Time</h3>
                <p className="chart-description">Track your donation patterns and growth</p>
              </div>
              <div className="line-chart">
                <div className="line-chart-grid">
                  {[100, 75, 50, 25, 0].map((value) => (
                    <div key={value} className="grid-line">
                      <span className="grid-label">{value}%</span>
                    </div>
                  ))}
                </div>
                <div className="line-chart-content">
                  <svg viewBox="0 0 800 200" preserveAspectRatio="none">
                    {/* Donations Line */}
                    <polyline
                      className="chart-line donations"
                      points={monthlyData.map((d, i) => 
                        `${(i / (monthlyData.length - 1)) * 780 + 10},${200 - (d.donations / maxDonations) * 180}`
                      ).join(' ')}
                    />
                    {/* Claimed Line */}
                    <polyline
                      className="chart-line claimed"
                      points={monthlyData.map((d, i) => 
                        `${(i / (monthlyData.length - 1)) * 780 + 10},${200 - (d.claimed / maxDonations) * 180}`
                      ).join(' ')}
                    />
                    {/* Data Points - Donations */}
                    {monthlyData.map((d, i) => (
                      <circle
                        key={`donation-${i}`}
                        className="data-point donations"
                        cx={(i / (monthlyData.length - 1)) * 780 + 10}
                        cy={200 - (d.donations / maxDonations) * 180}
                        r="6"
                      />
                    ))}
                    {/* Data Points - Claimed */}
                    {monthlyData.map((d, i) => (
                      <circle
                        key={`claimed-${i}`}
                        className="data-point claimed"
                        cx={(i / (monthlyData.length - 1)) * 780 + 10}
                        cy={200 - (d.claimed / maxDonations) * 180}
                        r="5"
                      />
                    ))}
                  </svg>
                </div>
                <div className="line-chart-labels">
                  {monthlyData.map((d, i) => (
                    <span key={i} className="month-label">{d.month}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="trend-insights">
              <div className="insight-card">
                <div className="insight-icon">📈</div>
                <div className="insight-content">
                  <h4>Peak Month</h4>
                  <p className="insight-value">July</p>
                  <p className="insight-detail">28 donations</p>
                </div>
              </div>
              <div className="insight-card">
                <div className="insight-icon">⭐</div>
                <div className="insight-content">
                  <h4>Best Category</h4>
                  <p className="insight-value">Vegetables</p>
                  <p className="insight-detail">42% of donations</p>
                </div>
              </div>
              <div className="insight-card">
                <div className="insight-icon">🎯</div>
                <div className="insight-content">
                  <h4>Claim Rate</h4>
                  <p className="insight-value">92%</p>
                  <p className="insight-detail">Above average</p>
                </div>
              </div>
              <div className="insight-card">
                <div className="insight-icon">⚡</div>
                <div className="insight-content">
                  <h4>Avg. Claim Time</h4>
                  <p className="insight-value">4.2 hrs</p>
                  <p className="insight-detail">Fast response</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Impact Tab */}
        {activeTab === 'impact' && (
          <section className="impact-section">
            <div className="impact-header">
              <h2>Your Environmental Impact</h2>
              <p>See how your donations are making a difference</p>
            </div>

            <div className="impact-cards">
              <div className="impact-card food-saved">
                <div className="impact-visual">
                  <div className="impact-icon-large">🥗</div>
                  <div className="impact-particles">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className="particle">🌿</span>
                    ))}
                  </div>
                </div>
                <div className="impact-data">
                  <span className="impact-number">{impactMetrics.foodSaved.toLocaleString()}</span>
                  <span className="impact-unit">kg</span>
                </div>
                <h3>Food Saved</h3>
                <p>From going to waste</p>
              </div>

              <div className="impact-card people-fed">
                <div className="impact-visual">
                  <div className="impact-icon-large">👥</div>
                  <div className="impact-particles">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className="particle">❤️</span>
                    ))}
                  </div>
                </div>
                <div className="impact-data">
                  <span className="impact-number">{impactMetrics.peopleFed.toLocaleString()}</span>
                  <span className="impact-unit">meals</span>
                </div>
                <h3>People Fed</h3>
                <p>Hunger reduced</p>
              </div>

              <div className="impact-card co2-saved">
                <div className="impact-visual">
                  <div className="impact-icon-large">🌍</div>
                  <div className="impact-particles">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className="particle">🌱</span>
                    ))}
                  </div>
                </div>
                <div className="impact-data">
                  <span className="impact-number">{impactMetrics.co2Saved.toLocaleString()}</span>
                  <span className="impact-unit">kg CO₂</span>
                </div>
                <h3>Carbon Saved</h3>
                <p>Emissions prevented</p>
              </div>

              <div className="impact-card water-saved">
                <div className="impact-visual">
                  <div className="impact-icon-large">💧</div>
                  <div className="impact-particles">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className="particle">💦</span>
                    ))}
                  </div>
                </div>
                <div className="impact-data">
                  <span className="impact-number">{(impactMetrics.waterSaved / 1000).toFixed(0)}K</span>
                  <span className="impact-unit">liters</span>
                </div>
                <h3>Water Saved</h3>
                <p>Conservation impact</p>
              </div>
            </div>

            {/* Impact Comparison */}
            <div className="impact-comparison">
              <h3>This is equivalent to...</h3>
              <div className="comparison-items">
                <div className="comparison-item">
                  <span className="comparison-icon">🚗</span>
                  <span className="comparison-value">3,400 km</span>
                  <span className="comparison-label">of car emissions saved</span>
                </div>
                <div className="comparison-item">
                  <span className="comparison-icon">🌳</span>
                  <span className="comparison-value">42 trees</span>
                  <span className="comparison-label">planted for a year</span>
                </div>
                <div className="comparison-item">
                  <span className="comparison-icon">🏠</span>
                  <span className="comparison-value">28 homes</span>
                  <span className="comparison-label">powered for a day</span>
                </div>
                <div className="comparison-item">
                  <span className="comparison-icon">🛁</span>
                  <span className="comparison-value">625 baths</span>
                  <span className="comparison-label">worth of water</span>
                </div>
              </div>
            </div>

            {/* Badges Section */}
            <div className="badges-section">
              <h3>Your Achievements</h3>
              <div className="badges-grid">
                <div className="badge-item earned">
                  <div className="badge-icon">🌟</div>
                  <span className="badge-name">First Donation</span>
                </div>
                <div className="badge-item earned">
                  <div className="badge-icon">🎯</div>
                  <span className="badge-name">10 Donations</span>
                </div>
                <div className="badge-item earned">
                  <div className="badge-icon">🔥</div>
                  <span className="badge-name">On Fire (5 days streak)</span>
                </div>
                <div className="badge-item earned">
                  <div className="badge-icon">💯</div>
                  <span className="badge-name">100 Donations</span>
                </div>
                <div className="badge-item locked">
                  <div className="badge-icon">🏆</div>
                  <span className="badge-name">Top Donor</span>
                  <span className="badge-lock">🔒</span>
                </div>
                <div className="badge-item locked">
                  <div className="badge-icon">👑</div>
                  <span className="badge-name">Legend (500)</span>
                  <span className="badge-lock">🔒</span>
                </div>
              </div>
            </div>
          </section>
        )}
      </>
    );
  };
  
  export default Analytics;
