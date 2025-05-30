import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './VerifyOtp.css';
const baseUrl = import.meta.env.VITE_API_URL;
function VerifyOTP() {
  const [formData, setFormData] = useState({ email: '', otp: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isResendDisabled, setIsResendDisabled] = useState(false);
  const [isResendLoading, setIsResendLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setSuccess('');
      await axios.post(`${baseUrl}/api/verify-otp/`, formData, {
        withCredentials: true,
      });
      setSuccess('Email verified successfully!');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid OTP');
    }
  };

  const handleResendOTP = async () => {
    if (isResendDisabled || isResendLoading || !formData.email) return;
    try {
      setError('');
      setSuccess('');
      setIsResendLoading(true);
      const response = await axios.post(`${baseUrl}/api/resend-otp/`, { email: formData.email }, {
        withCredentials: true,
      });
      setSuccess(response.data.message);
      setIsResendDisabled(true);
      setCooldown(60);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend OTP');
    } finally {
      setIsResendLoading(false);
    }
  };

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            setIsResendDisabled(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  return (
    <div className="verify-otp-container">
      <div className="verify-otp-card">
        <h2 className="verify-otp-title">Verify Your Email</h2>
        
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
        
        <p className="otp-description">
          Please enter the verification code sent to your email address.
        </p>
        
        <form onSubmit={handleSubmit} className="verify-otp-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="otp">OTP Code</label>
            <input
              type="text"
              id="otp"
              name="otp"
              value={formData.otp}
              onChange={handleChange}
              placeholder="Enter the OTP sent to your email"
              className="otp-input"
              required
            />
          </div>
          
          <button
            type="submit"
            className="verify-button"
          >
            Verify
          </button>
        </form>
        
        <p className="login-link">
          Didn't receive a code?{' '}
          <button
            onClick={handleResendOTP}
            className={`resend-link ${isResendDisabled || isResendLoading ? 'disabled' : ''}`}
            disabled={isResendDisabled || isResendLoading || !formData.email}
          >
            {isResendLoading ? 'Resending...' : isResendDisabled ? `Resend OTP (${cooldown}s)` : 'Resend OTP'}
          </button>
        </p>
      </div>
    </div>
  );
}

export default VerifyOTP;