import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import './ClientPaymentPending.css';

function ClientPendingPayments() {
  const { user, isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [filteredPayments, setFilteredPayments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5; // Number of payments per page

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const response = await axios.get('http://localhost:8000/api/client-pending-payments/', {
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
      setCurrentPage(1); // Reset page on search
      return;
    }

    const filtered = payments.filter((payment) =>
      payment.job_application?.job_title?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredPayments(filtered);
    setCurrentPage(1); // Reset page on search
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
            application_id: payment.job_application?.id || 'unknown', // Updated to use nested id
            payment_type: payment.payment_type,
          };
          console.log('Verification Payload:', payload);

          const verifyResponse = await axios.post(
            'http://localhost:8000/api/verify-payment/',
            payload,
            { withCredentials: true }
          );
          console.log('Verification Response:', verifyResponse.data);

          Swal.fire({
            icon: 'success',
            title: 'Success',
            text: verifyResponse.data.message,
            confirmButtonColor: '#28a745',
            timer: 3000,
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
      });
    });
    razorpay.open();
  };

  const paginate = (items, page) => {
    const startIndex = (page - 1) * itemsPerPage;
    return items.slice(startIndex, startIndex + itemsPerPage);
  };

  const getPageCount = (items) => Math.ceil(items.length / itemsPerPage);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const PaginationControls = ({ totalItems }) => {
    const pageCount = getPageCount(totalItems);
    const pages = [];

    for (let i = 1; i <= pageCount; i++) {
      pages.push(i);
    }

    return (
      <div className="pagination">
        <button
          disabled={currentPage === 1}
          onClick={() => handlePageChange(currentPage - 1)}
          className="page-btn"
        >
          Previous
        </button>
        {pages.map((page) => (
          <button
            key={page}
            onClick={() => handlePageChange(page)}
            className={`page-btn ${currentPage === page ? 'active' : ''}`}
          >
            {page}
          </button>
        ))}
        <button
          disabled={currentPage === pageCount}
          onClick={() => handlePageChange(currentPage + 1)}
          className="page-btn"
        >
          Next
        </button>
      </div>
    );
  };

  if (!isAuthenticated || !user) return null;

  return (
    <div className="client-pending-payments">
      <h2>Pending Payments</h2>
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search by job title..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="search-input"
        />
      </div>
      {error && <div className="error-message">{error}</div>}
      {loading ? (
        <p>Loading payments...</p>
      ) : filteredPayments.length === 0 ? (
        <p>No pending payments found.</p>
      ) : (
        <>
          <ul>
            {paginate(filteredPayments, currentPage).map((payment) => (
              <li key={payment.order_id}>
                <h4>Job: {payment.job_application?.job_title || 'Unknown Job'}</h4>
                <p>Amount: ₹{(payment.amount / 100).toFixed(2)}</p>
                <p>Payment Type: {payment.payment_type}</p>
                <button onClick={() => handlePayment(payment)}>Pay Now</button>
              </li>
            ))}
          </ul>
          <PaginationControls totalItems={filteredPayments} />
        </>
      )}
      <button onClick={() => navigate('/client-project')}>Back to Projects</button>
    </div>
  );
}

export default ClientPendingPayments;