const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/degas.db');

console.log('=== Database Tables in degas.db ===');
db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;", (err, rows) => {
  if(err) {
    console.error('Error:', err);
  } else {
    if(rows && rows.length > 0) {
      console.log(`Found ${rows.length} tables:\n`);
      rows.forEach(r => {
        console.log(`- ${r.name}`);
      });
      
      // Check if Students table exists
      if (rows.some(r => r.name === 'Students')) {
        console.log('\n✅ Students table EXISTS');
      } else {
        console.log('\n❌ Students table DOES NOT EXIST');
      }
    } else {
      console.log('NO TABLES FOUND');
    }
  }
  db.close();
});
