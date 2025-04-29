import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import Swal from 'sweetalert2';
import './EditProject.css';

function EditProject() {
  const { job_id } = useParams();
  const authContext = useContext(AuthContext);
  const navigate = useNavigate();
  const { user, isAuthenticated } = authContext || { user: null, isAuthenticated: false };

  const [project, setProject] = useState({
    title: '',
    description: '',
    budget: '',
    deadline: '',
    advance_payment: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const response = await axios.get(`http://localhost:8000/api/jobs/${job_id}/`, {
          withCredentials: true,
        });
        const { title, description, budget, deadline, advance_payment } = response.data;
        setProject({
          title,
          description,
          budget,
          deadline: deadline ? new Date(deadline).toISOString().split('T')[0] : '',
          advance_payment: advance_payment !== null ? advance_payment : '',
        });
        setLoading(false);
      } catch (err) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err.response?.data?.error || 'Failed to fetch project details',
          confirmButtonColor: '#dc3545',
        });
        setLoading(false);
      }
    };

    if (!isAuthenticated || !user || user.role !== 'client') {
      navigate('/login');
    } else {
      fetchProject();
    }
  }, [job_id, isAuthenticated, user, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProject((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (project.budget <= 0) {
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: 'Budget must be greater than zero',
        confirmButtonColor: '#dc3545',
      });
      return;
    }
    if (project.advance_payment !== '' && project.advance_payment < 0) {
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: 'Advance payment cannot be negative',
        confirmButtonColor: '#dc3545',
      });
      return;
    }
    if (project.advance_payment !== '' && project.advance_payment > project.budget) {
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: 'Advance payment cannot exceed budget',
        confirmButtonColor: '#dc3545',
      });
      return;
    }
    if (new Date(project.deadline) < new Date()) {
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: 'Deadline cannot be in the past',
        confirmButtonColor: '#dc3545',
      });
      return;
    }
    try {
      const payload = { ...project };
      if (project.advance_payment === '') {
        payload.advance_payment = null;
      }
      const response = await axios.put(
        `http://localhost:8000/api/jobs/${job_id}/`,
        payload,
        { withCredentials: true }
      );
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: response.data.message || 'Project updated successfully',
        confirmButtonColor: '#28a745',
        timer: 2000,
        timerProgressBar: true,
      }).then(() => {
        navigate('/client-project');
      });
    } catch (err) {
      const errorMsg =
        err.response?.data?.error ||
        (err.response?.data?.non_field_errors?.[0]) ||
        Object.values(err.response?.data || {}).join(' ') ||
        'Failed to update project';
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMsg,
        confirmButtonColor: '#dc3545',
      });
    }
  };

  if (!isAuthenticated || !user) return null;

  return (
    <div className="client-projects-container">
      <div className="projects-content">
        <h2>Edit Project</h2>
        {loading ? (
          <p>Loading project details...</p>
        ) : (
          <form onSubmit={handleSubmit} className="edit-project-form">
            <div className="form-group">
              <label htmlFor="title">Title</label>
              <input
                type="text"
                id="title"
                name="title"
                value={project.title}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                value={project.description}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="budget">Budget ($)</label>
              <input
                type="number"
                id="budget"
                name="budget"
                value={project.budget}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
              />
            </div>
            <div className="form-group">
              <label htmlFor="advance_payment">Advance Payment ($)</label>
              <input
                type="number"
                id="advance_payment"
                name="advance_payment"
                value={project.advance_payment}
                onChange={handleChange}
                placeholder="Optional"
                step="0.01"
                min="0"
              />
            </div>
            <div className="form-group">
              <label htmlFor="deadline">Deadline</label>
              <input
                type="date"
                id="deadline"
                name="deadline"
                value={project.deadline}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="save-btn">
                Save Changes
              </button>
              <button
                type="button"
                onClick={() => navigate('/client-project')}
                className="cancel-btn"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default EditProject;