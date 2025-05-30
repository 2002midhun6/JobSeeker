import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './Login.css';
import { AuthContext } from '../../context/AuthContext';
const baseUrl = import.meta.env.VITE_API_URL;
// Spinner Component (copied from ProfessionalDashBoardContent.jsx)
const Spinner = ({ size = 'medium', text = 'Loading...' }) => {
  const spinnerStyles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    },
    spinner: {
      width: size === 'small' ? '20px' : size === 'large' ? '60px' : '40px',
      height: size === 'small' ? '20px' : size === 'large' ? '60px' : '40px',
      border: `${size === 'small' ? '2px' : '3px'} solid #f3f3f3`,
      borderTop: `${size === 'small' ? '2px' : '3px'} solid #007bff`,
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
      marginBottom: '10px',
    },
    text: {
      color: '#666',
      fontSize: size === 'small' ? '12px' : size === 'large' ? '16px' : '14px',
      fontWeight: '500',
    }
  };

  return (
    <div style={spinnerStyles.container}>
      <div style={spinnerStyles.spinner}></div>
      <span style={spinnerStyles.text}>{text}</span>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

function Login() {
  const { dispatch } = useContext(AuthContext);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [forgotPassword, setForgotPassword] = useState(false);
  const [resetData, setResetData] = useState({ email: '', otp: '', new_password: '' });
  const [message, setMessage] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isResendLoading, setIsResendLoading] = useState(false);
  const [isResendDisabled, setIsResendDisabled] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false); // New loading state
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleResetChange = (e) => {
    setResetData({ ...resetData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); // Start spinner
    try {
      setError('');
      setMessage('');
      const response = await axios.post(`${baseUrl}/api/login/`, formData, {
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
    } finally {
      setLoading(false); // Stop spinner
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true); // Start spinner
    try {
      setError('');
      setMessage('');
      const response = await axios.post(`${baseUrl}/api/forgot-password/`, {
        email: resetData.email,
      });
      setMessage(response.data.message);
      setOtpSent(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP');
    } finally {
      setLoading(false); // Stop spinner
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true); // Start spinner
    try {
      setError('');
      setMessage('');
      const response = await axios.post(`${baseUrl}/api/reset-password/`, resetData);
      setMessage(response.data.message);
      setTimeout(() => {
        setForgotPassword(false);
        setResetData({ email: '', otp: '', new_password: '' });
        setOtpSent(false);
        setMessage('');
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setLoading(false); // Stop spinner
    }
  };

  const handleResendOTP = async () => {
    if (isResendDisabled || isResendLoading || !resetData.email) return;
    setIsResendLoading(true); // Start resend spinner
    try {
      setError('');
      setMessage('');
      const response = await axios.post(`${baseUrl}/api/resend-otp/`, {
        email: resetData.email,
      });
      setMessage(response.data.message);
      setIsResendDisabled(true);
      setCooldown(60);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend OTP');
    } finally {
      setIsResendLoading(false); // Stop resend spinner
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
    <div className="login-container">
      <div className="login-card">
        <h2 className="login-title">Welcome Back</h2>
        {error && <div className="error-message">{error}</div>}
        {message && <div className="success-message">{message}</div>}
        {loading && (
          <div style={{ margin: '20px 0' }}>
            <Spinner size="medium" text="Processing..." />
          </div>
        )}

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
                  disabled={loading} // Disable input during loading
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
                  disabled={loading} // Disable input during loading
                />
              </div>
              <button type="submit" className="login-button" disabled={loading}>
                {loading ? 'Signing In...' : 'Sign In'}
              </button>
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
                  disabled={loading} // Disable input during loading
                />
              </div>
              {otpSent && (
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
                      disabled={loading} // Disable input during loading
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
                      disabled={loading} // Disable input during loading
                    />
                  </div>
                </>
              )}
              <button type="submit" className="login-button" disabled={loading}>
                {loading ? 'Processing...' : otpSent ? 'Reset Password' : 'Send OTP'}
              </button>
            </form>
            {otpSent && (
              <p className="resend-otp-link">
                Didn't receive a code?{' '}
                <button
                  onClick={handleResendOTP}
                  className={`resend-link ${isResendDisabled || isResendLoading ? 'disabled' : ''}`}
                  disabled={isResendDisabled || isResendLoading || !resetData.email}
                >
                  {isResendLoading ? (
                    <Spinner size="small" text="Resending..." />
                  ) : isResendDisabled ? (
                    `Resend OTP (${cooldown}s)`
                  ) : (
                    'Resend OTP'
                  )}
                </button>
              </p>
            )}
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