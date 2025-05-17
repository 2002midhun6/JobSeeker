import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ConversationsList.css';

function ConversationsList({ userType = 'client' }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setLoading(true);
        const response = await axios.get('http://localhost:8000/api/conversations/', {
          withCredentials: true,
        });
        
        // Handle the new response format
        if (response.data.conversations) {
          setConversations(response.data.conversations);
          
          // Log debug info for troubleshooting
          console.log('Debug info:', response.data.debug_info);
          
        } else {
          setConversations(response.data); // For backward compatibility
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching conversations:', err);
        setError('Failed to load conversations. Please try again later.');
        setLoading(false);
      }
    };
  
    fetchConversations();
    
    // Set up polling for new conversations
    const interval = setInterval(fetchConversations, 30000);
    return () => clearInterval(interval);
  }, []);

  // Function to determine conversation link based on user type
  const getConversationLink = (jobId) => {
    return userType === 'client' 
      ? `/client-conversation/${jobId}` 
      : `/professional-conversation/${jobId}`;
  };

  return (
    <div className="conversations-container">
      <div className="header">
        <button onClick={() => navigate(-1)} className="back-button">← Back</button>
        <h2>Your Conversations</h2>
      </div>
      {loading ? (
        <div className="loading-indicator">Loading conversations...</div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : conversations.length === 0 ? (
        <div className="empty-state">
          <p>You don't have any active conversations yet.</p>
          <p>
            {userType === 'client' 
              ? 'Conversations will appear here once you have assigned jobs to professionals.' 
              : 'Conversations will appear here once you have been assigned to a job.'}
          </p>
          <button 
            onClick={() => navigate(userType === 'client' ? '/client-project' : '/professional-job')}
            className="action-button"
          >
            {userType === 'client' ? 'View My Projects' : 'Find Jobs'}
          </button>
        </div>
      ) : (
        <ul className="conversations-list">
          {conversations.map((conversation) => (
            <li key={conversation.id} className="conversation-item">
              <Link to={getConversationLink(conversation.job)} className="conversation-link">
                <div className="conversation-header">
                  <h3 className="job-title">{conversation.job_title}</h3>
                  {conversation.unread_count > 0 && (
                    <span className="unread-badge">{conversation.unread_count}</span>
                  )}
                </div>
                {conversation.messages && conversation.messages.length > 0 ? (
                  <p className="last-message">
                    <span className="sender-name">{conversation.messages[conversation.messages.length - 1].sender_name}:</span> 
                    {conversation.messages[conversation.messages.length - 1].content.substring(0, 60)}
                    {conversation.messages[conversation.messages.length - 1].content.length > 60 ? '...' : ''}
                  </p>
                ) : (
                  <p className="no-messages">No messages yet</p>
                )}
                <span className="timestamp">
                  {conversation.messages && conversation.messages.length > 0 
                    ? new Date(conversation.messages[conversation.messages.length - 1].created_at).toLocaleString() 
                    : new Date(conversation.created_at).toLocaleString()}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ConversationsList;