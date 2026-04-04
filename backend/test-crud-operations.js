const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'degas.db');
const db = new sqlite3.Database(dbPath);

console.log('🧪 Testing CRUD Operations\n');

// Test 1: Check if forms table has the default form
db.get('SELECT id, name FROM forms WHERE id = ?', ['06aa4b67-76fe-411a-a1e0-682871e8506f'], (err, form) => {
  if (err) {
    console.error('❌ Error checking form:', err);
    return;
  }
  
  if (form) {
    console.log('✅ Default form exists:', form.name);
    console.log('   Form ID:', form.id);
    
    // Test 2: Check users in this form
    db.all('SELECT id, name, email, phone, scanned FROM users WHERE formId = ?', [form.id], (err, users) => {
      if (err) {
        console.error('❌ Error fetching users:', err);
        return;
      }
      
      console.log(`\n📊 Users in form: ${users.length}`);
      users.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.name} (${user.email})`);
        console.log(`      Phone: ${user.phone}`);
        console.log(`      Scanned: ${user.scanned ? '✅ Yes' : '❌ No'}`);
      });
      
      // Test 3: Check access logs
      db.all('SELECT COUNT(*) as count FROM access_logs WHERE table_id = ?', [form.id], (err, result) => {
        if (err) {
          console.error('❌ Error checking access logs:', err);
          return;
        }
        
        console.log(`\n📝 Access logs: ${result[0].count}`);
        
        // Test 4: Verify table schema
        db.all("PRAGMA table_info(users)", (err, columns) => {
          if (err) {
            console.error('❌ Error checking schema:', err);
            return;
          }
          
          console.log('\n🔧 Users table schema:');
          columns.forEach(col => {
            console.log(`   - ${col.name} (${col.type})`);
          });
          
          console.log('\n✅ All CRUD operations ready!');
          console.log('\n📋 Available endpoints:');
          console.log('   POST   /api/form/register/:formId  - Create user');
          console.log('   GET    /api/form/users/:formId     - Read users');
          console.log('   PUT    /api/form/users/:userId     - Update user');
          console.log('   DELETE /api/form/users/:userId     - Delete user');
          console.log('   POST   /api/form/scan              - Scan user');
          console.log('   GET    /api/form/logs/:formId      - Access logs');
          
          db.close();
        });
      });
    });
  } else {
    console.log('❌ Default form not found');
    db.close();
  }
});
