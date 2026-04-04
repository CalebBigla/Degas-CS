#!/usr/bin/env node

/**
 * Complete Neon PostgreSQL Setup Script
 * 
 * This script:
 * 1. Creates all required tables
 * 2. Creates super admin (admin@degas.com / admin123)
 * 3. Creates default form "The Force of Grace Ministry"
 * 
 * Usage: node setup-neon-complete.js
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const QRCode = require('qrcode');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL environment variable is not set!');
  console.error('   Set it in Render Dashboard → Environment Variables');
  process.exit(1);
}

console.log('🚀 Starting complete Neon setup...\n');

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function setupComplete() {
  const client = await pool.connect();
  
  try {
    console.log('✅ Connected to Neon PostgreSQL database\n');

    // ========================================
    // STEP 1: Create Tables
    // ========================================
    console.log('📋 Step 1: Creating tables...');

    // Core users table
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
    console.log('  ✅ core_users table ready');

    // Users table (fixed schema)
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
    console.log('  ✅ users table ready');

    // Forms table
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
    console.log('  ✅ forms table ready');

    // Access logs table
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
    console.log('  ✅ access_logs table ready');

    // Create indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_users_formId ON users("formId")`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_core_users_email ON core_users(email)`);
    console.log('  ✅ Indexes created\n');

    // ========================================
    // STEP 2: Create Super Admin
    // ========================================
    console.log('👤 Step 2: Creating super admin...');

    const existingAdmin = await client.query(
      'SELECT id, email, role FROM core_users WHERE email = $1',
      ['admin@degas.com']
    );

    if (existingAdmin.rows.length > 0) {
      console.log('  ℹ️  Admin already exists');
      console.log('     Email:', existingAdmin.rows[0].email);
      console.log('     Role:', existingAdmin.rows[0].role);
      
      // Update to super_admin if needed
      if (existingAdmin.rows[0].role !== 'super_admin') {
        await client.query(
          'UPDATE core_users SET role = $1, status = $2 WHERE email = $3',
          ['super_admin', 'active', 'admin@degas.com']
        );
        console.log('  ✅ Updated to super_admin');
      }
    } else {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      await client.query(
        `INSERT INTO core_users (email, password, full_name, phone, role, status)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ['admin@degas.com', hashedPassword, 'Super Admin', '+1234567890', 'super_admin', 'active']
      );
      
      console.log('  ✅ Super admin created');
      console.log('     Email: admin@degas.com');
      console.log('     Password: admin123');
    }
    console.log('');

    // ========================================
    // STEP 3: Create Default Form
    // ========================================
    console.log('📝 Step 3: Creating default form...');

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
      console.log('  ℹ️  Form already exists');
      console.log('     Name:', existingForm.rows[0].name);
      
      // Update QR code
      await client.query(
        'UPDATE forms SET "qrCode" = $1, link = $2, "updatedAt" = NOW() WHERE id = $3',
        [qrCodeData, registrationLink, formId]
      );
      console.log('  ✅ QR code updated');
    } else {
      await client.query(
        `INSERT INTO forms (id, name, link, "qrCode", "isActive")
         VALUES ($1, $2, $3, $4, true)`,
        [formId, 'The Force of Grace Ministry', registrationLink, qrCodeData]
      );
      
      console.log('  ✅ Default form created');
      console.log('     Name: The Force of Grace Ministry');
      console.log('     ID:', formId);
    }
    console.log('');

    // ========================================
    // STEP 4: Verification
    // ========================================
    console.log('🔍 Step 4: Verifying setup...');

    const adminCount = await client.query('SELECT COUNT(*) as count FROM core_users WHERE role = $1', ['super_admin']);
    const formCount = await client.query('SELECT COUNT(*) as count FROM forms');
    const userCount = await client.query('SELECT COUNT(*) as count FROM users');

    console.log('  ✅ Super admins:', adminCount.rows[0].count);
    console.log('  ✅ Forms:', formCount.rows[0].count);
    console.log('  ✅ Registered users:', userCount.rows[0].count);
    console.log('');

    // ========================================
    // SUCCESS!
    // ========================================
    console.log('🎉 Setup complete!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔑 LOGIN CREDENTIALS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Email:    admin@degas.com');
    console.log('Password: admin123');
    console.log('');
    console.log('📍 LOGIN URL');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('https://degas-cs-frontend.onrender.com');
    console.log('');
    console.log('📋 FORM DETAILS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Name: The Force of Grace Ministry');
    console.log('Registration:', registrationLink);
    console.log('');
    console.log('✅ You can now login to the system!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    if (error.code) {
      console.error('   Error code:', error.code);
    }
    if (error.detail) {
      console.error('   Detail:', error.detail);
    }
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Check DATABASE_URL is set correctly');
    console.error('   2. Verify Neon database is active (not suspended)');
    console.error('   3. Ensure backend has required npm packages installed');
    console.error('   4. Check Render logs for more details\n');
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

setupComplete();
