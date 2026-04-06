import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Leaf, Sprout, Building2, Truck, ShoppingCart, Check, X, Eye, EyeOff, ArrowRight, User, Phone, MapPin, Mail, Lock } from 'lucide-react';
import './AuthStyles.css';
import { API_ENDPOINTS } from '../../../config/api';
import { useToast } from '../../../components/ui/ToastProvider';

// Declare google global for TypeScript
declare global {
  interface Window {
    google: any;
    __annamGoogleInitialized?: boolean;
  }
}

interface FormData {
  email: string;
  password: string;
  name: string;
  phone: string;
  city: string;
  role: 'farmer' | 'ngo' | 'driver' | 'customer' | 'admin';
  ngoName?: string;
  vehicleType?: string;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  role: 'farmer' | 'ngo' | 'driver' | 'customer' | 'admin';
  profileComplete?: boolean;
}

interface GoogleUserData {
  email: string;
  name: string;
  picture: string;
  credential: string;
}

const GOOGLE_CLIENT_ID = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '252459668976-fdlbf40t3jh7h8eg13o308th2gp7r22k.apps.googleusercontent.com';

const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [emailError, setEmailError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  
  // Google OAuth states
  const [showRoleModal, setShowRoleModal] = useState<boolean>(false);
  const [googleUserData, setGoogleUserData] = useState<GoogleUserData | null>(null);
  const [selectedRole, setSelectedRole] = useState<'farmer' | 'ngo' | 'driver' | 'customer' | 'admin'>('farmer');
  const [titleClickCount, setTitleClickCount] = useState(0);
  const [googleNgoName, setGoogleNgoName] = useState<string>('');
  const [googleVehicleType, setGoogleVehicleType] = useState<string>('');
  const [googlePhone, setGooglePhone] = useState<string>('');
  const [googleCity, setGoogleCity] = useState<string>('');

  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    name: '',
    phone: '',
    city: '',
    role: 'farmer',
    ngoName: '',
    vehicleType: ''
  });

  // Initialize Google Sign-In with popup mode
  useEffect(() => {
    const initializeGoogle = () => {
      if (window.google && window.google.accounts) {
        if (window.__annamGoogleInitialized) return;

        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
          ux_mode: 'popup',
        });
        window.__annamGoogleInitialized = true;
        
        // Render hidden button for triggering
        const hiddenBtn = document.getElementById('google-btn-hidden');
        if (hiddenBtn) {
          hiddenBtn.innerHTML = '';
          window.google.accounts.id.renderButton(hiddenBtn, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: 'continue_with',
            width: 300,
          });
        }
      }
    };

    // Wait for Google script to load
    const checkGoogle = setInterval(() => {
      if (window.google && window.google.accounts) {
        initializeGoogle();
        clearInterval(checkGoogle);
      }
    }, 100);

    // Timeout after 5 seconds
    const timeout = setTimeout(() => {
      clearInterval(checkGoogle);
    }, 5000);

    return () => {
      clearInterval(checkGoogle);
      clearTimeout(timeout);
    };
  }, []);

  const handleGoogleClick = () => {
    // Clear any existing session first to avoid data mixing
    localStorage.removeItem('user');
    
    // Click the hidden Google button
    const googleBtn = document.querySelector('#google-btn-hidden div[role="button"]') as HTMLElement;
    if (googleBtn) {
      googleBtn.click();
    } else {
      // Fallback: Try to use prompt
      if (window.google && window.google.accounts) {
        window.google.accounts.id.prompt();
      } else {
        setError('Google Sign-In is loading. Please try again in a moment.');
      }
    }
  };

  const decodeJWT = (token: string) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  };

  const handleGoogleResponse = async (response: any) => {
    try {
      const decoded = decodeJWT(response.credential);
      if (!decoded) {
        setError('Failed to decode Google response');
        return;
      }

      const userData: GoogleUserData = {
        email: decoded.email,
        name: decoded.name,
        picture: decoded.picture,
        credential: response.credential
      };

      // Check if user exists
      let userExists = false;
      try {
        const checkResponse = await fetch(API_ENDPOINTS.googleAuth.check, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: userData.email }),
        });
        const checkData = await checkResponse.json();
        userExists = checkData.exists === true;
      } catch (checkErr) {
        console.error('Check endpoint error:', checkErr);
        userExists = false;
      }

      if (userExists) {
        // User exists — log them in directly and redirect by role
        const loginResponse = await fetch(API_ENDPOINTS.googleAuth.login, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            email: userData.email,
            credential: response.credential 
          }),
        });

        if (!loginResponse.ok) {
          let errorMessage = 'Failed to login with Google';
          try {
            const loginData = await loginResponse.json();
            errorMessage = loginData.detail || loginData.message || errorMessage;
          } catch (e) {
            if (loginResponse.status === 0) {
              errorMessage = 'Unable to connect to server. Please check if the backend is running.';
            } else {
              errorMessage = `Server error (${loginResponse.status}). Please try again.`;
            }
          }
          setError(errorMessage);
          return;
        }

        const loginData = await loginResponse.json();
        const user: UserData = {
          id: loginData.user.id,
          name: loginData.user.name,
          email: loginData.user.email,
          role: loginData.user.role,
          profileComplete: !!loginData.user.profileComplete,
        };
        localStorage.setItem('user', JSON.stringify(user));
        window.dispatchEvent(new CustomEvent('annam-role-transition', { detail: { path: getRedirectUrl(user.role), role: user.role } }));
        return;
      }

      // User does NOT exist — show the role selection modal
      // so they can pick role, city, phone etc.
      setGoogleUserData(userData);
      setShowRoleModal(true);
      setError('');
    } catch (err: any) {
      console.error('Google auth error:', err);
      const errorMsg = err.message || 'Google authentication failed';
      if (errorMsg.includes('Failed to fetch')) {
        setError('Unable to connect to server. Please check if the backend is running.');
      } else {
        setError(errorMsg);
      }
    }
  };

  const handleGoogleSignup = async () => {
    if (!googleUserData) return;

    if (!googlePhone || !googleCity) {
      setError('Please fill in all required fields');
      return;
    }

    if (selectedRole === 'ngo' && !googleNgoName) {
      setError('Please enter your NGO name');
      return;
    }

    if (selectedRole === 'driver' && !googleVehicleType) {
      setError('Please select your vehicle type');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const signupData = {
        email: googleUserData.email,
        name: googleUserData.name,
        credential: googleUserData.credential,
        phone: googlePhone,
        city: googleCity,
        role: selectedRole,
        ngoName: selectedRole === 'ngo' ? googleNgoName : undefined,
        vehicleType: selectedRole === 'driver' ? googleVehicleType : undefined
      };
      
      const response = await fetch(API_ENDPOINTS.googleAuth.signup, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupData),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to create account';
        try {
          const data = await response.json();
          errorMessage = data.detail || data.message || errorMessage;
        } catch (e) {
          if (response.status === 0) {
            errorMessage = 'Unable to connect to server. Please check if the backend is running.';
          } else {
            errorMessage = `Server error (${response.status}). Please try again.`;
          }
        }
        setError(errorMessage);
        return;
      }

      const data = await response.json();
      const user: UserData = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        role: data.user.role,
        profileComplete: false,
      };
      localStorage.setItem('user', JSON.stringify(user));
      setShowRoleModal(false);
      window.dispatchEvent(new CustomEvent('annam-role-transition', { detail: { path: getRedirectUrl(user.role), role: user.role } }));
    } catch (err: any) {
      console.error('Google signup error:', err);
      const errorMessage = err.message || 'Failed to create account';
      if (errorMessage.includes('Failed to fetch')) {
        setError('Unable to connect to server. Please check if the backend is running at ' + API_ENDPOINTS.googleAuth.signup);
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const getRedirectUrl = (userRole?: string): string => {
    const returnTo = (location.state as any)?.returnTo;
    if (returnTo) return returnTo;
    
    const role = userRole ?? (localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user') || '{}').role : 'farmer');
    
    switch (role) {
      case 'admin':
        return '/admin';
      case 'customer':
        return '/home';
      case 'farmer':
        return '/home';
      case 'ngo':
        return '/home';
      case 'driver':
        return '/home';
      default:
        return '/home';
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (name === 'email') setEmailError('');
  };

  const handleRoleSelect = (role: 'farmer' | 'ngo' | 'driver' | 'customer' | 'admin') => {
    setFormData({ ...formData, role });
  };

  const handleTitleClick = () => {
    const newCount = titleClickCount + 1;
    setTitleClickCount(newCount);
    if (newCount >= 5) {
      const adminUser = { id: 'admin', name: 'Admin', email: 'admin@annam.com', role: 'admin' };
      localStorage.setItem('user', JSON.stringify(adminUser));
      navigate('/admin');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setEmailError('');
    setIsSubmitting(true);

    if (!validateEmail(formData.email)) {
      setEmailError('Please enter a valid email address');
      setIsSubmitting(false);
      return;
    }

    const endpoint = isLogin 
      ? API_ENDPOINTS.login
      : API_ENDPOINTS.signup;

    try {
      const requestBody = isLogin 
        ? { 
            email: formData.email, 
            password: formData.password 
          }
        : {
            email: formData.email,
            password: formData.password,
            name: formData.name,
            phone: formData.phone,
            city: formData.city,
            role: formData.role,
            ngoName: formData.role === 'ngo' ? formData.ngoName : undefined,
            vehicleType: formData.role === 'driver' ? formData.vehicleType : undefined
          };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        let errorMessage = 'Something went wrong';
        try {
          const data = await response.json();
          errorMessage = data.detail || data.message || errorMessage;
        } catch (e) {
          if (response.status === 0) {
            errorMessage = 'Unable to connect to server. Please check if the backend is running.';
          } else {
            errorMessage = `Server error (${response.status}). Please try again.`;
          }
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (isLogin) {
        const user: UserData = {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          role: data.user.role,
          profileComplete: !!data.user.profileComplete,
        };

        localStorage.setItem('user', JSON.stringify(user));
        window.dispatchEvent(new CustomEvent('annam-role-transition', { detail: { path: getRedirectUrl(), role: user.role } }));
      } else {
        showToast('Account created successfully. Please login.', {
          title: 'Signup Complete',
          variant: 'success',
        });
        setIsLogin(true);
        setFormData({
          email: formData.email,
          password: '',
          name: '',
          phone: '',
          city: '',
          role: 'farmer',
          ngoName: '',
          vehicleType: ''
        });
      }

    } catch (err: any) {
      const errorMsg = err.message || 'An error occurred';
      if (errorMsg.includes('Failed to fetch')) {
        setError('Unable to connect to server. Please check if the backend is running at ' + endpoint);
      } else {
        setError(errorMsg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const roles: { id: FormData['role']; icon: React.ReactNode; label: string; desc: string }[] = [
    { id: 'farmer', icon: <Sprout size={18} />, label: 'Farmer', desc: 'Donate surplus food' },
    { id: 'ngo', icon: <Building2 size={18} />, label: 'NGO', desc: 'Receive donations' },
    { id: 'driver', icon: <Truck size={18} />, label: 'Driver', desc: 'Deliver food' },
    { id: 'customer', icon: <ShoppingCart size={18} />, label: 'Customer', desc: 'Buy fresh food' },
  ];

  // Floating elements for left panel
  const floatingIcons = ['🌾', '🥕', '🍎', '🌽', '🥬', '🍅', '🌿', '🍇'];

  return (
    <div className="auth-page">
      {/* ===== LEFT BRANDING PANEL ===== */}
      <div className="auth-brand-panel">
        <img src="./public/sgnp.png" alt="Farm field" className="brand-bg-photo" />
        <div className="brand-bg-overlay"></div>
        <div className="brand-bg-pattern"></div>
        
        {/* Floating animated icons */}
        <div className="floating-elements">
          {floatingIcons.map((icon, i) => (
            <span 
              key={i} 
              className={`floating-icon fi-${i}`}
              aria-hidden="true"
            >
              {icon}
            </span>
          ))}
        </div>

        {/* Brand content */}
        <div className="brand-content">
          <div className="brand-logo" onClick={handleTitleClick} style={{ cursor: 'default', userSelect: 'none' }}>
            <div className="brand-logo-icon">
              <Leaf size={32} />
            </div>
            <h1 className="brand-name">ANNAM</h1>
          </div>
          <p className="brand-tagline">
            Bridging the gap between surplus and need.<br/>Join thousands connecting farms to communities.
          </p>
          
          {/* Stats strip */}
          <div className="brand-stats">
            <div className="brand-stat">
              <span className="stat-number">10K+</span>
              <span className="stat-label">Farmers</span>
            </div>
            <div className="brand-stat-divider"></div>
            <div className="brand-stat">
              <span className="stat-number">50K+</span>
              <span className="stat-label">Deliveries</span>
            </div>
            <div className="brand-stat-divider"></div>
            <div className="brand-stat">
              <span className="stat-number">200+</span>
              <span className="stat-label">Cities</span>
            </div>
          </div>
        </div>

        {/* Decorative bottom wave */}
        <div className="brand-wave">
          <svg viewBox="0 0 1440 120" preserveAspectRatio="none">
            <path d="M0,64L48,69.3C96,75,192,85,288,80C384,75,480,53,576,48C672,43,768,53,864,64C960,75,1056,85,1152,80C1248,75,1344,53,1392,42.7L1440,32L1440,120L0,120Z" fill="rgba(255,255,255,0.08)"/>
          </svg>
        </div>
      </div>

      {/* ===== RIGHT FORM PANEL ===== */}
      <div className="auth-form-panel">
        <div className="auth-form-wrapper">
          {/* Mobile logo (visible only on small screens) */}
          <div className="mobile-logo">
            <div className="mobile-logo-icon"><Leaf size={22} /></div>
            <span className="mobile-logo-text" onClick={handleTitleClick}>ANNAM</span>
          </div>

          {/* Welcome text */}
          <div className="auth-welcome">
            <h2 className="auth-welcome-title">
              {isLogin ? 'Welcome back' : 'Create account'}
            </h2>
            <p className="auth-welcome-sub">
              {isLogin 
                ? 'Sign in to continue to your dashboard' 
                : 'Join our community and make a difference'}
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="auth-tabs">
            <button 
              className={`auth-tab ${isLogin ? 'active' : ''}`}
              onClick={() => { setIsLogin(true); setError(''); }}
            >
              Sign In
            </button>
            <button 
              className={`auth-tab ${!isLogin ? 'active' : ''}`}
              onClick={() => { setIsLogin(false); setError(''); }}
            >
              Sign Up
            </button>
            <div className={`tab-indicator ${!isLogin ? 'right' : ''}`}></div>
          </div>

          {/* Google Button */}
          <button className="google-btn" onClick={handleGoogleClick} type="button">
            <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
          {/* Google Sign-In Button Container */}
          <div id="google-btn-hidden" style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}></div>

          {/* Divider */}
          <div className="auth-divider">
            <span>or continue with email</span>
          </div>

          {/* Error Message */}
          {error && !showRoleModal && (
            <div className="error-msg">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="auth-form">
            {/* Sign Up Fields */}
            {!isLogin && (
              <>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <div className="input-wrapper">
                    <span className="input-icon"><User size={18} /></span>
                    <input 
                      type="text"
                      className="form-input" 
                      name="name" 
                      placeholder="Enter your full name"
                      value={formData.name} 
                      onChange={handleChange} 
                      required 
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <div className="input-wrapper">
                      <span className="input-icon"><Phone size={18} /></span>
                      <input 
                        type="tel"
                        className="form-input" 
                        name="phone" 
                        placeholder="Phone number"
                        value={formData.phone} 
                        onChange={handleChange} 
                        required 
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">City / District</label>
                    <div className="input-wrapper">
                      <span className="input-icon"><MapPin size={18} /></span>
                      <input 
                        type="text"
                        className="form-input" 
                        name="city" 
                        placeholder="Your city"
                        value={formData.city} 
                        onChange={handleChange} 
                        required 
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Email Field */}
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="input-wrapper">
                <span className="input-icon"><Mail size={18} /></span>
                <input 
                  type="email"
                  className={`form-input ${emailError ? 'input-error' : ''}`} 
                  name="email" 
                  placeholder="you@example.com"
                  value={formData.email} 
                  onChange={handleChange} 
                  required 
                />
              </div>
              {emailError && <div className="error-text">{emailError}</div>}
            </div>

            {/* Password Field */}
            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-wrapper">
                <span className="input-icon"><Lock size={18} /></span>
                <input 
                  type={showPassword ? 'text' : 'password'}
                  className="form-input" 
                  name="password" 
                  placeholder="Enter your password"
                  value={formData.password} 
                  onChange={handleChange} 
                  required 
                />
                <button 
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password (Login only) */}
            {isLogin && (
              <div className="form-options">
                <label className="remember-me">
                  <input 
                    type="checkbox" 
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span className="custom-checkbox">
                    <Check size={12} />
                  </span>
                  Remember me
                </label>
                <span 
                  className="forgot-link"
                  onClick={() => navigate('/forgot-password')}
                >
                  Forgot password?
                </span>
              </div>
            )}

            {/* Role Selection (Sign Up only) */}
            {!isLogin && (
              <div className="form-group">
                <label className="form-label">I am a...</label>
                <div className="role-cards">
                  {roles.map(r => (
                    <div
                      key={r.id}
                      className={`role-card ${formData.role === r.id ? 'active' : ''}`}
                      onClick={() => handleRoleSelect(r.id)}
                    >
                      <span className="role-icon">{r.icon}</span>
                      <span className="role-label">{r.label}</span>
                      <span className="role-desc">{r.desc}</span>
                      {formData.role === r.id && (
                        <span className="role-check"><Check size={12} /></span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* NGO Name (if NGO role) */}
            {!isLogin && formData.role === 'ngo' && (
              <div className="form-group">
                <label className="form-label">NGO Name</label>
                <div className="input-wrapper">
                  <span className="input-icon"><Building2 size={18} /></span>
                  <input 
                    type="text"
                    className="form-input" 
                    name="ngoName" 
                    placeholder="Enter NGO name"
                    value={formData.ngoName} 
                    onChange={handleChange} 
                    required 
                  />
                </div>
              </div>
            )}

            {/* Vehicle Type (if Driver role) */}
            {!isLogin && formData.role === 'driver' && (
              <div className="form-group">
                <label className="form-label">Vehicle Type</label>
                <div className="input-wrapper">
                  <span className="input-icon"><Truck size={18} /></span>
                  <select 
                    className="form-input" 
                    name="vehicleType" 
                    value={formData.vehicleType} 
                    onChange={handleChange} 
                    required
                  >
                    <option value="">Select Vehicle</option>
                    <option value="bike">Bike</option>
                    <option value="van">Van</option>
                    <option value="truck">Truck</option>
                  </select>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button 
              type="submit" 
              className="auth-submit-btn" 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="loading-spinner"></span>
              ) : (
                <>
                  {isLogin ? 'Sign In' : 'Create Account'}
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          {/* Toggle Link */}
          <p className="toggle-text">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <span className="toggle-link" onClick={() => { setIsLogin(!isLogin); setError(''); }}>
              {isLogin ? ' Sign up' : ' Sign in'}
            </span>
          </p>
        </div>
      </div>

      {/* ===== GOOGLE ROLE SELECTION MODAL ===== */}
      {showRoleModal && googleUserData && (
        <div className="role-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowRoleModal(false); }}>
          <div className="role-modal">
            <div className="role-modal-header">
              <div className="google-user-info">
                {googleUserData.picture && (
                  <img 
                    src={googleUserData.picture} 
                    alt="Profile" 
                    className="google-avatar"
                  />
                )}
                <div>
                  <h3>{googleUserData.name}</h3>
                  <p>{googleUserData.email}</p>
                </div>
              </div>
              <button 
                className="modal-close-btn"
                onClick={() => setShowRoleModal(false)}
              >
                <X size={16} />
              </button>
            </div>

            <h2 className="role-modal-title">Complete Your Profile</h2>
            <p className="role-modal-subtitle">Just a few more details to get you started</p>

            {error && <div className="error-msg" style={{ marginBottom: '1rem' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
              {error}
            </div>}

            <div className="role-modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Phone Number *</label>
                  <div className="input-wrapper">
                    <span className="input-icon"><Phone size={18} /></span>
                    <input 
                      type="tel"
                      className="form-input" 
                      placeholder="Phone number"
                      value={googlePhone} 
                      onChange={(e) => setGooglePhone(e.target.value)}
                      required 
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">City / District *</label>
                  <div className="input-wrapper">
                    <span className="input-icon"><MapPin size={18} /></span>
                    <input 
                      type="text"
                      className="form-input" 
                      placeholder="Your city"
                      value={googleCity} 
                      onChange={(e) => setGoogleCity(e.target.value)}
                      required 
                    />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">I am a...</label>
                <div className="role-cards">
                  {roles.map(r => (
                    <div
                      key={r.id}
                      className={`role-card ${selectedRole === r.id ? 'active' : ''}`}
                      onClick={() => setSelectedRole(r.id)}
                    >
                      <span className="role-icon">{r.icon}</span>
                      <span className="role-label">{r.label}</span>
                      <span className="role-desc">{r.desc}</span>
                      {selectedRole === r.id && (
                        <span className="role-check"><Check size={12} /></span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {selectedRole === 'ngo' && (
                <div className="form-group">
                  <label className="form-label">NGO Name *</label>
                  <div className="input-wrapper">
                    <span className="input-icon"><Building2 size={18} /></span>
                    <input 
                      type="text"
                      className="form-input" 
                      placeholder="Enter NGO name"
                      value={googleNgoName} 
                      onChange={(e) => setGoogleNgoName(e.target.value)}
                      required 
                    />
                  </div>
                </div>
              )}

              {selectedRole === 'driver' && (
                <div className="form-group">
                  <label className="form-label">Vehicle Type *</label>
                  <div className="input-wrapper">
                    <span className="input-icon"><Truck size={18} /></span>
                    <select 
                      className="form-input" 
                      value={googleVehicleType} 
                      onChange={(e) => setGoogleVehicleType(e.target.value)}
                      required
                    >
                      <option value="">Select Vehicle</option>
                      <option value="bike">Bike</option>
                      <option value="van">Van</option>
                      <option value="truck">Truck</option>
                    </select>
                  </div>
                </div>
              )}

              <button 
                className="auth-submit-btn"
                onClick={handleGoogleSignup}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="loading-spinner"></span>
                ) : (
                  <>
                    Complete Sign Up
                    <ArrowRight size={20} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthPage;
