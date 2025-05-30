# cloudinary_utils.py - Complete working version with all methods

import cloudinary.uploader
import cloudinary.utils
import cloudinary.api
from cloudinary import CloudinaryImage
import re
import os

class CloudinaryManager:
    
    @staticmethod
    def sanitize_filename(filename):
        """Sanitize filename to be safe for Cloudinary public_id"""
        if not filename:
            return "file"
        
        # Extract name and extension
        name, ext = os.path.splitext(filename)
        
        # Remove or replace problematic characters in name
        sanitized_name = re.sub(r'[^\w\-_]', '_', name)
        
        # Remove multiple consecutive underscores
        sanitized_name = re.sub(r'_+', '_', sanitized_name)
        
        # Remove leading/trailing underscores
        sanitized_name = sanitized_name.strip('_')
        
        # Ensure it's not empty
        if not sanitized_name:
            sanitized_name = "file"
        
        # Return name with extension
        return f"{sanitized_name}{ext}" if ext else sanitized_name
    
    @staticmethod
    def validate_file_upload(file, max_size_mb=25, allowed_formats=None):
        """Validate file before upload"""
        if allowed_formats is None:
            allowed_formats = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'gif', 'zip', 'rar', 'txt']
        
        # Size validation
        max_size_bytes = max_size_mb * 1024 * 1024
        if file.size > max_size_bytes:
            return {
                'valid': False,
                'error': f'File size must be less than {max_size_mb}MB'
            }
        
        # Format validation
        file_extension = file.name.lower().split('.')[-1] if '.' in file.name else ''
        if file_extension not in allowed_formats:
            return {
                'valid': False,
                'error': f'File format not supported. Allowed formats: {", ".join(allowed_formats)}'
            }
        
        return {'valid': True, 'error': None}
    
    @staticmethod
    def upload_job_attachment(file, job_id, user_id, filename):
        """Upload job attachment to Cloudinary with proper naming"""
        try:
            # Sanitize the filename
            safe_filename = CloudinaryManager.sanitize_filename(filename)
            
            # Create a clean public_id
            public_id = f"job_{job_id}_client_{user_id}_{safe_filename}"
            
            print(f"Uploading job attachment with public_id: {public_id}")
            
            result = cloudinary.uploader.upload(
                file,
                folder="job_attachments",
                public_id=public_id,
                resource_type="raw",
                overwrite=True,
                tags=["job_attachment", f"job_{job_id}", f"client_{user_id}"]
            )
            
            print(f"Cloudinary upload successful: {result}")
            
            return {
                'success': True,
                'public_id': result['public_id'],
                'url': result['secure_url'],
                'original_filename': filename,
                'error': None
            }
            
        except Exception as e:
            print(f"Cloudinary upload error: {str(e)}")
            return {
                'success': False,
                'public_id': None,
                'url': None,
                'original_filename': filename,
                'error': str(e)
            }
    
    @staticmethod
    def upload_verification_document(file, user_id, filename):
        """Upload verification document to Cloudinary"""
        try:
            # Sanitize the filename
            safe_filename = CloudinaryManager.sanitize_filename(filename)
            
            # Create a clean public_id
            public_id = f"user_{user_id}_{safe_filename}"
            
            print(f"Uploading verification doc with public_id: {public_id}")
            
            result = cloudinary.uploader.upload(
                file,
                folder="verification_docs",
                public_id=public_id,
                resource_type="raw",
                overwrite=True,
                tags=["verification_doc", f"user_{user_id}"]
            )
            
            print(f"Verification doc upload successful: {result}")
            
            return {
                'success': True,
                'public_id': result['public_id'],
                'url': result['secure_url'],
                'original_filename': filename,
                'error': None
            }
            
        except Exception as e:
            print(f"Verification doc upload error: {str(e)}")
            return {
                'success': False,
                'public_id': None,
                'url': None,
                'original_filename': filename,
                'error': str(e)
            }
    
    @staticmethod
    def delete_file(public_id, resource_type='raw'):
        """Delete file from Cloudinary"""
        try:
            result = cloudinary.uploader.destroy(
                public_id,
                resource_type=resource_type
            )
            return {
                'success': True,
                'result': result
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    @staticmethod
    def get_file_url(public_id_or_url, resource_type='raw'):
        """Get proper URL from public_id or validate existing URL"""
        if not public_id_or_url:
            return None
            
        public_id_str = str(public_id_or_url)
        
        # If it's already a proper URL and working, return as is
        if public_id_str.startswith('http'):
            # Check if it's a working Cloudinary URL
            if 'res.cloudinary.com' in public_id_str and '/raw/upload/' in public_id_str:
                return public_id_str
            else:
                # It's a broken URL, try to extract public_id and rebuild
                print(f"Detected broken URL: {public_id_str}")
                return None  # Return None for broken URLs
        
        # Generate URL from public_id
        try:
            return cloudinary.utils.cloudinary_url(
                public_id_str,
                resource_type='raw'
            )[0]
        except Exception as e:
            print(f"Error generating URL from public_id {public_id_str}: {e}")
            return None
    
    @staticmethod
    def get_download_url(public_id_or_url, resource_type='raw'):
        """Get download URL with attachment flag"""
        if not public_id_or_url:
            return None
            
        public_id_str = str(public_id_or_url)
        
        # If it's already a proper URL and working, add attachment flag
        if public_id_str.startswith('http'):
            if 'res.cloudinary.com' in public_id_str and '/raw/upload/' in public_id_str:
                # It's a proper raw URL, add attachment flag if not present
                if 'fl_attachment' not in public_id_str:
                    return public_id_str.replace('/raw/upload/', '/raw/upload/fl_attachment/')
                return public_id_str
            else:
                # It's a broken URL
                print(f"Detected broken download URL: {public_id_str}")
                return None
        
        # Generate download URL from public_id
        try:
            return cloudinary.utils.cloudinary_url(
                public_id_str,
                resource_type='raw',
                flags='attachment'
            )[0]
        except Exception as e:
            print(f"Error generating download URL from public_id {public_id_str}: {e}")
            return None
    
    @staticmethod
    def extract_filename_from_public_id(public_id, original_filename=None):
        """Extract or generate filename from public_id"""
        if original_filename:
            return original_filename
            
        if not public_id:
            return "download"
            
        try:
            public_id_str = str(public_id)
            
            # If it's a URL, try to extract from it
            if public_id_str.startswith('http'):
                # Extract from URL path
                if '/job_attachments/' in public_id_str:
                    parts = public_id_str.split('/job_attachments/')
                    if len(parts) > 1:
                        filename_part = parts[1].split('?')[0]  # Remove query parameters
                        return filename_part.replace('%20', ' ')  # Decode spaces
                return "download"
            
            # If public_id contains a filename pattern
            if '/' in public_id_str:
                filename = public_id_str.split('/')[-1]
            else:
                filename = public_id_str
                
            # If it looks like our generated format, try to extract original name
            if '_client_' in filename or '_user_' in filename:
                parts = filename.split('_')
                if len(parts) > 3:
                    # Try to reconstruct original filename
                    filename = '_'.join(parts[3:])
                    
            return filename if filename else "download"
        except:
            return "download"