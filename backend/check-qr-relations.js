const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/degas.db');

// Get latest QR code
db.get(`SELECT user_id, table_id FROM qr_codes ORDER BY created_at DESC LIMIT 1`, (err, qr) => {
  if(err) {
    console.error('Error getting QR:', err);
    db.close();
    return;
  }
  
  if(!qr) {
    console.log('No QR codes found');
    db.close();
    return;
  }
  
  console.log('Latest QR code references:');
  console.log('  user_id:', qr.user_id);
  console.log('  table_id:', qr.table_id);
  console.log();
  
  // Check if dynamic_users record exists
  db.get(`SELECT id, table_id FROM dynamic_users WHERE id = ?`, [qr.user_id], (err, user) => {
    if(err) console.error('Error checking user:', err);
    console.log('Dynamic user exists:', user ? 'YES' : 'NO');
    if(user) console.log('  - table_id:', user.table_id);
  });
  
  // Check if tables record exists
  db.get(`SELECT id, name FROM tables WHERE id = ?`, [qr.table_id], (err, table) => {
    if(err) console.error('Error checking table:', err);
    console.log('Table exists:', table ? 'YES' : 'NO');
    if(table) console.log('  - name:', table.name);
    db.close();
  });
});
