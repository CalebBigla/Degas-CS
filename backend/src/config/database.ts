import { DatabaseFactory, DatabaseAdapter } from './dbAdapter';
import { initializeDatabase as initSQLite } from './sqlite';
import logger from './logger';

// Global database instance
let dbInstance: DatabaseAdapter | null = null;

// Get database instance
export function getDatabase(): DatabaseAdapter {
  if (!dbInstance) {
    dbInstance = DatabaseFactory.create();
  }
  return dbInstance;
}

// Initialize database based on type
export async function initializeDatabase(): Promise<void> {
  const dbType = process.env.DATABASE_TYPE || 'sqlite';
  
  try {
    if (dbType === 'sqlite') {
      // Use existing SQLite initialization
      await initSQLite();
    } else {
      // PostgreSQL initialization - run migrations
      logger.info('📊 PostgreSQL mode - running migrations...');
      await initializePostgreSQL();
    }
  } catch (error: any) {
    logger.warn('⚠️  Database initialization warning:', error?.message);
    // Don't throw - allow server to start even if tables exist
  }
}

// PostgreSQL initialization
async function initializePostgreSQL(): Promise<void> {
  const db = getDatabase();
  
  try {
    logger.info('🔧 Starting PostgreSQL table creation...');
    
    // Create tables if they don't exist
    await db.run(`
      CREATE TABLE IF NOT EXISTS admins (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(255),
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        last_login TIMESTAMP
      )
    `);
    logger.info('✅ admins table ready');

    await db.run(`
      CREATE TABLE IF NOT EXISTS tables (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        schema TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    logger.info('✅ tables table ready');

    await db.run(`
      CREATE TABLE IF NOT EXISTS dynamic_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        table_id UUID NOT NULL,
        uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
        data TEXT NOT NULL,
        photo_url VARCHAR(500),
        scanned BOOLEAN DEFAULT false,
        scanned_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (table_id) REFERENCES tables (id) ON DELETE CASCADE
      )
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS access_logs (
        id SERIAL PRIMARY KEY,
        user_id UUID,
        table_id UUID,
        qr_code_id UUID,
        scanner_location VARCHAR(255),
        access_granted BOOLEAN NOT NULL,
        scanned_by UUID,
        scan_timestamp TIMESTAMP DEFAULT NOW(),
        ip_address VARCHAR(45),
        user_agent TEXT,
        denial_reason TEXT
      )
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS qr_codes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        table_id UUID NOT NULL,
        qr_data TEXT UNIQUE NOT NULL,
        qr_payload TEXT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP,
        last_scanned TIMESTAMP,
        scan_count INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES dynamic_users (id) ON DELETE CASCADE,
        FOREIGN KEY (table_id) REFERENCES tables (id) ON DELETE CASCADE
      )
    `);

    // ATTENDANCE SYSTEM TABLES (Non-breaking extension)
    
    // Core users table for authentication
    await db.run(`
      CREATE TABLE IF NOT EXISTS core_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        full_name TEXT,
        phone TEXT,
        role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
        status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
        qr_token TEXT UNIQUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // FIXED USER SCHEMA TABLES (Production-Ready Pipeline)
    // New fixed Users collection with standard fields for stability and simplicity
    // Create users table (compatible with both SQLite and PostgreSQL)
    await db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        phone TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        address TEXT NOT NULL,
        password TEXT NOT NULL,
        formid UUID NOT NULL,
        scanned BOOLEAN DEFAULT false,
        scannedat TIMESTAMP DEFAULT NULL,
        profileImageUrl TEXT NOT NULL,
        createdat TIMESTAMP DEFAULT NOW(),
        updatedat TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY (formid) REFERENCES forms(id) ON DELETE CASCADE
      )
    `);

    // Add profileImageUrl column if it doesn't exist (for existing databases)
    try {
      await db.run(`
        ALTER TABLE users ADD COLUMN profileImageUrl TEXT NOT NULL DEFAULT ''
      `);
      logger.info('✅ Added profileImageUrl column to users table');
    } catch (error: any) {
      // Column might already exist - that's OK
      if (error.message?.includes('already exists') || error.message?.includes('duplicate column')) {
        logger.info('✅ profileImageUrl column already exists');
      } else {
        logger.warn('⚠️  Could not add profileImageUrl column:', error.message);
        // Don't fail - the column might already exist or have a different status
      }
    }

    // Create indexes on users table for performance
    await db.run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_users_formid ON users(formid)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_users_scanned ON users(scanned)`);

    // NEW Forms collection to manage forms with associated QR codes
    await db.run(`
      CREATE TABLE IF NOT EXISTS forms (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL UNIQUE,
        link TEXT NOT NULL UNIQUE,
        qrcode TEXT DEFAULT NULL,
        isactive BOOLEAN DEFAULT true,
        createdat TIMESTAMP DEFAULT NOW(),
        updatedat TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create indexes on forms table
    await db.run(`CREATE INDEX IF NOT EXISTS idx_forms_active ON forms(isactive)`);

    // Link core users to dynamic table records
    await db.run(`
      CREATE TABLE IF NOT EXISTS user_data_links (
        id SERIAL PRIMARY KEY,
        core_user_id UUID NOT NULL REFERENCES core_users(id) ON DELETE CASCADE,
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(core_user_id, table_name, record_id)
      )
    `);

    // CMS-driven form definitions
    await db.run(`
      CREATE TABLE IF NOT EXISTS form_definitions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        target_table TEXT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS form_fields (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        form_id UUID NOT NULL REFERENCES form_definitions(id) ON DELETE CASCADE,
        field_name TEXT NOT NULL,
        field_label TEXT NOT NULL,
        field_type TEXT NOT NULL CHECK (field_type IN ('text', 'email', 'password', 'number', 'date', 'tel', 'file', 'camera', 'select', 'textarea')),
        is_required BOOLEAN DEFAULT false,
        is_email_field BOOLEAN DEFAULT false,
        is_password_field BOOLEAN DEFAULT false,
        options TEXT,
        placeholder TEXT,
        order_index INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Attendance system
    await db.run(`
      CREATE TABLE IF NOT EXISTS attendance_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        session_date DATE NOT NULL,
        start_time TIME NOT NULL,
        end_time TIME NOT NULL,
        grace_period_minutes INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        qr_code TEXT,
        created_by UUID REFERENCES core_users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await db.run(`
      CREATE TABLE IF NOT EXISTS attendance_records (
        id SERIAL PRIMARY KEY,
        core_user_id UUID NOT NULL REFERENCES core_users(id) ON DELETE CASCADE,
        session_id UUID NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
        check_in_time TIMESTAMP DEFAULT NOW(),
        method TEXT DEFAULT 'qr_scan',
        location TEXT,
        ip_address TEXT,
        user_agent TEXT,
        UNIQUE(core_user_id, session_id)
      )
    `);

    // Audit log for attendance
    await db.run(`
      CREATE TABLE IF NOT EXISTS attendance_audit_logs (
        id SERIAL PRIMARY KEY,
        core_user_id UUID REFERENCES core_users(id),
        session_id UUID REFERENCES attendance_sessions(id),
        action TEXT NOT NULL,
        status TEXT NOT NULL,
        details TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // TWO-LAYER ATTENDANCE LOGGING (Non-breaking incremental upgrade)
    // LAYER 1: Live presence tracking with 48-hour auto-reset
    await db.run(`
      CREATE TABLE IF NOT EXISTS access_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        scanned_at TIMESTAMP NOT NULL DEFAULT NOW(),
        scanned_by UUID,
        status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent')),
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    logger.info('✅ access_log table ready (LAYER 1 - Live Presence)');

    // LAYER 2: Permanent historical records (never deleted)
    await db.run(`
      CREATE TABLE IF NOT EXISTS analytics_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        scanned_at TIMESTAMP NOT NULL DEFAULT NOW(),
        scanned_by UUID,
        service_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    logger.info('✅ analytics_log table ready (LAYER 2 - Permanent History)');

    // Create indexes for performance
    await db.run(`CREATE INDEX IF NOT EXISTS idx_core_users_email ON core_users(email)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_core_users_qr_token ON core_users(qr_token)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_user_data_links_core_user ON user_data_links(core_user_id)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_form_fields_form_id ON form_fields(form_id)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_attendance_records_user ON attendance_records(core_user_id)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_attendance_records_session ON attendance_records(session_id)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_attendance_sessions_date ON attendance_sessions(session_date)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_attendance_sessions_active ON attendance_sessions(is_active)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_attendance_audit_user ON attendance_audit_logs(core_user_id)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_attendance_audit_session ON attendance_audit_logs(session_id)`);

    // Indexes for two-layer attendance logging
    await db.run(`CREATE INDEX IF NOT EXISTS idx_access_log_user ON access_log(user_id)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_access_log_status ON access_log(status)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_access_log_expires ON access_log(expires_at)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_analytics_log_user ON analytics_log(user_id)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_analytics_log_date ON analytics_log(service_date)`);
    await db.run(`CREATE INDEX IF NOT EXISTS idx_analytics_log_scanned ON analytics_log(scanned_at)`);

    // Create default admin users if none exist
    const adminCount = await db.get("SELECT COUNT(*) as count FROM admins");
    if (adminCount.count === 0) {
      const bcrypt = require('bcryptjs');
      const { v4: uuidv4 } = require('uuid');
      
      const adminPassword = await bcrypt.hash('admin123', 10);
      const guardPassword = await bcrypt.hash('guard123', 10);

      await db.run(
        `INSERT INTO admins (id, username, email, password_hash, role) VALUES ($1, $2, $3, $4, $5)`,
        [uuidv4(), 'admin', 'admin@degas.com', adminPassword, 'super_admin']
      );

      await db.run(
        `INSERT INTO admins (id, username, email, password_hash, role) VALUES ($1, $2, $3, $4, $5)`,
        [uuidv4(), 'guard', 'guard@degas.com', guardPassword, 'guard']
      );

      logger.info('Default admin users created for PostgreSQL');
    }

    logger.info('PostgreSQL database initialization complete');
  } catch (error: any) {
    logger.error('❌ PostgreSQL initialization FAILED:', {
      message: error?.message || String(error),
      code: error?.code,
      detail: error?.detail,
      errno: error?.errno,
      sqlState: error?.sqlState,
      severity: error?.severity,
      stack: error?.stack
    });
    
    // Log more debugging info
    logger.error('Connection string validation:', {
      hasDatabase: !!process.env.DATABASE_URL,
      dbTypeCheck: process.env.DATABASE_TYPE,
      nodeEnv: process.env.NODE_ENV
    });
    
    throw new Error(`Failed to initialize PostgreSQL database: ${error?.message || String(error)}`);
  }
}

// Database health check
export async function testDatabaseConnection(): Promise<void> {
  try {
    const db = getDatabase();
    const dbType = process.env.DATABASE_TYPE || 'sqlite';
    
    if (dbType === 'sqlite') {
      const result = await db.get("SELECT datetime('now') as current_time");
      logger.info('✅ SQLite connection successful:', {
        currentTime: result.current_time,
        database: 'SQLite'
      });
    } else {
      const result = await db.get("SELECT NOW() as current_time");
      logger.info('✅ PostgreSQL connection successful:', {
        currentTime: result.current_time,
        database: 'PostgreSQL'
      });
    }
  } catch (error: any) {
    logger.warn('⚠️  Database connection test failed (non-fatal):', {
      message: error?.message || String(error),
      code: error?.code,
      detail: error?.detail,
      dbType: process.env.DATABASE_TYPE || 'sqlite',
      hasURL: !!process.env.DATABASE_URL
    });
    // Don't throw - allow server to start anyway
    // The setup endpoint will handle database initialization
  }
}

// Verify database schema
export async function verifyDatabaseSchema(): Promise<void> {
  try {
    const db = getDatabase();
    const dbType = process.env.DATABASE_TYPE || 'sqlite';
    
    const requiredTables = [
      'admins', 
      'tables', 
      'dynamic_users', 
      'access_logs', 
      'qr_codes',
      'core_users',
      'user_data_links',
      'form_definitions',
      'form_fields',
      'attendance_sessions',
      'attendance_records',
      'attendance_audit_logs'
    ];
    
    const missingTables: string[] = [];
    
    for (const tableName of requiredTables) {
      let result;
      if (dbType === 'sqlite') {
        result = await db.get(
          "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
          [tableName]
        );
      } else {
        result = await db.get(
          "SELECT tablename FROM pg_tables WHERE tablename = $1",
          [tableName]
        );
      }
      
      if (!result) {
        missingTables.push(tableName);
      }
    }
    
    if (missingTables.length > 0) {
      logger.warn(`⚠️  Missing tables detected: ${missingTables.join(', ')}`);
      logger.warn('💡 These tables will be created automatically or via /api/setup/initialize');
      // Don't throw error - allow server to start
      return;
    }
    
    // For PostgreSQL, add missing columns to access_logs if they don't exist
    if (dbType === 'postgresql') {
      try {
        // Check and add missing columns to access_logs
        const columnsToAdd = [
          { name: 'table_id', type: 'UUID' },
          { name: 'qr_code_id', type: 'UUID' },
          { name: 'denial_reason', type: 'TEXT' }
        ];
        
        for (const col of columnsToAdd) {
          try {
            await db.run(`
              ALTER TABLE access_logs 
              ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}
            `);
            logger.info(`Added missing column to access_logs: ${col.name}`);
          } catch (altError: any) {
            if (!altError.message?.includes('already exists') && !altError.message?.includes('duplicate')) {
              logger.warn(`Column addition attempt for ${col.name}:`, altError.message);
            }
          }
        }
      } catch (migrationError) {
        logger.warn('Column migration check completed (non-fatal):', migrationError);
      }
    }
    
    logger.info('Database schema verification successful:', {
      existingTables: requiredTables.filter(t => !missingTables.includes(t)),
      allTablesPresent: missingTables.length === 0,
      databaseType: dbType
    });
  } catch (error) {
    logger.warn('Database schema verification encountered an issue (non-fatal):', error);
    // Don't throw - allow server to start
  }
}

// Export database instance
export const db = getDatabase();
export default db;