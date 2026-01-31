import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Earnings.css';

interface User {
  id: number;
  name: string;
  role: 'farmer' | 'ngo' | 'driver';
}

interface EarningEntry {
  id: number;
  date: string;
  deliveryId: number;
  title: string;
  from: string;
  to: string;
  distance: string;
  amount: number;
  tip: number;
  status: 'paid' | 'pending' | 'processing';
}

interface EarningStats {
  todayEarnings: number;
  weeklyEarnings: number;
  monthlyEarnings: number;
  totalEarnings: number;
  totalDeliveries: number;
  avgPerDelivery: number;
  pendingPayouts: number;
}

type TimeFilter = 'today' | 'week' | 'month' | 'all';

const Earnings: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('week');
  const [earnings, setEarnings] = useState<EarningEntry[]>([]);
  const [stats, setStats] = useState<EarningStats>({
    todayEarnings: 0,
    weeklyEarnings: 0,
    monthlyEarnings: 0,
    totalEarnings: 0,
    totalDeliveries: 0,
    avgPerDelivery: 0,
    pendingPayouts: 0,
  });

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      navigate('/auth');
      return;
    }

    const parsedUser = JSON.parse(storedUser);
    if (parsedUser.role !== 'driver') {
      navigate('/home');
      return;
    }

    setUser(parsedUser);
    
    // Fetch earnings from API
    const fetchEarnings = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/drivers/${parsedUser.id}/earnings`);
        const data = await response.json();
        
        if (response.ok) {
          // Map API data to EarningEntry format
          const earningsData: EarningEntry[] = (data.earnings || []).map((e: any, index: number) => ({
            id: index + 1,
            date: e.date || new Date().toISOString().split('T')[0],
            deliveryId: e.task_id || index + 100,
            title: e.listing_title || 'Delivery',
            from: e.pickup_location || 'Pickup Location',
            to: e.delivery_location || 'Delivery Location',
            distance: `${e.distance || 0} km`,
            amount: e.amount || 0,
            tip: e.tip || 0,
            status: e.status || 'paid',
          }));
          
          setEarnings(earningsData);
          
          // Calculate stats from API data
          const today = new Date().toISOString().split('T')[0];
          const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          
          const todayEarnings = earningsData
            .filter((e: EarningEntry) => e.date === today)
            .reduce((sum: number, e: EarningEntry) => sum + e.amount + e.tip, 0);
          
          const weeklyEarnings = earningsData
            .filter((e: EarningEntry) => e.date >= weekAgo)
            .reduce((sum: number, e: EarningEntry) => sum + e.amount + e.tip, 0);
          
          const monthlyEarnings = earningsData
            .filter((e: EarningEntry) => e.date >= monthAgo)
            .reduce((sum: number, e: EarningEntry) => sum + e.amount + e.tip, 0);
          
          const totalEarnings = data.total_earnings || earningsData.reduce((sum: number, e: EarningEntry) => sum + e.amount + e.tip, 0);
          const pendingPayouts = earningsData
            .filter((e: EarningEntry) => e.status === 'pending' || e.status === 'processing')
            .reduce((sum: number, e: EarningEntry) => sum + e.amount + e.tip, 0);
          
          setStats({
            todayEarnings,
            weeklyEarnings,
            monthlyEarnings,
            totalEarnings,
            totalDeliveries: data.total_deliveries || earningsData.length,
            avgPerDelivery: earningsData.length > 0 ? Math.round(totalEarnings / earningsData.length) : 0,
            pendingPayouts,
          });
        }
      } catch (err) {
        console.error('Error fetching earnings:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchEarnings();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/auth');
  };

  const getFilteredEarnings = () => {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    switch (timeFilter) {
      case 'today':
        return earnings.filter(e => e.date === today);
      case 'week':
        return earnings.filter(e => e.date >= weekAgo);
      case 'month':
        return earnings.filter(e => e.date >= monthAgo);
      default:
        return earnings;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (dateStr === today.toISOString().split('T')[0]) {
      return 'Today';
    } else if (dateStr === yesterday.toISOString().split('T')[0]) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-IN', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <span className="status-badge paid">✓ Paid</span>;
      case 'processing':
        return <span className="status-badge processing">⏳ Processing</span>;
      case 'pending':
        return <span className="status-badge pending">⏱ Pending</span>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="earnings-loading">
        <div className="loading-spinner"></div>
        <p>Loading earnings...</p>
      </div>
    );
  }

  const filteredEarnings = getFilteredEarnings();
  const filteredTotal = filteredEarnings.reduce((sum, e) => sum + e.amount + e.tip, 0);

  return (
    <div className="earnings-container">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-section">
            <span className="logo-icon">🌾</span>
            {!sidebarCollapsed && <span className="logo-text">Annam</span>}
          </div>
          <button 
            className="collapse-btn"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? '»' : '«'}
          </button>
        </div>
        
        <nav className="sidebar-nav">
          <div className="nav-item" onClick={() => navigate('/home')}>
            <span className="nav-icon">🏠</span>
            {!sidebarCollapsed && <span className="nav-label">Dashboard</span>}
          </div>
          <div className="nav-item" onClick={() => navigate('/my-deliveries')}>
            <span className="nav-icon">📍</span>
            {!sidebarCollapsed && <span className="nav-label">My Deliveries</span>}
          </div>
          <div className="nav-item" onClick={() => navigate('/available-pickups')}>
            <span className="nav-icon">🚚</span>
            {!sidebarCollapsed && <span className="nav-label">Available Pickups</span>}
          </div>
          <div className="nav-item" onClick={() => navigate('/route-map')}>
            <span className="nav-icon">🗺️</span>
            {!sidebarCollapsed && <span className="nav-label">Route Map</span>}
          </div>
          <div className="nav-item active">
            <span className="nav-icon">💰</span>
            {!sidebarCollapsed && <span className="nav-label">Earnings</span>}
          </div>
          <div className="nav-item" onClick={() => navigate('/history')}>
            <span className="nav-icon">📜</span>
            {!sidebarCollapsed && <span className="nav-label">History</span>}
          </div>
          <div className="nav-item" onClick={() => navigate('/leaderboards')}>
            <span className="nav-icon">🏆</span>
            {!sidebarCollapsed && <span className="nav-label">Leaderboards</span>}
          </div>
          <div className="nav-item" onClick={() => navigate('/driver-settings')}>
            <span className="nav-icon">⚙️</span>
            {!sidebarCollapsed && <span className="nav-label">Settings</span>}
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="nav-item logout-item" onClick={handleLogout}>
            <span className="nav-icon">🚪</span>
            {!sidebarCollapsed && <span className="nav-label">Logout</span>}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Header */}
        <header className="top-header">
          <div className="header-left">
            <h1 className="page-title">💰 Earnings</h1>
            <p className="page-subtitle">Track your delivery earnings and payouts</p>
          </div>
          <div className="header-right">
            <div className="user-profile">
              <div className="user-avatar">
                {user?.name?.charAt(0).toUpperCase() || 'D'}
              </div>
              <div className="user-info">
                <span className="user-name">{user?.name || 'Driver'}</span>
                <span className="user-role">Driver</span>
              </div>
            </div>
          </div>
        </header>

        {/* Stats Cards */}
        <div className="earnings-stats">
          <div className="stat-card today">
            <div className="stat-icon">📅</div>
            <div className="stat-content">
              <span className="stat-label">Today's Earnings</span>
              <span className="stat-value">₹{stats.todayEarnings}</span>
            </div>
          </div>
          <div className="stat-card week">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <span className="stat-label">This Week</span>
              <span className="stat-value">₹{stats.weeklyEarnings}</span>
            </div>
          </div>
          <div className="stat-card month">
            <div className="stat-icon">📈</div>
            <div className="stat-content">
              <span className="stat-label">This Month</span>
              <span className="stat-value">₹{stats.monthlyEarnings}</span>
            </div>
          </div>
          <div className="stat-card total">
            <div className="stat-icon">💎</div>
            <div className="stat-content">
              <span className="stat-label">Total Earnings</span>
              <span className="stat-value">₹{stats.totalEarnings}</span>
            </div>
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="quick-stats">
          <div className="quick-stat">
            <span className="quick-icon">🚚</span>
            <span className="quick-value">{stats.totalDeliveries}</span>
            <span className="quick-label">Total Deliveries</span>
          </div>
          <div className="quick-stat">
            <span className="quick-icon">📊</span>
            <span className="quick-value">₹{stats.avgPerDelivery}</span>
            <span className="quick-label">Avg per Delivery</span>
          </div>
          <div className="quick-stat pending-payout">
            <span className="quick-icon">⏳</span>
            <span className="quick-value">₹{stats.pendingPayouts}</span>
            <span className="quick-label">Pending Payouts</span>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="filter-section">
          <div className="filter-tabs">
            <button 
              className={`filter-tab ${timeFilter === 'today' ? 'active' : ''}`}
              onClick={() => setTimeFilter('today')}
            >
              Today
            </button>
            <button 
              className={`filter-tab ${timeFilter === 'week' ? 'active' : ''}`}
              onClick={() => setTimeFilter('week')}
            >
              This Week
            </button>
            <button 
              className={`filter-tab ${timeFilter === 'month' ? 'active' : ''}`}
              onClick={() => setTimeFilter('month')}
            >
              This Month
            </button>
            <button 
              className={`filter-tab ${timeFilter === 'all' ? 'active' : ''}`}
              onClick={() => setTimeFilter('all')}
            >
              All Time
            </button>
          </div>
          <div className="filter-summary">
            <span className="summary-count">{filteredEarnings.length} deliveries</span>
            <span className="summary-total">Total: ₹{filteredTotal}</span>
          </div>
        </div>

        {/* Earnings List */}
        <div className="earnings-list">
          {filteredEarnings.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">💸</span>
              <h3>No earnings found</h3>
              <p>Complete deliveries to start earning!</p>
              <button 
                className="cta-button"
                onClick={() => navigate('/available-pickups')}
              >
                Find Pickups
              </button>
            </div>
          ) : (
            filteredEarnings.map((entry) => (
              <div key={entry.id} className="earning-card">
                <div className="earning-header">
                  <div className="earning-date">{formatDate(entry.date)}</div>
                  {getStatusBadge(entry.status)}
                </div>
                <div className="earning-body">
                  <div className="earning-title">
                    <span className="delivery-icon">📦</span>
                    <span>{entry.title}</span>
                  </div>
                  <div className="earning-route">
                    <div className="route-point">
                      <span className="point-icon from">📍</span>
                      <span className="point-text">{entry.from}</span>
                    </div>
                    <div className="route-line"></div>
                    <div className="route-point">
                      <span className="point-icon to">🏁</span>
                      <span className="point-text">{entry.to}</span>
                    </div>
                  </div>
                  <div className="earning-meta">
                    <span className="meta-item">
                      <span className="meta-icon">📏</span>
                      {entry.distance}
                    </span>
                    <span className="meta-item">
                      <span className="meta-icon">🆔</span>
                      #{entry.deliveryId}
                    </span>
                  </div>
                </div>
                <div className="earning-footer">
                  <div className="earning-breakdown">
                    <div className="breakdown-item">
                      <span className="breakdown-label">Base</span>
                      <span className="breakdown-value">₹{entry.amount}</span>
                    </div>
                    {entry.tip > 0 && (
                      <div className="breakdown-item tip">
                        <span className="breakdown-label">Tip</span>
                        <span className="breakdown-value">+₹{entry.tip}</span>
                      </div>
                    )}
                  </div>
                  <div className="earning-total">
                    <span className="total-label">Total</span>
                    <span className="total-value">₹{entry.amount + entry.tip}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Payout Info */}
        <div className="payout-info">
          <div className="payout-card">
            <div className="payout-header">
              <span className="payout-icon">🏦</span>
              <h3>Payout Information</h3>
            </div>
            <div className="payout-details">
              <div className="payout-row">
                <span className="payout-label">Payment Method</span>
                <span className="payout-value">Bank Transfer (UPI)</span>
              </div>
              <div className="payout-row">
                <span className="payout-label">Payout Schedule</span>
                <span className="payout-value">Weekly (Every Monday)</span>
              </div>
              <div className="payout-row">
                <span className="payout-label">Next Payout</span>
                <span className="payout-value highlight">₹{stats.pendingPayouts} on Feb 3, 2026</span>
              </div>
            </div>
            <button className="payout-settings-btn" onClick={() => navigate('/driver-settings')}>
              ⚙️ Update Payment Settings
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Earnings;
