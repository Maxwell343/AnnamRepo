import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './FarmerProfileSetup.css';
import { API_ENDPOINTS } from '../../../config/api';

// ─── Types ────────────────────────────────────────────────────────────────────

type FarmingType = 'Organic' | 'Conventional' | 'Mixed' | '';
type StorageFacility = 'Cold Storage' | 'Warehouse' | 'None';

const ALL_CROPS = [
  'Wheat', 'Rice', 'Maize', 'Bajra', 'Jowar', 'Barley', 'Ragi',
  'Tomato', 'Potato', 'Onion', 'Brinjal', 'Cabbage', 'Cauliflower', 'Spinach',
  'Lady Finger', 'Carrot', 'Peas', 'Bitter Gourd', 'Bottle Gourd', 'Pumpkin',
  'Mango', 'Banana', 'Papaya', 'Guava', 'Pomegranate', 'Sugarcane',
  'Groundnut', 'Soybean', 'Sunflower', 'Cotton', 'Turmeric', 'Ginger', 'Chilli',
  'Lentils', 'Chickpeas', 'Black Gram', 'Green Gram', 'Pigeon Pea',
] as const;

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];

const NGO_OPTIONS = [
  'Feeding India', 'Robin Hood Army', 'No Food Waste', 'Akshaya Patra', 'Goonj',
  'Pratham', 'HelpAge India', 'CRY India', 'Any Available NGO',
];

interface ProfileData {
  // Step 1 – Personal
  fullName: string;
  phone: string;
  email: string;
  aadhaar: string;
  profilePhoto: string;

  // Step 2 – Farm Location
  farmAddress: string;
  village: string;
  taluka: string;
  district: string;
  state: string;
  pincode: string;
  gpsLat: string;
  gpsLng: string;

  // Step 3 – Farm Details
  farmSize: string;
  farmSizeUnit: 'acres' | 'hectares' | 'bigha';
  farmingType: FarmingType;
  storageFacilities: StorageFacility[];

  // Step 4 – Crops
  primaryCrops: string[];

  // Step 5 – Rescue Preferences
  autoNgoRescue: boolean;
  minSellingPrice: string;
  discountThreshold: string;
  preferredNgos: string[];
}

interface Errors { [key: string]: string }

const STEPS = [
  { id: 1, icon: '👤', label: 'Personal Info', required: true },
  { id: 2, icon: '📍', label: 'Farm Location', required: true },
  { id: 3, icon: '🌾', label: 'Farm Details', required: true },
  { id: 4, icon: '🌱', label: 'Crops Grown', required: true },
  { id: 5, icon: '🤝', label: 'Rescue Prefs', required: false },
];

const INITIAL: ProfileData = {
  fullName: '', phone: '', email: '', aadhaar: '', profilePhoto: '',
  farmAddress: '', village: '', taluka: '', district: '', state: '', pincode: '', gpsLat: '', gpsLng: '',
  farmSize: '', farmSizeUnit: 'acres', farmingType: '', storageFacilities: [],
  primaryCrops: [],
  autoNgoRescue: false, minSellingPrice: '', discountThreshold: '', preferredNgos: [],
};

// ─── Component ────────────────────────────────────────────────────────────────

const FarmerProfileSetup: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = (location.state as any)?.returnTo;
  const [step, setStep] = useState(1);
  const [data, setData] = useState<ProfileData>(INITIAL);
  const [errors, setErrors] = useState<Errors>({});
  const [cropSearch, setCropSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Completion % ──────────────────────────────────────────────────────────
  const calcCompletion = useCallback((): number => {
    const checks = [
      !!data.fullName, !!data.phone, !!data.email,
      !!data.farmAddress, !!data.village, !!data.district, !!data.state, !!data.pincode,
      !!data.farmSize, !!data.farmingType, data.storageFacilities.length > 0,
      data.primaryCrops.length > 0,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [data]);

  const completion = calcCompletion();

  // ── Load existing profile ─────────────────────────────────────────────────
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        if (!user.id) { setIsLoadingProfile(false); return; }
        const res = await fetch(API_ENDPOINTS.farmerProfile(user.id));
        if (res.ok) {
          const p = await res.json();
          if (p?.full_name) {
            setData({
              fullName: p.full_name || '',
              phone: p.phone || '',
              email: p.email || '',
              aadhaar: p.aadhaar || '',
              profilePhoto: p.profile_photo || '',
              farmAddress: p.farm_address || '',
              village: p.village || '',
              taluka: p.taluka || '',
              district: p.district || '',
              state: p.state || '',
              pincode: p.pincode || '',
              gpsLat: p.gps_lat || '',
              gpsLng: p.gps_lng || '',
              farmSize: p.farm_size || '',
              farmSizeUnit: p.farm_size_unit || 'acres',
              farmingType: p.farming_type || '',
              storageFacilities: p.storage_facilities || [],
              primaryCrops: p.primary_crops || [],
              autoNgoRescue: p.auto_ngo_rescue || false,
              minSellingPrice: p.min_selling_price || '',
              discountThreshold: p.discount_threshold || '',
              preferredNgos: p.preferred_ngos || [],
            });

            // Mark profile as complete if required fields exist
            const hasRequired = !!(p.full_name && p.phone && p.farm_address && p.district && p.state && p.pincode && p.farm_size && p.farming_type && (p.primary_crops?.length > 0));
            if (hasRequired) {
              const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
              if (!currentUser.profileComplete) {
                localStorage.setItem('user', JSON.stringify({ ...currentUser, profileComplete: true }));
              }
              // If redirected here by the guard, go back to the original page
              if (returnTo) {
                navigate(returnTo, { replace: true });
                return;
              }
            }
          }
        }
      } catch {
        // network error – user fills in manually
      } finally {
        setIsLoadingProfile(false);
      }
    };
    loadProfile();
  }, []);

  // ── Field change ──────────────────────────────────────────────────────────
  const set = (field: keyof ProfileData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setData(prev => ({ ...prev, [field]: e.target.value }));
      if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
    };

  const toggleStorage = (val: StorageFacility) => {
    setData(prev => {
      const has = prev.storageFacilities.includes(val);
      return { ...prev, storageFacilities: has ? prev.storageFacilities.filter(s => s !== val) : [...prev.storageFacilities, val] };
    });
  };

  const toggleCrop = (crop: string) => {
    setData(prev => {
      const has = prev.primaryCrops.includes(crop);
      return { ...prev, primaryCrops: has ? prev.primaryCrops.filter(c => c !== crop) : [...prev.primaryCrops, crop] };
    });
  };

  const toggleNgo = (ngo: string) => {
    setData(prev => {
      const has = prev.preferredNgos.includes(ngo);
      return { ...prev, preferredNgos: has ? prev.preferredNgos.filter(n => n !== ngo) : [...prev.preferredNgos, ngo] };
    });
  };

  // ── Photo upload ──────────────────────────────────────────────────────────
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setErrors(p => ({ ...p, profilePhoto: 'Photo must be under 5 MB' })); return; }
    const reader = new FileReader();
    reader.onload = ev => setData(prev => ({ ...prev, profilePhoto: ev.target?.result as string }));
    reader.readAsDataURL(file);
  };

  // ── GPS auto-detect ───────────────────────────────────────────────────────
  const detectGps = () => {
    if (!navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setData(prev => ({ ...prev, gpsLat: pos.coords.latitude.toFixed(6), gpsLng: pos.coords.longitude.toFixed(6) }));
        setGpsLoading(false);
      },
      () => setGpsLoading(false),
    );
  };

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = (s: number): Errors => {
    const e: Errors = {};
    if (s === 1) {
      if (!data.fullName.trim()) e.fullName = 'Full name is required';
      if (!data.phone.trim()) e.phone = 'Phone number is required';
      else if (!/^[6-9]\d{9}$/.test(data.phone.replace(/\s/g, ''))) e.phone = 'Enter a valid 10-digit Indian mobile number';
      if (!data.email.trim()) e.email = 'Email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) e.email = 'Enter a valid email address';
    }
    if (s === 2) {
      if (!data.farmAddress.trim()) e.farmAddress = 'Farm address is required';
      if (!data.village.trim()) e.village = 'Village / Town is required';
      if (!data.district.trim()) e.district = 'District is required';
      if (!data.state) e.state = 'State is required';
      if (!data.pincode.trim()) e.pincode = 'Pincode is required';
      else if (!/^\d{6}$/.test(data.pincode)) e.pincode = 'Pincode must be 6 digits';
    }
    if (s === 3) {
      if (!data.farmSize.trim()) e.farmSize = 'Farm size is required';
      else if (isNaN(Number(data.farmSize)) || Number(data.farmSize) <= 0) e.farmSize = 'Enter a valid farm size';
      if (!data.farmingType) e.farmingType = 'Select a farming type';
      if (data.storageFacilities.length === 0) e.storageFacilities = 'Select at least one storage option';
    }
    if (s === 4) {
      if (data.primaryCrops.length === 0) e.primaryCrops = 'Select at least one crop';
    }
    return e;
  };

  const next = () => {
    const errs = validate(step);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setStep(s => Math.min(s + 1, 5));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const back = () => {
    setErrors({});
    setStep(s => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const skipAndSubmit = () => handleSubmit(true);

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (skipped = false) => {
    if (!skipped) {
      const errs = validate(step);
      if (Object.keys(errs).length) { setErrors(errs); return; }
    }
    setIsSaving(true);
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const res = await fetch(API_ENDPOINTS.farmerProfile(user.id), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmer_id: user.id,
          full_name: data.fullName,
          phone: data.phone,
          email: data.email,
          aadhaar: data.aadhaar,
          profile_photo: data.profilePhoto,
          farm_address: data.farmAddress,
          village: data.village,
          taluka: data.taluka,
          district: data.district,
          state: data.state,
          pincode: data.pincode,
          gps_lat: data.gpsLat,
          gps_lng: data.gpsLng,
          farm_size: data.farmSize,
          farm_size_unit: data.farmSizeUnit,
          farming_type: data.farmingType,
          storage_facilities: data.storageFacilities,
          primary_crops: data.primaryCrops,
          auto_ngo_rescue: data.autoNgoRescue,
          min_selling_price: data.minSellingPrice,
          discount_threshold: data.discountThreshold,
          preferred_ngos: data.preferredNgos,
        }),
      });
      if (!res.ok) throw new Error('API error');
      localStorage.setItem('user', JSON.stringify({ ...user, profileComplete: true }));
      setIsComplete(true);
    } catch {
      setErrors({ submit: 'Failed to save profile. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  // ── Filtered crops ────────────────────────────────────────────────────────
  const filteredCrops = ALL_CROPS.filter(c => c.toLowerCase().includes(cropSearch.toLowerCase()));

  // ─────────────────────────────────────────────────────────────────────────
  // SUCCESS SCREEN
  // ─────────────────────────────────────────────────────────────────────────
  if (isLoadingProfile) {
    return (
      <div className="fps-page-loading">
        <div className="fps-spinner-lg" />
        <p>Loading your profile…</p>
      </div>
    );
  }

  if (isComplete) {
    return (
      <div className="fps-success-screen">
        <div className="fps-success-card">
          <div className="fps-success-anim">
            <div className="fps-check-circle">
              <svg viewBox="0 0 52 52" fill="none">
                <circle className="fps-check-bg" cx="26" cy="26" r="25" />
                <path className="fps-check-mark" d="M14 27l8 8 16-16" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          <h1>Profile Complete!</h1>
          <p className="fps-success-sub">Your farmer profile has been set up successfully. You're ready to start listing your produce.</p>
          <div className="fps-success-stats">
            <div className="fps-stat"><span>{data.primaryCrops.length}</span><small>Crops Added</small></div>
            <div className="fps-stat"><span>{data.farmSize || '—'}</span><small>{data.farmSizeUnit}</small></div>
            <div className="fps-stat"><span>{data.state || '—'}</span><small>State</small></div>
          </div>
          <div className="fps-success-actions">
            <button className="fps-btn-primary" onClick={() => navigate('/listing')}>➕ Create First Listing</button>
            <button className="fps-btn-outline" onClick={() => navigate('/home')}>Go to Dashboard</button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP CONTENT
  // ─────────────────────────────────────────────────────────────────────────
  const renderStep = () => {
    switch (step) {
      // ── Step 1 ─────────────────────────────────────────────────────────
      case 1: return (
        <div className="fps-step-body">
          <div className="fps-photo-upload" onClick={() => fileInputRef.current?.click()}>
            {data.profilePhoto
              ? <img src={data.profilePhoto} alt="Profile" />
              : <div className="fps-photo-placeholder"><span>📷</span><p>Upload Photo</p></div>
            }
            <div className="fps-photo-overlay"><span>✏️ Change</span></div>
            <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handlePhotoUpload} />
          </div>
          {errors.profilePhoto && <p className="fps-error">{errors.profilePhoto}</p>}

          <div className="fps-form-grid">
            <div className="fps-field fps-full">
              <label>Full Name <span className="fps-req">*</span></label>
              <input type="text" placeholder="e.g. Raju Patil" value={data.fullName} onChange={set('fullName')} className={errors.fullName ? 'fps-error-input' : ''} />
              {errors.fullName && <span className="fps-error">{errors.fullName}</span>}
            </div>

            <div className="fps-field">
              <label>Phone Number <span className="fps-req">*</span></label>
              <div className="fps-phone-row">
                <span className="fps-phone-prefix">🇮🇳 +91</span>
                <input type="tel" placeholder="9876543210" maxLength={10} value={data.phone} onChange={set('phone')} className={errors.phone ? 'fps-error-input' : ''} />
              </div>
              {errors.phone && <span className="fps-error">{errors.phone}</span>}
            </div>

            <div className="fps-field">
              <label>Email Address <span className="fps-req">*</span></label>
              <input type="email" placeholder="you@example.com" value={data.email} onChange={set('email')} className={errors.email ? 'fps-error-input' : ''} />
              {errors.email && <span className="fps-error">{errors.email}</span>}
            </div>

            <div className="fps-field fps-full">
              <label>Aadhaar / Farmer ID <span className="fps-optional">(optional)</span></label>
              <input type="text" placeholder="XXXX-XXXX-XXXX" maxLength={14} value={data.aadhaar} onChange={set('aadhaar')} />
              <span className="fps-hint">Used for identity verification. Stored securely.</span>
            </div>
          </div>
        </div>
      );

      // ── Step 2 ─────────────────────────────────────────────────────────
      case 2: return (
        <div className="fps-step-body">
          <div className="fps-form-grid">
            <div className="fps-field fps-full">
              <label>Farm Address <span className="fps-req">*</span></label>
              <textarea rows={2} placeholder="Survey No, Plot No, Street / Road" value={data.farmAddress} onChange={set('farmAddress')} className={errors.farmAddress ? 'fps-error-input' : ''} />
              {errors.farmAddress && <span className="fps-error">{errors.farmAddress}</span>}
            </div>

            <div className="fps-field">
              <label>Village / Town <span className="fps-req">*</span></label>
              <input type="text" placeholder="Village or Town name" value={data.village} onChange={set('village')} className={errors.village ? 'fps-error-input' : ''} />
              {errors.village && <span className="fps-error">{errors.village}</span>}
            </div>

            <div className="fps-field">
              <label>Taluka / Block <span className="fps-optional">(optional)</span></label>
              <input type="text" placeholder="Taluka name" value={data.taluka} onChange={set('taluka')} />
            </div>

            <div className="fps-field">
              <label>District <span className="fps-req">*</span></label>
              <input type="text" placeholder="District name" value={data.district} onChange={set('district')} className={errors.district ? 'fps-error-input' : ''} />
              {errors.district && <span className="fps-error">{errors.district}</span>}
            </div>

            <div className="fps-field">
              <label>State <span className="fps-req">*</span></label>
              <select value={data.state} onChange={set('state')} className={errors.state ? 'fps-error-input' : ''}>
                <option value="">Select State</option>
                {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {errors.state && <span className="fps-error">{errors.state}</span>}
            </div>

            <div className="fps-field">
              <label>Pincode <span className="fps-req">*</span></label>
              <input type="text" placeholder="6-digit pincode" maxLength={6} value={data.pincode} onChange={set('pincode')} className={errors.pincode ? 'fps-error-input' : ''} />
              {errors.pincode && <span className="fps-error">{errors.pincode}</span>}
            </div>
          </div>

          {/* GPS Section */}
          <div className="fps-gps-card">
            <div className="fps-gps-header">
              <div>
                <h4>📡 GPS Coordinates <span className="fps-optional">(Recommended)</span></h4>
                <p>Helps NGOs and drivers navigate to your farm accurately</p>
              </div>
              <button type="button" className="fps-gps-btn" onClick={detectGps} disabled={gpsLoading}>
                {gpsLoading ? <><span className="fps-spin">⟳</span> Detecting…</> : '🎯 Auto-Detect'}
              </button>
            </div>
            <div className="fps-gps-inputs">
              <div className="fps-field">
                <label>Latitude</label>
                <input type="text" placeholder="e.g. 18.520430" value={data.gpsLat} onChange={set('gpsLat')} />
              </div>
              <div className="fps-field">
                <label>Longitude</label>
                <input type="text" placeholder="e.g. 73.856743" value={data.gpsLng} onChange={set('gpsLng')} />
              </div>
            </div>
            {data.gpsLat && data.gpsLng && (
              <div className="fps-map-preview">
                <div className="fps-map-placeholder">
                  <span>🗺️</span>
                  <p>Coordinates saved: {data.gpsLat}, {data.gpsLng}</p>
                  <small>Map preview available after profile completion</small>
                </div>
              </div>
            )}
          </div>
        </div>
      );

      // ── Step 3 ─────────────────────────────────────────────────────────
      case 3: return (
        <div className="fps-step-body">
          <div className="fps-form-grid">
            <div className="fps-field">
              <label>Farm Size <span className="fps-req">*</span></label>
              <div className="fps-size-row">
                <input type="number" min="0.1" step="0.1" placeholder="e.g. 3.5" value={data.farmSize} onChange={set('farmSize')} className={errors.farmSize ? 'fps-error-input' : ''} />
                <select value={data.farmSizeUnit} onChange={set('farmSizeUnit')}>
                  <option value="acres">Acres</option>
                  <option value="hectares">Hectares</option>
                  <option value="bigha">Bigha</option>
                </select>
              </div>
              {errors.farmSize && <span className="fps-error">{errors.farmSize}</span>}
            </div>
          </div>

          {/* Farming Type */}
          <div className="fps-field fps-full" style={{ marginTop: '24px' }}>
            <label>Farming Type <span className="fps-req">*</span></label>
            {errors.farmingType && <span className="fps-error">{errors.farmingType}</span>}
            <div className="fps-type-cards">
              {(['Organic', 'Conventional', 'Mixed'] as FarmingType[]).map(t => (
                <button
                  key={t}
                  type="button"
                  className={`fps-type-card ${data.farmingType === t ? 'selected' : ''}`}
                  onClick={() => { setData(p => ({ ...p, farmingType: t })); if (errors.farmingType) setErrors(p => { const n = { ...p }; delete n.farmingType; return n; }); }}
                >
                  <span className="fps-type-icon">{t === 'Organic' ? '🌿' : t === 'Conventional' ? '🏭' : '🔄'}</span>
                  <strong>{t}</strong>
                  <small>{t === 'Organic' ? 'No chemicals / pesticides' : t === 'Conventional' ? 'Standard practices' : 'Combination of methods'}</small>
                </button>
              ))}
            </div>
          </div>

          {/* Storage Facilities */}
          <div className="fps-field fps-full" style={{ marginTop: '24px' }}>
            <label>Storage Facilities <span className="fps-req">*</span></label>
            {errors.storageFacilities && <span className="fps-error">{errors.storageFacilities}</span>}
            <div className="fps-storage-cards">
              {(['Cold Storage', 'Warehouse', 'None'] as StorageFacility[]).map(s => (
                <button
                  key={s}
                  type="button"
                  className={`fps-storage-card ${data.storageFacilities.includes(s) ? 'selected' : ''}`}
                  onClick={() => { toggleStorage(s); if (errors.storageFacilities) setErrors(p => { const n = { ...p }; delete n.storageFacilities; return n; }); }}
                >
                  <span>{s === 'Cold Storage' ? '❄️' : s === 'Warehouse' ? '🏚️' : '🚫'}</span>
                  <strong>{s}</strong>
                </button>
              ))}
            </div>
            <span className="fps-hint">Select all that apply</span>
          </div>
        </div>
      );

      // ── Step 4 ─────────────────────────────────────────────────────────
      case 4: return (
        <div className="fps-step-body">
          <div className="fps-crops-search-row">
            <input
              type="text"
              placeholder="🔍  Search crops…"
              value={cropSearch}
              onChange={e => setCropSearch(e.target.value)}
              className="fps-crop-search"
            />
            {data.primaryCrops.length > 0 && (
              <span className="fps-selected-count">{data.primaryCrops.length} selected</span>
            )}
          </div>

          {errors.primaryCrops && <span className="fps-error" style={{ marginBottom: '12px', display: 'block' }}>{errors.primaryCrops}</span>}

          <div className="fps-crops-grid">
            {filteredCrops.map(crop => (
              <button
                key={crop}
                type="button"
                className={`fps-crop-chip ${data.primaryCrops.includes(crop) ? 'selected' : ''}`}
                onClick={() => { toggleCrop(crop); if (errors.primaryCrops) setErrors(p => { const n = { ...p }; delete n.primaryCrops; return n; }); }}
              >
                {data.primaryCrops.includes(crop) ? '✓ ' : ''}{crop}
              </button>
            ))}
            {filteredCrops.length === 0 && (
              <div className="fps-no-crops">No crops match your search</div>
            )}
          </div>

          {data.primaryCrops.length > 0 && (
            <div className="fps-selected-crops">
              <p className="fps-selected-label">Selected:</p>
              <div className="fps-selected-tags">
                {data.primaryCrops.map(c => (
                  <span key={c} className="fps-tag">
                    {c}
                    <button type="button" onClick={() => toggleCrop(c)}>×</button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      );

      // ── Step 5 ─────────────────────────────────────────────────────────
      case 5: return (
        <div className="fps-step-body">
          <div className="fps-optional-banner">
            <span>🤝</span>
            <div>
              <strong>This step is optional</strong>
              <p>Rescue preferences help NGOs reach you faster. You can always configure these later in Settings.</p>
            </div>
          </div>

          {/* Auto NGO Rescue Toggle */}
          <div className="fps-rescue-toggle-card">
            <div className="fps-rescue-icon">🚨</div>
            <div className="fps-rescue-content">
              <h4>Auto NGO Rescue</h4>
              <p>Automatically notify NGOs when spoilage is predicted for your produce. Prevents food waste.</p>
            </div>
            <label className="fps-toggle">
              <input type="checkbox" checked={data.autoNgoRescue} onChange={e => setData(p => ({ ...p, autoNgoRescue: e.target.checked }))} />
              <span className="fps-toggle-slider" />
            </label>
          </div>

          {/* Pricing Thresholds */}
          <div className="fps-form-grid" style={{ marginTop: '24px' }}>
            <div className="fps-field">
              <label>Minimum Selling Price (₹/kg)</label>
              <div className="fps-rupee-row">
                <span className="fps-rupee">₹</span>
                <input type="number" min="0" step="0.5" placeholder="e.g. 15" value={data.minSellingPrice} onChange={set('minSellingPrice')} />
              </div>
              <span className="fps-hint">Won't accept offers below this for any listing</span>
            </div>

            <div className="fps-field">
              <label>Discount Threshold Before Donation (%)</label>
              <div className="fps-percent-row">
                <input type="number" min="0" max="100" step="5" placeholder="e.g. 50" value={data.discountThreshold} onChange={set('discountThreshold')} />
                <span className="fps-percent">%</span>
              </div>
              <span className="fps-hint">If unsold at this discount, auto-convert to donation</span>
            </div>
          </div>

          {/* Preferred NGOs */}
          <div className="fps-field fps-full" style={{ marginTop: '24px' }}>
            <label>Preferred NGOs <span className="fps-optional">(optional)</span></label>
            <div className="fps-ngo-grid">
              {NGO_OPTIONS.map(ngo => (
                <button
                  key={ngo}
                  type="button"
                  className={`fps-ngo-chip ${data.preferredNgos.includes(ngo) ? 'selected' : ''}`}
                  onClick={() => toggleNgo(ngo)}
                >
                  {data.preferredNgos.includes(ngo) ? '✓ ' : '🏛️ '}{ngo}
                </button>
              ))}
            </div>
            <span className="fps-hint">These NGOs will be preferred when auto-rescue is triggered</span>
          </div>

          {errors.submit && <div className="fps-submit-error">{errors.submit}</div>}
        </div>
      );

      default: return null;
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  const currentStepMeta = STEPS[step - 1];

  return (
    <div className="fps-root">
      {/* ── Top Header ── */}
      <header className="fps-header">
        <div className="fps-header-inner">
          <div className="fps-logo">
            <span className="fps-logo-icon">🌾</span>
            <span className="fps-logo-text">ANNAM</span>
          </div>
          <div className="fps-header-center">
            <h1>Complete Your Farmer Profile</h1>
            <p>Step {step} of 5 — {currentStepMeta.label}</p>
          </div>
          <div className="fps-completion-pill">
            <svg viewBox="0 0 36 36" className="fps-donut">
              <circle className="fps-donut-bg" cx="18" cy="18" r="15.9" />
              <circle
                className="fps-donut-fill"
                cx="18" cy="18" r="15.9"
                strokeDasharray={`${completion} ${100 - completion}`}
                strokeDashoffset="25"
              />
            </svg>
            <span>{completion}%</span>
          </div>
        </div>
      </header>

      {/* ── Progress Bar ── */}
      <div className="fps-progress-bar">
        <div className="fps-progress-fill" style={{ width: `${(step / 5) * 100}%` }} />
      </div>

      {/* ── Step Indicators ── */}
      <div className="fps-steps-row">
        {STEPS.map(s => (
          <div key={s.id} className={`fps-step-dot ${s.id < step ? 'done' : s.id === step ? 'active' : ''}`}>
            <div className="fps-dot-circle">
              {s.id < step ? <span className="fps-check">✓</span> : <span>{s.icon}</span>}
            </div>
            <span className="fps-dot-label">{s.label}</span>
            {!s.required && <span className="fps-optional-badge">Optional</span>}
          </div>
        ))}
      </div>

      {/* ── Main Card ── */}
      <main className="fps-main">
        <div className="fps-card">
          <div className="fps-card-header">
            <div className="fps-step-icon-large">{currentStepMeta.icon}</div>
            <div>
              <h2>{currentStepMeta.label}</h2>
              <p className="fps-step-desc">
                {step === 1 && 'Tell us who you are so NGOs and buyers can trust you'}
                {step === 2 && 'Help drivers and NGOs find your farm on the map'}
                {step === 3 && 'Share your farm type and storage capabilities'}
                {step === 4 && 'Select the crops you grow regularly for quick listing'}
                {step === 5 && 'Set preferences for how ANNAM handles unsold produce'}
              </p>
            </div>
          </div>

          {renderStep()}

          {/* ── Navigation Footer ── */}
          <div className="fps-nav-footer">
            <div className="fps-nav-left">
              {step > 1 && (
                <button type="button" className="fps-btn-back" onClick={back}>
                  ← Back
                </button>
              )}
            </div>
            <div className="fps-nav-right">
              {step === 5 ? (
                <>
                  <button type="button" className="fps-btn-skip" onClick={skipAndSubmit} disabled={isSaving}>
                    Skip & Finish
                  </button>
                  <button type="button" className="fps-btn-primary" onClick={() => handleSubmit(false)} disabled={isSaving}>
                    {isSaving ? <><span className="fps-spin">⟳</span> Saving…</> : '✅ Complete Profile'}
                  </button>
                </>
              ) : (
                <button type="button" className="fps-btn-primary" onClick={next}>
                  Continue →
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default FarmerProfileSetup;
