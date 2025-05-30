import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminDashboard.css';
const baseUrl = import.meta.env.VITE_API_URL;

// Enhanced Spinner Component
const AdminSpinner = ({ text = 'Loading...' }) => (
  <div className="admin-spinner-container">
    <div className="admin-loading-spinner"></div>
    <p className="admin-spinner-text">{text}</p>
  </div>
);

// Metric Card Component
const MetricCard = ({ title, value, icon, description, trend }) => (
  <div className="metric-card">
    <div className="metric-icon">{icon}</div>
    <h2>{title}</h2>
    <p className="metric-value">{value}</p>
    {description && (
      <p style={{ 
        fontSize: '12px', 
        color: '#6b7280', 
        margin: '8px 0 0 0', 
        fontWeight: '500' 
      }}>
        {description}
      </p>
    )}
    {trend && (
      <div style={{
        marginTop: '8px',
        fontSize: '12px',
        color: trend > 0 ? '#10b981' : trend < 0 ? '#ef4444' : '#6b7280',
        fontWeight: '600',
      }}>
        {trend > 0 ? '↗️' : trend < 0 ? '↘️' : '➡️'} {Math.abs(trend)}%
      </div>
    )}
  </div>
);

// Dashboard Summary Component
const DashboardSummary = ({ metrics }) => {
  const completionRate = metrics.totalJobs > 0 
    ? ((metrics.completedJobs / metrics.totalJobs) * 100).toFixed(1)
    : 0;
  
  const verificationRate = metrics.professionals > 0
    ? ((metrics.verifiedProfessionals / metrics.professionals) * 100).toFixed(1)
    : 0;

  return (
    <div className="dashboard-summary">
      <div className="dashboard-summary-content">
        <h2>📊 Platform Overview</h2>
        <p>Real-time insights into your platform's performance and user engagement</p>
        
        <div className="quick-stats">
          <div className="quick-stat">
            <h3>Total Users</h3>
            <p>{metrics.professionals + metrics.clients}</p>
          </div>
          <div className="quick-stat">
            <h3>Job Completion</h3>
            <p>{completionRate}%</p>
          </div>
          <div className="quick-stat">
            <h3>Verification Rate</h3>
            <p>{verificationRate}%</p>
          </div>
          <div className="quick-stat">
            <h3>Active Platform</h3>
            <p>{metrics.activeApplications + metrics.activeConversations}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Unauthorized Access Component
const UnauthorizedAccess = () => (
  <div className="admin-dashboard">
    <main>
      <h1>Admin Dashboard</h1>
      <div className="unauthorized-container">
        <div className="unauthorized-icon">🔒</div>
        <h2 className="unauthorized-title">Access Denied</h2>
        <p className="unauthorized-message">
          You do not have permission to access the admin dashboard. 
          Please contact your system administrator if you believe this is an error.
        </p>
      </div>
    </main>
  </div>
);

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
        setError(null);

        // Fetch all data concurrently
        const [userResponse, jobResponse, paymentResponse] = await Promise.all([
          axios.get(`${baseUrl}/api/users/counts/`, {
            withCredentials: true,
          }),
          axios.get(`${baseUrl}/api/jobs/counts/`, {
            withCredentials: true,
          }),
          axios.get(`${baseUrl}/api/payments/total/`, {
            withCredentials: true,
          })
        ]);

        setMetrics({
          professionals: userResponse.data.professionals || 0,
          clients: userResponse.data.clients || 0,
          pendingComplaints: userResponse.data.pending_complaints || 0,
          verifiedProfessionals: userResponse.data.verified_professionals || 0,
          totalJobs: jobResponse.data.total_jobs || 0,
          completedJobs: jobResponse.data.completed_jobs || 0,
          activeApplications: jobResponse.data.active_applications || 0,
          activeConversations: jobResponse.data.active_conversations || 0,
          totalPayments: paymentResponse.data.total_payments || 0,
        });
      } catch (err) {
        console.error('Error fetching metrics:', err);
        if (err.response?.status === 403) {
          setIsUnauthorized(true);
        } else {
          setError(err.response?.data?.error || 'Failed to fetch dashboard metrics. Please try again later.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  // Format currency for display
  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Format large numbers
  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  if (isUnauthorized) {
    return <UnauthorizedAccess />;
  }

  return (
    <div className="admin-dashboard">
      <main>
        <h1>Admin Dashboard</h1>
        
        {loading ? (
          <AdminSpinner text="Loading dashboard metrics..." />
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : (
          <>
            {/* Dashboard Summary */}
            <DashboardSummary metrics={metrics} />

            {/* Metrics Grid */}
            <div className="metrics-grid">
              <MetricCard
                title="Professionals"
                value={formatNumber(metrics.professionals)}
                icon="👨‍💼"
                description="Registered professional users"
              />
              
              <MetricCard
                title="Clients"
                value={formatNumber(metrics.clients)}
                icon="🏢"
                description="Registered client users"
              />
              
              <MetricCard
                title="Verified Professionals"
                value={formatNumber(metrics.verifiedProfessionals)}
                icon="✅"
                description="Professionals with verified accounts"
              />
              
              <MetricCard
                title="Pending Complaints"
                value={formatNumber(metrics.pendingComplaints)}
                icon="⚠️"
                description="Issues requiring attention"
              />
              
              <MetricCard
                title="Total Jobs"
                value={formatNumber(metrics.totalJobs)}
                icon="💼"
                description="All jobs posted on platform"
              />
              
              <MetricCard
                title="Completed Works"
                value={formatNumber(metrics.completedJobs)}
                icon="🎯"
                description="Successfully finished projects"
              />
              
              <MetricCard
                title="Active Applications"
                value={formatNumber(metrics.activeApplications)}
                icon="📋"
                description="Ongoing job applications"
              />
              
              <MetricCard
                title="Active Conversations"
                value={formatNumber(metrics.activeConversations)}
                icon="💬"
                description="Live chat conversations"
              />
              
              <MetricCard
                title="Total Payments"
                value={formatCurrency(metrics.totalPayments)}
                icon="💰"
                description="Revenue processed through platform"
              />
            </div>

            {/* Additional Insights */}
            <div style={{
              background: 'linear-gradient(135deg, #ffffff, #f8fafc)',
              borderRadius: '20px',
              padding: '24px',
              marginTop: '32px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
              border: '1px solid #e8ecf0',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: 'linear-gradient(90deg, #3b82f6, #10b981, #f59e0b)'
              }}></div>
              
              <h3 style={{
                color: '#1f2937',
                fontSize: '20px',
                fontWeight: '700',
                margin: '0 0 16px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>📈</span>
                Platform Health Indicators
              </h3>
              
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '16px'
              }}>
                <div style={{
                  padding: '16px',
                  background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)',
                  borderRadius: '12px',
                  border: '1px solid #bbf7d0'
                }}>
                  <h4 style={{ color: '#166534', margin: '0 0 8px 0', fontSize: '14px' }}>
                    User Engagement
                  </h4>
                  <p style={{ color: '#15803d', fontSize: '18px', fontWeight: '700', margin: 0 }}>
                    {metrics.activeApplications + metrics.activeConversations} Active
                  </p>
                </div>
                
                <div style={{
                  padding: '16px',
                  background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
                  borderRadius: '12px',
                  border: '1px solid #bfdbfe'
                }}>
                  <h4 style={{ color: '#1e40af', margin: '0 0 8px 0', fontSize: '14px' }}>
                    Success Rate
                  </h4>
                  <p style={{ color: '#1d4ed8', fontSize: '18px', fontWeight: '700', margin: 0 }}>
                    {metrics.totalJobs > 0 ? ((metrics.completedJobs / metrics.totalJobs) * 100).toFixed(1) : 0}%
                  </p>
                </div>
                
                <div style={{
                  padding: '16px',
                  background: 'linear-gradient(135deg, #fefce8, #fef3c7)',
                  borderRadius: '12px',
                  border: '1px solid #fbbf24'
                }}>
                  <h4 style={{ color: '#92400e', margin: '0 0 8px 0', fontSize: '14px' }}>
                    Verification Rate
                  </h4>
                  <p style={{ color: '#d97706', fontSize: '18px', fontWeight: '700', margin: 0 }}>
                    {metrics.professionals > 0 ? ((metrics.verifiedProfessionals / metrics.professionals) * 100).toFixed(1) : 0}%
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;