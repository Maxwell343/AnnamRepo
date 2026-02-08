import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './AvailablePickups.css';

// --- Types ---
interface User {
  id: number;
  name: string;
  role: 'farmer' | 'ngo' | 'driver';
}

interface PickupTask {
  id: number;
  listing_id: number;
  title: string;
  quantity: string;
  type: 'Vegetable' | 'Fruit' | 'Grain' | 'Other';
  image?: string;
  priority: 'normal' | 'high' | 'urgent';
  
  // Farmer (Pickup) Info
  farmer: {
    id: number;
    name: string;
    phone: string;
    address: string;
    landmark?: string;
  };
  
  // NGO (Delivery) Info
  ngo: {
    id: number;
    name: string;
    organization: string;
    phone: string;
    address: string;
  };
  
  // Timing
  created_at: string;
  expiry_time: string;
  pickup_window_start: string;
  pickup_window_end: string;
  
  // Trip Details
  distance: number;
  estimated_time: string;
  earnings: number;
  
  // Additional
  notes?: string;
  special_instructions?: string;
}

type FilterType = 'all' | 'Vegetable' | 'Fruit' | 'Grain' | 'Other';
type SortOption = 'nearest' | 'highest_pay' | 'urgent' | 'newest';
type DistanceFilter = 'all' | '5' | '10' | '15' | '25';

const AvailablePickups: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [pickups, setPickups] = useState<PickupTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  
  // Filters
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterDistance, setFilterDistance] = useState<DistanceFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('nearest');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [selectedPickup, setSelectedPickup] = useState<PickupTask | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [acceptingId, setAcceptingId] = useState<number | null>(null);
  
  // Toast
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning'>('success');

  // Mock data - Replace with API call
  const mockPickups: PickupTask[] = [
    {
      id: 1,
      listing_id: 101,
      title: 'Fresh Tomatoes',
      quantity: '25 kg',
      type: 'Vegetable',
      priority: 'urgent',
      farmer: {
        id: 1,
        name: 'Rajesh Kumar',
        phone: '+91 98765 43210',
        address: 'Green Valley Farm, Village Road, Nashik',
        landmark: 'Near Shiva Temple'
      },
      ngo: {
        id: 1,
        name: 'Priya Sharma',
        organization: 'Food For All Foundation',
        phone: '+91 98765 12345',
        address: '123, MG Road, Andheri East, Mumbai'
      },
      created_at: '2024-01-15T10:30:00',
      expiry_time: '2024-01-15T18:00:00',
      pickup_window_start: '09:00',
      pickup_window_end: '14:00',
      distance: 5.2,
      estimated_time: '25 mins',
      earnings: 150,
      notes: 'Ripe tomatoes, handle with care',
      special_instructions: 'Call before arriving'
    },
    {
      id: 2,
      listing_id: 102,
      title: 'Organic Apples',
      quantity: '30 kg',
      type: 'Fruit',
      priority: 'high',
      farmer: {
        id: 2,
        name: 'Amit Patel',
        phone: '+91 87654 32109',
        address: 'Apple Orchards, Hill Station Road, Shimla',
        landmark: 'Opposite Post Office'
      },
      ngo: {
        id: 2,
        name: 'Rahul Verma',
        organization: 'Hunger Free India',
        phone: '+91 76543 21098',
        address: '456, Civil Lines, Chandigarh'
      },
      created_at: '2024-01-15T09:00:00',
      expiry_time: '2024-01-16T12:00:00',
      pickup_window_start: '10:00',
      pickup_window_end: '16:00',
      distance: 8.7,
      estimated_time: '35 mins',
      earnings: 180,
      notes: 'Premium quality apples'
    },
    {
      id: 3,
      listing_id: 103,
      title: 'Rice Bags',
      quantity: '50 kg',
      type: 'Grain',
      priority: 'normal',
      farmer: {
        id: 3,
        name: 'Suresh Reddy',
        phone: '+91 76543 98765',
        address: 'Paddy Fields, Rural Area, Guntur',
        landmark: 'Near Water Tank'
      },
      ngo: {
        id: 3,
        name: 'Lakshmi Devi',
        organization: 'Annapurna Trust',
        phone: '+91 65432 10987',
        address: '789, Temple Street, Vijayawada'
      },
      created_at: '2024-01-15T08:00:00',
      expiry_time: '2024-01-20T18:00:00',
      pickup_window_start: '08:00',
      pickup_window_end: '18:00',
      distance: 12.3,
      estimated_time: '45 mins',
      earnings: 250,
      special_instructions: 'Heavy load - bring trolley'
    },
    {
      id: 4,
      listing_id: 104,
      title: 'Mixed Vegetables',
      quantity: '40 kg',
      type: 'Vegetable',
      priority: 'high',
      farmer: {
        id: 4,
        name: 'Mohan Singh',
        phone: '+91 54321 09876',
        address: 'Vegetable Farm, Highway Road, Ludhiana',
        landmark: 'Behind Petrol Pump'
      },
      ngo: {
        id: 4,
        name: 'Gurpreet Kaur',
        organization: 'Langar Seva',
        phone: '+91 43210 98765',
        address: '321, Golden Temple Road, Amritsar'
      },
      created_at: '2024-01-15T11:00:00',
      expiry_time: '2024-01-15T20:00:00',
      pickup_window_start: '12:00',
      pickup_window_end: '17:00',
      distance: 3.5,
      estimated_time: '15 mins',
      earnings: 120,
      notes: 'Includes carrots, potatoes, onions'
    },
    {
      id: 5,
      listing_id: 105,
      title: 'Fresh Mangoes',
      quantity: '35 kg',
      type: 'Fruit',
      priority: 'urgent',
      farmer: {
        id: 5,
        name: 'Venkat Rao',
        phone: '+91 32109 87654',
        address: 'Mango Gardens, Ratnagiri',
        landmark: 'Main Gate'
      },
      ngo: {
        id: 5,
        name: 'Sneha Patil',
        organization: 'Child Welfare Society',
        phone: '+91 21098 76543',
        address: '567, School Lane, Pune'
      },
      created_at: '2024-01-15T07:00:00',
      expiry_time: '2024-01-15T15:00:00',
      pickup_window_start: '07:00',
      pickup_window_end: '12:00',
      distance: 6.8,
      estimated_time: '30 mins',
      earnings: 200,
      notes: 'Alphonso mangoes - very ripe',
      special_instructions: 'Keep cool, avoid direct sunlight'
    },
    {
      id: 6,
      listing_id: 106,
      title: 'Wheat Flour',
      quantity: '100 kg',
      type: 'Grain',
      priority: 'normal',
      farmer: {
        id: 6,
        name: 'Baldev Singh',
        phone: '+91 11223 34455',
        address: 'Wheat Mill, Industrial Area, Karnal',
        landmark: 'Near Railway Crossing'
      },
      ngo: {
        id: 6,
        name: 'Harpreet Kaur',
        organization: 'Roti Bank',
        phone: '+91 55443 32211',
        address: '890, Market Road, Delhi'
      },
      created_at: '2024-01-15T06:00:00',
      expiry_time: '2024-01-25T18:00:00',
      pickup_window_start: '09:00',
      pickup_window_end: '19:00',
      distance: 22.5,
      estimated_time: '55 mins',
      earnings: 350,
      special_instructions: 'Multiple bags - need loading help'
    }
  ];

  // Fetch available pickups
  const fetchPickups = useCallback(async () => {
    if (!user) return;
    
    try {
      // Replace with actual API call
      // const response = await fetch('http://localhost:8000/api/available-pickups');
      // const data = await response.json();
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));
      setPickups(mockPickups);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching pickups:', err);
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      if (parsedUser.role !== 'driver') {
        navigate('/home');
        return;
      }
      setUser(parsedUser);
    } else {
      navigate('/');
      return;
    }

    const savedOnlineStatus = localStorage.getItem('driverOnline');
    if (savedOnlineStatus !== null) {
      setIsOnline(JSON.parse(savedOnlineStatus));
    }
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchPickups();
    }
  }, [user, fetchPickups]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  const showToastMessage = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleAcceptPickup = async (pickupId: number) => {
    if (!isOnline) {
      showToastMessage('You must be online to accept pickups', 'warning');
      return;
    }

    setAcceptingId(pickupId);
    
    try {
      // Replace with actual API call
      // await fetch(`http://localhost:8000/api/pickups/${pickupId}/accept`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ driver_id: user?.id })
      // });

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Remove from available list
      setPickups(prev => prev.filter(p => p.id !== pickupId));
      setShowAcceptModal(false);
      setSelectedPickup(null);
      
      showToastMessage('Pickup accepted successfully! Check My Deliveries.', 'success');
      
      // Optionally navigate to my deliveries
      // setTimeout(() => navigate('/my-deliveries'), 2000);
    } catch (err: any) {
      showToastMessage(err.message || 'Failed to accept pickup', 'error');
    } finally {
      setAcceptingId(null);
    }
  };

  const handleOnlineToggle = () => {
    setIsOnline(!isOnline);
    localStorage.setItem('driverOnline', JSON.stringify(!isOnline));
    showToastMessage(
      isOnline ? 'You are now offline' : 'You are now online',
      isOnline ? 'warning' : 'success'
    );
  };

  // Filter and sort pickups
  const filteredPickups = pickups
    .filter(pickup => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!pickup.title.toLowerCase().includes(query) &&
            !pickup.farmer.name.toLowerCase().includes(query) &&
            !pickup.ngo.organization.toLowerCase().includes(query) &&
            !pickup.farmer.address.toLowerCase().includes(query)) {
          return false;
        }
      }
      
      // Type filter
      if (filterType !== 'all' && pickup.type !== filterType) {
        return false;
      }
      
      // Distance filter
      if (filterDistance !== 'all' && pickup.distance > parseInt(filterDistance)) {
        return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'nearest':
          return a.distance - b.distance;
        case 'highest_pay':
          return b.earnings - a.earnings;
        case 'urgent':
          const priorityOrder = { urgent: 0, high: 1, normal: 2 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        default:
          return 0;
      }
    });

  // Calculate stats
  const stats = {
    total: pickups.length,
    urgent: pickups.filter(p => p.priority === 'urgent').length,
    nearby: pickups.filter(p => p.distance <= 5).length,
    totalEarnings: pickups.reduce((sum, p) => sum + p.earnings, 0)
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Vegetable': return '🥦';
      case 'Fruit': return '🍎';
      case 'Grain': return '🌾';
      default: return '🍱';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <span className="priority-badge urgent">🔥 Urgent</span>;
      case 'high':
        return <span className="priority-badge high">⚡ High Priority</span>;
      default:
        return null;
    }
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getTimeUntilExpiry = (expiryStr: string) => {
    const expiry = new Date(expiryStr);
    const now = new Date();
    const diffMs = expiry.getTime() - now.getTime();
    
    if (diffMs <= 0) return { text: 'Expired', urgent: true };
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours < 2) {
      return { text: `${diffHours}h ${diffMins}m left`, urgent: true };
    } else if (diffHours < 6) {
      return { text: `${diffHours}h left`, urgent: false };
    } else {
      return { text: `${diffHours}h left`, urgent: false };
    }
  };

  const openPhoneDialer = (phone: string) => {
    window.location.href = `tel:${phone.replace(/\s/g, '')}`;
  };

  const openMaps = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Finding available pickups...</p>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <header className="top-header">
          <div className="header-left">
            <h1 className="page-title">🚚 Available Pickups</h1>
            <p className="page-subtitle">Accept deliveries and start earning</p>
          </div>
          
          <div className="header-right">
            <div className={`online-toggle-card ${isOnline ? 'online' : 'offline'}`}>
              <div className="toggle-info">
                <span className="toggle-status">
                  {isOnline ? '🟢 Online' : '🔴 Offline'}
                </span>
                <span className="toggle-hint">
                  {isOnline ? 'Accepting pickups' : 'Not accepting'}
                </span>
              </div>
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={isOnline}
                  onChange={handleOnlineToggle}
                />
                <span className="slider round"></span>
              </label>
            </div>
            <div className="user-avatar driver">
              {user?.name.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Offline Warning */}
        {!isOnline && (
          <div className="offline-warning">
            <span className="warning-icon">⚠️</span>
            <span className="warning-text">
              You are currently offline. Go online to accept pickup requests.
            </span>
            <button className="go-online-btn" onClick={handleOnlineToggle}>
              Go Online
            </button>
          </div>
        )}

        {/* Quick Stats */}
        <section className="pickup-stats">
          <div className="pickup-stat-card">
            <div className="stat-icon-circle">
              <span>📦</span>
            </div>
            <div className="stat-details">
              <span className="stat-number">{stats.total}</span>
              <span className="stat-label">Available</span>
            </div>
          </div>
          
          <div className="pickup-stat-card urgent">
            <div className="stat-icon-circle urgent">
              <span>🔥</span>
            </div>
            <div className="stat-details">
              <span className="stat-number">{stats.urgent}</span>
              <span className="stat-label">Urgent</span>
            </div>
            {stats.urgent > 0 && <span className="stat-pulse"></span>}
          </div>
          
          <div className="pickup-stat-card nearby">
            <div className="stat-icon-circle nearby">
              <span>📍</span>
            </div>
            <div className="stat-details">
              <span className="stat-number">{stats.nearby}</span>
              <span className="stat-label">Nearby (&lt;5km)</span>
            </div>
          </div>
          
          <div className="pickup-stat-card earnings">
            <div className="stat-icon-circle earnings">
              <span>💰</span>
            </div>
            <div className="stat-details">
              <span className="stat-number">₹{stats.totalEarnings}</span>
              <span className="stat-label">Potential</span>
            </div>
          </div>
        </section>

        {/* Filters */}
        <section className="pickups-filters">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by item, farmer, NGO, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="clear-search" onClick={() => setSearchQuery('')}>
                ✕
              </button>
            )}
          </div>

          <div className="filter-group">
            <div className="filter-item">
              <label>Type:</label>
              <select 
                value={filterType} 
                onChange={(e) => setFilterType(e.target.value as FilterType)}
              >
                <option value="all">All Types</option>
                <option value="Vegetable">🥦 Vegetables</option>
                <option value="Fruit">🍎 Fruits</option>
                <option value="Grain">🌾 Grains</option>
                <option value="Other">🍱 Other</option>
              </select>
            </div>

            <div className="filter-item">
              <label>Distance:</label>
              <select 
                value={filterDistance} 
                onChange={(e) => setFilterDistance(e.target.value as DistanceFilter)}
              >
                <option value="all">Any Distance</option>
                <option value="5">Within 5 km</option>
                <option value="10">Within 10 km</option>
                <option value="15">Within 15 km</option>
                <option value="25">Within 25 km</option>
              </select>
            </div>

            <div className="filter-item">
              <label>Sort:</label>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value as SortOption)}
              >
                <option value="nearest">Nearest First</option>
                <option value="highest_pay">Highest Pay</option>
                <option value="urgent">Most Urgent</option>
                <option value="newest">Newest First</option>
              </select>
            </div>

            <button 
              className="refresh-btn"
              onClick={fetchPickups}
              title="Refresh"
            >
              🔄
            </button>
          </div>
        </section>

        {/* Results Info */}
        <div className="results-info">
          <span>
            Showing <strong>{filteredPickups.length}</strong> of <strong>{pickups.length}</strong> available pickups
          </span>
          {(filterType !== 'all' || filterDistance !== 'all' || searchQuery) && (
            <button 
              className="clear-filters-btn"
              onClick={() => {
                setFilterType('all');
                setFilterDistance('all');
                setSearchQuery('');
              }}
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Pickups Grid */}
        {filteredPickups.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <h3>
              {pickups.length === 0 
                ? "No pickups available right now" 
                : "No pickups match your filters"}
            </h3>
            <p>
              {pickups.length === 0 
                ? "Check back soon for new pickup requests" 
                : "Try adjusting your search or filter criteria"}
            </p>
            <button className="refresh-action-btn" onClick={fetchPickups}>
              🔄 Refresh
            </button>
          </div>
        ) : (
          <section className="pickups-grid">
            {filteredPickups.map((pickup) => {
              const expiryInfo = getTimeUntilExpiry(pickup.expiry_time);
              
              return (
                <div 
                  key={pickup.id} 
                  className={`pickup-card ${pickup.priority}`}
                >
                  {/* Priority Badge */}
                  {getPriorityBadge(pickup.priority)}
                  
                  {/* Expiry Timer */}
                  <div className={`expiry-timer ${expiryInfo.urgent ? 'urgent' : ''}`}>
                    ⏰ {expiryInfo.text}
                  </div>

                  {/* Card Header */}
                  <div className="pickup-header">
                    <div className="pickup-image">
                      {pickup.image ? (
                        <img src={pickup.image} alt={pickup.title} />
                      ) : (
                        <div className="pickup-emoji">
                          {getTypeIcon(pickup.type)}
                        </div>
                      )}
                      <span className="type-badge">{pickup.type}</span>
                    </div>
                    <div className="pickup-info">
                      <h3 className="pickup-title">{pickup.title}</h3>
                      <div className="pickup-meta">
                        <span className="meta-item">
                          <span className="meta-icon">📦</span>
                          {pickup.quantity}
                        </span>
                        <span className="meta-item">
                          <span className="meta-icon">📏</span>
                          {pickup.distance} km
                        </span>
                        <span className="meta-item earnings-highlight">
                          <span className="meta-icon">💰</span>
                          ₹{pickup.earnings}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Route Preview */}
                  <div className="route-preview">
                    <div className="route-point">
                      <div className="point-marker pickup">
                        <span>📍</span>
                      </div>
                      <div className="point-info">
                        <span className="point-label">PICKUP</span>
                        <span className="point-name">{pickup.farmer.name}</span>
                        <span className="point-address">{pickup.farmer.address}</span>
                      </div>
                    </div>
                    
                    <div className="route-line">
                      <span className="distance-badge">{pickup.distance} km • {pickup.estimated_time}</span>
                    </div>
                    
                    <div className="route-point">
                      <div className="point-marker delivery">
                        <span>🏁</span>
                      </div>
                      <div className="point-info">
                        <span className="point-label">DELIVER</span>
                        <span className="point-name">{pickup.ngo.organization}</span>
                        <span className="point-address">{pickup.ngo.address}</span>
                      </div>
                    </div>
                  </div>

                  {/* Pickup Window */}
                  <div className="pickup-window">
                    <span className="window-icon">🕐</span>
                    <span className="window-text">
                      Pickup: {formatTime(pickup.pickup_window_start)} - {formatTime(pickup.pickup_window_end)}
                    </span>
                  </div>

                  {/* Special Instructions */}
                  {pickup.special_instructions && (
                    <div className="special-instructions">
                      <span className="instruction-icon">⚠️</span>
                      <span className="instruction-text">{pickup.special_instructions}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="pickup-actions">
                    <button 
                      className="action-btn details"
                      onClick={() => {
                        setSelectedPickup(pickup);
                        setShowDetailsModal(true);
                      }}
                    >
                      👁️ Details
                    </button>
                    <button 
                      className="action-btn accept"
                      onClick={() => {
                        setSelectedPickup(pickup);
                        setShowAcceptModal(true);
                      }}
                      disabled={!isOnline || acceptingId === pickup.id}
                    >
                      {acceptingId === pickup.id ? (
                        <>
                          <span className="btn-spinner"></span>
                          Accepting...
                        </>
                      ) : (
                        <>✅ Accept Pickup</>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {/* Details Modal */}
        {showDetailsModal && selectedPickup && (
          <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
            <div className="modal-content details-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>📦 Pickup Details</h2>
                <button className="modal-close" onClick={() => setShowDetailsModal(false)}>
                  ✕
                </button>
              </div>
              
              <div className="modal-body">
                {/* Item Info */}
                <div className="modal-section">
                  <div className="item-header">
                    <div className="item-icon">{getTypeIcon(selectedPickup.type)}</div>
                    <div className="item-info">
                      <h3>{selectedPickup.title}</h3>
                      <p>{selectedPickup.quantity} • {selectedPickup.type}</p>
                    </div>
                    <div className="item-earnings">
                      <span className="earnings-amount">₹{selectedPickup.earnings}</span>
                      <span className="earnings-label">Earnings</span>
                    </div>
                  </div>
                  {getPriorityBadge(selectedPickup.priority)}
                </div>

                {/* Trip Stats */}
                <div className="modal-section trip-stats">
                  <div className="trip-stat">
                    <span className="stat-icon">📏</span>
                    <span className="stat-value">{selectedPickup.distance} km</span>
                    <span className="stat-label">Distance</span>
                  </div>
                  <div className="trip-stat">
                    <span className="stat-icon">⏱️</span>
                    <span className="stat-value">{selectedPickup.estimated_time}</span>
                    <span className="stat-label">Est. Time</span>
                  </div>
                  <div className="trip-stat">
                    <span className="stat-icon">💰</span>
                    <span className="stat-value">₹{selectedPickup.earnings}</span>
                    <span className="stat-label">Earnings</span>
                  </div>
                </div>

                {/* Pickup Location */}
                <div className="modal-section">
                  <h4>📍 Pickup Location (Farmer)</h4>
                  <div className="contact-card">
                    <div className="contact-details">
                      <span className="contact-name">{selectedPickup.farmer.name}</span>
                      <span className="contact-phone">{selectedPickup.farmer.phone}</span>
                      <span className="contact-address">{selectedPickup.farmer.address}</span>
                      {selectedPickup.farmer.landmark && (
                        <span className="contact-landmark">📌 {selectedPickup.farmer.landmark}</span>
                      )}
                    </div>
                    <div className="contact-actions">
                      <button 
                        className="contact-btn call"
                        onClick={() => openPhoneDialer(selectedPickup.farmer.phone)}
                      >
                        📞
                      </button>
                      <button 
                        className="contact-btn map"
                        onClick={() => openMaps(selectedPickup.farmer.address)}
                      >
                        🗺️
                      </button>
                    </div>
                  </div>
                  <div className="pickup-time">
                    🕐 Pickup Window: {formatTime(selectedPickup.pickup_window_start)} - {formatTime(selectedPickup.pickup_window_end)}
                  </div>
                </div>

                {/* Delivery Location */}
                <div className="modal-section">
                  <h4>🏁 Delivery Location (NGO)</h4>
                  <div className="contact-card">
                    <div className="contact-details">
                      <span className="contact-org">{selectedPickup.ngo.organization}</span>
                      <span className="contact-name">{selectedPickup.ngo.name}</span>
                      <span className="contact-phone">{selectedPickup.ngo.phone}</span>
                      <span className="contact-address">{selectedPickup.ngo.address}</span>
                    </div>
                    <div className="contact-actions">
                      <button 
                        className="contact-btn call"
                        onClick={() => openPhoneDialer(selectedPickup.ngo.phone)}
                      >
                        📞
                      </button>
                      <button 
                        className="contact-btn map"
                        onClick={() => openMaps(selectedPickup.ngo.address)}
                      >
                        🗺️
                      </button>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {(selectedPickup.notes || selectedPickup.special_instructions) && (
                  <div className="modal-section">
                    <h4>📝 Notes & Instructions</h4>
                    {selectedPickup.notes && (
                      <div className="note-item">
                        <span className="note-icon">💬</span>
                        <span>{selectedPickup.notes}</span>
                      </div>
                    )}
                    {selectedPickup.special_instructions && (
                      <div className="note-item warning">
                        <span className="note-icon">⚠️</span>
                        <span>{selectedPickup.special_instructions}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="modal-actions">
                <button 
                  className="modal-btn secondary"
                  onClick={() => setShowDetailsModal(false)}
                >
                  Close
                </button>
                <button 
                  className="modal-btn primary"
                  onClick={() => {
                    setShowDetailsModal(false);
                    setShowAcceptModal(true);
                  }}
                  disabled={!isOnline}
                >
                  ✅ Accept Pickup
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Accept Confirmation Modal */}
        {showAcceptModal && selectedPickup && (
          <div className="modal-overlay" onClick={() => setShowAcceptModal(false)}>
            <div className="modal-content accept-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>✅ Accept Pickup</h2>
                <button className="modal-close" onClick={() => setShowAcceptModal(false)}>
                  ✕
                </button>
              </div>
              
              <div className="modal-body">
                <div className="accept-summary">
                  <div className="summary-item-preview">
                    <span className="preview-icon">{getTypeIcon(selectedPickup.type)}</span>
                    <div className="preview-info">
                      <h4>{selectedPickup.title}</h4>
                      <p>{selectedPickup.quantity}</p>
                    </div>
                  </div>
                  
                  <div className="summary-details">
                    <div className="summary-row">
                      <span className="summary-label">Distance</span>
                      <span className="summary-value">{selectedPickup.distance} km</span>
                    </div>
                    <div className="summary-row">
                      <span className="summary-label">Est. Time</span>
                      <span className="summary-value">{selectedPickup.estimated_time}</span>
                    </div>
                    <div className="summary-row highlight">
                      <span className="summary-label">💰 Earnings</span>
                      <span className="summary-value earnings">₹{selectedPickup.earnings}</span>
                    </div>
                  </div>
                </div>

                <div className="accept-checklist">
                  <h4>Before accepting, please ensure:</h4>
                  <ul>
                    <li>✓ You can reach the pickup location on time</li>
                    <li>✓ Your vehicle can carry {selectedPickup.quantity}</li>
                    <li>✓ You have enough fuel for the trip</li>
                  </ul>
                </div>

                <div className="accept-notice">
                  <span className="notice-icon">ℹ️</span>
                  <span>Once accepted, you'll have 30 minutes to reach the pickup location.</span>
                </div>
              </div>

              <div className="modal-actions">
                <button 
                  className="modal-btn secondary"
                  onClick={() => setShowAcceptModal(false)}
                >
                  Cancel
                </button>
                <button 
                  className="modal-btn primary accept"
                  onClick={() => handleAcceptPickup(selectedPickup.id)}
                  disabled={acceptingId === selectedPickup.id}
                >
                  {acceptingId === selectedPickup.id ? (
                    <>
                      <span className="btn-spinner"></span>
                      Accepting...
                    </>
                  ) : (
                    <>✅ Confirm & Accept</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        {showToast && (
          <div className={`toast-notification ${toastType}`}>
            <span className="toast-icon">
              {toastType === 'success' ? '✅' : toastType === 'error' ? '❌' : '⚠️'}
            </span>
            <span className="toast-message">{toastMessage}</span>
          </div>
        )}
      </>
    );
  };
  
  export default AvailablePickups;
