import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import VideoCall from '../vediocall/VedioCall';
import './ConversationChat.css';
import { AuthContext } from '../../context/AuthContext';

const baseUrl = import.meta.env.VITE_API_URL;

// Helper function to get WebSocket URL from HTTP URL
const getWebSocketUrl = (httpUrl) => {
  try {
    const url = new URL(httpUrl);
    const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${url.host}`;
  } catch (error) {
    console.error('Error parsing base URL:', error);
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${window.location.host}`;
  }
};

// Modal Component for Image Enlargement
function ImageModal({ isOpen, onClose, imageSrc }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <img src={imageSrc} alt="Enlarged view" style={{ maxWidth: '90vw', maxHeight: '90vh' }} />
        <button onClick={onClose} className="close-button">Close</button>
      </div>
    </div>
  );
}

const isValidDate = (dateString) => {
  if (!dateString) return false;
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
};

function ConversationChat() {
  const { jobId } = useParams();
  const [job, setJob] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [socket, setSocket] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [socketRetries, setSocketRetries] = useState(0);
  const [socketError, setSocketError] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImageSrc, setModalImageSrc] = useState('');
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const [showVideoCall, setShowVideoCall] = useState(false);
  const MAX_SOCKET_RETRIES = 3;
  const RETRY_DELAY = 3000;
  const { user } = useContext(AuthContext);

  // ADDED: Track failed file attempts to prevent infinite loops
  const [failedFiles, setFailedFiles] = useState(new Set());
  const [recoveryAttempts, setRecoveryAttempts] = useState(new Map());

  const addSystemMessage = (content) => {
    const systemMessage = {
      id: `system-${Date.now()}`,
      content,
      sender_name: 'System',
      created_at: new Date().toISOString(),
      type: 'system',
    };
    setMessages((prev) => [...prev, systemMessage]);
  };

  // IMPROVED: Better URL construction
  const getValidFileUrl = (url) => {
    if (!url) return null;
    
    console.log('Processing URL:', url); // Debug log
    
    // If it's already a full URL (starts with http/https), return as is
    if (url.startsWith('https')) {
      console.log('hello')
      console.log('starting with http ',url)
      return url;
    }
    
    // If it starts with /media/, construct full URL with baseUrl
    if (url.startsWith('/media/')) {
      console.log('starting with media',url)
      return `${baseUrl}${url}`;
    }
    
    // For any other case, assume it's a relative path and build the full URL
    // Remove leading slash if present
    let cleanUrl = url;
    if (cleanUrl.startsWith('/')) {
      cleanUrl = cleanUrl.substring(1);
    }
    
    return `${baseUrl}/${cleanUrl}`;
  };
  // IMPROVED: Prevent infinite recovery loops
  const handleImageError = async (e, messageId) => {
    const originalSrc = e.target.src;
    console.error('Image failed to load:', originalSrc);
    
    // Check if we've already tried recovering this message multiple times
    const attempts = recoveryAttempts.get(messageId) || 0;
    if (attempts >= 20) {
      console.log(`Max recovery attempts reached for message ${messageId}`);
      e.target.onerror = null;
      e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5OTkiPkltYWdlIHVuYXZhaWxhYmxlPC90ZXh0Pjwvc3ZnPg==';
      return;
    }

    // Track recovery attempts
    setRecoveryAttempts(prev => new Map(prev).set(messageId, attempts + 1));
    
    try {
      console.log(`Recovery attempt ${attempts + 1} for message ${messageId}`);
      const recoveredUrl = await recoverFile(messageId);
      if (recoveredUrl && recoveredUrl !== originalSrc) {
        console.log('Setting new recovered URL:', recoveredUrl);
        e.target.src = recoveredUrl;
      } else {
        console.log('Recovery failed or returned same URL');
        e.target.onerror = null;
        e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5OTkiPkltYWdlIHVuYXZhaWxhYmxlPC90ZXh0Pjwvc3ZnPg==';
      }
    } catch (error) {
      console.error('Error recovering file:', error);
      e.target.onerror = null;
      e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5OTkiPkltYWdlIHVuYXZhaWxhYmxlPC90ZXh0Pjwvc3ZnPg==';
    }
  };

  // IMPROVED: Prevent infinite recovery loops for documents
  const handleDocumentClick = async (e, messageId, originalUrl) => {
    e.preventDefault();
    console.log(originalUrl)
    // Check if we've already tried this file
    if (failedFiles.has(messageId)) {
      alert('Sorry, this file is not available.');
      return;
    }
    
    try {
      
      // First try the original URL
      const response = await fetch(originalUrl, { method: 'HEAD' });
      if (response.ok) {
        window.open(originalUrl, '_blank');
        
        return;
      }
    } catch (error) {
      console.log('Original URL failed, trying recovery...');
    }
    
    try {
      // Try to recover the file only once
      const recoveredUrl = await recoverFile(messageId);
      if (recoveredUrl && recoveredUrl !== originalUrl) {
        window.open(recoveredUrl, '_blank');
      } else {
        setFailedFiles(prev => new Set(prev).add(messageId));
        alert('Sorry, this file is no longer available.');
      }
    } catch (error) {
      console.error('Error recovering document:', error);
      setFailedFiles(prev => new Set(prev).add(messageId));
      alert('Sorry, there was an error opening this file.');
    }
  };

  // IMPROVED: Add debouncing to prevent multiple simultaneous calls
  const recoverFile = async (messageId) => {
    try {
      console.log('Attempting to recover file for message:', messageId);
      const response = await axios.post(
        `${baseUrl}/api/conversations/file-recovery/`,
        { message_id: messageId },
        { withCredentials: true }
      );
      
      if (response.data.success && response.data.new_url) {
        console.log('File recovery successful:', response.data.new_url);
        
        // Update the message in state
        setMessages((prev) =>
          prev.map((msg) => (msg.id === messageId ? { ...msg, file_url: response.data.new_url } : msg))
        );
        
        return response.data.new_url;
      } else {
        console.log('File recovery failed - no new URL returned');
      }
    } catch (error) {
      console.error('Failed to recover file:', error);
    }
    return null;
  };

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await axios.get(`${baseUrl}/api/check-auth/`, {
          withCredentials: true,
        });

        setUserInfo({
          id: response.data.user.id,
          name: response.data.user.name,
          role: response.data.user.role,
          email: response.data.user.email,
        });
      } catch (err) {
        console.error('Failed to fetch user info:', err);
        setError('Failed to authenticate. Please log in.');
      }
    };

    fetchUserInfo();
  }, []);

  useEffect(() => {
    const fetchConversation = async () => {
      try {
        setLoading(true);
        console.log(`Fetching conversation for job ${jobId}`);
        const response = await axios.get(`${baseUrl}/api/conversations/job/${jobId}/`, {
          withCredentials: true,
        });
        console.log('Conversation data:', response.data);
        setJob({
          id: response.data.job,
          title: response.data.job_title,
          client_id: response.data.client_id || null,
          professional_id: response.data.professional_id || null,
        });
        setMessages(response.data.messages || []);
        setLoading(false);
      } catch (err) {
        console.error('Fetch error:', err);
        setError(
          err.message ||
          (err.response?.status === 403
            ? 'You do not have access to this conversation.'
            : err.response?.status === 404
            ? 'Conversation not found.'
            : 'Something went wrong. Please try again.')
        );
        setLoading(false);
      }
    };

    fetchConversation();
  }, [jobId]);

  useEffect(() => {
    let ws = null;
    let reconnectTimer = null;

    const connectWebSocket = () => {
      if (socketRetries >= MAX_SOCKET_RETRIES) {
        setSocketError('Failed to connect to chat. Please refresh the page to try again.');
        console.error(`Max retries (${MAX_SOCKET_RETRIES}) reached.`);
        return;
      }

      if (ws) {
        console.log('Closing existing WebSocket');
        ws.close();
      }

      console.log(`WebSocket attempt ${socketRetries + 1}/${MAX_SOCKET_RETRIES}`);

      axios
        .get(`${baseUrl}/api/ws-auth-token/`, {
          withCredentials: true,
        })
        .then((response) => {
          const token = response.data.access_token;
          console.log('Received WebSocket auth token:', token ? 'Present' : 'Missing');

          if (!token) {
            throw new Error('No authentication token received');
          }

          const wsBaseUrl = getWebSocketUrl(baseUrl);
          const wsUrl = `${wsBaseUrl}/ws/chat/${jobId}/?token=${encodeURIComponent(token)}`;
          
          console.log('Base URL:', baseUrl);
          console.log('WebSocket Base URL:', wsBaseUrl);
          console.log('Connecting to WebSocket:', wsUrl);

          ws = new WebSocket(wsUrl);

          ws.onopen = () => {
            console.log('WebSocket connected successfully');
            setSocketConnected(true);
            setSocketRetries(0);
            setSocketError(null);
          };

          ws.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              console.log('Received WebSocket message:', data);

              if (data.event === 'user_joined' || data.event === 'user_left') {
                console.log(`User ${data.event}:`, data);
              } else if (data.error) {
                setSocketError(data.error);
                console.error('WebSocket error message:', data.error);
              } else if (data.id && (data.content || data.file_url)) {
                setMessages((prev) => {
                  if (prev.some((msg) => msg.id === data.id)) return prev;
                  return [...prev, data];
                });
              }
            } catch (error) {
              console.error('Parse error:', error, event.data);
            }
          };

          ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            setSocketConnected(false);
            setSocketError('Chat connection failed. Retrying...');
          };

          ws.onclose = (event) => {
            console.log(`WebSocket closed: code=${event.code}, reason=${event.reason || 'No reason provided'}`);
            setSocketConnected(false);

            if (event.code === 4001) {
              setSocketError('Authentication failed. Please log in again.');
              return;
            } else if (event.code === 4002) {
              setSocketError('Invalid authentication token. Please refresh the page.');
              return;
            } else if (event.code === 4003) {
              setSocketError('Session expired. Please log in again.');
              return;
            }

            if (!event.wasClean && socketRetries < MAX_SOCKET_RETRIES) {
              console.log(`Reconnecting in ${RETRY_DELAY}ms...`);
              reconnectTimer = setTimeout(() => {
                setSocketRetries((prev) => prev + 1);
                connectWebSocket();
              }, RETRY_DELAY);
            } else {
              setSocketError(`Chat disconnected (code ${event.code}). Please refresh the page.`);
            }
          };

          setSocket(ws);
        })
        .catch((error) => {
          console.error('Failed to get WebSocket auth token:', error);
          
          if (error.response?.status === 401) {
            setSocketError('Please log in again to use chat.');
          } else if (error.response?.status === 404) {
            setSocketError('Chat service is not available. Please contact support.');
          } else {
            setSocketError('Authentication failed. Please refresh the page and try again.');
          }
          
          if (socketRetries < MAX_SOCKET_RETRIES) {
            setTimeout(() => {
              setSocketRetries((prev) => prev + 1);
              connectWebSocket();
            }, RETRY_DELAY);
          }
        });
    };

    if (!loading && !error && userInfo) {
      connectWebSocket();
    }

    return () => {
      if (ws) {
        console.log('Closing WebSocket');
        ws.close();
      }
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
    };
  }, [jobId, loading, error, socketRetries, userInfo]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socketConnected) return;
    try {
      console.log('Sending:', newMessage.trim());
      socket.send(JSON.stringify({ message: newMessage.trim() }));
      setNewMessage('');
    } catch (error) {
      console.error('Send error:', error);
      setSocketError('Failed to send message.');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !socketConnected) return;

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setSocketError('File size exceeds 10MB limit');
      e.target.value = null;
      return;
    }

    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];

    if (!allowedTypes.includes(file.type)) {
      setSocketError('Unsupported file type. Please upload images or documents only.');
      e.target.value = null;
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    
    try {
      console.log('Uploading file:', file.name);
      const response = await axios.post(
        `${baseUrl}/api/conversations/job/${jobId}/file/`,
        formData,
        {
          withCredentials: true,
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );
      console.log('File uploaded:', response.data);
      addSystemMessage(`File "${file.name}" uploaded successfully`);
    } catch (error) {
      console.error('File upload error:', error.response?.data || error.message);
      setSocketError(`Failed to upload file: ${error.response?.data?.error || 'Please try again'}`);
    }
    e.target.value = null;
  };

  const handleReconnect = () => {
    setSocketRetries(0);
    setSocketError(null);
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString();
  };

  const groupMessagesByDate = () => {
    const groups = {};

    const validMessages = messages.filter((message) => {
      if (message.type === 'system') {
        return false;
      }

      if (!isValidDate(message.created_at)) {
        console.warn('Message with invalid timestamp:', message);
        return false;
      }

      return true;
    });

    validMessages.forEach((message) => {
      try {
        const date = new Date(message.created_at).toLocaleDateString();
        if (!groups[date]) groups[date] = [];
        groups[date].push(message);
      } catch (error) {
        console.error('Error processing message date:', error, message);
      }
    });

    return groups;
  };

  const messageGroups = groupMessagesByDate();

  const openImageModal = (imageSrc) => {
    setModalImageSrc(imageSrc);
    setModalOpen(true);
  };

  const closeImageModal = () => {
    setModalOpen(false);
    setModalImageSrc('');
  };

  const toggleVideoCall = () => {
    console.log("Toggling video call:", !showVideoCall);
    setShowVideoCall(prev => !prev);
  };

  const handleEndCall = () => {
    console.log("Call ended, hiding video interface");
    setShowVideoCall(false);
  };

  if (loading) return <div className="chat-loading">Loading conversation...</div>;
  if (error) return (
    <div className="chat-error">
      <p>{error}</p>
      <button onClick={() => navigate(-1)} className="back-button">Go Back</button>
    </div>
  );
  if (!userInfo) return <div className="chat-loading">Loading user info...</div>;

  return (
    <div className="chat-container">
      <div className="chat-header">
        <button onClick={() => navigate(-1)} className="back-button">← Back</button>
        <h2>{job?.title || 'Chat'}</h2>
        <div className="connection-status">
          {socketConnected ? (
            <>
              <span className="status-connected">Connected</span>
              <button
                onClick={toggleVideoCall}
                className={`video-call-button ${showVideoCall ? 'active' : ''}`}
                disabled={!socketConnected}
              >
                {showVideoCall ? '📵 Hide Video' : '📹 Video Call'}
              </button>
            </>
          ) : (
            <span className="status-disconnected">
              Disconnected
              {socketError && <button onClick={handleReconnect} className="reconnect-button">Reconnect</button>}
            </span>
          )}
        </div>
      </div>

      {socketError && (
        <div className="socket-error-banner">
          <p>{socketError}</p>
          <button onClick={handleReconnect}>Try Again</button>
        </div>
      )}

      {showVideoCall && (
        <div className="video-call-wrapper">
          <h3 className="video-call-header">Video Call</h3>
          <VideoCall
            jobId={jobId}
            userInfo={userInfo}
            onEndCall={handleEndCall}
          />
        </div>
      )}

      <div className="messages-container">
        {Object.keys(messageGroups).length === 0 ? (
          <div className="no-messages">
            <p>No messages yet</p>
            <p>Start the conversation by sending a message or uploading a file below</p>
          </div>
        ) : (
          Object.entries(messageGroups).map(([date, messagesForDate]) => (
            <div key={date} className="message-date-group">
              <div className="date-divider">
                <span>{date === new Date().toLocaleDateString() ? 'Today' : formatDate(date)}</span>
              </div>
              {messagesForDate.map((message) => (
                <div
                  key={message.id}
                  className={`message-bubble ${
                    message.type === 'system'
                      ? 'system-message'
                      : message.sender_role === 'professional'
                      ? 'professional-message'
                      : 'client-message'
                  }`}
                >
                  {message.type === 'system' ? (
                    <div className="message-content system-message-content">{message.content}</div>
                  ) : (
                    <>
                      <div className="message-header">
                        <span className="message-sender">{message.sender_name}</span>
                        <span className="message-time">{formatTime(message.created_at)}</span>
                      </div>
                      {message.file_type === 'image' && message.file_url ? (
                        <div className="message-image">
                          <img
                            src={getValidFileUrl(message.file_url)}
                            alt="Uploaded image"
                            style={{ maxWidth: '200px', borderRadius: '8px', cursor: 'pointer' }}
                            onClick={() => openImageModal(getValidFileUrl(message.file_url))}
                            onError={(e) => handleImageError(e, message.id)}
                          />
                        </div>
                      ) : message.file_type === 'document' && message.file_url ? (
                        <div className="message-document">
                          <a
                            href="#"
                            onClick={(e) => handleDocumentClick(e, message.id, getValidFileUrl(message.file_url))}
                          >
                            📄 {message.file_url.split('/').pop() || 'Document'}
                          </a>
                        </div>
                      ) : (
                        <div className="message-content">{message.content}</div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="message-form" onSubmit={handleSendMessage}>
        <div className="message-input-container">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,.doc,.docx,.txt"
            style={{ display: 'none' }}
            disabled={!socketConnected}
          />
          <button
            type="button"
            className="file-upload-button"
            onClick={() => fileInputRef.current?.click()}
            disabled={!socketConnected}
          >
            📎
          </button>
          <textarea
            style={{ color: 'black' }}
            className="message-input"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={socketConnected ? 'Type your message here...' : 'Connecting to chat...'}
            disabled={!socketConnected}
          />
        </div>
        <button type="submit" className="send-button" disabled={!socketConnected || !newMessage.trim()}>
          Send
        </button>
      </form>

      <ImageModal isOpen={modalOpen} onClose={closeImageModal} imageSrc={modalImageSrc} />
    </div>
  );
}

export default ConversationChat;