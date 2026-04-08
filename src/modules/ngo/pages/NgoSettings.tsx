import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from '../../../config/api';
import '../../farmer/pages/FarmerSettings.css';

// Icons as SVG components
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { MapPin } from 'lucide-react';

// Custom Pin Icon
const pinIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function LocationMarker({ position, setPosition }: { position: [number, number] | null, setPosition: (p: [number, number]) => void }) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });
  return position === null ? null : (
    <Marker position={position} icon={pinIcon}></Marker>
  );
}
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
  Map: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon>
      <line x1="9" y1="3" x2="9" y2="21"></line>
      <line x1="15" y1="3" x2="15" y2="21"></line>
    </svg>
  ),
};

type NgoSettingsForm = {
  organizationName: string;
  organizationEmail: string;
  organizationPhone: string;
  website: string;
  yearEstablished: string;
  teamSize: string;
  adminName: string;
  adminEmail: string;
  adminPhone: string;
  mission: string;
  focusAreas: string[];
  beneficiariesServed: string;
  donationTypes: string[];
  availability: string;
  pickupPreferences: string;
  profileImage: string;
  location: {
    lat: number | null;
    lng: number | null;
    address: string;
  };
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

const FOCUS_AREAS = ['Food Rescue', 'Health', 'Education', 'Women Empowerment', 'Child Welfare', 'Environment'];
const DONATION_TYPES = ['Fresh Produce', 'Dry Goods', 'Cooked Meals', 'Dairy', 'Packaged Items'];

const SECTIONS = [
  { id: 'organization', label: 'Organization Info', icon: Icons.Farm },
  { id: 'location', label: 'Location & Routing', icon: Icons.Map },
  { id: 'admin', label: 'Admin Info', icon: Icons.User },
  { id: 'impact', label: 'Cause & Impact', icon: Icons.Shield },
  { id: 'donation', label: 'Donation Preferences', icon: Icons.Heart },
];

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

const NgoSettings: React.FC = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState<NgoSettingsForm>({
    organizationName: '',
    organizationEmail: '',
    organizationPhone: '',
    website: '',
    yearEstablished: '',
    teamSize: '',
    adminName: '',
    adminEmail: '',
    adminPhone: '',
    mission: '',
    focusAreas: [],
    beneficiariesServed: '',
    donationTypes: [],
    availability: 'weekdays',
    pickupPreferences: '',
    profileImage: '',
    location: {
      lat: null,
      lng: null,
      address: '',
    },
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('organization');
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

  const profileCompletion = useMemo(() => {
    const fields = [
      form.organizationName,
      form.organizationEmail,
      form.organizationPhone,
      form.adminName,
      form.adminEmail,
      form.adminPhone,
      form.mission,
      form.focusAreas.length > 0,
      form.donationTypes.length > 0,
      form.availability,
    ];
    const completed = fields.filter(Boolean).length;
    return Math.round((completed / fields.length) * 100);
  }, [form]);

  const isProfileComplete = profileCompletion === 100;

  useEffect(() => {
    const loadNgoProfile = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (!user?.id) {
          setIsLoading(false);
          return;
        }

        setForm((prev) => ({
          ...prev,
          adminName: user.name || prev.adminName,
          adminEmail: user.email || prev.adminEmail,
          organizationName: localStorage.getItem('ngoName') || prev.organizationName,
        }));

        const response = await fetch(API_ENDPOINTS.ngoSettings(user.id.toString()));
        if (!response.ok) {
          throw new Error(`Failed to load settings (${response.status})`);
        }

        const data = await response.json();
        if (data && Object.keys(data).length > 1) {
          setForm((prev) => ({
            ...prev,
            adminName: data.admin_name || prev.adminName,
            adminEmail: data.admin_email || prev.adminEmail,
            adminPhone: data.admin_phone || prev.adminPhone,
            organizationName: data.organization_name || prev.organizationName,
            organizationEmail: data.organization_email || prev.organizationEmail,
            organizationPhone: data.organization_phone || prev.organizationPhone,
            website: data.website || prev.website,
            yearEstablished: data.year_established || prev.yearEstablished,
            teamSize: data.team_size || prev.teamSize,
            mission: data.mission || prev.mission,
            focusAreas: Array.isArray(data.cause_areas) ? data.cause_areas : prev.focusAreas,
            beneficiariesServed: data.beneficiaries_served || prev.beneficiariesServed,
            donationTypes: Array.isArray(data.donation_types) ? data.donation_types : prev.donationTypes,
            availability: data.availability || prev.availability,
            pickupPreferences: data.pickup_preferences || prev.pickupPreferences,
            profileImage: data.profile_image || prev.profileImage,
            location: data.location || { lat: data.gps_lat || null, lng: data.gps_lng || null, address: data.address || '' },
          }));
        }
      } catch (err) {
        console.error('Error loading NGO settings:', err);
        addToast('Failed to load NGO settings. Please try again.', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadNgoProfile();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onFocusAreaToggle = (area: string) => {
    setForm((prev) => ({
      ...prev,
      focusAreas: prev.focusAreas.includes(area)
        ? prev.focusAreas.filter((item) => item !== area)
        : [...prev.focusAreas, area],
    }));
  };

  const onDonationTypeToggle = (type: string) => {
    setForm((prev) => ({
      ...prev,
      donationTypes: prev.donationTypes.includes(type)
        ? prev.donationTypes.filter((item) => item !== type)
        : [...prev.donationTypes, type],
    }));
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

  const handleUseCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      addToast('Geolocation is not supported by your browser', 'error');
      return;
    }
    
    addToast('Fetching your location...', 'info');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setForm(prev => ({
          ...prev,
          location: { ...prev.location, lat: latitude, lng: longitude }
        }));
        
        try {
           const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
           const data = await res.json();
           if(data && data.display_name) {
               setForm(prev => ({
                 ...prev,
                 location: { lat: latitude, lng: longitude, address: data.display_name }
               }));
           }
        } catch(e) { /* ignore reverse geocode fail */ }
        
        addToast('Location updated successfully', 'success');
      },
      () => {
        addToast('Unable to retrieve your location. Please check browser permissions.', 'error');
      }
    );
  }, [addToast]);

  const handleGeocodeAddress = useCallback(async () => {
    if (!form.location.address) {
      addToast('Please enter an address to search', 'warning');
      return;
    }
    try {
      addToast('Searching for address...', 'info');
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(form.location.address)}`);
      const data = await res.json();
      if(data && data.length > 0) {
          const { lat, lon } = data[0];
          setForm(prev => ({
              ...prev,
              location: { ...prev.location, lat: parseFloat(lat), lng: parseFloat(lon) }
          }));
          addToast('Location pinned on map.', 'success');
      } else {
          addToast('Address not found. Please try again or use the map picker.', 'warning');
      }
    } catch(e) {
      addToast('Failed to find address.', 'error');
    }
  }, [form.location.address, addToast]);

  const buildSettingsPayload = (userId: string) => ({
    ngo_id: userId,
    user_id: userId,
    admin_name: form.adminName,
    admin_email: form.adminEmail,
    admin_phone: form.adminPhone,
    organization_name: form.organizationName,
    organization_email: form.organizationEmail,
    organization_phone: form.organizationPhone,
    mission: form.mission,
    year_established: form.yearEstablished,
    team_size: form.teamSize,
    website: form.website,
    cause_areas: form.focusAreas,
    beneficiaries_served: form.beneficiariesServed,
    donation_types: form.donationTypes,
    availability: form.availability,
    pickup_preferences: form.pickupPreferences,
    profile_image: form.profileImage,
    profile_complete: isProfileComplete,
    location: form.location,
  });

  const persistSettings = async (successMessage: string) => {
    if (!form.location.lat || !form.location.lng) {
      addToast('Location is required for donation routing', 'error');
      return;
    }
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user?.id) {
      addToast('Unable to save: user not found. Please log in again.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const payload = buildSettingsPayload(user.id.toString());
      const response = await fetch(API_ENDPOINTS.ngoSettings(user.id.toString()), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Save failed with status ${response.status}`);
      }

      localStorage.setItem('ngoSettings', JSON.stringify(payload));
      localStorage.setItem('ngoName', form.organizationName);
      localStorage.setItem('ngoDonationPrefs', JSON.stringify({
        types: form.donationTypes,
        availability: form.availability,
        notes: form.pickupPreferences,
      }));

      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        parsed.name = form.adminName || parsed.name;
        parsed.email = form.adminEmail || parsed.email;
        parsed.profileComplete = isProfileComplete;
        localStorage.setItem('user', JSON.stringify(parsed));
      }

      addToast(successMessage, 'success');
    } catch (err) {
      console.error('Error saving NGO settings:', err);
      addToast('Failed to save settings. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const onSaveAll = () => persistSettings('Settings saved successfully!');

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

        <button
          className="fs-mobile-menu-toggle"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <aside className={`fs-sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
          <div className="fs-sidebar-header">
            <div className="fs-profile-preview">
              <div className="fs-avatar-wrapper">
                {form.profileImage ? (
                  <img src={form.profileImage} alt="Organization Logo" className="fs-avatar" />
                ) : (
                  <div className="fs-avatar-placeholder">
                    <Icons.Farm />
                  </div>
                )}
              </div>
              <div className="fs-profile-info">
                <h3>{form.organizationName || 'NGO'}</h3>
                <span
                  className="fs-status-badge"
                  style={{ backgroundColor: '#dcfce7', color: '#166534' }}
                >
                  Active
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

        <main className="fs-main">
          <header className="fs-header">
            <div className="fs-header-row">
              <div>
                <h1>NGO Settings</h1>
                <p>Manage your organization, admin contacts, and donation preferences</p>
              </div>
              <button
                className={`fs-btn fs-btn-primary ${isSaving ? 'loading' : ''}`}
                onClick={onSaveAll}
                disabled={!isProfileComplete || isSaving}
              >
                {isSaving ? (
                  <>
                    <span className="fs-btn-spinner"></span>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </header>

          <div className="fs-content">
            {activeSection === 'organization' && (
              <CollapsibleSection
                id="organization"
                title="Organization Info"
                icon={Icons.Farm}
                isExpanded={true}
                onToggle={() => {}}
              >
                <div className="fs-profile-section">
                  <div className="fs-avatar-upload">
                    <div className="fs-avatar-large">
                      {form.profileImage ? (
                        <img src={form.profileImage} alt="Organization Logo" />
                      ) : (
                        <Icons.Farm />
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
                    <p className="fs-avatar-hint">Click to upload your organization logo</p>
                  </div>

                  <div className="fs-form-grid">
                    <div className="fs-field">
                      <label htmlFor="organizationName">Organization Name</label>
                      <input
                        id="organizationName"
                        name="organizationName"
                        value={form.organizationName}
                        onChange={onInputChange}
                        className="fs-input"
                        placeholder="Organization name"
                      />
                    </div>
                    <div className="fs-field">
                      <label htmlFor="organizationPhone">Organization Phone</label>
                      <input
                        id="organizationPhone"
                        name="organizationPhone"
                        value={form.organizationPhone}
                        onChange={onInputChange}
                        className="fs-input"
                        placeholder="+91 XXXXX XXXXX"
                      />
                    </div>
                    <div className="fs-field">
                      <label htmlFor="organizationEmail">Organization Email</label>
                      <input
                        id="organizationEmail"
                        name="organizationEmail"
                        type="email"
                        value={form.organizationEmail}
                        onChange={onInputChange}
                        className="fs-input"
                        placeholder="contact@ngo.org"
                      />
                    </div>
                    <div className="fs-field">
                      <label htmlFor="website">Website</label>
                      <input
                        id="website"
                        name="website"
                        value={form.website}
                        onChange={onInputChange}
                        className="fs-input"
                        placeholder="https://yourngo.org"
                      />
                    </div>
                    <div className="fs-field">
                      <label htmlFor="yearEstablished">Year Established</label>
                      <input
                        id="yearEstablished"
                        name="yearEstablished"
                        value={form.yearEstablished}
                        onChange={onInputChange}
                        className="fs-input"
                        placeholder="2010"
                      />
                    </div>
                    <div className="fs-field">
                      <label htmlFor="teamSize">Team Size</label>
                      <input
                        id="teamSize"
                        name="teamSize"
                        value={form.teamSize}
                        onChange={onInputChange}
                        className="fs-input"
                        placeholder="25"
                      />
                    </div>
                  </div>

                </div>
              </CollapsibleSection>
            )}

            {activeSection === 'location' && (
              <CollapsibleSection
                id="location"
                title="Location & Routing"
                icon={Icons.Map}
                isExpanded={true}
                onToggle={() => {}}
              >
                <div className="fs-form-grid">
                  <div className="fs-field fs-field-full">
                    <label htmlFor="location.address">Address</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input
                        id="location.address"
                        name="address"
                        value={form.location.address}
                        onChange={(e) => setForm(prev => ({ ...prev, location: { ...prev.location, address: e.target.value } }))}
                        className="fs-input"
                        placeholder="Enter full address"
                        style={{ flex: 1 }}
                      />
                      <button type="button" className="fs-btn fs-btn-secondary" onClick={handleGeocodeAddress}>
                        Find
                      </button>
                    </div>
                  </div>
                  
                  <div className="fs-field">
                    <label htmlFor="location.lat">Latitude</label>
                    <input
                      id="location.lat"
                      name="lat"
                      type="number"
                      value={form.location.lat ?? ''}
                      onChange={(e) => setForm(prev => ({ ...prev, location: { ...prev.location, lat: parseFloat(e.target.value) || null } }))}
                      className="fs-input"
                      placeholder="e.g. 19.0760"
                      readOnly
                    />
                  </div>
                  <div className="fs-field">
                    <label htmlFor="location.lng">Longitude</label>
                    <input
                      id="location.lng"
                      name="lng"
                      type="number"
                      value={form.location.lng ?? ''}
                      onChange={(e) => setForm(prev => ({ ...prev, location: { ...prev.location, lng: parseFloat(e.target.value) || null } }))}
                      className="fs-input"
                      placeholder="e.g. 72.8777"
                      readOnly
                    />
                  </div>
                  
                  <div className="fs-field fs-field-full" style={{ marginBottom: '1rem' }}>
                    <button type="button" className="fs-btn fs-btn-primary" onClick={handleUseCurrentLocation} style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '0.5rem', alignItems: 'center' }}>
                      <MapPin size={18} /> Use Current Location
                    </button>
                  </div>
                </div>

                <div className="fs-map-container" style={{ height: '300px', width: '100%', borderRadius: '8px', overflow: 'hidden', marginTop: '1rem', border: '1px solid var(--border)', zIndex: 0 }}>
                  <MapContainer 
                    center={form.location.lat && form.location.lng ? [form.location.lat, form.location.lng] : [20.5937, 78.9629]} 
                    zoom={form.location.lat ? 13 : 4} 
                    style={{ height: '100%', width: '100%', zIndex: 0 }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <LocationMarker 
                      position={form.location.lat && form.location.lng ? [form.location.lat, form.location.lng] : null} 
                      setPosition={(pos) => setForm(prev => ({ ...prev, location: { ...prev.location, lat: pos[0], lng: pos[1] } }))} 
                    />
                  </MapContainer>
                </div>
              </CollapsibleSection>
            )}

            {activeSection === 'admin' && (
              <CollapsibleSection
                id="admin"
                title="Admin Info"
                icon={Icons.User}
                isExpanded={true}
                onToggle={() => {}}
              >
                <div className="fs-form-grid">
                  <div className="fs-field">
                    <label htmlFor="adminName">Admin Name</label>
                    <input
                      id="adminName"
                      name="adminName"
                      value={form.adminName}
                      onChange={onInputChange}
                      className="fs-input"
                      placeholder="Admin full name"
                    />
                  </div>
                  <div className="fs-field">
                    <label htmlFor="adminEmail">Admin Email</label>
                    <input
                      id="adminEmail"
                      name="adminEmail"
                      type="email"
                      value={form.adminEmail}
                      onChange={onInputChange}
                      className="fs-input"
                      placeholder="admin@ngo.org"
                    />
                  </div>
                  <div className="fs-field">
                    <label htmlFor="adminPhone">Admin Phone</label>
                    <input
                      id="adminPhone"
                      name="adminPhone"
                      value={form.adminPhone}
                      onChange={onInputChange}
                      className="fs-input"
                      placeholder="+91 XXXXX XXXXX"
                    />
                  </div>
                </div>

              </CollapsibleSection>
            )}

            {activeSection === 'impact' && (
              <CollapsibleSection
                id="impact"
                title="Cause & Impact"
                icon={Icons.Shield}
                isExpanded={true}
                onToggle={() => {}}
              >
                <div className="fs-field fs-field-full">
                  <label htmlFor="mission">Mission Statement</label>
                  <textarea
                    id="mission"
                    name="mission"
                    value={form.mission}
                    onChange={onInputChange}
                    className="fs-input fs-textarea"
                    placeholder="Describe your NGO mission and focus"
                    rows={3}
                  />
                </div>

                <div className="fs-field">
                  <label>Focus Areas</label>
                  <div className="fs-day-chips">
                    {FOCUS_AREAS.map((area) => (
                      <button
                        key={area}
                        type="button"
                        className={`fs-day-chip ${form.focusAreas.includes(area) ? 'selected' : ''}`}
                        onClick={() => onFocusAreaToggle(area)}
                      >
                        <span className="fs-day-chip-check">
                          <Icons.Check />
                        </span>
                        {area}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="fs-form-grid">
                  <div className="fs-field">
                    <label htmlFor="beneficiariesServed">Beneficiaries Served (monthly)</label>
                    <input
                      id="beneficiariesServed"
                      name="beneficiariesServed"
                      value={form.beneficiariesServed}
                      onChange={onInputChange}
                      className="fs-input"
                      placeholder="e.g., 1,200"
                    />
                  </div>
                </div>

              </CollapsibleSection>
            )}

            {activeSection === 'donation' && (
              <CollapsibleSection
                id="donation"
                title="Donation Preferences"
                icon={Icons.Heart}
                isExpanded={true}
                onToggle={() => {}}
              >
                <div className="fs-field">
                  <label>Accepted Donation Types</label>
                  <div className="fs-day-chips">
                    {DONATION_TYPES.map((type) => (
                      <button
                        key={type}
                        type="button"
                        className={`fs-day-chip ${form.donationTypes.includes(type) ? 'selected' : ''}`}
                        onClick={() => onDonationTypeToggle(type)}
                      >
                        <span className="fs-day-chip-check">
                          <Icons.Check />
                        </span>
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="fs-form-grid">
                  <div className="fs-field">
                    <label htmlFor="availability">Availability</label>
                    <select
                      id="availability"
                      name="availability"
                      value={form.availability}
                      onChange={onInputChange}
                      className="fs-input fs-select"
                    >
                      <option value="weekdays">Weekdays only</option>
                      <option value="weekends">Weekends only</option>
                      <option value="anytime">Anytime</option>
                    </select>
                  </div>
                </div>

                <div className="fs-field fs-field-full">
                  <label htmlFor="pickupPreferences">Pickup Preferences</label>
                  <textarea
                    id="pickupPreferences"
                    name="pickupPreferences"
                    value={form.pickupPreferences}
                    onChange={onInputChange}
                    className="fs-input fs-textarea"
                    placeholder="Preferred pickup hours, storage notes, etc."
                    rows={3}
                  />
                </div>

              </CollapsibleSection>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default NgoSettings;
