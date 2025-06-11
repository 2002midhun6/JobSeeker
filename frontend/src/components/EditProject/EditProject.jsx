import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import Swal from 'sweetalert2';
import './EditProject.css';

const baseUrl = import.meta.env.VITE_API_URL;

// File Upload Component for Edit Project
const FileUpload = ({ onFileSelect, selectedFile, currentDocument, currentDocumentInfo, error, help }) => {
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
      case 'txt': return '📃';
      default: return '📎';
    }
  };

  const getFileNameFromUrl = (url) => {
    if (!url) return '';
    
    // If it's a Cloudinary URL, extract filename from the end
    if (url.includes('cloudinary.com')) {
      const parts = url.split('/');
      const filename = parts[parts.length - 1];
      // Remove any query parameters and decode
      return decodeURIComponent(filename.split('?')[0]);
    }
    
    // Fallback: extract from any URL
    return decodeURIComponent(url.split('/').pop().split('?')[0]);
  };

  const getFileTypeCategory = (fileName) => {
    const extension = fileName.toLowerCase().split('.').pop();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(extension)) {
      return 'image';
    } else if (extension === 'pdf') {
      return 'pdf';
    } else if (['doc', 'docx'].includes(extension)) {
      return 'document';
    } else if (['xls', 'xlsx'].includes(extension)) {
      return 'spreadsheet';
    } else if (['ppt', 'pptx'].includes(extension)) {
      return 'presentation';
    } else if (['zip', 'rar', '7z'].includes(extension)) {
      return 'archive';
    } else if (extension === 'txt') {
      return 'text';
    }
    return 'other';
  };

  const getViewButtonText = (fileName) => {
    const fileType = getFileTypeCategory(fileName);
    switch (fileType) {
      case 'image': return 'View Image';
      case 'pdf': return 'View PDF';
      case 'document': return 'Download Document';
      case 'spreadsheet': return 'Download Spreadsheet';
      case 'presentation': return 'Download Presentation';
      case 'archive': return 'Download Archive';
      case 'text': return 'View Text';
      default: return 'Download File';
    }
  };

  const createCloudinaryUrl = (originalUrl, transformation) => {
    if (!originalUrl || !originalUrl.includes('cloudinary.com')) {
      return originalUrl;
    }
    
    // Split URL at /upload/
    const urlParts = originalUrl.split('/upload/');
    if (urlParts.length !== 2) return originalUrl;
    
    const baseUrl = urlParts[0] + '/upload/';
    const pathAfterUpload = urlParts[1];
    
    return `${baseUrl}${transformation}/${pathAfterUpload}`;
  };

  const openFilePreview = (url, fileName, documentInfo = null) => {
    if (!url) return;
    
    console.log('Opening file:', { url, fileName, documentInfo });
    
    // Use document info if available, otherwise detect from filename
    const fileType = documentInfo?.file_type ? 
      getFileTypeCategory(`dummy.${documentInfo.file_type}`) : 
      getFileTypeCategory(fileName);
    
    // Create appropriate URLs for different file types
    let viewUrl = url;
    let downloadUrl = url;
    
    if (documentInfo?.view_url) {
      viewUrl = documentInfo.view_url;
    } else if (url.includes('cloudinary.com')) {
      if (fileType === 'pdf') {
        // For PDFs, use fl_inline to force browser viewing
        viewUrl = createCloudinaryUrl(url, 'fl_inline');
      } else if (fileType === 'image') {
        // Images can use original URL
        viewUrl = url;
      } else {
        // Other documents, try inline first
        viewUrl = createCloudinaryUrl(url, 'fl_inline');
      }
    }
    
    if (documentInfo?.download_url) {
      downloadUrl = documentInfo.download_url;
    } else if (url.includes('cloudinary.com')) {
      downloadUrl = createCloudinaryUrl(url, 'fl_attachment');
    }
    
    console.log('Generated URLs:', { viewUrl, downloadUrl, fileType });
    
    if (fileType === 'image') {
      // For images, open in new tab
      window.open(viewUrl, '_blank');
    } else if (fileType === 'pdf') {
      // For PDFs, try to open inline view URL
      try {
        const pdfWindow = window.open('', '_blank');
        if (pdfWindow) {
          // Create a simple PDF viewer page
          pdfWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>PDF Viewer - ${fileName}</title>
              <style>
                body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
                .header { background: #f5f5f5; padding: 10px; margin-bottom: 10px; }
                .download-btn { 
                  background: #007bff; 
                  color: white; 
                  padding: 8px 16px; 
                  text-decoration: none; 
                  border-radius: 4px; 
                  margin-left: 10px;
                }
                iframe { width: 100%; height: calc(100vh - 80px); border: none; }
                .error { color: red; margin: 20px; }
              </style>
            </head>
            <body>
              <div class="header">
                <strong>PDF: ${fileName}</strong>
                <a href="${downloadUrl}" class="download-btn" download>Download PDF</a>
              </div>
              <iframe src="${viewUrl}" title="PDF Viewer" onload="this.style.display='block'" onerror="document.getElementById('error').style.display='block'">
                <p>Your browser does not support PDFs. <a href="${downloadUrl}">Download the PDF</a>.</p>
              </iframe>
              <div id="error" class="error" style="display:none">
                <p>Failed to load PDF. <a href="${downloadUrl}">Click here to download</a> instead.</p>
              </div>
            </body>
            </html>
          `);
          pdfWindow.document.close();
        } else {
          // Popup blocked, fallback to download
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = fileName;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } catch (error) {
        console.error('Error opening PDF:', error);
        // Force download on error
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = fileName;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } else {
      // For other files, try view first, then download
      try {
        const fileWindow = window.open(viewUrl, '_blank');
        if (!fileWindow) {
          // Fallback to download
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = fileName;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } catch (error) {
        // Force download on error
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = fileName;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  };

  const hasFile = selectedFile || currentDocument;

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
              ) : currentDocument ? (
                <>
                  <span className="file-icon">{getFileIcon(getFileNameFromUrl(currentDocument))}</span>
                  <div className="file-details">
                    <div className="file-name">{getFileNameFromUrl(currentDocument)}</div>
                    <div className="file-status">Current document</div>
                    <div className="file-actions-inline">
                      <button
                        type="button"
                        className="file-action-btn view-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          openFilePreview(
                            currentDocument, 
                            getFileNameFromUrl(currentDocument),
                            currentDocumentInfo
                          );
                        }}
                      >
                        {getViewButtonText(getFileNameFromUrl(currentDocument))}
                      </button>
                    </div>
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
    document: null
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [currentDocument, setCurrentDocument] = useState(null);
  const [currentDocumentInfo, setCurrentDocumentInfo] = useState(null); // FIXED: Added missing state
  const [fileError, setFileError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        const response = await axios.get(`${baseUrl}/api/jobs/${job_id}/`, {
          withCredentials: true,
        });
        
        const { 
          title, 
          description, 
          budget, 
          deadline, 
          advance_payment, 
          document,           // This is the Cloudinary field data
          document_url,       // This is the proper Cloudinary URL
          document_info       // This is the document metadata
        } = response.data;
        
        console.log('Fetched project data:', response.data);
        console.log('Document field:', document);
        console.log('Document URL:', document_url);
        console.log('Document info:', document_info);
        
        setProject({
          title,
          description,
          budget,
          deadline: deadline ? new Date(deadline).toISOString().split('T')[0] : '',
          advance_payment: advance_payment !== null ? advance_payment : '',
          document
        });
        
        // Set current document URL if exists
        if (document_url) {
          setCurrentDocument(document_url);
        }
        
        // Set document info if exists
        if (document_info) {
          setCurrentDocumentInfo(document_info);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching project:', err);
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
    
    // Clear current document if new file is selected
    if (file) {
      setCurrentDocument(null);
      setCurrentDocumentInfo(null); // FIXED: Also clear document info
      const error = validateFile(file);
      setFileError(error);
    } else {
      setFileError('');
      // If removing file, restore original document if it existed
      if (project.document) {
        // We need to re-fetch or store the original document_url
        // For now, we'll let the user know they need to save to remove the file
        setCurrentDocument(null);
        setCurrentDocumentInfo(null);
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
    
    if (project.advance_payment !== '' && parseFloat(project.advance_payment) < 0) {
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: 'Advance payment cannot be negative',
        confirmButtonColor: '#dc3545',
      });
      return;
    }
    
    if (project.advance_payment !== '' && parseFloat(project.advance_payment) > parseFloat(project.budget)) {
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
      // Create FormData for file upload support
      const formData = new FormData();
      
      // Add form fields
      formData.append('title', project.title);
      formData.append('description', project.description);
      formData.append('budget', project.budget);
      formData.append('deadline', project.deadline);
      
      if (project.advance_payment !== '') {
        formData.append('advance_payment', project.advance_payment);
      }
      
      // Handle file upload/removal
      if (selectedFile) {
        // New file selected
        formData.append('document', selectedFile);
      } else if (!currentDocument && project.document) {
        // File was removed (no current document and original had one)
        formData.append('document', ''); // Send empty to remove
      }
      // If no changes to file, don't include document field

      console.log('Submitting form data:', {
        title: project.title,
        description: project.description,
        budget: project.budget,
        deadline: project.deadline,
        advance_payment: project.advance_payment,
        hasSelectedFile: !!selectedFile,
        hasCurrentDocument: !!currentDocument,
        originalDocument: project.document
      });

      const response = await axios.put(
        `${baseUrl}/api/jobs/${job_id}/`,
        formData,
        { 
          withCredentials: true,
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      console.log('Update response:', response.data);

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
      console.error('Update error:', err);
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
              currentDocument={currentDocument}
              currentDocumentInfo={currentDocumentInfo} 
              error={fileError}
              help="Upload project requirements, mockups, or reference documents. Files are stored securely in Cloudinary."
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