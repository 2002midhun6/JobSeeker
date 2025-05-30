import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { AuthContext } from '../../context/AuthContext';
import './AdminJobView.css';
const baseUrl = import.meta.env.VITE_API_URL;
// Enhanced Spinner Component
const AdminJobsSpinner = ({ text = 'Loading...' }) => (
  <div className="admin-jobs-spinner-container">
    <div className="admin-jobs-loading-spinner"></div>
    <p className="admin-jobs-spinner-text">{text}</p>
  </div>
);

// Job Summary Component
const JobSummary = ({ jobs }) => {
  const totalJobs = jobs.pending.length + jobs.active.length + jobs.completed.length;
  const totalBudget = [...jobs.pending, ...jobs.active, ...jobs.completed]
    .reduce((sum, job) => sum + (job.budget || 0), 0);
  
  const averageRating = jobs.completed.filter(job => job.rating).length > 0
    ? (jobs.completed.filter(job => job.rating).reduce((sum, job) => sum + job.rating, 0) / 
       jobs.completed.filter(job => job.rating).length).toFixed(1)
    : 0;

  return (
    <div className="job-summary">
      <div className="job-summary-item">
        <h4>Total Jobs</h4>
        <p>{totalJobs}</p>
      </div>
      <div className="job-summary-item">
        <h4>Pending Jobs</h4>
        <p>{jobs.pending.length}</p>
      </div>
      <div className="job-summary-item">
        <h4>Active Jobs</h4>
        <p>{jobs.active.length}</p>
      </div>
      <div className="job-summary-item">
        <h4>Completed Jobs</h4>
        <p>{jobs.completed.length}</p>
      </div>
      <div className="job-summary-item">
        <h4>Total Budget</h4>
        <p>{formatCurrency(totalBudget)}</p>
      </div>
      <div className="job-summary-item">
        <h4>Avg Rating</h4>
        <p>{averageRating}/5</p>
      </div>
    </div>
  );
};

// Enhanced Job Card Component
const JobCard = ({ job, type }) => {
  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const renderStars = (rating) => {
    if (!rating) return null;
    return (
      <div className="rating-stars">
        {[...Array(5)].map((_, index) => (
          <span key={index} className={`star ${index < rating ? 'filled' : ''}`}>
            ★
          </span>
        ))}
      </div>
    );
  };

  return (
    <li className="job-item">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <h4>{job.title || 'Untitled Job'}</h4>
        <span className={`status-badge status-${type}`}>
          {type}
        </span>
      </div>

      <p style={{ 
        marginBottom: '20px', 
        padding: '16px', 
        background: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)', 
        borderRadius: '12px', 
        borderLeft: '4px solid #3b82f6',
        color: '#374151',
        fontWeight: '500'
      }}>
        {job.description || 'No description provided'}
      </p>

      <div className="job-details">
        <div className="job-detail-item client">
          Client: {job.client_name || 'Unknown'}
        </div>
        
        {job.professional_name && (
          <div className="job-detail-item professional">
            Professional: {job.professional_name}
          </div>
        )}
        
        <div className="job-detail-item budget">
          Budget: {formatCurrency(job.budget)}
        </div>
        
        <div className="job-detail-item deadline">
          Deadline: {formatDate(job.deadline)}
        </div>
        
        {job.applicants_count !== undefined && (
          <div className="job-detail-item applicants">
            Applicants: {job.applicants_count}
          </div>
        )}
        
        {job.rating && (
          <div className="job-detail-item rating">
            Rating: {job.rating}/5 {renderStars(job.rating)}
          </div>
        )}
      </div>
    </li>
  );
};

// Enhanced Pagination Component
const PaginationControls = ({ tab, totalItems, currentPage, onPageChange, itemsPerPage }) => {
  const pageCount = Math.ceil(totalItems.length / itemsPerPage);
  const current = currentPage[tab];
  
  if (pageCount <= 1) return null;

  const maxVisiblePages = 5;
  const pages = [];
  
  // Calculate which pages to show
  let startPage = Math.max(1, current - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(pageCount, startPage + maxVisiblePages - 1);
  
  // Adjust start page if we're near the end
  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  // Add page numbers
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  const startIndex = (current - 1) * itemsPerPage + 1;
  const endIndex = Math.min(current * itemsPerPage, totalItems.length);

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
        Showing {startIndex} to {endIndex} of {totalItems.length} jobs
      </div>

      {/* Pagination Controls */}
      <div className="pagination">
        <button
          disabled={current === 1}
          onClick={() => onPageChange(tab, current - 1)}
          className="page-btn"
        >
          Previous
        </button>
        
        {pages.map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(tab, page)}
            className={`page-btn ${current === page ? 'active' : ''}`}
          >
            {page}
          </button>
        ))}
        
        <button
          disabled={current === pageCount}
          onClick={() => onPageChange(tab, current + 1)}
          className="page-btn"
        >
          Next
        </button>
      </div>
    </div>
  );
};

// Format currency function
const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return 'Not specified';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0
  }).format(amount);
};

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
  const itemsPerPage = 5;

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${baseUrl}/api/admin/jobs/`, {
          withCredentials: true,
        });
        
        console.log(response.data);
        const enrichedJobs = {
          pending: response.data.pending || [],
          active: response.data.active || [],
          completed: (response.data.completed || []).map(job => ({
            ...job,
            rating: job.rating || null,
          })),
        };
        
        setJobs(enrichedJobs);
        setFilteredJobs(enrichedJobs);
        setError('');
      } catch (err) {
        const errorMessage = err.response?.data?.error || 'Failed to fetch jobs';
        setError(errorMessage);
        console.error('Error fetching jobs:', err);
        
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
      fetchJobs();
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredJobs(jobs);
      setCurrentPage({ pending: 1, active: 1, completed: 1 });
      return;
    }

    const filterJobs = (jobList) =>
      jobList.filter(
        (job) =>
          job.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          job.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          job.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          job.professional_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );

    setFilteredJobs({
      pending: filterJobs(jobs.pending),
      active: filterJobs(jobs.active),
      completed: filterJobs(jobs.completed),
    });
    setCurrentPage({ pending: 1, active: 1, completed: 1 });
  }, [searchQuery, jobs]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage((prev) => ({ ...prev, [tab]: 1 }));
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const paginate = (items, page) => {
    const startIndex = (page - 1) * itemsPerPage;
    return items.slice(startIndex, startIndex + itemsPerPage);
  };

  const handlePageChange = (tab, page) => {
    setCurrentPage((prev) => ({ ...prev, [tab]: page }));
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!isAuthenticated || !user) return null;

  return (
    <div className="admin-jobs-container">
      <div className="jobs-content">
        <h2>All Jobs</h2>
        
        {/* Job Summary */}
        {!loading && !error && <JobSummary jobs={filteredJobs} />}
        
        {/* Search Bar */}
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search by title, description, client, or professional name..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="search-input"
          />
        </div>
        
        {/* Tab Navigation */}
        <div className="tab-buttons">
          <button
            className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => handleTabChange('all')}
            data-tab="all"
          >
            All ({filteredJobs.pending.length + filteredJobs.active.length + filteredJobs.completed.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => handleTabChange('pending')}
            data-tab="pending"
          >
            Pending ({filteredJobs.pending.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'active' ? 'active' : ''}`}
            onClick={() => handleTabChange('active')}
            data-tab="active"
          >
            Active ({filteredJobs.active.length})
          </button>
          <button
            className={`tab-btn ${activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => handleTabChange('completed')}
            data-tab="completed"
          >
            Completed ({filteredJobs.completed.length})
          </button>
        </div>
        
        {/* Error Message */}
        {error && <div className="error-message">{error}</div>}
        
        {/* Loading State */}
        {loading ? (
          <AdminJobsSpinner text="Loading jobs..." />
        ) : (
          <div className="tabs-container">
            {/* Pending Jobs Section */}
            {(activeTab === 'all' || activeTab === 'pending') && (
              <section className="tab-section">
                <h3 data-section="pending">Pending Jobs (Open)</h3>
                {filteredJobs.pending.length === 0 ? (
                  <div className="empty-message">
                    No pending jobs found.
                  </div>
                ) : (
                  <>
                    <ul className="job-list">
                      {paginate(filteredJobs.pending, currentPage.pending).map((job) => (
                        <JobCard key={job.job_id} job={job} type="pending" />
                      ))}
                    </ul>
                    <PaginationControls
                      tab="pending"
                      totalItems={filteredJobs.pending}
                      currentPage={currentPage}
                      onPageChange={handlePageChange}
                      itemsPerPage={itemsPerPage}
                    />
                  </>
                )}
              </section>
            )}

            {/* Active Jobs Section */}
            {(activeTab === 'all' || activeTab === 'active') && (
              <section className="tab-section">
                <h3 data-section="active">Active Jobs (Assigned)</h3>
                {filteredJobs.active.length === 0 ? (
                  <div className="empty-message">
                    No active jobs found.
                  </div>
                ) : (
                  <>
                    <ul className="job-list">
                      {paginate(filteredJobs.active, currentPage.active).map((job) => (
                        <JobCard key={job.job_id} job={job} type="active" />
                      ))}
                    </ul>
                    <PaginationControls
                      tab="active"
                      totalItems={filteredJobs.active}
                      currentPage={currentPage}
                      onPageChange={handlePageChange}
                      itemsPerPage={itemsPerPage}
                    />
                  </>
                )}
              </section>
            )}

            {/* Completed Jobs Section */}
            {(activeTab === 'all' || activeTab === 'completed') && (
              <section className="tab-section">
                <h3 data-section="completed">Completed Jobs</h3>
                {filteredJobs.completed.length === 0 ? (
                  <div className="empty-message">
                    No completed jobs found.
                  </div>
                ) : (
                  <>
                    <ul className="job-list">
                      {paginate(filteredJobs.completed, currentPage.completed).map((job) => (
                        <JobCard key={job.job_id} job={job} type="completed" />
                      ))}
                    </ul>
                    <PaginationControls
                      tab="completed"
                      totalItems={filteredJobs.completed}
                      currentPage={currentPage}
                      onPageChange={handlePageChange}
                      itemsPerPage={itemsPerPage}
                    />
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