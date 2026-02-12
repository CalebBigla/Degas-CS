import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import './index.css';
import App from './App';
import { AuthProvider } from './hooks/useAuth';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Error Boundary to catch App crashes
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error?: Error}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    console.error('❌ App crashed:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('❌ Error details:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '40px', 
          backgroundColor: '#fee2e2', 
          color: '#dc2626',
          fontFamily: 'Arial, sans-serif',
          minHeight: '100vh'
        }}>
          <h1>🚨 App Crashed</h1>
          <p><strong>Error:</strong> {this.state.error?.message}</p>
          <details style={{ marginTop: '20px' }}>
            <summary>Stack Trace</summary>
            <pre style={{ fontSize: '12px', overflow: 'auto' }}>{this.state.error?.stack}</pre>
          </details>
          <button 
            onClick={() => window.location.reload()}
            style={{ 
              padding: '10px 20px', 
              backgroundColor: '#dc2626', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer',
              marginTop: '20px'
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

console.log('🔧 main.tsx executing...');
console.log('✅ React:', React);
console.log('✅ ReactDOM:', ReactDOM);
console.log('✅ BrowserRouter:', BrowserRouter);
console.log('✅ QueryClient:', QueryClient);
console.log('✅ App:', App);
console.log('✅ AuthProvider:', AuthProvider);

const rootElement = document.getElementById('root');
console.log('✅ Root element:', rootElement);

if (!rootElement) {
  console.error('❌ Root element not found!');
  document.body.innerHTML = '<div style="padding: 40px; color: red;">Error: Root element not found!</div>';
} else {
  try {
    console.log('🚀 Creating React root...');
    const root = ReactDOM.createRoot(rootElement);
    console.log('✅ React root created');
    
    console.log('🎨 Rendering app...');
    root.render(
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <AuthProvider>
              <App />
              <Toaster position="top-right" />
            </AuthProvider>
          </BrowserRouter>
        </QueryClientProvider>
      </ErrorBoundary>,
    );
    console.log('✅ App rendered successfully');
  } catch (error) {
    console.error('❌ Failed to render app:', error);
    document.body.innerHTML = `<div style="padding: 40px; color: red;">
      <h1>Failed to render app</h1>
      <pre>${error}</pre>
    </div>`;
  }
}