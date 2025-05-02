import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { AuthContext } from '../../context/AuthContext';
import './ClientProject.css';

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
  const [tempReview, setTempReview] = useState({}); // New state for reviews
  const [currentPage, setCurrentPage] = useState({
    pending: 1,
    active: 1,
    completed: 1,
  });
  const itemsPerPage = 5;

  useEffect(() => {
    const fetchProjects = async () => {
     
      try {
        const response = await axios.get('http://localhost:8000/api/client-project/', {
          withCredentials: true,
          
        });
        const enrichedProjects = {
          pending: response.data.pending,
          active: response.data.active,
          completed: response.data.completed.map(project => ({
            ...project,
            rating: project.rating || null,
            review: project.review || null, // Include review
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
          project.description?.toLowerCase().includes(searchQuery.toLowerCase())
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
        'http://localhost:8000/api/submit-review/',
        { job_id: jobId, rating, review },
        { withCredentials: true,  }
      );
      Swal.fire({
        icon: 'success',
        title: 'Review Submitted',
        text: 'Your rating and review have been successfully submitted.',
        confirmButtonColor: '#28a745',
        timer: 3000,
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
    <div className="client-projects-container">
      <div className="projects-content">
        <h2>My Projects</h2>
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search by title or description..."
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
          <p className="loading-message">Loading projects...</p>
        ) : (
          <div className="tabs-container">
            {(activeTab === 'all' || activeTab === 'pending') && (
              <section className="tab-section">
                <h3>Pending Projects (Open)</h3>
                {filteredProjects.pending.length === 0 ? (
                  <p className="empty-message">No pending projects found.</p>
                ) : (
                  <>
                    <ul className="project-list">
                      {paginate(filteredProjects.pending, currentPage.pending).map((project) => (
                        <li key={project.job_id} className="project-item">
                          <h4>{project.title || 'Untitled Project'}</h4>
                          <p>Description: {project.description || 'N/A'}</p>
                          <p>Budget: ${project.budget || 'N/A'}</p>
                          <p>Advance Payment: {project.advance_payment ? `$${project.advance_payment}` : 'None'}</p>
                          <p>Deadline: {project.deadline ? new Date(project.deadline).toLocaleDateString() : 'N/A'}</p>
                          <p>Applicants: {project.applicants_count || 0}</p>
                          <div className="project-actions">
                            <button
                              onClick={() => navigate(`/job-applications/${project.job_id}`)}
                              className="view-applications-btn"
                            >
                              View Applications
                            </button>
                            {project.applicants_count === 0 && (
                              <button
                                onClick={() => navigate(`/edit-project/${project.job_id}`)}
                                className="edit-project-btn"
                              >
                                Edit
                              </button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                    <PaginationControls tab="pending" totalItems={filteredProjects.pending} />
                  </>
                )}
              </section>
            )}

            {(activeTab === 'all' || activeTab === 'active') && (
              <section className="tab-section">
                <h3>Active Projects (Assigned)</h3>
                {filteredProjects.active.length === 0 ? (
                  <p className="empty-message">No active projects found.</p>
                ) : (
                  <>
                    <ul className="project-list">
                      {paginate(filteredProjects.active, currentPage.active).map((project) => (
                        <li key={project.job_id} className="project-item">
                          <h4>{project.title || 'Untitled Project'}</h4>
                          <p>Description: {project.description || 'N/A'}</p>
                          <p>Budget: ${project.budget || 'N/A'}</p>
                          <p>Advance Payment: {project.advance_payment ? `$${project.advance_payment}` : 'None'}</p>
                          <p>Deadline: {project.deadline ? new Date(project.deadline).toLocaleDateString() : 'N/A'}</p>
                        </li>
                      ))}
                    </ul>
                    <PaginationControls tab="active" totalItems={filteredProjects.active} />
                  </>
                )}
              </section>
            )}

            {(activeTab === 'all' || activeTab === 'completed') && (
              <section className="tab-section">
                <h3>Completed Projects</h3>
                {filteredProjects.completed.length === 0 ? (
                  <p className="empty-message">No completed projects found.</p>
                ) : (
                  <>
                    <ul className="project-list">
                      {paginate(filteredProjects.completed, currentPage.completed).map((project) => (
                        <li key={project.job_id} className="project-item">
                          <h4>{project.title || 'Untitled Project'}</h4>
                          <p>Description: {project.description || 'N/A'}</p>
                          <p>Budget: ${project.budget || 'N/A'}</p>
                          <p>Advance Payment: {project.advance_payment ? `$${project.advance_payment}` : 'None'}</p>
                          <p>Deadline: {project.deadline ? new Date(project.deadline).toLocaleDateString() : 'N/A'}</p>
                          <div className="rating-section">
                            <h5>Rate Professional:</h5>
                            <div className="star-rating">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <span
                                  key={star}
                                  className={`star ${((tempRating[project.job_id] || project.rating || 0) >= star) ? 'filled' : ''}`}
                                  onClick={() => handleStarClick(project.job_id, star)}
                                >
                                  ★
                                </span>
                              ))}
                            </div>
                            <div className="review-section">
                              <textarea
                                placeholder="Write your review here (optional, max 500 characters)..."
                                value={tempReview[project.job_id] || ''}
                                onChange={(e) => handleReviewChange(project.job_id, e.target.value)}
                                maxLength={500}
                                rows={3}
                                disabled={!!project.rating && !tempRating[project.job_id]}
                              />
                            </div>
                            {tempRating[project.job_id] && (
                              <button
                                className="submit-rating-btn"
                                onClick={() => handleSubmitRating(project.job_id)}
                              >
                                Submit Rating & Review
                              </button>
                            )}
                            {project.rating && !tempRating[project.job_id] && (
                              <>
                                <p>Current Rating: {project.rating} / 5</p>
                                {project.review && (
                                  <p><strong>Review:</strong> {project.review}</p>
                                )}
                              </>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                    <PaginationControls tab="completed" totalItems={filteredProjects.completed} />
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

export default ClientProjects;