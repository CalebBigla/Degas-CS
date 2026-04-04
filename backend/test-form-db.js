const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./data/degas.db');

const formId = 'test-form-' + Date.now();
const now = new Date().toISOString();

console.log('Testing form database operation...');
console.log('Form ID:', formId);
console.log('Inserting form...');

db.run(
  `INSERT INTO form_definitions (id, name, target_table, description, is_active, created_at, updated_at)
   VALUES (?, ?, ?, ?, ?, ?, ?)`,
  [formId, 'Test Form', 'Students', 'Test Description', 1, now, now],
  function(err) {
    if(err) {
      console.error('❌ INSERT ERROR:', err.message);
      db.close();
      process.exit(1);
    } else {
      console.log('✅ INSERT SUCCESS');
      console.log('   lastID:', this.lastID, 'changes:', this.changes);
      
      db.get('SELECT * FROM form_definitions WHERE id = ?', [formId], (err, row) => {
        if(err) {
          console.error('❌ SELECT ERROR:', err.message);
        } else {
          console.log('✅ SELECT SUCCESS');
          console.log('   Retrieved:', JSON.stringify(row, null, 2));
        }
        
        db.run('DELETE FROM form_definitions WHERE id = ?', [formId], (delErr) => {
          if(delErr) {
            console.error('❌ DELETE ERROR:', delErr.message);
          } else {
            console.log('✅ DELETE SUCCESS (cleaned up)');
          }
          db.close();
        });
      });
    }
  }
);
