import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Listing.css';
import './HomePage.css';
import { API_ENDPOINTS } from './config/api';
import { MapContainer, TileLayer, CircleMarker, useMapEvents } from 'react-leaflet';
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

  const mapCenter = useMemo<LatLng>(() => ({ lat: 20.5937, lng: 78.9629 }), []);

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
      }
    } catch {
      navigate('/auth');
    }
  }, [navigate]);

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
        alert('Error: Failed to reach backend. Please start FastAPI on http://localhost:8000 and try again.');
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
    <div className="app-container farmer-theme">
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="brand">
            <span className="brand-icon">🌾</span>
            {!sidebarCollapsed && <span className="brand-text">Annam</span>}
          </div>
          <button
            className="collapse-btn"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? '»' : '«'}
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-item" onClick={() => navigate('/dashboard')}>
            <span className="nav-icon">🏠</span>
            {!sidebarCollapsed && <span className="nav-label">Dashboard</span>}
          </div>
          <div className="nav-item" onClick={() => navigate('/history')}>
            <span className="nav-icon">📜</span>
            {!sidebarCollapsed && <span className="nav-label">History</span>}
          </div>
          <div className="nav-item" onClick={() => navigate('/my-listings')}>
            <span className="nav-icon">📦</span>
            {!sidebarCollapsed && <span className="nav-label">My Listings</span>}
          </div>
          <div className="nav-item active" onClick={() => navigate('/listing')}>
            <span className="nav-icon">➕</span>
            {!sidebarCollapsed && <span className="nav-label">Add Listing</span>}
          </div>
          <div className="nav-item" onClick={() => navigate('/analytics')}>
            <span className="nav-icon">📊</span>
            {!sidebarCollapsed && <span className="nav-label">Analytics</span>}
          </div>
          <div className="nav-item" onClick={() => navigate('/leaderboards')}>
            <span className="nav-icon">🏆</span>
            {!sidebarCollapsed && <span className="nav-label">Leaderboards</span>}
          </div>
          <div className="nav-item" onClick={() => navigate('/farmer-settings')}>
            <span className="nav-icon">⚙️</span>
            {!sidebarCollapsed && <span className="nav-label">Settings</span>}
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="nav-item logout-item" onClick={handleLogout}>
            <span className="nav-icon">🚪</span>
            {!sidebarCollapsed && <span className="nav-label">Logout</span>}
          </div>
        </div>
      </aside>

      <main className="main-content listing-page">
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
                  zoom={5}
                  scrollWheelZoom={false}
                  className="map-picker-map"
                >
                  <TileLayer
                    attribution="&copy; OpenStreetMap contributors"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
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
      </main>
    </div>
  );
};

export default ListingForm;
