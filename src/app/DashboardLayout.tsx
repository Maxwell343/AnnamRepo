import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import {
  Home, ScrollText, Package, PlusCircle, ShoppingCart, BarChart3,
  Handshake, Truck, Settings, MapPin, Map, Wallet, CreditCard,
  MapPinned, LogOut, Wheat, ChevronLeft, ChevronRight
} from 'lucide-react';
import './HomePage.css';

interface User {
  id: number;
  name: string;
  role: 'farmer' | 'ngo' | 'driver' | 'customer';
  email?: string;
  phone?: string;
  address?: string;
  organization?: string;
  vehicle_number?: string;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        if (parsedUser && parsedUser.id && parsedUser.name && 
            ['farmer', 'ngo', 'driver', 'customer'].includes(parsedUser.role)) {
          setUser(parsedUser);
        } else {
          navigate('/auth');
        }
      } catch (e) {
        navigate('/auth');
      }
    } else {
      navigate('/auth');
    }
  }, [navigate]);

  const handleLogout = () => {
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

  if (!user) {
    return null;
  }


  const renderSidebarNav = () => {
    const getDashboardRoute = () => {
      return user.role === 'customer' ? '/customer-home' : '/home';
    };

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
      ],
      ngo: [
        { id: 'claimed', icon: <Handshake size={20} />, label: 'Claimed Donations', action: () => navigate('/claimed-donations') },
        { id: 'tracking', icon: <Truck size={20} />, label: 'Order Tracking', action: () => navigate('/ngo-order-tracking') },
      ],
      driver: [
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
      <nav className="sidebar-nav">
        {items.map((item) => (
          <div
            key={item.id}
            className="nav-item"
            onClick={item.action}
            title={sidebarCollapsed ? item.label : ''}
          >
            <span className="nav-icon">{item.icon}</span>
            {!sidebarCollapsed && <span className="nav-label">{item.label}</span>}
          </div>
        ))}
      </nav>
    );
  };

  return (
    <div className={`app-container ${user.role}-theme`}>
      {/* --- Sidebar Navigation --- */}
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="brand">
            <span className="brand-icon"><Wheat size={28} /></span>
            {!sidebarCollapsed && <span className="brand-text">Annam</span>}
          </div>
          <button 
            className="collapse-btn"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
        
        {renderSidebarNav()}

        <div className="sidebar-footer">
          <div className="nav-item logout-item" onClick={handleLogout}>
            <span className="nav-icon"><LogOut size={20} /></span>
            {!sidebarCollapsed && <span className="nav-label">Logout</span>}
          </div>
        </div>
      </aside>

      {/* --- Main Content Area --- */}
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
