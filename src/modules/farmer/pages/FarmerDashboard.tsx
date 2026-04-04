import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './FarmerDashboard.css';
import { API_ENDPOINTS } from '../../../config/api';
import {
  Package, PlusCircle, BarChart3, Settings, Clock, Wheat,
  TrendingUp, Users, Truck, AlertTriangle, Edit3, Trash2,
  ChevronRight, RefreshCw, Leaf, Droplets, Sun, ArrowUpRight, Award, Bell
} from 'lucide-react';

// --- Types ---
interface User {
  id: number;
  name: string;
  role: string;
  email?: string;
  phone?: string;
}

interface DashboardStats {
  total: number;
  available: number;
  claimed: number;
  assigned: number;
  delivered: number;
  expired: number;
  total_kg: number;
  claim_rate: number;
  active: number;
}

interface Listing {
  id: string;
  title: string;
  quantity: string;
  type: string;
  status: string;
  expiry?: string;
  expiry_date?: string;
  created_at?: string;
  updated_at?: string;
  description?: string;
  image?: string;
  farmer_name?: string;
  claimed_by?: any;
}

interface Activity {
  id: string;
  title: string;
  action: string;
  icon: string;
  status: string;
  quantity: string;
  type: string;
  time: string;
}

// --- Expiry Helpers ---
function parseExpiry(expiryStr: string | undefined, createdAt?: string): { text: string; urgency: string } {
  if (!expiryStr) return { text: 'No expiry', urgency: 'safe' };

  let expiryDate: Date | null = null;
  const now = new Date();

  if (!isNaN(Date.parse(expiryStr))) {
    expiryDate = new Date(expiryStr);
  } else {
    const match = expiryStr.match(/(\d+)\s*(day|hour|minute)s?/i);
    if (match) {
      const value = parseInt(match[1]);
      const unit = match[2].toLowerCase();
      let base = now;
      if (createdAt) {
        try { base = new Date(createdAt.replace(' ', 'T')); } catch { base = now; }
      }
      expiryDate = new Date(base);
      if (unit === 'day') expiryDate.setDate(expiryDate.getDate() + value);
      else if (unit === 'hour') expiryDate.setHours(expiryDate.getHours() + value);
      else if (unit === 'minute') expiryDate.setMinutes(expiryDate.getMinutes() + value);
    }
  }

  if (!expiryDate || isNaN(expiryDate.getTime())) return { text: 'Unknown', urgency: 'safe' };

  const diff = expiryDate.getTime() - now.getTime();
  if (diff <= 0) return { text: 'Expired', urgency: 'critical' };

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 1) return { text: `${days}d ${hours}h left`, urgency: 'safe' };
  if (days === 1 || hours > 6) return { text: `${days}d ${hours}h left`, urgency: 'warning' };
  return { text: `${hours}h left`, urgency: 'critical' };
}

function timeAgo(dateStr: string): string {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr.replace(' ', 'T'));
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

const FarmerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    total: 0, available: 0, claimed: 0, assigned: 0,
    delivered: 0, expired: 0, total_kg: 0, claim_rate: 0, active: 0
  });
  const [recentListings, setRecentListings] = useState<Listing[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Farm details from localStorage
  const farmName = localStorage.getItem('farmName') || '';
  const farmLocation = localStorage.getItem('farmLocation') || '';

  const fetchDashboard = useCallback(async (userId: number, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch(API_ENDPOINTS.farmerDashboard(userId.toString()));
      const data = await res.json();
      if (res.ok) {
        setStats(data.stats || stats);
        setRecentListings(data.recent_listings || []);
        setActivities(data.activities || []);
      }
    } catch (err) {
      console.error('Error fetching farmer dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed?.role === 'farmer' && parsed.id && parsed.name) {
          setUser(parsed);
          fetchDashboard(parsed.id);
        } else {
          navigate('/home');
        }
      } catch {
        navigate('/auth');
      }
    } else {
      navigate('/auth');
    }
  }, [navigate, fetchDashboard]);

  const handleDelete = async (listingId: string) => {
    if (!window.confirm('Delete this listing?')) return;
    try {
      const res = await fetch(`${API_ENDPOINTS.listings}/${listingId}`, { method: 'DELETE' });
      if (res.ok) {
        setRecentListings(prev => prev.filter(l => l.id !== listingId));
        if (user) fetchDashboard(user.id);
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getTypeEmoji = (type: string) => {
    const map: Record<string, string> = {
      'Vegetable': '🥦', 'Fruit': '🍎', 'Grain': '🌾', 'Other': '🍱',
      'vegetables': '🥦', 'fruits': '🍎', 'grains': '🌾'
    };
    return map[type] || '🍱';
  };

  const getStatusConfig = (status: string) => {
    const map: Record<string, { label: string; className: string }> = {
      available: { label: 'Available', className: 'status-available' },
      claimed: { label: 'Claimed', className: 'status-claimed' },
      assigned: { label: 'Assigned', className: 'status-assigned' },
      in_transit: { label: 'In Transit', className: 'status-transit' },
      delivered: { label: 'Delivered', className: 'status-delivered' },
      expired: { label: 'Expired', className: 'status-expired' },
    };
    return map[status] || { label: status, className: '' };
  };

  if (loading) {
    return (
      <div className="fd-loading">
        <div className="fd-loading-spinner" />
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  if (!user) return null;

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <div className="farmer-dashboard">
      {/* ===== WELCOME HEADER ===== */}
      <header className="fd-header">
        <div className="fd-header-left">
          <div className="fd-greeting">
            <h1>{getGreeting()}, <span className="fd-name">{user.name}</span> 🌱</h1>
            <p className="fd-date">{today}</p>
            {farmName && (
              <p className="fd-farm-info">
                <Wheat size={14} />
                <span>{farmName}</span>
                {farmLocation && <> · <span>{farmLocation}</span></>}
              </p>
            )}
          </div>
        </div>
        <div className="fd-header-right">
          <button
            className={`fd-refresh-btn ${refreshing ? 'spinning' : ''}`}
            onClick={() => fetchDashboard(user.id, true)}
            title="Refresh dashboard"
          >
            <RefreshCw size={18} />
          </button>
          <div className="fd-avatar">
            {user.name.charAt(0).toUpperCase()}
          </div>
        </div>
      </header>

      {/* ===== QUICK ACTIONS ===== */}
      <section className="fd-quick-actions">
        <button className="fd-action-card primary" onClick={() => navigate('/listing')}>
          <div className="fd-action-icon"><PlusCircle size={24} /></div>
          <span>Add Listing</span>
        </button>
        <button className="fd-action-card secondary" onClick={() => navigate('/my-listings')}>
          <div className="fd-action-icon"><Package size={24} /></div>
          <span>My Listings</span>
        </button>
        <button className="fd-action-card accent" onClick={() => navigate('/analytics')}>
          <div className="fd-action-icon"><BarChart3 size={24} /></div>
          <span>Analytics</span>
        </button>
        <button className="fd-action-card" style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }} onClick={() => navigate('/farmer-rewards')}>
          <div className="fd-action-icon" style={{ color: '#16a34a' }}><Award size={24} /></div>
          <span>Impact & Rewards</span>
        </button>
        <button className="fd-action-card neutral" onClick={() => navigate('/farmer/complete-profile')}>
          <div className="fd-action-icon"><Settings size={24} /></div>
          <span>Settings</span>
        </button>
      </section>

      {/* ===== STATS CARDS ===== */}
      <section className="fd-stats-grid">
        <div className="fd-stat-card active-listings" onClick={() => navigate('/my-listings')}>
          <div className="fd-stat-icon-wrap">
            <Package size={22} />
          </div>
          <div className="fd-stat-body">
            <span className="fd-stat-number">{stats.available}</span>
            <span className="fd-stat-label">Active Listings</span>
          </div>
          <div className="fd-stat-badge positive">Live</div>
        </div>

        <div className="fd-stat-card claimed-card">
          <div className="fd-stat-icon-wrap blue">
            <Users size={22} />
          </div>
          <div className="fd-stat-body">
            <span className="fd-stat-number">{stats.claimed + stats.assigned}</span>
            <span className="fd-stat-label">Claimed / In Progress</span>
          </div>
          <div className="fd-stat-badge info">Awaiting</div>
        </div>

        <div className="fd-stat-card delivered-card">
          <div className="fd-stat-icon-wrap green">
            <Truck size={22} />
          </div>
          <div className="fd-stat-body">
            <span className="fd-stat-number">{stats.delivered}</span>
            <span className="fd-stat-label">Delivered</span>
          </div>
          <div className="fd-stat-badge success">Completed</div>
        </div>

        <div className="fd-stat-card total-kg-card">
          <div className="fd-stat-icon-wrap gold">
            <TrendingUp size={22} />
          </div>
          <div className="fd-stat-body">
            <span className="fd-stat-number">{stats.total_kg}<small>kg</small></span>
            <span className="fd-stat-label">Total Donated</span>
          </div>
          <div className="fd-stat-badge rate">{stats.claim_rate}% claimed</div>
        </div>
      </section>

      {/* ===== MAIN CONTENT GRID ===== */}
      <div className="fd-content-grid">
        {/* --- Recent Listings Panel --- */}
        <section className="fd-panel fd-recent-listings">
          <div className="fd-panel-header">
            <h2><Package size={18} /> Recent Listings</h2>
            <button className="fd-view-all" onClick={() => navigate('/my-listings')}>
              View All <ChevronRight size={16} />
            </button>
          </div>
          <div className="fd-listings-list">
            {recentListings.length === 0 ? (
              <div className="fd-empty-panel">
                <div className="fd-empty-icon">📭</div>
                <h4>No listings yet</h4>
                <p>Create your first listing to start donating!</p>
                <button className="fd-empty-btn" onClick={() => navigate('/listing')}>
                  <PlusCircle size={16} /> Create Listing
                </button>
              </div>
            ) : (
              recentListings.map(listing => {
                const expiry = parseExpiry(listing.expiry || listing.expiry_date, listing.created_at);
                const statusCfg = getStatusConfig(listing.status);
                return (
                  <div key={listing.id} className={`fd-listing-row ${(listing as any).rescue_info?.urgencyStatus === 'urgent' && !(listing as any).rescue_info.donationMode ? 'rescue-alert' : ''}`}>
                    <div className="fd-listing-icon-wrap">
                      <span className="fd-listing-emoji">{getTypeEmoji(listing.type)}</span>
                    </div>
                    <div className="fd-listing-info">
                      <h4>{listing.title}</h4>
                      <div className="fd-listing-meta">
                        <span className="fd-listing-qty">📦 {listing.quantity}</span>
                        <span className={`fd-listing-expiry ${expiry.urgency}`}>⏳ {expiry.text}</span>
                        {(listing as any).rescue_info?.urgencyStatus === 'urgent' && !(listing as any).rescue_info.donationMode && (
                          <span className="fd-listing-urgent-badge"><AlertTriangle size={12} color="#dc2626"/> Action Needed</span>
                        )}
                      </div>
                    </div>
                    <span className={`fd-status-pill ${statusCfg.className}`}>{statusCfg.label}</span>
                    <div className="fd-listing-actions">
                      <button
                        className="fd-icon-btn edit"
                        onClick={() => navigate(`/edit-listing/${listing.id}`)}
                        title="Edit"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        className="fd-icon-btn delete"
                        onClick={() => handleDelete(listing.id)}
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* --- Right Column --- */}
        <div className="fd-right-col">
          {/* Activity Timeline */}
          <section className="fd-panel fd-activity">
            <div className="fd-panel-header">
              <h2><Clock size={18} /> Activity</h2>
              <button className="fd-view-all" onClick={() => navigate('/history')}>
                History <ChevronRight size={16} />
              </button>
            </div>
            <div className="fd-timeline">
              {activities.length === 0 ? (
                <p className="fd-no-activity">No recent activity</p>
              ) : (
                activities.slice(0, 6).map((act, i) => (
                  <div key={`${act.id}-${i}`} className="fd-timeline-item">
                    <div className={`fd-timeline-dot ${act.status}`}>
                      <span>{act.icon}</span>
                    </div>
                    <div className="fd-timeline-content">
                      <p className="fd-timeline-action">
                        <strong>{act.action}</strong> — {act.title}
                      </p>
                      <span className="fd-timeline-time">{timeAgo(act.time)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Quick Summary & Tips */}
          <section className="fd-panel fd-tips">
            <div className="fd-panel-header">
              <h2><Leaf size={18} /> Quick Summary</h2>
            </div>
            <div className="fd-summary-stats">
              <div className="fd-mini-stat">
                <span className="fd-mini-icon">📊</span>
                <div>
                  <strong>{stats.total}</strong>
                  <span>Total Listings</span>
                </div>
              </div>
              <div className="fd-mini-stat">
                <span className="fd-mini-icon">⏰</span>
                <div>
                  <strong>{stats.expired}</strong>
                  <span>Expired</span>
                </div>
              </div>
              <div className="fd-mini-stat">
                <span className="fd-mini-icon">🎯</span>
                <div>
                  <strong>{stats.claim_rate}%</strong>
                  <span>Claim Rate</span>
                </div>
              </div>
            </div>

            <div className="fd-tips-list">
              <div className="fd-tip-card">
                <Sun size={16} className="fd-tip-icon sun" />
                <div>
                  <strong>Seasonal Tip</strong>
                  <p>March is peak season for leafy greens. List surplus early for maximum impact!</p>
                </div>
              </div>
              <div className="fd-tip-card">
                <Droplets size={16} className="fd-tip-icon water" />
                <div>
                  <strong>Storage Tip</strong>
                  <p>Store produce in cool, dry conditions to extend freshness before pickup.</p>
                </div>
              </div>
              {stats.expired > 0 && (
                <div className="fd-tip-card warning">
                  <AlertTriangle size={16} className="fd-tip-icon alert" />
                  <div>
                    <strong>Reduce Waste</strong>
                    <p>You have {stats.expired} expired listing{stats.expired > 1 ? 's' : ''}. Set shorter expiry times for perishable items.</p>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* ===== IMPACT BANNER ===== */}
      {stats.delivered > 0 && (
        <section className="fd-impact-banner">
          <div className="fd-impact-content">
            <div className="fd-impact-emoji">🌍</div>
            <div className="fd-impact-text">
              <h3>Your Impact So Far</h3>
              <p>You've helped deliver <strong>{stats.delivered} donation{stats.delivered > 1 ? 's' : ''}</strong> totaling <strong>{stats.total_kg}kg</strong> of food — reducing waste and feeding communities!</p>
            </div>
          </div>
          <button className="fd-impact-btn" onClick={() => navigate('/analytics')}>
            View Full Impact <ArrowUpRight size={16} />
          </button>
        </section>
      )}
    </div>
  );
};

export default FarmerDashboard;
