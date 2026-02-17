const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/degas.db');

const userId = '60ae5099-cdd5-4728-b5c1-50051f34b903';

console.log('Checking if user exists:', userId);
console.log('---');

db.get(`SELECT id, table_id, uuid FROM dynamic_users WHERE id = ?`, [userId], (err, user) => {
  if(err) {
    console.error('Error:', err.message);
  } else if(user) {
    console.log('✓ User FOUND');
    console.log('  ID:', user.id);
    console.log('  Table ID:', user.table_id);
    console.log('  UUID:', user.uuid);
    
    // Check if table exists
    db.get(`SELECT id, name FROM tables WHERE id = ?`, [user.table_id], (err, table) => {
      if(table) {
        console.log('\n✓ Table FOUND: ' + table.name);
      } else {
        console.log('\n✗ Table NOT found');
      }
      db.close();
    });
  } else {
    console.log('✗ User NOT found in database');
    console.log('\nUsers in Joonam table:');
    db.all(`SELECT id FROM dynamic_users WHERE table_id = (SELECT id FROM tables WHERE name = 'Joonam')`, (err, users) => {
      if(users) {
        users.forEach(u => console.log('  -', u.id));
      }
      db.close();
    });
  }
});
