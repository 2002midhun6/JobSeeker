import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { AuthContext } from '../../context/AuthContext';
import './ProfessionalJobDetails.css';
const baseUrl = import.meta.env.VITE_API_URL;
function ProfessionalJobApplications() {
  const authContext = useContext(AuthContext);
  const navigate = useNavigate();
  const { user, isAuthenticated } = authContext || { user: null, isAuthenticated: false };

  const [applications, setApplications] = useState([]);
  const [filteredApplications, setFilteredApplications] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [currentPage, setCurrentPage] = useState({
    all: 1,
    ongoing: 1,
    completed: 1,
    other: 1
  });
  const itemsPerPage = 5; // Number of applications per page

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const response = await axios.get(`${baseUrl}/api/professional-job-applications/`, {
          withCredentials: true,
        });
        console.log('Fetch Professional Applications Response:', response.data);
        const applicationsData = Array.isArray(response.data.applications) ? response.data.applications : [];
        setApplications(applicationsData);
        setFilteredApplications(applicationsData);
        setLoading(false);
      } catch (err) {
        console.error('Fetch Error:', err.response?.data || err.message);
        const errorMessage = err.response?.data?.error || 'Failed to fetch applications';
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

    if (!isAuthenticated || !user || user.role !== 'professional') {
      navigate('/login');
    } else {
      fetchApplications();
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    console.log('Search Query:', searchQuery, 'Applications Count:', applications.length);
    if (!searchQuery.trim()) {
      setFilteredApplications(applications);
      console.log('Reset Filtered Applications:', applications.length);
      return;
    }

    const filtered = applications.filter(
      (app) =>
        app.job_details?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.job_details?.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredApplications(filtered);
    setCurrentPage({ all: 1, ongoing: 1, completed: 1, other: 1 }); // Reset pages on search
    console.log('Filtered Applications:', filtered.length);
  }, [searchQuery, applications]);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleAction = async (applicationId, action) => {
    if (action === 'cancel') {
      const result = await Swal.fire({
        icon: 'warning',
        title: 'Confirm Cancellation',
        text: 'Are you sure you want to cancel this project?',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Yes, cancel',
        cancelButtonText: 'No, keep it',
      });
      if (!result.isConfirmed) return;
    }

    try {
      const response = await axios.post(
        `${baseUrl}/api/professional-job-applications/`,
        { application_id: applicationId, action },
        { withCredentials: true }
      );
      console.log('Action Response:', response.data);

      if (action === 'complete' && response.data.message === 'Payment request sent to client') {
        Swal.fire({
          icon: 'info',
          title: 'Payment Request Sent',
          text: 'The client has been notified to complete the remaining payment.',
          confirmButtonColor: '#28a745',
          timer: 3000,
        });
        setApplications((prev) =>
          prev.map((app) =>
            app.application_id === applicationId
              ? { ...app, status: 'Pending Payment' }
              : app
          )
        );
        setFilteredApplications((prev) =>
          prev.map((app) =>
            app.application_id === applicationId
              ? { ...app, status: 'Pending Payment' }
              : app
          )
        );
      } else {
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: response.data.message,
          confirmButtonColor: '#28a745',
          timer: 3000,
        });
        setError('');
        const updatedApplications = applications.map((app) =>
          app.application_id === applicationId
            ? action === 'complete'
              ? { ...app, status: 'Completed', job_details: { ...app.job_details, status: 'Completed' } }
              : { ...app, status: 'Cancelled', job_details: { ...app.job_details, status: 'Open' } }
            : app
        );
        setApplications(updatedApplications);
        setFilteredApplications(updatedApplications);
      }
    } catch (err) {
      console.error('Action Error:', err.response || err.message);
      const errorMessage = err.response?.data?.error || `Failed to ${action} project`;
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
        confirmButtonColor: '#dc3545',
        timer: 3000,
      });
      setError(errorMessage);
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (!amount) return 'Not specified';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format datetime
  const formatDateTime = (dateString) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status badge class
  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'accepted': return 'status-accepted';
      case 'completed': return 'status-completed';
      case 'pending payment': return 'status-pending';
      case 'cancelled': return 'status-cancelled';
      case 'rejected': return 'status-rejected';
      default: return 'status-pending';
    }
  };

  const ongoingProjects = filteredApplications.filter(
    (app) => app.status === 'Accepted' || app.status === 'Pending Payment'
  );
  const completedProjects = filteredApplications.filter(
    (app) => app.status === 'Completed' || app.job_details?.status === 'Completed'
  );
  const otherProjects = filteredApplications.filter(
    (app) => !ongoingProjects.includes(app) && !completedProjects.includes(app)
  );

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage((prev) => ({ ...prev, [tab]: 1 })); // Reset page for the new tab
  };

  const paginate = (items, page) => {
    const startIndex = (page - 1) * itemsPerPage;
    return items.slice(startIndex, startIndex + itemsPerPage);
  };

  const getPageCount = (items) => Math.ceil(items.length / itemsPerPage);

  const handlePageChange = (tab, page) => {
    setCurrentPage((prev) => ({ ...prev, [tab]: page }));
  };

  const PaginationControls = ({ tab, totalItems }) => {
    const pageCount = getPageCount(totalItems);
    const current = currentPage[tab];
    const pages = [];

    for (let i = 1; i <= pageCount; i++) {
      pages.push(i);
    }

    if (pageCount <= 1) return null;

    return (
      <div className="pagination">
        <button
          disabled={current === 1}
          onClick={() => handlePageChange(tab, current - 1)}
          className="page-btn"
        >
          Previous
        </button>
        {pages.map((page) => (
          <button
            key={page}
            onClick={() => handlePageChange(tab, page)}
            className={`page-btn ${current === page ? 'active' : ''}`}
          >
            {page}
          </button>
        ))}
        <button
          disabled={current === pageCount}
          onClick={() => handlePageChange(tab, current + 1)}
          className="page-btn"
        >
          Next
        </button>
      </div>
    );
  };

  // Enhanced Project Item Component
  const ProjectItem = ({ app, showActions = false }) => (
    <li className="project-item">
      <h4>{app.job_details?.title || 'Untitled Job'}</h4>
      
      <div className="project-details">
        <div className="project-detail-item status">
          Job Status: {app.job_details?.status || 'N/A'}
        </div>
        <div className="project-detail-item status">
          Application Status: 
          <span className={`status-badge ${getStatusBadgeClass(app.status)}`}>
            {app.status}
          </span>
        </div>
        <div className="project-detail-item applied">
          Applied: {formatDateTime(app.applied_at)}
        </div>
        <div className="project-detail-item budget">
          Budget: {formatCurrency(app.job_details?.budget)}
        </div>
        <div className="project-detail-item deadline">
          Deadline: {formatDate(app.job_details?.deadline)}
        </div>
      </div>

      <p style={{ marginTop: '16px', padding: '16px', background: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)', borderRadius: '12px', borderLeft: '4px solid #3b82f6' }}>
        {app.job_details?.description || 'No description provided'}
      </p>

      <h5>Client Details:</h5>
      <p style={{ marginLeft: '16px', color: '#374151', fontWeight: '500' }}>
        {app.job_details?.client_id?.name || 'N/A'}
      </p>

      {showActions && (
        <div className="action-buttons">
          {app.status === 'Accepted' && (
            <>
              <button
                onClick={() => handleAction(app.application_id, 'complete')}
                className="complete-btn"
              >
                Mark as Completed
              </button>
              <button
                onClick={() => handleAction(app.application_id, 'cancel')}
                className="cancel-btn"
              >
                Cancel Project
              </button>
            </>
          )}
          {app.status === 'Pending Payment' && (
            <div className="pending-payment">
              Waiting for client to complete remaining payment...
            </div>
          )}
        </div>
      )}
    </li>
  );

  if (!isAuthenticated || !user) return null;

  return (
    <div className="professional-jobs-container">
      <h2>My Job Applications</h2>
      
      <div className="search-bar">
        <input
          type="text"
          placeholder="Search by job title or description..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="search-input"
        />
      </div>
      
      <div className="tab-buttons">
        <button
          className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => handleTabChange('all')}
        >
          All ({filteredApplications.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'ongoing' ? 'active' : ''}`}
          onClick={() => handleTabChange('ongoing')}
        >
          Ongoing ({ongoingProjects.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
          onClick={() => handleTabChange('completed')}
        >
          Completed ({completedProjects.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'other' ? 'active' : ''}`}
          onClick={() => handleTabChange('other')}
        >
          Other ({otherProjects.length})
        </button>
      </div>
      
      {error && <div className="error-message">{error}</div>}
      
      {loading ? (
        <div className="loading-message">Loading applications...</div>
      ) : filteredApplications.length === 0 ? (
        <div className="empty-message">No job applications found.</div>
      ) : (
        <div className="tabs-content">
          {(activeTab === 'all' || activeTab === 'ongoing') && (
            <section className="tab-section">
              <h3 data-section="ongoing">Ongoing Projects</h3>
              {ongoingProjects.length === 0 ? (
                <div className="empty-message">No ongoing projects found.</div>
              ) : (
                <>
                  <ul className="project-list">
                    {paginate(ongoingProjects, currentPage.ongoing).map((app) => (
                      <ProjectItem 
                        key={app.application_id} 
                        app={app} 
                        showActions={true}
                      />
                    ))}
                  </ul>
                  <PaginationControls tab="ongoing" totalItems={ongoingProjects} />
                </>
              )}
            </section>
          )}

          {(activeTab === 'all' || activeTab === 'completed') && (
            <section className="tab-section">
              <h3 data-section="completed">Completed Projects</h3>
              {completedProjects.length === 0 ? (
                <div className="empty-message">No completed projects found.</div>
              ) : (
                <>
                  <ul className="project-list">
                    {paginate(completedProjects, currentPage.completed).map((app) => (
                      <ProjectItem 
                        key={app.application_id} 
                        app={app} 
                        showActions={false}
                      />
                    ))}
                  </ul>
                  <PaginationControls tab="completed" totalItems={completedProjects} />
                </>
              )}
            </section>
          )}

          {(activeTab === 'all' || activeTab === 'other') && (
            <section className="tab-section">
              <h3 data-section="other">Other Applications</h3>
              {otherProjects.length === 0 ? (
                <div className="empty-message">No other applications found.</div>
              ) : (
                <>
                  <ul className="project-list">
                    {paginate(otherProjects, currentPage.other).map((app) => (
                      <ProjectItem 
                        key={app.application_id} 
                        app={app} 
                        showActions={false}
                      />
                    ))}
                  </ul>
                  <PaginationControls tab="other" totalItems={otherProjects} />
                </>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}

export default ProfessionalJobApplications;