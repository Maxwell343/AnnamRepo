import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  BarChart3, Users, Package, Tag, Radio, ClipboardList,
  Wallet, CreditCard, FileText, Scale, TrendingUp, Globe,
  Map, Wheat, Settings, LogOut
} from 'lucide-react';

interface AdminSidebarProps {
  collapsed: boolean;
  onClose: () => void;
}

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path: string;
  badge?: number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', icon: <BarChart3 size={20} />, path: '/admin' },
    ],
  },
  {
    title: 'Management',
    items: [
      { label: 'Users & KYC', icon: <Users size={20} />, path: '/admin/users' },
      { label: 'Listings', icon: <Package size={20} />, path: '/admin/listings' },
      { label: 'Categories', icon: <Tag size={20} />, path: '/admin/categories' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Live Operations', icon: <Radio size={20} />, path: '/admin/operations' },
      { label: 'Order Control', icon: <ClipboardList size={20} />, path: '/admin/orders' },
    ],
  },
  {
    title: 'Finance',
    items: [
      { label: 'Financial Overview', icon: <Wallet size={20} />, path: '/admin/finance' },
      { label: 'Driver Payouts', icon: <CreditCard size={20} />, path: '/admin/payouts' },
      { label: 'Transactions', icon: <FileText size={20} />, path: '/admin/transactions' },
    ],
  },
  {
    title: 'Support',
    items: [
      { label: 'Dispute Center', icon: <Scale size={20} />, path: '/admin/disputes' },
    ],
  },
  {
    title: 'Intelligence',
    items: [
      { label: 'Analytics', icon: <TrendingUp size={20} />, path: '/admin/analytics' },
      { label: 'Impact Metrics', icon: <Globe size={20} />, path: '/admin/impact' },
      { label: 'Region Heatmap', icon: <Map size={20} />, path: '/admin/heatmap' },
    ],
  },
  {
    title: 'System',
    items: [
      { label: 'Settings', icon: <Settings size={20} />, path: '/admin/settings' },
    ],
  },
];

const AdminSidebar: React.FC<AdminSidebarProps> = ({ collapsed, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigate = (path: string) => {
    navigate(path);
    onClose();
  };

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
    const driverOnlineState = localStorage.getItem('driverOnline');
    if (driverOnlineState === 'true') {
      localStorage.setItem('driverOnlineExpiry', (Date.now() + 60 * 60 * 1000).toString());
    } else {
      localStorage.removeItem('driverOnline');
    }
    navigate('/');
    onClose();
  };

  return (
    <aside className="admin-sidebar">
      {/* Brand */}
      <div className="admin-sidebar__brand">
        <span className="admin-sidebar__brand-icon"><Wheat size={28} /></span>
        {!collapsed && (
          <div className="admin-sidebar__brand-text">
            <span className="admin-sidebar__brand-name">Annam</span>
            <span className="admin-sidebar__brand-role">Admin Panel</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="admin-sidebar__nav">
        {navSections.map((section) => (
          <div key={section.title} className="admin-sidebar__section">
            {!collapsed && (
              <div className="admin-sidebar__section-label">{section.title}</div>
            )}
            {section.items.map((item) => (
              <div
                key={item.path}
                className={`admin-sidebar__link ${location.pathname === item.path ? 'active' : ''}`}
                onClick={() => handleNavigate(item.path)}
              >
                <span className="admin-sidebar__link-icon">{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
                {!collapsed && item.badge !== undefined && item.badge > 0 && (
                  <span className="admin-sidebar__link-badge">{item.badge}</span>
                )}
              </div>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="admin-sidebar__footer">
          <div className="admin-sidebar__user">
            <div className="admin-sidebar__avatar">A</div>
            <div className="admin-sidebar__user-info">
              <span className="admin-sidebar__user-name">Admin</span>
              <span className="admin-sidebar__user-role">Super Admin</span>
            </div>
          </div>
          <button className="admin-sidebar__logout" onClick={handleLogout}>
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      )}
    </aside>
  );
};

export default AdminSidebar;
