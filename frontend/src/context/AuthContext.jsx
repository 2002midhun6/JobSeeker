import React, { createContext, useReducer, useEffect, useState } from 'react';
import axios from 'axios';

export const AuthContext = createContext();
const baseUrl = import.meta.env.VITE_API_URL;
// ADD THIS MISSING authReducer FUNCTION
const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN':
      return { ...state, user: action.payload.user, isAuthenticated: true };
    case 'LOGOUT':
      return { ...state, user: null, isAuthenticated: false };
    case 'UPDATE_USER':
      return { ...state, user: action.payload.user };
    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    isAuthenticated: false,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Function to refresh the access token
  const refreshToken = async () => {
    if (refreshing) {
      console.log('Already refreshing, skipping...');
      return false;
    }
    
    setRefreshing(true);
    
    try {
      console.log('Attempting to refresh token...');
      const response = await axios.post(
        `${baseUrl}/api/token/refresh/`,
        {}, 
        { 
          withCredentials: true,
          timeout: 10000 // Add timeout
        }
      );
      
      console.log('Token refresh successful');
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error.response?.status, error.response?.data);
      
      // Only logout if it's actually a 401, not network errors
      if (error.response?.status === 401) {
        dispatch({ type: 'LOGOUT' });
      }
      return false;
    } finally {
      setRefreshing(false);
    }
  };

  // Set up axios interceptor for handling 401 errors
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        // Prevent infinite loops
        if (originalRequest._retry || refreshing) {
          return Promise.reject(error);
        }
        
        // If the error is 401 and we haven't tried to refresh the token yet
        if (error.response?.status === 401 && state.isAuthenticated) {
          originalRequest._retry = true;
          
          console.log('401 error detected, attempting token refresh...');
          const refreshed = await refreshToken();
          
          if (refreshed) {
            console.log('Token refreshed, retrying original request');
            return axios(originalRequest);
          } else {
            console.log('Token refresh failed');
            dispatch({ type: 'LOGOUT' });
          }
        }
        
        return Promise.reject(error);
      }
    );
    
    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [state.isAuthenticated, refreshing]);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('Checking authentication status...');
        const response = await axios.get(`${baseUrl}/api/check-auth/`, {
          withCredentials: true,
        });

        if (response.data.isAuthenticated) {
          console.log('User is authenticated');
          dispatch({
            type: 'LOGIN',
            payload: { user: response.data.user },
          });
        } else {
          console.log('User not authenticated, attempting token refresh...');
          // Try to refresh the token if not authenticated
          const refreshed = await refreshToken();
          
          // If token refresh failed, ensure we're logged out
          if (!refreshed) {
            dispatch({ type: 'LOGOUT' });
          } else {
            // If refresh worked, check auth again
            const newResponse = await axios.get(`${baseUrl}//api/check-auth/`, {
              withCredentials: true,
            });
            
            if (newResponse.data.isAuthenticated) {
              console.log('Authentication successful after refresh');
              dispatch({
                type: 'LOGIN',
                payload: { user: newResponse.data.user },
              });
            } else {
              console.log('Authentication failed after refresh');
              dispatch({ type: 'LOGOUT' });
            }
          }
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

  const login = async (email, password) => {
    try {
      console.log('Attempting login...');
      const response = await axios.post(
        `${baseUrl}/api/login/`,
        { email, password },
        { withCredentials: true }
      );
      
      console.log('Login successful');
      dispatch({
        type: 'LOGIN',
        payload: { user: response.data.user }
      });
      
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Login failed:', error.response?.data || error.message);
      return { 
        success: false, 
        error: error.response?.data?.error || 'Login failed'
      };
    }
  };

  const logout = async () => {
    try {
      // FIXED: Use the correct URL for logout
      await axios.post(`${baseUrl}/api/logout/`, {}, { withCredentials: true });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      dispatch({ type: 'LOGOUT' });
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <AuthContext.Provider 
      value={{ 
        ...state, 
        dispatch, 
        login, 
        logout,
        refreshToken
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};