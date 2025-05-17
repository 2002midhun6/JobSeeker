import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AdminHeaderComp from '../AdminHeaderComp/AdminHeaderComp';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [metrics, setMetrics] = useState({
    professionals: 0,
    clients: 0,
    totalJobs: 0,
    completedJobs: 0,
    pendingComplaints: 0,
    verifiedProfessionals: 0,
    activeApplications: 0,
    activeConversations: 0,
    totalPayments: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUnauthorized, setIsUnauthorized] = useState(false);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true);
        // Fetch user counts
        const userResponse = await axios.get('http://localhost:8000/api/users/counts/', {
          withCredentials: true,
        });
        // Fetch job counts
        const jobResponse = await axios.get('http://localhost:8000/api/jobs/counts/', {
          withCredentials: true,
        });
        // Fetch payment total
        const paymentResponse = await axios.get('http://localhost:8000/api/payments/total/', {
          withCredentials: true,
        });

        setMetrics({
          professionals: userResponse.data.professionals,
          clients: userResponse.data.clients,
          pendingComplaints: userResponse.data.pending_complaints,
          verifiedProfessionals: userResponse.data.verified_professionals,
          totalJobs: jobResponse.data.total_jobs,
          completedJobs: jobResponse.data.completed_jobs,
          activeApplications: jobResponse.data.active_applications,
          activeConversations: jobResponse.data.active_conversations,
          totalPayments: paymentResponse.data.total_payments,
        });
      } catch (err) {
        if (err.response?.status === 403) {
          setIsUnauthorized(true);
        } else {
          setError(err.response?.data?.error || 'Failed to fetch metrics');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  if (isUnauthorized) {
    return (
      <div className="admin-dashboard">
  
        <main>
          <h1>Admin Dashboard</h1>
          <div className="error-message">You do not have permission to access the admin dashboard.</div>
        </main>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      
      <main>
        <h1>Admin Dashboard</h1>
        {loading && <div className="loading-message">Loading...</div>}
        {error && <div className="error-message">{error}</div>}
        <div className="metrics-grid">
          <div className="metric-card">
            <h2>Professionals</h2>
            <p className="metric-value">{metrics.professionals}</p>
          </div>
          <div className="metric-card">
            <h2>Clients</h2>
            <p className="metric-value">{metrics.clients}</p>
          </div>
          <div className="metric-card">
            <h2>Verified Professionals</h2>
            <p className="metric-value">{metrics.verifiedProfessionals}</p>
          </div>
          <div className="metric-card">
            <h2>Pending Complaints</h2>
            <p className="metric-value">{metrics.pendingComplaints}</p>
          </div>
          <div className="metric-card">
            <h2>Total Jobs</h2>
            <p style={{color:'black'}} className="metric-value">{metrics.totalJobs}</p>
          </div>
          <div className="metric-card">
            <h2>Completed Works</h2>
            <p className="metric-value">{metrics.completedJobs}</p>
          </div>
          <div className="metric-card">
            <h2>Active Applications</h2>
            <p className="metric-value">{metrics.activeApplications}</p>
          </div>
          <div className="metric-card">
            <h2>Active Conversations</h2>
            <p className="metric-value">{metrics.activeConversations}</p>
          </div>
          <div className="metric-card">
            <h2>Total Payments (₹)</h2>
            <p className="metric-value">{metrics.totalPayments.toLocaleString()}</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;