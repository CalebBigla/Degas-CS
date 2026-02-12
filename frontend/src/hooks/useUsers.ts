import { useState, useEffect, useCallback } from 'react';
import { User } from '@gatekeeper/shared';
import api from '../lib/api';
import toast from 'react-hot-toast';

interface UseUsersResult {
  users: User[];
  isLoading: boolean;
  error: string | null;
  createUser: (user: User) => Promise<void>;
  updateUser: (userId: string, user: User) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  generateQR: (userId: string) => Promise<void>;
  generateIDCard: (userId: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export const useUsers = (): UseUsersResult => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await api.get('/users');
      
      if (response.data.success && response.data.data) {
        setUsers(response.data.data);
      } else {
        setError(response.data.error || 'Failed to fetch users');
        setUsers([]);
      }
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to fetch users';
      setError(message);
      setUsers([]);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const createUser = useCallback(async (userData: User) => {
    try {
      const response = await api.post('/users', userData);
      
      if (response.data.success) {
        toast.success('User created successfully');
        await fetchUsers();
      } else {
        toast.error(response.data.error || 'Failed to create user');
      }
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to create user';
      toast.error(message);
    }
  }, [fetchUsers]);

  const updateUser = useCallback(async (userId: string, userData: User) => {
    try {
      const response = await api.put(`/users/${userId}`, userData);
      
      if (response.data.success) {
        toast.success('User updated successfully');
        await fetchUsers();
      } else {
        toast.error(response.data.error || 'Failed to update user');
      }
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to update user';
      toast.error(message);
    }
  }, [fetchUsers]);

  const deleteUser = useCallback(async (userId: string) => {
    try {
      const response = await api.delete(`/users/${userId}`);
      
      if (response.data.success) {
        toast.success('User deleted successfully');
        await fetchUsers();
      } else {
        toast.error(response.data.error || 'Failed to delete user');
      }
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to delete user';
      toast.error(message);
    }
  }, [fetchUsers]);

  const generateQR = useCallback(async (userId: string) => {
    try {
      const response = await api.post(`/users/${userId}/qr`);
      
      if (response.data.success) {
        toast.success('QR code generated successfully');
        await fetchUsers();
      } else {
        toast.error(response.data.error || 'Failed to generate QR code');
      }
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to generate QR code';
      toast.error(message);
    }
  }, [fetchUsers]);

  const generateIDCard = useCallback(async (userId: string) => {
    try {
      const response = await api.post(`/users/${userId}/id-card`, {}, {
        responseType: 'blob'
      });
      
      // Create a download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `id-card-${userId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      
      toast.success('ID card generated successfully');
    } catch (err: any) {
      const message = err.response?.data?.error || 'Failed to generate ID card';
      toast.error(message);
    }
  }, []);

  return {
    users,
    isLoading,
    error,
    createUser,
    updateUser,
    deleteUser,
    generateQR,
    generateIDCard,
    refetch: fetchUsers,
  };
};
