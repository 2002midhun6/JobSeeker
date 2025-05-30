import React, { useState, useEffect, useRef, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import './EnhanceNotifications.css';
const baseUrl = import.meta.env.VITE_API_URL;
// Enhanced Spinner Component
const Spinner = ({ size = 'medium', text = 'Loading', inline = true, color = '#007bff' }) => {
  const spinnerStyles = {
    container: {
      display: 'flex',
      flexDirection: inline ? 'row' : 'column',
      alignItems: 'center',
      gap: inline ? '8px' : '12px',
      justifyContent: 'center',
      padding: inline ? '0' : '10px',
    },
    spinner: {
      width: size === 'small' ? '16px' : size === 'large' ? '24px' : '20px',
      height: size === 'small' ? '16px' : size === 'large' ? '24px' : '20px',
      border: `2px solid #f3f3f3`,
      borderTop: `2px solid ${color}`,
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
    },
    text: {
      color: '#666',
      fontSize: size === 'small' ? '12px' : '14px',
      fontWeight: '500',
    }
  };

  return (
    <div style={spinnerStyles.container}>
      <div style={spinnerStyles.spinner}></div>
      {text && <span style={spinnerStyles.text}>{text}</span>}
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

// Individual Notification Item Component
const NotificationItem = ({ notification, userType, onMarkAsRead, onDelete, onRedirect }) => {
  const getNotificationIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'job_application': return '👥';
      case 'payment': return '💰';
      case 'project_update': return '📋';
      case 'message': return '💬';
      case 'rating': return '⭐';
      case 'system': return '⚙️';
      default: return '🔔';
    }
  };

  const getNotificationColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'job_application': return '#3b82f6';
      case 'payment': return '#10b981';
      case 'project_update': return '#f59e0b';
      case 'message': return '#8b5cf6';
      case 'rating': return '#f97316';
      case 'system': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getTimeAgo = (dateString) => {
    const now = new Date();
    const notificationDate = new Date(dateString);
    const diffInMs = now - notificationDate;
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays < 10) return `${diffInDays}d ago`;
    return notificationDate.toLocaleDateString();
  };

  const getRedirectPath = () => {
    const data = notification.data || {};

    if (userType === 'client') {
      switch (notification.notification_type?.toLowerCase()) {
        case 'job_application':
          return data.job_id ? '/client-project' : '/client-project';
        case 'payment':
          return data.payment_id ? '/client-pending-payments' : '/client-transactions';
        case 'project_update':
          return data.project_id ? `/client/project/${data.project_id}` : '/client-project';
        case 'message':
          return data.job_id ? `/client-conversation/${data.job_id}` : '/client-conversations';
        case 'rating':
          return '/client-project';
        default:
          return '/client-pending-payments';
      }
    } else if (userType === 'professional') {
      switch (notification.notification_type?.toLowerCase()) {
        case 'job_application':
          return data.job_id ? `/professional-job/${data.job_id}` : '/professional-job';
        case 'payment':
          return data.payment_id ? `/professional-payments` : '/professional-transactions';
        case 'project_update':
          return data.project_id ? `/professional/project/${data.project_id}` : '/professional-job';
        case 'message':
          return data.job_id ? `/professional-conversation/${data.job_id}` : '/professional-conversations';
        case 'rating':
          return '/professional';
        default:
          return '/professional';
      }
    }
    return '/dashboard';
  };

  const handleClick = () => {
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }
    const redirectPath = getRedirectPath();
    onRedirect(redirectPath);
  };

  return (
    <div className={`notification-item ${!notification.is_read ? 'unread' : ''}`}>
      <div className="notification-content" onClick={handleClick}>
        <div className="notification-header">
          <div className="notification-icon-wrapper">
            <span 
              className="notification-icon"
              style={{ backgroundColor: getNotificationColor(notification.notification_type)}}
            >
              {getNotificationIcon(notification.notification_type)}
            </span>
            {!notification.is_read && <div className="unread-dot"></div>}
          </div>
          
          <div className="notification-meta">
            <span className="notification-time">{getTimeAgo(notification.created_at)}</span>
            <div className="notification-actions">
              {!notification.is_read && (
                <button
                  className="action-btn mark-read"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkAsRead(notification.id);
                  }}
                  title="Mark as read"
                >
                  ✓
                </button>
              )}
              {onDelete && (
                <button
                  className="action-btn delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(notification.id);
                  }}
                  title="Delete notification"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="notification-body">
          <h4 className="notification-title">{notification.title}</h4>
          <p className="notification-message">{notification.message}</p>
          
          {notification.data && Object.keys(notification.data).length > 0 && (
            <div className="notification-data">
              {notification.data.amount && (
                <span className="data-tag amount">
                  💰 ₹{notification.data.amount}
                </span>
              )}
              {notification.data.job_title && (
                <span className="data-tag job">
                  📋 {notification.data.job_title}
                </span>
              )}
              {notification.data.applicant_name && (
                <span className="data-tag applicant">
                  👤 {notification.data.applicant_name}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="notification-footer">
          <span className="redirect-hint">
            Click to view details →
          </span>
        </div>
      </div>
    </div>
  );
};

// Main Enhanced Notifications Component
const EnhancedNotifications = () => {
  const { user, isAuthenticated } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState('all'); // all, unread, read
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [socket, setSocket] = useState(null);
  const [deleteSupported, setDeleteSupported] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  // Helper function to get WebSocket token
  const getWebSocketToken = async () => {
    try {
      const response = await axios.get(`${baseUrl}/api/websocket-token/`, {
        withCredentials: true
      });
      return response.data.access_token;
    } catch (error) {
      console.error('Failed to get WebSocket token:', error);
      return null;
    }
  };

  // Check API capabilities
  const checkApiCapabilities = async () => {
    try {
      // Try the enhanced endpoint first
      const response = await axios.get(
        `${baseUrl}/api/notifications/?page=1`,
        { withCredentials: true }
      );
      
      // Check if response has the new structure
      if (response.data.notifications !== undefined) {
        setDeleteSupported(true);
        return 'enhanced';
      }
    } catch (error) {
      console.log('Enhanced API not available, falling back to original');
    }
    
    return 'original';
  };

  // Fetch notifications with fallback support
  const fetchNotifications = async (pageNum = 1, reset = false) => {
    try {
      setLoading(true);
      
      const apiType = await checkApiCapabilities();
      let response;
      
      if (apiType === 'enhanced') {
        // Try enhanced API first
        response = await axios.get(
          `${baseUrl}/api/notifications/?page=${pageNum}&filter=${filter}`,
          { withCredentials: true }
        );
        
        const newNotifications = response.data.notifications || [];
        
        if (reset || pageNum === 1) {
          setNotifications(newNotifications);
        } else {
          setNotifications(prev => [...prev, ...newNotifications]);
        }

        setUnreadCount(response.data.unread_count || 0);
        setHasMore(newNotifications.length >= 10);
      } else {
        // Fall back to original API
        response = await axios.get(`${baseUrl}/api/notifications/`, {
          withCredentials: true
        });
        
        const allNotifications = response.data || [];
        
        // Apply client-side filtering for original API
        let filteredNotifications = allNotifications;
        if (filter === 'unread') {
          filteredNotifications = allNotifications.filter(n => !n.is_read);
        } else if (filter === 'read') {
          filteredNotifications = allNotifications.filter(n => n.is_read);
        }
        
        // Apply client-side pagination
        const startIndex = (pageNum - 1) * 10;
        const endIndex = startIndex + 10;
        const paginatedNotifications = filteredNotifications.slice(startIndex, endIndex);
        
        if (reset || pageNum === 1) {
          setNotifications(filteredNotifications.slice(0, endIndex));
        } else {
          setNotifications(prev => [...prev, ...paginatedNotifications]);
        }

        const unread = allNotifications.filter(notification => !notification.is_read).length;
        setUnreadCount(unread);
        setHasMore(endIndex < filteredNotifications.length);
      }
      
      setPage(pageNum);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initialize WebSocket
  const initWebSocket = async () => {
    const token = await getWebSocketToken();
    if (!token) return;

    const ws = new WebSocket(`wss://${baseUrl}//ws/notifications/?token=${token}`);
    
    ws.onopen = () => {
      console.log('Notification WebSocket connected');
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('Notification received:', data);
      
      if (data.type || data.notification_type) {
        // Create notification object compatible with both formats
        const notification = {
          id: data.notification_id || data.id,
          notification_type: data.type || data.notification_type,
          title: data.title || `New ${(data.type || data.notification_type || '').replace('_', ' ')}`,
          message: data.message || `You have a new ${(data.type || data.notification_type || '').replace('_', ' ')} notification`,
          data: data,
          is_read: false,
          created_at: data.timestamp || new Date().toISOString()
        };
        
        // Add new notification to the top
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
        
        // Browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
          const browserNotification = new Notification(notification.title, {
            body: notification.message
          });
          
          browserNotification.onclick = () => {
            navigate('/dashboard');
            window.focus();
          };
        }
        
        // Play notification sound
        playNotificationSound();
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    ws.onclose = () => {
      console.log('Notification WebSocket connection closed');
      setTimeout(initWebSocket, 3000); // Reconnect
    };
    
    setSocket(ws);
  };

  // Play notification sound
  const playNotificationSound = () => {
    const audio = new Audio('/notification-sound.mp3');
    audio.play().catch(err => console.log('Failed to play notification sound:', err));
  };

  // Mark notification as read with fallback
  const markAsRead = async (notificationId) => {
    try {
      // Try enhanced API first
      try {
        await axios.patch(
          `${baseUrl}/api/notifications/${notificationId}/read/`,
          {},
          { withCredentials: true }
        );
      } catch (error) {
        // Fall back to original API
        await axios.post(`${baseUrl}/api/notifications/mark-read/`, {
          notification_id: notificationId
        }, {
          withCredentials: true
        });
      }

      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, is_read: true }
            : notification
        )
      );

      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all as read with fallback
  const markAllAsRead = async () => {
    try {
      // Try enhanced API first
      try {
        await axios.patch(
          `${baseUrl}/api/notifications/mark-all-read/`,
          {},
          { withCredentials: true }
        );
      } catch (error) {
        // Fall back to original API
        await axios.post(
          `${baseUrl}/api/notifications/mark-all-read/`,
          {},
          { withCredentials: true }
        );
      }

      setNotifications(prev =>
        prev.map(notification => ({ ...notification, is_read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Delete notification (only if supported)
  const deleteNotification = async (notificationId) => {
    if (!deleteSupported) return;
    
    try {
      await axios.delete(
       `${baseUrl}/api/notifications/${notificationId}/`,
        { withCredentials: true }
      );

      const deletedNotification = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      if (deletedNotification && !deletedNotification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Handle redirect
  const handleRedirect = (path) => {
    setIsOpen(false);
    navigate(path);
  };

  // Load more notifications
  const loadMore = () => {
    if (!loading && hasMore) {
      fetchNotifications(page + 1, false);
    }
  };

  // Handle filter change
  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setPage(1);
    fetchNotifications(1, true);
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Initialize notifications and WebSocket
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    fetchNotifications(1, true);
    initWebSocket();
    
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [isAuthenticated, user]);

  // Auto-refresh notifications
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isOpen) {
        fetchNotifications(1, true);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isOpen, filter]);

  // Don't render if not authenticated
  if (!isAuthenticated || !user) {
    return null;
  }

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') return !notification.is_read;
    if (filter === 'read') return notification.is_read;
    return true;
  });

  return (
    <div className="enhanced-notifications" ref={dropdownRef}>
      {/* Notification Bell Button */}
      <button
        className={`notification-bell ${unreadCount > 0 ? 'has-unread' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="bell-icon">🔔</span>
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div className="notification-dropdown">
          {/* Header */}
          <div className="notification-header">
            <h3 className="header-title">
              <span className="header-icon">🔔</span>
              Notifications
            </h3>
            
            <div className="header-actions">
              {unreadCount > 0 && (
                <button
                  className="mark-all-read-btn"
                  onClick={markAllAsRead}
                  title="Mark all as read"
                >
                  ✓ All
                </button>
              )}
              <button
                className="close-btn"
                onClick={() => setIsOpen(false)}
                title="Close"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="filter-tabs">
            {[
              { key: 'all', label: 'All', count: notifications.length },
              { key: 'unread', label: 'Unread', count: unreadCount },
              { key: 'read', label: 'Read', count: notifications.length - unreadCount }
            ].map(tab => (
              <button
                key={tab.key}
                className={`filter-tab ${filter === tab.key ? 'active' : ''}`}
                onClick={() => handleFilterChange(tab.key)}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className="tab-count">{tab.count}</span>
                )}
              </button>
            ))}
          </div>

          {/* Notifications List */}
          <div className="notifications-list">
            {loading && notifications.length === 0 ? (
              <div className="loading-state">
                <Spinner />
                <span>Loading notifications...</span>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  {filter === 'unread' ? '✅' : '🔔'}
                </div>
                <h4>
                  {filter === 'unread' 
                    ? 'All caught up!' 
                    : 'No notifications yet'
                  }
                </h4>
                <p>
                  {filter === 'unread'
                    ? 'You have no unread notifications'
                    : 'Notifications will appear here when you have activity'
                  }
                </p>
              </div>
            ) : (
              <>
                {filteredNotifications.map(notification => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    userType={user?.role}
                    onMarkAsRead={markAsRead}
                    onDelete={deleteSupported ? deleteNotification : null}
                    onRedirect={handleRedirect}
                  />
                ))}

                {/* Load More Button */}
                {hasMore && (
                  <div className="load-more-container">
                    <button
                      className="load-more-btn"
                      onClick={loadMore}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Spinner size="small" />
                          Loading...
                        </>
                      ) : (
                        'Load More'
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="notification-footer">
            <button
              className="view-all-btn"
              onClick={() => {
                setIsOpen(false);
                navigate(user?.role === 'client' ? '/client-notifications' : '/professional-notifications');
              }}
            >
              View All Notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedNotifications;