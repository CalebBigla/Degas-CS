const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'data/degas.db'));

console.log('\n🔍 EXTENDED DIAGNOSTICS\n');

// Check if test@test.com exists anywhere
db.all(`
  SELECT 'core_users' as table_name, id, email FROM core_users WHERE email LIKE 'test%'
  UNION ALL
  SELECT 'users' as table_name, id, email FROM users WHERE email LIKE 'test%'
`, (err, rows) => {
  console.log('Checking for test@test.com:');
  if (err) {
    console.error('Error:', err.message);
  } else if (rows.length === 0) {
    console.log('  ❌ No test users found in either table');
  } else {
    rows.forEach(r => {
      console.log(`  ✓ Found ${r.email} in ${r.table_name}`);
    });
  }
  
  // Check all tables schema
  console.log('\n📊 Checking users table structure:');
  db.all("PRAGMA table_info(users)", (err, cols) => {
    if (err) console.error(err);
    else {
      cols.forEach(c => console.log(`  - ${c.name}: ${c.type}`));
    }
    
    console.log('\n📊 Checking core_users table structure:');
    db.all("PRAGMA table_info(core_users)", (err, cols) => {
      if (err) console.error(err);
      else {
        cols.forEach(c => console.log(`  - ${c.name}: ${c.type}`));
      }
      
      // Check registration endpoint data
      console.log('\n🔗 Registration page data:');
      db.get(`SELECT * FROM forms WHERE id = '06aa4b67-76fe-411a-a1e0-682871e8506f'`, (err, form) => {
        if (err) console.error(err);
        else {
          console.log(`  Form name: ${form.name}`);
          console.log(`  Form link should be: https://localhost:5173/register/${form.id}`);
          console.log(`  Actual link stored: ${form.link}`);
          console.log(`  Has QR code: ${form.qrcode ? 'YES' : 'NO'}`);
        }
        
        db.close();
      });
    });
  });
});
