import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { AuthContext } from '../../context/AuthContext';
import './ProfessionalDashboardBody.css';
import ProfessionalNotifications from '../Notification/ProfessionalNotification';
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
        const response = await axios.get('http://localhost:8000/api/profile/', {
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
  }, [isAuthenticated, user,  navigate]);

  useEffect(() => {
    const fetchProjectCountsAndReviews = async () => {
      
      try {
        const response = await axios.get('http://localhost:8000/api/professional-job-applications/', {
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
            review: app.job_details.review || 'No review provided', // Add review field
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
  }, [hasProfile,  navigate]);

  useEffect(() => {
    if (!isAuthenticated || !user || user.role !== 'professional') {
      navigate('/login');
    }
  }, [isAuthenticated, user, navigate]);

  if (loading) return <div>Loading...</div>;
  if (!isAuthenticated || !user) return null;

  return (
    <div className="professional-dashboard">
      <h1>Professional Dashboard</h1>
      <ProfessionalNotifications/>
      {hasProfile ? (
        <>
          <p style={{ color: 'white' }}>Welcome back to your Professional Dashboard, {user.name}!</p>
          {projectLoading ? (
            <p>Loading project data...</p>
          ) : projectError ? (
            <p className="error-message">{projectError}</p>
          ) : (
            <>
              <div className="project-counts-table">
                <h2 style={{ color: 'black' }}>Project Overview</h2>
                <table>
                  <thead>
                    <tr>
                      <th style={{ color: 'black' }}>Project Status</th>
                      <th style={{ color: 'black' }}>Count</th>
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
              <div className="reviews-section">
                <h2>Your Reviews</h2>
                {avgRating !== null ? (
                  <p className="average-rating">
                    Average Rating: {avgRating.toFixed(1)} / 5
                    {avgRating > 0 && (
                      <span className="star-rating">
                        {[...Array(5)].map((_, index) => (
                          <span
                            key={index}
                            className={`star ${index < Math.round(avgRating) ? 'filled' : ''}`}
                          >
                            ★
                          </span>
                        ))}
                      </span>
                    )}
                  </p>
                ) : (
                  <p>No ratings yet.</p>
                )}
                {reviews.length > 0 ? (
                  <div className="reviews-list">
                    <h3>Individual Project Reviews</h3>
                    <ul>
                      {reviews.map((review) => (
                        <li key={review.job_id} className="review-item">
                          <p>
                            <strong>{review.title}</strong> (by {review.client_name}): {review.rating} / 5
                            <span className="star-rating">
                              {[...Array(5)].map((_, index) => (
                                <span
                                  key={index}
                                  className={`star ${index < review.rating ? 'filled' : ''}`}
                                >
                                  ★
                                </span>
                              ))}
                            </span>
                            <br />
                            <em>Review:</em> {review.review}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p>No individual project reviews yet.</p>
                )}
              </div>
            </>
          )}
        </>
      ) : (
        <div>
          <p style={{ color: 'white' }}>Welcome to the Professional Dashboard, {user.name}! You don’t have a profile yet.</p>
          <button onClick={() => navigate('/create-professional-profile')} className="create-profile-btn">
            Create Professional Profile
          </button>
        </div>
      )}
    </div>
  );
}

export default ProfessionalDashBoardContent;