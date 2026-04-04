import { useState } from 'react';
import { Plus, Search, Download, Upload, MoreHorizontal, Edit, Trash2, QrCode } from 'lucide-react';
import { useUsers } from '../hooks/useUsers';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { UserModal } from '../components/users/UserModal';
import { BulkUploadModal } from '../components/users/BulkUploadModal';
import { User } from '@gatekeeper/shared';

export function UsersPage() {
  const { users, isLoading, createUser, updateUser, deleteUser, generateQR, generateIDCard } = useUsers();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [actionMenuUser, setActionMenuUser] = useState<string | null>(null);

  // Ensure users is always an array before filtering
  const safeUsers = Array.isArray(users) ? users : [];
  
  const filteredUsers = safeUsers.filter(user =>
    user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.employeeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateUser = () => {
    setSelectedUser(null);
    setIsUserModalOpen(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsUserModalOpen(true);
    setActionMenuUser(null);
  };

  const handleSaveUser = async (userData: Partial<User>) => {
    if (selectedUser) {
      await updateUser({ ...userData, id: selectedUser.id });
    } else {
      await createUser(userData);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      await deleteUser(userId);
    }
    setActionMenuUser(null);
  };

  const handleGenerateQR = async (userId: string) => {
    await generateQR(userId);
    setActionMenuUser(null);
  };

  const handleGenerateIDCard = async (userId: string) => {
    await generateIDCard(userId);
    setActionMenuUser(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald/10 text-emerald border-emerald/20';
      case 'suspended':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'revoked':
        return 'bg-crimson/10 text-crimson border-crimson/20';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-charcoal">Users</h1>
          <p className="text-gray-600 mt-2">Manage user access and permissions</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setIsBulkUploadOpen(true)}
            className="flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Upload className="h-4 w-4" />
            <span>Bulk Upload</span>
          </button>
          <button
            onClick={handleCreateUser}
            className="flex items-center space-x-2 bg-emerald text-white px-4 py-2 rounded-lg hover:bg-emerald/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search users by name, ID, or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald focus:border-transparent"
            />
          </div>
          <button className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-6 font-medium text-gray-700">User</th>
                <th className="text-left py-3 px-6 font-medium text-gray-700">Employee ID</th>
                <th className="text-left py-3 px-6 font-medium text-gray-700">Role</th>
                <th className="text-left py-3 px-6 font-medium text-gray-700">Status</th>
                <th className="text-left py-3 px-6 font-medium text-gray-700">Created</th>
                <th className="text-right py-3 px-6 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-3">
                      {user.photoUrl ? (
                        <img
                          src={user.photoUrl}
                          alt={user.fullName}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-gray-600 font-medium text-sm">
                            {user.fullName.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-charcoal">{user.fullName}</p>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-gray-900">{user.employeeId}</td>
                  <td className="py-4 px-6">
                    <span className="capitalize text-gray-700">{user.role}</span>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(user.status)}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-gray-600">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="relative">
                      <button
                        onClick={() => setActionMenuUser(actionMenuUser === user.id ? null : user.id)}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                      
                      {actionMenuUser === user.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                          <div className="py-1">
                            <button
                              onClick={() => handleEditUser(user)}
                              className="flex items-center space-x-2 w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <Edit className="h-4 w-4" />
                              <span>Edit User</span>
                            </button>
                            <button
                              onClick={() => handleGenerateQR(user.id)}
                              className="flex items-center space-x-2 w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <QrCode className="h-4 w-4" />
                              <span>Generate QR</span>
                            </button>
                            <button
                              onClick={() => handleGenerateIDCard(user.id)}
                              className="flex items-center space-x-2 w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <Download className="h-4 w-4" />
                              <span>Download ID Card</span>
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="flex items-center space-x-2 w-full text-left px-4 py-2 text-sm text-crimson hover:bg-crimson/5"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span>Delete User</span>
                            </button>
                          </div>
                        </div>
                      )}
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
          </div>
        )}
      </div>

      {/* Modals */}
      <UserModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        user={selectedUser}
        onSave={handleSaveUser}
      />

      <BulkUploadModal
        isOpen={isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
      />
    </div>
  );
}