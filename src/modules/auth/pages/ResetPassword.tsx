import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AuthStyles.css';

interface PasswordStrength {
  score: number;
  label: string;
  color: string;
}

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    score: 0,
    label: '',
    color: ''
  });

  const email = sessionStorage.getItem('resetEmail');
  const resetToken = sessionStorage.getItem('resetToken');

  useEffect(() => {
    if (!email || !resetToken) {
      navigate('/forgot-password');
    }
  }, [email, resetToken, navigate]);

  const calculatePasswordStrength = (pwd: string): PasswordStrength => {
    let score = 0;
    
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
    if (/\d/.test(pwd)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(pwd)) score++;

    if (score <= 1) return { score, label: 'Weak', color: '#ef4444' };
    if (score <= 2) return { score, label: 'Fair', color: '#f97316' };
    if (score <= 3) return { score, label: 'Good', color: '#eab308' };
    if (score <= 4) return { score, label: 'Strong', color: '#22c55e' };
    return { score, label: 'Very Strong', color: '#15803d' };
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    setPasswordStrength(calculatePasswordStrength(newPassword));
    setError('');
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value);
    setError('');
  };

  const validatePassword = (): boolean => {
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    if (passwordStrength.score < 2) {
      setError('Please choose a stronger password');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (!validatePassword()) {
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:8000/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email,
          resetToken,
          newPassword: password 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.message || 'Failed to reset password');
      }

      setSuccessMessage('Password reset successfully!');
      
      // Clear session storage
      sessionStorage.removeItem('resetEmail');
      sessionStorage.removeItem('resetToken');

      setTimeout(() => {
        navigate('/auth');
      }, 2000);

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

          <div className="forgot-icon">🔑</div>

          <h1 className="auth-title">Reset Password</h1>
          <p className="auth-subtitle">
            Create a new strong password for your account
          </p>

          {error && <div className="error-msg">{error}</div>}
          {successMessage && <div className="success-msg">{successMessage}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <div className="password-input-wrapper">
                <input 
                  type={showPassword ? 'text' : 'password'}
                  className="form-input" 
                  value={password} 
                  onChange={handlePasswordChange}
                  placeholder="Enter new password"
                  required 
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              <div className="input-underline"></div>
              
              {/* Password Strength Indicator */}
              {password && (
                <div className="password-strength">
                  <div className="strength-bars">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className={`strength-bar ${passwordStrength.score >= level ? 'active' : ''}`}
                        style={{ 
                          backgroundColor: passwordStrength.score >= level 
                            ? passwordStrength.color 
                            : '#e5e7eb' 
                        }}
                      />
                    ))}
                  </div>
                  <span 
                    className="strength-label"
                    style={{ color: passwordStrength.color }}
                  >
                    {passwordStrength.label}
                  </span>
                </div>
              )}

              {/* Password Requirements */}
              <div className="password-requirements">
                <p className={`requirement ${password.length >= 8 ? 'met' : ''}`}>
                  {password.length >= 8 ? '✓' : '○'} At least 8 characters
                </p>
                <p className={`requirement ${/[A-Z]/.test(password) && /[a-z]/.test(password) ? 'met' : ''}`}>
                  {/[A-Z]/.test(password) && /[a-z]/.test(password) ? '✓' : '○'} Upper & lowercase letters
                </p>
                <p className={`requirement ${/\d/.test(password) ? 'met' : ''}`}>
                  {/\d/.test(password) ? '✓' : '○'} At least one number
                </p>
                <p className={`requirement ${/[!@#$%^&*(),.?":{}|<>]/.test(password) ? 'met' : ''}`}>
                  {/[!@#$%^&*(),.?":{}|<>]/.test(password) ? '✓' : '○'} Special character
                </p>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <div className="password-input-wrapper">
                <input 
                  type={showConfirmPassword ? 'text' : 'password'}
                  className={`form-input ${confirmPassword && password !== confirmPassword ? 'input-error' : ''}`}
                  value={confirmPassword} 
                  onChange={handleConfirmPasswordChange}
                  placeholder="Confirm new password"
                  required 
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              <div className="input-underline"></div>
              {confirmPassword && password !== confirmPassword && (
                <div className="error-text">Passwords do not match</div>
              )}
              {confirmPassword && password === confirmPassword && confirmPassword.length > 0 && (
                <div className="success-text">✓ Passwords match</div>
              )}
            </div>

            <button 
              type="submit" 
              className="auth-btn" 
              disabled={isSubmitting || !password || !confirmPassword}
            >
              {isSubmitting ? (
                <span className="btn-loading">
                  <span className="spinner"></span>
                  Resetting Password...
                </span>
              ) : (
                'Reset Password'
              )}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
