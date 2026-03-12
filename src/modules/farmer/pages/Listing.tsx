import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Listing.css';
import { API_ENDPOINTS } from '../../../config/api';
import { MapContainer, TileLayer, CircleMarker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { LeafletMouseEvent } from 'leaflet';
import { ArrowLeft, ChevronRight, MapPin, Package, Camera, Upload } from 'lucide-react';

type LatLng = { lat: number; lng: number };

const formatCoords = (coords: LatLng) => `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;

const MapClickToPick: React.FC<{ onPick: (coords: LatLng) => void }> = ({ onPick }) => {
  useMapEvents({
    click(e: LeafletMouseEvent) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
};

const MapFlyTo: React.FC<{ center: LatLng; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo([center.lat, center.lng], zoom, { duration: 1.5 });
  }, [map, center, zoom]);
  return null;
};

const ListingForm: React.FC = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    quantity: '',
    price: '',
    type: 'Vegetable',
    expiry: '',
    description: '',
    image: '',
    pickupAddress: '',
  });
  const [imagePreview, setImagePreview] = useState<string>('');
  const [pickupCoords, setPickupCoords] = useState<LatLng | null>(null);

  const defaultCenter = useMemo<LatLng>(() => ({ lat: 20.5937, lng: 78.9629 }), []);
  const [mapCenter, setMapCenter] = useState<LatLng>(defaultCenter);
  const [mapZoom, setMapZoom] = useState(5);
  const [farmerLocation, setFarmerLocation] = useState<string>('');
  const [profileChecking, setProfileChecking] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (!savedUser) {
      navigate('/auth');
      return;
    }

    try {
      const parsedUser = JSON.parse(savedUser);
      if (parsedUser.role !== 'farmer') {
        navigate('/dashboard');
        return;
      }

      // Check if farmer profile is complete before allowing listing
      const checkProfile = async () => {
        try {
          const response = await fetch(API_ENDPOINTS.farmerSettings(parsedUser.id.toString()));
          const data = await response.json();

          const name = data?.name || parsedUser.name || '';
          const phone = data?.phone || localStorage.getItem('userPhone') || '';
          const farmName = data?.farm_name || localStorage.getItem('farmName') || '';
          const farmLocation = data?.farm_location || localStorage.getItem('farmLocation') || '';

          // Save farm location for map centering
          if (farmLocation.trim()) {
            setFarmerLocation(farmLocation.trim());
          }

          if (!name.trim() || !phone.trim() || !farmName.trim() || !farmLocation.trim()) {
            const missing: string[] = [];
            if (!name.trim()) missing.push('Full Name');
            if (!phone.trim()) missing.push('Phone Number');
            if (!farmName.trim()) missing.push('Farm Name');
            if (!farmLocation.trim()) missing.push('Farm Location');

            alert(`Please complete your profile before creating a listing.\n\nMissing fields: ${missing.join(', ')}`);
            navigate('/farmer-settings', { state: { returnTo: '/listing', incompleteProfile: true } });
            return;
          }
        } catch (err) {
          // Fallback: check localStorage
          const farmName = localStorage.getItem('farmName') || '';
          const farmLocation = localStorage.getItem('farmLocation') || '';
          const phone = localStorage.getItem('userPhone') || '';

          if (farmLocation.trim()) {
            setFarmerLocation(farmLocation.trim());
          }

          if (!parsedUser.name?.trim() || !phone.trim() || !farmName.trim() || !farmLocation.trim()) {
            alert('Please complete your profile before creating a listing.');
            navigate('/farmer-settings', { state: { returnTo: '/listing', incompleteProfile: true } });
            return;
          }
        } finally {
          setProfileChecking(false);
        }
      };

      checkProfile();
    } catch {
      navigate('/auth');
    }
  }, [navigate]);

  // Geocode farmer's saved location to center the map
  useEffect(() => {
    if (!farmerLocation) return;
    const geocode = async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(farmerLocation)}&limit=1`,
          { headers: { 'Accept': 'application/json' } }
        );
        const results = await res.json();
        if (results.length > 0) {
          const coords = { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
          setMapCenter(coords);
          setMapZoom(13);
        }
      } catch (err) {
        console.warn('Geocoding farm location failed:', err);
      }
    };
    geocode();
  }, [farmerLocation]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        // Compress image using canvas
        const img = new Image();
        img.src = reader.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Scale down image to max 400px width
          let width = img.width;
          let height = img.height;
          const maxWidth = 400;
          
          if (width > maxWidth) {
            height = (maxWidth / width) * height;
            width = maxWidth;
          }
          
          canvas.width = width;
          canvas.height = height;
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Convert to base64 with lower quality
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          setImagePreview(compressedBase64);
          setFormData({ ...formData, image: compressedBase64 });
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const savedUser = localStorage.getItem('user');
      if (!savedUser) {
        alert('You must be logged in to create a listing');
        navigate('/');
        return;
      }

      const user = JSON.parse(savedUser);

      const addressText = (formData.pickupAddress || '').trim();
      const coordsText = pickupCoords ? formatCoords(pickupCoords) : '';
      const pickup_address = addressText
        ? (coordsText ? `${addressText} (${coordsText})` : addressText)
        : coordsText;

      if (!pickup_address) {
        alert('Please enter a pickup address or pin a location on the map.');
        setIsSubmitting(false);
        return;
      }

      const response = await fetch(API_ENDPOINTS.listings, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmer_id: user.id,
          farmer_name: user.name,
          title: formData.title,
          quantity: formData.quantity,
          price: formData.price === '' ? null : Number(formData.price),
          type: formData.type,
          expiry_date: formData.expiry,
          description: formData.description,
          pickup_address,
          image: formData.image,
        }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.message || 'Failed to create listing');

      alert('Listing created successfully!');
      setTimeout(() => navigate('/dashboard'), 500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create listing';
      if (message.toLowerCase().includes('failed to fetch')) {
        alert('Error: Failed to reach backend. Please ensure the backend server is running and try again.');
      } else {
        alert(`Error: ${message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (profileChecking) {
    return (
      <div className="lf-loading">
        <div className="lf-spinner" />
        <p>Checking profile…</p>
      </div>
    );
  }

  return (
    <div className="lf-page">

      {/* ── Top Bar ── */}
      <div className="lf-topbar">
        <div className="lf-breadcrumb">
          <button className="lf-back-btn" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={15} />
            Back
          </button>
          <ChevronRight size={14} className="lf-bc-sep" />
          <span className="lf-bc-link" onClick={() => navigate('/my-listings')}>My Listings</span>
          <ChevronRight size={14} className="lf-bc-sep" />
          <span className="lf-bc-current">Create Listing</span>
        </div>
        <div className="lf-topbar-actions">
          <button type="button" className="lf-btn-discard" onClick={() => navigate('/my-listings')}>
            Discard
          </button>
          <button
            type="submit"
            form="listing-form"
            className="lf-btn-publish"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Publishing…' : 'Publish Listing'}
          </button>
        </div>
      </div>

      {/* ── Page Body ── */}
      <div className="lf-body">
        <h1 className="lf-page-title">Create Listing</h1>

        <form id="listing-form" onSubmit={handleSubmit} className="lf-layout">

          {/* ──────────── LEFT COLUMN ──────────── */}
          <div className="lf-left">

            {/* Food Details Card */}
            <div className="lf-card">
              <div className="lf-card-header">
                <Package size={17} />
                <h2>Food Details</h2>
              </div>

              <div className="lf-field">
                <label>Item Name</label>
                <input
                  type="text"
                  name="title"
                  className="lf-input"
                  placeholder="e.g. Fresh Tomatoes"
                  value={formData.title}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="lf-row">
                <div className="lf-field">
                  <label>Category</label>
                  <select name="type" className="lf-input" value={formData.type} onChange={handleChange}>
                    <option value="Vegetable">Vegetable</option>
                    <option value="Fruit">Fruit</option>
                    <option value="Grain">Grain</option>
                    <option value="Dairy">Dairy</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="lf-field">
                  <label>Quantity (kg)</label>
                  <input
                    type="number"
                    name="quantity"
                    className="lf-input"
                    placeholder="e.g. 50"
                    value={formData.quantity}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="lf-row">
                <div className="lf-field">
                  <label>Price (₹ per kg)</label>
                  <div className="lf-prefix-wrap">
                    <span className="lf-prefix">₹</span>
                    <input
                      type="number"
                      name="price"
                      className="lf-input lf-input-prefixed"
                      placeholder="0"
                      value={formData.price}
                      onChange={handleChange}
                      min={0}
                      step={1}
                    />
                  </div>
                </div>
                <div className="lf-field">
                  <label>Expiry</label>
                  <input
                    type="text"
                    name="expiry"
                    className="lf-input"
                    placeholder='e.g. "3 days" or "24 hours"'
                    value={formData.expiry}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="lf-field">
                <label>Additional Notes</label>
                <textarea
                  name="description"
                  className="lf-input lf-textarea"
                  rows={3}
                  placeholder="e.g. Grade B quality. Pickup before 5 PM."
                  value={formData.description}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Photo Card */}
            <div className="lf-card">
              <div className="lf-card-header">
                <Camera size={17} />
                <h2>Food Photo</h2>
              </div>

              {imagePreview ? (
                <div className="lf-image-preview">
                  <img src={imagePreview} alt="Preview" />
                  <button
                    type="button"
                    className="lf-image-remove"
                    onClick={() => {
                      setImagePreview('');
                      setFormData(f => ({ ...f, image: '' }));
                    }}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <label className="lf-upload-zone">
                  <Upload size={26} />
                  <span>Click to upload photo</span>
                  <small>JPEG or PNG, max 5 MB</small>
                  <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
                </label>
              )}
            </div>
          </div>

          {/* ──────────── RIGHT COLUMN ──────────── */}
          <div className="lf-right">
            <div className="lf-card lf-card-sticky">
              <div className="lf-card-header">
                <MapPin size={17} />
                <h2>Pickup Location</h2>
              </div>

              <div className="lf-field">
                <label>Street Address</label>
                <input
                  type="text"
                  name="pickupAddress"
                  className="lf-input"
                  placeholder="Enter full pickup address"
                  value={formData.pickupAddress}
                  onChange={handleChange}
                />
              </div>

              {pickupCoords && (
                <div className="lf-coords-badge">
                  <MapPin size={12} />
                  {formatCoords(pickupCoords)}
                </div>
              )}

              <div className="lf-map-wrap">
                <MapContainer
                  center={[mapCenter.lat, mapCenter.lng]}
                  zoom={mapZoom}
                  scrollWheelZoom
                  className="lf-map"
                >
                  <TileLayer
                    attribution="&copy; OpenStreetMap contributors"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapFlyTo center={mapCenter} zoom={mapZoom} />
                  <MapClickToPick onPick={setPickupCoords} />
                  {pickupCoords && (
                    <CircleMarker
                      center={[pickupCoords.lat, pickupCoords.lng]}
                      radius={10}
                      pathOptions={{ color: '#064e3b', fillColor: '#064e3b', fillOpacity: 0.45 }}
                    />
                  )}
                </MapContainer>
                <p className="lf-map-hint">Click on the map to pin the exact pickup location</p>
              </div>

              {/* Live Summary */}
              {(formData.title || formData.quantity) && (
                <div className="lf-summary">
                  <p className="lf-summary-title">LISTING SUMMARY</p>
                  {formData.title    && <div className="lf-summary-row"><span>Item</span><strong>{formData.title}</strong></div>}
                  {formData.quantity && <div className="lf-summary-row"><span>Quantity</span><strong>{formData.quantity} kg</strong></div>}
                  {formData.price    && <div className="lf-summary-row"><span>Price</span><strong>₹{formData.price}/kg</strong></div>}
                  {formData.type     && <div className="lf-summary-row"><span>Category</span><strong>{formData.type}</strong></div>}
                  {formData.expiry   && <div className="lf-summary-row"><span>Expires in</span><strong>{formData.expiry}</strong></div>}
                </div>
              )}
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};

export default ListingForm;
