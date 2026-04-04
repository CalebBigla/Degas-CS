const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'degas.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Checking core_users table...\n');

db.all('SELECT * FROM core_users', [], (err, rows) => {
  if (err) {
    console.error('❌ Error:', err.message);
    db.close();
    return;
  }

  if (rows.length === 0) {
    console.log('⚠️  No core users found');
  } else {
    console.log(`✅ Found ${rows.length} core user(s):\n`);
    rows.forEach(row => {
      console.log('User:', {
        id: row.id,
        email: row.email,
        role: row.role,
        status: row.status,
        hasPassword: !!row.password_hash,
        passwordHashPreview: row.password_hash ? row.password_hash.substring(0, 20) + '...' : 'NONE',
        qrToken: row.qr_token,
        createdAt: row.created_at
      });
      console.log('');
    });
  }

  db.close();
});
