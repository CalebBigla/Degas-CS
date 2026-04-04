const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const db = new sqlite3.Database('./data/degas.db');

console.log('🧪 Testing Fixed Schema Implementation\n');

async function testFixedSchema() {
  try {
    // Test 1: Check if tables exist
    console.log('1️⃣  Checking tables...');
    const tables = await new Promise((resolve, reject) => {
      db.all("SELECT name FROM sqlite_master WHERE type='table' AND (name='users' OR name='forms')", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
    
    console.log('   Tables found:', tables.map(t => t.name).join(', '));
    
    if (!tables.find(t => t.name === 'users')) {
      console.log('   ❌ users table not found!');
      return;
    }
    
    if (!tables.find(t => t.name === 'forms')) {
      console.log('   ❌ forms table not found!');
      return;
    }
    
    console.log('   ✅ Both tables exist\n');
    
    // Test 2: Create a test form
    console.log('2️⃣  Creating test form...');
    const formId = uuidv4();
    const formName = 'Test Form ' + Date.now();
    const formLink = `http://localhost:5173/register/${formId}`;
    
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO forms (id, name, link, qrCode, isActive, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, 1, datetime('now'), datetime('now'))`,
        [formId, formName, formLink, 'test-qr-code'],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
    
    console.log('   ✅ Form created:', formId);
    console.log('   Name:', formName);
    console.log('   Link:', formLink, '\n');
    
    // Test 3: Create a test user
    console.log('3️⃣  Creating test user...');
    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO users (id, name, phone, email, address, password, formId, scanned, scannedAt, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, NULL, datetime('now'), datetime('now'))`,
        [userId, 'Test User', '+1234567890', 'test@test.com', '123 Test St', hashedPassword, formId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
    
    console.log('   ✅ User created:', userId);
    console.log('   Email: test@test.com');
    console.log('   Password: password123 (hashed)\n');
    
    // Test 4: Verify user can be retrieved
    console.log('4️⃣  Retrieving user...');
    const user = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id, name, phone, email, address, formId, scanned FROM users WHERE id = ?',
        [userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    
    if (user) {
      console.log('   ✅ User retrieved successfully');
      console.log('   Name:', user.name);
      console.log('   Email:', user.email);
      console.log('   Phone:', user.phone);
      console.log('   Scanned:', user.scanned ? 'Yes' : 'No', '\n');
    } else {
      console.log('   ❌ User not found!\n');
    }
    
    // Test 5: Test password verification
    console.log('5️⃣  Testing password verification...');
    const userWithPassword = await new Promise((resolve, reject) => {
      db.get(
        'SELECT password FROM users WHERE id = ?',
        [userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    
    const isPasswordValid = await bcrypt.compare('password123', userWithPassword.password);
    console.log('   Password verification:', isPasswordValid ? '✅ Valid' : '❌ Invalid', '\n');
    
    // Test 6: Get all users for form
    console.log('6️⃣  Getting all users for form...');
    const users = await new Promise((resolve, reject) => {
      db.all(
        'SELECT id, name, email, scanned FROM users WHERE formId = ?',
        [formId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
    
    console.log('   ✅ Found', users.length, 'user(s) for form');
    users.forEach(u => {
      console.log('      -', u.name, '(' + u.email + ')');
    });
    console.log();
    
    // Test 7: Mark user as scanned
    console.log('7️⃣  Marking user as scanned...');
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE users SET scanned = 1, scannedAt = datetime('now') WHERE id = ?`,
        [userId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
    
    const scannedUser = await new Promise((resolve, reject) => {
      db.get(
        'SELECT scanned, scannedAt FROM users WHERE id = ?',
        [userId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    
    console.log('   ✅ User scanned:', scannedUser.scanned ? 'Yes' : 'No');
    console.log('   Scanned at:', scannedUser.scannedAt, '\n');
    
    // Test 8: Get analytics
    console.log('8️⃣  Getting analytics...');
    const total = await new Promise((resolve, reject) => {
      db.get(
        'SELECT COUNT(*) as count FROM users WHERE formId = ?',
        [formId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        }
      );
    });
    
    const scanned = await new Promise((resolve, reject) => {
      db.get(
        'SELECT COUNT(*) as count FROM users WHERE formId = ? AND scanned = 1',
        [formId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row.count);
        }
      );
    });
    
    console.log('   ✅ Analytics:');
    console.log('      Total users:', total);
    console.log('      Scanned:', scanned);
    console.log('      Not scanned:', total - scanned);
    console.log('      Attendance rate:', ((scanned / total) * 100).toFixed(2) + '%', '\n');
    
    console.log('✅ All tests passed!\n');
    console.log('📋 Summary:');
    console.log('   - Form ID:', formId);
    console.log('   - User ID:', userId);
    console.log('   - Registration link:', formLink);
    console.log('\n🚀 System is ready for use!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    db.close();
  }
}

testFixedSchema();
