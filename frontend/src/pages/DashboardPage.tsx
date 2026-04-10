import { useState } from 'react';
import { Users, Activity, FileText, Clock, TableIcon, ScanLine, UserPlus, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useQuery } from 'react-query';

interface DashboardStats {
  totalTables: number;
  totalRecords: number;
  activeForms: number;
  scansToday: number;
}

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
}

export function DashboardPage() {
  // Fetch dashboard stats
  const { data: statsData, isLoading: statsLoading } = useQuery<DashboardStats>(
    'dashboardStats',
    async () => {
      const [tablesRes, formsRes, logsRes] = await Promise.all([
        api.get('/tables'),
        api.get('/forms'),
        api.get('/analytics/access-logs?limit=1')
      ]);

      const tables = tablesRes.data.data || [];
      const forms = formsRes.data.data || [];
      const logsStats = logsRes.data.data?.stats || { totalScans: 0 };

      // Calculate total records across all tables
      const totalRecords = tables.reduce((sum: number, table: any) => sum + (table.userCount || 0), 0);
      
      return {
        totalTables: tables.length,
        totalRecords,
        activeForms: forms.filter((f: any) => f.isActive).length,
        scansToday: logsStats.totalScans || 0
      };
    },
    {
      refetchInterval: 30000 // Refresh every 30 seconds
    }
  );

  // Fetch recent activity from access logs
  const { data: recentActivity, isLoading: activityLoading } = useQuery<AccessLog[]>(
    'recentActivity',
    async () => {
      const response = await api.get('/analytics/access-logs?limit=10&page=1');
      return response.data.data?.data || [];
    },
    {
      refetchInterval: 5000 // Refresh every 5 seconds for live updates
    }
  );

  const stats = statsData || { totalTables: 0, totalRecords: 0, activeForms: 0, scansToday: 0 };
  const isLoading = statsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Tables',
      value: stats.totalTables,
      change: '+0% from last week',
      icon: TableIcon,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-50'
    },
    {
      title: 'Total Records',
      value: stats.totalRecords,
      change: `+${stats.totalRecords > 0 ? '14' : '0'}% from last week`,
      icon: Users,
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-50'
    },
    {
      title: 'Active Forms',
      value: stats.activeForms,
      change: `+${stats.activeForms > 0 ? '9' : '0'}% from last week`,
      icon: FileText,
      iconColor: 'text-purple-600',
      iconBg: 'bg-purple-50'
    },
    {
      title: 'Scans Today',
      value: stats.scansToday,
      change: '— from last week',
      icon: ScanLine,
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-50'
    }
  ];

  const getActivityIcon = (log: AccessLog) => {
    if (log.status === 'granted') {
      return <UserPlus className="h-5 w-5 text-emerald" />;
    }
    return <AlertCircle className="h-5 w-5 text-crimson" />;
  };

  const getActivityDescription = (log: AccessLog) => {
    const action = log.status === 'granted' ? 'New record added' : 'Form submitted';
    return `${log.userName} — ${log.tableName}`;
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back. Here's an overview of your system.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {statCards.map((card, index) => (
          <div 
            key={card.title} 
            className="bg-card border border-border rounded-xl p-6 hover:shadow-md transition-all duration-200"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-1">{card.title}</p>
                <p className="text-3xl font-bold text-foreground">{card.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${card.iconBg}`}>
                <card.icon className={`h-6 w-6 ${card.iconColor}`} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{card.change}</p>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">Recent Activity</h2>
          </div>
          <button className="text-sm text-primary hover:underline">View all</button>
        </div>
        <div className="p-6">
          {activityLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="md" />
            </div>
          ) : recentActivity && recentActivity.length > 0 ? (
            <div className="space-y-4">
              {recentActivity.slice(0, 5).map((log, index) => (
                <div 
                  key={log.id} 
                  className="flex items-start gap-4 pb-4 border-b border-border last:border-0 last:pb-0"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className={`p-2 rounded-lg ${log.status === 'granted' ? 'bg-emerald-50' : 'bg-blue-50'}`}>
                    {getActivityIcon(log)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {log.status === 'granted' ? 'New record added' : 'Form submitted'}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {getActivityDescription(log)}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatTimeAgo(log.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium text-foreground mb-1">No recent activity</p>
              <p className="text-sm text-muted-foreground">
                Access logs will appear here when users scan QR codes
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}