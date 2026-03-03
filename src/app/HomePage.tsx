import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './HomePage.css';
import { API_ENDPOINTS } from '../config/api';

// --- Types ---
interface FoodListing {
  id: number;
  farmer_id: number;
  farmer_name?: string;
  title: string;
  quantity: string;
  type: 'Vegetable' | 'Fruit' | 'Grain' | 'Other';
  expiry?: string;
  expiry_date?: string;
  description?: string;
  image?: string;
  created_at?: string;
  status?: 'available' | 'claimed' | 'assigned' | 'in_transit' | 'delivered';
  pickup_location?: string;
  pickup_address?: string;
  delivery_location?: string;
  claimed_by?: number | {
    ngo_id: string;
    ngo_name: string;
    ngo_phone?: string;
    ngo_address?: string;
    claim_quantity?: string;
  };
  assigned_driver?: number | {
    driver_id: string;
    driver_name: string;
    driver_phone?: string;
    vehicle_number?: string;
  };
}

interface User {
  id: number;
  name: string;
  role: 'farmer' | 'ngo' | 'driver';
  email?: string;
  phone?: string;
  address?: string;
  organization?: string;
  vehicle_number?: string;
}

interface DeliveryTask {
  id: number;
  listing_id: number;
  listing_title: string;
  pickup_location: string;
  delivery_location: string;
  status: 'pending' | 'picked_up' | 'in_transit' | 'delivered';
  farmer_name: string;
  ngo_name: string;
  quantity: string;
}

// Function to parse expiry string and calculate countdown
function parseExpiryAndGetCountdown(expiryStr: string | undefined, createdAtStr?: string): { days: number; hours: number; minutes: number; isExpired: boolean } {
  // Handle undefined or empty expiry string
  if (!expiryStr) {
    return { days: 0, hours: 0, minutes: 0, isExpired: false };
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
    return { days: 0, hours: 0, minutes: 0, isExpired: true };
  }

  const timeDiff = expiryDate.getTime() - now.getTime();
  
  if (timeDiff <= 0) {
    return { days: 0, hours: 0, minutes: 0, isExpired: true };
  }

  const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

  return { days, hours, minutes, isExpired: false };
}

// Function to format countdown display
function getCountdownDisplay(expiryStr: string | undefined, createdAtStr?: string): string {
  if (!expiryStr) return 'No expiry set';
  
  const { days, hours, minutes, isExpired } = parseExpiryAndGetCountdown(expiryStr, createdAtStr);
  
  if (isExpired) {
    return 'Expired';
  }
  
  if (days > 0) {
    return `${days}d ${hours}h left`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m left`;
  } else {
    return `${minutes}m left`;
  }
}

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [listings, setListings] = useState<FoodListing[]>([]);
  const [deliveryTasks, setDeliveryTasks] = useState<DeliveryTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [claimingId, setClaimingId] = useState<number | null>(null);
  const [claimQuantity, setClaimQuantity] = useState<{ [key: number]: string }>({});
  const cardRefsMap = useRef<Map<number, HTMLDivElement>>(new Map());
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch listings from backend
  const fetchListings = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.listings);
      const data = await response.json();
      
      if (response.ok) {
        setListings(data.listings || []);
      } else {
        console.error('Error fetching listings:', data.message);
      }
    } catch (err) {
      console.error('Error fetching listings:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch delivery tasks for drivers
  const fetchDeliveryTasks = async (driverId: number) => {
    try {
      const response = await fetch(API_ENDPOINTS.driverTasks(driverId.toString()));
      const data = await response.json();
      
      if (response.ok) {
        // Map listings to delivery tasks format
        const mappedTasks = (data.tasks || []).map((listing: any) => ({
          id: listing.id,
          listing_id: listing.id,
          listing_title: listing.title,
          pickup_location: listing.location || 'Pickup location TBD',
          delivery_location: 'Delivery location TBD',
          status: listing.status || 'pending',
          farmer_name: listing.farmer_name || 'Unknown Farmer',
          ngo_name: 'NGO Name TBD',
          quantity: listing.claimed_quantity || listing.delivery_quantity || listing.quantity
        }));
        setDeliveryTasks(mappedTasks);
      }
    } catch (err) {
      console.error('Error fetching delivery tasks:', err);
    }
  };

  // Intersection Observer for scroll-based reveals
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const element = entry.target as HTMLElement;
            observer.unobserve(element);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px',
      }
    );

    cardRefsMap.current?.forEach((ref: HTMLDivElement) => {
      if (ref) observer.observe(ref);
    });

    return () => {
      observer.disconnect();
    };
  }, [listings]);

  // Set up countdown interval
  useEffect(() => {
    countdownIntervalRef.current = setInterval(() => {
      setListings(prev => {
        const activeListings = prev.filter(listing => {
          const { isExpired } = parseExpiryAndGetCountdown(listing.expiry || listing.expiry_date, listing.created_at);
          
          if (isExpired) {
            // Use correct endpoint for deleting the listing
            fetch(`${API_ENDPOINTS.listings}/${listing.id.toString()}`, {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' }
            }).catch(err => console.error('Error deleting expired listing:', err));
          }
          
          return !isExpired;
        });
        return activeListings;
      });
    }, 60000);

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        // Validate user has required fields and valid role
        if (parsedUser && parsedUser.id && parsedUser.name && 
            ['farmer', 'ngo', 'driver', 'customer'].includes(parsedUser.role)) {
          setUser(parsedUser);
          setLoading(false);
          
          // Fetch role-specific data
          if (parsedUser.role === 'driver') {
            fetchDeliveryTasks(parsedUser.id);
          }
        } else {
          // Invalid user data, redirect to login
          console.error('Invalid user data in localStorage');
          setIsRedirecting(true);
          navigate('/auth');
          return;
        }
      } catch (e) {
        console.error('Error parsing user from localStorage');
        setIsRedirecting(true);
        navigate('/auth');
        return;
      }
    } else {
      // No user found, redirect to login
      setIsRedirecting(true);
      navigate('/auth');
      return;
    }
    fetchListings();
  }, [navigate]);


  const handleClaimDonation = async (listingId: number) => {
    if (user?.role !== 'ngo') {
      alert('Only NGOs can claim donations');
      return;
    }

    const qtyStr = claimQuantity[listingId]?.trim();
    
    if (!qtyStr || parseFloat(qtyStr) <= 0) {
      alert('Please enter a valid quantity to claim');
      return;
    }

    const claimedQty = parseFloat(qtyStr);
    setClaimingId(listingId);

    try {
      // Use the correct endpoint for claiming (from listing_routes.py)
      const response = await fetch(`${API_ENDPOINTS.listings}/${listingId}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ngo_id: String(user.id),
          ngo_name: user.name || 'NGO',
          ngo_phone: user.phone || '',
          ngo_address: user.address || '',
          claim_quantity: String(claimedQty)
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to claim donation');
      }

      setListings(prevListings =>
        prevListings.map(listing =>
          listing.id === listingId
            ? { ...listing, quantity: data.listing.quantity, status: 'claimed', claimed_by: user.id }
            : listing
        )
      );

      setClaimQuantity(prev => {
        const newState = { ...prev };
        delete newState[listingId];
        return newState;
      });

      alert(`Successfully claimed ${claimedQty}kg! Remaining quantity has been updated.`);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
      console.error('Claim error:', err);
    } finally {
      setClaimingId(null);
    }
  };

  const handleDeleteListing = async (listingId: number) => {
    if (user?.role !== 'farmer') {
      alert('Only farmers can delete their listings');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this listing?')) {
      return;
    }

    try {
      // Use correct endpoint from listing_routes.py
      const response = await fetch(`${API_ENDPOINTS.listings}/${listingId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      let data;
      try {
        data = await response.json();
      } catch (jsonErr) {
        const text = await response.text();
        throw new Error(`Backend error (Status ${response.status}): ${text.substring(0, 200)}`);
      }

      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete listing');
      }

      setListings(prevListings => 
        prevListings.filter(listing => listing.id !== listingId)
      );

      alert('Listing deleted successfully');
    } catch (err: any) {
      console.error('Delete error:', err);
      alert(`Error: ${err.message}`);
    }
  };

  // Driver: Accept delivery task
  const handleAcceptDelivery = async (listingId: number) => {
    if (user?.role !== 'driver') return;

    try {
      // Use the correct endpoint for driver assignment (from listing_routes.py)
      const response = await fetch(`${API_ENDPOINTS.listings}/${listingId}/assign-driver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          driver_id: String(user.id),
          driver_name: user.name || 'Driver',
          driver_phone: user.phone || '',
          vehicle_number: user.vehicle_number || ''
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.message || 'Failed to accept delivery');
      }

      setListings(prevListings =>
        prevListings.map(listing =>
          listing.id === listingId
            ? { ...listing, status: 'in_transit', assigned_driver: user.id }
            : listing
        )
      );

      // Refresh delivery tasks
      fetchDeliveryTasks(user.id);
      alert('Delivery accepted successfully!');
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  // Driver: Update delivery status
  const handleUpdateDeliveryStatus = async (taskId: number, newStatus: string) => {
    if (user?.role !== 'driver') return;

    try {
      const response = await fetch(API_ENDPOINTS.deliveryTaskStatus(taskId.toString()), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, driver_id: user.id })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update status');
      }

      fetchDeliveryTasks(user.id);
      alert(`Status updated to: ${newStatus}`);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const filteredListings = activeFilter === 'All' 
    ? listings 
    : listings.filter(item => item.type === activeFilter);

  // Filter listings based on user role
  const getDisplayListings = () => {
    if (!user) return [];
    
    switch (user.role) {
      case 'farmer':
        // Farmers see only their own listings (compare as strings)
        return filteredListings.filter(l => String(l.farmer_id) === String(user.id));
      case 'ngo':
        // NGOs see all available listings
        return filteredListings.filter(l => l.status === 'available' || !l.status);
      case 'driver':
        // Drivers see claimed listings ready for pickup and assigned/in_transit listings they accepted
        return filteredListings.filter(l => l.status === 'claimed' || l.status === 'assigned' || l.status === 'in_transit');
      default:
        return filteredListings;
    }
  };

  const displayListings = getDisplayListings();

  const registerCardRef = useCallback((id: number, ref: HTMLDivElement | null) => {
    if (ref) {
      cardRefsMap.current.set(id, ref);
    }
  }, []);

  // Get urgency level for countdown styling
  const getUrgencyLevel = (expiryStr: string | undefined, createdAtStr?: string): 'critical' | 'warning' | 'safe' => {
    if (!expiryStr) return 'safe';
    const { days, hours, isExpired } = parseExpiryAndGetCountdown(expiryStr, createdAtStr);
    if (isExpired) return 'critical';
    if (days === 0 && hours < 6) return 'critical';
    if (days === 0 || (days === 1 && hours < 12)) return 'warning';
    return 'safe';
  };

  // Get role-specific page title
  const getPageTitle = () => {
    switch (user?.role) {
      case 'farmer':
        return 'Farmer Dashboard';
      case 'ngo':
        return 'NGO Dashboard';
      case 'driver':
        return 'Driver Dashboard';
      default:
        return 'Dashboard';
    }
  };

  // Get role-specific icon
  const getRoleIcon = () => {
    switch (user?.role) {
      case 'farmer':
        return '🌱';
      case 'ngo':
        return '🏢';
      case 'driver':
        return '🚚';
      default:
        return '👤';
    }
  };

  // Get role-specific badge text
  const getRoleBadgeText = () => {
    switch (user?.role) {
      case 'farmer':
        return 'Farmer Account';
      case 'ngo':
        return 'NGO Account';
      case 'driver':
        return 'Driver Account';
      default:
        return 'Account';
    }
  };

  // Render role-specific stats
  const renderStats = () => {
    switch (user?.role) {
      case 'farmer':
        return (
          <section className="stats-section">
            <div className="stat-card primary">
              <div className="stat-icon">📦</div>
              <div className="stat-content">
                <span className="stat-value">{listings.filter(l => l.farmer_id === user.id).length}</span>
                <span className="stat-label">Active Listings</span>
                <span className="stat-change positive">Your donations</span>
              </div>
            </div>
            <div className="stat-card secondary">
              <div className="stat-icon">🤝</div>
              <div className="stat-content">
                <span className="stat-value">{listings.filter(l => l.farmer_id === user.id && l.status === 'claimed').length}</span>
                <span className="stat-label">Claimed Donations</span>
                <span className="stat-change positive">Awaiting pickup</span>
              </div>
            </div>
            <div className="stat-card success">
              <div className="stat-icon">✅</div>
              <div className="stat-content">
                <span className="stat-value">Active</span>
                <span className="stat-label">Account Status</span>
                <span className="stat-change">Ready to donate</span>
              </div>
            </div>
          </section>
        );
      
      case 'ngo':
        return (
          <section className="stats-section">
            <div className="stat-card primary" onClick={() => navigate('/claimed-donations')} style={{cursor: 'pointer'}}>
              <div className="stat-icon">🤝</div>
              <div className="stat-content">
                <span className="stat-value">{listings.filter(l => l.claimed_by === user?.id || String(l.claimed_by) === String(user?.id)).length}</span>
                <span className="stat-label">Claimed Donations</span>
                <span className="stat-change positive">Click to view</span>
              </div>
            </div>
            <div className="stat-card secondary">
              <div className="stat-icon">📦</div>
              <div className="stat-content">
                <span className="stat-value">{listings.filter(l => l.status === 'in_transit' && (l.claimed_by === user?.id || String(l.claimed_by) === String(user?.id))).length}</span>
                <span className="stat-label">In Transit</span>
                <span className="stat-change positive">On the way</span>
              </div>
            </div>
            <div className="stat-card warning">
              <div className="stat-icon">🌾</div>
              <div className="stat-content">
                <span className="stat-value">{listings.filter(l => l.status === 'available' || !l.status).length}</span>
                <span className="stat-label">Available Donations</span>
                <span className="stat-change">Ready to claim</span>
              </div>
            </div>
            <div className="stat-card success">
              <div className="stat-icon">✅</div>
              <div className="stat-content">
                <span className="stat-value">{listings.filter(l => l.status === 'delivered' && (l.claimed_by === user?.id || String(l.claimed_by) === String(user?.id))).length}</span>
                <span className="stat-label">Delivered</span>
                <span className="stat-change">Completed</span>
              </div>
            </div>
          </section>
        );
      
      case 'driver':
        return (
          <section className="stats-section">
            <div className="stat-card primary">
              <div className="stat-icon">🚚</div>
              <div className="stat-content">
                <span className="stat-value">{deliveryTasks.filter(t => t.status === 'in_transit').length}</span>
                <span className="stat-label">Active Deliveries</span>
                <span className="stat-change positive">In progress</span>
              </div>
            </div>
            <div className="stat-card secondary">
              <div className="stat-icon">📍</div>
              <div className="stat-content">
                <span className="stat-value">{listings.filter(l => l.status === 'claimed' && !l.assigned_driver).length}</span>
                <span className="stat-label">Pending Pickups</span>
                <span className="stat-change">Awaiting driver</span>
              </div>
            </div>
            <div className="stat-card success">
              <div className="stat-icon">✅</div>
              <div className="stat-content">
                <span className="stat-value">{deliveryTasks.filter(t => t.status === 'delivered').length}</span>
                <span className="stat-label">Completed Today</span>
                <span className="stat-change positive">Great work!</span>
              </div>
            </div>
            <div className="stat-card warning">
              <div className="stat-icon">⏰</div>
              <div className="stat-content">
                <span className="stat-value">Online</span>
                <span className="stat-label">Availability</span>
                <span className="stat-change">Ready for deliveries</span>
              </div>
            </div>
          </section>
        );
      
      default:
        return null;
    }
  };

  // Render role-specific listing actions
  const renderListingActions = (listing: FoodListing) => {
    switch (user?.role) {
      case 'farmer':
        return (
          <>
            <button
              className="btn-primary-action"
              onClick={() => navigate(`/edit-listing/${listing.id}`)}
            >
              ✏️ Edit
            </button>
            <button
              className="btn-delete"
              onClick={() => handleDeleteListing(listing.id)}
              title="Delete this listing"
            >
              🗑️
            </button>
          </>
        );
      
      case 'ngo':
        return claimingId === listing.id ? (
          <div className="claim-modal">
            <input
              type="number"
              className="claim-input"
              placeholder={`Max: ${listing.quantity}`}
              value={claimQuantity[listing.id] || ''}
              onChange={(e) => setClaimQuantity(prev => ({...prev, [listing.id]: e.target.value}))}
              min="1"
              max={parseFloat(listing.quantity) || 100}
              step="0.5"
              autoFocus
            />
            <button
              className="btn-claim"
              onClick={() => handleClaimDonation(listing.id)}
            >
              ✓ Confirm
            </button>
            <button
              className="btn-cancel"
              onClick={() => {
                setClaimingId(null);
                setClaimQuantity(prev => {
                  const newState = {...prev};
                  delete newState[listing.id];
                  return newState;
                });
              }}
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            className="btn-primary-action"
            onClick={() => setClaimingId(listing.id)}
          >
            🤝 Claim Donation
          </button>
        );
      
      case 'driver':
        // Check if this driver is assigned (handle both object and primitive formats)
        const isAssignedToMe = listing.assigned_driver && (
          listing.assigned_driver === user?.id || 
          (typeof listing.assigned_driver === 'object' && (listing.assigned_driver as any).driver_id === String(user?.id))
        );
        const hasOtherDriver = listing.assigned_driver && !isAssignedToMe;
        
        if (isAssignedToMe) {
          return (
            <div className="driver-actions">
              <span className="status-badge in-transit">🚚 Assigned to you</span>
              <button
                className="btn-primary-action"
                onClick={() => navigate(`/delivery/${listing.id}`)}
              >
                📍 View Route
              </button>
            </div>
          );
        } else if (!listing.assigned_driver) {
          return (
            <button
              className="btn-primary-action accept-btn"
              onClick={() => handleAcceptDelivery(listing.id)}
            >
              ✅ Accept Delivery
            </button>
          );
        } else if (hasOtherDriver) {
          return <span className="status-badge">Assigned to another driver</span>;
        }
        return null;
      
      case 'customer':
        return (
          <button
            className="btn-primary-action"
            onClick={() => navigate(`/marketplace/product/${listing.id}`)}
          >
            🛒 View & Order
          </button>
        );

      default:
        return null;
    }
  };

  // Render section title based on role
  const getSectionTitle = () => {
    switch (user?.role) {
      case 'farmer':
        return 'My Donations';
      case 'ngo':
        return 'Available Donations';
      case 'driver':
        return 'Deliveries to Pick Up';
      default:
        return 'Listings';
    }
  };

  // Render driver's delivery tasks section
  const renderDriverDeliveryTasks = () => {
    if (user?.role !== 'driver' || deliveryTasks.length === 0) return null;

    return (
      <section className="delivery-tasks-section">
        <div className="section-header">
          <h2 className="section-title">My Active Deliveries</h2>
          <span className="listings-count">{deliveryTasks.filter(t => t.status !== 'delivered').length} active</span>
        </div>
        
        <div className="delivery-tasks-grid">
          {deliveryTasks.filter(t => t.status !== 'delivered').map(task => (
            <div key={task.id} className="delivery-task-card">
              <div className="task-header">
                <h3>{task.listing_title}</h3>
                <span className={`status-badge ${task.status}`}>
                  {task.status.replace('_', ' ')}
                </span>
              </div>
              
              <div className="task-details">
                <div className="detail-row">
                  <span className="detail-icon">📦</span>
                  <span>Quantity: {task.quantity}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-icon">🌱</span>
                  <span>From: {task.farmer_name}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-icon">🏢</span>
                  <span>To: {task.ngo_name}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-icon">📍</span>
                  <span>Pickup: {task.pickup_location}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-icon">🎯</span>
                  <span>Delivery: {task.delivery_location}</span>
                </div>
              </div>
              
              <div className="task-actions">
                {task.status === 'pending' && (
                  <button
                    className="btn-primary-action"
                    onClick={() => handleUpdateDeliveryStatus(task.id, 'picked_up')}
                  >
                    📦 Mark as Picked Up
                  </button>
                )}
                {task.status === 'picked_up' && (
                  <button
                    className="btn-primary-action"
                    onClick={() => handleUpdateDeliveryStatus(task.id, 'in_transit')}
                  >
                    🚚 Start Delivery
                  </button>
                )}
                {task.status === 'in_transit' && (
                  <button
                    className="btn-primary-action success"
                    onClick={() => handleUpdateDeliveryStatus(task.id, 'delivered')}
                  >
                    ✅ Mark as Delivered
                  </button>
                )}
                <button
                  className="btn-secondary"
                  onClick={() => navigate(`/delivery/${task.listing_id}`)}
                >
                  🗺️ View Route
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  };

  if (isRedirecting) {
    // Show a message while redirecting
    return (
      <div className="loading-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f5f5f5' }}>
        <p style={{ fontSize: '18px', color: '#666' }}>Redirecting to login...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <>
        {/* Top Header */}
        <header className="top-header">
          <div className="header-left">
            <h1 className="page-title">{getPageTitle()}</h1>
            <p className="page-subtitle">Welcome back, <strong>{user?.name}</strong></p>
          </div>
          
          <div className="header-right">
            <div className={`user-badge ${user.role}`}>
              <span className="badge-icon">{getRoleIcon()}</span>
              <span className="badge-text">{getRoleBadgeText()}</span>
            </div>
            <div className={`user-avatar ${user.role}`}>
              {user?.name.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Role-specific Stats */}
        {renderStats()}

        {/* Driver's Active Deliveries Section */}
        {renderDriverDeliveryTasks()}

        {/* Listings Section */}
        <section className="listings-section">
          <div className="listings-header">
            <div className="listings-title-group">
              <h2 className="section-title">{getSectionTitle()}</h2>
              <span className="listings-count">{displayListings.length} listings</span>
            </div>
            
            <div className="listings-toolbar">
              <div className="listings-toolbar-left">
                <div className="filter-group">
                  {['All', 'Vegetable', 'Fruit', 'Grain'].map(filter => (
                    <button 
                      key={filter}
                      className={`filter-btn ${activeFilter === filter ? 'active' : ''}`}
                      onClick={() => setActiveFilter(filter)}
                    >
                      <span className="filter-icon">
                        {filter === 'All' ? '🌟' : 
                        filter === 'Vegetable' ? '🥦' :
                        filter === 'Fruit' ? '🍎' : '🌾'}
                      </span>
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              <div className="listings-toolbar-right">
                <button 
                  className="refresh-btn"
                  onClick={() => {
                    fetchListings();
                    if (user?.role === 'driver') {
                      fetchDeliveryTasks(user.id);
                    }
                  }}
                  title="Refresh listings"
                >
                  🔄
                </button>
                
                {user?.role === 'farmer' && (
                  <button 
                    className="new-listing-btn"
                    onClick={() => navigate('/listing')}
                  >
                    <span>+</span> New Listing
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="listings-grid">
            {loading ? (
              <div className="empty-state">
                <div className="loading-spinner"></div>
                <p>Loading listings...</p>
              </div>
            ) : displayListings.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <h3>
                  {user?.role === 'farmer' 
                    ? 'No listings yet' 
                    : user?.role === 'driver'
                    ? 'No deliveries available'
                    : 'No donations available'}
                </h3>
                <p>
                  {user?.role === 'farmer' 
                    ? 'Create your first listing to get started!' 
                    : user?.role === 'driver'
                    ? 'Check back soon for new pickup requests'
                    : 'Check back soon for new donations'}
                </p>
                {user?.role === 'farmer' && (
                  <button 
                    className="empty-action-btn"
                    onClick={() => navigate('/listing')}
                  >
                    Create Listing
                  </button>
                )}
              </div>
            ) : (
              displayListings.map((listing, index) => {
                const urgencyLevel = getUrgencyLevel(listing.expiry || listing.expiry_date, listing.created_at);
                return (
                  <div 
                    key={listing.id} 
                    className={`listing-card ${urgencyLevel}`}
                    ref={(ref) => registerCardRef(listing.id, ref)}
                    data-card-id={listing.id}
                    style={{
                      opacity: 1,
                      transform: 'translateY(0) scale(1)',
                      transition: `all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${index * 80}ms`,
                    }}
                  >
                    {/* Status Badge for Driver View */}
                    {user?.role === 'driver' && listing.status && (
                      <div className={`status-ribbon ${listing.status}`}>
                        {listing.status === 'claimed' ? '🤝 Awaiting Pickup' : 
                         listing.status === 'assigned' ? '✅ Assigned' :
                         listing.status === 'in_transit' ? '🚚 In Transit' : 
                         listing.status}
                      </div>
                    )}

                    {/* Urgency Badge */}
                    {urgencyLevel === 'critical' && (
                      <div className="urgency-badge critical">
                        ⚠️ Urgent
                      </div>
                    )}
                    {urgencyLevel === 'warning' && (
                      <div className="urgency-badge warning">
                        ⏰ Expiring Soon
                      </div>
                    )}
                    
                    {/* Card Image */}
                    <div className="card-image">
                      {listing.image ? (
                        <img 
                          src={listing.image} 
                          alt={listing.title}
                        />
                      ) : (
                        <div className="card-emoji">
                          {listing.type === 'Vegetable' ? '🥦' : 
                           listing.type === 'Fruit' ? '🍎' : 
                           listing.type === 'Grain' ? '🌾' : '🍱'}
                        </div>
                      )}
                      <div className="card-type-badge">
                        {listing.type}
                      </div>
                    </div>
                    
                    {/* Card Content */}
                    <div className="card-content">
                      <h3 className="card-title">{listing.title}</h3>
                      
                      <div className="card-details">
                        <div className="detail-row">
                          <span className="detail-icon">📦</span>
                          <span className="detail-label">Quantity:</span>
                          <span className="detail-value">
                            {/* For drivers, show claimed quantity if available */}
                            {user?.role === 'driver' && listing.claimed_by && typeof listing.claimed_by === 'object' && listing.claimed_by.claim_quantity
                              ? `${listing.claimed_by.claim_quantity} kg (claimed)`
                              : (listing.quantity || 'N/A')}
                          </span>
                        </div>
                        
                        <div className="detail-row">
                          <span className="detail-icon">⏳</span>
                          <span className="detail-label">Expires:</span>
                          <span className={`detail-value countdown ${urgencyLevel}`}>
                            {getCountdownDisplay(listing.expiry || listing.expiry_date, listing.created_at)}
                          </span>
                        </div>

                        {/* Show farmer name for NGO and Driver */}
                        {(user?.role === 'ngo' || user?.role === 'driver') && listing.farmer_name && (
                          <div className="detail-row">
                            <span className="detail-icon">🌱</span>
                            <span className="detail-label">Farmer:</span>
                            <span className="detail-value">{listing.farmer_name}</span>
                          </div>
                        )}

                        {/* Show pickup location for Driver */}
                        {user?.role === 'driver' && (listing.pickup_location || listing.pickup_address) && (
                          <div className="detail-row">
                            <span className="detail-icon">📍</span>
                            <span className="detail-label">Pickup:</span>
                            <span className="detail-value">{listing.pickup_location || listing.pickup_address}</span>
                          </div>
                        )}

                        {/* Show NGO name for Driver */}
                        {user?.role === 'driver' && listing.claimed_by && typeof listing.claimed_by === 'object' && listing.claimed_by.ngo_name && (
                          <div className="detail-row">
                            <span className="detail-icon">🏢</span>
                            <span className="detail-label">NGO:</span>
                            <span className="detail-value">{listing.claimed_by.ngo_name}</span>
                          </div>
                        )}

                        {/* Show delivery address (NGO address) for Driver */}
                        {user?.role === 'driver' && listing.claimed_by && typeof listing.claimed_by === 'object' && listing.claimed_by.ngo_address && (
                          <div className="detail-row">
                            <span className="detail-icon">🏠</span>
                            <span className="detail-label">Delivery:</span>
                            <span className="detail-value">{listing.claimed_by.ngo_address}</span>
                          </div>
                        )}
                        
                        {listing.description && (
                          <div className="detail-row full-width">
                            <span className="detail-icon">📝</span>
                            <span className="detail-label">Notes:</span>
                            <span className="detail-value">{listing.description}</span>
                          </div>
                        )}
                      </div>

                      {/* Role-specific Action Buttons */}
                      <div className="card-actions">
                        {renderListingActions(listing)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

    </>
  );
};

export default HomePage;
