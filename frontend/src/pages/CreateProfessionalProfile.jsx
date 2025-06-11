import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import './CreateProfessionalProfile.css';
import ProfessionalHeader from '../components/ProfessionalDashboard/ProfessionalDashboardHeader';

const baseUrl = import.meta.env.VITE_API_URL;

function CreateProfessionalProfile() {
  const [formData, setFormData] = useState({
    bio: '',
    skills: [],
    experience_years: 0,
    availability_status: 'Available',
    portfolio_links: [],
    verify_doc: null,
  });
  const [profileExists, setProfileExists] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState('Pending');
  const [denialReason, setDenialReason] = useState('');
  const [currentVerifyDoc, setCurrentVerifyDoc] = useState(null); // NEW: Current document URL
  const [errors, setErrors] = useState({});
  const [validFields, setValidFields] = useState({});
  const [profileUpdated, setProfileUpdated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const navigate = useNavigate();

  const fetchProfile = async () => {
    try {
      const response = await axios.get(`${baseUrl}/api/profile/`, {
        withCredentials: true,
      });
      
      const { user, verify_doc_url, ...profileData } = response.data; // Extract verify_doc_url
      
      console.log('Fetched profile data:', response.data);
      console.log('Verification document URL:', verify_doc_url);
      
      setFormData({
        bio: profileData.bio || '',
        skills: Array.isArray(profileData.skills) ? profileData.skills : [],
        experience_years: profileData.experience_years || 0,
        availability_status: profileData.availability_status || 'Available',
        portfolio_links: Array.isArray(profileData.portfolio_links) ? profileData.portfolio_links : [],
        verify_doc: null, // Don't set the file object, just track the URL
      });
      
      setVerifyStatus(response.data.verify_status || 'Pending');
      setDenialReason(response.data.denial_reason || '');
      setCurrentVerifyDoc(verify_doc_url); // Set current document URL
      setProfileExists(true);
    } catch (error) {
      console.error('Error fetching profile:', error);
      if (error.response?.status !== 404) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.response?.data?.error || 'Failed to fetch profile data',
          confirmButtonColor: '#dc3545',
        });
      } else {
        setProfileExists(false);
      }
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [profileUpdated]);

  const validateField = (name, value) => {
    let error = "";
    let isValid = false;

    switch (name) {
      case "bio":
        if (value.trim().length < 10) {
          error = 'Bio must be at least 10 characters long';
        } else if (value.trim().length > 500) {
          error = 'Bio cannot exceed 500 characters';
        } else if (!isNaN(value.trim())) {
          error = 'Bio cannot be just a number';
        } else {
          isValid = true;
        }
        break;
      
      case "skills":
        const skillsArray = Array.isArray(value) ? value : value.split(',').map(s => s.trim()).filter(s => s);
        if (skillsArray.length === 0) {
          error = 'At least one skill is required';
        } else if (skillsArray.length > 10) {
          error = 'Cannot add more than 10 skills';
        } else {
          const skillRegex = /^[a-zA-Z0-9\s\-_,#+.]{1,50}$/; // Updated max length to 50
          const invalidSkills = skillsArray.filter(skill => {
            if (!isNaN(skill)) return true;
            return !skillRegex.test(skill);
          });
          if (invalidSkills.length > 0) {
            error = 'Each skill must be a valid word (not a number) and match the allowed characters';
          } else {
            isValid = true;
          }
        }
        break;
      
      case "experience_years":
        if (isNaN(value) || value < 0) {
          error = 'Experience must be a valid number (>= 0)';
        } else if (value > 100) {
          error = 'Experience cannot exceed 100 years';
        } else {
          isValid = true;
        }
        break;
      
      case "portfolio_links":
        const linksArray = Array.isArray(value) ? value : value.split(',').map(l => l.trim()).filter(l => l);
        if (linksArray.length > 5) {
          error = 'Cannot add more than 5 portfolio links';
        } else if (linksArray.length > 0) {
          const urlRegex = /^(https?:\/\/)?([\w.-]+)\.([a-z]{2,6})([\/\w.-]*)*\/?$/;
          const invalidLinks = linksArray.filter(link => link && !urlRegex.test(link));
          if (invalidLinks.length > 0) {
            error = 'One or more portfolio links are not valid URLs';
          } else {
            isValid = true;
          }
        } else {
          isValid = true; // Portfolio links are optional
        }
        break;
      
      default:
        break;
    }

    return { error, isValid };
  };

  const validateForm = () => {
    let newErrors = {};
    let newValidFields = {};

    // Validate all fields
    Object.keys(formData).forEach(key => {
      if (key !== "verify_doc" && key !== "availability_status") {
        const { error, isValid } = validateField(key, formData[key]);
        if (error) {
          newErrors[key] = error;
        }
        newValidFields[key] = isValid;
      }
    });

    // Validate availability status
    const validStatuses = ['Available', 'Busy', 'Not Taking Work'];
    if (!validStatuses.includes(formData.availability_status)) {
      newErrors.availability_status = 'Invalid availability status';
    } else {
      newValidFields.availability_status = true;
    }

    // Validate verify doc - Updated validation logic
    if (!profileExists && !formData.verify_doc && !currentVerifyDoc) {
      newErrors.verify_doc = 'Verification document is required for new profiles';
    } else if (formData.verify_doc) {
      const allowedTypes = [
        'application/pdf', 
        'image/png', 
        'image/jpeg', 
        'image/jpg', 
        'image/gif',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      if (!allowedTypes.includes(formData.verify_doc.type)) {
        newErrors.verify_doc = 'Document must be a PDF, DOC, or image file';
      } else if (formData.verify_doc.size > 5 * 1024 * 1024) {
        newErrors.verify_doc = 'Document must be less than 5MB';
      } else {
        newValidFields.verify_doc = true;
      }
    }

    setErrors(newErrors);
    setValidFields(newValidFields);
    
    if (Object.keys(newErrors).length > 0) {
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: Object.values(newErrors)[0],
        confirmButtonColor: '#dc3545',
      });
    }
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    let newValue = value;

    if (name === 'verify_doc') {
      newValue = files[0];
      setFormData({ ...formData, verify_doc: newValue });
      // Clear current document URL when new file is selected
      if (newValue) {
        setCurrentVerifyDoc(null);
      }
    } else if (name === 'skills' || name === 'portfolio_links') {
      const arrayValue = value.split(',').map(item => item.trim()).filter(item => item);
      newValue = arrayValue;
      setFormData({ ...formData, [name]: arrayValue });
    } else {
      if (name === 'experience_years') {
        newValue = parseInt(value) || 0;
      }
      setFormData({ ...formData, [name]: newValue });
    }

    // Real-time validation
    if (name !== 'verify_doc') {
      const { error, isValid } = validateField(name, newValue);
      setErrors(prev => ({ ...prev, [name]: error }));
      setValidFields(prev => ({ ...prev, [name]: isValid }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);

    // Create FormData for file upload support
    const data = new FormData();
    
    // Add form fields
    for (const key in formData) {
      if ((key === 'skills' || key === 'portfolio_links') && Array.isArray(formData[key])) {
        data.append(key, JSON.stringify(formData[key]));
      } else if (key === 'verify_doc' && formData.verify_doc) {
        data.append(key, formData.verify_doc);
      } else if (key !== 'verify_doc') {
        data.append(key, formData[key]);
      }
    }

    console.log('Submitting profile data:', {
      profileExists,
      hasNewFile: !!formData.verify_doc,
      hasCurrentDoc: !!currentVerifyDoc,
      formData: Object.fromEntries(data.entries())
    });

    try {
      let response;
      if (profileExists) {
        response = await axios.patch(`${baseUrl}/api/profile/`, data, {
          withCredentials: true,
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        response = await axios.post(`${baseUrl}/api/profile/`, data, {
          withCredentials: true,
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      
      console.log('Profile save response:', response.data);
      
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: response.data.message || 'Profile saved successfully',
        confirmButtonColor: '#28a745',
        timer: 2000,
        timerProgressBar: true,
      });
      setProfileUpdated(prev => !prev);
    } catch (err) {
      console.error('Error submitting profile:', err.response?.data);
      
      let errorMessage = 'Failed to save profile';
      if (err.response?.data?.verify_doc) {
        errorMessage = `Document upload error: ${err.response.data.verify_doc[0]}`;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      }
      
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
        confirmButtonColor: '#dc3545',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerificationRequest = async () => {
    if (!profileExists || (!formData.verify_doc && !currentVerifyDoc && verifyStatus === 'Not Verified')) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Please save your profile with a verification document first',
        confirmButtonColor: '#dc3545',
      });
      return;
    }

    setIsVerifying(true);

    try {
      const response = await axios.post(
        `${baseUrl}/api/request-verification/`,
        {},
        { withCredentials: true }
      );
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: response.data.message || 'Verification request sent to admin successfully',
        confirmButtonColor: '#28a745',
        timer: 2000,
        timerProgressBar: true,
      });
      setProfileUpdated(prev => !prev);
    } catch (err) {
      console.error('Verification request error:', err.response?.data);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.response?.data?.error || 'Failed to send verification request',
        confirmButtonColor: '#dc3545',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const getFieldClass = (fieldName) => {
    let classes = "form-group";
    if (validFields[fieldName]) {
      classes += " success";
    }
    return classes;
  };

  const renderValidationIcon = (fieldName) => {
    if (validFields[fieldName]) {
      return <span className="validation-icon success">✅</span>;
    }
    if (errors[fieldName]) {
      return <span className="validation-icon error">❌</span>;
    }
    return null;
  };

  const getCharCount = (text, limit) => {
    const count = text.length;
    const percentage = (count / limit) * 100;
    let className = 'char-counter';
    if (percentage >= 90) className += ' error';
    else if (percentage >= 75) className += ' warning';
    
    return (
      <div className={className}>
        {count}/{limit} characters
      </div>
    );
  };

  const renderSkillTags = () => {
    if (formData.skills.length === 0) return null;
    
    return (
      <div className="skill-tags">
        {formData.skills.map((skill, index) => (
          <span key={index} className="skill-tag">
            {skill}
          </span>
        ))}
      </div>
    );
  };

  const renderPortfolioLinks = () => {
    if (formData.portfolio_links.length === 0) return null;
    
    return (
      <div className="portfolio-links">
        {formData.portfolio_links.map((link, index) => (
          <a 
            key={index} 
            href={link.startsWith('http') ? link : `https://${link}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="portfolio-link"
          >
            {link}
          </a>
        ))}
      </div>
    );
  };

  // NEW: Render current verification document
  const renderCurrentDocument = () => {
    if (!currentVerifyDoc) return null;

    const getFileNameFromUrl = (url) => {
      if (url.includes('cloudinary.com')) {
        const parts = url.split('/');
        const filename = parts[parts.length - 1];
        return decodeURIComponent(filename.split('?')[0]);
      }
      return 'Verification Document';
    };

    const getFileIcon = (url) => {
      const filename = getFileNameFromUrl(url).toLowerCase();
      if (filename.includes('.pdf')) return '📄';
      if (filename.includes('.doc')) return '📝';
      if (filename.includes('.jpg') || filename.includes('.jpeg') || filename.includes('.png') || filename.includes('.gif')) return '🖼️';
      return '📎';
    };

    return (
      <div className="current-document">
        <div className="document-info">
          <span className="document-icon">{getFileIcon(currentVerifyDoc)}</span>
          <div className="document-details">
            <div className="document-name">{getFileNameFromUrl(currentVerifyDoc)}</div>
            <div className="document-status">Current verification document</div>
          </div>
          <a 
            href={currentVerifyDoc} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="document-view-link"
            onClick={(e) => {
              e.stopPropagation();
              console.log('Opening verification document:', currentVerifyDoc);
            }}
          >
            View Document
          </a>
        </div>
      </div>
    );
  };

  return (
    <>
      <ProfessionalHeader />
      <div className="create-profile-container">
        <h2>
          {profileExists ? 'Edit Your Professional Profile' : 'Create Your Professional Profile'}
        </h2>
        
        {/* Verification Status Display */}
        {profileExists && (
          <div className="verification-status">
            <h3>
              Verification Status: 
              <span className={`status-${verifyStatus.toLowerCase().replace(' ', '-')}`}>
                {verifyStatus}
              </span>
            </h3>
            
            {verifyStatus === 'Not Verified' && denialReason && (
              <div className="denial-reason-box">
                <h4>Reason for Denial:</h4>
                <p>{denialReason}</p>
              </div>
            )}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="profile-form">
          {/* Basic Information Section */}
          <div className="form-section">
            <h4>📝 Basic Information</h4>
            
            <div className={getFieldClass("bio")}>
              <label htmlFor="bio">Bio</label>
              <textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                placeholder="Tell us about yourself, your expertise, and what makes you unique..."
                maxLength={500}
              />
              {getCharCount(formData.bio, 500)}
              {renderValidationIcon("bio")}
              {errors.bio && <div className="error-message">{errors.bio}</div>}
            </div>

            <div className={getFieldClass("experience_years")}>
              <label htmlFor="experience_years">Years of Experience</label>
              <input
                type="number"
                id="experience_years"
                name="experience_years"
                value={formData.experience_years}
                onChange={handleChange}
                min="0"
                max="100"
                placeholder="Enter your years of experience"
              />
              {renderValidationIcon("experience_years")}
              {errors.experience_years && <div className="error-message">{errors.experience_years}</div>}
            </div>

            <div className={getFieldClass("availability_status")}>
              <label htmlFor="availability_status">Availability Status</label>
              <select
                id="availability_status"
                name="availability_status"
                value={formData.availability_status}
                onChange={handleChange}
              >
                <option value="Available">Available for work</option>
                <option value="Busy">Currently busy</option>
                <option value="Not Taking Work">Not taking new work</option>
              </select>
              {renderValidationIcon("availability_status")}
              {errors.availability_status && <div className="error-message">{errors.availability_status}</div>}
            </div>
          </div>

          {/* Skills Section */}
          <div className="form-section">
            <h4>🛠️ Skills & Expertise</h4>
            
            <div className={getFieldClass("skills")}>
              <label htmlFor="skills">Skills (comma-separated)</label>
              <input
                type="text"
                id="skills"
                name="skills"
                value={formData.skills.join(', ')}
                onChange={handleChange}
                placeholder="e.g., Python, Django, React, JavaScript, Project Management"
              />
              {renderValidationIcon("skills")}
              {errors.skills && <div className="error-message">{errors.skills}</div>}
              {renderSkillTags()}
            </div>
          </div>

          {/* Portfolio Section */}
          <div className="form-section">
            <h4>🔗 Portfolio & Links</h4>
            
            <div className={getFieldClass("portfolio_links")}>
              <label htmlFor="portfolio_links">Portfolio Links (comma-separated)</label>
              <input
                type="text"
                id="portfolio_links"
                name="portfolio_links"
                value={formData.portfolio_links.join(', ')}
                onChange={handleChange}
                placeholder="e.g., https://github.com/username, https://portfolio.com, https://linkedin.com/in/username"
              />
              {renderValidationIcon("portfolio_links")}
              {errors.portfolio_links && <div className="error-message">{errors.portfolio_links}</div>}
              {renderPortfolioLinks()}
            </div>
          </div>

          {/* Verification Section - UPDATED */}
          {verifyStatus !== 'Verified' && (
            <div className="form-section">
              <h4>📄 Verification Document</h4>
              
              {/* Show current document if exists */}
              {currentVerifyDoc && !formData.verify_doc && (
                <div className="current-document-section">
                  <label>Current Verification Document</label>
                  {renderCurrentDocument()}
                  <p className="document-help">
                    You can upload a new document to replace the current one.
                  </p>
                </div>
              )}
              
              <div className={getFieldClass("verify_doc")}>
                <label htmlFor="verify_doc">
                  {currentVerifyDoc && !formData.verify_doc ? 'Replace Verification Document' : 'Upload Verification Document'}
                  <small style={{ fontWeight: 400, textTransform: 'none' }}>
                    (PDF, DOC, PNG, or JPEG - Max 5MB)
                  </small>
                </label>
                <input 
                  type="file" 
                  id="verify_doc" 
                  name="verify_doc" 
                  onChange={handleChange} 
                  accept=".pdf,.png,.jpeg,.jpg,.doc,.docx" 
                />
                {renderValidationIcon("verify_doc")}
                {errors.verify_doc && <div className="error-message">{errors.verify_doc}</div>}
                {formData.verify_doc && (
                  <div style={{ marginTop: '8px', fontSize: '14px', color: '#059669' }}>
                    ✅ New file selected: {formData.verify_doc.name}
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                      This will replace your current verification document when you save.
                    </div>
                  </div>
                )}
                {!formData.verify_doc && !currentVerifyDoc && (
                  <div className="document-help">
                    <span className="help-icon">💡</span>
                    <span>Upload ID card, degree certificate, or professional license for verification. Files are stored securely in Cloudinary.</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <button type="submit" className={`submit-btn ${isLoading ? 'loading' : ''}`} disabled={isLoading}>
            {isLoading ? 'Saving...' : (profileExists ? 'Update Profile' : 'Save Profile')}
          </button>
        </form>

        {/* Verification Request Section */}
        {profileExists && verifyStatus !== 'Verified' && verifyStatus !== 'Pending' && (
          <div className="verification-request">
            <h3>Request Verification</h3>
            <p>Current Status: <strong>{verifyStatus}</strong></p>
            <p>Submit your profile for admin review to get verified and access all features.</p>
            <button 
              onClick={handleVerificationRequest} 
              className={`verify-btn ${isVerifying ? 'loading' : ''}`}
              disabled={isVerifying}
            >
              {isVerifying ? 'Sending...' : 'Send Verification Request'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

export default CreateProfessionalProfile;