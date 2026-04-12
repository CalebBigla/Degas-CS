import { useState, useEffect } from 'react';
import { Search, Download, CheckCircle, XCircle, Eye, X, Users, UserCheck, UserX, Calendar, RefreshCw } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  scanned: boolean;
  scannedAt: string | null;
  formId: string;
}

interface Form {
  id: string;
  name: string;
}

type DateFilter = 'all' | 'today' | 'yesterday' | 'this-week' | 'last-week' | 'this-month' | 'custom';

export function AttendanceReportPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [forms, setForms] = useState<Form[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'absent'>('all');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Load forms on mount
  useEffect(() => {
    loadForms();
  }, []);

  // Load users when form is selected
  useEffect(() => {
    if (selectedFormId) {
      loadUsers();
    }
  }, [selectedFormId]);

  const loadForms = async () => {
    try {
      // Get forms from the forms table
      const response = await api.get('/admin/forms-tables');
      const formsData = response.data.data || [];
      
      // Filter to only show fixed_form types (from forms table)
      const fixedForms = formsData.filter((f: any) => f.type === 'fixed_form');
      setForms(fixedForms);
      
      // Auto-select first form if available
      if (fixedForms.length > 0 && !selectedFormId) {
        setSelectedFormId(fixedForms[0].id);
      }
    } catch (error) {
      console.error('Failed to load forms:', error);
      toast.error('Failed to load forms');
    }
  };

  const loadUsers = async () => {
    if (!selectedFormId) return;
    
    setLoading(true);
    try {
      const response = await api.get(`/form/users/${selectedFormId}`);
      setUsers(response.data.data || []);
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  // Filter users based on search, status, and date
  const filteredUsers = users.filter(user => {
    const matchesSearch = searchTerm.trim() === '' || 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'present' && user.scanned) ||
      (statusFilter === 'absent' && !user.scanned);
    
    // Date filter logic
    let matchesDate = true;
    
    if (dateFilter !== 'all') {
      // If user hasn't scanned (absent), include them when filtering by "Absent" status
      // This allows viewing "users who didn't scan last week" or "users who didn't scan this week"
      if (!user.scannedAt) {
        // Include absent users when:
        // 1. Status filter is "absent" or "all"
        // 2. This allows seeing who never scanned regardless of date range
        matchesDate = statusFilter === 'absent' || statusFilter === 'all';
      } else {
        // User has scanned - filter by their scan timestamp
        const scannedDate = new Date(user.scannedAt);
        const now = new Date();
        
        switch (dateFilter) {
          case 'today':
            matchesDate = scannedDate.toDateString() === now.toDateString();
            break;
          
          case 'yesterday':
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            matchesDate = scannedDate.toDateString() === yesterday.toDateString();
            break;
          
          case 'this-week':
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
            startOfWeek.setHours(0, 0, 0, 0);
            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday
            endOfWeek.setHours(23, 59, 59, 999);
            matchesDate = scannedDate >= startOfWeek && scannedDate <= endOfWeek;
            break;
          
          case 'last-week':
            const lastWeekStart = new Date(now);
            lastWeekStart.setDate(now.getDate() - now.getDay() - 7); // Last Sunday
            lastWeekStart.setHours(0, 0, 0, 0);
            const lastWeekEnd = new Date(lastWeekStart);
            lastWeekEnd.setDate(lastWeekStart.getDate() + 6); // Last Saturday
            lastWeekEnd.setHours(23, 59, 59, 999);
            matchesDate = scannedDate >= lastWeekStart && scannedDate <= lastWeekEnd;
            break;
          
          case 'this-month':
            matchesDate = scannedDate.getMonth() === now.getMonth() && 
                         scannedDate.getFullYear() === now.getFullYear();
            break;
          
          case 'custom':
            if (customStartDate && customEndDate) {
              const startDate = new Date(customStartDate);
              startDate.setHours(0, 0, 0, 0);
              const endDate = new Date(customEndDate);
              endDate.setHours(23, 59, 59, 999);
              matchesDate = scannedDate >= startDate && scannedDate <= endDate;
            }
            break;
        }
      }
    }
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  // Calculate stats
  const stats = {
    total: users.length,
    present: users.filter(u => u.scanned).length,
    absent: users.filter(u => !u.scanned).length
  };

  const handleExport = () => {
    const headers = ['Name', 'Phone', 'Email', 'Address', 'Status', 'Scanned At'];
    const rows = filteredUsers.map(user => [
      user.name,
      user.phone,
      user.email,
      user.address,
      user.scanned ? 'Present' : 'Absent',
      user.scannedAt ? new Date(user.scannedAt).toLocaleString() : 'N/A'
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const formName = forms.find(f => f.id === selectedFormId)?.name || 'attendance';
    a.download = `${formName.replace(/\s+/g, '_')}_attendance_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    toast.success('Attendance report exported');
  };

  const handleResetAll = async () => {
    // Confirm before resetting
    const confirmed = window.confirm(
      'Are you sure you want to reset ALL users to Absent? This action cannot be undone.'
    );
    
    if (!confirmed) return;
    
    setLoading(true);
    try {
      await api.post('/analytics/reset-attendance');
      toast.success('All users have been reset to Absent');
      // Reload users to reflect changes
      await loadUsers();
    } catch (error: any) {
      console.error('Failed to reset attendance:', error);
      toast.error(error?.response?.data?.error || 'Failed to reset attendance');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (scanned: boolean) => {
    if (scanned) {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
          <CheckCircle className="h-4 w-4 mr-1" />
          Present
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
        <XCircle className="h-4 w-4 mr-1" />
        Absent
      </span>
    );
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Attendance Report</h1>
        <p className="text-gray-600 mt-2">View and manage attendance records for your forms</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Registered</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl">
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Present</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{stats.present}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-xl">
              <UserCheck className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Absent</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{stats.absent}</p>
            </div>
            <div className="p-3 bg-red-50 rounded-xl">
              <UserX className="h-8 w-8 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {/* Form Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Form</label>
            <select
              value={selectedFormId}
              onChange={(e) => setSelectedFormId(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            >
              <option value="">Select a form...</option>
              {forms.map(form => (
                <option key={form.id} value={form.id}>{form.name}</option>
              ))}
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
            </select>
          </div>
        </div>

        {/* Date Filter Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Date Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="inline h-4 w-4 mr-1" />
              Date Filter
            </label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as DateFilter)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="this-week">This Week</option>
              <option value="last-week">Last Week</option>
              <option value="this-month">This Month</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {/* Custom Date Range - Start */}
          {dateFilter === 'custom' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>
            </>
          )}

          {/* Export and Reset Buttons */}
          <div className="flex items-end gap-3">
            <button
              onClick={handleExport}
              disabled={filteredUsers.length === 0}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={18} />
              Export
            </button>
            
            <button
              onClick={handleResetAll}
              disabled={loading || users.length === 0}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              title="Reset all users to Absent status"
            >
              <RefreshCw size={18} />
              Reset All
            </button>
          </div>
        </div>

        {/* Active Filters Display */}
        {(dateFilter !== 'all' || statusFilter !== 'all' || searchTerm) && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm text-gray-600">Active filters:</span>
              {statusFilter !== 'all' && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                  Status: {statusFilter === 'present' ? 'Present' : 'Absent'}
                  <button
                    onClick={() => setStatusFilter('all')}
                    className="ml-2 hover:text-blue-900"
                  >
                    <X size={14} />
                  </button>
                </span>
              )}
              {dateFilter !== 'all' && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-800">
                  Date: {dateFilter === 'custom' ? `${customStartDate} to ${customEndDate}` : dateFilter.replace('-', ' ')}
                  <button
                    onClick={() => {
                      setDateFilter('all');
                      setCustomStartDate('');
                      setCustomEndDate('');
                    }}
                    className="ml-2 hover:text-purple-900"
                  >
                    <X size={14} />
                  </button>
                </span>
              )}
              {searchTerm && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                  Search: "{searchTerm}"
                  <button
                    onClick={() => setSearchTerm('')}
                    className="ml-2 hover:text-green-900"
                  >
                    <X size={14} />
                  </button>
                </span>
              )}
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setDateFilter('all');
                  setSearchTerm('');
                  setCustomStartDate('');
                  setCustomEndDate('');
                }}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Clear all filters
              </button>
            </div>
            
            {/* Filter Explanation */}
            {dateFilter !== 'all' && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-900">
                  <strong>Filter Logic:</strong>
                  {statusFilter === 'present' && (
                    <> Showing users who <strong>scanned during {dateFilter === 'custom' ? 'the selected date range' : dateFilter.replace('-', ' ')}</strong></>
                  )}
                  {statusFilter === 'absent' && (
                    <> Showing users who <strong>never scanned</strong> (absent users have no timestamp, so they appear regardless of date range)</>
                  )}
                  {statusFilter === 'all' && (
                    <> Showing users who <strong>scanned during {dateFilter === 'custom' ? 'the selected date range' : dateFilter.replace('-', ' ')}</strong> + all users who <strong>never scanned</strong></>
                  )}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Attendance Table */}
      {loading ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-500">Loading attendance data...</p>
        </div>
      ) : !selectedFormId ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Please select a form to view attendance</p>
        </div>
      ) : filteredUsers.length > 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Phone</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Scanned At</th>
                <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-gray-200 hover:bg-gray-50 transition">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{user.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{user.phone}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{user.email}</td>
                  <td className="px-6 py-4">{getStatusBadge(user.scanned)}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {user.scannedAt ? new Date(user.scannedAt).toLocaleString() : '-'}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setShowDetailModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                      title="View details"
                    >
                      <Eye className="h-5 w-5 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-500">No users match your search criteria</p>
        </div>
      )}

      {/* User Details Modal */}
      {showDetailModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">{selectedUser.name}</h2>
                <p className="text-blue-100 mt-1">User Information</p>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Attendance Status */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Attendance Status</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  {getStatusBadge(selectedUser.scanned)}
                  {selectedUser.scannedAt && (
                    <p className="text-sm text-gray-600 mt-2">
                      Scanned at: {new Date(selectedUser.scannedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>

              {/* User Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-start pb-3 border-b border-gray-200">
                    <span className="font-medium text-gray-700">Name:</span>
                    <span className="text-gray-900">{selectedUser.name}</span>
                  </div>
                  <div className="flex justify-between items-start pb-3 border-b border-gray-200">
                    <span className="font-medium text-gray-700">Phone:</span>
                    <span className="text-gray-900">{selectedUser.phone}</span>
                  </div>
                  <div className="flex justify-between items-start pb-3 border-b border-gray-200">
                    <span className="font-medium text-gray-700">Email:</span>
                    <span className="text-gray-900">{selectedUser.email}</span>
                  </div>
                  <div className="flex justify-between items-start pb-3 border-b border-gray-200">
                    <span className="font-medium text-gray-700">Address:</span>
                    <span className="text-gray-900 text-right">{selectedUser.address}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
