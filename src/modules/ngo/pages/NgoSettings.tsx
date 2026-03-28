import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './NgoSettings.css';
import { API_ENDPOINTS } from '../../../config/api';
import { BookOpen, Hospital, Globe, UserRound, Baby, Accessibility, Home, UtensilsCrossed, PawPrint, Siren, Palette, Building, User, Target, ClipboardList, HeartHandshake, Globe2, Bell, Settings, Lock, Check, X, Mail, MapPin, BarChart3, Tag, FileText, Upload, Landmark, Smartphone, Sun, Moon, Monitor, Clock, Calendar, Wheat, Camera, ShieldCheck, Users, AlertTriangle } from 'lucide-react';

interface FormData {
  // Admin Details
  adminName: string;
  adminEmail: string;
  adminPhone: string;
  adminRole: string;
  
  // Organization Details
  organizationName: string;
  organizationEmail: string;
  organizationPhone: string;
  registrationNumber: string;
  registration80G: string;
  registration12A: string;
  fcraNumber: string;
  panNumber: string;
  gstNumber: string;
  
  // Organization Profile
  mission: string;
  vision: string;
  yearEstablished: string;
  teamSize: string;
  website: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  
  // Cause Areas
  causeAreas: string[];
  geographicCoverage: string;
  beneficiariesServed: string;
  
  // Social Media
  facebook: string;
  twitter: string;
  instagram: string;
  linkedin: string;
  youtube: string;
  
  // Payment/Donation Settings
  bankAccountName: string;
  bankAccountNumber: string;
  bankIFSC: string;
  bankName: string;
  bankBranch: string;
  upiId: string;
  paymentGateway: string;
  
  // Notifications
  notificationsEmail: boolean;
  notificationsSMS: boolean;
  notificationsWhatsApp: boolean;
  notificationsPush: boolean;
  donationAlerts: boolean;
  volunteerAlerts: boolean;
  reportReminders: boolean;
  
  // Preferences
  language: string;
  theme: 'light' | 'dark' | 'system';
  currency: string;
  timezone: string;
  fiscalYearStart: string;
  
  // Branding
  logo: string;
  coverImage: string;
  primaryColor: string;
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

const causeAreaOptions = [
  { id: 'education', label: 'Education', icon: <BookOpen size={16} /> },
  { id: 'healthcare', label: 'Healthcare', icon: <Hospital size={16} /> },
  { id: 'environment', label: 'Environment', icon: <Globe size={16} /> },
  { id: 'women', label: 'Women Empowerment', icon: <UserRound size={16} /> },
  { id: 'children', label: 'Child Welfare', icon: <Baby size={16} /> },
  { id: 'elderly', label: 'Elderly Care', icon: <UserRound size={16} /> },
  { id: 'disability', label: 'Disability Support', icon: <Accessibility size={16} /> },
  { id: 'poverty', label: 'Poverty Alleviation', icon: <Home size={16} /> },
  { id: 'hunger', label: 'Hunger & Nutrition', icon: <UtensilsCrossed size={16} /> },
  { id: 'animals', label: 'Animal Welfare', icon: <PawPrint size={16} /> },
  { id: 'disaster', label: 'Disaster Relief', icon: <Siren size={16} /> },
  { id: 'arts', label: 'Arts & Culture', icon: <Palette size={16} /> },
];

const normalizeForComparison = (data: FormData): FormData => ({
  ...data,
  causeAreas: [...data.causeAreas].sort(),
  adminPhone: data.adminPhone.trim(),
  organizationPhone: data.organizationPhone.trim(),
  bankAccountNumber: data.bankAccountNumber.trim(),
  bankIFSC: data.bankIFSC.trim().toUpperCase(),
  panNumber: data.panNumber.trim().toUpperCase(),
  gstNumber: data.gstNumber.trim().toUpperCase(),
  upiId: data.upiId.trim().toLowerCase(),
});

const cloneFormData = (data: FormData): FormData =>
  JSON.parse(JSON.stringify(data)) as FormData;

const hasFormDiff = (current: FormData, original: FormData): boolean =>
  JSON.stringify(normalizeForComparison(current)) !== JSON.stringify(normalizeForComparison(original));

const NGOSettings: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.state?.returnTo || '';
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'warning'>('success');
  const [activeSection, setActiveSection] = useState('organization');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [showLogoModal, setShowLogoModal] = useState(false);
  const [originalData, setOriginalData] = useState<FormData | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'verified' | 'rejected'>('pending');

  const [formData, setFormData] = useState<FormData>({
    adminName: '',
    adminEmail: '',
    adminPhone: '',
    adminRole: 'Admin',
    
    organizationName: '',
    organizationEmail: '',
    organizationPhone: '',
    registrationNumber: '',
    registration80G: '',
    registration12A: '',
    fcraNumber: '',
    panNumber: '',
    gstNumber: '',
    
    mission: '',
    vision: '',
    yearEstablished: '',
    teamSize: '',
    website: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    
    causeAreas: [],
    geographicCoverage: 'state',
    beneficiariesServed: '',
    
    facebook: '',
    twitter: '',
    instagram: '',
    linkedin: '',
    youtube: '',
    
    bankAccountName: '',
    bankAccountNumber: '',
    bankIFSC: '',
    bankName: '',
    bankBranch: '',
    upiId: '',
    paymentGateway: '',
    
    notificationsEmail: true,
    notificationsSMS: false,
    notificationsWhatsApp: true,
    notificationsPush: true,
    donationAlerts: true,
    volunteerAlerts: true,
    reportReminders: true,
    
    language: 'English',
    theme: 'system',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    fiscalYearStart: 'april',
    
    logo: '',
    coverImage: '',
    primaryColor: '#10b981',
  });

  const sections = [
    { id: 'organization', label: 'Organization', icon: <Building size={16} />, optional: false },
    { id: 'admin', label: 'Admin Profile', icon: <User size={16} />, optional: false },
    { id: 'cause', label: 'Cause & Impact', icon: <Target size={16} />, optional: false },
    { id: 'compliance', label: 'Compliance', icon: <ClipboardList size={16} />, optional: false },
    { id: 'payment', label: 'Donations', icon: <HeartHandshake size={16} />, optional: false },
    { id: 'social', label: 'Social Media', icon: <Globe2 size={16} />, optional: false },
    { id: 'branding', label: 'Branding', icon: <Palette size={16} />, optional: false },
    { id: 'preferences', label: 'Preferences', icon: <Settings size={16} />, optional: true },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={16} />, optional: true },
    { id: 'security', label: 'Security', icon: <Lock size={16} />, optional: true },
  ];

  useEffect(() => {
    setIsLoading(true);
    const savedUser = localStorage.getItem('user');
    
    const fetchSettings = async (parsedUser: User & { id: number }) => {
      try {
        const response = await fetch(API_ENDPOINTS.ngoSettings(parsedUser.id.toString()));
        const data = await response.json();
        
        if (response.ok && data && Object.keys(data).length > 1) {
          const apiData: FormData = {
            adminName: data.admin_name || parsedUser.name || '',
            adminEmail: data.admin_email || parsedUser.email || '',
            adminPhone: data.admin_phone || '',
            adminRole: data.admin_role || 'Admin',
            organizationName: data.organization_name || '',
            organizationEmail: data.organization_email || '',
            organizationPhone: data.organization_phone || '',
            registrationNumber: data.registration_number || '',
            registration80G: data.registration_80g || '',
            registration12A: data.registration_12a || '',
            fcraNumber: data.fcra_number || '',
            panNumber: data.pan_number || '',
            gstNumber: data.gst_number || '',
            mission: data.mission || '',
            vision: data.vision || '',
            yearEstablished: data.year_established || '',
            teamSize: data.team_size || '',
            website: data.website || '',
            address: data.address || '',
            city: data.city || '',
            state: data.state || '',
            pincode: data.pincode || '',
            country: data.country || 'India',
            causeAreas: data.cause_areas || [],
            geographicCoverage: data.geographic_coverage || 'state',
            beneficiariesServed: data.beneficiaries_served || '',
            facebook: data.facebook || '',
            twitter: data.twitter || '',
            instagram: data.instagram || '',
            linkedin: data.linkedin || '',
            youtube: data.youtube || '',
            bankAccountName: data.bank_account_name || '',
            bankAccountNumber: data.bank_account_number || '',
            bankIFSC: data.bank_ifsc || '',
            bankName: data.bank_name || '',
            bankBranch: data.bank_branch || '',
            upiId: data.upi_id || '',
            paymentGateway: data.payment_gateway || '',
            notificationsEmail: data.notifications_email ?? true,
            notificationsSMS: data.notifications_sms ?? false,
            notificationsWhatsApp: data.notifications_whatsapp ?? true,
            notificationsPush: data.notifications_push ?? true,
            donationAlerts: data.donation_alerts ?? true,
            volunteerAlerts: data.volunteer_alerts ?? true,
            reportReminders: data.report_reminders ?? true,
            language: data.language || 'English',
            theme: data.theme || 'system',
            currency: data.currency || 'INR',
            timezone: data.timezone || 'Asia/Kolkata',
            fiscalYearStart: data.fiscal_year_start || 'april',
            logo: data.logo || '',
            coverImage: data.cover_image || '',
            primaryColor: data.primary_color || '#10b981',
          };
          setFormData(apiData);
          setOriginalData(apiData);
        } else {
          // Fallback to localStorage
          const savedSettings = localStorage.getItem('ngoSettings');
          if (savedSettings) {
            const parsedSettings = JSON.parse(savedSettings);
            setFormData(parsedSettings);
            setOriginalData(parsedSettings);
          } else {
            const initialData = {
              ...formData,
              adminName: parsedUser.name || '',
              adminEmail: parsedUser.email || '',
              organizationName: localStorage.getItem('ngoName') || '',
            };
            setFormData(initialData);
            setOriginalData(initialData);
          }
        }
        
        setVerificationStatus('verified');
      } catch (err) {
        console.error('Error fetching NGO settings:', err);
        // Fallback to localStorage
        const savedSettings = localStorage.getItem('ngoSettings');
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
      if (parsedUser.role !== 'ngo') {
        navigate('/home');
        return;
      }
      fetchSettings(parsedUser);
    } else {
      navigate('/');
    }
  }, [navigate]);

  useEffect(() => {
    if (originalData) {
      const changed = hasFormDiff(formData, originalData);
      setHasChanges(changed);
    }
  }, [formData, originalData]);

  const validateField = useCallback((name: string, value: string): string => {
    switch (name) {
      case 'adminName':
      case 'organizationName':
        if (!value.trim()) return 'This field is required';
        if (value.length < 2) return 'Must be at least 2 characters';
        return '';
      case 'adminEmail':
      case 'organizationEmail':
        if (!value.trim()) return 'Email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Invalid email format';
        return '';
      case 'adminPhone':
      case 'organizationPhone':
        if (!value.trim()) return 'Phone number is required';
        if (!/^[+]?[\d\s-]{10,15}$/.test(value.replace(/\s/g, ''))) return 'Invalid phone number';
        return '';
      case 'bankAccountNumber':
        if (value && !/^\d{9,18}$/.test(value.replace(/\s/g, ''))) return 'Invalid account number';
        return '';
      case 'bankIFSC':
        if (value && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(value.toUpperCase())) return 'Invalid IFSC code';
        return '';
      case 'panNumber':
        if (value && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(value.toUpperCase())) return 'Invalid PAN format';
        return '';
      case 'website':
        if (value && !/^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/.test(value)) {
          return 'Invalid website URL';
        }
        return '';
      case 'pincode':
        if (value && !/^\d{6}$/.test(value)) return 'Invalid pincode';
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

  const handleCauseAreaToggle = (causeId: string) => {
    setFormData(prev => ({
      ...prev,
      causeAreas: prev.causeAreas.includes(causeId)
        ? prev.causeAreas.filter(id => id !== causeId)
        : [...prev.causeAreas, causeId]
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
    const fieldsToValidate = ['adminName', 'adminEmail', 'organizationName'];
    
    fieldsToValidate.forEach(field => {
      const error = validateField(field, formData[field as keyof FormData] as string);
      if (error) newErrors[field] = error;
    });

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
        const response = await fetch(API_ENDPOINTS.ngoSettings(parsedUser.id.toString()), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ngo_id: parsedUser.id,
            admin_name: formData.adminName,
            admin_email: formData.adminEmail,
            admin_phone: formData.adminPhone,
            admin_role: formData.adminRole,
            organization_name: formData.organizationName,
            organization_email: formData.organizationEmail,
            organization_phone: formData.organizationPhone,
            registration_number: formData.registrationNumber,
            registration_80g: formData.registration80G,
            registration_12a: formData.registration12A,
            fcra_number: formData.fcraNumber,
            pan_number: formData.panNumber,
            gst_number: formData.gstNumber,
            mission: formData.mission,
            vision: formData.vision,
            year_established: formData.yearEstablished,
            team_size: formData.teamSize,
            website: formData.website,
            address: formData.address,
            city: formData.city,
            state: formData.state,
            pincode: formData.pincode,
            country: formData.country,
            cause_areas: formData.causeAreas,
            geographic_coverage: formData.geographicCoverage,
            beneficiaries_served: formData.beneficiariesServed,
            facebook: formData.facebook,
            twitter: formData.twitter,
            instagram: formData.instagram,
            linkedin: formData.linkedin,
            youtube: formData.youtube,
            bank_account_name: formData.bankAccountName,
            bank_account_number: formData.bankAccountNumber,
            bank_ifsc: formData.bankIFSC,
            bank_name: formData.bankName,
            bank_branch: formData.bankBranch,
            upi_id: formData.upiId,
            payment_gateway: formData.paymentGateway,
            notifications_email: formData.notificationsEmail,
            notifications_sms: formData.notificationsSMS,
            notifications_whatsapp: formData.notificationsWhatsApp,
            notifications_push: formData.notificationsPush,
            donation_alerts: formData.donationAlerts,
            volunteer_alerts: formData.volunteerAlerts,
            report_reminders: formData.reportReminders,
            language: formData.language,
            theme: formData.theme,
            currency: formData.currency,
            timezone: formData.timezone,
            fiscal_year_start: formData.fiscalYearStart,
            logo: formData.logo,
            cover_image: formData.coverImage,
            primary_color: formData.primaryColor
          })
        });
        
        if (!response.ok) {
          console.error('Error saving to API');
        }
      }
    } catch (err) {
      console.error('Error saving NGO settings:', err);
    }

    // Also save to localStorage as backup
    localStorage.setItem('ngoSettings', JSON.stringify(formData));
    localStorage.setItem('ngoName', formData.organizationName);
    
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      user.name = formData.adminName;
      const isNowComplete = !!(formData.adminName.trim() && formData.adminPhone.trim() && formData.organizationName.trim() && formData.address.trim());
      user.profileComplete = isNowComplete;
      localStorage.setItem('user', JSON.stringify(user));
    }

    const savedSnapshot = cloneFormData(formData);
    setFormData(savedSnapshot);
    setOriginalData(savedSnapshot);
    setHasChanges(false);
    setIsSaving(false);
    showNotification('Settings saved successfully!', 'success');

    // If redirected from action page due to incomplete profile, go back after save
    if (returnTo) {
      const isNowComplete = formData.adminName.trim() && formData.adminPhone.trim() && formData.organizationName.trim() && formData.address.trim();
      if (isNowComplete) {
        setTimeout(() => navigate(returnTo), 1200);
      }
    }
  };

  const handleReset = () => {
    if (originalData) {
      setFormData(cloneFormData(originalData));
      setErrors({});
      setHasChanges(false);
      showNotification('Changes discarded', 'warning');
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      showNotification('Please type DELETE to confirm', 'error');
      return;
    }

    setIsLoading(true);
    
    localStorage.clear();
    setShowDeleteModal(false);
    navigate('/');
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showNotification('Image size should be less than 5MB', 'error');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, logo: reader.result as string }));
        setShowLogoModal(false);
        showNotification('Logo updated!', 'success');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        showNotification('Image size should be less than 10MB', 'error');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, coverImage: reader.result as string }));
        showNotification('Cover image updated!', 'success');
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

  if (isLoading) {
    return (
      <div className="ngo-settings-loading">
        <div className="loading-spinner"></div>
        <p>Loading your settings...</p>
      </div>
    );
  }

  const activeSectionMeta = sections.find((s) => s.id === activeSection) || sections[0];
  const activeSectionIndex = Math.max(0, sections.findIndex((s) => s.id === activeSection));
  const profileCompletion = calculateCompletion(formData);
  const hasCompletedCoreProfile = isNgoCoreProfileComplete(formData);
  const flowProgress = Math.round(((activeSectionIndex + 1) / sections.length) * 100);

  return (
    <div className="ngo-settings-container">
      <header className="ngo-flow-header">
        <div className="ngo-flow-header-inner">
          <div className="ngo-flow-brand">
            <button className="back-btn" onClick={() => navigate('/home')} title="Back to Home">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </button>
            <div
              className="ngo-flow-logo"
              onClick={() => setShowLogoModal(true)}
              title="Update NGO logo"
            >
              {formData.logo ? (
                <img src={formData.logo} alt="Organization Logo" />
              ) : (
                <span className="logo-placeholder"><Building size={20} /></span>
              )}
            </div>
            <span className="ngo-flow-brand-text">ANNAM</span>
          </div>

          <div className="ngo-flow-title">
            <h1>{hasCompletedCoreProfile ? 'NGO Settings' : 'Complete Your NGO Profile'}</h1>
            <p>
              {hasCompletedCoreProfile
                ? `${formData.organizationName || 'Organization'} profile is complete`
                : `Step ${activeSectionIndex + 1} of ${sections.length} — ${activeSectionMeta.label}`}
            </p>
          </div>

          <div className="ngo-flow-completion-pill">
            <span>{profileCompletion}%</span>
          </div>
        </div>
      </header>

      {!hasCompletedCoreProfile && (
        <>
          <div className="ngo-flow-progress-bar">
            <div className="ngo-flow-progress-fill" style={{ width: `${flowProgress}%` }} />
          </div>

          <div className="ngo-flow-steps-row">
            {sections.map((section) => {
              const isDone = isSectionComplete(section.id, formData);
              const isActive = section.id === activeSection;
              return (
                <button
                  key={section.id}
                  type="button"
                  className={`ngo-flow-step ${isDone ? 'done' : ''} ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveSection(section.id)}
                >
                  <div className="ngo-flow-step-circle">
                    {!isActive && isDone ? <span>✓</span> : <span>{section.icon}</span>}
                  </div>
                  <span className="ngo-flow-step-label">{section.label}</span>
                  {section.optional && <span className="ngo-flow-optional-badge">Optional</span>}
                </button>
              );
            })}
          </div>
        </>
      )}

      <div className="ngo-settings-layout">
        <aside className="ngo-settings-sidebar">
          <div className="sidebar-header">
            <h1>NGO Settings</h1>
          </div>

          <div className="sidebar-profile">
            <div className="org-logo" onClick={() => setShowLogoModal(true)}>
              {formData.logo ? (
                <img src={formData.logo} alt="Organization Logo" />
              ) : (
                <span className="logo-placeholder"><Building size={28} /></span>
              )}
              <div className="logo-edit-overlay">
                <Camera size={16} />
              </div>
            </div>

            <div className="profile-info">
              <h3>{formData.organizationName || 'Your Organization'}</h3>
              <p>{formData.organizationEmail || 'organization@email.com'}</p>

              <div className="badges-row">
                <span className="role-badge ngo">
                  <Wheat size={12} /> NGO
                </span>
                <span className={`verification-badge ${verificationStatus}`}>
                  {verificationStatus === 'verified' ? 'Verified' : verificationStatus === 'rejected' ? 'Rejected' : 'Pending'}
                </span>
              </div>
            </div>
          </div>

          <nav className="sidebar-nav">
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                className={`nav-item ${activeSection === section.id ? 'active' : ''}`}
                onClick={() => setActiveSection(section.id)}
              >
                <span className="nav-icon">{section.icon}</span>
                <span className="nav-label">{section.label}</span>
              </button>
            ))}
          </nav>

          <div className="sidebar-footer">
            <div className="completion-indicator">
              <div className="completion-bar">
                <div className="completion-fill" style={{ width: `${profileCompletion}%` }} />
              </div>
              <div className="completion-text">Profile completion: {profileCompletion}%</div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="ngo-settings-main">
          <div className="settings-content">
          
          {/* Organization Section */}
          {activeSection === 'organization' && (
            <section className="settings-section animate-in">
              <div className="section-header">
                <div className="section-title-group">
                  <h2>Organization Details</h2>
                  <p>Basic information about your organization</p>
                </div>
                {verificationStatus === 'verified' && (
                  <div className="verified-badge-large">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
                    </svg>
                    <span>Verified Organization</span>
                  </div>
                )}
              </div>

              <div className="form-grid">
                <div className={`form-group full-width ${errors.organizationName ? 'has-error' : ''}`}>
                  <label htmlFor="organizationName">
                    Organization Name <span className="required">*</span>
                  </label>
                  <div className="input-wrapper">
                    <span className="input-icon"><Building size={16} /></span>
                    <input 
                      type="text" 
                      id="organizationName"
                      name="organizationName" 
                      value={formData.organizationName}
                      onChange={handleChange}
                      placeholder="Enter organization name"
                      className={errors.organizationName ? 'error' : ''}
                    />
                    {formData.organizationName && !errors.organizationName && (
                      <span className="input-success-icon"><Check size={14} /></span>
                    )}
                  </div>
                  {errors.organizationName && <span className="error-message">{errors.organizationName}</span>}
                </div>

                <div className={`form-group ${errors.organizationEmail ? 'has-error' : ''}`}>
                  <label htmlFor="organizationEmail">
                    Organization Email <span className="required">*</span>
                  </label>
                  <div className="input-wrapper">
                    <span className="input-icon"><Mail size={16} /></span>
                    <input 
                      type="email" 
                      id="organizationEmail"
                      name="organizationEmail" 
                      value={formData.organizationEmail}
                      onChange={handleChange}
                      placeholder="contact@organization.org"
                      className={errors.organizationEmail ? 'error' : ''}
                    />
                  </div>
                  {errors.organizationEmail && <span className="error-message">{errors.organizationEmail}</span>}
                </div>

                <div className={`form-group ${errors.organizationPhone ? 'has-error' : ''}`}>
                  <label htmlFor="organizationPhone">
                    Organization Phone
                  </label>
                  <div className="input-wrapper phone-input">
                    <span className="phone-prefix">+91</span>
                    <input 
                      type="tel" 
                      id="organizationPhone"
                      name="organizationPhone" 
                      value={formData.organizationPhone}
                      onChange={(e) => {
                        const formatted = formatPhoneNumber(e.target.value);
                        setFormData(prev => ({ ...prev, organizationPhone: formatted }));
                      }}
                      placeholder="98765 43210"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="yearEstablished">Year Established</label>
                  <select 
                    id="yearEstablished"
                    name="yearEstablished"
                    value={formData.yearEstablished}
                    onChange={handleChange}
                  >
                    <option value="">Select year</option>
                    {Array.from({ length: 75 }, (_, i) => new Date().getFullYear() - i).map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="teamSize">Team Size</label>
                  <select 
                    id="teamSize"
                    name="teamSize"
                    value={formData.teamSize}
                    onChange={handleChange}
                  >
                    <option value="">Select size</option>
                    <option value="1-5">1-5 members</option>
                    <option value="6-15">6-15 members</option>
                    <option value="16-50">16-50 members</option>
                    <option value="51-100">51-100 members</option>
                    <option value="100+">100+ members</option>
                  </select>
                </div>

                <div className={`form-group ${errors.website ? 'has-error' : ''}`}>
                  <label htmlFor="website">Website</label>
                  <div className="input-wrapper">
                    <span className="input-icon"><Globe2 size={16} /></span>
                    <input 
                      type="url" 
                      id="website"
                      name="website" 
                      value={formData.website}
                      onChange={handleChange}
                      placeholder="https://www.organization.org"
                    />
                  </div>
                  {errors.website && <span className="error-message">{errors.website}</span>}
                </div>

                <div className="form-group full-width">
                  <label htmlFor="address">Address</label>
                  <div className="input-wrapper">
                    <span className="input-icon"><MapPin size={16} /></span>
                    <input 
                      type="text" 
                      id="address"
                      name="address" 
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="Street address"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="city">City</label>
                  <input 
                    type="text" 
                    id="city"
                    name="city" 
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="City"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="state">State</label>
                  <select 
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                  >
                    <option value="">Select state</option>
                    <option value="andhra-pradesh">Andhra Pradesh</option>
                    <option value="karnataka">Karnataka</option>
                    <option value="kerala">Kerala</option>
                    <option value="maharashtra">Maharashtra</option>
                    <option value="tamil-nadu">Tamil Nadu</option>
                    <option value="telangana">Telangana</option>
                    <option value="delhi">Delhi</option>
                    <option value="gujarat">Gujarat</option>
                    <option value="rajasthan">Rajasthan</option>
                    <option value="uttar-pradesh">Uttar Pradesh</option>
                    <option value="west-bengal">West Bengal</option>
                    {/* Add more states as needed */}
                  </select>
                </div>

                <div className={`form-group ${errors.pincode ? 'has-error' : ''}`}>
                  <label htmlFor="pincode">Pincode</label>
                  <input 
                    type="text" 
                    id="pincode"
                    name="pincode" 
                    value={formData.pincode}
                    onChange={handleChange}
                    placeholder="560001"
                    maxLength={6}
                  />
                  {errors.pincode && <span className="error-message">{errors.pincode}</span>}
                </div>

                <div className="form-group full-width">
                  <label htmlFor="mission">Mission Statement</label>
                  <textarea
                    id="mission"
                    name="mission"
                    value={formData.mission}
                    onChange={handleChange}
                    placeholder="Describe your organization's mission..."
                    rows={4}
                    maxLength={1000}
                  />
                  <span className="char-count">{formData.mission.length}/1000</span>
                </div>

                <div className="form-group full-width">
                  <label htmlFor="vision">Vision Statement</label>
                  <textarea
                    id="vision"
                    name="vision"
                    value={formData.vision}
                    onChange={handleChange}
                    placeholder="Describe your organization's vision..."
                    rows={3}
                    maxLength={500}
                  />
                  <span className="char-count">{formData.vision.length}/500</span>
                </div>
              </div>
            </section>
          )}

          {/* Admin Profile Section */}
          {activeSection === 'admin' && (
            <section className="settings-section animate-in">
              <div className="section-header">
                <div className="section-title-group">
                  <h2>Admin Profile</h2>
                  <p>Your personal information as the organization admin</p>
                </div>
              </div>

              <div className="form-grid">
                <div className={`form-group ${errors.adminName ? 'has-error' : ''}`}>
                  <label htmlFor="adminName">
                    Full Name <span className="required">*</span>
                  </label>
                  <div className="input-wrapper">
                    <span className="input-icon"><User size={16} /></span>
                    <input 
                      type="text" 
                      id="adminName"
                      name="adminName" 
                      value={formData.adminName}
                      onChange={handleChange}
                      placeholder="Enter your full name"
                      className={errors.adminName ? 'error' : ''}
                    />
                  </div>
                  {errors.adminName && <span className="error-message">{errors.adminName}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="adminRole">Role in Organization</label>
                  <select 
                    id="adminRole"
                    name="adminRole"
                    value={formData.adminRole}
                    onChange={handleChange}
                  >
                    <option value="Admin">Administrator</option>
                    <option value="Founder">Founder</option>
                    <option value="Director">Director</option>
                    <option value="CEO">CEO</option>
                    <option value="Manager">Manager</option>
                    <option value="Coordinator">Coordinator</option>
                  </select>
                </div>

                <div className={`form-group ${errors.adminEmail ? 'has-error' : ''}`}>
                  <label htmlFor="adminEmail">
                    Email Address <span className="required">*</span>
                  </label>
                  <div className="input-wrapper">
                    <span className="input-icon"><Mail size={16} /></span>
                    <input 
                      type="email" 
                      id="adminEmail"
                      name="adminEmail" 
                      value={formData.adminEmail}
                      onChange={handleChange}
                      placeholder="admin@organization.org"
                      className={errors.adminEmail ? 'error' : ''}
                    />
                  </div>
                  {errors.adminEmail && <span className="error-message">{errors.adminEmail}</span>}
                </div>

                <div className={`form-group ${errors.adminPhone ? 'has-error' : ''}`}>
                  <label htmlFor="adminPhone">
                    Phone Number
                  </label>
                  <div className="input-wrapper phone-input">
                    <span className="phone-prefix">+91</span>
                    <input 
                      type="tel" 
                      id="adminPhone"
                      name="adminPhone" 
                      value={formData.adminPhone}
                      onChange={(e) => {
                        const formatted = formatPhoneNumber(e.target.value);
                        setFormData(prev => ({ ...prev, adminPhone: formatted }));
                      }}
                      placeholder="98765 43210"
                    />
                  </div>
                  {errors.adminPhone && <span className="error-message">{errors.adminPhone}</span>}
                </div>
              </div>

              {/* Team Members Preview */}
              <div className="subsection">
                <div className="subsection-header">
                  <h3>Team Members</h3>
                  <button className="btn-secondary-small">+ Add Member</button>
                </div>
                <div className="team-members-grid">
                  <div className="team-member-card">
                    <div className="member-avatar">
                      {formData.adminName ? formData.adminName.charAt(0).toUpperCase() : 'A'}
                    </div>
                    <div className="member-info">
                      <h4>{formData.adminName || 'Admin'}</h4>
                      <p>{formData.adminRole}</p>
                    </div>
                    <span className="member-status owner">Owner</span>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Cause & Impact Section */}
          {activeSection === 'cause' && (
            <section className="settings-section animate-in">
              <div className="section-header">
                <div className="section-title-group">
                  <h2>Cause & Impact</h2>
                  <p>Define your focus areas and measure your impact</p>
                </div>
              </div>

              <div className="cause-areas-section">
                <h3>Cause Areas</h3>
                <p className="section-description">Select the areas your organization works in (max 5)</p>
                
                <div className="cause-areas-grid">
                  {causeAreaOptions.map(cause => (
                    <label 
                      key={cause.id}
                      className={`cause-card ${formData.causeAreas.includes(cause.id) ? 'selected' : ''} ${
                        formData.causeAreas.length >= 5 && !formData.causeAreas.includes(cause.id) ? 'disabled' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.causeAreas.includes(cause.id)}
                        onChange={() => handleCauseAreaToggle(cause.id)}
                        disabled={formData.causeAreas.length >= 5 && !formData.causeAreas.includes(cause.id)}
                      />
                      <span className="cause-icon">{cause.icon}</span>
                      <span className="cause-label">{cause.label}</span>
                      {formData.causeAreas.includes(cause.id) && (
                        <span className="cause-check"><Check size={14} /></span>
                      )}
                    </label>
                  ))}
                </div>
                <span className="selection-count">
                  {formData.causeAreas.length}/5 selected
                </span>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="geographicCoverage">Geographic Coverage</label>
                  <select 
                    id="geographicCoverage"
                    name="geographicCoverage"
                    value={formData.geographicCoverage}
                    onChange={handleChange}
                  >
                    <option value="local">Local (City/District)</option>
                    <option value="state">State Level</option>
                    <option value="regional">Regional (Multiple States)</option>
                    <option value="national">National</option>
                    <option value="international">International</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="beneficiariesServed">Beneficiaries Served</label>
                  <select 
                    id="beneficiariesServed"
                    name="beneficiariesServed"
                    value={formData.beneficiariesServed}
                    onChange={handleChange}
                  >
                    <option value="">Select range</option>
                    <option value="1-100">1-100</option>
                    <option value="100-500">100-500</option>
                    <option value="500-1000">500-1,000</option>
                    <option value="1000-5000">1,000-5,000</option>
                    <option value="5000-10000">5,000-10,000</option>
                    <option value="10000+">10,000+</option>
                  </select>
                </div>
              </div>

              {/* Impact Stats */}
              <div className="impact-stats-card">
                <h3><BarChart3 size={18} /> Your Impact</h3>
                <div className="stats-grid">
                  <div className="stat-item">
                    <span className="stat-value">₹2.5L</span>
                    <span className="stat-label">Total Donations</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">45</span>
                    <span className="stat-label">Active Donors</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">12</span>
                    <span className="stat-label">Volunteers</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-value">1,250</span>
                    <span className="stat-label">Lives Impacted</span>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Compliance Section */}
          {activeSection === 'compliance' && (
            <section className="settings-section animate-in">
              <div className="section-header">
                <div className="section-title-group">
                  <h2>Compliance & Registrations</h2>
                  <p>Legal registrations and compliance documents</p>
                </div>
                <div className="compliance-status">
                  {verificationStatus === 'verified' ? (
                    <span className="status-badge verified">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
                      </svg>
                      Fully Compliant
                    </span>
                  ) : (
                    <span className="status-badge pending"><Clock size={14} /> Verification Pending</span>
                  )}
                </div>
              </div>

              <div className="compliance-grid">
                <div className="compliance-card">
                  <div className="compliance-header">
                    <div className="compliance-icon"><ClipboardList size={20} /></div>
                    <div className="compliance-info">
                      <h4>Registration Number</h4>
                      <p>Society/Trust Registration</p>
                    </div>
                    <span className={`compliance-status ${formData.registrationNumber ? 'complete' : 'pending'}`}>
                      {formData.registrationNumber ? <><Check size={12} /> Added</> : '○ Pending'}
                    </span>
                  </div>
                  <input 
                    type="text" 
                    name="registrationNumber" 
                    value={formData.registrationNumber}
                    onChange={handleChange}
                    placeholder="Enter registration number"
                  />
                </div>

                <div className="compliance-card">
                  <div className="compliance-header">
                    <div className="compliance-icon"><Tag size={20} /></div>
                    <div className="compliance-info">
                      <h4>80G Certificate</h4>
                      <p>Tax exemption for donors</p>
                    </div>
                    <span className={`compliance-status ${formData.registration80G ? 'complete' : 'pending'}`}>
                      {formData.registration80G ? <><Check size={12} /> Added</> : '○ Pending'}
                    </span>
                  </div>
                  <input 
                    type="text" 
                    name="registration80G" 
                    value={formData.registration80G}
                    onChange={handleChange}
                    placeholder="80G registration number"
                  />
                </div>

                <div className="compliance-card">
                  <div className="compliance-header">
                    <div className="compliance-icon"><FileText size={20} /></div>
                    <div className="compliance-info">
                      <h4>12A Certificate</h4>
                      <p>Income tax exemption</p>
                    </div>
                    <span className={`compliance-status ${formData.registration12A ? 'complete' : 'pending'}`}>
                      {formData.registration12A ? <><Check size={12} /> Added</> : '○ Pending'}
                    </span>
                  </div>
                  <input 
                    type="text" 
                    name="registration12A" 
                    value={formData.registration12A}
                    onChange={handleChange}
                    placeholder="12A registration number"
                  />
                </div>

                <div className="compliance-card">
                  <div className="compliance-header">
                    <div className="compliance-icon"><Globe size={20} /></div>
                    <div className="compliance-info">
                      <h4>FCRA Registration</h4>
                      <p>Foreign contributions</p>
                    </div>
                    <span className={`compliance-status ${formData.fcraNumber ? 'complete' : 'pending'}`}>
                      {formData.fcraNumber ? <><Check size={12} /> Added</> : '○ Optional'}
                    </span>
                  </div>
                  <input 
                    type="text" 
                    name="fcraNumber" 
                    value={formData.fcraNumber}
                    onChange={handleChange}
                    placeholder="FCRA registration number"
                  />
                </div>

                <div className={`compliance-card ${errors.panNumber ? 'has-error' : ''}`}>
                  <div className="compliance-header">
                    <div className="compliance-icon"><FileText size={20} /></div>
                    <div className="compliance-info">
                      <h4>PAN Number</h4>
                      <p>Organization PAN</p>
                    </div>
                    <span className={`compliance-status ${formData.panNumber ? 'complete' : 'pending'}`}>
                      {formData.panNumber ? <><Check size={12} /> Added</> : '○ Required'}
                    </span>
                  </div>
                  <input 
                    type="text" 
                    name="panNumber" 
                    value={formData.panNumber}
                    onChange={(e) => {
                      const value = e.target.value.toUpperCase();
                      setFormData(prev => ({ ...prev, panNumber: value }));
                    }}
                    placeholder="ABCDE1234F"
                    maxLength={10}
                  />
                  {errors.panNumber && <span className="error-message">{errors.panNumber}</span>}
                </div>

                <div className="compliance-card">
                  <div className="compliance-header">
                    <div className="compliance-icon"><BarChart3 size={20} /></div>
                    <div className="compliance-info">
                      <h4>GST Number</h4>
                      <p>If applicable</p>
                    </div>
                    <span className={`compliance-status ${formData.gstNumber ? 'complete' : 'pending'}`}>
                      {formData.gstNumber ? <><Check size={12} /> Added</> : '○ Optional'}
                    </span>
                  </div>
                  <input 
                    type="text" 
                    name="gstNumber" 
                    value={formData.gstNumber}
                    onChange={(e) => {
                      const value = e.target.value.toUpperCase();
                      setFormData(prev => ({ ...prev, gstNumber: value }));
                    }}
                    placeholder="GST number"
                    maxLength={15}
                  />
                </div>
              </div>

              <div className="upload-documents-section">
                <h3>Upload Documents</h3>
                <p className="section-description">Upload scanned copies of your registration documents</p>
                
                <div className="document-upload-grid">
                  <div className="document-upload-card">
                    <div className="upload-icon"><Upload size={20} /></div>
                    <h4>Registration Certificate</h4>
                    <p>PDF, max 5MB</p>
                    <label className="upload-btn">
                      <input type="file" accept=".pdf" hidden />
                      Upload
                    </label>
                  </div>
                  <div className="document-upload-card">
                    <div className="upload-icon"><Upload size={20} /></div>
                    <h4>80G Certificate</h4>
                    <p>PDF, max 5MB</p>
                    <label className="upload-btn">
                      <input type="file" accept=".pdf" hidden />
                      Upload
                    </label>
                  </div>
                  <div className="document-upload-card">
                    <div className="upload-icon"><Upload size={20} /></div>
                    <h4>12A Certificate</h4>
                    <p>PDF, max 5MB</p>
                    <label className="upload-btn">
                      <input type="file" accept=".pdf" hidden />
                      Upload
                    </label>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Payment/Donation Section */}
          {activeSection === 'payment' && (
            <section className="settings-section animate-in">
              <div className="section-header">
                <div className="section-title-group">
                  <h2>Donation Settings</h2>
                  <p>Configure how you receive donations</p>
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
                      <span className="input-icon"><Building size={16} /></span>
                      <input 
                        type="text" 
                        id="bankAccountName"
                        name="bankAccountName" 
                        value={formData.bankAccountName}
                        onChange={handleChange}
                        placeholder="Organization name as per bank"
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
                      <option value="kotak">Kotak Mahindra Bank</option>
                      <option value="yes">Yes Bank</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="bankBranch">Branch Name</label>
                    <input 
                      type="text" 
                      id="bankBranch"
                      name="bankBranch" 
                      value={formData.bankBranch}
                      onChange={handleChange}
                      placeholder="Branch name"
                    />
                  </div>

                  <div className={`form-group ${errors.bankAccountNumber ? 'has-error' : ''}`}>
                    <label htmlFor="bankAccountNumber">Account Number</label>
                    <div className="input-wrapper">
                      <span className="input-icon"><Landmark size={16} /></span>
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
                  <div className="form-group full-width">
                    <label htmlFor="upiId">UPI ID</label>
                    <div className="input-wrapper">
                      <span className="input-icon"><Smartphone size={16} /></span>
                      <input 
                        type="text" 
                        id="upiId"
                        name="upiId" 
                        value={formData.upiId}
                        onChange={handleChange}
                        placeholder="organization@upi"
                      />
                    </div>
                    <span className="input-hint">
                      Supports: Google Pay, PhonePe, Paytm, BHIM
                    </span>
                  </div>
                </div>

                <div className="divider">
                  <span>Payment Gateway</span>
                </div>

                <div className="form-group">
                  <label htmlFor="paymentGateway">Online Payment Gateway</label>
                  <select 
                    id="paymentGateway"
                    name="paymentGateway"
                    value={formData.paymentGateway}
                    onChange={handleChange}
                  >
                    <option value="">Select gateway</option>
                    <option value="razorpay">Razorpay</option>
                    <option value="payu">PayU</option>
                    <option value="instamojo">Instamojo</option>
                    <option value="stripe">Stripe</option>
                  </select>
                </div>

                {/* Recent Donations Preview */}
                <div className="donation-history-preview">
                  <div className="preview-header">
                    <h3>Recent Donations</h3>
                    <button className="link-btn">View All →</button>
                  </div>
                  <div className="donation-list">
                    <div className="donation-item">
                      <div className="donation-icon"><HeartHandshake size={16} /></div>
                      <div className="donation-details">
                        <h4>Anonymous Donor</h4>
                        <p>2 hours ago</p>
                      </div>
                      <div className="donation-amount">+₹5,000</div>
                    </div>
                    <div className="donation-item">
                      <div className="donation-icon"><HeartHandshake size={16} /></div>
                      <div className="donation-details">
                        <h4>Rahul Sharma</h4>
                        <p>Yesterday</p>
                      </div>
                      <div className="donation-amount">+₹2,500</div>
                    </div>
                    <div className="donation-item">
                      <div className="donation-icon"><HeartHandshake size={16} /></div>
                      <div className="donation-details">
                        <h4>Priya Patel</h4>
                        <p>3 days ago</p>
                      </div>
                      <div className="donation-amount">+₹10,000</div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Social Media Section */}
          {activeSection === 'social' && (
            <section className="settings-section animate-in">
              <div className="section-header">
                <div className="section-title-group">
                  <h2>Social Media</h2>
                  <p>Connect your social media accounts</p>
                </div>
              </div>

              <div className="social-media-grid">
                <div className="social-card facebook">
                  <div className="social-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </div>
                  <div className="social-content">
                    <h4>Facebook</h4>
                    <input 
                      type="url" 
                      name="facebook" 
                      value={formData.facebook}
                      onChange={handleChange}
                      placeholder="https://facebook.com/yourpage"
                    />
                  </div>
                  <span className={`social-status ${formData.facebook ? 'connected' : ''}`}>
                    {formData.facebook ? <><Check size={12} /> Connected</> : 'Not connected'}
                  </span>
                </div>

                <div className="social-card twitter">
                  <div className="social-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </div>
                  <div className="social-content">
                    <h4>X (Twitter)</h4>
                    <input 
                      type="url" 
                      name="twitter" 
                      value={formData.twitter}
                      onChange={handleChange}
                      placeholder="https://x.com/yourhandle"
                    />
                  </div>
                  <span className={`social-status ${formData.twitter ? 'connected' : ''}`}>
                    {formData.twitter ? <><Check size={12} /> Connected</> : 'Not connected'}
                  </span>
                </div>

                <div className="social-card instagram">
                  <div className="social-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </div>
                  <div className="social-content">
                    <h4>Instagram</h4>
                    <input 
                      type="url" 
                      name="instagram" 
                      value={formData.instagram}
                      onChange={handleChange}
                      placeholder="https://instagram.com/yourhandle"
                    />
                  </div>
                  <span className={`social-status ${formData.instagram ? 'connected' : ''}`}>
                    {formData.instagram ? <><Check size={12} /> Connected</> : 'Not connected'}
                  </span>
                </div>

                <div className="social-card linkedin">
                  <div className="social-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                  </div>
                  <div className="social-content">
                    <h4>LinkedIn</h4>
                    <input 
                      type="url" 
                      name="linkedin" 
                      value={formData.linkedin}
                      onChange={handleChange}
                      placeholder="https://linkedin.com/company/yourorg"
                    />
                  </div>
                  <span className={`social-status ${formData.linkedin ? 'connected' : ''}`}>
                    {formData.linkedin ? <><Check size={12} /> Connected</> : 'Not connected'}
                  </span>
                </div>

                <div className="social-card youtube">
                  <div className="social-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                  </div>
                  <div className="social-content">
                    <h4>YouTube</h4>
                    <input 
                      type="url" 
                      name="youtube" 
                      value={formData.youtube}
                      onChange={handleChange}
                      placeholder="https://youtube.com/@yourchannel"
                    />
                  </div>
                  <span className={`social-status ${formData.youtube ? 'connected' : ''}`}>
                    {formData.youtube ? <><Check size={12} /> Connected</> : 'Not connected'}
                  </span>
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
                      <p>Get instant updates about donations and activities</p>
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
                      <p>Receive detailed reports and summaries via email</p>
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

                <div className="notification-group">
                  <h3>Activity Alerts</h3>
                  
                  <div className="toggle-card">
                    <div className="toggle-icon donation">
                      <HeartHandshake size={20} />
                    </div>
                    <div className="toggle-content">
                      <h4>Donation Alerts</h4>
                      <p>Get notified when you receive a donation</p>
                    </div>
                    <label className="toggle-switch">
                      <input 
                        type="checkbox" 
                        checked={formData.donationAlerts}
                        onChange={() => handleToggle('donationAlerts')} 
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="toggle-card">
                    <div className="toggle-icon volunteer">
                      <Users size={20} />
                    </div>
                    <div className="toggle-content">
                      <h4>Volunteer Alerts</h4>
                      <p>Notifications about new volunteer applications</p>
                    </div>
                    <label className="toggle-switch">
                      <input 
                        type="checkbox" 
                        checked={formData.volunteerAlerts}
                        onChange={() => handleToggle('volunteerAlerts')} 
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="toggle-card">
                    <div className="toggle-icon report">
                      <BarChart3 size={20} />
                    </div>
                    <div className="toggle-content">
                      <h4>Report Reminders</h4>
                      <p>Reminders for submitting compliance reports</p>
                    </div>
                    <label className="toggle-switch">
                      <input 
                        type="checkbox" 
                        checked={formData.reportReminders}
                        onChange={() => handleToggle('reportReminders')} 
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
                  <h3><Globe2 size={18} /> Language</h3>
                  <select 
                    name="language" 
                    value={formData.language}
                    onChange={handleChange}
                  >
                    <option value="English">English</option>
                    <option value="Hindi">Hindi (हिंदी)</option>
                    <option value="Marathi">Marathi (मराठी)</option>
                    <option value="Tamil">Tamil (தமிழ்)</option>
                    <option value="Telugu">Telugu (తెలుగు)</option>
                    <option value="Kannada">Kannada (ಕನ್ನಡ)</option>
                    <option value="Bengali">Bengali (বাংলা)</option>
                    <option value="Gujarati">Gujarati (ગુજરાતી)</option>
                  </select>
                </div>

                <div className="preference-card">
                  <h3><Palette size={18} /> Theme</h3>
                  <div className="theme-options">
                    <label className={`theme-option ${formData.theme === 'light' ? 'selected' : ''}`}>
                      <input
                        type="radio"
                        name="theme"
                        value="light"
                        checked={formData.theme === 'light'}
                        onChange={handleChange}
                      />
                      <span className="theme-preview light"><Sun size={16} /></span>
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
                      <span className="theme-preview dark"><Moon size={16} /></span>
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
                      <span className="theme-preview system"><Monitor size={16} /></span>
                      <span>System</span>
                    </label>
                  </div>
                </div>

                <div className="preference-card">
                  <h3><Landmark size={18} /> Currency</h3>
                  <select 
                    name="currency" 
                    value={formData.currency}
                    onChange={handleChange}
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                  </select>
                </div>

                <div className="preference-card">
                  <h3><Clock size={18} /> Timezone</h3>
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

                <div className="preference-card">
                  <h3><Calendar size={18} /> Fiscal Year</h3>
                  <select 
                    name="fiscalYearStart" 
                    value={formData.fiscalYearStart}
                    onChange={handleChange}
                  >
                    <option value="january">January - December</option>
                    <option value="april">April - March (India)</option>
                    <option value="july">July - June</option>
                  </select>
                </div>
              </div>
            </section>
          )}

          {/* Branding Section */}
          {activeSection === 'branding' && (
            <section className="settings-section animate-in">
              <div className="section-header">
                <div className="section-title-group">
                  <h2>Branding</h2>
                  <p>Customize your organization's appearance</p>
                </div>
              </div>

              <div className="branding-section">
                <div className="branding-preview">
                  <div 
                    className="cover-image-container"
                    style={{ backgroundImage: formData.coverImage ? `url(${formData.coverImage})` : 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                  >
                    <label className="cover-upload-btn">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCoverUpload}
                        hidden
                      />
                      <Camera size={14} /> Change Cover
                    </label>
                  </div>
                  <div className="branding-logo-section">
                    <div 
                      className="branding-logo"
                      onClick={() => setShowLogoModal(true)}
                    >
                      {formData.logo ? (
                        <img src={formData.logo} alt="Logo" />
                      ) : (
                        <span><Building size={32} /></span>
                      )}
                      <div className="logo-edit-overlay"><Camera size={14} /></div>
                    </div>
                    <div className="branding-info">
                      <h3>{formData.organizationName || 'Your Organization'}</h3>
                      <p>{formData.mission ? formData.mission.substring(0, 100) + '...' : 'Your mission statement'}</p>
                    </div>
                  </div>
                </div>

                <div className="color-picker-section">
                  <h3>Primary Color</h3>
                  <div className="color-options">
                    {['#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#ef4444'].map(color => (
                      <label 
                        key={color}
                        className={`color-option ${formData.primaryColor === color ? 'selected' : ''}`}
                        style={{ backgroundColor: color }}
                      >
                        <input
                          type="radio"
                          name="primaryColor"
                          value={color}
                          checked={formData.primaryColor === color}
                          onChange={handleChange}
                        />
                        {formData.primaryColor === color && <span className="check"><Check size={12} /></span>}
                      </label>
                    ))}
                    <label className="color-option custom">
                      <input
                        type="color"
                        name="primaryColor"
                        value={formData.primaryColor}
                        onChange={handleChange}
                      />
                      <span>Custom</span>
                    </label>
                  </div>
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
                  <div className="security-icon"><ShieldCheck size={20} /></div>
                  <div className="security-content">
                    <h4>Change Password</h4>
                    <p>Update your password regularly to keep your account secure</p>
                  </div>
                  <button className="btn-secondary">Change</button>
                </div>

                <div className="security-card">
                  <div className="security-icon"><Smartphone size={20} /></div>
                  <div className="security-content">
                    <h4>Two-Factor Authentication</h4>
                    <p>Add an extra layer of security to your account</p>
                  </div>
                  <button className="btn-secondary">Enable</button>
                </div>

                <div className="security-card">
                  <div className="security-icon"><Users size={20} /></div>
                  <div className="security-content">
                    <h4>Team Access</h4>
                    <p>Manage team member permissions and access levels</p>
                  </div>
                  <button className="btn-secondary">Manage</button>
                </div>

                <div className="security-card">
                  <div className="security-icon"><ClipboardList size={20} /></div>
                  <div className="security-content">
                    <h4>Login History</h4>
                    <p>View recent login activity on your account</p>
                  </div>
                  <button className="btn-secondary">View</button>
                </div>

                <div className="security-card">
                  <div className="security-icon"><Upload size={20} /></div>
                  <div className="security-content">
                    <h4>Export Data</h4>
                    <p>Download a copy of your organization data</p>
                  </div>
                  <button className="btn-secondary">Export</button>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="danger-zone">
                <div className="danger-header">
                  <h3><AlertTriangle size={18} /> Danger Zone</h3>
                  <p>Irreversible and destructive actions</p>
                </div>
                
                <div className="danger-actions">
                  <div className="danger-item">
                    <div className="danger-content">
                      <h4>Deactivate Account</h4>
                      <p>Temporarily disable your organization account. You can reactivate anytime.</p>
                    </div>
                    <button className="btn-warning">Deactivate</button>
                  </div>
                  
                  <div className="danger-item">
                    <div className="danger-content">
                      <h4>Delete Account</h4>
                      <p>Permanently delete your organization and all associated data.</p>
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
        {hasChanges && (
        <div className="settings-footer visible">
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
        )}
        </main>
      </div>

      {/* Toast Notification */}
      <div className={`toast ${showToast ? 'visible' : ''} ${toastType}`}>
        <div className="toast-icon">
          {toastType === 'success' && <Check size={16} />}
          {toastType === 'error' && <X size={16} />}
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
              <div className="modal-icon danger"><AlertTriangle size={32} /></div>
              <h2>Delete Organization Account</h2>
              <p>This action cannot be undone. All your data will be permanently deleted.</p>
            </div>
            
            <div className="modal-body">
              <div className="delete-warning">
                <h4>This will delete:</h4>
                <ul>
                  <li>Your organization profile and information</li>
                  <li>All donation records and history</li>
                  <li>Volunteer and beneficiary data</li>
                  <li>Compliance documents and certificates</li>
                  <li>All team member access</li>
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
                Delete Organization
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logo Upload Modal */}
      {showLogoModal && (
        <div className="modal-overlay" onClick={() => setShowLogoModal(false)}>
          <div className="modal image-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Update Organization Logo</h2>
              <button className="modal-close" onClick={() => setShowLogoModal(false)}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="image-preview-large">
                {formData.logo ? (
                  <img src={formData.logo} alt="Logo" />
                ) : (
                  <div className="placeholder-logo"><Building size={48} /></div>
                )}
              </div>
              
              <div className="image-upload-options">
                <label className="upload-btn primary">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    hidden
                  />
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  Upload Logo
                </label>
                
                {formData.logo && (
                  <button 
                    className="upload-btn danger"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, logo: '' }));
                      setShowLogoModal(false);
                    }}
                  >
                    Remove Logo
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
function isSectionComplete(sectionId: string, data: FormData): boolean {
  switch (sectionId) {
    case 'organization':
      return !!(data.organizationName.trim() && data.organizationEmail.trim() && data.organizationPhone.trim());
    case 'admin':
      return !!(data.adminName.trim() && data.adminEmail.trim() && data.adminPhone.trim());
    case 'cause':
      return !!(data.mission.trim() && data.causeAreas.length > 0);
    case 'compliance':
      return !!(data.registrationNumber.trim() && data.panNumber.trim());
    case 'payment':
      return !!(data.bankAccountName.trim() && data.bankAccountNumber.trim() && data.bankIFSC.trim());
    case 'social':
      return !!(
        data.facebook.trim() ||
        data.twitter.trim() ||
        data.instagram.trim() ||
        data.linkedin.trim() ||
        data.youtube.trim()
      );
    case 'branding':
      return !!(data.logo || data.coverImage);
    case 'preferences':
    case 'notifications':
    case 'security':
      return false;
    default:
      return false;
  }
}

function isNgoCoreProfileComplete(data: FormData): boolean {
  return !!(
    data.adminName.trim() &&
    data.adminPhone.trim() &&
    data.organizationName.trim() &&
    data.address.trim()
  );
}

function calculateCompletion(data: FormData): number {
  const fields = [
    data.organizationName,
    data.organizationEmail,
    data.adminName,
    data.adminEmail,
    data.mission,
    data.registrationNumber,
    data.panNumber,
    data.address,
    data.city,
    data.bankAccountNumber,
    data.causeAreas.length > 0 ? 'filled' : '',
  ];
  
  const filled = fields.filter(field => field && (typeof field === 'string' ? field.trim() !== '' : true)).length;
  return Math.round((filled / fields.length) * 100);
}

export default NGOSettings;
