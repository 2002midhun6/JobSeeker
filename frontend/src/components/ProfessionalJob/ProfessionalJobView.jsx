import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { AuthContext } from '../../context/AuthContext';
import './ProfessionalJobView.css';

function ProfessionalJobs() {
  const authContext = React.useContext(AuthContext);
  const navigate = useNavigate();
  const { user, isAuthenticated } = authContext || { user: null, isAuthenticated: false };

  const [openJobs, setOpenJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [jobsPerPage] = useState(5);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState('default'); // 'default' or 'newest'
  const [profileData, setProfileData] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Fetch professional profile to check availability status
  useEffect(() => {
    const fetchProfileData = async () => {
      if (!isAuthenticated || !user || user.role !== 'professional') return;
      
      try {
        const response = await axios.get('http://localhost:8000/api/profile/', {
          withCredentials: true,
        });
        setProfileData(response.data);
        setProfileLoading(false);
      } catch (err) {
        console.error('Error fetching profile:', err);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Unable to fetch your profile data',
          confirmButtonColor: '#dc3545',
        });
        setProfileLoading(false);
      }
    };

    fetchProfileData();
  }, [isAuthenticated, user]);

  // Fetch open jobs
  useEffect(() => {
    const fetchOpenJobs = async () => {
      try {
        const response = await axios.get('http://localhost:8000/api/open-jobs/', {
          withCredentials: true,
        });
        setOpenJobs(response.data);
        setLoading(false);
      } catch (err) {
        const errorMessage = err.response?.data?.error || 'Failed to fetch open jobs';
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: errorMessage,
          confirmButtonColor: '#dc3545',
          timer: 3000,
          timerProgressBar: true,
        });
        setLoading(false);
      }
    };

    if (isAuthenticated && user && user.role === 'professional') {
      fetchOpenJobs();
    }
  }, [isAuthenticated, user]);

  // Redirect if not authenticated as professional
  useEffect(() => {
    if (!isAuthenticated || !user || user.role !== 'professional') {
      console.log('Not authenticated or no user, redirecting to login');
      navigate('/login');
    }
  }, [user, isAuthenticated, navigate]);

  const canApplyForJobs = useCallback(() => {
    // Check if professional is available and verified
    if (!profileData) return false;
    
    const isAvailable = profileData.availability_status === 'Available';
    const isVerified = profileData.verify_status === 'Verified';
    
    return isAvailable ;
  }, [profileData]);

  const handleApply = async (jobId) => {
    // Check availability before allowing application
    if (!canApplyForJobs()) {
      let message = '';
      
      if (profileData?.availability_status !== 'Available') {
        message = 'You cannot apply for jobs because your status is not set to "Available". Please update your availability status to apply for jobs.';
      } 
      
      Swal.fire({
        icon: 'warning',
        title: 'Cannot Apply',
        text: message,
        confirmButtonColor: '#dc3545',
      });
      return;
    }

    try {
      const response = await axios.post(
        'http://localhost:8000/api/apply-to-job/',
        { job_id: jobId },
        {
          withCredentials: true,
          headers: { 'Content-Type': 'application/json' },
        }
      );
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: `Successfully applied to Job`,
        confirmButtonColor: '#28a745',
        timer: 3000,
        timerProgressBar: true,
      });
    } catch (err) {
      const errorMessage =
        err.response?.data?.non_field_errors?.[0] || 'Failed to apply to the job';
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
        confirmButtonColor: '#dc3545',
        timer: 3000,
        timerProgressBar: true,
      });
    }
  };

  // Filter and sort jobs
  const filteredJobs = openJobs
    .filter(
      (job) =>
        (job.title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (job.description?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (job.client_id?.name?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortOrder === 'newest') {
        return new Date(b.created_at) - new Date(a.created_at); // Newest first
      }
      return 0; // Default order
    });

  // Pagination logic
  const indexOfLastJob = currentPage * jobsPerPage;
  const indexOfFirstJob = indexOfLastJob - jobsPerPage;
  const currentJobs = filteredJobs.slice(indexOfFirstJob, indexOfLastJob);
  const totalPages = Math.ceil(filteredJobs.length / jobsPerPage);

  const paginate = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1); // Reset to first page on search
  };

  const handleSortChange = (e) => {
    setSortOrder(e.target.value);
    setCurrentPage(1); // Reset to first page on sort
  };
  
  const handleUpdateAvailability = () => {
    navigate('/professional-profile');
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  // Show loading state while fetching profile and jobs
  if (loading || profileLoading) {
    return (
      <div className="jobs-container">
        <div className="jobs-card">
          <h2 className="jobs-title">Available Jobs</h2>
          <p className="loading-message">Loading...</p>
        </div>
      </div>
    );
  }

  // Status banner to show availability and verification status
  const StatusBanner = () => {
    if (!profileData) return null;
    
    const isAvailable = profileData.availability_status === 'Available';
    const isVerified = profileData.verify_status === 'Verified';
    
    if (!isAvailable || !isVerified) {
      return (
        <div className={`status-banner ${!isAvailable ? 'unavailable' : ''} ${!isVerified ? 'unverified' : ''}`}>
          {!isAvailable && (
            <p>
              Your current status is "{profileData.availability_status}". You cannot apply for jobs until
              your status is set to "Available".
              <button onClick={handleUpdateAvailability} className="update-status-btn">
                Update Status
              </button>
            </p>
          )}
          {!isVerified && (
            <p>
              Your account is not verified ({profileData.verify_status}). 
              {profileData.verify_status === 'Not Verified' && profileData.denial_reason && (
                <span> Reason: {profileData.denial_reason}</span>
              )}
              
            </p>
          )}
        </div>
      );
    }
    
    return null;
  };

  return (
    <div className="jobs-container">
      <div className="jobs-card">
        <h2 className="jobs-title">Available Jobs</h2>
        
        <StatusBanner />
        
        <div className="filters">
          <div className="search-bar">
            <input
              type="text"
              placeholder="Search by title, description, or client name..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="search-input"
            />
          </div>
          <div className="sort-filter">
            <select
              value={sortOrder}
              onChange={handleSortChange}
              className="sort-select"
            >
              <option value="default">Default Order</option>
              <option value="newest">Newest First</option>
            </select>
          </div>
        </div>
        
        {filteredJobs.length === 0 ? (
          <p className="empty-message">No open jobs match your search.</p>
        ) : (
          <div className="job-list">
            <ul className="job-list-ul">
              {currentJobs.map((job) => (
                <li key={job.job_id} className="job-item">
                  <h3>Client: {job.client_id?.name || 'N/A'}</h3>
                  <h4>{job.title || 'Untitled Job'}</h4>
                  <p>{job.description || 'No description provided'}</p>
                  <p>Budget: ${job.budget || 'N/A'}</p>
                  <p>Deadline: {job.deadline ? new Date(job.deadline).toLocaleDateString() : 'N/A'}</p>
                  <p>Advance Payment: {job.advance_payment ? `$${job.advance_payment}` : 'None'}</p>
                  <p>Posted: {job.created_at ? new Date(job.created_at).toLocaleString() : 'N/A'}</p>
                  <button
                    className={`apply-button ${!canApplyForJobs() ? 'disabled' : ''}`}
                    onClick={() => handleApply(job.job_id)}
                    disabled={!canApplyForJobs()}
                  >
                    Apply
                  </button>
                </li>
              ))}
            </ul>
            <div className="pagination-container">
              {totalPages > 1 && (
                <div className="pagination">
                  <button
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="page-btn"
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }, (_, index) => (
                    <button
                      key={index + 1}
                      onClick={() => paginate(index + 1)}
                      className={`page-btn ${currentPage === index + 1 ? 'active' : ''}`}
                    >
                      {index + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="page-btn"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
        <p className="back-link">
          <a href="#" onClick={() => navigate('/professional-dashboard')}>
            Back to Dashboard
          </a>
        </p>
      </div>
    </div>
  );
}

export default ProfessionalJobs;