const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const db = new sqlite3.Database(path.join(__dirname, 'data/degas.db'));

console.log('\n🔍 DEBUGGING 4 REPORTED ISSUES\n');
console.log('='.repeat(60));

async function runQueries() {
  return new Promise((resolve) => {
    let completed = 0;
    const results = {};

    // Issue 1: Check all users in the database
    console.log('\n📋 ISSUE 1: Only test@test.com can login - checking all users');
    console.log('-'.repeat(60));
    
    db.all('SELECT id, email, password FROM users LIMIT 20', (err, rows) => {
      completed++;
      if (err) {
        console.error('❌ Error fetching users:', err.message);
        results.users = [];
      } else {
        console.log(`Found ${rows.length} users:`);
        rows.forEach((u) => {
          console.log(`  - ${u.email} (ID: ${u.id.substring(0, 8)}...)`);
          if (u.email === 'test@test.com') {
            console.log(`    ✅ Password stored: ${u.password ? 'YES (length: ' + u.password.length + ')' : 'NO'}`);
          } else {
            console.log(`    Password stored: ${u.password ? 'YES' : 'NO'}`);
          }
        });
        results.users = rows;
      }
      if (completed === 5) resolve(results);
    });

    // Issue 2: Check QR codes
    console.log('\n📱 ISSUE 2: Can\'t download admin QR code - checking QR code data');
    console.log('-'.repeat(60));
    
    db.get('SELECT * FROM forms LIMIT 1', (err, form) => {
      completed++;
      if (err) {
        console.error('❌ Error fetching form:', err.message);
      } else if (form) {
        console.log(`✅ Form found: ${form.name}`);
        console.log(`   - Link: ${form.link ? form.link.substring(0, 50) + '...' : 'NOT SET'}`);
        console.log(`   - QR Code: ${form.qrcode ? 'YES (' + form.qrcode.substring(0, 20) + '...)' : 'NOT SET'}`);
      } else {
        console.log('❌ No forms found in database');
      }
      if (completed === 5) resolve(results);
    });

    // Issue 3: Check demo credentials in database
    console.log('\n🔐 ISSUE 3: Demo credentials issue - checking core users');
    console.log('-'.repeat(60));
    
    db.all('SELECT id, email, role FROM core_users LIMIT 20', (err, rows) => {
      completed++;
      if (err) {
        console.error('❌ Error fetching core_users:', err.message);
      } else {
        console.log(`Found ${rows.length} core users:`);
        rows.slice(0, 5).forEach((u) => {
          console.log(`  - ${u.email} (Role: ${u.role})`);
        });
        if (rows.length > 5) {
          console.log(`  ... and ${rows.length - 5} more`);
        }
      }
      if (completed === 5) resolve(results);
    });

    // Issue 4: Check registration routes
    console.log('\n🔗 ISSUE 4: Registration link 404 - checking form structure');
    console.log('-'.repeat(60));
    
    db.all('SELECT id, name, link FROM forms', (err, forms) => {
      completed++;
      if (err) {
        console.error('❌ Error fetching forms:', err.message);
      } else {
        console.log(`Found ${forms.length} form(s):`);
        forms.forEach((f) => {
          console.log(`  - ${f.name}`);
          console.log(`    ID: ${f.id}`);
          console.log(`    Link: ${f.link}`);
        });
      }
      if (completed === 5) resolve(results);
    });

    // Check admin users
    console.log('\n👤 Checking admin users');
    console.log('-'.repeat(60));
    
    db.all('SELECT id, username, email FROM admins', (err, rows) => {
      completed++;
      if (err) {
        console.error('❌ Error fetching admins:', err.message);
      } else {
        console.log(`Found ${rows.length} admin(s):`);
        rows.forEach((a) => {
          console.log(`  - ${a.email} (username: ${a.username})`);
        });
      }
      if (completed === 5) resolve(results);
    });
  });
}

runQueries().then(() => {
  console.log('\n' + '='.repeat(60));
  console.log('✅ Diagnostic complete\n');
  db.close();
});
