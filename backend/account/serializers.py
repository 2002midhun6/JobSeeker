# accounts/serializers.py
from rest_framework import serializers
from .models import CustomUser,ProfessionalProfile,JobApplication
from .models import Job
from backend.utils import send_otp_email
import random
from django.utils.timezone import now
from django.core.mail import send_mail
from django.conf import settings
from .models import Payment
from datetime import date
from .models import Complaint,Conversation,Message
from rest_framework import serializers
from .models import Message
from .cloudinary_utils import CloudinaryManager
from .models import Notification

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ['id', 'notification_type', 'title', 'message', 'data', 'is_read', 'created_at']
        read_only_fields = ['id', 'notification_type', 'title', 'message', 'data', 'created_at']
class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()
    sender_role = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Message
        fields = ['id', 'sender', 'sender_name', 'sender_role', 'content', 'file_url', 'file_type', 'created_at', 'is_read']
    
    def get_sender_name(self, obj):
        return obj.sender.name if hasattr(obj.sender, 'name') else str(obj.sender)
    
    def get_sender_role(self, obj):
        return obj.sender.role if hasattr(obj.sender, 'role') else 'unknown'
    
    def get_file_url(self, obj):
        if obj.file_absolute_url:
            return obj.file_absolute_url
        elif obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None

class ConversationSerializer(serializers.ModelSerializer):
    messages = MessageSerializer(many=True, read_only=True)
    job_title = serializers.CharField(source='job.title', read_only=True)
    client_id = serializers.IntegerField(source='job.client_id.id', read_only=True, allow_null=True)
    professional_id = serializers.IntegerField(source='job.professional_id.id', read_only=True, allow_null=True)

    class Meta:
        model = Conversation
        fields = ['id', 'job', 'job_title', 'client_id', 'professional_id', 'messages', 'created_at']

class ComplaintSerializer(serializers.ModelSerializer):
    user_email = serializers.SerializerMethodField()
    user_role = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
    responded_by_name = serializers.SerializerMethodField()
    can_mark_resolved = serializers.SerializerMethodField()
    can_request_further_action = serializers.SerializerMethodField()  # New field
    
    class Meta:
        model = Complaint
        fields = [
            'id', 'user', 'user_email', 'user_role', 'description',
            'admin_response', 'responded_by', 'responded_by_name', 'response_date',
            'client_feedback', 'feedback_date', 'resolution_rating',
            'status', 'status_display', 'can_mark_resolved', 'can_request_further_action',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'user', 'user_email', 'user_role', 'created_at', 
            'updated_at', 'status_display', 'responded_by', 'response_date',
            'responded_by_name', 'can_mark_resolved', 'can_request_further_action',
            'feedback_date'
        ]
    
    def get_user_email(self, obj):
        return obj.user.email if obj.user else None
    
    def get_user_role(self, obj):
        return obj.user.role if obj.user else None
    
    def get_status_display(self, obj):
        return obj.get_status_display()
    
    def get_responded_by_name(self, obj):
        return obj.responded_by.name if obj.responded_by else None
    
    def get_can_mark_resolved(self, obj):
        return obj.status == 'AWAITING_USER_RESPONSE' and bool(obj.admin_response)
    
    def get_can_request_further_action(self, obj):
        return obj.status == 'AWAITING_USER_RESPONSE' and bool(obj.admin_response)
    
    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['user'] = user
        return super().create(validated_data)

# New serializer for client feedback
class ClientFeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = Complaint
        fields = ['client_feedback', 'resolution_rating']
        
    def validate_client_feedback(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Feedback cannot be empty")
        return value
    
    def validate_resolution_rating(self, value):
        if value is not None and (value < 1 or value > 5):
            raise serializers.ValidationError("Rating must be between 1 and 5")
        return value
class AdminResponseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Complaint
        fields = ['admin_response']
        
    def validate_admin_response(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Response cannot be empty")
        return value

class PaymentSerializer(serializers.ModelSerializer):
    job_application = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = ['razorpay_order_id', 'amount', 'payment_type', 'job_application']

    def get_job_application(self, obj):
        try:
            if obj.job_application:
                return {
                    'id': obj.job_application.application_id,
                    'job_title': obj.job_application.job_id.title if obj.job_application.job_id else 'Unknown Job',
                    'professional_name': obj.job_application.professional_id.name if obj.job_application.professional_id else 'Unknown Professional',
                    'client_name': obj.job_application.job_id.client_id.name if obj.job_application.job_id.client_id else 'Unknown Client',
                    'status': obj.job_application.status,
                }
            return {
                'id': None,
                'job_title': 'Unknown Job',
                'professional_name': 'Unknown Professional',
                'client_name': 'Unknown Client',
                'status': 'N/A',
            }
        except Exception as e:
            print(f"Error in PaymentSerializer.get_job_application: {str(e)}")
            return {
                'id': None,
                'job_title': 'Unknown Job',
                'professional_name': 'Unknown Professional',
                'client_name': 'Unknown Client',
                'status': 'N/A',
            }

    def to_representation(self, instance):
        try:
            representation = super().to_representation(instance)
            
            # Always convert amount to paisa for Razorpay
            representation['amount'] = int(float(instance.amount) * 100) if instance.amount else 0
            representation['order_id'] = instance.razorpay_order_id
            representation['key'] = settings.RAZORPAY_KEY_ID
            representation['name'] = 'Your Company Name'
            representation['currency'] = 'INR'
            
            if instance.payment_type == 'initial':
                payment_desc = 'Initial Payment'
            else:
                payment_desc = 'Remaining Payment'
                
            # Use nested job_application.job_title for description
            job_title = representation.get('job_application', {}).get('job_title', 'Unknown Job')
            representation['description'] = f'{payment_desc} for Job: {job_title}'
            
            # Debug log
            print(f"PaymentSerializer debug: Original amount={instance.amount}, Converted amount={representation['amount']}")
            
            return representation
        except Exception as e:
            print(f"Error in PaymentSerializer.to_representation: {str(e)}")
            return super().to_representation(instance)
class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    
    class Meta:
        model = CustomUser
        fields = ['email', 'name', 'role', 'password']
        
    def create(self, validated_data):
        user = CustomUser.objects.create_user(
            email=validated_data['email'],
            name=validated_data['name'],
            role=validated_data['role'],
            password=validated_data['password']
        )
        return user

class UserLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()


class OTPVerificationSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=6)

    def validate(self, data):
        try:
            user = CustomUser.objects.get(email=data['email'])
            if user.otp != data['otp']:
                raise serializers.ValidationError("Invalid OTP.")
            user.is_active = True  # Activate user
            user.is_verified = True
            user.otp = None  # Remove OTP after verification
            user.save()
        except CustomUser.DoesNotExist:
            raise serializers.ValidationError("User not found.")
        return data
class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate(self, data):
        try:
            user = CustomUser.objects.get(email=data['email'])
            # Generate a new OTP for password reset
            user.otp = str(random.randint(100000, 999999))
            user.otp_created_at = now()
            user.save()
            send_otp_email(user)  # Reuse the existing send_otp_email function
        except CustomUser.DoesNotExist:
            raise serializers.ValidationError("No account found with this email.")
        return data

# Reset Password Serializer
class ResetPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=6)
    new_password = serializers.CharField(write_only=True)

    def validate(self, data):
        try:
            user = CustomUser.objects.get(email=data['email'])
            if not user.otp:
                raise serializers.ValidationError("No OTP requested for this account.")
            if user.otp != data['otp']:
                raise serializers.ValidationError("Invalid OTP.")
            if user.otp_created_at and (now() - user.otp_created_at).total_seconds() > 600:
                raise serializers.ValidationError("OTP has expired.")
        except CustomUser.DoesNotExist:
            raise serializers.ValidationError("User not found.")
        return data
    def save(self):
        user = CustomUser.objects.get(email=self.validated_data['email'])
        user.set_password(self.validated_data['new_password'])
        user.otp = None
        user.otp_created_at = None
        user.save()
        return user

class UserBlockSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['is_blocked']
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ['id', 'email', 'name', 'role', 'is_blocked', 'is_verified']
class ProfessionalProfileSerializer(serializers.ModelSerializer):
    verify_doc_url = serializers.SerializerMethodField()
    verify_doc_download_url = serializers.SerializerMethodField()
    verify_doc_filename = serializers.SerializerMethodField()
    user_name = serializers.CharField(source='user.name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    
    class Meta:
        model = ProfessionalProfile
        fields = [
            'user', 'user_name', 'user_email', 'bio', 'skills', 'experience_years',
            'availability_status', 'portfolio_links', 'verify_doc', 'verify_status',
            'avg_rating', 'denial_reason', 'verify_doc_url', 'verify_doc_download_url',
            'verify_doc_filename'
        ]
        read_only_fields = ['user', 'user_name', 'user_email', 'avg_rating']

    def get_verify_doc_url(self, obj):
        """Get view URL for verification document"""
        if not obj.verify_doc:
            return None
        return CloudinaryManager.get_file_url(obj.verify_doc)

    def get_verify_doc_download_url(self, obj):
        """Get download URL for verification document"""
        if not obj.verify_doc:
            return None
        return CloudinaryManager.get_download_url(obj.verify_doc)

    def get_verify_doc_filename(self, obj):
        """Get filename for verification document"""
        if not obj.verify_doc:
            return None
        return CloudinaryManager.extract_filename_from_public_id(obj.verify_doc)


# serializers.py - Update these serializer methods

# serializers.py - Complete JobSerializer with all required methods

# serializers.py - Quick fix without CloudinaryManager dependencies

# accounts/serializers.py - Update your JobSerializer

class JobSerializer(serializers.ModelSerializer):
    attachment_url = serializers.SerializerMethodField()
    attachment_download_url = serializers.SerializerMethodField()
    attachment_filename = serializers.SerializerMethodField()
    client_name = serializers.CharField(source='client_id.name', read_only=True)
    professional_name = serializers.CharField(source='professional_id.name', read_only=True)
    applicants_count = serializers.IntegerField(read_only=True)  # Add this field
    
    class Meta:
        model = Job
        fields = [
            'job_id', 'title', 'description', 'budget', 'deadline', 'status',
            'created_at', 'advance_payment', 'client_name', 'professional_name',
            'attachment', 'attachment_url', 'attachment_download_url', 'attachment_filename',
            'rating', 'review', 'applicants_count'  # Include applicants_count
        ]
        read_only_fields = ['job_id', 'created_at', 'client_name', 'professional_name', 'applicants_count']

    def get_attachment_url(self, obj):
        """Get view URL for attachment"""
        if not obj.attachment:
            return None
        return CloudinaryManager.get_file_url(obj.attachment)

    def get_attachment_download_url(self, obj):
        """Get download URL for attachment"""
        if not obj.attachment:
            return None
        return CloudinaryManager.get_download_url(obj.attachment)

    def get_attachment_filename(self, obj):
        """Get filename for attachment"""
        if not obj.attachment:
            return None
        # If you store original filename separately, use it; otherwise extract from public_id
        return CloudinaryManager.extract_filename_from_public_id(obj.attachment)
class JobApplicationSerializer(serializers.ModelSerializer):
    job_title = serializers.CharField(source='job_id.title', read_only=True)
    job_budget = serializers.DecimalField(source='job_id.budget', max_digits=10, decimal_places=2, read_only=True)
    job_deadline = serializers.DateField(source='job_id.deadline', read_only=True)
    job_description = serializers.CharField(source='job_id.description', read_only=True)
    client_name = serializers.CharField(source='job_id.client_id.name', read_only=True)
    client_email = serializers.CharField(source='job_id.client_id.email', read_only=True)
    professional_name = serializers.CharField(source='professional_id.name', read_only=True)
    professional_email = serializers.CharField(source='professional_id.email', read_only=True)
    
    # Add attachment fields
    job_attachment_url = serializers.SerializerMethodField()
    job_attachment_download_url = serializers.SerializerMethodField()
    job_attachment_filename = serializers.SerializerMethodField()
    
    # Professional profile fields
    professional_profile = serializers.SerializerMethodField()
    
    class Meta:
        model = JobApplication
        fields = [
            'application_id', 'job_id', 'professional_id', 'status', 'applied_at',
            'job_title', 'job_budget', 'job_deadline', 'job_description',
            'client_name', 'client_email', 'professional_name', 'professional_email',
            'job_attachment_url', 'job_attachment_download_url', 'job_attachment_filename',
            'professional_profile'
        ]
        read_only_fields = ['application_id', 'applied_at']

    def get_job_attachment_url(self, obj):
        """Get view URL for job attachment"""
        if not obj.job_id.attachment:
            return None
        return CloudinaryManager.get_file_url(obj.job_id.attachment)

    def get_job_attachment_download_url(self, obj):
        """Get download URL for job attachment"""
        if not obj.job_id.attachment:
            return None
        return CloudinaryManager.get_download_url(obj.job_id.attachment)

    def get_job_attachment_filename(self, obj):
        """Get filename for job attachment"""
        if not obj.job_id.attachment:
            return None
        return CloudinaryManager.extract_filename_from_public_id(obj.job_id.attachment)

    def get_professional_profile(self, obj):
        """Get professional profile data"""
        try:
            profile = ProfessionalProfile.objects.get(user=obj.professional_id)
            return {
                'experience_years': profile.experience_years,
                'avg_rating': profile.avg_rating,
                'verify_status': profile.verify_status,
                'availability_status': profile.availability_status,
                'skills': profile.skills,
                'bio': profile.bio
            }
        except ProfessionalProfile.DoesNotExist:
            return {
                'experience_years': 0,
                'avg_rating': 0,
                'verify_status': 'Not Verified',
                'availability_status': 'Unknown',
                'skills': [],
                'bio': ''
            }
