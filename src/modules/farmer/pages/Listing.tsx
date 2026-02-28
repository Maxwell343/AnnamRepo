import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Listing.css';
import '../../../app/HomePage.css';
import { API_ENDPOINTS } from '../../../config/api';
import { MapContainer, TileLayer, CircleMarker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { LeafletMouseEvent } from 'leaflet';

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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // State to hold form data
  const [formData, setFormData] = useState({
    title: '',
    quantity: '',
    price: '',
    type: 'Vegetable',
    expiry: '',
    description: '',
    image: '',
    pickupAddress: ''
  });
  const [imagePreview, setImagePreview] = useState<string>('');
  const [pickupCoords, setPickupCoords] = useState<LatLng | null>(null);
  const [showMapPicker, setShowMapPicker] = useState(false);

  const defaultCenter = useMemo<LatLng>(() => ({ lat: 20.5937, lng: 78.9629 }), []);
  const [mapCenter, setMapCenter] = useState<LatLng>(defaultCenter);
  const [mapZoom, setMapZoom] = useState(5);
  const [farmerLocation, setFarmerLocation] = useState<string>('');

  const [profileChecking, setProfileChecking] = useState(true);

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
    
    try {
      // Get the user from localStorage
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
        alert('Please enter a pickup address or pick a location on the map.');
        return;
      }

      console.log('Submitting listing with data:', {
        farmer_id: user.id,
        farmer_name: user.name,
        title: formData.title,
        quantity: formData.quantity,
        price: formData.price,
        type: formData.type,
        expiry_date: formData.expiry,
        description: formData.description,
        pickup_address,
        imageSize: formData.image ? formData.image.length : 0
      });

      // Send data to backend API
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
          image: formData.image
        }),
      });

      const data = await response.json();
      console.log('Backend response:', data, 'Status:', response.status);

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create listing');
      }

      alert('Listing created successfully!');
      console.log('Listing created! Redirecting to dashboard in 500ms');
      
      // Small delay to ensure backend is ready
      setTimeout(() => {
        navigate('/dashboard');
      }, 500);
    } catch (err: unknown) {
      console.error('Listing submission error:', err);
      const message = err instanceof Error ? err.message : 'Failed to create listing';
      if (message.toLowerCase().includes('failed to fetch')) {
        alert('Error: Failed to reach backend. Please ensure the backend server is running and try again.');
      } else {
        alert(`Error: ${message}`);
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/auth');
  };

  return (
    <div className="listing-page">
      {profileChecking ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh', flexDirection: 'column', gap: '16px' }}>
          <div style={{ width: '40px', height: '40px', border: '4px solid #e0e0e0', borderTop: '4px solid #2e7d32', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <p style={{ color: '#757575', fontSize: '14px' }}>Checking profile...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
      <>
      <header className="top-header">
          <div className="header-left">
            <h1 className="page-title">➕ Add Listing</h1>
            <p className="page-subtitle">Create a new donation listing</p>
          </div>
        </header>

        <div className="form-container">
          <div className="form-card">
            <div className="form-header">
              <h2>🌽 Food Details</h2>
              <p>Update information for your donation</p>
            </div>

            <form onSubmit={handleSubmit}>
          {/* Image Upload */}
          <div className="form-group">
            <label>Food Image</label>
            <input 
              type="file" 
              accept="image/*" 
              className="form-control" 
              onChange={handleImageChange}
            />
            {imagePreview && (
              <div style={{marginTop: '10px', textAlign: 'center'}}>
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  style={{maxWidth: '100%', maxHeight: '150px', borderRadius: '8px'}}
                />
              </div>
            )}
          </div>

          {/* Item Name */}
          <div className="form-group">
            <label>Item Name</label>
            <input 
              type="text" 
              name="title" 
              className="form-control" 
              placeholder="e.g. Fresh Tomatoes"
              value={formData.title}
              onChange={handleChange}
              required 
            />
          </div>

          {/* Quantity & Type Row */}
          <div style={{ display: 'flex', gap: '15px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label>Quantity (kg)</label>
              <input 
                type="number" 
                name="quantity" 
                className="form-control" 
                placeholder="50"
                value={formData.quantity}
                onChange={handleChange}
                required 
              />
            </div>

            <div className="form-group" style={{ flex: 1 }}>
              <label>Type</label>
              <select 
                name="type" 
                className="form-control" 
                value={formData.type}
                onChange={handleChange}
              >
                <option value="Vegetable">Vegetable</option>
                <option value="Fruit">Fruit</option>
                <option value="Grain">Grain</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Price */}
          <div className="form-group">
            <label>Price (₹ per kg)</label>
            <input
              type="number"
              name="price"
              className="form-control"
              placeholder="0"
              value={formData.price}
              onChange={handleChange}
              min={0}
              step={1}
            />
          </div>

          {/* Expiry Date */}
          <div className="form-group">
            <label>Expires In (Days or "2 days", "24 hours")</label>
            <input 
              type="text" 
              name="expiry" 
              className="form-control" 
              placeholder="e.g. 2 days OR 24 hours OR just 2"
              value={formData.expiry}
              onChange={handleChange}
              required 
            />
          </div>

          {/* Location */}
          <div className="form-group">
            <label>📍 Pickup Address</label>
            <input 
              type="text" 
              name="pickupAddress" 
              className="form-control" 
              placeholder="Enter pickup address manually"
              value={formData.pickupAddress}
              onChange={handleChange}
              title="Enter the pickup address, or pick a location from the map."
            />

            <div className="map-picker-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowMapPicker(v => !v)}
              >
                {showMapPicker ? 'Hide Map' : 'Pick on Map'}
              </button>
              {pickupCoords && (
                <span className="map-picker-coords">Selected: {formatCoords(pickupCoords)}</span>
              )}
            </div>

            {showMapPicker && (
              <div className="map-picker">
                <MapContainer
                  center={[mapCenter.lat, mapCenter.lng]}
                  zoom={mapZoom}
                  scrollWheelZoom={true}
                  className="map-picker-map"
                >
                  <TileLayer
                    attribution="&copy; OpenStreetMap contributors"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapFlyTo center={mapCenter} zoom={mapZoom} />
                  <MapClickToPick onPick={setPickupCoords} />
                  {pickupCoords && (
                    <CircleMarker center={[pickupCoords.lat, pickupCoords.lng]} radius={10} pathOptions={{ color: '#064e3b' }} />
                  )}
                </MapContainer>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="form-group">
            <label>Additional Notes</label>
            <textarea 
              name="description" 
              className="form-control" 
              rows={3} 
              placeholder="e.g. Need pickup before 5 PM. Grade B quality."
              value={formData.description}
              onChange={handleChange}
            ></textarea>
          </div>

          {/* Buttons */}
          <div className="btn-group">
            <button type="button" className="btn-cancel" onClick={() => navigate('/dashboard')}>
              Cancel
            </button>
            <button type="submit" className="btn-submit">
              Save Details
            </button>
          </div>
            </form>
          </div>
        </div>
      </>
      )}
    </div>
    );
  };
  
  export default ListingForm;
