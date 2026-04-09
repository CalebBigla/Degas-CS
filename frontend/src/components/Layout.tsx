import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';
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
  ChevronRight
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
  const pathPrefix = isAdmin ? '/admin' : '/user';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigation = [
    { name: 'Dashboard', href: `${pathPrefix}/dashboard`, icon: LayoutDashboard, external: false },
    { name: 'Tables', href: `${pathPrefix}/tables`, icon: Users, external: false },
    { name: 'Forms', href: `${pathPrefix}/forms`, icon: FileText, external: false },
    { name: 'Scanner', href: '/scanner.html', icon: ScanLine, external: true },
    { name: 'Access Logs', href: `${pathPrefix}/access-logs`, icon: FileText, external: false },
    { name: 'Analytics', href: `${pathPrefix}/analytics`, icon: BarChart3, external: false },
  ];

  const userInitial = (admin?.username || user?.email)?.charAt(0).toUpperCase() || 'U';
  const userName = admin?.username || user?.email || 'User';

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-300 bg-sidebar border-r border-sidebar-border',
          sidebarCollapsed ? 'w-20' : 'w-64',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo Section */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
          {!sidebarCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-sidebar-primary rounded-lg">
                <Shield className="h-5 w-5 text-sidebar-primary-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-sidebar-foreground">AccessHub</span>
                <span className="text-xs text-sidebar-muted">Control Panel</span>
              </div>
            </div>
          )}
          {sidebarCollapsed && (
            <div className="p-2 bg-sidebar-primary rounded-lg mx-auto">
              <Shield className="h-5 w-5 text-sidebar-primary-foreground" />
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <div className="space-y-1">
            {navigation.map((item) => {
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
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                      'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                      sidebarCollapsed && 'justify-center'
                    )}
                    title={sidebarCollapsed ? item.name : undefined}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    {!sidebarCollapsed && <span>{item.name}</span>}
                  </a>
                );
              }
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-lg'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                    sidebarCollapsed && 'justify-center'
                  )}
                  title={sidebarCollapsed ? item.name : undefined}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {!sidebarCollapsed && <span>{item.name}</span>}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Collapse Button */}
        <div className="p-3 border-t border-sidebar-border">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex items-center justify-center w-full p-2 rounded-lg text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <>
                <ChevronLeft className="h-5 w-5" />
                <span className="ml-2 text-sm">Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className={cn('transition-all duration-300', sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64')}>
        {/* Top Bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-card px-6">
          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 hover:bg-accent/10 rounded-lg transition-colors"
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
              <input
                type="text"
                placeholder="Search anything..."
                className="w-full pl-4 pr-4 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all"
              />
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 hover:bg-accent/10 rounded-lg transition-colors"
              title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {theme === 'light' ? (
                <Moon className="h-5 w-5 text-foreground" />
              ) : (
                <Sun className="h-5 w-5 text-foreground" />
              )}
            </button>

            {/* Notifications */}
            <button className="relative p-2 hover:bg-accent/10 rounded-lg transition-colors">
              <Bell className="h-5 w-5 text-foreground" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full"></span>
            </button>

            {/* Profile Dropdown */}
            <div className="flex items-center gap-3 pl-3 border-l border-border">
              <div className="hidden sm:block text-right">
                <div className="text-sm font-medium text-foreground">{userName}</div>
                <div className="text-xs text-muted-foreground capitalize">{userRole}</div>
              </div>
              <button className="relative group">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center ring-2 ring-background shadow-sm">
                  <span className="text-primary-foreground font-semibold text-sm">
                    {userInitial}
                  </span>
                </div>
                {/* Dropdown menu can be added here */}
              </button>
              <button
                onClick={handleLogout}
                className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                title="Logout"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}