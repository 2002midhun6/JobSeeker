import React, { createContext, useReducer, useEffect, useState } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN':
      return { ...state, user: action.payload.user, isAuthenticated: true };
    case 'LOGOUT':
      return { ...state, user: null, isAuthenticated: false };
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    isAuthenticated: false,
  });
  const [loading, setLoading] = useState(true); // Add loading state

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await axios.get('http://localhost:8000/api/check-auth/', {
          withCredentials: true, // Ensure cookies are sent
        });

        if (response.data.isAuthenticated) {
          dispatch({
            type: 'LOGIN',
            payload: { user: response.data.user },
          });
        } else {
          dispatch({ type: 'LOGOUT' });
        }
      } catch (err) {
        console.error('Auth check failed:', err);
        dispatch({ type: 'LOGOUT' });
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading) {
    return <div>Loading...</div>; // Show a loading screen while checking authentication
  }

  return (
    <AuthContext.Provider value={{ ...state, dispatch }}>
      {children}
    </AuthContext.Provider>
  );
};
