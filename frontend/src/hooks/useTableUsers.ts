import { useState, useEffect, useCallback } from 'react';

interface User {
  id: string;
  uuid: string;
  data: Record<string, any>;
  photoUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface UseTableUsersResult {
  users: User[];
  loading: boolean;
  error: string;
  totalPages: number;
  currentPage: number;
  refreshUsers: () => Promise<void>;
  createUser: (userData: any, photo?: File) => Promise<boolean>;
  updateUser: (userId: string, userData: any, photo?: File) => Promise<boolean>;
  deleteUser: (userId: string) => Promise<boolean>;
  setCurrentPage: (page: number) => void;
  setSearchTerm: (term: string) => void;
}

export const useTableUsers = (tableId: string): UseTableUsersResult => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchUsers = useCallback(async () => {
    if (!tableId) return;
    
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('degas_token');
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(searchTerm && { search: searchTerm })
      });
      
      const response = await fetch(`/api/tables/${tableId}/users?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      if (data.success) {
        setUsers(data.data.data || []);
        setTotalPages(data.data.totalPages || 1);
      } else {
        setError(data.error || 'Failed to fetch users');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  }, [tableId, currentPage, searchTerm]);

  const createUser = useCallback(async (userData: any, photo?: File): Promise<boolean> => {
    try {
      const token = localStorage.getItem('degas_token');
      const formData = new FormData();
      
      formData.append('data', JSON.stringify(userData));
      if (photo) {
        formData.append('photo', photo);
      }

      const response = await fetch(`/api/tables/${tableId}/users`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      const data = await response.json();
      if (data.success) {
        // Refresh users list to show the new user
        await fetchUsers();
        return true;
      } else {
        setError(data.error || 'Failed to create user');
        return false;
      }
    } catch (err) {
      setError('Failed to create user');
      return false;
    }
  }, [tableId, fetchUsers]);

  const updateUser = useCallback(async (userId: string, userData: any, photo?: File): Promise<boolean> => {
    try {
      const token = localStorage.getItem('degas_token');
      const formData = new FormData();
      
      formData.append('data', JSON.stringify(userData));
      if (photo) {
        formData.append('photo', photo);
      }

      const response = await fetch(`/api/tables/${tableId}/users/${userId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      const data = await response.json();
      if (data.success) {
        // Refresh users list to show the updated user
        await fetchUsers();
        return true;
      } else {
        setError(data.error || 'Failed to update user');
        return false;
      }
    } catch (err) {
      setError('Failed to update user');
      return false;
    }
  }, [tableId, fetchUsers]);

  const deleteUser = useCallback(async (userId: string): Promise<boolean> => {
    try {
      const token = localStorage.getItem('degas_token');
      const response = await fetch(`/api/tables/${tableId}/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        // Refresh users list to remove the deleted user
        await fetchUsers();
        return true;
      } else {
        setError(data.error || 'Failed to delete user');
        return false;
      }
    } catch (err) {
      setError('Failed to delete user');
      return false;
    }
  }, [tableId, fetchUsers]);

  const refreshUsers = useCallback(async () => {
    await fetchUsers();
  }, [fetchUsers]);

  // Fetch users when dependencies change
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Debounce search term
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (currentPage !== 1) {
        setCurrentPage(1); // Reset to first page when searching
      } else {
        fetchUsers();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  return {
    users,
    loading,
    error,
    totalPages,
    currentPage,
    refreshUsers,
    createUser,
    updateUser,
    deleteUser,
    setCurrentPage,
    setSearchTerm
  };
};