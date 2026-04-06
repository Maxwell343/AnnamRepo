import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ChevronRight,
  Clock,
  Globe,
  Handshake,
  Package,
  RefreshCw,
  Truck,
  Users,
} from 'lucide-react';
import { API_ENDPOINTS } from '../../../config/api';
import { useToast } from '../../../components/ui/ToastProvider';
import '../../farmer/pages/FarmerDashboard.css';

type DonationListing = {
  id: string;
  title?: string;
  produce_name?: string;
  crop_name?: string;
  quantity?: string | number;
  farmer_name?: string;
  created_at?: string;
  expiry?: string;
  expiry_date?: string;
  hours_remaining?: number;
  urgency_status?: string;
  status?: string;
  type?: string;
  claimed_by?: { ngo_id?: string; ngo_name?: string } | string | null;
};

type ActivityItem = {
  id: string;
  title: string;
  action: string;
  icon: string;
  status: string;
  time: string;
};

type NgoStats = {
  available: number;
  claimed: number;
  in_progress: number;
  delivered: number;
  total_kg: number;
};

type UserData = {
  id: string | number;
  name: string;
  role: string;
};

const ImpactDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [priorityListings, setPriorityListings] = useState<DonationListing[]>([]);
  const [availableDonations, setAvailableDonations] = useState<DonationListing[]>([]);
  const [claimed, setClaimed] = useState<DonationListing[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [stats, setStats] = useState<NgoStats>({
    available: 0,
    claimed: 0,
    in_progress: 0,
    delivered: 0,
    total_kg: 0,
  });
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const user = useMemo<UserData | null>(() => {
    try {
      const raw = localStorage.getItem('user');
      if (!raw) return null;
      return JSON.parse(raw) as UserData;
    } catch {
      return null;
    }
  }, []);

  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (!user || user.role !== 'ngo') {
      navigate('/auth');
      return;
    }

    if (isRefresh) setRefreshing(true);
    setLoading(true);

    try {
      const [priorityRes, availableRes, claimedRes, dashboardRes, activityRes] = await Promise.all([
        fetch(API_ENDPOINTS.rescue.ngoPriority),
        fetch(API_ENDPOINTS.marketplace.ngoRescue),
        fetch(API_ENDPOINTS.claimedListings(String(user.id))),
        fetch(API_ENDPOINTS.marketplace.ngoDashboard(String(user.id))),
        fetch(API_ENDPOINTS.marketplace.ngoRescueHistory(String(user.id))),
      ]);

      if (priorityRes.ok) {
        const priorityData = await priorityRes.json();
        const raw = Array.isArray(priorityData?.listings) ? priorityData.listings : [];
        setPriorityListings(raw.filter((item: DonationListing) => (item.hours_remaining ?? 99) <= 24));
      } else {
        setPriorityListings([]);
      }

      if (availableRes.ok) {
        const availableData = await availableRes.json();
        const list = Array.isArray(availableData?.listings) ? availableData.listings : [];
        setAvailableDonations(list);
      } else {
        setAvailableDonations([]);
      }

      if (claimedRes.ok) {
        const claimedData = await claimedRes.json();
        setClaimed(Array.isArray(claimedData?.listings) ? claimedData.listings : []);
      } else {
        setClaimed([]);
      }

      if (dashboardRes.ok) {
        const dashboardData = await dashboardRes.json();
        setStats({
          available: Number(dashboardData?.stats?.available ?? dashboardData?.available ?? 0),
          claimed: Number(dashboardData?.stats?.claimed ?? dashboardData?.claimed ?? 0),
          in_progress: Number(dashboardData?.stats?.in_progress ?? dashboardData?.in_progress ?? 0),
          delivered: Number(dashboardData?.stats?.delivered ?? dashboardData?.delivered ?? 0),
          total_kg: Number(dashboardData?.stats?.total_kg ?? dashboardData?.total_kg ?? 0),
        });
      }

      if (activityRes.ok) {
        const activityData = await activityRes.json();
        setActivities(Array.isArray(activityData?.activities) ? activityData.activities : []);
      } else {
        setActivities([]);
      }
    } catch (error) {
      console.error('Failed to load NGO dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigate, user]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleClaim = async (listing: DonationListing) => {
    if (!user || claimingId) return;

    setClaimingId(listing.id);
    try {
      const query = new URLSearchParams({
        ngo_id: String(user.id),
        ngo_name: user.name || 'NGO',
      });

      const res = await fetch(`${API_ENDPOINTS.rescue.claimDonation(listing.id)}?${query.toString()}`, {
        method: 'POST',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.detail || data?.message || 'Failed to claim');
      }

      const updated: DonationListing = {
        ...(data?.listing || listing),
        status: 'in_transit',
      };

      setPriorityListings((prev) => prev.filter((item) => item.id !== listing.id));
      setAvailableDonations((prev) => prev.filter((item) => item.id !== listing.id));
      setClaimed((prev) => [updated, ...prev]);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Claim failed';
      showToast(msg, { variant: 'error', title: 'Claim Failed' });
    } finally {
      setClaimingId(null);
    }
  };

  const inTransitCount = claimed.filter((item) => ['claimed', 'assigned', 'in_transit', 'picked_up'].includes(item.status || '')).length;
  const deliveredCount = claimed.filter((item) => item.status === 'delivered').length;
  const totalClaimedKg = useMemo(() => claimed.reduce((sum, item) => sum + Number(item.quantity || 0), 0), [claimed]);
  const availableCount = stats.available || availableDonations.length;
  const claimRate = availableCount > 0 ? Math.round((stats.claimed / availableCount) * 100) : 0;

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getTypeEmoji = (type?: string) => {
    const map: Record<string, string> = {
      Vegetable: '🥦', Fruit: '🍎', Grain: '🌾', Other: '🍱',
      vegetables: '🥦', fruits: '🍎', grains: '🌾',
    };
    return type ? (map[type] || '🍱') : '🍱';
  };

  const getStatusConfig = (status?: string) => {
    const map: Record<string, { label: string; className: string }> = {
      available: { label: 'Available', className: 'status-available' },
      claimed: { label: 'Claimed', className: 'status-claimed' },
      assigned: { label: 'Assigned', className: 'status-assigned' },
      in_transit: { label: 'In Transit', className: 'status-transit' },
      picked_up: { label: 'Picked Up', className: 'status-transit' },
      delivered: { label: 'Delivered', className: 'status-delivered' },
      expired: { label: 'Expired', className: 'status-expired' },
    };
    return map[status || ''] || { label: status || 'Unknown', className: '' };
  };

  const parseExpiry = (listing: DonationListing): { text: string; urgency: string } => {
    const hours = listing.hours_remaining;
    if (typeof hours === 'number') {
      if (hours <= 0) return { text: 'Expired', urgency: 'critical' };
      if (hours <= 6) return { text: `${Math.round(hours)}h left`, urgency: 'critical' };
      if (hours <= 24) return { text: `${Math.round(hours)}h left`, urgency: 'warning' };
      return { text: `${Math.round(hours)}h left`, urgency: 'safe' };
    }

    const expiryStr = listing.expiry || listing.expiry_date;
    if (!expiryStr) return { text: 'No expiry', urgency: 'safe' };

    const now = new Date();
    const expiryDate = new Date(expiryStr);
    if (isNaN(expiryDate.getTime())) return { text: 'Unknown', urgency: 'safe' };

    const diff = expiryDate.getTime() - now.getTime();
    if (diff <= 0) return { text: 'Expired', urgency: 'critical' };
    const hoursLeft = Math.round(diff / (1000 * 60 * 60));
    if (hoursLeft <= 6) return { text: `${hoursLeft}h left`, urgency: 'critical' };
    if (hoursLeft <= 24) return { text: `${hoursLeft}h left`, urgency: 'warning' };
    return { text: `${hoursLeft}h left`, urgency: 'safe' };
  };

  const timeAgo = (dateStr: string): string => {
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
  };

  return (
    <div className="farmer-dashboard">
      <header className="fd-header">
        <div className="fd-header-left">
          <div className="fd-greeting">
            <h1>{getGreeting()}, <span className="fd-name">{user?.name || 'Partner'}</span> 🤝</h1>
            <p className="fd-date">{new Date().toLocaleDateString('en-IN', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            })}</p>
            <p className="fd-farm-info">
              <Globe size={14} /> NGO Impact Command Center
            </p>
          </div>
        </div>
        <div className="fd-header-right">
          <button
            className={`fd-refresh-btn ${refreshing ? 'spinning' : ''}`}
            onClick={() => loadDashboard(true)}
            title="Refresh dashboard"
          >
            <RefreshCw size={18} />
          </button>
          <div className="fd-avatar">
            {user?.name?.charAt(0)?.toUpperCase() || 'N'}
          </div>
        </div>
      </header>

      <section className="fd-stats-grid">
        <div className="fd-stat-card active-listings">
          <div className="fd-stat-icon-wrap">
            <Package size={22} />
          </div>
          <div className="fd-stat-body">
            <span className="fd-stat-number">{availableCount}</span>
            <span className="fd-stat-label">Available Donations</span>
          </div>
          <div className="fd-stat-badge positive">Live</div>
        </div>

        <div className="fd-stat-card claimed-card">
          <div className="fd-stat-icon-wrap blue">
            <Users size={22} />
          </div>
          <div className="fd-stat-body">
            <span className="fd-stat-number">{stats.claimed || inTransitCount}</span>
            <span className="fd-stat-label">Claimed / In Progress</span>
          </div>
          <div className="fd-stat-badge info">Active</div>
        </div>

        <div className="fd-stat-card delivered-card">
          <div className="fd-stat-icon-wrap green">
            <Truck size={22} />
          </div>
          <div className="fd-stat-body">
            <span className="fd-stat-number">{stats.delivered || deliveredCount}</span>
            <span className="fd-stat-label">Delivered</span>
          </div>
          <div className="fd-stat-badge success">Completed</div>
        </div>

        <div className="fd-stat-card total-kg-card">
          <div className="fd-stat-icon-wrap gold">
            <Handshake size={22} />
          </div>
          <div className="fd-stat-body">
            <span className="fd-stat-number">{stats.total_kg || totalClaimedKg}<small>kg</small></span>
            <span className="fd-stat-label">Total Claimed</span>
          </div>
          <div className="fd-stat-badge rate">{claimRate}% claimed</div>
        </div>
      </section>

      <div className="fd-content-grid">
        <div className="fd-right-col">
          <section className="fd-panel fd-recent-listings">
            <div className="fd-panel-header">
              <h2><AlertTriangle size={18} /> Priority Rescue</h2>
              <button className="fd-view-all" onClick={() => navigate('/impact-dashboard')}>
                View All <ChevronRight size={16} />
              </button>
            </div>
            <div className="fd-listings-list">
              {loading ? (
                <div className="fd-empty-panel">
                  <div className="fd-empty-icon">⏳</div>
                  <h4>Loading priority rescues</h4>
                  <p>Fetching listings near expiry.</p>
                </div>
              ) : priorityListings.length === 0 ? (
                <div className="fd-empty-panel">
                  <div className="fd-empty-icon">✅</div>
                  <h4>No urgent rescues</h4>
                  <p>All listings are currently safe.</p>
                </div>
              ) : (
                priorityListings.map((listing) => {
                  const expiry = parseExpiry(listing);
                  return (
                    <div key={listing.id} className="fd-listing-row rescue-alert">
                      <div className="fd-listing-icon-wrap">
                        <span className="fd-listing-emoji">{getTypeEmoji(listing.type)}</span>
                      </div>
                      <div className="fd-listing-info">
                        <h4>{listing.crop_name || listing.produce_name || listing.title || 'Donation'}</h4>
                        <div className="fd-listing-meta">
                          <span className="fd-listing-qty">📦 {listing.quantity || 'N/A'}</span>
                          <span className={`fd-listing-expiry ${expiry.urgency}`}>⏳ {expiry.text}</span>
                          <span className="fd-listing-urgent-badge"><AlertTriangle size={12} color="#dc2626" /> Urgent</span>
                        </div>
                      </div>
                      <div className="fd-listing-actions">
                        <button
                          className="fd-empty-btn"
                          onClick={() => handleClaim(listing)}
                          disabled={claimingId === listing.id}
                        >
                          {claimingId === listing.id ? 'Claiming...' : 'Claim Now'}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section className="fd-panel fd-recent-listings">
            <div className="fd-panel-header">
              <h2><Package size={18} /> Available Donations</h2>
              <button className="fd-view-all" onClick={() => navigate('/claimed-donations')}>
                View All <ChevronRight size={16} />
              </button>
            </div>
            <div className="fd-listings-list">
              {availableDonations.length === 0 ? (
                <div className="fd-empty-panel">
                  <div className="fd-empty-icon">📭</div>
                  <h4>No donations right now</h4>
                  <p>New listings will appear here as soon as they go live.</p>
                </div>
              ) : (
                availableDonations.slice(0, 6).map((listing) => {
                  const expiry = parseExpiry(listing);
                  return (
                    <div key={listing.id} className="fd-listing-row">
                      <div className="fd-listing-icon-wrap">
                        <span className="fd-listing-emoji">{getTypeEmoji(listing.type)}</span>
                      </div>
                      <div className="fd-listing-info">
                        <h4>{listing.crop_name || listing.produce_name || listing.title || 'Donation'}</h4>
                        <div className="fd-listing-meta">
                          <span className="fd-listing-qty">📦 {listing.quantity || 'N/A'}</span>
                          <span className={`fd-listing-expiry ${expiry.urgency}`}>⏳ {expiry.text}</span>
                        </div>
                      </div>
                      <span className={`fd-status-pill ${getStatusConfig(listing.status).className}`}>
                        {getStatusConfig(listing.status).label}
                      </span>
                      <div className="fd-listing-actions">
                        <button
                          className="fd-empty-btn"
                          onClick={() => handleClaim(listing)}
                          disabled={claimingId === listing.id}
                        >
                          {claimingId === listing.id ? 'Claiming...' : 'Claim'}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>

        <div className="fd-right-col">
          <section className="fd-panel fd-recent-listings">
            <div className="fd-panel-header">
              <h2><Truck size={18} /> Delivery Tracking</h2>
              <button className="fd-view-all" onClick={() => navigate('/ngo-order-tracking')}
              >
                View All <ChevronRight size={16} />
              </button>
            </div>
            <div className="fd-listings-list">
              {claimed.length === 0 ? (
                <div className="fd-empty-panel">
                  <div className="fd-empty-icon">🚚</div>
                  <h4>No active deliveries</h4>
                  <p>Claim donations to start tracking deliveries.</p>
                </div>
              ) : (
                claimed.slice(0, 6).map((listing) => {
                  const statusCfg = getStatusConfig(listing.status);
                  return (
                    <div key={listing.id} className="fd-listing-row">
                      <div className="fd-listing-icon-wrap">
                        <span className="fd-listing-emoji">{getTypeEmoji(listing.type)}</span>
                      </div>
                      <div className="fd-listing-info">
                        <h4>{listing.crop_name || listing.produce_name || listing.title || 'Donation'}</h4>
                        <div className="fd-listing-meta">
                          <span className="fd-listing-qty">📦 {listing.quantity || 'N/A'}</span>
                          <span className="fd-listing-expiry safe">🚚 {listing.status || 'in_transit'}</span>
                        </div>
                      </div>
                      <span className={`fd-status-pill ${statusCfg.className}`}>{statusCfg.label}</span>
                    </div>
                  );
                })
              )}
            </div>
          </section>

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

          <section className="fd-panel fd-tips">
            <div className="fd-panel-header">
              <h2><Globe size={18} /> Impact Summary</h2>
            </div>
            <div className="fd-summary-stats">
              <div className="fd-mini-stat">
                <span className="fd-mini-icon">✅</span>
                <div>
                  <strong>{stats.claimed || claimed.length}</strong>
                  <span>Total Claimed</span>
                </div>
              </div>
              <div className="fd-mini-stat">
                <span className="fd-mini-icon">🚚</span>
                <div>
                  <strong>{stats.delivered || deliveredCount}</strong>
                  <span>Delivered</span>
                </div>
              </div>
              <div className="fd-mini-stat">
                <span className="fd-mini-icon">⏳</span>
                <div>
                  <strong>{stats.in_progress || inTransitCount}</strong>
                  <span>Pending</span>
                </div>
              </div>
            </div>

            <div className="fd-tips-list">
              <div className="fd-tip-card">
                <Handshake size={16} className="fd-tip-icon sun" />
                <div>
                  <strong>Claim More, Deliver Faster</strong>
                  <p>Prioritize listings under 24 hours to maximize rescue impact.</p>
                </div>
              </div>
              <div className="fd-tip-card">
                <Truck size={16} className="fd-tip-icon water" />
                <div>
                  <strong>Track Active Deliveries</strong>
                  <p>Keep a close eye on in-transit donations to ensure timely handoff.</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>

      {(stats.delivered || deliveredCount) > 0 && (
        <section className="fd-impact-banner">
          <div className="fd-impact-content">
            <div className="fd-impact-emoji">🌍</div>
            <div className="fd-impact-text">
              <h3>Community Impact</h3>
              <p>
                Your team has delivered <strong>{stats.delivered || deliveredCount} rescue{(stats.delivered || deliveredCount) > 1 ? 's' : ''}</strong>
                , saving <strong>{stats.total_kg || totalClaimedKg}kg</strong> of food this season.
              </p>
            </div>
          </div>
          <button className="fd-impact-btn" onClick={() => navigate('/leaderboards')}>
            View Full Impact <ChevronRight size={16} />
          </button>
        </section>
      )}
    </div>
  );
};

export default ImpactDashboard;
