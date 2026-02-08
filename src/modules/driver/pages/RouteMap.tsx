import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './RouteMap.css';

interface User {
  id: number;
  name: string;
  role: 'farmer' | 'ngo' | 'driver';
}

interface RouteStop {
  id: number;
  type: 'pickup' | 'dropoff';
  name: string;
  address: string;
  phone: string;
  time: string;
  status: 'pending' | 'completed' | 'current';
  items?: string;
  quantity?: string;
  notes?: string;
}

interface ActiveRoute {
  id: number;
  totalStops: number;
  completedStops: number;
  totalDistance: string;
  estimatedTime: string;
  startTime: string;
  stops: RouteStop[];
}

const RouteMap: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeRoute, setActiveRoute] = useState<ActiveRoute | null>(null);
  const [selectedStop, setSelectedStop] = useState<RouteStop | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [showDirections, setShowDirections] = useState(true);

  // Mock route data
  const mockRoute: ActiveRoute = {
    id: 1,
    totalStops: 6,
    completedStops: 2,
    totalDistance: '45.8 km',
    estimatedTime: '2h 15m',
    startTime: '09:30 AM',
    stops: [
      {
        id: 1,
        type: 'pickup',
        name: 'Green Valley Farm',
        address: '123 Farm Road, Sector 42, Green Valley',
        phone: '+91 98765 43210',
        time: '09:30 AM',
        status: 'completed',
        items: 'Fresh Vegetables',
        quantity: '25 kg',
        notes: 'Gate code: 4521'
      },
      {
        id: 2,
        type: 'dropoff',
        name: 'Hope Foundation',
        address: '456 Community Center, Downtown',
        phone: '+91 98765 43211',
        time: '10:15 AM',
        status: 'completed',
        items: 'Fresh Vegetables',
        quantity: '25 kg'
      },
      {
        id: 3,
        type: 'pickup',
        name: 'Sunrise Organic Farm',
        address: '789 Organic Lane, Rural District',
        phone: '+91 98765 43212',
        time: '11:00 AM',
        status: 'current',
        items: 'Organic Fruits',
        quantity: '30 kg',
        notes: 'Ask for Mr. Sharma'
      },
      {
        id: 4,
        type: 'dropoff',
        name: 'Meals on Wheels',
        address: '321 Service Road, City Center',
        phone: '+91 98765 43213',
        time: '11:45 AM',
        status: 'pending',
        items: 'Organic Fruits',
        quantity: '30 kg'
      },
      {
        id: 5,
        type: 'pickup',
        name: 'Golden Grain Store',
        address: '555 Market Street, Industrial Area',
        phone: '+91 98765 43214',
        time: '12:30 PM',
        status: 'pending',
        items: 'Rice & Grains',
        quantity: '50 kg',
        notes: 'Heavy load - bring trolley'
      },
      {
        id: 6,
        type: 'dropoff',
        name: 'Community Kitchen',
        address: '888 Charity Lane, East District',
        phone: '+91 98765 43215',
        time: '01:15 PM',
        status: 'pending',
        items: 'Rice & Grains',
        quantity: '50 kg'
      }
    ]
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      navigate('/auth');
      return;
    }

    const parsedUser = JSON.parse(storedUser);
    if (parsedUser.role !== 'driver') {
      navigate('/home');
      return;
    }

    setUser(parsedUser);
    setActiveRoute(mockRoute);
    setLoading(false);
  }, [navigate]);

  const handleLogout = () => {
    // Clear all user-related data from localStorage
    localStorage.removeItem('user');
    localStorage.removeItem('token');
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
    navigate('/auth');
  };

  const handleStartNavigation = (stop: RouteStop) => {
    setSelectedStop(stop);
    setIsNavigating(true);
    // In real app, this would open Google Maps or native navigation
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.address)}`, '_blank');
  };

  const handleMarkComplete = (stopId: number) => {
    if (!activeRoute) return;
    
    const updatedStops = activeRoute.stops.map((stop, index) => {
      if (stop.id === stopId) {
        return { ...stop, status: 'completed' as const };
      }
      // Set next stop as current
      if (activeRoute.stops[index - 1]?.id === stopId && stop.status === 'pending') {
        return { ...stop, status: 'current' as const };
      }
      return stop;
    });

    setActiveRoute({
      ...activeRoute,
      stops: updatedStops,
      completedStops: updatedStops.filter(s => s.status === 'completed').length
    });
  };

  const handleCall = (phone: string) => {
    window.open(`tel:${phone}`, '_self');
  };

  const getStopIcon = (type: string, status: string) => {
    if (status === 'completed') return '✅';
    if (type === 'pickup') return '📦';
    return '🏁';
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'completed': return 'completed';
      case 'current': return 'current';
      default: return 'pending';
    }
  };

  if (loading) {
    return (
      <div className="routemap-loading">
        <div className="loading-spinner"></div>
        <p>Loading route...</p>
      </div>
    );
  }

  return (
    <div className="routemap-container">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-section">
            <span className="logo-icon">🌾</span>
            {!sidebarCollapsed && <span className="logo-text">Annam</span>}
          </div>
          <button 
            className="collapse-btn"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? '»' : '«'}
          </button>
        </div>
        
        <nav className="sidebar-nav">
          <div className="nav-item" onClick={() => navigate('/home')}>
            <span className="nav-icon">🏠</span>
            {!sidebarCollapsed && <span className="nav-label">Dashboard</span>}
          </div>
          <div className="nav-item" onClick={() => navigate('/my-deliveries')}>
            <span className="nav-icon">📍</span>
            {!sidebarCollapsed && <span className="nav-label">My Deliveries</span>}
          </div>
          <div className="nav-item" onClick={() => navigate('/available-pickups')}>
            <span className="nav-icon">🚚</span>
            {!sidebarCollapsed && <span className="nav-label">Available Pickups</span>}
          </div>
          <div className="nav-item active">
            <span className="nav-icon">🗺️</span>
            {!sidebarCollapsed && <span className="nav-label">Route Map</span>}
          </div>
          <div className="nav-item" onClick={() => navigate('/earnings')}>
            <span className="nav-icon">💰</span>
            {!sidebarCollapsed && <span className="nav-label">Earnings</span>}
          </div>
          <div className="nav-item" onClick={() => navigate('/history')}>
            <span className="nav-icon">📜</span>
            {!sidebarCollapsed && <span className="nav-label">History</span>}
          </div>
          <div className="nav-item" onClick={() => navigate('/leaderboards')}>
            <span className="nav-icon">🏆</span>
            {!sidebarCollapsed && <span className="nav-label">Leaderboards</span>}
          </div>
          <div className="nav-item" onClick={() => navigate('/driver-settings')}>
            <span className="nav-icon">⚙️</span>
            {!sidebarCollapsed && <span className="nav-label">Settings</span>}
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="nav-item logout-item" onClick={handleLogout}>
            <span className="nav-icon">🚪</span>
            {!sidebarCollapsed && <span className="nav-label">Logout</span>}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Header */}
        <header className="top-header">
          <div className="header-left">
            <h1 className="page-title">🗺️ Route Map</h1>
            <p className="page-subtitle">Navigate your delivery route efficiently</p>
          </div>
          <div className="header-right">
            <button 
              className={`view-toggle ${showDirections ? 'active' : ''}`}
              onClick={() => setShowDirections(!showDirections)}
            >
              {showDirections ? '📋 List View' : '🗺️ Map View'}
            </button>
            <div className="user-profile">
              <div className="user-avatar">
                {user?.name?.charAt(0).toUpperCase() || 'D'}
              </div>
            </div>
          </div>
        </header>

        {/* Route Summary */}
        {activeRoute && (
          <div className="route-summary">
            <div className="summary-card">
              <span className="summary-icon">📍</span>
              <div className="summary-content">
                <span className="summary-value">{activeRoute.completedStops}/{activeRoute.totalStops}</span>
                <span className="summary-label">Stops</span>
              </div>
            </div>
            <div className="summary-card">
              <span className="summary-icon">📏</span>
              <div className="summary-content">
                <span className="summary-value">{activeRoute.totalDistance}</span>
                <span className="summary-label">Total Distance</span>
              </div>
            </div>
            <div className="summary-card">
              <span className="summary-icon">⏱️</span>
              <div className="summary-content">
                <span className="summary-value">{activeRoute.estimatedTime}</span>
                <span className="summary-label">Est. Time</span>
              </div>
            </div>
            <div className="summary-card">
              <span className="summary-icon">🕐</span>
              <div className="summary-content">
                <span className="summary-value">{activeRoute.startTime}</span>
                <span className="summary-label">Started</span>
              </div>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {activeRoute && (
          <div className="route-progress">
            <div className="progress-header">
              <span className="progress-title">Route Progress</span>
              <span className="progress-percent">
                {Math.round((activeRoute.completedStops / activeRoute.totalStops) * 100)}%
              </span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${(activeRoute.completedStops / activeRoute.totalStops) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Map Section - Only show in Map View */}
        {!showDirections && (
          <div className="map-section enlarged">
            <div className="map-placeholder">
              <div className="map-overlay">
                <span className="map-icon">🗺️</span>
                <h3>Interactive Map</h3>
                <p>Map integration coming soon</p>
                <button 
                  className="open-maps-btn"
                  onClick={() => window.open('https://www.google.com/maps', '_blank')}
                >
                  🌐 Open in Google Maps
                </button>
              </div>
            </div>
            
            {/* Quick stops overview in map view */}
            <div className="map-stops-overview">
              <h3>📍 Stops Overview</h3>
              <div className="quick-stops-list">
                {activeRoute?.stops.map((stop, index) => (
                  <div 
                    key={stop.id} 
                    className={`quick-stop-item ${stop.status}`}
                    onClick={() => handleStartNavigation(stop)}
                  >
                    <span className="quick-stop-number">{index + 1}</span>
                    <div className="quick-stop-info">
                      <span className="quick-stop-name">{stop.name}</span>
                      <span className="quick-stop-type">{stop.type === 'pickup' ? '📦 Pickup' : '🏁 Dropoff'}</span>
                    </div>
                    <span className="quick-stop-status">
                      {stop.status === 'completed' && '✅'}
                      {stop.status === 'current' && '🔵'}
                      {stop.status === 'pending' && '⏳'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Stops List - Only show in List View */}
        {showDirections && (
          <div className="stops-section">
          <div className="section-header">
            <h2>📋 Route Stops</h2>
            <span className="stop-count">{activeRoute?.stops.length} stops</span>
          </div>

          <div className="stops-timeline">
            {activeRoute?.stops.map((stop, index) => (
              <div 
                key={stop.id} 
                className={`stop-card ${getStatusClass(stop.status)} ${selectedStop?.id === stop.id ? 'selected' : ''}`}
                onClick={() => setSelectedStop(stop)}
              >
                <div className="stop-timeline-marker">
                  <div className="marker-dot">
                    <span>{getStopIcon(stop.type, stop.status)}</span>
                  </div>
                  {index < (activeRoute?.stops.length || 0) - 1 && (
                    <div className={`marker-line ${stop.status === 'completed' ? 'completed' : ''}`}></div>
                  )}
                </div>

                <div className="stop-content">
                  <div className="stop-header">
                    <div className="stop-type-badge">
                      {stop.type === 'pickup' ? '📦 Pickup' : '🏁 Dropoff'}
                    </div>
                    <div className={`stop-status-badge ${stop.status}`}>
                      {stop.status === 'completed' && '✓ Completed'}
                      {stop.status === 'current' && '🔵 Current'}
                      {stop.status === 'pending' && '⏳ Pending'}
                    </div>
                  </div>

                  <h3 className="stop-name">{stop.name}</h3>
                  <p className="stop-address">📍 {stop.address}</p>
                  
                  <div className="stop-details">
                    <span className="detail-item">
                      <span className="detail-icon">📦</span>
                      {stop.items} ({stop.quantity})
                    </span>
                    <span className="detail-item">
                      <span className="detail-icon">🕐</span>
                      {stop.time}
                    </span>
                  </div>

                  {stop.notes && (
                    <div className="stop-notes">
                      <span className="notes-icon">📝</span>
                      {stop.notes}
                    </div>
                  )}

                  <div className="stop-actions">
                    <button 
                      className="action-btn call"
                      onClick={(e) => { e.stopPropagation(); handleCall(stop.phone); }}
                    >
                      📞 Call
                    </button>
                    <button 
                      className="action-btn navigate"
                      onClick={(e) => { e.stopPropagation(); handleStartNavigation(stop); }}
                    >
                      🧭 Navigate
                    </button>
                    {stop.status === 'current' && (
                      <button 
                        className="action-btn complete"
                        onClick={(e) => { e.stopPropagation(); handleMarkComplete(stop.id); }}
                      >
                        ✅ Mark Complete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        )}

        {/* No Route State */}
        {!activeRoute && (
          <div className="no-route">
            <span className="no-route-icon">🗺️</span>
            <h3>No Active Route</h3>
            <p>Accept deliveries to start your route</p>
            <button 
              className="find-pickups-btn"
              onClick={() => navigate('/available-pickups')}
            >
              🚚 Find Available Pickups
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default RouteMap;
