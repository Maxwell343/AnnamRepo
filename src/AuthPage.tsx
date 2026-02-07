import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AuthStyles.css';

// Declare google global for TypeScript
declare global {
  interface Window {
    google: any;
  }
}

interface FormData {
  email: string;
  password: string;
  name: string;
  phone: string;
  city: string;
  role: 'farmer' | 'ngo' | 'driver';
  ngoName?: string;
  vehicleType?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: 'farmer' | 'ngo' | 'driver';
}

interface GoogleUserData {
  email: string;
  name: string;
  picture: string;
  credential: string;
}

const GOOGLE_CLIENT_ID = '252459668976-fdlbf40t3jh7h8eg13o308th2gp7r22k.apps.googleusercontent.com';

const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [emailError, setEmailError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(false);
  
  // Google OAuth states
  const [showRoleModal, setShowRoleModal] = useState<boolean>(false);
  const [googleUserData, setGoogleUserData] = useState<GoogleUserData | null>(null);
  const [selectedRole, setSelectedRole] = useState<'farmer' | 'ngo' | 'driver'>('farmer');
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
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
          ux_mode: 'popup',
        });
        
        // Render hidden button for triggering
        const hiddenBtn = document.getElementById('google-btn-hidden');
        if (hiddenBtn) {
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
      console.log('Google response received:', response);
      
      const decoded = decodeJWT(response.credential);
      if (!decoded) {
        setError('Failed to decode Google response');
        return;
      }

      console.log('Decoded JWT:', decoded);

      const userData: GoogleUserData = {
        email: decoded.email,
        name: decoded.name,
        picture: decoded.picture,
        credential: response.credential
      };

      console.log('Checking if user exists:', userData.email);

      // Check if user exists
      const checkResponse = await fetch('http://localhost:5000/api/google-auth/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userData.email }),
      });

      const checkData = await checkResponse.json();
      console.log('Check response:', checkData);

      if (checkData.exists) {
        // User exists, log them in
        console.log('User exists, logging in...');
        const loginResponse = await fetch('http://localhost:5000/api/google-auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            email: userData.email,
            credential: response.credential 
          }),
        });

        const loginData = await loginResponse.json();
        console.log('Login response:', loginData);

        if (loginResponse.ok) {
          const user: User = {
            id: loginData.user.id,
            name: loginData.user.name,
            email: loginData.user.email,
            role: loginData.user.role
          };
          localStorage.setItem('user', JSON.stringify(user));
          navigate('/home');
        } else {
          setError(loginData.detail || 'Failed to login with Google');
        }
      } else {
        // New user, show role selection modal
        console.log('New user, showing role modal...');
        setGoogleUserData(userData);
        setShowRoleModal(true);
      }
    } catch (err: any) {
      console.error('Google auth error:', err);
      setError(err.message || 'Google authentication failed');
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
      
      console.log('Google signup data:', signupData);
      
      const response = await fetch('http://localhost:5000/api/google-auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupData),
      });

      const data = await response.json();
      console.log('Google signup response:', data);

      if (response.ok) {
        const user: User = {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          role: data.user.role
        };
        localStorage.setItem('user', JSON.stringify(user));
        navigate('/home');
      } else {
        setError(data.detail || 'Failed to create account');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (name === 'email') setEmailError('');
  };

  const handleRoleSelect = (role: 'farmer' | 'ngo' | 'driver') => {
    setFormData({ ...formData, role });
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
      ? 'http://localhost:5000/api/login' 
      : 'http://localhost:5000/api/signup';

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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.message || 'Something went wrong');
      }

      if (isLogin) {
        const user: User = {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email,
          role: data.user.role
        };

        localStorage.setItem('user', JSON.stringify(user));
        navigate('/home');
      } else {
        alert('Account created successfully! Please login.');
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
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const roles = [
    { id: 'farmer' as const, icon: '🌱', label: 'Farmer', desc: 'Donate surplus food' },
    { id: 'ngo' as const, icon: '🏢', label: 'NGO', desc: 'Receive donations' },
    { id: 'driver' as const, icon: '🚚', label: 'Driver', desc: 'Deliver food' }
  ];

  return (
    <div className="auth-container">
      {/* Background Image */}
      <div className="auth-background">
        <img 
          src="./public/sgnp.png" 
          alt="Field background"
        />
        <div className="auth-overlay"></div>
      </div>

      {/* Auth Card */}
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <span className="logo-icon">🍃</span>
        </div>
        
        <h1 className="auth-title">ANNAM</h1>

        {/* Tab Switcher */}
        <div className="auth-tabs">
          <button 
            className={`auth-tab ${isLogin ? 'active' : ''}`}
            onClick={() => setIsLogin(true)}
          >
            Sign In
          </button>
          <button 
            className={`auth-tab ${!isLogin ? 'active' : ''}`}
            onClick={() => setIsLogin(false)}
          >
            Sign Up
          </button>
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
          <span>or</span>
        </div>

        {/* Error Message */}
        {error && <div className="error-msg">{error}</div>}

        {/* Form */}
        <form onSubmit={handleSubmit} className="auth-form">
          {/* Sign Up Fields */}
          {!isLogin && (
            <>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <div className="input-wrapper">
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

              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <div className="input-wrapper">
                  <input 
                    type="tel"
                    className="form-input" 
                    name="phone" 
                    placeholder="Enter phone number"
                    value={formData.phone} 
                    onChange={handleChange} 
                    required 
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">City / District</label>
                <div className="input-wrapper">
                  <input 
                    type="text"
                    className="form-input" 
                    name="city" 
                    placeholder="Enter your city"
                    value={formData.city} 
                    onChange={handleChange} 
                    required 
                  />
                </div>
              </div>
            </>
          )}

          {/* Email Field */}
          <div className="form-group">
            <label className="form-label">Email or Phone</label>
            <div className="input-wrapper">
              <input 
                type="email"
                className={`form-input ${emailError ? 'input-error' : ''}`} 
                name="email" 
                placeholder="Enter email or phone number"
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
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
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
                <span className="checkmark"></span>
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
                    {formData.role === r.id && (
                      <span className="role-check">✓</span>
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
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </>
            )}
          </button>
        </form>

        {/* Toggle Link */}
        <p className="toggle-text">
          {isLogin ? "Don't have an account?" : "Already have an account?"}
          <span className="toggle-link" onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? ' Sign up here' : ' Sign in here'}
          </span>
        </p>
      </div>

      {/* Google Role Selection Modal */}
      {showRoleModal && googleUserData && (
        <div className="role-modal-overlay">
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
                ✕
              </button>
            </div>

            <h2 className="role-modal-title">Complete Your Profile</h2>
            <p className="role-modal-subtitle">Please provide additional details to continue</p>

            {error && <div className="error-msg">{error}</div>}

            <div className="role-modal-form">
              <div className="form-group">
                <label className="form-label">Phone Number *</label>
                <div className="input-wrapper">
                  <input 
                    type="tel"
                    className="form-input" 
                    placeholder="Enter phone number"
                    value={googlePhone} 
                    onChange={(e) => setGooglePhone(e.target.value)}
                    required 
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">City / District *</label>
                <div className="input-wrapper">
                  <input 
                    type="text"
                    className="form-input" 
                    placeholder="Enter your city"
                    value={googleCity} 
                    onChange={(e) => setGoogleCity(e.target.value)}
                    required 
                  />
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
                      {selectedRole === r.id && (
                        <span className="role-check">✓</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {selectedRole === 'ngo' && (
                <div className="form-group">
                  <label className="form-label">NGO Name *</label>
                  <div className="input-wrapper">
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
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
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
