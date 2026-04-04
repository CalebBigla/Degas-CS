import { useState } from 'react';
import { Search, Filter, Download, CheckCircle, XCircle, Clock, User, TableIcon, Eye, X, RefreshCw } from 'lucide-react';
import { useQuery } from 'react-query';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import api from '../lib/api';

interface AccessLog {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  userData?: string; // JSON string of user data
  tableId: string;
  tableName: string;
  status: 'granted' | 'denied';
  timestamp: string;
  scanLocation?: string;
  qrId?: string;
}

export function AccessLogsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'granted' | 'denied'>('all');
  const [tableFilter, setTableFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<AccessLog | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const limit = 20;

  // Fetch tables for filter dropdown
  const { data: tablesData } = useQuery('tables', async () => {
    const response = await api.get('/tables');
    return response.data.data;
  });

  const tables = tablesData || [];

  // Fetch access logs with auto-refresh
  const { data: logsData, isLoading, refetch } = useQuery<{ data: AccessLog[]; total: number; stats: { totalScans: number; grantedScans: number; deniedScans: number } }>(
    ['accessLogs', page, searchTerm, statusFilter, tableFilter],
    async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (tableFilter !== 'all') params.append('tableId', tableFilter);
      
      const response = await api.get(`/analytics/access-logs?${params}`);
      return response.data.data;
    },
    {
      keepPreviousData: true,
      refetchInterval: 5000, // Auto-refresh every 5 seconds for live feed
    }
  );

  const logs = logsData?.data || [];
  const total = logsData?.total || 0;
  const stats = logsData?.stats || { totalScans: 0, grantedScans: 0, deniedScans: 0 };
  const totalPages = Math.ceil(total / limit);

  const handleExportLogs = async () => {
    try {
      // Fetch all logs without pagination for export
      const params = new URLSearchParams({
        page: '1',
        limit: '10000', // Get up to 10k records for export
      });
      
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      
      const response = await api.get(`/analytics/access-logs?${params}`);
      const allLogs = response.data.data?.data || [];

      // Create CSV content
      const headers = ['User Name', 'User ID', 'Table', 'Status', 'Scan Timestamp', 'Scan Location', 'QR ID'];
      const rows = allLogs.map((log: AccessLog) => [
        log.userName || 'Unknown',
        log.userId?.substring(0, 8) || 'N/A',
        log.tableName || 'N/A',
        log.status === 'granted' ? 'ACCESS GRANTED' : 'ACCESS DENIED',
        new Date(log.timestamp).toLocaleString(),
        log.scanLocation || 'N/A',
        log.qrId?.substring(0, 12) || 'N/A'
      ]);

      // Create CSV blob
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `access-logs-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export logs. Please try again.');
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'granted') {
      return (
        <span className="badge badge-success">
          <CheckCircle className="h-3 w-3 mr-1" />
          ACCESS GRANTED
        </span>
      );
    }
    return (
      <span className="badge badge-danger">
        <XCircle className="h-3 w-3 mr-1" />
        ACCESS DENIED
      </span>
    );
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };
  };

  if (isLoading && !logs.length) {
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
          <div className="flex items-center space-x-3">
            <h1 className="text-3xl font-bold text-charcoal">Access Logs</h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald/10 text-emerald">
              <span className="w-2 h-2 bg-emerald rounded-full mr-1.5 animate-pulse"></span>
              Live
            </span>
          </div>
          <p className="text-gray-600 mt-2">Monitor all QR code scan activities and access attempts • Auto-refreshes every 5 seconds</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => refetch()}
            className="btn btn-ghost flex items-center space-x-2"
            title="Refresh logs"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button 
            onClick={handleExportLogs}
            className="btn btn-secondary flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Export Logs</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Scans</p>
              <p className="text-3xl font-bold text-charcoal mt-2">{stats.totalScans}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl">
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Access Granted</p>
              <p className="text-3xl font-bold text-emerald mt-2">
                {stats.grantedScans}
              </p>
            </div>
            <div className="p-3 bg-emerald/10 rounded-xl">
              <CheckCircle className="h-8 w-8 text-emerald" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Access Denied</p>
              <p className="text-3xl font-bold text-crimson mt-2">
                {stats.deniedScans}
              </p>
            </div>
            <div className="p-3 bg-crimson/10 rounded-xl">
              <XCircle className="h-8 w-8 text-crimson" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search by user name, table, or scan ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input pl-10"
            />
          </div>

          {/* Table/Group Filter */}
          <div className="flex items-center space-x-2">
            <TableIcon className="h-5 w-5 text-gray-400" />
            <select
              value={tableFilter}
              onChange={(e) => setTableFilter(e.target.value)}
              className="input w-48"
            >
              <option value="all">All Tables</option>
              {tables.map((table: any) => (
                <option key={table.id} value={table.id}>
                  {table.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="input w-48"
            >
              <option value="all">All Status</option>
              <option value="granted">Access Granted</option>
              <option value="denied">Access Denied</option>
            </select>
          </div>
        </div>
      </div>

      {/* Access Logs Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-modern">
            <thead>
              <tr>
                <th>User</th>
                <th>Table/Group</th>
                <th>Status</th>
                <th>Timestamp</th>
                <th>Scan ID</th>
                <th style={{textAlign: 'center'}}>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const { date, time } = formatTimestamp(log.timestamp);
                return (
                  <tr key={log.id}>
                    <td>
                      <div className="flex items-center space-x-3">
                        {log.userPhoto ? (
                          <img
                            src={log.userPhoto}
                            alt={log.userName}
                            className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-100"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald to-emerald/70 flex items-center justify-center ring-2 ring-gray-100">
                            <User className="h-5 w-5 text-white" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{log.userName || 'Unknown User'}</p>
                          <p className="text-sm text-gray-500">ID: {log.userId?.substring(0, 8) || 'N/A'}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center space-x-2">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          <TableIcon className="h-4 w-4 text-gray-600" />
                        </div>
                        <span className="font-medium text-gray-900">{log.tableName}</span>
                      </div>
                    </td>
                    <td>{getStatusBadge(log.status)}</td>
                    <td>
                      <div>
                        <p className="font-medium text-gray-900">{date}</p>
                        <p className="text-sm text-gray-500">{time}</p>
                      </div>
                    </td>
                    <td>
                      <code className="px-2 py-1 bg-gray-100 rounded text-xs font-mono text-gray-700">
                        {log.qrId?.substring(0, 12) || (typeof log.id === 'string' ? log.id.substring(0, 12) : String(log.id).substring(0, 12))}
                      </code>
                    </td>
                    <td style={{textAlign: 'center'}}>
                      <button
                        onClick={() => {
                          setSelectedLog(log);
                          setShowDetailModal(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                        title="View user details"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {logs.length === 0 && (
          <div className="text-center py-12">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No access logs yet</h3>
            <p className="text-gray-600">
              Access logs will appear here when QR codes are scanned
            </p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} logs
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn btn-ghost disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                        page === pageNum
                          ? 'bg-emerald text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn btn-ghost disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User Details Modal */}
      {showDetailModal && selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {selectedLog.userPhoto ? (
                  <img
                    src={selectedLog.userPhoto}
                    alt={selectedLog.userName}
                    className="w-16 h-16 rounded-full object-cover ring-4 ring-white"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center ring-4 ring-white">
                    <User className="h-8 w-8 text-white" />
                  </div>
                )}
                <div>
                  <h2 className="text-2xl font-bold">{selectedLog.userName}</h2>
                  <p className="text-blue-100">User ID: {selectedLog.userId}</p>
                </div>
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
              {/* Scan Information */}
              <div>
                <h3 className="text-lg font-semibold text-charcoal mb-4">Scan Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Table/Group</p>
                    <p className="font-semibold text-gray-900">{selectedLog.tableName}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Status</p>
                    <div>{getStatusBadge(selectedLog.status)}</div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Scan Time</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(selectedLog.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Scan Location</p>
                    <p className="font-semibold text-gray-900">{selectedLog.scanLocation || 'Not specified'}</p>
                  </div>
                </div>
              </div>

              {/* User Data Fields */}
              {selectedLog.userData && (
                <div>
                  <h3 className="text-lg font-semibold text-charcoal mb-4">User Information</h3>
                  <div className="space-y-3">
                    {Object.entries(
                      typeof selectedLog.userData === 'string' 
                        ? JSON.parse(selectedLog.userData) 
                        : selectedLog.userData
                    ).map(([key, value]) => {
                      // Skip empty or empty object values
                      if (value === null || value === undefined || value === '' || (typeof value === 'object' && Object.keys(value).length === 0)) {
                        return null;
                      }
                      return (
                        <div key={key} className="flex justify-between items-start pb-3 border-b border-gray-200">
                          <span className="font-medium text-gray-700 capitalize">{key}:</span>
                          <span className="text-gray-600 text-right break-words">{String(value)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* QR Code Information */}
              <div>
                <h3 className="text-lg font-semibold text-charcoal mb-4">QR Code Information</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 mb-2">QR Code ID</p>
                  <code className="text-sm font-mono text-gray-900 break-all">{selectedLog.qrId}</code>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowDetailModal(false)}
                className="btn btn-primary"
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
