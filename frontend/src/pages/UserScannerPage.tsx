import { useState, useEffect } from 'react';
import { QrCode, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import api from '../lib/api';

export function UserScannerPage() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [recentAttendance, setRecentAttendance] = useState<any[]>([]);

  useEffect(() => {
    loadRecentAttendance();
  }, []);

  useEffect(() => {
    if (scanning) {
      const scanner = new Html5QrcodeScanner(
        'user-qr-reader',
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        false
      );

      scanner.render(onScanSuccess, onScanError);

      return () => {
        scanner.clear();
      };
    }
  }, [scanning]);

  const loadRecentAttendance = async () => {
    try {
      const response = await api.get('/user/attendance/recent');
      setRecentAttendance(response.data.data || []);
    } catch (error) {
      console.error('Failed to load recent attendance:', error);
    }
  };

  const onScanSuccess = async (decodedText: string) => {
    console.log('📱 Scanned QR code:', decodedText);
    setScanning(false);
    setError('');

    try {
      // Submit attendance by scanning location QR
      const response = await api.post('/user/attendance/checkin', {
        sessionQrData: decodedText
      });

      console.log('✅ Check-in response:', response.data);
      setResult(response.data.data);
      loadRecentAttendance();
    } catch (error: any) {
      console.error('❌ Check-in error:', error);
      const errorMsg = error.response?.data?.message || 'Failed to record attendance';
      setError(errorMsg);
      setResult(null);
    }
  };

  const onScanError = (errorMessage: string) => {
    // Ignore scan errors (they happen constantly while scanning)
  };

  const startScanning = () => {
    setScanning(true);
    setResult(null);
    setError('');
  };

  const stopScanning = () => {
    setScanning(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Mark Attendance</h1>
          <p className="text-gray-400">Scan the location QR code to check in</p>
        </div>

        {/* Scanner Section */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
          {!scanning && !result && !error && (
            <div className="text-center">
              <QrCode size={64} className="mx-auto text-blue-400 mb-4" />
              <p className="text-gray-300 mb-4">
                Scan the QR code displayed at the entrance
              </p>
              <button
                onClick={startScanning}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
              >
                Start Scanner
              </button>
            </div>
          )}

          {scanning && (
            <div>
              <div id="user-qr-reader" className="mb-4"></div>
              <button
                onClick={stopScanning}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg"
              >
                Stop Scanner
              </button>
            </div>
          )}

          {result && (
            <div className="text-center">
              <CheckCircle size={64} className="mx-auto text-green-400 mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">
                Attendance Recorded!
              </h2>
              <div className="bg-gray-700 rounded-lg p-4 mb-4">
                <p className="text-gray-300 mb-1">
                  <span className="font-semibold">Session:</span> {result.sessionName}
                </p>
                <p className="text-gray-300 mb-1">
                  <span className="font-semibold">Time:</span> {new Date(result.timestamp).toLocaleString()}
                </p>
                {result.status && (
                  <p className="text-gray-300">
                    <span className="font-semibold">Status:</span> {result.status}
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setResult(null);
                  setError('');
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
              >
                Scan Another
              </button>
            </div>
          )}

          {error && (
            <div className="text-center">
              <XCircle size={64} className="mx-auto text-red-400 mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Error</h2>
              <p className="text-red-400 mb-4">{error}</p>
              <button
                onClick={() => {
                  setError('');
                  setResult(null);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Recent Attendance */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Clock size={20} />
            Recent Attendance
          </h2>
          {recentAttendance.length > 0 ? (
            <div className="space-y-2">
              {recentAttendance.map((record: any, index: number) => (
                <div
                  key={index}
                  className="bg-gray-700 rounded p-3 flex justify-between items-center"
                >
                  <div>
                    <p className="text-white font-medium">{record.session_name}</p>
                    <p className="text-sm text-gray-400">
                      {new Date(record.check_in_time).toLocaleString()}
                    </p>
                  </div>
                  <CheckCircle size={20} className="text-green-400" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-4">No recent attendance records</p>
          )}
        </div>
      </div>
    </div>
  );
}
