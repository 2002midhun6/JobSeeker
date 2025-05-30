import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { AuthContext } from '../../context/AuthContext';
import './ProfessionalDashboardBody.css';
import ProfessionalNotifications from '../Notification/ProfessionalNotification';
const baseUrl = import.meta.env.VITE_API_URL;
// Enhanced Spinner Component
const Spinner = ({ size = 'medium', text = 'Loading...', fullPage = false }) => {
  return (
    <div className={`spinner-container ${fullPage ? 'full-page' : ''}`}>
      <div className={`spinner ${size}`}></div>
      <span className={`spinner-text ${size}`}>{text}</span>
    </div>
  );
};

// Enhanced Statistics Card Component
const StatCard = ({ title, value, subValue, colorClass, icon, trend, onClick }) => (
  <div 
    className={`stat-card ${colorClass}`}
    onClick={onClick}
  >
    <div className={`stat-card-icon ${colorClass}`}>
      {icon}
    </div>
    
    <h3 style={{color:'black'}} className={`stat-card-value ${colorClass}`}>
      {value}
    </h3>
    
    <p className="stat-card-title">
      {title}
    </p>
    
    {subValue && (
      <p className="stat-card-subtitle">
        {subValue}
      </p>
    )}
    
    {trend && (
      <div className={`stat-card-trend ${trend > 0 ? 'positive' : trend < 0 ? 'negative' : 'neutral'}`}>
        {trend > 0 ? '↗️' : trend < 0 ? '↘️' : '➡️'} {Math.abs(trend)}%
      </div>
    )}
  </div>
);

// Enhanced Review Card Component
const ReviewCard = ({ review }) => {
  const renderStars = (rating) => {
    return [...Array(5)].map((_, index) => (
      <span
        key={index}
        className={`star ${index < rating ? 'filled' : ''}`}
      >
        ★
      </span>
    ));
  };

  return (
    <div className="review-card">
      <div className="review-card-header">
        <div className="review-card-info">
          <h4 className="review-card-title">
            {review.title}
          </h4>
          <p className="review-card-client">
            Client: {review.client_name}
          </p>
        </div>
        
        <div className="review-card-rating">
          <div className="star-rating">
            {renderStars(review.rating)}
          </div>
          <span className="review-rating-badge">
            {review.rating}/5
          </span>
        </div>
      </div>

      <div className="review-card-content">
        <div className="review-card-content-header">
          <span style={{ fontSize: '16px' }}>💬</span>
          <strong className="review-card-label">Review</strong>
        </div>
        <p className="review-card-text">
          "{review.review}"
        </p>
      </div>
    </div>
  );
};

// Full Page Spinner for initial loading
const FullPageSpinner = ({ text = 'Loading...' }) => {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
    }}>
      <Spinner size="large" text={text} />
    </div>
  );
};

function ProfessionalDashBoardContent() {
  const { user, isAuthenticated} = useContext(AuthContext); 
  const navigate = useNavigate();

  const [hasProfile, setHasProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [projectCounts, setProjectCounts] = useState({ active: 0, completed: 0 });
  const [projectLoading, setProjectLoading] = useState(true);
  const [projectError, setProjectError] = useState('');
  const [avgRating, setAvgRating] = useState(null);
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    const checkProfile = async () => {
      try {
        const response = await axios.get(`${baseUrl}/api/profile/`, {
          withCredentials: true,
        });
        setHasProfile(true);
        setAvgRating(response.data.avg_rating || 0);
      } catch (err) {
        if (err.response?.status === 404) {
          setHasProfile(false);
        } else {
          console.error('Error checking profile:', err);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to check profile status',
            confirmButtonColor: '#dc3545',
            timer: 3000,
            timerProgressBar: true,
          });
        }
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated && user && user.role === 'professional') {
      checkProfile();
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    const fetchProjectCountsAndReviews = async () => {
      try {
        const response = await axios.get(`${baseUrl}/api/professional-job-applications/`, {
          withCredentials: true,
        });
        const applications = Array.isArray(response.data.applications) ? response.data.applications : [];
        const activeCount = applications.filter(
          (app) => app.status === 'Accepted' && app.job_details?.status === 'Assigned'
        ).length;
        const completedCount = applications.filter(
          (app) => app.status === 'Completed' && app.job_details?.status === 'Completed'
        ).length;
        const completedReviews = applications
          .filter(
            (app) => app.status === 'Completed' && app.job_details?.status === 'Completed' && app.job_details?.rating
          )
          .map((app) => ({
            job_id: app.job_details.job_id,
            title: app.job_details.title,
            rating: app.job_details.rating,
            review: app.job_details.review || 'No review provided',
            client_name: app.job_details.client_name || 'Unknown Client',
          }));
        setProjectCounts({ active: activeCount, completed: completedCount });
        setReviews(completedReviews);
        setProjectLoading(false);
      } catch (err) {
        const errorMessage = err.response?.data?.error || 'Failed to fetch project data';
        setProjectError(errorMessage);
        setProjectLoading(false);
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

    if (hasProfile) {
      fetchProjectCountsAndReviews();
    } else {
      setProjectLoading(false);
    }
  }, [hasProfile, navigate]);

  useEffect(() => {
    if (!isAuthenticated || !user || user.role !== 'professional') {
      navigate('/login');
    }
  }, [isAuthenticated, user, navigate]);

  // Show full page spinner during initial loading
  if (loading) return <FullPageSpinner text="Loading your dashboard..." />;
  if (!isAuthenticated || !user) return null;

  // Calculate statistics
  const stats = {
    totalProjects: projectCounts.active + projectCounts.completed,
    activeProjects: projectCounts.active,
    completedProjects: projectCounts.completed,
    averageRating: avgRating || 0,
    reviewsCount: reviews.length,
  };

  return (
    <div className="professional-dashboard">
      {/* Enhanced Header */}
      <div className="dashboard-header">
        <div className="dashboard-header-content">
          <div className="dashboard-header-flex">
            <div>
              <h1 className="dashboard-title">
                <span className="dashboard-title-emoji">👋</span>
                Welcome back, {user.name}!
              </h1>
              <p className="dashboard-subtitle">
                Here's an overview of your professional journey and achievements
              </p>
            </div>

            {/* Enhanced Notifications */}
            <div className="dashboard-notifications">
            <ProfessionalNotifications />
            </div>
          </div>
        </div>
      </div>

      {hasProfile ? (
        <>
          {projectLoading ? (
            <div className="loading-container">
              <Spinner size="large" text="Loading project data..." fullPage={true} />
            </div>
          ) : projectError ? (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              <div>
                <strong>Error:</strong> {projectError}
              </div>
            </div>
          ) : (
            <>
              {/* Enhanced Statistics Cards */}
              <div className="stats-grid">
                <StatCard
                  title="Total Projects"
                  value={stats.totalProjects}
                  colorClass="blue"
                  icon="📊"
                />
                <StatCard
                  title="Active Projects"
                  value={stats.activeProjects}
                  colorClass="green"
                  icon="🚀"
                />
                <StatCard
                  title="Completed Projects"
                  value={stats.completedProjects}
                  colorClass="purple"
                  icon="✅"
                />
                <StatCard
                  title="Average Rating"
                  value={avgRating ? `${avgRating.toFixed(1)}/5` : 'N/A'}
                  colorClass="orange"
                  icon="⭐"
                />
                {reviews.length > 0 && (
                  <StatCard
                    title="Total Reviews"
                    value={stats.reviewsCount}
                    colorClass="red"
                    icon="💬"
                  />
                )}
              </div>

              {/* Project Overview Table */}
              <div className="project-overview">
                <h2 className="project-overview-title">
                  <span style={{ fontSize: '32px' }}>📈</span>
                  Project Overview
                </h2>
                <table className="project-table">
                  <thead>
                    <tr>
                      <th>Project Status</th>
                      <th>Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Active Projects</td>
                      <td>{projectCounts.active}</td>
                    </tr>
                    <tr>
                      <td>Completed Projects</td>
                      <td>{projectCounts.completed}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Reviews Section */}
              <div className="reviews-section">
                <h2 className="reviews-title">
                  <span style={{ fontSize: '32px' }}>⭐</span>
                  Your Reviews
                </h2>
                
                {avgRating !== null ? (
                  <div className="average-rating">
                    <p className="average-rating-text">
                      Average Rating: {avgRating.toFixed(1)} / 5
                    </p>
                    {avgRating > 0 && (
                      <div className="star-rating">
                        {[...Array(5)].map((_, index) => (
                          <span
                            key={index}
                            className={`star ${index < Math.round(avgRating) ? 'filled' : ''}`}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="no-reviews">
                    <p>No ratings yet.</p>
                  </div>
                )}

                {reviews.length > 0 ? (
                  <div className="reviews-list">
                    <h3 className="reviews-list-title">Individual Project Reviews</h3>
                    {reviews.map((review) => (
                      <ReviewCard key={review.job_id} review={review} />
                    ))}
                  </div>
                ) : (
                  <div className="no-reviews">
                    <p>No individual project reviews yet.</p>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      ) : (
        <div className="create-profile-section">
          <div className="create-profile-icon">👤</div>
          <h3 className="create-profile-title">
            Create Your Professional Profile
          </h3>
          <p className="create-profile-subtitle">
            Welcome to the Professional Dashboard, {user.name}! Start by creating your professional profile to showcase your skills and connect with clients.
          </p>
          <button 
            onClick={() => navigate('/create-professional-profile')} 
            className="create-profile-btn"
          >
            <span className="create-profile-btn-icon">🚀</span>
            Create Professional Profile
          </button>
        </div>
      )}
    </div>
  );
}

export default ProfessionalDashBoardContent;