import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { AuthContext } from '../../context/AuthContext';
import './ClientDashboardBody.css';
import EnhancedNotifications from './EnhancedNotifications' // Updated import
const baseUrl = import.meta.env.VITE_API_URL;
// Enhanced Spinner Component
const Spinner = ({ size = 'medium', text = 'Loading...', fullPage = false }) => {
  const spinnerStyles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: fullPage ? '60px 20px' : '20px',
      backgroundColor: fullPage ? 'rgba(255, 255, 255, 0.95)' : 'transparent',
      borderRadius: fullPage ? '20px' : '0',
      ...(fullPage && {
        minHeight: '300px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.1)',
        backdropFilter: 'blur(10px)',
      })
    },
    spinner: {
      width: size === 'small' ? '24px' : size === 'large' ? '56px' : '40px',
      height: size === 'small' ? '24px' : size === 'large' ? '56px' : '40px',
      border: `${size === 'small' ? '3px' : '4px'} solid transparent`,
      borderTop: `${size === 'small' ? '3px' : '4px'} solid #3b82f6`,
      borderRight: `${size === 'small' ? '3px' : '4px'} solid #10b981`,
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
      marginBottom: '16px',
    },
    text: {
      color: '#6b7280',
      fontSize: size === 'small' ? '14px' : size === 'large' ? '18px' : '16px',
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

// Enhanced Project Card Component
const ProjectCard = ({ project, type }) => {
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'open': return '#28a745';
      case 'assigned': return '#ffc107';
      case 'completed': return '#007bff';
      case 'cancelled': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    if (!amount) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const cardStyle = {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '20px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
    border: '1px solid #e8ecf0',
    transition: 'all 0.3s ease',
    position: 'relative',
    overflow: 'hidden',
  };

  return (
    <div 
      style={cardStyle}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-8px)';
        e.currentTarget.style.boxShadow = '0 20px 60px rgba(0, 0, 0, 0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.08)';
      }}
    >
      {/* Top gradient line */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '4px',
        background: 'linear-gradient(90deg, #3b82f6, #10b981, #f59e0b)',
      }}></div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <h3 style={{ color: '#1f2937', margin: '0', fontSize: '20px', fontWeight: '700' }}>
          {project.title || 'Untitled Project'}
        </h3>
        <span 
          style={{
            backgroundColor: getStatusColor(project.status),
            color: 'white',
            padding: '6px 16px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '600',
            textTransform: 'capitalize',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
          }}
        >
          {project.status || 'Unknown'}
        </span>
      </div>

      <p style={{ color: '#6b7280', marginBottom: '20px', lineHeight: '1.6', fontSize: '14px' }}>
        {project.description ? 
          (project.description.length > 150 ? 
            `${project.description.substring(0, 150)}...` : 
            project.description) : 
          'No description available'
        }
      </p>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
        gap: '16px',
        padding: '16px',
        backgroundColor: '#f8fafc',
        borderRadius: '12px',
        border: '1px solid #e8ecf0',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <span style={{ fontSize: '16px' }}>💰</span>
            <strong style={{ color: '#374151', fontSize: '14px' }}>Budget</strong>
          </div>
          <p style={{ margin: '0', color: '#059669', fontWeight: '700', fontSize: '16px' }}>
            {formatCurrency(project.budget)}
          </p>
        </div>

        {project.advance_payment && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <span style={{ fontSize: '16px' }}>💳</span>
              <strong style={{ color: '#374151', fontSize: '14px' }}>Advance</strong>
            </div>
            <p style={{ margin: '0', color: '#d97706', fontWeight: '700', fontSize: '16px' }}>
              {formatCurrency(project.advance_payment)}
            </p>
          </div>
        )}

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <span style={{ fontSize: '16px' }}>📅</span>
            <strong style={{ color: '#374151', fontSize: '14px' }}>Deadline</strong>
          </div>
          <p style={{ margin: '0', color: '#6b7280', fontWeight: '600' }}>
            {formatDate(project.deadline)}
          </p>
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <span style={{ fontSize: '16px' }}>📝</span>
            <strong style={{ color: '#374151', fontSize: '14px' }}>Created</strong>
          </div>
          <p style={{ margin: '0', color: '#6b7280', fontWeight: '600' }}>
            {formatDate(project.created_at)}
          </p>
        </div>

        {project.applicants_count !== undefined && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <span style={{ fontSize: '16px' }}>👥</span>
              <strong style={{ color: '#374151', fontSize: '14px' }}>Applicants</strong>
            </div>
            <p style={{ margin: '0', color: '#3b82f6', fontWeight: '700', fontSize: '16px' }}>
              {project.applicants_count}
            </p>
          </div>
        )}

        {project.rating && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <span style={{ fontSize: '16px' }}>⭐</span>
              <strong style={{ color: '#374151', fontSize: '14px' }}>Rating</strong>
            </div>
            <p style={{ margin: '0', color: '#f59e0b', fontWeight: '700', fontSize: '16px' }}>
              {project.rating}/5
            </p>
          </div>
        )}
      </div>

      {project.review && (
        <div style={{ 
          marginTop: '16px', 
          padding: '16px', 
          backgroundColor: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', 
          borderRadius: '12px',
          border: '1px solid #bbf7d0',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
            <span style={{ fontSize: '16px' }}>💬</span>
            <strong style={{ color: '#15803d', fontSize: '14px' }}>Review</strong>
          </div>
          <p style={{ margin: '0', color: '#374151', fontStyle: 'italic', lineHeight: '1.5' }}>
            "{project.review}"
          </p>
        </div>
      )}
    </div>
  );
};

// Enhanced Statistics Card Component
const StatCard = ({ title, value, subValue, color, icon, trend }) => (
  <div style={{
    backgroundColor: '#fff',
    borderRadius: '20px',
    padding: '24px',
    textAlign: 'center',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
    border: '1px solid #e8ecf0',
    transition: 'all 0.3s ease',
    position: 'relative',
    overflow: 'hidden',
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.transform = 'translateY(-8px)';
    e.currentTarget.style.boxShadow = '0 20px 60px rgba(0, 0, 0, 0.15)';
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.08)';
  }}
  >
    {/* Top gradient line */}
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: '4px',
      background: `linear-gradient(90deg, ${color}, ${color}99)`,
    }}></div>

    <div style={{ 
      fontSize: '32px', 
      marginBottom: '12px',
      padding: '16px',
      background: `${color}15`,
      borderRadius: '16px',
      display: 'inline-block',
    }}>
      {icon}
    </div>
    
    <h3 style={{ 
      color: color, 
      fontSize: '32px', 
      margin: '0 0 8px 0', 
      fontWeight: '800',
      background: `linear-gradient(135deg, ${color}, ${color}cc)`,
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    }}>
      {value}
    </h3>
    
    <p style={{ color: '#6b7280', margin: '0', fontSize: '14px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
      {title}
    </p>
    
    {subValue && (
      <p style={{ color: '#9ca3af', margin: '8px 0 0 0', fontSize: '12px' }}>
        {subValue}
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

function ClientDashBoardContent() {
  const authContext = useContext(AuthContext);
  const navigate = useNavigate();
  const { user, isAuthenticated } = authContext || { user: null, isAuthenticated: false };

  const [projectData, setProjectData] = useState({ active: [], completed: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Calculate statistics
  const stats = {
    totalProjects: projectData.active.length + projectData.completed.length,
    activeProjects: projectData.active.length,
    completedProjects: projectData.completed.length,
    totalBudget: [...projectData.active, ...projectData.completed].reduce((sum, project) => sum + (project.budget || 0), 0),
    avgRating: projectData.completed.filter(p => p.rating).length > 0 ? 
      (projectData.completed.filter(p => p.rating).reduce((sum, p) => sum + p.rating, 0) / 
       projectData.completed.filter(p => p.rating).length).toFixed(1) : null,
  };

  useEffect(() => {
    const fetchProjectCounts = async () => {
      try {
        const response = await axios.get(`${baseUrl}/api/client-project/`, {
          withCredentials: true,
        });
        
        setProjectData({
          active: response.data.active || [],
          completed: response.data.completed || [],
        });
        setLoading(false);
      } catch (err) {
        const errorMessage = err.response?.data?.error || 'Failed to fetch project data';
        setError(errorMessage);
        setLoading(false);
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

    if (isAuthenticated && user && user.role === 'client') {
      fetchProjectCounts();
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (!isAuthenticated || !user || user.role !== 'client') {
      navigate('/login');
    }
  }, [user, isAuthenticated, navigate]);

  if (!isAuthenticated || !user) {
    return null;
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="client-dashboard">
      {/* Enhanced Header */}
      <div style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '24px',
        padding: '32px',
        marginBottom: '32px',
        boxShadow: '0 20px 60px rgba(102, 126, 234, 0.25)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Background Pattern */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="50" cy="50" r="1" fill="%23ffffff" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>')`,
          pointerEvents: 'none',
        }}></div>

        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h1 style={{ 
                color: 'white', 
                marginBottom: '8px', 
                fontSize: '36px', 
                fontWeight: '800',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}>
                <span style={{ fontSize: '40px', filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))' }}>👋</span>
                Welcome back, {user.name}!
              </h1>
              <p style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '18px', margin: '0', fontWeight: '400' }}>
                Here's an overview of your projects and activities
              </p>
            </div>

            {/* Enhanced Notifications - Now properly positioned */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '16px',
            }}>
              <EnhancedNotifications />
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '20px', 
          margin: '20px 0',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
        }}>
          <Spinner size="large" text="Loading your dashboard..." fullPage={true} />
        </div>
      ) : error ? (
        <div style={{
          backgroundColor: '#fef2f2',
          color: '#dc2626',
          padding: '20px',
          borderRadius: '16px',
          border: '1px solid #fecaca',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <span style={{ fontSize: '20px' }}>⚠️</span>
          <div>
            <strong>Error:</strong> {error}
          </div>
        </div>
      ) : (
        <>
          {/* Enhanced Statistics Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '24px',
            marginBottom: '40px'
          }}>
            <StatCard
              title="Total Projects"
              value={stats.totalProjects}
              color="#3b82f6"
              icon="📊"
            />
            <StatCard
              title="Active Projects"
              value={stats.activeProjects}
              color="#10b981"
              icon="🚀"
            />
            <StatCard
              title="Completed Projects"
              value={stats.completedProjects}
              color="#8b5cf6"
              icon="✅"
            />
            <StatCard
              title="Client"
            color="#8b5cf6"
            />
            {stats.avgRating && (
              <StatCard
                title="Average Rating"
                value={`${stats.avgRating}/5`}
                color="#ef4444"
                icon="⭐"
              />
            )}
          </div>

          {/* Active Projects Section */}
          {projectData.active.length > 0 && (
            <div style={{ marginBottom: '40px' }}>
              <h2 style={{ 
                color: '#1f2937', 
                marginBottom: '24px',
                fontSize: '28px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}>
                <span style={{ fontSize: '32px' ,color:'white' }}>🚀</span>
                Active Projects ({projectData.active.length})
              </h2>
              {projectData.active.map((project, index) => (
                <ProjectCard key={project.job_id || index} project={project} type="active" />
              ))}
            </div>
          )}

          {/* Completed Projects Section */}
          {projectData.completed.length > 0 && (
            <div style={{ marginBottom: '40px' }}>
              <h2 style={{ 
                color: '#1f2937', 
                marginBottom: '24px',
                fontSize: '28px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}>
                <span style={{ fontSize: '32px' ,color:'white'}}>✅</span>
                Completed Projects ({projectData.completed.length})
              </h2>
              {projectData.completed.map((project, index) => (
                <ProjectCard key={project.job_id || index} project={project} type="completed" />
              ))}
            </div>
          )}

          {/* Enhanced Empty State */}
          {stats.totalProjects === 0 && (
            <div style={{
              backgroundColor: '#fff',
              borderRadius: '24px',
              padding: '64px 32px',
              textAlign: 'center',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
              border: '1px solid #e8ecf0',
            }}>
              <div style={{ fontSize: '80px', marginBottom: '24px' }}>📝</div>
              <h3 style={{ color: '#1f2937', marginBottom: '12px', fontSize: '28px', fontWeight: '700' }}>
                No Projects Yet
              </h3>
              <p style={{ color: '#6b7280', marginBottom: '32px', fontSize: '16px', lineHeight: '1.6' }}>
                Start by creating your first project to connect with skilled professionals and bring your ideas to life.
              </p>
              <button
                onClick={() => navigate('/create-job')}
                style={{
                  background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                  color: 'white',
                  border: 'none',
                  padding: '16px 32px',
                  borderRadius: '16px',
                  fontSize: '16px',
                  cursor: 'pointer',
                  fontWeight: '600',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 8px 25px rgba(59, 130, 246, 0.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 12px 35px rgba(59, 130, 246, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 8px 25px rgba(59, 130, 246, 0.3)';
                }}
              >
                <span style={{ fontSize: '18px' }}>🚀</span>
                Create Your First Project
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ClientDashBoardContent;