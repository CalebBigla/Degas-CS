import { useState } from 'react';
import { Search, Filter, Download, CheckCircle, XCircle, Clock, User, Table as TableIcon } from 'lucide-react';
import { useQuery } from 'react-query';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import api from '../lib/api';

interface AccessLog {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string;
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
  const [page, setPage] = useState(1);
  const limit = 20;

  // Fetch access logs
  const { data: logsData, isLoading } = useQuery<{ data: AccessLog[]; total: number }>(
    ['accessLogs', page, searchTerm, statusFilter],
    async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      
      const response = await api.get(`/analytics/access-logs?${params}`);
      return response.data.data;
    },
    {
      keepPreviousData: true,
    }
  );

  const logs = logsData?.data || [];
  const total = logsData?.total || 0;
  const totalPages = Math.ceil(total / limit);

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
          <h1 className="text-3xl font-bold text-charcoal">Access Logs</h1>
          <p className="text-gray-600 mt-2">Monitor all QR code scan activities and access attempts</p>
        </div>
        <button className="btn btn-secondary flex items-center space-x-2">
          <Download className="h-4 w-4" />
          <span>Export Logs</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Scans</p>
              <p className="text-3xl font-bold text-charcoal mt-2">{total}</p>
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
                {logs.filter(log => log.status === 'granted').length}
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
                {logs.filter(log => log.status === 'denied').length}
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
                          <p className="font-medium text-gray-900">{log.userName}</p>
                          <p className="text-sm text-gray-500">ID: {log.userId.substring(0, 8)}</p>
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
                        {log.qrId?.substring(0, 12) || log.id.substring(0, 12)}
                      </code>
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
    </div>
  );
}
