import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminUserManagement.css';
import AdminHeaderComp from '../AdminHeaderComp/AdminHeaderComp';
const baseUrl = import.meta.env.VITE_API_URL;
// Enhanced Spinner Component
const AdminUserSpinner = ({ text = 'Loading...' }) => (
  <div className="admin-user-spinner-container">
    <div className="admin-user-loading-spinner"></div>
    <p className="admin-user-spinner-text">{text}</p>
  </div>
);

// User Statistics Summary Component
const UserStatsSummary = ({ users, filteredUsers }) => {
  const stats = {
    total: users.length,
    active: users.filter(user => !user.is_blocked).length,
    blocked: users.filter(user => user.is_blocked).length,
    clients: users.filter(user => user.role === 'client').length,
    professionals: users.filter(user => user.role === 'professional').length,
    admins: users.filter(user => user.role === 'admin').length,
    filtered: filteredUsers.length
  };

  return (
    <div className="user-stats-summary">
      <div className="user-stat-item">
        <h4>Total Users</h4>
        <p>{stats.total}</p>
      </div>
      <div className="user-stat-item">
        <h4>Active Users</h4>
        <p>{stats.active}</p>
      </div>
      <div className="user-stat-item">
        <h4>Blocked Users</h4>
        <p>{stats.blocked}</p>
      </div>
      <div className="user-stat-item">
        <h4>Clients</h4>
        <p>{stats.clients}</p>
      </div>
      <div className="user-stat-item">
        <h4>Professionals</h4>
        <p>{stats.professionals}</p>
      </div>
      <div className="user-stat-item">
        <h4>Admins</h4>
        <p>{stats.admins}</p>
      </div>
    </div>
  );
};

// User Card Component for Mobile
const UserCard = ({ user, onBlockUnblock }) => (
  <div className="user-card">
    <div className="user-card-header">
      <div className="user-card-info">
        <h4>{user.name}</h4>
        <p>{user.email}</p>
      </div>
      <span className={`status-badge ${user.is_blocked ? 'status-blocked' : 'status-active'}`}>
        {user.is_blocked ? 'Blocked' : 'Active'}
      </span>
    </div>
    
    <div className="user-card-details">
      <div className="user-detail-item">
        <span className="user-detail-label">Role</span>
        <span className={`role-badge role-${user.role}`}>
          {user.role}
        </span>
      </div>
      <div className="user-detail-item">
        <span className="user-detail-label">Status</span>
        <span className="user-detail-value">{user.is_blocked ? 'Blocked' : 'Active'}</span>
      </div>
    </div>
    
    <button
      onClick={() => onBlockUnblock(user.id, user.is_blocked)}
      className={user.is_blocked ? 'unblock-button' : 'block-button'}
    >
      {user.is_blocked ? 'Unblock User' : 'Block User'}
    </button>
  </div>
);

// Enhanced Pagination Component
const PaginationControls = ({ totalItems, currentPage, onPageChange, itemsPerPage }) => {
  const pageCount = Math.ceil(totalItems.length / itemsPerPage);
  
  if (pageCount <= 1) return null;

  const maxVisiblePages = 5;
  const pages = [];
  
  // Calculate which pages to show
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(pageCount, startPage + maxVisiblePages - 1);
  
  // Adjust start page if we're near the end
  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  // Add page numbers
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, totalItems.length);

  return (
    <div style={{ marginTop: '32px' }}>
      {/* Pagination Info */}
      <div style={{
        textAlign: 'center',
        marginBottom: '16px',
        color: '#6b7280',
        fontSize: '14px',
        fontWeight: '500'
      }}>
        Showing {startIndex} to {endIndex} of {totalItems.length} users
      </div>

      {/* Pagination Controls */}
      <div className="pagination">
        <button
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="page-btn"
        >
          Previous
        </button>
        
        {pages.map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`page-btn ${currentPage === page ? 'active' : ''}`}
          >
            {page}
          </button>
        ))}
        
        <button
          disabled={currentPage === pageCount}
          onClick={() => onPageChange(currentPage + 1)}
          className="page-btn"
        >
          Next
        </button>
      </div>
    </div>
  );
};

function AdminUserManagement() {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch users on component mount
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await axios.get(`${baseUrl}/api/users/`, {
          withCredentials: true,
        });
        setUsers(response.data || []);
        setFilteredUsers(response.data || []);
      } catch (err) {
        const errorMessage = err.response?.data?.error || 'Failed to fetch users';
        setError(errorMessage);
        console.error('Error fetching users:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Filter and search users
  useEffect(() => {
    let filtered = users;

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(user =>
        user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.role?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply type filter
    switch (filterType) {
      case 'active':
        filtered = filtered.filter(user => !user.is_blocked);
        break;
      case 'blocked':
        filtered = filtered.filter(user => user.is_blocked);
        break;
      case 'client':
        filtered = filtered.filter(user => user.role === 'client');
        break;
      case 'professional':
        filtered = filtered.filter(user => user.role === 'professional');
        break;
      case 'admin':
        filtered = filtered.filter(user => user.role === 'admin');
        break;
      default:
        // 'all' - no additional filtering
        break;
    }

    setFilteredUsers(filtered);
    setCurrentPage(1); // Reset to first page when filtering
  }, [users, searchQuery, filterType]);

  // Handle block/unblock action
  const handleBlockUnblock = async (userId, isBlocked) => {
    try {
      setError('');
      setSuccessMessage('');
      
      const response = await axios.patch(
        `${baseUrl}/api/users/${userId}/block-unblock/`,
        { is_blocked: !isBlocked },
        { withCredentials: true }
      );
      
      // Update the user list after successful block/unblock
      const updatedUsers = users.map(user =>
        user.id === userId ? { ...user, is_blocked: !isBlocked } : user
      );
      setUsers(updatedUsers);
      
      // Show success message
      setSuccessMessage(response.data.message || `User ${!isBlocked ? 'blocked' : 'unblocked'} successfully`);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
      
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Failed to update user status';
      setError(errorMessage);
      console.error('Error updating user status:', err);
      
      // Clear error message after 5 seconds
      setTimeout(() => setError(''), 5000);
    }
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Handle filter type change
  const handleFilterChange = (type) => {
    setFilterType(type);
  };

  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Paginate users
  const paginate = (items, page) => {
    const startIndex = (page - 1) * itemsPerPage;
    return items.slice(startIndex, startIndex + itemsPerPage);
  };

  return (
    <div className="admin-user-management">
      <AdminHeaderComp />
      <main>
        <h1>User Management</h1>
        
        {/* User Statistics */}
        {!loading && !error && <UserStatsSummary users={users} filteredUsers={filteredUsers} />}
        
        {/* Search Bar */}
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search by name, email, or role..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="search-input"
          />
        </div>
        
        {/* Filter Tabs */}
        <div className="filter-tabs">
          <button
            className={`filter-tab ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => handleFilterChange('all')}
          >
            <span>📊</span>
            All ({users.length})
          </button>
          <button
            className={`filter-tab ${filterType === 'active' ? 'active' : ''}`}
            onClick={() => handleFilterChange('active')}
          >
            <span>✅</span>
            Active ({users.filter(u => !u.is_blocked).length})
          </button>
          <button
            className={`filter-tab ${filterType === 'blocked' ? 'active' : ''}`}
            onClick={() => handleFilterChange('blocked')}
          >
            <span>🚫</span>
            Blocked ({users.filter(u => u.is_blocked).length})
          </button>
          <button
            className={`filter-tab ${filterType === 'client' ? 'active' : ''}`}
            onClick={() => handleFilterChange('client')}
          >
            <span>🏢</span>
            Clients ({users.filter(u => u.role === 'client').length})
          </button>
          <button
            className={`filter-tab ${filterType === 'professional' ? 'active' : ''}`}
            onClick={() => handleFilterChange('professional')}
          >
            <span>👨‍💼</span>
            Professionals ({users.filter(u => u.role === 'professional').length})
          </button>
        </div>
        
        {/* Success Message */}
        {successMessage && (
          <div className="success-message">{successMessage}</div>
        )}
        
        {/* Error Message */}
        {error && (
          <div className="error-message">{error}</div>
        )}
        
        {/* Loading State */}
        {loading ? (
          <AdminUserSpinner text="Loading users..." />
        ) : filteredUsers.length === 0 ? (
          <div className="empty-state">
            {searchQuery || filterType !== 'all' 
              ? 'No users found matching your criteria.' 
              : 'No users found in the system.'}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <table className="user-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody className="user-table-data">
                {paginate(filteredUsers, currentPage).map(user => (
                  <tr key={user.id}>
                    <td>{user.email}</td>
                    <td>{user.name}</td>
                    <td>
                      <span className={`role-badge role-${user.role}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${user.is_blocked ? 'status-blocked' : 'status-active'}`}>
                        {user.is_blocked ? 'Blocked' : 'Active'}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => handleBlockUnblock(user.id, user.is_blocked)}
                        className={user.is_blocked ? 'unblock-button' : 'block-button'}
                      >
                        {user.is_blocked ? 'Unblock' : 'Block'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile Card View */}
            <div className="user-cards">
              {paginate(filteredUsers, currentPage).map(user => (
                <UserCard 
                  key={user.id} 
                  user={user} 
                  onBlockUnblock={handleBlockUnblock}
                />
              ))}
            </div>

            {/* Pagination */}
            <PaginationControls
              totalItems={filteredUsers}
              currentPage={currentPage}
              onPageChange={handlePageChange}
              itemsPerPage={itemsPerPage}
            />
          </>
        )}
      </main>
    </div>
  );
}

export default AdminUserManagement;