import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import Swal from 'sweetalert2';
import './AdminComplaint.css';

function AdminComplaintManagement() {
  const { user, isAuthenticated } = useContext(AuthContext) || { user: null, isAuthenticated: false };
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  
  useEffect(() => {
    if (isAuthenticated && (user?.is_staff || user?.is_superuser)) {
      fetchComplaints();
    }
  }, [isAuthenticated, user, statusFilter]);
  
  const fetchComplaints = async () => {
    try {
      setLoading(true);
      let url = 'http://localhost:8000/api/admin/complaints/';
      
      // Add query parameters
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
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch complaints');
      setLoading(false);
      console.error('Error fetching complaints:', err);
    }
  };
  
  const handleSearch = (e) => {
    e.preventDefault();
    fetchComplaints();
  };
  
  const handleStatusChange = async (complaintId, newStatus) => {
    try {
      await axios.patch(
        `http://localhost:8000/api/complaints/${complaintId}/`,
        { status: newStatus },
        { withCredentials: true }
      );
      
      // Update local state
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
  
  const getStatusDisplayName = (status) => {
    const statusMap = {
      'PENDING': 'Pending',
      'IN_PROGRESS': 'In Progress',
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
  
  if (!isAuthenticated || !user || (!user.is_staff && !user.is_superuser)) {
    return (
      <div className="admin-complaint-unauthorized">
        <h2>Unauthorized Access</h2>
        <p>You do not have permission to view this page.</p>
      </div>
    );
  }
  
  return (
    <div className="admin-complaint-management">
      <h1>Complaint Administration</h1>
      
      <div className="filters-container">
        <div className="status-filter">
          <label htmlFor="status">Filter by Status:</label>
          <select
            id="status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
        
        <form className="search-form" onSubmit={handleSearch}>
          <input
          
            type="text"
            placeholder="Search by description or email"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button type="submit">Search</button>
        </form>
      </div>
      
      {loading ? (
        <p className="loading">Loading complaints...</p>
      ) : error ? (
        <p className="error">{error}</p>
      ) : complaints.length === 0 ? (
        <p className="no-complaints">No complaints found matching the criteria.</p>
      ) : (
        <div className="complaints-table-container">
          <table className="complaints-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>User</th>
                <th>Role</th>
                <th>Description</th>
                <th>Status</th>
                <th>Submitted</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {complaints.map((complaint) => (
                <tr key={complaint.id}>
                  <td>#{complaint.id}</td>
                  <td>{complaint.user_email}</td>
                  <td>{complaint.user_role}</td>
                  <td >{complaint.description}</td>
                  <td>
                    <span className={`status-badge ${getStatusBadgeClass(complaint.status)}`}>
                      {complaint.status_display || getStatusDisplayName(complaint.status)}
                    </span>
                  </td>
                  <td>{formatDate(complaint.created_at)}</td>
                  <td className="actions-cell">
                    <select
                      value={complaint.status}
                      onChange={(e) => handleStatusChange(complaint.id, e.target.value)}
                      className="status-select"
                    >
                      <option value="PENDING">Pending</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="RESOLVED">Resolved</option>
                      <option value="CLOSED">Closed</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AdminComplaintManagement;