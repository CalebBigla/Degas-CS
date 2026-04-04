const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/degas.db');

// Update "The Force of Grace" to "The Force of Grace Ministry"
db.run(
  `UPDATE form_definitions 
   SET form_name = 'The Force of Grace Ministry', 
       name = 'The Force of Grace Ministry'
   WHERE name = 'The Force of Grace'`,
  function(err) {
    if (err) {
      console.error('❌ Error updating form:', err);
      process.exit(1);
    }
    
    if (this.changes > 0) {
      console.log(`✅ Updated form to "The Force of Grace Ministry"`);
    } else {
      console.log('ℹ️  No "The Force of Grace" form found to update.');
    }
    
    console.log('\nCurrent forms in database:');
    db.all('SELECT id, name, form_name FROM form_definitions ORDER BY created_at DESC', (err, rows) => {
      if (err) {
        console.error('Error:', err);
        db.close();
        process.exit(1);
      }
      
      rows.forEach(r => {
        console.log(`  - ${r.form_name || r.name} (ID: ${r.id})`);
      });
      
      db.close();
    });
  }
);
