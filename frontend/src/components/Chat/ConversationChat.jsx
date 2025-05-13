import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import axios from 'axios';
import './ConversationChat.css';
import VideoCall from '../vediocall/VedioCall';
import IncomingCallDialog from '../vediocall/IncomingCallDialog';

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

function ConversationChat() {
  const { jobId } = useParams();
  const location = useLocation();
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
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [callStatus, setCallStatus] = useState('idle');
  const [modalOpen, setModalOpen] = useState(false); // State for modal visibility
  const [modalImageSrc, setModalImageSrc] = useState(''); // State for image source
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const videoCallRef = useRef(null);
  const navigate = useNavigate();
  const currentCallerRef = useRef(null);

  const MAX_SOCKET_RETRIES = 5;
  const RETRY_DELAY = 2000;

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const callAction = queryParams.get('call');
    if (callAction === 'accept') {
      setShowVideoCall(true);
      setCallStatus('active');
    }
  }, [location]);

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

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await axios.get('http://localhost:8000/api/check-auth/', {
          withCredentials: true,
        });
        console.log('User info structure:', response.data);
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
        const response = await axios.get(`http://localhost:8000/api/conversations/job/${jobId}/`, {
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
        setSocketError('Failed to connect to chat. Please try again later.');
        console.error(`Max retries (${MAX_SOCKET_RETRIES}) reached.`);
        return;
      }

      if (ws) {
        console.log('Closing existing WebSocket');
        ws.close();
      }

      console.log(`WebSocket attempt ${socketRetries + 1}/${MAX_SOCKET_RETRIES}`);

      axios
        .get('http://localhost:8000/api/ws-auth-token/', {
          withCredentials: true,
        })
        .then((response) => {
          const token = response.data.access_token;
          console.log('Received WebSocket auth token:', token ? token : 'Missing');

          if (!token) {
            throw new Error('No authentication token received');
          }

          const wsUrl = `ws://localhost:8000/ws/chat/${jobId}/?token=${encodeURIComponent(token)}`;
          console.log('Connecting to WebSocket:', wsUrl);

          ws = new WebSocket(wsUrl);

          ws.onopen = () => {
            console.log('WebSocket connected');
            setSocketConnected(true);
            setSocketRetries(0);
            setSocketError(null);
          };

          ws.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              console.log('Received:', data);

              if (data.type === 'call-request') {
                console.log('Received call request in chat WebSocket:', data);
              }

              if (data.event === 'user_joined' || data.event === 'user_left') {
                console.log(`User ${data.event}:`, data);
              } else if (data.error) {
                setSocketError(data.error);
                console.error('WebSocket error message:', data.error);
              } else {
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
            console.log(`WebSocket closed: code=${event.code}, reason=${event.reason}`);
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
              setSocketError(`Chat disconnected (code ${event.code}). Please reconnect.`);
            }
          };

          setSocket(ws);
        })
        .catch((error) => {
          console.error('Failed to get WebSocket auth token:', error);
          setSocketError('Authentication failed. Please refresh the page and try again.');
          setTimeout(() => {
            setSocketRetries((prev) => prev + 1);
            connectWebSocket();
          }, RETRY_DELAY);
        });
    };

    if (!loading && !error) {
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
  }, [jobId, loading, error, socketRetries]);

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

  const getValidFileUrl = (url) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `http://localhost:8000${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const recoverFile = async (messageId) => {
    try {
      const response = await axios.post(
        'http://localhost:8000/api/conversations/file-recovery/',
        { message_id: messageId },
        { withCredentials: true }
      );
      if (response.data.success && response.data.new_url) {
        setMessages((prev) =>
          prev.map((msg) => (msg.id === messageId ? { ...msg, file_url: response.data.new_url } : msg))
        );
        return response.data.new_url;
      }
    } catch (error) {
      console.error('Failed to recover file:', error);
    }
    return null;
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !socketConnected) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await axios.post(
        `http://localhost:8000/api/conversations/job/${jobId}/file/`,
        formData,
        {
          withCredentials: true,
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );
      console.log('File uploaded:', response.data);
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

  useEffect(() => {
    console.log('Call status changed:', callStatus);
    console.log('Current caller:', currentCallerRef.current);
    console.log('Incoming call state:', incomingCall);
    console.log('Show video call:', showVideoCall);
  }, [callStatus, incomingCall, showVideoCall]);

  const handleIncomingCall = (caller) => {
    console.log('Incoming call from:', caller);
    addSystemMessage(`${caller.name} is calling...`);
    setIncomingCall(caller);
    currentCallerRef.current = caller;
    setCallStatus('incoming');
    console.log('Call status set to incoming, expecting dialog to show');
  };

  const handleAcceptCall = () => {
    console.log('Call accepted in ConversationChat, caller info:', incomingCall || currentCallerRef.current);
    setShowVideoCall(true);
    setCallStatus('active');
    const callerToUse = incomingCall || currentCallerRef.current;
    currentCallerRef.current = callerToUse;
    console.log('Accepting call for caller:', callerToUse);
    setTimeout(() => {
      if (videoCallRef.current) {
        console.log('Passing caller to acceptCall:', callerToUse);
        videoCallRef.current.acceptCall(callerToUse);
      } else {
        console.error('videoCallRef is not available yet, retrying...');
        setTimeout(() => {
          if (videoCallRef.current) {
            videoCallRef.current.acceptCall(callerToUse);
          } else {
            console.error('videoCallRef still not available after retry');
          }
        }, 1000);
      }
    }, 500);
  };

  const handleRejectCall = () => {
    console.log('Call rejected in ConversationChat');
    setCallStatus('idle');
    const callerToReject = incomingCall || currentCallerRef.current;
    setIncomingCall(null);
    if (videoCallRef.current && callerToReject) {
      videoCallRef.current.rejectCall(callerToReject);
    }
    currentCallerRef.current = null;
  };

  const handleCallEnded = (reason) => {
    console.log('Call ended:', reason);
    setCallStatus('idle');
    setIncomingCall(null);
    currentCallerRef.current = null;
    setTimeout(() => {
      if (callStatus !== 'active') {
        setShowVideoCall(false);
      }
    }, 3000);
  };

  const toggleVideoCall = () => {
    setShowVideoCall(!showVideoCall);
  };

  const groupMessagesByDate = () => {
    const groups = {};
    messages.forEach((message) => {
      const date = new Date(message.created_at).toLocaleDateString();
      if (!groups[date]) groups[date] = [];
      groups[date].push(message);
    });
    return groups;
  };

  const messageGroups = groupMessagesByDate();

  // Functions to open and close the modal
  const openImageModal = (imageSrc) => {
    setModalImageSrc(imageSrc);
    setModalOpen(true);
  };

  const closeImageModal = () => {
    setModalOpen(false);
    setModalImageSrc('');
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
            <span className="status-connected">Connected</span>
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

      <IncomingCallDialog
        caller={incomingCall || currentCallerRef.current}
        onAccept={handleAcceptCall}
        onReject={handleRejectCall}
        isVisible={callStatus === 'incoming'}
      />

      <div className="video-call-toggle">
        <button
          onClick={toggleVideoCall}
          className={showVideoCall ? 'hide-video-call' : 'show-video-call'}
          disabled={callStatus === 'incoming'}
        >
          {callStatus === 'active' ? (
            <>📹 {showVideoCall ? 'Hide Video Call' : 'Show Video Call'}</>
          ) : (
            <>📹 {showVideoCall ? 'Hide Video Call' : 'Start Video Call'}</>
          )}
        </button>
        {callStatus === 'active' && <span className="call-status-indicator">Call in progress</span>}
      </div>

      {(showVideoCall || callStatus === 'active' || callStatus === 'incoming') && userInfo && (
        <VideoCall
          ref={videoCallRef}
          jobId={jobId}
          userName={userInfo.name}
          userRole={userInfo.role}
          userId={userInfo.id}
          job={job}
          onIncomingCall={handleIncomingCall}
          onCallAccepted={() => {
            console.log('Call accepted callback triggered');
            setCallStatus('active');
            setIncomingCall(null);
          }}
          onCallRejected={() => {
            console.log('Call rejected callback triggered');
            setCallStatus('idle');
            setIncomingCall(null);
            currentCallerRef.current = null;
          }}
          onCallEnded={(reason) => {
            console.log('Call ended callback triggered:', reason);
            setCallStatus('idle');
            setIncomingCall(null);
            currentCallerRef.current = null;
            setTimeout(() => {
              if (callStatus !== 'active') {
                setShowVideoCall(false);
              }
            }, 3000);
          }}
          onCallInitiated={() => {
            addSystemMessage('You initiated a call');
          }}
          callStatus={callStatus}
          acceptedCall={callStatus === 'active'}
        />
      )}

      <div className={`messages-container ${showVideoCall ? 'with-video-call' : ''}`}>
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
                            onClick={() => openImageModal(getValidFileUrl(message.file_url))} // Open modal on click
                            onError={async (e) => {
                              console.error('Image failed to load:', message.file_url);
                              const recoveredUrl = await recoverFile(message.id);
                              if (recoveredUrl) {
                                e.target.src = recoveredUrl;
                              } else {
                                e.target.onerror = null;
                                e.target.src =
                                  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YwZjBmMCIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5OTkiPkltYWdlIHVuYXZhaWxhYmxlPC90ZXh0Pjwvc3ZnPg==';
                              }
                            }}
                          />
                        </div>
                      ) : message.file_type === 'document' && message.file_url ? (
                        <div className="message-document">
                          <a
                            href={getValidFileUrl(message.file_url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => {
                              fetch(getValidFileUrl(message.file_url), { method: 'HEAD' }).catch(async () => {
                                e.preventDefault();
                                const recoveredUrl = await recoverFile(message.id);
                                if (recoveredUrl) {
                                  window.open(recoveredUrl, '_blank');
                                } else {
                                  alert('File no longer available. Please contact support.');
                                }
                              });
                            }}
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
            accept="image/jpeg,image/png,image/gif,application/pdf,.doc,.docx"
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

      {/* Render the ImageModal */}
      <ImageModal isOpen={modalOpen} onClose={closeImageModal} imageSrc={modalImageSrc} />
    </div>
  );
}

export default ConversationChat;