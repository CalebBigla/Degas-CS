const sqlite3 = require('sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'degas.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }

  // Check current data
  console.log('📊 BEFORE CLEANUP:\n');
  
  db.get("SELECT COUNT(*) as count FROM core_users", (err, row) => {
    console.log('Total core_users:', row?.count);
    
    db.all("SELECT role, COUNT(*) as count FROM core_users GROUP BY role", (err, rows) => {
      console.log('Users by role:', rows);
      
      db.get("SELECT COUNT(*) as count FROM attendance_records", (err, row) => {
        console.log('Total attendance_records:', row?.count);
        
        // Delete fake attendance records (the ones we just created)
        console.log('\n🗑️ Deleting test attendance records...');
        db.run("DELETE FROM attendance_records", function(err) {
          if (err) {
            console.error('❌ Error deleting:', err);
          } else {
            console.log(`✅ Deleted ${this.changes} test records`);
            
            // Verify
            db.get("SELECT COUNT(*) as count FROM attendance_records", (err, row) => {
              console.log('\n📊 AFTER CLEANUP:');
              console.log('attendance_records:', row?.count);
              db.close();
            });
          }
        });
      });
    });
  });
});
