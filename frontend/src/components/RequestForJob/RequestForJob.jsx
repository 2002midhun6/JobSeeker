// src/pages/ClientJobApplications.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import Swal from 'sweetalert2';
import './RequestForJob.css';

function ClientJobApplications() {
  const { jobId } = useParams();
  const authContext = React.useContext(AuthContext);
  const navigate = useNavigate();
  const { user, isAuthenticated } = authContext || { user: null, isAuthenticated: false };

  const [applications, setApplications] = useState([]);
  const [jobTitle, setJobTitle] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showUnavailable, setShowUnavailable] = useState(false);

  useEffect(() => {
    const fetchApplications = async () => {
      try {
        const response = await axios.get(`http://localhost:8000/api/job-applications/${jobId}/`, {
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
      }
    };

    if (isAuthenticated && user?.role === 'client') {
      fetchApplications();
    } else {
      navigate('/login');
    }
  }, [isAuthenticated, user, jobId, navigate]);

  const handlePayment = async (applicationId) => {
    // Verify professional is still available before proceeding
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
      // Step 1: Initiate payment
      const response = await axios.post(
        `http://localhost:8000/api/accept-application/${applicationId}/`,
        {},
        { withCredentials: true }
      );
      const { order_id, amount, currency, key, name, description, application_id, payment_type } = response.data;

      // Step 2: Open Razorpay popup
      const options = {
        key,
        amount,
        currency,
        name,
        description,
        order_id,
        handler: async function (response) {
          try {
            // Step 3: Verify payment
            const verifyResponse = await axios.post(
              'http://localhost:8000/api/verify-payment/',
              {
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
                application_id,
                payment_type,
              },
              { withCredentials: true }
            );

            // Update UI
            setApplications((prev) =>
              prev.map((app) =>
                app.application_id === applicationId
                  ? { ...app, status: 'Accepted' }
                  : app.status === 'Applied'
                  ? { ...app, status: 'Rejected' }
                  : app
              )
            );

            // Show success message
            Swal.fire({
              icon: 'success',
              title: 'Success',
              text: verifyResponse.data.message,
              confirmButtonColor: '#28a745',
              timer: 3000,
            });

            // Navigate to client projects
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
          contact: '9999999999', // Optional: Replace with user.phone if available
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

  // Filter applications based on availability
  const filteredApplications = applications.filter(app => 
    showUnavailable || app.professional_details?.availability_status === 'Available'
  );
  
  // Count of unavailable professionals
  const unavailableCount = applications.filter(app => 
    app.professional_details?.availability_status !== 'Available'
  ).length;

  if (!isAuthenticated || !user) return null;

  return (
    <div className="client-applications-container">
      <h1>{jobTitle ? `${jobTitle} (Job ID: ${jobId})` : `Loading Job Title (Job ID: ${jobId})`}</h1>
      {error && <div className="error-message">{error}</div>}
      {message && <div className="success-message">{message}</div>}
      
      {loading ? (
        <p>Loading applications...</p>
      ) : applications.length === 0 ? (
        <p>No applications yet.</p>
      ) : (
        <>
          <div className="applications-header">
            <h2>Applications ({filteredApplications.length})</h2>
            {unavailableCount > 0 && (
              <button 
                className="toggle-unavailable-btn"
                onClick={handleToggleUnavailable}
              >
                {showUnavailable ? 'Hide' : 'Show'} Unavailable ({unavailableCount})
              </button>
            )}
          </div>
          
          <ul className="applications-list">
            {filteredApplications.map((app) => {
              const isAvailable = app.professional_details?.availability_status === 'Available';
              const isVerified = app.professional_details?.verify_status === 'Verified';
              
              return (
                <li key={app.application_id} className={`application-item ${!isAvailable ? 'unavailable' : ''}`}>
                  <div className="application-header">
                    <h3>
                      {app.professional_details?.user?.name || 'Unknown'}
                      {isVerified && (
                        <span className="verified-badge">Verified</span>
                      )}
                      <span className={`availability-status ${isAvailable ? 'available' : 'not-available'}`}>
                        {app.professional_details?.availability_status || 'Unknown'}
                      </span>
                    </h3>
                  </div>
                  
                  <div className="professional-details">
                    <p><strong>Bio:</strong> {app.professional_details?.bio || 'N/A'}</p>
                    <p><strong>Skills:</strong> {Array.isArray(app.professional_details?.skills) 
                      ? app.professional_details?.skills.join(', ') 
                      : app.professional_details?.skills || 'N/A'}
                    </p>
                    <p><strong>Experience:</strong> {app.professional_details?.experience_years || 0} years</p>
                    <p><strong>Rating:</strong> {app.professional_details?.avg_rating || 'No ratings yet'}</p>
                    <p><strong>Application Status:</strong> <span className={`status-badge ${app.status.toLowerCase()}`}>{app.status}</span></p>
                    <p><strong>Applied At:</strong> {new Date(app.applied_at).toLocaleString()}</p>
                  </div>
                  
                  {app.status === 'Applied' && (
                    <div className="application-actions">
                      <button 
                        onClick={() => handleAccept(app.application_id)}
                        className={`accept-btn ${!isAvailable ? 'disabled' : ''}`}
                        disabled={!isAvailable}
                        title={!isAvailable ? "Professional is unavailable" : "Accept application"}
                      >
                        {isAvailable ? 'Accept & Pay' : 'Professional Unavailable'}
                      </button>
                      
                      {!isAvailable && (
                        <p className="unavailable-note">
                          This professional's status has changed since they applied and they are no longer available.
                        </p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          
          {applications.length > 0 && filteredApplications.length === 0 && (
            <p className="no-available">No available professionals found. Try showing unavailable professionals.</p>
          )}
        </>
      )}
      
      <div className="actions-footer">
        <button onClick={() => navigate('/client-project')} className="back-btn">
          Back to Projects
        </button>
      </div>
    </div>
  );
}

export default ClientJobApplications;