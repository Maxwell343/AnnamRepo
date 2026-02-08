import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './CustomerAddresses.css';

// ============================================
// TYPES
// ============================================

interface Address {
  id: string;
  type: 'home' | 'work' | 'other';
  label: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isDefault: boolean;
  coordinates?: {
    lat: number;
    lng: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface User {
  id: number;
  name: string;
  role: 'customer';
  email?: string;
  phone?: string;
}

interface FormErrors {
  [key: string]: string;
}

// ============================================
// CONSTANTS
// ============================================

const ADDRESS_TYPES = [
  { id: 'home', label: 'Home', icon: '🏠', description: 'Residential address' },
  { id: 'work', label: 'Work', icon: '🏢', description: 'Office or workplace' },
  { id: 'other', label: 'Other', icon: '📍', description: 'Friends, family, etc.' }
];

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry', 'Chandigarh'
];

// ============================================
// UTILITY FUNCTIONS
// ============================================

const generateId = (): string => {
  return `addr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

const validatePincode = (pincode: string): boolean => {
  return /^[1-9][0-9]{5}$/.test(pincode);
};

const validatePhone = (phone: string): boolean => {
  return /^[6-9]\d{9}$/.test(phone.replace(/\D/g, ''));
};

// Toast notification
const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
  const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
  
  const toast = document.createElement('div');
  toast.className = `address-toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type]}</span>
    <span class="toast-message">${message}</span>
  `;
  
  const container = document.getElementById('toast-container') || (() => {
    const div = document.createElement('div');
    div.id = 'toast-container';
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
    } catch (error) {
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

const useGeolocation = () => {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  return { location, loading, error, getLocation };
};

// ============================================
// COMPONENTS
// ============================================

// Magnetic Button Component
const MagneticButton: React.FC<{
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
}> = ({ children, className = '', onClick, disabled, type = 'button' }) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (disabled) return;
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setPosition({ x: x * 0.15, y: y * 0.15 });
  };

  const handleMouseLeave = () => setPosition({ x: 0, y: 0 });

  return (
    <button
      ref={buttonRef}
      type={type}
      className={`magnetic-btn ${className}`}
      onClick={onClick}
      disabled={disabled}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
    >
      {children}
    </button>
  );
};

// Address Card Component
const AddressCard: React.FC<{
  address: Address;
  onEdit: (address: Address) => void;
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
  index: number;
}> = ({ address, onEdit, onDelete, onSetDefault, index }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    await new Promise(resolve => setTimeout(resolve, 300));
    onDelete(address.id);
    setShowDeleteConfirm(false);
  };

  const getTypeIcon = () => {
    const type = ADDRESS_TYPES.find(t => t.id === address.type);
    return type?.icon || '📍';
  };

  return (
    <div 
      className={`address-card ${address.isDefault ? 'default' : ''}`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Default Badge */}
      {address.isDefault && (
        <div className="default-badge">
          <span className="badge-icon">⭐</span>
          <span>Default</span>
        </div>
      )}

      {/* Card Header */}
      <div className="card-header">
        <div className="address-type">
          <span className="type-icon">{getTypeIcon()}</span>
          <span className="type-label">{address.label || address.type}</span>
        </div>
        <div className="card-actions">
          {!address.isDefault && (
            <button 
              className="action-btn set-default-btn"
              onClick={() => onSetDefault(address.id)}
              title="Set as default"
            >
              ⭐
            </button>
          )}
          <button 
            className="action-btn edit-btn"
            onClick={() => onEdit(address)}
            title="Edit address"
          >
            ✏️
          </button>
          <button 
            className="action-btn delete-btn"
            onClick={() => setShowDeleteConfirm(true)}
            title="Delete address"
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Card Body */}
      <div className="card-body">
        <div className="recipient-info">
          <span className="recipient-name">{address.fullName}</span>
          <span className="recipient-phone">📱 {address.phone}</span>
        </div>
        
        <div className="address-details">
          <p className="address-line">{address.addressLine1}</p>
          {address.addressLine2 && (
            <p className="address-line">{address.addressLine2}</p>
          )}
          {address.landmark && (
            <p className="address-landmark">
              <span className="landmark-icon">🏁</span>
              Near {address.landmark}
            </p>
          )}
          <p className="address-city">
            {address.city}, {address.state} - {address.pincode}
          </p>
        </div>
      </div>

      {/* Card Footer */}
      <div className="card-footer">
        <span className="updated-at">
          Updated {formatDate(address.updatedAt)}
        </span>
        {address.coordinates && (
          <span className="has-location">
            <span className="location-icon">📍</span>
            Location saved
          </span>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="delete-confirm-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="delete-confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="confirm-icon">🗑️</div>
            <h3>Delete Address?</h3>
            <p>Are you sure you want to delete this address? This action cannot be undone.</p>
            <div className="confirm-actions">
              <button 
                className="btn-cancel"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
              <button 
                className={`btn-delete ${isDeleting ? 'deleting' : ''}`}
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <span className="spinner" />
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Address Form Component
const AddressForm: React.FC<{
  address?: Address | null;
  onSubmit: (address: Omit<Address, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  isOpen: boolean;
}> = ({ address, onSubmit, onCancel, isOpen }) => {
  const [formData, setFormData] = useState({
    type: 'home' as 'home' | 'work' | 'other',
    label: '',
    fullName: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    landmark: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    isDefault: false,
    coordinates: undefined as { lat: number; lng: number } | undefined
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [stateSearch, setStateSearch] = useState('');
  
  const formRef = useRef<HTMLFormElement>(null);
  const { location, loading: locationLoading, getLocation } = useGeolocation();

  // Initialize form with address data
  useEffect(() => {
    if (address) {
      setFormData({
        type: address.type,
        label: address.label,
        fullName: address.fullName,
        phone: address.phone,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2 || '',
        landmark: address.landmark || '',
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        country: address.country,
        isDefault: address.isDefault,
        coordinates: address.coordinates
      });
    } else {
      // Reset form for new address
      setFormData({
        type: 'home',
        label: '',
        fullName: '',
        phone: '',
        addressLine1: '',
        addressLine2: '',
        landmark: '',
        city: '',
        state: '',
        pincode: '',
        country: 'India',
        isDefault: false,
        coordinates: undefined
      });
    }
    setErrors({});
  }, [address, isOpen]);

  // Update coordinates when location is fetched
  useEffect(() => {
    if (location) {
      setFormData(prev => ({ ...prev, coordinates: location }));
      showToast('Location detected successfully!', 'success');
      
      // Reverse geocode to get address (mock implementation)
      fetchAddressFromCoordinates(location);
    }
  }, [location]);

  const fetchAddressFromCoordinates = async (coords: { lat: number; lng: number }) => {
    setIsFetchingLocation(true);
    try {
      // In a real app, you would use a geocoding API like Google Maps or OpenStreetMap
      // This is a mock implementation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock address data based on coordinates
      // In production, replace with actual geocoding API call
      showToast('Address details fetched from location', 'info');
    } catch (error) {
      console.error('Error fetching address:', error);
    } finally {
      setIsFetchingLocation(false);
    }
  };

  const handleDetectLocation = () => {
    getLocation();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    
    setFormData(prev => ({ ...prev, [name]: newValue }));
    
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleStateSelect = (state: string) => {
    setFormData(prev => ({ ...prev, state }));
    setShowStateDropdown(false);
    setStateSearch('');
    if (errors.state) {
      setErrors(prev => ({ ...prev, state: '' }));
    }
  };

  const filteredStates = INDIAN_STATES.filter(state =>
    state.toLowerCase().includes(stateSearch.toLowerCase())
  );

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!validatePhone(formData.phone)) {
      newErrors.phone = 'Enter a valid 10-digit phone number';
    }

    if (!formData.addressLine1.trim()) {
      newErrors.addressLine1 = 'Address is required';
    }

    if (!formData.city.trim()) {
      newErrors.city = 'City is required';
    }

    if (!formData.state.trim()) {
      newErrors.state = 'State is required';
    }

    if (!formData.pincode.trim()) {
      newErrors.pincode = 'Pincode is required';
    } else if (!validatePincode(formData.pincode)) {
      newErrors.pincode = 'Enter a valid 6-digit pincode';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showToast('Please fix the errors in the form', 'error');
      return;
    }

    setIsSubmitting(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    onSubmit({
      ...formData,
      label: formData.label || ADDRESS_TYPES.find(t => t.id === formData.type)?.label || 'Address'
    });
    
    setIsSubmitting(false);
  };

  if (!isOpen) return null;

  return (
    <div className="form-overlay" onClick={onCancel}>
      <div className="address-form-container" onClick={e => e.stopPropagation()}>
        <div className="form-header">
          <h2>{address ? 'Edit Address' : 'Add New Address'}</h2>
          <button className="close-form-btn" onClick={onCancel}>✕</button>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="address-form">
          {/* Address Type Selection */}
          <div className="form-section">
            <label className="section-label">Address Type</label>
            <div className="address-type-selector">
              {ADDRESS_TYPES.map(type => (
                <button
                  key={type.id}
                  type="button"
                  className={`type-option ${formData.type === type.id ? 'active' : ''}`}
                  onClick={() => setFormData(prev => ({ ...prev, type: type.id as any }))}
                >
                  <span className="type-icon">{type.icon}</span>
                  <span className="type-label">{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Location Detection */}
          <div className="form-section location-section">
            <button
              type="button"
              className={`detect-location-btn ${locationLoading || isFetchingLocation ? 'loading' : ''}`}
              onClick={handleDetectLocation}
              disabled={locationLoading || isFetchingLocation}
            >
              {locationLoading || isFetchingLocation ? (
                <>
                  <span className="spinner" />
                  <span>Detecting location...</span>
                </>
              ) : (
                <>
                  <span className="location-icon">📍</span>
                  <span>Use my current location</span>
                </>
              )}
            </button>
            {formData.coordinates && (
              <span className="location-detected">
                ✓ Location detected
              </span>
            )}
          </div>

          {/* Contact Details */}
          <div className="form-section">
            <label className="section-label">Contact Details</label>
            <div className="form-row">
              <div className={`form-group ${errors.fullName ? 'has-error' : ''}`}>
                <label htmlFor="fullName">Full Name *</label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  placeholder="Enter recipient's full name"
                  autoComplete="name"
                />
                {errors.fullName && <span className="error-message">{errors.fullName}</span>}
              </div>
              <div className={`form-group ${errors.phone ? 'has-error' : ''}`}>
                <label htmlFor="phone">Phone Number *</label>
                <div className="phone-input">
                  <span className="country-code">+91</span>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="10-digit mobile number"
                    maxLength={10}
                    autoComplete="tel"
                  />
                </div>
                {errors.phone && <span className="error-message">{errors.phone}</span>}
              </div>
            </div>
          </div>

          {/* Address Details */}
          <div className="form-section">
            <label className="section-label">Address Details</label>
            
            <div className={`form-group ${errors.addressLine1 ? 'has-error' : ''}`}>
              <label htmlFor="addressLine1">Address Line 1 *</label>
              <input
                type="text"
                id="addressLine1"
                name="addressLine1"
                value={formData.addressLine1}
                onChange={handleInputChange}
                placeholder="House/Flat No., Building Name, Street"
                autoComplete="address-line1"
              />
              {errors.addressLine1 && <span className="error-message">{errors.addressLine1}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="addressLine2">Address Line 2 (Optional)</label>
              <input
                type="text"
                id="addressLine2"
                name="addressLine2"
                value={formData.addressLine2}
                onChange={handleInputChange}
                placeholder="Area, Colony, Sector"
                autoComplete="address-line2"
              />
            </div>

            <div className="form-group">
              <label htmlFor="landmark">Landmark (Optional)</label>
              <input
                type="text"
                id="landmark"
                name="landmark"
                value={formData.landmark}
                onChange={handleInputChange}
                placeholder="Near temple, school, etc."
              />
            </div>

            <div className="form-row">
              <div className={`form-group ${errors.city ? 'has-error' : ''}`}>
                <label htmlFor="city">City *</label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  placeholder="Enter city"
                  autoComplete="address-level2"
                />
                {errors.city && <span className="error-message">{errors.city}</span>}
              </div>

              <div className={`form-group ${errors.pincode ? 'has-error' : ''}`}>
                <label htmlFor="pincode">Pincode *</label>
                <input
                  type="text"
                  id="pincode"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleInputChange}
                  placeholder="6-digit pincode"
                  maxLength={6}
                  autoComplete="postal-code"
                />
                {errors.pincode && <span className="error-message">{errors.pincode}</span>}
              </div>
            </div>

            <div className={`form-group state-selector ${errors.state ? 'has-error' : ''}`}>
              <label htmlFor="state">State *</label>
              <div className="state-dropdown-container">
                <input
                  type="text"
                  id="state"
                  name="state"
                  value={showStateDropdown ? stateSearch : formData.state}
                  onChange={(e) => {
                    setStateSearch(e.target.value);
                    if (!showStateDropdown) setShowStateDropdown(true);
                  }}
                  onFocus={() => setShowStateDropdown(true)}
                  placeholder="Select or type state"
                  autoComplete="off"
                />
                <span className="dropdown-arrow" onClick={() => setShowStateDropdown(!showStateDropdown)}>
                  {showStateDropdown ? '▲' : '▼'}
                </span>
                
                {showStateDropdown && (
                  <div className="state-dropdown">
                    {filteredStates.length > 0 ? (
                      filteredStates.map(state => (
                        <button
                          key={state}
                          type="button"
                          className={`state-option ${formData.state === state ? 'selected' : ''}`}
                          onClick={() => handleStateSelect(state)}
                        >
                          {state}
                        </button>
                      ))
                    ) : (
                      <div className="no-states">No states found</div>
                    )}
                  </div>
                )}
              </div>
              {errors.state && <span className="error-message">{errors.state}</span>}
            </div>
          </div>

          {/* Additional Options */}
          <div className="form-section">
            <label className="section-label">Additional Options</label>
            
            <div className="form-group">
              <label htmlFor="label">Address Label (Optional)</label>
              <input
                type="text"
                id="label"
                name="label"
                value={formData.label}
                onChange={handleInputChange}
                placeholder="e.g., Mom's House, Office Tower A"
              />
            </div>

            <label className="checkbox-label">
              <input
                type="checkbox"
                name="isDefault"
                checked={formData.isDefault}
                onChange={handleInputChange}
              />
              <span className="checkbox-custom" />
              <span className="checkbox-text">
                <span className="checkbox-title">Set as default address</span>
                <span className="checkbox-description">This address will be pre-selected for deliveries</span>
              </span>
            </label>
          </div>

          {/* Form Actions */}
          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onCancel}>
              Cancel
            </button>
            <MagneticButton
              type="submit"
              className={`btn-save ${isSubmitting ? 'submitting' : ''}`}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <span className="btn-icon">✓</span>
                  <span>{address ? 'Update Address' : 'Save Address'}</span>
                </>
              )}
            </MagneticButton>
          </div>
        </form>
      </div>
    </div>
  );
};

// Empty State Component
const EmptyState: React.FC<{ onAddNew: () => void }> = ({ onAddNew }) => (
  <div className="empty-state">
    <div className="empty-illustration">
      <div className="empty-icon">📍</div>
      <div className="empty-circles">
        <span className="circle c1" />
        <span className="circle c2" />
        <span className="circle c3" />
      </div>
    </div>
    <h3>No addresses saved yet</h3>
    <p>Add your first delivery address to get started with ordering fresh produce!</p>
    <MagneticButton className="btn-add-first" onClick={onAddNew}>
      <span className="btn-icon">+</span>
      <span>Add Your First Address</span>
    </MagneticButton>
  </div>
);

// ============================================
// MAIN COMPONENT
// ============================================

const CustomerAddresses: React.FC = () => {
  const navigate = useNavigate();
  
  // State
  const [user, setUser] = useState<User | null>(null);
  const [addresses, setAddresses] = useLocalStorage<Address[]>('customer-addresses', []);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'home' | 'work' | 'other'>('all');
  const [isLoading, setIsLoading] = useState(true);

  // Load user
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        if (parsedUser && parsedUser.role === 'customer') {
          setUser(parsedUser);
        } else {
          navigate('/auth');
          return;
        }
      } catch (e) {
        navigate('/auth');
        return;
      }
    } else {
      navigate('/auth');
      return;
    }
    
    // Simulate loading
    setTimeout(() => setIsLoading(false), 500);
  }, [navigate]);

  // Filter addresses
  const filteredAddresses = addresses.filter(address => {
    const matchesType = filterType === 'all' || address.type === filterType;
    const matchesSearch = searchQuery === '' || 
      address.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      address.addressLine1.toLowerCase().includes(searchQuery.toLowerCase()) ||
      address.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      address.pincode.includes(searchQuery);
    return matchesType && matchesSearch;
  });

  // Sort addresses (default first, then by update date)
  const sortedAddresses = [...filteredAddresses].sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  // Handlers
  const handleAddNew = () => {
    setEditingAddress(null);
    setIsFormOpen(true);
  };

  const handleEdit = (address: Address) => {
    setEditingAddress(address);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    const addressToDelete = addresses.find(a => a.id === id);
    setAddresses(prev => {
      const filtered = prev.filter(a => a.id !== id);
      // If we deleted the default, make the first one default
      if (addressToDelete?.isDefault && filtered.length > 0) {
        filtered[0].isDefault = true;
      }
      return filtered;
    });
    showToast('Address deleted successfully', 'success');
  };

  const handleSetDefault = (id: string) => {
    setAddresses(prev => prev.map(addr => ({
      ...addr,
      isDefault: addr.id === id,
      updatedAt: addr.id === id ? new Date().toISOString() : addr.updatedAt
    })));
    showToast('Default address updated', 'success');
  };

  const handleFormSubmit = (formData: Omit<Address, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    
    if (editingAddress) {
      // Update existing address
      setAddresses(prev => prev.map(addr => {
        if (addr.id === editingAddress.id) {
          return {
            ...addr,
            ...formData,
            updatedAt: now
          };
        }
        // If new address is default, remove default from others
        if (formData.isDefault && addr.isDefault) {
          return { ...addr, isDefault: false };
        }
        return addr;
      }));
      showToast('Address updated successfully!', 'success');
    } else {
      // Add new address
      const newAddress: Address = {
        ...formData,
        id: generateId(),
        createdAt: now,
        updatedAt: now
      };
      
      setAddresses(prev => {
        // If new address is default, remove default from others
        if (formData.isDefault) {
          return [...prev.map(a => ({ ...a, isDefault: false })), newAddress];
        }
        // If this is the first address, make it default
        if (prev.length === 0) {
          return [{ ...newAddress, isDefault: true }];
        }
        return [...prev, newAddress];
      });
      showToast('Address added successfully!', 'success');
    }
    
    setIsFormOpen(false);
    setEditingAddress(null);
  };

  const handleFormCancel = () => {
    setIsFormOpen(false);
    setEditingAddress(null);
  };

  // Stats
  const stats = {
    total: addresses.length,
    home: addresses.filter(a => a.type === 'home').length,
    work: addresses.filter(a => a.type === 'work').length,
    other: addresses.filter(a => a.type === 'other').length
  };

  if (!user) {
    return (
      <div className="addresses-loading">
        <div className="loader">
          <span className="loader-icon">📍</span>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="customer-addresses">
      {/* Background */}
      <div className="addresses-bg">
        <div className="gradient-orb orb-1" />
        <div className="gradient-orb orb-2" />
      </div>

      {/* Header */}
      <header className="addresses-header">
        <div className="header-content">
          <button className="back-btn" onClick={() => navigate('/customer-home')}>
            <span>←</span>
            <span>Back</span>
          </button>
          
          <div className="header-title">
            <h1>
              <span className="title-icon">📍</span>
              My Addresses
            </h1>
            <p>Manage your delivery addresses</p>
          </div>

          <MagneticButton className="btn-add-new" onClick={handleAddNew}>
            <span className="btn-icon">+</span>
            <span className="btn-label">Add New</span>
          </MagneticButton>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="stats-bar">
        <div className="stat-item" onClick={() => setFilterType('all')}>
          <span className="stat-icon">📍</span>
          <span className="stat-value">{stats.total}</span>
          <span className="stat-label">Total</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item" onClick={() => setFilterType('home')}>
          <span className="stat-icon">🏠</span>
          <span className="stat-value">{stats.home}</span>
          <span className="stat-label">Home</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item" onClick={() => setFilterType('work')}>
          <span className="stat-icon">🏢</span>
          <span className="stat-value">{stats.work}</span>
          <span className="stat-label">Work</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item" onClick={() => setFilterType('other')}>
          <span className="stat-icon">📌</span>
          <span className="stat-value">{stats.other}</span>
          <span className="stat-label">Other</span>
        </div>
      </div>

      {/* Main Content */}
      <main className="addresses-main">
        {/* Toolbar */}
        {addresses.length > 0 && (
          <div className="addresses-toolbar">
            <div className="search-box">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search addresses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="clear-search" onClick={() => setSearchQuery('')}>
                  ✕
                </button>
              )}
            </div>

            <div className="filter-tabs">
              {[
                { id: 'all', label: 'All', icon: '📍' },
                { id: 'home', label: 'Home', icon: '🏠' },
                { id: 'work', label: 'Work', icon: '🏢' },
                { id: 'other', label: 'Other', icon: '📌' }
              ].map(tab => (
                <button
                  key={tab.id}
                  className={`filter-tab ${filterType === tab.id ? 'active' : ''}`}
                  onClick={() => setFilterType(tab.id as any)}
                >
                  <span className="tab-icon">{tab.icon}</span>
                  <span className="tab-label">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Addresses Grid */}
        <div className="addresses-container">
          {isLoading ? (
            <div className="addresses-loading">
              <div className="loading-cards">
                {[1, 2, 3].map(i => (
                  <div key={i} className="skeleton-card">
                    <div className="skeleton-header" />
                    <div className="skeleton-body">
                      <div className="skeleton-line" />
                      <div className="skeleton-line short" />
                      <div className="skeleton-line" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : addresses.length === 0 ? (
            <EmptyState onAddNew={handleAddNew} />
          ) : sortedAddresses.length === 0 ? (
            <div className="no-results">
              <span className="no-results-icon">🔍</span>
              <h3>No addresses found</h3>
              <p>Try adjusting your search or filter</p>
              <button 
                className="btn-clear-filters"
                onClick={() => { setSearchQuery(''); setFilterType('all'); }}
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="addresses-grid">
              {sortedAddresses.map((address, index) => (
                <AddressCard
                  key={address.id}
                  address={address}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onSetDefault={handleSetDefault}
                  index={index}
                />
              ))}
              
              {/* Add New Card */}
              <button className="add-address-card" onClick={handleAddNew}>
                <div className="add-icon">+</div>
                <span className="add-label">Add New Address</span>
              </button>
            </div>
          )}
        </div>

        {/* Tips Section */}
        {addresses.length > 0 && (
          <div className="tips-section">
            <h3>💡 Quick Tips</h3>
            <div className="tips-grid">
              <div className="tip-card">
                <span className="tip-icon">⭐</span>
                <div className="tip-content">
                  <h4>Set a default address</h4>
                  <p>Save time during checkout by setting your most-used address as default.</p>
                </div>
              </div>
              <div className="tip-card">
                <span className="tip-icon">📍</span>
                <div className="tip-content">
                  <h4>Add landmarks</h4>
                  <p>Help our delivery partners find you faster by adding nearby landmarks.</p>
                </div>
              </div>
              <div className="tip-card">
                <span className="tip-icon">📱</span>
                <div className="tip-content">
                  <h4>Keep phone updated</h4>
                  <p>Ensure your phone number is correct for delivery updates.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Address Form Modal */}
      <AddressForm
        address={editingAddress}
        onSubmit={handleFormSubmit}
        onCancel={handleFormCancel}
        isOpen={isFormOpen}
      />

      {/* Toast Container */}
      <div id="toast-container" />
    </div>
  );
};

export default CustomerAddresses;