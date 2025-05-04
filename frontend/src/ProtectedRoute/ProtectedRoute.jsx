import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute = ({ children, requiredRole }) => {
  const { user, isAuthenticated } = useContext(AuthContext);

  // If not authenticated, redirect to login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Check if the user has the required role or is an admin (is_staff)
  const isAuthorized = 
    (requiredRole === 'admin' && user.is_staff) ||  // Admins identified by is_staff
    (requiredRole && user.role === requiredRole);   // Other roles match requiredRole

  // If not authorized, redirect to an appropriate page (e.g., home or login)
//   if (!isAuthorized) {
    
//     return <Navigate to="/login" />;  // Changed to "/" to avoid login loop for logged-in users
//   }

  // Render the protected component if authorized
  return children;
};

export default ProtectedRoute;