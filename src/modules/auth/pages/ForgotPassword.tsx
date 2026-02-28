import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import './AuthStyles.css';import { API_ENDPOINTS } from '../../../config/api';
const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string>('');
  const [emailError, setEmailError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [error, setError] = useState<string>('');

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setEmailError('');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setEmailError('');
    setSuccessMessage('');
    setIsSubmitting(true);

    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch(API_ENDPOINTS.forgotPassword, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.message || 'Something went wrong');
      }

      // DEV: Show OTP in alert for testing (remove in production!)
      if (data.dev_otp) {
        alert(`[DEV] Your OTP is: ${data.dev_otp}`);
      }

      setSuccessMessage('OTP sent to your email address!');
      
      // Store email in sessionStorage for the next steps
      sessionStorage.setItem('resetEmail', email);
      
      // Navigate to OTP verification page after a short delay
      setTimeout(() => {
        navigate('/verify-otp');
      }, 1500);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="form-wrapper">

          {/* Back Button */}
          <button 
            className="back-button" 
            onClick={() => navigate('/auth')}
            type="button"
          >
            <ArrowLeft size={16} /> Back to Login
          </button>

          <div className="forgot-icon"><ShieldCheck size={32} /></div>

          <h1 className="auth-title">Forgot Password?</h1>
          <p className="auth-subtitle">
            No worries! Enter your email address and we'll send you an OTP to reset your password.
          </p>

          {error && <div className="error-msg">{error}</div>}
          {successMessage && <div className="success-msg">{successMessage}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input 
                type="email"
                className={`form-input ${emailError ? 'input-error' : ''}`} 
                name="email" 
                value={email} 
                onChange={handleChange} 
                placeholder="Enter your registered email"
                required 
              />
              <div className="input-underline"></div>
              {emailError && <div className="error-text">{emailError}</div>}
            </div>

            <button 
              type="submit" 
              className="auth-btn" 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="btn-loading">
                  <span className="spinner"></span>
                  Sending OTP...
                </span>
              ) : (
                'Send OTP'
              )}
            </button>
          </form>

          <p className="toggle-text">
            Remember your password?
            <span className="toggle-link" onClick={() => navigate('/auth')}>
              {' '}Login
            </span>
          </p>

        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
