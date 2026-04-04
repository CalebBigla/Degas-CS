import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { Admin, LoginRequest, LoginResponse, ApiResponse } from '@gatekeeper/shared';
import api from '../lib/api';
import toast from 'react-hot-toast';

export interface User {
  id: string;
  email: string;
  role: 'user' | 'admin' | 'super_admin';
}

interface AuthContextType {
  admin: Admin | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  userRole: 'user' | 'admin' | 'super_admin' | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  restoreSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSessionRestored, setIsSessionRestored] = useState(false);
  const queryClient = useQueryClient();

  // Restore session on mount
  useEffect(() => {
    const restoreSession = async () => {
      // Clean up old localStorage keys from previous versions
      const oldKeys = ['gatekeeper_token', 'gatekeeper_refresh_token', 'gatekeeper_admin'];
      oldKeys.forEach(key => {
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key);
        }
      });

      const token = localStorage.getItem('degas_token');
      const storedAdmin = localStorage.getItem('degas_admin');
      const storedUser = localStorage.getItem('degas_user');
      
      if (token) {
        try {
          // Restore admin session if available
          if (storedAdmin) {
            const adminData = JSON.parse(storedAdmin);
            setAdmin(adminData);
            setIsAuthenticated(true);
            console.log('✅ Admin session restored');
          }
          // Restore user session if available
          else if (storedUser) {
            const userData = JSON.parse(storedUser);
            setUser(userData);
            setIsAuthenticated(true);
            console.log('✅ User session restored');
          }
        } catch (error) {
          console.error('❌ Failed to restore session:', error);
          // Invalid stored data, clear it
          localStorage.removeItem('degas_token');
          localStorage.removeItem('degas_refresh_token');
          localStorage.removeItem('degas_admin');
          localStorage.removeItem('degas_user');
          localStorage.removeItem('degas_core_token');
        }
      }
      
      setIsSessionRestored(true);
    };

    restoreSession();
  }, []);

  const loginMutation = useMutation<any, Error, { username: string; password: string }>(
    async (credentials) => {
      // Detect if logging in with email (core user/regular user) or username (old admin)
      const isEmail = credentials.username.includes('@');
      
      console.log('🔐 Login attempt:', { username: credentials.username, isEmail });
      
      if (isEmail) {
        // Try regular user login first (form-based users)
        try {
          console.log('🔐 Trying regular user login endpoint');
          const response = await api.post('/form/login', {
            email: credentials.username,
            password: credentials.password
          });
          console.log('🔐 User login response:', response.data);
          
          if (response.data.success) {
            return { type: 'user', data: response.data };
          }
        } catch (userError: any) {
          console.log('⚠️ Regular user login failed, trying core admin login');
          
          // If user login fails, try core admin login
          try {
            const response = await api.post('/core-auth/login', {
              email: credentials.username,
              password: credentials.password
            });
            console.log('🔐 Core admin login response:', response.data);
            return { type: 'core', data: response.data };
          } catch (coreError: any) {
            // Both failed, throw the original user error
            throw userError;
          }
        }
      } else {
        // Old admin login (username-based)
        console.log('🔐 Using old admin login endpoint');
        const response = await api.post('/auth/login', credentials);
        console.log('🔐 Admin login response:', response.data);
        return { type: 'admin', data: response.data };
      }
    },
    {
      onSuccess: (result) => {
        if (result.type === 'user' && result.data.success) {
          // Regular user login (form-based)
          const { userId, formId, qrCode, user: userData } = result.data;
          
          // Store user data with QR code
          localStorage.setItem('degas_token', 'user-session'); // Simple session marker
          localStorage.setItem('degas_user', JSON.stringify({
            id: userId,
            email: userData.email,
            name: userData.name,
            phone: userData.phone,
            address: userData.address,
            formId: formId,
            scanned: userData.scanned,
            scannedAt: userData.scannedAt,
            qrCode: qrCode, // Store QR code for display
            role: 'user'
          }));
          
          setUser({
            id: userId,
            email: userData.email,
            role: 'user'
          });
          
          setIsAuthenticated(true);
          console.log('✅ Regular user login successful');
          toast.success('Login successful');
        } else if (result.type === 'core' && result.data.success && result.data.data) {
          const { token, user } = result.data.data;
          
          // Store core user token and data
          localStorage.setItem('degas_core_token', token);
          localStorage.setItem('degas_token', token); // Also store as main token
          
          // Determine if user is admin or regular user
          if (user.role === 'admin' || user.role === 'super_admin') {
            localStorage.setItem('degas_admin', JSON.stringify({
              id: user.id,
              username: user.email,
              email: user.email,
              role: user.role
            }));
            
            setAdmin({
              id: user.id,
              username: user.email,
              email: user.email,
              role: user.role
            } as Admin);
          } else {
            localStorage.setItem('degas_user', JSON.stringify({
              id: user.id,
              email: user.email,
              role: user.role
            }));
            
            setUser({
              id: user.id,
              email: user.email,
              role: user.role
            });
          }
          
          setIsAuthenticated(true);
          console.log('✅ Login successful, role:', user.role);
          toast.success('Login successful');
        } else if (result.type === 'admin' && result.data.success && result.data.data) {
          const { token, refreshToken, admin: adminData } = result.data.data;
          
          // Store tokens and admin data
          localStorage.setItem('degas_token', token);
          localStorage.setItem('degas_refresh_token', refreshToken);
          localStorage.setItem('degas_admin', JSON.stringify(adminData));
          
          // Update state
          setAdmin(adminData as Admin);
          setIsAuthenticated(true);
          
          console.log('✅ Admin login successful');
          toast.success('Login successful');
        }
      },
      onError: (error: any) => {
        const message = error.response?.data?.error || 'Login failed';
        toast.error(message);
      }
    }
  );

  const logout = () => {
    // Clear stored data
    localStorage.removeItem('degas_token');
    localStorage.removeItem('degas_refresh_token');
    localStorage.removeItem('degas_admin');
    localStorage.removeItem('degas_user');
    localStorage.removeItem('degas_core_token');
    
    // Update state
    setAdmin(null);
    setUser(null);
    setIsAuthenticated(false);
    
    // Clear query cache
    queryClient.clear();
    
    console.log('🚪 User logged out');
    toast.success('Logged out successfully');
  };

  const restoreSession = async () => {
    // This allows external code to restore the session
    const token = localStorage.getItem('degas_token');
    const storedAdmin = localStorage.getItem('degas_admin');
    const storedUser = localStorage.getItem('degas_user');
    
    if (token) {
      if (storedAdmin) {
        setAdmin(JSON.parse(storedAdmin));
        setIsAuthenticated(true);
      } else if (storedUser) {
        setUser(JSON.parse(storedUser));
        setIsAuthenticated(true);
      }
    }
  };

  const userRole = admin?.role || user?.role || null;

  const value: AuthContextType = {
    admin,
    user,
    isAuthenticated: isAuthenticated && isSessionRestored,
    isLoading: loginMutation.isLoading || !isSessionRestored,
    userRole,
    login: async (username: string, password: string) => {
      await loginMutation.mutateAsync({ username, password });
    },
    logout,
    restoreSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}