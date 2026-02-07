import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './MyListings.css';

// --- Types ---
interface User {
  id: number;
  name: string;
  role: 'farmer' | 'ngo' | 'driver';
}

interface Listing {
  id: number;
  farmer_id: number;
  title: string;
  quantity: string;
  type: 'Vegetable' | 'Fruit' | 'Grain' | 'Other';
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
}

type FilterStatus = 'all' | 'available' | 'claimed' | 'in_transit' | 'delivered' | 'expired';
type SortOption = 'newest' | 'oldest' | 'expiring_soon' | 'quantity_high' | 'quantity_low';

// Helper function to parse expiry
function parseExpiryAndGetCountdown(expiryStr: string | undefined | null, createdAtStr?: string): { 
  days: number; 
  hours: number; 
  minutes: number; 
  isExpired: boolean;
  totalMinutes: number;
} {
  if (!expiryStr) {
    return { days: 0, hours: 0, minutes: 0, isExpired: true, totalMinutes: 0 };
  }
  
  const now = new Date();
  let expiryDate: Date | null = null;
  
  if (!isNaN(Date.parse(expiryStr))) {
    expiryDate = new Date(expiryStr);
  } else {
    let match = expiryStr.match(/(\d+)\s*(day|hour|minute)s?/i);
    
    if (!match) {
      match = expiryStr.match(/^(\d+)$/);
      if (match) {
        expiryStr = `${match[1]} days`;
        match = expiryStr.match(/(\d+)\s*(day|hour|minute)s?/i);
      }
    }
    
    if (match) {
      const value = parseInt(match[1]);
      const unit = match[2].toLowerCase();
      let baseDate: Date = new Date(now);
      
      if (createdAtStr && createdAtStr.trim()) {
        try {
          const normalizedDateStr = createdAtStr.trim().replace(' ', 'T');
          const parsedDate = new Date(normalizedDateStr);
          if (!isNaN(parsedDate.getTime())) {
            baseDate = parsedDate;
          }
        } catch (e) {
          baseDate = new Date(now);
        }
      }
      
      expiryDate = new Date(baseDate);
      
      if (unit === 'day') {
        expiryDate.setDate(expiryDate.getDate() + value);
      } else if (unit === 'hour') {
        expiryDate.setHours(expiryDate.getHours() + value);
      } else if (unit === 'minute') {
        expiryDate.setMinutes(expiryDate.getMinutes() + value);
      }
    }
  }

  if (!expiryDate || isNaN(expiryDate.getTime())) {
    return { days: 0, hours: 0, minutes: 0, isExpired: true, totalMinutes: 0 };
  }

  const timeDiff = expiryDate.getTime() - now.getTime();
  
  if (timeDiff <= 0) {
    return { days: 0, hours: 0, minutes: 0, isExpired: true, totalMinutes: 0 };
  }

  const totalMinutes = Math.floor(timeDiff / (1000 * 60));
  const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

  return { days, hours, minutes, isExpired: false, totalMinutes };
}

function getCountdownDisplay(expiryStr: string | undefined | null, createdAtStr?: string): string {
  if (!expiryStr) return 'No expiry';
  const { days, hours, minutes, isExpired } = parseExpiryAndGetCountdown(expiryStr, createdAtStr);
  
  if (isExpired) return 'Expired';
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}

function getUrgencyLevel(expiryStr: string | undefined | null, createdAtStr?: string): 'critical' | 'warning' | 'safe' {
  if (!expiryStr) return 'critical';
  const { days, hours, isExpired } = parseExpiryAndGetCountdown(expiryStr, createdAtStr);
  if (isExpired) return 'critical';
  if (days === 0 && hours < 6) return 'critical';
  if (days === 0 || (days === 1 && hours < 12)) return 'warning';
  return 'safe';
}

const MyListings: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Filters and Search
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  
  // Modal states
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // View mode
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Fetch listings
  const fetchListings = useCallback(async () => {
    if (!user) return;
    
    try {
      const response = await fetch(`http://localhost:8000/api/listings?farmer_id=${user.id}`);
      const data = await response.json();
      
      console.log('MyListings - User ID:', user.id, 'Fetched listings:', data.listings?.length);
      
      if (response.ok) {
        // Add status based on expiry if not present
        const processedListings = (data.listings || []).map((listing: any) => {
          const expiryValue = listing.expiry || listing.expiry_date;
          const { isExpired } = expiryValue ? parseExpiryAndGetCountdown(expiryValue, listing.created_at) : { isExpired: false };
          return {
            ...listing,
            expiry: expiryValue,
            status: isExpired ? 'expired' : (listing.status || 'available')
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
      if (parsedUser.role !== 'farmer') {
        navigate('/home');
        return;
      }
      setUser(parsedUser);
    } else {
      navigate('/');
      return;
    }
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchListings();
    }
  }, [user, fetchListings]);

  const handleLogout = () => {
    // Clear all user-related data from localStorage
    localStorage.removeItem('user');
    localStorage.removeItem('farmerSettings');
    localStorage.removeItem('ngoSettings');
    localStorage.removeItem('userSettings');
    localStorage.removeItem('driverSettings');
    localStorage.removeItem('userPhone');
    localStorage.removeItem('farmName');
    localStorage.removeItem('farmLocation');
    localStorage.removeItem('userLanguage');
    localStorage.removeItem('ngoName');
    localStorage.removeItem('driverOnline');
    navigate('/');
  };

  const handleDeleteListing = async (listingId: number) => {
    setDeletingId(listingId);
    
    try {
      const response = await fetch(`http://localhost:8000/api/listings/${listingId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete listing');
      }

      setListings(prev => prev.filter(l => l.id !== listingId));
      setShowDeleteModal(false);
      setSelectedListing(null);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleEditListing = (listingId: number) => {
    navigate(`/edit-listing/${listingId}`);
  };

  const handleDuplicateListing = (listing: Listing) => {
    // Navigate to create listing with pre-filled data
    navigate('/listing', { 
      state: { 
        prefill: {
          title: listing.title,
          quantity: listing.quantity,
          type: listing.type,
          description: listing.description,
          pickup_location: listing.pickup_location
        }
      }
    });
  };

  // Filter and sort listings
  const filteredListings = listings
    .filter(listing => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!listing.title.toLowerCase().includes(query) &&
            !listing.type.toLowerCase().includes(query) &&
            !(listing.description?.toLowerCase().includes(query))) {
          return false;
        }
      }
      
      // Status filter
      if (filterStatus !== 'all' && listing.status !== filterStatus) {
        return false;
      }
      
      // Type filter
      if (filterType !== 'all' && listing.type !== filterType) {
        return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        case 'oldest':
          return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        case 'expiring_soon':
          const aExpiry = parseExpiryAndGetCountdown(a.expiry || a.expiry_date, a.created_at);
          const bExpiry = parseExpiryAndGetCountdown(b.expiry || b.expiry_date, b.created_at);
          return aExpiry.totalMinutes - bExpiry.totalMinutes;
        case 'quantity_high':
          return parseFloat(b.quantity) - parseFloat(a.quantity);
        case 'quantity_low':
          return parseFloat(a.quantity) - parseFloat(b.quantity);
        default:
          return 0;
      }
    });

  // Stats
  const stats = {
    total: listings.length,
    available: listings.filter(l => l.status === 'available').length,
    claimed: listings.filter(l => l.status === 'claimed').length,
    inTransit: listings.filter(l => l.status === 'in_transit').length,
    delivered: listings.filter(l => l.status === 'delivered').length,
    expired: listings.filter(l => l.status === 'expired').length
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available': return '🟢';
      case 'claimed': return '🔵';
      case 'in_transit': return '🟠';
      case 'delivered': return '✅';
      case 'expired': return '🔴';
      default: return '⚪';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available': return 'Available';
      case 'claimed': return 'Claimed';
      case 'in_transit': return 'In Transit';
      case 'delivered': return 'Delivered';
      case 'expired': return 'Expired';
      default: return status;
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading your listings...</p>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <header className="top-header">
          <div className="header-left">
            <h1 className="page-title">📦 My Listings</h1>
            <p className="page-subtitle">Manage your food donation listings</p>
          </div>
          
          <div className="header-right">
            <button 
              className="new-listing-btn"
              onClick={() => navigate('/listing')}
            >
              <span>➕</span> Add New Listing
            </button>
            <div className="user-avatar">
              {user?.name.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Quick Stats */}
        <section className="quick-stats">
          <div 
            className={`quick-stat-card ${filterStatus === 'all' ? 'active' : ''}`}
            onClick={() => setFilterStatus('all')}
          >
            <span className="quick-stat-icon">📦</span>
            <div className="quick-stat-info">
              <span className="quick-stat-value">{stats.total}</span>
              <span className="quick-stat-label">Total</span>
            </div>
          </div>
          <div 
            className={`quick-stat-card available ${filterStatus === 'available' ? 'active' : ''}`}
            onClick={() => setFilterStatus('available')}
          >
            <span className="quick-stat-icon">🟢</span>
            <div className="quick-stat-info">
              <span className="quick-stat-value">{stats.available}</span>
              <span className="quick-stat-label">Available</span>
            </div>
          </div>
          <div 
            className={`quick-stat-card claimed ${filterStatus === 'claimed' ? 'active' : ''}`}
            onClick={() => setFilterStatus('claimed')}
          >
            <span className="quick-stat-icon">🔵</span>
            <div className="quick-stat-info">
              <span className="quick-stat-value">{stats.claimed}</span>
              <span className="quick-stat-label">Claimed</span>
            </div>
          </div>
          <div 
            className={`quick-stat-card in-transit ${filterStatus === 'in_transit' ? 'active' : ''}`}
            onClick={() => setFilterStatus('in_transit')}
          >
            <span className="quick-stat-icon">🚚</span>
            <div className="quick-stat-info">
              <span className="quick-stat-value">{stats.inTransit}</span>
              <span className="quick-stat-label">In Transit</span>
            </div>
          </div>
          <div 
            className={`quick-stat-card delivered ${filterStatus === 'delivered' ? 'active' : ''}`}
            onClick={() => setFilterStatus('delivered')}
          >
            <span className="quick-stat-icon">✅</span>
            <div className="quick-stat-info">
              <span className="quick-stat-value">{stats.delivered}</span>
              <span className="quick-stat-label">Delivered</span>
            </div>
          </div>
          <div 
            className={`quick-stat-card expired ${filterStatus === 'expired' ? 'active' : ''}`}
            onClick={() => setFilterStatus('expired')}
          >
            <span className="quick-stat-icon">🔴</span>
            <div className="quick-stat-info">
              <span className="quick-stat-value">{stats.expired}</span>
              <span className="quick-stat-label">Expired</span>
            </div>
          </div>
        </section>

        {/* Filters & Controls */}
        <section className="listings-controls">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search listings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button 
                className="clear-search"
                onClick={() => setSearchQuery('')}
              >
                ✕
              </button>
            )}
          </div>

          <div className="filter-controls">
            <div className="filter-group-inline">
              <label>Type:</label>
              <select 
                value={filterType} 
                onChange={(e) => setFilterType(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="Vegetable">🥦 Vegetables</option>
                <option value="Fruit">🍎 Fruits</option>
                <option value="Grain">🌾 Grains</option>
                <option value="Other">🍱 Other</option>
              </select>
            </div>

            <div className="filter-group-inline">
              <label>Sort:</label>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value as SortOption)}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="expiring_soon">Expiring Soon</option>
                <option value="quantity_high">Quantity: High to Low</option>
                <option value="quantity_low">Quantity: Low to High</option>
              </select>
            </div>

            <div className="view-toggle">
              <button 
                className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Grid View"
              >
                ▦
              </button>
              <button 
                className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                title="List View"
              >
                ☰
              </button>
            </div>

            <button 
              className="refresh-btn"
              onClick={fetchListings}
              title="Refresh"
            >
              🔄
            </button>
          </div>
        </section>

        {/* Results Count */}
        <div className="results-info">
          <span>
            Showing <strong>{filteredListings.length}</strong> of <strong>{listings.length}</strong> listings
          </span>
          {(filterStatus !== 'all' || filterType !== 'all' || searchQuery) && (
            <button 
              className="clear-filters-btn"
              onClick={() => {
                setFilterStatus('all');
                setFilterType('all');
                setSearchQuery('');
              }}
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Listings Grid/List */}
        {filteredListings.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>
              {listings.length === 0 
                ? "You haven't created any listings yet" 
                : "No listings match your filters"}
            </h3>
            <p>
              {listings.length === 0 
                ? "Start by creating your first donation listing!" 
                : "Try adjusting your search or filter criteria"}
            </p>
            {listings.length === 0 && (
              <button 
                className="empty-action-btn"
                onClick={() => navigate('/listing')}
              >
                ➕ Create First Listing
              </button>
            )}
          </div>
        ) : (
          <section className={`my-listings-container ${viewMode}`}>
            {filteredListings.map((listing) => {
              const urgencyLevel = getUrgencyLevel(listing.expiry || listing.expiry_date, listing.created_at);
              
              return (
                <div 
                  key={listing.id} 
                  className={`my-listing-card ${listing.status} ${viewMode}`}
                >
                  {/* Status Badge */}
                  <div className={`listing-status-badge ${listing.status}`}>
                    {getStatusIcon(listing.status)} {getStatusLabel(listing.status)}
                  </div>

                  {/* Urgency Badge (only for available) */}
                  {listing.status === 'available' && urgencyLevel !== 'safe' && (
                    <div className={`urgency-indicator ${urgencyLevel}`}>
                      {urgencyLevel === 'critical' ? '⚠️ Urgent' : '⏰ Expiring Soon'}
                    </div>
                  )}

                  {/* Card Image */}
                  <div className="listing-image">
                    {listing.image ? (
                      <img src={listing.image} alt={listing.title} />
                    ) : (
                      <div className="listing-emoji">
                        {listing.type === 'Vegetable' ? '🥦' : 
                         listing.type === 'Fruit' ? '🍎' : 
                         listing.type === 'Grain' ? '🌾' : '🍱'}
                      </div>
                    )}
                    <span className="listing-type-tag">{listing.type}</span>
                  </div>

                  {/* Card Content */}
                  <div className="listing-content">
                    <h3 className="listing-title">{listing.title}</h3>
                    
                    <div className="listing-meta">
                      <div className="meta-item">
                        <span className="meta-icon">📦</span>
                        <span className="meta-value">{listing.quantity}</span>
                      </div>
                      <div className="meta-item">
                        <span className="meta-icon">⏳</span>
                        <span className={`meta-value countdown ${urgencyLevel}`}>
                          {getCountdownDisplay(listing.expiry || listing.expiry_date, listing.created_at)}
                        </span>
                      </div>
                      <div className="meta-item">
                        <span className="meta-icon">📅</span>
                        <span className="meta-value">{formatDate(listing.created_at)}</span>
                      </div>
                    </div>

                    {listing.description && (
                      <p className="listing-description">{listing.description}</p>
                    )}

                    {/* Claimed Info */}
                    {listing.claimed_by && (
                      <div className="claimed-info">
                        <span className="claimed-icon">🤝</span>
                        <div className="claimed-details">
                          <span className="claimed-by">
                            Claimed by: <strong>{listing.claimed_by.name}</strong>
                          </span>
                          {listing.claimed_by.organization && (
                            <span className="claimed-org">{listing.claimed_by.organization}</span>
                          )}
                          {listing.claimed_at && (
                            <span className="claimed-time">{formatDate(listing.claimed_at)}</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="listing-actions">
                      <button 
                        className="action-btn view"
                        onClick={() => {
                          setSelectedListing(listing);
                          setShowDetailsModal(true);
                        }}
                        title="View Details"
                      >
                        👁️ View
                      </button>
                      
                      {listing.status === 'available' && (
                        <button 
                          className="action-btn edit"
                          onClick={() => handleEditListing(listing.id)}
                          title="Edit Listing"
                        >
                          ✏️ Edit
                        </button>
                      )}
                      
                      <button 
                        className="action-btn duplicate"
                        onClick={() => handleDuplicateListing(listing)}
                        title="Duplicate Listing"
                      >
                        📋 Duplicate
                      </button>
                      
                      {(listing.status === 'available' || listing.status === 'expired') && (
                        <button 
                          className="action-btn delete"
                          onClick={() => {
                            setSelectedListing(listing);
                            setShowDeleteModal(true);
                          }}
                          title="Delete Listing"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && selectedListing && (
          <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>🗑️ Delete Listing</h2>
                <button 
                  className="modal-close"
                  onClick={() => setShowDeleteModal(false)}
                >
                  ✕
                </button>
              </div>
              <div className="modal-body">
                <div className="delete-warning">
                  <span className="warning-icon">⚠️</span>
                  <p>Are you sure you want to delete this listing?</p>
                </div>
                <div className="delete-listing-preview">
                  <h4>{selectedListing.title}</h4>
                  <p>{selectedListing.quantity} • {selectedListing.type}</p>
                </div>
                <p className="delete-note">This action cannot be undone.</p>
              </div>
              <div className="modal-actions">
                <button 
                  className="modal-btn cancel"
                  onClick={() => setShowDeleteModal(false)}
                >
                  Cancel
                </button>
                <button 
                  className="modal-btn delete"
                  onClick={() => handleDeleteListing(selectedListing.id)}
                  disabled={deletingId === selectedListing.id}
                >
                  {deletingId === selectedListing.id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Details Modal */}
        {showDetailsModal && selectedListing && (
          <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
            <div className="modal-content details-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>📦 Listing Details</h2>
                <button 
                  className="modal-close"
                  onClick={() => setShowDetailsModal(false)}
                >
                  ✕
                </button>
              </div>
              <div className="modal-body">
                <div className="details-image">
                  {selectedListing.image ? (
                    <img src={selectedListing.image} alt={selectedListing.title} />
                  ) : (
                    <div className="details-emoji">
                      {selectedListing.type === 'Vegetable' ? '🥦' : 
                       selectedListing.type === 'Fruit' ? '🍎' : 
                       selectedListing.type === 'Grain' ? '🌾' : '🍱'}
                    </div>
                  )}
                </div>
                
                <div className="details-info">
                  <div className={`details-status ${selectedListing.status}`}>
                    {getStatusIcon(selectedListing.status)} {getStatusLabel(selectedListing.status)}
                  </div>
                  
                  <h3>{selectedListing.title}</h3>
                  
                  <div className="details-grid">
                    <div className="detail-item">
                      <span className="detail-label">Type</span>
                      <span className="detail-value">{selectedListing.type}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Quantity</span>
                      <span className="detail-value">{selectedListing.quantity}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Expiry</span>
                      <span className={`detail-value ${getUrgencyLevel(selectedListing.expiry || selectedListing.expiry_date, selectedListing.created_at)}`}>
                        {getCountdownDisplay(selectedListing.expiry || selectedListing.expiry_date, selectedListing.created_at)}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Created</span>
                      <span className="detail-value">{formatDate(selectedListing.created_at)}</span>
                    </div>
                    {selectedListing.pickup_location && (
                      <div className="detail-item full-width">
                        <span className="detail-label">Pickup Location</span>
                        <span className="detail-value">{selectedListing.pickup_location}</span>
                      </div>
                    )}
                    {selectedListing.description && (
                      <div className="detail-item full-width">
                        <span className="detail-label">Description</span>
                        <span className="detail-value">{selectedListing.description}</span>
                      </div>
                    )}
                  </div>

                  {selectedListing.claimed_by && (
                    <div className="details-claimed-section">
                      <h4>🤝 Claim Information</h4>
                      <div className="details-grid">
                        <div className="detail-item">
                          <span className="detail-label">Claimed By</span>
                          <span className="detail-value">{selectedListing.claimed_by.name}</span>
                        </div>
                        {selectedListing.claimed_by.organization && (
                          <div className="detail-item">
                            <span className="detail-label">Organization</span>
                            <span className="detail-value">{selectedListing.claimed_by.organization}</span>
                          </div>
                        )}
                        {selectedListing.claimed_quantity && (
                          <div className="detail-item">
                            <span className="detail-label">Quantity Claimed</span>
                            <span className="detail-value">{selectedListing.claimed_quantity}</span>
                          </div>
                        )}
                        {selectedListing.claimed_at && (
                          <div className="detail-item">
                            <span className="detail-label">Claimed At</span>
                            <span className="detail-value">{formatDate(selectedListing.claimed_at)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-actions">
                <button 
                  className="modal-btn secondary"
                  onClick={() => setShowDetailsModal(false)}
                >
                  Close
                </button>
                {selectedListing.status === 'available' && (
                  <button 
                    className="modal-btn primary"
                    onClick={() => {
                      setShowDetailsModal(false);
                      handleEditListing(selectedListing.id);
                    }}
                  >
                    ✏️ Edit Listing
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </>
    );
  };
  
  export default MyListings;
