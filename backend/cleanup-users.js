const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'degas.db');
const db = new sqlite3.Database(dbPath);

console.log('🧹 Cleaning up users for fresh start...\n');

// Keep only admin users, delete regular users
db.run(`DELETE FROM core_users WHERE role != 'admin' OR role IS NULL`, [], function(err) {
  if (err) {
    console.error('❌ Error deleting users:', err);
    db.close();
    return;
  }

  console.log(`✅ Deleted ${this.changes} regular users`);

  // Clear user_data_links
  db.run(`DELETE FROM user_data_links`, [], function(err) {
    if (err) {
      console.error('❌ Error clearing links:', err);
      db.close();
      return;
    }

    console.log(`✅ Cleared ${this.changes} user data links`);

    // Clear QR codes for non-admin users
    db.run(`DELETE FROM qr_codes`, [], function(err) {
      if (err) {
        console.error('❌ Error clearing QR codes:', err);
        db.close();
        return;
      }

      console.log(`✅ Cleared ${this.changes} QR codes`);

      // Check remaining users
      db.all(`SELECT id, email, role FROM core_users`, [], (err, users) => {
        if (err) {
          console.error('❌ Error:', err);
          db.close();
          return;
        }

        console.log(`\n✅ Remaining users (${users.length}):`);
        users.forEach(user => {
          console.log(`  - ${user.email} (${user.role || 'user'})`);
        });

        console.log('\n✨ Cleanup complete! Ready for fresh registrations.');
        db.close();
      });
    });
  });
});
