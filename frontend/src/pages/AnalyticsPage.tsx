import { useState, useEffect } from 'react';
import { Download, TrendingUp, Users, Clock, Shield } from 'lucide-react';
import { api } from '../lib/api';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

interface AnalyticsData {
  totalScans: number;
  successfulScans: number;
  failedScans: number;
  uniqueUsers: number;
  peakHours: Array<{ hour: number; count: number }>;
  dailyStats: Array<{ date: string; scans: number; success: number; failed: number }>;
  topUsers: Array<{ name: string; scans: number }>;
  recentLogs: Array<{
    id: string;
    userName: string;
    timestamp: string;
    status: 'granted' | 'denied';
    location: string;
  }>;
}

export function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7d');

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await api.get(`/analytics/logs?range=${dateRange}`);
        setData(response.data);
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnalytics();
  }, [dateRange]);

  const exportData = () => {
    // Implementation for exporting analytics data
    console.log('Exporting analytics data...');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const successRate = data ? Math.round((data.successfulScans / data.totalScans) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-charcoal">Analytics</h1>
          <p className="text-gray-600 mt-2">Access control system insights and reports</p>
        </div>
        <div className="flex space-x-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald focus:border-transparent"
          >
            <option value="1d">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
          <button
            onClick={exportData}
            className="flex items-center space-x-2 bg-emerald text-white px-4 py-2 rounded-lg hover:bg-emerald/90 transition-colors"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Scans</p>
              <p className="text-3xl font-bold text-charcoal mt-2">{data?.totalScans || 0}</p>
            </div>
            <div className="p-3 rounded-full bg-blue-50">
              <Shield className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Success Rate</p>
              <p className="text-3xl font-bold text-emerald mt-2">{successRate}%</p>
            </div>
            <div className="p-3 rounded-full bg-emerald/10">
              <TrendingUp className="h-6 w-6 text-emerald" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Unique Users</p>
              <p className="text-3xl font-bold text-charcoal mt-2">{data?.uniqueUsers || 0}</p>
            </div>
            <div className="p-3 rounded-full bg-purple-50">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Failed Attempts</p>
              <p className="text-3xl font-bold text-crimson mt-2">{data?.failedScans || 0}</p>
            </div>
            <div className="p-3 rounded-full bg-crimson/10">
              <Clock className="h-6 w-6 text-crimson" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Activity Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-charcoal mb-4">Daily Activity</h3>
          <div className="h-64 flex items-end justify-between space-x-2">
            {data?.dailyStats?.slice(-7).map((day, index) => (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div className="w-full bg-gray-200 rounded-t relative" style={{ height: '200px' }}>
                  <div
                    className="bg-emerald rounded-t absolute bottom-0 w-full"
                    style={{ height: `${(day.success / Math.max(...data.dailyStats.map(d => d.scans))) * 100}%` }}
                  />
                  <div
                    className="bg-crimson absolute bottom-0 w-full"
                    style={{ 
                      height: `${(day.failed / Math.max(...data.dailyStats.map(d => d.scans))) * 100}%`,
                      bottom: `${(day.success / Math.max(...data.dailyStats.map(d => d.scans))) * 100}%`
                    }}
                  />
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                </p>
              </div>
            ))}
          </div>
          <div className="flex justify-center space-x-4 mt-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-emerald rounded"></div>
              <span className="text-sm text-gray-600">Successful</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-crimson rounded"></div>
              <span className="text-sm text-gray-600">Failed</span>
            </div>
          </div>
        </div>

        {/* Top Users */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-charcoal mb-4">Most Active Users</h3>
          <div className="space-y-4">
            {data?.topUsers?.slice(0, 5).map((user, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-emerald/10 rounded-full flex items-center justify-center">
                    <span className="text-emerald font-medium text-sm">{index + 1}</span>
                  </div>
                  <span className="font-medium text-charcoal">{user.name}</span>
                </div>
                <span className="text-gray-600">{user.scans} scans</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-charcoal">Recent Access Logs</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-6 font-medium text-gray-700">User</th>
                <th className="text-left py-3 px-6 font-medium text-gray-700">Status</th>
                <th className="text-left py-3 px-6 font-medium text-gray-700">Location</th>
                <th className="text-left py-3 px-6 font-medium text-gray-700">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data?.recentLogs?.slice(0, 10).map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="py-4 px-6 font-medium text-charcoal">{log.userName}</td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      log.status === 'granted' 
                        ? 'bg-emerald/10 text-emerald' 
                        : 'bg-crimson/10 text-crimson'
                    }`}>
                      {log.status === 'granted' ? 'Access Granted' : 'Access Denied'}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-gray-600">{log.location}</td>
                  <td className="py-4 px-6 text-gray-600">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}