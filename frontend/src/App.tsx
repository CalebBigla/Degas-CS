import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { ThemeProvider } from './contexts/ThemeContext';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { UserDashboardPage } from './pages/UserDashboardPage';
import { TablesPage } from './pages/TablesPage';
import { TableDetailPage } from './pages/TableDetailPage';
import { FormTableDetailPage } from './pages/FormTableDetailPage';
import { ScannerPage } from './pages/ScannerPage';
import { AttendanceReportPage } from './pages/AttendanceReportPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { FormsPage } from './pages/FormsPage';
import { RegisterPage } from './pages/RegisterPage';
import { MemberDashboardPage } from './pages/MemberDashboardPage';
// ATTENDANCE MODULE DISABLED - Uncomment to re-enable
// import { AttendanceSessionsPage } from './pages/AttendanceSessionsPage';
import { Layout } from './components/Layout';
import { ProtectedRoute, AdminRoute, UserRoute } from './components/ProtectedRoute';
import { UserScannerPage } from './pages/UserScannerPage';
import { QRScannerPage } from './pages/QRScannerPage';
import { LoadingSpinner } from './components/ui/LoadingSpinner';

function App() {
  const { isAuthenticated, isLoading, userRole, admin, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <ThemeProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<Navigate to="/register/06aa4b67-76fe-411a-a1e0-682871e8506f" replace />} />
          <Route path="/register/:formId" element={<RegisterPage />} />
          <Route path="/scanner" element={<ScannerPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </ThemeProvider>
    );
  }

  // Determine if user is admin or regular user
  const isAdmin = userRole === 'admin' || userRole === 'super_admin';

  return (
    <ThemeProvider>
      {isAdmin ? (
        // Admin Routes
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/dashboard" element={<DashboardPage />} />
            <Route path="/admin/tables" element={<TablesPage />} />
            <Route path="/admin/tables/:tableId" element={<TableDetailPage />} />
            <Route path="/admin/forms-tables/:formId" element={<FormTableDetailPage />} />
            <Route path="/admin/forms" element={<FormsPage />} />
            {/* ATTENDANCE MODULE DISABLED - Uncomment to re-enable */}
            {/* <Route path="/admin/attendance" element={<AttendanceSessionsPage />} /> */}
            <Route path="/admin/scanner" element={<ScannerPage />} />
            <Route path="/admin/access-logs" element={<AttendanceReportPage />} />
            <Route path="/admin/analytics" element={<AnalyticsPage />} />
            <Route path="/user/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/my-dashboard" element={<MemberDashboardPage />} />
            <Route path="/mark-attendance" element={<UserScannerPage />} />
            <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
          </Routes>
        </Layout>
      ) : (
        // User Routes
        <Routes>
          <Route path="/" element={<Navigate to="/user/dashboard" replace />} />
          <Route path="/user/dashboard" element={<UserDashboardPage />} />
          <Route path="/user/qr-scanner" element={<QRScannerPage />} />
          <Route path="/user/attendance-history" element={<MemberDashboardPage />} />
          <Route path="/mark-attendance" element={<UserScannerPage />} />
          <Route path="/scanner" element={<ScannerPage />} />
          <Route path="/admin/*" element={<Navigate to="/user/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/user/dashboard" replace />} />
        </Routes>
      )}
    </ThemeProvider>
  );
}

export default App;