const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/degas.db');

db.all(`
  SELECT user_id, created_at FROM qr_codes 
  ORDER BY created_at DESC LIMIT 5
`, (err, rows) => {
  if(err) {
    console.error('Error:', err);
  } else {
    console.log('Latest 5 QR codes:');
    rows.forEach((row, i) => {
      console.log(`${i+1}. User: ${row.user_id}`);
      console.log(`   Created: ${row.created_at}`);
    });
    
    // Check if latest user exists
    const latestUser = rows[0].user_id;
    db.get(`SELECT id FROM dynamic_users WHERE id = ?`, [latestUser], (err, user) => {
      console.log(`\nLatest user exists in DB: ${user ? 'YES ✓' : 'NO ✗'}`);
      db.close();
    });
  }
});
