import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext'; // Adjust path
import axios from 'axios';
import './AdminHeaderComp.css'

function AdminHeaderComp() {
  const { dispatch } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await axios.post('http://localhost:8000/api/logout/', {}, { withCredentials: true });
      dispatch({ type: 'LOGOUT' });
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  // Function to check if a link is active
  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  return (
    <header className="admin-header">
      <div className="admin-header-container">
        <div className="admin-logo">
          <h1>JobSeeker</h1>
          <span>Admin Panel</span>
        </div>
        
        <nav className="admin-nav">
          <ul>
            <li className={isActive('/admin-dashboard')}>
              <Link to="/admin-dashboard">
                <span className="icon">📊</span>
                <span className="text">Dashboard</span>
              </Link>
            </li>
            <li className={isActive('/admin-user')}>
              <Link to="/admin-user">
                <span className="icon">👥</span>
                <span className="text">Users</span>
              </Link>
            </li>
            <li className={isActive('/admin-professional-verification')}>
              <Link to="/admin-professional-verification">
                <span className="icon">✓</span>
                <span className="text">Verification</span>
              </Link>
            </li>
            <li className={isActive('/admin_user_job')}>
              <Link to="/admin_user_job">
                
                <span className="text">Jobs</span>
              </Link>
            </li>
            <li className={isActive('/admin_user_complaints')}>
              <Link to="/admin_user_complaints">
                <span className="icon">🔔</span>
                <span className="text">Complaints</span>
              </Link>
            </li>
          </ul>
        </nav>
        
        <div className="admin-logout">
          <button onClick={handleLogout} className="logout-button">
            <span className="icon">🚪</span>
            <span className="text">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}

export default AdminHeaderComp;