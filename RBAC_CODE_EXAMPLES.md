# RBAC Implementation Examples

## Complete Code Examples for Different Scenarios

---

## Example 1: Basic Admin Dashboard Route

### Backend (Express/TypeScript)

```typescript
// backend/src/routes/dashboard.ts

import express from 'express';
import { authenticateCoreUser } from '../middleware/coreAuth';
import { requireModuleAccess } from '../middleware/authorizationMiddleware';
import dashboardController from '../controllers/dashboardController';

const router = express.Router();

// GET /api/dashboard
// Requires: authentication + dashboard module access
router.get(
  '/admin/dashboard',
  authenticateCoreUser,                    // Step 1: Validate JWT token
  requireModuleAccess('dashboard'),        // Step 2: Check module permission
  dashboardController.getDashboard         // Step 3: Execute handler
);

// POST /api/dashboard/stats
// Requires: authentication + dashboard module access
router.post(
  '/admin/dashboard/stats',
  authenticateCoreUser,
  requireModuleAccess('dashboard'),
  dashboardController.postDashboardStats
);

export default router;
```

### Frontend (React)

```typescript
// frontend/src/pages/DashboardPage.tsx

import { useAuth } from '../hooks/useAuth';
import { canAccessModule } from '../lib/rbac';
import { useQuery } from 'react-query';
import { api } from '../lib/api';

export function DashboardPage() {
  const { userRole } = useAuth();

  // Check permission before rendering
  if (!canAccessModule(userRole as any, 'dashboard')) {
    return <AccessDenied />;
  }

  // Fetch dashboard data (API will also check permissions)
  const { data: stats } = useQuery('dashboard', async () => {
    const response = await api.get('/dashboard/admin/dashboard');
    return response.data;
  });

  return (
    <div>
      <h1>Dashboard</h1>
      {/* Render dashboard content */}
    </div>
  );
}
```

---

## Example 2: Restricted Module - Scanner (GREETER Only)

### Backend

```typescript
// backend/src/routes/scanner.ts

import express from 'express';
import { authenticateCoreUser } from '../middleware/coreAuth';
import { requireModuleAccess } from '../middleware/authorizationMiddleware';
import scannerController from '../controllers/scannerController';

const router = express.Router();

// POST /api/scanner/verify - Scan QR code
// Only GREETER and ADMIN roles can access
router.post(
  '/verify',
  authenticateCoreUser,
  requireModuleAccess('scanner'),
  scannerController.verifyQR
);

// GET /api/scanner/logs - View scan logs
// Only GREETER and ADMIN roles can access
router.get(
  '/logs',
  authenticateCoreUser,
  requireModuleAccess('scanner'),
  scannerController.getLogs
);

export default router;
```

### Frontend

```typescript
// frontend/src/pages/ScannerPage.tsx

import { useAuth } from '../hooks/useAuth';
import { canAccessModule } from '../lib/rbac';
import { useEffect } from 'react';

export function ScannerPage() {
  const { userRole } = useAuth();

  // Automatically redirect if GREETER trying to access scanner
  // (should not happen due to App.tsx routing, but defensive check)
  useEffect(() => {
    if (userRole && !canAccessModule(userRole as any, 'scanner')) {
      window.location.href = '/';
    }
  }, [userRole]);

  return (
    <div className="scanner-container">
      <h1>QR Code Scanner</h1>
      {/* Scanner implementation */}
    </div>
  );
}
```

---

## Example 3: Multi-Role Route - Access Logs (FOLLOW_UP + ADMIN)

### Backend

```typescript
// backend/src/routes/accessLogs.ts

import express from 'express';
import { authenticateCoreUser } from '../middleware/coreAuth';
import { requireModuleAccess } from '../middleware/authorizationMiddleware';
import accessLogsController from '../controllers/accessLogsController';

const router = express.Router();

// GET /api/access-logs - View logs
// FOLLOW_UP, ADMIN, and SUPER_ADMIN can access
router.get(
  '/access-logs',
  authenticateCoreUser,
  requireModuleAccess('access-logs'),
  accessLogsController.getAccessLogs
);

// GET /api/access-logs/:id - View specific log
router.get(
  '/access-logs/:id',
  authenticateCoreUser,
  requireModuleAccess('access-logs'),
  accessLogsController.getAccessLogById
);

// POST /api/access-logs/export - Export logs
router.post(
  '/access-logs/export',
  authenticateCoreUser,
  requireModuleAccess('access-logs'),
  accessLogsController.exportLogs
);

export default router;
```

### Frontend Implementation

```typescript
// frontend/src/pages/AccessLogsPage.tsx

import { useAuth } from '../hooks/useAuth';
import { canaccessModule } from '../lib/rbac';
import { useQuery } from 'react-query';
import { api } from '../lib/api';

export function AccessLogsPage() {
  const { userRole } = useAuth();

  // Only FOLLOW_UP, ADMIN, SUPER_ADMIN can see this page
  const canView = canAccessModule(userRole as any, 'access-logs');

  if (!canView) {
    return <NotFound />;
  }

  const { data: logs, isLoading } = useQuery('accessLogs', async () => {
    const response = await api.get('/access-logs');
    return response.data;
  });

  return (
    <div className="access-logs-container">
      <h1>Access Logs</h1>
      {isLoading ? <Loading /> : <LogsTable logs={logs} />}
    </div>
  );
}
```

---

## Example 4: Layout Component with Dynamic Navigation

### Frontend

```typescript
// frontend/src/components/AdminLayout.tsx

import { useAuth } from '../hooks/useAuth';
import { filterNavigationByRole, canAccessModule } from '../lib/rbac';
import { Link } from 'react-router-dom';

interface NavItem {
  name: string;
  module: string;
  href: string;
  icon: React.ComponentType;
}

const ALL_NAV_ITEMS: NavItem[] = [
  { name: 'Dashboard', module: 'dashboard', href: '/admin/dashboard', icon: DashboardIcon },
  { name: 'Tables', module: 'tables', href: '/admin/tables', icon: TablesIcon },
  { name: 'Forms', module: 'forms', href: '/admin/forms', icon: FormsIcon },
  { name: 'Scanner', module: 'scanner', href: '/scanner', icon: ScannerIcon },
  { name: 'Access Logs', module: 'access-logs', href: '/admin/access-logs', icon: LogsIcon },
  { name: 'Analytics', module: 'analytics', href: '/admin/analytics', icon: AnalyticsIcon },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userRole } = useAuth();

  // Filter navigation items based on user role
  const visibleNavItems = filterNavigationByRole(ALL_NAV_ITEMS, userRole as any);

  return (
    <div className="layout">
      {/* Sidebar with filtered navigation */}
      <aside className="sidebar">
        <nav>
          {visibleNavItems.map((item) => (
            <Link key={item.module} to={item.href}>
              <item.icon />
              {item.name}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="content">
        {children}
      </main>
    </div>
  );
}
```

---

## Example 5: Role-Based App Routing

### Frontend

```typescript
// frontend/src/App.tsx

import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { isAdminRole } from './lib/rbac';
import AdminLayout from './components/AdminLayout';
import DashboardPage from './pages/DashboardPage';
import ScannerPage from './pages/ScannerPage';
import AccessLogsPage from './pages/AccessLogsPage';

function App() {
  const { isAuthenticated, userRole } = useAuth();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // GREETER: Scanner only route
  if (userRole === 'greeter') {
    return (
      <Routes>
        <Route path="/" element={<Navigate to="/scanner" replace />} />
        <Route path="/scanner" element={<ScannerPage />} />
        <Route path="*" element={<Navigate to="/scanner" replace />} />
      </Routes>
    );
  }

  // FOLLOW_UP: Dashboard + Access Logs only
  if (userRole === 'follow_up') {
    return (
      <AdminLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/dashboard" element={<DashboardPage />} />
          <Route path="/admin/access-logs" element={<AccessLogsPage />} />
          {/* All other admin routes redirect to dashboard */}
          <Route path="/admin/*" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
        </Routes>
      </AdminLayout>
    );
  }

  // ADMIN/SUPER_ADMIN: Full access
  if (isAdminRole(userRole as any)) {
    return (
      <AdminLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/dashboard" element={<DashboardPage />} />
          <Route path="/admin/tables" element={<TablesPage />} />
          <Route path="/admin/forms" element={<FormsPage />} />
          <Route path="/admin/scanner" element={<ScannerPage />} />
          <Route path="/admin/access-logs" element={<AccessLogsPage />} />
          <Route path="/admin/analytics" element={<AnalyticsPage />} />
          {/* ... more routes */}
          <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
        </Routes>
      </AdminLayout>
    );
  }

  // USER: Limited access
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/user/dashboard" replace />} />
      <Route path="/user/dashboard" element={<UserDashboard />} />
      <Route path="/admin/*" element={<Navigate to="/user/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/user/dashboard" replace />} />
    </Routes>
  );
}

export default App;
```

---

## Example 6: Protected API Calls with Error Handling

### Frontend

```typescript
// frontend/src/api/useAdminAPI.ts

import { useQuery, useMutation } from 'react-query';
import { api } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { canAccessModule } from '../lib/rbac';
import toast from 'react-hot-toast';

export function useAdminData(module: string, endpoint: string) {
  const { userRole } = useAuth();

  return useQuery(
    [module, endpoint],
    async () => {
      try {
        const response = await api.get(`/admin/${endpoint}`);
        return response.data;
      } catch (error: any) {
        const status = error.response?.status;
        const message = error.response?.data?.error;

        if (status === 403) {
          toast.error('Access denied to this module');
          throw new Error('Module access denied');
        }
        
        if (status === 401) {
          toast.error('Session expired, please login again');
          throw new Error('Authentication failed');
        }

        throw error;
      }
    },
    {
      enabled: canAccessModule(userRole as any, module),
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    }
  );
}

// Usage in a component:
export function UsersList() {
  const { data: users, isLoading } = useAdminData('dashboard', 'core-users');
  
  if (isLoading) return <LoadingSpinner />;
  return <UsersTable users={users} />;
}
```

---

## Example 7: Middleware Composition for Complex Rules

### Backend

```typescript
// backend/src/middleware/rbac.ts

import { Request, Response, NextFunction } from 'express';
import { CoreAuthRequest } from './coreAuth';
import { canAccessModule } from '../config/rbac';

/**
 * Require multiple independent module accesses
 * User must have access to ANY of the specified modules
 */
export function requireModuleAccessAny(modules: string[]) {
  return (req: CoreAuthRequest, res: Response, next: NextFunction) => {
    if (!req.coreUser) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const userRole = req.coreUser.role as any;
    const hasAccess = modules.some(module => 
      canAccessModule(userRole, module)
    );

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: `Access denied. No access to any of: ${modules.join(', ')}`
      });
    }

    next();
  };
}

// Usage example:
router.get(
  '/dashboard/overview',
  authenticateCoreUser,
  requireModuleAccessAny(['dashboard', 'analytics']),  // Must have either module
  getDashboardOverview
);
```

---

## Example 8: Custom Permission Decorator (Advanced)

### Backend

```typescript
// backend/src/decorators/permission.ts

import { Request, Response, NextFunction } from 'express';
import { CoreAuthRequest } from '../middleware/coreAuth';
import { ROLE_PERMISSIONS } from '../config/rbac';

/**
 * Custom permission check with detailed rules
 */
export function requirePermission(config: {
  modules?: string[];
  roles?: string[];
  condition?: (user: any) => boolean;
}) {
  return (req: CoreAuthRequest, res: Response, next: NextFunction) => {
    if (!req.coreUser) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check roles if specified
    if (config.roles && !config.roles.includes(req.coreUser.role)) {
      return res.status(403).json({ error: 'Role not allowed' });
    }

    // Check modules if specified
    if (config.modules) {
      const hasAccess = config.modules.some(module => {
        const perms = ROLE_PERMISSIONS[req.coreUser.role as any];
        return perms?.canAccess(module);
      });

      if (!hasAccess) {
        return res.status(403).json({ error: 'Module access denied' });
      }
    }

    // Check custom condition if specified
    if (config.condition && !config.condition(req.coreUser)) {
      return res.status(403).json({ error: 'Condition not met' });
    }

    next();
  };
}

// Usage example:
router.put(
  '/users/:id/role',
  authenticateCoreUser,
  requirePermission({
    roles: ['super_admin'],  // Only super_admin can change roles
    condition: (user) => user.id !== user.params.id, // Can't change own role
  }),
  changeUserRole
);
```

---

## Example 9: Testing RBAC

### Backend Unit Tests

```typescript
// backend/src/__tests__/rbac.test.ts

import { canAccessModule, getAccessibleModules } from '../config/rbac';

describe('RBAC System', () => {
  it('should allow follow_up to access dashboard', () => {
    expect(canAccessModule('follow_up', 'dashboard')).toBe(true);
  });

  it('should deny follow_up from accessing tables', () => {
    expect(canAccessModule('follow_up', 'tables')).toBe(false);
  });

  it('should allow greeter only scanner access', () => {
    const modules = getAccessibleModules('greeter');
    expect(modules).toEqual(['scanner']);
  });

  it('should allow admin all modules', () => {
    const modules = getAccessibleModules('admin');
    expect(modules.length).toBeGreaterThan(5);
  });
});
```

### Frontend Integration Tests

```typescript
// frontend/src/__tests__/rbac.test.tsx

import { renderHook } from '@testing-library/react';
import { useAuth } from '../hooks/useAuth';
import { filterNavigationByRole } from '../lib/rbac';

describe('Frontend RBAC', () => {
  it('should filter navigation for follow_up role', () => {
    const items = ALL_NAV_ITEMS;
    const filtered = filterNavigationByRole(items, 'follow_up');
    
    expect(filtered.some(i => i.module === 'dashboard')).toBe(true);
    expect(filtered.some(i => i.module === 'access-logs')).toBe(true);
    expect(filtered.some(i => i.module === 'tables')).toBe(false);
  });

  it('should filter navigation for greeter role', () => {
    const items = ALL_NAV_ITEMS;
    const filtered = filterNavigationByRole(items, 'greeter');
    
    expect(filtered.some(i => i.module === 'scanner')).toBe(true);
    expect(filtered.some(i => i.module === 'dashboard')).toBe(false);
  });
});
```

---

## Example 10: Error Handling & Recovery

### Backend

```typescript
// backend/src/middleware/errorHandler.ts

import { Request, Response, NextFunction } from 'express';

export function rbacErrorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  // Handle RBAC specific errors
  if (err.code === 'RBAC_ACCESS_DENIED') {
    return res.status(403).json({
      success: false,
      error: err.message || 'Access denied',
      code: 'RBAC_ACCESS_DENIED'
    });
  }

  if (err.code === 'RBAC_AUTH_REQUIRED') {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      code: 'RBAC_AUTH_REQUIRED'
    });
  }

  // Pass to next error handler
  next(err);
}
```

### Frontend

```typescript
// frontend/src/hooks/useErrorHandler.ts

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export function useErrorHandler() {
  const navigate = useNavigate();

  const handleError = useCallback((error: any) => {
    const status = error.response?.status;
    const code = error.response?.data?.code;
    const message = error.response?.data?.error;

    if (status === 401 || code === 'RBAC_AUTH_REQUIRED') {
      toast.error('Session expired, please login again');
      navigate('/login');
      return;
    }

    if (status === 403 || code === 'RBAC_ACCESS_DENIED') {
      toast.error('You don\'t have permission to access this');
      navigate(-1); // Go back
      return;
    }

    toast.error(message || 'An error occurred');
  }, [navigate]);

  return { handleError };
}
```

---

## Summary

These examples cover:
- ✅ Basic route protection
- ✅ Multi-role access
- ✅ Dynamic navigation filtering
- ✅ Role-based routing
- ✅ API calls with error handling
- ✅ Complex permission rules
- ✅ Custom decorators
- ✅ Testing strategies
- ✅ Error recovery

Adapt these patterns as needed for your specific use cases!
