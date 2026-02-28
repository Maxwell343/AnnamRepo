import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Truck, CheckCircle, XCircle, Circle, Wallet, ClipboardList, Bell, Search, X, RefreshCw, MailOpen, Flame, Zap, Leaf, Apple, Wheat, Ruler, MapPin, Phone, Map, Flag, Calendar, FileText, Eye, Camera, Sprout, Building2, BarChart3, Hourglass, Clock } from 'lucide-react';
import './MyDeliveries.css';
import { API_ENDPOINTS } from '../../../config/api';

// --- Types ---
interface User {
  id: number;
  name: string;
  role: 'farmer' | 'ngo' | 'driver';
  phone?: string;
  vehicle_number?: string;
}

interface DeliveryTask {
  id: number;
  listing_id: number;
  driver_id: number;
  title: string;
  quantity: string;
  type: 'Vegetable' | 'Fruit' | 'Grain' | 'Other';
  status: 'pending' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
  priority: 'normal' | 'high' | 'urgent';
  
  // Farmer info
  farmer: {
    id: number;
    name: string;
    phone: string;
    address: string;
  };
  
  // NGO info
  ngo: {
    id: number;
    name: string;
    organization: string;
    phone: string;
    address: string;
  };
  
  // Timing
  created_at: string;
  pickup_time?: string;
  estimated_delivery?: string;
  delivered_at?: string;
  
  // Additional
  distance?: string;
  earnings?: number;
  notes?: string;
  image?: string;
}

type FilterStatus = 'all' | 'pending' | 'picked_up' | 'in_transit' | 'delivered';
type SortOption = 'newest' | 'priority' | 'distance' | 'earnings';

const MyDeliveries: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [deliveries, setDeliveries] = useState<DeliveryTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Filters
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryTask | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // Fetch deliveries from API
  const mockDeliveries: DeliveryTask[] = [];

  // Fetch deliveries from API
  const fetchDeliveries = useCallback(async () => {
    if (!user) return;
    
    try {
      const response = await fetch(API_ENDPOINTS.driverTasks(user.id.toString()));
      const data = await response.json();
      
      if (response.ok) {
        // Map API data to DeliveryTask format
        const formattedTasks = data.tasks.map((task: any) => ({
          id: task.id,
          listing_id: task.id,
          driver_id: user.id,
          title: task.title,
          quantity: task.delivery_quantity || task.claimed_quantity || task.quantity,
          type: task.type,
          status: task.status,
          priority: 'normal',
          farmer: {
            id: task.farmer_id,
            name: task.farmer_name || 'Unknown Farmer',
            phone: '+91 00000 00000',
            address: task.location || 'Location not specified'
          },
          ngo: {
            id: 1,
            name: 'NGO Contact',
            organization: 'NGO Organization',
            phone: '+91 00000 00000',
            address: 'Delivery location'
          },
          created_at: task.created_at,
          distance: '',
          earnings: 0,
          notes: task.description
        }));
        setDeliveries(formattedTasks);
      } else {
        console.error('Error fetching tasks:', data.message);
        setDeliveries([]);
      }
    } catch (err) {
      console.error('Error fetching deliveries:', err);
      setDeliveries([]);
    } finally {
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
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchDeliveries();
    }
  }, [user, fetchDeliveries]);

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

  // Update delivery status
  const handleUpdateStatus = async (deliveryId: number, newStatus: string) => {
    setUpdatingId(deliveryId);
    
    try {
      // Replace with actual API call
      // await fetch(`http://localhost:8000/api/deliveries/${deliveryId}/status`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ status: newStatus, driver_id: user?.id })
      // });

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));

      setDeliveries(prev => prev.map(d => 
        d.id === deliveryId 
          ? { 
              ...d, 
              status: newStatus as DeliveryTask['status'],
              pickup_time: newStatus === 'picked_up' ? new Date().toISOString() : d.pickup_time,
              delivered_at: newStatus === 'delivered' ? new Date().toISOString() : d.delivered_at
            }
          : d
      ));

      setShowUpdateModal(false);
      setSelectedDelivery(null);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  // Filter and sort deliveries
  const filteredDeliveries = deliveries
    .filter(delivery => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!delivery.title.toLowerCase().includes(query) &&
            !delivery.farmer.name.toLowerCase().includes(query) &&
            !delivery.ngo.name.toLowerCase().includes(query) &&
            !delivery.ngo.organization.toLowerCase().includes(query)) {
          return false;
        }
      }
      
      if (filterStatus !== 'all' && delivery.status !== filterStatus) {
        return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'priority':
          const priorityOrder = { urgent: 0, high: 1, normal: 2 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        case 'distance':
          return parseFloat(a.distance || '0') - parseFloat(b.distance || '0');
        case 'earnings':
          return (b.earnings || 0) - (a.earnings || 0);
        default:
          return 0;
      }
    });

  // Stats
  const stats = {
    total: deliveries.length,
    pending: deliveries.filter(d => d.status === 'pending').length,
    pickedUp: deliveries.filter(d => d.status === 'picked_up').length,
    inTransit: deliveries.filter(d => d.status === 'in_transit').length,
    delivered: deliveries.filter(d => d.status === 'delivered').length,
    todayEarnings: deliveries
      .filter(d => d.status === 'delivered' && d.delivered_at && 
        new Date(d.delivered_at).toDateString() === new Date().toDateString())
      .reduce((sum, d) => sum + (d.earnings || 0), 0),
    totalEarnings: deliveries
      .filter(d => d.status === 'delivered')
      .reduce((sum, d) => sum + (d.earnings || 0), 0)
  };

  const getStatusIcon = (status: string): React.ReactNode => {
    switch (status) {
      case 'pending': return <Hourglass size={14} />;
      case 'picked_up': return <Package size={14} />;
      case 'in_transit': return <Truck size={14} />;
      case 'delivered': return <CheckCircle size={14} />;
      case 'cancelled': return <XCircle size={14} />;
      default: return <Circle size={14} />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pending Pickup';
      case 'picked_up': return 'Picked Up';
      case 'in_transit': return 'In Transit';
      case 'delivered': return 'Delivered';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const getPriorityClass = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'priority-urgent';
      case 'high': return 'priority-high';
      default: return 'priority-normal';
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getNextStatus = (currentStatus: string): { status: string; label: string; icon: React.ReactNode } | null => {
    switch (currentStatus) {
      case 'pending':
        return { status: 'picked_up', label: 'Mark as Picked Up', icon: <Package size={14} /> };
      case 'picked_up':
        return { status: 'in_transit', label: 'Start Delivery', icon: <Truck size={14} /> };
      case 'in_transit':
        return { status: 'delivered', label: 'Mark as Delivered', icon: <CheckCircle size={14} /> };
      default:
        return null;
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
        <p>Loading your deliveries...</p>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <header className="top-header">
          <div className="header-left">
            <h1 className="page-title"><Truck size={22} /> My Deliveries</h1>
            <p className="page-subtitle">Manage your pickup and delivery tasks</p>
          </div>
          
          <div className="header-right">
            <div className="earnings-badge">
              <span className="earnings-icon"><Wallet size={16} /></span>
              <div className="earnings-info">
                <span className="earnings-label">Today's Earnings</span>
                <span className="earnings-value">₹{stats.todayEarnings}</span>
              </div>
            </div>
            <div className="user-avatar driver">
              {user?.name.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Quick Stats */}
        <section className="delivery-stats">
          <div 
            className={`delivery-stat-card ${filterStatus === 'all' ? 'active' : ''}`}
            onClick={() => setFilterStatus('all')}
          >
            <div className="stat-icon-circle all">
              <span><ClipboardList size={16} /></span>
            </div>
            <div className="stat-details">
              <span className="stat-number">{stats.total}</span>
              <span className="stat-label">Total Tasks</span>
            </div>
          </div>

          <div 
            className={`delivery-stat-card pending ${filterStatus === 'pending' ? 'active' : ''}`}
            onClick={() => setFilterStatus('pending')}
          >
            <div className="stat-icon-circle pending">
              <span><Hourglass size={16} /></span>
            </div>
            <div className="stat-details">
              <span className="stat-number">{stats.pending}</span>
              <span className="stat-label">Pending</span>
            </div>
            {stats.pending > 0 && <span className="stat-badge">{stats.pending}</span>}
          </div>

          <div 
            className={`delivery-stat-card picked ${filterStatus === 'picked_up' ? 'active' : ''}`}
            onClick={() => setFilterStatus('picked_up')}
          >
            <div className="stat-icon-circle picked">
              <span><Package size={16} /></span>
            </div>
            <div className="stat-details">
              <span className="stat-number">{stats.pickedUp}</span>
              <span className="stat-label">Picked Up</span>
            </div>
          </div>

          <div 
            className={`delivery-stat-card transit ${filterStatus === 'in_transit' ? 'active' : ''}`}
            onClick={() => setFilterStatus('in_transit')}
          >
            <div className="stat-icon-circle transit">
              <span><Truck size={16} /></span>
            </div>
            <div className="stat-details">
              <span className="stat-number">{stats.inTransit}</span>
              <span className="stat-label">In Transit</span>
            </div>
            {stats.inTransit > 0 && (
              <span className="stat-badge transit">{stats.inTransit}</span>
            )}
          </div>

          <div 
            className={`delivery-stat-card delivered ${filterStatus === 'delivered' ? 'active' : ''}`}
            onClick={() => setFilterStatus('delivered')}
          >
            <div className="stat-icon-circle delivered">
              <span><CheckCircle size={16} /></span>
            </div>
            <div className="stat-details">
              <span className="stat-number">{stats.delivered}</span>
              <span className="stat-label">Delivered</span>
            </div>
          </div>
        </section>

        {/* Active Deliveries Alert */}
        {(stats.pickedUp > 0 || stats.inTransit > 0) && (
          <div className="active-delivery-alert">
            <span className="alert-icon"><Bell size={16} /></span>
            <span className="alert-text">
              You have <strong>{stats.pickedUp + stats.inTransit}</strong> active 
              {stats.pickedUp + stats.inTransit === 1 ? ' delivery' : ' deliveries'} in progress
            </span>
            <button 
              className="alert-action"
              onClick={() => setFilterStatus(stats.inTransit > 0 ? 'in_transit' : 'picked_up')}
            >
              View Active
            </button>
          </div>
        )}

        {/* Filters & Controls */}
        <section className="deliveries-controls">
          <div className="search-box">
            <span className="search-icon"><Search size={16} /></span>
            <input
              type="text"
              placeholder="Search by item, farmer, or NGO..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className="clear-search" onClick={() => setSearchQuery('')}>
                <X size={16} />
              </button>
            )}
          </div>

          <div className="filter-controls">
            <div className="filter-group-inline">
              <label>Sort by:</label>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value as SortOption)}
              >
                <option value="newest">Newest First</option>
                <option value="priority">Priority</option>
                <option value="distance">Distance</option>
                <option value="earnings">Earnings</option>
              </select>
            </div>

            <button 
              className="refresh-btn"
              onClick={fetchDeliveries}
              title="Refresh"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </section>

        {/* Results Count */}
        <div className="results-info">
          <span>
            Showing <strong>{filteredDeliveries.length}</strong> of <strong>{deliveries.length}</strong> deliveries
          </span>
          {(filterStatus !== 'all' || searchQuery) && (
            <button 
              className="clear-filters-btn"
              onClick={() => {
                setFilterStatus('all');
                setSearchQuery('');
              }}
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Deliveries List */}
        {filteredDeliveries.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><MailOpen size={40} /></div>
            <h3>
              {deliveries.length === 0 
                ? "No deliveries assigned yet" 
                : "No deliveries match your filters"}
            </h3>
            <p>
              {deliveries.length === 0 
                ? "Check available pickups to accept new delivery tasks" 
                : "Try adjusting your search or filter criteria"}
            </p>
            {deliveries.length === 0 && (
              <button 
                className="empty-action-btn"
                onClick={() => navigate('/available-pickups')}
              >
                <Truck size={14} /> View Available Pickups
              </button>
            )}
          </div>
        ) : (
          <section className="deliveries-list">
            {filteredDeliveries.map((delivery) => {
              const nextStatus = getNextStatus(delivery.status);
              
              return (
                <div 
                  key={delivery.id} 
                  className={`delivery-card ${delivery.status} ${getPriorityClass(delivery.priority)}`}
                >
                  {/* Priority Badge */}
                  {delivery.priority !== 'normal' && (
                    <div className={`priority-badge ${delivery.priority}`}>
                      {delivery.priority === 'urgent' ? <><Flame size={12} /> Urgent</> : <><Zap size={12} /> High Priority</>}
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className={`delivery-status-badge ${delivery.status}`}>
                    {getStatusIcon(delivery.status)} {getStatusLabel(delivery.status)}
                  </div>

                  {/* Card Header */}
                  <div className="delivery-header">
                    <div className="delivery-image">
                      {delivery.image ? (
                        <img src={delivery.image} alt={delivery.title} />
                      ) : (
                        <div className="delivery-emoji">
                          {delivery.type === 'Vegetable' ? <Leaf size={14} /> : 
                           delivery.type === 'Fruit' ? <Apple size={14} /> : 
                           delivery.type === 'Grain' ? <Wheat size={14} /> : <Package size={14} />}
                        </div>
                      )}
                    </div>
                    <div className="delivery-title-section">
                      <h3 className="delivery-title">{delivery.title}</h3>
                      <div className="delivery-meta">
                        <span className="meta-item">
                          <span className="meta-icon"><Package size={14} /></span>
                          {delivery.quantity}
                        </span>
                        <span className="meta-item">
                          <span className="meta-icon"><Ruler size={14} /></span>
                          {delivery.distance}
                        </span>
                        {delivery.earnings && (
                          <span className="meta-item earnings">
                            <span className="meta-icon"><Wallet size={14} /></span>
                            ₹{delivery.earnings}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Route Section */}
                  <div className="delivery-route">
                    {/* Pickup Location */}
                    <div className="route-point pickup">
                      <div className="route-marker">
                        <span className="marker-icon"><MapPin size={14} /></span>
                        <span className="marker-line"></span>
                      </div>
                      <div className="route-details">
                        <span className="route-label">PICKUP FROM</span>
                        <span className="route-name">{delivery.farmer.name}</span>
                        <span className="route-address">{delivery.farmer.address}</span>
                        <div className="route-actions">
                          <button 
                            className="route-action-btn"
                            onClick={() => openPhoneDialer(delivery.farmer.phone)}
                          >
                            <Phone size={12} /> Call
                          </button>
                          <button 
                            className="route-action-btn"
                            onClick={() => openMaps(delivery.farmer.address)}
                          >
                            <Map size={12} /> Navigate
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Delivery Location */}
                    <div className="route-point delivery">
                      <div className="route-marker">
                        <span className="marker-icon"><Flag size={14} /></span>
                      </div>
                      <div className="route-details">
                        <span className="route-label">DELIVER TO</span>
                        <span className="route-name">{delivery.ngo.organization}</span>
                        <span className="route-contact">{delivery.ngo.name}</span>
                        <span className="route-address">{delivery.ngo.address}</span>
                        <div className="route-actions">
                          <button 
                            className="route-action-btn"
                            onClick={() => openPhoneDialer(delivery.ngo.phone)}
                          >
                            <Phone size={12} /> Call
                          </button>
                          <button 
                            className="route-action-btn"
                            onClick={() => openMaps(delivery.ngo.address)}
                          >
                            <Map size={12} /> Navigate
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Time Info */}
                  <div className="delivery-timeline">
                    <div className="timeline-item">
                      <span className="timeline-icon"><Calendar size={14} /></span>
                      <span className="timeline-label">Created</span>
                      <span className="timeline-value">{formatDate(delivery.created_at)}</span>
                    </div>
                    {delivery.pickup_time && (
                      <div className="timeline-item">
                        <span className="timeline-icon"><Package size={14} /></span>
                        <span className="timeline-label">Picked Up</span>
                        <span className="timeline-value">{formatTime(delivery.pickup_time)}</span>
                      </div>
                    )}
                    {delivery.delivered_at ? (
                      <div className="timeline-item completed">
                        <span className="timeline-icon"><CheckCircle size={14} /></span>
                        <span className="timeline-label">Delivered</span>
                        <span className="timeline-value">{formatTime(delivery.delivered_at)}</span>
                      </div>
                    ) : delivery.estimated_delivery && (
                      <div className="timeline-item estimated">
                        <span className="timeline-icon"><Clock size={14} /></span>
                        <span className="timeline-label">ETA</span>
                        <span className="timeline-value">{formatTime(delivery.estimated_delivery)}</span>
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  {delivery.notes && (
                    <div className="delivery-notes">
                      <span className="notes-icon"><FileText size={14} /></span>
                      <span className="notes-text">{delivery.notes}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="delivery-actions">
                    <button 
                      className="action-btn secondary"
                      onClick={() => {
                        setSelectedDelivery(delivery);
                        setShowDetailsModal(true);
                      }}
                    >
                      <Eye size={14} /> View Details
                    </button>

                    {nextStatus && (
                      <button 
                        className="action-btn primary"
                        onClick={() => {
                          setSelectedDelivery(delivery);
                          setShowUpdateModal(true);
                        }}
                        disabled={updatingId === delivery.id}
                      >
                        {updatingId === delivery.id ? (
                          <>
                            <span className="btn-spinner"></span>
                            Updating...
                          </>
                        ) : (
                          <>
                            {nextStatus.icon} {nextStatus.label}
                          </>
                        )}
                      </button>
                    )}

                    {delivery.status === 'delivered' && (
                      <div className="completed-badge">
                        <CheckCircle size={14} /> Completed
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {/* Update Status Modal */}
        {showUpdateModal && selectedDelivery && (
          <div className="modal-overlay" onClick={() => setShowUpdateModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Update Delivery Status</h2>
                <button className="modal-close" onClick={() => setShowUpdateModal(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className="modal-body">
                <div className="update-preview">
                  <div className="update-item-info">
                    <span className="update-emoji">
                      {selectedDelivery.type === 'Vegetable' ? <Leaf size={16} /> : 
                       selectedDelivery.type === 'Fruit' ? <Apple size={16} /> : 
                       selectedDelivery.type === 'Grain' ? <Wheat size={16} /> : <Package size={16} />}
                    </span>
                    <div>
                      <h4>{selectedDelivery.title}</h4>
                      <p>{selectedDelivery.quantity}</p>
                    </div>
                  </div>
                </div>

                <div className="status-update-flow">
                  <div className={`status-step current`}>
                    <span className="step-icon">{getStatusIcon(selectedDelivery.status)}</span>
                    <span className="step-label">{getStatusLabel(selectedDelivery.status)}</span>
                  </div>
                  <div className="status-arrow">→</div>
                  <div className="status-step next">
                    <span className="step-icon">{getNextStatus(selectedDelivery.status)?.icon}</span>
                    <span className="step-label">{getNextStatus(selectedDelivery.status)?.label}</span>
                  </div>
                </div>

                {selectedDelivery.status === 'pending' && (
                  <div className="update-reminder">
                    <span className="reminder-icon"><MapPin size={14} /></span>
                    <p>Make sure you have arrived at the pickup location before confirming.</p>
                  </div>
                )}

                {selectedDelivery.status === 'in_transit' && (
                  <div className="update-reminder">
                    <span className="reminder-icon"><Camera size={14} /></span>
                    <p>You may be asked to take a photo as proof of delivery.</p>
                  </div>
                )}
              </div>
              <div className="modal-actions">
                <button 
                  className="modal-btn secondary"
                  onClick={() => setShowUpdateModal(false)}
                >
                  Cancel
                </button>
                <button 
                  className="modal-btn primary"
                  onClick={() => handleUpdateStatus(
                    selectedDelivery.id, 
                    getNextStatus(selectedDelivery.status)?.status || ''
                  )}
                  disabled={updatingId === selectedDelivery.id}
                >
                  {updatingId === selectedDelivery.id ? 'Updating...' : 'Confirm Update'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Details Modal */}
        {showDetailsModal && selectedDelivery && (
          <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
            <div className="modal-content details-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2><Package size={18} /> Delivery Details</h2>
                <button className="modal-close" onClick={() => setShowDetailsModal(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className="modal-body">
                {/* Item Info */}
                <div className="details-section">
                  <h3>Item Information</h3>
                  <div className="details-grid">
                    <div className="detail-item">
                      <span className="detail-label">Title</span>
                      <span className="detail-value">{selectedDelivery.title}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Type</span>
                      <span className="detail-value">{selectedDelivery.type}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Quantity</span>
                      <span className="detail-value">{selectedDelivery.quantity}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Status</span>
                      <span className={`detail-value status-tag ${selectedDelivery.status}`}>
                        {getStatusIcon(selectedDelivery.status)} {getStatusLabel(selectedDelivery.status)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Farmer Info */}
                <div className="details-section">
                  <h3><Sprout size={16} /> Pickup - Farmer Details</h3>
                  <div className="contact-card">
                    <div className="contact-info">
                      <span className="contact-name">{selectedDelivery.farmer.name}</span>
                      <span className="contact-phone">{selectedDelivery.farmer.phone}</span>
                      <span className="contact-address">{selectedDelivery.farmer.address}</span>
                    </div>
                    <div className="contact-actions">
                      <button 
                        className="contact-btn call"
                        onClick={() => openPhoneDialer(selectedDelivery.farmer.phone)}
                      >
                        <Phone size={14} />
                      </button>
                      <button 
                        className="contact-btn map"
                        onClick={() => openMaps(selectedDelivery.farmer.address)}
                      >
                        <Map size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* NGO Info */}
                <div className="details-section">
                  <h3><Building2 size={16} /> Delivery - NGO Details</h3>
                  <div className="contact-card">
                    <div className="contact-info">
                      <span className="contact-org">{selectedDelivery.ngo.organization}</span>
                      <span className="contact-name">{selectedDelivery.ngo.name}</span>
                      <span className="contact-phone">{selectedDelivery.ngo.phone}</span>
                      <span className="contact-address">{selectedDelivery.ngo.address}</span>
                    </div>
                    <div className="contact-actions">
                      <button 
                        className="contact-btn call"
                        onClick={() => openPhoneDialer(selectedDelivery.ngo.phone)}
                      >
                        <Phone size={14} />
                      </button>
                      <button 
                        className="contact-btn map"
                        onClick={() => openMaps(selectedDelivery.ngo.address)}
                      >
                        <Map size={14} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Trip Info */}
                <div className="details-section">
                  <h3><BarChart3 size={16} /> Trip Information</h3>
                  <div className="details-grid">
                    <div className="detail-item">
                      <span className="detail-label">Distance</span>
                      <span className="detail-value">{selectedDelivery.distance}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Earnings</span>
                      <span className="detail-value earnings">₹{selectedDelivery.earnings}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Created</span>
                      <span className="detail-value">{formatDate(selectedDelivery.created_at)}</span>
                    </div>
                    {selectedDelivery.delivered_at && (
                      <div className="detail-item">
                        <span className="detail-label">Delivered</span>
                        <span className="detail-value">{formatDate(selectedDelivery.delivered_at)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {selectedDelivery.notes && (
                  <div className="details-section">
                    <h3><FileText size={16} /> Notes</h3>
                    <p className="notes-content">{selectedDelivery.notes}</p>
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
                {getNextStatus(selectedDelivery.status) && (
                  <button 
                    className="modal-btn primary"
                    onClick={() => {
                      setShowDetailsModal(false);
                      setShowUpdateModal(true);
                    }}
                  >
                    {getNextStatus(selectedDelivery.status)?.icon} {getNextStatus(selectedDelivery.status)?.label}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </>
    );
  };
  
  export default MyDeliveries;
