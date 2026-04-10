/**
 * Frontend RBAC Utilities
 * Mirrors backend RBAC system for consistent permission checking
 */

export type Role = 'user' | 'admin' | 'super_admin' | 'follow_up' | 'greeter';

export interface RolePermissions {
  modules: string[];
  canAccess: (module: string) => boolean;
  defaultRedirectPath: string;
}

/**
 * Role to Module Permissions Mapping
 * MUST match backend ROLE_PERMISSIONS in src/config/rbac.ts
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

  // Admin: Full access
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
 * Navigation items that correspond to modules
 */
export interface NavItem {
  name: string;
  module: string;
  href: string;
  icon: any;
  external?: boolean;
}

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

/**
 * Filter navigation items based on role
 */
export function filterNavigationByRole(allNavItems: NavItem[], role: Role): NavItem[] {
  return allNavItems.filter(item => canAccessModule(role, item.module));
}
