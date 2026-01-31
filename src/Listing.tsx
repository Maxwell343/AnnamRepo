import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Listing.css';

const ListingForm: React.FC = () => {
  const navigate = useNavigate();
  
  // State to hold form data
  const [formData, setFormData] = useState({
    title: '',
    quantity: '',
    type: 'Vegetable',
    expiry: '',
    description: '',
    image: '',
    location: ''
  });
  const [imagePreview, setImagePreview] = useState<string>('');
  const [locationError, setLocationError] = useState<string>('');

  // Request user location on component mount
  React.useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setFormData(prev => ({
            ...prev,
            location: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
          }));
          setLocationError('');
        },
        (error) => {
          console.error('Geolocation error:', error);
          setLocationError('Unable to get your location. Please enter it manually.');
        }
      );
    } else {
      setLocationError('Geolocation is not supported by your browser.');
    }
  }, []);

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
      console.log('Submitting listing with data:', {
        farmer_id: user.id,
        farmer_name: user.name,
        title: formData.title,
        quantity: formData.quantity,
        type: formData.type,
        expiry_date: formData.expiry,
        description: formData.description,
        imageSize: formData.image ? formData.image.length : 0
      });

      // Send data to backend API
      const response = await fetch('http://localhost:8000/api/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmer_id: user.id,
          farmer_name: user.name,
          title: formData.title,
          quantity: formData.quantity,
          type: formData.type,
          expiry_date: formData.expiry,
          description: formData.description,
          pickup_address: formData.location,
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
    } catch (err: any) {
      console.error('Listing submission error:', err);
      alert(`Error: ${err.message}`);
    }
  };

  return (
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
            <label>📍 Your Pickup Location</label>
            <input 
              type="text" 
              name="location" 
              className="form-control" 
              placeholder="Auto-detected from your device..."
              value={formData.location}
              onChange={handleChange}
              disabled={!!formData.location && !locationError}
              title="Your location is automatically detected. Edit if needed."
            />
            {locationError && <small style={{color: '#d32f2f', marginTop: '5px', display: 'block'}}>{locationError}</small>}
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
  );
};

export default ListingForm;
