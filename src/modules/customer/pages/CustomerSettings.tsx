import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './CustomerSettings.css';
import { Check, X, Info, AlertTriangle, Camera, Pencil, Eye, EyeOff, ShieldCheck, Shield, Smartphone, Zap, ArrowRight, ArrowLeft, ClipboardList, Trash2, Package, CreditCard, MapPin, Wallet, Gift, Heart, User, Bell, Lock, Settings as SettingsIcon, Link, HelpCircle, Mail, MessageSquare, Truck, Tag, Sparkles, Newspaper, Target, BarChart3, Handshake, Download, Eraser, Palette, Type, Globe, DollarSign, Scale, Play, Image, Key, Fingerprint, Tablet, Laptop, BookOpen, Phone, Star, Lightbulb, Bug, Wheat, FileText, Undo2, ScrollText, LogOut, Twitter, Instagram, Linkedin, Facebook } from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: 'customer';
  avatar?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  createdAt?: string;
}

interface NotificationSettings {
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  orderUpdates: boolean;
  promotionalOffers: boolean;
  priceAlerts: boolean;
  newArrivals: boolean;
  weeklyDigest: boolean;
  deliveryUpdates: boolean;
}

interface PrivacySettings {
  shareDataWithPartners: boolean;
  locationAccess: boolean;
  personalizedRecommendations: boolean;
  marketingEmails: boolean;
  showProfilePublicly: boolean;
  allowAnalytics: boolean;
}

interface AppPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  currency: string;
  measurementUnit: 'kg' | 'lb';
  autoPlayVideos: boolean;
  highQualityImages: boolean;
  reduceMotion: boolean;
  fontSize: 'small' | 'medium' | 'large';
}

interface SecuritySettings {
  twoFactorEnabled: boolean;
  biometricEnabled: boolean;
  loginAlerts: boolean;
  trustedDevices: TrustedDevice[];
  loginHistory: LoginActivity[];
}

interface TrustedDevice {
  id: string;
  name: string;
  type: 'mobile' | 'desktop' | 'tablet';
  lastActive: string;
  location: string;
  isCurrent: boolean;
}

interface LoginActivity {
  id: string;
  device: string;
  location: string;
  ip: string;
  time: string;
  status: 'success' | 'failed';
}

interface ConnectedAccount {
  id: string;
  provider: 'google' | 'facebook' | 'apple';
  email: string;
  connectedAt: string;
}

// ============================================
// CONSTANTS
// ============================================

const LANGUAGES = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
  { code: 'mr', name: 'Marathi', native: 'मराठी' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' }
];

const CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' }
];

const FAQ_ITEMS = [
  {
    question: 'How do I track my order?',
    answer: 'You can track your order from the "My Orders" section. Click on any order to see real-time tracking information including delivery partner details.'
  },
  {
    question: 'What is the return policy?',
    answer: 'We offer a 24-hour return policy for fresh produce. If you\'re not satisfied with the quality, you can request a refund or replacement within 24 hours of delivery.'
  },
  {
    question: 'How do I add money to my wallet?',
    answer: 'Go to Payments > Wallet and click "Add Money". You can add money using any saved payment method or add a new one.'
  },
  {
    question: 'Can I schedule my deliveries?',
    answer: 'Yes! During checkout, you can select your preferred delivery slot. We offer same-day and next-day delivery options.'
  },
  {
    question: 'How do I contact a farmer directly?',
    answer: 'You can message farmers directly from their profile page or from your order details after placing an order.'
  }
];

// ============================================
// UTILITY FUNCTIONS
// ============================================

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

const getRelativeTime = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateString);
};

// Toast notification
const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
  const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };

  const toast = document.createElement('div');
  toast.className = `cs-toast cs-toast-${type}`;
  toast.innerHTML = `
    <span class="cs-toast-icon">${icons[type]}</span>
    <span class="cs-toast-message">${message}</span>
  `;

  const container = document.getElementById('cs-toast-container') || (() => {
    const div = document.createElement('div');
    div.id = 'cs-toast-container';
    document.body.appendChild(div);
    return div;
  })();

  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
};

// ============================================
// CUSTOM HOOKS
// ============================================

const useLocalStorage = <T,>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = (value: T | ((prev: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  };

  return [storedValue, setValue];
};

// ============================================
// DEFAULT DATA (empty defaults - data comes from API)
// ============================================

const getDefaultSecurityData = (): SecuritySettings => ({
  twoFactorEnabled: false,
  biometricEnabled: false,
  loginAlerts: false,
  trustedDevices: [],
  loginHistory: []
});

const getDefaultConnectedAccounts = (): ConnectedAccount[] => [];

// ============================================
// SUB-COMPONENTS
// ============================================

const ToggleSwitch: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
}> = ({ checked, onChange, disabled = false, size = 'medium' }) => (
  <button
    className={`cs-toggle ${size} ${checked ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
    onClick={() => !disabled && onChange(!checked)}
    disabled={disabled}
    type="button"
    role="switch"
    aria-checked={checked}
  >
    <span className="cs-toggle-thumb" />
  </button>
);

const SettingItem: React.FC<{
  icon: React.ReactNode;
  title: string;
  description?: string;
  children?: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
  badge?: string;
}> = ({ icon, title, description, children, onClick, danger, badge }) => (
  <div
    className={`cs-setting-item ${onClick ? 'clickable' : ''} ${danger ? 'danger' : ''}`}
    onClick={onClick}
  >
    <div className="cs-setting-icon">{icon}</div>
    <div className="cs-setting-content">
      <div className="cs-setting-title">
        {title}
        {badge && <span className="cs-setting-badge">{badge}</span>}
      </div>
      {description && <div className="cs-setting-desc">{description}</div>}
    </div>
    {children && <div className="cs-setting-action">{children}</div>}
    {onClick && !children && <span className="cs-setting-arrow">›</span>}
  </div>
);

const SectionHeader: React.FC<{
  icon: React.ReactNode;
  title: string;
  description?: string;
}> = ({ icon, title, description }) => (
  <div className="cs-section-header">
    <span className="cs-section-icon">{icon}</span>
    <div className="cs-section-info">
      <h2 className="cs-section-title">{title}</h2>
      {description && <p className="cs-section-desc">{description}</p>}
    </div>
  </div>
);

// Profile Section
const ProfileSection: React.FC<{
  user: User;
  onUpdateProfile: (updates: Partial<User>) => void;
}> = ({ user, onUpdateProfile }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  }>({
    name: user.name,
    email: user.email,
    phone: user.phone,
    dateOfBirth: user.dateOfBirth || '',
    gender: user.gender || 'prefer_not_to_say'
  });
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    setIsSaving(true);
    onUpdateProfile(formData);
    setIsEditing(false);
    setIsSaving(false);
    showToast('Profile updated successfully!', 'success');
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdateProfile({ avatar: reader.result as string });
        showToast('Profile photo updated!', 'success');
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="cs-profile-section">
      <div className="cs-profile-header">
        <div className="cs-avatar-wrapper">
          <div className="cs-avatar-large">
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} />
            ) : (
              <span className="cs-avatar-initials">{user.name.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <button className="cs-avatar-edit" onClick={() => fileInputRef.current?.click()}><Camera size={14} /></button>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
        </div>
        <div className="cs-profile-info">
          <h2 className="cs-profile-name">{user.name}</h2>
          <p className="cs-profile-email">{user.email}</p>
          <p className="cs-profile-member">Member since {formatDate(user.createdAt || new Date().toISOString())}</p>
        </div>
        <button className="cs-edit-btn" onClick={() => setIsEditing(!isEditing)}>
          {isEditing ? 'Cancel' : <><Pencil size={12} /> Edit</>}
        </button>
      </div>

      {isEditing && (
        <div className="cs-profile-form">
          <div className="cs-form-row">
            <div className="cs-form-group">
              <label>Full Name</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} placeholder="Enter your name" />
            </div>
            <div className="cs-form-group">
              <label>Phone Number</label>
              <input type="tel" value={formData.phone} onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))} placeholder="+91 XXXXX XXXXX" />
            </div>
          </div>
          <div className="cs-form-group">
            <label>Email Address</label>
            <input type="email" value={formData.email} onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))} placeholder="your@email.com" />
          </div>
          <div className="cs-form-row">
            <div className="cs-form-group">
              <label>Date of Birth</label>
              <input type="date" value={formData.dateOfBirth} onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))} />
            </div>
            <div className="cs-form-group">
              <label>Gender</label>
              <select value={formData.gender} onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value as 'male' | 'female' | 'other' | 'prefer_not_to_say' }))}>
                <option value="prefer_not_to_say">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div className="cs-form-actions">
            <button className="cs-btn-cancel" onClick={() => setIsEditing(false)}>Cancel</button>
            <button className="cs-btn-save" onClick={handleSave} disabled={isSaving}>
              {isSaving ? <><span className="cs-spinner" /> Saving...</> : <><Check size={14} /> Save Changes</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Change Password Modal
const ChangePasswordModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setErrors({});
    }
  }, [isOpen]);

  useEffect(() => {
    const password = formData.newPassword;
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    setPasswordStrength(strength);
  }, [formData.newPassword]);

  const getStrengthLabel = () => {
    if (passwordStrength === 0) return '';
    if (passwordStrength <= 2) return 'Weak';
    if (passwordStrength <= 3) return 'Medium';
    if (passwordStrength <= 4) return 'Strong';
    return 'Very Strong';
  };

  const getStrengthColor = () => {
    if (passwordStrength <= 2) return '#ef4444';
    if (passwordStrength <= 3) return '#f59e0b';
    if (passwordStrength <= 4) return '#22c55e';
    return '#10b981';
  };

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.currentPassword) newErrors.currentPassword = 'Current password is required';
    if (!formData.newPassword) newErrors.newPassword = 'New password is required';
    else if (formData.newPassword.length < 8) newErrors.newPassword = 'Password must be at least 8 characters';
    if (formData.newPassword !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    setIsSubmitting(false);
    onClose();
    showToast('Password changed successfully!', 'success');
  };

  if (!isOpen) return null;

  return (
    <div className="cs-modal-overlay" onClick={onClose}>
      <div className="cs-modal" onClick={e => e.stopPropagation()}>
        <div className="cs-modal-header">
          <h2>Change Password</h2>
          <button className="cs-modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="cs-modal-body">
          <div className={`cs-form-group ${errors.currentPassword ? 'error' : ''}`}>
            <label>Current Password</label>
            <div className="cs-password-input">
              <input type={showPasswords.current ? 'text' : 'password'} value={formData.currentPassword} onChange={(e) => setFormData(prev => ({ ...prev, currentPassword: e.target.value }))} placeholder="Enter current password" />
              <button type="button" className="cs-toggle-pw" onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}>{showPasswords.current ? <EyeOff size={16} /> : <Eye size={16} />}</button>
            </div>
            {errors.currentPassword && <span className="cs-error-text">{errors.currentPassword}</span>}
          </div>
          <div className={`cs-form-group ${errors.newPassword ? 'error' : ''}`}>
            <label>New Password</label>
            <div className="cs-password-input">
              <input type={showPasswords.new ? 'text' : 'password'} value={formData.newPassword} onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))} placeholder="Enter new password" />
              <button type="button" className="cs-toggle-pw" onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}>{showPasswords.new ? <EyeOff size={16} /> : <Eye size={16} />}</button>
            </div>
            {formData.newPassword && (
              <div className="cs-pw-strength">
                <div className="cs-strength-bar"><div className="cs-strength-fill" style={{ width: `${(passwordStrength / 5) * 100}%`, backgroundColor: getStrengthColor() }} /></div>
                <span className="cs-strength-label" style={{ color: getStrengthColor() }}>{getStrengthLabel()}</span>
              </div>
            )}
            {errors.newPassword && <span className="cs-error-text">{errors.newPassword}</span>}
          </div>
          <div className={`cs-form-group ${errors.confirmPassword ? 'error' : ''}`}>
            <label>Confirm New Password</label>
            <div className="cs-password-input">
              <input type={showPasswords.confirm ? 'text' : 'password'} value={formData.confirmPassword} onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))} placeholder="Confirm new password" />
              <button type="button" className="cs-toggle-pw" onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}>{showPasswords.confirm ? <EyeOff size={16} /> : <Eye size={16} />}</button>
            </div>
            {errors.confirmPassword && <span className="cs-error-text">{errors.confirmPassword}</span>}
          </div>
          <div className="cs-pw-requirements">
            <h4>Password Requirements:</h4>
            <ul>
              <li className={formData.newPassword.length >= 8 ? 'met' : ''}>At least 8 characters</li>
              <li className={/[a-z]/.test(formData.newPassword) ? 'met' : ''}>One lowercase letter</li>
              <li className={/[A-Z]/.test(formData.newPassword) ? 'met' : ''}>One uppercase letter</li>
              <li className={/[0-9]/.test(formData.newPassword) ? 'met' : ''}>One number</li>
              <li className={/[^a-zA-Z0-9]/.test(formData.newPassword) ? 'met' : ''}>One special character</li>
            </ul>
          </div>
        </div>
        <div className="cs-modal-footer">
          <button className="cs-btn-secondary" onClick={onClose}>Cancel</button>
          <button className="cs-btn-primary" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? <><span className="cs-spinner" /> Updating...</> : 'Update Password'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Two-Factor Auth Modal
const TwoFactorModal: React.FC<{ isOpen: boolean; onClose: () => void; onEnable: () => void }> = ({ isOpen, onClose, onEnable }) => {
  const [step, setStep] = useState<'intro' | 'qr' | 'verify'>('intro');
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const codeInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (isOpen) { setStep('intro'); setVerificationCode(''); }
  }, [isOpen]);

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    const newCode = verificationCode.split('');
    newCode[index] = value;
    setVerificationCode(newCode.join(''));
    if (value && index < 5) codeInputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) codeInputRefs.current[index - 1]?.focus();
  };

  const handleVerify = async () => {
    if (verificationCode.length !== 6) { showToast('Please enter 6-digit code', 'error'); return; }
    setIsVerifying(true);
    setIsVerifying(false);
    onEnable();
    onClose();
    showToast('Two-factor authentication enabled!', 'success');
  };

  if (!isOpen) return null;

  return (
    <div className="cs-modal-overlay" onClick={onClose}>
      <div className="cs-modal cs-tfa-modal" onClick={e => e.stopPropagation()}>
        <div className="cs-modal-header">
          <h2>Two-Factor Authentication</h2>
          <button className="cs-modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="cs-modal-body cs-tfa-body">
          {step === 'intro' && (
            <div className="cs-tfa-intro">
              <div className="cs-tfa-icon"><ShieldCheck size={32} /></div>
              <h3>Add an extra layer of security</h3>
              <p>Two-factor authentication adds an additional layer of security to your account by requiring a verification code in addition to your password.</p>
              <div className="cs-tfa-benefits">
                <div className="cs-benefit"><span><Shield size={16} /></span><span>Protect against unauthorized access</span></div>
                <div className="cs-benefit"><span><Smartphone size={16} /></span><span>Use any authenticator app</span></div>
                <div className="cs-benefit"><span><Zap size={16} /></span><span>Quick and easy setup</span></div>
              </div>
              <button className="cs-btn-primary" onClick={() => setStep('qr')}>Get Started <ArrowRight size={14} /></button>
            </div>
          )}
          {step === 'qr' && (
            <div className="cs-tfa-qr">
              <h3>Scan QR Code</h3>
              <p>Scan this QR code with your authenticator app</p>
              <div className="cs-qr-placeholder">
                <div className="cs-qr-code">
                  <div className="cs-qr-pattern">
                    {Array(25).fill(0).map((_, i) => (
                      <div key={i} className={`cs-qr-cell ${Math.random() > 0.5 ? 'filled' : ''}`} />
                    ))}
                  </div>
                </div>
              </div>
              <div className="cs-manual-code">
                <p>Or enter this code manually:</p>
                <code>ABCD-EFGH-IJKL-MNOP</code>
                <button className="cs-copy-code" onClick={() => { navigator.clipboard.writeText('ABCDEFGHIJKLMNOP'); showToast('Code copied!', 'success'); }}><ClipboardList size={14} /> Copy</button>
              </div>
              <button className="cs-btn-primary" onClick={() => setStep('verify')}>I've scanned the code <ArrowRight size={14} /></button>
            </div>
          )}
          {step === 'verify' && (
            <div className="cs-tfa-verify">
              <h3>Verify Setup</h3>
              <p>Enter the 6-digit code from your authenticator app</p>
              <div className="cs-code-inputs">
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <input
                    key={index}
                    ref={(el) => { if (el) codeInputRefs.current[index] = el; }}
                    type="text"
                    maxLength={1}
                    value={verificationCode[index] || ''}
                    onChange={(e) => handleCodeChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="cs-code-input"
                  />
                ))}
              </div>
              <button className="cs-btn-primary" onClick={handleVerify} disabled={isVerifying}>
                {isVerifying ? <><span className="cs-spinner" /> Verifying...</> : 'Verify & Enable'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Delete Account Modal
const DeleteAccountModal: React.FC<{ isOpen: boolean; onClose: () => void; onDelete: () => void }> = ({ isOpen, onClose, onDelete }) => {
  const [confirmText, setConfirmText] = useState('');
  const [reason, setReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const reasons = ['I no longer need this account', 'I found a better alternative', 'Privacy concerns', 'Too many notifications', 'Other'];

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') { showToast('Please type DELETE to confirm', 'error'); return; }
    setIsDeleting(true);
    setIsDeleting(false);
    onDelete();
  };

  if (!isOpen) return null;

  return (
    <div className="cs-modal-overlay" onClick={onClose}>
      <div className="cs-modal cs-delete-modal" onClick={e => e.stopPropagation()}>
        <div className="cs-modal-header danger">
          <h2><AlertTriangle size={18} /> Delete Account</h2>
          <button className="cs-modal-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="cs-modal-body">
          <div className="cs-delete-warning">
            <div className="cs-warning-icon"><Trash2 size={32} /></div>
            <h3>Are you absolutely sure?</h3>
            <p>This action <strong>cannot be undone</strong>. This will permanently delete your account and remove all your data from our servers.</p>
          </div>
          <div className="cs-delete-consequences">
            <h4>You will lose access to:</h4>
            <ul>
              <li><Package size={14} /> All your order history</li>
              <li><CreditCard size={14} /> Saved payment methods</li>
              <li><MapPin size={14} /> Saved addresses</li>
              <li><Wallet size={14} /> Wallet balance (₹1,250)</li>
              <li><Gift size={14} /> Reward points & cashback</li>
              <li><Heart size={14} /> Wishlist items</li>
            </ul>
          </div>
          <div className="cs-form-group">
            <label>Why are you leaving?</label>
            <select value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="">Select a reason</option>
              {reasons.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="cs-form-group">
            <label>Type <strong>DELETE</strong> to confirm:</label>
            <input type="text" value={confirmText} onChange={(e) => setConfirmText(e.target.value.toUpperCase())} placeholder="DELETE" className="cs-confirm-input" />
          </div>
        </div>
        <div className="cs-modal-footer">
          <button className="cs-btn-secondary" onClick={onClose}>Cancel</button>
          <button className="cs-btn-danger" onClick={handleDelete} disabled={isDeleting || confirmText !== 'DELETE'}>
            {isDeleting ? <><span className="cs-spinner" /> Deleting...</> : 'Delete My Account'}
          </button>
        </div>
      </div>
    </div>
  );
};

// FAQ Accordion
const FAQSection: React.FC = () => {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  return (
    <div className="cs-faq-section">
      {FAQ_ITEMS.map((item, index) => (
        <div key={index} className={`cs-faq-item ${expandedId === index ? 'expanded' : ''}`}>
          <button className="cs-faq-question" onClick={() => setExpandedId(expandedId === index ? null : index)}>
            <span>{item.question}</span>
            <span className="cs-faq-toggle">{expandedId === index ? '−' : '+'}</span>
          </button>
          <div className="cs-faq-answer"><p>{item.answer}</p></div>
        </div>
      ))}
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

const CustomerSettings: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [activeSection, setActiveSection] = useState('profile');
  const [isLoading, setIsLoading] = useState(true);

  const [notifications, setNotifications] = useLocalStorage<NotificationSettings>('customer-notifications', {
    pushEnabled: true, emailEnabled: true, smsEnabled: false, orderUpdates: true,
    promotionalOffers: true, priceAlerts: false, newArrivals: true, weeklyDigest: false, deliveryUpdates: true
  });

  const [privacy, setPrivacy] = useLocalStorage<PrivacySettings>('customer-privacy', {
    shareDataWithPartners: false, locationAccess: true, personalizedRecommendations: true,
    marketingEmails: true, showProfilePublicly: false, allowAnalytics: true
  });

  const [preferences, setPreferences] = useLocalStorage<AppPreferences>('customer-preferences', {
    theme: 'system', language: 'en', currency: 'INR', measurementUnit: 'kg',
    autoPlayVideos: true, highQualityImages: true, reduceMotion: false, fontSize: 'medium'
  });

  const [security] = useState<SecuritySettings>(getDefaultSecurityData());
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>(getDefaultConnectedAccounts());

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showTFAModal, setShowTFAModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        if (parsedUser && parsedUser.role === 'customer') { setUser(parsedUser); }
        else { navigate('/auth'); return; }
      } catch { navigate('/auth'); return; }
    } else { navigate('/auth'); return; }
    setTimeout(() => setIsLoading(false), 500);
  }, [navigate]);

  useEffect(() => {
    const root = document.documentElement;
    if (preferences.theme === 'dark') root.classList.add('dark-theme');
    else if (preferences.theme === 'light') root.classList.remove('dark-theme');
    else {
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) root.classList.add('dark-theme');
      else root.classList.remove('dark-theme');
    }
  }, [preferences.theme]);

  const handleUpdateProfile = (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  const handleLogout = () => { localStorage.removeItem('user'); showToast('Logged out successfully', 'info'); navigate('/'); };
  const handleDeleteAccount = () => { localStorage.clear(); showToast('Account deleted', 'info'); navigate('/'); };
  const handleDisconnectAccount = (accountId: string) => { setConnectedAccounts(prev => prev.filter(a => a.id !== accountId)); showToast('Account disconnected', 'success'); };
  const handleRevokeDevice = (_deviceId: string) => { showToast('Device removed from trusted devices', 'success'); };

  const sections = [
    { id: 'profile', label: 'Profile', icon: <User size={16} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={16} /> },
    { id: 'privacy', label: 'Privacy', icon: <Lock size={16} /> },
    { id: 'preferences', label: 'Preferences', icon: <SettingsIcon size={16} /> },
    { id: 'security', label: 'Security', icon: <Shield size={16} /> },
    { id: 'connected', label: 'Connected Accounts', icon: <Link size={16} /> },
    { id: 'help', label: 'Help & Support', icon: <HelpCircle size={16} /> },
    { id: 'about', label: 'About', icon: <Info size={16} /> }
  ];

  if (!user) return (
    <div className="cs-loading"><div className="cs-loader"><span className="cs-loader-icon"><SettingsIcon size={20} /></span><p>Loading settings...</p></div></div>
  );

  return (
    <div className="cs-page">
      <div className="cs-bg"><div className="cs-orb cs-orb-1" /><div className="cs-orb cs-orb-2" /></div>

      {/* Header */}
      <header className="cs-header">
        <div className="cs-header-content">
          <button className="cs-back-btn" onClick={() => navigate('/home')}><ArrowLeft size={14} /> <span className="cs-back-text">Back</span></button>
          <div className="cs-header-title"><h1><span><SettingsIcon size={20} /></span> Settings</h1></div>
          <button className="cs-logout-btn" onClick={handleLogout}><LogOut size={14} /> Logout</button>
        </div>
      </header>

      <div className="cs-layout">
        {/* Sidebar */}
        <aside className="cs-sidebar">
          <nav className="cs-nav">
            {sections.map(section => (
              <button key={section.id} className={`cs-nav-item ${activeSection === section.id ? 'active' : ''}`} onClick={() => setActiveSection(section.id)}>
                <span className="cs-nav-icon">{section.icon}</span>
                <span className="cs-nav-label">{section.label}</span>
              </button>
            ))}
          </nav>
          <div className="cs-sidebar-footer">
            <button className="cs-delete-btn" onClick={() => setShowDeleteModal(true)}>
              <span><Trash2 size={14} /></span><span>Delete Account</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="cs-main">
          {isLoading ? (
            <div className="cs-skeleton-container">
              {[1, 2, 3].map(i => (
                <div key={i} className="cs-skeleton-section">
                  <div className="cs-skeleton-header" />
                  <div className="cs-skeleton-items"><div className="cs-skeleton-item" /><div className="cs-skeleton-item" /><div className="cs-skeleton-item" /></div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Profile */}
              {activeSection === 'profile' && (
                <div className="cs-section"><ProfileSection user={user} onUpdateProfile={handleUpdateProfile} /></div>
              )}

              {/* Notifications */}
              {activeSection === 'notifications' && (
                <div className="cs-section">
                  <SectionHeader icon={<Bell size={18} />} title="Notification Preferences" description="Control how and when you receive notifications" />
                  <div className="cs-card">
                    <h3 className="cs-card-title">Notification Channels</h3>
                    <div className="cs-settings-list">
                      <SettingItem icon={<Smartphone size={16} />} title="Push Notifications" description="Receive notifications on your device">
                        <ToggleSwitch checked={notifications.pushEnabled} onChange={(checked) => setNotifications(prev => ({ ...prev, pushEnabled: checked }))} />
                      </SettingItem>
                      <SettingItem icon={<Mail size={16} />} title="Email Notifications" description="Receive updates via email">
                        <ToggleSwitch checked={notifications.emailEnabled} onChange={(checked) => setNotifications(prev => ({ ...prev, emailEnabled: checked }))} />
                      </SettingItem>
                      <SettingItem icon={<MessageSquare size={16} />} title="SMS Notifications" description="Receive updates via SMS">
                        <ToggleSwitch checked={notifications.smsEnabled} onChange={(checked) => setNotifications(prev => ({ ...prev, smsEnabled: checked }))} />
                      </SettingItem>
                    </div>
                  </div>
                  <div className="cs-card">
                    <h3 className="cs-card-title">Notification Types</h3>
                    <div className="cs-settings-list">
                      <SettingItem icon={<Package size={16} />} title="Order Updates" description="Status changes, delivery updates">
                        <ToggleSwitch checked={notifications.orderUpdates} onChange={(checked) => setNotifications(prev => ({ ...prev, orderUpdates: checked }))} />
                      </SettingItem>
                      <SettingItem icon={<Truck size={16} />} title="Delivery Updates" description="Real-time delivery tracking">
                        <ToggleSwitch checked={notifications.deliveryUpdates} onChange={(checked) => setNotifications(prev => ({ ...prev, deliveryUpdates: checked }))} />
                      </SettingItem>
                      <SettingItem icon={<Tag size={16} />} title="Promotional Offers" description="Discounts, deals, and special offers">
                        <ToggleSwitch checked={notifications.promotionalOffers} onChange={(checked) => setNotifications(prev => ({ ...prev, promotionalOffers: checked }))} />
                      </SettingItem>
                      <SettingItem icon={<Wallet size={16} />} title="Price Alerts" description="Price drops on wishlist items">
                        <ToggleSwitch checked={notifications.priceAlerts} onChange={(checked) => setNotifications(prev => ({ ...prev, priceAlerts: checked }))} />
                      </SettingItem>
                      <SettingItem icon={<Sparkles size={16} />} title="New Arrivals" description="New products from favorite farmers">
                        <ToggleSwitch checked={notifications.newArrivals} onChange={(checked) => setNotifications(prev => ({ ...prev, newArrivals: checked }))} />
                      </SettingItem>
                      <SettingItem icon={<Newspaper size={16} />} title="Weekly Digest" description="Summary of deals and recommendations">
                        <ToggleSwitch checked={notifications.weeklyDigest} onChange={(checked) => setNotifications(prev => ({ ...prev, weeklyDigest: checked }))} />
                      </SettingItem>
                    </div>
                  </div>
                </div>
              )}

              {/* Privacy */}
              {activeSection === 'privacy' && (
                <div className="cs-section">
                  <SectionHeader icon={<Lock size={18} />} title="Privacy Settings" description="Manage your data and privacy preferences" />
                  <div className="cs-card">
                    <h3 className="cs-card-title">Data & Personalization</h3>
                    <div className="cs-settings-list">
                      <SettingItem icon={<Target size={16} />} title="Personalized Recommendations" description="Get product suggestions based on your activity">
                        <ToggleSwitch checked={privacy.personalizedRecommendations} onChange={(checked) => setPrivacy(prev => ({ ...prev, personalizedRecommendations: checked }))} />
                      </SettingItem>
                      <SettingItem icon={<MapPin size={16} />} title="Location Access" description="Use location for nearby farmers and delivery">
                        <ToggleSwitch checked={privacy.locationAccess} onChange={(checked) => setPrivacy(prev => ({ ...prev, locationAccess: checked }))} />
                      </SettingItem>
                      <SettingItem icon={<BarChart3 size={16} />} title="Analytics" description="Help us improve by sharing usage data">
                        <ToggleSwitch checked={privacy.allowAnalytics} onChange={(checked) => setPrivacy(prev => ({ ...prev, allowAnalytics: checked }))} />
                      </SettingItem>
                    </div>
                  </div>
                  <div className="cs-card">
                    <h3 className="cs-card-title">Marketing & Communications</h3>
                    <div className="cs-settings-list">
                      <SettingItem icon={<Mail size={16} />} title="Marketing Emails" description="Receive promotional emails and newsletters">
                        <ToggleSwitch checked={privacy.marketingEmails} onChange={(checked) => setPrivacy(prev => ({ ...prev, marketingEmails: checked }))} />
                      </SettingItem>
                      <SettingItem icon={<Handshake size={16} />} title="Share Data with Partners" description="Allow sharing data with trusted partners">
                        <ToggleSwitch checked={privacy.shareDataWithPartners} onChange={(checked) => setPrivacy(prev => ({ ...prev, shareDataWithPartners: checked }))} />
                      </SettingItem>
                    </div>
                  </div>
                  <div className="cs-card">
                    <h3 className="cs-card-title">Data Management</h3>
                    <div className="cs-settings-list">
                      <SettingItem icon={<Download size={16} />} title="Download My Data" description="Get a copy of all your data" onClick={() => showToast('Preparing your data download...', 'info')} />
                      <SettingItem icon={<Eraser size={16} />} title="Clear Search History" description="Remove all your search history" onClick={() => { localStorage.removeItem('searchHistory'); showToast('Search history cleared', 'success'); }} />
                      <SettingItem icon={<Trash2 size={16} />} title="Clear Browsing Data" description="Remove recently viewed items and cache" onClick={() => { localStorage.removeItem('browsingData'); showToast('Browsing data cleared', 'success'); }} />
                    </div>
                  </div>
                </div>
              )}

              {/* Preferences */}
              {activeSection === 'preferences' && (
                <div className="cs-section">
                  <SectionHeader icon={<SettingsIcon size={18} />} title="App Preferences" description="Customize your app experience" />
                  <div className="cs-card">
                    <h3 className="cs-card-title">Appearance</h3>
                    <div className="cs-settings-list">
                      <SettingItem icon={<Palette size={16} />} title="Theme" description="Choose your preferred theme">
                        <select className="cs-select" value={preferences.theme} onChange={(e) => setPreferences(prev => ({ ...prev, theme: e.target.value as AppPreferences['theme'] }))}>
                          <option value="system">System</option>
                          <option value="light">Light</option>
                          <option value="dark">Dark</option>
                        </select>
                      </SettingItem>
                      <SettingItem icon={<Type size={16} />} title="Font Size" description="Adjust text size for readability">
                        <select className="cs-select" value={preferences.fontSize} onChange={(e) => setPreferences(prev => ({ ...prev, fontSize: e.target.value as AppPreferences['fontSize'] }))}>
                          <option value="small">Small</option>
                          <option value="medium">Medium</option>
                          <option value="large">Large</option>
                        </select>
                      </SettingItem>
                      <SettingItem icon={<Sparkles size={16} />} title="Reduce Motion" description="Minimize animations throughout the app">
                        <ToggleSwitch checked={preferences.reduceMotion} onChange={(checked) => setPreferences(prev => ({ ...prev, reduceMotion: checked }))} />
                      </SettingItem>
                    </div>
                  </div>
                  <div className="cs-card">
                    <h3 className="cs-card-title">Regional Settings</h3>
                    <div className="cs-settings-list">
                      <SettingItem icon={<Globe size={16} />} title="Language" description="Choose your preferred language">
                        <select className="cs-select" value={preferences.language} onChange={(e) => setPreferences(prev => ({ ...prev, language: e.target.value }))}>
                          {LANGUAGES.map(lang => <option key={lang.code} value={lang.code}>{lang.name} ({lang.native})</option>)}
                        </select>
                      </SettingItem>
                      <SettingItem icon={<DollarSign size={16} />} title="Currency" description="Set your preferred currency">
                        <select className="cs-select" value={preferences.currency} onChange={(e) => setPreferences(prev => ({ ...prev, currency: e.target.value }))}>
                          {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.symbol} {c.name}</option>)}
                        </select>
                      </SettingItem>
                      <SettingItem icon={<Scale size={16} />} title="Measurement Unit" description="Choose weight measurement units">
                        <select className="cs-select" value={preferences.measurementUnit} onChange={(e) => setPreferences(prev => ({ ...prev, measurementUnit: e.target.value as 'kg' | 'lb' }))}>
                          <option value="kg">Kilograms (kg)</option>
                          <option value="lb">Pounds (lb)</option>
                        </select>
                      </SettingItem>
                    </div>
                  </div>
                  <div className="cs-card">
                    <h3 className="cs-card-title">Media & Data</h3>
                    <div className="cs-settings-list">
                      <SettingItem icon={<Play size={16} />} title="Auto-play Videos" description="Automatically play videos in feed">
                        <ToggleSwitch checked={preferences.autoPlayVideos} onChange={(checked) => setPreferences(prev => ({ ...prev, autoPlayVideos: checked }))} />
                      </SettingItem>
                      <SettingItem icon={<Image size={16} />} title="High Quality Images" description="Load high-resolution images (uses more data)">
                        <ToggleSwitch checked={preferences.highQualityImages} onChange={(checked) => setPreferences(prev => ({ ...prev, highQualityImages: checked }))} />
                      </SettingItem>
                    </div>
                  </div>
                </div>
              )}

              {/* Security */}
              {activeSection === 'security' && (
                <div className="cs-section">
                  <SectionHeader icon={<Shield size={18} />} title="Security Settings" description="Manage your account security and access" />
                  <div className="cs-card">
                    <h3 className="cs-card-title">Authentication</h3>
                    <div className="cs-settings-list">
                      <SettingItem icon={<Key size={16} />} title="Change Password" description="Update your account password" onClick={() => setShowPasswordModal(true)} />
                      <SettingItem icon={<ShieldCheck size={16} />} title="Two-Factor Authentication" description={security.twoFactorEnabled ? 'Enabled - Your account is secure' : 'Add extra security to your account'} badge={security.twoFactorEnabled ? 'Enabled' : undefined}>
                        <ToggleSwitch checked={security.twoFactorEnabled} onChange={() => security.twoFactorEnabled ? showToast('Please disable 2FA from your authenticator app', 'warning') : setShowTFAModal(true)} />
                      </SettingItem>
                      <SettingItem icon={<Bell size={16} />} title="Login Alerts" description="Get notified of new sign-ins">
                        <ToggleSwitch checked={security.loginAlerts} onChange={() => showToast('Login alerts updated', 'success')} />
                      </SettingItem>
                      <SettingItem icon={<Fingerprint size={16} />} title="Biometric Login" description="Use fingerprint or face ID to login">
                        <ToggleSwitch checked={security.biometricEnabled} onChange={() => showToast('Biometric settings updated', 'success')} />
                      </SettingItem>
                    </div>
                  </div>
                  <div className="cs-card">
                    <h3 className="cs-card-title">Trusted Devices</h3>
                    <p className="cs-card-desc">Devices where you're currently logged in</p>
                    <div className="cs-devices-list">
                      {security.trustedDevices.map(device => (
                        <div key={device.id} className={`cs-device-item ${device.isCurrent ? 'current' : ''}`}>
                          <span className="cs-device-icon">{device.type === 'mobile' ? <Smartphone size={14} /> : device.type === 'tablet' ? <Tablet size={14} /> : <Laptop size={14} />}</span>
                          <div className="cs-device-info">
                            <div className="cs-device-name">{device.name} {device.isCurrent && <span className="cs-current-badge">Current</span>}</div>
                            <div className="cs-device-meta">{device.location} · {getRelativeTime(device.lastActive)}</div>
                          </div>
                          {!device.isCurrent && <button className="cs-revoke-btn" onClick={() => handleRevokeDevice(device.id)}>Remove</button>}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="cs-card">
                    <h3 className="cs-card-title">Recent Login Activity</h3>
                    <div className="cs-login-history">
                      {security.loginHistory.map(login => (
                        <div key={login.id} className={`cs-login-item ${login.status}`}>
                          <div className="cs-login-status-icon">{login.status === 'success' ? <Check size={12} /> : <X size={12} />}</div>
                          <div className="cs-login-info">
                            <div className="cs-login-device">{login.device}</div>
                            <div className="cs-login-meta">{login.location} · {login.ip} · {getRelativeTime(login.time)}</div>
                          </div>
                          <span className={`cs-login-badge ${login.status}`}>{login.status === 'success' ? 'Success' : 'Failed'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Connected Accounts */}
              {activeSection === 'connected' && (
                <div className="cs-section">
                  <SectionHeader icon={<Link size={18} />} title="Connected Accounts" description="Manage linked social and third-party accounts" />
                  <div className="cs-card">
                    <h3 className="cs-card-title">Social Logins</h3>
                    <div className="cs-accounts-list">
                      {[
                        { provider: 'google', name: 'Google', icon: 'G', iconClass: 'google' },
                        { provider: 'facebook', name: 'Facebook', icon: 'f', iconClass: 'facebook' },
                        { provider: 'apple', name: 'Apple', icon: '', iconClass: 'apple' }
                      ].map(acc => {
                        const connected = connectedAccounts.find(c => c.provider === acc.provider);
                        return (
                          <div key={acc.provider} className={`cs-account-item ${connected ? 'connected' : ''}`}>
                            <div className={`cs-account-icon ${acc.iconClass}`}>{acc.icon}</div>
                            <div className="cs-account-info">
                              <div className="cs-account-name">{acc.name}</div>
                              {connected ? <div className="cs-account-email">{connected.email}</div> : <div className="cs-account-status">Not connected</div>}
                            </div>
                            {connected ? (
                              <button className="cs-disconnect-btn" onClick={() => handleDisconnectAccount(connected.id)}>Disconnect</button>
                            ) : (
                              <button className="cs-connect-btn" onClick={() => showToast(`Connecting to ${acc.name}...`, 'info')}>Connect</button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="cs-card">
                    <h3 className="cs-card-title">Payment Services</h3>
                    <div className="cs-accounts-list">
                      <div className="cs-account-item">
                        <div className="cs-account-icon gpay">G</div>
                        <div className="cs-account-info"><div className="cs-account-name">Google Pay</div><div className="cs-account-status">Not connected</div></div>
                        <button className="cs-connect-btn" onClick={() => showToast('Connecting to Google Pay...', 'info')}>Connect</button>
                      </div>
                      <div className="cs-account-item">
                        <div className="cs-account-icon phonepe">P</div>
                        <div className="cs-account-info"><div className="cs-account-name">PhonePe</div><div className="cs-account-status">Not connected</div></div>
                        <button className="cs-connect-btn" onClick={() => showToast('Connecting to PhonePe...', 'info')}>Connect</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Help & Support */}
              {activeSection === 'help' && (
                <div className="cs-section">
                  <SectionHeader icon={<HelpCircle size={18} />} title="Help & Support" description="Get help and contact our support team" />
                  <div className="cs-card">
                    <h3 className="cs-card-title">Quick Help</h3>
                    <div className="cs-settings-list">
                      <SettingItem icon={<BookOpen size={16} />} title="Help Center" description="Browse help articles and guides" onClick={() => window.open('/help', '_blank')} />
                      <SettingItem icon={<MessageSquare size={16} />} title="Live Chat" description="Chat with our support team" badge="Online" onClick={() => showToast('Opening chat...', 'info')} />
                      <SettingItem icon={<Mail size={16} />} title="Email Support" description="support@annam.com" onClick={() => window.location.href = 'mailto:support@annam.com'} />
                      <SettingItem icon={<Phone size={16} />} title="Call Us" description="1800-XXX-XXXX (Toll Free)" onClick={() => window.location.href = 'tel:1800XXXXXXX'} />
                    </div>
                  </div>
                  <div className="cs-card">
                    <h3 className="cs-card-title">Frequently Asked Questions</h3>
                    <FAQSection />
                  </div>
                  <div className="cs-card">
                    <h3 className="cs-card-title">Feedback</h3>
                    <div className="cs-settings-list">
                      <SettingItem icon={<Star size={16} />} title="Rate the App" description="Tell us what you think" onClick={() => showToast('Thanks for your feedback!', 'success')} />
                      <SettingItem icon={<Lightbulb size={16} />} title="Suggest a Feature" description="Help us improve with your ideas" onClick={() => showToast('Opening feedback form...', 'info')} />
                      <SettingItem icon={<Bug size={16} />} title="Report a Bug" description="Let us know if something isn't working" onClick={() => showToast('Opening bug report...', 'info')} />
                    </div>
                  </div>
                </div>
              )}

              {/* About */}
              {activeSection === 'about' && (
                <div className="cs-section">
                  <SectionHeader icon={<Info size={18} />} title="About Annam" description="App information and legal" />
                  <div className="cs-about-hero">
                    <div className="cs-about-logo"><span className="cs-logo-icon"><Wheat size={24} /></span><span className="cs-logo-text">Annam</span></div>
                    <p className="cs-about-tagline">Farm Fresh, Delivered with Care</p>
                    <div className="cs-app-version"><span>Version 2.5.1</span><button className="cs-update-btn" onClick={() => showToast('You are on the latest version!', 'success')}>Check for updates</button></div>
                  </div>
                  <div className="cs-card">
                    <h3 className="cs-card-title">Legal</h3>
                    <div className="cs-settings-list">
                      <SettingItem icon={<FileText size={16} />} title="Terms of Service" description="Read our terms and conditions" onClick={() => window.open('/terms', '_blank')} />
                      <SettingItem icon={<Lock size={16} />} title="Privacy Policy" description="How we handle your data" onClick={() => window.open('/privacy', '_blank')} />
                      <SettingItem icon={<Undo2 size={16} />} title="Refund Policy" description="Our return and refund terms" onClick={() => window.open('/refunds', '_blank')} />
                      <SettingItem icon={<ScrollText size={16} />} title="Licenses" description="Open source licenses" onClick={() => window.open('/licenses', '_blank')} />
                    </div>
                  </div>
                  <div className="cs-card">
                    <h3 className="cs-card-title">Connect With Us</h3>
                    <div className="cs-social-links">
                      <a href="#" className="cs-social-link"><Twitter size={14} /> Twitter</a>
                      <a href="#" className="cs-social-link"><Instagram size={14} /> Instagram</a>
                      <a href="#" className="cs-social-link"><Linkedin size={14} /> LinkedIn</a>
                      <a href="#" className="cs-social-link"><Facebook size={14} /> Facebook</a>
                    </div>
                  </div>
                  <div className="cs-copyright"><p>© 2026 Annam. All rights reserved.</p><p>Made with <Heart size={12} /> in India</p></div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Modals */}
      <ChangePasswordModal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} />
      <TwoFactorModal isOpen={showTFAModal} onClose={() => setShowTFAModal(false)} onEnable={() => showToast('2FA enabled!', 'success')} />
      <DeleteAccountModal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} onDelete={handleDeleteAccount} />

      <div id="cs-toast-container" />
    </div>
  );
};

export default CustomerSettings;
