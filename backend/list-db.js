const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'degas.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    process.exit(1);
  }
});

console.log('=== TABLES ===');
db.all('SELECT id, name FROM tables LIMIT 10', (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log(rows || 'No tables');
  }

  console.log('\n=== ALL DYNAMIC USERS ===');
  db.all('SELECT id, table_id, uuid FROM dynamic_users LIMIT 10', (err, rows) => {
    if (err) {
      console.error('Error:', err);
    } else {
      console.log(rows || 'No users');
    }

    console.log('\n=== QR CODES ===');
    db.all('SELECT id, user_id, table_id FROM qr_codes LIMIT 10', (err, rows) => {
      if (err) {
        console.error('Error:', err);
      } else {
        console.log(rows || 'No QR codes');
      }
      db.close();
    });
  });
});
