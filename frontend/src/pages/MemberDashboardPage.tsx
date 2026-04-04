import { useState, useEffect } from 'react';
import { QrCode, Calendar, Download, Scan } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

export function MemberDashboardPage() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const response = await api.get('/user/dashboard');
      setDashboard(response.data.data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-white">Loading...</div>;
  }

  if (!dashboard) {
    return <div className="p-8 text-red-400">Failed to load dashboard</div>;
  }

  const { user, profile, qrCode, attendance } = dashboard;

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">My Dashboard</h1>
        <button
          onClick={() => navigate('/mark-attendance')}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
        >
          <Scan size={20} />
          Mark Attendance
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4">Profile</h2>
          <div className="space-y-2">
            <p className="text-gray-400">Email: <span className="text-white">{user.email}</span></p>
            {profile?.data?.fullName && (
              <p className="text-gray-400">Name: <span className="text-white">{profile.data.fullName}</span></p>
            )}
            {profile?.data?.studentId && (
              <p className="text-gray-400">ID: <span className="text-white">{profile.data.studentId}</span></p>
            )}
            {profile?.data?.phone && (
              <p className="text-gray-400">Phone: <span className="text-white">{profile.data.phone}</span></p>
            )}
          </div>
        </div>

        {/* QR Code Card */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <QrCode size={24} />
            My QR Code
          </h2>
          {qrCode?.image ? (
            <div className="text-center">
              <img src={qrCode.image} alt="QR Code" className="w-48 h-48 mx-auto bg-white p-2 rounded" />
              <button
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = qrCode.image;
                  link.download = 'my-qr-code.png';
                  link.click();
                }}
                className="mt-4 flex items-center gap-2 justify-center w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded"
              >
                <Download size={18} />
                Download QR Code
              </button>
            </div>
          ) : (
            <p className="text-gray-400">QR code not available</p>
          )}
        </div>

        {/* Attendance Stats Card */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Calendar size={24} />
            Attendance Stats
          </h2>
          <div className="space-y-3">
            <div>
              <p className="text-gray-400 text-sm">Total Sessions</p>
              <p className="text-2xl font-bold text-white">{attendance?.stats?.totalSessions || 0}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Attended</p>
              <p className="text-2xl font-bold text-green-400">{attendance?.stats?.attended || 0}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Missed</p>
              <p className="text-2xl font-bold text-red-400">{attendance?.stats?.missed || 0}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Attendance Rate</p>
              <p className="text-2xl font-bold text-blue-400">{attendance?.stats?.attendanceRate || 0}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Attendance History */}
      <div className="mt-6 bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-xl font-semibold text-white mb-4">Attendance History</h2>
        {attendance?.history && attendance.history.length > 0 ? (
          <div className="space-y-2">
            {attendance.history.map((record: any, index: number) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-700 rounded">
                <div>
                  <p className="text-white font-medium">{record.session_name}</p>
                  <p className="text-gray-400 text-sm">{new Date(record.checked_in_at).toLocaleString()}</p>
                </div>
                <span className="px-3 py-1 bg-green-600 text-white text-sm rounded">Present</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400">No attendance records yet</p>
        )}
      </div>
    </div>
  );
}
