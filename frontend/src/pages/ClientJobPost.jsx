import React, { useState, useContext, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import './JobPage.css';
import { AuthContext } from '../context/AuthContext';
import ClinetHeaderComp from '../components/ClientDashboard/ClientDashboardHeader';

function JobPage() {
  const { user, isAuthenticated } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    budget: '',
    deadline: '',
    advance_payment: ''
  });
  
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated || !user) {
      console.log('Not authenticated or no user, redirecting to login');
      navigate('/login');
    } else if (user.role !== 'client') {
      console.log('User is not a client, redirecting to login');
      navigate('/login');
    }
  }, [user, isAuthenticated, navigate]);

  // Prevent rendering until auth is checked
  if (!isAuthenticated || !user) {
    return null; // Or a loading spinner: <div>Loading...</div>
  }

  const validateForm = () => {
    const newErrors = {};
    
    // Title validation - should be between 5 and 100 characters
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.trim().length < 5) {
      newErrors.title = 'Title should be at least 5 characters';
    } else if (formData.title.trim().length > 100) {
      newErrors.title = 'Title should not exceed 100 characters';
    }
    
    // Description validation - should be at least 30 characters
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    } else if (formData.description.trim().length < 20) {
      newErrors.description = 'Description should be at least 20 characters';
    }
    
    // Budget validation - should be a positive number
    if (!formData.budget) {
      newErrors.budget = 'Budget is required';
    } else if (parseFloat(formData.budget) <= 0) {
      newErrors.budget = 'Budget must be greater than 0';
    }
    
    // Deadline validation - should be a future date
    if (!formData.deadline) {
      newErrors.deadline = 'Deadline is required';
    } else {
      const selectedDate = new Date(formData.deadline);
      const currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0); // Reset time to compare dates only
      
      if (selectedDate <= currentDate) {
        newErrors.deadline = 'Deadline must be a future date';
      }
    }
    
    // Advance payment validation - should not exceed budget if provided
    if (formData.advance_payment && parseFloat(formData.advance_payment) > parseFloat(formData.budget)) {
      newErrors.advance_payment = 'Advance payment cannot exceed budget';
    } else if (formData.advance_payment && parseFloat(formData.advance_payment) < 0) {
      newErrors.advance_payment = 'Advance payment cannot be negative';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0; // Return true if no errors
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Clear the specific error when user starts typing again
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form before submitting
    if (!validateForm()) {
      return; // Stop submission if validation fails
    }
    
    try {
      setLoading(true);
      const response = await axios.post('http://localhost:8000/api/jobs/', formData, {
        withCredentials: true, // Send cookies with request
      });
      setFormData({
        title: '',
        description: '',
        budget: '',
        deadline: '',
        advance_payment: ''
      });
      setError('');
      setLoading(false);

      // Show Swal alert for success
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Job posted successfully!',
        confirmButtonColor: '#28a745',
        timer: 3000,
      }).then(() => {
        navigate('/client-dashboard'); // Redirect to dashboard after Swal closes
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to post job');
      setLoading(false);
      // Show Swal alert for error
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.response?.data?.error || 'Failed to post job',
        confirmButtonColor: '#dc3545',
      });
    }
  };

  return (
    <>
      <ClinetHeaderComp />
      <div className="job-container">
        <div className="job-card">
          <h2 className="job-title">Post a New Job</h2>
          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit} className="job-form">
            <div className="form-group">
              <label htmlFor="title">Job Title</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Enter job title"
                className={errors.title ? 'input-error' : ''}
                required
              />
              {errors.title && <div className="error-text">{errors.title}</div>}
            </div>
            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe the job in detail"
                className={errors.description ? 'input-error' : ''}
                required
              />
              {errors.description && <div className="error-text">{errors.description}</div>}
            </div>
            <div className="form-group">
              <label htmlFor="budget">Budget ($)</label>
              <input
                type="number"
                id="budget"
                name="budget"
                value={formData.budget}
                onChange={handleChange}
                placeholder="Enter budget"
                step="0.01"
                min="0"
                className={errors.budget ? 'input-error' : ''}
                required
              />
              {errors.budget && <div className="error-text">{errors.budget}</div>}
            </div>
            <div className="form-group">
              <label htmlFor="deadline">Deadline</label>
              <input
                type="date"
                id="deadline"
                name="deadline"
                value={formData.deadline}
                onChange={handleChange}
                min={new Date().toISOString().split('T')[0]} // Prevent past dates
                className={errors.deadline ? 'input-error' : ''}
                required
              />
              {errors.deadline && <div className="error-text">{errors.deadline}</div>}
            </div>
            <div className="form-group">
              <label htmlFor="advance_payment">Advance Payment ($)</label>
              <input
                type="number"
                id="advance_payment"
                name="advance_payment"
                value={formData.advance_payment}
                onChange={handleChange}
                placeholder="Enter advance payment (optional)"
                step="0.01"
                min="0"
                className={errors.advance_payment ? 'input-error' : ''}
              />
              {errors.advance_payment && <div className="error-text">{errors.advance_payment}</div>}
            </div>
            <button type="submit" className="job-button" disabled={loading}>
              {loading ? 'Posting...' : 'Post Job'}
            </button>
          </form>

          <p className="back-link">
            <a href="#" onClick={() => navigate('/client-dashboard')}>Back to Dashboard</a>
          </p>
        </div>
      </div>
    </>
  );
}

export default JobPage;