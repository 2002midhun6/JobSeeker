import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import Swal from 'sweetalert2';
import './AdminComplaint.css';

const baseUrl = import.meta.env.VITE_API_URL;

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

function AdminComplaintManagement() {
  const { user, isAuthenticated } = useContext(AuthContext) || { user: null, isAuthenticated: false };
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [respondingTo, setRespondingTo] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [submittingResponse, setSubmittingResponse] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    awaitingResponse: 0,
    needsAction: 0,
    resolved: 0,
    closed: 0
  });
  const [currentPage, setCurrentPage] = useState(1);
  const complaintsPerPage = 3;

  useEffect(() => {
    if (isAuthenticated && (user?.is_staff || user?.is_superuser)) {
      fetchComplaints();
    }
  }, [isAuthenticated, user, statusFilter, searchQuery]);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      let url = `${baseUrl}/api/admin/complaints/`;

      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (searchQuery) params.append('search', searchQuery);

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await axios.get(url, {
        withCredentials: true,
      });

      setComplaints(response.data);
      calculateStats(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch complaints');
      setLoading(false);
      console.error('Error fetching complaints:', err);
    }
  };

  const calculateStats = (complaintsData) => {
    const stats = {
      total: complaintsData.length,
      pending: 0,
      inProgress: 0,
      awaitingResponse: 0,
      needsAction: 0,
      resolved: 0,
      closed: 0
    };

    complaintsData.forEach(complaint => {
      switch (complaint.status) {
        case 'PENDING':
          stats.pending++;
          break;
        case 'IN_PROGRESS':
          stats.inProgress++;
          break;
        case 'AWAITING_USER_RESPONSE':
          stats.awaitingResponse++;
          break;
        case 'NEEDS_FURTHER_ACTION':
          stats.needsAction++;
          break;
        case 'RESOLVED':
          stats.resolved++;
          break;
        case 'CLOSED':
          stats.closed++;
          break;
      }
    });

    setStats(stats);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page on search
    fetchComplaints();
  };

  const handleStatusChange = async (complaintId, newStatus) => {
    const allowedStatuses = ['PENDING', 'IN_PROGRESS', 'CLOSED'];
    if (!allowedStatuses.includes(newStatus)) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid Action',
        text: 'Use the "Respond" button to provide a response. Only PENDING, IN_PROGRESS, and CLOSED statuses can be set directly.',
        confirmButtonColor: '#dc3545',
      });
      return;
    }

    try {
      await axios.patch(
        `${baseUrl}/api/complaints/${complaintId}/`,
        { status: newStatus },
        { withCredentials: true }
      );

      setComplaints(complaints.map(complaint =>
        complaint.id === complaintId
          ? { ...complaint, status: newStatus, status_display: getStatusDisplayName(newStatus) }
          : complaint
      ));

      Swal.fire({
        icon: 'success',
        title: 'Status Updated',
        text: `Complaint status updated to ${getStatusDisplayName(newStatus)}`,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      });
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to update status';

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
        confirmButtonColor: '#dc3545',
      });
      console.error('Error updating complaint status:', err);
    }
  };

  const handleRespondToComplaint = async (complaintId) => {
    if (!responseText.trim()) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Please provide a response',
        confirmButtonColor: '#dc3545',
      });
      return;
    }

    try {
      setSubmittingResponse(true);
      const response = await axios.patch(
        `${baseUrl}/api/admin/complaints/${complaintId}/respond/`,
        { admin_response: responseText },
        { withCredentials: true }
      );

      setComplaints(complaints.map(complaint =>
        complaint.id === complaintId ? response.data : complaint
      ));

      setRespondingTo(null);
      setResponseText('');
      setSubmittingResponse(false);

      Swal.fire({
        icon: 'success',
        title: 'Response Sent',
        text: 'Your response has been sent to the user. They will be notified to review it.',
        confirmButtonColor: '#28a745',
        timer: 4000,
        timerProgressBar: true,
      });
    } catch (err) {
      setSubmittingResponse(false);
      const errorMessage = err.response?.data?.error || 'Failed to submit response';

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
        confirmButtonColor: '#dc3545',
      });
      console.error('Error submitting response:', err);
    }
  };

  const getStatusDisplayName = (status) => {
    const statusMap = {
      'PENDING': 'Pending',
      'IN_PROGRESS': 'In Progress',
      'AWAITING_USER_RESPONSE': 'Awaiting User Response',
      'NEEDS_FURTHER_ACTION': 'Needs Further Action',
      'RESOLVED': 'Resolved',
      'CLOSED': 'Closed'
    };
    return statusMap[status] || status;
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'PENDING':
        return 'badge-warning';
      case 'IN_PROGRESS':
        return 'badge-info';
      case 'AWAITING_USER_RESPONSE':
        return 'badge-primary';
      case 'NEEDS_FURTHER_ACTION':
        return 'badge-orange badge-urgent';
      case 'RESOLVED':
        return 'badge-success';
      case 'CLOSED':
        return 'badge-secondary';
      default:
        return 'badge-primary';
    }
  };

  const getPriorityLevel = (complaint) => {
    if (complaint.status === 'NEEDS_FURTHER_ACTION') return 'high';
    if (complaint.status === 'PENDING') return 'medium';
    if (complaint.status === 'IN_PROGRESS') return 'medium';
    return 'low';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString() + ' at ' + new Date(dateString).toLocaleTimeString();
  };

  const canRespond = (complaint) => {
    return complaint.status === 'PENDING' || 
           complaint.status === 'IN_PROGRESS' || 
           complaint.status === 'NEEDS_FURTHER_ACTION';
  };

  const renderRatingStars = (rating) => {
    if (!rating) return <span className="no-rating">No rating</span>;
    return (
      <div className="rating-display">
        {[...Array(rating)].map((_, i) => (
          <span key={i} className="star filled">★</span>
        ))}
        {[...Array(5 - rating)].map((_, i) => (
          <span key={i} className="star">★</span>
        ))}
        <span className="rating-text">({rating}/5)</span>
      </div>
    );
  };

  // Pagination logic
  const totalPages = Math.ceil(complaints.length / complaintsPerPage);
  const startIndex = (currentPage - 1) * complaintsPerPage;
  const endIndex = startIndex + complaintsPerPage;
  const currentComplaints = complaints.slice(startIndex, endIndex);

  if (!isAuthenticated || !user || (!user.is_staff && !user.is_superuser)) {
    return (
      <div className="admin-complaint-unauthorized">
        <div className="unauthorized-content">
          <h2>🔒 Unauthorized Access</h2>
          <p>You need administrator privileges to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-complaint-management">
      <div className="admin-header">
        <h1>📋 Complaint Management</h1>
        <p>Manage and respond to user complaints</p>
      </div>

      {/* Stats Dashboard */}
      <div className="stats-dashboard">
        <div className="stat-card total">
          <h3>{stats.total}</h3>
          <p>Total Complaints</p>
        </div>
        <div className="stat-card pending">
          <h3>{stats.pending}</h3>
          <p>Pending</p>
        </div>
        <div className="stat-card progress">
          <h3>{stats.inProgress}</h3>
          <p>In Progress</p>
        </div>
        <div className="stat-card awaiting">
          <h3>{stats.awaitingResponse}</h3>
          <p>Awaiting Response</p>
        </div>
        <div className="stat-card urgent">
          <h3>{stats.needsAction}</h3>
          <p>Needs Action</p>
        </div>
        <div className="stat-card resolved">
          <h3>{stats.resolved}</h3>
          <p>Resolved</p>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-container">
        <div className="filter-group">
          <label htmlFor="status">Filter by Status:</label>
          <select
            id="status"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1); // Reset to first page on filter change
            }}
            className="filter-select"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="AWAITING_USER_RESPONSE">Awaiting User Response</option>
            <option value="NEEDS_FURTHER_ACTION">⚠️ Needs Further Action</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>

        <form className="search-form" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Search by email, description, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="btn btn-search">🔍 Search</button>
        </form>

        <button 
          onClick={fetchComplaints} 
          className="btn btn-refresh"
          disabled={loading}
        >
          🔄 Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ margin: '40px 0', textAlign: 'center' }}>
          <Spinner size="large" text="Loading complaints..." />
        </div>
      ) : error ? (
        <div className="error-container">
          <p className="error">❌ {error}</p>
          <button onClick={fetchComplaints} className="btn btn-retry">Try Again</button>
        </div>
      ) : complaints.length === 0 ? (
        <div className="no-complaints">
          <div className="empty-state">
            <h3>📭 No complaints found</h3>
            <p>No complaints match your current filters.</p>
            {(statusFilter || searchQuery) && (
              <button 
                onClick={() => {
                  setStatusFilter('');
                  setSearchQuery('');
                  setCurrentPage(1); // Reset to first page on filter clear
                  fetchComplaints();
                }}
                className="btn btn-secondary"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="complaints-container">
          <div className="complaints-header">
            <h2>Complaints ({complaints.length})</h2>
            {stats.needsAction > 0 && (
              <div className="urgent-notice">
                ⚠️ {stats.needsAction} complaint{stats.needsAction > 1 ? 's' : ''} need{stats.needsAction === 1 ? 's' : ''} immediate attention
              </div>
            )}
          </div>

          <div className="complaints-grid">
            {currentComplaints.map((complaint) => (
              <div key={complaint.id} className={`complaint-card priority-${getPriorityLevel(complaint)}`}>
                <div className="complaint-card-header">
                  <div className="complaint-info">
                    <h3>Complaint #{complaint.id}</h3>
                    <p className="user-info">
                      👤 {complaint.user_email} ({complaint.user_role})
                    </p>
                  </div>
                  <div className="status-container">
                    <span className={`status-badge ${getStatusBadgeClass(complaint.status)}`}>
                      {complaint.status_display || getStatusDisplayName(complaint.status)}
                    </span>
                    {complaint.status === 'NEEDS_FURTHER_ACTION' && (
                      <div className="priority-indicator">
                        <span className="urgent-flag">⚠️ Urgent</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="complaint-content">
                  <div className="original-complaint">
                    <h4 style={{color:"black"}}>📝 Original Issue:</h4>
                    <p>{complaint.description}</p>
                    <small style={{color:'black'}}>Submitted: {formatDate(complaint.created_at)}</small>
                  </div>

                  {complaint.admin_response && (
                    <div className="admin-response-display">
                      <h4 style={{color:"black"}}>💬 Your Response:</h4>
                      <p>{complaint.admin_response}</p>
                      <small style={{color:"black"}}>
                        Responded by {complaint.responded_by_name} on {formatDate(complaint.response_date)}
                      </small>
                    </div>
                  )}

                  {complaint.client_feedback && (
                    <div className="client-feedback-display">
                      <h4 style={{color:"black"}}>📣 Client Feedback:</h4>
                      <div className="feedback-content">
                        <p>"{complaint.client_feedback}"</p>
                        <div className="feedback-rating">
                          <span style={{color:"black"}}>Response Rating: </span>
                          {renderRatingStars(complaint.resolution_rating)}
                        </div>
                        <small style={{color:"black"}}>Feedback given: {formatDate(complaint.feedback_date)}</small>
                      </div>
                    </div>
                  )}

                  <div className="action-section">
                    <div className="status-controls">
                      <label>Change Status:</label>
                      <select
                        value={complaint.status}
                        onChange={(e) => handleStatusChange(complaint.id, e.target.value)}
                        className="status-select"
                        style={{color:"black"}}
                      >
                        <option value="PENDING">Pending</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="CLOSED">Closed</option>
                      </select>
                    </div>

                    {canRespond(complaint) && (
                      <button
                        className={`btn btn-respond ${
                          complaint.status === 'NEEDS_FURTHER_ACTION' ? 'btn-urgent' : 'btn-primary'
                        }`}
                        onClick={() => setRespondingTo(complaint.id)}
                      >
                        {complaint.status === 'NEEDS_FURTHER_ACTION' ? '⚡ Respond Again' : '💬 Respond'}
                      </button>
                    )}
                  </div>

                  {respondingTo === complaint.id && (
                    <div className="response-form">
                      <h4>
                        {complaint.status === 'NEEDS_FURTHER_ACTION' 
                          ? `🔄 Provide Additional Response` 
                          : `💬 Respond to Complaint`}
                      </h4>
                      
                      {complaint.status === 'NEEDS_FURTHER_ACTION' && complaint.client_feedback && (
                        <div className="client-concerns">
                          <h5>⚠️ Client's Specific Concerns:</h5>
                          <blockquote>"{complaint.client_feedback}"</blockquote>
                          {complaint.resolution_rating && (
                            <p>Previous response rating: {renderRatingStars(complaint.resolution_rating)}</p>
                          )}
                        </div>
                      )}
                      
                      <textarea
                        value={responseText}
                        onChange={(e) => setResponseText(e.target.value)}
                        placeholder={
                          complaint.status === 'NEEDS_FURTHER_ACTION' 
                            ? "Address the client's specific concerns and provide additional assistance. Be detailed and specific about the next steps..."
                            : "Provide a detailed response to help resolve this complaint..."
                        }
                        rows="6"
                        className="response-textarea"
                      />
                      
                      <div className="response-actions">
                        <button
                          className="btn btn-primary btn-send"
                          onClick={() => handleRespondToComplaint(complaint.id)}
                          disabled={submittingResponse || !responseText.trim()}
                        >
                          {submittingResponse ? (
                            <>
                              <span className="spinner"></span>
                              Sending...
                            </>
                          ) : (
                            '📤 Send Response'
                          )}
                        </button>
                        <button
                          className="btn btn-secondary"
                          onClick={() => {
                            setRespondingTo(null);
                            setResponseText('');
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="complaint-footer">
                  <div className="timestamps">
                    <span>📅 Created: {formatDate(complaint.created_at)}</span>
                    {complaint.updated_at !== complaint.created_at && (
                      <span>🔄 Updated: {formatDate(complaint.updated_at)}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pagination-container">
              <button
                className="pagination-btn"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              {[...Array(totalPages).keys()].map(page => (
                <button
                  key={page + 1}
                  className={`pagination-page ${currentPage === page + 1 ? 'active' : ''}`}
                  onClick={() => setCurrentPage(page + 1)}
                >
                  {page + 1}
                </button>
              ))}
              <button
                className="pagination-btn"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AdminComplaintManagement;