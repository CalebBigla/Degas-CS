import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, CameraOff, Keyboard } from 'lucide-react';

interface SimplifiedQRScannerProps {
  onScanSuccess: (decodedText: string, tableId?: string) => void;
  onScanError?: (error: string) => void;
  selectedTableId?: string;
}

export function SimplifiedQRScanner({ onScanSuccess, onScanError, selectedTableId }: SimplifiedQRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [cameras, setCameras] = useState<any[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [mirrorVideo, setMirrorVideo] = useState(true);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualQRData, setManualQRData] = useState('');
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    // Get available cameras
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length) {
          setCameras(devices);
          // Prefer back camera
          const backCamera = devices.find(d => d.label.toLowerCase().includes('back'));
          setSelectedCamera(backCamera?.id || devices[0].id);
        } else {
          setError('No cameras found');
        }
      })
      .catch((err) => {
        console.error('Error getting cameras:', err);
        setError('Failed to access cameras');
      });

    return () => {
      stopScanning();
    };
  }, []);

  const startScanning = async () => {
    if (!selectedCamera) {
      setError('No camera selected');
      return;
    }

    try {
      setError('');
      const html5QrCode = new Html5Qrcode('qr-reader-simple');
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        selectedCamera,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          console.log('QR Code scanned:', decodedText);
          onScanSuccess(decodedText, selectedTableId);
        },
        (errorMessage) => {
          // Ignore "No QR code found" messages
          if (!errorMessage.includes('NotFoundException')) {
            console.warn('Scan error:', errorMessage);
          }
        }
      );

      setIsScanning(true);
      
      // Apply mirror effect if enabled
      if (mirrorVideo) {
        const videoElement = document.querySelector('#qr-reader-simple video') as HTMLVideoElement;
        if (videoElement) {
          videoElement.style.transform = 'scaleX(-1)';
        }
      }
    } catch (err: any) {
      console.error('Start scanning error:', err);
      setError(err.message || 'Failed to start camera');
      if (onScanError) {
        onScanError(err.message);
      }
    }
  };

  const stopScanning = async () => {
    if (html5QrCodeRef.current && isScanning) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
        html5QrCodeRef.current = null;
        setIsScanning(false);
      } catch (err) {
        console.error('Stop scanning error:', err);
      }
    }
  };

  const handleManualSubmit = () => {
    if (!manualQRData.trim()) {
      setError('Please enter QR data');
      return;
    }

    try {
      // Extract base64 data from URL if user pasted full URL
      let qrData = manualQRData.trim();
      
      // Check if it's a URL format (http://localhost:5173/verify/BASE64DATA)
      if (qrData.includes('/verify/')) {
        const parts = qrData.split('/verify/');
        qrData = parts[1];
        console.log('Extracted base64 from URL:', qrData);
      }
      
      // Validate it looks like base64
      if (!/^[A-Za-z0-9+/=]+$/.test(qrData)) {
        setError('Invalid QR data format. Please paste the base64 string or full verification URL.');
        return;
      }

      console.log('Submitting QR data:', qrData);
      setError('');
      onScanSuccess(qrData, selectedTableId);
      setManualQRData('');
      setShowManualEntry(false);
    } catch (err: any) {
      setError(err.message || 'Invalid QR data');
    }
  };

  return (
    <div className="space-y-4">
      {/* Manual Entry Toggle */}
      <div className="flex items-center justify-center space-x-2">
        <button
          onClick={() => {
            setShowManualEntry(false);
            setError('');
          }}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            !showManualEntry
              ? 'bg-navy-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <Camera className="h-4 w-4" />
          <span>Camera Scan</span>
        </button>
        <button
          onClick={() => {
            setShowManualEntry(true);
            stopScanning();
            setError('');
          }}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            showManualEntry
              ? 'bg-navy-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <Keyboard className="h-4 w-4" />
          <span>Manual Entry</span>
        </button>
      </div>

      {showManualEntry ? (
        /* Manual Entry Mode */
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">
              📝 Manual QR Entry
            </h3>
            <p className="text-xs text-blue-700 mb-3">
              Paste the QR code data here. You can paste either:
            </p>
            <ul className="text-xs text-blue-600 space-y-1 mb-3">
              <li>• The full verification URL (e.g., http://localhost:5173/verify/ABC123...)</li>
              <li>• Just the base64 code (e.g., ABC123...)</li>
            </ul>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              QR Code Data
            </label>
            <textarea
              value={manualQRData}
              onChange={(e) => setManualQRData(e.target.value)}
              placeholder="Paste QR code data or verification URL here..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent font-mono text-sm"
              rows={4}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={handleManualSubmit}
            disabled={!manualQRData.trim()}
            className="w-full bg-emerald text-white px-6 py-3 rounded-lg font-medium hover:bg-emerald/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Verify QR Code
          </button>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm font-medium text-yellow-800 mb-2">
              💡 How to get QR data for testing:
            </p>
            <ol className="text-xs text-yellow-700 space-y-2">
              <li>
                <strong>1. Generate ID Card:</strong> Go to your table and click "Download ID Card" for any user
              </li>
              <li>
                <strong>2. Open Browser Console:</strong> Press F12 on your keyboard
              </li>
              <li>
                <strong>3. Look for QR Data:</strong> In the console, find the log that says "QR code generated"
              </li>
              <li>
                <strong>4. Copy Base64 String:</strong> Copy the long string that starts with "eyJ"
              </li>
              <li>
                <strong>5. Paste Here:</strong> Paste it in the text box above and click "Verify QR Code"
              </li>
            </ol>
            <div className="mt-3 pt-3 border-t border-yellow-300">
              <p className="text-xs text-yellow-600">
                <strong>Note:</strong> Once deployed to Render with HTTPS, your phone camera will work directly without manual entry!
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Camera Scan Mode */
        <>
          {/* Mirror Toggle */}
          <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Mirror Video (for inverted webcams)
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Enable if your camera shows a flipped image
              </p>
            </div>
            <button
              onClick={() => {
                setMirrorVideo(!mirrorVideo);
                if (isScanning) {
                  const videoElement = document.querySelector('#qr-reader-simple video') as HTMLVideoElement;
                  if (videoElement) {
                    videoElement.style.transform = !mirrorVideo ? 'scaleX(-1)' : 'scaleX(1)';
                  }
                }
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                mirrorVideo ? 'bg-navy-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  mirrorVideo ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Camera Selection */}
          {cameras.length > 1 && !isScanning && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Camera
              </label>
              <select
                value={selectedCamera}
                onChange={(e) => setSelectedCamera(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent"
              >
                {cameras.map((camera) => (
                  <option key={camera.id} value={camera.id}>
                    {camera.label || `Camera ${camera.id}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">{error}</p>
              <p className="text-red-600 text-xs mt-2">
                Make sure you've granted camera permissions and are using HTTPS (or localhost).
              </p>
            </div>
          )}

          {/* Controls */}
          <div className="flex justify-center">
            {!isScanning ? (
              <button
                onClick={startScanning}
                disabled={!selectedCamera}
                className="flex items-center space-x-2 bg-emerald text-white px-6 py-3 rounded-lg font-medium hover:bg-emerald/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Camera className="h-5 w-5" />
                <span>Start Scanner</span>
              </button>
            ) : (
              <button
                onClick={stopScanning}
                className="flex items-center space-x-2 bg-crimson text-white px-6 py-3 rounded-lg font-medium hover:bg-crimson/90 transition-colors"
              >
                <CameraOff className="h-5 w-5" />
                <span>Stop Scanner</span>
              </button>
            )}
          </div>

          {/* Scanner Display */}
          <div id="qr-reader-simple" className="w-full" />

          {/* Status and Tips */}
          {isScanning && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm font-medium text-yellow-800 mb-2">
                📷 Webcam Scanning Tips:
              </p>
              <ul className="text-xs text-yellow-700 space-y-1">
                <li>• Hold QR code 6-12 inches from camera</li>
                <li>• Ensure good lighting (avoid shadows)</li>
                <li>• Keep QR code flat and steady</li>
                <li>• Try different angles if not detecting</li>
                <li>• Toggle mirror mode if image is flipped</li>
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}