const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = new sqlite3.Database('./data/degas.db');

db.serialize(async () => {
  try {
    // Check if guard already exists
    db.get("SELECT id FROM core_users WHERE email = 'guard@degas.com'", async (err, row) => {
      if (row) {
        console.log('✅ guard@degas.com already exists');
      } else {
        // Create guard user
        const guardPassword = await bcrypt.hash('guard123', 10);
        db.run(
          `INSERT INTO core_users (id, email, password, role, status) VALUES (?, ?, ?, ?, ?)`,
          [uuidv4(), 'guard@degas.com', guardPassword, 'admin', 'active'],
          (err) => {
            if (err) console.error('Error creating guard:', err);
            else console.log('✅ Created guard@degas.com (admin role)');
          }
        );
      }

      // List all remaining users
      setTimeout(() => {
        db.all('SELECT email, role FROM core_users ORDER BY email', (err, rows) => {
          if (!err) {
            console.log('\n👤 All remaining users:');
            rows.forEach(row => console.log(`  - ${row.email} (${row.role})`));
          }
          db.close(() => {
            console.log('\n✅ Done!');
          });
        });
      }, 500);
    });
  } catch (error) {
    console.error('Error:', error);
    db.close();
  }
});
