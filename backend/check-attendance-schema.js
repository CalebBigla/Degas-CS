const sqlite3 = require('sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'degas.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error:', err);
    process.exit(1);
  }

  db.all("PRAGMA table_info(attendance_records)", (err, rows) => {
    console.log('ATTENDANCE_RECORDS schema:');
    console.log(JSON.stringify(rows, null, 2));
    db.close();
  });
});
