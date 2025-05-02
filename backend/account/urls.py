from django.urls import path
from .views import RegisterView, LoginView, LogoutView,VerifyOTPView,ForgotPasswordView, ResetPasswordView,AcceptJobApplicationView, JobDetailView, RequestVerificationView,AdminVerifyProfessionalView,ProfessionalJobApplicationsView,SubmitReviewView,AdminJobsView
from .views import CheckAuthView,BlockUnblockUserView,ListUsersView,ProfessionalProfileView,JobCreateView,OpenJobsListView,ApplyToJobView,ClientProjectsView,JobApplicationsListView,AdminVerificationRequestsView,VerifyPaymentView,ClientPendingPaymentsView,ClientTransactionHistoryView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
     path('verify-otp/', VerifyOTPView.as_view(), name='verify-otp'),
    path('forgot-password/', ForgotPasswordView.as_view(), name='forgot-password'),
    path('reset-password/', ResetPasswordView.as_view(), name='reset-password'),
    path('check-auth/', CheckAuthView.as_view(), name='check-auth'),
    path('users/<int:user_id>/block-unblock/', BlockUnblockUserView.as_view(), name='block-unblock-user'),
    path('users/', ListUsersView.as_view(), name='list-users'),
    path('profile/', ProfessionalProfileView.as_view(), name='professional-profile'),
    path('jobs/', JobCreateView.as_view(), name='job-create'),
    path('open-jobs/',OpenJobsListView.as_view(), name='open-jobs-list'),
    path('apply-to-job/', ApplyToJobView.as_view(), name='apply_to_job'),
    path('client-project/', ClientProjectsView.as_view(), name='client_projects'),
    path('job-applications/<int:job_id>/', JobApplicationsListView.as_view(), name='job_applications'),
    path('accept-application/<int:application_id>/', AcceptJobApplicationView.as_view(), name='accept_application'),
    path('jobs/<int:job_id>/', JobDetailView.as_view(), name='job_detail'),
    path('request-verification/', RequestVerificationView.as_view(), name='request_verification'),
    path('admin/verify-professional/<int:professional_id>/', AdminVerifyProfessionalView.as_view(), name='admin_verify_professional'),
    path('admin/verification-requests/', AdminVerificationRequestsView.as_view(), name='admin_verification_requests'),
    path('professional-job-applications/', ProfessionalJobApplicationsView.as_view(), name='professional-job-applications'),
    path('verify-payment/',VerifyPaymentView.as_view(),name='verify-payment'),
    path('client-pending-payments/', ClientPendingPaymentsView.as_view(), name='client_pending_payments'),
    path('submit-review/',SubmitReviewView.as_view(), name='submit-review'),
    path('admin/jobs/', AdminJobsView.as_view(), name='admin-jobs'),
    path('client/transactions/', ClientTransactionHistoryView.as_view(), name='client-transactions'),


]





