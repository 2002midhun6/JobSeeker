import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import './ConversationChat.css';

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
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  
  const MAX_SOCKET_RETRIES = 5;
  const RETRY_DELAY = 2000;

  useEffect(() => {
    const fetchConversation = async () => {
      try {
        setLoading(true);
        console.log(`Fetching conversation for job ${jobId}`);
        
        const response = await axios.get(`http://localhost:8000/api/conversations/job/${jobId}/`, {
          withCredentials: true,
        });
        
        console.log('Conversation data:', response.data);
        setJob(response.data.job);
        setMessages(response.data.messages || []);
        setLoading(false);
      } catch (err) {
        console.error('Fetch error:', err);
        setError(err.message || 
          (err.response?.status === 403 ? 'You do not have access to this conversation.' :
           err.response?.status === 404 ? 'Conversation not found.' :
           'Something went wrong. Please try again.'));
        setLoading(false);
      }
    };

    fetchConversation();
  }, [jobId]);

  // In your ConversationChat.jsx file

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
  
      // Get a WebSocket auth token from the server
      axios
        .get('http://localhost:8000/api/ws-auth-token/', {
          withCredentials: true, // Important for sending cookies
        })
        .then(response => {
          const token = response.data.access_token; // Changed from response.data.token to response.data.access_token
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
  
              if (data.event === 'user_joined' || data.event === 'user_left') {
                console.log(`User ${data.event}:`, data);
              } else if (data.error) {
                setSocketError(data.error);
                console.error('WebSocket error message:', data.error);
              } else {
                setMessages(prev => {
                  if (prev.some(msg => msg.id === data.id)) return prev;
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
  
            // Handle specific close codes
            if (event.code === 4001) {
              setSocketError('Authentication failed. Please log in again.');
              return; // Don't retry for auth failures
            } else if (event.code === 4002) {
              setSocketError('Invalid authentication token. Please refresh the page.');
              return; // Don't retry for invalid tokens
            } else if (event.code === 4003) {
              setSocketError('Session expired. Please log in again.');
              return; // Don't retry for expired sessions
            }
  
            if (!event.wasClean && socketRetries < MAX_SOCKET_RETRIES) {
              console.log(`Reconnecting in ${RETRY_DELAY}ms...`);
              reconnectTimer = setTimeout(() => {
                setSocketRetries(prev => prev + 1);
                connectWebSocket();
              }, RETRY_DELAY);
            } else {
              setSocketError(`Chat disconnected (code ${event.code}). Please reconnect.`);
            }
          };
  
          setSocket(ws);
        })
        .catch(error => {
          console.error('Failed to get WebSocket auth token:', error);
          setSocketError('Authentication failed. Please refresh the page and try again.');
  
          // Attempt reconnect after delay
          setTimeout(() => {
            setSocketRetries(prev => prev + 1);
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
    messages.forEach(message => {
      const date = new Date(message.created_at).toLocaleDateString();
      if (!groups[date]) groups[date] = [];
      groups[date].push(message);
    });
    return groups;
  };

  const messageGroups = groupMessagesByDate();

  if (loading) return <div className="chat-loading">Loading conversation...</div>;
  if (error) return (
    <div className="chat-error">
      <p>{error}</p>
      <button onClick={() => navigate(-1)} className="back-button">Go Back</button>
    </div>
  );

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

      <div className="messages-container">
        {Object.keys(messageGroups).length === 0 ? (
          <div className="no-messages">
            <p>No messages yet</p>
            <p>Start the conversation by sending a message below</p>
          </div>
        ) : (
          Object.entries(messageGroups).map(([date, messagesForDate]) => (
            <div key={date} className="message-date-group">
              <div className="date-divider">
                <span>{date === new Date().toLocaleDateString() ? 'Today' : formatDate(date)}</span>
              </div>
              {messagesForDate.map((message) => (
                <div key={message.id} className={`message-bubble ${message.sender_role === 'professional' ? 'professional-message' : 'client-message'}`}>
                  <div className="message-header">
                    <span className="message-sender">{message.sender_name}</span>
                    <span className="message-time">{formatTime(message.created_at)}</span>
                  </div>
                  <div className="message-content">{message.content}</div>
                </div>
              ))}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="message-form" onSubmit={handleSendMessage}>
        <textarea
          className="message-input"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={socketConnected ? "Type your message here..." : "Connecting to chat..."}
          disabled={!socketConnected}
        />
        <button 
          type="submit" 
          className="send-button"
          disabled={!socketConnected || !newMessage.trim()}
        >
          Send
        </button>
      </form>
    </div>
  );
}

export default ConversationChat;