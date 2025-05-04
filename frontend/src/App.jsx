// src/App.js
import React from 'react';
import { BrowserRouter as Router, Route, Routes ,Navigate} from 'react-router-dom';
import SignUp from './pages/signup';
import UserLogin from './pages/login';
import VerifyOTP from './pages/VerifyOtp';
import AdminDashboard from './pages/AdminDashboard';
import ProtectedRoute from './ProtectedRoute/ProtectedRoute';
import AdminUserManagement from './pages/AdminUserManagement';
import ClientDashboard from './pages/ClientDashboard';
import ProfessionalDashboard from './pages/ProfessionalDashBoard';
import CreateProfessionalProfile from './pages/CreateProfessionalProfile';
import ProfessionalJoblist from './pages/ProfessionalJob';
import JobPage from './pages/ClientJobPost';
import ClientProjectView from './pages/ClientProjects';
import ClientJobApplications from './pages/ProfessionalRequest'
import AdminVerify from './pages/AdminVerifyProfessional';
import ProfessionalJobView from './pages/ProfessionalJobsDetails';
import EditProjectView from './pages/EditProjects';
import ClientPendingPayments from './pages/ClientPayment';
import AdminJob from './pages/AdminJobs';
import ClientHistory from './pages/ClientTransactions';
import ComplaintManagements from './pages/ClientComplaints';
import AdminComplaint from './pages/AdminComplaints';
import ProfessionalComplient from './pages/ProfessionalComplaint';
import ProfessionalPayment from './pages/ProfessinalTransaction';

import ConversationChat from './components/Chat/ConversationChat'
import ConversationsList from './components/Chat/ConversationsList'

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/login" element={<UserLogin />} />
          <Route path="/register" element={<SignUp />} />
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/verify-otp" element={<VerifyOTP />} />
          <Route
            path="/admin-dashboard"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
         <Route
            path="/admin-user"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminUserManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin_user_complaints"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminComplaint />
              </ProtectedRoute>
            }
          />
           <Route
            path="/admin_user_job"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminJob />
              </ProtectedRoute>
            }
          />
          <Route
            path="/client-transactions"
            element={
              <ProtectedRoute requiredRole="client">
                < ClientHistory />
              </ProtectedRoute>
            }
          />
           <Route
            path="/Complaint"
            element={
              <ProtectedRoute requiredRole="client">
                < ComplaintManagements />
              </ProtectedRoute>
            }
          />
           <Route
            path="/client-dashboard"
            element={
              <ProtectedRoute requiredRole="client">
                <ClientDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/professional-dashboard"
            element={
              <ProtectedRoute requiredRole="professional">
                <ProfessionalDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/create-professional-profile"
            element={<ProtectedRoute requiredRole="professional"><CreateProfessionalProfile /></ProtectedRoute>}
          />
       
        <Route
            path="/Professional-profile"
            element={<Navigate to="/create-professional-profile" />}
          />
          <Route
            path="/client-job"
            element={
              <ProtectedRoute requiredRole="client">
                <JobPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/professional-job"
            element={
              <ProtectedRoute requiredRole="professional">
                <ProfessionalJoblist />
              </ProtectedRoute>
            }
          />
          <Route
            path="/professional-complaint"
            element={
              <ProtectedRoute requiredRole="professional">
                <ProfessionalComplient />
              </ProtectedRoute>
            }
          />
           <Route
            path="/professional/transactions"
            element={
              <ProtectedRoute requiredRole="professional">
                <ProfessionalPayment/>
              </ProtectedRoute>
            }
          />
         <Route
            path="/client-project"
            element={
              <ProtectedRoute requiredRole="client">
                <ClientProjectView />
              </ProtectedRoute>
            }
              />
              <Route path="/client-pending-payments" element={<ProtectedRoute requiredRole="client"><ClientPendingPayments /></ProtectedRoute>} />
            <Route path="/job-applications/:jobId" element={<ProtectedRoute requiredRole="client"><ClientJobApplications /></ProtectedRoute>} />
            <Route path="/edit-project/:job_id" element={<ProtectedRoute requiredRole="client"><EditProjectView /></ProtectedRoute>}  />
            

<Route path="/admin-professional-verification" element={<ProtectedRoute requiredRole="admin">< AdminVerify /></ProtectedRoute>} />
<Route path="/professional-job-applications" element={<ProfessionalJobView />} />
<Route path="/client-conversations" element={<ConversationsList userType="client" />} />
  <Route path="/client-conversation/:jobId" element={<ConversationChat />} />
  
  {/* Professional chat routes */}
  <Route path="/professional-conversations" element={<ConversationsList userType="professional" />} />
  <Route path="/professional-conversation/:jobId" element={<ConversationChat />} />
              
         </Routes>
      </div>
    </Router>
  );
}

export default App;