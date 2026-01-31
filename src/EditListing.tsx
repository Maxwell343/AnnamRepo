import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './EditListing.css';

interface User {
  id: number;
  name: string;
  role: 'farmer' | 'ngo' | 'driver';
}

interface ListingData {
  id: number;
  title: string;
  quantity: string;
  unit: string;
  type: 'Vegetable' | 'Fruit' | 'Grain' | 'Other';
  expiry: string;
  expiryUnit: 'hours' | 'days';
  description: string;
  image: string | null;
  pickup_location: string;
  pickup_time_start: string;
  pickup_time_end: string;
  contact_phone: string;
  status: 'available' | 'unavailable' | 'claimed' | 'expired';
  created_at: string;
  claimed_quantity?: string;
  claimed_by?: {
    id: number;
    name: string;
    organization: string;
  };
}

const EditListing: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [originalListing, setOriginalListing] = useState<ListingData | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const [formData, setFormData] = useState<ListingData>({
    id: 0,
    title: '',
    quantity: '',
    unit: 'kg',
    type: 'Vegetable',
    expiry: '',
    expiryUnit: 'days',
    description: '',
    image: null,
    pickup_location: '',
    pickup_time_start: '09:00',
    pickup_time_end: '18:00',
    contact_phone: '',
    status: 'available',
    created_at: ''
  });

  // Mock data - Replace with API call
  const mockListing: ListingData = {
    id: 1,
    title: 'Fresh Organic Tomatoes',
    quantity: '25',
    unit: 'kg',
    type: 'Vegetable',
    expiry: '3',
    expiryUnit: 'days',
    description: 'Freshly harvested organic tomatoes from our farm. No pesticides used. Perfect for restaurants or NGO distribution.',
    image: null,
    pickup_location: 'Green Valley Farm, Village Road, Near Temple, Nashik, Maharashtra 422001',
    pickup_time_start: '08:00',
    pickup_time_end: '17:00',
    contact_phone: '+91 98765 43210',
    status: 'available',
    created_at: '2024-01-15T10:30:00',
    claimed_quantity: '10',
    claimed_by: {
      id: 1,
      name: 'Priya Sharma',
      organization: 'Food For All Foundation'
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      if (parsedUser.role !== 'farmer') {
        navigate('/home');
        return;
      }
      setUser(parsedUser);
    } else {
      navigate('/');
      return;
    }

    // Fetch listing data
    fetchListing();
  }, [navigate, id]);

  const fetchListing = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/listings/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch listing');
      }
      const data = await response.json();
      
      setFormData(data);
      setOriginalListing(data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching listing:', err);
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setHasChanges(true);
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, image: 'Image size should be less than 5MB' }));
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, image: reader.result as string }));
        setHasChanges(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setFormData(prev => ({ ...prev, image: null }));
    setHasChanges(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.quantity || parseFloat(formData.quantity) <= 0) {
      newErrors.quantity = 'Please enter a valid quantity';
    }

    // Check if quantity is less than already claimed
    if (formData.claimed_quantity) {
      const claimedQty = parseFloat(formData.claimed_quantity);
      const newQty = parseFloat(formData.quantity);
      if (newQty < claimedQty) {
        newErrors.quantity = `Quantity cannot be less than already claimed (${claimedQty} ${formData.unit})`;
      }
    }

    if (!formData.expiry || parseInt(formData.expiry) <= 0) {
      newErrors.expiry = 'Please enter a valid expiry time';
    }

    if (!formData.pickup_location.trim()) {
      newErrors.pickup_location = 'Pickup location is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSaving(true);

    try {
      // Replace with actual API call
      // const response = await fetch(`http://localhost:5000/api/listings/${id}`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(formData)
      // });

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update localStorage or state
      setShowSuccessToast(true);
      setHasChanges(false);
      setOriginalListing(formData);

      setTimeout(() => {
        setShowSuccessToast(false);
        navigate('/my-listings');
      }, 2000);

    } catch (err: any) {
      setErrors(prev => ({ ...prev, submit: err.message || 'Failed to update listing' }));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      // Replace with actual API call
      // await fetch(`http://localhost:5000/api/listings/${id}`, { method: 'DELETE' });

      await new Promise(resolve => setTimeout(resolve, 500));
      navigate('/my-listings');
    } catch (err) {
      console.error('Error deleting listing:', err);
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      if (window.confirm('You have unsaved changes. Are you sure you want to leave?')) {
        navigate('/my-listings');
      }
    } else {
      navigate('/my-listings');
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Vegetable': return '🥦';
      case 'Fruit': return '🍎';
      case 'Grain': return '🌾';
      default: return '🍱';
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading listing...</p>
      </div>
    );
  }

  return (
    <div className="edit-listing-container">
      <div className="edit-listing-card">
        
        {/* Header */}
        <div className="edit-header">
          <button className="back-btn" onClick={handleCancel}>
            ← Back
          </button>
          <div className="header-title">
            <h1>✏️ Edit Listing</h1>
            <p>Update your food donation details</p>
          </div>
          <div className="header-actions">
            {formData.status !== 'claimed' && (
              <button 
                className="delete-btn"
                onClick={() => setShowDeleteModal(true)}
              >
                🗑️ Delete
              </button>
            )}
          </div>
        </div>

        {/* Listing Status Banner */}
        {formData.claimed_by && (
          <div className="claimed-banner">
            <div className="claimed-icon">🤝</div>
            <div className="claimed-info">
              <h4>Partially Claimed</h4>
              <p>
                <strong>{formData.claimed_quantity} {formData.unit}</strong> claimed by{' '}
                <strong>{formData.claimed_by.organization}</strong>
              </p>
            </div>
            <div className="remaining-quantity">
              <span className="remaining-value">
                {parseFloat(formData.quantity) - parseFloat(formData.claimed_quantity || '0')} {formData.unit}
              </span>
              <span className="remaining-label">Remaining</span>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="edit-form">
          
          {/* Basic Information */}
          <div className="form-section">
            <h2 className="section-title">📦 Basic Information</h2>
            
            <div className="form-group">
              <label htmlFor="title">
                Product Title <span className="required">*</span>
              </label>
              <input
                type="text"
                id="title"
                name="title"
                className={`form-input ${errors.title ? 'error' : ''}`}
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g., Fresh Organic Tomatoes"
              />
              {errors.title && <span className="error-text">{errors.title}</span>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="quantity">
                  Quantity <span className="required">*</span>
                </label>
                <div className="input-with-select">
                  <input
                    type="number"
                    id="quantity"
                    name="quantity"
                    className={`form-input ${errors.quantity ? 'error' : ''}`}
                    value={formData.quantity}
                    onChange={handleChange}
                    placeholder="25"
                    min="0"
                    step="0.1"
                  />
                  <select
                    name="unit"
                    className="form-select unit-select"
                    value={formData.unit}
                    onChange={handleChange}
                  >
                    <option value="kg">kg</option>
                    <option value="tons">tons</option>
                    <option value="pieces">pieces</option>
                    <option value="boxes">boxes</option>
                    <option value="bags">bags</option>
                    <option value="liters">liters</option>
                  </select>
                </div>
                {errors.quantity && <span className="error-text">{errors.quantity}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="type">
                  Product Type <span className="required">*</span>
                </label>
                <select
                  id="type"
                  name="type"
                  className="form-select"
                  value={formData.type}
                  onChange={handleChange}
                >
                  <option value="Vegetable">🥦 Vegetable</option>
                  <option value="Fruit">🍎 Fruit</option>
                  <option value="Grain">🌾 Grain</option>
                  <option value="Other">🍱 Other</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="expiry">
                  Expiry Time <span className="required">*</span>
                </label>
                <div className="input-with-select">
                  <input
                    type="number"
                    id="expiry"
                    name="expiry"
                    className={`form-input ${errors.expiry ? 'error' : ''}`}
                    value={formData.expiry}
                    onChange={handleChange}
                    placeholder="3"
                    min="1"
                  />
                  <select
                    name="expiryUnit"
                    className="form-select unit-select"
                    value={formData.expiryUnit}
                    onChange={handleChange}
                  >
                    <option value="hours">Hours</option>
                    <option value="days">Days</option>
                  </select>
                </div>
                {errors.expiry && <span className="error-text">{errors.expiry}</span>}
                <span className="helper-text">
                  Time from now until the produce expires
                </span>
              </div>

              <div className="form-group">
                <label htmlFor="status">Listing Status</label>
                <select
                  id="status"
                  name="status"
                  className="form-select"
                  value={formData.status}
                  onChange={handleChange}
                  disabled={formData.status === 'claimed'}
                >
                  <option value="available">🟢 Available</option>
                  <option value="unavailable">🔴 Unavailable</option>
                </select>
                {formData.status === 'claimed' && (
                  <span className="helper-text">
                    Status cannot be changed for claimed listings
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="form-section">
            <h2 className="section-title">📝 Description</h2>
            
            <div className="form-group">
              <label htmlFor="description">Additional Details</label>
              <textarea
                id="description"
                name="description"
                className="form-textarea"
                value={formData.description}
                onChange={handleChange}
                placeholder="Add any additional information about the produce, handling instructions, etc."
                rows={4}
              />
              <span className="char-count">
                {formData.description.length}/500 characters
              </span>
            </div>
          </div>

          {/* Image Upload */}
          <div className="form-section">
            <h2 className="section-title">📷 Product Image</h2>
            
            <div className="image-upload-area">
              {formData.image ? (
                <div className="image-preview">
                  <img src={formData.image} alt="Product preview" />
                  <div className="image-overlay">
                    <button 
                      type="button" 
                      className="change-image-btn"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      📷 Change
                    </button>
                    <button 
                      type="button" 
                      className="remove-image-btn"
                      onClick={removeImage}
                    >
                      🗑️ Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div 
                  className="upload-placeholder"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="upload-icon">📷</div>
                  <p>Click to upload an image</p>
                  <span>PNG, JPG up to 5MB</span>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
              {errors.image && <span className="error-text">{errors.image}</span>}
            </div>
          </div>

          {/* Pickup Details */}
          <div className="form-section">
            <h2 className="section-title">📍 Pickup Details</h2>
            
            <div className="form-group">
              <label htmlFor="pickup_location">
                Pickup Location <span className="required">*</span>
              </label>
              <textarea
                id="pickup_location"
                name="pickup_location"
                className={`form-textarea ${errors.pickup_location ? 'error' : ''}`}
                value={formData.pickup_location}
                onChange={handleChange}
                placeholder="Enter complete address with landmarks"
                rows={3}
              />
              {errors.pickup_location && (
                <span className="error-text">{errors.pickup_location}</span>
              )}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="pickup_time_start">Pickup Time (From)</label>
                <input
                  type="time"
                  id="pickup_time_start"
                  name="pickup_time_start"
                  className="form-input"
                  value={formData.pickup_time_start}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="pickup_time_end">Pickup Time (To)</label>
                <input
                  type="time"
                  id="pickup_time_end"
                  name="pickup_time_end"
                  className="form-input"
                  value={formData.pickup_time_end}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="contact_phone">Contact Number for this Listing</label>
              <input
                type="tel"
                id="contact_phone"
                name="contact_phone"
                className="form-input"
                value={formData.contact_phone}
                onChange={handleChange}
                placeholder="+91 98765 43210"
              />
              <span className="helper-text">
                Leave empty to use your default contact number
              </span>
            </div>
          </div>

          {/* Listing Info */}
          <div className="form-section listing-info">
            <h2 className="section-title">ℹ️ Listing Information</h2>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Listing ID</span>
                <span className="info-value">#{formData.id}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Created On</span>
                <span className="info-value">{formatDate(formData.created_at)}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Product Type</span>
                <span className="info-value">
                  {getTypeIcon(formData.type)} {formData.type}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Current Status</span>
                <span className={`info-value status-badge ${formData.status}`}>
                  {formData.status === 'available' ? '🟢 Available' : 
                   formData.status === 'claimed' ? '🔵 Claimed' : 
                   formData.status === 'unavailable' ? '🔴 Unavailable' : 
                   '⚪ Unknown'}
                </span>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {errors.submit && (
            <div className="submit-error">
              <span className="error-icon">⚠️</span>
              <span>{errors.submit}</span>
            </div>
          )}

          {/* Form Actions */}
          <div className="form-actions">
            <button 
              type="button" 
              className="btn-cancel"
              onClick={handleCancel}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-save"
              disabled={saving || !hasChanges}
            >
              {saving ? (
                <>
                  <span className="btn-spinner"></span>
                  Saving...
                </>
              ) : (
                <>💾 Save Changes</>
              )}
            </button>
          </div>
        </form>

      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🗑️ Delete Listing</h2>
              <button 
                className="modal-close"
                onClick={() => setShowDeleteModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="delete-warning">
                <span className="warning-icon">⚠️</span>
                <p>Are you sure you want to delete this listing?</p>
              </div>
              <div className="delete-preview">
                <div className="preview-icon">{getTypeIcon(formData.type)}</div>
                <div className="preview-info">
                  <h4>{formData.title}</h4>
                  <p>{formData.quantity} {formData.unit}</p>
                </div>
              </div>
              <p className="delete-note">This action cannot be undone.</p>
            </div>
            <div className="modal-actions">
              <button 
                className="modal-btn cancel"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button 
                className="modal-btn delete"
                onClick={handleDelete}
              >
                🗑️ Delete Listing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {showSuccessToast && (
        <div className="success-toast">
          <span className="toast-icon">✅</span>
          <span className="toast-message">Listing updated successfully!</span>
        </div>
      )}
    </div>
  );
};

export default EditListing;