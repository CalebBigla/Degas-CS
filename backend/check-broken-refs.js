const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'degas.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    process.exit(1);
  }
});

// Find QR codes with non-existent users
db.all(`
  SELECT qr.id, qr.user_id, qr.table_id, du.id as user_exists, t.id as table_exists
  FROM qr_codes qr
  LEFT JOIN dynamic_users du ON qr.user_id = du.id
  LEFT JOIN tables t ON qr.table_id = t.id
  WHERE du.id IS NULL OR t.id IS NULL
  LIMIT 20
`, (err, rows) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('QR Codes with broken references:');
    console.log(rows.length + ' broken QR codes found');
    rows.forEach(row => {
      console.log(`- QR ${row.id.substring(0, 8)}... user=${row.user_id.substring(0, 8)}... (exists: ${!row.user_exists ? 'NO' : 'YES'}) table=${row.table_id.substring(0, 8)}... (exists: ${!row.table_exists ? 'NO' : 'YES'})`);
    });
  }
  db.close();
});
