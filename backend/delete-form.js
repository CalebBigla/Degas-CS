const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'degas.db');
const db = new sqlite3.Database(dbPath);

const formId = '1774574423978-73nn1udiu';

console.log(`🗑️  Deleting form ${formId}...\n`);

db.run(`DELETE FROM form_fields WHERE form_id = ?`, [formId], (err) => {
  if (err) {
    console.error('❌ Error deleting fields:', err);
    db.close();
    return;
  }

  console.log('✅ Deleted form fields');

  db.run(`DELETE FROM form_definitions WHERE id = ?`, [formId], (err) => {
    if (err) {
      console.error('❌ Error deleting form:', err);
      db.close();
      return;
    }

    console.log('✅ Deleted form definition');
    console.log('\n✨ Form deleted successfully! You can now create a new one.');
    db.close();
  });
});
