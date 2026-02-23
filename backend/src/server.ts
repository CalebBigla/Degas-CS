import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import dotenv from 'dotenv';

// Import utilities
import logger from './config/logger';
import { initializeDatabase, testDatabaseConnection, verifyDatabaseSchema, getDatabase } from './config/database';

// Load environment variables
dotenv.config();

// Validate critical environment variables
const requiredEnv = ['JWT_SECRET', 'QR_SECRET'];
const missingEnv = requiredEnv.filter(env => !process.env[env]);

if (missingEnv.length > 0) {
  console.error(`❌ CRITICAL: Missing environment variables: ${missingEnv.join(', ')}`);
  process.exit(1);
}

// Validate database configuration
const dbType = process.env.DATABASE_TYPE || 'sqlite';
if (dbType === 'postgresql') {
  if (!process.env.DATABASE_URL) {
    console.error('❌ CRITICAL: DATABASE_URL is required for PostgreSQL');
    process.exit(1);
  }
  logger.info('✅ PostgreSQL configured with DATABASE_URL');
  if (!process.env.FRONTEND_URL) {
    console.warn('⚠️  FRONTEND_URL not set - CORS may not work correctly for production');
  }
} else {
  logger.info('✅ SQLite configured');
}

// Validate optional but recommended variables for production
if (process.env.NODE_ENV === 'production') {
  const recommendedEnv = ['FRONTEND_URL'];
  const missingRecommended = recommendedEnv.filter(env => !process.env[env]);
  if (missingRecommended.length > 0) {
    logger.warn(`⚠️  Production mode: Recommended environment variables missing: ${missingRecommended.join(', ')}`);
  }
  
  if (process.env.DATABASE_TYPE === 'postgresql' && !process.env.CLOUDINARY_CLOUD_NAME) {
    logger.warn('⚠️  Cloudinary not configured - file uploads will use ephemeral storage');
  }
}

logger.info('✅ Environment variables validated');
logger.info(`📦 Database Type: ${dbType}`);
logger.info(`🔐 Node Environment: ${process.env.NODE_ENV || 'development'}`);
logger.info(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'not set'}`);

const app = express();
const PORT = parseInt(process.env.PORT || '10000', 10);

// Trust Render proxy for accurate IP addresses
app.set('trust proxy', 1);

// Global state for backend readiness
let isBackendReady = false;
let backendError: string | null = null;

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration - Allow local network access and production frontend
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:5173',
  'https://localhost:5173',
  'http://127.0.0.1:5173',
  'https://127.0.0.1:5173',
];

// Allow any local network IP (192.168.x.x, 10.x.x.x, 172.16-31.x.x) and Render domains
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
    
    // Allow Render.com domains (production frontend)
    if (origin.includes('.onrender.com')) {
      return callback(null, true);
    }
    
    logger.warn(`CORS blocked origin: ${origin}`);
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

// Diagnostic endpoint - ALWAYS available, even during startup
app.get('/api/diagnostic', async (req, res) => {
  try {
    const { getDatabase } = await import('./config/database');
    const db = getDatabase();
    const dbType = process.env.DATABASE_TYPE || 'sqlite';
    
    // Check table existence and data
    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      database: {
        type: dbType,
        ready: isBackendReady
      },
      tables: {}
    };
    
    const requiredTables = ['admins', 'tables', 'dynamic_users', 'access_logs'];
    
    for (const tableName of requiredTables) {
      try {
        let countResult;
        if (dbType === 'sqlite') {
          countResult = await db.get(`SELECT COUNT(*) as count FROM ${tableName}`);
        } else {
          countResult = await db.get(`SELECT COUNT(*) as count FROM ${tableName}`);
        }
        
        diagnostics.tables[tableName] = {
          exists: true,
          rowCount: countResult?.count || 0
        };
      } catch (error: any) {
        diagnostics.tables[tableName] = {
          exists: false,
          error: error?.message || String(error)
        };
      }
    }
    
    // Test a specific query that's failing
    try {
      const testTableId = '602a884d-bf6f-4f2b-9346-7412d383f229';
      const testTable = await db.get('SELECT * FROM tables WHERE id = ?', [testTableId]);
      diagnostics.testQuery = {
        tableId: testTableId,
        found: !!testTable,
        tableColumns: testTable ? Object.keys(testTable) : []
      };
    } catch (error: any) {
      diagnostics.testQuery = {
        error: error?.message || String(error)
      };
    }
    
    res.json(diagnostics);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error?.message || String(error),
      stack: error?.stack
    });
  }
});

// Health check endpoint - ALWAYS available
app.get('/api/health', (req, res) => {
  if (!isBackendReady) {
    return res.status(503).json({
      success: false,
      message: 'Backend is starting up...',
      ready: false,
      error: backendError,
      timestamp: new Date().toISOString(),
      database: {
        type: process.env.DATABASE_TYPE || 'sqlite',
        status: 'initializing'
      }
    });
  }

  const mockMode = process.env.DEV_MOCK === 'true';
  const dbType = process.env.DATABASE_TYPE || 'sqlite';
  
  if (mockMode) {
    return res.json({
      success: true,
      message: 'Degas CS API is running',
      ready: true,
      timestamp: new Date().toISOString(),
      database: {
        status: 'mock-mode',
        type: dbType,
        mode: 'development-only'
      },
      environment: process.env.NODE_ENV || 'development',
      warning: 'MOCK MODE ENABLED - Not suitable for production',
      frontend: {
        url: process.env.FRONTEND_URL || 'not configured',
        corsEnabled: !!process.env.FRONTEND_URL
      },
      cloudinary: {
        configured: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY),
        provider: 'cloudinary'
      }
    });
  }

  res.json({
    success: true,
    message: 'Degas CS API is running',
    ready: true,
    timestamp: new Date().toISOString(),
    database: {
      status: 'connected',
      type: dbType,
      mode: 'production-safe'
    },
    environment: process.env.NODE_ENV || 'development',
    frontend: {
      url: process.env.FRONTEND_URL || 'not configured',
      corsEnabled: !!process.env.FRONTEND_URL
    },
    cloudinary: {
      configured: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY),
      provider: 'cloudinary'
    }
  });
});

// DEBUG: Public endpoints (no auth required) - must be before readiness check
app.get('/api/scanner/debug/qr-codes', async (req, res) => {
  try {
    const db = getDatabase();
    const dbType = process.env.DATABASE_TYPE || 'sqlite';
    
    // Get QR codes that match existing users
    const allQRs = await db.all(`
      SELECT id, user_id, table_id, qr_data, is_active, created_at, scan_count
      FROM qr_codes
      ORDER BY created_at DESC
      LIMIT 20
    `);
    
    // Get all active users from dynamic_users
    const users = await db.all(`
      SELECT id, data FROM dynamic_users LIMIT 10
    `);
    
    logger.info('DEBUG: Users in database:', { count: users?.length || 0 });
    logger.info('DEBUG: QR codes in database:', { count: allQRs?.length || 0 });
    
    const activeQRs = await db.get(`SELECT COUNT(*) as count FROM qr_codes WHERE is_active = ${dbType === 'sqlite' ? 1 : 'true'}`);
    
    res.json({
      success: true,
      data: {
        totalQRCodes: allQRs?.length || 0,
        activeCount: activeQRs?.count || 0,
        usersInDatabase: users?.length || 0,
        existingQRCodes: allQRs?.slice(0, 3).map((qr: any) => ({
          id: qr.id,
          userId: qr.user_id,
          tableId: qr.table_id,
          isActive: qr.is_active,
          createdAt: qr.created_at
        })) || [],
        availableUsers: users?.slice(0, 5).map((u: any) => ({
          id: u.id,
          name: u.data?.fullName || 'Unknown',
          table: u.data?.table || 'Unknown'
        })) || []
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Debug check failed',
      details: error?.message || String(error)
    });
  }
});

app.post('/api/scanner/debug/verify-qr', async (req, res) => {
  try {
    const { qrData } = req.body;
    if (!qrData) {
      return res.status(400).json({
        success: false,
        error: 'qrData required in body'
      });
    }
    const { QRService } = await import('./services/qrService');
    const { TableSchemaRegistry } = await import('./services/tableSchemaRegistry');
    const signatureResult = QRService.verifyQR(qrData);
    if (!signatureResult.valid) {
      return res.status(400).json({
        success: false,
        step: 'SIGNATURE_VERIFICATION',
        error: signatureResult.error
      });
    }
    const userId = signatureResult.payload?.userId;
    if (!userId) {
      return res.status(400).json({
        success: false,
        step: 'PAYLOAD_EXTRACTION',
        error: 'No userId in payload'
      });
    }
    const userResult = await TableSchemaRegistry.findUserAcrossTables(userId);
    if (!userResult) {
      return res.status(400).json({
        success: false,
        step: 'USER_LOOKUP',
        userId,
        error: 'User not found in any table'
      });
    }
    const db = getDatabase();
    const dbType = process.env.DATABASE_TYPE || 'sqlite';
    const isActiveCondition = dbType === 'sqlite' ? 'is_active = 1' : 'is_active = true';
    const qrRecord = await db.get(`
      SELECT id, is_active, scan_count, created_at
      FROM qr_codes
      WHERE user_id = ? AND ${isActiveCondition}
      ORDER BY created_at DESC
      LIMIT 1
    `, [userId]);
    if (!qrRecord) {
      return res.status(400).json({
        success: false,
        step: 'QR_RECORD_LOOKUP',
        userId,
        error: 'No active QR code found for user'
      });
    }
    res.json({
      success: true,
      verification: 'PASSED',
      data: {
        user: { id: userResult.user.id, name: userResult.user.data?.fullName },
        qrRecord: { id: qrRecord.id, scanCount: qrRecord.scan_count }
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error?.message || String(error)
    });
  }
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

// DEBUG: Log all scanner requests before any other middleware
app.use('/api/scanner', (req, res, next) => {
  logger.info('🎯 [INCOMING REQUEST] Scanner endpoint hit', {
    method: req.method,
    path: req.path,
    url: req.url,
    hasAuth: !!req.headers.authorization,
    contentType: req.headers['content-type'],
    bodyLength: req.body ? JSON.stringify(req.body).length : 0,
    bodyPreview: req.body ? JSON.stringify(req.body).substring(0, 100) : 'empty'
  });
  next();
});

// Initialize database and register routes
async function initializeBackend() {
  try {
    logger.info('🚀 Starting Degas CS backend initialization...');
    logger.info(`📊 Database Configuration: ${process.env.DATABASE_TYPE || 'sqlite'}`);
    
    // STEP 0: Ensure required directories exist
    const fs = await import('fs/promises');
    const uploadsDir = path.join(__dirname, '../uploads');
    const tempDir = path.join(__dirname, '../temp');
    
    try {
      await fs.mkdir(uploadsDir, { recursive: true });
      await fs.mkdir(tempDir, { recursive: true });
      logger.info('📁 Required directories created/verified', { uploadsDir, tempDir });
    } catch (dirError) {
      logger.warn('⚠️  Directory creation warning:', dirError);
    }
    
    // Check if mock mode is enabled
    const mockMode = process.env.DEV_MOCK === 'true';
    
    if (mockMode) {
      logger.warn('🚨 MOCK MODE ENABLED - Skipping database checks');
      logger.warn('⚠️  This should NEVER be used in production');
    } else {
      // STEP 1: Initialize database
      const dbType = process.env.DATABASE_TYPE || 'sqlite';
      logger.info(`📊 Initializing ${dbType.toUpperCase()} database...`);
      await initializeDatabase();
      logger.info(`✅ ${dbType.toUpperCase()} database initialized`);
      
      // STEP 2: Test database connectivity
      logger.info('🔍 Testing database connectivity...');
      await testDatabaseConnection();
      logger.info('✅ Database connectivity verified');
      
      // STEP 3: Verify database schema
      logger.info('📋 Verifying database schema...');
      await verifyDatabaseSchema();
      logger.info('✅ Database schema verified');
      
      logger.info(`🗄️ ${dbType.toUpperCase()} database ready - system is production-ready`);
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

    logger.info('✅ All API routes registered');

    // 404 handler for API routes
    app.use('/api/*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'API endpoint not found'
      });
    });

    // Global error handler - catch unhandled errors
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      const errorMessage = err?.message || String(err) || 'Unknown error';
      const errorStack = err?.stack || undefined;
      
      logger.error('🚨 Unhandled error:', {
        message: errorMessage,
        stack: errorStack,
        path: req.path,
        method: req.method,
        errorType: err?.constructor?.name || typeof err
      });
      
      // Ensure we ALWAYS send JSON
      if (res.headersSent) {
        logger.warn('⚠️ Headers already sent, cannot send error response');
        return;
      }
      
      return res.status(err.status || 500).json({
        success: false,
        error: process.env.NODE_ENV === 'production' 
          ? 'Internal server error' 
          : errorMessage,
        details: process.env.NODE_ENV === 'production' ? undefined : errorStack
      });
    });

    // Mark backend as ready
    isBackendReady = true;
    backendError = null;
    
    logger.info('✅ Backend initialization complete - API routes registered');
    logger.info('🎯 System ready to accept requests');
    
    // Log configuration summary
    const dbType = process.env.DATABASE_TYPE || 'sqlite';
    const hasCloudinary = !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY);
    logger.info('📋 System Configuration Summary:', {
      database: dbType,
      environment: process.env.NODE_ENV || 'development',
      fileStorage: hasCloudinary ? 'Cloudinary (persistent)' : 'Local (ephemeral)',
      corsEnabled: !!process.env.FRONTEND_URL,
      frontendUrl: process.env.FRONTEND_URL || 'not configured'
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error';
    const errorStack = error instanceof Error ? error.stack : '';
    backendError = errorMessage;
    isBackendReady = false;
    
    logger.error('❌ Backend initialization failed:', {
      message: errorMessage,
      stack: errorStack
    });
    logger.error('🛑 API routes will not be available until initialization succeeds');
    
    // Provide helpful guidance based on error type
    if (errorMessage.includes('DATABASE_URL')) {
      logger.error('💡 Hint: DATABASE_URL must be set for PostgreSQL connections');
    } else if (errorMessage.includes('ECONNREFUSED')) {
      logger.error('💡 Hint: Cannot connect to database. Verify connection string and database is running');
    } else if (errorMessage.includes('syntax')) {
      logger.error('💡 Hint: SQL syntax error - check that SQL queries are compatible with your database type');
    }
    
    if (process.env.DEV_MOCK !== 'true') {
      logger.error('💡 Or set DEV_MOCK=true for development testing');
      throw error; // Re-throw to stop server startup
    }
  }
}

// Start server
async function startServer() {
  try {
    // Start HTTP server first - bind to 0.0.0.0 for Render
    const server = app.listen(PORT, '0.0.0.0', () => {
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