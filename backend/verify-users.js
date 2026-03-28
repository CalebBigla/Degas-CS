const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = new sqlite3.Database('./data/degas.db');

db.serialize(async () => {
  try {
    // Check if admin user exists in admins table
    db.get("SELECT id FROM admins WHERE username = 'admin'", async (err, row) => {
      if (row) {
        console.log('✅ admin user already exists in admins table');
      } else {
        // Create admin user in admins table
        const adminPassword = await bcrypt.hash('admin123', 10);
        db.run(
          `INSERT INTO admins (id, username, email, password_hash, role) VALUES (?, ?, ?, ?, ?)`,
          [uuidv4(), 'admin', 'admin@system.local', adminPassword, 'super_admin'],
          (err) => {
            if (err) console.error('Error creating admin:', err);
            else console.log('✅ Created admin user (admin/admin123)');
          }
        );
      }

      // List all remaining admins
      setTimeout(() => {
        db.all('SELECT username, email, role FROM admins ORDER BY username', (err, rows) => {
          if (!err) {
            console.log('\n👤 All admin users:');
            rows.forEach(row => console.log(`  - ${row.username} (${row.role})`));
          }
          
          // Also show core users
          db.all('SELECT email, role FROM core_users ORDER BY email', (err, rows) => {
            if (!err) {
              console.log('\n👤 All core users:');
              rows.forEach(row => console.log(`  - ${row.email} (${row.role})`));
            }
            db.close(() => {
              console.log('\n✅ Database ready!');
            });
          });
        });
      }, 500);
    });
  } catch (error) {
    console.error('Error:', error);
    db.close();
  }
});
