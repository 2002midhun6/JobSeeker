import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import Swal from 'sweetalert2';
import './EditProject.css';

const baseUrl = import.meta.env.VITE_API_URL;

// File Upload Component for Edit Project
const FileUpload = ({ onFileSelect, selectedFile, currentAttachment, error, help }) => {
  const [dragOver, setDragOver] = useState(false);
  
  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      onFileSelect(files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleFileInput = (e) => {
    const file = e.target.files[0];
    if (file) {
      onFileSelect(file);
    }
  };

  const removeFile = () => {
    onFileSelect(null);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileName) => {
    const extension = fileName.toLowerCase().split('.').pop();
    switch (extension) {
      case 'pdf': return '📄';
      case 'doc':
      case 'docx': return '📝';
      case 'xls':
      case 'xlsx': return '📊';
      case 'ppt':
      case 'pptx': return '📋';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif': return '🖼️';
      case 'zip':
      case 'rar': return '📦';
      default: return '📎';
    }
  };

  const getFileNameFromUrl = (url) => {
    if (!url) return '';
    return decodeURIComponent(url.split('/').pop());
  };

  const getFullAttachmentUrl = (url) => {
    if (!url) return '';
    // If URL already starts with http, return as is
    if (url.startsWith('http')) return url;
    // Otherwise, prepend base URL
    return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  const hasFile = selectedFile || currentAttachment;

  return (
    <div className="form-group file-upload-group">
      <label className="file-upload-label">
        <span className="file-icon">📎</span>
        Project Documents
        <span className="optional-text">(Optional)</span>
      </label>
      
      <div className="file-upload-wrapper">
        {!hasFile ? (
          <div
            className={`file-upload-zone ${dragOver ? 'drag-over' : ''} ${error ? 'has-error' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => document.getElementById('file-input-edit').click()}
          >
            <input
              id="file-input-edit"
              type="file"
              onChange={handleFileInput}
              style={{ display: 'none' }}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.zip,.rar,.txt"
            />
            <div className="upload-content">
              <span className="upload-icon">📁</span>
              <div className="upload-text">
                <p className="upload-primary">
                  Drop files here or <span className="upload-link">browse</span>
                </p>
                <p className="upload-secondary">
                  Support for documents, images, and archives up to 10MB<br />
                  PDF, DOC, XLS, PPT, JPG, PNG, ZIP formats accepted
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="file-preview">
            <div className="file-info">
              {selectedFile ? (
                <>
                  <span className="file-icon">{getFileIcon(selectedFile.name)}</span>
                  <div className="file-details">
                    <div className="file-name">{selectedFile.name}</div>
                    <div className="file-size">{formatFileSize(selectedFile.size)}</div>
                    <div className="file-status">New file selected</div>
                  </div>
                </>
              ) : currentAttachment ? (
                <>
                  <span className="file-icon">{getFileIcon(getFileNameFromUrl(currentAttachment))}</span>
                  <div className="file-details">
                    <div className="file-name">{getFileNameFromUrl(currentAttachment)}</div>
                    <div className="file-status">Current attachment</div>
                    <div className="file-url-debug" style={{ fontSize: '10px', color: '#666', wordBreak: 'break-all' }}>
                      URL: {currentAttachment}
                    </div>
                    <a 
                      href={getFullAttachmentUrl(currentAttachment)} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="file-download-link"
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('Clicking download link:', getFullAttachmentUrl(currentAttachment));
                      }}
                    >
                      View/Download
                    </a>
                  </div>
                </>
              ) : null}
              <button
                type="button"
                className="file-remove"
                onClick={removeFile}
                title="Remove file"
              >
                ✕
              </button>
            </div>
            <div className="file-actions">
              <button
                type="button"
                className="file-replace-btn"
                onClick={() => document.getElementById('file-input-edit').click()}
              >
                Replace File
              </button>
              <input
                id="file-input-edit"
                type="file"
                onChange={handleFileInput}
                style={{ display: 'none' }}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.zip,.rar,.txt"
              />
            </div>
          </div>
        )}
        
        {error && (
          <div className="file-error">
            <span className="error-icon">⚠️</span>
            <span className="error-message">{error}</span>
          </div>
        )}
        
        {help && !error && (
          <div className="file-help">
            <span className="help-icon">💡</span>
            <span className="help-message">{help}</span>
          </div>
        )}
      </div>
    </div>
  );
};

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
    attachment: null
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [currentAttachment, setCurrentAttachment] = useState(null);
  const [fileError, setFileError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const response = await axios.get(`${baseUrl}/api/jobs/${job_id}/`, {
          withCredentials: true,
        });
        const { title, description, budget, deadline, advance_payment, attachment } = response.data;
        console.log('Fetched attachment:', attachment); // Debug log
        setProject({
          title,
          description,
          budget,
          deadline: deadline ? new Date(deadline).toISOString().split('T')[0] : '',
          advance_payment: advance_payment !== null ? advance_payment : '',
          attachment
        });
        setCurrentAttachment(attachment);
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

  const validateFile = (file) => {
    if (!file) return '';
    
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'application/zip',
      'application/x-rar-compressed',
      'text/plain'
    ];

    if (file.size > maxSize) {
      return 'File size must be less than 10MB';
    }

    if (!allowedTypes.includes(file.type)) {
      return 'File type not supported. Please upload PDF, DOC, XLS, PPT, images, or archives';
    }

    return '';
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProject((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileSelect = (file) => {
    setSelectedFile(file);
    
    // Clear current attachment if new file is selected
    if (file) {
      setCurrentAttachment(null);
      const error = validateFile(file);
      setFileError(error);
    } else {
      setFileError('');
      // If removing file and no current attachment, set to original attachment
      if (!currentAttachment && project.attachment) {
        setCurrentAttachment(project.attachment);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form fields
    if (project.budget <= 0) {
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: 'Budget must be greater than zero',
        confirmButtonColor: '#dc3545',
      });
      return;
    }
    if ( parseFloat(project.advance_payment0) !== 0 &&  parseFloat(project.advance_payment) < 0) {
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: 'Advance payment cannot be negative',
        confirmButtonColor: '#dc3545',
      });
      return;
    }
    if (project.advance_payment !== '' && parseFloat(project.advance_payment) < 0) {
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

    // Validate file if selected
    if (selectedFile && fileError) {
      Swal.fire({
        icon: 'error',
        title: 'File Error',
        text: fileError,
        confirmButtonColor: '#dc3545',
      });
      return;
    }

    try {
      // Create FormData if there's a file, otherwise use regular data
      let payload;
      let headers = { 'Content-Type': 'application/json' };

      if (selectedFile) {
        // Use FormData for file upload
        payload = new FormData();
        payload.append('title', project.title);
        payload.append('description', project.description);
        payload.append('budget', project.budget);
        payload.append('deadline', project.deadline);
        if (project.advance_payment !== '') {
          payload.append('advance_payment', project.advance_payment);
        }
        payload.append('attachment', selectedFile);
        headers = { 'Content-Type': 'multipart/form-data' };
      } else if (!selectedFile && !currentAttachment && project.attachment) {
        // Remove attachment - send null
        payload = { 
          ...project,
          attachment: null,
          advance_payment: project.advance_payment === '' ? null : project.advance_payment
        };
      } else {
        // No file changes - send regular form data
        payload = { 
          ...project,
          advance_payment: project.advance_payment === '' ? null : project.advance_payment
        };
        // Remove attachment from payload to avoid sending file data
        delete payload.attachment;
      }

      const response = await axios.put(
        `${baseUrl}/api/jobs/${job_id}/`,
        payload,
        { 
          withCredentials: true,
          headers
        }
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

            {/* File Upload Component */}
            <FileUpload
              onFileSelect={handleFileSelect}
              selectedFile={selectedFile}
              currentAttachment={currentAttachment}
              error={fileError}
              help="Upload project requirements, mockups, or reference documents"
            />
            
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