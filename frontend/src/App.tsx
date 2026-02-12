import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { TablesPage } from './pages/TablesPage';
import { TableDetailPage } from './pages/TableDetailPage';
import { ScannerPage } from './pages/ScannerPage';
import { AccessLogsPage } from './pages/AccessLogsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { Layout } from './components/Layout';
import { LoadingSpinner } from './components/ui/LoadingSpinner';

function App() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/scanner" element={<ScannerPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/tables" element={<TablesPage />} />
        <Route path="/tables/:tableId" element={<TableDetailPage />} />
        <Route path="/scanner" element={<ScannerPage />} />
        <Route path="/access-logs" element={<AccessLogsPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/login" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  );
}

export default App;