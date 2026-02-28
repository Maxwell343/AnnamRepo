import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './FarmerSettings.css';
import { API_ENDPOINTS } from '../../../config/api';

interface FormData {
  fullName: string;
  email: string;
  phone: string;
  farmName: string;
  farmLocation: string;
  farmSize: string;
  farmSizeUnit: string;
  language: string;
  notificationsEmail: boolean;
  notificationsSMS: boolean;
  notificationsWhatsApp: boolean;
  notificationsPush: boolean;
  bankAccountName: string;
  bankAccountNumber: string;
  bankIFSC: string;
  bankName: string;
  upiId: string;
  produce: string;
  farmingType: string;
  experience: string;
  profileImage: string;
  bio: string;
  theme: 'light' | 'dark' | 'system';
  currency: string;
  timezone: string;
}

interface ValidationErrors {
  [key: string]: string;
}

interface User {
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

const FarmerSettings: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const incompleteProfile = location.state?.incompleteProfile || false;
  const returnTo = location.state?.returnTo || '';
  const [user, setUser] = useState<User | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning'>('success');
  const [activeSection, setActiveSection] = useState('personal');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showImageModal, setShowImageModal] = useState(false);
  const [originalData, setOriginalData] = useState<FormData | null>(null);

  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    email: '',
    phone: '',
    farmName: '',
    farmLocation: '',
    farmSize: '',
    farmSizeUnit: 'acres',
    language: 'English',
    notificationsEmail: true,
    notificationsSMS: false,
    notificationsWhatsApp: true,
    notificationsPush: true,
    bankAccountName: '',
    bankAccountNumber: '',
    bankIFSC: '',
    bankName: '',
    upiId: '',
    produce: 'Mixed',
    farmingType: 'organic',
    experience: '',
    profileImage: '',
    bio: '',
    theme: 'system',
    currency: 'INR',
    timezone: 'Asia/Kolkata'
  });

  const sections = [
    { id: 'personal', label: 'Personal', icon: '👤' },
    { id: 'farm', label: 'Farm Profile', icon: '🌱' },
    { id: 'payment', label: 'Payment', icon: '💳' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'preferences', label: 'Preferences', icon: '⚙️' },
    { id: 'security', label: 'Security', icon: '🔒' }
  ];

  useEffect(() => {
    setIsLoading(true);
    const savedUser = localStorage.getItem('user');
    
    const fetchSettings = async (parsedUser: User & { id: number }) => {
      try {
        const response = await fetch(API_ENDPOINTS.farmerSettings(parsedUser.id.toString()));
        const data = await response.json();
        
        if (response.ok && data && Object.keys(data).length > 1) {
          const apiData: FormData = {
            fullName: data.name || parsedUser.name || '',
            email: data.email || parsedUser.email || '',
            phone: data.phone || '',
            farmName: data.farm_name || '',
            farmLocation: data.farm_location || '',
            farmSize: data.farm_size || '',
            farmSizeUnit: data.farm_size_unit || 'acres',
            language: data.language || 'English',
            notificationsEmail: data.notifications_email ?? true,
            notificationsSMS: data.notifications_sms ?? false,
            notificationsWhatsApp: data.notifications_whatsapp ?? true,
            notificationsPush: data.notifications_push ?? true,
            bankAccountName: data.bank_account_name || '',
            bankAccountNumber: data.bank_account_number || '',
            bankIFSC: data.bank_ifsc || '',
            bankName: data.bank_name || '',
            upiId: data.upi_id || '',
            produce: data.produce || 'Mixed',
            farmingType: data.farming_type || 'organic',
            experience: data.experience || '',
            profileImage: data.profile_image || '',
            bio: data.bio || '',
            theme: data.theme || 'system',
            currency: data.currency || 'INR',
            timezone: data.timezone || 'Asia/Kolkata'
          };
          setFormData(apiData);
          setOriginalData(apiData);
        } else {
          // Fallback to localStorage
          const savedSettings = localStorage.getItem('farmerSettings');
          if (savedSettings) {
            const parsedSettings = JSON.parse(savedSettings);
            setFormData(parsedSettings);
            setOriginalData(parsedSettings);
          } else {
            const initialData = {
              ...formData,
              fullName: parsedUser.name || '',
              email: parsedUser.email || '',
              phone: localStorage.getItem('userPhone') || '',
              farmName: localStorage.getItem('farmName') || '',
              farmLocation: localStorage.getItem('farmLocation') || '',
              language: localStorage.getItem('userLanguage') || 'English'
            };
            setFormData(initialData);
            setOriginalData(initialData);
          }
        }
      } catch (err) {
        console.error('Error fetching farmer settings:', err);
        // Fallback to localStorage
        const savedSettings = localStorage.getItem('farmerSettings');
        if (savedSettings) {
          const parsedSettings = JSON.parse(savedSettings);
          setFormData(parsedSettings);
          setOriginalData(parsedSettings);
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      if (parsedUser.role !== 'farmer') {
        navigate('/home');
        return;
      }
      setUser(parsedUser);
      fetchSettings(parsedUser);
    } else {
      navigate('/');
    }
  }, [navigate]);

  useEffect(() => {
    if (originalData) {
      const changed = JSON.stringify(formData) !== JSON.stringify(originalData);
      setHasChanges(changed);
    }
  }, [formData, originalData]);

  const validateField = useCallback((name: string, value: string): string => {
    switch (name) {
      case 'fullName':
        if (!value.trim()) return 'Full name is required';
        if (value.length < 2) return 'Name must be at least 2 characters';
        if (!/^[a-zA-Z\s]+$/.test(value)) return 'Name can only contain letters';
        return '';
      case 'email':
        if (!value.trim()) return 'Email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Invalid email format';
        return '';
      case 'phone':
        if (!value.trim()) return 'Phone number is required';
        if (!/^[+]?[\d\s-]{10,15}$/.test(value.replace(/\s/g, ''))) return 'Invalid phone number';
        return '';
      case 'bankAccountNumber':
        if (value && !/^\d{9,18}$/.test(value.replace(/\s/g, ''))) return 'Invalid account number';
        return '';
      case 'bankIFSC':
        if (value && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(value.toUpperCase())) return 'Invalid IFSC code';
        return '';
      case 'upiId':
        if (value && !/^[\w.-]+@[\w]+$/.test(value)) return 'Invalid UPI ID format';
        return '';
      default:
        return '';
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    const error = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleToggle = (name: keyof FormData) => {
    setFormData(prev => ({ 
      ...prev, 
      [name]: !prev[name] 
    }));
  };

  const showNotification = (message: string, type: 'success' | 'error' | 'warning') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};
    const fieldsToValidate = ['fullName', 'email', 'phone'];
    
    fieldsToValidate.forEach(field => {
      const error = validateField(field, formData[field as keyof FormData] as string);
      if (error) newErrors[field] = error;
    });

    if (formData.bankAccountNumber) {
      const bankError = validateField('bankAccountNumber', formData.bankAccountNumber);
      if (bankError) newErrors.bankAccountNumber = bankError;
    }

    if (formData.bankIFSC) {
      const ifscError = validateField('bankIFSC', formData.bankIFSC);
      if (ifscError) newErrors.bankIFSC = ifscError;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      showNotification('Please fix the errors before saving', 'error');
      return;
    }

    setIsSaving(true);

    // Save to API
    try {
      const savedUser = localStorage.getItem('user');
      const parsedUser = savedUser ? JSON.parse(savedUser) : null;
      
      if (parsedUser?.id) {
        const response = await fetch(API_ENDPOINTS.farmerSettings(parsedUser.id.toString()), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            farmer_id: parsedUser.id,
            name: formData.fullName,
            email: formData.email,
            phone: formData.phone,
            farm_name: formData.farmName,
            farm_location: formData.farmLocation,
            farm_size: formData.farmSize,
            farm_size_unit: formData.farmSizeUnit,
            language: formData.language,
            notifications_email: formData.notificationsEmail,
            notifications_sms: formData.notificationsSMS,
            notifications_whatsapp: formData.notificationsWhatsApp,
            notifications_push: formData.notificationsPush,
            bank_account_name: formData.bankAccountName,
            bank_account_number: formData.bankAccountNumber,
            bank_ifsc: formData.bankIFSC,
            bank_name: formData.bankName,
            upi_id: formData.upiId,
            produce: formData.produce,
            farming_type: formData.farmingType,
            experience: formData.experience,
            profile_image: formData.profileImage,
            bio: formData.bio,
            theme: formData.theme,
            currency: formData.currency,
            timezone: formData.timezone
          })
        });
        
        if (!response.ok) {
          console.error('Error saving to API');
        }
      }
    } catch (err) {
      console.error('Error saving farmer settings:', err);
    }

    // Also save to localStorage as backup
    localStorage.setItem('farmerSettings', JSON.stringify(formData));
    localStorage.setItem('userPhone', formData.phone);
    localStorage.setItem('farmName', formData.farmName);
    localStorage.setItem('farmLocation', formData.farmLocation);
    localStorage.setItem('userLanguage', formData.language);
    
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      user.name = formData.fullName;
      localStorage.setItem('user', JSON.stringify(user));
    }

    setOriginalData(formData);
    setHasChanges(false);
    setIsSaving(false);
    showNotification('Settings saved successfully!', 'success');

    // If redirected from listing form due to incomplete profile, go back after save
    if (returnTo) {
      const isNowComplete = formData.fullName.trim() && formData.phone.trim() && formData.farmName.trim() && formData.farmLocation.trim();
      if (isNowComplete) {
        setTimeout(() => navigate(returnTo), 1200);
      }
    }
  };

  const handleReset = () => {
    if (originalData) {
      setFormData(originalData);
      setErrors({});
      showNotification('Changes discarded', 'warning');
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      showNotification('Please type DELETE to confirm', 'error');
      return;
    }

    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    localStorage.clear();
    setShowDeleteModal(false);
    navigate('/');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showNotification('Image size should be less than 5MB', 'error');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, profileImage: reader.result as string }));
        setShowImageModal(false);
        showNotification('Profile image updated!', 'success');
      };
      reader.readAsDataURL(file);
    }
  };

  const formatPhoneNumber = (value: string): string => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 5) return cleaned;
    if (cleaned.length <= 10) return `${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
    return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 7)} ${cleaned.slice(7, 12)}`;
  };

  const maskAccountNumber = (value: string): string => {
    if (value.length <= 4) return value;
    return '*'.repeat(value.length - 4) + value.slice(-4);
  };

  if (isLoading) {
    return (
      <div className="settings-loading">
        <div className="loading-spinner"></div>
        <p>Loading your settings...</p>
      </div>
    );
  }

  return (
    <div className="settings-container">
      {incompleteProfile && (
        <div className="profile-incomplete-banner">
          <div className="banner-content">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <div>
              <strong>Complete your profile to create listings</strong>
              <p>Please fill in your <em>Full Name</em>, <em>Phone</em>, <em>Farm Name</em>, and <em>Farm Location</em> before you can list products.</p>
            </div>
          </div>
        </div>
      )}
      {/* Sidebar Navigation */}
      <aside className="settings-sidebar">
        <div className="sidebar-header">
          <button className="back-btn" onClick={() => navigate('/home')} title="Back to Home">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          <h1>Settings</h1>
        </div>

        <div className="sidebar-profile">
          <div 
            className="profile-avatar"
            onClick={() => setShowImageModal(true)}
          >
            {formData.profileImage ? (
              <img src={formData.profileImage} alt="Profile" />
            ) : (
              <span>{formData.fullName ? formData.fullName.charAt(0).toUpperCase() : '🌱'}</span>
            )}
            <div className="avatar-edit-overlay">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </div>
          </div>
          <div className="profile-info">
            <h3>{formData.fullName || 'Farmer'}</h3>
            <p>{formData.email || 'No email'}</p>
            <span className="role-badge farmer">
              <span className="badge-icon">🌱</span>
              Farmer
            </span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {sections.map(section => (
            <button
              key={section.id}
              className={`nav-item ${activeSection === section.id ? 'active' : ''}`}
              onClick={() => setActiveSection(section.id)}
            >
              <span className="nav-icon">{section.icon}</span>
              <span className="nav-label">{section.label}</span>
              {section.id === 'personal' && errors.fullName && (
                <span className="nav-error-dot"></span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="completion-indicator">
            <div className="completion-bar">
              <div 
                className="completion-fill" 
                style={{ width: `${calculateCompletion(formData)}%` }}
              ></div>
            </div>
            <span className="completion-text">
              Profile {calculateCompletion(formData)}% complete
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="settings-main">
        <div className="settings-content">
          
          {/* Personal Details Section */}
          {activeSection === 'personal' && (
            <section className="settings-section animate-in">
              <div className="section-header">
                <div className="section-title-group">
                  <h2>Personal Details</h2>
                  <p>Manage your personal information and contact details</p>
                </div>
              </div>

              <div className="form-grid">
                <div className={`form-group ${errors.fullName ? 'has-error' : ''}`}>
                  <label htmlFor="fullName">
                    Full Name <span className="required">*</span>
                  </label>
                  <div className="input-wrapper">
                    <input 
                      type="text" 
                      id="fullName"
                      name="fullName" 
                      value={formData.fullName}
                      onChange={handleChange}
                      placeholder="Enter your full name"
                      className={errors.fullName ? 'error' : ''}
                    />
                    {formData.fullName && !errors.fullName && (
                      <span className="input-success-icon">✓</span>
                    )}
                  </div>
                  {errors.fullName && <span className="error-message">{errors.fullName}</span>}
                </div>

                <div className={`form-group ${errors.phone ? 'has-error' : ''}`}>
                  <label htmlFor="phone">
                    Phone Number <span className="required">*</span>
                  </label>
                  <div className="input-wrapper phone-input">
                    <span className="phone-prefix">🇮🇳 +91</span>
                    <input 
                      type="tel" 
                      id="phone"
                      name="phone" 
                      value={formData.phone}
                      onChange={(e) => {
                        const formatted = formatPhoneNumber(e.target.value);
                        setFormData(prev => ({ ...prev, phone: formatted }));
                      }}
                      placeholder="98765 43210"
                      className={errors.phone ? 'error' : ''}
                    />
                  </div>
                  {errors.phone && <span className="error-message">{errors.phone}</span>}
                  <div className="verification-badge">
                    {formData.phone && formData.phone.length >= 10 ? (
                      <span className="verified">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                        </svg>
                        Verified
                      </span>
                    ) : (
                      <span className="unverified">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                        Not verified
                        <button className="verify-btn">Verify Now</button>
                      </span>
                    )}
                  </div>
                </div>

                <div className={`form-group full-width ${errors.email ? 'has-error' : ''}`}>
                  <label htmlFor="email">
                    Email Address <span className="required">*</span>
                  </label>
                  <div className="input-wrapper">
                    <span className="input-icon">📧</span>
                    <input 
                      type="email" 
                      id="email"
                      name="email" 
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="farmer@example.com"
                      className={errors.email ? 'error' : ''}
                    />
                  </div>
                  {errors.email && <span className="error-message">{errors.email}</span>}
                </div>

                <div className="form-group full-width">
                  <label htmlFor="bio">Bio</label>
                  <textarea
                    id="bio"
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    placeholder="Tell us about yourself and your farming journey..."
                    rows={4}
                    maxLength={500}
                  />
                  <span className="char-count">{formData.bio.length}/500</span>
                </div>
              </div>

              {/* Connected Accounts */}
              <div className="subsection">
                <h3>Connected Accounts</h3>
                <div className="connected-accounts-grid">
                  <div className={`account-card ${formData.phone ? 'connected' : ''}`}>
                    <div className="account-icon whatsapp">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                    </div>
                    <div className="account-details">
                      <h4>WhatsApp</h4>
                      <p>{formData.phone || 'Not connected'}</p>
                    </div>
                    <span className={`account-status ${formData.phone ? 'connected' : ''}`}>
                      {formData.phone ? 'Connected' : 'Connect'}
                    </span>
                  </div>

                  <div className="account-card">
                    <div className="account-icon google">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                    </div>
                    <div className="account-details">
                      <h4>Google</h4>
                      <p>{formData.email || 'Not connected'}</p>
                    </div>
                    <span className={`account-status ${formData.email ? 'connected' : ''}`}>
                      {formData.email ? 'Connected' : 'Connect'}
                    </span>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Farm Profile Section */}
          {activeSection === 'farm' && (
            <section className="settings-section animate-in">
              <div className="section-header">
                <div className="section-title-group">
                  <h2>Farm Profile</h2>
                  <p>Tell us about your farm to help buyers find you</p>
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="farmName">Farm Name</label>
                  <div className="input-wrapper">
                    <span className="input-icon">🏡</span>
                    <input 
                      type="text" 
                      id="farmName"
                      name="farmName" 
                      value={formData.farmName}
                      onChange={handleChange}
                      placeholder="Green Valley Farm"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="farmLocation">Farm Location</label>
                  <div className="input-wrapper">
                    <span className="input-icon">📍</span>
                    <input 
                      type="text" 
                      id="farmLocation"
                      name="farmLocation" 
                      value={formData.farmLocation}
                      onChange={handleChange}
                      placeholder="Village, District, State"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="farmSize">Farm Size</label>
                  <div className="input-group-inline">
                    <input 
                      type="number" 
                      id="farmSize"
                      name="farmSize" 
                      value={formData.farmSize}
                      onChange={handleChange}
                      placeholder="10"
                      min="0"
                    />
                    <select 
                      name="farmSizeUnit"
                      value={formData.farmSizeUnit}
                      onChange={handleChange}
                    >
                      <option value="acres">Acres</option>
                      <option value="hectares">Hectares</option>
                      <option value="bigha">Bigha</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="experience">Farming Experience</label>
                  <select 
                    id="experience"
                    name="experience"
                    value={formData.experience}
                    onChange={handleChange}
                  >
                    <option value="">Select experience</option>
                    <option value="0-2">0-2 years</option>
                    <option value="3-5">3-5 years</option>
                    <option value="6-10">6-10 years</option>
                    <option value="10+">10+ years</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="produce">Primary Produce</label>
                  <select 
                    id="produce"
                    name="produce" 
                    value={formData.produce}
                    onChange={handleChange}
                  >
                    <option value="Mixed">🌈 Mixed</option>
                    <option value="Vegetables">🥦 Vegetables</option>
                    <option value="Fruits">🍎 Fruits</option>
                    <option value="Grains">🌾 Grains</option>
                    <option value="Dairy">🥛 Dairy</option>
                    <option value="Poultry">🐔 Poultry</option>
                    <option value="Spices">🌶️ Spices</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="farmingType">Farming Type</label>
                  <div className="radio-group">
                    <label className={`radio-card ${formData.farmingType === 'organic' ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="farmingType"
                        value="organic"
                        checked={formData.farmingType === 'organic'}
                        onChange={handleChange}
                      />
                      <span className="radio-icon">🌿</span>
                      <span className="radio-label">Organic</span>
                    </label>
                    <label className={`radio-card ${formData.farmingType === 'conventional' ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="farmingType"
                        value="conventional"
                        checked={formData.farmingType === 'conventional'}
                        onChange={handleChange}
                      />
                      <span className="radio-icon">🌾</span>
                      <span className="radio-label">Conventional</span>
                    </label>
                    <label className={`radio-card ${formData.farmingType === 'mixed' ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="farmingType"
                        value="mixed"
                        checked={formData.farmingType === 'mixed'}
                        onChange={handleChange}
                      />
                      <span className="radio-icon">🔄</span>
                      <span className="radio-label">Mixed</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Farm Stats Card */}
              <div className="stats-card">
                <h3>Farm Statistics</h3>
                <div className="stats-grid">
                  <div className="stat-item">
                    <span className="stat-value">24</span>
                    <span className="stat-label">Products Listed</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">156</span>
                    <span className="stat-label">Orders Completed</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">4.8</span>
                    <span className="stat-label">Average Rating</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">₹45K</span>
                    <span className="stat-label">This Month</span>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Payment Section */}
          {activeSection === 'payment' && (
            <section className="settings-section animate-in">
              <div className="section-header">
                <div className="section-title-group">
                  <h2>Payment Details</h2>
                  <p>Manage your bank account and payment preferences</p>
                </div>
                <div className="security-badge">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
                  </svg>
                  <span>256-bit encrypted</span>
                </div>
              </div>

              <div className="payment-methods">
                <h3>Bank Account</h3>
                
                <div className="form-grid">
                  <div className="form-group full-width">
                    <label htmlFor="bankAccountName">Account Holder Name</label>
                    <div className="input-wrapper">
                      <span className="input-icon">👤</span>
                      <input 
                        type="text" 
                        id="bankAccountName"
                        name="bankAccountName" 
                        value={formData.bankAccountName}
                        onChange={handleChange}
                        placeholder="As per bank records"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="bankName">Bank Name</label>
                    <select 
                      id="bankName"
                      name="bankName"
                      value={formData.bankName}
                      onChange={handleChange}
                    >
                      <option value="">Select bank</option>
                      <option value="sbi">State Bank of India</option>
                      <option value="hdfc">HDFC Bank</option>
                      <option value="icici">ICICI Bank</option>
                      <option value="axis">Axis Bank</option>
                      <option value="pnb">Punjab National Bank</option>
                      <option value="bob">Bank of Baroda</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div className={`form-group ${errors.bankAccountNumber ? 'has-error' : ''}`}>
                    <label htmlFor="bankAccountNumber">Account Number</label>
                    <div className="input-wrapper">
                      <span className="input-icon">🏦</span>
                      <input 
                        type="text" 
                        id="bankAccountNumber"
                        name="bankAccountNumber" 
                        value={formData.bankAccountNumber}
                        onChange={handleChange}
                        placeholder="XXXX XXXX XXXX"
                      />
                    </div>
                    {errors.bankAccountNumber && (
                      <span className="error-message">{errors.bankAccountNumber}</span>
                    )}
                  </div>

                  <div className={`form-group ${errors.bankIFSC ? 'has-error' : ''}`}>
                    <label htmlFor="bankIFSC">IFSC Code</label>
                    <div className="input-wrapper">
                      <input 
                        type="text" 
                        id="bankIFSC"
                        name="bankIFSC" 
                        value={formData.bankIFSC}
                        onChange={(e) => {
                          const value = e.target.value.toUpperCase();
                          setFormData(prev => ({ ...prev, bankIFSC: value }));
                        }}
                        placeholder="SBIN0001234"
                        maxLength={11}
                      />
                    </div>
                    {errors.bankIFSC && (
                      <span className="error-message">{errors.bankIFSC}</span>
                    )}
                  </div>
                </div>

                <div className="divider">
                  <span>or</span>
                </div>

                <h3>UPI Payment</h3>
                <div className="form-grid">
                  <div className={`form-group full-width ${errors.upiId ? 'has-error' : ''}`}>
                    <label htmlFor="upiId">UPI ID</label>
                    <div className="input-wrapper">
                      <span className="input-icon">📲</span>
                      <input 
                        type="text" 
                        id="upiId"
                        name="upiId" 
                        value={formData.upiId}
                        onChange={handleChange}
                        placeholder="yourname@upi"
                      />
                    </div>
                    {errors.upiId && (
                      <span className="error-message">{errors.upiId}</span>
                    )}
                    <span className="input-hint">
                      Supports: Google Pay, PhonePe, Paytm, BHIM
                    </span>
                  </div>
                </div>

                {/* Payment History Preview */}
                <div className="payment-history-preview">
                  <div className="preview-header">
                    <h3>Recent Payments</h3>
                    <button className="link-btn">View All →</button>
                  </div>
                  <div className="payment-list">
                    <div className="payment-item">
                      <div className="payment-icon success">₹</div>
                      <div className="payment-details">
                        <h4>Payment Received</h4>
                        <p>Order #ORD-2024-001</p>
                      </div>
                      <div className="payment-amount success">+₹2,450</div>
                    </div>
                    <div className="payment-item">
                      <div className="payment-icon success">₹</div>
                      <div className="payment-details">
                        <h4>Payment Received</h4>
                        <p>Order #ORD-2024-002</p>
                      </div>
                      <div className="payment-amount success">+₹1,800</div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Notifications Section */}
          {activeSection === 'notifications' && (
            <section className="settings-section animate-in">
              <div className="section-header">
                <div className="section-title-group">
                  <h2>Notification Preferences</h2>
                  <p>Choose how you want to receive updates</p>
                </div>
              </div>

              <div className="notification-groups">
                <div className="notification-group">
                  <h3>Communication Channels</h3>
                  
                  <div className="toggle-card">
                    <div className="toggle-icon whatsapp">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                    </div>
                    <div className="toggle-content">
                      <h4>WhatsApp Notifications</h4>
                      <p>Get instant updates about orders and deliveries</p>
                    </div>
                    <label className="toggle-switch">
                      <input 
                        type="checkbox" 
                        checked={formData.notificationsWhatsApp}
                        onChange={() => handleToggle('notificationsWhatsApp')} 
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="toggle-card">
                    <div className="toggle-icon sms">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                      </svg>
                    </div>
                    <div className="toggle-content">
                      <h4>SMS Alerts</h4>
                      <p>Receive text messages for urgent updates</p>
                    </div>
                    <label className="toggle-switch">
                      <input 
                        type="checkbox" 
                        checked={formData.notificationsSMS}
                        onChange={() => handleToggle('notificationsSMS')} 
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="toggle-card">
                    <div className="toggle-icon email">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                        <polyline points="22,6 12,13 2,6"/>
                      </svg>
                    </div>
                    <div className="toggle-content">
                      <h4>Email Notifications</h4>
                      <p>Receive weekly summary and reports via email</p>
                    </div>
                    <label className="toggle-switch">
                      <input 
                        type="checkbox" 
                        checked={formData.notificationsEmail}
                        onChange={() => handleToggle('notificationsEmail')} 
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="toggle-card">
                    <div className="toggle-icon push">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                      </svg>
                    </div>
                    <div className="toggle-content">
                      <h4>Push Notifications</h4>
                      <p>Get real-time alerts on your device</p>
                    </div>
                    <label className="toggle-switch">
                      <input 
                        type="checkbox" 
                        checked={formData.notificationsPush}
                        onChange={() => handleToggle('notificationsPush')} 
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                </div>

                <div className="notification-schedule">
                  <h3>Quiet Hours</h3>
                  <p>We won't send notifications during these hours</p>
                  <div className="time-range">
                    <div className="time-input">
                      <label>From</label>
                      <input type="time" defaultValue="22:00" />
                    </div>
                    <span className="time-separator">to</span>
                    <div className="time-input">
                      <label>To</label>
                      <input type="time" defaultValue="07:00" />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Preferences Section */}
          {activeSection === 'preferences' && (
            <section className="settings-section animate-in">
              <div className="section-header">
                <div className="section-title-group">
                  <h2>App Preferences</h2>
                  <p>Customize your app experience</p>
                </div>
              </div>

              <div className="preferences-grid">
                <div className="preference-card">
                  <h3>🌐 Language</h3>
                  <select 
                    name="language" 
                    value={formData.language}
                    onChange={handleChange}
                  >
                    <option value="English">🇬🇧 English</option>
                    <option value="Hindi">🇮🇳 Hindi (हिंदी)</option>
                    <option value="Marathi">🇮🇳 Marathi (मराठी)</option>
                    <option value="Tamil">🇮🇳 Tamil (தமிழ்)</option>
                    <option value="Telugu">🇮🇳 Telugu (తెలుగు)</option>
                    <option value="Kannada">🇮🇳 Kannada (ಕನ್ನಡ)</option>
                    <option value="Bengali">🇮🇳 Bengali (বাংলা)</option>
                    <option value="Gujarati">🇮🇳 Gujarati (ગુજરાતી)</option>
                  </select>
                </div>

                <div className="preference-card">
                  <h3>🎨 Theme</h3>
                  <div className="theme-options">
                    <label className={`theme-option ${formData.theme === 'light' ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="theme"
                        value="light"
                        checked={formData.theme === 'light'}
                        onChange={handleChange}
                      />
                      <span className="theme-preview light">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58a.996.996 0 0 0-1.41 0 .996.996 0 0 0 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37a.996.996 0 0 0-1.41 0 .996.996 0 0 0 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0a.996.996 0 0 0 0-1.41l-1.06-1.06zm1.06-10.96a.996.996 0 0 0 0-1.41.996.996 0 0 0-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36a.996.996 0 0 0 0-1.41.996.996 0 0 0-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"/>
                        </svg>
                      </span>
                      <span>Light</span>
                    </label>
                    <label className={`theme-option ${formData.theme === 'dark' ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="theme"
                        value="dark"
                        checked={formData.theme === 'dark'}
                        onChange={handleChange}
                      />
                      <span className="theme-preview dark">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/>
                        </svg>
                      </span>
                      <span>Dark</span>
                    </label>
                    <label className={`theme-option ${formData.theme === 'system' ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="theme"
                        value="system"
                        checked={formData.theme === 'system'}
                        onChange={handleChange}
                      />
                      <span className="theme-preview system">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M20 18c1.1 0 1.99-.9 1.99-2L22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z"/>
                        </svg>
                      </span>
                      <span>System</span>
                    </label>
                  </div>
                </div>

                <div className="preference-card">
                  <h3>💰 Currency</h3>
                  <select 
                    name="currency" 
                    value={formData.currency}
                    onChange={handleChange}
                  >
                    <option value="INR">🇮🇳 INR (₹)</option>
                    <option value="USD">🇺🇸 USD ($)</option>
                    <option value="EUR">🇪🇺 EUR (€)</option>
                  </select>
                </div>

                <div className="preference-card">
                  <h3>🕐 Timezone</h3>
                  <select 
                    name="timezone" 
                    value={formData.timezone}
                    onChange={handleChange}
                  >
                    <option value="Asia/Kolkata">India (IST)</option>
                    <option value="Asia/Dubai">Dubai (GST)</option>
                    <option value="Europe/London">London (GMT)</option>
                    <option value="America/New_York">New York (EST)</option>
                  </select>
                </div>
              </div>
            </section>
          )}

          {/* Security Section */}
          {activeSection === 'security' && (
            <section className="settings-section animate-in">
              <div className="section-header">
                <div className="section-title-group">
                  <h2>Security & Privacy</h2>
                  <p>Manage your account security settings</p>
                </div>
              </div>

              <div className="security-options">
                <div className="security-card">
                  <div className="security-icon">🔐</div>
                  <div className="security-content">
                    <h4>Change Password</h4>
                    <p>Update your password regularly to keep your account secure</p>
                  </div>
                  <button className="btn-secondary">Change</button>
                </div>

                <div className="security-card">
                  <div className="security-icon">📱</div>
                  <div className="security-content">
                    <h4>Two-Factor Authentication</h4>
                    <p>Add an extra layer of security to your account</p>
                  </div>
                  <button className="btn-secondary">Enable</button>
                </div>

                <div className="security-card">
                  <div className="security-icon">📋</div>
                  <div className="security-content">
                    <h4>Login History</h4>
                    <p>View recent login activity on your account</p>
                  </div>
                  <button className="btn-secondary">View</button>
                </div>

                <div className="security-card">
                  <div className="security-icon">📤</div>
                  <div className="security-content">
                    <h4>Export Data</h4>
                    <p>Download a copy of your data</p>
                  </div>
                  <button className="btn-secondary">Export</button>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="danger-zone">
                <div className="danger-header">
                  <h3>⚠️ Danger Zone</h3>
                  <p>Irreversible and destructive actions</p>
                </div>
                
                <div className="danger-actions">
                  <div className="danger-item">
                    <div className="danger-content">
                      <h4>Deactivate Account</h4>
                      <p>Temporarily disable your account. You can reactivate anytime.</p>
                    </div>
                    <button className="btn-warning">Deactivate</button>
                  </div>
                  
                  <div className="danger-item">
                    <div className="danger-content">
                      <h4>Delete Account</h4>
                      <p>Permanently delete your account and all associated data.</p>
                    </div>
                    <button className="btn-danger" onClick={() => setShowDeleteModal(true)}>
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Sticky Footer */}
        <div className={`settings-footer ${hasChanges ? 'visible' : ''}`}>
          <div className="footer-content">
            <p className="unsaved-changes">
              <span className="pulse-dot"></span>
              You have unsaved changes
            </p>
            <div className="footer-actions">
              <button className="btn-cancel" onClick={handleReset} disabled={isSaving}>
                Discard
              </button>
              <button className="btn-save" onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <span className="btn-spinner"></span>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                      <polyline points="17 21 17 13 7 13 7 21"/>
                      <polyline points="7 3 7 8 15 8"/>
                    </svg>
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Toast Notification */}
      <div className={`toast ${showToast ? 'visible' : ''} ${toastType}`}>
        <div className="toast-icon">
          {toastType === 'success' && '✓'}
          {toastType === 'error' && '✕'}
          {toastType === 'warning' && '!'}
        </div>
        <span className="toast-message">{toastMessage}</span>
        <button className="toast-close" onClick={() => setShowToast(false)}>×</button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal delete-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-icon danger">⚠️</div>
              <h2>Delete Account</h2>
              <p>This action cannot be undone. All your data will be permanently deleted.</p>
            </div>
            
            <div className="modal-body">
              <div className="delete-warning">
                <h4>This will delete:</h4>
                <ul>
                  <li>Your profile and personal information</li>
                  <li>All your listed products</li>
                  <li>Order history and transactions</li>
                  <li>Payment information</li>
                </ul>
              </div>
              
              <div className="form-group">
                <label>Type <strong>DELETE</strong> to confirm</label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE"
                  className="delete-confirm-input"
                />
              </div>
            </div>
            
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </button>
              <button 
                className="btn-danger" 
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE'}
              >
                Delete My Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Upload Modal */}
      {showImageModal && (
        <div className="modal-overlay" onClick={() => setShowImageModal(false)}>
          <div className="modal image-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Update Profile Picture</h2>
              <button className="modal-close" onClick={() => setShowImageModal(false)}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="image-preview-large">
                {formData.profileImage ? (
                  <img src={formData.profileImage} alt="Profile" />
                ) : (
                  <div className="placeholder-avatar">
                    {formData.fullName ? formData.fullName.charAt(0).toUpperCase() : '🌱'}
                  </div>
                )}
              </div>
              
              <div className="image-upload-options">
                <label className="upload-btn primary">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    hidden
                  />
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  Upload Photo
                </label>
                
                {formData.profileImage && (
                  <button 
                    className="upload-btn danger"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, profileImage: '' }));
                      setShowImageModal(false);
                    }}
                  >
                    Remove Photo
                  </button>
                )}
              </div>
              
              <p className="upload-hint">
                Recommended: Square image, at least 200x200 pixels, max 5MB
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to calculate profile completion
function calculateCompletion(data: FormData): number {
  const fields = [
    data.fullName,
    data.email,
    data.phone,
    data.farmName,
    data.farmLocation,
    data.farmSize,
    data.produce,
    data.bankAccountName,
    data.bankAccountNumber,
    data.bio
  ];
  
  const filled = fields.filter(field => field && field.trim() !== '').length;
  return Math.round((filled / fields.length) * 100);
}

export default FarmerSettings;
