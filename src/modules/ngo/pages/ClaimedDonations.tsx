import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, UserCheck, Truck, CheckCircle, Leaf, Apple, Wheat, Package, Handshake, ArrowLeft, RefreshCw, Search, X, MailOpen, User, Calendar, MapPin, Car, Phone, Eye, PartyPopper, ClipboardList, Check } from 'lucide-react';
import './ClaimedDonations.css';
import { API_ENDPOINTS } from '../../../config/api';

interface User {
  id: string;
  name: string;
  role: 'farmer' | 'ngo' | 'driver';
}

interface ClaimedDonation {
  id: string;
  title: string;
  quantity: string;
  type: 'Vegetable' | 'Fruit' | 'Grain' | 'Other';
  expiry_date?: string;
  expiry?: string;
  description?: string;
  image?: string;
  created_at?: string;
  status: 'claimed' | 'assigned' | 'in_transit' | 'delivered';
  farmer_id: string;
  farmer_name?: string;
  pickup_address?: string;
  claimed_at?: string;
  claimed_quantity?: string;
  delivery_date?: string;
  driver_name?: string;
  driver_phone?: string;
}

type FilterStatus = 'all' | 'claimed' | 'assigned' | 'in_transit' | 'delivered';
type SortOption = 'newest' | 'oldest' | 'delivery_soon';

const ClaimedDonations: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [donations, setDonations] = useState<ClaimedDonation[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileChecking, setProfileChecking] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [selectedDonation, setSelectedDonation] = useState<ClaimedDonation | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Fetch claimed donations
  const fetchClaimedDonations = useCallback(async () => {
    if (!user) return;
    
    try {
      const response = await fetch(API_ENDPOINTS.claimedListings(String(user.id)));
      const data = await response.json();
      
      console.log('Claimed donations response:', data);
      
      if (response.ok) {
        // Map the backend data to our interface
        const mappedDonations = (data.listings || []).map((listing: any) => ({
          id: listing.id,
          title: listing.title,
          quantity: listing.claimed_by?.claim_quantity || listing.quantity,
          type: listing.type,
          expiry_date: listing.expiry_date || listing.expiry,
          description: listing.description,
          image: listing.image,
          created_at: listing.created_at,
          status: listing.status || 'claimed',
          farmer_id: listing.farmer_id,
          farmer_name: listing.farmer_name,
          pickup_address: listing.pickup_address || listing.pickup_location,
          claimed_at: listing.claimed_at,
          claimed_quantity: listing.claimed_by?.claim_quantity,
          delivery_date: listing.delivered_at,
          driver_name: listing.assigned_driver?.driver_name,
          driver_phone: listing.assigned_driver?.driver_phone
        }));
        setDonations(mappedDonations);
      }
    } catch (err) {
      console.error('Error fetching claimed donations:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      if (parsedUser.role !== 'ngo') {
        navigate('/home');
        return;
      }
      setUser(parsedUser);

      // Check if NGO profile is complete before allowing access
      const checkProfile = async () => {
        try {
          const response = await fetch(API_ENDPOINTS.ngoSettings(parsedUser.id.toString()));
          const data = await response.json();

          const adminName = data?.admin_name || parsedUser.name || '';
          const adminPhone = data?.admin_phone || '';
          const orgName = data?.organization_name || localStorage.getItem('ngoName') || '';
          const address = data?.address || '';

          if (!adminName.trim() || !adminPhone.trim() || !orgName.trim() || !address.trim()) {
            const missing: string[] = [];
            if (!adminName.trim()) missing.push('Admin Name');
            if (!adminPhone.trim()) missing.push('Phone Number');
            if (!orgName.trim()) missing.push('Organization Name');
            if (!address.trim()) missing.push('Address');

            alert(`Please complete your organization profile before accessing donations.\n\nMissing fields: ${missing.join(', ')}`);
            navigate('/ngo-settings', { state: { returnTo: '/claimed-donations', incompleteProfile: true } });
            return;
          }
        } catch (err) {
          // Fallback: check localStorage
          const ngoName = localStorage.getItem('ngoName') || '';
          if (!parsedUser.name?.trim() || !ngoName.trim()) {
            alert('Please complete your organization profile before accessing donations.');
            navigate('/ngo-settings', { state: { returnTo: '/claimed-donations', incompleteProfile: true } });
            return;
          }
        } finally {
          setProfileChecking(false);
        }
      };

      checkProfile();
    } else {
      navigate('/');
      return;
    }
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchClaimedDonations();
      
      // Auto-refresh every 10 seconds to sync with driver updates
      const interval = setInterval(() => {
        fetchClaimedDonations();
      }, 10000);
      
      return () => clearInterval(interval);
    }
  }, [user, fetchClaimedDonations]);

  // Format date
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status icon
  const getStatusIcon = (status: string): React.ReactNode => {
    switch (status) {
      case 'claimed': return <Clock size={16} />;
      case 'assigned': return <UserCheck size={16} />;
      case 'in_transit': return <Truck size={16} />;
      case 'delivered': return <CheckCircle size={16} />;
      default: return <Clock size={16} />;
    }
  };

  // Get status label - show "In Progress" until driver delivers
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'claimed': return 'Awaiting Driver';
      case 'assigned': return 'Driver Assigned';
      case 'in_transit': return 'In Transit';
      case 'delivered': return 'Delivered';
      default: return 'In Progress';
    }
  };

  // Get type emoji
  const getTypeEmoji = (type: string): React.ReactNode => {
    switch (type) {
      case 'Vegetable': return <Leaf size={16} />;
      case 'Fruit': return <Apple size={16} />;
      case 'Grain': return <Wheat size={16} />;
      default: return <Package size={16} />;
    }
  };

  // Filter and sort donations
  const filteredDonations = donations
    .filter(donation => {
      const matchesSearch = 
        donation.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        donation.farmer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        donation.type.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = filterStatus === 'all' || donation.status === filterStatus;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.claimed_at || b.created_at || 0).getTime() - 
                 new Date(a.claimed_at || a.created_at || 0).getTime();
        case 'oldest':
          return new Date(a.claimed_at || a.created_at || 0).getTime() - 
                 new Date(b.claimed_at || b.created_at || 0).getTime();
        case 'delivery_soon':
          return new Date(a.delivery_date || '9999').getTime() - 
                 new Date(b.delivery_date || '9999').getTime();
        default:
          return 0;
      }
    });

  // Stats
  const stats = {
    total: donations.length,
    claimed: donations.filter(d => d.status === 'claimed').length,
    assigned: donations.filter(d => d.status === 'assigned').length,
    inTransit: donations.filter(d => d.status === 'in_transit').length,
    delivered: donations.filter(d => d.status === 'delivered').length
  };

  // View donation details
  const viewDetails = (donation: ClaimedDonation) => {
    setSelectedDonation(donation);
    setShowDetailsModal(true);
  };

  if (profileChecking) {
    return (
      <div className="claimed-donations-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Checking profile...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="claimed-donations-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your claimed donations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="claimed-donations-page">
      {/* Header */}
      <header className="page-header">
        <div className="header-left">
          <button className="back-btn" onClick={() => navigate('/home')}>
            <ArrowLeft size={16} /> Back
          </button>
          <div className="header-title">
            <h1><Handshake size={24} /> Claimed Donations</h1>
            <p>Track and manage your claimed food donations</p>
          </div>
        </div>
        <button className="refresh-btn" onClick={fetchClaimedDonations}>
          <RefreshCw size={16} /> Refresh
        </button>
      </header>

      {/* Stats Cards */}
      <section className="stats-section">
        <div className="stat-card total">
          <span className="stat-icon"><Package size={20} /></span>
          <div className="stat-info">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Total Claims</span>
          </div>
        </div>
        <div className="stat-card claimed">
          <span className="stat-icon"><Clock size={20} /></span>
          <div className="stat-info">
            <span className="stat-value">{stats.claimed}</span>
            <span className="stat-label">Awaiting Driver</span>
          </div>
        </div>
        <div className="stat-card assigned">
          <span className="stat-icon"><UserCheck size={20} /></span>
          <div className="stat-info">
            <span className="stat-value">{stats.assigned}</span>
            <span className="stat-label">Driver Assigned</span>
          </div>
        </div>
        <div className="stat-card in-transit">
          <span className="stat-icon"><Truck size={20} /></span>
          <div className="stat-info">
            <span className="stat-value">{stats.inTransit}</span>
            <span className="stat-label">In Transit</span>
          </div>
        </div>
        <div className="stat-card delivered">
          <span className="stat-icon"><PartyPopper size={20} /></span>
          <div className="stat-info">
            <span className="stat-value">{stats.delivered}</span>
            <span className="stat-label">Delivered</span>
          </div>
        </div>
      </section>

      {/* Filters Section */}
      <section className="filters-section">
        <div className="search-box">
          <span className="search-icon"><Search size={16} /></span>
          <input
            type="text"
            placeholder="Search donations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search" onClick={() => setSearchQuery('')}><X size={14} /></button>
          )}
        </div>

        <div className="filter-controls">
          <div className="filter-group">
            <label>Status:</label>
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
            >
              <option value="all">All Status</option>
              <option value="claimed">Awaiting Driver</option>
              <option value="assigned">Driver Assigned</option>
              <option value="in_transit">In Transit</option>
              <option value="delivered">Delivered</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Sort by:</label>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value as SortOption)}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="delivery_soon">Delivery Soon</option>
            </select>
          </div>
        </div>
      </section>

      {/* Donations List */}
      <section className="donations-section">
        {filteredDonations.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon"><MailOpen size={48} /></span>
            <h3>
              {donations.length === 0 
                ? "No claimed donations yet" 
                : "No donations match your filters"}
            </h3>
            <p>
              {donations.length === 0 
                ? "Browse available listings and claim donations to help those in need!" 
                : "Try adjusting your search or filter criteria"}
            </p>
            {donations.length === 0 && (
              <button 
                className="browse-btn"
                onClick={() => navigate('/home')}
              >
                <Search size={16} /> Browse Available Donations
              </button>
            )}
          </div>
        ) : (
          <div className="donations-grid">
            {filteredDonations.map((donation) => (
              <div 
                key={donation.id} 
                className={`donation-card ${donation.status}`}
              >
                {/* Status Badge */}
                <div className={`status-badge ${donation.status}`}>
                  {getStatusIcon(donation.status)} {getStatusLabel(donation.status)}
                </div>

                {/* Card Image */}
                <div className="donation-image">
                  {donation.image ? (
                    <img src={donation.image} alt={donation.title} />
                  ) : (
                    <div className="donation-emoji">
                      {getTypeEmoji(donation.type)}
                    </div>
                  )}
                  <span className="type-tag">{donation.type}</span>
                </div>

                {/* Card Content */}
                <div className="donation-content">
                  <h3 className="donation-title">{donation.title}</h3>
                  
                  <div className="donation-meta">
                    <div className="meta-item">
                      <span className="meta-icon"><Package size={14} /></span>
                      <span className="meta-value">{donation.quantity}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-icon"><User size={14} /></span>
                      <span className="meta-value">{donation.farmer_name || 'Unknown Farmer'}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-icon"><Calendar size={14} /></span>
                      <span className="meta-value">{formatDate(donation.claimed_at)}</span>
                    </div>
                  </div>

                  {donation.pickup_address && (
                    <div className="pickup-location">
                      <span className="location-icon"><MapPin size={14} /></span>
                      <span className="location-text">{donation.pickup_address}</span>
                    </div>
                  )}

                  {/* Driver Info (for assigned and in_transit) */}
                  {(donation.status === 'assigned' || donation.status === 'in_transit') && donation.driver_name && (
                    <div className="driver-info">
                      <span className="driver-icon"><Car size={14} /></span>
                      <div className="driver-details">
                        <span className="driver-name">{donation.driver_name}</span>
                        {donation.driver_phone && (
                          <a href={`tel:${donation.driver_phone}`} className="driver-phone">
                            <Phone size={12} /> {donation.driver_phone}
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="donation-actions">
                    <button 
                      className="action-btn view"
                      onClick={() => viewDetails(donation)}
                    >
                      <Eye size={14} /> View Details
                    </button>
                    {(donation.status === 'assigned' || donation.status === 'in_transit') && (
                      <button 
                        className="action-btn track"
                        onClick={() => navigate(`/order-tracking/${donation.id}`)}
                      >
                        <MapPin size={14} /> Track
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Details Modal */}
      {showDetailsModal && selectedDonation && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowDetailsModal(false)}><X size={16} /></button>
            
            <div className="modal-header">
              <div className={`modal-status ${selectedDonation.status}`}>
                {getStatusIcon(selectedDonation.status)} {getStatusLabel(selectedDonation.status)}
              </div>
              <h2>{selectedDonation.title}</h2>
            </div>

            <div className="modal-body">
              {selectedDonation.image && (
                <div className="modal-image">
                  <img src={selectedDonation.image} alt={selectedDonation.title} />
                </div>
              )}

              <div className="details-grid">
                <div className="detail-item">
                  <span className="detail-label">Type</span>
                  <span className="detail-value">
                    {getTypeEmoji(selectedDonation.type)} {selectedDonation.type}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Quantity</span>
                  <span className="detail-value">{selectedDonation.quantity}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Farmer</span>
                  <span className="detail-value">{selectedDonation.farmer_name || 'Unknown'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Claimed On</span>
                  <span className="detail-value">{formatDate(selectedDonation.claimed_at)}</span>
                </div>
                {selectedDonation.pickup_address && (
                  <div className="detail-item full-width">
                    <span className="detail-label">Pickup Location</span>
                    <span className="detail-value">{selectedDonation.pickup_address}</span>
                  </div>
                )}
                {selectedDonation.description && (
                  <div className="detail-item full-width">
                    <span className="detail-label">Description</span>
                    <span className="detail-value">{selectedDonation.description}</span>
                  </div>
                )}
              </div>

              {/* Driver Section */}
              {selectedDonation.driver_name && (
                <div className="modal-driver-section">
                  <h4><Truck size={16} /> Driver Information</h4>
                  <div className="driver-card">
                    <div className="driver-avatar"><UserCheck size={24} /></div>
                    <div className="driver-info">
                      <span className="driver-name">{selectedDonation.driver_name}</span>
                      {selectedDonation.driver_phone && (
                        <a href={`tel:${selectedDonation.driver_phone}`} className="driver-phone">
                          <Phone size={12} /> {selectedDonation.driver_phone}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div className="modal-timeline">
                <h4><ClipboardList size={16} /> Status Timeline</h4>
                <div className="timeline">
                  <div className={`timeline-item ${selectedDonation.status ? 'completed' : ''}`}>
                    <div className="timeline-dot"></div>
                    <div className="timeline-content">
                      <span className="timeline-title">Claimed</span>
                      <span className="timeline-date">{formatDate(selectedDonation.claimed_at)}</span>
                    </div>
                  </div>
                  <div className={`timeline-item ${selectedDonation.status === 'in_transit' || selectedDonation.status === 'delivered' ? 'completed' : ''}`}>
                    <div className="timeline-dot"></div>
                    <div className="timeline-content">
                      <span className="timeline-title">In Transit</span>
                      <span className="timeline-date">{selectedDonation.status === 'in_transit' || selectedDonation.status === 'delivered' ? 'Picked up' : 'Pending'}</span>
                    </div>
                  </div>
                  <div className={`timeline-item ${selectedDonation.status === 'delivered' ? 'completed' : ''}`}>
                    <div className="timeline-dot"></div>
                    <div className="timeline-content">
                      <span className="timeline-title">Delivered</span>
                      <span className="timeline-date">{selectedDonation.status === 'delivered' ? formatDate(selectedDonation.delivery_date) : 'Pending'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              {selectedDonation.status === 'in_transit' && (
                <button 
                  className="modal-btn primary"
                  onClick={() => {
                    setShowDetailsModal(false);
                    navigate(`/order-tracking/${selectedDonation.id}`);
                  }}
                >
                  <MapPin size={14} /> Track Delivery
                </button>
              )}
              <button 
                className="modal-btn secondary"
                onClick={() => setShowDetailsModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClaimedDonations;
