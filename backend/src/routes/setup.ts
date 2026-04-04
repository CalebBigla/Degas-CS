import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import QRCode from 'qrcode';
import logger from '../config/logger';

const router = Router();

/**
 * Setup endpoint - Creates admin and default form in Neon database
 * GET /api/setup/initialize
 * 
 * This is a one-time setup endpoint that:
 * 1. Creates required tables
 * 2. Creates super admin (admin@degas.com / admin123)
 * 3. Creates default form "The Force of Grace Ministry"
 */
router.get('/initialize', async (req: Request, res: Response) => {
  try {
    const dbType = process.env.DATABASE_TYPE || 'sqlite';
    
    if (dbType !== 'postgresql') {
      return res.status(400).json({
        success: false,
        error: 'This endpoint is only for PostgreSQL/Neon databases',
        message: 'Your database type is: ' + dbType
      });
    }

    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      return res.status(500).json({
        success: false,
        error: 'DATABASE_URL not configured'
      });
    }

    logger.info('🚀 Starting Neon database setup...');

    const pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false
      }
    });

    const client = await pool.connect();
    const results: string[] = [];

    try {
      // Create core_users table
      await client.query(`
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
      results.push('✅ core_users table ready');

      // Create users table
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          phone TEXT NOT NULL UNIQUE,
          email TEXT NOT NULL UNIQUE,
          address TEXT NOT NULL,
          password TEXT NOT NULL,
          "formId" UUID NOT NULL,
          scanned BOOLEAN DEFAULT false,
          "scannedAt" TIMESTAMP DEFAULT NULL,
          "createdAt" TIMESTAMP DEFAULT NOW(),
          "updatedAt" TIMESTAMP DEFAULT NOW()
        )
      `);
      results.push('✅ users table ready');

      // Create forms table
      await client.query(`
        CREATE TABLE IF NOT EXISTS forms (
          id UUID PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          link TEXT NOT NULL UNIQUE,
          "qrCode" TEXT DEFAULT NULL,
          "isActive" BOOLEAN DEFAULT true,
          "createdAt" TIMESTAMP DEFAULT NOW(),
          "updatedAt" TIMESTAMP DEFAULT NOW()
        )
      `);
      results.push('✅ forms table ready');

      // Create access_logs table
      await client.query(`
        CREATE TABLE IF NOT EXISTS access_logs (
          id SERIAL PRIMARY KEY,
          user_id UUID,
          "formId" UUID,
          table_id UUID,
          qr_code_id UUID,
          scanner_location TEXT,
          access_granted BOOLEAN NOT NULL,
          scanned_by UUID,
          scan_timestamp TIMESTAMP DEFAULT NOW(),
          "scannedAt" TIMESTAMP DEFAULT NOW(),
          ip_address TEXT,
          user_agent TEXT,
          denial_reason TEXT
        )
      `);
      results.push('✅ access_logs table ready');

      // Create indexes
      await client.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_users_formId ON users("formId")`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_core_users_email ON core_users(email)`);
      results.push('✅ Indexes created');

      // Check if admin exists
      const existingAdmin = await client.query(
        'SELECT id, email, role FROM core_users WHERE email = $1',
        ['admin@degas.com']
      );

      if (existingAdmin.rows.length > 0) {
        results.push('ℹ️  Admin already exists: admin@degas.com');
        
        // Update to super_admin if needed
        if (existingAdmin.rows[0].role !== 'super_admin') {
          await client.query(
            'UPDATE core_users SET role = $1, status = $2 WHERE email = $3',
            ['super_admin', 'active', 'admin@degas.com']
          );
          results.push('✅ Updated admin role to super_admin');
        }
      } else {
        // Create super admin
        const hashedPassword = await bcrypt.hash('admin123', 10);
        
        // Check if full_name column exists
        const columnCheck = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'core_users' AND column_name = 'full_name'
        `);
        
        const hasFullNameColumn = columnCheck.rows.length > 0;
        
        if (hasFullNameColumn) {
          await client.query(
            `INSERT INTO core_users (email, password, full_name, phone, role, status)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            ['admin@degas.com', hashedPassword, 'Super Admin', '+1234567890', 'super_admin', 'active']
          );
        } else {
          // Insert without full_name column
          await client.query(
            `INSERT INTO core_users (email, password, role, status)
             VALUES ($1, $2, $3, $4)`,
            ['admin@degas.com', hashedPassword, 'super_admin', 'active']
          );
        }
        
        results.push('✅ Super admin created: admin@degas.com / admin123');
      }

      // Check if default form exists
      const formId = '06aa4b67-76fe-411a-a1e0-682871e8506f';
      const frontendUrl = process.env.FRONTEND_URL || 'https://degas-cs-frontend.onrender.com';
      const registrationLink = `${frontendUrl}/register/${formId}`;
      const scanUrl = `${frontendUrl}/scan/${formId}`;

      const existingForm = await client.query(
        'SELECT id, name FROM forms WHERE id = $1',
        [formId]
      );

      const qrCodeData = await QRCode.toDataURL(scanUrl, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        width: 300,
        margin: 2
      });

      if (existingForm.rows.length > 0) {
        results.push('ℹ️  Form already exists: The Force of Grace Ministry');
        
        // Update QR code
        await client.query(
          'UPDATE forms SET "qrCode" = $1, link = $2, "updatedAt" = NOW() WHERE id = $3',
          [qrCodeData, registrationLink, formId]
        );
        results.push('✅ QR code updated');
      } else {
        await client.query(
          `INSERT INTO forms (id, name, link, "qrCode", "isActive")
           VALUES ($1, $2, $3, $4, true)`,
          [formId, 'The Force of Grace Ministry', registrationLink, qrCodeData]
        );
        
        results.push('✅ Default form created: The Force of Grace Ministry');
      }

      // Get counts
      const adminCount = await client.query('SELECT COUNT(*) as count FROM core_users WHERE role = $1', ['super_admin']);
      const formCount = await client.query('SELECT COUNT(*) as count FROM forms');
      const userCount = await client.query('SELECT COUNT(*) as count FROM users');

      logger.info('✅ Neon database setup complete');

      res.json({
        success: true,
        message: 'Database setup complete!',
        results,
        stats: {
          superAdmins: parseInt(adminCount.rows[0].count),
          forms: parseInt(formCount.rows[0].count),
          registeredUsers: parseInt(userCount.rows[0].count)
        },
        credentials: {
          email: 'admin@degas.com',
          password: 'admin123',
          loginUrl: `${frontendUrl}`
        }
      });

    } finally {
      client.release();
      await pool.end();
    }

  } catch (error: any) {
    logger.error('❌ Setup failed:', error);
    res.status(500).json({
      success: false,
      error: 'Setup failed',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * Health check for setup endpoint
 * GET /api/setup/health
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Setup endpoint is available',
    instructions: 'Visit /api/setup/initialize to set up the database'
  });
});

export default router;
