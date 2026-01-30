import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AuthStyles.css';

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

const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [emailError, setEmailError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

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
    { id: 'farmer' as const, icon: '🌱', label: 'Farmer', desc: 'Surplus producer' },
    { id: 'ngo' as const, icon: '🏢', label: 'NGO', desc: 'Food distribution' },
    { id: 'driver' as const, icon: '🚚', label: 'Driver', desc: 'Logistics partner' }
  ];

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="form-wrapper">

          <h1 className="auth-title">Annam</h1>
          <p className="auth-subtitle">
            {isLogin ? 'Welcome back. Please login.' : 'Create your ANNAM account.'}
          </p>

          {error && <div className="error-msg">{error}</div>}

          <form onSubmit={handleSubmit}>

            {!isLogin && (
              <>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input className="form-input" name="name" value={formData.name} onChange={handleChange} required />
                  <div className="input-underline"></div>
                </div>

                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input className="form-input" name="phone" value={formData.phone} onChange={handleChange} required />
                  <div className="input-underline"></div>
                </div>

                <div className="form-group">
                  <label className="form-label">City / District</label>
                  <input className="form-input" name="city" value={formData.city} onChange={handleChange} required />
                  <div className="input-underline"></div>
                </div>
              </>
            )}

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input className={`form-input ${emailError ? 'input-error' : ''}`} name="email" value={formData.email} onChange={handleChange} required />
              <div className="input-underline"></div>
              {emailError && <div className="error-text">{emailError}</div>}
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <input type="password" className="form-input" name="password" value={formData.password} onChange={handleChange} required />
              <div className="input-underline"></div>
            </div>

            {!isLogin && (
              <div className="form-group">
                <label className="form-label">I am a...</label>
                <div className="role-cards">
                  {roles.map(r => (
                    <div
                      key={r.id}
                      className={`role-card ${formData.role === r.id ? 'active' : ''}`}
                      onClick={() => handleRoleSelect(r.id)}
                      data-role={r.id}
                    >
                      <span className="role-icon">{r.icon}</span>
                      <div className="role-info">
                        <span className="role-label">{r.label}</span>
                        <span className="role-desc">{r.desc}</span>
                      </div>
                      {formData.role === r.id && <span className="role-check">✓</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!isLogin && formData.role === 'ngo' && (
              <div className="form-group">
                <label className="form-label">NGO Name</label>
                <input className="form-input" name="ngoName" value={formData.ngoName} onChange={handleChange} required />
                <div className="input-underline"></div>
              </div>
            )}

            {!isLogin && formData.role === 'driver' && (
              <div className="form-group">
                <label className="form-label">Vehicle Type</label>
                <select className="form-input" name="vehicleType" value={formData.vehicleType} onChange={handleChange} required>
                  <option value="">Select Vehicle</option>
                  <option value="bike">Bike</option>
                  <option value="van">Van</option>
                  <option value="truck">Truck</option>
                </select>
                <div className="input-underline"></div>
              </div>
            )}

            <button type="submit" className="auth-btn" disabled={isSubmitting}>
              {isLogin ? 'Login' : 'Create Account'}
            </button>

          </form>

          <p className="toggle-text">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <span className="toggle-link" onClick={() => setIsLogin(!isLogin)}>
              {isLogin ? ' Sign Up' : ' Login'}
            </span>
          </p>

        </div>
      </div>
    </div>
  );
};

export default AuthPage;
