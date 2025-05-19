import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import axios from 'axios';
import './ProfessionalDashboardHeader.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationCircle, faComments } from '@fortawesome/free-solid-svg-icons';


function ProfessionalHeader() {
  const { dispatch } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  const handleLogout = async () => {
    try {
      await axios.post('http://localhost:8000/api/logout/', {}, { withCredentials: true });
      dispatch({ type: 'LOGOUT' });
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const isActive = (path) => {
    return location.pathname.startsWith(path) ? 'active' : '';
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/conversations/unread-count/', {
        withCredentials: true,
      });
      setUnreadMessagesCount(response.data.unread_count);
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="header">
      <div className="header-container">
        <div className="brand">
          <h1 className="brand-name">JobSeeker</h1>
          <span className="brand-type">PROFESSIONAL</span>
        </div>

        <ul className="nav-list">
          <li className={`nav-item ${isActive('/professional-dashboard')}`}>
            <Link to="/professional-dashboard" className="nav-link">
              <span className="nav-icon">📊</span>
              <span className="nav-text">Dashboard</span>
            </Link>
          </li>
          <li className={`nav-item ${isActive('/professional-job')}`}>
            <Link to="/professional-job" className="nav-link">
              <span className="nav-icon">📝</span>
              <span className="nav-text">FIND A JOB</span>
            </Link>
          </li>
          <li className={`nav-item ${isActive('/professional-job-applications')}`}>
            <Link to="/professional-job-applications" className="nav-link">
              <span className="nav-icon">✓</span>
              <span className="nav-text">MY PROJECT</span>
            </Link>
          </li>
          
          <li className={`nav-item ${isActive('/professional-conversations')}`}>
            <Link to="/professional-conversations" className="nav-link">
              <span className="nav-icon">
                <FontAwesomeIcon icon={faComments} />
              </span>
              <span className="nav-text">Messages</span>
              {unreadMessagesCount > 0 && (
                <span className="message-badge">{unreadMessagesCount}</span>
              )}
            </Link>
          </li>
          <li className={`nav-item ${isActive('/Professional-profile')}`}>
            <Link to="/Professional-profile" className="nav-link">
              <span className="nav-icon">👤</span>
              <span className="nav-text">PROFILE</span>
            </Link>
          </li>
          <li className={`nav-item ${isActive('/professional/transactions')}`}>
            <Link to="/professional/transactions" className="nav-link">
              <span className="nav-icon">💸</span>
              <span className="nav-text">Transaction</span>
            </Link>
          </li>
          <li className={`nav-item ${isActive('/professional-complaint')}`}>
            <Link to="/professional-complaint" className="nav-link">
              <span className="nav-icon">
                <FontAwesomeIcon icon={faExclamationCircle} />
              </span>
              <span className="nav-text">Complaints</span>
            </Link>
          </li>
        </ul>

        <button onClick={handleLogout} className="logout-btn">
          <span className="btn-icon">🚪</span>
          <span className="btn-text">Logout</span>
        </button>
      </div>
    </header>
  );
}

export default ProfessionalHeader;