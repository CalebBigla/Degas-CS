const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/degas.db');

console.log('Checking all forms and their active status:\n');

db.all('SELECT id, name, form_name, is_active FROM form_definitions ORDER BY created_at DESC', (err, rows) => {
  if (err) {
    console.error('Error:', err);
    process.exit(1);
  }
  
  rows.forEach(r => {
    const status = r.is_active ? '✅ ACTIVE' : '❌ INACTIVE';
    const nameToShow = r.form_name || r.name;
    console.log(`${status} | ${nameToShow} (ID: ${r.id})`);
  });
  
  // Make sure "The Force of Grace Ministry" is active
  console.log('\nSetting "The Force of Grace Ministry" as active...');
  db.run(
    `UPDATE form_definitions SET is_active = 1 WHERE form_name = 'The Force of Grace Ministry' OR name = 'The Force of Grace Ministry'`,
    function(err) {
      if (err) {
        console.error('Error:', err);
        db.close();
        process.exit(1);
      }
      
      if (this.changes > 0) {
        console.log(`✅ Activated "The Force of Grace Ministry"`);
      }
      
      db.close();
    }
  );
});
