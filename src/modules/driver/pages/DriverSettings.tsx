import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './DriverSettings.css';

interface DriverStats {
  totalDeliveries: number;
  totalEarnings: number;
  rating: number;
  completionRate: number;
}

const DriverSettings: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'profile' | 'vehicle' | 'payment' | 'preferences'>('profile');
  const [isOnline, setIsOnline] = useState(true);

  const [stats, setStats] = useState<DriverStats>({
    totalDeliveries: 156,
    totalEarnings: 24500,
    rating: 4.8,
    completionRate: 98
  });

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    vehicleNumber: '',
    vehicleType: 'Two Wheeler',
    vehicleModel: '',
    vehicleColor: '',
    drivingLicenseNumber: '',
    licenseExpiry: '',
    language: 'English',
    notificationsEmail: true,
    notificationsSMS: false,
    notificationsWhatsApp: true,
    notificationsPush: true,
    soundAlerts: true,
    vibration: true,
    bankAccountName: '',
    bankAccountNumber: '',
    bankIFSC: '',
    upiId: '',
    emergencyContact: '',
    emergencyPhone: '',
    emergencyRelation: '',
    preferredZone: 'Any',
    maxDistance: '15',
    autoAccept: false
  });

  const [documents, setDocuments] = useState({
    license: { uploaded: true, verified: true, expiry: '2025-12-31' },
    vehicleRC: { uploaded: true, verified: true, expiry: '2026-06-15' },
    insurance: { uploaded: true, verified: false, expiry: '2024-08-20' },
    aadhar: { uploaded: true, verified: true, expiry: null },
    pan: { uploaded: false, verified: false, expiry: null }
  });

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      if (parsedUser.role !== 'driver') {
        navigate('/home');
        return;
      }
      setUser(parsedUser);
      
      // Fetch settings from API
      const fetchSettings = async () => {
        try {
          const response = await fetch(`http://localhost:8000/api/settings/driver/${parsedUser.id}`);
          const data = await response.json();
          
          if (response.ok && data) {
            setFormData(prev => ({
              ...prev,
              fullName: data.name || parsedUser.name || '',
              email: data.email || parsedUser.email || '',
              phone: data.phone || '',
              vehicleNumber: data.vehicle_number || '',
              vehicleType: data.vehicle_type || 'Two Wheeler',
              vehicleModel: data.vehicle_model || '',
              vehicleColor: data.vehicle_color || '',
              drivingLicenseNumber: data.license_number || '',
              licenseExpiry: data.license_expiry || '',
              language: data.language || 'English',
              notificationsEmail: data.notifications_email ?? true,
              notificationsSMS: data.notifications_sms ?? false,
              notificationsWhatsApp: data.notifications_whatsapp ?? true,
              notificationsPush: data.notifications_push ?? true,
              soundAlerts: data.sound_alerts ?? true,
              vibration: data.vibration ?? true,
              bankAccountName: data.bank_account_name || '',
              bankAccountNumber: data.bank_account_number || '',
              bankIFSC: data.bank_ifsc || '',
              upiId: data.upi_id || '',
              emergencyContact: data.emergency_contact || '',
              emergencyPhone: data.emergency_phone || '',
              emergencyRelation: data.emergency_relation || '',
              preferredZone: data.preferred_zone || 'Any',
              maxDistance: data.max_distance?.toString() || '15',
              autoAccept: data.auto_accept ?? false
            }));
          } else {
            // Fallback to localStorage
            const savedSettings = localStorage.getItem('driverSettings');
            if (savedSettings) {
              setFormData(prev => ({ ...prev, ...JSON.parse(savedSettings) }));
            } else {
              setFormData(prev => ({
                ...prev,
                fullName: parsedUser.name || '',
                email: parsedUser.email || '',
                phone: localStorage.getItem('userPhone') || '',
                vehicleNumber: localStorage.getItem('vehicleNumber') || '',
                language: localStorage.getItem('userLanguage') || 'English'
              }));
            }
          }
          
          // Fetch stats from API
          const statsResponse = await fetch(`http://localhost:8000/api/stats/driver/${parsedUser.id}`);
          const statsData = await statsResponse.json();
          
          if (statsResponse.ok && statsData) {
            setStats({
              totalDeliveries: statsData.total_deliveries || 0,
              totalEarnings: statsData.total_earnings || 0,
              rating: statsData.average_rating || 4.8,
              completionRate: statsData.completion_rate || 98
            });
          }
        } catch (err) {
          console.error('Error fetching driver settings:', err);
          // Fallback to localStorage
          const savedSettings = localStorage.getItem('driverSettings');
          if (savedSettings) {
            setFormData(prev => ({ ...prev, ...JSON.parse(savedSettings) }));
          }
        }
      };
      
      fetchSettings();

      const savedOnlineStatus = localStorage.getItem('driverOnline');
      if (savedOnlineStatus !== null) {
        setIsOnline(JSON.parse(savedOnlineStatus));
      }
    } else {
      navigate('/');
    }
  }, [navigate]);

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

  const handleOnlineToggle = () => {
    setIsOnline(!isOnline);
    localStorage.setItem('driverOnline', JSON.stringify(!isOnline));
    showToastMessage(isOnline ? 'You are now offline' : 'You are now online');
  };

  const showToastMessage = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleSave = async () => {
    // Save to API
    try {
      const response = await fetch(`http://localhost:8000/api/settings/driver/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driver_id: user.id,
          name: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          vehicle_number: formData.vehicleNumber,
          vehicle_type: formData.vehicleType,
          vehicle_model: formData.vehicleModel,
          vehicle_color: formData.vehicleColor,
          license_number: formData.drivingLicenseNumber,
          license_expiry: formData.licenseExpiry,
          language: formData.language,
          notifications_email: formData.notificationsEmail,
          notifications_sms: formData.notificationsSMS,
          notifications_whatsapp: formData.notificationsWhatsApp,
          notifications_push: formData.notificationsPush,
          sound_alerts: formData.soundAlerts,
          vibration: formData.vibration,
          bank_account_name: formData.bankAccountName,
          bank_account_number: formData.bankAccountNumber,
          bank_ifsc: formData.bankIFSC,
          upi_id: formData.upiId,
          emergency_contact: formData.emergencyContact,
          emergency_phone: formData.emergencyPhone,
          emergency_relation: formData.emergencyRelation,
          preferred_zone: formData.preferredZone,
          max_distance: parseInt(formData.maxDistance),
          auto_accept: formData.autoAccept
        })
      });
      
      if (response.ok) {
        showToastMessage('Settings saved successfully!');
      } else {
        showToastMessage('Error saving settings. Saved locally.');
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      showToastMessage('Error saving settings. Saved locally.');
    }
    
    // Also save to localStorage as backup
    localStorage.setItem('driverSettings', JSON.stringify(formData));
    localStorage.setItem('userPhone', formData.phone);
    localStorage.setItem('vehicleNumber', formData.vehicleNumber);
    localStorage.setItem('userLanguage', formData.language);
    
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      user.name = formData.fullName;
      user.vehicle_number = formData.vehicleNumber;
      localStorage.setItem('user', JSON.stringify(user));
    }

    setTimeout(() => navigate('/home'), 2000);
  };

  const getDocumentStatus = (doc: { uploaded: boolean; verified: boolean; expiry: string | null }) => {
    if (!doc.uploaded) return { status: 'missing', label: 'Upload Required', color: '#f44336' };
    if (!doc.verified) return { status: 'pending', label: 'Pending Verification', color: '#ff9800' };
    if (doc.expiry) {
      const expiryDate = new Date(doc.expiry);
      const today = new Date();
      const daysUntilExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilExpiry < 0) return { status: 'expired', label: 'Expired', color: '#f44336' };
      if (daysUntilExpiry < 30) return { status: 'expiring', label: `Expires in ${daysUntilExpiry} days`, color: '#ff9800' };
    }
    return { status: 'verified', label: 'Verified', color: '#4caf50' };
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <>
            {/* Personal Details */}
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
                  placeholder="Enter your full name"
                />
              </div>
              <div className="input-group">
                <label>Phone Number</label>
                <div className="input-with-badge">
                  <input 
                    type="text" 
                    name="phone" 
                    className="settings-input" 
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+91 98765 43210"
                  />
                  {formData.phone && <span className="input-badge verified">✓</span>}
                </div>
              </div>
            </div>

            <div className="input-group">
              <label>Email Address</label>
              <input 
                type="email" 
                name="email" 
                className="settings-input" 
                value={formData.email}
                onChange={handleChange}
                placeholder="driver@example.com"
              />
            </div>

            {/* Emergency Contact */}
            <div className="section-title" style={{marginTop: '2rem'}}>🆘 Emergency Contact</div>
            
            <div className="input-row">
              <div className="input-group">
                <label>Contact Name</label>
                <input 
                  type="text" 
                  name="emergencyContact" 
                  className="settings-input" 
                  value={formData.emergencyContact}
                  onChange={handleChange}
                  placeholder="Full name"
                />
              </div>
              <div className="input-group">
                <label>Relationship</label>
                <select 
                  name="emergencyRelation" 
                  className="settings-input" 
                  value={formData.emergencyRelation}
                  onChange={handleChange}
                >
                  <option value="">Select relationship</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Parent">Parent</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Friend">Friend</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="input-group">
              <label>Emergency Phone Number</label>
              <input 
                type="text" 
                name="emergencyPhone" 
                className="settings-input" 
                value={formData.emergencyPhone}
                onChange={handleChange}
                placeholder="+91 98765 43210"
              />
            </div>
          </>
        );

      case 'vehicle':
        return (
          <>
            {/* Vehicle Details */}
            <div className="section-title">🚗 Vehicle Information</div>
            
            <div className="input-row">
              <div className="input-group">
                <label>Vehicle Type</label>
                <select 
                  name="vehicleType" 
                  className="settings-input" 
                  value={formData.vehicleType}
                  onChange={handleChange}
                >
                  <option value="Two Wheeler">🏍️ Two Wheeler</option>
                  <option value="Three Wheeler">🛺 Three Wheeler</option>
                  <option value="Car">🚗 Car</option>
                  <option value="Van">🚐 Van</option>
                  <option value="Truck">🚚 Truck</option>
                </select>
              </div>
              <div className="input-group">
                <label>Vehicle Model</label>
                <input 
                  type="text" 
                  name="vehicleModel" 
                  className="settings-input" 
                  value={formData.vehicleModel}
                  onChange={handleChange}
                  placeholder="e.g., Honda Activa"
                />
              </div>
            </div>

            <div className="input-row">
              <div className="input-group">
                <label>Registration Number</label>
                <input 
                  type="text" 
                  name="vehicleNumber" 
                  className="settings-input" 
                  value={formData.vehicleNumber}
                  onChange={handleChange}
                  placeholder="MH01AB1234"
                  style={{ textTransform: 'uppercase' }}
                />
              </div>
              <div className="input-group">
                <label>Vehicle Color</label>
                <input 
                  type="text" 
                  name="vehicleColor" 
                  className="settings-input" 
                  value={formData.vehicleColor}
                  onChange={handleChange}
                  placeholder="e.g., Black"
                />
              </div>
            </div>

            {/* Documents Section */}
            <div className="section-title" style={{marginTop: '2rem'}}>📄 Documents</div>
            
            <div className="documents-grid">
              {Object.entries(documents).map(([key, doc]) => {
                const status = getDocumentStatus(doc);
                const labels: { [key: string]: string } = {
                  license: 'Driving License',
                  vehicleRC: 'Vehicle RC',
                  insurance: 'Insurance',
                  aadhar: 'Aadhar Card',
                  pan: 'PAN Card'
                };
                const icons: { [key: string]: string } = {
                  license: '🪪',
                  vehicleRC: '📋',
                  insurance: '🛡️',
                  aadhar: '🆔',
                  pan: '💳'
                };
                
                return (
                  <div key={key} className={`document-card ${status.status}`}>
                    <div className="doc-icon">{icons[key]}</div>
                    <div className="doc-info">
                      <h4>{labels[key]}</h4>
                      <span className="doc-status" style={{ color: status.color }}>
                        {status.label}
                      </span>
                    </div>
                    <button className="doc-action-btn">
                      {doc.uploaded ? 'Update' : 'Upload'}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* License Details */}
            <div className="section-title" style={{marginTop: '2rem'}}>🪪 License Details</div>
            
            <div className="input-row">
              <div className="input-group">
                <label>License Number</label>
                <input 
                  type="text" 
                  name="drivingLicenseNumber" 
                  className="settings-input" 
                  value={formData.drivingLicenseNumber}
                  onChange={handleChange}
                  placeholder="MH0120210012345"
                  style={{ textTransform: 'uppercase' }}
                />
              </div>
              <div className="input-group">
                <label>License Expiry</label>
                <input 
                  type="date" 
                  name="licenseExpiry" 
                  className="settings-input" 
                  value={formData.licenseExpiry}
                  onChange={handleChange}
                />
              </div>
            </div>
          </>
        );

      case 'payment':
        return (
          <>
            {/* Payment Details */}
            <div className="section-title">💳 Bank Account</div>
            
            <div className="input-group">
              <label>Account Holder Name</label>
              <input 
                type="text" 
                name="bankAccountName" 
                className="settings-input" 
                value={formData.bankAccountName}
                onChange={handleChange}
                placeholder="As per bank records"
              />
            </div>

            <div className="input-row">
              <div className="input-group">
                <label>Account Number</label>
                <input 
                  type="text" 
                  name="bankAccountNumber" 
                  className="settings-input" 
                  value={formData.bankAccountNumber}
                  onChange={handleChange}
                  placeholder="XXXX XXXX XXXX"
                />
              </div>
              <div className="input-group">
                <label>IFSC Code</label>
                <input 
                  type="text" 
                  name="bankIFSC" 
                  className="settings-input" 
                  value={formData.bankIFSC}
                  onChange={handleChange}
                  placeholder="SBIN0001234"
                  style={{ textTransform: 'uppercase' }}
                />
              </div>
            </div>

            {/* UPI */}
            <div className="section-title" style={{marginTop: '2rem'}}>📱 UPI Payment</div>
            
            <div className="input-group">
              <label>UPI ID</label>
              <input 
                type="text" 
                name="upiId" 
                className="settings-input" 
                value={formData.upiId}
                onChange={handleChange}
                placeholder="yourname@upi"
              />
            </div>

            {/* Earnings Summary */}
            <div className="section-title" style={{marginTop: '2rem'}}>💰 Earnings Summary</div>
            
            <div className="earnings-summary">
              <div className="earnings-card">
                <span className="earnings-icon">💵</span>
                <div className="earnings-details">
                  <span className="earnings-value">₹{stats.totalEarnings.toLocaleString()}</span>
                  <span className="earnings-label">Total Earnings</span>
                </div>
              </div>
              <div className="earnings-card">
                <span className="earnings-icon">🚚</span>
                <div className="earnings-details">
                  <span className="earnings-value">{stats.totalDeliveries}</span>
                  <span className="earnings-label">Deliveries</span>
                </div>
              </div>
              <div className="earnings-card">
                <span className="earnings-icon">⭐</span>
                <div className="earnings-details">
                  <span className="earnings-value">{stats.rating}</span>
                  <span className="earnings-label">Rating</span>
                </div>
              </div>
            </div>

            <button 
              className="view-earnings-btn"
              onClick={() => navigate('/earnings')}
            >
              📊 View Detailed Earnings
            </button>
          </>
        );

      case 'preferences':
        return (
          <>
            {/* Work Preferences */}
            <div className="section-title">🎯 Work Preferences</div>

            <div className="input-row">
              <div className="input-group">
                <label>Preferred Zone</label>
                <select 
                  name="preferredZone" 
                  className="settings-input" 
                  value={formData.preferredZone}
                  onChange={handleChange}
                >
                  <option value="Any">🌐 Any Zone</option>
                  <option value="North">⬆️ North</option>
                  <option value="South">⬇️ South</option>
                  <option value="East">➡️ East</option>
                  <option value="West">⬅️ West</option>
                  <option value="Central">🎯 Central</option>
                </select>
              </div>
              <div className="input-group">
                <label>Max Delivery Distance</label>
                <select 
                  name="maxDistance" 
                  className="settings-input" 
                  value={formData.maxDistance}
                  onChange={handleChange}
                >
                  <option value="5">5 km</option>
                  <option value="10">10 km</option>
                  <option value="15">15 km</option>
                  <option value="20">20 km</option>
                  <option value="25">25 km</option>
                  <option value="50">50 km</option>
                </select>
              </div>
            </div>

            <div className="pref-row">
              <div className="pref-info">
                <h4>Auto-Accept Deliveries</h4>
                <p>Automatically accept nearby delivery requests</p>
              </div>
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={formData.autoAccept}
                  onChange={() => handleToggle('autoAccept')} 
                />
                <span className="slider"></span>
              </label>
            </div>

            {/* Notifications */}
            <div className="section-title" style={{marginTop: '2rem'}}>🔔 Notifications</div>

            <div className="pref-row">
              <div className="pref-info">
                <h4>Push Notifications</h4>
                <p>Receive instant alerts for new deliveries</p>
              </div>
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={formData.notificationsPush}
                  onChange={() => handleToggle('notificationsPush')} 
                />
                <span className="slider"></span>
              </label>
            </div>

            <div className="pref-row">
              <div className="pref-info">
                <h4>WhatsApp Notifications</h4>
                <p>Get pickup and delivery updates via WhatsApp</p>
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
                <p>Receive urgent pickup reminders via SMS</p>
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

            <div className="pref-row">
              <div className="pref-info">
                <h4>Email Notifications</h4>
                <p>Receive weekly earnings summary via email</p>
              </div>
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={formData.notificationsEmail}
                  onChange={() => handleToggle('notificationsEmail')} 
                />
                <span className="slider"></span>
              </label>
            </div>

            {/* Sound & Vibration */}
            <div className="section-title" style={{marginTop: '2rem'}}>🔊 Sound & Vibration</div>

            <div className="pref-row">
              <div className="pref-info">
                <h4>Sound Alerts</h4>
                <p>Play sound for new delivery requests</p>
              </div>
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={formData.soundAlerts}
                  onChange={() => handleToggle('soundAlerts')} 
                />
                <span className="slider"></span>
              </label>
            </div>

            <div className="pref-row">
              <div className="pref-info">
                <h4>Vibration</h4>
                <p>Vibrate on new notifications</p>
              </div>
              <label className="switch">
                <input 
                  type="checkbox" 
                  checked={formData.vibration}
                  onChange={() => handleToggle('vibration')} 
                />
                <span className="slider"></span>
              </label>
            </div>

            {/* Language */}
            <div className="section-title" style={{marginTop: '2rem'}}>🌐 Language</div>

            <div className="input-group">
              <label>App Language</label>
              <select 
                name="language" 
                className="settings-input" 
                value={formData.language}
                onChange={handleChange}
              >
                <option value="English">🇬🇧 English</option>
                <option value="Hindi">🇮🇳 Hindi (हिंदी)</option>
                <option value="Marathi">🇮🇳 Marathi (मराठी)</option>
                <option value="Tamil">🇮🇳 Tamil (தமிழ்)</option>
                <option value="Telugu">🇮🇳 Telugu (తెలుగు)</option>
                <option value="Kannada">🇮🇳 Kannada (ಕನ್ನಡ)</option>
              </select>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="settings-container driver-theme">
      <div className="settings-card">
        
        {/* Header */}
        <div className="settings-header">
          <button className="back-btn" onClick={() => navigate('/home')}>
            ←
          </button>
          <h2>🚚 Driver Settings</h2>
          <div className={`online-status ${isOnline ? 'online' : 'offline'}`}>
            <span className="status-dot"></span>
            <span className="status-text">{isOnline ? 'Online' : 'Offline'}</span>
          </div>
        </div>

        {/* Driver Profile Card */}
        <div className="driver-profile-card">
          <div className="driver-avatar">
            {formData.fullName ? formData.fullName.charAt(0).toUpperCase() : '🚚'}
          </div>
          <div className="driver-info">
            <h3>{formData.fullName || 'Driver'}</h3>
            <p>{formData.vehicleNumber || 'No vehicle registered'}</p>
            <div className="driver-badges">
              <span className="badge vehicle-type">
                {formData.vehicleType === 'Two Wheeler' ? '🏍️' : 
                 formData.vehicleType === 'Three Wheeler' ? '🛺' : 
                 formData.vehicleType === 'Car' ? '🚗' : 
                 formData.vehicleType === 'Van' ? '🚐' : '🚚'}
                {formData.vehicleType}
              </span>
              <span className="badge rating">⭐ {stats.rating}</span>
              <span className="badge deliveries">📦 {stats.totalDeliveries} deliveries</span>
            </div>
          </div>
          <div className="online-toggle">
            <span className="toggle-label">{isOnline ? 'Go Offline' : 'Go Online'}</span>
            <label className="switch large">
              <input 
                type="checkbox" 
                checked={isOnline}
                onChange={handleOnlineToggle}
              />
              <span className="slider round"></span>
            </label>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="quick-stats-bar">
          <div className="stat-item">
            <span className="stat-value">{stats.totalDeliveries}</span>
            <span className="stat-label">Deliveries</span>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
            <span className="stat-value">₹{stats.totalEarnings.toLocaleString()}</span>
            <span className="stat-label">Earnings</span>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
            <span className="stat-value">{stats.completionRate}%</span>
            <span className="stat-label">Completion</span>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
            <span className="stat-value">⭐ {stats.rating}</span>
            <span className="stat-label">Rating</span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="settings-tabs">
          <button 
            className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <span className="tab-icon">👤</span>
            <span className="tab-label">Profile</span>
          </button>
          <button 
            className={`tab-btn ${activeTab === 'vehicle' ? 'active' : ''}`}
            onClick={() => setActiveTab('vehicle')}
          >
            <span className="tab-icon">🚗</span>
            <span className="tab-label">Vehicle</span>
          </button>
          <button 
            className={`tab-btn ${activeTab === 'payment' ? 'active' : ''}`}
            onClick={() => setActiveTab('payment')}
          >
            <span className="tab-icon">💳</span>
            <span className="tab-label">Payment</span>
          </button>
          <button 
            className={`tab-btn ${activeTab === 'preferences' ? 'active' : ''}`}
            onClick={() => setActiveTab('preferences')}
          >
            <span className="tab-icon">⚙️</span>
            <span className="tab-label">Preferences</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="settings-body">
          {renderTabContent()}
        </div>

        {/* Footer */}
        <div className="settings-footer">
          <button className="btn-cancel" onClick={() => navigate('/home')}>
            Cancel
          </button>
          <button className="btn-save" onClick={handleSave}>
            💾 Save Changes
          </button>
        </div>

      </div>

      {/* Toast Notification */}
      {showToast && (
        <div className={`toast-notification ${toastMessage.includes('offline') ? 'warning' : 'success'}`}>
          <span className="toast-icon">
            {toastMessage.includes('offline') ? '🔴' : '✅'}
          </span>
          <span className="toast-message">{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default DriverSettings;
