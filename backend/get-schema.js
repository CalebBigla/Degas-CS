const sqlite3 = require('sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'degas.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error:', err);
    process.exit(1);
  }

  // Get table schema
  db.all("PRAGMA table_info(core_users)", (err, rows) => {
    console.log('CORE_USERS schema:');
    console.log(JSON.stringify(rows, null, 2));
    
    // Get actual data
    db.all("SELECT * FROM core_users LIMIT 3", (err, rows) => {
      console.log('\nCore users data:');
      console.log(JSON.stringify(rows, null, 2));
      db.close();
    });
  });
});
