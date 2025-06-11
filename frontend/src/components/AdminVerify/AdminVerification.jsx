import React, { useState, useEffect, useCallback, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import Swal from 'sweetalert2';
import './AdminVerification.css';

const baseUrl = import.meta.env.VITE_API_URL;

// Enhanced Spinner Component
const AdminVerificationSpinner = ({ text = 'Loading...' }) => (
  <div className="admin-verification-spinner-container">
    <div className="admin-verification-loading-spinner"></div>
    <p className="admin-verification-spinner-text">{text}</p>
  </div>
);

// Verification Statistics Component
const VerificationStats = ({ requests, filteredRequests }) => {
  const stats = {
    total: requests.length,
    pending: requests.filter(req => req.verify_status === 'Pending').length,
    filtered: filteredRequests.length,
    totalSkills: [...new Set(requests.flatMap(req => req.skills || []))].length
  };

  return (
    <div className="verification-stats">
      <div className="verification-stat-item">
        <h4>Total Requests</h4>
        <p>{stats.total}</p>
      </div>
      <div className="verification-stat-item">
        <h4>Pending Reviews</h4>
        <p>{stats.pending}</p>
      </div>
      <div className="verification-stat-item">
        <h4>Filtered Results</h4>
        <p>{stats.filtered}</p>
      </div>
      <div className="verification-stat-item">
        <h4>Unique Skills</h4>
        <p>{stats.totalSkills}</p>
      </div>
    </div>
  );
};

// Enhanced Denial Reason Modal
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

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && denialReason.trim()) {
      onSubmit();
    } else if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div className="modal-overlay" style={{ display: showModal ? 'flex' : 'none' }}>
      <div className="denial-modal">
        <h3>Provide Reason for Denial</h3>
        <input
          ref={inputRef}
          type="text"
          className="denial-reason-input"
          placeholder="Enter specific reason for denial (e.g., Invalid document, Insufficient information)"
          value={denialReason}
          onChange={onReasonChange}
          onKeyDown={handleKeyPress}
          dir="ltr"
        />
        <div className="modal-buttons">
          <button className="btn cancel-btn" onClick={onCancel}>
            Cancel
          </button>
          <button 
            className="btn deny-btn" 
            onClick={onSubmit}
            disabled={!denialReason.trim()}
          >
            Submit Denial
          </button>
        </div>
      </div>
    </div>
  );
});

// Enhanced Pagination Component
const PaginationControls = React.memo(({ currentPage, totalItems, itemsPerPage, onPageChange }) => {
  const pageCount = Math.ceil(totalItems.length / itemsPerPage);
  
  if (pageCount <= 1) return null;

  const maxVisiblePages = 5;
  const pages = [];
  
  // Calculate which pages to show
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(pageCount, startPage + maxVisiblePages - 1);
  
  // Adjust start page if we're near the end
  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  // Add page numbers
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, totalItems.length);

  return (
    <div style={{ marginTop: '32px' }}>
      {/* Pagination Info */}
      <div style={{
        textAlign: 'center',
        marginBottom: '16px',
        color: '#6b7280',
        fontSize: '14px',
        fontWeight: '500'
      }}>
        Showing {startIndex} to {endIndex} of {totalItems.length} verification requests
      </div>

      {/* Pagination Controls */}
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
    </div>
  );
});

// Updated VerificationDocument component from document 1
const VerificationDocument = ({ request }) => {
  // Extract document information from the request - Updated for Cloudinary
  const getDocumentInfo = () => {
    console.log('Processing document info for request:', request); // Debug log
    
    // Check for the new Cloudinary format first
    if (request.verify_doc_url) {
      return {
        url: request.verify_doc_url,
        filename: request.verify_doc_filename || 'verification_document',
        hasDocument: true
      };
    }
    
    // Legacy support for other formats
    if (request.verify_doc) {
      // If it's a URL string (Cloudinary URL)
      if (typeof request.verify_doc === 'string') {
        const url = request.verify_doc.startsWith('http') 
          ? request.verify_doc 
          : `${baseUrl}${request.verify_doc.startsWith('/') ? '' : '/'}${request.verify_doc}`;
        
        const filename = request.verify_doc.includes('/') 
          ? decodeURIComponent(request.verify_doc.split('/').pop().split('?')[0]) 
          : 'verification_document';
        
        return {
          url,
          filename,
          hasDocument: true
        };
      }
      
      // If it's an object with URL property
      if (typeof request.verify_doc === 'object' && request.verify_doc.url) {
        return {
          url: request.verify_doc.url,
          filename: request.verify_doc.filename || request.verify_doc_filename || 'verification_document',
          hasDocument: true
        };
      }
    }
    
    console.log('No document found for request:', request.user?.email); // Debug log
    return {
      url: null,
      filename: null,
      hasDocument: false
    };
  };

  const getFileIcon = (filename) => {
    if (!filename) return '📄';
    
    const extension = filename.toLowerCase().split('.').pop();
    switch (extension) {
      case 'pdf': return '📄';
      case 'doc':
      case 'docx': return '📝';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif': return '🖼️';
      case 'xls':
      case 'xlsx': return '📊';
      default: return '📄';
    }
  };

  const documentInfo = getDocumentInfo();

  if (!documentInfo.hasDocument) {
    return (
      <div style={{ 
        color: '#ef4444', 
        fontWeight: '600',
        background: 'linear-gradient(135deg, #fee2e2, #fecaca)',
        padding: '12px 16px',
        borderRadius: '8px',
        border: '1px solid #fca5a5',
        marginTop: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <span style={{ fontSize: '18px' }}>⚠️</span>
        <span>No verification document uploaded</span>
      </div>
    );
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, #f0f9ff, #e0f2fe)',
      padding: '12px 16px',
      borderRadius: '8px',
      border: '1px solid #7dd3fc',
      marginTop: '12px'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '8px'
      }}>
        <span style={{ fontSize: '20px' }}>
          {getFileIcon(documentInfo.filename)}
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ 
            fontWeight: '600',
            color: '#0369a1',
            fontSize: '14px',
            marginBottom: '2px'
          }}>
            {documentInfo.filename}
          </div>
          <div style={{
            fontSize: '12px',
            color: '#6b7280'
          }}>
            Stored securely in Cloudinary
          </div>
        </div>
      </div>
      
      {/* Debug info for development */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          fontSize: '10px',
          color: '#666',
          marginBottom: '8px',
          wordBreak: 'break-all',
          background: '#f3f4f6',
          padding: '4px',
          borderRadius: '4px'
        }}>
          URL: {documentInfo.url}
        </div>
      )}
      
      <a
        href={documentInfo.url}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 12px',
          background: '#0369a1',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '6px',
          fontSize: '13px',
          fontWeight: '500',
          transition: 'all 0.2s ease',
          border: 'none',
          cursor: 'pointer'
        }}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = '#075985';
          e.target.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = '#0369a1';
          e.target.style.transform = 'translateY(0)';
        }}
        onClick={(e) => {
          e.stopPropagation();
          console.log('Opening verification document:', documentInfo.url);
          
          // Optional: Show loading indicator
          const originalText = e.target.innerHTML;
          e.target.innerHTML = '<span>🔄</span> Opening...';
          setTimeout(() => {
            e.target.innerHTML = originalText;
          }, 1000);
        }}
      >
        <span>📎</span>
        View Verification Document
      </a>
    </div>
  );
};

// Updated VerificationItem component from document 2
const VerificationItem = React.memo(({ request, onVerify, onDenyClick }) => {
  const renderSkills = () => {
    if (!request.skills || request.skills.length === 0) return null;
    
    return (
      <div className="skills-display">
        {request.skills.slice(0, 6).map((skill, index) => (
          <span key={index} className="skill-tag">{skill}</span>
        ))}
        {request.skills.length > 6 && (
          <span className="skill-tag">+{request.skills.length - 6} more</span>
        )}
      </div>
    );
  };

  const getStatusBadge = (status) => (
    <span className={`status-badge status-${status.toLowerCase().replace(' ', '-')}`}>
      {status}
    </span>
  );

  // Updated document check for Cloudinary
  const hasDocument = Boolean(
    request.verify_doc_url || 
    (request.verify_doc && typeof request.verify_doc === 'string' && request.verify_doc.trim()) ||
    (request.verify_doc && typeof request.verify_doc === 'object' && request.verify_doc.url)
  );

  // Debug log
  console.log(`Document check for ${request.user?.email}:`, {
    verify_doc_url: request.verify_doc_url,
    verify_doc: request.verify_doc,
    hasDocument
  });

  return (
    <li className="verification-item">
      <div className="professional-info">
        <h3>
          <strong>Name:</strong> {request.user?.name || 'Unknown'}
        </h3>
        
        <p>
          <strong>Email:</strong> {request.user?.email || 'Not provided'}
        </p>
        
        <p>
          <strong>Bio:</strong> {request.bio || 'No bio available'}
        </p>
        
        <p>
          <strong>Skills:</strong> 
          {request.skills && request.skills.length > 0 ? (
            <>
              <span style={{ marginLeft: '8px' }}>
                {request.skills.slice(0, 3).join(', ')}
                {request.skills.length > 3 ? '...' : ''}
              </span>
              {renderSkills()}
            </>
          ) : (
            ' None listed'
          )}
        </p>
        
        <p>
          <strong>Experience:</strong> {request.experience_years || 0} years
        </p>
        
        <p>
          <strong>Status:</strong> 
          {getStatusBadge(request.verify_status || 'Pending')}
        </p>

        {/* Show denial reason if exists */}
        {request.verify_status === 'Not Verified' && request.denial_reason && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            padding: '12px',
            marginTop: '8px'
          }}>
            <p style={{ 
              margin: '0',
              color: '#dc2626',
              fontWeight: '600',
              fontSize: '14px'
            }}>
              <strong>Previous Denial Reason:</strong> {request.denial_reason}
            </p>
          </div>
        )}

        {/* Show portfolio links if available */}
        {request.portfolio_links && request.portfolio_links.length > 0 && (
          <div style={{ marginTop: '8px' }}>
            <p><strong>Portfolio Links:</strong></p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
              {request.portfolio_links.slice(0, 3).map((link, index) => (
                <a
                  key={index}
                  href={link.startsWith('http') ? link : `https://${link}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: '12px',
                    color: '#3b82f6',
                    textDecoration: 'none',
                    padding: '2px 6px',
                    background: '#eff6ff',
                    borderRadius: '4px',
                    border: '1px solid #dbeafe'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#dbeafe'}
                  onMouseLeave={(e) => e.target.style.background = '#eff6ff'}
                >
                  🔗 {link.length > 30 ? link.substring(0, 30) + '...' : link}
                </a>
              ))}
              {request.portfolio_links.length > 3 && (
                <span style={{ fontSize: '12px', color: '#6b7280' }}>
                  +{request.portfolio_links.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}
        
        {/* Enhanced Verification Document Display */}
        <VerificationDocument request={request} />
      </div>
      
      <div className="action-buttons">
        <button
          onClick={() => onVerify(request.user.id)}
          className="verify-btn"
          disabled={!hasDocument}
          title={!hasDocument ? 'Cannot verify without document' : 'Approve this professional'}
          style={{
            opacity: !hasDocument ? 0.6 : 1,
            cursor: !hasDocument ? 'not-allowed' : 'pointer'
          }}
        >
          {!hasDocument ? (
            <>
              <span>⚠️</span>
              Cannot Verify
            </>
          ) : (
            <>
              <span>✅</span>
              Verify Professional
            </>
          )}
        </button>
        <button
          onClick={() => onDenyClick(request.user.id)}
          className="deny-btn"
          title="Deny this verification request"
        >
          <span>❌</span>
          Deny Request
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
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState(null);
  const [denialReason, setDenialReason] = useState('');
  const [showDenialModal, setShowDenialModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await axios.get(`${baseUrl}/api/admin/verification-requests/`, {
          withCredentials: true,
        });
        console.log('Fetched verification requests:', response.data); // Debug log
        setRequests(response.data || []);
        setFilteredRequests(response.data || []);
      } catch (err) {
        console.error('Error fetching requests:', err);
        const errorMessage = err.response?.data?.error || 'Failed to fetch verification requests';
        setError(errorMessage);
        
        if (err.response?.status !== 401) {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: errorMessage,
            confirmButtonColor: '#dc3545',
          });
        }
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated && user) {
      fetchRequests();
    }
  }, [isAuthenticated, user, navigate]);

  // Handle search functionality
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredRequests(requests);
      setCurrentPage(1);
      return;
    }

    const filtered = requests.filter(request =>
      request.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.bio?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.skills?.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    setFilteredRequests(filtered);
    setCurrentPage(1);
  }, [searchQuery, requests]);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

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
        title: 'Required Field',
        text: 'Please provide a specific reason for denial',
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
        `${baseUrl}/api/admin/verify-professional/${professionalId}/`,
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
      
      // Remove the processed request from the list
      const updatedRequests = requests.filter((req) => req.user.id !== professionalId);
      setRequests(updatedRequests);
      
      // Reset to page 1 if current page becomes empty
      const newPageCount = Math.ceil(updatedRequests.length / itemsPerPage);
      if (currentPage > newPageCount && newPageCount > 0) {
        setCurrentPage(newPageCount);
      }
      
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
    setDenialReason('');
    setSelectedProfessionalId(null);
  }, []);

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const paginate = (items, page) => {
    const startIndex = (page - 1) * itemsPerPage;
    return items.slice(startIndex, startIndex + itemsPerPage);
  };

  if (loading) {
    return <AdminVerificationSpinner text="Loading verification requests..." />;
  }

  const paginatedRequests = paginate(filteredRequests, currentPage);

  return (
    <>
      {/* Loading Overlay */}
      {actionLoading && (
        <div className="loading-overlay">
          <AdminVerificationSpinner text="Processing verification..." />
        </div>
      )}
      
      {/* Denial Reason Modal */}
      <DenialReasonModal 
        showModal={showDenialModal}
        denialReason={denialReason}
        onReasonChange={handleDenialReasonChange}
        onSubmit={handleDenySubmit}
        onCancel={handleModalCancel}
      />
      
      <div className="admin-verification-container">
        <h2>Professional Verification Requests</h2>
        
        {/* Verification Statistics */}
        {!error && <VerificationStats requests={requests} filteredRequests={filteredRequests} />}
        
        {/* Search Bar */}
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search by name, email, bio, or skills..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="search-input"
          />
        </div>
        
        {/* Error Message */}
        {error && <div className="error-message">{error}</div>}
        
        {/* Main Content */}
        {filteredRequests.length === 0 ? (
          <div className="empty-state">
            {searchQuery 
              ? 'No verification requests found matching your search.' 
              : 'No pending verification requests at this time.'}
          </div>
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
            
            {/* Pagination */}
            <PaginationControls 
              currentPage={currentPage}
              totalItems={filteredRequests}
              itemsPerPage={itemsPerPage}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </div>
    </>
  );
}

export default AdminProfessionalVerification;