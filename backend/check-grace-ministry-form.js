const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/degas.db');

console.log('Checking for "The Force of Grace Ministry" form...\n');

db.get(
  `SELECT id, name, form_name, is_active, created_at FROM form_definitions 
   WHERE name = 'The Force of Grace Ministry' OR form_name = 'The Force of Grace Ministry'`,
  (err, row) => {
    if (err) {
      console.error('❌ Error querying database:', err);
      process.exit(1);
    }
    
    if (row) {
      console.log('✅ Found "The Force of Grace Ministry"');
      console.log(`   ID: ${row.id}`);
      console.log(`   Name: ${row.form_name || row.name}`);
      console.log(`   Status: ${row.is_active ? '✅ ACTIVE' : '❌ INACTIVE'}`);
      console.log(`   Created: ${row.created_at}`);
    } else {
      console.log('❌ Form "The Force of Grace Ministry" NOT found in database');
      console.log('\nAvailable forms:');
      db.all('SELECT id, name, form_name, is_active FROM form_definitions ORDER BY created_at DESC', 
        (err, rows) => {
          if (err) {
            console.error('Error:', err);
            db.close();
            process.exit(1);
          }
          
          if (rows.length === 0) {
            console.log('   (No forms in database)');
          } else {
            rows.forEach(r => {
              const status = r.is_active ? '✅' : '❌';
              console.log(`   ${status} ${r.form_name || r.name} (ID: ${r.id})`);
            });
          }
          
          db.close();
        }
      );
      return;
    }
    
    db.close();
  }
);
