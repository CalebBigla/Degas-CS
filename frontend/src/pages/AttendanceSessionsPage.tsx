import { useState, useEffect } from 'react';
import { Plus, QrCode, Users, Calendar, Clock } from 'lucide-react';
import api from '../lib/api';

interface Session {
  id: string;
  session_name: string;
  description?: string;
  start_time: string;
  end_time: string;
  grace_period_minutes: number;
  is_active: boolean;
  qr_code?: string;
}

export function AttendanceSessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState<string | null>(null);
  const [qrImage, setQrImage] = useState<string>('');

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const response = await api.get('/admin/sessions');
      setSessions(response.data.data);
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateQR = async (sessionId: string) => {
    try {
      const response = await api.get(`/admin/sessions/${sessionId}/qr`);
      setQrImage(response.data.data.qrImage);
      setShowQR(sessionId);
    } catch (error) {
      console.error('Failed to generate QR:', error);
    }
  };

  const viewAttendance = async (sessionId: string) => {
    try {
      const response = await api.get(`/admin/sessions/${sessionId}/attendance`);
      alert(`Attendance: ${response.data.data.attended}/${response.data.data.totalUsers} (${response.data.data.attendanceRate}%)`);
    } catch (error) {
      console.error('Failed to get attendance:', error);
    }
  };

  if (loading) {
    return <div className="p-8 text-white">Loading...</div>;
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Attendance Sessions</h1>
          <p className="text-gray-400 mt-1">Create and manage attendance sessions</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
          <Plus size={20} />
          Create Session
        </button>
      </div>

      <div className="grid gap-4">
        {sessions.map((session) => (
          <div key={session.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-semibold text-white">{session.session_name}</h3>
                  <span className={`px-2 py-1 rounded text-xs ${
                    session.is_active ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'
                  }`}>
                    {session.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {session.description && <p className="text-gray-400 mt-1">{session.description}</p>}
                
                <div className="flex gap-4 mt-3 text-sm text-gray-400">
                  <span className="flex items-center gap-1">
                    <Calendar size={16} />
                    {new Date(session.start_time).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={16} />
                    {new Date(session.start_time).toLocaleTimeString()} - {new Date(session.end_time).toLocaleTimeString()}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => generateQR(session.id)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
                >
                  <QrCode size={18} />
                  Show QR
                </button>
                <button
                  onClick={() => viewAttendance(session.id)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded"
                >
                  <Users size={18} />
                  Attendance
                </button>
              </div>
            </div>
          </div>
        ))}

        {sessions.length === 0 && (
          <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
            <p className="text-gray-400">No sessions created yet</p>
          </div>
        )}
      </div>

      {/* QR Code Modal */}
      {showQR && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowQR(null)}>
          <div className="bg-gray-800 p-8 rounded-lg max-w-md" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-4">Session QR Code</h3>
            <p className="text-gray-400 mb-4">Members scan this to check in</p>
            {qrImage && <img src={qrImage} alt="Session QR" className="w-full bg-white p-4 rounded" />}
            <button
              onClick={() => setShowQR(null)}
              className="mt-4 w-full bg-gray-700 hover:bg-gray-600 text-white py-2 rounded"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
