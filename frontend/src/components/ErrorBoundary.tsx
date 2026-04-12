import React, { ReactNode, ErrorInfo } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
  componentName?: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary Component
 * 
 * Catches rendering errors in child components and prevents app crashes.
 * Provides a fallback UI when errors occur.
 * 
 * Usage:
 * <ErrorBoundary componentName="ScannerPage">
 *   <ScannerPage />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { 
      hasError: true,
      error,
      errorInfo: null 
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`❌ Error in ${this.props.componentName || 'component'}:`, error);
    console.error('Error Info:', errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Notify parent if callback provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    console.log('🔄 Resetting error boundary...');
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-charcoal flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-xl overflow-hidden">
            <div className="bg-red-50 border-b-4 border-crimson p-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-8 w-8 text-crimson flex-shrink-0" />
                <h1 className="text-xl font-bold text-red-900">Something Went Wrong</h1>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-gray-700 font-medium">
                {this.props.componentName && `Error in ${this.props.componentName}:`}
                An unexpected error occurred.
              </p>

              {this.state.error && (
                <div className="bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto">
                  <p className="text-sm font-mono text-red-700 break-words">
                    {this.state.error.toString()}
                  </p>
                </div>
              )}

              {this.state.errorInfo && (
                <details className="text-xs text-gray-600">
                  <summary className="cursor-pointer font-semibold hover:text-gray-900">
                    Technical Details
                  </summary>
                  <pre className="mt-2 bg-gray-50 rounded p-2 overflow-x-auto text-gray-700 whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}

              <button
                onClick={this.handleReset}
                className="w-full bg-navy-600 hover:bg-navy-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Try Again
              </button>

              <button
                onClick={() => window.location.href = '/'}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg transition-colors"
              >
                Return to Home
              </button>

              <p className="text-xs text-gray-500 text-center">
                If the problem persists, please refresh the page or contact support.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
