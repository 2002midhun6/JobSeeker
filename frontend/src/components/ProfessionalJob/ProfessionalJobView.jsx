import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { AuthContext } from '../../context/AuthContext';
import './ProfessionalJobView.css';

const baseUrl = import.meta.env.VITE_API_URL;

// Updated File Display Component for Job Documents
const JobDocumentAttachment = ({ documentData, documentInfo }) => {
  if (!documentData && !documentInfo) return null;

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
      case 'txt': return '📃';
      default: return '📎';
    }
  };

  const getFileTypeCategory = (fileName) => {
    const extension = fileName.toLowerCase().split('.').pop();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(extension)) {
      return 'image';
    } else if (extension === 'pdf') {
      return 'pdf';
    } else if (['doc', 'docx'].includes(extension)) {
      return 'document';
    } else if (['xls', 'xlsx'].includes(extension)) {
      return 'spreadsheet';
    } else if (['ppt', 'pptx'].includes(extension)) {
      return 'presentation';
    } else if (['zip', 'rar', '7z'].includes(extension)) {
      return 'archive';
    } else if (extension === 'txt') {
      return 'text';
    }
    return 'other';
  };

  const getViewButtonText = (fileName) => {
    const fileType = getFileTypeCategory(fileName);
    switch (fileType) {
      case 'image': return 'View Image';
      case 'pdf': return 'View PDF';
      case 'document': return 'View Document';
      case 'spreadsheet': return 'View Spreadsheet';
      case 'presentation': return 'View Presentation';
      case 'archive': return 'Download Archive';
      case 'text': return 'View Text';
      default: return 'View File';
    }
  };

  const createCloudinaryUrl = (originalUrl, transformation) => {
    if (!originalUrl || !originalUrl.includes('cloudinary.com')) {
      return originalUrl;
    }
    
    // Split URL at /upload/
    const urlParts = originalUrl.split('/upload/');
    if (urlParts.length !== 2) return originalUrl;
    
    const baseUrl = urlParts[0] + '/upload/';
    const pathAfterUpload = urlParts[1];
    
    return `${baseUrl}${transformation}/${pathAfterUpload}`;
  };

  const openFilePreview = (url, fileName, docInfo = null) => {
    if (!url) return;
    
    console.log('Opening job document:', { url, fileName, docInfo });
    
    // Use document info if available, otherwise detect from filename
    const fileType = docInfo?.file_type ? 
      getFileTypeCategory(`dummy.${docInfo.file_type}`) : 
      getFileTypeCategory(fileName);
    
    // Create appropriate URLs for different file types
    let viewUrl = url;
    let downloadUrl = url;
    
    if (docInfo?.view_url) {
      viewUrl = docInfo.view_url;
    } else if (url.includes('cloudinary.com')) {
      if (fileType === 'pdf') {
        // For PDFs, use fl_inline to force browser viewing
        viewUrl = createCloudinaryUrl(url, 'fl_inline');
      } else if (fileType === 'image') {
        // Images can use original URL
        viewUrl = url;
      } else {
        // Other documents, try inline first
        viewUrl = createCloudinaryUrl(url, 'fl_inline');
      }
    }
    
    if (docInfo?.download_url) {
      downloadUrl = docInfo.download_url;
    } else if (url.includes('cloudinary.com')) {
      downloadUrl = createCloudinaryUrl(url, 'fl_attachment');
    }
    
    console.log('Generated URLs for job document:', { viewUrl, downloadUrl, fileType });
    
    if (fileType === 'image') {
      // For images, open in new tab
      window.open(viewUrl, '_blank');
    } else if (fileType === 'pdf') {
      // For PDFs, create a custom viewer
      try {
        const pdfWindow = window.open('', '_blank');
        if (pdfWindow) {
          pdfWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>Job Document - ${fileName}</title>
              <style>
                body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
                .header { 
                  background: #f5f5f5; 
                  padding: 15px; 
                  margin-bottom: 10px; 
                  border-radius: 5px;
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                }
                .title { font-size: 18px; font-weight: bold; }
                .download-btn { 
                  background: #007bff; 
                  color: white; 
                  padding: 10px 20px; 
                  text-decoration: none; 
                  border-radius: 5px; 
                  font-weight: bold;
                }
                .download-btn:hover { background: #0056b3; }
                iframe { width: 100%; height: calc(100vh - 100px); border: 1px solid #ddd; }
                .error { 
                  color: red; 
                  margin: 20px; 
                  padding: 15px; 
                  background: #ffe6e6; 
                  border-radius: 5px; 
                }
                .loading { 
                  text-align: center; 
                  padding: 50px; 
                  font-size: 16px; 
                }
              </style>
            </head>
            <body>
              <div class="header">
                <div class="title">📄 Job Document: ${fileName}</div>
                <a href="${downloadUrl}" class="download-btn" download>Download PDF</a>
              </div>
              <div class="loading">Loading PDF...</div>
              <iframe 
                src="${viewUrl}" 
                title="Job Document Viewer" 
                onload="document.querySelector('.loading').style.display='none'; this.style.display='block'" 
                onerror="document.getElementById('error').style.display='block'; document.querySelector('.loading').style.display='none'"
                style="display:none"
              >
                <p>Your browser does not support PDFs. <a href="${downloadUrl}">Download the PDF</a>.</p>
              </iframe>
              <div id="error" class="error" style="display:none">
                <h3>⚠️ Failed to load PDF</h3>
                <p>The PDF could not be displayed in your browser. This might be due to:</p>
                <ul>
                  <li>Browser security settings</li>
                  <li>PDF file format issues</li>
                  <li>Network connectivity</li>
                </ul>
                <p><a href="${downloadUrl}" class="download-btn">Click here to download the PDF</a> instead.</p>
              </div>
            </body>
            </html>
          `);
          pdfWindow.document.close();
        } else {
          // Popup blocked, fallback to download
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = fileName;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } catch (error) {
        console.error('Error opening PDF:', error);
        // Force download on error
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = fileName;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } else {
      // For other files, try view first, then download
      try {
        const fileWindow = window.open(viewUrl, '_blank');
        if (!fileWindow) {
          // Fallback to download
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = fileName;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } catch (error) {
        // Force download on error
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = fileName;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  };

  // Get document information
  const getDocumentInfo = () => {
    // If we have structured document info, use it
    if (documentInfo) {
      return {
        filename: documentInfo.filename || 'Job Document',
        url: documentData || documentInfo.url,
        info: documentInfo
      };
    }
    
    // If we only have the document URL, extract filename
    if (documentData) {
      let filename = 'Job Document';
      if (typeof documentData === 'string') {
        if (documentData.includes('cloudinary.com')) {
          const parts = documentData.split('/');
          filename = decodeURIComponent(parts[parts.length - 1].split('?')[0]);
        } else {
          filename = decodeURIComponent(documentData.split('/').pop().split('?')[0]);
        }
      }
      
      return {
        filename,
        url: documentData,
        info: null
      };
    }
    
    return null;
  };

  const docInfo = getDocumentInfo();
  if (!docInfo || !docInfo.url) return null;

  return (
    <div className="file-attachment">
      <div className="file-attachment-header">
        <span className="attachment-icon">📎</span>
        <span className="attachment-label">Project Documents</span>
      </div>
      <div className="file-preview-compact">
        <span className="file-icon">{getFileIcon(docInfo.filename)}</span>
        <div className="file-info">
          <div className="file-name" title={docInfo.filename}>
            {docInfo.filename}
          </div>
          {process.env.NODE_ENV === 'development' && (
            <div className="file-url-debug" style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>
              URL: {docInfo.url}
            </div>
          )}
          <button
            className="file-view-button"
            onClick={(e) => {
              e.stopPropagation();
              openFilePreview(docInfo.url, docInfo.filename, docInfo.info);
            }}
          >
            {getViewButtonText(docInfo.filename)}
          </button>
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
  const [sortOrder, setSortOrder] = useState('default');
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
        console.log('Fetched jobs with documents:', response.data); // Debug log
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
    if (!profileData) return false;
    const isAvailable = profileData.availability_status === 'Available';
    return isAvailable;
  }, [profileData]);

  const handleApply = async (jobId) => {
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
        return new Date(b.created_at) - new Date(a.created_at);
      }
      return 0;
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
    setCurrentPage(1);
  };

  const handleSortChange = (e) => {
    setSortOrder(e.target.value);
    setCurrentPage(1);
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

  // Helper function to get job document data
  const getJobDocument = (job) => {
    // Check for document_url field (main document URL)
    if (job.document_url) {
      return {
        documentData: job.document_url,
        documentInfo: job.document_info || null
      };
    }
    
    // Fallback to document field
    if (job.document) {
      return {
        documentData: job.document,
        documentInfo: job.document_info || null
      };
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
                const documentData = getJobDocument(job);
                
                return (
                  <li key={job.job_id} className="job-item">
                    <div className="job-header">
                      <h3>Client: {job.client_id?.name || 'N/A'}</h3>
                      <h4>{job.title || 'Untitled Job'}</h4>
                    </div>
                    
                    <div className="job-content">
                      <p className="job-description">{job.description || 'No description provided'}</p>
                      
                      {/* Updated Job Document Display */}
                      {documentData && (
                        <JobDocumentAttachment 
                          documentData={documentData.documentData} 
                          documentInfo={documentData.documentInfo}
                        />
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