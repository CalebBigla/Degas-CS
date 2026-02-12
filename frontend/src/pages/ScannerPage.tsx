import { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Camera, CameraOff, CheckCircle, XCircle, User, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { SimplifiedQRScanner } from '../components/scanner/SimplifiedQRScanner';

interface ScanResult {
  success: boolean;
  user?: {
    id: string;
    fullName: string;
    role: string;
    photoUrl?: string;
    status: string;
  };
  message: string;
}

export function ScannerPage() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [useSimplifiedScanner, setUseSimplifiedScanner] = useState(false);

  const startScanner = () => {
    setCameraError(null);
    
    if (scannerRef.current) {
      scannerRef.current.clear().catch(() => {});
    }

    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        rememberLastUsedCamera: true,
        supportedScanTypes: [0, 1], // Support both QR and barcodes
        showTorchButtonIfSupported: true,
        showZoomSliderIfSupported: true,
        defaultZoomValueIfSupported: 2,
      },
      /* verbose= */ false
    );

    scanner.render(
      async (decodedText) => {
        console.log('QR Code detected:', decodedText);
        setIsProcessing(true);
        await handleScanSuccess(decodedText);
        scanner.clear().catch(() => {});
        setIsScanning(false);
      },
      (error) => {
        // Only log actual errors, not "no QR found" messages
        if (!error.includes('NotFoundException')) {
          console.warn('Scanner error:', error);
        }
      }
    ).catch((err) => {
      console.error('Scanner initialization error:', err);
      setCameraError('Failed to start camera. Please check permissions and try again.');
      setIsScanning(false);
    });

    scannerRef.current = scanner;
    setIsScanning(true);
    setScanResult(null);
    setShowResult(false);
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      try {
        scannerRef.current.clear().catch(() => {
          // Ignore cleanup errors
        });
      } catch (error) {
        // Ignore cleanup errors
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleScanSuccess = async (qrData: string) => {
    try {
      const response = await api.post('/scanner/verify', { qrData });
      const result = response.data;
      
      setScanResult(result);
      setShowResult(true);
      
      // Auto-hide result after 5 seconds
      setTimeout(() => {
        setShowResult(false);
        setScanResult(null);
      }, 5000);
      
    } catch (error: any) {
      setScanResult({
        success: false,
        message: error.response?.data?.message || 'Invalid QR code'
      });
      setShowResult(true);
      
      setTimeout(() => {
        setShowResult(false);
        setScanResult(null);
      }, 5000);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetScanner = () => {
    setShowResult(false);
    setScanResult(null);
    if (!isScanning) {
      startScanner();
    }
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try {
          scannerRef.current.clear().catch(() => {
            // Ignore cleanup errors
          });
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-charcoal p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">QR Scanner</h1>
          <p className="text-gray-300">Scan QR codes for access verification</p>
        </div>

        {/* Scanner Container */}
        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
          {!showResult ? (
            <>
              {/* Scanner Mode Toggle */}
              <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  {useSimplifiedScanner ? 'Using: Direct Camera Access' : 'Using: Auto Scanner'}
                </span>
                <button
                  onClick={() => {
                    stopScanner();
                    setUseSimplifiedScanner(!useSimplifiedScanner);
                    setCameraError(null);
                  }}
                  className="flex items-center space-x-2 text-sm text-navy-600 hover:text-navy-700 font-medium"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Switch Scanner Mode</span>
                </button>
              </div>

              {useSimplifiedScanner ? (
                /* Simplified Scanner */
                <div className="p-6">
                  <SimplifiedQRScanner
                    onScanSuccess={async (decodedText) => {
                      setIsProcessing(true);
                      await handleScanSuccess(decodedText);
                      setIsProcessing(false);
                    }}
                    onScanError={(error) => {
                      setCameraError(error);
                    }}
                  />
                </div>
              ) : (
                /* Original Scanner */
                <>
                  {/* Scanner Controls */}
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex justify-center space-x-4">
                      {!isScanning ? (
                        <button
                          onClick={startScanner}
                          className="flex items-center space-x-2 bg-emerald text-white px-6 py-3 rounded-lg font-medium hover:bg-emerald/90 transition-colors"
                        >
                          <Camera className="h-5 w-5" />
                          <span>Start Scanner</span>
                        </button>
                      ) : (
                        <button
                          onClick={stopScanner}
                          className="flex items-center space-x-2 bg-crimson text-white px-6 py-3 rounded-lg font-medium hover:bg-crimson/90 transition-colors"
                        >
                          <CameraOff className="h-5 w-5" />
                          <span>Stop Scanner</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Scanner Area */}
                  <div className="p-6">
                    {cameraError && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                        <p className="text-red-800 text-sm">{cameraError}</p>
                        <p className="text-red-600 text-xs mt-2">
                          Make sure you've granted camera permissions and are using HTTPS (or localhost).
                        </p>
                      </div>
                    )}
                    
                    {isProcessing && (
                      <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                          <LoadingSpinner size="lg" className="mx-auto mb-4" />
                          <p className="text-gray-600">Processing QR code...</p>
                        </div>
                      </div>
                    )}
                    
                    {!isProcessing && (
                      <div id="qr-reader" className="w-full">
                        {!isScanning && !cameraError && (
                          <div className="text-center py-12">
                            <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                            <p className="text-gray-600">Click "Start Scanner" to begin</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          ) : (
            /* Scan Result Display */
            <div className="p-8">
              <div className={`text-center ${scanResult?.success ? 'text-emerald' : 'text-crimson'}`}>
                {scanResult?.success ? (
                  <CheckCircle className="h-20 w-20 mx-auto mb-6" />
                ) : (
                  <XCircle className="h-20 w-20 mx-auto mb-6" />
                )}
                
                <h2 className="text-2xl font-bold mb-4">
                  {scanResult?.success ? 'ACCESS GRANTED' : 'ACCESS DENIED'}
                </h2>

                {scanResult?.user && (
                  <div className="bg-gray-50 rounded-lg p-6 mb-6">
                    <div className="flex items-center justify-center mb-4">
                      {scanResult.user.photoUrl ? (
                        <img
                          src={scanResult.user.photoUrl}
                          alt={scanResult.user.fullName}
                          className="w-24 h-24 rounded-full object-cover border-4 border-emerald"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-gray-300 flex items-center justify-center border-4 border-emerald">
                          <User className="h-12 w-12 text-gray-600" />
                        </div>
                      )}
                    </div>
                    <h3 className="text-xl font-semibold text-charcoal mb-2">
                      {scanResult.user.fullName}
                    </h3>
                    <p className="text-gray-600 capitalize">
                      {scanResult.user.role}
                    </p>
                  </div>
                )}

                <p className="text-lg mb-6 text-gray-700">
                  {scanResult?.message}
                </p>

                <button
                  onClick={resetScanner}
                  className="bg-charcoal text-white px-8 py-3 rounded-lg font-medium hover:bg-charcoal/90 transition-colors"
                >
                  Scan Another
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Instructions</h3>
          <ul className="text-gray-300 space-y-2">
            <li>• Position the QR code within the scanning frame</li>
            <li>• Ensure good lighting for optimal scanning</li>
            <li>• Hold steady until the code is recognized</li>
            <li>• Results will display automatically after scanning</li>
          </ul>
          
          <div className="mt-6 pt-6 border-t border-gray-700">
            <h4 className="text-sm font-semibold text-white mb-2">Webcam Scanning Tips</h4>
            <ul className="text-gray-400 text-sm space-y-1">
              <li>• Use "Switch Scanner Mode" to try the alternative scanner</li>
              <li>• Enable "Mirror Video" if your webcam shows inverted image</li>
              <li>• Hold QR code 6-12 inches from camera</li>
              <li>• Ensure bright, even lighting (no shadows or glare)</li>
              <li>• Keep QR code flat and perpendicular to camera</li>
              <li>• Try different angles if not detecting</li>
            </ul>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-700">
            <h4 className="text-sm font-semibold text-emerald mb-2">💡 Pro Tip: Use Mobile Device</h4>
            <p className="text-gray-400 text-sm">
              For best results, access this scanner page on a mobile device with a rear camera. 
              Mobile cameras have better focus and resolution for QR code scanning.
            </p>
          </div>
          
          <div className="mt-4 pt-4 border-t border-gray-700">
            <h4 className="text-sm font-semibold text-white mb-2">Troubleshooting</h4>
            <ul className="text-gray-400 text-sm space-y-1">
              <li>• Allow camera permissions when prompted by your browser</li>
              <li>• Use HTTPS or localhost for camera access</li>
              <li>• Try refreshing the page if camera doesn't start</li>
              <li>• Check browser console (F12) for detailed errors</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}