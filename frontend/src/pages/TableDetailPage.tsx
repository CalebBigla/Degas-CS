import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Search, Edit2, Trash2, Download, Settings } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { UserModal } from '../components/users/UserModal';
import { TableIDCardCustomizationModal } from '../components/settings/TableIDCardCustomizationModal';
import api from '../lib/api';
import toast from 'react-hot-toast';

interface TableUser {
  id: string;
  uuid: string;
  data: Record<string, any>;
  photoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface Table {
  id: string;
  name: string;
  description?: string;
  schema: Array<{
    id: string;
    name: string;
    type: string;
    required: boolean;
  }>;
}

export function TableDetailPage() {
  const { tableId } = useParams<{ tableId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isCustomizationModalOpen, setIsCustomizationModalOpen] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);

  // Fetch table details
  const { data: table, isLoading: tableLoading } = useQuery<Table>(
    ['table', tableId],
    async () => {
      const response = await api.get(`/tables/${tableId}`);
      return response.data.data;
    }
  );

  // Fetch table users
  const { data: usersData, isLoading: usersLoading } = useQuery<{ data: TableUser[]; total: number }>(
    ['tableUsers', tableId, searchTerm],
    async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      
      const response = await api.get(`/tables/${tableId}/users?${params}`);
      return response.data.data;
    }
  );

  // Delete user mutation
  const deleteUserMutation = useMutation(
    async (userId: string) => {
      await api.delete(`/tables/${tableId}/users/${userId}`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['tableUsers', tableId]);
        toast.success('User deleted successfully');
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.error || 'Failed to delete user');
      }
    }
  );

  // Generate ID card mutation
  const generateIDCardMutation = useMutation(
    async (userId: string) => {
      const response = await api.post(`/tables/${tableId}/users/${userId}/card/custom`, {
        format: 'pdf',
        options: {
          visibleFields: {
            name: true,
            role: true,
            department: true,
            email: true,
            photo: true,
            tableName: true
          },
          layout: 'standard',
          theme: 'light'
        }
      }, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `id-card-${userId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      // Log instructions for manual QR testing
      console.log('📝 ID Card Generated! To test scanner manually:');
      console.log('1. Open Scanner page and switch to "Manual Entry" mode');
      console.log('2. Check backend logs for QR data:');
      console.log('   Get-Content backend/logs/combined.log -Tail 20');
      console.log('3. Look for "QR code generated and stored" message');
      console.log('4. Or query database: SELECT qr_data FROM qr_codes WHERE user_id = ? ORDER BY created_at DESC LIMIT 1');
      console.log('5. Paste the QR data (base64 string) in manual entry field');
    },
    {
      onSuccess: () => {
        toast.success('ID card generated successfully');
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.error || 'Failed to generate ID card');
      }
    }
  );

  const users = usersData?.data || [];
  const safeUsers = Array.isArray(users) ? users : [];

  const filteredUsers = safeUsers.filter(user => {
    const userData = user.data;
    const searchLower = searchTerm.toLowerCase();
    
    return Object.values(userData).some(value => 
      String(value).toLowerCase().includes(searchLower)
    );
  });

  const handleAddUser = () => {
    setSelectedUser(null);
    setIsUserModalOpen(true);
  };

  const handleEditUser = (user: TableUser) => {
    setSelectedUser({
      id: user.id,
      ...user.data,
      photoUrl: user.photoUrl
    });
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async (userData: any) => {
    try {
      const formData = new FormData();
      formData.append('data', JSON.stringify(userData));
      
      if (userData.photo) {
        formData.append('photo', userData.photo);
      }

      if (selectedUser) {
        await api.put(`/tables/${tableId}/users/${selectedUser.id}`, formData);
        toast.success('User updated successfully');
      } else {
        await api.post(`/tables/${tableId}/users`, formData);
        toast.success('User created successfully');
      }
      
      queryClient.invalidateQueries(['tableUsers', tableId]);
      setIsUserModalOpen(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to save user');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      await deleteUserMutation.mutateAsync(userId);
    }
  };

  const handleGenerateIDCard = async (userId: string) => {
    await generateIDCardMutation.mutateAsync(userId);
  };

  const handleSelectAll = () => {
    if (selectedUserIds.size === filteredUsers.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(filteredUsers.map(u => u.id)));
    }
  };

  const handleSelectUser = (userId: string) => {
    const newSelected = new Set(selectedUserIds);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUserIds(newSelected);
  };

  const handleBulkGenerateIDCards = async () => {
    if (selectedUserIds.size === 0) {
      toast.error('Please select at least one user');
      return;
    }

    setIsBulkGenerating(true);
    try {
      const response = await api.post(`/tables/${tableId}/bulk-cards`, {
        userIds: Array.from(selectedUserIds),
        format: 'pdf'
      }, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `bulk-id-cards-${Date.now()}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success(`Generated ${selectedUserIds.size} ID cards successfully`);
      setSelectedUserIds(new Set());
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to generate bulk ID cards');
    } finally {
      setIsBulkGenerating(false);
    }
  };

  if (tableLoading || usersLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!table) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Table not found</p>
        <button
          onClick={() => navigate('/tables')}
          className="mt-4 text-emerald hover:text-emerald/80"
        >
          Back to Tables
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/tables')}
            className="p-2 text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-charcoal">{table.name}</h1>
            {table.description && (
              <p className="text-gray-600 mt-1">{table.description}</p>
            )}
            <p className="text-sm text-gray-500 mt-1">
              {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'}
              {selectedUserIds.size > 0 && ` • ${selectedUserIds.size} selected`}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {selectedUserIds.size > 0 && (
            <button
              onClick={handleBulkGenerateIDCards}
              disabled={isBulkGenerating}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-4 w-4" />
              <span>{isBulkGenerating ? 'Generating...' : `Generate ${selectedUserIds.size} ID Cards`}</span>
            </button>
          )}
          <button
            onClick={() => setIsCustomizationModalOpen(true)}
            className="flex items-center space-x-2 bg-deep-blue text-white px-4 py-2 rounded-lg hover:bg-navy-blue transition-colors"
          >
            <Settings className="h-4 w-4" />
            <span>Customize ID Cards</span>
          </button>
          <button
            onClick={handleAddUser}
            className="flex items-center space-x-2 bg-emerald text-white px-4 py-2 rounded-lg hover:bg-emerald/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-6">
                  <input
                    type="checkbox"
                    checked={selectedUserIds.size === filteredUsers.length && filteredUsers.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-emerald bg-gray-100 border-gray-300 rounded focus:ring-emerald focus:ring-2"
                  />
                </th>
                <th className="text-left py-3 px-6 font-medium text-gray-700">Photo</th>
                {table.schema.slice(0, 4).map((column) => (
                  <th key={column.id} className="text-left py-3 px-6 font-medium text-gray-700">
                    {column.name}
                  </th>
                ))}
                <th className="text-right py-3 px-6 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="py-4 px-6">
                    <input
                      type="checkbox"
                      checked={selectedUserIds.has(user.id)}
                      onChange={() => handleSelectUser(user.id)}
                      className="w-4 h-4 text-emerald bg-gray-100 border-gray-300 rounded focus:ring-emerald focus:ring-2"
                    />
                  </td>
                  <td className="py-4 px-6">
                    {user.photoUrl ? (
                      <img
                        src={user.photoUrl}
                        alt="User"
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                        <span className="text-gray-600 font-medium text-sm">
                          {String(user.data[table.schema[0]?.name] || '?').charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </td>
                  {table.schema.slice(0, 4).map((column) => (
                    <td key={column.id} className="py-4 px-6 text-gray-900">
                      {String(user.data[column.name] || '-')}
                    </td>
                  ))}
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-end space-x-2">
                      {/* Edit Button */}
                      <button
                        onClick={() => handleEditUser(user)}
                        className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit User"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      
                      {/* Download ID Card Button */}
                      <button
                        onClick={() => handleGenerateIDCard(user.id)}
                        className="p-2 text-emerald hover:text-emerald/80 hover:bg-emerald/10 rounded-lg transition-colors"
                        title="Download ID Card"
                        disabled={generateIDCardMutation.isLoading}
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      
                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="p-2 text-crimson hover:text-crimson/80 hover:bg-crimson/10 rounded-lg transition-colors"
                        title="Delete User"
                        disabled={deleteUserMutation.isLoading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600">No users found</p>
            <button
              onClick={handleAddUser}
              className="mt-4 text-emerald hover:text-emerald/80"
            >
              Add your first user
            </button>
          </div>
        )}
      </div>

      {/* User Modal */}
      <UserModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        user={selectedUser}
        onSave={handleSaveUser}
        tableSchema={table.schema}
      />

      {/* ID Card Customization Modal */}
      <TableIDCardCustomizationModal
        isOpen={isCustomizationModalOpen}
        onClose={() => setIsCustomizationModalOpen(false)}
        tableId={tableId!}
        tableName={table.name}
        tableSchema={table.schema}
      />
    </div>
  );
}
