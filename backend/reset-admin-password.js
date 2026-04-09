#!/usr/bin/env node

/**
 * Reset admin password in the database
 * Usage: node reset-admin-password.js
 */

const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const DATABASE_TYPE = process.env.DATABASE_TYPE || 'sqlite';
let db;

// Initialize database based on type
async function initializeDatabase() {
  if (DATABASE_TYPE === 'postgresql') {
    const pkg = require('pg');
    const { Pool } = pkg;
    
    // Parse the connection string carefully
    const connStr = process.env.DATABASE_URL;
    console.log(`📡 Connecting to PostgreSQL...`);
    
    const pool = new Pool({
      connectionString: connStr,
      ssl: { rejectUnauthorized: false },
      statement_timeout: 30000,
      query_timeout: 30000
    });
    
    db = {
      get: async (query, params) => {
        try {
          const result = await pool.query(query, params);
          return result.rows[0];
        } catch (err) {
          console.error('Query error:', err.message);
          throw err;
        }
      },
      run: async (query, params) => {
        try {
          await pool.query(query, params);
        } catch (err) {
          console.error('Query error:', err.message);
          throw err;
        }
      }
    };
  } else {
    // SQLite
    const Database = require('better-sqlite3');
    const dbInstance = new Database(path.join(__dirname, '../degas.db'));
    
    db = {
      get: (query, params) => dbInstance.prepare(query).get(...(params || [])),
      run: (query, params) => dbInstance.prepare(query).run(...(params || []))
    };
  }
}

async function resetAdminPassword() {
  try {
    await initializeDatabase();
    
    const email = 'admin@degas.com';
    const newPassword = 'Admin@123456';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    console.log(`🔐 Resetting password for ${email}...`);
    
    // Check if user exists
    const user = await db.get(
      'SELECT * FROM core_users WHERE email = ?',
      [email]
    );
    
    if (!user) {
      console.log(`❌ User ${email} not found. Creating new admin user...`);
      const { v4: uuidv4 } = require('uuid');
      const userId = uuidv4();
      const qrToken = uuidv4();
      
      await db.run(
        `INSERT INTO core_users (id, email, password, role, status, qr_token, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [userId, email, hashedPassword, 'super_admin', 'active', qrToken]
      );
      
      console.log(`✅ Admin user created successfully!`);
      console.log(`📧 Email: ${email}`);
      console.log(`🔑 Password: ${newPassword}`);
    } else {
      // Update existing user
      await db.run(
        'UPDATE core_users SET password = ?, updated_at = datetime("now") WHERE email = ?',
        [hashedPassword, email]
      );
      
      console.log(`✅ Password reset successfully!`);
      console.log(`📧 Email: ${email}`);
      console.log(`🔑 Password: ${newPassword}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting password:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

resetAdminPassword();
