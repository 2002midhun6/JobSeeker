import React, { createContext, useReducer, useEffect, useState } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

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
    if (refreshing) return;
    setRefreshing(true);
    
    try {
      const response = await axios.post(
        'http://localhost:8000/api/token/refresh/',
        {}, // No body needed as the refresh token is in the HTTP-only cookie
        { withCredentials: true }
      );
      
      // If successful, the server will have set a new access_token cookie
      // We can return true to indicate success
      setRefreshing(false);
      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      // If refresh fails, log the user out
      dispatch({ type: 'LOGOUT' });
      setRefreshing(false);
      return false;
    }
  };

  // Set up axios interceptor for handling 401 errors
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        // If the error is 401 and we haven't tried to refresh the token yet
        if (error.response?.status === 401 && !originalRequest._retry && state.isAuthenticated) {
          originalRequest._retry = true;
          
          // Try to refresh the token
          const refreshed = await refreshToken();
          
          // If refresh was successful, retry the original request
          if (refreshed) {
            return axios(originalRequest);
          }
        }
        
        // Otherwise, just pass on the error
        return Promise.reject(error);
      }
    );
    
    // Clean up interceptor on unmount
    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [state.isAuthenticated]);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await axios.get('http://localhost:8000/api/check-auth/', {
          withCredentials: true,
        });

        if (response.data.isAuthenticated) {
          dispatch({
            type: 'LOGIN',
            payload: { user: response.data.user },
          });
        } else {
          // Try to refresh the token if not authenticated
          const refreshed = await refreshToken();
          
          // If token refresh failed, ensure we're logged out
          if (!refreshed) {
            dispatch({ type: 'LOGOUT' });
          } else {
            // If refresh worked, check auth again
            const newResponse = await axios.get('http://localhost:8000/api/check-auth/', {
              withCredentials: true,
            });
            
            if (newResponse.data.isAuthenticated) {
              dispatch({
                type: 'LOGIN',
                payload: { user: newResponse.data.user },
              });
            } else {
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
      const response = await axios.post(
        'http://localhost:8000/api/login/',
        { email, password },
        { withCredentials: true }
      );
      
      dispatch({
        type: 'LOGIN',
        payload: { user: response.data.user }
      });
      
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.error || 'Login failed'
      };
    }
  };

  const logout = async () => {
    try {
      await axios.post('http://localhost:8000/api/logout/', {}, { withCredentials: true });
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