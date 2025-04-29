import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import './CreateProfessionalProfile.css';
import ProfessionalHeader from '../components/ProfessionalDashboard/ProfessionalDashboardHeader';

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
  const [errors, setErrors] = useState({});
  const [profileUpdated, setProfileUpdated] = useState(false); // Trigger re-fetch
  const navigate = useNavigate();

  const fetchProfile = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/profile/', {
        withCredentials: true,
      });
      const { user, ...profileData } = response.data; // Exclude user field
      setFormData({
        bio: profileData.bio || '',
        skills: Array.isArray(profileData.skills) ? profileData.skills : [],
        experience_years: profileData.experience_years || 0,
        availability_status: profileData.availability_status || 'Available',
        portfolio_links: Array.isArray(profileData.portfolio_links) ? profileData.portfolio_links : [],
        verify_doc: null,
      });
      setVerifyStatus(response.data.verify_status || 'Pending');
      setDenialReason(response.data.denial_reason || '');
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
        setProfileExists(false); // No profile exists yet
      }
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [profileUpdated]);

  const validateForm = () => {
    let newErrors = {};

    // Bio: 10-500 characters
    if (formData.bio.trim().length < 10) {
        newErrors.bio = 'Bio must be at least 10 characters long';
      } else if (formData.bio.trim().length > 500) {
        newErrors.bio = 'Bio cannot exceed 500 characters';
      } else if (!isNaN(formData.bio.trim())) {
        newErrors.bio = 'Bio cannot be just a number';
      }
    // Skills: 1-10 skills, each <= 50 characters, alphanumeric with spaces/hyphens
    if (formData.skills.length === 0 || formData.skills[0] === '') {
        newErrors.skills = 'At least one skill is required';
      } else if (formData.skills.length > 10) {
        newErrors.skills = 'Cannot add more than 10 skills';
      } else {
        const skillRegex = /^[a-zA-Z0-9\s\-_,#+.]{1,100}$/;
        const invalidSkills = formData.skills.filter(skill => {
          // Check if it's a number (purely numeric)
          if (!isNaN(skill)) {
            return true;
          }
          // Check if it fails the regex
          return !skillRegex.test(skill);
        });
      
        if (invalidSkills.length > 0) {
          newErrors.skills = 'Each skill must be a valid word (not a number) and match the allowed characters';
        }
      }
      
  

    // Experience Years: 0-100
    if (isNaN(formData.experience_years) || formData.experience_years < 0) {
      newErrors.experience_years = 'Experience must be a valid number (>= 0)';
    } else if (formData.experience_years > 100) {
      newErrors.experience_years = 'Experience cannot exceed 100 years';
    }

    // Availability Status: Valid choices
    const validStatuses = ['Available', 'Busy', 'Not Taking Work'];
    if (!validStatuses.includes(formData.availability_status)) {
      newErrors.availability_status = 'Invalid availability status';
    }

    // Portfolio Links: Max 5, valid URLs
    if (formData.portfolio_links.length > 5) {
      newErrors.portfolio_links = 'Cannot add more than 5 portfolio links';
    } else if (formData.portfolio_links.length > 0) {
      const urlRegex = /^(https?:\/\/)?([\w.-]+)\.([a-z]{2,6})([\/\w.-]*)*\/?$/;
      const invalidLinks = formData.portfolio_links.filter(link => link && !urlRegex.test(link));
      if (invalidLinks.length > 0) {
        newErrors.portfolio_links = 'One or more portfolio links are not valid URLs';
      }
    }

    // Verify Doc: Required for new profiles, PDF/PNG/JPEG, <= 5MB
    if (!profileExists && !formData.verify_doc) {
      newErrors.verify_doc = 'Verification document is required for new profiles';
    } else if (formData.verify_doc) {
      const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg'];
      if (!allowedTypes.includes(formData.verify_doc.type)) {
        newErrors.verify_doc = 'Document must be a PDF, PNG, or JPEG';
      } else if (formData.verify_doc.size > 5 * 1024 * 1024) {
        newErrors.verify_doc = 'Document must be less than 5MB';
      }
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: Object.values(newErrors)[0], // Show first error
        confirmButtonColor: '#dc3545',
      });
    }
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'verify_doc') {
      setFormData({ ...formData, verify_doc: files[0] });
    } else if (name === 'skills' || name === 'portfolio_links') {
      setFormData({ ...formData, [name]: value.split(',').map(item => item.trim()).filter(item => item) });
    } else {
      setFormData({
        ...formData,
        [name]: name === 'experience_years' ? parseInt(value) || 0 : value,
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const data = new FormData();
    for (const key in formData) {
      if ((key === 'skills' || key === 'portfolio_links') && Array.isArray(formData[key])) {
        data.append(key, JSON.stringify(formData[key]));
      } else if (key === 'verify_doc' && formData.verify_doc) {
        data.append(key, formData.verify_doc);
      } else if (key !== 'verify_doc') {
        data.append(key, formData[key]);
      }
    }

    try {
      let response;
      if (profileExists) {
        response = await axios.patch('http://localhost:8000/api/profile/', data, {
          withCredentials: true,
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        response = await axios.post('http://localhost:8000/api/profile/', data, {
          withCredentials: true,
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      console.log('PATCH/POST response:', response.data);
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: response.data.message || 'Profile saved successfully',
        confirmButtonColor: '#28a745',
        timer: 2000,
        timerProgressBar: true,
      });
      setProfileUpdated(prev => !prev); // Trigger re-fetch
    } catch (err) {
      console.error('Error submitting profile:', {
        status: err.response?.status,
        data: err.response?.data,
      });
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.response?.data?.error || 'Failed to save profile',
        confirmButtonColor: '#dc3545',
      });
    }
  };

  const handleVerificationRequest = async () => {
    if (!profileExists || (!formData.verify_doc && !verifyStatus === 'Pending')) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Please save your profile with a verification document first',
        confirmButtonColor: '#dc3545',
      });
      return;
    }

    try {
      const response = await axios.post(
        'http://localhost:8000/api/request-verification/',
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
    }
  };

  return (
    <>
      <ProfessionalHeader />
      <div className="create-profile-container">
        <h2 style={{color:'white'}}>{profileExists ? 'Edit Your Professional Profile' : 'Create Your Professional Profile'}</h2>
        
        {/* Verification Status Display with Denial Reason */}
        {profileExists && (
          <div className="verification-status">
            <h3 style={{color:'white'}}>Verification Status: <span className={`status-${verifyStatus.toLowerCase().replace(' ', '-')}`}>{verifyStatus}</span></h3>
            
            {verifyStatus === 'Not Verified' && denialReason && (
              <div className="denial-reason-box">
                <h4>Reason for Denial:</h4>
                <p>{denialReason}</p>
              </div>
            )}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="profile-form">
          <div className="form-group">
            <label htmlFor="bio" style={{color:'white'}}>Bio</label>
            <textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              placeholder="Tell us about yourself"
            />
            {errors.bio && <div className="error-message">{errors.bio}</div>}
          </div>
          <div className="form-group">
            <label htmlFor="skills" style={{color:'white'}}>Skills </label>
            <input
              type="text"
              id="skills"
              name="skills"
              value={formData.skills.join(', ')}
              onChange={handleChange}
              placeholder="e.g., Python, Django"
            />
            {errors.skills && <div className="error-message">{errors.skills}</div>}
          </div>
          <div className="form-group">
            <label htmlFor="experience_years" style={{color:'white'}}>Years of Experience</label>
            <input
              type="number"
              id="experience_years"
              name="experience_years"
              value={formData.experience_years}
              onChange={handleChange}
              min="0"
              max="100"
            />
            {errors.experience_years && <div className="error-message">{errors.experience_years}</div>}
          </div>
          <div className="form-group">
            <label htmlFor="availability_status" style={{color:'white'}}>Availability</label>
            <select
              id="availability_status"
              name="availability_status"
              value={formData.availability_status}
              onChange={handleChange}
            >
              <option value="Available">Available</option>
              <option value="Busy">Busy</option>
              <option value="Not Taking Work">Not Taking Work</option>
            </select>
            {errors.availability_status && <div className="error-message">{errors.availability_status}</div>}
          </div>
          <div className="form-group">
            <label htmlFor="portfolio_links" style={{color:'white'}}>Portfolio Links (comma-separated)</label>
            <input
              type="text"
              id="portfolio_links"
              name="portfolio_links"
              value={formData.portfolio_links.join(', ')}
              onChange={handleChange}
              placeholder="e.g., https://github.com/user"
            />
            {errors.portfolio_links && <div className="error-message">{errors.portfolio_links}</div>}
          </div>
          {verifyStatus !== 'Verified' && (
            <div className="form-group">
              <label htmlFor="verify_doc" style={{color:'white'}}>Verification Document</label>
              <input type="file" id="verify_doc" name="verify_doc" onChange={handleChange} accept=".pdf,.png,.jpeg" />
              {errors.verify_doc && <div className="error-message">{errors.verify_doc}</div>}
            </div>
          )}
          <button type="submit" className="submit-btn">
            {profileExists ? 'Update Profile' : 'Save Profile'}
          </button>
        </form>

        {profileExists && (
          <div className="verification-request">
            <h3>Request Verification</h3>
            <p>Verification Status: {verifyStatus}</p>
            {verifyStatus !== 'Verified' && verifyStatus !== 'Pending' && (
              <button onClick={handleVerificationRequest} className="verify-btn">
                Send Verification Request to Admin
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export default CreateProfessionalProfile;