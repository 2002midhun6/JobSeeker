import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [socket, setSocket] = useState(null);
  const { user, isAuthenticated } = useContext(AuthContext);
  const navigate = useNavigate();

  // Set up WebSocket connection
  useEffect(() => {
    if (isAuthenticated && user) {
      // Get WebSocket token first
      const getWebSocketToken = async () => {
        try {
          const response = await axios.get('http://localhost:8000/api/websocket-token/', {
            withCredentials: true
          });
          
          const wsToken = response.data.access_token;
          
          // Create WebSocket connection with authentication token
          const ws = new WebSocket(`ws://localhost:8000/ws/notifications/?token=${wsToken}`);
          
          ws.onopen = () => {
            console.log('Notification WebSocket connected');
          };
          
          ws.onmessage = (e) => {
            const data = JSON.parse(e.data);
            console.log('Received notification:', data);
            
            // Handle different notification types
            if (data.type === 'job_application') {
              // Only for clients
              if (user.role === 'client') {
                handleJobApplicationNotification(data);
              }
            } else if (data.type === 'payment_received') {
              // Only for professionals
              if (user.role === 'professional') {
                handlePaymentNotification(data);
              }
            }
          };
          
          ws.onerror = (err) => {
            console.error('WebSocket error:', err);
          };
          
          ws.onclose = () => {
            console.log('Notification WebSocket closed');
            // Attempt to reconnect after a delay
            setTimeout(() => {
              getWebSocketToken();
            }, 3000);
          };
          
          setSocket(ws);
        } catch (error) {
          console.error('Failed to get WebSocket token:', error);
        }
      };
      
      getWebSocketToken();
      
      // Request notification permission
      if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
      
      // Fetch existing notifications
      fetchNotifications();
      
      // Clean up function
      return () => {
        if (socket) {
          socket.close();
        }
      };
    }
  }, [isAuthenticated, user, navigate]);

  // Fetch notifications from API
  const fetchNotifications = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/notifications/', {
        withCredentials: true
      });
      
      setNotifications(response.data);
      const unreadNotifs = response.data.filter(notification => !notification.is_read).length;
      setUnreadCount(unreadNotifs);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  // Handle job application notification (for clients)
  const handleJobApplicationNotification = (data) => {
    // Create new notification object
    const newNotification = {
      id: data.notification_id,
      notification_type: 'job_application',
      title: `New application for ${data.job_title}`,
      message: `${data.professional_name} has applied for your job: ${data.job_title}`,
      data: data,
      is_read: false,
      created_at: data.timestamp
    };
    
    // Add to notifications state
    setNotifications(prev => [newNotification, ...prev]);
    setUnreadCount(prev => prev + 1);
    
    // Show browser notification if permitted
    if ('Notification' in window && Notification.permission === 'granted') {
      const browserNotification = new Notification('New Job Application', {
        body: `${data.professional_name} applied for your job: ${data.job_title}`
      });
      
      browserNotification.onclick = () => {
        navigate(`/client-applications/${data.job_id}`);
        window.focus();
      };
    }
    
    // Play notification sound
    playNotificationSound();
  };

  // Handle payment notification (for professionals)
  const handlePaymentNotification = (data) => {
    // Format amount as currency
    const amount = new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(data.amount);
    
    // Create notification title and message based on payment type
    let title = '';
    let message = '';
    
    if (data.payment_type === 'initial') {
      title = `Job Assigned: ${data.job_title}`;
      message = `${data.client_name} has accepted your application and made the initial payment of ${amount} for the job: ${data.job_title}`;
    } else {
      title = `Payment Received: ${data.job_title}`;
      message = `${data.client_name} has made the final payment of ${amount} for the job: ${data.job_title}`;
    }
    
    // Create new notification object
    const newNotification = {
      id: data.notification_id,
      notification_type: 'payment',
      title: title,
      message: message,
      data: data,
      is_read: false,
      created_at: data.timestamp
    };
    
    // Add to notifications state
    setNotifications(prev => [newNotification, ...prev]);
    setUnreadCount(prev => prev + 1);
    
    // Show a toast notification with Sweetalert2
    Swal.fire({
      icon: 'success',
      title: title,
      text: message,
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 5000,
      timerProgressBar: true,
      didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer);
        toast.addEventListener('mouseleave', Swal.resumeTimer);
        toast.addEventListener('click', () => {
          Swal.close();
          if (data.payment_type === 'initial') {
            navigate('/professional-applications');
          } else {
            navigate('/professional-transactions');
          }
        });
      }
    });
    
    // Show browser notification if permitted
    if ('Notification' in window && Notification.permission === 'granted') {
      const browserNotification = new Notification(title, {
        body: message
      });
      
      browserNotification.onclick = () => {
        if (data.payment_type === 'initial') {
          navigate('/professional-applications');
        } else {
          navigate('/professional-transactions');
        }
        window.focus();
      };
    }
    
    // Play notification sound
    playNotificationSound();
  };

  // Play notification sound
  const playNotificationSound = () => {
    try {
      const audio = new Audio('/notification-sound.mp3');
      audio.play().catch(err => console.log('Failed to play notification sound:', err));
    } catch (err) {
      console.error('Error playing notification sound:', err);
    }
  };

  // Mark notifications as read
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
      
      updateUnreadCount();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  // Mark all notifications as read
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
  
  // Update unread count
  const updateUnreadCount = () => {
    const count = notifications.filter(notification => !notification.is_read).length;
    setUnreadCount(count);
  };

  return (
    <NotificationContext.Provider 
      value={{ 
        notifications, 
        unreadCount, 
        markAsRead, 
        markAllAsRead 
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};