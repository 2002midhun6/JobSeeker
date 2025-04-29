import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { AuthContext } from '../../context/AuthContext';
import './AdminJobView.css';

function AdminJobs() {
  const { user, isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();

  const [jobs, setJobs] = useState({ pending: [], active: [], completed: [] });
  const [filteredJobs, setFilteredJobs] = useState({ pending: [], active: [], completed: [] });
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [currentPage, setCurrentPage] = useState({
    pending: 1,
    active: 1,
    completed: 1,
  });
  const itemsPerPage = 5; // Number of jobs per page

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const response = await axios.get('http://localhost:8000/api/admin/jobs/', {
          withCredentials: true,
        });
        console.log(response.data);
        const enrichedJobs = {
          pending: response.data.pending,
          active: response.data.active,
          completed: response.data.completed.map(job => ({
            ...job,
            rating: job.rating || null,
          })),
        };
        setJobs(enrichedJobs);
        setFilteredJobs(enrichedJobs);
        setLoading(false);
      } catch (err) {
        const errorMessage = err.response?.data?.error || 'Failed to fetch jobs';
        setError(errorMessage);
        setLoading(false);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: errorMessage,
          confirmButtonColor: '#dc3545',
        });
      }
    };

    fetchJobs();
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredJobs(jobs);
      setCurrentPage({ pending: 1, active: 1, completed: 1 }); // Reset pages on search
      return;
    }

    const filterJobs = (jobList) =>
      jobList.filter(
        (job) =>
          job.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          job.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          job.client_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );

    setFilteredJobs({
      pending: filterJobs(jobs.pending),
      active: filterJobs(jobs.active),
      completed: filterJobs(jobs.completed),
    });
    setCurrentPage({ pending: 1, active: 1, completed: 1 }); // Reset pages on search
  }, [searchQuery, jobs]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage((prev) => ({ ...prev, [tab]: 1 })); // Reset page for the new tab
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
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
    <div className="admin-jobs-container">
      <div className="jobs-content">
        <h2>All Jobs</h2>
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search by title, description, or client name..."
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
            className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => handleTabChange('pending')}
          >
            Pending
          </button>
          <button
            className={`tab-btn ${activeTab === 'active' ? 'active' : ''}`}
            onClick={() => handleTabChange('active')}
          >
            Active
          </button>
          <button
            className={`tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => handleTabChange('completed')}
          >
            Completed
          </button>
        </div>
        {error && <div className="error-message">{error}</div>}
        {loading ? (
          <p className="loading-message">Loading jobs...</p>
        ) : (
          <div className="tabs-container">
            {(activeTab === 'all' || activeTab === 'pending') && (
              <section className="tab-section">
                <h3>Pending Jobs (Open)</h3>
                {filteredJobs.pending.length === 0 ? (
                  <p className="empty-message">No pending jobs found.</p>
                ) : (
                  <>
                    <ul className="job-list">
                      {paginate(filteredJobs.pending, currentPage.pending).map((job) => (
                        <li key={job.job_id} className="job-item">
                          <h4>{job.title || 'Untitled Job'}</h4>
                          <p>Description: {job.description || 'N/A'}</p>
                          <p>Client: {job.client_name || 'Unknown'}</p>
                          <p>Budget: ${job.budget || 'N/A'}</p>
                          <p>Deadline: {job.deadline ? new Date(job.deadline).toLocaleDateString() : 'N/A'}</p>
                          <p>Applicants: {job.applicants_count || 0}</p>
                        </li>
                      ))}
                    </ul>
                    <PaginationControls tab="pending" totalItems={filteredJobs.pending} />
                  </>
                )}
              </section>
            )}

            {(activeTab === 'all' || activeTab === 'active') && (
              <section className="tab-section">
                <h3>Active Jobs (Assigned)</h3>
                {filteredJobs.active.length === 0 ? (
                  <p className="empty-message">No active jobs found.</p>
                ) : (
                  <>
                    <ul className="job-list">
                      {paginate(filteredJobs.active, currentPage.active).map((job) => (
                        <li key={job.job_id} className="job-item">
                          <h4>{job.title || 'Untitled Job'}</h4>
                          <p>Description: {job.description || 'N/A'}</p>
                          <p>Client: {job.client_name || 'Unknown'}</p>
                          <p>Professional: {job.professional_name || 'N/A'}</p>
                          <p>Budget: ${job.budget || 'N/A'}</p>
                          <p>Deadline: {job.deadline ? new Date(job.deadline).toLocaleDateString() : 'N/A'}</p>
                        </li>
                      ))}
                    </ul>
                    <PaginationControls tab="active" totalItems={filteredJobs.active} />
                  </>
                )}
              </section>
            )}

            {(activeTab === 'all' || activeTab === 'completed') && (
              <section className="tab-section">
                <h3>Completed Jobs</h3>
                {filteredJobs.completed.length === 0 ? (
                  <p className="empty-message">No completed jobs found.</p>
                ) : (
                  <>
                    <ul className="job-list">
                      {paginate(filteredJobs.completed, currentPage.completed).map((job) => (
                        <li key={job.job_id} className="job-item">
                          <h4>{job.title || 'Untitled Job'}</h4>
                          <p>Description: {job.description || 'N/A'}</p>
                          <p>Client: {job.client_name || 'Unknown'}</p>
                          <p>Professional: {job.professional_name || 'N/A'}</p>
                          <p>Budget: ${job.budget || 'N/A'}</p>
                          <p>Deadline: {job.deadline ? new Date(job.deadline).toLocaleDateString() : 'N/A'}</p>
                          <p>Rating: {job.rating ? `${job.rating} / 5` : 'Not rated'}</p>
                        </li>
                      ))}
                    </ul>
                    <PaginationControls tab="completed" totalItems={filteredJobs.completed} />
                  </>
                )}
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminJobs;