import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminSettings.css';

// ============================================
// Icons (Simple SVG Components)
// ============================================
const Icons = {
  ArrowLeft: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  ),
  User: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  Settings: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
  Users: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  ShoppingBag: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  ),
  Truck: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  ),
  CreditCard: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  ),
  Bell: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  Shield: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  Database: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  ),
  AlertTriangle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  Check: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ),
  X: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Search: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  Moon: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  ),
  Sun: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  ),
  Camera: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  ),
  Save: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  ),
  LogOut: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  Download: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  Info: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
};

// ============================================
// Types
// ============================================
type SectionKey =
  | 'profile'
  | 'platform-config'
  | 'user-roles'
  | 'marketplace-rules'
  | 'logistics-settings'
  | 'payment-fees'
  | 'notifications'
  | 'security'
  | 'data-backup'
  | 'danger-zone';

interface MenuItem {
  id: SectionKey;
  label: string;
  icon: React.FC;
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

interface FormData {
  // Profile
  adminName: string;
  email: string;
  phone: string;
  profileImage: string;
  // Platform
  language: string;
  timezone: string;
  maintenanceMode: boolean;
  // Roles
  defaultRole: string;
  requireApproval: boolean;
  // Marketplace
  minQuantity: string;
  autoApprove: boolean;
  listingExpiry: string;
  // Logistics
  maxRadius: string;
  priorityDispatch: boolean;
  defaultVehicle: string;
  // Payment
  platformFee: string;
  settlementFrequency: string;
  minPayout: string;
  // Notifications
  emailAlerts: boolean;
  smsAlerts: boolean;
  pushNotifications: boolean;
  weeklyReport: boolean;
  // Security
  sessionTimeout: string;
  enforce2FA: boolean;
  ipWhitelist: boolean;
  // Backup
  backupFrequency: string;
  autoBackup: boolean;
  retentionDays: string;
  // Danger
  lockRegistrations: boolean;
  deactivateMarketplace: boolean;
}

// ============================================
// Constants
// ============================================
const menuItems: MenuItem[] = [
  { id: 'profile', label: 'Profile', icon: Icons.User },
  { id: 'platform-config', label: 'Platform Config', icon: Icons.Settings },
  { id: 'user-roles', label: 'User & Roles', icon: Icons.Users },
  { id: 'marketplace-rules', label: 'Marketplace Rules', icon: Icons.ShoppingBag },
  { id: 'logistics-settings', label: 'Logistics Settings', icon: Icons.Truck },
  { id: 'payment-fees', label: 'Payment & Fees', icon: Icons.CreditCard },
  { id: 'notifications', label: 'Notifications', icon: Icons.Bell },
  { id: 'security', label: 'Security', icon: Icons.Shield },
  { id: 'data-backup', label: 'Data & Backup', icon: Icons.Database },
  { id: 'danger-zone', label: 'Danger Zone', icon: Icons.AlertTriangle },
];

const initialFormData: FormData = {
  adminName: 'John Admin',
  email: 'admin@farmconnect.com',
  phone: '+91 98765 43210',
  profileImage: '',
  language: 'English',
  timezone: 'IST',
  maintenanceMode: false,
  defaultRole: 'Viewer',
  requireApproval: true,
  minQuantity: '10',
  autoApprove: false,
  listingExpiry: '30',
  maxRadius: '25',
  priorityDispatch: true,
  defaultVehicle: 'Auto',
  platformFee: '3',
  settlementFrequency: 'Weekly',
  minPayout: '500',
  emailAlerts: true,
  smsAlerts: false,
  pushNotifications: true,
  weeklyReport: true,
  sessionTimeout: '30',
  enforce2FA: true,
  ipWhitelist: false,
  backupFrequency: 'Daily',
  autoBackup: true,
  retentionDays: '30',
  lockRegistrations: false,
  deactivateMarketplace: false,
};

// ============================================
// Sub Components
// ============================================

// Toast Component
const ToastContainer: React.FC<{ toasts: Toast[]; onRemove: (id: number) => void }> = ({ toasts, onRemove }) => (
  <div className="toast-container">
    {toasts.map((toast) => (
      <div key={toast.id} className={`toast toast-${toast.type}`}>
        <span className="toast-icon">
          {toast.type === 'success' && <Icons.Check />}
          {toast.type === 'error' && <Icons.X />}
          {toast.type === 'warning' && <Icons.AlertTriangle />}
          {toast.type === 'info' && <Icons.Info />}
        </span>
        <span className="toast-message">{toast.message}</span>
        <button className="toast-close" onClick={() => onRemove(toast.id)}>
          <Icons.X />
        </button>
      </div>
    ))}
  </div>
);

// Toggle Switch Component
const Toggle: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}> = ({ checked, onChange, disabled }) => (
  <label className={`toggle-switch ${disabled ? 'disabled' : ''}`}>
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      disabled={disabled}
    />
    <span className="toggle-slider" />
  </label>
);

// Form Field Component
const FormField: React.FC<{
  label: string;
  description?: string;
  children: React.ReactNode;
  horizontal?: boolean;
}> = ({ label, description, children, horizontal }) => (
  <div className={`form-field ${horizontal ? 'horizontal' : ''}`}>
    <div className="form-field-label">
      <label>{label}</label>
      {description && <span className="form-field-desc">{description}</span>}
    </div>
    <div className="form-field-control">{children}</div>
  </div>
);

// Confirm Dialog Component
const ConfirmDialog: React.FC<{
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning';
}> = ({ isOpen, title, message, confirmText, onConfirm, onCancel, variant = 'danger' }) => {
  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className={`dialog dialog-${variant}`} onClick={(e) => e.stopPropagation()}>
        <div className="dialog-icon">
          <Icons.AlertTriangle />
        </div>
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="dialog-actions">
          <button className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button className={`btn btn-${variant}`} onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// Main Component
// ============================================
const AdminSettings: React.FC = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<SectionKey>('profile');
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [savedData, setSavedData] = useState<FormData>(initialFormData);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    action: () => void;
  }>({ isOpen: false, title: '', message: '', confirmText: '', action: () => {} });

  // Check for unsaved changes
  const hasChanges = useMemo(
    () => JSON.stringify(formData) !== JSON.stringify(savedData),
    [formData, savedData]
  );

  // Filter menu items by search
  const filteredMenu = useMemo(() => {
    if (!searchQuery) return menuItems;
    return menuItems.filter((item) =>
      item.label.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  // Toast functions
  const showToast = useCallback((message: string, type: Toast['type']) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Update form data
  const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  // Save handler
  const handleSave = async (section: string) => {
    setSaving(section);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setSavedData({ ...formData });
    setSaving(null);
    showToast(`${section} saved successfully!`, 'success');
  };

  // Profile image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => updateField('profileImage', reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  // Dangerous action handler
  const handleDangerAction = (action: 'lock' | 'deactivate') => {
    const config = {
      lock: {
        title: 'Lock Registrations',
        message: 'This will prevent new users from registering. Continue?',
        confirmText: 'Lock Now',
        action: () => {
          updateField('lockRegistrations', true);
          showToast('Registrations locked!', 'warning');
        },
      },
      deactivate: {
        title: 'Deactivate Marketplace',
        message: 'This will shut down the marketplace completely. This is critical!',
        confirmText: 'Deactivate',
        action: () => {
          updateField('deactivateMarketplace', true);
          showToast('Marketplace deactivated!', 'error');
        },
      },
    };

    setConfirmDialog({ isOpen: true, ...config[action] });
  };

  // Apply dark mode
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Get current section info
  const currentSection = menuItems.find((item) => item.id === activeSection);

  return (
    <div className="admin-settings">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        onConfirm={() => {
          confirmDialog.action();
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Header */}
      <header className="settings-header">
        <div className="header-left">
          <button className="back-btn" onClick={() => navigate('/admin')}>
            <Icons.ArrowLeft />
            <span>Dashboard</span>
          </button>
          <div className="header-title">
            <h1>Settings</h1>
            {hasChanges && <span className="unsaved-dot" title="Unsaved changes" />}
          </div>
        </div>
        <div className="header-right">
          <button className="icon-btn" onClick={() => setDarkMode(!darkMode)} title="Toggle theme">
            {darkMode ? <Icons.Sun /> : <Icons.Moon />}
          </button>
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </header>

      <div className="settings-layout">
        {/* Sidebar */}
        <aside className={`settings-sidebar ${mobileMenuOpen ? 'open' : ''}`}>
          <div className="search-box">
            <Icons.Search />
            <input
              type="text"
              placeholder="Search settings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <nav className="settings-nav">
            {filteredMenu.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  className={`nav-item ${activeSection === item.id ? 'active' : ''} ${
                    item.id === 'danger-zone' ? 'danger' : ''
                  }`}
                  onClick={() => {
                    setActiveSection(item.id);
                    setMobileMenuOpen(false);
                  }}
                >
                  <Icon />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="sidebar-footer">
            <button className="nav-item logout" onClick={handleLogout}>
              <Icons.LogOut />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="settings-main">
          <div className="section-header">
            {currentSection && (
              <>
                <div className="section-icon">
                  <currentSection.icon />
                </div>
                <h2>{currentSection.label}</h2>
              </>
            )}
          </div>

          {/* Profile Section */}
          {activeSection === 'profile' && (
            <div className="settings-card">
              <div className="profile-avatar">
                <div className="avatar">
                  {formData.profileImage ? (
                    <img src={formData.profileImage} alt="Profile" />
                  ) : (
                    <Icons.User />
                  )}
                  <label className="avatar-upload">
                    <Icons.Camera />
                    <input type="file" accept="image/*" onChange={handleImageUpload} />
                  </label>
                </div>
                <span>Click to upload</span>
              </div>

              <FormField label="Admin Name" description="Your display name">
                <input
                  type="text"
                  className="input"
                  value={formData.adminName}
                  onChange={(e) => updateField('adminName', e.target.value)}
                />
              </FormField>

              <FormField label="Email" description="For notifications">
                <input
                  type="email"
                  className="input"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                />
              </FormField>

              <FormField label="Phone" description="For urgent alerts">
                <input
                  type="tel"
                  className="input"
                  value={formData.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                />
              </FormField>

              <div className="card-footer">
                <button
                  className={`btn btn-primary ${saving === 'Profile' ? 'loading' : ''}`}
                  onClick={() => handleSave('Profile')}
                  disabled={saving === 'Profile'}
                >
                  {saving === 'Profile' ? (
                    <>
                      <span className="spinner" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Icons.Save />
                      Save Profile
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Platform Config Section */}
          {activeSection === 'platform-config' && (
            <div className="settings-card">
              <FormField label="Default Language">
                <select
                  className="input select"
                  value={formData.language}
                  onChange={(e) => updateField('language', e.target.value)}
                >
                  <option>English</option>
                  <option>Hindi</option>
                  <option>Tamil</option>
                  <option>Telugu</option>
                </select>
              </FormField>

              <FormField label="Timezone">
                <select
                  className="input select"
                  value={formData.timezone}
                  onChange={(e) => updateField('timezone', e.target.value)}
                >
                  <option>IST</option>
                  <option>UTC</option>
                  <option>EST</option>
                </select>
              </FormField>

              <FormField label="Maintenance Mode" description="Disable public access" horizontal>
                <Toggle
                  checked={formData.maintenanceMode}
                  onChange={(checked) => updateField('maintenanceMode', checked)}
                />
              </FormField>

              <div className="card-footer">
                <button
                  className={`btn btn-primary ${saving === 'Config' ? 'loading' : ''}`}
                  onClick={() => handleSave('Config')}
                  disabled={saving === 'Config'}
                >
                  {saving === 'Config' ? (
                    <>
                      <span className="spinner" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Icons.Save />
                      Update Config
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* User & Roles Section */}
          {activeSection === 'user-roles' && (
            <div className="settings-card">
              <FormField label="Default Role" description="For new moderators">
                <select
                  className="input select"
                  value={formData.defaultRole}
                  onChange={(e) => updateField('defaultRole', e.target.value)}
                >
                  <option>Viewer</option>
                  <option>Moderator</option>
                  <option>Manager</option>
                  <option>Admin</option>
                </select>
              </FormField>

              <FormField label="Require Approval" description="For role changes" horizontal>
                <Toggle
                  checked={formData.requireApproval}
                  onChange={(checked) => updateField('requireApproval', checked)}
                />
              </FormField>

              <div className="card-footer">
                <button
                  className={`btn btn-primary ${saving === 'Roles' ? 'loading' : ''}`}
                  onClick={() => handleSave('Roles')}
                  disabled={saving === 'Roles'}
                >
                  {saving === 'Roles' ? (
                    <>
                      <span className="spinner" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Icons.Save />
                      Save Rules
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Marketplace Rules Section */}
          {activeSection === 'marketplace-rules' && (
            <div className="settings-card">
              <FormField label="Min Quantity (kg)">
                <input
                  type="number"
                  className="input"
                  value={formData.minQuantity}
                  onChange={(e) => updateField('minQuantity', e.target.value)}
                />
              </FormField>

              <FormField label="Listing Expiry (days)">
                <input
                  type="number"
                  className="input"
                  value={formData.listingExpiry}
                  onChange={(e) => updateField('listingExpiry', e.target.value)}
                />
              </FormField>

              <FormField label="Auto-approve Trusted Sellers" horizontal>
                <Toggle
                  checked={formData.autoApprove}
                  onChange={(checked) => updateField('autoApprove', checked)}
                />
              </FormField>

              <div className="card-footer">
                <button
                  className={`btn btn-primary ${saving === 'Marketplace' ? 'loading' : ''}`}
                  onClick={() => handleSave('Marketplace')}
                  disabled={saving === 'Marketplace'}
                >
                  {saving === 'Marketplace' ? (
                    <>
                      <span className="spinner" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Icons.Save />
                      Apply Rules
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Logistics Section */}
          {activeSection === 'logistics-settings' && (
            <div className="settings-card">
              <FormField label="Max Pickup Radius (km)">
                <input
                  type="number"
                  className="input"
                  value={formData.maxRadius}
                  onChange={(e) => updateField('maxRadius', e.target.value)}
                />
              </FormField>

              <FormField label="Default Vehicle">
                <select
                  className="input select"
                  value={formData.defaultVehicle}
                  onChange={(e) => updateField('defaultVehicle', e.target.value)}
                >
                  <option>Auto</option>
                  <option>Bike</option>
                  <option>Van</option>
                  <option>Truck</option>
                </select>
              </FormField>

              <FormField label="Priority Dispatch" horizontal>
                <Toggle
                  checked={formData.priorityDispatch}
                  onChange={(checked) => updateField('priorityDispatch', checked)}
                />
              </FormField>

              <div className="card-footer">
                <button
                  className={`btn btn-primary ${saving === 'Logistics' ? 'loading' : ''}`}
                  onClick={() => handleSave('Logistics')}
                  disabled={saving === 'Logistics'}
                >
                  {saving === 'Logistics' ? (
                    <>
                      <span className="spinner" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Icons.Save />
                      Save Settings
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Payment Section */}
          {activeSection === 'payment-fees' && (
            <div className="settings-card">
              <FormField label="Platform Fee (%)">
                <input
                  type="number"
                  className="input"
                  value={formData.platformFee}
                  onChange={(e) => updateField('platformFee', e.target.value)}
                />
              </FormField>

              <FormField label="Settlement Frequency">
                <select
                  className="input select"
                  value={formData.settlementFrequency}
                  onChange={(e) => updateField('settlementFrequency', e.target.value)}
                >
                  <option>Daily</option>
                  <option>Weekly</option>
                  <option>Monthly</option>
                </select>
              </FormField>

              <FormField label="Min Payout (₹)">
                <input
                  type="number"
                  className="input"
                  value={formData.minPayout}
                  onChange={(e) => updateField('minPayout', e.target.value)}
                />
              </FormField>

              <div className="card-footer">
                <button
                  className={`btn btn-primary ${saving === 'Payment' ? 'loading' : ''}`}
                  onClick={() => handleSave('Payment')}
                  disabled={saving === 'Payment'}
                >
                  {saving === 'Payment' ? (
                    <>
                      <span className="spinner" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Icons.Save />
                      Update Fees
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Notifications Section */}
          {activeSection === 'notifications' && (
            <div className="settings-card">
              <FormField label="Email Alerts" horizontal>
                <Toggle
                  checked={formData.emailAlerts}
                  onChange={(checked) => updateField('emailAlerts', checked)}
                />
              </FormField>

              <FormField label="SMS Alerts" horizontal>
                <Toggle
                  checked={formData.smsAlerts}
                  onChange={(checked) => updateField('smsAlerts', checked)}
                />
              </FormField>

              <FormField label="Push Notifications" horizontal>
                <Toggle
                  checked={formData.pushNotifications}
                  onChange={(checked) => updateField('pushNotifications', checked)}
                />
              </FormField>

              <FormField label="Weekly Report" horizontal>
                <Toggle
                  checked={formData.weeklyReport}
                  onChange={(checked) => updateField('weeklyReport', checked)}
                />
              </FormField>

              <div className="card-footer">
                <button
                  className={`btn btn-primary ${saving === 'Notifications' ? 'loading' : ''}`}
                  onClick={() => handleSave('Notifications')}
                  disabled={saving === 'Notifications'}
                >
                  {saving === 'Notifications' ? (
                    <>
                      <span className="spinner" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Icons.Save />
                      Save Settings
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Security Section */}
          {activeSection === 'security' && (
            <div className="settings-card">
              <FormField label="Session Timeout (min)">
                <input
                  type="number"
                  className="input"
                  value={formData.sessionTimeout}
                  onChange={(e) => updateField('sessionTimeout', e.target.value)}
                />
              </FormField>

              <FormField label="Enforce 2FA" description="Two-factor authentication" horizontal>
                <Toggle
                  checked={formData.enforce2FA}
                  onChange={(checked) => updateField('enforce2FA', checked)}
                />
              </FormField>

              <FormField label="IP Whitelist" description="Restrict by IP" horizontal>
                <Toggle
                  checked={formData.ipWhitelist}
                  onChange={(checked) => updateField('ipWhitelist', checked)}
                />
              </FormField>

              <div className="card-footer">
                <button
                  className={`btn btn-primary ${saving === 'Security' ? 'loading' : ''}`}
                  onClick={() => handleSave('Security')}
                  disabled={saving === 'Security'}
                >
                  {saving === 'Security' ? (
                    <>
                      <span className="spinner" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Icons.Save />
                      Update Security
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Data & Backup Section */}
          {activeSection === 'data-backup' && (
            <div className="settings-card">
              <FormField label="Backup Frequency">
                <select
                  className="input select"
                  value={formData.backupFrequency}
                  onChange={(e) => updateField('backupFrequency', e.target.value)}
                >
                  <option>Every 6 Hours</option>
                  <option>Daily</option>
                  <option>Weekly</option>
                </select>
              </FormField>

              <FormField label="Retention (days)">
                <input
                  type="number"
                  className="input"
                  value={formData.retentionDays}
                  onChange={(e) => updateField('retentionDays', e.target.value)}
                />
              </FormField>

              <FormField label="Auto Backup" horizontal>
                <Toggle
                  checked={formData.autoBackup}
                  onChange={(checked) => updateField('autoBackup', checked)}
                />
              </FormField>

              <div className="card-footer">
                <button
                  className={`btn btn-primary ${saving === 'Backup' ? 'loading' : ''}`}
                  onClick={() => handleSave('Backup')}
                  disabled={saving === 'Backup'}
                >
                  {saving === 'Backup' ? (
                    <>
                      <span className="spinner" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Icons.Save />
                      Save Settings
                    </>
                  )}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => showToast('Backup started...', 'info')}
                >
                  <Icons.Download />
                  Backup Now
                </button>
              </div>
            </div>
          )}

          {/* Danger Zone Section */}
          {activeSection === 'danger-zone' && (
            <div className="settings-card danger-card">
              <div className="danger-warning">
                <Icons.AlertTriangle />
                <p>
                  <strong>Warning:</strong> These actions can severely impact the platform.
                </p>
              </div>

              <div className="danger-item">
                <div className="danger-info">
                  <h4>Lock Registrations</h4>
                  <p>Prevent new user signups</p>
                </div>
                <button
                  className={`btn btn-warning ${formData.lockRegistrations ? 'active' : ''}`}
                  onClick={() => handleDangerAction('lock')}
                  disabled={formData.lockRegistrations}
                >
                  {formData.lockRegistrations ? 'Locked' : 'Lock'}
                </button>
              </div>

              <div className="danger-item">
                <div className="danger-info">
                  <h4>Deactivate Marketplace</h4>
                  <p>Shut down all operations</p>
                </div>
                <button
                  className={`btn btn-danger ${formData.deactivateMarketplace ? 'active' : ''}`}
                  onClick={() => handleDangerAction('deactivate')}
                  disabled={formData.deactivateMarketplace}
                >
                  {formData.deactivateMarketplace ? 'Deactivated' : 'Deactivate'}
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminSettings;