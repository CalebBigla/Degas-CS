import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';
import { useQuery } from 'react-query';
import { api } from '../lib/api';
import { filterNavigationByRole, canAccessModule, isAdminRole } from '../lib/rbac';
import { 
  LayoutDashboard, 
  Users, 
  ScanLine, 
  BarChart3, 
  LogOut,
  Shield,
  FileText,
  Menu,
  X,
  Bell,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  Search
} from 'lucide-react';
import { cn } from '../lib/utils';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { admin, user, logout, userRole } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const isAdmin = userRole === 'admin' || userRole === 'super_admin';
  const isFollowUp = userRole === 'follow_up';
  const pathPrefix = (isAdmin || isFollowUp) ? '/admin' : '/user';

  // Fetch recent registrations for notification count
  const { data: recentRegistrations } = useQuery(
    'recentRegistrations',
    async () => {
      const response = await api.get('/analytics/recent-registrations?limit=10');
      return response.data.data || [];
    },
    {
      refetchInterval: 5000, // Refresh every 5 seconds
      enabled: isAdmin // Only fetch for admins
    }
  );

  // Count unread notifications (registrations in last 24 hours)
  const notificationCount = recentRegistrations?.filter((reg: any) => {
    const regDate = new Date(reg.createdAt);
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return regDate > dayAgo;
  }).length || 0;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Define all navigation items
  const allNavigation = [
    { name: 'Dashboard', module: 'dashboard', href: `${pathPrefix}/dashboard`, icon: LayoutDashboard, external: false },
    { name: 'Tables', module: 'tables', href: `${pathPrefix}/tables`, icon: Users, external: false },
    { name: 'Forms', module: 'forms', href: `${pathPrefix}/forms`, icon: FileText, external: false },
    { name: 'Scanner', module: 'scanner', href: '/scanner.html', icon: ScanLine, external: true },
    { name: 'Access Logs', module: 'access-logs', href: `${pathPrefix}/access-logs`, icon: FileText, external: false },
    { name: 'Analytics', module: 'analytics', href: `${pathPrefix}/analytics`, icon: BarChart3, external: false },
  ];

  // Filter navigation based on user role
  const userRoleValue = userRole as any;
  const filteredNavigation = allNavigation.filter(item => 
    canAccessModule(userRoleValue, item.module)
  );

  const userInitial = (admin?.username || user?.email)?.charAt(0).toUpperCase() || 'U';
  const userName = admin?.username || user?.email || 'User';
  const displayName = userName.length > 20 ? userName.substring(0, 20) + '...' : userName;

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-300 ease-in-out',
          'bg-[hsl(var(--sidebar-background))] border-r border-[hsl(var(--sidebar-border))]',
          sidebarCollapsed ? 'w-20' : 'w-64',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo Section */}
        <div className={cn(
          'flex h-16 items-center border-b border-[hsl(var(--sidebar-border))]',
          sidebarCollapsed ? 'justify-center px-4' : 'justify-between px-6'
        )}>
          {!sidebarCollapsed && (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[hsl(var(--sidebar-primary))] rounded-lg shadow-sm">
                <Shield className="h-5 w-5 text-[hsl(var(--sidebar-primary-foreground))]" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-[hsl(var(--sidebar-foreground))]">AccessHub</span>
                <span className="text-xs text-[hsl(var(--sidebar-muted))]">Control Panel</span>
              </div>
            </div>
          )}
          {sidebarCollapsed && (
            <div className="p-2 bg-[hsl(var(--sidebar-primary))] rounded-lg shadow-sm">
              <Shield className="h-5 w-5 text-[hsl(var(--sidebar-primary-foreground))]" />
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-3">
          <div className="space-y-1.5">
            {filteredNavigation.map((item) => {
              const isActive = !item.external && (
                location.pathname === item.href || 
                (item.href.includes('/tables') && location.pathname.startsWith(item.href))
              );
              
              if (item.external) {
                return (
                  <a
                    key={item.name}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200',
                      'text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-accent-foreground))]',
                      sidebarCollapsed && 'justify-center px-3'
                    )}
                    title={sidebarCollapsed ? item.name : undefined}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    {!sidebarCollapsed && <span className="truncate">{item.name}</span>}
                  </a>
                );
              }
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-[hsl(var(--sidebar-primary))] text-[hsl(var(--sidebar-primary-foreground))] shadow-md'
                      : 'text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))] hover:text-[hsl(var(--sidebar-accent-foreground))]',
                    sidebarCollapsed && 'justify-center px-3'
                  )}
                  title={sidebarCollapsed ? item.name : undefined}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {!sidebarCollapsed && <span className="truncate">{item.name}</span>}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Collapse Button */}
        <div className="p-4 border-t border-[hsl(var(--sidebar-border))]">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={cn(
              'hidden lg:flex items-center w-full py-2.5 rounded-lg transition-all duration-200',
              'text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))]',
              sidebarCollapsed ? 'justify-center px-3' : 'justify-start px-4 gap-2'
            )}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <>
                <ChevronLeft className="h-5 w-5" />
                <span className="text-sm font-medium">Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className={cn(
        'min-h-screen transition-all duration-300 ease-in-out',
        sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'
      )}>
        {/* Top Bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-card backdrop-blur supports-[backdrop-filter]:bg-card/95 px-4 sm:px-6 lg:px-8">
          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 hover:bg-accent/10 rounded-lg transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5 text-foreground" />
            ) : (
              <Menu className="h-5 w-5 text-foreground" />
            )}
          </button>

          {/* Search Bar */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search anything..."
                className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Spacer to push right section to the right */}
          <div className="flex-1" />

          {/* Right Section */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 hover:bg-accent/10 rounded-lg transition-colors"
              title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <Moon className="h-5 w-5 text-foreground" />
              ) : (
                <Sun className="h-5 w-5 text-foreground" />
              )}
            </button>

            {/* Notifications */}
            <button 
              className="relative p-2 hover:bg-accent/10 rounded-lg transition-colors"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5 text-foreground" />
              {notificationCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] flex items-center justify-center bg-destructive text-destructive-foreground text-xs font-semibold rounded-full ring-2 ring-card px-1">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </button>

            {/* Divider */}
            <div className="hidden sm:block h-8 w-px bg-border mx-2" />

            {/* Profile Section */}
            <div className="flex items-center gap-3">
              <div className="hidden md:block text-right mr-2">
                <div className="text-sm font-medium text-foreground leading-tight">{displayName}</div>
                <div className="text-xs text-muted-foreground capitalize">{userRole?.replace('_', ' ')}</div>
              </div>
              <button 
                className="relative group"
                aria-label="Profile menu"
              >
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary flex items-center justify-center ring-2 ring-background shadow-sm group-hover:ring-primary/20 transition-all">
                  <span className="text-primary-foreground font-semibold text-sm">
                    {userInitial}
                  </span>
                </div>
              </button>
              
              {/* Spacing between profile and logout */}
              <div className="w-px h-6 bg-border mx-1" />
              
              <button
                onClick={handleLogout}
                className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all ml-1"
                title="Logout"
                aria-label="Logout"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 sm:p-6 lg:p-8 max-w-[1920px] mx-auto">
          <div className="w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}