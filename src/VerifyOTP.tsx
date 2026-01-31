import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AuthStyles.css';

const VerifyOTPPage: React.FC = () => {
  const navigate = useNavigate();
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [error, setError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [resendTimer, setResendTimer] = useState<number>(60);
  const [canResend, setCanResend] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const email = sessionStorage.getItem('resetEmail');

  useEffect(() => {
    // Redirect if no email in session
    if (!email) {
      navigate('/forgot-password');
      return;
    }

    // Focus first input
    inputRefs.current[0]?.focus();

    // Start countdown timer
    const timer = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [email, navigate]);

  const handleChange = (index: number, value: string) => {
    // Only allow numbers
    if (value && !/^\d+$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1); // Only take last character
    setOtp(newOtp);
    setError('');

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    
    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = [...otp];
    pastedData.split('').forEach((char, index) => {
      if (index < 6) newOtp[index] = char;
    });
    setOtp(newOtp);

    // Focus last filled input or the next empty one
    const focusIndex = Math.min(pastedData.length, 5);
    inputRefs.current[focusIndex]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const otpString = otp.join('');

    if (otpString.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:8000/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email,
          otp: otpString 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.message || 'Invalid OTP');
      }

      // Store reset token for password reset
      sessionStorage.setItem('resetToken', data.resetToken);
      setSuccessMessage('OTP verified successfully!');
      
      setTimeout(() => {
        navigate('/reset-password');
      }, 1000);

    } catch (err: any) {
      setError(err.message);
      // Clear OTP on error
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOTP = async () => {
    if (!canResend) return;

    setCanResend(false);
    setResendTimer(60);
    setError('');

    try {
      const response = await fetch('http://localhost:8000/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.message || 'Failed to resend OTP');
      }

      setSuccessMessage('New OTP sent to your email!');
      setTimeout(() => setSuccessMessage(''), 3000);

      // Restart timer
      const timer = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

    } catch (err: any) {
      setError(err.message);
      setCanResend(true);
    }
  };

  const maskedEmail = email 
    ? email.replace(/(.{2})(.*)(@.*)/, '$1***$3') 
    : '';

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="form-wrapper">

          <button 
            className="back-button" 
            onClick={() => navigate('/forgot-password')}
            type="button"
          >
            ← Back
          </button>

          <div className="forgot-icon">📱</div>

          <h1 className="auth-title">Verify OTP</h1>
          <p className="auth-subtitle">
            Enter the 6-digit code sent to<br />
            <strong>{maskedEmail}</strong>
          </p>

          {error && <div className="error-msg">{error}</div>}
          {successMessage && <div className="success-msg">{successMessage}</div>}

          <form onSubmit={handleSubmit}>
            <div className="otp-container">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => { inputRefs.current[index] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  className={`otp-input ${digit ? 'filled' : ''}`}
                  disabled={isSubmitting}
                />
              ))}
            </div>

            <button 
              type="submit" 
              className="auth-btn" 
              disabled={isSubmitting || otp.some(d => !d)}
            >
              {isSubmitting ? (
                <span className="btn-loading">
                  <span className="spinner"></span>
                  Verifying...
                </span>
              ) : (
                'Verify OTP'
              )}
            </button>
          </form>

          <div className="resend-section">
            <p className="resend-text">
              Didn't receive the code?{' '}
              {canResend ? (
                <span className="resend-link" onClick={handleResendOTP}>
                  Resend OTP
                </span>
              ) : (
                <span className="resend-timer">
                  Resend in {resendTimer}s
                </span>
              )}
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default VerifyOTPPage;
