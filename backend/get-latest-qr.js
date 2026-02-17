const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/degas.db');

// Get the most recent QR code
db.get(`
  SELECT id, qr_data, LENGTH(qr_data) as length FROM qr_codes 
  ORDER BY created_at DESC LIMIT 1
`, (err, row) => {
  if(err) {
    console.error('Error:', err);
  } else if (row) {
    console.log('Most recent QR code:');
    console.log('ID:', row.id);
    console.log('Length:', row.length);
    console.log('Full data:');
    console.log(row.qr_data);
    console.log('\n---\n');
    console.log('Copy this to test verification:');
    console.log(row.qr_data);
  } else {
    console.log('No QR codes found');
  }
  db.close();
});
