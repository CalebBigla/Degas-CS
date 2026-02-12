// Migration script to add id_card_config column to tables table
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'degas.db');
const db = new sqlite3.Database(dbPath);

console.log('🔧 Adding id_card_config column to tables table...');

db.serialize(() => {
  // Check if column exists
  db.all("PRAGMA table_info(tables)", (err, columns) => {
    if (err) {
      console.error('❌ Error checking table structure:', err);
      db.close();
      return;
    }

    const hasColumn = columns.some(col => col.name === 'id_card_config');

    if (hasColumn) {
      console.log('✅ Column id_card_config already exists');
      db.close();
      return;
    }

    // Add the column
    db.run("ALTER TABLE tables ADD COLUMN id_card_config TEXT", (err) => {
      if (err) {
        console.error('❌ Error adding column:', err);
      } else {
        console.log('✅ Successfully added id_card_config column');
      }
      db.close();
    });
  });
});
