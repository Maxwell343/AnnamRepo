import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './Tracking.css';
import { API_ENDPOINTS } from '../../../config/api';
import { Truck, ArrowLeft, ArrowRight, Package, User, CheckCircle, Car, XCircle, MapPin, ShieldCheck, Check, Wheat, Phone, Building2 } from 'lucide-react';

interface User {
  id: string;
  name: string;
  role: 'farmer' | 'ngo' | 'driver';
  phone?: string;
}

interface OrderDetails {
  id: string;
  title: string;
  quantity: string;
  type: string;
  status: 'claimed' | 'assigned' | 'in_transit' | 'delivered';
  farmer_name?: string;
  farmer_phone?: string;
  pickup_location?: string;
  pickup_address?: string;
  ngo_name?: string;
  ngo_phone?: string;
  ngo_address?: string;
  driver_name?: string;
  driver_phone?: string;
  vehicle_number?: string;
  claimed_at?: string;
  assigned_at?: string;
  picked_up_at?: string;
  delivered_at?: string;
  otp?: string;
}

const OrderTracking: React.FC = () => {
  const navigate = useNavigate();
  const { orderId } = useParams<{ orderId: string }>();
  
  const [user, setUser] = useState<User | null>(null);
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [orders, setOrders] = useState<OrderDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Generate a simple OTP based on order ID
  const generateOTP = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = ((hash << 5) - hash) + id.charCodeAt(i);
      hash |= 0;
    }
    return String(Math.abs(hash) % 10000).padStart(4, '0');
  };

  // Fetch all trackable orders for NGO
  const fetchTrackableOrders = useCallback(async () => {
    if (!user) return;
    
    try {
      const response = await fetch(`${API_ENDPOINTS.marketplace.listings}?user_id=${user.id}`);
      const data = await response.json();
      
      if (response.ok) {
        const trackableOrders = (data.listings || [])
          .filter((listing: any) => ['assigned', 'in_transit'].includes(listing.status))
          .map((listing: any) => ({
            id: listing.id,
            title: listing.title,
            quantity: listing.claimed_by?.claim_quantity || listing.quantity,
            type: listing.type,
            status: listing.status,
            farmer_name: listing.farmer_name,
            pickup_location: listing.pickup_location || listing.pickup_address,
            driver_name: listing.assigned_driver?.driver_name,
            driver_phone: listing.assigned_driver?.driver_phone,
            claimed_at: listing.claimed_at,
            assigned_at: listing.assigned_at
          }));
        setOrders(trackableOrders);
      }
    } catch (err) {
      console.error('Error fetching trackable orders:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch order details
  const fetchOrderDetails = useCallback(async () => {
    if (!orderId) return;
    
    try {
      const response = await fetch(API_ENDPOINTS.marketplace.listingById(orderId));
      const data = await response.json();
      
      if (response.ok) {
        const listing = data;
        setOrder({
          id: listing.id,
          title: listing.title,
          quantity: listing.claimed_by?.claim_quantity || listing.quantity,
          type: listing.type,
          status: listing.status || 'claimed',
          farmer_name: listing.farmer_name,
          farmer_phone: listing.farmer_phone,
          pickup_location: listing.pickup_location || listing.pickup_address,
          pickup_address: listing.pickup_address || listing.pickup_location,
          ngo_name: listing.claimed_by?.ngo_name,
          ngo_phone: listing.claimed_by?.ngo_phone,
          ngo_address: listing.claimed_by?.ngo_address,
          driver_name: listing.assigned_driver?.driver_name,
          driver_phone: listing.assigned_driver?.driver_phone,
          vehicle_number: listing.assigned_driver?.vehicle_number,
          claimed_at: listing.claimed_at,
          assigned_at: listing.assigned_at,
          picked_up_at: listing.picked_up_at,
          delivered_at: listing.delivered_at,
          otp: generateOTP(listing.id)
        });
      } else {
        setError('Order not found');
      }
    } catch (err) {
      console.error('Error fetching order:', err);
      setError('Failed to fetch order details');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    } else {
      navigate('/');
      return;
    }
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    
    // If orderId is provided, fetch single order details
    if (orderId) {
      fetchOrderDetails();
      
      // Auto-refresh every 5 seconds to sync with driver updates
      const interval = setInterval(() => {
        fetchOrderDetails();
      }, 5000);
      
      return () => clearInterval(interval);
    } else {
      // If no orderId, fetch all trackable orders
      fetchTrackableOrders();
      
      // Auto-refresh every 10 seconds
      const interval = setInterval(() => {
        fetchTrackableOrders();
      }, 10000);
      
      return () => clearInterval(interval);
    }
  }, [user, orderId, fetchOrderDetails, fetchTrackableOrders]);

  // Get timeline step status
  const getStepStatus = (step: string): 'completed' | 'active' | 'pending' => {
    if (!order) return 'pending';
    
    const statusOrder = ['claimed', 'assigned', 'in_transit', 'delivered'];
    const currentIndex = statusOrder.indexOf(order.status);
    
    switch (step) {
      case 'claimed':
        return currentIndex >= 0 ? 'completed' : 'pending';
      case 'assigned':
        if (currentIndex > 1) return 'completed';
        if (currentIndex === 1) return 'active';
        return 'pending';
      case 'in_transit':
        if (currentIndex > 2) return 'completed';
        if (currentIndex === 2) return 'active';
        return 'pending';
      case 'delivered':
        if (currentIndex >= 3) return 'completed';
        return 'pending';
      default:
        return 'pending';
    }
  };

  // Format date
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status display
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'claimed': return { label: 'Awaiting Driver', color: '#ff9800' };
      case 'assigned': return { label: 'Driver Assigned', color: '#4caf50' };
      case 'in_transit': return { label: 'In Transit', color: '#03a9f4' };
      case 'delivered': return { label: 'Delivered', color: '#9c27b0' };
      default: return { label: status, color: '#666' };
    }
  };

  if (loading) {
    return (
      <div className="tracking-container">
        <div className="tracking-card">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading order details...</p>
          </div>
        </div>
      </div>
    );
  }

  // If no orderId, show list of trackable orders
  if (!orderId) {
    return (
      <div className="tracking-container">
        <div className="tracking-card" style={{ maxWidth: '800px' }}>
          <div className="order-body">
            <div className="order-header" style={{ marginBottom: '1.5rem' }}>
              <div>
                <h2 className="order-title" style={{ margin: 0 }}><Truck size={20} /> Order Tracking</h2>
                <p style={{ color: '#666', marginTop: '0.5rem' }}>Track your active deliveries in real-time</p>
              </div>
              <button 
                className="btn-back" 
                onClick={() => navigate('/home')}
                style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
              >
                <ArrowLeft size={14} /> Back
              </button>
            </div>

            {orders.length === 0 ? (
              <div className="empty-state" style={{ textAlign: 'center', padding: '3rem' }}>
                <span style={{ fontSize: '4rem', display: 'block', marginBottom: '1rem' }}><Package size={48} /></span>
                <h3 style={{ color: '#333', marginBottom: '0.5rem' }}>No Active Deliveries</h3>
                <p style={{ color: '#666' }}>Orders with assigned drivers will appear here for tracking.</p>
                <button 
                  className="btn-back" 
                  onClick={() => navigate('/claimed-donations')}
                  style={{ marginTop: '1rem' }}
                >
                  View All Claims
                </button>
              </div>
            ) : (
              <div className="orders-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {orders.map((ord) => (
                  <div 
                    key={ord.id}
                    className="order-card"
                    onClick={() => navigate(`/order-tracking/${ord.id}`)}
                    style={{
                      background: '#f9f9f9',
                      borderRadius: '12px',
                      padding: '1.25rem',
                      cursor: 'pointer',
                      border: '2px solid transparent',
                      transition: 'all 0.3s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#4caf50';
                      e.currentTarget.style.background = '#fff';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'transparent';
                      e.currentTarget.style.background = '#f9f9f9';
                    }}
                  >
                    <div style={{ 
                      fontSize: '2.5rem',
                      width: '60px',
                      height: '60px',
                      background: ord.status === 'in_transit' ? '#e3f2fd' : '#e8f5e9',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {ord.status === 'in_transit' ? <Truck size={16} /> : <User size={16} />}
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <h3 style={{ margin: '0 0 0.25rem 0', color: '#333', fontSize: '1.1rem' }}>
                        {ord.title}
                      </h3>
                      <p style={{ margin: '0 0 0.5rem 0', color: '#666', fontSize: '0.9rem' }}>
                        {ord.quantity} kg • From {ord.farmer_name || 'Farmer'}
                      </p>
                      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem' }}>
                        <span style={{ 
                          background: ord.status === 'in_transit' ? '#03a9f4' : '#4caf50',
                          color: 'white',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '20px',
                          fontWeight: '600'
                        }}>
                          {ord.status === 'in_transit' ? <><Truck size={12} /> In Transit</> : <><CheckCircle size={12} /> Driver Assigned</>}
                        </span>
                        {ord.driver_name && (
                          <span style={{ color: '#666' }}>
                            <Car size={14} /> {ord.driver_name}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div style={{ 
                      color: '#4caf50',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}>
                      Track <ArrowRight size={14} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Auto-refresh indicator */}
            <div className="refresh-indicator" style={{ marginTop: '1.5rem' }}>
              <span className="refresh-dot"></span>
              <span>Auto-updating every 10 seconds</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="tracking-container">
        <div className="tracking-card">
          <div className="error-state">
            <span className="error-icon"><XCircle size={32} /></span>
            <h3>{error || 'Order not found'}</h3>
            <button className="btn-back" onClick={() => navigate('/home')}>
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const statusDisplay = getStatusDisplay(order.status);
  const isDriver = user?.role === 'driver';
  const isNGO = user?.role === 'ngo';

  return (
    <div className="tracking-container">
      <div className="tracking-card">
        
        {/* Map Visualization Placeholder */}
        <div className="map-placeholder">
          <div className="map-content">
            <span className="map-icon"><MapPin size={20} /></span>
            <span className="map-text">Live Tracking</span>
            {order.status === 'in_transit' && (
              <div className="live-indicator">
                <span className="pulse"></span>
                <span>Driver is on the way</span>
              </div>
            )}
          </div>
        </div>

        <div className="order-body">
          {/* Header */}
          <div className="order-header">
            <div>
              <div className="order-id">#{order.id.slice(-8).toUpperCase()}</div>
              <h2 className="order-title">{order.title} ({order.quantity} kg)</h2>
            </div>
            <span 
              className="status-badge" 
              style={{ backgroundColor: statusDisplay.color }}
            >
              {statusDisplay.label}
            </span>
          </div>

          {/* OTP Section - Only show when driver is assigned */}
          {order.status !== 'claimed' && order.status !== 'delivered' && (
            <div className="otp-section">
              <span className="otp-label"><ShieldCheck size={14} /> Secure Verification Code</span>
              <div className="otp-code">{order.otp}</div>
              <p className="otp-instruction">
                {isDriver 
                  ? 'Verify this code at pickup and delivery points.' 
                  : isNGO 
                    ? 'Share this code with the driver upon delivery.' 
                    : 'Share this code with the driver at pickup.'}
              </p>
            </div>
          )}

          {/* Timeline */}
          <div className="timeline">
            <div className={`timeline-item ${getStepStatus('claimed')}`}>
              <div className="timeline-dot">
                {getStepStatus('claimed') === 'completed' ? <Check size={14} /> : '1'}
              </div>
              <div className="timeline-content">
                <div className="timeline-title">Donation Claimed</div>
                <div className="timeline-desc">
                  {order.ngo_name ? `Claimed by ${order.ngo_name}` : 'NGO has claimed this donation'}
                </div>
                {order.claimed_at && (
                  <div className="timeline-time">{formatDate(order.claimed_at)}</div>
                )}
              </div>
            </div>
            
            <div className={`timeline-item ${getStepStatus('assigned')}`}>
              <div className="timeline-dot">
                {getStepStatus('assigned') === 'completed' ? <Check size={14} /> : '2'}
              </div>
              <div className="timeline-content">
                <div className="timeline-title">Driver Assigned</div>
                <div className="timeline-desc">
                  {order.driver_name 
                    ? `${order.driver_name} is handling the delivery`
                    : 'Waiting for driver to accept'}
                </div>
                {order.assigned_at && (
                  <div className="timeline-time">{formatDate(order.assigned_at)}</div>
                )}
              </div>
            </div>

            <div className={`timeline-item ${getStepStatus('in_transit')}`}>
              <div className="timeline-dot">
                {getStepStatus('in_transit') === 'completed' ? <Check size={14} /> : '3'}
              </div>
              <div className="timeline-content">
                <div className="timeline-title">In Transit</div>
                <div className="timeline-desc">
                  {order.status === 'in_transit' 
                    ? 'Driver picked up and is on the way'
                    : 'Driver will pick up from farmer'}
                </div>
                {order.picked_up_at && (
                  <div className="timeline-time">{formatDate(order.picked_up_at)}</div>
                )}
              </div>
            </div>

            <div className={`timeline-item ${getStepStatus('delivered')}`}>
              <div className="timeline-dot">
                {getStepStatus('delivered') === 'completed' ? <Check size={14} /> : '4'}
              </div>
              <div className="timeline-content">
                <div className="timeline-title">Delivered</div>
                <div className="timeline-desc">
                  {order.status === 'delivered' 
                    ? `Delivered to ${order.ngo_name || 'NGO'}`
                    : `Will be delivered to ${order.ngo_address || 'NGO location'}`}
                </div>
                {order.delivered_at && (
                  <div className="timeline-time">{formatDate(order.delivered_at)}</div>
                )}
              </div>
            </div>
          </div>

          {/* Details Section */}
          <div className="details-section">
            {/* Pickup Details */}
            <div className="detail-card">
              <div className="detail-header">
                <span className="detail-icon"><Wheat size={16} /></span>
                <span className="detail-label">Pickup Location</span>
              </div>
              <div className="detail-content">
                <div className="detail-name">{order.farmer_name || 'Farmer'}</div>
                <div className="detail-address">{order.pickup_location || order.pickup_address || 'Address not specified'}</div>
                {order.farmer_phone && (
                  <a href={`tel:${order.farmer_phone}`} className="detail-phone">
                    <Phone size={14} /> {order.farmer_phone}
                  </a>
                )}
              </div>
            </div>

            {/* Delivery Details */}
            <div className="detail-card">
              <div className="detail-header">
                <span className="detail-icon"><Building2 size={16} /></span>
                <span className="detail-label">Delivery Location</span>
              </div>
              <div className="detail-content">
                <div className="detail-name">{order.ngo_name || 'NGO'}</div>
                <div className="detail-address">{order.ngo_address || 'Address not specified'}</div>
                {order.ngo_phone && (
                  <a href={`tel:${order.ngo_phone}`} className="detail-phone">
                    <Phone size={14} /> {order.ngo_phone}
                  </a>
                )}
              </div>
            </div>

            {/* Driver Details - Show if assigned */}
            {order.driver_name && !isDriver && (
              <div className="detail-card driver-card">
                <div className="detail-header">
                  <span className="detail-icon"><Truck size={16} /></span>
                  <span className="detail-label">Driver</span>
                </div>
                <div className="detail-content">
                  <div className="driver-info-row">
                    <div className="driver-avatar"><User size={20} /></div>
                    <div className="driver-details">
                      <div className="detail-name">{order.driver_name}</div>
                      {order.vehicle_number && (
                        <div className="vehicle-number"><Car size={14} /> {order.vehicle_number}</div>
                      )}
                    </div>
                    {order.driver_phone && (
                      <a href={`tel:${order.driver_phone}`} className="call-btn">
                        <Phone size={14} /> Call
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Auto-refresh indicator */}
          <div className="refresh-indicator">
            <span className="refresh-dot"></span>
            <span>Auto-updating every 5 seconds</span>
          </div>

          <button className="btn-back" onClick={() => navigate(isNGO ? '/claimed-donations' : '/home')}>
            <ArrowLeft size={14} /> Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderTracking;
