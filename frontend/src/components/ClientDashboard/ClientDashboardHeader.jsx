import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../../context/AuthContext';
import axios from 'axios';
import './ClinetDashboardHeader.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationCircle, faComments } from '@fortawesome/free-solid-svg-icons';
import Notifications from '../Notification/Notification';
const baseUrl = import.meta.env.VITE_API_URL;
function ClientHeader() {
  const { dispatch } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  const handleLogout = async () => {
    try {
      await axios.post(`${baseUrl}/api/logout/`, {}, { withCredentials: true });
      dispatch({ type: 'LOGOUT' });
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${baseUrl}/api/client/transactions/`, {
        withCredentials: true,
      });
      setTransactions(response.data.transactions || []);
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await axios.get(`${baseUrl}/api/conversations/unread-count/`, {
        withCredentials: true,
      });
      setUnreadMessagesCount(response.data.unread_count);
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  };

  useEffect(() => {
    if (location.pathname === '/client-transactions') {
      fetchTransactions();
    }
    
    fetchUnreadCount();
    
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, [location.pathname]);

  return (
    <header className="header">
      <div className="header-container">
        <div className="brand">
          <h1 className="brand-name">JobSeeker</h1>
          <span className="brand-type">CLIENT</span>
        </div>

        <ul className="nav-list">
          <li className={`nav-item ${isActive('/client-dashboard')}`}>
            <Link to="/client-dashboard" className="nav-link">
              <span className="nav-icon">📊</span>
              <span className="nav-text">Dashboard</span>
            </Link>

          </li>
        
          <li className={`nav-item ${isActive('/client-job')}`}>
            <Link to="/client-job" className="nav-link">
              <span className="nav-icon">📝</span>
              <span className="nav-text">POST A JOB</span>
            </Link>
          </li>
          <li className={`nav-item ${isActive('/client-project')}`}>
            <Link to="/client-project" className="nav-link">
              <span className="nav-icon">✓</span>
              <span className="nav-text">MY PROJECT</span>
            </Link>
          </li>
          <li className={`nav-item ${isActive('/client-conversations')}`}>
            <Link to="/client-conversations" className="nav-link">
              <span className="nav-icon">
                <FontAwesomeIcon icon={faComments} />
              </span>
              <span className="nav-text">Messages</span>
              {unreadMessagesCount > 0 && (
                <span className="message-badge">{unreadMessagesCount}</span>
              )}
            </Link>
          </li>
          <li className={`nav-item ${isActive('/client-pending-payments')}`}>
            <Link to="/client-pending-payments" className="nav-link">
              <span className="nav-icon">📊</span>
              <span className="nav-text">Payment</span>
            </Link>
          </li>
          
          <li className={`nav-item ${isActive('/client-transactions')}`}>
            <Link to="/client-transactions" className="nav-link">
              <span className="nav-icon">💸</span>
              <span className="nav-text">Transaction</span>
            </Link>
          </li>
          <li className={`nav-item ${isActive('/Complaint')}`}>
            <Link to="/Complaint" className="nav-link">
              <span className="nav-icon">
                <FontAwesomeIcon icon={faExclamationCircle} />
              </span>
              <span className="nav-text">Complaint</span>
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

export default ClientHeader;