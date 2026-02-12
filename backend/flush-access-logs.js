const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'degas.db');

console.log('🗑️  Flushing access logs...');
console.log('Database:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error connecting to database:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to database');
});

// Delete all access logs
db.run('DELETE FROM access_logs', [], function(err) {
  if (err) {
    console.error('❌ Error flushing access logs:', err.message);
    db.close();
    process.exit(1);
  }
  
  console.log(`✅ Deleted ${this.changes} access log entries`);
  
  // Reset auto-increment counter
  db.run('DELETE FROM sqlite_sequence WHERE name="access_logs"', [], function(err) {
    if (err) {
      console.error('⚠️  Warning: Could not reset auto-increment counter:', err.message);
    } else {
      console.log('✅ Reset auto-increment counter');
    }
    
    // Verify deletion
    db.get('SELECT COUNT(*) as count FROM access_logs', [], (err, row) => {
      if (err) {
        console.error('❌ Error verifying deletion:', err.message);
      } else {
        console.log(`✅ Verification: ${row.count} entries remaining`);
        console.log('🎉 Access logs flushed successfully!');
      }
      
      db.close((err) => {
        if (err) {
          console.error('❌ Error closing database:', err.message);
          process.exit(1);
        }
        console.log('✅ Database connection closed');
        process.exit(0);
      });
    });
  });
});
