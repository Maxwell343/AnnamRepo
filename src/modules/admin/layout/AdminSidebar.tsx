import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface AdminSidebarProps {
  collapsed: boolean;
  onClose: () => void;
}

interface NavItem {
  label: string;
  icon: string;
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
      { label: 'Dashboard', icon: '📊', path: '/admin' },
    ],
  },
  {
    title: 'Management',
    items: [
      { label: 'Users & KYC', icon: '👥', path: '/admin/users' },
      { label: 'Listings', icon: '📦', path: '/admin/listings' },
      { label: 'Categories', icon: '🏷️', path: '/admin/categories' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Live Operations', icon: '🔴', path: '/admin/operations' },
      { label: 'Order Control', icon: '📋', path: '/admin/orders' },
    ],
  },
  {
    title: 'Finance',
    items: [
      { label: 'Financial Overview', icon: '💰', path: '/admin/finance' },
      { label: 'Driver Payouts', icon: '💳', path: '/admin/payouts' },
      { label: 'Transactions', icon: '📄', path: '/admin/transactions' },
    ],
  },
  {
    title: 'Support',
    items: [
      { label: 'Dispute Center', icon: '⚖️', path: '/admin/disputes' },
    ],
  },
  {
    title: 'Intelligence',
    items: [
      { label: 'Analytics', icon: '📈', path: '/admin/analytics' },
      { label: 'Impact Metrics', icon: '🌍', path: '/admin/impact' },
      { label: 'Region Heatmap', icon: '🗺️', path: '/admin/heatmap' },
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

  return (
    <aside className="admin-sidebar">
      {/* Brand */}
      <div className="admin-sidebar__brand">
        <span className="admin-sidebar__brand-icon">🌾</span>
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
        </div>
      )}
    </aside>
  );
};

export default AdminSidebar;
