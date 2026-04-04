const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// Use production database path
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'data', 'degas.db');
console.log('📂 Using database:', dbPath);

const db = new sqlite3.Database(dbPath);

async function setupProductionAdmin() {
  try {
    // Check if core_users table exists
    const tableExists = await new Promise((resolve, reject) => {
      db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='core_users'", (err, row) => {
        if (err) reject(err);
        else resolve(!!row);
      });
    });

    if (!tableExists) {
      console.log('❌ core_users table does not exist!');
      console.log('   Database may not be initialized properly.');
      console.log('   Make sure the backend server has started at least once.');
      db.close();
      return;
    }

    console.log('✅ core_users table exists');

    // Check if admin already exists
    const existing = await new Promise((resolve, reject) => {
      db.get('SELECT id, email, role, status FROM core_users WHERE email = ?', ['admin@degas.com'], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (existing) {
      console.log('✅ Admin already exists in core_users');
      console.log('   ID:', existing.id);
      console.log('   Email:', existing.email);
      console.log('   Role:', existing.role);
      console.log('   Status:', existing.status);
      
      // Update to super_admin and active if not already
      if (existing.role !== 'super_admin' || existing.status !== 'active') {
        await new Promise((resolve, reject) => {
          db.run('UPDATE core_users SET role = ?, status = ? WHERE email = ?', 
            ['super_admin', 'active', 'admin@degas.com'], (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        console.log('✅ Updated role to super_admin and status to active');
      }
      
      db.close();
      return;
    }

    // Create new super admin
    console.log('📝 Creating super admin...');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const adminId = uuidv4();

    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO core_users (id, email, password, full_name, phone, role, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [adminId, 'admin@degas.com', hashedPassword, 'Super Admin', '+1234567890', 'super_admin', 'active'],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    console.log('✅ Super admin created successfully!');
    console.log('');
    console.log('🔑 Login Credentials:');
    console.log('   Email: admin@degas.com');
    console.log('   Password: admin123');
    console.log('');
    console.log('📍 Login Endpoint:');
    console.log('   POST /api/core-auth/login');
    console.log('   Body: { "email": "admin@degas.com", "password": "admin123" }');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    db.close();
  }
}

setupProductionAdmin();
