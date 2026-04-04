const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/degas-cs.db');

console.log('=== Database Tables ===');
db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;", (err, rows) => {
  if(err) console.error(err);
  else {
    if(rows.length > 0) {
      rows.forEach(r => console.log('- ' + r.name));
    } else {
      console.log('NO TABLES FOUND');
    }
  }
  db.close();
});
