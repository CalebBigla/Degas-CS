import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LoadingSpinner } from './ui/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'user' | 'admin' | 'super_admin';
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, userRole } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('🔐 User not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && userRole !== requiredRole && requiredRole === 'admin') {
    // Allow both admin and super_admin
    if (userRole !== 'super_admin') {
      console.log('🔐 User does not have admin role');
      return <Navigate to="/user/dashboard" replace />;
    }
  }

  if (requiredRole && userRole !== requiredRole) {
    console.log('🔐 User does not have required role:', requiredRole);
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export function AdminRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRole="admin">
      {children}
    </ProtectedRoute>
  );
}

export function UserRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRole="user">
      {children}
    </ProtectedRoute>
  );
}
