/**
 * Check Users Table Schema
 * Shows exact column names in users table
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'degas.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Checking users table schema\n');

// Get table schema
db.all("PRAGMA table_info(users)", [], (err, columns) => {
  if (err) {
    console.error('❌ Error:', err.message);
    db.close();
    return;
  }

  console.log('📊 Users Table Columns:\n');
  columns.forEach(col => {
    console.log(`  ${col.cid}. ${col.name}`);
    console.log(`     Type: ${col.type}`);
    console.log(`     Not Null: ${col.notnull ? 'Yes' : 'No'}`);
    console.log(`     Default: ${col.dflt_value || 'None'}`);
    console.log('');
  });

  // Check if profileImageUrl column exists
  const hasProfileImage = columns.some(col => 
    col.name.toLowerCase() === 'profileimageurl' || 
    col.name === 'profileImageUrl'
  );

  if (hasProfileImage) {
    console.log('✅ Profile image column exists');
    const col = columns.find(c => c.name.toLowerCase() === 'profileimageurl' || c.name === 'profileImageUrl');
    console.log(`   Column name: ${col.name}`);
  } else {
    console.log('❌ Profile image column NOT found');
    console.log('\n💡 Need to add column:');
    console.log('   ALTER TABLE users ADD COLUMN profileImageUrl TEXT;');
  }

  // Show sample data
  console.log('\n📋 Sample Users (with image info):\n');
  db.all('SELECT id, name, email, profileImageUrl FROM users LIMIT 5', [], (err, users) => {
    if (err) {
      console.error('Error:', err.message);
    } else {
      users.forEach(user => {
        console.log(`  ${user.name} (${user.email})`);
        console.log(`    Image: ${user.profileImageUrl || 'No image'}`);
        console.log('');
      });
    }
    db.close();
  });
});
