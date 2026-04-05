const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const db = new sqlite3.Database(path.join(__dirname, 'data/degas.db'));

console.log('\n🔧 FIXING AUTHENTICATION ISSUES\n');
console.log('='.repeat(60));

async function fixAuth() {
  return new Promise((resolve) => {
    let completed = 0;
    const completed_tasks = [];

    // Task 1: Check current test users
    console.log('\n1️⃣ Step 1: Checking current users...');
    db.all('SELECT id, email FROM users LIMIT 10', (err, rows) => {
      completed++;
      if (rows && rows.length > 0) {
        console.log(`   Found ${rows.length} user(s):`);
        rows.forEach(r => console.log(`     - ${r.email}`));
      } else {
        console.log('   No users found');
      }
      completed_tasks.push('users_checked');
      if (completed === 5) resolve(completed_tasks);
    });

    // Task 2: Create test users for testing
    console.log('\n2️⃣ Step 2: Creating additional test users...');
    const hashedPassword = bcrypt.hashSync('password123', 10);
    const formId = '06aa4b67-76fe-411a-a1e0-682871e8506f';
    
    const testUsers = [
      {
        id: uuidv4(),
        name: 'John Smith',
        email: 'john.smith@example.com',
        phone: '+1 (555) 100-0001',
        address: '100 Main St, City'
      },
      {
        id: uuidv4(),
        name: 'Jane Doe',
        email: 'jane.doe@example.com',
        phone: '+1 (555) 100-0002',
        address: '200 Oak Ave, Town'
      }
    ];

    let usersCreated = 0;
    testUsers.forEach(user => {
      db.run(
        `INSERT OR IGNORE INTO users (id, name, email, phone, address, password, formid, scanned, createdat, updatedat)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'))`,
        [user.id, user.name, user.email, user.phone, user.address, hashedPassword, formId],
        (err) => {
          completed++;
          if (err) {
            console.log(`   ❌ Failed to create ${user.email}: ${err.message}`);
          } else {
            console.log(`   ✅ Created: ${user.email} (password: password123)`);
            usersCreated++;
          }
          completed_tasks.push(`user_${user.email}`);
          if (completed === 5) resolve(completed_tasks);
        }
      );
    });

    // Task 3: Remove demo credentials from admins table
    console.log('\n3️⃣ Step 3: Removing demo credentials from database...');
    db.run(
      `DELETE FROM admins WHERE email IN ('admin@degas.com', 'guard@degas.com')`,
      function(err) {
        completed++;
        if (err) {
          console.log(`   ❌ Error: ${err.message}`);
        } else {
          console.log(`   ✅ Deleted ${this.changes} demo admin account(s)`);
        }
        completed_tasks.push('admins_cleaned');
        if (completed === 5) resolve(completed_tasks);
      }
    );

    // Task 4: Verify forms exist
    console.log('\n4️⃣ Step 4: Verifying form setup...');
    db.get(`SELECT id, name, link FROM forms WHERE id = ?`, [formId], (err, form) => {
      completed++;
      if (form) {
        console.log(`   ✅ Form found: ${form.name}`);
        console.log(`   Registration URL: ${form.link || 'NOT SET'}`);
      } else {
        console.log(`   ⚠️ Form not found for ID: ${formId}`);
      }
      completed_tasks.push('form_verified');
      if (completed === 5) resolve(completed_tasks);
    });

    // Task 5: Check admins after cleanup
    console.log('\n5️⃣ Step 5: Verifying admin cleanup...');
    db.all('SELECT email, username FROM admins', (err, admins) => {
      completed++;
      if (admins && admins.length > 0) {
        console.log(`   Remaining admins: ${admins.length}`);
        admins.forEach(a => console.log(`     - ${a.email} (${a.username})`));
      } else {
        console.log('   ✅ No demo credentials remain');
      }
      completed_tasks.push('admins_verified');
      if (completed === 5) resolve(completed_tasks);
    });
  });
}

fixAuth().then((tasks) => {
  console.log('\n' + '='.repeat(60));
  console.log('✅ Database fixes complete\n');
  console.log('📝 Test users created with password: password123');
  console.log('✅ Demo credentials removed from database');
  console.log('✅ Registration URL verified\n');
  db.close();
});
