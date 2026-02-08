import React, { useState, useEffect } from 'react';
import UserDetailsModal from './UserDetailsModal';
import KycReviewPanel from './KycReviewPanel';
import './UserManagement.css';

type UserRole = 'all' | 'farmer' | 'customer' | 'driver' | 'ngo';
type UserStatus = 'active' | 'suspended' | 'pending';

interface UserRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Exclude<UserRole, 'all'>;
  status: UserStatus;
  kycVerified: boolean;
  joinedAt: string;
  lastActive: string;
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [activeTab, setActiveTab] = useState<UserRole>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [showKycPanel, setShowKycPanel] = useState(false);
  const [kycUser, setKycUser] = useState<UserRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadUsers = async () => {
      setIsLoading(true);
      try {
        // TODO: Replace with real API call
        const response = await fetch('http://localhost:8000/api/admin/users').catch(() => null);
        if (response?.ok) {
          const data = await response.json();
          setUsers(data.users || []);
        } else {
          // Fallback sample data
          setUsers([
            { id: '1', name: 'Ramesh Kumar', email: 'ramesh@farm.in', phone: '+91-9876543210', role: 'farmer', status: 'active', kycVerified: true, joinedAt: '2025-08-15', lastActive: '2026-02-08' },
            { id: '2', name: 'Priya Devi', email: 'priya@email.com', phone: '+91-8765432109', role: 'customer', status: 'active', kycVerified: true, joinedAt: '2025-10-20', lastActive: '2026-02-07' },
            { id: '3', name: 'Suresh Pal', email: 'suresh@drive.in', phone: '+91-7654321098', role: 'driver', status: 'active', kycVerified: false, joinedAt: '2025-12-01', lastActive: '2026-02-08' },
            { id: '4', name: 'Helping Hands NGO', email: 'info@helpinghands.org', phone: '+91-6543210987', role: 'ngo', status: 'pending', kycVerified: false, joinedAt: '2026-01-15', lastActive: '2026-02-06' },
          ]);
        }
      } finally {
        setIsLoading(false);
      }
    };
    loadUsers();
  }, []);

  const filteredUsers = users.filter((user) => {
    const matchesTab = activeTab === 'all' || user.role === activeTab;
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const roleCounts = {
    all: users.length,
    farmer: users.filter((u) => u.role === 'farmer').length,
    customer: users.filter((u) => u.role === 'customer').length,
    driver: users.filter((u) => u.role === 'driver').length,
    ngo: users.filter((u) => u.role === 'ngo').length,
  };

  const tabs: { key: UserRole; label: string }[] = [
    { key: 'all', label: 'All Users' },
    { key: 'farmer', label: 'Farmers' },
    { key: 'customer', label: 'Customers' },
    { key: 'driver', label: 'Drivers' },
    { key: 'ngo', label: 'NGOs' },
  ];

  return (
    <div className="user-management">
      {/* Header */}
      <div className="user-management__header">
        <h1 className="user-management__title">User Management</h1>
        <div className="user-management__controls">
          <div className="user-management__search">
            <span>🔍</span>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Role Tabs */}
      <div className="user-management__tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`user-management__tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
            <span className="user-management__tab-count">{roleCounts[tab.key]}</span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="user-management__table-wrapper">
        <table className="user-management__table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Status</th>
              <th>KYC</th>
              <th>Joined</th>
              <th>Last Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }}>Loading users...</td></tr>
            ) : filteredUsers.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>No users found</td></tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="user-row__info">
                      <div className={`user-row__avatar ${user.role}`}>
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <div className="user-row__name">{user.name}</div>
                        <div className="user-row__email">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td><span className={`user-badge ${user.role}`}>{user.role}</span></td>
                  <td><span className={`user-badge ${user.status}`}>{user.status}</span></td>
                  <td>
                    <span className={`user-badge ${user.kycVerified ? 'verified' : 'pending'}`}>
                      {user.kycVerified ? '✓ Verified' : '⏳ Pending'}
                    </span>
                  </td>
                  <td>{new Date(user.joinedAt).toLocaleDateString()}</td>
                  <td>{new Date(user.lastActive).toLocaleDateString()}</td>
                  <td>
                    <div className="user-row__actions">
                      <button className="user-row__action-btn" onClick={() => setSelectedUser(user)}>
                        View
                      </button>
                      {!user.kycVerified && (
                        <button
                          className="user-row__action-btn"
                          onClick={() => { setKycUser(user); setShowKycPanel(true); }}
                        >
                          KYC
                        </button>
                      )}
                      <button className="user-row__action-btn danger">
                        {user.status === 'suspended' ? 'Unsuspend' : 'Suspend'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="user-management__pagination">
          <span className="user-management__page-info">
            Showing {filteredUsers.length} of {users.length} users
          </span>
          <div className="user-management__page-controls">
            <button className="user-management__page-btn">← Prev</button>
            <button className="user-management__page-btn active">1</button>
            <button className="user-management__page-btn">Next →</button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {selectedUser && (
        <UserDetailsModal user={selectedUser} onClose={() => setSelectedUser(null)} />
      )}

      {showKycPanel && kycUser && (
        <KycReviewPanel
          user={kycUser}
          onClose={() => { setShowKycPanel(false); setKycUser(null); }}
          onApprove={() => {
            setUsers((prev) =>
              prev.map((u) => (u.id === kycUser.id ? { ...u, kycVerified: true } : u))
            );
            setShowKycPanel(false);
            setKycUser(null);
          }}
          onReject={() => {
            setShowKycPanel(false);
            setKycUser(null);
          }}
        />
      )}
    </div>
  );
};

export default UserManagement;
