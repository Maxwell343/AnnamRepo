import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from '../../../config/api';
import './FarmerSettings.css';

// Icons as SVG components
const Icons = {
  User: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  Farm: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  ),
  Calendar: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  Shield: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  Heart: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  ),
  DollarSign: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  Bell: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  Lock: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  HelpCircle: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
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
  ChevronDown: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  ),
  Camera: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
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
  Upload: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  ),
  Eye: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  EyeOff: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ),
};

type VerificationStatus = 'Pending' | 'Verified' | 'Rejected';

type FarmerSettingsForm = {
  name: string;
  phone: string;
  email: string;
  farmName: string;
  farmLocation: string;
  produceType: 'Vegetables' | 'Fruits' | 'Grains' | 'Dairy' | 'Mixed';
  harvestFrequency: string;
  availableDays: string[];
  pickupTime: string;
  availableForPickup: boolean;
  verificationStatus: VerificationStatus;
  documentFileName: string;
  preferredNgo: string;
  minimumDonationQuantity: string;
  autoAcceptRequests: boolean;
  paymentMethod: string;
  totalEarnings: string;
  pendingPayments: string;
  notifyNewPickupRequests: boolean;
  notifyDeliveryUpdates: boolean;
  notifyPaymentNotifications: boolean;
  notifyAdminAlerts: boolean;
  notifyWeeklyReport: boolean;
  notifySmsAlerts: boolean;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  lastLogin: string;
  profileImage: string;
  bio: string;
};

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ModalConfig {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  variant: 'danger' | 'warning' | 'info';
}

const parseVerificationStatus = (raw: unknown): VerificationStatus => {
  const value = String(raw || '').trim().toLowerCase();
  if (value === 'verified') return 'Verified';
  if (value === 'rejected') return 'Rejected';
  return 'Pending';
};

const DAY_OPTIONS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const SECTIONS = [
  { id: 'profile', label: 'Profile', icon: Icons.User },
  { id: 'farm', label: 'Farm Details', icon: Icons.Farm },
  { id: 'availability', label: 'Availability', icon: Icons.Calendar },
  { id: 'donation', label: 'Donation Preferences', icon: Icons.Heart },
  { id: 'payments', label: 'Payments', icon: Icons.DollarSign },
  { id: 'notifications', label: 'Notifications', icon: Icons.Bell },
  { id: 'security', label: 'Security', icon: Icons.Lock },
  { id: 'support', label: 'Support', icon: Icons.HelpCircle },
  { id: 'danger', label: 'Danger Zone', icon: Icons.AlertTriangle },
];

// Password strength calculator
const calculatePasswordStrength = (password: string): { score: number; label: string; color: string } => {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;

  if (score <= 1) return { score, label: 'Weak', color: '#ef4444' };
  if (score <= 2) return { score, label: 'Fair', color: '#f59e0b' };
  if (score <= 3) return { score, label: 'Good', color: '#10b981' };
  return { score, label: 'Strong', color: '#059669' };
};

// Toast Component
const ToastContainer: React.FC<{ toasts: Toast[]; removeToast: (id: number) => void }> = ({ toasts, removeToast }) => (
  <div className="fs-toast-container">
    {toasts.map((toast) => (
      <div key={toast.id} className={`fs-toast fs-toast-${toast.type}`}>
        <span className="fs-toast-icon">
          {toast.type === 'success' && <Icons.Check />}
          {toast.type === 'error' && <Icons.X />}
          {toast.type === 'warning' && <Icons.AlertTriangle />}
          {toast.type === 'info' && <Icons.HelpCircle />}
        </span>
        <span className="fs-toast-message">{toast.message}</span>
        <button className="fs-toast-close" onClick={() => removeToast(toast.id)}>
          <Icons.X />
        </button>
      </div>
    ))}
  </div>
);

// Confirmation Modal Component
const ConfirmModal: React.FC<ModalConfig & { onClose: () => void }> = ({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onClose,
  variant,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fs-modal-overlay" onClick={onClose}>
      <div className={`fs-modal fs-modal-${variant}`} onClick={(e) => e.stopPropagation()}>
        <div className="fs-modal-header">
          <div className={`fs-modal-icon fs-modal-icon-${variant}`}>
            {variant === 'danger' && <Icons.AlertTriangle />}
            {variant === 'warning' && <Icons.AlertTriangle />}
            {variant === 'info' && <Icons.HelpCircle />}
          </div>
          <h3 className="fs-modal-title">{title}</h3>
        </div>
        <p className="fs-modal-message">{message}</p>
        <div className="fs-modal-actions">
          <button className="fs-btn fs-btn-secondary" onClick={onClose}>
            {cancelText}
          </button>
          <button className={`fs-btn fs-btn-${variant}`} onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

// Collapsible Section Component
const CollapsibleSection: React.FC<{
  id: string;
  title: string;
  icon: React.FC;
  children: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  badge?: string;
  badgeType?: 'success' | 'warning' | 'error';
}> = ({ id, title, icon: Icon, children, isExpanded, onToggle, badge, badgeType }) => (
  <section id={id} className={`fs-section ${isExpanded ? 'fs-section-expanded' : ''}`}>
    <button className="fs-section-header" onClick={onToggle} type="button">
      <div className="fs-section-header-left">
        <span className="fs-section-icon">
          <Icon />
        </span>
        <h2 className="fs-section-title">{title}</h2>
        {badge && <span className={`fs-badge fs-badge-${badgeType}`}>{badge}</span>}
      </div>
      <span className={`fs-section-chevron ${isExpanded ? 'rotated' : ''}`}>
        <Icons.ChevronDown />
      </span>
    </button>
    <div className={`fs-section-content ${isExpanded ? 'expanded' : ''}`}>
      <div className="fs-section-inner">{children}</div>
    </div>
  </section>
);

// Toggle Switch Component
const ToggleSwitch: React.FC<{
  id: string;
  name: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label: string;
  description?: string;
}> = ({ id, name, checked, onChange, label, description }) => (
  <div className="fs-toggle-wrapper">
    <div className="fs-toggle-text">
      <label htmlFor={id} className="fs-toggle-label">{label}</label>
      {description && <p className="fs-toggle-description">{description}</p>}
    </div>
    <label className="fs-toggle">
      <input
        type="checkbox"
        id={id}
        name={name}
        checked={checked}
        onChange={onChange}
      />
      <span className="fs-toggle-slider"></span>
    </label>
  </div>
);

// Password Input with visibility toggle
const PasswordInput: React.FC<{
  id: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  showStrength?: boolean;
}> = ({ id, name, value, onChange, placeholder, showStrength }) => {
  const [visible, setVisible] = useState(false);
  const strength = showStrength ? calculatePasswordStrength(value) : null;

  return (
    <div className="fs-password-wrapper">
      <div className="fs-password-input-wrapper">
        <input
          type={visible ? 'text' : 'password'}
          id={id}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="fs-input"
        />
        <button
          type="button"
          className="fs-password-toggle"
          onClick={() => setVisible(!visible)}
        >
          {visible ? <Icons.EyeOff /> : <Icons.Eye />}
        </button>
      </div>
      {showStrength && value && (
        <div className="fs-password-strength">
          <div className="fs-password-strength-bar">
            <div
              className="fs-password-strength-fill"
              style={{
                width: `${(strength!.score / 5) * 100}%`,
                backgroundColor: strength!.color,
              }}
            />
          </div>
          <span className="fs-password-strength-label" style={{ color: strength!.color }}>
            {strength!.label}
          </span>
        </div>
      )}
    </div>
  );
};

const FarmerSettings: React.FC = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState<FarmerSettingsForm>({
    name: '',
    phone: '',
    email: '',
    farmName: '',
    farmLocation: '',
    produceType: 'Vegetables',
    harvestFrequency: '',
    availableDays: [],
    pickupTime: '',
    availableForPickup: true,
    verificationStatus: 'Pending',
    documentFileName: '',
    preferredNgo: '',
    minimumDonationQuantity: '',
    autoAcceptRequests: false,
    paymentMethod: '',
    totalEarnings: '₹ 0',
    pendingPayments: '₹ 0',
    notifyNewPickupRequests: true,
    notifyDeliveryUpdates: true,
    notifyPaymentNotifications: true,
    notifyAdminAlerts: false,
    notifyWeeklyReport: true,
    notifySmsAlerts: false,
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    lastLogin: 'Today, 10:00 AM',
    profileImage: '',
    bio: '',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState('profile');
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [modal, setModal] = useState<ModalConfig>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    onConfirm: () => {},
    variant: 'info',
  });
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Toast management
  const addToast = useCallback((message: string, type: ToastType) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleSectionChange = useCallback((sectionId: string) => {
    setActiveSection(sectionId);
    setIsMobileMenuOpen(false);
  }, []);

  // Profile completion calculation
  const profileCompletion = useMemo(() => {
    const fields = [
      form.name,
      form.phone,
      form.email,
      form.farmName,
      form.farmLocation,
      form.produceType,
      form.harvestFrequency,
      form.availableDays.length > 0,
      form.pickupTime,
      form.profileImage,
      form.bio,
    ];
    const completed = fields.filter(Boolean).length;
    return Math.round((completed / fields.length) * 100);
  }, [form]);

  // Load farmer profile
  useEffect(() => {
    const loadFarmerProfile = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (!user?.id) {
          setIsLoading(false);
          return;
        }

        setForm((prev) => ({
          ...prev,
          name: user.name || prev.name,
          email: user.email || prev.email,
        }));

        const response = await fetch(API_ENDPOINTS.farmerProfile(user.id.toString()));
        if (!response.ok) {
          setIsLoading(false);
          return;
        }

        const p = await response.json();
        const fullLocation = [p.farm_address, p.village, p.district, p.state]
          .filter(Boolean)
          .join(', ');

        setForm((prev) => ({
          ...prev,
          name: p.full_name || user.name || prev.name,
          phone: p.phone || prev.phone,
          email: p.email || user.email || prev.email,
          farmName: p.farm_name || localStorage.getItem('farmName') || prev.farmName,
          farmLocation: fullLocation || localStorage.getItem('farmLocation') || prev.farmLocation,
          produceType: p.produce_type || prev.produceType,
          harvestFrequency: p.harvest_frequency || prev.harvestFrequency,
          availableDays: Array.isArray(p.available_days) ? p.available_days : prev.availableDays,
          pickupTime: p.pickup_time || prev.pickupTime,
          availableForPickup:
            typeof p.available_for_pickup === 'boolean' ? p.available_for_pickup : prev.availableForPickup,
          verificationStatus: parseVerificationStatus(p.verification_status || prev.verificationStatus),
          profileImage: p.profile_image || prev.profileImage,
          bio: p.bio || prev.bio,
        }));
      } catch {
        // Keep editable defaults when profile fetch fails
      } finally {
        setIsLoading(false);
      }
    };

    loadFarmerProfile();
  }, []);

  // Dark mode toggle
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const statusColors = useMemo(() => {
    if (form.verificationStatus === 'Verified') return { bg: '#dcfce7', text: '#166534' };
    if (form.verificationStatus === 'Rejected') return { bg: '#fee2e2', text: '#991b1b' };
    return { bg: '#fef3c7', text: '#92400e' };
  }, [form.verificationStatus]);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const input = e.target as HTMLInputElement;
      setForm((prev) => ({ ...prev, [name]: input.checked }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onDayToggle = (day: string) => {
    setForm((prev) => {
      const exists = prev.availableDays.includes(day);
      return {
        ...prev,
        availableDays: exists ? prev.availableDays.filter((d) => d !== day) : [...prev.availableDays, day],
      };
    });
  };

  const onDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    setForm((prev) => ({ ...prev, documentFileName: file ? file.name : '' }));
  };

  const onProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm((prev) => ({ ...prev, profileImage: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Simulated save functions with loading states
  const simulateSave = async (section: string, successMessage: string) => {
    setSavingSection(section);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setSavingSection(null);
    addToast(successMessage, 'success');
  };

  const onProfileSave = () => simulateSave('profile', 'Profile information saved successfully!');
  const onFarmDetailsSave = () => simulateSave('farm', 'Farm details updated successfully!');
  const onAvailabilitySave = () => simulateSave('availability', 'Availability settings saved!');
  const onDocumentUpload = () => {
    if (form.documentFileName) {
      simulateSave('verification', `Document "${form.documentFileName}" uploaded successfully!`);
    } else {
      addToast('Please select a document first', 'warning');
    }
  };
  const onPreferencesSave = () => simulateSave('donation', 'Donation preferences saved!');
  const onPaymentDetailsSave = () => simulateSave('payments', 'Payment details updated!');
  const onWithdraw = () => {
    setModal({
      isOpen: true,
      title: 'Withdraw Earnings',
      message: 'Are you sure you want to withdraw your earnings? This will initiate a transfer to your registered payment method.',
      confirmText: 'Withdraw',
      cancelText: 'Cancel',
      onConfirm: () => {
        setModal((prev) => ({ ...prev, isOpen: false }));
        addToast('Withdrawal request submitted successfully!', 'success');
      },
      variant: 'info',
    });
  };
  const onNotificationsSave = () => simulateSave('notifications', 'Notification preferences saved!');
  
  const onPasswordChange = () => {
    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      addToast('Please fill in all password fields', 'error');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      addToast('New passwords do not match', 'error');
      return;
    }
    if (form.newPassword.length < 8) {
      addToast('Password must be at least 8 characters', 'error');
      return;
    }
    simulateSave('security', 'Password changed successfully!');
    setForm((prev) => ({
      ...prev,
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    }));
  };

  const onContactSupport = () => addToast('Opening support chat...', 'info');
  const onRaiseTicket = () => addToast('Ticket form opened', 'info');

  const onDeactivateAccount = () => {
    setModal({
      isOpen: true,
      title: 'Deactivate Account',
      message: 'Are you sure you want to deactivate your account? You can reactivate it later by logging in.',
      confirmText: 'Deactivate',
      cancelText: 'Cancel',
      onConfirm: () => {
        setModal((prev) => ({ ...prev, isOpen: false }));
        addToast('Account deactivation requested', 'warning');
      },
      variant: 'warning',
    });
  };

  const onDeleteAccount = () => {
    setModal({
      isOpen: true,
      title: 'Delete Account Permanently',
      message: 'This action cannot be undone. All your data, including farm details, donation history, and earnings will be permanently deleted.',
      confirmText: 'Delete Forever',
      cancelText: 'Cancel',
      onConfirm: () => {
        setModal((prev) => ({ ...prev, isOpen: false }));
        addToast('Account deletion requested. You will receive a confirmation email.', 'error');
      },
      variant: 'danger',
    });
  };

  if (isLoading) {
    return (
      <div className="fs-loading">
        <div className="fs-loading-spinner"></div>
        <p>Loading your settings...</p>
      </div>
    );
  }

  return (
    <div className="fs-shell">
      <div className="fs-top-header">
        <button
          type="button"
          className="fs-back-button"
          onClick={() => navigate('/home')}
        >
          ← Back to Dashboard
        </button>
      </div>

      <div className={`fs-page ${isDarkMode ? 'dark' : ''}`}>
        <ToastContainer toasts={toasts} removeToast={removeToast} />
        <ConfirmModal {...modal} onClose={() => setModal((prev) => ({ ...prev, isOpen: false }))} />

      {/* Mobile Menu Toggle */}
      <button
        className="fs-mobile-menu-toggle"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      {/* Sidebar Navigation */}
      <aside className={`fs-sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="fs-sidebar-header">
          <div className="fs-profile-preview">
            <div className="fs-avatar-wrapper">
              {form.profileImage ? (
                <img src={form.profileImage} alt="Profile" className="fs-avatar" />
              ) : (
                <div className="fs-avatar-placeholder">
                  <Icons.User />
                </div>
              )}
            </div>
            <div className="fs-profile-info">
              <h3>{form.name || 'Farmer'}</h3>
              <span
                className="fs-status-badge"
                style={{ backgroundColor: statusColors.bg, color: statusColors.text }}
              >
                {form.verificationStatus}
              </span>
            </div>
          </div>

          <div className="fs-completion-wrapper">
            <div className="fs-completion-header">
              <span>Profile Completion</span>
              <span>{profileCompletion}%</span>
            </div>
            <div className="fs-completion-bar">
              <div
                className="fs-completion-fill"
                style={{ width: `${profileCompletion}%` }}
              ></div>
            </div>
          </div>
        </div>

        <nav className="fs-sidebar-nav">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              className={`fs-nav-item ${activeSection === section.id ? 'active' : ''}`}
              onClick={() => handleSectionChange(section.id)}
            >
              <span className="fs-nav-icon">
                <section.icon />
              </span>
              <span className="fs-nav-label">{section.label}</span>
            </button>
          ))}
        </nav>

        <div className="fs-sidebar-footer">
          <button
            className="fs-theme-toggle"
            onClick={() => setIsDarkMode(!isDarkMode)}
          >
            {isDarkMode ? <Icons.Sun /> : <Icons.Moon />}
            <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="fs-main">
        <header className="fs-header">
          <div>
            <h1>Settings</h1>
            <p>Manage your profile, farm operations, and preferences</p>
          </div>
        </header>

        <div className="fs-content">
          {/* Profile Section */}
          {activeSection === 'profile' && (
          <CollapsibleSection
            id="profile"
            title="Profile Information"
            icon={Icons.User}
            isExpanded={true}
            onToggle={() => {}}
          >
            <div className="fs-profile-section">
              <div className="fs-avatar-upload">
                <div className="fs-avatar-large">
                  {form.profileImage ? (
                    <img src={form.profileImage} alt="Profile" />
                  ) : (
                    <Icons.User />
                  )}
                  <button
                    className="fs-avatar-upload-btn"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Icons.Camera />
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={onProfileImageChange}
                  hidden
                />
                <p className="fs-avatar-hint">Click to upload a new photo</p>
              </div>

              <div className="fs-form-grid">
                <div className="fs-field">
                  <label htmlFor="name">Full Name</label>
                  <input
                    id="name"
                    name="name"
                    value={form.name}
                    onChange={onInputChange}
                    className="fs-input"
                    placeholder="Enter your full name"
                  />
                </div>
                <div className="fs-field">
                  <label htmlFor="phone">Phone Number</label>
                  <input
                    id="phone"
                    name="phone"
                    value={form.phone}
                    onChange={onInputChange}
                    className="fs-input"
                    placeholder="+91 XXXXX XXXXX"
                  />
                </div>
                <div className="fs-field">
                  <label htmlFor="email">Email Address</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={onInputChange}
                    className="fs-input"
                    placeholder="you@example.com"
                  />
                </div>
                <div className="fs-field">
                  <label htmlFor="farmName">Farm Name</label>
                  <input
                    id="farmName"
                    name="farmName"
                    value={form.farmName}
                    onChange={onInputChange}
                    className="fs-input"
                    placeholder="Your farm's name"
                  />
                </div>
                <div className="fs-field fs-field-full">
                  <label htmlFor="bio">Bio</label>
                  <textarea
                    id="bio"
                    name="bio"
                    value={form.bio}
                    onChange={onInputChange}
                    className="fs-input fs-textarea"
                    placeholder="Tell us about yourself and your farming journey..."
                    rows={3}
                  />
                </div>
              </div>

              <div className="fs-section-actions">
                <button
                  className={`fs-btn fs-btn-primary ${savingSection === 'profile' ? 'loading' : ''}`}
                  onClick={onProfileSave}
                  disabled={savingSection === 'profile'}
                >
                  {savingSection === 'profile' ? (
                    <>
                      <span className="fs-btn-spinner"></span>
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </div>
          </CollapsibleSection>
          )}

          {/* Farm Details Section */}
          {activeSection === 'farm' && (
          <CollapsibleSection
            id="farm"
            title="Farm Details"
            icon={Icons.Farm}
            isExpanded={true}
            onToggle={() => {}}
          >
            <div className="fs-form-grid">
              <div className="fs-field fs-field-full">
                <label htmlFor="farmLocation">Farm Location</label>
                <input
                  id="farmLocation"
                  name="farmLocation"
                  value={form.farmLocation}
                  onChange={onInputChange}
                  className="fs-input"
                  placeholder="Village, District, State"
                />
              </div>
              <div className="fs-field">
                <label htmlFor="produceType">Primary Produce Type</label>
                <select
                  id="produceType"
                  name="produceType"
                  value={form.produceType}
                  onChange={onInputChange}
                  className="fs-input fs-select"
                >
                  <option value="Vegetables">🥬 Vegetables</option>
                  <option value="Fruits">🍎 Fruits</option>
                  <option value="Grains">🌾 Grains</option>
                  <option value="Dairy">🥛 Dairy</option>
                  <option value="Mixed">🌿 Mixed</option>
                </select>
              </div>
              <div className="fs-field">
                <label htmlFor="harvestFrequency">Harvest Frequency</label>
                <select
                  id="harvestFrequency"
                  name="harvestFrequency"
                  value={form.harvestFrequency}
                  onChange={onInputChange}
                  className="fs-input fs-select"
                >
                  <option value="">Select frequency</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="seasonal">Seasonal</option>
                </select>
              </div>
            </div>

            <div className="fs-section-actions">
              <button
                className={`fs-btn fs-btn-primary ${savingSection === 'farm' ? 'loading' : ''}`}
                onClick={onFarmDetailsSave}
                disabled={savingSection === 'farm'}
              >
                {savingSection === 'farm' ? (
                  <>
                    <span className="fs-btn-spinner"></span>
                    Updating...
                  </>
                ) : (
                  'Update Farm Details'
                )}
              </button>
            </div>
          </CollapsibleSection>
          )}

          {/* Availability Section */}
          {activeSection === 'availability' && (
          <CollapsibleSection
            id="availability"
            title="Availability & Pickup"
            icon={Icons.Calendar}
            isExpanded={true}
            onToggle={() => {}}
          >
            <div className="fs-field">
              <label>Available Days</label>
              <div className="fs-day-chips">
                {DAY_OPTIONS.map((day) => (
                  <button
                    key={day}
                    type="button"
                    className={`fs-day-chip ${form.availableDays.includes(day) ? 'selected' : ''}`}
                    onClick={() => onDayToggle(day)}
                  >
                    <span className="fs-day-chip-check">
                      <Icons.Check />
                    </span>
                    {day.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>

            <div className="fs-form-grid">
              <div className="fs-field">
                <label htmlFor="pickupTime">Preferred Pickup Time</label>
                <input
                  id="pickupTime"
                  name="pickupTime"
                  type="time"
                  value={form.pickupTime}
                  onChange={onInputChange}
                  className="fs-input"
                />
              </div>
            </div>

            <ToggleSwitch
              id="availableForPickup"
              name="availableForPickup"
              checked={form.availableForPickup}
              onChange={onInputChange}
              label="Available for Pickup"
              description="Enable this if you're currently available to have your produce picked up"
            />

            <div className="fs-section-actions">
              <button
                className={`fs-btn fs-btn-primary ${savingSection === 'availability' ? 'loading' : ''}`}
                onClick={onAvailabilitySave}
                disabled={savingSection === 'availability'}
              >
                {savingSection === 'availability' ? (
                  <>
                    <span className="fs-btn-spinner"></span>
                    Saving...
                  </>
                ) : (
                  'Save Availability'
                )}
              </button>
            </div>
          </CollapsibleSection>
          )}

          {/* Verification Section */}
          {activeSection === 'profile' && (
          <CollapsibleSection
            id="verification"
            title="Verification Status"
            icon={Icons.Shield}
            isExpanded={true}
            onToggle={() => {}}
            badge={form.verificationStatus}
            badgeType={
              form.verificationStatus === 'Verified'
                ? 'success'
                : form.verificationStatus === 'Rejected'
                ? 'error'
                : 'warning'
            }
          >
            <div className="fs-verification-status">
              <div
                className="fs-status-card"
                style={{ backgroundColor: statusColors.bg, borderColor: statusColors.text }}
              >
                <span className="fs-status-icon" style={{ color: statusColors.text }}>
                  {form.verificationStatus === 'Verified' ? <Icons.Check /> : <Icons.Shield />}
                </span>
                <div className="fs-status-text">
                  <h4 style={{ color: statusColors.text }}>
                    {form.verificationStatus === 'Verified'
                      ? 'You are verified!'
                      : form.verificationStatus === 'Rejected'
                      ? 'Verification Rejected'
                      : 'Verification Pending'}
                  </h4>
                  <p>
                    {form.verificationStatus === 'Verified'
                      ? 'Your account has been verified. You can now access all features.'
                      : form.verificationStatus === 'Rejected'
                      ? 'Please upload valid documents and try again.'
                      : 'Your verification is under review. This usually takes 2-3 business days.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="fs-upload-area">
              <div className="fs-upload-zone">
                <input
                  type="file"
                  id="verificationDoc"
                  onChange={onDocumentChange}
                  accept=".pdf,.jpg,.jpeg,.png"
                />
                <div className="fs-upload-content">
                  <Icons.Upload />
                  <p>
                    {form.documentFileName
                      ? `Selected: ${form.documentFileName}`
                      : 'Drag and drop or click to upload'}
                  </p>
                  <span>PDF, JPG, PNG up to 10MB</span>
                </div>
              </div>
            </div>

            <div className="fs-section-actions">
              <button
                className={`fs-btn fs-btn-primary ${savingSection === 'verification' ? 'loading' : ''}`}
                onClick={onDocumentUpload}
                disabled={savingSection === 'verification'}
              >
                {savingSection === 'verification' ? (
                  <>
                    <span className="fs-btn-spinner"></span>
                    Uploading...
                  </>
                ) : (
                  <>
                    <Icons.Upload />
                    Upload Document
                  </>
                )}
              </button>
            </div>
          </CollapsibleSection>
          )}

          {/* Donation Preferences Section */}
          {activeSection === 'donation' && (
          <CollapsibleSection
            id="donation"
            title="Donation Preferences"
            icon={Icons.Heart}
            isExpanded={true}
            onToggle={() => {}}
          >
            <div className="fs-form-grid">
              <div className="fs-field">
                <label htmlFor="preferredNgo">Preferred NGO</label>
                <input
                  id="preferredNgo"
                  name="preferredNgo"
                  value={form.preferredNgo}
                  onChange={onInputChange}
                  className="fs-input"
                  placeholder="Enter NGO name"
                />
              </div>
              <div className="fs-field">
                <label htmlFor="minimumDonationQuantity">Minimum Donation Quantity (kg)</label>
                <input
                  id="minimumDonationQuantity"
                  name="minimumDonationQuantity"
                  type="number"
                  value={form.minimumDonationQuantity}
                  onChange={onInputChange}
                  className="fs-input"
                  placeholder="e.g., 10"
                />
              </div>
            </div>

            <ToggleSwitch
              id="autoAcceptRequests"
              name="autoAcceptRequests"
              checked={form.autoAcceptRequests}
              onChange={onInputChange}
              label="Auto Accept Requests"
              description="Automatically accept donation requests from verified NGOs"
            />

            <div className="fs-section-actions">
              <button
                className={`fs-btn fs-btn-primary ${savingSection === 'donation' ? 'loading' : ''}`}
                onClick={onPreferencesSave}
                disabled={savingSection === 'donation'}
              >
                {savingSection === 'donation' ? (
                  <>
                    <span className="fs-btn-spinner"></span>
                    Saving...
                  </>
                ) : (
                  'Save Preferences'
                )}
              </button>
            </div>
          </CollapsibleSection>
          )}

          {/* Payments Section */}
          {activeSection === 'payments' && (
          <CollapsibleSection
            id="payments"
            title="Payments & Earnings"
            icon={Icons.DollarSign}
            isExpanded={true}
            onToggle={() => {}}
          >
            <div className="fs-metrics-grid">
              <div className="fs-metric-card fs-metric-earnings">
                <div className="fs-metric-icon">
                  <Icons.DollarSign />
                </div>
                <div className="fs-metric-content">
                  <span className="fs-metric-label">Total Earnings</span>
                  <span className="fs-metric-value">{form.totalEarnings}</span>
                </div>
              </div>
              <div className="fs-metric-card fs-metric-pending">
                <div className="fs-metric-icon">
                  <Icons.Calendar />
                </div>
                <div className="fs-metric-content">
                  <span className="fs-metric-label">Pending Payments</span>
                  <span className="fs-metric-value">{form.pendingPayments}</span>
                </div>
              </div>
            </div>

            <div className="fs-field">
              <label htmlFor="paymentMethod">UPI ID or Bank Account</label>
              <input
                id="paymentMethod"
                name="paymentMethod"
                value={form.paymentMethod}
                onChange={onInputChange}
                className="fs-input"
                placeholder="yourname@upi or Account Number"
              />
            </div>

            <div className="fs-section-actions">
              <button
                className={`fs-btn fs-btn-primary ${savingSection === 'payments' ? 'loading' : ''}`}
                onClick={onPaymentDetailsSave}
                disabled={savingSection === 'payments'}
              >
                {savingSection === 'payments' ? (
                  <>
                    <span className="fs-btn-spinner"></span>
                    Updating...
                  </>
                ) : (
                  'Update Payment Details'
                )}
              </button>
              <button className="fs-btn fs-btn-secondary" onClick={onWithdraw}>
                Withdraw Earnings
              </button>
            </div>
          </CollapsibleSection>
          )}

          {/* Notifications Section */}
          {activeSection === 'notifications' && (
          <CollapsibleSection
            id="notifications"
            title="Notifications & Alerts"
            icon={Icons.Bell}
            isExpanded={true}
            onToggle={() => {}}
          >
            <div className="fs-toggle-group">
              <ToggleSwitch
                id="notifyNewPickupRequests"
                name="notifyNewPickupRequests"
                checked={form.notifyNewPickupRequests}
                onChange={onInputChange}
                label="New Pickup Requests"
                description="Get notified when an NGO requests a pickup"
              />
              <ToggleSwitch
                id="notifyDeliveryUpdates"
                name="notifyDeliveryUpdates"
                checked={form.notifyDeliveryUpdates}
                onChange={onInputChange}
                label="Delivery Updates"
                description="Track your donation deliveries in real-time"
              />
              <ToggleSwitch
                id="notifyPaymentNotifications"
                name="notifyPaymentNotifications"
                checked={form.notifyPaymentNotifications}
                onChange={onInputChange}
                label="Payment Notifications"
                description="Receive alerts for payments and earnings"
              />
              <ToggleSwitch
                id="notifyWeeklyReport"
                name="notifyWeeklyReport"
                checked={form.notifyWeeklyReport}
                onChange={onInputChange}
                label="Weekly Summary Report"
                description="Get a weekly summary of your donations and impact"
              />
              <ToggleSwitch
                id="notifySmsAlerts"
                name="notifySmsAlerts"
                checked={form.notifySmsAlerts}
                onChange={onInputChange}
                label="SMS Alerts"
                description="Receive important updates via SMS"
              />
              <ToggleSwitch
                id="notifyAdminAlerts"
                name="notifyAdminAlerts"
                checked={form.notifyAdminAlerts}
                onChange={onInputChange}
                label="Admin Announcements"
                description="Stay updated with platform announcements"
              />
            </div>

            <div className="fs-section-actions">
              <button
                className={`fs-btn fs-btn-primary ${savingSection === 'notifications' ? 'loading' : ''}`}
                onClick={onNotificationsSave}
                disabled={savingSection === 'notifications'}
              >
                {savingSection === 'notifications' ? (
                  <>
                    <span className="fs-btn-spinner"></span>
                    Saving...
                  </>
                ) : (
                  'Save Notification Settings'
                )}
              </button>
            </div>
          </CollapsibleSection>
          )}

          {/* Security Section */}
          {activeSection === 'security' && (
          <CollapsibleSection
            id="security"
            title="Security Settings"
            icon={Icons.Lock}
            isExpanded={true}
            onToggle={() => {}}
          >
            <div className="fs-security-info">
              <p>
                <strong>Last login:</strong> {form.lastLogin}
              </p>
            </div>

            <div className="fs-form-grid">
              <div className="fs-field">
                <label htmlFor="currentPassword">Current Password</label>
                <PasswordInput
                  id="currentPassword"
                  name="currentPassword"
                  value={form.currentPassword}
                  onChange={onInputChange}
                  placeholder="Enter current password"
                />
              </div>
              <div className="fs-field">
                <label htmlFor="newPassword">New Password</label>
                <PasswordInput
                  id="newPassword"
                  name="newPassword"
                  value={form.newPassword}
                  onChange={onInputChange}
                  placeholder="Enter new password"
                  showStrength
                />
              </div>
              <div className="fs-field fs-field-full">
                <label htmlFor="confirmPassword">Confirm New Password</label>
                <PasswordInput
                  id="confirmPassword"
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={onInputChange}
                  placeholder="Confirm new password"
                />
                {form.newPassword && form.confirmPassword && form.newPassword !== form.confirmPassword && (
                  <span className="fs-field-error">Passwords do not match</span>
                )}
              </div>
            </div>

            <div className="fs-section-actions">
              <button
                className={`fs-btn fs-btn-primary ${savingSection === 'security' ? 'loading' : ''}`}
                onClick={onPasswordChange}
                disabled={savingSection === 'security'}
              >
                {savingSection === 'security' ? (
                  <>
                    <span className="fs-btn-spinner"></span>
                    Updating...
                  </>
                ) : (
                  'Change Password'
                )}
              </button>
            </div>
          </CollapsibleSection>
          )}

          {/* Support Section */}
          {activeSection === 'support' && (
          <CollapsibleSection
            id="support"
            title="Support & Help"
            icon={Icons.HelpCircle}
            isExpanded={true}
            onToggle={() => {}}
          >
            <div className="fs-support-cards">
              <div className="fs-support-card" onClick={onContactSupport}>
                <div className="fs-support-icon">💬</div>
                <h4>Live Chat</h4>
                <p>Chat with our support team</p>
              </div>
              <div className="fs-support-card" onClick={onRaiseTicket}>
                <div className="fs-support-icon">🎫</div>
                <h4>Raise a Ticket</h4>
                <p>Submit a support request</p>
              </div>
              <div className="fs-support-card">
                <div className="fs-support-icon">📚</div>
                <h4>Help Center</h4>
                <p>Browse FAQs and guides</p>
              </div>
              <div className="fs-support-card">
                <div className="fs-support-icon">📞</div>
                <h4>Call Us</h4>
                <p>1800-XXX-XXXX</p>
              </div>
            </div>
          </CollapsibleSection>
          )}

          {/* Danger Zone Section */}
          {activeSection === 'danger' && (
          <CollapsibleSection
            id="danger"
            title="Danger Zone"
            icon={Icons.AlertTriangle}
            isExpanded={true}
            onToggle={() => {}}
          >
            <div className="fs-danger-zone">
              <div className="fs-danger-item">
                <div className="fs-danger-info">
                  <h4>Deactivate Account</h4>
                  <p>Temporarily disable your account. You can reactivate it by logging in.</p>
                </div>
                <button className="fs-btn fs-btn-warning" onClick={onDeactivateAccount}>
                  Deactivate
                </button>
              </div>
              <div className="fs-danger-item fs-danger-item-critical">
                <div className="fs-danger-info">
                  <h4>Delete Account</h4>
                  <p>Permanently delete your account and all associated data. This action cannot be undone.</p>
                </div>
                <button className="fs-btn fs-btn-danger" onClick={onDeleteAccount}>
                  Delete Account
                </button>
              </div>
            </div>
          </CollapsibleSection>
          )}
        </div>
      </main>
      </div>
    </div>
  );
};

export default FarmerSettings;