import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import axios from 'axios';

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
const NotificationItem = ({ notification, onMarkAsRead, onRedirect, animatingNotification }) => {
  const getNotificationIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'payment': return '💰';
      case 'job_application': return '📝';
      case 'project_completion': return '✅';
      case 'project_cancellation': return '❌';
      case 'project_update': return '📋';
      case 'message': return '💬';
      case 'rating': return '⭐';
      case 'system': return '⚙️';
      default: return '🔔';
    }
  };

  const getNotificationColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'payment': return '#10b981';
      case 'job_application': return '#3b82f6';
      case 'project_completion': return '#059669';
      case 'project_cancellation': return '#ef4444';
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
    
    switch (notification.notification_type?.toLowerCase()) {
      case 'payment':
        return '/professional/transactions';
      case 'job_application':
        return data.job_id ? `/professional-job/${data.job_id}` : '/professional-jobs';
      case 'project_update':
        return data.project_id ? `/professional/project/${data.project_id}` : '/professional-jobs';
      case 'message':
        return data.job_id ? `/professional-conversation/${data.job_id}` : '/professional-conversations';
      case 'rating':
        return '/professional';
      default:
        return '/professional';
    }
  };

  const handleClick = () => {
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }
    const redirectPath = getRedirectPath();
    onRedirect(redirectPath);
  };

  return (
    <div 
      className={`notification-item ${!notification.is_read ? 'unread' : ''} ${
        animatingNotification === notification.id ? 'new-notification' : ''
      }`}
    >
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
              {notification.data.client_name && (
                <span className="data-tag client">
                  👤 {notification.data.client_name}
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

const ProfessionalNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [socket, setSocket] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [animatingNotification, setAnimatingNotification] = useState(null);
  const [filter, setFilter] = useState('all'); // all, unread, read
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const { user, isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();
  const notificationRef = useRef(null);

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

  // Fetch notifications with pagination support
  const fetchNotifications = async (pageNum = 1, reset = false) => {
    try {
      setIsLoading(true);
      
      const response = await axios.get(`${baseUrl}/api/notifications/`, {
        withCredentials: true
      });
      
      const allNotifications = response.data || [];
      
      // Apply client-side filtering
      let filteredNotifications = allNotifications;
      if (filter === 'unread') {
        filteredNotifications = allNotifications.filter(n => !n.is_read);
      } else if (filter === 'read') {
        filteredNotifications = allNotifications.filter(n => n.is_read);
      }
      
      // Apply client-side pagination
      const startIndex = (pageNum - 1) * 10;
      const endIndex = startIndex + 10;
      
      if (reset || pageNum === 1) {
        setNotifications(filteredNotifications.slice(0, endIndex));
      } else {
        const paginatedNotifications = filteredNotifications.slice(startIndex, endIndex);
        setNotifications(prev => [...prev, ...paginatedNotifications]);
      }

      const unread = allNotifications.filter(notification => !notification.is_read).length;
      setUnreadCount(unread);
      setHasMore(endIndex < filteredNotifications.length);
      setPage(pageNum);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Set up WebSocket connection
  useEffect(() => {
    if (!isAuthenticated || !user || user.role !== 'professional') return;

    // Initialize WebSocket connection for real-time notifications
    const initWebSocket = async () => {
      const token = await getWebSocketToken();
      if (!token) return;

      const ws = new WebSocket(`wss://api.midhung.in/ws/notifications/?token=${token}`);
      
      ws.onopen = () => {
        console.log('Notification WebSocket connected');
      };
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('Notification received:', data);
        
        if (data.type === 'payment' || data.notification_type) {
          // Create notification object
          const notification = {
            id: data.notification_id || Date.now(),
            notification_type: data.type || data.notification_type || 'payment',
            title: data.title || `${data.payment_type === 'initial' ? 'Initial' : 'Final'} payment received`,
            message: data.message || `${data.client_name} has made the ${data.payment_type === 'initial' ? 'initial' : 'final'} payment for job: ${data.job_title}`,
            data: data,
            is_read: false,
            created_at: data.timestamp || new Date().toISOString()
          };
          
          // Add new notification with animation
          setNotifications(prev => [notification, ...prev]);
          setUnreadCount(prev => prev + 1);
          setAnimatingNotification(notification.id);
          
          // Remove animation class after animation completes
          setTimeout(() => setAnimatingNotification(null), 600);
          
          // Show browser notification if allowed
          if ('Notification' in window && Notification.permission === 'granted') {
            const browserNotification = new Notification(notification.title, {
              body: notification.message,
              icon: '/notification-icon.png',
              tag: 'payment-notification'
            });
            
            browserNotification.onclick = () => {
              navigate('/professional-jobs');
              window.focus();
            };
          }
          
          // Play notification sound
          playNotificationSound();
          
          // Trigger bell shake animation
          triggerBellShake();
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      ws.onclose = () => {
        console.log('Notification WebSocket connection closed');
        // Try to reconnect after delay
        setTimeout(initWebSocket, 3000);
      };
      
      setSocket(ws);
    };
    
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    
    fetchNotifications(1, true);
    initWebSocket();
    
    // Cleanup function
    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [isAuthenticated, user, navigate]);

  // Click outside handler to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [showDropdown]);

  // Play notification sound
  const playNotificationSound = () => {
    const audio = new Audio('/notification-sound.mp3');
    audio.volume = 0.5;
    audio.play().catch(err => console.log('Failed to play notification sound:', err));
  };

  // Trigger bell shake animation
  const triggerBellShake = () => {
    const bellElement = document.querySelector('.notification-bell');
    if (bellElement) {
      bellElement.classList.add('shake');
      setTimeout(() => bellElement.classList.remove('shake'), 1000);
    }
  };

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  const markAsRead = async (notificationId) => {
    try {
      await axios.post(`${baseUrl}/api/notifications/mark-read/`, {
        notification_id: notificationId
      }, {
        withCredentials: true
      });
      
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, is_read: true } 
            : notification
        )
      );
      
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (unreadCount === 0) return;
    
    try {
      await axios.post(`${baseUrl}/api/notifications/mark-all-read/`, {}, {
        withCredentials: true
      });
      
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, is_read: true }))
      );
      
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const handleNotificationClick = (path) => {
    setShowDropdown(false);
    navigate(path);
  };

  // Handle filter change
  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setPage(1);
    fetchNotifications(1, true);
  };

  // Load more notifications
  const loadMore = () => {
    if (!isLoading && hasMore) {
      fetchNotifications(page + 1, false);
    }
  };

  // Only show for professionals
  if (!isAuthenticated || !user || user.role !== 'professional') {
    return null;
  }

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') return !notification.is_read;
    if (filter === 'read') return notification.is_read;
    return true;
  });

  return (
    <div className="enhanced-notifications-container" ref={notificationRef}>
      {/* Notification Bell Button */}
      <div className="notification-bell-wrapper" onClick={toggleDropdown}>
        <div className={`notification-bell ${unreadCount > 0 ? 'has-notifications shake' : ''}`}>
          <svg className="bell-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          {unreadCount > 0 && (
            <span className="notification-badge">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
      </div>
      
      {showDropdown && (
        <div className="enhanced-notification-dropdown">
          {/* Header */}
          <div className="notification-header">
            <div className="header-content">
              <h3 className="header-title">
                <span className="header-icon">🔔</span>
                Notifications
              </h3>
              <span className="notification-count">
                {unreadCount > 0 ? `${unreadCount} new` : 'All caught up!'}
              </span>
            </div>
            <div className="header-actions">
              {unreadCount > 0 && (
                <button className="mark-all-read-btn" onClick={markAllAsRead}>
                  <span className="btn-icon">✓</span>
                  Mark all as read
                </button>
              )}
              <button
                className="close-btn"
                onClick={() => setShowDropdown(false)}
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
          <div className="notification-content">
            {isLoading && notifications.length === 0 ? (
              <div className="loading-state">
                <Spinner />
                <span>Loading notifications...</span>
              </div>
            ) : filteredNotifications.length > 0 ? (
              <div className="notification-list">
                {filteredNotifications.slice(0, 10).map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={markAsRead}
                    onRedirect={handleNotificationClick}
                    animatingNotification={animatingNotification}
                  />
                ))}
                
                {/* Load More Button */}
                {hasMore && (
                  <div className="load-more-container">
                    <button
                      className="load-more-btn"
                      onClick={loadMore}
                      disabled={isLoading}
                    >
                      {isLoading ? (
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
              </div>
            ) : (
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
                    : 'When you receive payments or updates, they\'ll appear here.'
                  }
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="notification-footer">
            <button
              className="view-all-btn"
              onClick={() => {
                setShowDropdown(false);
                navigate('/professional-notifications');
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

export default ProfessionalNotifications;