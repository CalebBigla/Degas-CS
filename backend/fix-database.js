const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'degas.db');
const db = new sqlite3.Database(dbPath);

console.log('🔧 Fixing database schema...');

db.serialize(() => {
  // Add missing columns to access_logs table
  db.run(`ALTER TABLE access_logs ADD COLUMN denial_reason TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('❌ Error adding denial_reason:', err.message);
    } else {
      console.log('✅ Added denial_reason column');
    }
  });

  db.run(`ALTER TABLE access_logs ADD COLUMN table_id TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('❌ Error adding table_id:', err.message);
    } else {
      console.log('✅ Added table_id column');
    }
  });

  db.run(`ALTER TABLE access_logs ADD COLUMN qr_code_id TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
      console.error('❌ Error adding qr_code_id:', err.message);
    } else {
      console.log('✅ Added qr_code_id column');
    }
  });

  // Verify the schema
  db.all(`PRAGMA table_info(access_logs)`, (err, rows) => {
    if (err) {
      console.error('❌ Error checking schema:', err);
    } else {
      console.log('\n📋 Current access_logs schema:');
      rows.forEach(row => {
        console.log(`  - ${row.name} (${row.type})`);
      });
    }
    
    db.close(() => {
      console.log('\n✅ Database migration complete!');
      console.log('🔄 Please restart the backend server.');
    });
  });
});
