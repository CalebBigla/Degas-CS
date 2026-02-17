const sqlite3 = require('sqlite3').verbose();

console.log('=== Checking degas.db ===');
const db1 = new sqlite3.Database('./data/degas.db');
db1.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;", (err, rows) => {
  if(err) console.log('Error:', err.message);
  else console.log('Tables:', rows.length > 0 ? rows.map(r => r.name).join(', ') : 'NONE');
  db1.close();
  
  console.log('\n=== Checking degas-cs.db ===');
  const db2 = new sqlite3.Database('./data/degas-cs.db');
  db2.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;", (err, rows) => {
    if(err) console.log('Error:', err.message);
    else console.log('Tables:', rows.length > 0 ? rows.map(r => r.name).join(', ') : 'NONE');
    db2.close();
  });
});
