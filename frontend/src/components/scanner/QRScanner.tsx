import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (error: string) => void;
}

export function QRScanner({ onScanSuccess, onScanError }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [cameraError, setCameraError] = useState('');
  const isInitializedRef = useRef(false);
  const lastScanRef = useRef<string>('');
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Prevent double initialization in React StrictMode
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    startScanner();
    
    return () => {
      stopScanner();
      isInitializedRef.current = false;
    };
  }, []);

  const startScanner = async () => {
    try {
      setCameraError('');
      
      // Check if scanner already exists
      if (scannerRef.current) {
        console.log('Scanner already initialized, skipping...');
        return;
      }

      console.log('Initializing QR scanner...');
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      // Get available cameras
      const cameras = await Html5Qrcode.getCameras();
      console.log('Available cameras:', cameras);
      
      if (cameras && cameras.length > 0) {
        const cameraId = cameras[cameras.length - 1].id; // Use back camera if available
        console.log('Using camera:', cameraId);
        
        await scanner.start(
          cameraId,
          {
            fps: 5, // Reduced from 10 to prevent false positives
            qrbox: function(viewfinderWidth, viewfinderHeight) {
              // Make the scanning box larger and more flexible
              const minEdgePercentage = 0.7; // 70% of the smaller edge
              const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
              const qrboxSize = Math.floor(minEdgeSize * minEdgePercentage);
              return {
                width: qrboxSize,
                height: qrboxSize
              };
            },
            aspectRatio: 1.0,
            disableFlip: false,
            // Advanced settings for better accuracy
            experimentalFeatures: {
              useBarCodeDetectorIfSupported: true
            },
            formatsToSupport: [0], // Only QR codes (0 = QR_CODE)
          },
          (decodedText) => {
            // Debounce: Prevent duplicate scans within 3 seconds
            if (lastScanRef.current === decodedText) {
              console.log('⏭️ Duplicate scan ignored:', decodedText);
              return;
            }
            
            // Strict validation: Must be base64 or URL format
            const isBase64 = /^[A-Za-z0-9+/=]{20,}$/.test(decodedText);
            const isURL = decodedText.startsWith('http://') || decodedText.startsWith('https://');
            const hasVerifyPath = decodedText.includes('/verify/');
            
            if (!isBase64 && !isURL && !hasVerifyPath) {
              console.log('⚠️ Invalid QR code format - not base64 or URL:', decodedText);
              return;
            }
            
            // Additional length check
            if (decodedText.length < 20) {
              console.log('⚠️ Invalid QR code format (too short):', decodedText);
              return;
            }
            
            console.log('✅ Valid QR Code detected:', decodedText);
            lastScanRef.current = decodedText;
            
            // Clear previous timeout
            if (scanTimeoutRef.current) {
              clearTimeout(scanTimeoutRef.current);
            }
            
            // Reset debounce after 3 seconds
            scanTimeoutRef.current = setTimeout(() => {
              lastScanRef.current = '';
            }, 3000);
            
            onScanSuccess(decodedText);
            stopScanner();
          },
          (errorMessage) => {
            // Silent error handling for continuous scanning
            // This fires constantly while scanning, so we ignore it
          }
        );
        
        console.log('Scanner started successfully');
        setIsScanning(true);
      } else {
        throw new Error('No cameras found on this device');
      }
    } catch (err: any) {
      console.error('❌ Scanner error:', err);
      setCameraError(err.message || 'Failed to start camera');
      onScanError?.(err.message);
    }
  };

  const stopScanner = async () => {
    try {
      if (scannerRef.current) {
        const isCurrentlyScanning = scannerRef.current.getState() === 2; // 2 = SCANNING state
        if (isCurrentlyScanning) {
          await scannerRef.current.stop();
          await scannerRef.current.clear();
        }
        scannerRef.current = null;
      }
      setIsScanning(false);
      
      // Clear timeout on cleanup
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
        scanTimeoutRef.current = null;
      }
    } catch (err) {
      console.error('Error stopping scanner:', err);
    }
  };

  return (
    <div className="relative">
      {cameraError && (
        <div className="mb-4 p-4 bg-red-900/50 border border-red-500 text-red-200 rounded-lg">
          <p className="font-medium">Camera Error:</p>
          <p className="text-sm">{cameraError}</p>
          <p className="text-xs mt-2">Please ensure camera permissions are granted.</p>
        </div>
      )}
      <div id="qr-reader" className="w-full rounded-lg overflow-hidden" style={{ minHeight: '300px' }}></div>
      {isScanning && (
        <div className="mt-4 text-center text-gray-400 text-sm">
          <p>📷 Camera active - Point at QR code to scan</p>
        </div>
      )}
    </div>
  );
}
