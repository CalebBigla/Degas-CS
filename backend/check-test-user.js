const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'degas.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    process.exit(1);
  }
});

const testUserId = '8bc42f7c-c0d4-4a75-8f9d-76fd241c6433';

// Check if this ID exists as a user id
db.get('SELECT id, uuid FROM dynamic_users WHERE id = ?', [testUserId], (err, row) => {
  if (row) {
    console.log('✅ Found as user ID:', row);
  } else {
    console.log('❌ NOT found as user ID');
    
    // Check if it exists as a uuid
    db.get('SELECT id, uuid FROM dynamic_users WHERE uuid = ?', [testUserId], (err, row) => {
      if (row) {
        console.log('✅ Found as UUID:', row);
      } else {
        console.log('❌ NOT found as UUID');
      }
      
      // Check if there's a QR code for this
      db.get('SELECT id, user_id FROM qr_codes WHERE user_id = ?', [testUserId], (err, row) => {
        if (row) {
          console.log('✅ Found in QR codes:', row);
        } else {
          console.log('❌ NOT in QR codes for this user_id');
        }
        db.close();
      });
    });
  }
});
