import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../../context/AuthContext'; // Adjust path
import axios from 'axios';
import './ClinetDashboardHeader.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationCircle } from '@fortawesome/free-solid-svg-icons';

function ClientHeader() {
  const { dispatch } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);

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

  // Fetch transaction history
  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const response = await axios.get('http://localhost:8000/api/client/transactions/', {
        withCredentials: true,
      });
      setTransactions(response.data.transactions || []);
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch transactions when component mounts or when navigating to transaction page
  useEffect(() => {
    if (location.pathname === '/client-transactions') {
      fetchTransactions();
    }
  }, [location.pathname]);

  return (
    <header className="header">
      <div className="header-container">
        <div className="brand">
          <h1 className="brand-name">JobSeeker</h1>
          <span className="brand-type">CLIENT</span>
        </div>
       
        <nav className="navigation">
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
            <li className={`nav-item ${isActive('/client-pending-payments')}`}>
              <Link to="/client-pending-payments" className="nav-link">
                <span className="nav-icon">📊</span>
                <span className="nav-text">Pending Payment</span>
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
        </nav>
        
        <div className="user-actions">
          <button onClick={handleLogout} className="logout-btn">
            <span className="btn-icon">🚪</span>
            <span className="btn-text">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}

export default ClientHeader;