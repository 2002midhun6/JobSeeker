import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import './ClientPaymentPending.css';
const baseUrl = import.meta.env.VITE_API_URL;
// Enhanced Spinner Component
const Spinner = ({ size = 'medium', text = 'Loading...', fullPage = false }) => {
  const spinnerStyles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: fullPage ? '60px 20px' : '20px',
      backgroundColor: fullPage ? 'rgba(255, 255, 255, 0.95)' : 'transparent',
      borderRadius: fullPage ? '12px' : '0',
      ...(fullPage && {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1000,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
        backdropFilter: 'blur(5px)',
      })
    },
    spinner: {
      width: size === 'small' ? '24px' : size === 'large' ? '56px' : '40px',
      height: size === 'small' ? '24px' : size === 'large' ? '56px' : '40px',
      border: `${size === 'small' ? '3px' : '4px'} solid #f3f4f6`,
      borderTop: `${size === 'small' ? '3px' : '4px'} solid #3b82f6`,
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
      marginBottom: '16px',
    },
    text: {
      color: '#6b7280',
      fontSize: size === 'small' ? '14px' : size === 'large' ? '18px' : '16px',
      fontWeight: '600',
      textAlign: 'center',
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

// Enhanced Payment Card Component
const PaymentCard = ({ payment, onPayment, isProcessing, setProcessing }) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount / 100);
  };

  const getPaymentTypeColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'initial':
        return { bg: '#dcfce7', text: '#15803d', badge: '#22c55e' };
      case 'remaining':
        return { bg: '#fef3c7', text: '#d97706', badge: '#f59e0b' };
      default:
        return { bg: '#f1f5f9', text: '#475569', badge: '#64748b' };
    }
  };

  const handlePaymentClick = async () => {
    setProcessing(payment.order_id);
    try {
      await onPayment(payment);
    } finally {
      setProcessing(null);
    }
  };

  const typeColors = getPaymentTypeColor(payment.payment_type);
  const isCurrentlyProcessing = isProcessing === payment.order_id;

  return (
    <li className="payment-card-enhanced">
      {/* Payment Type Badge */}
      <div 
        className="payment-type-badge"
        style={{
          backgroundColor: typeColors.badge,
          color: 'white'
        }}
      >
        {payment.payment_type === 'initial' ? '🟢 Initial' : '🔴 Final'} Payment
      </div>

      {/* Main Content */}
      <div className="payment-header">
        <h4>
          <span className="job-icon">💼</span>
          {payment.job_application?.job_title || 'Unknown Job'}
        </h4>
        <div className="payment-amount">
          {formatCurrency(payment.amount)}
        </div>
      </div>

      {/* Payment Details Grid */}
      <div className="payment-details-grid">
        <div className="detail-item">
          <span className="detail-label">
            <span className="icon">💰</span>
            Amount
          </span>
          <span className="detail-value amount-highlight">
            {formatCurrency(payment.amount)}
          </span>
        </div>

        <div className="detail-item">
          <span className="detail-label">
            <span className="icon">🏷️</span>
            Type
          </span>
          <span 
            className="detail-value payment-type-chip"
            style={{
              backgroundColor: typeColors.bg,
              color: typeColors.text
            }}
          >
            {payment.payment_type}
          </span>
        </div>

        <div className="detail-item">
          <span className="detail-label">
            <span className="icon">🆔</span>
            Order ID
          </span>
          <span className="detail-value order-id">
            {payment.order_id}
          </span>
        </div>

        {payment.job_application?.professional_name && (
          <div className="detail-item">
            <span className="detail-label">
              <span className="icon">👤</span>
              Professional
            </span>
            <span className="detail-value">
              {payment.job_application.professional_name}
            </span>
          </div>
        )}

        {payment.job_application?.client_name && (
          <div className="detail-item">
            <span className="detail-label">
              <span className="icon">🏢</span>
              Client
            </span>
            <span className="detail-value">
              {payment.job_application.client_name}
            </span>
          </div>
        )}

        {payment.job_application?.status && (
          <div className="detail-item">
            <span className="detail-label">
              <span className="icon">📊</span>
              Status
            </span>
            <span className="detail-value status-chip">
              {payment.job_application.status}
            </span>
          </div>
        )}
      </div>

      {/* Description */}
      {payment.description && (
        <div className="payment-description">
          <span className="description-label">
            <span className="icon">📝</span>
            Description
          </span>
          <p>{payment.description}</p>
        </div>
      )}

      {/* Payment Button */}
      <button 
        className={`pay-button ${isCurrentlyProcessing ? 'processing' : ''}`}
        onClick={handlePaymentClick}
        disabled={isCurrentlyProcessing}
      >
        {isCurrentlyProcessing ? (
          <>
            <div className="button-spinner"></div>
            Processing Payment...
          </>
        ) : (
          <>
            <span className="button-icon">💳</span>
            Pay {formatCurrency(payment.amount)}
          </>
        )}
      </button>
    </li>
  );
};

// Enhanced Search and Stats Component
const SearchAndStats = ({ searchQuery, onSearchChange, totalPayments, filteredCount }) => {
  const totalAmount = 0; // You can calculate this from payments if needed

  return (
    <div className="search-and-stats">
      <div className="search-section">
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by job title, professional name, or order ID..."
            value={searchQuery}
            onChange={onSearchChange}
            className="search-input-enhanced"
          />
          {searchQuery && (
            <button 
              className="clear-search"
              onClick={() => onSearchChange({ target: { value: '' } })}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>
      
      <div className="stats-section">
        <div className="stat-item">
          <span className="stat-icon">📊</span>
          <div className="stat-content">
            <span className="stat-value">{totalPayments}</span>
            <span className="stat-label">Total Payments</span>
          </div>
        </div>
        
        {searchQuery && (
          <div className="stat-item filtered">
            <span className="stat-icon">🎯</span>
            <div className="stat-content">
              <span className="stat-value">{filteredCount}</span>
              <span className="stat-label">Found</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Enhanced Pagination Component
const PaginationControls = ({ currentPage, totalItems, itemsPerPage, onPageChange }) => {
  const pageCount = Math.ceil(totalItems / itemsPerPage);
  const pages = [];

  // Generate page numbers
  const startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(pageCount, currentPage + 2);

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  if (pageCount <= 1) return null;

  return (
    <div className="pagination-enhanced">
      <div className="pagination-info">
        Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} payments
      </div>
      
      <div className="pagination-controls">
        <button
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="page-btn"
          title="Previous page"
        >
          ← Previous
        </button>
        
        {startPage > 1 && (
          <>
            <button onClick={() => onPageChange(1)} className="page-btn">1</button>
            {startPage > 2 && <span className="pagination-ellipsis">...</span>}
          </>
        )}
        
        {pages.map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`page-btn ${currentPage === page ? 'active' : ''}`}
          >
            {page}
          </button>
        ))}
        
        {endPage < pageCount && (
          <>
            {endPage < pageCount - 1 && <span className="pagination-ellipsis">...</span>}
            <button onClick={() => onPageChange(pageCount)} className="page-btn">{pageCount}</button>
          </>
        )}
        
        <button
          disabled={currentPage === pageCount}
          onClick={() => onPageChange(currentPage + 1)}
          className="page-btn"
          title="Next page"
        >
          Next →
        </button>
      </div>
    </div>
  );
};

function ClientPendingPayments() {
  const { user, isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [processingPayment, setProcessingPayment] = useState(null);
  const itemsPerPage = 5;

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const response = await axios.get(`${baseUrl}/api/client-pending-payments/`, {
          withCredentials: true,
        });
        console.log('Fetch Pending Payments Response:', response.data);
        const paymentsData = response.data.payments || [];
        setPayments(paymentsData);
        setFilteredPayments(paymentsData);
        setLoading(false);
      } catch (err) {
        console.error('Fetch Error:', {
          message: err.message,
          response: err.response?.data,
          status: err.response?.status,
        });
        const errorMessage = err.response?.data?.error || 'Failed to fetch pending payments';
        setError(errorMessage);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: errorMessage,
          confirmButtonColor: '#dc3545',
        });
        setLoading(false);
      }
    };

    if (!isAuthenticated || !user || user.role !== 'client') {
      navigate('/login');
    } else {
      fetchPayments();
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredPayments(payments);
      setCurrentPage(1);
      return;
    }

    const filtered = payments.filter((payment) => {
      const jobTitle = payment.job_application?.job_title?.toLowerCase() || '';
      const professionalName = payment.job_application?.professional_name?.toLowerCase() || '';
      const orderId = payment.order_id?.toLowerCase() || '';
      const query = searchQuery.toLowerCase();
      
      return jobTitle.includes(query) || 
             professionalName.includes(query) || 
             orderId.includes(query);
    });
    
    setFilteredPayments(filtered);
    setCurrentPage(1);
  }, [searchQuery, payments]);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handlePayment = async (payment) => {
    if (!window.Razorpay) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Payment gateway not loaded. Please refresh the page.',
        confirmButtonColor: '#dc3545',
      });
      return;
    }

    const options = {
      key: payment.key,
      amount: payment.amount,
      currency: payment.currency,
      name: payment.name,
      description: payment.description,
      order_id: payment.order_id,
      handler: async function (response) {
        console.log('Razorpay Payment Response:', response);
        try {
          const payload = {
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
            application_id: payment.job_application?.id || 'unknown',
            payment_type: payment.payment_type,
          };
          console.log('Verification Payload:', payload);

          const verifyResponse = await axios.post(
            `${baseUrl}/api/verify-payment/`,
            payload,
            { withCredentials: true }
          );
          console.log('Verification Response:', verifyResponse.data);

          Swal.fire({
            icon: 'success',
            title: 'Payment Successful! 🎉',
            text: verifyResponse.data.message,
            confirmButtonColor: '#28a745',
            timer: 3000,
            timerProgressBar: true,
          });

          setPayments((prev) => prev.filter((p) => p.order_id !== payment.order_id));
          setFilteredPayments((prev) => prev.filter((p) => p.order_id !== payment.order_id));
        } catch (error) {
          console.error('Payment Verification Error:', {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
          });
          Swal.fire({
            icon: 'error',
            title: 'Verification Error',
            text: error.response?.data?.error || 'Payment verification failed. Please contact support.',
            confirmButtonColor: '#dc3545',
            timer: 5000,
            timerProgressBar: true,
          });
        }
      },
      prefill: {
        email: user?.email || 'client@example.com',
        contact: user?.phone || '9999999999',
      },
      theme: {
        color: '#28a745',
      },
    };

    const razorpay = new window.Razorpay(options);
    razorpay.on('payment.failed', function (response) {
      console.error('Razorpay Payment Failed:', response.error);
      Swal.fire({
        icon: 'error',
        title: 'Payment Failed',
        text: response.error.description || 'Payment could not be processed. Please try again.',
        confirmButtonColor: '#dc3545',
        timer: 5000,
        timerProgressBar: true,
      });
    });
    razorpay.open();
  };

  const paginate = (items, page) => {
    const startIndex = (page - 1) * itemsPerPage;
    return items.slice(startIndex, startIndex + itemsPerPage);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!isAuthenticated || !user) return null;

  return (
    <div className="client-pending-payments">
      {/* Header */}
      <div className="payments-header">
        <h2>
          <span className="header-icon">💳</span>
          Pending Payments
        </h2>
        <p className="header-subtitle">
          Complete your outstanding payments to keep your projects moving forward
        </p>
      </div>

      {/* Search and Stats */}
      <SearchAndStats
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        totalPayments={payments.length}
        filteredCount={filteredPayments.length}
      />

      {/* Error Message */}
      {error && (
        <div className="error-message enhanced">
          <span className="error-icon">⚠️</span>
          <div>
            <strong>Error:</strong> {error}
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="loading-container">
          <Spinner size="large" text="Loading your pending payments..." fullPage={true} />
        </div>
      ) : filteredPayments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            {searchQuery ? '🔍' : '✅'}
          </div>
          <h3>
            {searchQuery ? 'No payments found' : 'All caught up!'}
          </h3>
          <p>
            {searchQuery 
              ? `No pending payments match "${searchQuery}"`
              : 'You have no pending payments at the moment.'
            }
          </p>
          {searchQuery && (
            <button 
              className="clear-search-btn"
              onClick={() => setSearchQuery('')}
            >
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <>
          <ul className="payments-list">
            {paginate(filteredPayments, currentPage).map((payment) => (
              <PaymentCard
                key={payment.order_id}
                payment={payment}
                onPayment={handlePayment}
                isProcessing={processingPayment}
                setProcessing={setProcessingPayment}
              />
            ))}
          </ul>
          
          <PaginationControls
            currentPage={currentPage}
            totalItems={filteredPayments.length}
            itemsPerPage={itemsPerPage}
            onPageChange={handlePageChange}
          />
        </>
      )}

      {/* Back Button */}
      <div className="back-button-container">
        <button 
          onClick={() => navigate('/client-project')}
          className="back-button"
        >
          <span className="back-icon">←</span>
          Back to Projects
        </button>
      </div>
    </div>
  );
}

export default ClientPendingPayments;