import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, CameraOff } from 'lucide-react';

interface SimplifiedQRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (error: string) => void;
}

export function SimplifiedQRScanner({ onScanSuccess, onScanError }: SimplifiedQRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [cameras, setCameras] = useState<any[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [mirrorVideo, setMirrorVideo] = useState(true);
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
          onScanSuccess(decodedText);
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

  return (
    <div className="space-y-4">
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
    </div>
  );
}
