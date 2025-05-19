import React, { useState, useEffect, useContext, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import axios from 'axios';
import './Notification.css'

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [socket, setSocket] = useState(null);
  const { user, isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();
  const notificationRef = useRef(null);

  // Helper function to get WebSocket token
  const getWebSocketToken = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/websocket-token/', {
        withCredentials: true
      });
      return response.data.access_token;
    } catch (error) {
      console.error('Failed to get WebSocket token:', error);
      return null;
    }
  };

  // Set up WebSocket connection and fetch existing notifications
  useEffect(() => {
    if (!isAuthenticated || !user || user.role !== 'client') return;

    // Fetch existing notifications
    const fetchNotifications = async () => {
      try {
        const response = await axios.get('http://localhost:8000/api/notifications/', {
          withCredentials: true
        });
        setNotifications(response.data);
        
        // Count unread notifications
        const unread = response.data.filter(notification => !notification.is_read).length;
        setUnreadCount(unread);
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      }
    };

    // Initialize WebSocket connection for real-time notifications
    const initWebSocket = async () => {
      const token = await getWebSocketToken();
      if (!token) return;

      const ws = new WebSocket(`ws://localhost:8000/ws/notifications/?token=${token}`);
      
      ws.onopen = () => {
        console.log('Notification WebSocket connected');
      };
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('Notification received:', data);
        
        if (data.type === 'job_application') {
          // Create notification object
          const notification = {
            id: data.notification_id,
            notification_type: 'job_application',
            title: `New application for ${data.job_title}`,
            message: `${data.professional_name} has applied for your job: ${data.job_title}`,
            data: data,
            is_read: false,
            created_at: data.timestamp
          };
          
          // Add new notification to the top of the list
          setNotifications(prev => [notification, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          // Show browser notification if allowed
          if ('Notification' in window && Notification.permission === 'granted') {
            const browserNotification = new Notification('New Job Application', {
              body: notification.message
            });
            
            browserNotification.onclick = () => {
              navigate(`/client-applications/${data.job_id}`);
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
        // Try to reconnect after delay
        setTimeout(initWebSocket, 3000);
      };
      
      setSocket(ws);
    };
    
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    
    fetchNotifications();
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
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Play notification sound
  const playNotificationSound = () => {
    const audio = new Audio('/notification-sound.mp3');
    audio.play().catch(err => console.log('Failed to play notification sound'));
  };

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  const markAsRead = async (notificationId) => {
    try {
      await axios.post('http://localhost:8000/api/notifications/mark-read/', {
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
    try {
      await axios.post('http://localhost:8000/api/notifications/mark-all-read/', {}, {
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

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    
    // Navigate based on notification type
    if (notification.notification_type === 'job_application') {
      const jobId = notification.data?.job_id;
      if (jobId) {
        navigate(`#`);
      }
    }
    
    setShowDropdown(false);
  };

  // Only show for clients
  if (!isAuthenticated || !user || user.role !== 'client') {
    return null;
  }

  return (
    <div className="notifications-container" ref={notificationRef}>
      <div className="notification-icon" onClick={toggleDropdown}>
        <i className="fas fa-bell"></i>
        {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
      </div>
      
      {showDropdown && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notifications</h3>
            {notifications.length > 0 && unreadCount > 0 && (
              <button className="mark-all-read" onClick={markAllAsRead}>
                Mark all as read
              </button>
            )}
          </div>
          
          <div className="notification-list">
            {notifications.length > 0 ? (
              notifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-content">
                    <p><strong>{notification.title}</strong></p>
                    <p>{notification.message}</p>
                    <span className="notification-time">
                      {new Date(notification.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="no-notifications">No notifications yet</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;