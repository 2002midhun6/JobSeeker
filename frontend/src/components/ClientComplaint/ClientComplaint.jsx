import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import Swal from 'sweetalert2';
import './ClientComplaint.css';

function ComplaintManagement() {
  const { user, isAuthenticated } = useContext(AuthContext) || { user: null, isAuthenticated: false };
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  useEffect(() => {
    if (isAuthenticated) {
      fetchComplaints();
    }
  }, [isAuthenticated]);
  
  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:8000/api/complaints/', {
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
        'http://localhost:8000/api/complaints/',
        { description },
        { withCredentials: true }
      );
      
      setDescription('');
      setSubmitting(false);
      
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Your complaint has been submitted successfully',
        confirmButtonColor: '#28a745',
        timer: 3000,
        timerProgressBar: true,
      });
      
      // Refresh the list of complaints
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
  
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'PENDING':
        return 'badge-warning';
      case 'IN_PROGRESS':
        return 'badge-info';
      case 'RESOLVED':
        return 'badge-success';
      case 'CLOSED':
        return 'badge-secondary';
      default:
        return 'badge-primary';
    }
  };
  
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };
  
  return (
    <div className="complaint-management">
      <h1>Complaint Management</h1>
      
      <div className="complaint-form-container">
        <h2>Submit a New Complaint</h2>
        <form onSubmit={handleSubmit} className="complaint-form">
          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              className="form-control"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your issue in detail..."
              rows="4"
              required
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
          >
            {submitting ? 'Submitting...' : 'Submit Complaint'}
          </button>
        </form>
      </div>
      
      <div className="my-complaints-container">
        <h2>My Complaints</h2>
        {loading ? (
          <p className="loading">Loading complaints...</p>
        ) : error ? (
          <p className="error">{error}</p>
        ) : complaints.length === 0 ? (
          <p className="no-complaints">You haven't submitted any complaints yet.</p>
        ) : (
          <div className="complaints-table-container">
            <table className="complaints-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Submitted On</th>
                  <th>Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {complaints.map((complaint) => (
                  <tr key={complaint.id}>
                    <td>#{complaint.id}</td>
                    <td className="description-cell">{complaint.description}</td>
                    <td>
                      <span className={`status-badge ${getStatusBadgeClass(complaint.status)}`}>
                        {complaint.status_display || complaint.status}
                      </span>
                    </td>
                    <td>{formatDate(complaint.created_at)}</td>
                    <td>{formatDate(complaint.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default ComplaintManagement;