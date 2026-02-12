import { useEffect, useState } from 'react';
import { Users, Activity, Upload, FileText, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { api } from '../lib/api';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  todayScans: number;
  successfulScans: number;
  recentActivity: Array<{
    id: string;
    userName: string;
    action: string;
    timestamp: string;
    status: 'granted' | 'denied';
  }>;
}

interface QuickUploadResult {
  success: boolean;
  tableName?: string;
  created?: number;
  errors?: Array<{ row: number; message: string }>;
  message?: string;
}

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<QuickUploadResult | null>(null);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/analytics/dashboard');
        setStats(response.data);
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0] && files[0].name.toLowerCase().endsWith('.csv')) {
      setUploadFile(files[0]);
      setUploadResult(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      setUploadFile(files[0]);
      setUploadResult(null);
    }
  };

  const handleQuickUpload = async () => {
    if (!uploadFile) return;

    setIsUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('file', uploadFile);

      const response = await api.post('/tables/auto/bulk-import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setUploadResult({
        success: true,
        tableName: response.data.data.tableName,
        created: response.data.data.created,
        errors: response.data.data.errors || [],
        message: response.data.data.message || response.data.message
      });

      try {
        const statsResponse = await api.get('/analytics/dashboard');
        setStats(statsResponse.data);
      } catch (statsError) {
        console.warn('Failed to refresh stats:', statsError);
      }

      window.dispatchEvent(new CustomEvent('tableCreated', {
        detail: {
          tableId: response.data.data.table?.id,
          tableName: response.data.data.tableName,
          created: response.data.data.created
        }
      }));

    } catch (error: any) {
      console.error('CSV upload error:', error);
      setUploadResult({
        success: false,
        message: error.response?.data?.error || error.message || 'Upload failed'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const resetUpload = () => {
    setUploadFile(null);
    setUploadResult(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Users',
      value: stats?.totalUsers || 0,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-gradient-to-br from-blue-100 to-blue-200',
      iconBg: 'bg-blue-500'
    },
    {
      title: 'Total Scanned',
      value: stats?.todayScans || 0,
      icon: Activity,
      color: 'text-purple-600',
      bgColor: 'bg-gradient-to-br from-purple-100 to-purple-200',
      iconBg: 'bg-purple-500'
    },
    {
      title: 'Total Access Granted',
      value: stats?.successfulScans || 0,
      icon: CheckCircle,
      color: 'text-emerald',
      bgColor: 'bg-gradient-to-br from-emerald/10 to-emerald/20',
      iconBg: 'bg-emerald'
    },
    {
      title: 'Total Access Denied',
      value: (stats?.todayScans || 0) - (stats?.successfulScans || 0),
      icon: AlertCircle,
      color: 'text-crimson',
      bgColor: 'bg-gradient-to-br from-crimson/10 to-crimson/20',
      iconBg: 'bg-crimson'
    }
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-charcoal">Dashboard</h1>
          <p className="text-gray-600 mt-2">Welcome back! Here's your system overview</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500 bg-white px-4 py-2 rounded-lg border border-gray-200">
          <Clock className="h-4 w-4 text-emerald" />
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Quick Upload Section */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-emerald/5 to-transparent border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald/10 rounded-lg shadow-sm">
              <Upload className="h-5 w-5 text-emerald" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-charcoal">Quick CSV Upload</h2>
              <p className="text-sm text-gray-600">Instantly create a new table from your CSV file</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          {!uploadResult ? (
            <div className="space-y-4">
              <div
                className={`border-2 border-dashed rounded-xl p-10 text-center transition-all duration-300 ${
                  dragActive
                    ? 'border-emerald bg-emerald/5 scale-105'
                    : 'border-gray-300 hover:border-emerald/50 hover:bg-gray-50'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <div className={`p-4 rounded-full transition-all duration-300 ${
                      dragActive ? 'bg-emerald/20 scale-110' : 'bg-gray-100'
                    }`}>
                      <Upload className={`h-12 w-12 ${dragActive ? 'text-emerald' : 'text-gray-400'}`} />
                    </div>
                  </div>
                  <div>
                    <p className="text-lg font-medium text-gray-700">
                      {dragActive ? 'Drop your file here!' : (
                        <>
                          Drop your CSV file here, or{' '}
                          <label className="text-emerald cursor-pointer hover:text-emerald/80 underline decoration-2 underline-offset-2">
                            browse
                            <input
                              type="file"
                              accept=".csv"
                              onChange={handleFileChange}
                              className="hidden"
                            />
                          </label>
                        </>
                      )}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      CSV files only • Auto-creates table from headers
                    </p>
                  </div>
                  {uploadFile && (
                    <div className="inline-flex items-center space-x-3 px-4 py-2 bg-emerald/10 rounded-lg border border-emerald/20">
                      <FileText className="h-5 w-5 text-emerald" />
                      <span className="font-medium text-gray-700">{uploadFile.name}</span>
                      <button
                        onClick={resetUpload}
                        className="text-crimson hover:text-crimson/80 font-bold text-lg"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {uploadFile && (
                <div className="flex justify-center">
                  <button
                    onClick={handleQuickUpload}
                    disabled={isUploading}
                    className="btn btn-primary px-8 py-3 text-base shadow-lg hover:shadow-xl"
                  >
                    {isUploading ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Creating Table...
                      </>
                    ) : (
                      <>
                        <Upload className="h-5 w-5 mr-2" />
                        Create Table from CSV
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className={`flex items-start space-x-4 p-5 rounded-xl ${
                uploadResult.success 
                  ? 'bg-gradient-to-r from-emerald/10 to-emerald/5 border-2 border-emerald/20' 
                  : 'bg-gradient-to-r from-crimson/10 to-crimson/5 border-2 border-crimson/20'
              }`}>
                <div className={`p-2 rounded-lg ${uploadResult.success ? 'bg-emerald/20' : 'bg-crimson/20'}`}>
                  {uploadResult.success ? (
                    <CheckCircle className="h-6 w-6 text-emerald" />
                  ) : (
                    <AlertCircle className="h-6 w-6 text-crimson" />
                  )}
                </div>
                <div className="flex-1">
                  <p className={`font-semibold text-lg ${uploadResult.success ? 'text-emerald' : 'text-crimson'}`}>
                    {uploadResult.message}
                  </p>
                  {uploadResult.success && (
                    <p className="text-gray-700 mt-1">
                      Table <span className="font-semibold">"{uploadResult.tableName}"</span> created with{' '}
                      <span className="font-semibold">{uploadResult.created}</span> users
                    </p>
                  )}
                </div>
              </div>

              {uploadResult.errors && uploadResult.errors.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <h4 className="font-semibold text-amber-900 mb-3 flex items-center">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Import Warnings ({uploadResult.errors.length})
                  </h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto scrollbar-thin">
                    {uploadResult.errors.slice(0, 5).map((error, index) => (
                      <div key={index} className="text-sm text-amber-800">
                        • Row {error.row}: {error.message}
                      </div>
                    ))}
                    {uploadResult.errors.length > 5 && (
                      <div className="text-sm text-amber-700 font-medium">
                        ... and {uploadResult.errors.length - 5} more warnings
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-center space-x-3 pt-2">
                <button
                  onClick={resetUpload}
                  className="btn btn-secondary"
                >
                  Upload Another File
                </button>
                <button
                  onClick={() => window.location.hash = '#tables'}
                  className="btn btn-primary"
                >
                  View All Tables →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => (
          <div 
            key={card.title} 
            className="card p-6 hover:scale-105 cursor-pointer group"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">{card.title}</p>
                <p className="text-4xl font-bold text-charcoal group-hover:scale-110 transition-transform">
                  {card.value}
                </p>
              </div>
              <div className={`p-4 rounded-xl ${card.bgColor} group-hover:scale-110 transition-transform shadow-sm`}>
                <card.icon className={`h-7 w-7 ${card.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-transparent border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-charcoal">Recent Activity</h2>
            <span className="text-sm text-gray-500">Last 10 events</span>
          </div>
        </div>
        <div className="p-6">
          {stats?.recentActivity && stats.recentActivity.length > 0 ? (
            <div className="space-y-3">
              {stats.recentActivity.map((activity, index) => (
                <div 
                  key={activity.id} 
                  className="flex items-center justify-between p-4 rounded-lg hover:bg-gradient-to-r hover:from-emerald/5 hover:to-transparent transition-all duration-200 border border-transparent hover:border-emerald/20"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-3 h-3 rounded-full ${
                      activity.status === 'granted' ? 'bg-emerald animate-pulse' : 'bg-crimson'
                    }`} />
                    <div>
                      <p className="font-semibold text-charcoal">{activity.userName}</p>
                      <p className="text-sm text-gray-600">{activity.action}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                      activity.status === 'granted' 
                        ? 'bg-emerald/10 text-emerald border border-emerald/20' 
                        : 'bg-crimson/10 text-crimson border border-crimson/20'
                    }`}>
                      {activity.status === 'granted' ? '✓ Granted' : '✗ Denied'}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Activity className="empty-state-icon" />
              <p className="empty-state-title">No recent activity</p>
              <p className="empty-state-description">
                Access logs will appear here when users scan QR codes
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}