const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'degas.db');
const db = new sqlite3.Database(dbPath);

console.log('📊 Checking database tables...\n');

// Get all tables
db.all(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`, [], (err, tables) => {
  if (err) {
    console.error('❌ Error:', err);
    return;
  }

  console.log('📋 All tables in database:');
  tables.forEach(table => {
    console.log(`  - ${table.name}`);
  });

  console.log('\n🔍 Checking for Members table specifically...');
  
  db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name='Members'`, [], (err, result) => {
    if (err) {
      console.error('❌ Error:', err);
      return;
    }

    if (result) {
      console.log('✅ Members table EXISTS');
      
      // Get table schema
      db.all(`PRAGMA table_info(Members)`, [], (err, columns) => {
        if (err) {
          console.error('❌ Error getting schema:', err);
          return;
        }

        console.log('\n📐 Members table schema:');
        columns.forEach(col => {
          console.log(`  - ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
        });

        // Check data
        db.all(`SELECT * FROM Members`, [], (err, rows) => {
          if (err) {
            console.error('❌ Error getting data:', err);
            return;
          }

          console.log(`\n📊 Members table has ${rows.length} rows`);
          if (rows.length > 0) {
            console.log('\nFirst row:');
            console.log(rows[0]);
          }

          db.close();
        });
      });
    } else {
      console.log('❌ Members table DOES NOT EXIST');
      db.close();
    }
  });
});
