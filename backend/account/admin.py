# account/admin.py - Fixed admin with Cloudinary support

from django.contrib import admin
from django.utils.html import format_html
from .models import *

# Unregister any existing registrations first (prevents duplicate registration errors)
try:
    admin.site.unregister(CustomUser)
except admin.sites.NotRegistered:
    pass

try:
    admin.site.unregister(ProfessionalProfile)
except admin.sites.NotRegistered:
    pass

try:
    admin.site.unregister(Job)
except admin.sites.NotRegistered:
    pass

try:
    admin.site.unregister(JobApplication)
except admin.sites.NotRegistered:
    pass

try:
    admin.site.unregister(Payment)
except admin.sites.NotRegistered:
    pass

try:
    admin.site.unregister(PaymentRequest)
except admin.sites.NotRegistered:
    pass

try:
    admin.site.unregister(Complaint)
except admin.sites.NotRegistered:
    pass

try:
    admin.site.unregister(Conversation)
except admin.sites.NotRegistered:
    pass

try:
    admin.site.unregister(Message)
except admin.sites.NotRegistered:
    pass

try:
    admin.site.unregister(Notification)
except admin.sites.NotRegistered:
    pass

# Now register all models with clean slate
@admin.register(CustomUser)
class CustomUserAdmin(admin.ModelAdmin):
    list_display = ('email', 'name', 'role', 'is_verified', 'is_blocked', 'is_staff')
    list_filter = ('role', 'is_verified', 'is_blocked', 'is_staff')
    search_fields = ('email', 'name')
    readonly_fields = ('last_login', 'date_joined')

@admin.register(ProfessionalProfile)
class ProfessionalProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'verify_status', 'avg_rating', 'experience_years', 'availability_status', 'verify_doc_preview')
    list_filter = ('verify_status', 'availability_status', 'experience_years')
    search_fields = ('user__email', 'user__name', 'bio')
    readonly_fields = ('avg_rating', 'verify_doc_preview')
    
    fieldsets = (
        ('User Information', {
            'fields': ('user',)
        }),
        ('Profile Details', {
            'fields': ('bio', 'skills', 'experience_years', 'availability_status', 'portfolio_links')
        }),
        ('Verification', {
            'fields': ('verify_doc', 'verify_doc_preview', 'verify_status', 'denial_reason')
        }),
        ('Rating', {
            'fields': ('avg_rating',)
        }),
    )
    
    def verify_doc_preview(self, obj):
        """Display verification document preview"""
        if obj.verify_doc:
            return format_html(
                '<a href="{}" target="_blank">📄 View Document</a>',
                obj.verify_doc.url
            )
        return "No document uploaded"
    verify_doc_preview.short_description = "Document Preview"

@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    list_display = ('job_id', 'title', 'client_id', 'budget', 'status', 'deadline', 'created_at', 'attachment_preview')
    list_filter = ('status', 'created_at', 'deadline')
    search_fields = ('title', 'description', 'client_id__email', 'client_id__name')
    readonly_fields = ('job_id', 'created_at', 'attachment_preview', 'applicants_count')
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('job_id', 'title', 'description', 'client_id', 'professional_id')
        }),
        ('Financial Details', {
            'fields': ('budget', 'advance_payment')
        }),
        ('Timeline', {
            'fields': ('deadline', 'created_at')
        }),
        ('Status & Files', {
            'fields': ('status', 'attachment', 'attachment_preview')
        }),
        ('Feedback', {
            'fields': ('rating', 'review')
        }),
        ('Statistics', {
            'fields': ('applicants_count',)
        }),
    )
    
    def attachment_preview(self, obj):
        """Display job attachment preview"""
        if obj.attachment:
            return format_html(
                '<a href="{}" target="_blank">📎 View Attachment</a>',
                obj.attachment.url
            )
        return "No attachment"
    attachment_preview.short_description = "Attachment Preview"
    
    def applicants_count(self, obj):
        """Display number of applicants"""
        return obj.applications.count()
    applicants_count.short_description = "Number of Applicants"

@admin.register(JobApplication)
class JobApplicationAdmin(admin.ModelAdmin):
    list_display = ('application_id', 'job_id', 'professional_id', 'status', 'applied_at')
    list_filter = ('status', 'applied_at')
    search_fields = ('job_id__title', 'professional_id__email', 'professional_id__name')
    readonly_fields = ('application_id', 'applied_at')

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('razorpay_order_id', 'job_application', 'payment_type', 'amount', 'status', 'created_at')
    list_filter = ('payment_type', 'status', 'created_at')
    search_fields = ('razorpay_order_id', 'razorpay_payment_id', 'job_application__job_id__title')
    readonly_fields = ('created_at',)

@admin.register(PaymentRequest)
class PaymentRequestAdmin(admin.ModelAdmin):
    list_display = ('request_id', 'payment', 'client', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('payment__razorpay_order_id', 'client__email')
    readonly_fields = ('request_id', 'created_at')

@admin.register(Complaint)
class ComplaintAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'status', 'created_at', 'responded_by')
    list_filter = ('status', 'created_at', 'response_date')
    search_fields = ('user__email', 'description', 'admin_response')
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        ('Complaint Details', {
            'fields': ('user', 'description', 'status', 'created_at')
        }),
        ('Admin Response', {
            'fields': ('admin_response', 'responded_by', 'response_date')
        }),
        ('Client Feedback', {
            'fields': ('client_feedback', 'feedback_date', 'resolution_rating')
        }),
        ('Timestamps', {
            'fields': ('updated_at',)
        }),
    )

@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ('id', 'job', 'created_at', 'messages_count')
    search_fields = ('job__title', 'job__client_id__email')
    readonly_fields = ('created_at', 'messages_count')
    
    def messages_count(self, obj):
        return obj.messages.count()
    messages_count.short_description = "Number of Messages"

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'conversation', 'sender', 'content_preview', 'file_type', 'created_at', 'is_read')
    list_filter = ('file_type', 'is_read', 'created_at')
    search_fields = ('content', 'sender__email', 'conversation__job__title')
    readonly_fields = ('created_at',)
    
    def content_preview(self, obj):
        if obj.content:
            return obj.content[:50] + "..." if len(obj.content) > 50 else obj.content
        elif obj.file:
            return f"[File: {obj.file_type or 'unknown'}]"
        return "[Empty message]"
    content_preview.short_description = "Content Preview"

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'notification_type', 'title', 'is_read', 'created_at')
    list_filter = ('notification_type', 'is_read', 'created_at')
    search_fields = ('user__email', 'title', 'message')
    readonly_fields = ('id', 'created_at')

# Custom admin actions
@admin.action(description='Mark selected notifications as read')
def mark_notifications_read(modeladmin, request, queryset):
    queryset.update(is_read=True)

@admin.action(description='Verify selected professionals')
def verify_professionals(modeladmin, request, queryset):
    queryset.update(verify_status='Verified', denial_reason=None)

@admin.action(description='Reset verification status to pending')
def reset_verification_status(modeladmin, request, queryset):
    queryset.update(verify_status='Pending', denial_reason=None)

# Add actions to admin classes
NotificationAdmin.actions = [mark_notifications_read]
ProfessionalProfileAdmin.actions = [verify_professionals, reset_verification_status]