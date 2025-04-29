import React, { useState, useEffect, useCallback, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import Swal from 'sweetalert2';
import './AdminVerification.css';

// Separate modal component to prevent re-renders of the parent
const DenialReasonModal = React.memo(({ 
  showModal, 
  denialReason, 
  onReasonChange, 
  onSubmit, 
  onCancel 
}) => {
  const inputRef = React.useRef(null);

  useEffect(() => {
    if (showModal && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showModal]);

  return (
    <div className="modal-overlay" style={{ display: showModal ? 'flex' : 'none' }}>
      <div className="denial-modal">
        <h3>Provide Reason for Denial</h3>
        <input
          ref={inputRef}
          type="text"
          className="denial-reason-input"
          placeholder="Reason for denial"
          value={denialReason}
          onChange={onReasonChange}
          dir="ltr"
        />
        <div className="modal-buttons">
          <button className="btn cancel-btn" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn deny-btn" onClick={onSubmit}>
            Submit Denial
          </button>
        </div>
      </div>
    </div>
  );
});

// Separate pagination component to prevent re-renders
const PaginationControls = React.memo(({ currentPage, pageCount, onPageChange }) => {
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1);

  return (
    <div className="pagination">
      <button
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        className="page-btn"
      >
        Previous
      </button>
      {pages.map((page) => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`page-btn ${currentPage === page ? 'active' : ''}`}
        >
          {page}
        </button>
      ))}
      <button
        disabled={currentPage === pageCount}
        onClick={() => onPageChange(currentPage + 1)}
        className="page-btn"
      >
        Next
      </button>
    </div>
  );
});

// The verification request item component
const VerificationItem = React.memo(({ request, onVerify, onDenyClick }) => {
  return (
    <li className="verification-item">
      <div className="professional-info">
        <h3><strong>Name:</strong> {request.user?.name}</h3>
        <p><strong>Bio:</strong> {request.bio || 'No bio available'}</p>
        <p><strong>Skills:</strong> {request.skills?.join(', ') || 'None listed'}</p>
        <p><strong>Experience:</strong> {request.experience_years} years</p>
        <p><strong>Status:</strong> {request.verify_status}</p>
        {request.verify_doc ? (
          <a
            href={`http://localhost:8000${request.verify_doc}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            View Verification Document
          </a>
        ) : (
          <p>No document uploaded</p>
        )}
      </div>
      <div className="action-buttons">
        <button
          onClick={() => onVerify(request.user.id)}
          className="verify-btn"
        >
          Verify
        </button>
        <button
          onClick={() => onDenyClick(request.user.id)}
          className="deny-btn"
        >
          Deny
        </button>
      </div>
    </li>
  );
});

function AdminProfessionalVerification() {
  const authContext = useContext(AuthContext);
  const navigate = useNavigate();
  const { user, isAuthenticated } = authContext || { user: null, isAuthenticated: false };

  const [requests, setRequests] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState(null);
  const [denialReason, setDenialReason] = useState('');
  const [showDenialModal, setShowDenialModal] = useState(false);
  const itemsPerPage = 6;

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const response = await axios.get('http://localhost:8000/api/admin/verification-requests/', {
          withCredentials: true,
        });
        setRequests(response.data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching requests:', err);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err.response?.data?.error || 'Failed to fetch verification requests',
          confirmButtonColor: '#dc3545',
        });
        setLoading(false);
      }
    };

    fetchRequests();
  }, [navigate]);

  const handleVerify = useCallback((professionalId) => {
    handleAction(professionalId, 'verify');
  }, []);

  const handleDenyClick = useCallback((professionalId) => {
    setSelectedProfessionalId(professionalId);
    setDenialReason('');
    setShowDenialModal(true);
  }, []);

  const handleDenySubmit = useCallback(() => {
    if (!denialReason.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Required',
        text: 'Please provide a reason for denial',
        confirmButtonColor: '#dc3545',
      });
      return;
    }
    handleAction(selectedProfessionalId, 'deny', denialReason);
    setShowDenialModal(false);
  }, [denialReason, selectedProfessionalId]);

  const handleAction = async (professionalId, action, reason = null) => {
    setActionLoading(true);
    try {
      const requestData = { action };
      if (reason) requestData.denial_reason = reason;
      
      const response = await axios.post(
        `http://localhost:8000/api/admin/verify-professional/${professionalId}/`,
        requestData,
        { withCredentials: true }
      );
      
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: response.data.message || `Professional ${action === 'verify' ? 'verified' : 'denied'} successfully`,
        confirmButtonColor: '#28a745',
        timer: 2000,
        timerProgressBar: true,
      });
      
      setRequests((prev) => prev.filter((req) => req.user.id !== professionalId));
    } catch (err) {
      console.error('Request failed:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.response?.data?.error || 'Failed to process request',
        confirmButtonColor: '#dc3545',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDenialReasonChange = useCallback((e) => {
    setDenialReason(e.target.value);
  }, []);

  const handleModalCancel = useCallback(() => {
    setShowDenialModal(false);
  }, []);

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
  }, []);

  const paginate = (items, page) => {
    const startIndex = (page - 1) * itemsPerPage;
    return items.slice(startIndex, startIndex + itemsPerPage);
  };

  const getPageCount = (items) => Math.ceil(items.length / itemsPerPage);
  const pageCount = getPageCount(requests);

  if (loading) {
    return (
      <div className="spinner-container">
        <div className="spinner"></div>
        <p>Loading verification requests...</p>
      </div>
    );
  }

  const paginatedRequests = paginate(requests, currentPage);

  return (
    <>
      {actionLoading && (
        <div className="spinner-overlay">
          <div className="spinner"></div>
        </div>
      )}
      
      <DenialReasonModal 
        showModal={showDenialModal}
        denialReason={denialReason}
        onReasonChange={handleDenialReasonChange}
        onSubmit={handleDenySubmit}
        onCancel={handleModalCancel}
      />
      
      <div className="admin-verification-container">
        <h2 style={{ color: 'white' }}>Professional Verification Requests</h2>
        {requests.length === 0 ? (
          <p>No pending verification requests.</p>
        ) : (
          <>
            <ul className="verification-list">
              {paginatedRequests.map((req) => (
                <VerificationItem 
                  key={req.user?.id} 
                  request={req} 
                  onVerify={handleVerify}
                  onDenyClick={handleDenyClick}
                />
              ))}
            </ul>
            <PaginationControls 
              currentPage={currentPage}
              pageCount={pageCount}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </div>
    </>
  );
}

export default AdminProfessionalVerification;