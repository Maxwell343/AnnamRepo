import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './FarmerListingForm.css';
import { API_ENDPOINTS } from '../../../config/api';
import type { ProductType, SellingMode, SmartPriceSuggestion, Location } from '../../../types/marketplace';
import { useToast } from '../../../components/ui/ToastProvider';

// ============================================
// UTILITY FUNCTIONS
// ============================================

const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(price);
};

const getProductIcon = (type: ProductType): string => {
  const icons: Record<ProductType, string> = {
    Vegetable: '🥬',
    Fruit: '🍎',
    Grain: '🌾',
    Dairy: '🥛',
    Pulses: '🫘',
    Spices: '🌶️',
    Other: '📦'
  };
  return icons[type];
};

// Fetch price suggestion from API, with client-side fallback
const getSmartPriceSuggestion = async (productType: ProductType, quantity: number): Promise<SmartPriceSuggestion> => {
  try {
    const response = await fetch(API_ENDPOINTS.marketplace.priceSuggestion, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_type: productType, quantity })
    });
    if (response.ok) {
      const data = await response.json();
      return {
        suggestedPrice: data.suggested_price || data.suggestedPrice || 0,
        reasoning: `Based on current market data for ${productType}`,
        marketComparison: {
          averagePrice: data.market_average || 0,
          lowestPrice: data.min_price || 0,
          highestPrice: data.max_price || 0
        },
        demandLevel: 'medium',
        competitorCount: 0
      };
    }
  } catch (err) {
    console.error('Error fetching price suggestion:', err);
  }
  // Fallback: return zeros if API fails
  return {
    suggestedPrice: 0,
    reasoning: 'Price suggestion unavailable',
    marketComparison: { averagePrice: 0, lowestPrice: 0, highestPrice: 0 },
    demandLevel: 'medium',
    competitorCount: 0
  };
};

// Calculate shelf life based on product type
const getDefaultShelfLife = (productType: ProductType): number => {
  const shelfLives: Record<ProductType, number> = {
    Vegetable: 5,
    Fruit: 7,
    Grain: 180,
    Dairy: 7,
    Pulses: 365,
    Spices: 365,
    Other: 30
  };
  return shelfLives[productType];
};

// ============================================
// INTERFACES
// ============================================

interface FormData {
  title: string;
  description: string;
  productType: ProductType;
  variety: string;
  quantity: number;
  unit: string;
  harvestDate: string;
  shelfLife: number;
  price: number;
  sellingMode: SellingMode;
  autoDonateThreshold: number;
  enableBulkDiscount: boolean;
  bulkMinQuantity: number;
  bulkDiscountPercent: number;
  enableAutoReduction: boolean;
  autoPilotMinPrice: number;
  isOrganic: boolean;
  isCertified: boolean;
  pickupAvailable: boolean;
  deliveryAvailable: boolean;
  deliveryRadius: number;
  images: string[];
  tags: string[];
}

interface User {
  id: string;
  name: string;
  role: string;
  farmName?: string;
  location?: Location;
}

// ============================================
// MAIN COMPONENT
// ============================================

const FarmerListingForm: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  // User state
  const [user, setUser] = useState<User | null>(null);
  
  // Form state
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    productType: 'Vegetable',
    variety: '',
    quantity: 0,
    unit: 'kg',
    harvestDate: new Date().toISOString().split('T')[0],
    shelfLife: 5,
    price: 0,
    sellingMode: 'sell',
    autoDonateThreshold: 2,
    enableBulkDiscount: false,
    bulkMinQuantity: 50,
    bulkDiscountPercent: 10,
    enableAutoReduction: true,
    autoPilotMinPrice: 0,
    isOrganic: false,
    isCertified: false,
    pickupAvailable: true,
    deliveryAvailable: false,
    deliveryRadius: 50,
    images: [],
    tags: []
  });
  
  // Smart pricing state
  const [priceSuggestion, setPriceSuggestion] = useState<SmartPriceSuggestion | null>(null);
  const [showPriceSuggestion, setShowPriceSuggestion] = useState(false);
  
  // Location state
  const [location, setLocation] = useState<Location | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  
  // Image state
  const [imagePreview, setImagePreview] = useState<string[]>([]);
  
  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Tag input state
  const [tagInput, setTagInput] = useState('');
  
  // Profile check state
  const [profileChecking, setProfileChecking] = useState(true);

  // Load user & check profile completeness
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        if (parsedUser.role !== 'farmer') {
          navigate('/marketplace');
          return;
        }
        setUser(parsedUser);

        // Check if farmer profile is complete before allowing listing
        const checkProfile = async () => {
          try {
            const response = await fetch(API_ENDPOINTS.farmerSettings(parsedUser.id.toString()));
            const data = await response.json();

            const name = data?.name || parsedUser.name || '';
            const phone = data?.phone || localStorage.getItem('userPhone') || '';
            const farmName = data?.farm_name || localStorage.getItem('farmName') || '';
            const farmLocation = data?.farm_location || localStorage.getItem('farmLocation') || '';

            if (!name.trim() || !phone.trim() || !farmName.trim() || !farmLocation.trim()) {
              const missing: string[] = [];
              if (!name.trim()) missing.push('Full Name');
              if (!phone.trim()) missing.push('Phone Number');
              if (!farmName.trim()) missing.push('Farm Name');
              if (!farmLocation.trim()) missing.push('Farm Location');

              showToast(`Please complete your profile before creating a listing. Missing fields: ${missing.join(', ')}`, {
                variant: 'warning',
                title: 'Profile Incomplete',
              });
              navigate('/farmer-settings', { state: { returnTo: '/farmer/new-listing', incompleteProfile: true } });
              return;
            }
          } catch (err) {
            // Fallback: check localStorage
            const farmName = localStorage.getItem('farmName') || '';
            const farmLocation = localStorage.getItem('farmLocation') || '';
            const phone = localStorage.getItem('userPhone') || '';

            if (!parsedUser.name?.trim() || !phone.trim() || !farmName.trim() || !farmLocation.trim()) {
              showToast('Please complete your profile before creating a listing.', {
                variant: 'warning',
                title: 'Profile Incomplete',
              });
              navigate('/farmer-settings', { state: { returnTo: '/farmer/new-listing', incompleteProfile: true } });
              return;
            }
          } finally {
            setProfileChecking(false);
          }
        };

        checkProfile();
      } catch (e) {
        navigate('/auth');
      }
    } else {
      navigate('/auth');
    }
  }, [navigate]);
  
  // Update shelf life when product type changes
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      shelfLife: getDefaultShelfLife(prev.productType)
    }));
  }, [formData.productType]);
  
  // Get smart price suggestion when relevant fields change
  useEffect(() => {
    if (formData.quantity > 0) {
      getSmartPriceSuggestion(formData.productType, formData.quantity).then(suggestion => {
        setPriceSuggestion(suggestion);
      });
    }
  }, [formData.productType, formData.quantity]);
  
  // Get user location
  const getUserLocation = useCallback(() => {
    setLocationLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          // Reverse geocode using OpenStreetMap Nominatim
          try {
            const geoResponse = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
              { headers: { 'Accept-Language': 'en' } }
            );
            if (geoResponse.ok) {
              const geoData = await geoResponse.json();
              const addr = geoData.address || {};
              setLocation({
                lat: latitude,
                lng: longitude,
                address: geoData.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
                district: addr.county || addr.city_district || addr.city || '',
                state: addr.state || '',
                pincode: addr.postcode || ''
              });
            } else {
              setLocation({
                lat: latitude,
                lng: longitude,
                address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
                district: '',
                state: '',
                pincode: ''
              });
            }
          } catch {
            setLocation({
              lat: latitude,
              lng: longitude,
              address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
              district: '',
              state: '',
              pincode: ''
            });
          }
          setLocationLoading(false);
        },
        (error) => {
          console.error('Geolocation error:', error);
          setLocationLoading(false);
        }
      );
    } else {
      setLocationLoading(false);
    }
  }, []);
  
  useEffect(() => {
    getUserLocation();
  }, [getUserLocation]);
  
  // Handle form changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    }));
  };
  
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }));
  };
  
  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.src = reader.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          let width = img.width;
          let height = img.height;
          const maxWidth = 600;
          
          if (width > maxWidth) {
            height = (maxWidth / width) * height;
            width = maxWidth;
          }
          
          canvas.width = width;
          canvas.height = height;
          ctx?.drawImage(img, 0, 0, width, height);
          
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
          setImagePreview(prev => [...prev, compressedBase64]);
          setFormData(prev => ({
            ...prev,
            images: [...prev.images, compressedBase64]
          }));
        };
      };
      reader.readAsDataURL(file);
    });
  };
  
  const removeImage = (index: number) => {
    setImagePreview(prev => prev.filter((_, i) => i !== index));
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };
  
  // Handle tags
  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };
  
  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };
  
  // Apply smart price suggestion
  const applyPriceSuggestion = () => {
    if (priceSuggestion) {
      setFormData(prev => ({
        ...prev,
        price: priceSuggestion.suggestedPrice
      }));
      setShowPriceSuggestion(false);
    }
  };
  
  // Calculate estimated expiry date
  const getExpiryDate = (): string => {
    const harvest = new Date(formData.harvestDate);
    harvest.setDate(harvest.getDate() + formData.shelfLife);
    return harvest.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };
  
  // Calculate spoilage countdown preview
  const getSpoilagePreview = (): { days: number; percent: number; color: string } => {
    const now = new Date();
    const harvest = new Date(formData.harvestDate);
    const expiry = new Date(harvest);
    expiry.setDate(expiry.getDate() + formData.shelfLife);
    
    const totalLife = formData.shelfLife * 24 * 60 * 60 * 1000;
    const remaining = expiry.getTime() - now.getTime();
    const percent = Math.max(0, Math.min(100, (remaining / totalLife) * 100));
    const days = Math.max(0, Math.floor(remaining / (1000 * 60 * 60 * 24)));
    
    let color = '#00C853';
    if (percent < 20) color = '#FF1744';
    else if (percent < 40) color = '#FF9100';
    else if (percent < 60) color = '#FFD600';
    else if (percent < 80) color = '#AEEA00';
    
    return { days, percent, color };
  };
  
  // Navigation
  const nextStep = () => {
    if (step < 4) setStep(step + 1);
  };
  
  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };
  
  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      const listingData = {
        farmer_id: user?.id,
        farmer_name: user?.name,
        title: formData.title,
        description: formData.description,
        type: formData.productType,
        variety: formData.variety,
        quantity: formData.quantity.toString(),
        unit: formData.unit,
        harvest_date: formData.harvestDate,
        shelf_life: formData.shelfLife,
        expiry_date: getExpiryDate(),
        price: formData.price,
        selling_mode: formData.sellingMode,
        auto_donate_threshold: formData.sellingMode === 'auto_donate' ? formData.autoDonateThreshold : null,
        bulk_discount: formData.enableBulkDiscount ? {
          min_quantity: formData.bulkMinQuantity,
          discount_percent: formData.bulkDiscountPercent
        } : null,
        enable_auto_reduction: formData.enableAutoReduction,
        autopilot_min_price: formData.enableAutoReduction ? formData.autoPilotMinPrice : null,
        is_organic: formData.isOrganic,
        is_certified: formData.isCertified,
        pickup_available: formData.pickupAvailable,
        delivery_available: formData.deliveryAvailable,
        delivery_radius: formData.deliveryAvailable ? formData.deliveryRadius : null,
        pickup_address: location?.address,
        location: location,
        images: formData.images,
        tags: formData.tags,
        status: 'active'
      };
      
      const response = await fetch(API_ENDPOINTS.marketplace.listings, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(listingData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to create listing');
      }
      
      // Success
      showToast('🎉 Listing created successfully! Your produce is now visible on the marketplace.', {
        variant: 'success',
        title: 'Success',
      });
      navigate('/marketplace');
      
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const spoilagePreview = getSpoilagePreview();
  
  if (profileChecking) {
    return (
      <div className="farmer-listing-form" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', flexDirection: 'column', gap: '16px' }}>
        <div style={{ width: '40px', height: '40px', border: '4px solid #e0e0e0', borderTop: '4px solid #2e7d32', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#757575', fontSize: '14px' }}>Checking profile...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="farmer-listing-form">
      {/* Header */}
      <header className="form-header">
        <div className="header-content">
          <button className="back-btn" onClick={() => navigate(-1)}>
            ← Back
          </button>
          <div className="header-title">
            <h1>🌾 Create New Listing</h1>
            <p>List your produce on ANNAM Marketplace</p>
          </div>
        </div>
      </header>
      
      {/* Progress Steps */}
      <div className="progress-steps">
        <div className="progress-container">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className={`step ${step >= s ? 'active' : ''} ${step === s ? 'current' : ''}`}>
              <div className="step-number">{s}</div>
              <span className="step-label">
                {s === 1 && 'Product Info'}
                {s === 2 && 'Pricing'}
                {s === 3 && 'Options'}
                {s === 4 && 'Review'}
              </span>
            </div>
          ))}
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${((step - 1) / 3) * 100}%` }} />
          </div>
        </div>
      </div>
      
      {/* Form */}
      <form onSubmit={handleSubmit} className="listing-form">
        <div className="form-container">
          {/* Step 1: Product Info */}
          {step === 1 && (
            <div className="form-step">
              <h2>📦 Product Information</h2>
              
              <div className="form-grid">
                {/* Product Type */}
                <div className="form-group full-width">
                  <label>Product Type *</label>
                  <div className="product-type-grid">
                    {(['Vegetable', 'Fruit', 'Grain', 'Dairy', 'Pulses', 'Spices', 'Other'] as ProductType[]).map(type => (
                      <button
                        key={type}
                        type="button"
                        className={`type-btn ${formData.productType === type ? 'active' : ''}`}
                        onClick={() => setFormData(prev => ({ ...prev, productType: type }))}
                      >
                        <span className="type-icon">{getProductIcon(type)}</span>
                        <span className="type-label">{type}</span>
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Title */}
                <div className="form-group full-width">
                  <label>Product Title *</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="e.g., Fresh Organic Tomatoes"
                    required
                  />
                </div>
                
                {/* Variety */}
                <div className="form-group">
                  <label>Variety / Type</label>
                  <input
                    type="text"
                    name="variety"
                    value={formData.variety}
                    onChange={handleChange}
                    placeholder="e.g., Cherry Tomatoes"
                  />
                </div>
                
                {/* Quantity & Unit */}
                <div className="form-group">
                  <label>Quantity Available *</label>
                  <div className="input-with-unit">
                    <input
                      type="number"
                      name="quantity"
                      value={formData.quantity || ''}
                      onChange={handleChange}
                      placeholder="0"
                      min="1"
                      required
                    />
                    <select
                      name="unit"
                      value={formData.unit}
                      onChange={handleChange}
                    >
                      <option value="kg">Kilograms</option>
                      <option value="quintal">Quintals</option>
                      <option value="ton">Tons</option>
                      <option value="pieces">Pieces</option>
                      <option value="dozen">Dozens</option>
                      <option value="bundle">Bundles</option>
                      <option value="liter">Liters</option>
                    </select>
                  </div>
                </div>
                
                {/* Description */}
                <div className="form-group full-width">
                  <label>Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Describe your produce - quality, growing methods, etc."
                    rows={4}
                  />
                </div>
                
                {/* Images */}
                <div className="form-group full-width">
                  <label>Product Images</label>
                  <div className="image-upload-area">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      id="image-input"
                      hidden
                    />
                    <label htmlFor="image-input" className="upload-btn">
                      <span>📷</span>
                      <span>Add Photos</span>
                    </label>
                    <div className="image-previews">
                      {imagePreview.map((img, idx) => (
                        <div key={idx} className="image-preview">
                          <img src={img} alt={`Preview ${idx + 1}`} />
                          <button type="button" onClick={() => removeImage(idx)}>✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Harvest Date & Shelf Life */}
                <div className="form-group">
                  <label>Harvest Date *</label>
                  <input
                    type="date"
                    name="harvestDate"
                    value={formData.harvestDate}
                    onChange={handleChange}
                    max={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Shelf Life (days) *</label>
                  <input
                    type="number"
                    name="shelfLife"
                    value={formData.shelfLife}
                    onChange={handleChange}
                    min="1"
                    required
                  />
                </div>
                
                {/* Spoilage Preview */}
                <div className="form-group full-width">
                  <div className="spoilage-preview">
                    <div className="preview-header">
                      <span className="preview-label">⏰ Spoilage Countdown Preview</span>
                      <span className="preview-expiry">Expires: {getExpiryDate()}</span>
                    </div>
                    <div className="preview-bar">
                      <div 
                        className="preview-fill" 
                        style={{ width: `${spoilagePreview.percent}%`, backgroundColor: spoilagePreview.color }}
                      />
                    </div>
                    <span className="preview-days" style={{ color: spoilagePreview.color }}>
                      {spoilagePreview.days} days remaining
                    </span>
                  </div>
                </div>
                
                {/* Tags */}
                <div className="form-group full-width">
                  <label>Tags</label>
                  <div className="tags-input">
                    <div className="tags-list">
                      {formData.tags.map(tag => (
                        <span key={tag} className="tag">
                          {tag}
                          <button type="button" onClick={() => removeTag(tag)}>✕</button>
                        </span>
                      ))}
                    </div>
                    <div className="tag-input-row">
                      <input
                        type="text"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        placeholder="Add tags (e.g., organic, local)"
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      />
                      <button type="button" onClick={addTag}>Add</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Step 2: Pricing */}
          {step === 2 && (
            <div className="form-step">
              <h2>💰 Pricing & Selling Options</h2>
              
              <div className="form-grid">
                {/* Selling Mode */}
                <div className="form-group full-width">
                  <label>How do you want to sell?</label>
                  <div className="selling-mode-grid">
                    {[
                      { mode: 'sell' as SellingMode, icon: '💵', label: 'Sell Only', desc: 'Sell at your price' },
                      { mode: 'donate' as SellingMode, icon: '🤝', label: 'Donate Only', desc: 'Donate to NGOs' },
                      { mode: 'auto_donate' as SellingMode, icon: '⚡', label: 'Auto-Donate', desc: 'Donate if unsold' },
                      { mode: 'flexible' as SellingMode, icon: '🔄', label: 'Flexible', desc: 'Sell or donate' }
                    ].map(option => (
                      <button
                        key={option.mode}
                        type="button"
                        className={`mode-btn ${formData.sellingMode === option.mode ? 'active' : ''}`}
                        onClick={() => setFormData(prev => ({ ...prev, sellingMode: option.mode }))}
                      >
                        <span className="mode-icon">{option.icon}</span>
                        <span className="mode-label">{option.label}</span>
                        <span className="mode-desc">{option.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Auto-donate threshold */}
                {formData.sellingMode === 'auto_donate' && (
                  <div className="form-group full-width">
                    <div className="auto-donate-config">
                      <label>🕐 Auto-donate when</label>
                      <div className="threshold-input">
                        <input
                          type="number"
                          name="autoDonateThreshold"
                          value={formData.autoDonateThreshold}
                          onChange={handleChange}
                          min="1"
                          max={formData.shelfLife}
                        />
                        <span>days before expiry</span>
                      </div>
                      <p className="hint">
                        If unsold, your produce will be automatically offered to nearby NGOs {formData.autoDonateThreshold} days before expiry.
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Price */}
                {formData.sellingMode !== 'donate' && (
                  <>
                    <div className="form-group">
                      <label>Price per {formData.unit} *</label>
                      <div className="price-input">
                        <span className="currency">₹</span>
                        <input
                          type="number"
                          name="price"
                          value={formData.price || ''}
                          onChange={handleChange}
                          placeholder="0"
                          min="1"
                          required={formData.sellingMode === 'sell' || formData.sellingMode === 'flexible'}
                        />
                      </div>
                    </div>
                    
                    <div className="form-group">
                      <label>Smart Price Assistant</label>
                      <button
                        type="button"
                        className="smart-price-btn"
                        onClick={() => setShowPriceSuggestion(true)}
                      >
                        🤖 Get AI Suggestion
                      </button>
                    </div>
                    
                    {/* Smart Price Suggestion Modal */}
                    {showPriceSuggestion && priceSuggestion && (
                      <div className="form-group full-width">
                        <div className="price-suggestion-card">
                          <div className="suggestion-header">
                            <span>🤖 AI Price Recommendation</span>
                            <button type="button" onClick={() => setShowPriceSuggestion(false)}>✕</button>
                          </div>
                          <div className="suggestion-content">
                            <div className="suggested-price">
                              <span className="label">Suggested Price</span>
                              <span className="price">{formatPrice(priceSuggestion.suggestedPrice)}/{formData.unit}</span>
                            </div>
                            <p className="reasoning">{priceSuggestion.reasoning}</p>
                            <div className="market-comparison">
                              <div className="comparison-item">
                                <span className="value">{formatPrice(priceSuggestion.marketComparison.lowestPrice)}</span>
                                <span className="label">Lowest</span>
                              </div>
                              <div className="comparison-item highlight">
                                <span className="value">{formatPrice(priceSuggestion.marketComparison.averagePrice)}</span>
                                <span className="label">Average</span>
                              </div>
                              <div className="comparison-item">
                                <span className="value">{formatPrice(priceSuggestion.marketComparison.highestPrice)}</span>
                                <span className="label">Highest</span>
                              </div>
                            </div>
                            <div className="demand-indicator">
                              <span>Demand: </span>
                              <span className={`demand-level ${priceSuggestion.demandLevel}`}>
                                {priceSuggestion.demandLevel.toUpperCase()}
                              </span>
                              <span className="competitors">
                                ({priceSuggestion.competitorCount} similar listings)
                              </span>
                            </div>
                            <button type="button" className="apply-suggestion" onClick={applyPriceSuggestion}>
                              ✓ Apply This Price
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Bulk Discount */}
                    <div className="form-group full-width">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          name="enableBulkDiscount"
                          checked={formData.enableBulkDiscount}
                          onChange={handleCheckboxChange}
                        />
                        <span>📦 Enable Bulk Discount</span>
                      </label>
                      
                      {formData.enableBulkDiscount && (
                        <div className="bulk-config">
                          <div className="bulk-input">
                            <label>Min quantity</label>
                            <input
                              type="number"
                              name="bulkMinQuantity"
                              value={formData.bulkMinQuantity}
                              onChange={handleChange}
                              min="1"
                            />
                            <span>{formData.unit}</span>
                          </div>
                          <div className="bulk-input">
                            <label>Discount</label>
                            <input
                              type="number"
                              name="bulkDiscountPercent"
                              value={formData.bulkDiscountPercent}
                              onChange={handleChange}
                              min="1"
                              max="50"
                            />
                            <span>%</span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Auto Price Reduction */}
                    <div className="form-group full-width" style={{ backgroundColor: '#f0fdf4', padding: '16px', borderRadius: '12px', border: '1px solid #bbf7d0' }}>
                      <label className="checkbox-label" style={{ marginBottom: formData.enableAutoReduction ? '12px' : '0' }}>
                        <input
                          type="checkbox"
                          name="enableAutoReduction"
                          checked={formData.enableAutoReduction}
                          onChange={handleCheckboxChange}
                        />
                        <span style={{ fontWeight: 600, color: '#166534' }}>🤖 Enable AI Autopilot (Minimize Waste)</span>
                      </label>
                      {formData.enableAutoReduction && (
                        <div className="autopilot-config">
                          <p className="hint" style={{ color: '#15803d', marginBottom: '12px', fontSize: '13px' }}>
                            The AI will automatically drop prices as expiry approaches to guarantee sale. Set a strict minimum floor price to protect your yield.
                          </p>
                          <div className="price-input" style={{ maxWidth: '200px' }}>
                            <span className="currency">₹</span>
                            <input
                              type="number"
                              name="autoPilotMinPrice"
                              value={formData.autoPilotMinPrice || ''}
                              onChange={handleChange}
                              placeholder="Min floor limit"
                              min="1"
                              max={formData.price}
                              required
                            />
                            <span style={{ fontSize: '12px', color: '#6b7280', alignSelf: 'center', marginLeft: '8px' }}>/{formData.unit}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
          
          {/* Step 3: Options */}
          {step === 3 && (
            <div className="form-step">
              <h2>⚙️ Listing Options</h2>
              
              <div className="form-grid">
                {/* Certifications */}
                <div className="form-group full-width">
                  <label>Certifications</label>
                  <div className="checkbox-grid">
                    <label className="checkbox-card">
                      <input
                        type="checkbox"
                        name="isOrganic"
                        checked={formData.isOrganic}
                        onChange={handleCheckboxChange}
                      />
                      <div className="checkbox-content">
                        <span className="checkbox-icon">🌿</span>
                        <span className="checkbox-label">Organic Certified</span>
                      </div>
                    </label>
                    <label className="checkbox-card">
                      <input
                        type="checkbox"
                        name="isCertified"
                        checked={formData.isCertified}
                        onChange={handleCheckboxChange}
                      />
                      <div className="checkbox-content">
                        <span className="checkbox-icon">📜</span>
                        <span className="checkbox-label">FSSAI Certified</span>
                      </div>
                    </label>
                  </div>
                </div>
                
                {/* Location */}
                <div className="form-group full-width">
                  <label>Pickup Location</label>
                  <div className="location-display">
                    {locationLoading ? (
                      <span className="loading">📍 Getting your location...</span>
                    ) : location ? (
                      <div className="location-info">
                        <span className="location-icon">📍</span>
                        <span className="location-text">{location.address}</span>
                        <button type="button" onClick={getUserLocation}>Refresh</button>
                      </div>
                    ) : (
                      <button type="button" onClick={getUserLocation}>
                        📍 Get My Location
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Pickup & Delivery */}
                <div className="form-group full-width">
                  <label>Fulfillment Options</label>
                  <div className="checkbox-grid">
                    <label className="checkbox-card">
                      <input
                        type="checkbox"
                        name="pickupAvailable"
                        checked={formData.pickupAvailable}
                        onChange={handleCheckboxChange}
                      />
                      <div className="checkbox-content">
                        <span className="checkbox-icon">🏪</span>
                        <span className="checkbox-label">Pickup Available</span>
                        <span className="checkbox-desc">Buyers can pick up from your location</span>
                      </div>
                    </label>
                    <label className="checkbox-card">
                      <input
                        type="checkbox"
                        name="deliveryAvailable"
                        checked={formData.deliveryAvailable}
                        onChange={handleCheckboxChange}
                      />
                      <div className="checkbox-content">
                        <span className="checkbox-icon">🚚</span>
                        <span className="checkbox-label">Delivery Available</span>
                        <span className="checkbox-desc">You can deliver to buyers</span>
                      </div>
                    </label>
                  </div>
                </div>
                
                {/* Delivery Radius */}
                {formData.deliveryAvailable && (
                  <div className="form-group full-width">
                    <label>Delivery Radius: {formData.deliveryRadius} km</label>
                    <input
                      type="range"
                      name="deliveryRadius"
                      value={formData.deliveryRadius}
                      onChange={handleChange}
                      min="5"
                      max="500"
                      className="range-slider"
                    />
                    <div className="range-labels">
                      <span>5 km</span>
                      <span>500 km</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Step 4: Review */}
          {step === 4 && (
            <div className="form-step">
              <h2>👀 Review Your Listing</h2>
              
              <div className="review-card">
                <div className="review-header">
                  <div className="review-image">
                    {imagePreview.length > 0 ? (
                      <img src={imagePreview[0]} alt="Product" />
                    ) : (
                      <span className="placeholder-icon">{getProductIcon(formData.productType)}</span>
                    )}
                  </div>
                  <div className="review-title">
                    <h3>{formData.title || 'Untitled Product'}</h3>
                    <p className="review-type">{formData.productType} {formData.variety && `• ${formData.variety}`}</p>
                  </div>
                </div>
                
                <div className="review-grid">
                  <div className="review-item">
                    <span className="label">Quantity</span>
                    <span className="value">{formData.quantity} {formData.unit}</span>
                  </div>
                  <div className="review-item">
                    <span className="label">Price</span>
                    <span className="value">
                      {formData.sellingMode === 'donate' 
                        ? 'Free (Donation)' 
                        : `${formatPrice(formData.price)}/${formData.unit}`
                      }
                    </span>
                  </div>
                  <div className="review-item">
                    <span className="label">Harvest Date</span>
                    <span className="value">{new Date(formData.harvestDate).toLocaleDateString()}</span>
                  </div>
                  <div className="review-item">
                    <span className="label">Expires</span>
                    <span className="value">{getExpiryDate()}</span>
                  </div>
                  <div className="review-item">
                    <span className="label">Selling Mode</span>
                    <span className="value mode-badge">
                      {formData.sellingMode === 'sell' && '💵 Sell Only'}
                      {formData.sellingMode === 'donate' && '🤝 Donate'}
                      {formData.sellingMode === 'auto_donate' && '⚡ Auto-Donate'}
                      {formData.sellingMode === 'flexible' && '🔄 Flexible'}
                    </span>
                  </div>
                  <div className="review-item">
                    <span className="label">Location</span>
                    <span className="value">{location?.address || 'Not set'}</span>
                  </div>
                </div>
                
                <div className="review-features">
                  {formData.isOrganic && <span className="feature">🌿 Organic</span>}
                  {formData.isCertified && <span className="feature">📜 FSSAI</span>}
                  {formData.pickupAvailable && <span className="feature">🏪 Pickup</span>}
                  {formData.deliveryAvailable && <span className="feature">🚚 Delivery ({formData.deliveryRadius}km)</span>}
                  {formData.enableBulkDiscount && <span className="feature">📦 Bulk Discount</span>}
                  {formData.enableAutoReduction && <span className="feature">📉 Auto-Price</span>}
                </div>
                
                {formData.tags.length > 0 && (
                  <div className="review-tags">
                    {formData.tags.map(tag => (
                      <span key={tag} className="tag">{tag}</span>
                    ))}
                  </div>
                )}
                
                {formData.description && (
                  <div className="review-description">
                    <p>{formData.description}</p>
                  </div>
                )}
                
                {/* Impact Preview */}
                <div className="impact-preview">
                  <h4>🌍 Estimated Impact</h4>
                  <div className="impact-stats">
                    <div className="impact-stat">
                      <span className="value">~{Math.round(formData.quantity * 3.3)}</span>
                      <span className="label">Meals Potential</span>
                    </div>
                    <div className="impact-stat">
                      <span className="value">~{Math.round(formData.quantity * 0.5)} kg</span>
                      <span className="label">CO₂ Saved</span>
                    </div>
                    <div className="impact-stat">
                      <span className="value">~{Math.round(formData.quantity * 30)} L</span>
                      <span className="label">Water Saved</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {error && (
                <div className="error-message">
                  ⚠️ {error}
                </div>
              )}
            </div>
          )}
          
          {/* Form Actions */}
          <div className="form-actions">
            {step > 1 && (
              <button type="button" className="btn-secondary" onClick={prevStep}>
                ← Previous
              </button>
            )}
            
            {step < 4 ? (
              <button type="button" className="btn-primary" onClick={nextStep}>
                Next →
              </button>
            ) : (
              <button type="submit" className="btn-submit" disabled={isSubmitting}>
                {isSubmitting ? '🔄 Publishing...' : '🚀 Publish Listing'}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default FarmerListingForm;
