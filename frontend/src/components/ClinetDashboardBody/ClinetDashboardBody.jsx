import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { AuthContext } from '../../context/AuthContext';
import './ClientDashboardBody.css';
import Notifications from '../Notification/Notification';

function ClientDashBoardContent() {
  const authContext = useContext(AuthContext);
  const navigate = useNavigate();
  const { user, isAuthenticated } = authContext || { user: null, isAuthenticated: false };

  const [projectCounts, setProjectCounts] = useState({ active: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProjectCounts = async () => {
      try {
        const response = await axios.get('http://localhost:8000/api/client-project/', {
          withCredentials: true,
        });
        setProjectCounts({
          active: response.data.active.length,
          completed: response.data.completed.length,
        });
        setLoading(false);
      } catch (err) {
        const errorMessage = err.response?.data?.error || 'Failed to fetch project data';
        setError(errorMessage);
        setLoading(false);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: errorMessage,
          confirmButtonColor: '#dc3545',
          timer: 3000,
          timerProgressBar: true,
        });
      }
    };

    if (isAuthenticated && user && user.role === 'client') {
      fetchProjectCounts();
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    if (!isAuthenticated || !user || user.role !== 'client') {
      navigate('/login');
    }
  }, [user, isAuthenticated, navigate]);

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="client-dashboard">
      <h1 style={{color:'whitesmoke'}}>Client Dashboard</h1>
      <p style={{color:'whitesmoke'}}>Welcome to the Client Dashboard!</p>
      
      {loading ? (
        <p>Loading project data...</p>
      ) : (
        <div className="project-counts-table">
             <h1>Notifiactions <Notifications /></h1>
          <h2>Project Overview</h2>
         
          <table>
            <thead >
           
              <tr style={{color:'black'}}>
                <th  style={{color:'black'}}>Project Status</th>
                <th >Count</th>
              </tr>
            </thead>
            <tbody style={{color:'black'}}>
              <tr>
                <td>Active Projects</td>
                <td>{projectCounts.active}</td>
              </tr>
              <tr>
                <td>Completed Projects</td>
                <td>{projectCounts.completed}</td>
                
              </tr>
            </tbody>
          
          </table>
        </div>
      )}
    </div>
  );
}

export default ClientDashBoardContent;