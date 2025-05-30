import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { AuthContext } from '../../context/AuthContext';
import './ClientProject.css';
const baseUrl = import.meta.env.VITE_API_URL;

// Enhanced Spinner Component
const Spinner = ({ size = 'medium', text = 'Loading...', fullPage = false }) => {
  const spinnerStyles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: fullPage ? '60px 20px' : '40px 20px',
      backgroundColor: fullPage ? 'rgba(255, 255, 255, 0.95)' : 'transparent',
      borderRadius: fullPage ? '20px' : '0',
      ...(fullPage && {
        minHeight: '400px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.1)',
        backdropFilter: 'blur(10px)',
      })
    },
    spinner: {
      width: size === 'small' ? '28px' : size === 'large' ? '64px' : '48px',
      height: size === 'small' ? '28px' : size === 'large' ? '64px' : '48px',
      border: `${size === 'small' ? '3px' : '4px'} solid transparent`,
      borderTop: `${size === 'small' ? '3px' : '4px'} solid #3b82f6`,
      borderRight: `${size === 'small' ? '3px' : '4px'} solid #10b981`,
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
      marginBottom: '20px',
    },
    text: {
      color: '#4a5568',
      fontSize: size === 'small' ? '14px' : size === 'large' ? '20px' : '18px',
      fontWeight: '600',
      textAlign: 'center',
    }
  };

  return (
    <div style={spinnerStyles.container}>
      <div style={spinnerStyles.spinner}></div>
      <span style={spinnerStyles.text}>{text}</span>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

// Project Statistics Component
const ProjectStats = ({ projects }) => {
  const totalProjects = projects.pending.length + projects.active.length + projects.completed.length;
  const totalBudget = [...projects.pending, ...projects.active, ...projects.completed]
    .reduce((sum, project) => sum + (project.budget || 0), 0);
  
  const avgRating = projects.completed.filter(p => p.rating).length > 0 
    ? (projects.completed.filter(p => p.rating).reduce((sum, p) => sum + p.rating, 0) / 
       projects.completed.filter(p => p.rating).length).toFixed(1) 
    : null;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-icon">📊</div>
        <div className="stat-content">
          <div className="stat-number">{totalProjects}</div>
          <div className="stat-label">Total Projects</div>
        </div>
      </div>
      
      <div className="stat-card">
        <div className="stat-icon">📝</div>
        <div className="stat-content">
          <div className="stat-number">{projects.pending.length}</div>
          <div className="stat-label">Pending</div>
        </div>
      </div>
      
      <div className="stat-card">
        <div className="stat-icon">🚀</div>
        <div className="stat-content">
          <div className="stat-number">{projects.active.length}</div>
          <div className="stat-label">Active</div>
        </div>
      </div>
      
      <div className="stat-card">
        <div className="stat-icon">✅</div>
        <div className="stat-content">
          <div className="stat-number">{projects.completed.length}</div>
          <div className="stat-label">Completed</div>
        </div>
      </div>
      
      {avgRating && (
        <div className="stat-card">
          <div className="stat-icon">⭐</div>
          <div className="stat-content">
            <div className="stat-number">{avgRating}/5</div>
            <div className="stat-label">Avg Rating</div>
          </div>
        </div>
      )}
    </div>
  );
};

// Enhanced Search and Filter Component
const SearchAndFilter = ({ searchQuery, onSearchChange, activeTab, onTabChange, projects, filteredProjects }) => {
  const getTabCount = (tab) => {
    if (tab === 'all') return Object.values(filteredProjects).flat().length;
    return filteredProjects[tab]?.length || 0;
  };

  return (
    <div className="search-filter-container">
      <div className="search-section">
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by title, description, or budget..."
            value={searchQuery}
            onChange={onSearchChange}
            className="search-input"
          />
          {searchQuery && (
            <button 
              className="clear-search"
              onClick={() => onSearchChange({ target: { value: '' } })}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </div>
      
      <div className="tabs-section">
        <div className="tab-buttons">
          {[
            { key: 'all', label: 'All Projects', icon: '📁' },
            { key: 'pending', label: 'Pending', icon: '📝' },
            { key: 'active', label: 'Active', icon: '🚀' },
            { key: 'completed', label: 'Completed', icon: '✅' }
          ].map(tab => (
            <button
              key={tab.key}
              className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => onTabChange(tab.key)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-text">{tab.label}</span>
              <span className="tab-count">{getTabCount(tab.key)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// Enhanced Project Card Component
const ProjectCard = ({ project, type, onEdit, onViewApplications, onDelete, onRateProject, tempRating, tempReview, onStarClick, onReviewChange, onSubmitRating }) => {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return { bg: '#fef3c7', text: '#d97706', badge: '#f59e0b' };
      case 'active': return { bg: '#dbeafe', text: '#1d4ed8', badge: '#3b82f6' };
      case 'completed': return { bg: '#dcfce7', text: '#15803d', badge: '#22c55e' };
      default: return { bg: '#f1f5f9', text: '#475569', badge: '#64748b' };
    }
  };

  const statusColors = getStatusColor(type);

  return (
    <div className="project-card">
      <div className="card-header">
        <div className="project-title-section">
          <h3 className="project-title">{project.title || 'Untitled Project'}</h3>
          <div 
            className="status-badge"
            style={{ backgroundColor: statusColors.badge }}
          >
            {type === 'pending' && '📝 Pending'}
            {type === 'active' && '🚀 Active'}
            {type === 'completed' && '✅ Completed'}
          </div>
        </div>
      </div>

      <div className="card-body">
        <div className="project-description">
          <p>{project.description || 'No description provided'}</p>
        </div>

        <div className="project-details-grid">
          <div className="detail-item">
            <span className="detail-label">💰 Budget</span>
            <span className="detail-value">{formatCurrency(project.budget || 0)}</span>
          </div>
          
          {project.advance_payment && (
            <div className="detail-item">
              <span className="detail-label">💳 Advance</span>
              <span className="detail-value">{formatCurrency(project.advance_payment)}</span>
            </div>
          )}
          
          <div className="detail-item">
            <span className="detail-label">📅 Deadline</span>
            <span className="detail-value">{formatDate(project.deadline)}</span>
          </div>
          
          {type === 'pending' && (
            <div className="detail-item">
              <span className="detail-label">👥 Applicants</span>
              <span className="detail-value">{project.applicants_count || 0}</span>
            </div>
          )}
          
          {project.rating && (
            <div className="detail-item">
              <span className="detail-label">⭐ Rating</span>
              <span className="detail-value">{project.rating}/5</span>
            </div>
          )}
        </div>

        {/* Rating Section for Completed Projects */}
        {type === 'completed' && (
          <div className="rating-section">
            <h4 className="rating-title">Rate Professional</h4>
            <div className="star-rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={`star ${((tempRating[project.job_id] || project.rating || 0) >= star) ? 'filled' : ''}`}
                  onClick={() => onStarClick(project.job_id, star)}
                >
                  ★
                </span>
              ))}
            </div>
            
            <div className="review-section">
              <textarea
                placeholder="Write your review here (optional, max 500 characters)..."
                value={tempReview[project.job_id] || ''}
                onChange={(e) => onReviewChange(project.job_id, e.target.value)}
                maxLength={500}
                rows={3}
                disabled={!!project.rating && !tempRating[project.job_id]}
                className="review-textarea"
              />
              <div className="character-count">
                {(tempReview[project.job_id] || '').length}/500
              </div>
            </div>

            {tempRating[project.job_id] && (
              <button
                className="submit-rating-btn"
                onClick={() => onSubmitRating(project.job_id)}
              >
                <span className="btn-icon">📝</span>
                Submit Rating & Review
              </button>
            )}

            {project.rating && !tempRating[project.job_id] && (
              <div className="current-rating">
                <div className="rating-display">
                  <span className="rating-label">Current Rating:</span>
                  <span className="rating-value">{project.rating}/5 ⭐</span>
                </div>
                {project.review && (
                  <div className="review-display">
                    <span className="review-label">Review:</span>
                    <p className="review-text">"{project.review}"</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card-actions">
        {type === 'pending' && (
          <>
            <button
              onClick={() => onViewApplications(project.job_id)}
              className="action-btn primary"
            >
              <span className="btn-icon">👥</span>
              View Applications ({project.applicants_count || 0})
            </button>
            {(project.applicants_count === 0 || !project.applicants_count) && (
              <div className="action-buttons-group">
                <button
                  onClick={() => onEdit(project.job_id)}
                  className="action-btn secondary"
                >
                  <span className="btn-icon">✏️</span>
                  Edit Project
                </button>
                <button
                  onClick={() => onDelete(project.job_id)}
                  className="action-btn danger"
                >
                  <span className="btn-icon">🗑️</span>
                  Delete Project
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// Enhanced Pagination Component
const PaginationControls = ({ currentPage, totalItems, itemsPerPage, onPageChange, section }) => {
  const pageCount = Math.ceil(totalItems / itemsPerPage);
  
  if (pageCount <= 1) return null;

  const getVisiblePages = () => {
    const pages = [];
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(pageCount, currentPage + 2);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className="pagination-enhanced">
      <div className="pagination-info">
        Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} projects
      </div>
      
      <div className="pagination-controls">
        <button
          disabled={currentPage === 1}
          onClick={() => onPageChange(section, currentPage - 1)}
          className="page-btn"
          title="Previous page"
        >
          ← Previous
        </button>
        
        {getVisiblePages().map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(section, page)}
            className={`page-btn ${currentPage === page ? 'active' : ''}`}
          >
            {page}
          </button>
        ))}
        
        <button
          disabled={currentPage === pageCount}
          onClick={() => onPageChange(section, currentPage + 1)}
          className="page-btn"
          title="Next page"
        >
          Next →
        </button>
      </div>
    </div>
  );
};

function ClientProjects() {
  const authContext = React.useContext(AuthContext);
  const navigate = useNavigate();
  const { user, isAuthenticated, token } = authContext || { user: null, isAuthenticated: false, token: null };

  const [projects, setProjects] = useState({ pending: [], active: [], completed: [] });
  const [filteredProjects, setFilteredProjects] = useState({ pending: [], active: [], completed: [] });
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [ratings, setRatings] = useState({});
  const [tempRating, setTempRating] = useState({});
  const [tempReview, setTempReview] = useState({});
  const [currentPage, setCurrentPage] = useState({
    pending: 1,
    active: 1,
    completed: 1,
  });
  const itemsPerPage = 6;

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await axios.get(`${baseUrl}/api/client-project/`, {
          withCredentials: true,
        });
        const enrichedProjects = {
          pending: response.data.pending,
          active: response.data.active,
          completed: response.data.completed.map(project => ({
            ...project,
            rating: project.rating || null,
            review: project.review || null,
          })),
        };
        setProjects(enrichedProjects);
        setFilteredProjects(enrichedProjects);
        setLoading(false);
      } catch (err) {
        const errorMessage = err.response?.data?.error || 'Failed to fetch projects';
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

    if (isAuthenticated && user && user.role === 'client') {
      fetchProjects();
    }
  }, [isAuthenticated, user, token, navigate]);

  useEffect(() => {
    if (!isAuthenticated || !user || user.role !== 'client') {
      navigate('/login');
    }
  }, [user, isAuthenticated, navigate]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredProjects(projects);
      setCurrentPage({ pending: 1, active: 1, completed: 1 });
      return;
    }

    const filterProjects = (projectList) =>
      projectList.filter(
        (project) =>
          project.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          project.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          project.budget?.toString().includes(searchQuery)
      );

    setFilteredProjects({
      pending: filterProjects(projects.pending),
      active: filterProjects(projects.active),
      completed: filterProjects(projects.completed),
    });
    setCurrentPage({ pending: 1, active: 1, completed: 1 });
  }, [searchQuery, projects]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentPage((prev) => ({ ...prev, [tab]: 1 }));
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleStarClick = (jobId, rating) => {
    setTempRating((prev) => ({ ...prev, [jobId]: rating }));
  };

  const handleReviewChange = (jobId, review) => {
    setTempReview((prev) => ({ ...prev, [jobId]: review }));
  };

  const handleSubmitRating = async (jobId) => {
    const rating = tempRating[jobId];
    const review = tempReview[jobId] || '';

    if (!rating) {
      Swal.fire({
        icon: 'warning',
        title: 'No Rating Selected',
        text: 'Please select a star rating before submitting.',
        confirmButtonColor: '#dc3545',
      });
      return;
    }

    if (review.length > 500) {
      Swal.fire({
        icon: 'warning',
        title: 'Review Too Long',
        text: 'Review cannot exceed 500 characters.',
        confirmButtonColor: '#dc3545',
      });
      return;
    }

    try {
      const response = await axios.post(
        `${baseUrl}/api/submit-review/`,
        { job_id: jobId, rating, review },
        { withCredentials: true }
      );
      
      Swal.fire({
        icon: 'success',
        title: 'Review Submitted! 🎉',
        text: 'Your rating and review have been successfully submitted.',
        confirmButtonColor: '#28a745',
        timer: 3000,
        timerProgressBar: true,
      });

      const updateProjects = (projectList) =>
        projectList.map((project) =>
          project.job_id === jobId ? { ...project, rating, review } : project
        );

      setProjects((prev) => ({
        ...prev,
        completed: updateProjects(prev.completed),
      }));
      setFilteredProjects((prev) => ({
        ...prev,
        completed: updateProjects(prev.completed),
      }));
      setRatings((prev) => ({ ...prev, [jobId]: rating }));
      setTempRating((prev) => ({ ...prev, [jobId]: undefined }));
      setTempReview((prev) => ({ ...prev, [jobId]: undefined }));
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to submit rating and review';
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
        confirmButtonColor: '#dc3545',
      });
    }
  };

  const handleDeleteProject = async (jobId) => {
    try {
      const result = await Swal.fire({
        title: 'Delete Project?',
        text: "This action cannot be undone. Are you sure you want to delete this project?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Yes, delete it!',
        cancelButtonText: 'Cancel'
      });

      if (result.isConfirmed) {
        // Show loading
        Swal.fire({
          title: 'Deleting...',
          text: 'Please wait while we delete your project.',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        const response = await axios.delete(`${baseUrl}/api/jobs/${jobId}/`, {
          withCredentials: true,
        });

        // Remove the deleted project from state
        const updateProjects = (projectList) => 
          projectList.filter(project => project.job_id !== jobId);

        setProjects(prev => ({
          ...prev,
          pending: updateProjects(prev.pending)
        }));

        setFilteredProjects(prev => ({
          ...prev,
          pending: updateProjects(prev.pending)
        }));

        Swal.fire({
          icon: 'success',
          title: 'Deleted!',
          text: response.data.message || 'Project has been successfully deleted.',
          confirmButtonColor: '#28a745',
          timer: 3000,
          timerProgressBar: true,
        });
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to delete project';
      Swal.fire({
        icon: 'error',
        title: 'Delete Failed',
        text: errorMessage,
        confirmButtonColor: '#dc3545',
      });
    }
  };

  const paginate = (items, page) => {
    const startIndex = (page - 1) * itemsPerPage;
    return items.slice(startIndex, startIndex + itemsPerPage);
  };

  const handlePageChange = (tab, page) => {
    setCurrentPage((prev) => ({ ...prev, [tab]: page }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getProjectsToShow = () => {
    if (activeTab === 'all') {
      return [
        ...filteredProjects.pending.map(p => ({ ...p, type: 'pending' })),
        ...filteredProjects.active.map(p => ({ ...p, type: 'active' })),
        ...filteredProjects.completed.map(p => ({ ...p, type: 'completed' }))
      ];
    }
    return filteredProjects[activeTab]?.map(p => ({ ...p, type: activeTab })) || [];
  };

  const projectsToShow = getProjectsToShow();
  const currentPageNum = activeTab === 'all' ? 1 : currentPage[activeTab];
  const paginatedProjects = paginate(projectsToShow, currentPageNum);

  if (!isAuthenticated || !user) return null;

  return (
    <div className="client-projects-container">
      {/* Header */}
      <div className="projects-header">
        <div className="header-content">
          <h2>
            <span className="header-icon">📁</span>
            My Projects
          </h2>
          <p className="header-subtitle">
            Manage and track all your project activities
          </p>
        </div>
        
        <div className="header-actions">
          <button 
            onClick={() => navigate('/client-job')}
            className="create-project-btn"
          >
            <span className="btn-icon">➕</span>
            Create New Project
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <Spinner size="large" text="Loading your projects..." fullPage={true} />
        </div>
      ) : error ? (
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <div className="error-content">
            <h3>Something went wrong</h3>
            <p>{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="retry-button"
            >
              Try Again
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Statistics */}
          <ProjectStats projects={projects} />

          {/* Search and Filter */}
          <SearchAndFilter
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            projects={projects}
            filteredProjects={filteredProjects}
          />

          {/* Content */}
          {projectsToShow.length === 0 ? (
            <div className="empty-state">
              <div className="empty-content">
                <div className="empty-icon">
                  {searchQuery ? '🔍' : '📁'}
                </div>
                <h3>
                  {searchQuery ? 'No projects found' : 'No projects yet'}
                </h3>
                <p>
                  {searchQuery 
                    ? `No projects match "${searchQuery}"`
                    : "You haven't created any projects yet."
                  }
                </p>
                
                <div className="empty-actions">
                  {searchQuery ? (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="action-button secondary"
                    >
                      Clear Search
                    </button>
                  ) : (
                    <button 
                      onClick={() => navigate('/create-job')}
                      className="action-button primary"
                    >
                      <span className="button-icon">🚀</span>
                      Create Your First Project
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="projects-grid">
                {paginatedProjects.map((project) => (
                  <ProjectCard
                    key={project.job_id}
                    project={project}
                    type={project.type}
                    onEdit={(jobId) => navigate(`/edit-project/${jobId}`)}
                    onDelete={handleDeleteProject}
                    onViewApplications={(jobId) => navigate(`/job-applications/${jobId}`)}
                    tempRating={tempRating}
                    tempReview={tempReview}
                    onStarClick={handleStarClick}
                    onReviewChange={handleReviewChange}
                    onSubmitRating={handleSubmitRating}
                  />
                ))}
              </div>

              {/* Pagination */}
              <PaginationControls
                currentPage={currentPageNum}
                totalItems={projectsToShow.length}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
                section={activeTab}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}

export default ClientProjects;