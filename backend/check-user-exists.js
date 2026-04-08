/**
 * Check if a user exists by email or phone
 * Usage: node check-user-exists.js email@example.com
 * Usage: node check-user-exists.js +1234567890
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'degas.db');
const db = new sqlite3.Database(dbPath);

const searchTerm = process.argv[2];

if (!searchTerm) {
  console.log('❌ Usage: node check-user-exists.js <email_or_phone>');
  console.log('   Example: node check-user-exists.js test@example.com');
  console.log('   Example: node check-user-exists.js +1234567890');
  process.exit(1);
}

console.log(`🔍 Searching for user: ${searchTerm}\n`);

// Check if it looks like an email or phone
const isEmail = searchTerm.includes('@');
const searchType = isEmail ? 'email' : 'phone';

db.all(
  `SELECT id, name, phone, email, address, formId, scanned, scannedAt, profileImageUrl, createdAt 
   FROM users 
   WHERE LOWER(${searchType}) = LOWER(?)`,
  [searchTerm],
  (err, rows) => {
    if (err) {
      console.error('❌ Database error:', err.message);
      db.close();
      process.exit(1);
    }

    if (rows.length === 0) {
      console.log(`✅ No user found with ${searchType}: ${searchTerm}`);
      console.log('   This email/phone is available for registration.');
    } else {
      console.log(`⚠️  Found ${rows.length} user(s) with ${searchType}: ${searchTerm}\n`);
      
      rows.forEach((user, index) => {
        console.log(`User ${index + 1}:`);
        console.log(`  ID: ${user.id}`);
        console.log(`  Name: ${user.name}`);
        console.log(`  Phone: ${user.phone}`);
        console.log(`  Email: ${user.email}`);
        console.log(`  Address: ${user.address}`);
        console.log(`  Form ID: ${user.formId}`);
        console.log(`  Scanned: ${user.scanned ? 'Yes' : 'No'}`);
        console.log(`  Scanned At: ${user.scannedAt || 'N/A'}`);
        console.log(`  Profile Image: ${user.profileImageUrl || 'No image'}`);
        console.log(`  Created: ${user.createdAt}`);
        console.log('');
      });

      console.log('⚠️  This email/phone is already registered.');
      console.log('   Registration will fail with 409 Conflict error.');
    }

    db.close();
  }
);
