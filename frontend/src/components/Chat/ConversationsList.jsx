import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './ConversationsList.css';
const baseUrl = import.meta.env.VITE_API_URL;
// Enhanced Spinner Component
const Spinner = ({ size = 'medium', text = 'Loading...', fullPage = false }) => {
  const spinnerStyles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: fullPage ? '60px 20px' : '40px 20px',
      backgroundColor: fullPage ? 'rgba(255, 255, 255, 0.95)' : 'transparent',
      borderRadius: fullPage ? '20px' : '0',
      ...(fullPage && {
        minHeight: '400px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.1)',
        backdropFilter: 'blur(10px)',
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.85))',
      })
    },
    spinner: {
      width: size === 'small' ? '28px' : size === 'large' ? '64px' : '48px',
      height: size === 'small' ? '28px' : size === 'large' ? '64px' : '48px',
      border: `${size === 'small' ? '3px' : '4px'} solid transparent`,
      borderTop: `${size === 'small' ? '3px' : '4px'} solid #3b82f6`,
      borderRight: `${size === 'small' ? '3px' : '4px'} solid #10b981`,
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
      marginBottom: '20px',
    },
    text: {
      color: '#4a5568',
      fontSize: size === 'small' ? '14px' : size === 'large' ? '20px' : '18px',
      fontWeight: '600',
      textAlign: 'center',
      background: 'linear-gradient(135deg, #3b82f6, #10b981)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
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

// Search Bar Component
const SearchBar = ({ searchQuery, onSearchChange, totalConversations, filteredCount }) => {
  return (
    <div className="search-container">
      <div className="search-input-wrapper">
        <div className="search-icon">🔍</div>
        <input
          type="text"
          placeholder="Search conversations by job title or participant..."
          value={searchQuery}
          onChange={onSearchChange}
          className="search-input"
        />
        {searchQuery && (
          <button 
            className="clear-search"
            onClick={() => onSearchChange({ target: { value: '' } })}
            title="Clear search"
          >
            ✕
          </button>
        )}
      </div>
      
      {totalConversations > 0 && (
        <div className="search-stats">
          <div className="stat-badge">
            <span className="stat-icon">💬</span>
            <span className="stat-text">{totalConversations} Total</span>
          </div>
          {searchQuery && (
            <div className="stat-badge filtered">
              <span className="stat-icon">🎯</span>
              <span className="stat-text">{filteredCount} Found</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Enhanced Conversation Card Component
const ConversationCard = ({ conversation, userType, getConversationLink }) => {
  const getTimeAgo = (dateString) => {
    const now = new Date();
    const messageDate = new Date(dateString);
    const diffInHours = Math.floor((now - messageDate) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return messageDate.toLocaleDateString();
  };

  const getMessagePreview = (message) => {
    if (!message.content) return 'No message content';
    if (message.content.length <= 80) return message.content;
    return message.content.substring(0, 80) + '...';
  };

  const getOnlineStatus = () => {
    // You can implement real online status logic here
    return Math.random() > 0.5 ? 'online' : 'offline';
  };

  const lastMessage = conversation.messages && conversation.messages.length > 0 
    ? conversation.messages[conversation.messages.length - 1] 
    : null;

  const isOnline = getOnlineStatus();

  return (
    <div className="conversation-card">
      <Link to={getConversationLink(conversation.job)} className="conversation-link">
        {/* Card Header */}
        <div className="card-header">
          <div className="conversation-avatar">
            <div className="avatar-circle">
              <span className="avatar-text">
                {conversation.job_title ? conversation.job_title.charAt(0).toUpperCase() : 'J'}
              </span>
              <div className={`status-indicator ${isOnline ? 'online' : 'offline'}`}></div>
            </div>
          </div>
          
          <div className="conversation-info">
            <div className="title-row">
              <h3 className="job-title">{conversation.job_title || 'Untitled Job'}</h3>
              {conversation.unread_count > 0 && (
                <div className="unread-badge">
                  <span>{conversation.unread_count}</span>
                </div>
              )}
            </div>
            
            <div className="participants">
              <span className="participant-icon">👥</span>
              <span className="participant-text">
                {userType === 'client' ? 'Professional' : 'Client'} Conversation
              </span>
            </div>
          </div>
        </div>

        {/* Message Preview */}
        <div className="message-preview">
          {lastMessage ? (
            <>
              <div className="message-content">
                <span className="sender-name">
                  {lastMessage.sender_name}:
                </span>
                <span className="message-text">
                  {getMessagePreview(lastMessage)}
                </span>
              </div>
              <div className="message-meta">
                <span className="timestamp">
                  {getTimeAgo(lastMessage.created_at)}
                </span>
                {lastMessage.file_type && (
                  <span className="attachment-indicator">
                    📎 {lastMessage.file_type}
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="no-messages">
              <span className="no-messages-icon">💬</span>
              <span className="no-messages-text">No messages yet - Start the conversation!</span>
            </div>
          )}
        </div>

        {/* Card Footer */}
        <div className="card-footer">
          <div className="conversation-actions">
            <div className="action-item">
              <span className="action-icon">📅</span>
              <span className="action-text">
                Created {getTimeAgo(conversation.created_at)}
              </span>
            </div>
            
            <div className="action-item">
              <span className="action-icon">💼</span>
              <span className="action-text">Job #{conversation.job}</span>
            </div>
          </div>
          
          <div className="conversation-status">
            <div className={`status-dot ${isOnline ? 'online' : 'offline'}`}></div>
            <span className="status-text">
              {isOnline ? 'Active' : 'Away'}
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
};

// Stats Summary Component
const StatsSummary = ({ conversations }) => {
  const unreadCount = conversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);
  const activeConversations = conversations.filter(conv => 
    conv.messages && conv.messages.length > 0
  ).length;

  return (
    <div className="stats-summary">
      <div className="stat-card">
        <div className="stat-icon">💬</div>
        <div className="stat-content">
          <div className="stat-number">{conversations.length}</div>
          <div className="stat-label">Total Conversations</div>
        </div>
      </div>
      
      <div className="stat-card">
        <div className="stat-icon">🔥</div>
        <div className="stat-content">
          <div className="stat-number">{activeConversations}</div>
          <div className="stat-label">Active Chats</div>
        </div>
      </div>
      
      <div className="stat-card">
        <div className="stat-icon">🔔</div>
        <div className="stat-content">
          <div className="stat-number">{unreadCount}</div>
          <div className="stat-label">Unread Messages</div>
        </div>
      </div>
    </div>
  );
};

function ConversationsList({ userType = 'client' }) {
  const [conversations, setConversations] = useState([]);
  const [filteredConversations, setFilteredConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${baseUrl}/api/conversations/`, {
          withCredentials: true,
        });
        
        // Handle the new response format
        const conversationsData = response.data.conversations || response.data || [];
        setConversations(conversationsData);
        setFilteredConversations(conversationsData);
        
        // Log debug info for troubleshooting
        if (response.data.debug_info) {
          console.log('Debug info:', response.data.debug_info);
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

  // Search functionality
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredConversations(conversations);
      return;
    }

    const filtered = conversations.filter((conversation) => {
      const jobTitle = conversation.job_title?.toLowerCase() || '';
      const query = searchQuery.toLowerCase();
      
      // Search in job title and last message content
      const lastMessage = conversation.messages && conversation.messages.length > 0 
        ? conversation.messages[conversation.messages.length - 1] 
        : null;
      
      const messageContent = lastMessage?.content?.toLowerCase() || '';
      const senderName = lastMessage?.sender_name?.toLowerCase() || '';
      
      return jobTitle.includes(query) || 
             messageContent.includes(query) || 
             senderName.includes(query);
    });
    
    setFilteredConversations(filtered);
  }, [searchQuery, conversations]);

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Function to determine conversation link based on user type
  const getConversationLink = (jobId) => {
    return userType === 'client' 
      ? `/client-conversation/${jobId}` 
      : `/professional-conversation/${jobId}`;
  };

  const getNavigationPath = () => {
    return userType === 'client' ? '/client-project' : '/professional-job';
  };

  const getNavigationText = () => {
    return userType === 'client' ? 'View My Projects' : 'Find Jobs';
  };

  const getEmptyStateText = () => {
    return userType === 'client' 
      ? 'Conversations will appear here once you have assigned jobs to professionals.' 
      : 'Conversations will appear here once you have been assigned to a job.';
  };

  return (
    <div className="conversations-container">
      {/* Enhanced Header */}
      <div className="conversations-header">
      <div className="header-content">
        <button onClick={() => navigate(-1)} className="back-button">
          <span className="back-icon">←</span>
          <span>Back</span>
        </button>
        <div className="header-title">
          <h2 style={{color:"black"}}>
            <span className="title-icon">💬</span>
            Your Conversations
          </h2>
          <p style={{color:"black"}} className="header-subtitle">
            Connect and communicate with your {userType === 'client' ? 'professionals' : 'clients'}
          </p>
        </div>
      </div>
    </div>

      {loading ? (
        <div className="loading-container">
          <Spinner size="large" text="Loading your conversations..." fullPage={true} />
        </div>
      ) : error ? (
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <div className="error-content">
            <h3>Something went wrong</h3>
            <p>{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="retry-button"
            >
              Try Again
            </button>
          </div>
        </div>
      ) : (
        <>
          {conversations.length > 0 && (
            <>
              {/* Stats Summary */}
              <StatsSummary conversations={conversations} />

              {/* Search Bar */}
              <SearchBar
                searchQuery={searchQuery}
                onSearchChange={handleSearchChange}
                totalConversations={conversations.length}
                filteredCount={filteredConversations.length}
              />
            </>
          )}

          {/* Content */}
          {filteredConversations.length === 0 ? (
            <div className="empty-state">
              <div className="empty-content">
                <div className="empty-icon">
                  {searchQuery ? '🔍' : '💬'}
                </div>
                <h3>
                  {searchQuery ? 'No conversations found' : 'No conversations yet'}
                </h3>
                <p>
                  {searchQuery 
                    ? `No conversations match "${searchQuery}"`
                    : "You don't have any active conversations yet."
                  }
                </p>
                <p className="empty-description">
                  {searchQuery ? 'Try adjusting your search terms' : getEmptyStateText()}
                </p>
                
                <div className="empty-actions">
                  {searchQuery ? (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="action-button secondary"
                    >
                      Clear Search
                    </button>
                  ) : (
                    <button 
                      onClick={() => navigate(getNavigationPath())}
                      className="action-button primary"
                    >
                      <span className="button-icon">🚀</span>
                      {getNavigationText()}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="conversations-grid">
              {filteredConversations.map((conversation) => (
                <ConversationCard
                  key={conversation.id}
                  conversation={conversation}
                  userType={userType}
                  getConversationLink={getConversationLink}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Floating Action Button */}
      {conversations.length > 0 && (
        <button 
          onClick={() => navigate(getNavigationPath())} 
          className="fab"
          title={getNavigationText()}
        >
          <span className="fab-icon">+</span>
        </button>
      )}
    </div>
  );
}

export default ConversationsList;