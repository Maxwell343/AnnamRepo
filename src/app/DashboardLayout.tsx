import { useNavigate } from 'react-router-dom';
import React, { useState } from 'react';
import {
  Home, ScrollText, Package, PlusCircle, ShoppingCart, BarChart3,
  Handshake, Truck, Settings, MapPin, Map, Wallet, CreditCard,
  MapPinned, LogOut, Wheat, ChevronLeft, ChevronRight, Activity
} from 'lucide-react';
import { useUser } from '../hooks/useUser';
import './DashboardLayout.css';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const { user, clearUser } = useUser();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Note: ProtectedRoute already guarantees 'user' is present and valid
  // before rendering this layout, so we don't strictly need the redirect logic here.
  if (!user) {
    return null;
  }

  const handleLogout = () => {
    clearUser();
    navigate('/');
  };

  const renderSidebarNav = () => {
    const getDashboardRoute = () => '/home';

    const commonItems = [
      { id: 'dashboard', icon: <Home size={20} />, label: 'Dashboard', action: () => navigate(getDashboardRoute()) },
      { id: 'history', icon: <ScrollText size={20} />, label: 'History', action: () => navigate('/history') },
    ];

    const roleSpecificItems = {
      farmer: [
        { id: 'my-listings', icon: <Package size={20} />, label: 'My Listings', action: () => navigate('/my-listings') },
        { id: 'add-listing', icon: <PlusCircle size={20} />, label: 'Add Listing', action: () => navigate('/listing') },
        { id: 'marketplace', icon: <ShoppingCart size={20} />, label: 'Marketplace', action: () => navigate('/marketplace') },
        { id: 'analytics', icon: <BarChart3 size={20} />, label: 'Analytics', action: () => navigate('/analytics') },
        { id: 'rewards', icon: <Wheat size={20} />, label: 'Impact & Rewards', action: () => navigate('/farmer-rewards') },
      ],
      ngo: [
        { id: 'claimed', icon: <Handshake size={20} />, label: 'Claimed Donations', action: () => navigate('/claimed-donations') },
        { id: 'tracking', icon: <Truck size={20} />, label: 'Order Tracking', action: () => navigate('/ngo-order-tracking') },
      ],
      driver: [
        { id: 'driver-dashboard', icon: <Activity size={20} />, label: 'Command Center', action: () => navigate('/driver-dashboard') },
        { id: 'my-deliveries', icon: <MapPin size={20} />, label: 'My Deliveries', action: () => navigate('/my-deliveries') },
        { id: 'available-pickups', icon: <Truck size={20} />, label: 'Available Pickups', action: () => navigate('/available-pickups') },
        { id: 'route-map', icon: <Map size={20} />, label: 'Route Map', action: () => navigate('/route-map') },
        { id: 'earnings', icon: <Wallet size={20} />, label: 'Earnings', action: () => navigate('/earnings') },
      ],
      customer: [
        { id: 'marketplace', icon: <ShoppingCart size={20} />, label: 'Marketplace', action: () => navigate('/marketplace') },
        { id: 'orders', icon: <Package size={20} />, label: 'My Orders', action: () => navigate('/order-tracking') },
        { id: 'payments', icon: <CreditCard size={20} />, label: 'Payments', action: () => navigate('/payments') },
        { id: 'addresses', icon: <MapPinned size={20} />, label: 'Addresses', action: () => navigate('/addresses') },
        { id: 'customer-settings', icon: <Settings size={20} />, label: 'Settings', action: () => navigate('/customer-settings') },
      ],
    };

    const getSettingsRoute = () => {
      if (user.role === 'farmer') return '/farmer/complete-profile';
      if (user.role === 'driver') return '/driver-settings';
      if (user.role === 'ngo') return '/ngo-settings';
      return '/settings';
    };

    const items = [
      ...commonItems,
      ...(roleSpecificItems[user.role as keyof typeof roleSpecificItems] || []),
    ];

    // Add settings only for non-customer roles
    if (user.role !== 'customer') {
      items.push({ id: 'settings', icon: <Settings size={20} />, label: 'Settings', action: () => navigate(getSettingsRoute()) });
    }

    return (
      <nav className="sidebar-nav" aria-label="Main Navigation">
        {items.map((item) => (
          <button
            key={item.id}
            className="nav-item"
            onClick={item.action}
            title={sidebarCollapsed ? item.label : ''}
            aria-label={item.label}
          >
            <span className="nav-icon" aria-hidden="true">{item.icon}</span>
            {!sidebarCollapsed && <span className="nav-label">{item.label}</span>}
          </button>
        ))}
      </nav>
    );
  };

  return (
    <div className={`app-container ${user.role}-theme`}>
      {/* --- Sidebar Navigation --- */}
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`} aria-label="Sidebar">
        <div className="sidebar-header">
          <div className="brand">
            <span className="brand-icon" aria-hidden="true"><Wheat size={28} /></span>
            {!sidebarCollapsed && <span className="brand-text">Annam</span>}
          </div>
          <button 
            className="collapse-btn"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!sidebarCollapsed}
          >
            {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
        
        {renderSidebarNav()}

        <div className="sidebar-footer">
          <button 
            className="nav-item logout-item" 
            onClick={handleLogout}
            title={sidebarCollapsed ? 'Logout' : ''}
            aria-label="Logout"
          >
            <span className="nav-icon" aria-hidden="true"><LogOut size={20} /></span>
            {!sidebarCollapsed && <span className="nav-label">Logout</span>}
          </button>
        </div>
      </aside>

      {/* --- Main Content Area --- */}
      <main className="main-content" id="main-content">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
