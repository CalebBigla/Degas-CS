const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'degas.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Checking admin@degas.com password...\n');

db.get('SELECT id, email, password, role, status FROM core_users WHERE email = ?', ['admin@degas.com'], async (err, row) => {
  if (err) {
    console.error('❌ Error:', err.message);
    db.close();
    return;
  }

  if (!row) {
    console.log('❌ Admin user not found');
    db.close();
    return;
  }

  console.log('User found:');
  console.log('  ID:', row.id);
  console.log('  Email:', row.email);
  console.log('  Role:', row.role);
  console.log('  Status:', row.status);
  console.log('  Password field:', row.password ? `EXISTS (${row.password.length} chars)` : 'NULL/EMPTY');
  
  if (row.password) {
    console.log('  Password preview:', row.password.substring(0, 30) + '...');
    
    // Test if it's a bcrypt hash
    const isBcrypt = row.password.startsWith('$2a$') || row.password.startsWith('$2b$');
    console.log('  Is bcrypt hash:', isBcrypt);
    
    if (isBcrypt) {
      // Test password
      const match = await bcrypt.compare('admin123', row.password);
      console.log('\n🔐 Password test (admin123):', match ? '✅ MATCH' : '❌ NO MATCH');
    }
  } else {
    console.log('\n⚠️  Password is NULL or empty - need to set it!');
  }

  db.close();
});
