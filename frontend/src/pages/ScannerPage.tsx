import { useState, useEffect, useRef, useMemo } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Camera, CameraOff, CheckCircle, XCircle, User, RefreshCw, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { SimplifiedQRScanner } from '../components/scanner/SimplifiedQRScanner';

interface ScanResult {
  success: boolean;
  user?: {
    id: string;
    fullName?: string;
    role?: string;
    photoUrl?: string;
    status?: string;
    [key: string]: any;
  };
  message: string;
  accessGranted?: boolean;
  tableInfo?: {
    id: string;
    name: string;
  };
  schema?: Array<{
    id: string;
    name: string;
    type: string;
  }>;
  fieldValues?: Record<string, any>;
}

interface Table {
  id: string;
  name: string;
}

export function ScannerPage() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const isMountedRef = useRef(true); // Track component mount status
  const [showResult, setShowResult] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [useSimplifiedScanner, setUseSimplifiedScanner] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [tables, setTables] = useState<Table[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);
  const navigate = useNavigate();
  const { logout, userRole } = useAuth();

  // STABLE role detection - only depends on userRole, not admin object
  // This prevents role confusion during re-renders when admin object becomes null
  const isAdminUser = useMemo(() => {
    return userRole === 'admin' || userRole === 'super_admin';
  }, [userRole]);

  const isGreeter = useMemo(() => {
    return userRole === 'greeter';
  }, [userRole]);
  
  // STABLE endpoint selection - locked with useMemo to prevent recalculation during re-renders
  const scannerEndpoint = useMemo(() => {
    if (userRole === 'admin' || userRole === 'super_admin') {
      return '/scanner/verify';
    }
    return '/scanner/scan-greeter';
  }, [userRole]);
  
  console.log('🎯 [SCANNER] User role detected:', { userRole, isAdminUser, isGreeter, endpoint: scannerEndpoint });

  // Auth guard - redirect lost sessions to login, not admin
  useEffect(() => {
    if (!userRole) {
      console.warn('⚠️ No user role detected, redirecting to login');
      navigate('/login');
      return;
    }
    
    // If greeter tries to access admin route, redirect back to scanner
    if (userRole === 'greeter' && window.location.pathname.includes('/admin')) {
      console.warn('⚠️ Greeter attempted to access admin route, redirecting to scanner');
      navigate('/scanner');
      return;
    }
  }, [userRole, navigate]);

  // Safe state update wrapper - prevents updates after unmount
  const safeSetState = (setter: any, value: any) => {
    if (isMountedRef.current) {
      setter(value);
    }
  };

  // Ensure qr-reader div is always mounted and ready
  useEffect(() => {
    const qrReaderDiv = document.getElementById('qr-reader');
    if (!qrReaderDiv) {
      console.warn('⚠️ qr-reader div not found in DOM - scanner may fail');
    } else {
      console.log('✅ qr-reader div is available in DOM');
    }
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Async handler for switching scanner modes
  const handleSwitchMode = async () => {
    console.log('🔄 Switching scanner mode...');
    
    // Step 1: Stop and clear the scanner with full await
    if (scannerRef.current) {
      try {
        // Call clear() and wait for internal cleanup
        scannerRef.current.clear();
        console.log('✅ Scanner cleared before mode switch');
        
        // Wait for library's internal async cleanup to complete
        await new Promise(resolve => setTimeout(resolve, 150));
      } catch (err) {
        // Silently swallow cleanup errors
        console.warn('⚠️ Error clearing scanner before mode switch (ignored):', err);
      } finally {
        scannerRef.current = null;
      }
    }
    
    // Step 2: Manually clean the DOM to prevent conflicts
    try {
      const qrReaderDiv = document.getElementById('qr-reader');
      if (qrReaderDiv && qrReaderDiv.firstChild) {
        while (qrReaderDiv.firstChild) {
          try {
            qrReaderDiv.removeChild(qrReaderDiv.firstChild);
          } catch (removeErr) {
            // Silently ignore removeChild errors
            console.warn('⚠️ DOM removeChild error (ignored):', removeErr);
          }
        }
        console.log('✅ DOM cleaned before mode switch');
      }
    } catch (domErr) {
      // Silently swallow DOM errors
      console.warn('⚠️ DOM cleanup error (ignored):', domErr);
    }
    
    // Step 3: Give html5-qrcode additional time to fully cleanup (total 300ms)
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Step 4: NOW trigger the mode switch (only if still mounted)
    if (isMountedRef.current) {
      safeSetState(setUseSimplifiedScanner, !useSimplifiedScanner);
      safeSetState(setCameraError, null);
      safeSetState(setIsScanning, false);
      console.log('✅ Mode switch completed');
    }
  };

  const startScanner = () => {
    // Verify component is still mounted
    if (!isMountedRef.current) {
      console.warn('⚠️ Component unmounted, aborting scanner start');
      return;
    }

    if (cameraError) setCameraError(null);
    if (isProcessing) setIsProcessing(false);
    
    // Clean up any existing scanner instance
    if (scannerRef.current) {
      try {
        scannerRef.current.clear();
        console.log('✅ Existing scanner cleared before restart');
      } catch (error) {
        // Silently swallow cleanup errors
        console.warn('⚠️ Cleanup error on existing scanner (ignored):', error);
      } finally {
        scannerRef.current = null;
      }
    }
    
    // CRITICAL: Verify qr-reader div exists before initializing scanner
    const qrReaderDiv = document.getElementById('qr-reader');
    if (!qrReaderDiv) {
      console.error('❌ qr-reader div not found - cannot initialize scanner');
      setCameraError('Scanner container not found. Please refresh the page.');
      return;
    }
    
    // Verify the div is still in the DOM (not detached)
    if (!document.body.contains(qrReaderDiv)) {
      console.error('❌ qr-reader div is detached from DOM');
      setCameraError('Scanner container is not ready. Please refresh the page.');
      return;
    }
    
    // Clear any existing content in qr-reader div - wrap in try-catch
    try {
      while (qrReaderDiv.firstChild) {
        try {
          qrReaderDiv.removeChild(qrReaderDiv.firstChild);
        } catch (removeErr) {
          // Silently ignore individual removeChild errors
          console.warn('⚠️ DOM removeChild error (ignored):', removeErr);
        }
      }
      console.log('✅ qr-reader div cleaned');
    } catch (cleanupErr) {
      // Silently swallow all DOM cleanup errors
      console.warn('⚠️ DOM cleanup error (ignored):', cleanupErr);
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

    console.log('🎬 Starting scanner with html5-qrcode library...');
    
    try {
      // CRITICAL: Double-check DOM exists before render (prevent race conditions)
      const finalCheck = document.getElementById('qr-reader');
      if (!finalCheck || !document.body.contains(finalCheck)) {
        console.error('❌ qr-reader div disappeared before render');
        setCameraError('Scanner container is not available. Please refresh the page.');
        return;
      }
      
      // scanner.render() does NOT return a promise, it renders immediately
      scanner.render(
        async (decodedText) => {
          // Only process if component is still mounted
          if (!isMountedRef.current) {
            console.log('Component unmounted, ignoring scan result');
            return;
          }

          try {
            console.log('✅ QR Code detected:', decodedText.substring(0, 50));
            safeSetState(setIsProcessing, true);
            
            await handleScanSuccess(decodedText);
          } catch (error) {
            console.error('Error handling scan success:', error);
          } finally {
            // Stop scanner and cleanup - wrap in try-catch for library safety
            try {
              if (scannerRef.current && isMountedRef.current) {
                try {
                  scannerRef.current.clear();
                  console.log('✅ Scanner cleared after successful scan');
                } catch (error) {
                  // Silently swallow cleanup errors
                  console.warn('⚠️ Error clearing scanner after scan (ignored):', error);
                } finally {
                  scannerRef.current = null;
                  safeSetState(setIsScanning, false);
                  safeSetState(setIsProcessing, false);
                }
              }
            } catch (cleanupError) {
              // Silently swallow all cleanup errors to prevent crashes
              console.warn('⚠️ Cleanup failed (ignored):', cleanupError);
            }
          }
        },
        (error) => {
          // Only log actual errors, not "no QR found" messages
          if (!error.includes('NotFoundException')) {
            console.warn('⚠️ Scanner error:', error);
          }
        }
      );
      
      console.log('✅ Scanner rendered successfully');
      safeSetState(setIsScanning, true);
      safeSetState(setScanResult, null);
      safeSetState(setShowResult, false);
      
    } catch (err: any) {
      console.error('❌ Scanner initialization error:', err);
      console.error('Error details:', {
        message: err?.message,
        name: err?.name,
        stack: err?.stack?.substring(0, 200)
      });
      
      // Provide specific error messages
      let errorMsg = 'Failed to start camera. Please check permissions and try again.';
      if (err?.message?.includes('Requested device not found')) {
        errorMsg = 'No camera device found. Please connect a camera and try again.';
      } else if (err?.message?.includes('Permission denied')) {
        errorMsg = 'Camera permission denied. Please allow camera access in your browser settings.';
      } else if (err?.message?.includes('NotAllowedError')) {
        errorMsg = 'Camera access not allowed. Please enable camera permissions and retry.';
      } else if (err?.message?.includes('NotFoundError')) {
        errorMsg = 'No camera device detected on your system.';
      } else if (err?.message?.includes('removeChild')) {
        errorMsg = 'Scanner internal error. Refresh the page and try again.';
      }
      
      safeSetState(setCameraError, errorMsg);
      safeSetState(setIsScanning, false);
      safeSetState(setIsProcessing, false);
    }

    scannerRef.current = scanner;
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        // Html5QrcodeScanner only has .clear() method
        // Clear returns void but may have async cleanup internally
        scannerRef.current.clear();
        console.log('✅ Scanner stopped and cleared');
        
        // Give the library time to complete its internal cleanup
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (clearError) {
        // Silently swallow cleanup errors to prevent app crashes
        console.warn('⚠️ Error during scanner.clear() (ignored):', clearError);
      } finally {
        // Always remove scanner reference
        scannerRef.current = null;
      }
      
      // Fallback DOM cleanup - wrap in try-catch
      try {
        const qrReaderDiv = document.getElementById('qr-reader');
        if (qrReaderDiv && qrReaderDiv.firstChild) {
          while (qrReaderDiv.firstChild) {
            try {
              qrReaderDiv.removeChild(qrReaderDiv.firstChild);
            } catch (removeErr) {
              // Silently ignore individual removeChild errors
              console.warn('⚠️ DOM removeChild error (ignored):', removeErr);
            }
          }
          console.log('✅ Fallback DOM cleanup completed');
        }
      } catch (domError) {
        // Silently swallow all DOM errors
        console.warn('⚠️ Failed to clean DOM (ignored):', domError);
      }
    }
    safeSetState(setIsScanning, false);
  };

  const handleScanSuccess = async (qrData: string) => {
    if (!isMountedRef.current) return;

    try {
      console.log('Sending QR scan request:', { 
        endpoint: scannerEndpoint, 
        userRole, 
        qrData: qrData.substring(0, 50) + '...',
        selectedTableId 
      });
      
      // Use role-specific endpoint
      let requestBody: any = { qrData };
      if (isAdminUser) {
        // Admin endpoint needs selectedTableId
        requestBody.selectedTableId = selectedTableId || undefined;
      }
      
      const response = await api.post(scannerEndpoint, requestBody);
      
      console.log('Received response:', response.data);
      
      // Validate response structure
      if (!response.data || typeof response.data !== 'object') {
        throw new Error('Invalid response format from server');
      }
      
      const result = response.data.data || response.data;
      
      safeSetState(setScanResult, result);
      safeSetState(setShowResult, true);
      
      // Auto-hide result after 5 seconds
      setTimeout(() => {
        if (isMountedRef.current) {
          safeSetState(setShowResult, false);
          safeSetState(setScanResult, null);
        }
      }, 5000);
      
    } catch (error: any) {
      console.error('QR verification error:', error);
      
      // Handle different error types
      let errorMessage = 'Invalid QR code';
      
      if (error.response) {
        // Server responded with error
        errorMessage = error.response.data?.error || error.response.data?.message || 'Verification failed';
        console.error('Server error response:', error.response.data);
      } else if (error.request) {
        // Request made but no response
        errorMessage = 'No response from server. Please check your connection.';
        console.error('No response received:', error.request);
      } else if (error.message) {
        // Error in request setup
        errorMessage = error.message;
      }
      
      safeSetState(setScanResult, {
        success: false,
        message: errorMessage,
        accessGranted: false
      });
      safeSetState(setShowResult, true);
      
      setTimeout(() => {
        if (isMountedRef.current) {
          safeSetState(setShowResult, false);
          safeSetState(setScanResult, null);
        }
      }, 5000);
    }
  };

  const resetScanner = () => {
    safeSetState(setShowResult, false);
    safeSetState(setScanResult, null);
    if (!isScanning) {
      startScanner();
    }
  };

  useEffect(() => {
    // Mark component as mounted
    isMountedRef.current = true;

    // Fetch available tables for the selector (admin only)
    const fetchTables = async () => {
      // Only fetch tables for admin users
      console.log('📋 [SCANNER] Checking if should fetch tables:', { isAdminUser, userRole });
      
      if (!isAdminUser) {
        console.log('✅ [SCANNER] Skipping table fetch - user is not admin');
        safeSetState(setLoadingTables, false);
        return;
      }

      console.log('📋 [SCANNER] Fetching tables for admin user...');
      try {
        const response = await api.get('/scanner/tables');
        if (isMountedRef.current && response.data.success) {
          safeSetState(setTables, response.data.data || []);
          console.log('✅ [SCANNER] Tables fetched:', response.data.data);
        }
      } catch (error: any) {
        // Greeters will get 403 (Forbidden) - this is expected and safe to ignore
        if (error.response?.status === 403) {
          console.log('ℹ️ [SCANNER] Greeters cannot access /scanner/tables (403 expected)');
        } else {
          console.error('Failed to fetch tables:', error);
        }
      }
    };

    safeSetState(setLoadingTables, true);
    fetchTables().finally(() => {
      if (isMountedRef.current) {
        safeSetState(setLoadingTables, false);
      }
    });

    // Cleanup on unmount - properly stop scanner and prevent DOM conflicts
    return () => {
      console.log('🧹 Component unmounting - cleaning up scanner...');
      
      // CRITICAL: Mark as unmounted FIRST to prevent any new operations
      isMountedRef.current = false;
      
      // Stop and clear the scanner before unmount
      if (scannerRef.current) {
        try {
          // Html5QrcodeScanner only has .clear() method (no .stop() method)
          scannerRef.current.clear();
          console.log('✅ Scanner cleared successfully');
        } catch (clearErr) {
          // Silently swallow cleanup errors to prevent app crashes
          console.warn('⚠️ Cleanup: Error during clear() (ignored):', clearErr);
        } finally {
          scannerRef.current = null;
        }
      }
      
      // Additional DOM cleanup as fallback - prevent removeChild conflicts
      try {
        const qrReaderDiv = document.getElementById('qr-reader');
        if (qrReaderDiv && qrReaderDiv.firstChild) {
          // Clear all child elements to prevent removeChild conflicts
          while (qrReaderDiv.firstChild) {
            try {
              qrReaderDiv.removeChild(qrReaderDiv.firstChild);
            } catch (domErr) {
              // Silently ignore DOM removal errors
              console.warn('⚠️ DOM cleanup error (ignored):', domErr);
            }
          }
          console.log('✅ DOM cleaned up successfully');
        }
      } catch (error) {
        // Silently swallow all cleanup errors
        console.warn('⚠️ Cleanup: Unexpected error (ignored):', error);
      }
    };
  }, [isAdminUser]);

  return (
    <div className="min-h-screen bg-charcoal p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header with Logout Button */}
        <div className="flex items-center justify-between mb-8">
          <div className="text-center flex-1">
            <h1 className="text-3xl font-bold text-white mb-2">QR Scanner</h1>
            <p className="text-gray-300">Scan QR codes for access verification</p>
          </div>
          <button
            onClick={handleLogout}
            className="ml-4 p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center gap-2"
            title="Logout"
          >
            <LogOut className="h-5 w-5" />
            <span className="hidden sm:inline text-sm font-medium">Logout</span>
          </button>
        </div>

        {/* Scanner Container */}
        <div className="bg-white rounded-lg shadow-xl overflow-hidden">
          {!showResult ? (
            <>
              {/* Table Selector - Admin Only */}
              {isAdminUser && (
                <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 border-b-2 border-blue-300">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-semibold text-blue-900">
                      📋 Select Table for Scanning
                    </label>
                    {selectedTableId && (
                      <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded-full">
                        Filtering by table
                      </span>
                    )}
                  </div>
                  {loadingTables ? (
                    <p className="text-sm text-gray-600">Loading tables...</p>
                  ) : (
                    <div className="space-y-2">
                      <select
                        value={selectedTableId}
                        onChange={(e) => setSelectedTableId(e.target.value)}
                        className="w-full px-3 py-2 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
                      >
                        <option value="">🔍 All Tables (Search Across All)</option>
                        {tables.map((table) => (
                          <option key={table.id} value={table.id}>
                            📊 {table.name}
                          </option>
                        ))}
                      </select>
                      {selectedTableId && tables.length > 0 && (
                        <p className="text-xs text-blue-700 italic">
                          Showing: {tables.find(t => t.id === selectedTableId)?.name || 'Selected table'}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Scanner Mode Toggle */}
              <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  {useSimplifiedScanner ? 'Using: Direct Camera Access' : 'Using: Auto Scanner'}
                </span>
                <button
                  onClick={handleSwitchMode}
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
                    selectedTableId={selectedTableId}
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
                /* Original Scanner - Controls Only */
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

                  {/* Scanner Area - Error and Loading Display */}
                  <div className="p-6 bg-white">
                    {cameraError && (
                      <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-4">
                        <div className="flex items-start gap-3">
                          <div className="text-red-600 text-xl mt-1">⚠️</div>
                          <div className="flex-1">
                            <p className="text-red-900 font-semibold text-sm">Camera Access Failed</p>
                            <p className="text-red-800 text-sm mt-1">{cameraError}</p>
                            <p className="text-red-700 text-xs mt-2">
                              • Make sure you granted camera permissions<br/>
                              • Use HTTPS or localhost<br/>
                              • Try refreshing the page and trying again<br/>
                              • Check browser console (F12) for detailed errors
                            </p>
                          </div>
                        </div>
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
                  </div>
                </>
              )}

              {/* QR Reader Div - ALWAYS IN DOM, NEVER UNMOUNTED */}
              {/* This must be outside the conditional rendering to prevent unmount conflicts with html5-qrcode cleanup */}
              <div 
                id="qr-reader" 
                className="w-full bg-white" 
                style={{ 
                  minHeight: '400px',
                  display: useSimplifiedScanner ? 'none' : 'block'
                }}
              >
                {!isScanning && !cameraError && !useSimplifiedScanner && (
                  <div className="text-center py-12">
                    <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Click "Start Scanner" to begin</p>
                  </div>
                )}
              </div>
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
                  {scanResult?.success ? 'PRESENT' : 'NOT RECOGNIZED'}
                </h2>

                {scanResult?.user && (
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-6 mb-6">
                    {/* User Photo */}
                    <div className="flex items-center justify-center mb-4">
                      {scanResult.user.photoUrl ? (
                        <img
                          src={scanResult.user.photoUrl}
                          alt={scanResult.user.name || 'User'}
                          className="w-24 h-24 rounded-full object-cover border-4 border-emerald shadow-lg"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-gray-300 flex items-center justify-center border-4 border-emerald">
                          <User className="h-12 w-12 text-gray-600" />
                        </div>
                      )}
                    </div>

                    {/* User Name */}
                    <h3 className="text-xl font-semibold text-charcoal mb-3 text-center">
                      {scanResult.user.name || scanResult.user.fullName || 'User'}
                    </h3>

                    {/* Table Info */}
                    {scanResult.tableInfo && (
                      <div className="text-center mb-4 pb-4 border-b-2 border-gray-300">
                        <p className="text-xs text-gray-600 font-medium">From Table:</p>
                        <p className="text-sm font-semibold text-blue-700">{scanResult.tableInfo.name}</p>
                      </div>
                    )}
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
            <li>• <strong>Select a Table:</strong> Choose the table you want to scan from (or leave as "All Tables" to search across the database)</li>
            <li>• <strong>Position QR Code:</strong> Position the QR code within the scanning frame</li>
            <li>• <strong>Good Lighting:</strong> Ensure bright, even lighting for optimal scanning</li>
            <li>• <strong>Hold Steady:</strong> Keep the code steady until recognized</li>
            <li>• <strong>View Results:</strong> Results display automatically after scanning with fields specific to that table</li>
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