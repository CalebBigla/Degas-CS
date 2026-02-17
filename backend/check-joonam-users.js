const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/degas.db');

// Get the joonam table ID
db.get(`SELECT id FROM tables WHERE name = ?`, ['Joonam'], (err, table) => {
  if(err || !table) {
    console.error('Joonam table not found');
    db.close();
    return;
  }
  
  console.log('Joonam table ID:', table.id);
  console.log('\nUsers in Joonam table:');
  console.log('---');
  
  // Get all users in joonam table
  db.all(
    `SELECT id, uuid, data FROM dynamic_users WHERE table_id = ?`, 
    [table.id],
    (err, users) => {
      if(err) {
        console.error('Error:', err.message);
      } else {
        console.log('Total users:', users.length);
        users.slice(0, 5).forEach((user, i) => {
          console.log(`\n${i+1}. ID: ${user.id}`);
          console.log(`   UUID: ${user.uuid}`);
          try {
            const data = JSON.parse(user.data);
            console.log(`   Name: ${data.fullName || data.name || data.NAMES || 'N/A'}`);
          } catch(e) {
            console.log(`   Data: ${user.data.substring(0, 50)}...`);
          }
        });
      }
      db.close();
    }
  );
});
