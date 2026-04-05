import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Globe,
  Handshake,
  Package,
  Truck,
  CheckCircle,
  Clock3,
  User,
} from 'lucide-react';
import { API_ENDPOINTS } from '../../../config/api';
import './ImpactDashboard.css';

type DonationListing = {
  id: string;
  title?: string;
  produce_name?: string;
  crop_name?: string;
  quantity?: string | number;
  farmer_name?: string;
  hours_remaining?: number;
  urgency_status?: string;
  status?: string;
  claimed_by?: { ngo_id?: string; ngo_name?: string } | string | null;
};

type UserData = {
  id: string | number;
  name: string;
  role: string;
};

const ImpactDashboard: React.FC = () => {
  const navigate = useNavigate();

  const [listings, setListings] = useState<DonationListing[]>([]);
  const [claimed, setClaimed] = useState<DonationListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const user = useMemo<UserData | null>(() => {
    try {
      const raw = localStorage.getItem('user');
      if (!raw) return null;
      return JSON.parse(raw) as UserData;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!user || user.role !== 'ngo') {
        navigate('/auth');
        return;
      }

      setLoading(true);
      try {
        const [priorityRes, claimedRes] = await Promise.all([
          fetch(API_ENDPOINTS.rescue.ngoPriority),
          fetch(API_ENDPOINTS.claimedListings(String(user.id))),
        ]);

        if (priorityRes.ok) {
          const priorityData = await priorityRes.json();
          setListings(Array.isArray(priorityData?.listings) ? priorityData.listings : []);
        }

        if (claimedRes.ok) {
          const claimedData = await claimedRes.json();
          setClaimed(Array.isArray(claimedData?.listings) ? claimedData.listings : []);
        }
      } catch (error) {
        console.error('Failed to load NGO dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [navigate, user]);

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

      setListings((prev) => prev.filter((item) => item.id !== listing.id));
      setClaimed((prev) => [updated, ...prev]);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Claim failed';
      alert(msg);
    } finally {
      setClaimingId(null);
    }
  };

  const inTransitCount = claimed.filter((item) => ['claimed', 'assigned', 'in_transit', 'picked_up'].includes(item.status || '')).length;
  const deliveredCount = claimed.filter((item) => item.status === 'delivered').length;

  return (
    <div className="impact-dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <button className="back-btn" onClick={() => navigate('/home')}>
              <ArrowLeft size={16} /> Dashboard
            </button>
            <div className="header-title">
              <h1><Globe size={24} /> NGO Impact Dashboard</h1>
              <p>Rescue listings and donation operations</p>
            </div>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <section className="metrics-section">
          <h2>Donation Operations</h2>
          <div className="metrics-grid">
            <div className="stat-card">
              <div className="stat-icon"><Package size={20} /></div>
              <div className="stat-content">
                <div className="stat-value">{listings.length}</div>
                <div className="stat-label">Available Donations</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon"><Truck size={20} /></div>
              <div className="stat-content">
                <div className="stat-value">{inTransitCount}</div>
                <div className="stat-label">In Transit</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon"><CheckCircle size={20} /></div>
              <div className="stat-content">
                <div className="stat-value">{deliveredCount}</div>
                <div className="stat-label">Delivered</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon"><Handshake size={20} /></div>
              <div className="stat-content">
                <div className="stat-value">{claimed.length}</div>
                <div className="stat-label">Claimed Total</div>
              </div>
            </div>
          </div>
        </section>

        <section className="activity-section" style={{ marginTop: '1.5rem' }}>
          <h2>Available Donations</h2>
          <div className="activity-feed">
            {loading ? (
              <p style={{ padding: '1rem', color: '#6b7280' }}>Loading...</p>
            ) : listings.length === 0 ? (
              <p style={{ padding: '1rem', color: '#6b7280' }}>No priority listings right now.</p>
            ) : (
              listings.map((item) => {
                const name = item.crop_name || item.produce_name || item.title || 'Donation';
                return (
                  <div key={item.id} className="activity-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'center' }}>
                      <strong>{name}</strong>
                      <button
                        onClick={() => handleClaim(item)}
                        disabled={claimingId === item.id}
                        style={{ border: 'none', borderRadius: 8, padding: '0.45rem 0.7rem', background: '#1d4ed8', color: '#fff', cursor: 'pointer' }}
                      >
                        {claimingId === item.id ? 'Claiming...' : 'Claim Donation'}
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', color: '#6b7280', fontSize: '0.9rem' }}>
                      <span><Package size={14} /> Qty: {item.quantity || 'N/A'}</span>
                      <span><User size={14} /> Farmer: {item.farmer_name || 'Unknown'}</span>
                      <span><Clock3 size={14} /> {Math.max(0, Math.round(item.hours_remaining || 0))}h remaining</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default ImpactDashboard;
