const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const db = new sqlite3.Database('./data/degas.db');

async function createSuperAdmin() {
  try {
    // Check if admin already exists
    const existing = await new Promise((resolve, reject) => {
      db.get('SELECT id, email, role FROM core_users WHERE email = ?', ['admin@degas.com'], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (existing) {
      console.log('✅ Admin already exists in core_users');
      console.log('   ID:', existing.id);
      console.log('   Email:', existing.email);
      console.log('   Role:', existing.role);
      
      // Update to super_admin if not already
      if (existing.role !== 'super_admin') {
        await new Promise((resolve, reject) => {
          db.run('UPDATE core_users SET role = ? WHERE email = ?', ['super_admin', 'admin@degas.com'], (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        console.log('✅ Updated role to super_admin');
      }
      
      db.close();
      return;
    }

    // Create new super admin
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

    console.log('✅ Super admin created in core_users');
    console.log('   ID:', adminId);
    console.log('   Email: admin@degas.com');
    console.log('   Password: admin123');
    console.log('   Role: super_admin');
    console.log('   Status: active');
    console.log('\n🔑 Login with:');
    console.log('   POST http://localhost:3001/api/core-auth/login');
    console.log('   Body: { "email": "admin@degas.com", "password": "admin123" }');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    db.close();
  }
}

createSuperAdmin();
