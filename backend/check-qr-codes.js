const sqlite3 = require('sqlite3').verbose();

console.log('=== QR Codes in degas.db ===');
const db = new sqlite3.Database('./data/degas.db');

db.all(`
  SELECT 
    id, 
    user_id, 
    LENGTH(qr_data) as data_length, 
    SUBSTR(qr_data, 1, 50) as data_preview, 
    is_active,
    created_at
  FROM qr_codes 
  ORDER BY created_at DESC 
  LIMIT 5
`, (err, rows) => {
  if(err) {
    console.error('Error:', err.message);
  } else {
    if(rows && rows.length > 0) {
      console.log(`Found ${rows.length} QR codes:\n`);
      rows.forEach((row, i) => {
        console.log(`${i+1}. ID: ${row.id}`);
        console.log(`   User: ${row.user_id}`);
        console.log(`   Length: ${row.data_length} bytes`);
        console.log(`   Preview: ${row.data_preview}...`);
        console.log(`   Active: ${row.is_active}`);
        console.log(`   Created: ${row.created_at}\n`);
      });
    } else {
      console.log('NO QR CODES FOUND!');
    }
  }
  db.close();
});
