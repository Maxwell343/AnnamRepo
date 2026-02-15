import React, { useState, useEffect, useCallback, useMemo } from 'react';
import UserDetailsModal from './UserDetailsModal';
import KycReviewPanel from './KycReviewPanel';
import './UserManagement.css';

// ============ Types ============
type UserRole = 'all' | 'farmer' | 'customer' | 'driver' | 'ngo';
type UserStatus = 'active' | 'suspended' | 'pending';
type SortField = 'name' | 'role' | 'status' | 'joinedAt' | 'lastActive';
type SortOrder = 'asc' | 'desc';

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
  avatar?: string;
  address?: string;
  totalTransactions?: number;
  rating?: number;
}

interface PaginationState {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

// ============ Constants ============
const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

const ROLE_CONFIG: Record<Exclude<UserRole, 'all'>, { icon: string; color: string; label: string }> = {
  farmer: { icon: '🌾', color: '#22c55e', label: 'Farmer' },
  customer: { icon: '🛒', color: '#3b82f6', label: 'Customer' },
  driver: { icon: '🚚', color: '#f59e0b', label: 'Driver' },
  ngo: { icon: '💚', color: '#8b5cf6', label: 'NGO' },
};

const STATUS_CONFIG: Record<UserStatus, { icon: string; color: string; bgColor: string }> = {
  active: { icon: '✓', color: '#16a34a', bgColor: '#dcfce7' },
  suspended: { icon: '⊘', color: '#dc2626', bgColor: '#fee2e2' },
  pending: { icon: '◷', color: '#d97706', bgColor: '#fef3c7' },
};

// ============ Helper Components ============
const LoadingSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <>
    {Array.from({ length: rows }).map((_, index) => (
      <tr key={index} className="skeleton-row">
        <td>
          <div className="skeleton-cell">
            <div className="skeleton skeleton-avatar" />
            <div className="skeleton-text">
              <div className="skeleton skeleton-name" />
              <div className="skeleton skeleton-email" />
            </div>
          </div>
        </td>
        <td><div className="skeleton skeleton-badge" /></td>
        <td><div className="skeleton skeleton-badge" /></td>
        <td><div className="skeleton skeleton-badge" /></td>
        <td><div className="skeleton skeleton-date" /></td>
        <td><div className="skeleton skeleton-date" /></td>
        <td><div className="skeleton skeleton-actions" /></td>
      </tr>
    ))}
  </>
);

const EmptyState: React.FC<{ searchQuery: string; onClear: () => void }> = ({ searchQuery, onClear }) => (
  <div className="empty-state">
    <div className="empty-state__icon">👤</div>
    <h3 className="empty-state__title">No users found</h3>
    <p className="empty-state__description">
      {searchQuery
        ? `No results for "${searchQuery}". Try adjusting your search or filters.`
        : 'There are no users matching your current filters.'}
    </p>
    {searchQuery && (
      <button className="empty-state__button" onClick={onClear}>
        Clear Search
      </button>
    )}
  </div>
);

const ConfirmDialog: React.FC<{
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmVariant: 'danger' | 'primary' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}> = ({ isOpen, title, message, confirmLabel, confirmVariant, onConfirm, onCancel, isLoading }) => {
  if (!isOpen) return null;

  return (
    <div className="confirm-dialog__overlay" onClick={onCancel}>
      <div className="confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="confirm-dialog__icon" data-variant={confirmVariant}>
          {confirmVariant === 'danger' ? '⚠️' : confirmVariant === 'warning' ? '⚡' : 'ℹ️'}
        </div>
        <h3 className="confirm-dialog__title">{title}</h3>
        <p className="confirm-dialog__message">{message}</p>
        <div className="confirm-dialog__actions">
          <button
            className="confirm-dialog__btn confirm-dialog__btn--cancel"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            className={`confirm-dialog__btn confirm-dialog__btn--${confirmVariant}`}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="btn-spinner" />
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const ToastContainer: React.FC<{ toasts: Toast[]; onDismiss: (id: string) => void }> = ({
  toasts,
  onDismiss,
}) => (
  <div className="toast-container">
    {toasts.map((toast) => (
      <div key={toast.id} className={`toast toast--${toast.type}`}>
        <span className="toast__icon">
          {toast.type === 'success' && '✓'}
          {toast.type === 'error' && '✕'}
          {toast.type === 'warning' && '⚠'}
          {toast.type === 'info' && 'ℹ'}
        </span>
        <span className="toast__message">{toast.message}</span>
        <button className="toast__close" onClick={() => onDismiss(toast.id)}>
          ×
        </button>
      </div>
    ))}
  </div>
);

// ============ Main Component ============
const UserManagement: React.FC = () => {
  // State
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [activeTab, setActiveTab] = useState<UserRole>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [showKycPanel, setShowKycPanel] = useState(false);
  const [kycUser, setKycUser] = useState<UserRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Sorting
  const [sortField, setSortField] = useState<SortField>('joinedAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  
  // Pagination
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 1,
    itemsPerPage: 10,
    totalItems: 0,
  });
  
  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<UserStatus | 'all'>('all');
  const [kycFilter, setKycFilter] = useState<'all' | 'verified' | 'pending'>('all');
  
  // Dialogs & Notifications
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    confirmVariant: 'danger' | 'primary' | 'warning';
    onConfirm: () => void;
    isLoading?: boolean;
  } | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  // Bulk action loading
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // ============ Hooks ============
  
  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPagination((prev) => ({ ...prev, currentPage: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load users
  useEffect(() => {
    loadUsers();
  }, []);

  // ============ API Functions ============
  
  const loadUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:8000/api/admin/users').catch(() => null);
      if (response?.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      } else {
        // Fallback sample data for development
        const sampleUsers: UserRecord[] = [
          {
            id: '1',
            name: 'Ramesh Kumar',
            email: 'ramesh@farm.in',
            phone: '+91-9876543210',
            role: 'farmer',
            status: 'active',
            kycVerified: true,
            joinedAt: '2025-08-15',
            lastActive: '2026-02-08',
            totalTransactions: 145,
            rating: 4.8,
          },
          {
            id: '2',
            name: 'Priya Devi',
            email: 'priya@email.com',
            phone: '+91-8765432109',
            role: 'customer',
            status: 'active',
            kycVerified: true,
            joinedAt: '2025-10-20',
            lastActive: '2026-02-07',
            totalTransactions: 32,
            rating: 4.5,
          },
          {
            id: '3',
            name: 'Suresh Pal',
            email: 'suresh@drive.in',
            phone: '+91-7654321098',
            role: 'driver',
            status: 'active',
            kycVerified: false,
            joinedAt: '2025-12-01',
            lastActive: '2026-02-08',
            totalTransactions: 89,
            rating: 4.9,
          },
          {
            id: '4',
            name: 'Helping Hands NGO',
            email: 'info@helpinghands.org',
            phone: '+91-6543210987',
            role: 'ngo',
            status: 'pending',
            kycVerified: false,
            joinedAt: '2026-01-15',
            lastActive: '2026-02-06',
            totalTransactions: 12,
            rating: 5.0,
          },
          {
            id: '5',
            name: 'Anita Sharma',
            email: 'anita.sharma@gmail.com',
            phone: '+91-9988776655',
            role: 'customer',
            status: 'suspended',
            kycVerified: true,
            joinedAt: '2025-06-10',
            lastActive: '2025-12-15',
            totalTransactions: 8,
            rating: 3.2,
          },
          {
            id: '6',
            name: 'Vikram Singh',
            email: 'vikram.farmer@agri.in',
            phone: '+91-8877665544',
            role: 'farmer',
            status: 'active',
            kycVerified: true,
            joinedAt: '2025-03-22',
            lastActive: '2026-02-08',
            totalTransactions: 267,
            rating: 4.7,
          },
          {
            id: '7',
            name: 'Meena Kumari',
            email: 'meena.k@driver.com',
            phone: '+91-7766554433',
            role: 'driver',
            status: 'pending',
            kycVerified: false,
            joinedAt: '2026-02-01',
            lastActive: '2026-02-08',
            totalTransactions: 0,
            rating: 0,
          },
          {
            id: '8',
            name: 'Food For All Foundation',
            email: 'contact@foodforall.org',
            phone: '+91-6655443322',
            role: 'ngo',
            status: 'active',
            kycVerified: true,
            joinedAt: '2025-01-05',
            lastActive: '2026-02-07',
            totalTransactions: 456,
            rating: 4.9,
          },
        ];
        setUsers(sampleUsers);
      }
    } catch (err) {
      setError('Failed to load users. Please try again.');
      showToast('error', 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserStatus = async (userId: string, newStatus: UserStatus) => {
    try {
      // API call would go here
      await new Promise((resolve) => setTimeout(resolve, 800));
      
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status: newStatus } : u))
      );
      showToast('success', `User ${newStatus === 'suspended' ? 'suspended' : 'activated'} successfully`);
      return true;
    } catch (err) {
      showToast('error', 'Failed to update user status');
      return false;
    }
  };

  const bulkUpdateStatus = async (userIds: string[], newStatus: UserStatus) => {
    setBulkActionLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      setUsers((prev) =>
        prev.map((u) => (userIds.includes(u.id) ? { ...u, status: newStatus } : u))
      );
      setSelectedIds(new Set());
      showToast('success', `${userIds.length} users updated successfully`);
    } catch (err) {
      showToast('error', 'Failed to update users');
    } finally {
      setBulkActionLoading(false);
    }
  };

  // ============ Toast Functions ============
  
  const showToast = useCallback((type: Toast['type'], message: string) => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ============ Filtering & Sorting ============
  
  const filteredAndSortedUsers = useMemo(() => {
    let result = [...users];

    // Filter by role tab
    if (activeTab !== 'all') {
      result = result.filter((user) => user.role === activeTab);
    }

    // Filter by status
    if (statusFilter !== 'all') {
      result = result.filter((user) => user.status === statusFilter);
    }

    // Filter by KYC
    if (kycFilter !== 'all') {
      result = result.filter((user) =>
        kycFilter === 'verified' ? user.kycVerified : !user.kycVerified
      );
    }

    // Search filter
    if (debouncedSearch) {
      const search = debouncedSearch.toLowerCase();
      result = result.filter(
        (user) =>
          user.name.toLowerCase().includes(search) ||
          user.email.toLowerCase().includes(search) ||
          user.phone.includes(search)
      );
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'role':
          comparison = a.role.localeCompare(b.role);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'joinedAt':
        case 'lastActive':
          comparison = new Date(a[sortField]).getTime() - new Date(b[sortField]).getTime();
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [users, activeTab, statusFilter, kycFilter, debouncedSearch, sortField, sortOrder]);

  // Paginated users
  const paginatedUsers = useMemo(() => {
    const start = (pagination.currentPage - 1) * pagination.itemsPerPage;
    const end = start + pagination.itemsPerPage;
    return filteredAndSortedUsers.slice(start, end);
  }, [filteredAndSortedUsers, pagination.currentPage, pagination.itemsPerPage]);

  const totalPages = Math.ceil(filteredAndSortedUsers.length / pagination.itemsPerPage);

  // ============ Statistics ============
  
  const statistics = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return {
      total: users.length,
      active: users.filter((u) => u.status === 'active').length,
      suspended: users.filter((u) => u.status === 'suspended').length,
      pending: users.filter((u) => u.status === 'pending').length,
      kycPending: users.filter((u) => !u.kycVerified).length,
      newThisMonth: users.filter((u) => new Date(u.joinedAt) >= thirtyDaysAgo).length,
      byRole: {
        farmer: users.filter((u) => u.role === 'farmer').length,
        customer: users.filter((u) => u.role === 'customer').length,
        driver: users.filter((u) => u.role === 'driver').length,
        ngo: users.filter((u) => u.role === 'ngo').length,
      },
    };
  }, [users]);

  // ============ Selection Handlers ============
  
  const handleSelectAll = () => {
    if (selectedIds.size === paginatedUsers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedUsers.map((u) => u.id)));
    }
  };

  const handleSelectUser = (userId: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedIds(newSelection);
  };

  // ============ Sort Handler ============
  
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // ============ Action Handlers ============
  
  const handleSuspendUser = (user: UserRecord) => {
    const isSuspending = user.status !== 'suspended';
    setConfirmDialog({
      isOpen: true,
      title: isSuspending ? 'Suspend User' : 'Activate User',
      message: isSuspending
        ? `Are you sure you want to suspend ${user.name}? They will lose access to the platform.`
        : `Are you sure you want to activate ${user.name}? They will regain access to the platform.`,
      confirmLabel: isSuspending ? 'Suspend' : 'Activate',
      confirmVariant: isSuspending ? 'danger' : 'primary',
      onConfirm: async () => {
        setConfirmDialog((prev) => (prev ? { ...prev, isLoading: true } : null));
        await updateUserStatus(user.id, isSuspending ? 'suspended' : 'active');
        setConfirmDialog(null);
      },
    });
  };

  const handleBulkSuspend = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Bulk Suspend Users',
      message: `Are you sure you want to suspend ${selectedIds.size} users? They will lose access to the platform.`,
      confirmLabel: 'Suspend All',
      confirmVariant: 'danger',
      onConfirm: async () => {
        setConfirmDialog(null);
        await bulkUpdateStatus(Array.from(selectedIds), 'suspended');
      },
    });
  };

  const handleExport = () => {
    const csvContent = [
      ['ID', 'Name', 'Email', 'Phone', 'Role', 'Status', 'KYC Verified', 'Joined At', 'Last Active'],
      ...filteredAndSortedUsers.map((user) => [
        user.id,
        user.name,
        user.email,
        user.phone,
        user.role,
        user.status,
        user.kycVerified ? 'Yes' : 'No',
        user.joinedAt,
        user.lastActive,
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('success', 'Users exported successfully');
  };

  // ============ Render ============
  
  const tabs: { key: UserRole; label: string; icon: string }[] = [
    { key: 'all', label: 'All Users', icon: '👥' },
    { key: 'farmer', label: 'Farmers', icon: '🌾' },
    { key: 'customer', label: 'Customers', icon: '🛒' },
    { key: 'driver', label: 'Drivers', icon: '🚚' },
    { key: 'ngo', label: 'NGOs', icon: '💚' },
  ];

  return (
    <div className="user-management">
      {/* Statistics Cards */}
      <div className="user-management__stats">
        <div className="stat-card stat-card--primary">
          <div className="stat-card__icon">👥</div>
          <div className="stat-card__content">
            <span className="stat-card__value">{statistics.total}</span>
            <span className="stat-card__label">Total Users</span>
          </div>
        </div>
        <div className="stat-card stat-card--success">
          <div className="stat-card__icon">✓</div>
          <div className="stat-card__content">
            <span className="stat-card__value">{statistics.active}</span>
            <span className="stat-card__label">Active</span>
          </div>
        </div>
        <div className="stat-card stat-card--warning">
          <div className="stat-card__icon">⏳</div>
          <div className="stat-card__content">
            <span className="stat-card__value">{statistics.kycPending}</span>
            <span className="stat-card__label">KYC Pending</span>
          </div>
        </div>
        <div className="stat-card stat-card--info">
          <div className="stat-card__icon">📈</div>
          <div className="stat-card__content">
            <span className="stat-card__value">{statistics.newThisMonth}</span>
            <span className="stat-card__label">New This Month</span>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="user-management__header">
        <div className="user-management__header-left">
          <h1 className="user-management__title">User Management</h1>
          <p className="user-management__subtitle">
            Manage and monitor all platform users
          </p>
        </div>
        <div className="user-management__header-right">
          <button
            className="user-management__btn user-management__btn--secondary"
            onClick={loadUsers}
            disabled={isLoading}
          >
            <span className={`btn-icon ${isLoading ? 'spinning' : ''}`}>🔄</span>
            Refresh
          </button>
          <button
            className="user-management__btn user-management__btn--secondary"
            onClick={handleExport}
          >
            <span className="btn-icon">📥</span>
            Export
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="user-management__filters">
        <div className="user-management__search">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="user-management__search-input"
          />
          {searchQuery && (
            <button
              className="search-clear"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        <div className="user-management__filter-group">
          <select
            className="user-management__select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as UserStatus | 'all')}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="pending">Pending</option>
          </select>

          <select
            className="user-management__select"
            value={kycFilter}
            onChange={(e) => setKycFilter(e.target.value as 'all' | 'verified' | 'pending')}
          >
            <option value="all">All KYC</option>
            <option value="verified">KYC Verified</option>
            <option value="pending">KYC Pending</option>
          </select>
        </div>
      </div>

      {/* Role Tabs */}
      <div className="user-management__tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`user-management__tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => {
              setActiveTab(tab.key);
              setPagination((prev) => ({ ...prev, currentPage: 1 }));
            }}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
            <span className="tab-count">
              {tab.key === 'all' ? statistics.total : statistics.byRole[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="user-management__bulk-actions">
          <span className="bulk-actions__count">
            {selectedIds.size} user{selectedIds.size > 1 ? 's' : ''} selected
          </span>
          <div className="bulk-actions__buttons">
            <button
              className="bulk-actions__btn bulk-actions__btn--danger"
              onClick={handleBulkSuspend}
              disabled={bulkActionLoading}
            >
              {bulkActionLoading ? <span className="btn-spinner" /> : 'Suspend Selected'}
            </button>
            <button
              className="bulk-actions__btn bulk-actions__btn--secondary"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="user-management__error">
          <span className="error-icon">⚠️</span>
          <span className="error-message">{error}</span>
          <button className="error-retry" onClick={loadUsers}>
            Retry
          </button>
        </div>
      )}

      {/* Table */}
      <div className="user-management__table-wrapper">
        <table className="user-management__table">
          <thead>
            <tr>
              <th className="th-checkbox">
                <input
                  type="checkbox"
                  checked={selectedIds.size === paginatedUsers.length && paginatedUsers.length > 0}
                  onChange={handleSelectAll}
                  className="custom-checkbox"
                />
              </th>
              <th className="sortable" onClick={() => handleSort('name')}>
                User
                {sortField === 'name' && (
                  <span className="sort-indicator">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th className="sortable" onClick={() => handleSort('role')}>
                Role
                {sortField === 'role' && (
                  <span className="sort-indicator">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th className="sortable" onClick={() => handleSort('status')}>
                Status
                {sortField === 'status' && (
                  <span className="sort-indicator">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th>KYC</th>
              <th className="sortable" onClick={() => handleSort('joinedAt')}>
                Joined
                {sortField === 'joinedAt' && (
                  <span className="sort-indicator">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th className="sortable" onClick={() => handleSort('lastActive')}>
                Last Active
                {sortField === 'lastActive' && (
                  <span className="sort-indicator">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <LoadingSkeleton rows={pagination.itemsPerPage} />
            ) : paginatedUsers.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <EmptyState searchQuery={debouncedSearch} onClear={() => setSearchQuery('')} />
                </td>
              </tr>
            ) : (
              paginatedUsers.map((user) => (
                <tr
                  key={user.id}
                  className={`user-row ${selectedIds.has(user.id) ? 'selected' : ''}`}
                >
                  <td className="td-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(user.id)}
                      onChange={() => handleSelectUser(user.id)}
                      className="custom-checkbox"
                    />
                  </td>
                  <td>
                    <div className="user-row__info">
                      <div
                        className="user-row__avatar"
                        style={{ backgroundColor: ROLE_CONFIG[user.role].color + '20' }}
                      >
                        <span style={{ color: ROLE_CONFIG[user.role].color }}>
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="user-row__details">
                        <div className="user-row__name">{user.name}</div>
                        <div className="user-row__email">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span
                      className="role-badge"
                      style={{
                        backgroundColor: ROLE_CONFIG[user.role].color + '15',
                        color: ROLE_CONFIG[user.role].color,
                      }}
                    >
                      <span className="role-badge__icon">{ROLE_CONFIG[user.role].icon}</span>
                      {ROLE_CONFIG[user.role].label}
                    </span>
                  </td>
                  <td>
                    <span
                      className="status-badge"
                      style={{
                        backgroundColor: STATUS_CONFIG[user.status].bgColor,
                        color: STATUS_CONFIG[user.status].color,
                      }}
                    >
                      <span className="status-badge__icon">{STATUS_CONFIG[user.status].icon}</span>
                      {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`kyc-badge ${user.kycVerified ? 'kyc-badge--verified' : 'kyc-badge--pending'}`}
                    >
                      {user.kycVerified ? (
                        <>
                          <span className="kyc-badge__icon">✓</span>
                          Verified
                        </>
                      ) : (
                        <>
                          <span className="kyc-badge__icon">⏳</span>
                          Pending
                        </>
                      )}
                    </span>
                  </td>
                  <td>
                    <span className="date-cell">
                      {new Date(user.joinedAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </td>
                  <td>
                    <span className="date-cell">
                      {new Date(user.lastActive).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </td>
                  <td>
                    <div className="user-row__actions">
                      <button
                        className="action-btn action-btn--view"
                        onClick={() => setSelectedUser(user)}
                        title="View Details"
                      >
                        <span>👁️</span>
                      </button>
                      {!user.kycVerified && (
                        <button
                          className="action-btn action-btn--kyc"
                          onClick={() => {
                            setKycUser(user);
                            setShowKycPanel(true);
                          }}
                          title="Review KYC"
                        >
                          <span>📋</span>
                        </button>
                      )}
                      <button
                        className={`action-btn ${user.status === 'suspended' ? 'action-btn--activate' : 'action-btn--suspend'}`}
                        onClick={() => handleSuspendUser(user)}
                        title={user.status === 'suspended' ? 'Activate User' : 'Suspend User'}
                      >
                        <span>{user.status === 'suspended' ? '✓' : '⊘'}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!isLoading && filteredAndSortedUsers.length > 0 && (
        <div className="user-management__pagination">
          <div className="pagination__info">
            <span>
              Showing {(pagination.currentPage - 1) * pagination.itemsPerPage + 1} to{' '}
              {Math.min(pagination.currentPage * pagination.itemsPerPage, filteredAndSortedUsers.length)} of{' '}
              {filteredAndSortedUsers.length} users
            </span>
            <select
              className="pagination__per-page"
              value={pagination.itemsPerPage}
              onChange={(e) =>
                setPagination((prev) => ({
                  ...prev,
                  itemsPerPage: Number(e.target.value),
                  currentPage: 1,
                }))
              }
            >
              {ITEMS_PER_PAGE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option} per page
                </option>
              ))}
            </select>
          </div>
          <div className="pagination__controls">
            <button
              className="pagination__btn"
              onClick={() => setPagination((prev) => ({ ...prev, currentPage: 1 }))}
              disabled={pagination.currentPage === 1}
            >
              ««
            </button>
            <button
              className="pagination__btn"
              onClick={() => setPagination((prev) => ({ ...prev, currentPage: prev.currentPage - 1 }))}
              disabled={pagination.currentPage === 1}
            >
              ‹ Prev
            </button>
            <div className="pagination__pages">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (pagination.currentPage <= 3) {
                  pageNum = i + 1;
                } else if (pagination.currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = pagination.currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    className={`pagination__page ${pagination.currentPage === pageNum ? 'active' : ''}`}
                    onClick={() => setPagination((prev) => ({ ...prev, currentPage: pageNum }))}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              className="pagination__btn"
              onClick={() => setPagination((prev) => ({ ...prev, currentPage: prev.currentPage + 1 }))}
              disabled={pagination.currentPage === totalPages}
            >
              Next ›
            </button>
            <button
              className="pagination__btn"
              onClick={() => setPagination((prev) => ({ ...prev, currentPage: totalPages }))}
              disabled={pagination.currentPage === totalPages}
            >
              »»
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {selectedUser && (
        <UserDetailsModal user={selectedUser} onClose={() => setSelectedUser(null)} />
      )}

      {showKycPanel && kycUser && (
        <KycReviewPanel
          user={kycUser}
          onClose={() => {
            setShowKycPanel(false);
            setKycUser(null);
          }}
          onApprove={() => {
            setUsers((prev) =>
              prev.map((u) => (u.id === kycUser.id ? { ...u, kycVerified: true } : u))
            );
            setShowKycPanel(false);
            setKycUser(null);
            showToast('success', `KYC approved for ${kycUser.name}`);
          }}
          onReject={() => {
            setShowKycPanel(false);
            setKycUser(null);
            showToast('warning', `KYC rejected for ${kycUser.name}`);
          }}
        />
      )}

      {/* Confirm Dialog */}
      {confirmDialog && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmLabel={confirmDialog.confirmLabel}
          confirmVariant={confirmDialog.confirmVariant}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
          isLoading={confirmDialog.isLoading}
        />
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};

export default UserManagement;