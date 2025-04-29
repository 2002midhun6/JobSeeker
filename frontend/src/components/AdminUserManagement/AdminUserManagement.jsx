import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminUserManagement.css';
import AdminHeaderComp from '../AdminHeaderComp/AdminHeaderComp';

function AdminUserManagement() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // Number of users per page

  // Fetch users on component mount
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await axios.get('http://localhost:8000/api/users/', {
          withCredentials: true,
        });
        setUsers(response.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to fetch users');
      }
    };

    fetchUsers();
  }, []);

  // Handle block/unblock action
  const handleBlockUnblock = async (userId, isBlocked) => {
    try {
      const response = await axios.patch(
        `http://localhost:8000/api/users/${userId}/block-unblock/`,
        { is_blocked: !isBlocked },
        { withCredentials: true }
      );
      // Update the user list after successful block/unblock
      setUsers(users.map(user =>
        user.id === userId ? { ...user, is_blocked: !isBlocked } : user
      ));
      alert(response.data.message);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update user status');
    }
  };

  // Pagination logic
  const paginate = (items, page) => {
    const startIndex = (page - 1) * itemsPerPage;
    return items.slice(startIndex, startIndex + itemsPerPage);
  };

  const getPageCount = (items) => Math.ceil(items.length / itemsPerPage);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const PaginationControls = ({ totalItems }) => {
    const pageCount = getPageCount(totalItems);
    const pages = [];

    for (let i = 1; i <= pageCount; i++) {
      pages.push(i);
    }

    return (
      <div className="pagination">
        <button
          disabled={currentPage === 1}
          onClick={() => handlePageChange(currentPage - 1)}
          className="page-btn"
        >
          Previous
        </button>
        {pages.map((page) => (
          <button
            key={page}
            onClick={() => handlePageChange(page)}
            className={`page-btn ${currentPage === page ? 'active' : ''}`}
          >
            {page}
          </button>
        ))}
        <button
          disabled={currentPage === pageCount}
          onClick={() => handlePageChange(currentPage + 1)}
          className="page-btn"
        >
          Next
        </button>
      </div>
    );
  };

  return (
    <div className="admin-user-management">
      <AdminHeaderComp />
      <main>
        <h1>User Management</h1>
        {error && <div className="error-message">{error}</div>}
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
            {paginate(users, currentPage).map(user => (
              <tr key={user.id}>
                <td>{user.email}</td>
                <td>{user.name}</td>
                <td>{user.role}</td>
                <td>{user.is_blocked ? 'Blocked' : 'Active'}</td>
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
        {users.length > 0 && <PaginationControls totalItems={users} />}
      </main>
    </div>
  );
}

export default AdminUserManagement;