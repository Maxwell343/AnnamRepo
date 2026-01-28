import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AuthStyles.css';

interface FormData {
  email: string;
  password: string;
  name: string;
  role: 'farmer' | 'ngo' | 'driver';
}

interface User {
  id: number;
  name: string;
  email: string;
  role: 'farmer' | 'ngo' | 'driver';
}

const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [emailError, setEmailError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [focusedField, setFocusedField] = useState<string>('');
  
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    name: '',
    role: 'farmer'
  });

  // Email validation function
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    if (name === 'email') {
      setEmailError('');
    }
  };

  const handleRoleSelect = (role: 'farmer' | 'ngo' | 'driver') => {
    setFormData({ ...formData, role });
  };

  const handleEmailBlur = () => {
    if (formData.email && !validateEmail(formData.email)) {
      setEmailError('Please enter a valid email address');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setEmailError('');
    setIsSubmitting(true);

    // Validate email format before submission
    if (!validateEmail(formData.email)) {
      setEmailError('Please enter a valid email address');
      setIsSubmitting(false);
      return;
    }

    // Select the correct API endpoint based on the mode
    const endpoint = isLogin 
      ? 'http://localhost:5000/api/login' 
      : 'http://localhost:5000/api/signup';

    try {
      // Prepare request body - only send email/password for login
      const requestBody = isLogin 
        ? { 
            email: formData.email, 
            password: formData.password 
          }
        : {
            email: formData.email,
            password: formData.password,
            name: formData.name,
            role: formData.role
          };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
      }

      // SUCCESS
      if (isLogin) {
        // Validate user data from response
        if (!data.user || !data.user.id || !data.user.role) {
          throw new Error('Invalid response from server');
        }

        // Normalize role - handle 'distributor' from backend
        let userRole: 'farmer' | 'ngo' | 'driver' = data.user.role;
        if (data.user.role === 'distributor') {
          userRole = 'driver';
        }

        // Validate role is one of the expected values
        if (!['farmer', 'ngo', 'driver'].includes(userRole)) {
          throw new Error(`Unknown role: ${data.user.role}`);
        }

        // Create user object
        const user: User = {
          id: data.user.id,
          name: data.user.name || 'User',
          email: data.user.email || formData.email,
          role: userRole
        };

        // Save to localStorage
        localStorage.setItem('user', JSON.stringify(user));
        
        console.log('✅ User logged in successfully:', user);
        
        // Navigate to home page
        navigate('/home');
      } else {
        // Sign up successful
        alert('Account created successfully! Please login.');
        setIsLogin(true);
        // Keep email, clear other fields
        setFormData({
          email: formData.email,
          password: '',
          name: '',
          role: 'farmer'
        });
      }

    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Role configuration
  const roles = [
    { 
      id: 'farmer' as const, 
      icon: '🌱', 
      label: 'Farmer', 
      description: 'Donate surplus produce' 
    },
    { 
      id: 'ngo' as const, 
      icon: '🏢', 
      label: 'NGO', 
      description: 'Receive & distribute' 
    },
    { 
      id: 'driver' as const, 
      icon: '🚚', 
      label: 'Driver', 
      description: 'Transport donations' 
    }
  ];

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="form-wrapper" key={isLogin ? 'login' : 'signup'}>
          <h1 className="auth-title">Annam</h1>
          
          <p className="auth-subtitle">
            {isLogin 
              ? 'Welcome back! Login to sustain the world.' 
              : 'Join the movement to feed the hungry.'}
          </p>

          {error && <div className="error-msg">{error}</div>}

          <form onSubmit={handleSubmit}>
          
            {/* Show Name field only for Sign Up */}
            {!isLogin && (
              <div className="form-group">
                <label className={`form-label ${formData.name ? 'floating' : ''}`}>
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  className="form-input"
                  placeholder="e.g. Rahul Kumar"
                  value={formData.name}
                  onChange={handleChange}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField('')}
                  required={!isLogin}
                />
                <div className="input-underline"></div>
              </div>
            )}

            <div className="form-group">
              <label className={`form-label ${formData.email ? 'floating' : ''}`}>
                Email Address
              </label>
              <input
                type="email"
                name="email"
                className={`form-input ${emailError ? 'input-error' : ''}`}
                placeholder="user@example.com"
                value={formData.email}
                onChange={handleChange}
                onFocus={() => setFocusedField('email')}
                onBlur={() => {
                  setFocusedField('');
                  handleEmailBlur();
                }}
                required
              />
              <div className="input-underline"></div>
              {emailError && <div className="error-text">{emailError}</div>}
            </div>

            <div className="form-group">
              <label className={`form-label ${formData.password ? 'floating' : ''}`}>
                Password
              </label>
              <input
                type="password"
                name="password"
                className="form-input"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField('')}
                required
                minLength={6}
              />
              <div className="input-underline"></div>
            </div>

            {/* Show Role field only for Sign Up */}
            {!isLogin && (
              <div className="form-group">
                <label className="form-label">I am a...</label>
                
                {/* Role Cards */}
                <div className="role-cards">
                  {roles.map((role) => (
                    <div
                      key={role.id}
                      className={`role-card ${formData.role === role.id ? 'active' : ''}`}
                      onClick={() => handleRoleSelect(role.id)}
                    >
                      <span className="role-icon">{role.icon}</span>
                      <div className="role-info">
                        <span className="role-label">{role.label}</span>
                        <span className="role-desc">{role.description}</span>
                      </div>
                      {formData.role === role.id && (
                        <span className="role-check">✓</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button type="submit" className="auth-btn" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className="btn-spinner"></span>
                  {isLogin ? 'Logging in...' : 'Creating account...'}
                </>
              ) : (
                isLogin ? 'Login' : 'Create Account'
              )}
            </button>
          </form>

          <p className="toggle-text">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <span 
              className="toggle-link" 
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setEmailError('');
                // Reset form but keep email
                setFormData({
                  email: formData.email,
                  password: '',
                  name: '',
                  role: 'farmer'
                });
              }}
            >
              {isLogin ? 'Sign Up' : 'Login'}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;