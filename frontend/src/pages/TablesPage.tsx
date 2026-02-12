import { useState } from 'react';
import { Search, Upload, MoreHorizontal, Trash2, Users as UsersIcon, FolderOpen, Plus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { BulkUploadModal } from '../components/users/BulkUploadModal';
import { CreateTableModal } from '../components/tables/CreateTableModal';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface Table {
  id: string;
  name: string;
  description?: string;
  schema: any[];
  createdAt: string;
  updatedAt: string;
  userCount?: number;
}

export function TablesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [isCreateTableOpen, setIsCreateTableOpen] = useState(false);
  const [actionMenuTable, setActionMenuTable] = useState<string | null>(null);

  // Fetch tables
  const { data: tables = [], isLoading } = useQuery<Table[]>(
    'tables',
    async () => {
      const response = await api.get('/tables');
      return Array.isArray(response?.data?.data) ? response.data.data : [];
    },
    {
      retry: false,
      onError: (error: any) => {
        toast.error(error?.response?.data?.error || 'Failed to load tables');
      }
    }
  );

  // Delete table mutation
  const deleteTableMutation = useMutation(
    async (tableId: string) => {
      await api.delete(`/tables/${tableId}`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('tables');
        toast.success('Table deleted successfully');
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.error || 'Failed to delete table');
      }
    }
  );

  // Create table mutation
  const createTableMutation = useMutation(
    async (tableData: { name: string; description: string; schema: any[] }) => {
      const response = await api.post('/tables', tableData);
      return response.data.data;
    },
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries('tables');
        toast.success('Table created successfully!');
        setTimeout(() => {
          navigate(`/tables/${data.id}`);
        }, 500);
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.error || 'Failed to create table');
      }
    }
  );

  const safeTables = Array.isArray(tables) ? tables : [];
  
  const filteredTables = safeTables.filter(table =>
    table.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    table.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleViewTable = (tableId: string) => {
    navigate(`/tables/${tableId}`);
  };

  const handleDeleteTable = async (tableId: string) => {
    if (window.confirm('Are you sure you want to delete this table? All users in this table will be deleted.')) {
      await deleteTableMutation.mutateAsync(tableId);
    }
    setActionMenuTable(null);
  };

  const handleTableCreated = (tableId: string) => {
    queryClient.invalidateQueries('tables');
    toast.success('Table created successfully!');
    setTimeout(() => {
      navigate(`/tables/${tableId}`);
    }, 1000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-charcoal">Tables</h1>
          <p className="text-gray-600 mt-2">Manage access control tables and user groups</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsCreateTableOpen(true)}
            className="btn btn-secondary flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Create Table</span>
          </button>
          <button
            onClick={() => setIsBulkUploadOpen(true)}
            className="btn btn-primary flex items-center space-x-2"
          >
            <Upload className="h-4 w-4" />
            <span>Import CSV</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="card p-6">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search tables by name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>
        </div>
      </div>

      {/* Tables Grid */}
      {filteredTables.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTables.map((table) => (
            <div
              key={table.id}
              className="card p-6 cursor-pointer group"
              onClick={() => handleViewTable(table.id)}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="p-2 bg-emerald/10 rounded-lg group-hover:bg-emerald/20 transition-colors">
                      <FolderOpen className="h-5 w-5 text-emerald" />
                    </div>
                    <h3 className="text-lg font-semibold text-charcoal group-hover:text-emerald transition-colors">
                      {table.name}
                    </h3>
                  </div>
                  {table.description && (
                    <p className="text-sm text-gray-600 ml-11">{table.description}</p>
                  )}
                </div>
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setActionMenuTable(actionMenuTable === table.id ? null : table.id)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                  
                  {actionMenuTable === table.id && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 z-10 animate-fade-in">
                      <div className="py-1">
                        <button
                          onClick={() => handleViewTable(table.id)}
                          className="flex items-center space-x-2 w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <UsersIcon className="h-4 w-4" />
                          <span>View Users</span>
                        </button>
                        <button
                          onClick={() => handleDeleteTable(table.id)}
                          className="flex items-center space-x-2 w-full text-left px-4 py-2 text-sm text-crimson hover:bg-crimson/5 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span>Delete Table</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2 text-gray-600">
                  <UsersIcon className="h-4 w-4" />
                  <span className="font-medium">{table.userCount || 0}</span>
                  <span>users</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  Created {new Date(table.createdAt).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card p-12 text-center">
          <div className="inline-flex p-4 bg-gray-100 rounded-2xl mb-4">
            <FolderOpen className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No tables yet</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Get started by importing a CSV file to create your first access control table
          </p>
          <button
            onClick={() => setIsBulkUploadOpen(true)}
            className="btn btn-primary inline-flex items-center space-x-2"
          >
            <Upload className="h-4 w-4" />
            <span>Import CSV</span>
          </button>
        </div>
      )}

      {/* Bulk Upload Modal */}
      <BulkUploadModal
        isOpen={isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
        onTableCreated={handleTableCreated}
      />

      {/* Create Table Modal */}
      <CreateTableModal
        isOpen={isCreateTableOpen}
        onClose={() => setIsCreateTableOpen(false)}
        onSave={async (tableData) => {
          await createTableMutation.mutateAsync(tableData);
        }}
      />
    </div>
  );
}
