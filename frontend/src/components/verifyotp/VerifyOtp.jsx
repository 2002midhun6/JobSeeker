import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './VerifyOTP.css'; // Import the CSS file

function VerifyOTP() {
  const [formData, setFormData] = useState({ email: '', otp: '' });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:8000/api/verify-otp/', formData);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid OTP');
    }
  };

  return (
    <div className="verify-otp-container">
      <div className="verify-otp-card">
        <h2 className="verify-otp-title">Verify Your Email</h2>
        
        {error && <div className="error-message">{error}</div>}
        
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
          Didn't receive a code? <a href="#">Resend OTP</a>
        </p>
      </div>
    </div>
  );
}

export default VerifyOTP;