import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || '/api';

// Debug: Log the API URL being used
console.log('🔧 API Configuration:', {
  VITE_API_URL: (import.meta as any).env?.VITE_API_URL,
  API_BASE_URL,
  allEnvVars: (import.meta as any).env
});

// Backend readiness state
let isBackendReady = false;
let healthCheckPromise: Promise<void> | null = null;

// Health check function
const checkBackendHealth = async (): Promise<void> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/health`, { 
      timeout: 5000,
      // Don't use the main api instance to avoid circular dependency
    });
    
    if (response.data.ready === true) {
      isBackendReady = true;
      console.log('✅ Backend is ready');
    } else {
      throw new Error('Backend not ready yet');
    }
  } catch (error) {
    console.log('⏳ Backend not ready, retrying...');
    throw error;
  }
};

// Wait for backend to be ready with exponential backoff
const waitForBackend = async (): Promise<void> => {
  if (isBackendReady) return;
  
  if (healthCheckPromise) {
    return healthCheckPromise;
  }

  healthCheckPromise = new Promise(async (resolve, reject) => {
    let attempts = 0;
    const maxAttempts = 30; // 30 attempts max
    
    const tryHealthCheck = async () => {
      try {
        await checkBackendHealth();
        healthCheckPromise = null;
        resolve();
      } catch (error) {
        attempts++;
        
        if (attempts >= maxAttempts) {
          healthCheckPromise = null;
          reject(new Error('Backend failed to start after maximum attempts'));
          return;
        }
        
        // Exponential backoff: 1s, 2s, 4s, 8s, then 10s max
        const delay = Math.min(1000 * Math.pow(2, attempts - 1), 10000);
        console.log(`⏳ Waiting ${delay}ms before retry (attempt ${attempts}/${maxAttempts})`);
        
        setTimeout(tryHealthCheck, delay);
      }
    };
    
    tryHealthCheck();
  });
  
  return healthCheckPromise;
};

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// Request interceptor to add auth token and wait for backend
api.interceptors.request.use(
  async (config) => {
    // Skip health check for the health endpoint itself
    if (!config.url?.includes('/health')) {
      try {
        await waitForBackend();
      } catch (error) {
        console.error('Backend health check failed:', error);
        // Continue with request anyway - let it fail naturally
      }
    }
    
    const token = localStorage.getItem('degas_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle backend not ready errors
    if (error.response?.status === 503 && error.response?.data?.ready === false) {
      console.log('🔄 Backend not ready, waiting...');
      isBackendReady = false; // Reset ready state
      
      try {
        await waitForBackend();
        // Retry the original request
        return api(originalRequest);
      } catch (healthError) {
        console.error('Failed to wait for backend:', healthError);
        return Promise.reject(error);
      }
    }

    if ((error.response?.status === 401 || error.response?.status === 403) && !originalRequest._retry) {
      originalRequest._retry = true;

      // If it's a JWT signature error, clear tokens immediately
      if (error.response?.data?.error?.includes('invalid signature') || 
          error.response?.data?.error?.includes('Invalid or expired token')) {
        console.log('🔄 Invalid JWT signature detected, clearing tokens...');
        localStorage.removeItem('degas_token');
        localStorage.removeItem('degas_refresh_token');
        localStorage.removeItem('degas_admin');
        window.location.href = '/login';
        return Promise.reject(error);
      }

      // Try to refresh token
      const refreshToken = localStorage.getItem('degas_refresh_token');
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });

          const { token } = response.data.data;
          localStorage.setItem('degas_token', token);

          // Retry original request
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed, redirect to login
          localStorage.removeItem('degas_token');
          localStorage.removeItem('degas_refresh_token');
          localStorage.removeItem('degas_admin');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      } else {
        // No refresh token, redirect to login
        localStorage.removeItem('degas_token');
        localStorage.removeItem('degas_refresh_token');
        localStorage.removeItem('degas_admin');
        window.location.href = '/login';
      }
    }

    // Show error toast for non-401, non-403, and non-503 errors
    if (error.response?.status !== 401 && error.response?.status !== 403 && error.response?.status !== 503) {
      const message = error.response?.data?.error || 'An error occurred';
      toast.error(message);
    }

    return Promise.reject(error);
  }
);

// Export health check function for manual use
export const checkHealth = checkBackendHealth;
export const waitForBackendReady = waitForBackend;

export default api;