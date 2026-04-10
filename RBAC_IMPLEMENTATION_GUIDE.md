# Complete RBAC Implementation Guide

## Overview
This guide explains how to protect your backend routes with the new Role-Based Access Control (RBAC) system.

## Roles & Permissions

### Role Hierarchy
```
SUPER_ADMIN → Full access to all modules
ADMIN → Full access to all modules
FOLLOW_UP → Dashboard + Access Logs only
GREETER → Scanner only
USER → Regular user features only
```

### Module-Level Access
Each role can access specific modules:

**SUPER_ADMIN & ADMIN:**
- dashboard
- tables
- forms
- scanner
- access-logs
- analytics
- settings
- users

**FOLLOW_UP:**
- dashboard
- access-logs

**GREETER:**
- scanner

**USER:**
- user-dashboard
- user-scanner
- user-attendance

## Backend Route Protection

### Step 1: Import Required Utilities
```typescript
import { authenticateCoreUser, requireCoreRole } from '../middleware/coreAuth';
import { requireModuleAccess } from '../middleware/authorizationMiddleware';
```

### Step 2: Apply Middleware to Routes

#### Option A: Simple Role Check
Use for backward compatibility with existing role checks:
```typescript
router.get('/dashboard', 
  authenticateCoreUser, 
  requireCoreRole(['admin', 'super_admin']),
  dashboardHandler
);
```

#### Option B: Module-Based Access Control (Recommended)
Use for flexible permission management:
```typescript
router.get('/admin/dashboard', 
  authenticateCoreUser, 
  requireModuleAccess('dashboard'),
  dashboardHandler
);

router.get('/admin/tables', 
  authenticateCoreUser, 
  requireModuleAccess('tables'),
  tablesHandler
);

router.get('/admin/access-logs', 
  authenticateCoreUser, 
  requireModuleAccess('access-logs'),
  accessLogsHandler
);

router.get('/admin/scanner', 
  authenticateCoreUser, 
  requireModuleAccess('scanner'),
  scannerHandler
);
```

### Step 3: Response Behavior

**Successful Access:**
- Status: 200 OK
- User can proceed with route handler

**Authentication Failure (Missing Token):**
- Status: 401 Unauthorized
- Message: "Access token required"

**Authorization Failure (Insufficient Permissions):**
- Status: 403 Forbidden
- Message: "Access denied. You do not have permission to access the [module] module."

## Example: Updated Route File

```typescript
import { Router } from 'express';
import { authenticateCoreUser } from '../middleware/coreAuth';
import { requireModuleAccess } from '../middleware/authorizationMiddleware';
import * as dashboardController from '../controllers/dashboardController';

const router = Router();

// Protect all dashboard endpoints with module access check
router.use(authenticateCoreUser);

router.get('/dashboard',
  requireModuleAccess('dashboard'),
  dashboardController.getDashboard
);

router.get('/stats',
  requireModuleAccess('dashboard'),
  dashboardController.getStats
);

export default router;
```

## Database User Setup

### Create New Roles

#### FOLLOW_UP User
```sql
INSERT INTO core_users (email, password, full_name, phone, role, status)
VALUES (
  'followup@fgm.com',
  'bcrypt_hashed_password_here',
  'Follow-Up Staff',
  '+1234567890',
  'follow_up',
  'active'
);
```

#### GREETER User
```sql
INSERT INTO core_users (email, password, full_name, phone, role, status)
VALUES (
  'greeters@fgm.com',
  'bcrypt_hashed_password_here',
  'Greeter Team',
  '+1234567890',
  'greeter',
  'active'
);
```

## Frontend Implementation

### Navigation Filtering
The Layout component automatically filters sidebar items based on role:

```typescript
// Layout.tsx automatically uses:
const filteredNavigation = allNavigation.filter(item => 
  canAccessModule(userRoleValue, item.module)
);
```

### Role-Based Routing
App.tsx handles different routes for each role:

**GREETER Route:**
```
/ → /scanner (redirects to scanner only)
Accessing /admin/* → redirects to /scanner
```

**FOLLOW_UP Route:**
```
/ → /admin/dashboard
Can access: /admin/dashboard, /admin/access-logs
Other /admin/* → redirects to /admin/dashboard
```

**ADMIN/SUPER_ADMIN Route:**
```
/ → /admin/dashboard
Full access to all admin modules
```

**USER Route:**
```
/ → /user/dashboard
Can access: /user/*, /mark-attendance
Cannot access: /admin/*
```

### Login Redirect
LoginPage now redirects to the appropriate page based on role:

```typescript
const redirectPath = getDefaultRedirectPath(userRole);
navigate(redirectPath);
```

## Testing the RBAC System

### Test Case 1: GREETER Access
1. Login with `greeters@fgm.com`
2. Verify redirected to `/scanner`
3. Verify sidebar only shows Scanner option
4. Try to access `/admin/dashboard` → redirect to `/scanner`
5. Try API call to GET `/analytics` → 403 Forbidden

### Test Case 2: FOLLOW_UP Access
1. Login with `followup@fgm.com`
2. Verify redirected to `/admin/dashboard`
3. Verify sidebar shows only Dashboard and Access Logs
4. Verify can access `/admin/dashboard` and `/admin/access-logs`
5. Try to access `/admin/tables` → redirect to `/admin/dashboard`
6. Try API call to GET `/admin/forms` → 403 Forbidden

### Test Case 3: ADMIN Access
1. Login with admin account
2. Verify full access to all admin modules
3. All sidebar items visible
4. No restrictions on routes

## Migrating Existing Routes

For each route file:

1. **Identify protected endpoints** - Look for routes that currently use `requireCoreRole`
2. **Add module-based middleware** - Replace with `requireModuleAccess`
3. **Test thoroughly** - Verify all roles are handled correctly

### Migration Example: dashboard.ts

**Before:**
```typescript
router.get('/dashboard',
  authenticateCoreUser,
  requireCoreRole(['admin', 'super_admin']),
  getDashboard
);
```

**After:**
```typescript
router.get('/dashboard',
  authenticateCoreUser,
  requireModuleAccess('dashboard'),
  getDashboard
);
```

## Best Practices

1. **Always authenticate first** - Use `authenticateCoreUser` on all protected routes
2. **Use module-based access** - Prefer `requireModuleAccess()` over `requireCoreRole()`
3. **Log access denials** - The middleware logs all 403 responses for security monitoring
4. **Update database with future roles** - Extend ROLE_PERMISSIONS in `src/config/rbac.ts`
5. **Test all roles** - Create test accounts for each role and verify access
6. **Keep frontend in sync** - Update `frontend/src/lib/rbac.ts` when backend changes

## Common Errors & Solutions

### Error: "Access token required" (401)
- **Cause:** No JWT token in Authorization header
- **Solution:** Client must include valid token: `Authorization: Bearer <token>`

### Error: "Access denied... You do not have permission" (403)
- **Cause:** Role lacks permission for requested module
- **Solution:** Check ROLE_PERMISSIONS in rbac.ts, assign correct role to user

### UI shows modules but API returns 403
- **Cause:** Frontend and backend RBAC out of sync
- **Solution:** Verify ROLE_PERMISSIONS match in both files

### User can't login with new role
- **Cause:** Role not defined in ROLE_PERMISSIONS
- **Solution:** Add role to ROLE_PERMISSIONS in both backend and frontend

## Files Modified

- `backend/src/config/rbac.ts` - Role/permission mapping
- `backend/src/middleware/authorizationMiddleware.ts` - Module access enforcement
- `frontend/src/lib/rbac.ts` - Frontend permission utilities
- `frontend/src/hooks/useAuth.tsx` - Updated role type definitions
- `frontend/src/components/Layout.tsx` - Dynamic navigation filtering
- `frontend/src/pages/LoginPage.tsx` - Role-based redirects
- `frontend/src/App.tsx` - Role-based routing
- `DATABASE_SCHEMA.sql` - Updated role enum
- `DATABASE_SCHEMA_SQLITE.sql` - Updated role enum
- `SUPABASE_SETUP.sql` - Updated role enum
