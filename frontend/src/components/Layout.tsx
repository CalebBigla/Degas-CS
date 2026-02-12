import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  LayoutDashboard, 
  Users, 
  ScanLine, 
  BarChart3, 
  LogOut,
  Shield,
  FileText
} from 'lucide-react';
import { cn } from '../lib/utils';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { admin, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, external: false },
    { name: 'Tables', href: '/tables', icon: Users, external: false },
    { name: 'Scanner', href: '/scanner.html', icon: ScanLine, external: true },
    { name: 'Access Logs', href: '/access-logs', icon: FileText, external: false },
    { name: 'Analytics', href: '/analytics', icon: BarChart3, external: false },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Modern Sidebar */}
      <div className="sidebar">
        {/* Logo Section */}
        <div className="flex h-20 items-center justify-center border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald rounded-xl shadow-lg shadow-emerald/20">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold text-white">Degas CS</span>
              <p className="text-xs text-gray-400">Access Control</p>
            </div>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="mt-8 px-4">
          <ul className="space-y-2">
            {navigation.map((item) => {
              const isActive = !item.external && (location.pathname === item.href || 
                             (item.href === '/tables' && location.pathname.startsWith('/tables')));
              
              if (item.external) {
                return (
                  <li key={item.name}>
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="sidebar-item sidebar-item-inactive"
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </a>
                  </li>
                );
              }
              
              return (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className={cn(
                      'sidebar-item',
                      isActive ? 'sidebar-item-active' : 'sidebar-item-inactive'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10 bg-black/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald to-emerald/70 flex items-center justify-center ring-2 ring-white/20">
                <span className="text-white font-semibold text-sm">
                  {admin?.username?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <div className="font-medium text-white text-sm">{admin?.username}</div>
                <div className="text-xs text-gray-400 capitalize">{admin?.role}</div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pl-64">
        <main className="p-8">
          {children}
        </main>
      </div>
    </div>
  );
}