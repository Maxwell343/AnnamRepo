import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Settings.css';

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();

  // Redirect to role-specific settings page
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      if (user.role === 'farmer') {
        navigate('/farmer-settings');
        return;
      } else if (user.role === 'driver') {
        navigate('/driver-settings');
        return;
      } else if (user.role === 'ngo') {
        navigate('/ngo-settings');
        return;
      }
    } else {
      navigate('/');
      return;
    }
  }, [navigate]);

  // State for form fields
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    farmName: '',
    farmLocation: '',
    language: 'English',
    notificationsEmail: true,
    notificationsSMS: false,
    notificationsWhatsApp: true
  });

  // Load existing data on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      const savedSettings = localStorage.getItem('userSettings');
      
      if (savedSettings) {
        // If we have saved settings, use them
        setFormData(JSON.parse(savedSettings));
      } else {
        // Otherwise load from user data
        setFormData(prev => ({
          ...prev,
          fullName: user.name || 'Ramesh Kumar',
          email: user.email || 'ramesh@example.com',
          phone: localStorage.getItem('userPhone') || '+91 98765 43210',
          farmName: localStorage.getItem('farmName') || 'Ramesh Organic Farms',
          farmLocation: localStorage.getItem('farmLocation') || 'Nashik, Maharashtra',
          language: localStorage.getItem('userLanguage') || 'English'
        }));
      }
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleToggle = (name: string) => {
    setFormData(prev => ({ 
      ...prev, 
      [name]: !prev[name as keyof typeof prev] 
    }));
  };

  const handleSave = () => {
    // Save all settings to localStorage
    localStorage.setItem('userSettings', JSON.stringify(formData));
    
    // Also update individual fields for backward compatibility
    localStorage.setItem('userPhone', formData.phone);
    localStorage.setItem('farmName', formData.farmName);
    localStorage.setItem('farmLocation', formData.farmLocation);
    localStorage.setItem('userLanguage', formData.language);
    
    // Update user name in localStorage
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      user.name = formData.fullName;
      localStorage.setItem('user', JSON.stringify(user));
    }

    console.log("Settings saved successfully:", formData);
    alert("Settings saved successfully!");
    navigate('/dashboard');
  };

  return (
    <div className="settings-container">
      <div className="settings-card">
        
        {/* Header */}
        <div className="settings-header">
          <button className="back-btn" onClick={() => navigate('/dashboard')}>
            ←
          </button>
          <h2>Account Settings</h2>
        </div>

        <div className="settings-body">
          
          {/* Section 1: Personal Info */}
          <div className="section-title">👤 Personal Details</div>
          
          <div className="input-row">
            <div className="input-group">
              <label>Full Name</label>
              <input 
                type="text" 
                name="fullName" 
                className="settings-input" 
                value={formData.fullName}
                onChange={handleChange}
              />
            </div>
            <div className="input-group">
              <label>Phone Number</label>
              <input 
                type="text" 
                name="phone" 
                className="settings-input" 
                value={formData.phone}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="input-group" style={{marginBottom: '2rem'}}>
            <label>Email Address</label>
            <input 
              type="email" 
              name="email" 
              className="settings-input" 
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          {/* Section 2: Farm Details (Crucial for Annam) */}
          <div className="section-title">🚜 Farm Profile</div>
          
          <div className="input-row">
            <div className="input-group">
              <label>Farm Name</label>
              <input 
                type="text" 
                name="farmName" 
                className="settings-input" 
                value={formData.farmName}
                onChange={handleChange}
              />
            </div>
            <div className="input-group">
              <label>Default Location / Address</label>
              <input 
                type="text" 
                name="farmLocation" 
                className="settings-input" 
                value={formData.farmLocation}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Section 3: App Preferences */}
          <div className="section-title">⚙️ Preferences</div>

          <div className="input-group" style={{marginBottom: '1.5rem'}}>
            <label>App Language</label>
            <select 
              name="language" 
              className="settings-input" 
              value={formData.language}
              onChange={handleChange}
            >
              <option value="English">English</option>
              <option value="Hindi">Hindi (हिंदी)</option>
              <option value="Marathi">Marathi (मराठी)</option>
              <option value="Tamil">Tamil (தமிழ்)</option>
            </select>
          </div>

          <div className="pref-row">
            <div className="pref-info">
              <h4>WhatsApp Updates</h4>
              <p>Get order pickups and driver details via WhatsApp</p>
            </div>
            <label className="switch">
              <input 
                type="checkbox" 
                checked={formData.notificationsWhatsApp}
                onChange={() => handleToggle('notificationsWhatsApp')} 
              />
              <span className="slider"></span>
            </label>
          </div>

          <div className="pref-row">
            <div className="pref-info">
              <h4>SMS Alerts</h4>
              <p>Receive text messages for urgent requests</p>
            </div>
            <label className="switch">
              <input 
                type="checkbox" 
                checked={formData.notificationsSMS}
                onChange={() => handleToggle('notificationsSMS')} 
              />
              <span className="slider"></span>
            </label>
          </div>

        </div>

        {/* Footer */}
        <div className="settings-footer">
          <button className="btn-cancel" onClick={() => navigate('/dashboard')}>Cancel</button>
          <button className="btn-save" onClick={handleSave}>Save Changes</button>
        </div>

      </div>
    </div>
  );
};

export default SettingsPage;
