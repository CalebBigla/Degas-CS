import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import dotenv from 'dotenv';

// Import utilities
import logger from './config/logger';
import { initializeDatabase, testDatabaseConnection, verifyDatabaseSchema } from './config/database';

// Load environment variables
dotenv.config();

// Validate critical environment variables
if (!process.env.JWT_SECRET) {
  console.error('❌ CRITICAL: JWT_SECRET environment variable is not set');
  process.exit(1);
}

if (!process.env.QR_SECRET) {
  console.error('❌ CRITICAL: QR_SECRET environment variable is not set');
  process.exit(1);
}

logger.info('✅ Environment variables validated');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust Render proxy for accurate IP addresses
app.set('trust proxy', 1);

// Global state for backend readiness
let isBackendReady = false;
let backendError: string | null = null;

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration - Allow local network access
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'https://localhost:5173',
  'http://127.0.0.1:5173',
  'https://127.0.0.1:5173',
];

// Allow any local network IP (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Allow local network IPs (both HTTP and HTTPS)
    const localNetworkPattern = /^https?:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}):5173$/;
    if (localNetworkPattern.test(origin)) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  }
});

app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static file serving for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/temp', express.static(path.join(__dirname, '../temp')));

// Health check endpoint - ALWAYS available
app.get('/api/health', (req, res) => {
  if (!isBackendReady) {
    return res.status(503).json({
      success: false,
      message: 'Backend is starting up...',
      ready: false,
      error: backendError,
      timestamp: new Date().toISOString()
    });
  }

  const mockMode = process.env.DEV_MOCK === 'true';
  
  if (mockMode) {
    return res.json({
      success: true,
      message: 'Degas CS API is running',
      ready: true,
      timestamp: new Date().toISOString(),
      database: {
        status: 'mock-mode',
        mode: 'development-only'
      },
      environment: process.env.NODE_ENV || 'development',
      warning: 'MOCK MODE ENABLED - Not suitable for production'
    });
  }

  res.json({
    success: true,
    message: 'Degas CS API is running',
    ready: true,
    timestamp: new Date().toISOString(),
    database: {
      status: 'connected',
      mode: 'production-safe'
    },
    environment: process.env.NODE_ENV || 'development'
  });
});

// Middleware to check backend readiness for all other API routes
app.use('/api/*', (req, res, next) => {
  if (!isBackendReady) {
    return res.status(503).json({
      success: false,
      error: 'Backend is not ready yet. Please wait for initialization to complete.',
      ready: false,
      timestamp: new Date().toISOString()
    });
  }
  next();
});

// Initialize database and register routes
async function initializeBackend() {
  try {
    logger.info('🚀 Starting Degas CS backend initialization...');
    
    // STEP 0: Ensure required directories exist
    const fs = await import('fs/promises');
    const uploadsDir = path.join(__dirname, '../uploads');
    const tempDir = path.join(__dirname, '../temp');
    
    try {
      await fs.mkdir(uploadsDir, { recursive: true });
      await fs.mkdir(tempDir, { recursive: true });
      logger.info('📁 Required directories created/verified');
    } catch (dirError) {
      logger.warn('⚠️  Directory creation warning:', dirError);
    }
    
    // Check if mock mode is enabled
    const mockMode = process.env.DEV_MOCK === 'true';
    
    if (mockMode) {
      logger.warn('🚨 MOCK MODE ENABLED - Skipping database checks');
      logger.warn('⚠️  This should NEVER be used in production');
    } else {
      // STEP 1: Initialize SQLite database
      logger.info('📊 Initializing SQLite database...');
      await initializeDatabase();
      
      // STEP 2: Test database connectivity
      logger.info('🔍 Testing database connectivity...');
      await testDatabaseConnection();
      
      // STEP 3: Verify database schema
      logger.info('✅ Verifying database schema...');
      await verifyDatabaseSchema();
      
      logger.info('🗄️ SQLite database ready - system is production-ready');
    }

    // STEP 4: Register API routes ONLY after database is ready
    logger.info('🛣️  Registering API routes...');
    
    // Import routes dynamically after database is ready
    const authRoutes = (await import('./routes/auth')).default;
    const userRoutes = (await import('./routes/users')).default;
    const scannerRoutes = (await import('./routes/scanner')).default;
    const analyticsRoutes = (await import('./routes/analytics')).default;
    const tableRoutes = (await import('./routes/tables')).default;

    // Register routes
    app.use('/api/auth', authRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/scanner', scannerRoutes);
    app.use('/api/analytics', analyticsRoutes);
    app.use('/api/tables', tableRoutes);
    
    // Settings routes
    const settingsRoutes = (await import('./routes/settings')).default;
    app.use('/api/settings', settingsRoutes);

    // 404 handler for API routes
    app.use('/api/*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'API endpoint not found'
      });
    });

    // Global error handler
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('Unhandled error:', err);
      
      res.status(err.status || 500).json({
        success: false,
        error: process.env.NODE_ENV === 'production' 
          ? 'Internal server error' 
          : err.message
      });
    });

    // Mark backend as ready
    isBackendReady = true;
    backendError = null;
    
    logger.info('✅ Backend initialization complete - API routes registered');
    logger.info('🎯 System ready to accept requests');

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error';
    backendError = errorMessage;
    isBackendReady = false;
    
    logger.error('❌ Backend initialization failed:', error);
    logger.error('🛑 API routes will not be available until initialization succeeds');
    
    if (process.env.DEV_MOCK !== 'true') {
      logger.error('💡 Check your SQLite database configuration and file permissions');
      logger.error('💡 Or set DEV_MOCK=true for development testing');
      throw error; // Re-throw to stop server startup
    }
  }
}

// Start server
async function startServer() {
  try {
    // Start HTTP server first
    const server = app.listen(PORT, () => {
      logger.info(`🌐 Degas CS server listening on port ${PORT}`);
      logger.info(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
      logger.info('⏳ Initializing backend services...');
    });

    // Initialize backend services asynchronously
    await initializeBackend();

    if (isBackendReady) {
      logger.info('🚀 PRODUCTION-SAFE MODE: Database-first, no mock fallbacks');
    } else {
      logger.warn('⚠️  Backend initialization incomplete - some features may not work');
    }

    return server;

  } catch (error) {
    logger.error('❌ Server startup failed:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start the server
startServer();

export default app;