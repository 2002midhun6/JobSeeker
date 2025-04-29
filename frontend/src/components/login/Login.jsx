import React, { useState, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Login.css';
import { AuthContext } from '../../context/AuthContext';

function Login() {
  const { dispatch } = useContext(AuthContext);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [forgotPassword, setForgotPassword] = useState(false); // Toggle forgot password flow
  const [resetData, setResetData] = useState({ email: '', otp: '', new_password: '' });
  const [message, setMessage] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleResetChange = (e) => {
    setResetData({ ...resetData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:8000/api/login/', formData, {
        withCredentials: true,
      });

      const { role, is_staff } = response.data.user;
      dispatch({
        type: 'LOGIN',
        payload: { user: response.data.user },
      });

      if (is_staff) navigate('/admin-dashboard');
      else if (role === 'client') navigate('/client-dashboard');
      else if (role === 'professional') navigate('/professional-dashboard');
      else navigate('/hellodashboard');

      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:8000/api/forgot-password/', {
        email: resetData.email,
      });
      setMessage(response.data.message);
      setOtpSent(true); // Set this flag when OTP is sent
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:8000/api/reset-password/', resetData);
      setMessage(response.data.message);
      setError('');
      // Reset everything on success
      setTimeout(() => {
        setForgotPassword(false);
        setResetData({ email: '', otp: '', new_password: '' });
        setOtpSent(false);
        setMessage('');
      }, 3000); // Show success message for 3 seconds
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2 className="login-title">Welcome Back</h2>
        {error && <div className="error-message">{error}</div>}
        {message && <div className="success-message">{message}</div>}

        {!forgotPassword ? (
          <>
            <form onSubmit={handleSubmit} className="login-form">
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
                <label htmlFor="password">Password</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  required
                />
              </div>
              <button type="submit" className="login-button">Sign In</button>
            </form>
            <p className="forgot-password-link">
              <a href="#" onClick={() => setForgotPassword(true)}>Forgot Password?</a>
            </p>
            <p className="register-link">
              Don't have an account? <a href="/register">Create Account</a>
            </p>
          </>
        ) : (
          <>
            <h3>Reset Password</h3>
            <form onSubmit={otpSent ? handleResetPassword : handleForgotPassword} className="login-form">
              <div className="form-group">
                <label htmlFor="reset-email">Email</label>
                <input
                  type="email"
                  id="reset-email"
                  name="email"
                  value={resetData.email}
                  onChange={handleResetChange}
                  placeholder="Enter your email"
                  required
                />
              </div>
              {otpSent &&  (
                <>
                  <div className="form-group">
                    <label htmlFor="otp">OTP</label>
                    <input
                      type="text"
                      id="otp"
                      name="otp"
                      value={resetData.otp}
                      onChange={handleResetChange}
                      placeholder="Enter OTP"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="new_password">New Password</label>
                    <input
                      type="password"
                      id="new_password"
                      name="new_password"
                      value={resetData.new_password}
                      onChange={handleResetChange}
                      placeholder="Enter new password"
                      required
                    />
                  </div>
                </>
              )}
              <button type="submit" className="login-button">
                {resetData.otp ? 'Reset Password' : 'Send OTP'}
              </button>
            </form>
            <p className="back-to-login">
              <a href="#" onClick={() => setForgotPassword(false)}>Back to Login</a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default Login;