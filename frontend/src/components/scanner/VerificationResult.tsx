import { CheckCircle, XCircle, User } from 'lucide-react';

interface VerificationResultProps {
  result: {
    success?: boolean;
    valid?: boolean;
    user?: {
      name?: string;
      stateCode?: string;
      designation?: string;
      photoUrl?: string;
      fullName?: string;
      id?: string;
      uuid?: string;
    };
    message: string;
    timestamp?: string;
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
    accessGranted?: boolean;
  };
  onScanAgain: () => void;
  countdown?: number;
}

export function VerificationResult({ result, onScanAgain, countdown }: VerificationResultProps) {
  // Explicitly check for success - only true if one of the success indicators is explicitly true
  const isValid = result.success === true || result.valid === true || result.accessGranted === true;
  const userName = result.user?.fullName || result.user?.name || 'Unknown';
  const photoUrl = result.user?.photoUrl;

  return (
    <div className="w-full max-w-md mx-auto animate-slideInUp">
      <div className={`rounded-2xl shadow-2xl overflow-hidden ${
        isValid ? 'bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-500' 
                : 'bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-500'
      }`}>
        {/* Header */}
        <div className={`relative p-6 text-center overflow-hidden ${
          isValid ? 'bg-gradient-to-br from-emerald-600 to-emerald-700' : 'bg-gradient-to-br from-red-600 to-red-700'
        }`}>
          {/* Animated background circles */}
          <div className="absolute inset-0 overflow-hidden">
            <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full animate-ping ${
              isValid ? 'bg-emerald-400/20' : 'bg-red-400/20'
            }`} style={{ animationDuration: '2s' }}></div>
            <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full animate-pulse ${
              isValid ? 'bg-emerald-300/30' : 'bg-red-300/30'
            }`}></div>
          </div>

          <div className="relative z-10">
            <div className="flex justify-center mb-3">
              {isValid ? (
                <div className="relative">
                  <CheckCircle className="h-16 w-16 text-white animate-scaleIn" strokeWidth={2.5} />
                  <div className="absolute inset-0 animate-ping">
                    <CheckCircle className="h-16 w-16 text-emerald-200 opacity-75" strokeWidth={2.5} />
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <XCircle className="h-16 w-16 text-white animate-shake" strokeWidth={2.5} />
                  <div className="absolute inset-0 animate-ping">
                    <XCircle className="h-16 w-16 text-red-200 opacity-75" strokeWidth={2.5} />
                  </div>
                </div>
              )}
            </div>
            <h2 className="text-2xl font-bold text-white animate-fadeIn">
              {isValid ? 'ACCESS GRANTED' : 'ACCESS DENIED'}
            </h2>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 animate-fadeIn" style={{ animationDelay: '0.2s' }}>
          {isValid && result.user ? (
            <div className="space-y-4">
              {/* User Photo */}
              <div className="flex justify-center">
                {photoUrl ? (
                  <img 
                    src={photoUrl}
                    alt={userName}
                    className="w-32 h-32 rounded-full object-cover border-4 border-emerald-500 shadow-lg animate-scaleIn"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-emerald-200 flex items-center justify-center border-4 border-emerald-500 animate-scaleIn">
                    <User className="h-16 w-16 text-emerald-700" />
                  </div>
                )}
              </div>

              {/* User Details */}
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold text-gray-900">{userName}</h3>
                {result.tableInfo && (
                  <p className="text-sm text-gray-600 italic">From: {result.tableInfo.name}</p>
                )}
                
                {/* Dynamic Fields from Schema */}
                {result.schema && result.schema.length > 0 && result.fieldValues ? (
                  <div className="space-y-2 pt-3 border-t border-emerald-200">
                    {result.schema.map((field) => {
                      const value = result.fieldValues?.[field.name];
                      // Only display if field has a value
                      if (value === null || value === undefined || value === '') {
                        return null;
                      }
                      return (
                        <div key={field.id}>
                          <p className="text-sm text-gray-700">
                            <span className="font-semibold capitalize">{field.name}:</span> {String(value)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  // Fallback to hardcoded fields for backwards compatibility
                  <div className="space-y-1">
                    {result.user?.stateCode && (
                      <p className="text-lg text-gray-700">
                        <span className="font-semibold">ID:</span> {result.user.stateCode}
                      </p>
                    )}
                    {result.user?.designation && (
                      <p className="text-lg text-gray-700">
                        <span className="font-semibold">Role:</span> {result.user.designation}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Timestamp */}
              <div className="text-center text-sm text-gray-600 pt-2 border-t border-emerald-200">
                {result.timestamp ? `Verified at ${new Date(result.timestamp).toLocaleTimeString()}` : 'Verified'}
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4 animate-fadeIn">
              {/* Error Icon for Denied */}
              <div className="flex justify-center mb-4">
                <div className="w-32 h-32 rounded-full bg-red-200 flex items-center justify-center border-4 border-red-500 animate-scaleIn">
                  <XCircle className="h-16 w-16 text-red-700" strokeWidth={2} />
                </div>
              </div>
              
              <p className="text-lg text-red-800 font-bold">Invalid QR Code</p>
              <p className="text-sm text-red-600">
                {result.message}
              </p>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="p-6 pt-0 space-y-3 animate-fadeIn" style={{ animationDelay: '0.3s' }}>
          {countdown !== undefined && countdown > 0 && (
            <div className="text-center">
              <p className={`text-sm font-medium ${isValid ? 'text-emerald-700' : 'text-red-700'}`}>
                Auto-restarting in {countdown} second{countdown !== 1 ? 's' : ''}...
              </p>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 ease-linear ${
                    isValid ? 'bg-emerald-600' : 'bg-red-600'
                  }`}
                  style={{ width: `${(countdown / 5) * 100}%` }}
                />
              </div>
            </div>
          )}
          <button
            onClick={onScanAgain}
            className={`w-full py-3 px-6 rounded-lg font-semibold text-white transition-all ${
              isValid 
                ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-95' 
                : 'bg-red-600 hover:bg-red-700 active:scale-95'
            }`}
          >
            Scan Another QR Code Now
          </button>
        </div>
      </div>
    </div>
  );
}
