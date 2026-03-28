const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'degas.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Checking form_fields table schema...\n');

db.all("PRAGMA table_info(form_fields)", [], (err, rows) => {
  if (err) {
    console.error('❌ Error:', err.message);
    db.close();
    return;
  }

  console.log('Columns:');
  rows.forEach(col => {
    console.log(`  - ${col.name} (${col.type}) ${col.notnull ? 'NOT NULL' : ''} ${col.pk ? 'PRIMARY KEY' : ''}`);
  });

  console.log('\n---\n');

  // Also show actual data
  db.all('SELECT * FROM form_fields', [], (err, fields) => {
    if (err) {
      console.error('Error:', err.message);
    } else {
      console.log(`Found ${fields.length} field(s):\n`);
      fields.forEach(f => {
        console.log('Field:', f);
        console.log('');
      });
    }
    db.close();
  });
});
