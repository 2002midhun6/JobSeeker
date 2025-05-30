import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import Swal from 'sweetalert2';
import './RequestForJob.css';

const baseUrl = import.meta.env.VITE_API_URL;

function ClientJobApplications() {
  const { jobId } = useParams();
  const authContext = React.useContext(AuthContext);
  const navigate = useNavigate();
  const { user, isAuthenticated, token } = authContext || { user: null, isAuthenticated: false, token: null };

  const [applications, setApplications] = useState([]);
  const [jobTitle, setJobTitle] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showUnavailable, setShowUnavailable] = useState(false);
  const [minRating, setMinRating] = useState('');
  const [minExperience, setMinExperience] = useState('');

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const response = await axios.get(`${baseUrl}/api/job-applications/${jobId}/`, {
          withCredentials: true,
        });
        console.log('Fetch Applications Response:', response.data);
        setApplications(Array.isArray(response.data.applications) ? response.data.applications : []);
        setJobTitle(response.data.job_title || 'Untitled Job');
        setLoading(false);
      } catch (err) {
        console.error('Fetch Error:', err.response?.data || err.message);
        setError(err.response?.data?.error || 'Failed to fetch applications');
        setApplications([]);
        setLoading(false);
        if (err.response?.status === 401) {
          navigate('/login');
        }
      }
    };

    if (isAuthenticated && user?.role === 'client') {
      fetchApplications();
    } else {
      navigate('/login');
    }
  }, [isAuthenticated, user, jobId, navigate, token]);

  const handlePayment = async (applicationId) => {
    const application = applications.find(app => app.application_id === applicationId);
    if (!application || application.professional_details?.availability_status !== 'Available') {
      Swal.fire({
        icon: 'error',
        title: 'Professional Unavailable',
        text: 'This professional is no longer available to take on new projects.',
        confirmButtonColor: '#dc3545',
      });
      return;
    }

    try {
      const response = await axios.post(
        `${baseUrl}/api/accept-application/${applicationId}/`,
        {},
        {
          withCredentials: true,
        }
      );
      const { order_id, amount, currency, key, name, description, application_id, payment_type } = response.data;

      const options = {
        key,
        amount,
        currency,
        name,
        description,
        order_id,
        handler: async function (response) {
          try {
            const verifyResponse = await axios.post(
              `${baseUrl}/api/verify-payment/`,
              {
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                application_id,
                payment_type,
              },
              {
                withCredentials: true,
              }
            );

            setApplications((prev) =>
              prev.map((app) =>
                app.application_id === applicationId
                  ? { ...app, status: 'Accepted' }
                  : app.status === 'Applied'
                  ? { ...app, status: 'Rejected' }
                  : app
              )
            );

            Swal.fire({
              icon: 'success',
              title: 'Success',
              text: verifyResponse.data.message,
              confirmButtonColor: '#28a745',
              timer: 3000,
            });

            setTimeout(() => navigate('/client-project'), 2000);
          } catch (error) {
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: error.response?.data?.error || 'Payment verification failed',
              confirmButtonColor: '#dc3545',
              timer: 3000,
            });
          }
        },
        prefill: {
          email: user?.email || 'client@example.com',
          contact: '9999999999',
        },
        theme: {
          color: '#28a745',
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error('Payment Initiation Error:', error.response || error.message);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.response?.data?.error || 'Failed to initiate payment',
        confirmButtonColor: '#dc3545',
        timer: 3000,
      });
    }
  };

  const handleAccept = (applicationId) => {
    handlePayment(applicationId);
  };

  const handleToggleUnavailable = () => {
    setShowUnavailable(!showUnavailable);
  };

  const filteredApplications = applications.filter((app) => {
    const meetsAvailability = showUnavailable || app.professional_details?.availability_status === 'Available';
    const meetsRating = minRating === '' || (app.professional_details?.avg_rating || 0) >= Number(minRating);
    const meetsExperience = minExperience === '' || (app.professional_details?.experience_years || 0) >= Number(minExperience);
    return meetsAvailability && meetsRating && meetsExperience;
  });

  const unavailableCount = applications.filter(app => 
    app.professional_details?.availability_status !== 'Available'
  ).length;

  if (!isAuthenticated || !user) return null;

  return (
    <div className="client-applications-container">
      <div className="page-header">
        <h1>{jobTitle ? `${jobTitle}` : `Loading Job Title`}</h1>
        <p className="job-id">Job ID: {jobId}</p>
      </div>

      {error && <div className="error-message">{error}</div>}
      {message && <div className="success-message">{message}</div>}

      {loading ? (
        <div className="loading-container">
          <p>Loading applications...</p>
        </div>
      ) : applications.length === 0 ? (
        <div className="no-applications">
          <p>No applications received yet.</p>
        </div>
      ) : (
        <>
          <div className="applications-header">
            <div className="header-content">
              <h2>Applications Received ({filteredApplications.length})</h2>
            </div>
            
            <div className="filter-controls">
              <div className="filter-group">
                <label>
                  Min Rating:
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={minRating}
                    onChange={(e) => setMinRating(e.target.value)}
                    placeholder="4.0"
                  />
                </label>
              </div>
              
              <div className="filter-group">
                <label>
                  Min Experience:
                  <input
                    type="number"
                    min="0"
                    value={minExperience}
                    onChange={(e) => setMinExperience(e.target.value)}
                    placeholder="Years"
                  />
                </label>
              </div>
              
              {unavailableCount > 0 && (
                <button
                  className="toggle-unavailable-btn"
                  onClick={handleToggleUnavailable}
                >
                  {showUnavailable ? 'Hide' : 'Show'} Unavailable ({unavailableCount})
                </button>
              )}
            </div>
          </div>

          <div className="applications-grid">
            {filteredApplications.map((app) => {
              const isAvailable = app.professional_details?.availability_status === 'Available';
              const isVerified = app.professional_details?.verify_status === 'Verified';

              return (
                <div key={app.application_id} className={`application-card ${!isAvailable ? 'unavailable' : ''}`}>
                  <div className="card-header">
                    <div className="professional-name">
                      <h3>{app.professional_details?.user?.name || 'Unknown Professional'}</h3>
                      {isVerified && <span className="verified-badge">✓ Verified</span>}
                    </div>
                    <div className="status-indicators">
                      <span className={`availability-status ${isAvailable ? 'available' : 'not-available'}`}>
                        {app.professional_details?.availability_status || 'Unknown'}
                      </span>
                      <span className={`application-status ${app.status.toLowerCase()}`}>
                        {app.status}
                      </span>
                    </div>
                  </div>

                  <div className="card-content">
                    <div className="professional-info">
                      <div className="info-row">
                        <div className="info-item">
                          <span className="label">Experience:</span>
                          <span className="value">{app.professional_details?.experience_years || 0} years</span>
                        </div>
                        <div className="info-item">
                          <span className="label">Rating:</span>
                          <span className="value rating">
                            {app.professional_details?.avg_rating ? 
                              `⭐ ${app.professional_details.avg_rating}` : 
                              'No ratings'
                            }
                          </span>
                        </div>
                      </div>

                      <div className="bio-section">
                        <span className="label">Bio:</span>
                        <p className="bio-text">{app.professional_details?.bio || 'No bio provided'}</p>
                      </div>

                      <div className="skills-section">
                        <span className="label">Skills:</span>
                        <div className="skills-list">
                          {Array.isArray(app.professional_details?.skills) 
                            ? app.professional_details.skills.map((skill, index) => (
                                <span key={index} className="skill-tag">{skill}</span>
                              ))
                            : <span className="skill-tag">{app.professional_details?.skills || 'No skills listed'}</span>
                          }
                        </div>
                      </div>

                      <div className="application-meta">
                        <span className="applied-date">
                          Applied: {new Date(app.applied_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {app.status === 'Applied' && (
                    <div className="card-actions">
                      {isAvailable ? (
                        <button 
                          onClick={() => handleAccept(app.application_id)}
                          className="accept-btn"
                        >
                          Accept & Pay
                        </button>
                      ) : (
                        <div className="unavailable-section">
                          <button className="unavailable-btn" disabled>
                            Professional Unavailable
                          </button>
                          <p className="unavailable-note">
                            This professional is no longer available for new projects.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {applications.length > 0 && filteredApplications.length === 0 && (
            <div className="no-results">
              <p>No professionals match your current filters. Try adjusting the criteria.</p>
            </div>
          )}
        </>
      )}

      <div className="actions-footer">
        <button onClick={() => navigate('/client-project')} className="back-btn">
          ← Back to Projects
        </button>
      </div>
    </div>
  );
}

export default ClientJobApplications;