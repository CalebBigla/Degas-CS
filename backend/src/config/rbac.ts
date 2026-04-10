/**
 * RBAC (Role-Based Access Control) System
 * Centralized role -> permissions mapping
 * Ensures consistent access control across all modules
 */

export type Role = 'super_admin' | 'admin' | 'user' | 'follow_up' | 'greeter';

export interface RolePermissions {
  modules: string[];
  canAccess: (module: string) => boolean;
  defaultRedirectPath: string;
}

/**
 * Role to Module Permissions Mapping
 * Each role defines which modules they can access
 */
export const ROLE_PERMISSIONS: Record<Role, RolePermissions> = {
  // Super Admin: Full access
  super_admin: {
    modules: [
      'dashboard',
      'tables',
      'forms',
      'scanner',
      'access-logs',
      'analytics',
      'settings',
      'users'
    ],
    canAccess: function(module: string): boolean {
      return this.modules.includes(module);
    },
    defaultRedirectPath: '/admin/dashboard'
  },

  // Admin: Full access (same as super_admin for now)
  admin: {
    modules: [
      'dashboard',
      'tables',
      'forms',
      'scanner',
      'access-logs',
      'analytics',
      'settings',
      'users'
    ],
    canAccess: function(module: string): boolean {
      return this.modules.includes(module);
    },
    defaultRedirectPath: '/admin/dashboard'
  },

  // Regular User: Dashboard only
  user: {
    modules: ['user-dashboard', 'user-scanner', 'user-attendance'],
    canAccess: function(module: string): boolean {
      return this.modules.includes(module);
    },
    defaultRedirectPath: '/user/dashboard'
  },

  // Follow-Up: Dashboard and Access Logs ONLY
  follow_up: {
    modules: ['dashboard', 'access-logs'],
    canAccess: function(module: string): boolean {
      return this.modules.includes(module);
    },
    defaultRedirectPath: '/admin/dashboard'
  },

  // Greeter: Scanner ONLY
  greeter: {
    modules: ['scanner'],
    canAccess: function(module: string): boolean {
      return this.modules.includes(module);
    },
    defaultRedirectPath: '/scanner.html'
  }
};

/**
 * Map a route path to a module name for permission checking
 */
export const ROUTE_TO_MODULE: Record<string, string> = {
  '/admin/dashboard': 'dashboard',
  '/admin/tables': 'tables',
  '/admin/tables/:tableId': 'tables',
  '/admin/forms': 'forms',
  '/admin/forms-tables/:formId': 'forms',
  '/admin/scanner': 'scanner',
  '/admin/access-logs': 'access-logs',
  '/admin/analytics': 'analytics',
  '/admin/settings': 'settings',
  '/admin/users': 'users',
  '/user/dashboard': 'user-dashboard',
  '/user/scanner': 'user-scanner',
  '/user/qr-scanner': 'user-scanner',
  '/user/attendance-history': 'user-attendance',
  '/mark-attendance': 'user-scanner',
  '/scanner': 'scanner',
  '/scanner.html': 'scanner'
};

/**
 * Check if a role can access a specific module
 */
export function canAccessModule(role: Role, module: string): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) {
    return false;
  }
  return permissions.canAccess(module);
}

/**
 * Check if a role can access a specific route
 */
export function canAccessRoute(role: Role, routePath: string): boolean {
  const module = ROUTE_TO_MODULE[routePath];
  if (!module) {
    // If route is not mapped, deny access
    return false;
  }
  return canAccessModule(role, module);
}

/**
 * Get the default redirect path for a role after login
 */
export function getDefaultRedirectPath(role: Role): string {
  return ROLE_PERMISSIONS[role]?.defaultRedirectPath || '/login';
}

/**
 * Get all accessible modules for a role
 */
export function getAccessibleModules(role: Role): string[] {
  return ROLE_PERMISSIONS[role]?.modules || [];
}

/**
 * Check if role has any admin privileges
 */
export function isAdminRole(role: Role): boolean {
  return role === 'super_admin' || role === 'admin';
}

/**
 * Check if role is staff (admin, follow_up, or greeter)
 */
export function isStaffRole(role: Role): boolean {
  return role === 'super_admin' || role === 'admin' || role === 'follow_up' || role === 'greeter';
}
