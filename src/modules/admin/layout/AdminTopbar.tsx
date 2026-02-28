import React, { useState } from 'react';
import { Menu, Search, Bell, Settings } from 'lucide-react';

interface AdminTopbarProps {
  onToggleSidebar: () => void;
}

const AdminTopbar: React.FC<AdminTopbarProps> = ({ onToggleSidebar }) => {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <header className="admin-topbar">
      <div className="admin-topbar__left">
        <button className="admin-topbar__toggle" onClick={onToggleSidebar}>
          <Menu size={20} />
        </button>
        <div className="admin-topbar__breadcrumb">
          <span>Admin</span>
          <span>/</span>
          <span className="admin-topbar__breadcrumb-active">Dashboard</span>
        </div>
      </div>

      <div className="admin-topbar__right">
        <div className="admin-topbar__search">
          <span><Search size={16} /></span>
          <input
            type="text"
            placeholder="Search users, orders, listings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <button className="admin-topbar__icon-btn">
          <Bell size={18} />
          <span className="admin-topbar__badge" />
        </button>

        <button className="admin-topbar__icon-btn">
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
};

export default AdminTopbar;
