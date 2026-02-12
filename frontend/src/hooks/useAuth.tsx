import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { Admin, LoginRequest, LoginResponse, ApiResponse } from '@gatekeeper/shared';
import api from '../lib/api';
import toast from 'react-hot-toast';

interface AuthContextType {
  admin: Admin | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const queryClient = useQueryClient();

  // Check for existing auth on mount
  useEffect(() => {
    // Clean up old localStorage keys from previous versions
    const oldKeys = ['gatekeeper_token', 'gatekeeper_refresh_token', 'gatekeeper_admin'];
    oldKeys.forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
      }
    });

    const token = localStorage.getItem('degas_token');
    const storedAdmin = localStorage.getItem('degas_admin');
    
    if (token && storedAdmin) {
      try {
        const adminData = JSON.parse(storedAdmin);
        setAdmin(adminData);
        setIsAuthenticated(true);
      } catch (error) {
        // Invalid stored data, clear it
        localStorage.removeItem('degas_token');
        localStorage.removeItem('degas_refresh_token');
        localStorage.removeItem('degas_admin');
      }
    }
  }, []);

  const loginMutation = useMutation<ApiResponse<LoginResponse>, Error, LoginRequest>(
    async (credentials) => {
      const response = await api.post('/auth/login', credentials);
      return response.data;
    },
    {
      onSuccess: (data) => {
        if (data.success && data.data) {
          const { token, refreshToken, admin: adminData } = data.data;
          
          // Store tokens and admin data
          localStorage.setItem('degas_token', token);
          localStorage.setItem('degas_refresh_token', refreshToken);
          localStorage.setItem('degas_admin', JSON.stringify(adminData));
          
          // Update state
          setAdmin(adminData as Admin);
          setIsAuthenticated(true);
          
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
    
    // Update state
    setAdmin(null);
    setIsAuthenticated(false);
    
    // Clear query cache
    queryClient.clear();
    
    toast.success('Logged out successfully');
  };

  const value: AuthContextType = {
    admin,
    isAuthenticated,
    isLoading: loginMutation.isLoading,
    login: async (username: string, password: string) => {
      await loginMutation.mutateAsync({ username, password });
    },
    logout,
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