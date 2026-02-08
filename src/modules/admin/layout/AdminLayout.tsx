import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminTopbar from './AdminTopbar';
import './adminLayout.css';

const AdminLayout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="admin-layout">
      <div
        className={`admin-layout__sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileSidebarOpen ? 'open' : ''}`}
      >
        <AdminSidebar
          collapsed={sidebarCollapsed}
          onClose={() => setMobileSidebarOpen(false)}
        />
      </div>

      <div className="admin-layout__main">
        <AdminTopbar
          onToggleSidebar={() => {
            setSidebarCollapsed((prev) => !prev);
            setMobileSidebarOpen((prev) => !prev);
          }}
        />
        <div className="admin-layout__content">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;
