const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/degas.db');

db.get(`
  SELECT id, qr_data FROM qr_codes 
  ORDER BY created_at DESC LIMIT 1
`, (err, row) => {
  if(err) {
    console.error('Error:', err.message);
    db.close();
    return;
  }
  
  if(!row) {
    console.log('No QR codes found');
    db.close();
    return;
  }
  
  console.log('Latest QR Code ID:', row.id);
  console.log('\nQR Data to paste for testing:');
  console.log(row.qr_data);
  console.log('\n---');
  console.log('Length:', row.qr_data.length, 'bytes');
  
  db.close();
});
