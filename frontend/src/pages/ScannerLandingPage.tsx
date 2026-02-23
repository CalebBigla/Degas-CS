import { useState, useEffect } from 'react';
import { Shield, Camera, Upload, Keyboard } from 'lucide-react';
import { QRScanner } from '../components/scanner/QRScanner';
import { VerificationResult } from '../components/scanner/VerificationResult';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

interface VerificationData {
  valid: boolean;
  user?: {
    name: string;
    stateCode: string;
    designation: string;
    photoUrl?: string;
  };
  message: string;
  timestamp: string;
}

interface Table {
  id: string;
  name: string;
}

export function ScannerLandingPage() {
  const [isScanning, setIsScanning] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationData | null>(null);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(5);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [tables, setTables] = useState<Table[]>([]);
  const [loadingTables, setLoadingTables] = useState(false);

  // Fetch available tables on mount
  useEffect(() => {
    const fetchTables = async () => {
      try {
        setLoadingTables(true);
        const token = localStorage.getItem('degas_token');
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${import.meta.env.VITE_API_URL}/scanner/tables`, { headers });
        const data = await response.json();
        
        if (data.success && data.data) {
          setTables(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch tables:', error);
      } finally {
        setLoadingTables(false);
      }
    };

    fetchTables();
  }, []);

  // Auto-restart scanner after 5 seconds
  useEffect(() => {
    if (verificationResult && !isVerifying) {
      setCountdown(5);
      const countdownInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            handleScanAgain();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(countdownInterval);
    }
  }, [verificationResult, isVerifying]);

  const handleScanSuccess = async (qrData: string) => {
    console.log('QR Code scanned:', qrData);
    setIsScanning(false);
    setIsVerifying(true);
    setError('');

    try {
      // Extract QR data from URL if it's a verification URL
      let extractedData = qrData;
      
      // Check if it's a verification URL format
      if (qrData.includes('/verify/')) {
        const parts = qrData.split('/verify/');
        if (parts.length > 1) {
          extractedData = decodeURIComponent(parts[1]);
          console.log('Extracted QR data from URL:', extractedData);
        }
      }
      
      // Get token from localStorage if available
      const token = localStorage.getItem('degas_token');
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL}/scanner/verify`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          qrData: extractedData,
          scannerLocation: 'Web Scanner',
          selectedTableId: selectedTableId || undefined
        }),
      });

      // Defensive JSON parsing - handle empty or invalid responses
      let data;
      try {
        const text = await response.text();
        
        if (!text) {
          throw new Error('Server returned empty response');
        }

        try {
          data = JSON.parse(text);
        } catch (parseError) {
          console.error('❌ Invalid JSON returned by server:', {
            statusCode: response.status,
            responseText: text?.substring(0, 200),
            parseError: (parseError as Error)?.message
          });
          throw new Error(`Server returned invalid response: ${(parseError as Error)?.message}`);
        }
      } catch (textError: any) {
        console.error('❌ Failed to read response:', textError?.message);
        throw new Error(`Failed to read server response: ${textError?.message}`);
      }

      console.log('✅ Verification response:', data);

      if (data.success && data.data) {
        // Play success sound
        playSound(data.data.accessGranted || data.data.valid);
        
        setVerificationResult({
          valid: data.data.accessGranted || data.data.valid,
          user: data.data.user ? {
            name: data.data.user.fullName || data.data.user.name,
            stateCode: data.data.user.employeeId || data.data.user.stateCode || data.data.user.id,
            designation: data.data.user.role || data.data.user.designation,
            photoUrl: data.data.user.photoUrl
          } : undefined,
          message: data.data.message || (data.data.accessGranted ? 'Access Granted' : 'Access Denied'),
          timestamp: new Date().toISOString()
        });
      } else {
        throw new Error(data.error || 'Verification failed');
      }
    } catch (err: any) {
      console.error('Verification error:', err);
      setError(err.message || 'Failed to verify QR code');
      playSound(false);
      setVerificationResult({
        valid: false,
        message: 'QR Code not recognized',
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const playSound = (success: boolean) => {
    const audio = new Audio(success ? '/sounds/success.mp3' : '/sounds/error.mp3');
    audio.play().catch(() => {});
    
    if ('vibrate' in navigator) {
      navigator.vibrate(success ? [200] : [100, 50, 100]);
    }
  };

  const handleScanAgain = () => {
    setVerificationResult(null);
    setIsScanning(true);
    setError('');
    setShowManualInput(false);
    setManualCode('');
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) {
      setError('Please enter a QR code');
      return;
    }
    await handleScanSuccess(manualCode.trim());
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // TODO: Implement QR code reading from image file
    setError('Image upload feature coming soon');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="bg-gray-900/50 backdrop-blur-sm border-b border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-center space-x-3">
            <Shield className="h-8 w-8 text-emerald-400" />
            <h1 className="text-2xl font-bold text-white">Degas CS Scanner</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Table Selector - Always visible at top */}
          <div className="mb-6 bg-gray-800 rounded-lg shadow-xl overflow-hidden border border-gray-700">
            <div className="p-4 bg-gradient-to-r from-blue-900/50 to-blue-800/50 border-b border-blue-700">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-semibold text-blue-200">
                  📋 Select Table for Scanning
                </label>
                {selectedTableId && (
                  <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded-full">
                    Filtering by table
                  </span>
                )}
              </div>
              {loadingTables ? (
                <p className="text-sm text-gray-400">Loading tables...</p>
              ) : (
                <div className="space-y-2">
                  <select
                    value={selectedTableId}
                    onChange={(e) => setSelectedTableId(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 text-white border-2 border-blue-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
                  >
                    <option value="">🔍 All Tables (Search Across All)</option>
                    {tables.map((table) => (
                      <option key={table.id} value={table.id}>
                        📊 {table.name}
                      </option>
                    ))}
                  </select>
                  {selectedTableId && tables.length > 0 && (
                    <p className="text-xs text-blue-300 italic">
                      Scanning only: {tables.find(t => t.id === selectedTableId)?.name || 'Selected table'}
                    </p>
                  )}
                  {!selectedTableId && (
                    <p className="text-xs text-gray-400 italic">
                      Scanning all tables in the system
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Title Section */}
          {isScanning && !verificationResult && !showManualInput && (
            <div className="text-center mb-8 animate-fadeIn">
              <Camera className="h-16 w-16 text-emerald-400 mx-auto mb-4 animate-pulse" />
              <h2 className="text-3xl font-bold text-white mb-2">Scan QR Code</h2>
              <p className="text-gray-400">Position the QR code within the green frame</p>
              <div className="mt-4 inline-flex items-center space-x-2 px-4 py-2 bg-emerald-900/30 border border-emerald-700 rounded-full">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                <span className="text-emerald-400 text-sm font-medium">Scanner Active</span>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Scanner / Result Display */}
          <div className="bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
            {isVerifying ? (
              <div className="p-12 text-center">
                <LoadingSpinner size="lg" />
                <p className="text-white mt-4 text-lg">Verifying QR Code...</p>
              </div>
            ) : verificationResult ? (
              <div className="p-6">
                <VerificationResult 
                  result={verificationResult}
                  onScanAgain={handleScanAgain}
                  countdown={countdown}
                />
              </div>
            ) : showManualInput ? (
              <div className="p-6">
                <div className="text-center mb-6">
                  <Keyboard className="h-12 w-12 text-blue-400 mx-auto mb-3" />
                  <h3 className="text-xl font-bold text-white mb-2">Manual Entry</h3>
                  <p className="text-gray-400 text-sm">Enter QR code data manually</p>
                </div>
                
                <form onSubmit={handleManualSubmit} className="space-y-4">
                  <div>
                    <textarea
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                      placeholder="Paste QR code data here..."
                      className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[120px] font-mono text-sm"
                      autoFocus
                    />
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      className="flex-1 py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
                    >
                      Verify Code
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowManualInput(false);
                        setManualCode('');
                        setError('');
                      }}
                      className="flex-1 py-3 px-6 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
                    >
                      Back to Scanner
                    </button>
                  </div>
                </form>
              </div>
            ) : isScanning ? (
              <div className="p-6">
                <QRScanner 
                  onScanSuccess={handleScanSuccess}
                  onScanError={setError}
                />
                
                {/* Options */}
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => {
                      setIsScanning(false);
                      setShowManualInput(true);
                    }}
                    className="flex-1 inline-flex items-center justify-center space-x-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    <Keyboard className="h-5 w-5" />
                    <span>Manual Entry</span>
                  </button>
                  
                  <label className="flex-1 inline-flex items-center justify-center space-x-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg cursor-pointer transition-colors">
                    <Upload className="h-5 w-5" />
                    <span>Upload Image</span>
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            ) : null}
          </div>

          {/* Instructions */}
          {isScanning && !verificationResult && !showManualInput && (
            <div className="mt-8 bg-gray-800/50 rounded-lg p-6 border border-gray-700">
              <h3 className="text-white font-semibold mb-3">Scanning Tips:</h3>
              <ul className="text-gray-300 space-y-2 text-sm">
                <li>• <strong>Table Selection:</strong> Choose a specific table or scan all tables</li>
                <li>• Hold your device steady and ensure good lighting</li>
                <li>• Center the QR code within the green frame</li>
                <li>• Keep the QR code flat and avoid glare</li>
                <li>• Wait for automatic detection (no need to click)</li>
                <li>• Use "Manual Entry" if camera scanning fails</li>
              </ul>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-gray-500 text-sm py-6">
        <p>© 2026 Degas CS - Secure Access Control System</p>
      </footer>
    </div>
  );
}
