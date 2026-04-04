/**
 * Script to create admin user in core_users table
 */

const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'degas.db');
const db = new sqlite3.Database(dbPath);

async function createAdminCoreUser() {
  console.log('🔐 Creating admin user in core_users table...');
  
  try {
    // Check if admin already exists
    const existing = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM core_users WHERE email = ?', ['admin@degas.com'], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (existing) {
      console.log('⚠️  Admin user already exists, updating password...');
      
      // Hash the password
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      // Update the password
      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE core_users SET password = ?, updated_at = datetime("now") WHERE email = ?',
          [hashedPassword, 'admin@degas.com'],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
      
      console.log('✅ Admin password updated successfully');
    } else {
      console.log('📝 Creating new admin user...');
      
      // Hash the password
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const userId = uuidv4();
      const qrToken = uuidv4();
      
      // Insert admin user
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO core_users (id, email, password, role, status, qr_token, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
          [userId, 'admin@degas.com', hashedPassword, 'admin', 'active', qrToken],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
      
      console.log('✅ Admin user created successfully');
    }
    
    // Verify the user
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT id, email, role, status FROM core_users WHERE email = ?', ['admin@degas.com'], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    console.log('\n📋 Admin user details:');
    console.log('   Email:', user.email);
    console.log('   Role:', user.role);
    console.log('   Status:', user.status);
    console.log('   Password: admin123');
    
    // Test password
    const passwordMatch = await bcrypt.compare('admin123', (await new Promise((resolve, reject) => {
      db.get('SELECT password FROM core_users WHERE email = ?', ['admin@degas.com'], (err, row) => {
        if (err) reject(err);
        else resolve(row.password);
      });
    })));
    
    console.log('\n🔍 Password verification:', passwordMatch ? '✅ PASS' : '❌ FAIL');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

createAdminCoreUser();
