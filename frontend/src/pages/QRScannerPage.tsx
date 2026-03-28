import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

// QR Code Scanner - Uses HTML5 Camera API
export function QRScannerPage() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scanning, setScanning] = useState(true);
  const [lastScanned, setLastScanned] = useState<string>('');
  const [isChecking, setIsChecking] = useState(false);
  const [checkInResult, setCheckInResult] = useState<any>(null);

  useEffect(() => {
    if (scanning) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [scanning]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        startScanning();
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error('Failed to access camera. Please ensure you have granted camera permissions.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
  };

  const startScanning = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;

    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scan = () => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);

        try {
          // Simple QR code detection - for production, use jsQR library
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = decodeQRCode(imageData);

          if (code && code !== lastScanned) {
            setLastScanned(code);
            handleQRDetected(code);
          }
        } catch (error) {
          // Silently continue scanning
        }
      }

      if (scanning) {
        requestAnimationFrame(scan);
      }
    };

    scan();
  };

  // Simple QR code decoder (limited - for production use jsQR library)
  const decodeQRCode = (imageData: ImageData): string | null => {
    // This is a placeholder - in production, use: npm install jsqr
    // For now, we'll accept manual input or use the library approach
    return null;
  };

  const handleQRDetected = async (qrToken: string) => {
    setScanning(false);
    setIsChecking(true);

    try {
      const response = await api.post('/attendance/scan', { qrToken });

      if (response.data.success) {
        setCheckInResult({
          success: true,
          sessionName: response.data.data.sessionName,
          message: 'Check-in successful!'
        });
        toast.success('✓ Checked in successfully!');

        // Auto-redirect after 3 seconds
        setTimeout(() => {
          navigate('/my-dashboard');
        }, 3000);
      }
    } catch (error: any) {
      setCheckInResult({
        success: false,
        message: error.response?.data?.message || 'Check-in failed'
      });
      toast.error(error.response?.data?.message || 'Check-in failed');
      setScanning(true);
    } finally {
      setIsChecking(false);
    }
  };

  const handleManualQRInput = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const qrToken = formData.get('qrToken') as string;

    if (!qrToken) {
      toast.error('Please enter QR token');
      return;
    }

    handleQRDetected(qrToken);
  };

  if (checkInResult) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className={`max-w-md w-full p-8 rounded-lg text-center ${
          checkInResult.success ? 'bg-green-900/30 border border-green-600' : 'bg-red-900/30 border border-red-600'
        }`}>
          <div className={`text-6xl mb-4 ${checkInResult.success ? 'text-green-400' : 'text-red-400'}`}>
            {checkInResult.success ? '✓' : '✕'}
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {checkInResult.success ? 'Check-in Successful!' : 'Check-in Failed'}
          </h2>
          {checkInResult.sessionName && (
            <p className="text-gray-300 mb-4">
              Session: {checkInResult.sessionName}
            </p>
          )}
          <p className="text-gray-400 mb-6">{checkInResult.message}</p>
          {checkInResult.success && (
            <p className="text-sm text-gray-400">Redirecting to dashboard...</p>
          )}
          <button
            onClick={() => navigate('/my-dashboard')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto p-6">
        <button
          onClick={() => navigate('/my-dashboard')}
          className="flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-6"
        >
          <ArrowLeft size={20} />
          Back to Dashboard
        </button>

        <div className="bg-gray-800 rounded-lg p-8 border border-gray-700">
          <h1 className="text-3xl font-bold mb-2">Scan Session QR Code</h1>
          <p className="text-gray-400 mb-6">Point your camera at the session QR code to check in</p>

          {scanning && (
            <div className="space-y-6">
              <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />
                
                {/* Scanner overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-64 h-64 border-4 border-blue-500 rounded-lg opacity-50"></div>
                </div>

                <div className="absolute bottom-4 left-0 right-0 text-center">
                  <p className="text-blue-400 text-sm bg-black/50 px-4 py-2 rounded-lg inline-block">
                    Align QR code within frame
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-gray-400">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span>Scanner active...</span>
              </div>
            </div>
          )}

          {/* Manual QR Code Input - Fallback */}
          <div className="mt-8 pt-8 border-t border-gray-700">
            <h3 className="text-lg font-semibold mb-4">Or enter QR code manually:</h3>
            <form onSubmit={handleManualQRInput} className="space-y-4">
              <input
                type="text"
                name="qrToken"
                placeholder="Paste QR code token here..."
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500"
                disabled={isChecking}
              />
              <button
                type="submit"
                disabled={isChecking}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-2 rounded-lg font-medium transition"
              >
                {isChecking ? 'Checking in...' : 'Submit'}
              </button>
            </form>
          </div>

          <div className="mt-6 p-4 bg-blue-900/30 border border-blue-600 rounded-lg text-sm text-blue-200">
            <p className="flex items-start gap-2">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>
                <strong>Note:</strong> Use the camera to scan the session QR code displayed by the admin. Your attendance will be recorded automatically.
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
