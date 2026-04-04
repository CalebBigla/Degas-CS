const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'degas.db');
const db = new sqlite3.Database(dbPath);

console.log('🗑️  Deleting all forms...\n');

db.run(`DELETE FROM form_fields`, [], function(err) {
  if (err) {
    console.error('❌ Error deleting fields:', err);
    db.close();
    return;
  }

  console.log(`✅ Deleted ${this.changes} form fields`);

  db.run(`DELETE FROM form_definitions`, [], function(err) {
    if (err) {
      console.error('❌ Error deleting forms:', err);
      db.close();
      return;
    }

    console.log(`✅ Deleted ${this.changes} forms`);
    console.log('\n✨ All forms deleted! Ready to create new ones.');
    db.close();
  });
});
