import React, { useState, useContext, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import { useNavigate } from 'react-router-dom';
import './JobPage.css';
import { AuthContext } from '../context/AuthContext';
import ClinetHeaderComp from '../components/ClientDashboard/ClientDashboardHeader';
const baseUrl = import.meta.env.VITE_API_URL;

// Enhanced Spinner Component
const Spinner = ({ size = 'medium', text = 'Loading...', inline = false }) => {
  const spinnerStyles = {
    container: {
      display: 'flex',
      flexDirection: inline ? 'row' : 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: inline ? '8px' : '12px',
      padding: inline ? '0' : '20px',
    },
    spinner: {
      width: size === 'small' ? '16px' : size === 'large' ? '24px' : '20px',
      height: size === 'small' ? '16px' : size === 'large' ? '24px' : '20px',
      border: `2px solid transparent`,
      borderTop: `2px solid #ffffff`,
      borderRight: `2px solid #ffffff`,
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
    },
    text: {
      color: inline ? '#ffffff' : '#6b7280',
      fontSize: size === 'small' ? '14px' : '16px',
      fontWeight: '500',
    }
  };

  return (
    <div style={spinnerStyles.container}>
      <div style={spinnerStyles.spinner}></div>
      {text && <span style={spinnerStyles.text}>{text}</span>}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

// Form Progress Indicator
const FormProgress = ({ currentStep, totalSteps, completedFields, totalFields }) => {
  const progressPercentage = (completedFields / totalFields) * 100;
  
  return (
    <div className="form-progress">
      <div className="progress-header">
        <div className="progress-info">
          <span className="progress-text">Form Completion</span>
          <span className="progress-percentage">{Math.round(progressPercentage)}%</span>
        </div>
      </div>
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${progressPercentage}%` }}
        ></div>
      </div>
      <div className="progress-details">
        <span className="progress-detail">{completedFields} of {totalFields} fields completed</span>
      </div>
    </div>
  );
};

// Enhanced Input Field Component
const FormField = ({ 
  label, 
  name, 
  type = 'text', 
  value, 
  onChange, 
  placeholder, 
  required = false, 
  error, 
  icon, 
  help,
  min,
  max,
  step,
  rows = 4,
  className = '',
  onBlur
}) => {
  const [focused, setFocused] = useState(false);
  
  const fieldClassName = `
    form-field 
    ${error ? 'has-error' : ''} 
    ${focused ? 'is-focused' : ''} 
    ${value ? 'has-value' : ''}
    ${className}
  `.trim();

  return (
    <div className={fieldClassName}>
      <label className="field-label">
        {icon && <span className="field-icon">{icon}</span>}
        <span className="label-text">
          {label}
          {required && <span className="required-star">*</span>}
        </span>
      </label>
      
      <div className="field-wrapper">
        {type === 'textarea' ? (
          <textarea
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            onFocus={() => setFocused(true)}
            onBlur={(e) => {
              setFocused(false);
              if (onBlur) onBlur(e);
            }}
            rows={rows}
            className="field-input"
            required={required}
          />
        ) : (
          <input
            type={type}
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            onFocus={() => setFocused(true)}
            onBlur={(e) => {
              setFocused(false);
              if (onBlur) onBlur(e);
            }}
            min={min}
            max={max}
            step={step}
            className="field-input"
            required={required}
          />
        )}
        
        {error && (
          <div className="field-error">
            <span className="error-icon">⚠️</span>
            <span className="error-message">{error}</span>
          </div>
        )}
        
        {help && !error && (
          <div className="field-help">
            <span className="help-icon">💡</span>
            <span className="help-message">{help}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// File Upload Component
const FileUpload = ({ onFileSelect, selectedFile, error, help }) => {
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

  return (
    <div className="form-field">
      <label className="field-label">
        <span className="field-icon">📎</span>
        <span className="label-text">
          Project Documents
          <span className="optional-text">(Optional)</span>
        </span>
      </label>
      
      <div className="field-wrapper">
        {!selectedFile ? (
          <div
            className={`file-upload-zone ${dragOver ? 'drag-over' : ''} ${error ? 'has-error' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => document.getElementById('file-input').click()}
          >
            <input
              id="file-input"
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
              <span className="file-icon">{getFileIcon(selectedFile.name)}</span>
              <div className="file-details">
                <div className="file-name">{selectedFile.name}</div>
                <div className="file-size">{formatFileSize(selectedFile.size)}</div>
              </div>
              <button
                type="button"
                className="file-remove"
                onClick={removeFile}
                title="Remove file"
              >
                ✕
              </button>
            </div>
          </div>
        )}
        
        {error && (
          <div className="field-error">
            <span className="error-icon">⚠️</span>
            <span className="error-message">{error}</span>
          </div>
        )}
        
        {help && !error && (
          <div className="field-help">
            <span className="help-icon">💡</span>
            <span className="help-message">{help}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// Budget Calculator Component
const BudgetCalculator = ({ budget, advancePayment, onBudgetChange, onAdvanceChange }) => {
  const remaining = budget && advancePayment ? (parseFloat(budget) - parseFloat(advancePayment)) : budget;
  const advancePercentage = budget && advancePayment ? (parseFloat(advancePayment) / parseFloat(budget)) * 100 : 0;

  return (
    <div className="budget-calculator">
      <h3 className="calculator-title">
        <span className="calculator-icon">💰</span>
        Budget Breakdown
      </h3>
      
      <div className="budget-display">
        <div className="budget-item">
          <span className="budget-label">Total Budget</span>
          <span className="budget-value">${budget || '0.00'}</span>
        </div>
        
        {advancePayment && (
          <>
            <div className="budget-item advance">
              <span className="budget-label">Advance Payment ({Math.round(advancePercentage)}%)</span>
              <span className="budget-value">${advancePayment}</span>
            </div>
            
            <div className="budget-item remaining">
              <span className="budget-label">Remaining Payment</span>
              <span className="budget-value">${remaining.toFixed(2)}</span>
            </div>
          </>
        )}
      </div>
      
      {advancePayment && advancePercentage > 50 && (
        <div className="budget-warning">
          <span className="warning-icon">⚠️</span>
          <span>High advance payment ({Math.round(advancePercentage)}%). Consider reducing for better protection.</span>
        </div>
      )}
    </div>
  );
};

function JobPage() {
  const { user, isAuthenticated } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    budget: '',
    deadline: '',
    advance_payment: ''
  });
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({});
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
    return (
      <div className="auth-loading">
        <Spinner size="large" text="Checking authentication..." />
      </div>
    );
  }

  const getCompletedFieldsCount = () => {
    const requiredFields = ['title', 'description', 'budget', 'deadline'];
    return requiredFields.filter(field => formData[field]?.toString().trim()).length;
  };

  const validateField = (name, value) => {
    let error = '';
    
    switch (name) {
      case 'title':
        if (!value.trim()) {
          error = 'Title is required';
        } else if (value.trim().length < 5) {
          error = 'Title should be at least 5 characters';
        } else if (value.trim().length > 100) {
          error = 'Title should not exceed 100 characters';
        }
        break;
        
      case 'description':
        if (!value.trim()) {
          error = 'Description is required';
        } else if (value.trim().length < 20) {
          error = 'Description should be at least 20 characters';
        } else if (value.trim().length > 1000) {
          error = 'Description should not exceed 1000 characters';
        }
        break;
        
      case 'budget':
        if (!value) {
          error = 'Budget is required';
        } else if (parseFloat(value) <= 0) {
          error = 'Budget must be greater than 0';
        } else if (parseFloat(value) > 1000000) {
          error = 'Budget seems too high. Please verify.';
        }
        break;
        
      case 'deadline':
        if (!value) {
          error = 'Deadline is required';
        } else {
          const selectedDate = new Date(value);
          const currentDate = new Date();
          currentDate.setHours(0, 0, 0, 0);
          
          if (selectedDate <= currentDate) {
            error = 'Deadline must be a future date';
          }
        }
        break;
        
      case 'advance_payment':
        if (value && formData.budget) {
          if (parseFloat(value) > parseFloat(formData.budget)) {
            error = 'Advance payment cannot exceed budget';
          } else if (parseFloat(value) < 0) {
            error = 'Advance payment cannot be negative';
          }
        }
        break;
        
      default:
        break;
    }
    
    return error;
  };

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

  const validateForm = () => {
    const newErrors = {};
    const fields = ['title', 'description', 'budget', 'deadline', 'advance_payment'];
    
    fields.forEach(field => {
      const error = validateField(field, formData[field]);
      if (error) {
        newErrors[field] = error;
      }
    });

    // Validate file if selected - CHANGED: Using 'document' instead of 'attachment'
    if (selectedFile) {
      const fileError = validateFile(selectedFile);
      if (fileError) {
        newErrors.document = fileError;
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Mark field as touched
    setTouched({ ...touched, [name]: true });
    
    // Real-time validation for touched fields
    if (touched[name]) {
      const fieldError = validateField(name, value);
      setErrors({ ...errors, [name]: fieldError });
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched({ ...touched, [name]: true });
    
    // Validate on blur
    const fieldError = validateField(name, value);
    setErrors({ ...errors, [name]: fieldError });
  };

  const handleFileSelect = (file) => {
    setSelectedFile(file);
    
    // Validate file immediately - CHANGED: Using 'document' instead of 'attachment'
    if (file) {
      const fileError = validateFile(file);
      setErrors({ ...errors, document: fileError });
    } else {
      const { document, ...restErrors } = errors;
      setErrors(restErrors);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Mark all fields as touched
    const allFields = ['title', 'description', 'budget', 'deadline', 'advance_payment'];
    const newTouched = {};
    allFields.forEach(field => {
      newTouched[field] = true;
    });
    setTouched(newTouched);
    
    // Validate form before submitting
    if (!validateForm()) {
      Swal.fire({
        icon: 'warning',
        title: 'Form Validation Failed',
        text: 'Please fix the errors before submitting',
        confirmButtonColor: '#f59e0b',
      });
      return;
    }
    
    try {
      setLoading(true);
      
      // Create FormData for file upload
      const formDataToSubmit = new FormData();
      
      // Append text fields
      formDataToSubmit.append('title', formData.title.trim());
      formDataToSubmit.append('description', formData.description.trim());
      formDataToSubmit.append('budget', parseFloat(formData.budget).toFixed(2));
      formDataToSubmit.append('deadline', formData.deadline);
      
      if (formData.advance_payment) {
        formDataToSubmit.append('advance_payment', parseFloat(formData.advance_payment).toFixed(2));
      }
      
      // CHANGED: Append file as 'document' instead of 'attachment' to match backend field
      if (selectedFile) {
        formDataToSubmit.append('document', selectedFile);
      }

      console.log('Submitting form data with file:', selectedFile ? selectedFile.name : 'No file');
      
      const response = await axios.post(`${baseUrl}/api/jobs/`, formDataToSubmit, {
        withCredentials: true,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        budget: '',
        deadline: '',
        advance_payment: ''
      });
      setSelectedFile(null);
      setErrors({});
      setTouched({});
      setError('');
      setLoading(false);

      // ENHANCED: Show success alert with document upload info
      const documentInfo = response.data.document_url ? 
        'Document uploaded successfully to Cloudinary!' : 
        'Job posted without document.';
      
      await Swal.fire({
        icon: 'success',
        title: 'Job Posted Successfully! 🎉',
        text: `Your job has been posted and is now visible to professionals. ${documentInfo}`,
        confirmButtonColor: '#10b981',
        confirmButtonText: 'View My Projects',
        showCancelButton: true,
        cancelButtonText: 'Post Another Job',
        cancelButtonColor: '#6b7280',
        timer: 5000,
        timerProgressBar: true,
      }).then((result) => {
        if (result.isConfirmed) {
          navigate('/client-project');
        } else if (result.dismiss === Swal.DismissReason.cancel) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
          navigate('/client-dashboard');
        }
      });
    } catch (err) {
      console.error('Submit error:', err);
      
      // Enhanced error handling for file upload issues
      let errorMessage = 'Failed to post job';
      if (err.response?.data?.document) {
        errorMessage = `Document upload error: ${err.response.data.document[0]}`;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      
      setError(errorMessage);
      setLoading(false);
      
      Swal.fire({
        icon: 'error',
        title: 'Failed to Post Job',
        text: errorMessage,
        confirmButtonColor: '#dc2626',
        footer: 'Please try again or contact support if the problem persists.'
      });
    }
  };

  const completedFields = getCompletedFieldsCount();
  const totalRequiredFields = 4; // title, description, budget, deadline

  return (
    <>
      <ClinetHeaderComp />
      <div className="job-page-container">
        <div className="job-page-content">
          {/* Header Section */}
          <div className="page-header">
            <div className="header-content">
              <h1 className="page-title">
                <span className="title-icon">🚀</span>
                Post a New Job
              </h1>
              <p className="page-subtitle">
                Create a detailed job posting to attract the best professionals for your project
              </p>
            </div>
            
            {/* Progress Indicator */}
            <FormProgress 
              completedFields={completedFields}
              totalFields={totalRequiredFields}
            />
          </div>

          {/* Main Content */}
          <div className="form-container">
            <div className="form-card">
              {error && (
                <div className="global-error">
                  <span className="error-icon">⚠️</span>
                  <span className="error-text">{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="job-form">
                <div className="form-section">
                  <h2 className="section-title">
                    <span className="section-icon">📝</span>
                    Job Details
                  </h2>
                  
                  <FormField
                    label="Job Title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="e.g., Build a responsive e-commerce website"
                    required
                    error={touched.title ? errors.title : ''}
                    icon="💼"
                    help="Write a clear, descriptive title that explains what you need done"
                  />

                  <FormField
                    label="Project Description"
                    name="description"
                    type="textarea"
                    value={formData.description}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    placeholder="Describe your project in detail. Include requirements, expectations, deliverables, and any specific skills needed..."
                    required
                    error={touched.description ? errors.description : ''}
                    icon="📄"
                    help={`${formData.description.length}/1000 characters. Be specific about your requirements.`}
                    rows={6}
                  />

                  {/* CHANGED: Updated error prop to use 'document' instead of 'attachment' */}
                  <FileUpload
                    onFileSelect={handleFileSelect}
                    selectedFile={selectedFile}
                    error={errors.document}
                    help="Upload project requirements, mockups, or reference documents. Files will be stored securely in Cloudinary."
                  />

                  <FormField
                    label="Deadline"
                    name="deadline"
                    type="date"
                    value={formData.deadline}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    min={new Date().toISOString().split('T')[0]}
                    required
                    error={touched.deadline ? errors.deadline : ''}
                    icon="📅"
                    help="When do you need this project completed?"
                  />
                </div>

                <div className="form-section">
                  <h2 className="section-title">
                    <span className="section-icon">💰</span>
                    Budget & Payment
                  </h2>
                  
                  <div className="budget-fields">
                    <FormField
                      label="Total Budget"
                      name="budget"
                      type="number"
                      value={formData.budget}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      required
                      error={touched.budget ? errors.budget : ''}
                      icon="💵"
                      help="Set a realistic budget based on project scope"
                    />

                    <FormField
                      label="Advance Payment (Optional)"
                      name="advance_payment"
                      type="number"
                      value={formData.advance_payment}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                      max={formData.budget}
                      error={touched.advance_payment ? errors.advance_payment : ''}
                      icon="💳"
                      help="Optional upfront payment to secure the professional"
                    />
                  </div>

                  {(formData.budget || formData.advance_payment) && (
                    <BudgetCalculator
                      budget={formData.budget}
                      advancePayment={formData.advance_payment}
                    />
                  )}
                </div>

                <div className="form-actions">
                  <button 
                    type="button" 
                    className="secondary-button"
                    onClick={() => navigate('/client-dashboard')}
                    disabled={loading}
                  >
                    <span className="button-icon">←</span>
                    Back to Dashboard
                  </button>
                  
                  <button 
                    type="submit" 
                    className="primary-button"
                    disabled={loading || completedFields < totalRequiredFields}
                  >
                    {loading ? (
                      <Spinner size="small" text="Posting..." inline />
                    ) : (
                      <>
                        <span className="button-icon">🚀</span>
                        Post Job
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Tips Sidebar */}
            <div className="tips-sidebar">
              <div className="tips-card">
                <h3 className="tips-title">
                  <span className="tips-icon">💡</span>
                  Tips for Success
                </h3>
                
                <div className="tips-list">
                  <div className="tip-item">
                    <span className="tip-icon">✅</span>
                    <div className="tip-content">
                      <strong>Be Specific</strong>
                      <p>Clear requirements attract better professionals</p>
                    </div>
                  </div>
                  
                  <div className="tip-item">
                    <span className="tip-icon">💰</span>
                    <div className="tip-content">
                      <strong>Fair Budget</strong>
                      <p>Competitive pricing gets quality results</p>
                    </div>
                  </div>
                  
                  <div className="tip-item">
                    <span className="tip-icon">⏰</span>
                    <div className="tip-content">
                      <strong>Realistic Timeline</strong>
                      <p>Allow adequate time for quality work</p>
                    </div>
                  </div>
                  
                  <div className="tip-item">
                    <span className="tip-icon">📎</span>
                    <div className="tip-content">
                      <strong>Upload Documents</strong>
                      <p>Share requirements and examples for clarity</p>
                    </div>
                  </div>
                  
                  <div className="tip-item">
                    <span className="tip-icon">📞</span>
                    <div className="tip-content">
                      <strong>Stay Responsive</strong>
                      <p>Quick responses lead to faster hiring</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default JobPage;