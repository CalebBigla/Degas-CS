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
  
  if (dbType === 'sqlite') {
    // Use existing SQLite initialization
    await initSQLite();
  } else {
    // PostgreSQL initialization
    await initializePostgreSQL();
  }
}

// PostgreSQL initialization
async function initializePostgreSQL(): Promise<void> {
  const db = getDatabase();
  
  try {
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

    await db.run(`
      CREATE TABLE IF NOT EXISTS dynamic_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        table_id UUID NOT NULL,
        uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
        data TEXT NOT NULL,
        photo_url VARCHAR(500),
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
  } catch (error) {
    logger.error('PostgreSQL initialization failed:', error);
    throw error;
  }
}

// Database health check
export async function testDatabaseConnection(): Promise<void> {
  try {
    const db = getDatabase();
    const dbType = process.env.DATABASE_TYPE || 'sqlite';
    
    if (dbType === 'sqlite') {
      const result = await db.get("SELECT datetime('now') as current_time");
      logger.info('SQLite connection successful:', {
        currentTime: result.current_time,
        database: 'SQLite'
      });
    } else {
      const result = await db.get("SELECT NOW() as current_time");
      logger.info('PostgreSQL connection successful:', {
        currentTime: result.current_time,
        database: 'PostgreSQL'
      });
    }
  } catch (error) {
    logger.error('Database connection failed:', error);
    throw new Error(`Database connectivity check failed: ${error}`);
  }
}

// Verify database schema
export async function verifyDatabaseSchema(): Promise<void> {
  try {
    const db = getDatabase();
    const dbType = process.env.DATABASE_TYPE || 'sqlite';
    
    const requiredTables = ['admins', 'tables', 'dynamic_users', 'access_logs', 'qr_codes'];
    
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
        throw new Error(`Missing required table: ${tableName}`);
      }
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
      existingTables: requiredTables,
      allTablesPresent: true,
      databaseType: dbType
    });
  } catch (error) {
    logger.error('Database schema verification failed:', error);
    throw error;
  }
}

// Export database instance
export const db = getDatabase();
export default db;