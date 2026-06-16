import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/UI/Toast';
import ProtectedRoute from './routes/ProtectedRoute';
import RootLayout from './components/Layout/RootLayout';

import LoginPage from './pages/auth/LoginPage';
import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import MyLeaves from './pages/employee/MyLeaves';
import ApplyLeave from './pages/employee/ApplyLeave';
import ManagerDashboard from './pages/manager/ManagerDashboard';
import PendingRequests from './pages/manager/PendingRequests';
import HRDashboard from './pages/hr/HRDashboard';
import LeaveReports from './pages/hr/LeaveReports';
import EmployeeBalances from './pages/hr/EmployeeBalances';
import Employees from './pages/hr/Employees';
import Departments from './pages/hr/Departments';
import Holidays from './pages/shared/Holidays';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />

            {/* Employee routes */}
            <Route
              element={
                <ProtectedRoute allowedRoles={['employee', 'manager', 'hr_admin']}>
                  <RootLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
              <Route path="/employee/my-leaves" element={<MyLeaves />} />
              <Route path="/employee/apply" element={<ApplyLeave />} />
              <Route path="/employee/holidays" element={<Holidays />} />
            </Route>

            {/* Manager routes */}
            <Route
              element={
                <ProtectedRoute allowedRoles={['manager']}>
                  <RootLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/manager/dashboard" element={<ManagerDashboard />} />
              <Route path="/manager/my-leaves" element={<MyLeaves />} />
              <Route path="/manager/approvals" element={<PendingRequests />} />
              <Route path="/manager/holidays" element={<Holidays />} />
            </Route>

            {/* HR routes */}
            <Route
              element={
                <ProtectedRoute allowedRoles={['hr_admin']}>
                  <RootLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/hr/dashboard" element={<HRDashboard />} />
              <Route path="/hr/employees" element={<Employees />} />
              <Route path="/hr/departments" element={<Departments />} />
              <Route path="/hr/leave-reports" element={<LeaveReports />} />
              <Route path="/hr/balances" element={<EmployeeBalances />} />
              <Route path="/hr/holidays" element={<Holidays />} />
            </Route>

            {/* Redirects */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
