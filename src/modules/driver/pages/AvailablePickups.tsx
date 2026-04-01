import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './AvailablePickups.css';
import { API_ENDPOINTS } from '../../../config/api';
import { Salad, Apple, Wheat, Package, Flame, Zap, Truck, Circle, AlertTriangle, MapPin, Wallet, Search, X, RefreshCw, MailOpen, Ruler, Flag, Clock, Eye, CheckCircle, Timer, MapPinned, Phone, Map, FileText, MessageSquare, Check, Info, XCircle } from 'lucide-react';

// --- Types ---
interface User {
  id: number;
  name: string;
  role: 'farmer' | 'ngo' | 'driver';
  phone?: string;
}

interface PickupTask {
  id: string;
  listing_id: string;
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

interface LngLat {
  lng: number;
  lat: number;
}

type FilterType = 'all' | 'Vegetable' | 'Fruit' | 'Grain' | 'Other';
type SortOption = 'nearest' | 'highest_pay' | 'urgent' | 'newest';
type DistanceFilter = '5';

const MAX_SERVICE_DISTANCE_KM = 5;

const readRuntimeMapboxToken = (): string => {
  if (typeof window === 'undefined') return '';
  const localToken = window.localStorage.getItem('MAPBOX_TOKEN') || '';
  const windowToken = (window as any).MAPBOX_TOKEN || '';
  return localToken || windowToken;
};

const MAPBOX_TOKEN = (
  (import.meta as { env?: Record<string, string | undefined> })?.env?.VITE_MAPBOX_TOKEN ||
  (globalThis as any)?.process?.env?.REACT_APP_MAPBOX_TOKEN ||
  readRuntimeMapboxToken() ||
  ''
).trim();

const toRad = (deg: number): number => (deg * Math.PI) / 180;

const getDistanceKm = (from: LngLat, to: LngLat): number => {
  const earthRadiusKm = 6371;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
};

const geocodeAddress = async (address: string): Promise<LngLat | null> => {
  if (!address.trim() || !MAPBOX_TOKEN) return null;
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?limit=1&access_token=${MAPBOX_TOKEN}`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();
    const center = data?.features?.[0]?.center;
    if (!Array.isArray(center) || center.length < 2) return null;
    return { lng: Number(center[0]), lat: Number(center[1]) };
  } catch {
    return null;
  }
};

const AvailablePickups: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [driverLocation, setDriverLocation] = useState<LngLat | null>(null);
  const [pickups, setPickups] = useState<PickupTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalFetchedCount, setTotalFetchedCount] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [profileChecking, setProfileChecking] = useState(true);
  
  // Filters
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [filterDistance, setFilterDistance] = useState<DistanceFilter>('5');
  const [sortBy, setSortBy] = useState<SortOption>('nearest');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [selectedPickup, setSelectedPickup] = useState<PickupTask | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  
  // Toast
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning'>('success');

  // Fetch available pickups from API
  const fetchPickups = useCallback(async () => {
    if (!user) return;
    
    try {
      const response = await fetch(API_ENDPOINTS.availablePickups);
      if (response.ok) {
        const data = await response.json();
        const rawPickups = Array.isArray(data) ? data : data.pickups || [];
        const fetchedPickups: PickupTask[] = rawPickups.map((pickup: any) => {
          const parsedDistance = Number.parseFloat(String(pickup.delivery_distance || pickup.distance || '0'));
          const distance = Number.isFinite(parsedDistance) && parsedDistance > 0 ? parsedDistance : 2.5;
          return {
            id: String(pickup.id),
            listing_id: String(pickup.id),
            title: pickup.title || 'Untitled Listing',
            quantity: pickup.claimed_by?.claim_quantity || pickup.quantity || 'N/A',
            type: pickup.type || 'Other',
            image: pickup.image,
            priority: pickup.priority || 'normal',
            farmer: {
              id: Number(pickup.farmer_id || 0),
              name: pickup.farmer_name || 'Farmer',
              phone: pickup.farmer_phone || '+91 00000 00000',
              address: pickup.pickup_address || pickup.location || 'Pickup address not available',
              landmark: pickup.pickup_landmark,
            },
            ngo: {
              id: Number(pickup.claimed_by?.ngo_id || 0),
              name: pickup.claimed_by?.ngo_name || 'NGO',
              organization: pickup.claimed_by?.ngo_name || 'NGO',
              phone: pickup.claimed_by?.ngo_phone || '+91 00000 00000',
              address: pickup.claimed_by?.ngo_address || 'Delivery address not available',
            },
            created_at: pickup.created_at || new Date().toISOString(),
            expiry_time: pickup.expiry_date || pickup.expiry || new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
            pickup_window_start: pickup.pickup_time || '09:00',
            pickup_window_end: pickup.pickup_time || '18:00',
            distance,
            estimated_time: pickup.estimated_time || `${Math.max(10, Math.round(distance * 15))} mins`,
            earnings: Number(pickup.earnings || Math.round(80 + distance * 20)),
            notes: pickup.notes,
            special_instructions: pickup.special_instructions,
          };
        });
        let enrichedPickups = fetchedPickups;

        // Recalculate distance from driver's current location when available.
        if (driverLocation) {
          enrichedPickups = await Promise.all(
            fetchedPickups.map(async (pickup) => {
              const pickupCoords = await geocodeAddress(pickup.farmer.address || '');
              if (!pickupCoords) return pickup;
              const calculatedDistance = Number(getDistanceKm(driverLocation, pickupCoords).toFixed(2));
              return {
                ...pickup,
                distance: calculatedDistance,
                estimated_time: `${Math.max(10, Math.round(calculatedDistance * 15))} mins`,
              };
            })
          );
        }

        const eligiblePickups = enrichedPickups.filter((pickup) => pickup.distance <= MAX_SERVICE_DISTANCE_KM);
        setTotalFetchedCount(fetchedPickups.length);
        setPickups(eligiblePickups);
      } else {
        setTotalFetchedCount(0);
        setPickups([]);
      }
    } catch (err) {
      console.error('Error fetching pickups:', err);
      setTotalFetchedCount(0);
      setPickups([]);
    } finally {
      setLoading(false);
    }
  }, [user, driverLocation]);

  useEffect(() => {
    if (!('geolocation' in navigator)) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDriverLocation({
          lng: position.coords.longitude,
          lat: position.coords.latitude,
        });
      },
      () => {
        // Location failure: fallback to API-provided distance.
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  }, []);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      if (parsedUser.role !== 'driver') {
        navigate('/home');
        return;
      }
      setUser(parsedUser);

      // Check if driver profile is complete before allowing access
      const checkProfile = async () => {
        try {
          const response = await fetch(API_ENDPOINTS.driverSettings(parsedUser.id.toString()));
          const data = await response.json();

          const fullName = data?.name || parsedUser.name || '';
          const phone = data?.phone || localStorage.getItem('userPhone') || '';
          const vehicleNumber = data?.vehicle_number || localStorage.getItem('vehicleNumber') || '';
          const licenseNumber = data?.license_number || '';

          if (!fullName.trim() || !phone.trim() || !vehicleNumber.trim() || !licenseNumber.trim()) {
            const missing: string[] = [];
            if (!fullName.trim()) missing.push('Full Name');
            if (!phone.trim()) missing.push('Phone Number');
            if (!vehicleNumber.trim()) missing.push('Vehicle Number');
            if (!licenseNumber.trim()) missing.push('Driving License Number');

            alert(`Please complete your profile before accepting pickups.\n\nMissing fields: ${missing.join(', ')}`);
            navigate('/driver-settings', { state: { returnTo: '/available-pickups', incompleteProfile: true } });
            return;
          }
        } catch (err) {
          // Fallback: check localStorage
          const phone = localStorage.getItem('userPhone') || '';
          const vehicleNumber = localStorage.getItem('vehicleNumber') || '';
          if (!parsedUser.name?.trim() || !phone.trim() || !vehicleNumber.trim()) {
            alert('Please complete your profile before accepting pickups.');
            navigate('/driver-settings', { state: { returnTo: '/available-pickups', incompleteProfile: true } });
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

  const handleAcceptPickup = async (pickupId: string) => {
    if (!isOnline) {
      showToastMessage('You must be online to accept pickups', 'warning');
      return;
    }

    if (!driverLocation) {
      showToastMessage('Enable location to accept pickups within 5 km', 'warning');
      return;
    }

    const pickupToAccept = pickups.find((pickup) => pickup.id === pickupId);
    if (!pickupToAccept) {
      showToastMessage('Pickup not found', 'error');
      return;
    }

    if (pickupToAccept.distance > MAX_SERVICE_DISTANCE_KM) {
      showToastMessage(`You can only accept orders within ${MAX_SERVICE_DISTANCE_KM} km of your location`, 'warning');
      return;
    }

    setAcceptingId(pickupId);
    
    try {
      const response = await fetch(API_ENDPOINTS.acceptPickup(pickupId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driver_id: String(user?.id || ''),
          driver_name: user?.name || 'Driver',
          driver_phone: user?.phone || '',
        })
      });

      if (!response.ok) {
        throw new Error('Failed to accept pickup');
      }

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
      
      // Hard service radius (driver can only get/accept within 5km)
      if (pickup.distance > MAX_SERVICE_DISTANCE_KM) {
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
    nearby: pickups.filter(p => p.distance <= MAX_SERVICE_DISTANCE_KM).length,
    totalEarnings: pickups.reduce((sum, p) => sum + p.earnings, 0)
  };

  const getTypeIcon = (type: string): React.ReactNode => {
    switch (type) {
      case 'Vegetable': return <Salad size={16} />;
      case 'Fruit': return <Apple size={16} />;
      case 'Grain': return <Wheat size={16} />;
      default: return <Package size={16} />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <span className="priority-badge urgent"><Flame size={14} /> Urgent</span>;
      case 'high':
        return <span className="priority-badge high"><Zap size={14} /> High Priority</span>;
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

  if (profileChecking) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Checking profile...</p>
      </div>
    );
  }

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
            <h1 className="page-title"><Truck size={22} /> Available Pickups</h1>
            <p className="page-subtitle">Accept deliveries and start earning</p>
          </div>
          
          <div className="header-right">
            <div className={`online-toggle-card ${isOnline ? 'online' : 'offline'}`}>
              <div className="toggle-info">
                <span className="toggle-status">
                  {isOnline ? <><Circle size={10} /> Online</> : <><Circle size={10} /> Offline</>}
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
            <span className="warning-icon"><AlertTriangle size={16} /></span>
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
              <span><Package size={16} /></span>
            </div>
            <div className="stat-details">
              <span className="stat-number">{stats.total}</span>
              <span className="stat-label">Available</span>
            </div>
          </div>
          
          <div className="pickup-stat-card urgent">
            <div className="stat-icon-circle urgent">
              <span><Flame size={16} /></span>
            </div>
            <div className="stat-details">
              <span className="stat-number">{stats.urgent}</span>
              <span className="stat-label">Urgent</span>
            </div>
            {stats.urgent > 0 && <span className="stat-pulse"></span>}
          </div>
          
          <div className="pickup-stat-card nearby">
            <div className="stat-icon-circle nearby">
              <span><MapPin size={16} /></span>
            </div>
            <div className="stat-details">
              <span className="stat-number">{stats.nearby}</span>
              <span className="stat-label">Nearby (&lt;5km)</span>
            </div>
          </div>
          
          <div className="pickup-stat-card earnings">
            <div className="stat-icon-circle earnings">
              <span><Wallet size={16} /></span>
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
            <span className="search-icon"><Search size={16} /></span>
            <input
              type="text"
              placeholder="Search by item, farmer, NGO, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="clear-search" onClick={() => setSearchQuery('')}>
                <X size={16} />
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
                <option value="Vegetable">Vegetables</option>
                <option value="Fruit">Fruits</option>
                <option value="Grain">Grains</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="filter-item">
              <label>Distance:</label>
              <select 
                value={filterDistance} 
                onChange={(e) => setFilterDistance(e.target.value as DistanceFilter)}
              >
                <option value="5">Within 5 km</option>
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
              <RefreshCw size={16} />
            </button>
          </div>
        </section>

        {/* Results Info */}
        <div className="results-info">
          <span>
            Showing <strong>{filteredPickups.length}</strong> of <strong>{pickups.length}</strong> eligible pickups (within {MAX_SERVICE_DISTANCE_KM} km)
          </span>
          {(filterType !== 'all' || searchQuery) && (
            <button 
              className="clear-filters-btn"
              onClick={() => {
                setFilterType('all');
                setFilterDistance('5');
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
            <div className="empty-icon"><MailOpen size={40} /></div>
            <h3>
              {pickups.length === 0 
                ? (totalFetchedCount > 0
                  ? `No pickups available within ${MAX_SERVICE_DISTANCE_KM} km`
                  : "No pickups available right now")
                : "No pickups match your filters"}
            </h3>
            <p>
              {pickups.length === 0 
                ? "Check back soon for new pickup requests" 
                : "Try adjusting your search or filter criteria"}
            </p>
            <button className="refresh-action-btn" onClick={fetchPickups}>
              <RefreshCw size={14} /> Refresh
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
                    <Clock size={14} /> {expiryInfo.text}
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
                          <span className="meta-icon"><Package size={14} /></span>
                          {pickup.quantity}
                        </span>
                        <span className="meta-item">
                          <span className="meta-icon"><Ruler size={14} /></span>
                          {pickup.distance} km
                        </span>
                        <span className="meta-item earnings-highlight">
                          <span className="meta-icon"><Wallet size={14} /></span>
                          ₹{pickup.earnings}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Route Preview */}
                  <div className="route-preview">
                    <div className="route-point">
                      <div className="point-marker pickup">
                        <span><MapPin size={14} /></span>
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
                        <span><Flag size={14} /></span>
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
                    <span className="window-icon"><Clock size={14} /></span>
                    <span className="window-text">
                      Pickup: {formatTime(pickup.pickup_window_start)} - {formatTime(pickup.pickup_window_end)}
                    </span>
                  </div>

                  {/* Special Instructions */}
                  {pickup.special_instructions && (
                    <div className="special-instructions">
                      <span className="instruction-icon"><AlertTriangle size={14} /></span>
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
                      <Eye size={14} /> Details
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
                        <><CheckCircle size={14} /> Accept Pickup</>
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
                <h2><Package size={18} /> Pickup Details</h2>
                <button className="modal-close" onClick={() => setShowDetailsModal(false)}>
                  <X size={18} />
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
                    <span className="stat-icon"><Ruler size={16} /></span>
                    <span className="stat-value">{selectedPickup.distance} km</span>
                    <span className="stat-label">Distance</span>
                  </div>
                  <div className="trip-stat">
                    <span className="stat-icon"><Timer size={16} /></span>
                    <span className="stat-value">{selectedPickup.estimated_time}</span>
                    <span className="stat-label">Est. Time</span>
                  </div>
                  <div className="trip-stat">
                    <span className="stat-icon"><Wallet size={16} /></span>
                    <span className="stat-value">₹{selectedPickup.earnings}</span>
                    <span className="stat-label">Earnings</span>
                  </div>
                </div>

                {/* Pickup Location */}
                <div className="modal-section">
                  <h4><MapPin size={16} /> Pickup Location (Farmer)</h4>
                  <div className="contact-card">
                    <div className="contact-details">
                      <span className="contact-name">{selectedPickup.farmer.name}</span>
                      <span className="contact-phone">{selectedPickup.farmer.phone}</span>
                      <span className="contact-address">{selectedPickup.farmer.address}</span>
                      {selectedPickup.farmer.landmark && (
                        <span className="contact-landmark"><MapPinned size={14} /> {selectedPickup.farmer.landmark}</span>
                      )}
                    </div>
                    <div className="contact-actions">
                      <button 
                        className="contact-btn call"
                        onClick={() => openPhoneDialer(selectedPickup.farmer.phone)}
                      >
                        <Phone size={14} />
                      </button>
                      <button 
                        className="contact-btn map"
                        onClick={() => openMaps(selectedPickup.farmer.address)}
                      >
                        <Map size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="pickup-time">
                    <Clock size={14} /> Pickup Window: {formatTime(selectedPickup.pickup_window_start)} - {formatTime(selectedPickup.pickup_window_end)}
                  </div>
                </div>

                {/* Delivery Location */}
                <div className="modal-section">
                  <h4><Flag size={16} /> Delivery Location (NGO)</h4>
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
                        <Phone size={14} />
                      </button>
                      <button 
                        className="contact-btn map"
                        onClick={() => openMaps(selectedPickup.ngo.address)}
                      >
                        <Map size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {(selectedPickup.notes || selectedPickup.special_instructions) && (
                  <div className="modal-section">
                    <h4><FileText size={16} /> Notes & Instructions</h4>
                    {selectedPickup.notes && (
                      <div className="note-item">
                        <span className="note-icon"><MessageSquare size={14} /></span>
                        <span>{selectedPickup.notes}</span>
                      </div>
                    )}
                    {selectedPickup.special_instructions && (
                      <div className="note-item warning">
                        <span className="note-icon"><AlertTriangle size={14} /></span>
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
                  <CheckCircle size={14} /> Accept Pickup
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
                <h2><CheckCircle size={18} /> Accept Pickup</h2>
                <button className="modal-close" onClick={() => setShowAcceptModal(false)}>
                  <X size={18} />
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
                      <span className="summary-label"><Wallet size={14} /> Earnings</span>
                      <span className="summary-value earnings">₹{selectedPickup.earnings}</span>
                    </div>
                  </div>
                </div>

                <div className="accept-checklist">
                  <h4>Before accepting, please ensure:</h4>
                  <ul>
                    <li><Check size={14} /> You can reach the pickup location on time</li>
                    <li><Check size={14} /> Your vehicle can carry {selectedPickup.quantity}</li>
                    <li><Check size={14} /> You have enough fuel for the trip</li>
                  </ul>
                </div>

                <div className="accept-notice">
                  <span className="notice-icon"><Info size={14} /></span>
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
                    <><CheckCircle size={14} /> Confirm & Accept</>
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
              {toastType === 'success' ? <CheckCircle size={16} /> : toastType === 'error' ? <XCircle size={16} /> : <AlertTriangle size={16} />}
            </span>
            <span className="toast-message">{toastMessage}</span>
          </div>
        )}
      </>
    );
  };
  
  export default AvailablePickups;
