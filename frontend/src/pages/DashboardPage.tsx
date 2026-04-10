import { useState } from 'react';
import { Users, FileText, Clock, TableIcon, UserPlus, CheckCircle, XCircle } from 'lucide-react';
import { api } from '../lib/api';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { useQuery } from 'react-query';

interface DashboardStats {
  totalMembers: number;
  present: number;
  absent: number;
  programs: number;
}

interface RecentRegistration {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export function DashboardPage() {
  // Fetch dashboard stats
  const { data: statsData, isLoading: statsLoading } = useQuery<DashboardStats>(
    'dashboardStats',
    async () => {
      const response = await api.get('/analytics/dashboard-stats');
      return response.data.data;
    },
    {
      refetchInterval: 30000 // Refresh every 30 seconds
    }
  );

  // Fetch recent registrations
  const { data: recentRegistrations, isLoading: activityLoading } = useQuery<RecentRegistration[]>(
    'recentRegistrations',
    async () => {
      const response = await api.get('/analytics/recent-registrations?limit=10');
      return response.data.data || [];
    },
    {
      refetchInterval: 5000 // Refresh every 5 seconds for live updates
    }
  );

  // Count unread notifications (registrations in last 24 hours)
  const unreadCount = recentRegistrations?.filter(reg => {
    const regDate = new Date(reg.createdAt);
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return regDate > dayAgo;
  }).length || 0;

  const stats = statsData || { totalMembers: 0, present: 0, absent: 0, programs: 0 };
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
      title: 'Total Members',
      value: stats.totalMembers,
      change: '+0% from last week',
      icon: Users,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-50'
    },
    {
      title: 'Present',
      value: stats.present,
      change: `${stats.totalMembers > 0 ? Math.round((stats.present / stats.totalMembers) * 100) : 0}% attendance rate`,
      icon: CheckCircle,
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-50'
    },
    {
      title: 'Absent',
      value: stats.absent,
      change: `${stats.totalMembers > 0 ? Math.round((stats.absent / stats.totalMembers) * 100) : 0}% absent rate`,
      icon: XCircle,
      iconColor: 'text-red-600',
      iconBg: 'bg-red-50'
    },
    {
      title: 'Programs',
      value: stats.programs,
      change: 'Active programs',
      icon: TableIcon,
      iconColor: 'text-purple-600',
      iconBg: 'bg-purple-50'
    }
  ];

  const getActivityIcon = () => {
    return <UserPlus className="h-5 w-5 text-emerald" />;
  };

  const getActivityDescription = (registration: RecentRegistration) => {
    return `${registration.name} has completed registration`;
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
          ) : recentRegistrations && recentRegistrations.length > 0 ? (
            <div className="space-y-4">
              {recentRegistrations.slice(0, 5).map((registration, index) => (
                <div 
                  key={registration.id} 
                  className="flex items-start gap-4 pb-4 border-b border-border last:border-0 last:pb-0"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="p-2 rounded-lg bg-emerald-50">
                    {getActivityIcon()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      New registration
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {getActivityDescription(registration)}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatTimeAgo(registration.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <UserPlus className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium text-foreground mb-1">No recent activity</p>
              <p className="text-sm text-muted-foreground">
                New registrations will appear here
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}