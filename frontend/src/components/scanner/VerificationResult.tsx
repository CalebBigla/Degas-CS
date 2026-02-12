import { CheckCircle, XCircle, User } from 'lucide-react';

interface VerificationResultProps {
  result: {
    valid: boolean;
    user?: {
      name: string;
      stateCode: string;
      designation: string;
      photoUrl?: string;
    };
    message: string;
    timestamp: string;
  };
  onScanAgain: () => void;
  countdown?: number;
}

export function VerificationResult({ result, onScanAgain, countdown }: VerificationResultProps) {
  const isValid = result.valid;

  return (
    <div className="w-full max-w-md mx-auto animate-fadeIn">
      <div className={`rounded-2xl shadow-2xl overflow-hidden ${
        isValid ? 'bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-500' 
                : 'bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-500'
      }`}>
        {/* Header */}
        <div className={`p-6 text-center ${
          isValid ? 'bg-emerald-600' : 'bg-red-600'
        }`}>
          <div className="flex justify-center mb-3">
            {isValid ? (
              <CheckCircle className="h-16 w-16 text-white animate-scaleIn" />
            ) : (
              <XCircle className="h-16 w-16 text-white animate-shake" />
            )}
          </div>
          <h2 className="text-2xl font-bold text-white">
            {isValid ? 'ACCESS GRANTED' : 'ACCESS DENIED'}
          </h2>
        </div>

        {/* Content */}
        <div className="p-6">
          {isValid && result.user ? (
            <div className="space-y-4">
              {/* User Photo */}
              <div className="flex justify-center">
                {result.user.photoUrl ? (
                  <img 
                    src={result.user.photoUrl}
                    alt={result.user.name}
                    className="w-32 h-32 rounded-full object-cover border-4 border-emerald-500 shadow-lg"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-emerald-200 flex items-center justify-center border-4 border-emerald-500">
                    <User className="h-16 w-16 text-emerald-700" />
                  </div>
                )}
              </div>

              {/* User Details */}
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-bold text-gray-900">{result.user.name}</h3>
                <div className="space-y-1">
                  <p className="text-lg text-gray-700">
                    <span className="font-semibold">ID:</span> {result.user.stateCode}
                  </p>
                  <p className="text-lg text-gray-700">
                    <span className="font-semibold">Role:</span> {result.user.designation}
                  </p>
                </div>
              </div>

              {/* Timestamp */}
              <div className="text-center text-sm text-gray-600 pt-2 border-t border-emerald-200">
                Verified at {new Date(result.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <p className="text-lg text-red-800 font-semibold">{result.message}</p>
              <p className="text-sm text-red-600">
                This QR code is not recognized in the system.
              </p>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="p-6 pt-0 space-y-3">
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
