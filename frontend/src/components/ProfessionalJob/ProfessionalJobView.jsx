import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { AuthContext } from '../../context/AuthContext';
import './ProfessionalJobView.css';

const baseUrl = import.meta.env.VITE_API_URL;

// Updated File Display Component for Cloudinary
const FileAttachment = ({ attachmentData }) => {
  if (!attachmentData) return null;

  const getFileIcon = (fileName) => {
    const extension = fileName.toLowerCase().split('.').pop();
    switch (extension) {
      case 'pdf': return '📄';
      case 'doc':
      case 'docx': return '📝';
      case 'xls':
      case 'xlsx': return '📊';
      case 'ppt':
      case 'pptx': return '📋';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif': return '🖼️';
      case 'zip':
      case 'rar': return '📦';
      default: return '📎';
    }
  };

  // Handle both new structured format and legacy URL format
  const getAttachmentInfo = (attachment) => {
    if (!attachment) {
      return { filename: '', url: '', downloadUrl: '' };
    }

    // If attachment has structured data (new format)
    if (typeof attachment === 'object' && attachment.attachment_url) {
      return {
        filename: attachment.attachment_filename || 'attachment',
        url: attachment.attachment_url,
        downloadUrl: attachment.attachment_download_url || attachment.attachment_url
      };
    }

    // Legacy format: attachment is a URL string
    if (typeof attachment === 'string') {
      const filename = attachment.includes('/') 
        ? decodeURIComponent(attachment.split('/').pop()) 
        : attachment;
      
      const fullUrl = attachment.startsWith('http') 
        ? attachment 
        : `${baseUrl}${attachment.startsWith('/') ? '' : '/'}${attachment}`;

      return {
        filename,
        url: fullUrl,
        downloadUrl: fullUrl
      };
    }

    return { filename: 'Unknown file', url: '', downloadUrl: '' };
  };

  const attachmentInfo = getAttachmentInfo(attachmentData);

  if (!attachmentInfo.url) return null;

  return (
    <div className="file-attachment">
      <div className="file-attachment-header">
        <span className="attachment-icon">📎</span>
        <span className="attachment-label">Project Documents</span>
      </div>
      <div className="file-preview-compact">
        <span className="file-icon">{getFileIcon(attachmentInfo.filename)}</span>
        <div className="file-info">
          <div className="file-name" title={attachmentInfo.filename}>
            {attachmentInfo.filename}
          </div>
          {process.env.NODE_ENV === 'development' && (
            <div className="file-url-debug" style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
              URL: {attachmentInfo.url}
            </div>
          )}
          <a 
            href={attachmentInfo.downloadUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="file-download-link"
            onClick={(e) => {
              e.stopPropagation();
              console.log('Downloading attachment:', attachmentInfo.downloadUrl);
            }}
          >
            View/Download
          </a>
        </div>
      </div>
    </div>
  );
};

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
        const response = await axios.get(`${baseUrl}/api/profile/`, {
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
        const response = await axios.get(`${baseUrl}/api/open-jobs/`, {
          withCredentials: true,
        });
        console.log('Fetched jobs with attachments:', response.data); // Debug log
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
    
    return isAvailable;
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
        `${baseUrl}/api/apply-to-job/`,
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

  // Helper function to get attachment data from job
  const getJobAttachment = (job) => {
    // Check for new structured format first
    if (job.attachment_url || job.attachment_download_url || job.attachment_filename) {
      return {
        attachment_url: job.attachment_url,
        attachment_download_url: job.attachment_download_url,
        attachment_filename: job.attachment_filename
      };
    }
    
    // Fallback to legacy attachment field
    if (job.attachment) {
      return job.attachment;
    }
    
    return null;
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
          <div className="loading-message">Loading available jobs...</div>
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
              style={{color:"black"}}
            >
              <option value="default">Default Order</option>
              <option value="newest">Newest First</option>
            </select>
          </div>
        </div>
        
        {filteredJobs.length === 0 ? (
          <div className="empty-message">
            No open jobs match your search criteria.
          </div>
        ) : (
          <div className="job-list">
            <ul className="job-list-ul">
              {currentJobs.map((job) => {
                const attachmentData = getJobAttachment(job);
                
                return (
                  <li key={job.job_id} className="job-item">
                    <div className="job-header">
                      <h3>Client: {job.client_id?.name || 'N/A'}</h3>
                      <h4>{job.title || 'Untitled Job'}</h4>
                    </div>
                    
                    <div className="job-content">
                      <p className="job-description">{job.description || 'No description provided'}</p>
                      
                      {/* Updated File Attachment Display */}
                      {attachmentData && (
                        <FileAttachment attachmentData={attachmentData} />
                      )}
                      
                      <div className="job-details">
                        <div className="job-detail-item budget">
                          <span className="detail-icon">💰</span>
                          <span className="detail-label">Budget:</span>
                          <span className="detail-value">{formatCurrency(job.budget)}</span>
                        </div>
                        <div className="job-detail-item deadline">
                          <span className="detail-icon">📅</span>
                          <span className="detail-label">Deadline:</span>
                          <span className="detail-value">{formatDate(job.deadline)}</span>
                        </div>
                        <div className="job-detail-item advance">
                          <span className="detail-icon">💳</span>
                          <span className="detail-label">Advance:</span>
                          <span className="detail-value">
                            {job.advance_payment ? formatCurrency(job.advance_payment) : 'None'}
                          </span>
                        </div>
                        <div className="job-detail-item posted">
                          <span className="detail-icon">🕒</span>
                          <span className="detail-label">Posted:</span>
                          <span className="detail-value">{formatDateTime(job.created_at)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="job-actions">
                      <button
                        className={`apply-button ${!canApplyForJobs() ? 'disabled' : ''}`}
                        onClick={() => handleApply(job.job_id)}
                        disabled={!canApplyForJobs()}
                      >
                        {canApplyForJobs() ? '🚀 Apply Now' : '❌ Cannot Apply'}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            
            {totalPages > 1 && (
              <div className="pagination-container">
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
              </div>
            )}
          </div>
        )}
        
        <div className="back-link">
          <a href="#" onClick={(e) => { e.preventDefault(); navigate('/professional-dashboard'); }}>
            Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}

export default ProfessionalJobs;