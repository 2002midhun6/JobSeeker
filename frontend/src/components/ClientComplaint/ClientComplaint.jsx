import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import Swal from 'sweetalert2';
import './ClientComplaint.css';

const baseUrl = import.meta.env.VITE_API_URL;

function ComplaintManagement() {
  const { user, isAuthenticated } = useContext(AuthContext) || { user: null, isAuthenticated: false };
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [markingResolved, setMarkingResolved] = useState(null);
  const [providingFeedback, setProvidingFeedback] = useState(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [rating, setRating] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const complaintsPerPage = 2;

  useEffect(() => {
    if (isAuthenticated) {
      fetchComplaints();
    }
  }, [isAuthenticated]);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${baseUrl}/api/complaints/`, {
        withCredentials: true,
      });
      setComplaints(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch complaints');
      setLoading(false);
      console.error('Error fetching complaints:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!description.trim()) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Please provide a description for your complaint',
        confirmButtonColor: '#dc3545',
      });
      return;
    }

    try {
      setSubmitting(true);
      await axios.post(
        `${baseUrl}/api/complaints/`,
        { description },
        { withCredentials: true }
      );

      setDescription('');
      setSubmitting(false);
      setCurrentPage(1); // Reset to first page after submitting a new complaint

      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Your complaint has been submitted successfully',
        confirmButtonColor: '#28a745',
        timer: 3000,
        timerProgressBar: true,
      });

      fetchComplaints();
    } catch (err) {
      setSubmitting(false);
      const errorMessage = err.response?.data?.error || 'Failed to submit complaint';

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
        confirmButtonColor: '#dc3545',
      });
      console.error('Error submitting complaint:', err);
    }
  };

  const handleMarkResolved = async (complaintId) => {
    const result = await Swal.fire({
      icon: 'question',
      title: 'Mark as Resolved?',
      text: 'Are you satisfied with the admin response and want to mark this complaint as resolved?',
      showCancelButton: true,
      confirmButtonColor: '#28a745',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, Mark as Resolved',
      cancelButtonText: 'Cancel',
    });

    if (!result.isConfirmed) return;

    try {
      setMarkingResolved(complaintId);
      await axios.patch(
        `${baseUrl}/api/complaints/${complaintId}/`,
        { status: 'RESOLVED' },
        { withCredentials: true }
      );

      setComplaints(complaints.map(complaint =>
        complaint.id === complaintId
          ? { ...complaint, status: 'RESOLVED', status_display: 'Resolved' }
          : complaint
      ));

      setMarkingResolved(null);

      Swal.fire({
        icon: 'success',
        title: 'Marked as Resolved',
        text: 'Thank you for confirming that your complaint has been resolved!',
        confirmButtonColor: '#28a745',
        timer: 3000,
        timerProgressBar: true,
      });
    } catch (err) {
      setMarkingResolved(null);
      const errorMessage = err.response?.data?.error || 'Failed to mark as resolved';

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
        confirmButtonColor: '#dc3545',
      });
      console.error('Error marking complaint as resolved:', err);
    }
  };

  const handleRequestFurtherAction = async (complaintId) => {
    if (!feedbackText.trim()) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Please explain why the response was not helpful',
        confirmButtonColor: '#dc3545',
      });
      return;
    }

    try {
      setProvidingFeedback(complaintId);

      const feedbackData = {
        client_feedback: feedbackText,
      };

      if (rating) {
        feedbackData.resolution_rating = rating;
      }

      const response = await axios.patch(
        `${baseUrl}/api/complaints/${complaintId}/feedback/`,
        feedbackData,
        { withCredentials: true }
      );

      setComplaints(complaints.map(complaint =>
        complaint.id === complaintId ? response.data : complaint
      ));

      setProvidingFeedback(null);
      setFeedbackText('');
      setRating(null);

      Swal.fire({
        icon: 'success',
        title: 'Feedback Submitted',
        text: 'Your feedback has been sent to the admin team for further action.',
        confirmButtonColor: '#28a745',
        timer: 3000,
        timerProgressBar: true,
      });
    } catch (err) {
      setProvidingFeedback(null);
      const errorMessage = err.response?.data?.error || 'Failed to submit feedback';

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
        confirmButtonColor: '#dc3545',
      });
      console.error('Error submitting feedback:', err);
    }
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
        return 'badge-orange';
      case 'RESOLVED':
        return 'badge-success';
      case 'CLOSED':
        return 'badge-secondary';
      default:
        return 'badge-primary';
    }
  };

  const getStatusMessage = (complaint) => {
    switch (complaint.status) {
      case 'PENDING':
        return 'Your complaint is waiting to be reviewed by our team.';
      case 'IN_PROGRESS':
        return 'Our team is currently working on your complaint.';
      case 'AWAITING_USER_RESPONSE':
        return 'Admin has responded to your complaint. Please review the response and choose an action below.';
      case 'NEEDS_FURTHER_ACTION':
        return 'Your feedback has been received. The admin team will work on addressing your concerns.';
      case 'RESOLVED':
        return 'This complaint has been resolved.';
      case 'CLOSED':
        return 'This complaint has been closed by admin.';
      default:
        return '';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const renderRatingStars = (currentRating, setRating, interactive = true) => {
    return (
      <div className="rating-stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`star ${currentRating >= star ? 'filled' : ''} ${interactive ? 'interactive' : ''}`}
            onClick={interactive ? () => setRating(star) : undefined}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  // Pagination logic
  const totalPages = Math.ceil(complaints.length / complaintsPerPage);
  const startIndex = (currentPage - 1) * complaintsPerPage;
  const endIndex = startIndex + complaintsPerPage;
  const currentComplaints = complaints.slice(startIndex, endIndex);

  if (!isAuthenticated) {
    return (
      <div className="complaint-management">
        <div className="unauthorized">
          <h2>Please log in to manage your complaints</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="complaint-management">
      <div className="complaint-header">
        <h1>My Complaints</h1>
        <p>Submit and track your complaints here</p>
      </div>

      <div className="complaint-form-container">
        <div className="form-card">
          <h2>Submit a New Complaint</h2>
          <form onSubmit={handleSubmit} className="complaint-form">
            <div className="form-group">
              <label htmlFor="description">Describe your issue</label>
              <textarea
                id="description"
                className="form-control"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Please provide detailed information about your complaint..."
                rows="5"
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-submit"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="spinner"></span>
                  Submitting...
                </>
              ) : (
                'Submit Complaint'
              )}
            </button>
          </form>
        </div>
      </div>

      <div className="my-complaints-container">
        <h2>Your Complaints ({complaints.length})</h2>
        {loading ? (
          <div className="loading-container">
            <div className="spinner-large"></div>
            <p>Loading your complaints...</p>
          </div>
        ) : error ? (
          <div className="error-container">
            <p className="error">{error}</p>
            <button onClick={fetchComplaints} className="btn btn-secondary">Retry</button>
          </div>
        ) : complaints.length === 0 ? (
          <div className="no-complaints">
            <div className="empty-state">
              <h3>No complaints yet</h3>
              <p>You haven't submitted any complaints. Use the form above to submit your first complaint.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="complaints-list">
              {currentComplaints.map((complaint) => (
                <div key={complaint.id} className={`complaint-card ${complaint.status.toLowerCase()}`}>
                  <div className="complaint-header-card">
                    <div className="complaint-id">
                      <h3>Complaint #{complaint.id}</h3>
                      <span className="complaint-date">
                        {formatDate(complaint.created_at)}
                      </span>
                    </div>
                    <span className={`status-badge ${getStatusBadgeClass(complaint.status)}`}>
                      {complaint.status_display || complaint.status}
                    </span>
                  </div>

                  <div className="complaint-content">
                    <div className="complaint-description">
                      <h4>Your Issue:</h4>
                      <p>{complaint.description}</p>
                    </div>

                    {complaint.admin_response && (
                      <div className="admin-response">
                        <h4>Admin Response:</h4>
                        <div className="response-content">
                          <p>{complaint.admin_response}</p>
                          <div className="response-meta">
                            <small>
                              Responded by {complaint.responded_by_name} on {formatDate(complaint.response_date)}
                            </small>
                          </div>
                        </div>
                      </div>
                    )}

                    {complaint.client_feedback && (
                      <div className="client-feedback">
                        <h4>Your Feedback:</h4>
                        <div className="feedback-content">
                          <p>{complaint.client_feedback}</p>
                          {complaint.resolution_rating && (
                            <div className="rating-display">
                              <span>Your rating: </span>
                              {renderRatingStars(complaint.resolution_rating, null, false)}
                              <span className="rating-text">({complaint.resolution_rating}/5)</span>
                            </div>
                          )}
                          <small>Submitted on {formatDate(complaint.feedback_date)}</small>
                        </div>
                      </div>
                    )}

                    <div className="status-info">
                      <div className={`status-message ${complaint.status.toLowerCase()}`}>
                        <i className="status-icon"></i>
                        <p>{getStatusMessage(complaint)}</p>
                      </div>
                    </div>

                    {complaint.can_mark_resolved && (
                      <div className="response-actions">
                        <div className="action-buttons">
                          <button
                            className="btn btn-success btn-resolve"
                            onClick={() => handleMarkResolved(complaint.id)}
                            disabled={markingResolved === complaint.id}
                          >
                            {markingResolved === complaint.id ? (
                              <>
                                <span className="spinner"></span>
                                Marking...
                              </>
                            ) : (
                              <>
                                <i className="icon-check"></i>
                                Mark as Resolved
                              </>
                            )}
                          </button>

                          <button
                            className="btn btn-warning btn-request-action"
                            onClick={() => setProvidingFeedback(complaint.id)}
                          >
                            <i className="icon-feedback"></i>
                            Request Further Action
                          </button>
                        </div>

                        <p className="action-helper">
                          <strong>Satisfied with the response?</strong> Mark as resolved.
                          <strong> Need more help?</strong> Request further action with specific feedback.
                        </p>
                      </div>
                    )}

                    {providingFeedback === complaint.id && (
                      <div className="feedback-form">
                        <h4>What additional help do you need?</h4>
                        <textarea
                          value={feedbackText}
                          onChange={(e) => setFeedbackText(e.target.value)}
                          placeholder="Please explain what specific issues remain unresolved or what additional assistance you need..."
                          rows="4"
                          className="feedback-textarea"
                        />

                        <div className="rating-section">
                          <label>Rate the admin response (optional):</label>
                          <div className="rating-container">
                            {renderRatingStars(rating, setRating)}
                            <span className="rating-labels">
                              <span>Poor</span>
                              <span>Excellent</span>
                            </span>
                          </div>
                        </div>

                        <div className="feedback-actions">
                          <button
                            className="btn btn-primary"
                            onClick={() => handleRequestFurtherAction(complaint.id)}
                            disabled={!feedbackText.trim()}
                          >
                            Submit Feedback
                          </button>
                          <button
                            className="btn btn-secondary"
                            onClick={() => {
                              setProvidingFeedback(null);
                              setFeedbackText('');
                              setRating(null);
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="complaint-footer">
                    <div className="complaint-timeline">
                      <div className="timeline-item">
                        <span className="timeline-label">Submitted:</span>
                        <span className="timeline-date">{formatDate(complaint.created_at)}</span>
                      </div>
                      {complaint.updated_at !== complaint.created_at && (
                        <div className="timeline-item">
                          <span className="timeline-label">Last Updated:</span>
                          <span className="timeline-date">{formatDate(complaint.updated_at)}</span>
                        </div>
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
          </>
        )}
      </div>
    </div>
  );
}

export default ComplaintManagement;