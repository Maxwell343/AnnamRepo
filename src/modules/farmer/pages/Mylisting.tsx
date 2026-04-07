import React, { useEffect, useState, useCallback } from 'react';
import RescueModal from './RescueModal';
import { useNavigate } from 'react-router-dom';
import './Mylistings.css';
import { API_ENDPOINTS } from '../../../config/api';
import { useToast } from '../../../components/ui/ToastProvider';
import {
  Package, PlusCircle, Search, Filter, Grid3X3, List,
  RefreshCw, Trash2, Edit3, Copy, Eye, X, Clock,
  MapPin, IndianRupee, Leaf, ChevronDown, AlertTriangle,
  TrendingUp, Truck, CheckCircle2, XCircle, MoreVertical, Handshake
} from 'lucide-react';

// --- Types ---
interface User {
  id: number;
  name: string;
  role: 'farmer' | 'ngo' | 'driver';
}

interface Listing {
  id: number | string;
  farmer_id: number | string;
  title: string;
  quantity: string;
  price?: number | null;
  type: 'Vegetable' | 'Fruit' | 'Grain' | 'Dairy' | 'Other';
  expiry: string;
  expiry_date?: string;
  description?: string;
  image?: string;
  created_at?: string;
  status: 'available' | 'claimed' | 'in_transit' | 'delivered' | 'expired';
  claimed_by?: {
    id: number;
    name: string;
    organization?: string;
  };
  claimed_quantity?: string;
  claimed_at?: string;
  pickup_location?: string;
  pickup_address?: string;
  rescueInfo?: any;
  urgency_status?: 'normal' | 'urgent' | 'rescue' | 'expired' | 'safe' | 'warning' | 'critical';
  hours_remaining?: number;
  donation_mode?: boolean;
  donate_available?: boolean;
  donate_available_in_hours?: number;
  hours_since_listing?: number;
}

type FilterStatus = 'all' | 'available' | 'claimed' | 'in_transit' | 'delivered' | 'expired';
type SortOption = 'newest' | 'oldest' | 'expiring_soon' | 'quantity_high' | 'quantity_low';



function getUrgencyLevel(status: string | undefined): 'critical' | 'warning' | 'safe' {
  if (status === 'rescue' || status === 'expired') return 'critical';
  if (status === 'urgent') return 'warning';
  return 'safe';
}

const TYPE_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  Vegetable: { icon: '🥬', color: '#2e7d32', bg: '#e8f5e9' },
  Fruit:     { icon: '🍎', color: '#e65100', bg: '#fff3e0' },
  Grain:     { icon: '🌾', color: '#795548', bg: '#efebe9' },
  Dairy:     { icon: '🥛', color: '#1565c0', bg: '#e3f2fd' },
  Other:     { icon: '📦', color: '#616161', bg: '#f5f5f5' },
};

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string; bg: string }> = {
  available:  { icon: <CheckCircle2 size={14} />, label: 'Available',  color: '#2e7d32', bg: '#e8f5e9' },
  claimed:    { icon: <TrendingUp size={14} />,   label: 'Claimed',    color: '#1565c0', bg: '#e3f2fd' },
  in_transit: { icon: <Truck size={14} />,        label: 'In Transit', color: '#e65100', bg: '#fff3e0' },
  delivered:  { icon: <CheckCircle2 size={14} />, label: 'Delivered',  color: '#00695c', bg: '#e0f2f1' },
  expired:    { icon: <XCircle size={14} />,      label: 'Expired',    color: '#c62828', bg: '#ffebee' },
};

// ─── COMPONENT ──────────────────────────────────────────────────────────────
const MyListings: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);

  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [deletingId, setDeletingId] = useState<number | string | null>(null);
  const [donatingId, setDonatingId] = useState<number | string | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | number | null>(null);
  const [rescueModalListing, setRescueModalListing] = useState<Listing | null>(null);

  // ── Fetch from the LISTINGS collection (same one the Add Listing form writes to)
  const fetchListings = useCallback(async () => {
    if (!user) return;
    try {
      const url = `${API_ENDPOINTS.listings}?farmer_id=${user.id}&include_expired=true`;
      const response = await fetch(url);
      const data = await response.json();

      if (response.ok) {
        const processedListings = (data.listings || []).map((listing: any) => {
          return {
            ...listing,
            status: (listing.urgency_status === 'expired' || (listing.hours_remaining ?? 1) <= 0) ? 'expired' : (listing.status || 'available'),
            rescueInfo: listing.rescue_info
          };
        });
        setListings(processedListings);
      }
    } catch (err) {
      console.error('Error fetching listings:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      if (parsedUser.role !== 'farmer') { navigate('/home'); return; }
      setUser(parsedUser);
    } else { navigate('/'); }
  }, [navigate]);

  useEffect(() => { if (user) fetchListings(); }, [user, fetchListings]);

  // ── Delete uses the same LISTINGS endpoint
  const handleDeleteListing = async (listingId: number | string) => {
    setDeletingId(listingId);
    try {
      const response = await fetch(`${API_ENDPOINTS.listings}/${listingId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to delete listing');
      }
      setListings(prev => prev.filter(l => String(l.id) !== String(listingId)));
      setShowDeleteModal(false);
      setSelectedListing(null);
    } catch (err: any) {
      showToast(`Error: ${err.message}`, { variant: 'error', title: 'Delete Failed' });
    } finally {
      setDeletingId(null);
    }
  };

  const handleEditListing = (listingId: number | string) => navigate(`/edit-listing/${listingId}`);

  const handleDonateListing = async (listingId: number | string) => {
    if (!user) return;

    setDonatingId(listingId);
    try {
      const response = await fetch(API_ENDPOINTS.rescue.action(String(listingId)), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'donate', farmer_id: String(user.id) }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || data.message || 'Failed to mark listing as donation');
      }

      await fetchListings();
      showToast('Listing marked for NGO donation successfully. NGOs can now claim it.', {
        variant: 'success',
        title: 'Donation Enabled',
      });
    } catch (err: any) {
      showToast(`Error: ${err.message}`, { variant: 'error', title: 'Donation Failed' });
    } finally {
      setDonatingId(null);
    }
  };

  const handleDuplicateListing = (listing: Listing) => {
    navigate('/listing', {
      state: {
        prefill: {
          title: listing.title,
          quantity: listing.quantity,
          type: listing.type,
          description: listing.description,
          pickup_location: listing.pickup_location || listing.pickup_address,
        },
      },
    });
  };

  // ── Filtering & sorting
  const filteredListings = listings
    .filter(listing => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!listing.title.toLowerCase().includes(q) && !listing.type.toLowerCase().includes(q) && !(listing.description?.toLowerCase().includes(q))) return false;
      }
      if (filterStatus !== 'all' && listing.status !== filterStatus) return false;
      if (filterType !== 'all' && listing.type !== filterType) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest': return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        case 'oldest': return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        case 'expiring_soon': {
          return (a.hours_remaining ?? 999) - (b.hours_remaining ?? 999);
        }
        case 'quantity_high': return parseFloat(b.quantity) - parseFloat(a.quantity);
        case 'quantity_low': return parseFloat(a.quantity) - parseFloat(b.quantity);
        default: return 0;
      }
    });

  const stats = {
    total: listings.length,
    available: listings.filter(l => l.status === 'available').length,
    claimed: listings.filter(l => l.status === 'claimed').length,
    inTransit: listings.filter(l => l.status === 'in_transit').length,
    delivered: listings.filter(l => l.status === 'delivered').length,
    expired: listings.filter(l => l.status === 'expired').length,
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // Close dropdown on outside click
  useEffect(() => {
    const close = () => setActiveDropdown(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  // ── Loading state
  if (loading) {
    return (
      <div className="ml-loading">
        <div className="ml-loading-spinner" />
        <p>Loading your listings…</p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="ml-page">

      {/* ── Hero Header ── */}
      <div className="ml-hero">
        <div className="ml-hero-content">
          <div className="ml-hero-text">
            <h1>My Listings</h1>
            <p>Manage and track all your crop listings in one place</p>
          </div>
          <button className="ml-btn-primary" onClick={() => navigate('/listing')}>
            <PlusCircle size={18} />
            New Listing
          </button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="ml-stats-row">
        {[
          { key: 'all', label: 'Total',      value: stats.total,     icon: <Package size={20} />,      accent: '#6366f1' },
          { key: 'available', label: 'Available',  value: stats.available, icon: <CheckCircle2 size={20} />, accent: '#22c55e' },
          { key: 'claimed', label: 'Claimed',    value: stats.claimed,   icon: <TrendingUp size={20} />,   accent: '#3b82f6' },
          { key: 'in_transit', label: 'In Transit', value: stats.inTransit, icon: <Truck size={20} />,        accent: '#f59e0b' },
          { key: 'delivered', label: 'Delivered',  value: stats.delivered, icon: <CheckCircle2 size={20} />, accent: '#14b8a6' },
          { key: 'expired', label: 'Expired',    value: stats.expired,   icon: <XCircle size={20} />,      accent: '#ef4444' },
        ].map(s => (
          <button
            key={s.key}
            className={`ml-stat-card ${filterStatus === s.key ? 'active' : ''}`}
            style={{ '--accent': s.accent } as React.CSSProperties}
            onClick={() => setFilterStatus(s.key as FilterStatus)}
          >
            <span className="ml-stat-icon">{s.icon}</span>
            <span className="ml-stat-value">{s.value}</span>
            <span className="ml-stat-label">{s.label}</span>
          </button>
        ))}
      </div>

      {/* ── Search & Filters Bar ── */}
      <div className="ml-toolbar">
        <div className="ml-search">
          <Search size={18} className="ml-search-icon" />
          <input
            type="text"
            placeholder="Search by name, type or description…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="ml-search-clear" onClick={() => setSearchQuery('')}><X size={16} /></button>
          )}
        </div>

        <div className="ml-toolbar-actions">
          <button className={`ml-filter-toggle ${showFilters ? 'open' : ''}`} onClick={() => setShowFilters(!showFilters)}>
            <Filter size={16} /> Filters <ChevronDown size={14} />
          </button>

          <div className="ml-view-toggle">
            <button className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')} title="Grid"><Grid3X3 size={16} /></button>
            <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')} title="List"><List size={16} /></button>
          </div>

          <button className="ml-refresh-btn" onClick={fetchListings} title="Refresh"><RefreshCw size={16} /></button>
        </div>
      </div>

      {showFilters && (
        <div className="ml-filters-panel">
          <div className="ml-filter-group">
            <label>Type</label>
            <select value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="all">All Types</option>
              <option value="Vegetable">🥬 Vegetable</option>
              <option value="Fruit">🍎 Fruit</option>
              <option value="Grain">🌾 Grain</option>
              <option value="Dairy">🥛 Dairy</option>
              <option value="Other">📦 Other</option>
            </select>
          </div>
          <div className="ml-filter-group">
            <label>Sort By</label>
            <select value={sortBy} onChange={e => setSortBy(e.target.value as SortOption)}>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="expiring_soon">Expiring Soon</option>
              <option value="quantity_high">Qty: High → Low</option>
              <option value="quantity_low">Qty: Low → High</option>
            </select>
          </div>
          {(filterStatus !== 'all' || filterType !== 'all' || searchQuery) && (
            <button className="ml-clear-filters" onClick={() => { setFilterStatus('all'); setFilterType('all'); setSearchQuery(''); }}>
              Clear All
            </button>
          )}
        </div>
      )}

      {/* ── Results Info ── */}
      <div className="ml-results-info">
        Showing <strong>{filteredListings.length}</strong> of <strong>{listings.length}</strong> listings
      </div>

      {/* ── Empty State ── */}
      {filteredListings.length === 0 ? (
        <div className="ml-empty">
          <div className="ml-empty-icon"><Leaf size={56} strokeWidth={1.2} /></div>
          <h3>{listings.length === 0 ? 'No listings yet' : 'No listings match your filters'}</h3>
          <p>{listings.length === 0 ? 'Create your first crop listing and start reaching buyers & NGOs.' : 'Try adjusting your search or filter criteria.'}</p>
          {listings.length === 0 && (
            <button className="ml-btn-primary" onClick={() => navigate('/listing')}>
              <PlusCircle size={18} /> Create First Listing
            </button>
          )}
        </div>
      ) : (

        /* ── Listing Cards ── */
        <div className={`ml-grid ${viewMode}`}>
          {filteredListings.map(listing => {
            const typeConf = TYPE_CONFIG[listing.type] || TYPE_CONFIG.Other;
            const statusConf = STATUS_CONFIG[listing.status] || STATUS_CONFIG.available;
            const pickupAddr = listing.pickup_location || listing.pickup_address || '';
            const donateAvailableInHours = listing.donate_available_in_hours ?? Math.max(0, (listing.hours_remaining ?? 999) - 24);
            const donateAvailable = Boolean(listing.donate_available) || donateAvailableInHours <= 0;
            const donateWaitHours = Math.max(0, Math.ceil(donateAvailableInHours));

            return (
              <div key={listing.id} className={`ml-card ${viewMode} ${listing.status}`}>

                {/* Image / Placeholder */}
                <div className="ml-card-img" style={{ background: typeConf.bg }}>
                  {listing.image ? (
                    <img src={listing.image} alt={listing.title} />
                  ) : (
                    <span className="ml-card-emoji">{typeConf.icon}</span>
                  )}

                  {/* Status pill */}
                  <span className="ml-status-pill" style={{ color: statusConf.color, background: statusConf.bg }}>
                    {statusConf.icon} {statusConf.label}
                  </span>

                  {/* Urgency badge */}
                  {listing.status === 'available' && listing.urgency_status === 'rescue' && (
                    <span className="ml-urgency-badge critical">
                      <AlertTriangle size={12} />
                      Rescue Mode
                    </span>
                  )}
                  {listing.status === 'available' && listing.urgency_status !== 'rescue' && listing.urgency_status !== 'normal' && (
                    <span className={`ml-urgency-badge ${listing.urgency_status === 'urgent' ? 'warning' : 'safe'}`}>
                      <AlertTriangle size={12} />
                      {listing.urgency_status === 'urgent' ? 'Urgent' : 'Expiring'}
                    </span>
                  )}

                  {/* Type tag */}
                  <span className="ml-type-tag" style={{ color: typeConf.color, background: typeConf.bg }}>
                    {listing.type}
                  </span>
                </div>

                {/* Card Body */}
                <div className="ml-card-body">
                  <h3 className="ml-card-title">{listing.title}</h3>

                  {/* Price */}
                  {listing.price != null && listing.price > 0 ? (
                    <div className="ml-card-price"><IndianRupee size={16} />{listing.price}<span>/kg</span></div>
                  ) : (
                    <div className="ml-card-price donate">🤝 Donation</div>
                  )}

                  {/* Meta */}
                  <div className="ml-card-meta">
                    <span><Package size={14} /> {listing.quantity}</span>
                    <span className={`ml-countdown ${getUrgencyLevel(listing.urgency_status)}`}>
                      <Clock size={14} /> {(listing.hours_remaining ?? 0) > 0 ? `${listing.hours_remaining}h left` : 'Expired'}
                    </span>
                  </div>

                  {pickupAddr && (
                    <div className="ml-card-location">
                      <MapPin size={14} /> <span>{pickupAddr}</span>
                    </div>
                  )}

                  {listing.description && <p className="ml-card-desc">{listing.description}</p>}

                  {/* Claimed banner */}
                  {listing.claimed_by && (
                    <div className="ml-claimed-banner">
                      <TrendingUp size={14} />
                      <span>Claimed by <strong>{listing.claimed_by.name}</strong></span>
                    </div>
                  )}

                  {/* Date */}
                  <div className="ml-card-date">{formatDate(listing.created_at)}</div>
                </div>

                {/* Card Actions */}
                <div className="ml-card-actions">
                  {listing.status === 'available' && listing.urgency_status === 'rescue' && !listing.donation_mode && (
                    <button className="ml-action-btn error" onClick={() => setRescueModalListing(listing)} style={{ color: 'red', fontWeight: 'bold' }}>
                      <AlertTriangle size={15} /> Action Needed
                    </button>
                  )}
                  {listing.status === 'available' && !listing.donation_mode && donateAvailable && (
                    <button
                      className="ml-action-btn donate"
                      onClick={() => handleDonateListing(listing.id)}
                      disabled={donatingId === listing.id}
                    >
                      <Handshake size={15} /> {donatingId === listing.id ? 'Publishing...' : 'Donate'}
                    </button>
                  )}
                  {listing.status === 'available' && !listing.donation_mode && !donateAvailable && (
                    <span className="ml-donate-wait">
                      <Clock size={13} /> Donate in {donateWaitHours}h
                    </span>
                  )}
                  <button className="ml-action-btn view" onClick={() => { setSelectedListing(listing); setShowDetailsModal(true); }}>
                    <Eye size={15} /> View
                  </button>
                  {listing.status === 'available' && (
                    <button className="ml-action-btn edit" onClick={() => handleEditListing(listing.id)}>
                      <Edit3 size={15} /> Edit
                    </button>
                  )}
                  <div className="ml-more-wrap">
                    <button
                      className="ml-action-btn more"
                      onClick={e => { e.stopPropagation(); setActiveDropdown(activeDropdown === listing.id ? null : listing.id); }}
                    >
                      <MoreVertical size={15} />
                    </button>
                    {activeDropdown === listing.id && (
                      <div className="ml-dropdown">
                        <button onClick={() => { handleDuplicateListing(listing); setActiveDropdown(null); }}>
                          <Copy size={14} /> Duplicate
                        </button>
                        {(listing.status === 'available' || listing.status === 'expired') && (
                          <button className="danger" onClick={() => { setSelectedListing(listing); setShowDeleteModal(true); setActiveDropdown(null); }}>
                            <Trash2 size={14} /> Delete
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Delete Modal ── */}
      {showDeleteModal && selectedListing && (
        <div className="ml-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="ml-modal" onClick={e => e.stopPropagation()}>
            <div className="ml-modal-icon danger"><Trash2 size={28} /></div>
            <h2>Delete Listing?</h2>
            <p className="ml-modal-sub">This will permanently remove <strong>{selectedListing.title}</strong>. This cannot be undone.</p>
            <div className="ml-modal-preview">
              <span>{TYPE_CONFIG[selectedListing.type]?.icon} {selectedListing.title}</span>
              <span>{selectedListing.quantity} · {selectedListing.type}</span>
            </div>
            <div className="ml-modal-btns">
              <button className="ml-btn-ghost" onClick={() => setShowDeleteModal(false)}>Cancel</button>
              <button
                className="ml-btn-danger"
                onClick={() => handleDeleteListing(selectedListing.id)}
                disabled={deletingId === selectedListing.id}
              >
                {deletingId === selectedListing.id ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Details Modal ── */}
      {showDetailsModal && selectedListing && (
        <div className="ml-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="ml-modal ml-modal-lg" onClick={e => e.stopPropagation()}>
            <button className="ml-modal-close" onClick={() => setShowDetailsModal(false)}><X size={20} /></button>

            <div className="ml-detail-hero" style={{ background: TYPE_CONFIG[selectedListing.type]?.bg }}>
              {selectedListing.image ? (
                <img src={selectedListing.image} alt={selectedListing.title} />
              ) : (
                <span className="ml-detail-emoji">{TYPE_CONFIG[selectedListing.type]?.icon}</span>
              )}
            </div>

            <div className="ml-detail-body">
              <span className="ml-status-pill" style={{ color: STATUS_CONFIG[selectedListing.status]?.color, background: STATUS_CONFIG[selectedListing.status]?.bg }}>
                {STATUS_CONFIG[selectedListing.status]?.icon} {STATUS_CONFIG[selectedListing.status]?.label}
              </span>

              <h2>{selectedListing.title}</h2>

              {selectedListing.price != null && selectedListing.price > 0 ? (
                <div className="ml-detail-price"><IndianRupee size={20} />{selectedListing.price}<span>/kg</span></div>
              ) : (
                <div className="ml-detail-price donate">🤝 Donation</div>
              )}

              <div className="ml-detail-grid">
                <div className="ml-detail-item">
                  <span className="ml-detail-label">Type</span>
                  <span className="ml-detail-value">{TYPE_CONFIG[selectedListing.type]?.icon} {selectedListing.type}</span>
                </div>
                <div className="ml-detail-item">
                  <span className="ml-detail-label">Quantity</span>
                  <span className="ml-detail-value">{selectedListing.quantity}</span>
                </div>
                <div className="ml-detail-item">
                  <span className="ml-detail-label">Expires</span>
                  <span className={`ml-detail-value ${getUrgencyLevel(selectedListing.urgency_status)}`}>
                    {(selectedListing.hours_remaining ?? 0) > 0 ? `${selectedListing.hours_remaining}h left` : 'Expired'}
                  </span>
                </div>
                <div className="ml-detail-item">
                  <span className="ml-detail-label">Listed On</span>
                  <span className="ml-detail-value">{formatDate(selectedListing.created_at)}</span>
                </div>
              </div>

              {(selectedListing.pickup_location || selectedListing.pickup_address) && (
                <div className="ml-detail-section">
                  <h4><MapPin size={16} /> Pickup Location</h4>
                  <p>{selectedListing.pickup_location || selectedListing.pickup_address}</p>
                </div>
              )}

              {selectedListing.description && (
                <div className="ml-detail-section">
                  <h4>Description</h4>
                  <p>{selectedListing.description}</p>
                </div>
              )}

              {selectedListing.claimed_by && (
                <div className="ml-detail-section claimed">
                  <h4>🤝 Claim Information</h4>
                  <div className="ml-detail-grid">
                    <div className="ml-detail-item">
                      <span className="ml-detail-label">Claimed By</span>
                      <span className="ml-detail-value">{selectedListing.claimed_by.name}</span>
                    </div>
                    {selectedListing.claimed_by.organization && (
                      <div className="ml-detail-item">
                        <span className="ml-detail-label">Organization</span>
                        <span className="ml-detail-value">{selectedListing.claimed_by.organization}</span>
                      </div>
                    )}
                    {selectedListing.claimed_quantity && (
                      <div className="ml-detail-item">
                        <span className="ml-detail-label">Qty Claimed</span>
                        <span className="ml-detail-value">{selectedListing.claimed_quantity}</span>
                      </div>
                    )}
                    {selectedListing.claimed_at && (
                      <div className="ml-detail-item">
                        <span className="ml-detail-label">Claimed At</span>
                        <span className="ml-detail-value">{formatDate(selectedListing.claimed_at)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="ml-modal-btns">
              <button className="ml-btn-ghost" onClick={() => setShowDetailsModal(false)}>Close</button>
              {selectedListing.status === 'available' && (
                <button className="ml-btn-primary" onClick={() => { setShowDetailsModal(false); handleEditListing(selectedListing.id); }}>
                  <Edit3 size={16} /> Edit Listing
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {rescueModalListing && (
        <RescueModal
          listing={rescueModalListing as any}
          isOpen={true}
          onClose={() => setRescueModalListing(null)}
          onActionComplete={(_updated) => {
            fetchListings();
            setRescueModalListing(null);
          }}
        />
      )}
    </div>
  );
};

export default MyListings;
