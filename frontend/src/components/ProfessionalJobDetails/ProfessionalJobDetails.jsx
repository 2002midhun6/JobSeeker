import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { AuthContext } from '../../context/AuthContext';
import './ProfessionalJobDetails.css';

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
        const response = await axios.get('http://localhost:8000/api/professional-job-applications/', {
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
        'http://localhost:8000/api/professional-job-applications/',
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
          All
        </button>
        <button
          className={`tab-btn ${activeTab === 'ongoing' ? 'active' : ''}`}
          onClick={() => handleTabChange('ongoing')}
        >
          Ongoing
        </button>
        <button
          className={`tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
          onClick={() => handleTabChange('completed')}
        >
          Completed
        </button>
        <button
          className={`tab-btn ${activeTab === 'other' ? 'active' : ''}`}
          onClick={() => handleTabChange('other')}
        >
          Other
        </button>
      </div>
      {error && <div className="error-message">{error}</div>}
      {loading ? (
        <p className="loading-message">Loading applications...</p>
      ) : filteredApplications.length === 0 ? (
        <p className="empty-message">No job applications found.</p>
      ) : (
        <div className="tabs-content">
          {(activeTab === 'all' || activeTab === 'ongoing') && (
            <section className="tab-section">
              <h3>Ongoing Projects</h3>
              {ongoingProjects.length === 0 ? (
                <p className="empty-message">No ongoing projects found.</p>
              ) : (
                <>
                  <ul className="project-list">
                    {paginate(ongoingProjects, currentPage.ongoing).map((app) => (
                      <li key={app.application_id} className="project-item">
                        <h4>{app.job_details?.title || 'Untitled Job'}</h4>
                        <p>Job Status: {app.job_details?.status || 'N/A'}</p>
                        <p>Application Status: {app.status}</p>
                        <p>Applied At: {new Date(app.applied_at).toLocaleString()}</p>
                        <p>Description: {app.job_details?.description || 'N/A'}</p>
                        <p>Budget: ${app.job_details?.budget || 'N/A'}</p>
                        <p>Deadline: {app.job_details?.deadline || 'N/A'}</p>
                        <h5>Client Details:</h5>
                        <p>Name: {app.job_details?.client_id?.name || 'N/A'}</p>
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
                            <p className="pending-payment">Waiting for client to complete remaining payment...</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                  <PaginationControls tab="ongoing" totalItems={ongoingProjects} />
                </>
              )}
            </section>
          )}

          {(activeTab === 'all' || activeTab === 'completed') && (
            <section className="tab-section">
              <h3>Completed Projects</h3>
              {completedProjects.length === 0 ? (
                <p className="empty-message">No completed projects found.</p>
              ) : (
                <>
                  <ul className="project-list">
                    {paginate(completedProjects, currentPage.completed).map((app) => (
                      <li key={app.application_id} className="project-item">
                        <h4>{app.job_details?.title || 'Untitled Job'}</h4>
                        <p>Job Status: {app.job_details?.status || 'N/A'}</p>
                        <p>Application Status: {app.status}</p>
                        <p>Applied At: {new Date(app.applied_at).toLocaleString()}</p>
                        <p>Description: {app.job_details?.description || 'N/A'}</p>
                        <p>Budget: ${app.job_details?.budget || 'N/A'}</p>
                        <p>Deadline: {app.job_details?.deadline || 'N/A'}</p>
                        <h5>Client Details:</h5>
                        <p>Name: {app.job_details?.client_id?.name || 'N/A'}</p>
                      </li>
                    ))}
                  </ul>
                  <PaginationControls tab="completed" totalItems={completedProjects} />
                </>
              )}
            </section>
          )}

          {(activeTab === 'all' || activeTab === 'other') && (
            <section className="tab-section">
              <h3>Other Applications</h3>
              {otherProjects.length === 0 ? (
                <p className="empty-message">No other applications found.</p>
              ) : (
                <>
                  <ul className="project-list">
                    {paginate(otherProjects, currentPage.other).map((app) => (
                      <li key={app.application_id} className="project-item">
                        <h4>{app.job_details?.title || 'Untitled Job'}</h4>
                        <p>Job Status: {app.job_details?.status || 'N/A'}</p>
                        <p>Application Status: {app.status}</p>
                        <p>Applied At: {new Date(app.applied_at).toLocaleString()}</p>
                        <p>Description: {app.job_details?.description || 'N/A'}</p>
                        <p>Budget: ${app.job_details?.budget || 'N/A'}</p>
                        <p>Deadline: {app.job_details?.deadline || 'N/A'}</p>
                        <h5>Client Details:</h5>
                        <p>Name: {app.job_details?.client_id?.name || 'N/A'}</p>
                      </li>
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