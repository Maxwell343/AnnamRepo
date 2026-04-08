import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, Check, Car, FileText, ClipboardList, Shield, CreditCard, Smartphone, Wallet, Banknote, Truck, BarChart3, Target, Bell, Volume2, Globe, Package, Settings, Save, CheckCircle, Circle, Bike, Star, AlertTriangle, IdCard } from 'lucide-react';
import './DriverSettings.css';
import { API_ENDPOINTS } from '../../../config/api';

interface DriverStats {
  totalDeliveries: number;
  totalEarnings: number;
  rating: number;
  completionRate: number;
}

const DriverSettings: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const incompleteProfile = location.state?.incompleteProfile || false;
  const returnTo = location.state?.returnTo || '';
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
      
      const fetchSettings = async () => {
        try {
          const response = await fetch(API_ENDPOINTS.driverSettings(parsedUser.id.toString()));
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
          
          const statsResponse = await fetch(API_ENDPOINTS.driverStats(parsedUser.id.toString()));
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
    try {
      const response = await fetch(API_ENDPOINTS.driverSettings(user?.id?.toString() || ''), {
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
    
    localStorage.setItem('driverSettings', JSON.stringify(formData));
    localStorage.setItem('userPhone', formData.phone);
    localStorage.setItem('vehicleNumber', formData.vehicleNumber);
    localStorage.setItem('userLanguage', formData.language);
    
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      parsed.name = formData.fullName;
      parsed.vehicle_number = formData.vehicleNumber;
      parsed.profileComplete = !!(
        formData.fullName.trim() &&
        formData.phone.trim() &&
        formData.vehicleNumber.trim() &&
        formData.drivingLicenseNumber.trim()
      );
      localStorage.setItem('user', JSON.stringify(parsed));
    }

    if (returnTo) {
      const isNowComplete = formData.fullName.trim() && formData.phone.trim() && formData.vehicleNumber.trim() && formData.drivingLicenseNumber.trim();
      if (isNowComplete) {
        setTimeout(() => navigate(returnTo), 1200);
        return;
      }
    }
  };

  const getDocumentStatus = (doc: { uploaded: boolean; verified: boolean; expiry: string | null }) => {
    if (!doc.uploaded) return { status: 'missing', label: 'Upload Required' };
    if (!doc.verified) return { status: 'pending', label: 'Pending Verification' };
    if (doc.expiry) {
      const expiryDate = new Date(doc.expiry);
      const today = new Date();
      const daysUntilExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysUntilExpiry < 0) return { status: 'expired', label: 'Expired' };
      if (daysUntilExpiry < 30) return { status: 'pending', label: `Expires in ${daysUntilExpiry} days` };
    }
    return { status: 'verified', label: 'Verified' };
  };

  const hasCompletedCoreProfile = !!(
    formData.fullName.trim() &&
    formData.phone.trim() &&
    formData.vehicleNumber.trim() &&
    formData.drivingLicenseNumber.trim()
  );

  const isFormComplete = !!(
    formData.fullName.trim() &&
    formData.email.trim() &&
    formData.phone.trim() &&
    formData.vehicleNumber.trim() &&
    formData.vehicleModel.trim() &&
    formData.vehicleColor.trim() &&
    formData.drivingLicenseNumber.trim() &&
    formData.licenseExpiry.trim() &&
    formData.bankAccountName.trim() &&
    formData.bankAccountNumber.trim() &&
    formData.bankIFSC.trim() &&
    formData.emergencyContact.trim() &&
    formData.emergencyPhone.trim() &&
    formData.emergencyRelation.trim()
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <>
            <div className="ds-section-block">
              <h3 className="ds-section-title"><User size={20} /> Personal Details</h3>
              <div className="ds-input-row">
                <div className="ds-input-group">
                  <label>Full Name</label>
                  <input type="text" name="fullName" className="ds-input" value={formData.fullName} onChange={handleChange} placeholder="Enter your full name" />
                </div>
                <div className="ds-input-group">
                  <label>Phone Number</label>
                  <div className="ds-input-with-badge">
                    <input type="text" name="phone" className="ds-input" value={formData.phone} onChange={handleChange} placeholder="+91 98765 43210" />
                    {formData.phone && <span className="ds-input-internal-badge"><Check size={12} style={{marginRight: 4}}/> Verified</span>}
                  </div>
                </div>
              </div>
              <div className="ds-input-group">
                <label>Email Address</label>
                <input type="email" name="email" className="ds-input" value={formData.email} onChange={handleChange} placeholder="driver@example.com" />
              </div>
            </div>

            <div className="ds-section-block" style={{marginTop: '16px'}}>
              <h3 className="ds-section-title"><AlertTriangle size={20} /> Emergency Contact</h3>
              <div className="ds-input-row">
                <div className="ds-input-group">
                  <label>Contact Name</label>
                  <input type="text" name="emergencyContact" className="ds-input" value={formData.emergencyContact} onChange={handleChange} placeholder="Full name" />
                </div>
                <div className="ds-input-group">
                  <label>Relationship</label>
                  <select name="emergencyRelation" className="ds-input" value={formData.emergencyRelation} onChange={handleChange}>
                    <option value="">Select relationship</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Parent">Parent</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Friend">Friend</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <div className="ds-input-group">
                <label>Emergency Phone Number</label>
                <input type="text" name="emergencyPhone" className="ds-input" value={formData.emergencyPhone} onChange={handleChange} placeholder="+91 98765 43210" />
              </div>
            </div>
          </>
        );

      case 'vehicle':
        return (
          <>
            <div className="ds-section-block">
              <h3 className="ds-section-title"><Car size={20} /> Vehicle Information</h3>
              <div className="ds-input-row">
                <div className="ds-input-group">
                  <label>Vehicle Type</label>
                  <select name="vehicleType" className="ds-input" value={formData.vehicleType} onChange={handleChange}>
                    <option value="Two Wheeler">Two Wheeler</option>
                    <option value="Three Wheeler">Three Wheeler</option>
                    <option value="Car">Car</option>
                    <option value="Van">Van</option>
                    <option value="Truck">Truck</option>
                  </select>
                </div>
                <div className="ds-input-group">
                  <label>Vehicle Model</label>
                  <input type="text" name="vehicleModel" className="ds-input" value={formData.vehicleModel} onChange={handleChange} placeholder="e.g., Honda Activa" />
                </div>
              </div>
              <div className="ds-input-row">
                <div className="ds-input-group">
                  <label>Registration Number</label>
                  <input type="text" name="vehicleNumber" className="ds-input" value={formData.vehicleNumber} onChange={handleChange} placeholder="MH01AB1234" style={{ textTransform: 'uppercase' }} />
                </div>
                <div className="ds-input-group">
                  <label>Vehicle Color</label>
                  <input type="text" name="vehicleColor" className="ds-input" value={formData.vehicleColor} onChange={handleChange} placeholder="e.g., Black" />
                </div>
              </div>
            </div>

            <div className="ds-section-block" style={{marginTop: '16px'}}>
              <h3 className="ds-section-title"><IdCard size={20} /> License Details</h3>
              <div className="ds-input-row">
                <div className="ds-input-group">
                  <label>License Number</label>
                  <input type="text" name="drivingLicenseNumber" className="ds-input" value={formData.drivingLicenseNumber} onChange={handleChange} placeholder="MH0120210012345" style={{ textTransform: 'uppercase' }} />
                </div>
                <div className="ds-input-group">
                  <label>License Expiry</label>
                  <input type="date" name="licenseExpiry" className="ds-input" value={formData.licenseExpiry} onChange={handleChange} />
                </div>
              </div>
            </div>

            <div className="ds-section-block" style={{marginTop: '16px'}}>
              <h3 className="ds-section-title"><FileText size={20} /> Documents</h3>
              <div className="ds-documents-grid">
                {Object.entries(documents).map(([key, doc]) => {
                  const status = getDocumentStatus(doc);
                  const labels: { [key: string]: string } = {
                    license: 'Driving License',
                    vehicleRC: 'Vehicle RC',
                    insurance: 'Insurance',
                    aadhar: 'Aadhar Card',
                    pan: 'PAN Card'
                  };
                  const icons: { [key: string]: React.ReactNode } = {
                    license: <IdCard size={20} />,
                    vehicleRC: <ClipboardList size={20} />,
                    insurance: <Shield size={20} />,
                    aadhar: <IdCard size={20} />,
                    pan: <CreditCard size={20} />
                  };
                  return (
                    <div key={key} className="ds-doc-card">
                      <div className="ds-doc-icon">{icons[key]}</div>
                      <div className="ds-doc-info">
                        <h4>{labels[key]}</h4>
                        <span className={`ds-doc-status ${status.status}`}>{status.label}</span>
                      </div>
                      <button className="ds-doc-btn">{doc.uploaded ? 'Update' : 'Upload'}</button>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        );

      case 'payment':
        return (
          <>
            <div className="ds-section-block">
              <h3 className="ds-section-title"><CreditCard size={20} /> Bank Account</h3>
              <div className="ds-input-group">
                <label>Account Holder Name</label>
                <input type="text" name="bankAccountName" className="ds-input" value={formData.bankAccountName} onChange={handleChange} placeholder="As per bank records" />
              </div>
              <div className="ds-input-row">
                <div className="ds-input-group">
                  <label>Account Number</label>
                  <input type="text" name="bankAccountNumber" className="ds-input" value={formData.bankAccountNumber} onChange={handleChange} placeholder="XXXX XXXX XXXX" />
                </div>
                <div className="ds-input-group">
                  <label>IFSC Code</label>
                  <input type="text" name="bankIFSC" className="ds-input" value={formData.bankIFSC} onChange={handleChange} placeholder="SBIN0001234" style={{ textTransform: 'uppercase' }} />
                </div>
              </div>
            </div>

            <div className="ds-section-block" style={{marginTop: '16px'}}>
              <h3 className="ds-section-title"><Smartphone size={20} /> UPI Payment</h3>
              <div className="ds-input-group">
                <label>UPI ID</label>
                <input type="text" name="upiId" className="ds-input" value={formData.upiId} onChange={handleChange} placeholder="yourname@upi" />
              </div>
            </div>
          </>
        );

      case 'preferences':
        return (
          <>
            <div className="ds-section-block">
              <h3 className="ds-section-title"><Target size={20} /> Work Preferences</h3>
              <div className="ds-input-row">
                <div className="ds-input-group">
                  <label>Preferred Zone</label>
                  <select name="preferredZone" className="ds-input" value={formData.preferredZone} onChange={handleChange}>
                    <option value="Any">Any Zone</option>
                    <option value="North">North</option>
                    <option value="South">South</option>
                    <option value="East">East</option>
                    <option value="West">West</option>
                    <option value="Central">Central</option>
                  </select>
                </div>
                <div className="ds-input-group">
                  <label>Max Delivery Distance</label>
                  <select name="maxDistance" className="ds-input" value={formData.maxDistance} onChange={handleChange}>
                    <option value="5">5 km</option>
                    <option value="10">10 km</option>
                    <option value="15">15 km</option>
                    <option value="20">20 km</option>
                    <option value="25">25 km</option>
                    <option value="50">50 km</option>
                  </select>
                </div>
              </div>
              <div className="ds-pref-row">
                <div className="ds-pref-info">
                  <h4>Auto-Accept Deliveries</h4>
                  <p>Automatically accept nearby delivery requests</p>
                </div>
                <label className="ds-switch">
                  <input type="checkbox" checked={formData.autoAccept} onChange={() => handleToggle('autoAccept')} />
                  <span className="ds-slider"></span>
                </label>
              </div>
            </div>

            <div className="ds-section-block" style={{marginTop: '16px'}}>
              <h3 className="ds-section-title"><Bell size={20} /> Notifications</h3>
              <div className="ds-pref-row">
                <div className="ds-pref-info">
                  <h4>Push Notifications</h4>
                  <p>Receive instant alerts for new deliveries</p>
                </div>
                <label className="ds-switch">
                  <input type="checkbox" checked={formData.notificationsPush} onChange={() => handleToggle('notificationsPush')} />
                  <span className="ds-slider"></span>
                </label>
              </div>
              <div className="ds-pref-row">
                <div className="ds-pref-info">
                  <h4>WhatsApp Notifications</h4>
                  <p>Get pickup and delivery updates via WhatsApp</p>
                </div>
                <label className="ds-switch">
                  <input type="checkbox" checked={formData.notificationsWhatsApp} onChange={() => handleToggle('notificationsWhatsApp')} />
                  <span className="ds-slider"></span>
                </label>
              </div>
              <div className="ds-pref-row">
                <div className="ds-pref-info">
                  <h4>SMS Alerts</h4>
                  <p>Receive urgent pickup reminders via SMS</p>
                </div>
                <label className="ds-switch">
                  <input type="checkbox" checked={formData.notificationsSMS} onChange={() => handleToggle('notificationsSMS')} />
                  <span className="ds-slider"></span>
                </label>
              </div>
              <div className="ds-pref-row">
                <div className="ds-pref-info">
                  <h4>Email Notifications</h4>
                  <p>Receive weekly earnings summary via email</p>
                </div>
                <label className="ds-switch">
                  <input type="checkbox" checked={formData.notificationsEmail} onChange={() => handleToggle('notificationsEmail')} />
                  <span className="ds-slider"></span>
                </label>
              </div>
            </div>

            <div className="ds-section-block" style={{marginTop: '16px'}}>
              <h3 className="ds-section-title"><Volume2 size={20} /> Sound & Vibration</h3>
              <div className="ds-pref-row">
                <div className="ds-pref-info">
                  <h4>Sound Alerts</h4>
                  <p>Play sound for new delivery requests</p>
                </div>
                <label className="ds-switch">
                  <input type="checkbox" checked={formData.soundAlerts} onChange={() => handleToggle('soundAlerts')} />
                  <span className="ds-slider"></span>
                </label>
              </div>
              <div className="ds-pref-row">
                <div className="ds-pref-info">
                  <h4>Vibration</h4>
                  <p>Vibrate on new notifications</p>
                </div>
                <label className="ds-switch">
                  <input type="checkbox" checked={formData.vibration} onChange={() => handleToggle('vibration')} />
                  <span className="ds-slider"></span>
                </label>
              </div>
            </div>

            <div className="ds-section-block" style={{marginTop: '16px'}}>
              <h3 className="ds-section-title"><Globe size={20} /> Language</h3>
              <div className="ds-input-group">
                <label>App Language</label>
                <select name="language" className="ds-input" value={formData.language} onChange={handleChange}>
                  <option value="English">English</option>
                  <option value="Hindi">Hindi (हिन्दी)</option>
                  <option value="Marathi">Marathi (मराठी)</option>
                  <option value="Tamil">Tamil (தமிழ்)</option>
                  <option value="Telugu">Telugu (తెలుగు)</option>
                  <option value="Kannada">Kannada (ಕನ್ನಡ)</option>
                </select>
              </div>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="ds-page-container">
      <div className="ds-main-content">
        
        <div className="ds-page-header">
          <button className="ds-back-btn" onClick={() => navigate('/home')}>←</button>
          <h1>{hasCompletedCoreProfile ? 'Driver Settings' : 'Complete Your Driver Profile'}</h1>
        </div>

        {incompleteProfile && !hasCompletedCoreProfile && (
          <div className="ds-incomplete-banner">
            <AlertTriangle size={24} />
            <div>
              <strong>Action Required: Complete your profile</strong>
              <p>Please fill in your <em>Full Name</em>, <em>Phone</em>, <em>Vehicle Number</em>, and <em>Driving License Number</em> before you can seamlessly accept and deliver pickups.</p>
            </div>
          </div>
        )}

        {/* TOP PROFILE CARD */}
        <div className="ds-card ds-profile-overview">
          <div className="ds-profile-left">
            <div className="ds-avatar">
              {formData.fullName ? formData.fullName.charAt(0).toUpperCase() : 'D'}
            </div>
            <div className="ds-profile-info">
              <h2>{formData.fullName || 'Driver'}</h2>
              <p>{formData.vehicleNumber || 'No vehicle registered'}</p>
              <div className="ds-badges-row">
                <span className="ds-badge vehicle">
                  {formData.vehicleType === 'Two Wheeler' ? <Bike size={14} /> : 
                   formData.vehicleType === 'Three Wheeler' ? <Truck size={14} /> : 
                   formData.vehicleType === 'Car' ? <Car size={14} /> : <Truck size={14} />}
                  {formData.vehicleType}
                </span>
                <span className="ds-badge rating"><Star size={14} /> {stats.rating}</span>
                <span className="ds-badge deliveries"><Package size={14} /> {stats.totalDeliveries} deliveries</span>
              </div>
            </div>
          </div>
          <div className="ds-profile-right">
            <div className={`ds-status-badge ${isOnline ? 'online' : 'offline'}`}>
              <span className="ds-status-dot"></span>
              {isOnline ? 'Online' : 'Offline'}
            </div>
            <div className="ds-toggle-container">
              <span className="ds-toggle-label">{isOnline ? 'Go Offline' : 'Go Online'}</span>
              <label className="ds-switch">
                <input type="checkbox" checked={isOnline} onChange={handleOnlineToggle} />
                <span className="ds-slider"></span>
              </label>
            </div>
          </div>
        </div>

        {/* STATS QUAD ROW */}
        <div className="ds-stats-grid">
          <div className="ds-stat-card">
            <div className="ds-stat-icon"><Package size={24} /></div>
            <div className="ds-stat-info">
              <span className="ds-stat-value">{stats.totalDeliveries}</span>
              <span className="ds-stat-label">Deliveries</span>
            </div>
          </div>
          <div className="ds-stat-card">
            <div className="ds-stat-icon"><Banknote size={24} /></div>
            <div className="ds-stat-info">
              <span className="ds-stat-value">₹{stats.totalEarnings.toLocaleString()}</span>
              <span className="ds-stat-label">Earnings</span>
            </div>
          </div>
          <div className="ds-stat-card">
            <div className="ds-stat-icon"><Target size={24} /></div>
            <div className="ds-stat-info">
              <span className="ds-stat-value">{stats.completionRate}%</span>
              <span className="ds-stat-label">Completion</span>
            </div>
          </div>
          <div className="ds-stat-card">
            <div className="ds-stat-icon"><Star size={24} /></div>
            <div className="ds-stat-info">
              <span className="ds-stat-value">{stats.rating}</span>
              <span className="ds-stat-label">Rating</span>
            </div>
          </div>
        </div>

        {/* TABS & FORM */}
        <div className="ds-card ds-form-container">
          <div className="ds-tabs-container">
            <button className={`ds-tab ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
              <User size={16} /> Profile
            </button>
            <button className={`ds-tab ${activeTab === 'vehicle' ? 'active' : ''}`} onClick={() => setActiveTab('vehicle')}>
              <Car size={16} /> Vehicle
            </button>
            <button className={`ds-tab ${activeTab === 'payment' ? 'active' : ''}`} onClick={() => setActiveTab('payment')}>
              <CreditCard size={16} /> Payment
            </button>
            <button className={`ds-tab ${activeTab === 'preferences' ? 'active' : ''}`} onClick={() => setActiveTab('preferences')}>
              <Settings size={16} /> Preferences
            </button>
          </div>

          <div className="ds-form-section">
            {renderTabContent()}

            <div className="ds-footer">
              <button className="ds-btn-cancel" onClick={() => navigate('/home')}>Cancel</button>
              <button 
                className="ds-btn-save" 
                onClick={handleSave} 
                disabled={!isFormComplete}
                style={{ opacity: isFormComplete ? 1 : 0.5, cursor: isFormComplete ? 'pointer' : 'not-allowed' }}
                title={isFormComplete ? "Save changes" : "Please fill in all empty fields to save"}
              >
                <Save size={16} /> Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>

      {showToast && (
        <div className={`ds-toast ${toastMessage.includes('offline') || toastMessage.includes('Error') ? 'warning' : 'success'}`}>
          {toastMessage.includes('offline') || toastMessage.includes('Error') ? <Circle size={20} /> : <CheckCircle size={20} />}
          <span className="ds-toast-message">{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default DriverSettings;
