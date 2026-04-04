import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LogOut, QrCode, CheckCircle, XCircle, Download, Camera, X } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../lib/api';
import toast from 'react-hot-toast';

export function UserDashboardPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [userData, setUserData] = useState<any>(null);
  const [qrCodeImage, setQrCodeImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [cameraError, setCameraError] = useState<string>('');

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    // Cleanup scanner on unmount
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  useEffect(() => {
    // Initialize scanner when showScanner becomes true
    if (showScanner && scanning && !scanResult) {
      initializeScanner();
    }
  }, [showScanner, scanning, scanResult]);

  const initializeScanner = async () => {
    // Wait a bit for DOM to be ready
    await new Promise(resolve => setTimeout(resolve, 200));

    try {
      // Check if element exists
      const element = document.getElementById('qr-reader');
      if (!element) {
        throw new Error('Scanner element not found. Please try again.');
      }

      // Initialize scanner
      const html5QrCode = new Html5Qrcode('qr-reader');
      scannerRef.current = html5QrCode;

      console.log('🎥 Starting camera...');

      // Start scanning
      await html5QrCode.start(
        { facingMode: 'environment' }, // Use back camera on mobile
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        },
        (decodedText) => {
          // Success callback
          console.log('📱 QR Code detected:', decodedText);
          handleScanSuccess(decodedText);
        },
        (errorMessage) => {
          // Error callback (fires continuously while scanning)
          // We can ignore these as they're just "no QR code found" messages
        }
      );

      console.log('✅ Camera started successfully');
    } catch (error: any) {
      console.error('❌ Camera error:', error);
      const errorMsg = error.message || 'Failed to access camera';
      setCameraError(errorMsg);
      toast.error(errorMsg);
      setScanning(false);
    }
  };

  const loadUserData = async () => {
    try {
      // Get user data from localStorage
      const storedUser = localStorage.getItem('degas_user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUserData(parsedUser);
        
        // Use QR code from login response if available
        if (parsedUser.qrCode) {
          setQrCodeImage(parsedUser.qrCode);
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      toast.error('Failed to load user data');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const downloadQRCode = () => {
    if (!qrCodeImage) return;
    
    const link = document.createElement('a');
    link.href = qrCodeImage;
    link.download = `qr-code-${userData?.name || 'user'}.png`;
    link.click();
    toast.success('QR code downloaded');
  };

  const startScanner = () => {
    setShowScanner(true);
    setScanning(true);
    setScanResult(null);
    setCameraError('');
    // Scanner will be initialized by useEffect
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
        console.log('✅ Camera stopped');
      } catch (error) {
        console.error('Error stopping camera:', error);
      }
    }
    setShowScanner(false);
    setScanning(false);
    setCameraError('');
  };

  const handleScanSuccess = async (scannedData: string) => {
    // Stop scanning immediately
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (error) {
        console.error('Error stopping scanner:', error);
      }
    }
    setScanning(false);
    
    try {
      console.log('📱 Processing scanned data:', scannedData);
      
      // Get userId from stored user data
      const storedUser = localStorage.getItem('degas_user');
      if (!storedUser) {
        throw new Error('User not logged in');
      }
      
      const user = JSON.parse(storedUser);
      const userId = user.userId || user.id;
      
      if (!userId) {
        throw new Error('User ID not found');
      }
      
      console.log('👤 User ID:', userId);
      
      // Call the scan endpoint with the scanned QR data and userId
      const response = await api.post('/form/scan', {
        qrData: scannedData,
        userId: userId
      });

      console.log('✅ Scan response:', response.data);
      
      if (response.data.success) {
        setScanResult({
          success: true,
          message: response.data.message || 'Attendance marked successfully!',
          scannedAt: response.data.scannedAt
        });
        
        // Update local user data
        const updatedUser = { ...userData, scanned: true, scannedAt: response.data.scannedAt };
        setUserData(updatedUser);
        localStorage.setItem('degas_user', JSON.stringify(updatedUser));
        
        toast.success('Attendance marked successfully!');
      } else {
        setScanResult({
          success: false,
          message: response.data.message || 'Scan failed'
        });
        toast.error(response.data.message || 'Scan failed');
      }
    } catch (error: any) {
      console.error('❌ Scan error:', error);
      const errorMsg = error.response?.data?.message || 'Failed to mark attendance';
      setScanResult({
        success: false,
        message: errorMsg
      });
      toast.error(errorMsg);
    }
  };

  const handleManualInput = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const qrData = formData.get('qrData') as string;
    
    if (!qrData) {
      toast.error('Please enter QR data');
      return;
    }
    
    await handleScanSuccess(qrData);
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
            <h1 className="text-3xl font-bold">Welcome, {userData?.name || user?.email}</h1>
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
      <main className="max-w-4xl mx-auto p-6">
        {/* User Info Card */}
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 mb-6">
          <h2 className="text-xl font-bold mb-4">Your Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-400 text-sm">Name</p>
              <p className="text-white font-medium">{userData?.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Email</p>
              <p className="text-white font-medium">{userData?.email || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Phone</p>
              <p className="text-white font-medium">{userData?.phone || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Status</p>
              <p className="text-white font-medium flex items-center gap-2">
                {userData?.scanned ? (
                  <>
                    <CheckCircle size={16} className="text-green-400" />
                    <span className="text-green-400">Scanned</span>
                  </>
                ) : (
                  <>
                    <XCircle size={16} className="text-yellow-400" />
                    <span className="text-yellow-400">Not Scanned</span>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Scanner Section - Only show if not scanned */}
        {!userData?.scanned && !showScanner && (
          <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 p-6 rounded-lg border border-blue-600 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold mb-2">Mark Your Attendance</h3>
                <p className="text-gray-300">Scan the form QR code to mark your attendance</p>
              </div>
              <button
                onClick={startScanner}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-medium"
              >
                <Camera size={20} />
                Open Scanner
              </button>
            </div>
          </div>
        )}

        {/* Scanner Modal */}
        {showScanner && (
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Scan Form QR Code</h2>
              <button
                onClick={stopScanner}
                className="text-gray-400 hover:text-white flex items-center gap-2"
              >
                <X size={20} />
                Close
              </button>
            </div>

            {!scanResult ? (
              <>
                {/* Camera Scanner */}
                {scanning && !cameraError && (
                  <div className="mb-4">
                    <div 
                      id="qr-reader" 
                      className="rounded-lg overflow-hidden"
                      style={{ width: '100%' }}
                    ></div>
                    <p className="text-center text-sm text-gray-400 mt-3">
                      Position the QR code within the frame
                    </p>
                  </div>
                )}

                {/* Camera Error */}
                {cameraError && (
                  <div className="bg-red-900/30 border border-red-600 rounded-lg p-4 mb-4">
                    <p className="text-red-200 text-sm">
                      <strong>Camera Error:</strong> {cameraError}
                    </p>
                    <p className="text-red-200 text-sm mt-2">
                      Please ensure you've granted camera permissions and try again.
                    </p>
                  </div>
                )}

                {/* Manual Input Fallback */}
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <h3 className="text-lg font-semibold mb-3">Or Enter Manually</h3>
                  <form onSubmit={handleManualInput} className="space-y-3">
                    <textarea
                      name="qrData"
                      placeholder="Paste the form QR code data here..."
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 h-24"
                    />
                    <button
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium"
                    >
                      Submit
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                {scanResult.success ? (
                  <>
                    <CheckCircle size={64} className="mx-auto text-green-400 mb-4" />
                    <h3 className="text-2xl font-bold text-green-400 mb-2">Success!</h3>
                    <p className="text-gray-300 mb-4">{scanResult.message}</p>
                    {scanResult.scannedAt && (
                      <p className="text-sm text-gray-400">
                        Scanned at: {new Date(scanResult.scannedAt).toLocaleString()}
                      </p>
                    )}
                    <button
                      onClick={stopScanner}
                      className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
                    >
                      Close
                    </button>
                  </>
                ) : (
                  <>
                    <XCircle size={64} className="mx-auto text-red-400 mb-4" />
                    <h3 className="text-2xl font-bold text-red-400 mb-2">Failed</h3>
                    <p className="text-gray-300 mb-4">{scanResult.message}</p>
                    <button
                      onClick={() => {
                        setScanResult(null);
                        startScanner();
                      }}
                      className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
                    >
                      Try Again
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* QR Code Section */}
        <div className="bg-gray-800 p-8 rounded-lg border border-gray-700 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <QrCode size={24} className="text-blue-400" />
            <h2 className="text-2xl font-bold">Your QR Code</h2>
          </div>
          
          <p className="text-gray-400 mb-6">
            Show this QR code to the admin to mark your attendance
          </p>

          {qrCodeImage && (
            <div className="bg-white p-6 rounded-lg inline-block mb-6">
              <img 
                src={qrCodeImage} 
                alt="User QR Code" 
                className="w-64 h-64 mx-auto"
              />
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={downloadQRCode}
              className="w-full max-w-md mx-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium"
            >
              <Download size={20} />
              Download QR Code
            </button>
            
            <p className="text-sm text-gray-400">
              Save this QR code to your phone for easy access
            </p>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 bg-blue-900/30 border border-blue-600 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2 text-blue-200">Two ways to mark attendance:</h3>
          <ol className="text-sm text-blue-200 space-y-2 list-decimal list-inside">
            <li>
              <strong>Self-Service:</strong> Use the scanner above to scan the form QR code displayed at the entrance
            </li>
            <li>
              <strong>Admin Scan:</strong> Show your QR code (below) to the admin and they will scan it
            </li>
          </ol>
        </div>
      </main>
    </div>
  );
}
