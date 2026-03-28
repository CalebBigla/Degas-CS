import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LogOut, QrCode, Clock } from 'lucide-react';
import { AccessCard } from '../components/AccessCard';
import api from '../lib/api';
import toast from 'react-hot-toast';

export function UserDashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [stats, setStats] = useState({
    totalSessions: 0,
    attended: 0,
    missed: 0,
    attendanceRate: 0
  });
  const [userQRImage, setUserQRImage] = useState<string | null>(null);
  const [recentCheckin, setRecentCheckin] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load dashboard stats
      const response = await api.get('/user/dashboard');
      const dashboardData = response.data.data;
      if (dashboardData?.attendance?.stats) {
        setStats(dashboardData.attendance.stats);
      }
      if (dashboardData?.attendance?.history && dashboardData.attendance.history.length > 0) {
        const recent = dashboardData.attendance.history[0];
        setRecentCheckin({
          sessionName: recent.session_name || 'Recent Session',
          checkinTime: recent.checkin_time || new Date()
        });
      }

      // Load user's QR code
      try {
        const qrResponse = await api.get('/user/qr-code');
        if (qrResponse.data.data?.qrImage) {
          setUserQRImage(qrResponse.data.data.qrImage);
        }
      } catch (qrError) {
        console.warn('Failed to load QR code:', qrError);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setStats({
        totalSessions: 0,
        attended: 0,
        missed: 0,
        attendanceRate: 0
      });
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Welcome, {user?.email}</h1>
            <p className="text-gray-400 mt-1">User Dashboard</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <div className="text-gray-400 text-sm mb-2">Total Sessions</div>
            <div className="text-3xl font-bold">{stats.totalSessions}</div>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <div className="text-gray-400 text-sm mb-2">Attended</div>
            <div className="text-3xl font-bold text-green-400">{stats.attended}</div>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <div className="text-gray-400 text-sm mb-2">Missed</div>
            <div className="text-3xl font-bold text-red-400">{stats.missed}</div>
          </div>
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <div className="text-gray-400 text-sm mb-2">Attendance Rate</div>
            <div className="text-3xl font-bold text-blue-400">{stats.attendanceRate.toFixed(1)}%</div>
          </div>
        </div>

        {/* Recent Check-in */}
        {recentCheckin && (
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 mb-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Clock size={20} />
              Recent Check-in
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-400 text-sm">Session Name</p>
                <p className="text-white font-medium">{recentCheckin.sessionName}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Check-in Time</p>
                <p className="text-white font-medium">
                  {new Date(recentCheckin.checkinTime).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <button
            onClick={() => navigate('/user/qr-scanner')}
            className="bg-blue-600 hover:bg-blue-700 p-6 rounded-lg flex items-center justify-center gap-3 text-lg font-medium"
          >
            <QrCode size={24} />
            Scan Session QR
          </button>
          <button
            onClick={() => navigate('/user/attendance-history')}
            className="bg-purple-600 hover:bg-purple-700 p-6 rounded-lg flex items-center justify-center gap-3 text-lg font-medium"
          >
            <Clock size={24} />
            Attendance History
          </button>
        </div>

        {/* Access Card Section */}
        {userQRImage && user && (
          <div className="bg-gray-800 p-8 rounded-lg border border-gray-700">
            <h2 className="text-2xl font-bold mb-6">Your Access Card</h2>
            <p className="text-gray-400 mb-6">
              Download and carry your access card. Admins can scan it to verify attendance if you cannot access your dashboard.
            </p>
            <AccessCard
              userId={user.id || 'Unknown'}
              fullName={user.email || 'User'}
              email={user.email || ''}
              phone={user.phone}
              qrImage={userQRImage}
              organizationName="DEGAS"
            />
          </div>
        )}
      </main>
    </div>
  );
}
