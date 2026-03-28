/**
 * Create a test attendance record to verify attendance tracking
 */
const sqlite3 = require('sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'degas.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }

  // Get latest session ID
  db.get("SELECT id FROM attendance_sessions ORDER BY created_at DESC LIMIT 1", (err, session) => {
    if (err || !session) {
      console.error('❌ No sessions found');
      db.close();
      process.exit(1);
    }

    console.log('📅 Latest session ID:', session.id);

    // Get core users
    db.all("SELECT id FROM core_users LIMIT 2", (err, users) => {
      if (err || !users || users.length === 0) {
        console.error('❌ No users found');
        db.close();
        process.exit(1);
      }

      console.log(`👥 Found ${users.length} users`);

      // Insert attendance records for first 2 users
      let completed = 0;

      users.forEach((user, index) => {
        const checkedInAt = new Date(Date.now() - (10 - index * 2) * 60000).toISOString();
        
        db.run(
          `INSERT INTO attendance_records (core_user_id, session_id, checked_in_at, method)
           VALUES (?, ?, ?, ?)`,
          [
            user.id,
            session.id,
            checkedInAt,
            'qr_scan'
          ],
          function(err) {
            completed++;
            if (err) {
              console.error(`❌ Error inserting record ${index}:`, err);
            } else {
              console.log(`✅ Added attendance: User ${index + 1} checked in at ${checkedInAt}`);
            }

            if (completed === users.length) {
              // Verify
              db.get(
                `SELECT COUNT(*) as count FROM attendance_records WHERE session_id = ?`,
                [session.id],
                (err, result) => {
                  console.log('\n📊 Final count - Attendance records:', result?.count || 0);
                  db.close();
                }
              );
            }
          }
        );
      });
    });
  });
});
