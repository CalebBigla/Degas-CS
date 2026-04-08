/**
 * Debug 409 Registration Error
 * This script helps identify why registration is failing with 409
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'degas.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Debugging 409 Registration Error\n');
console.log('This script will help identify duplicate users\n');

// Get all users
db.all('SELECT id, name, phone, email, formId, createdAt FROM users ORDER BY createdAt DESC', [], (err, users) => {
  if (err) {
    console.error('❌ Database error:', err.message);
    db.close();
    process.exit(1);
  }

  console.log(`📊 Total users in database: ${users.length}\n`);

  if (users.length === 0) {
    console.log('✅ No users found - database is empty');
    console.log('   Registration should work with any email/phone');
    db.close();
    return;
  }

  // Check for duplicate emails
  const emailCounts = {};
  users.forEach(user => {
    const email = user.email.toLowerCase();
    emailCounts[email] = (emailCounts[email] || 0) + 1;
  });

  const duplicateEmails = Object.entries(emailCounts).filter(([_, count]) => count > 1);
  
  if (duplicateEmails.length > 0) {
    console.log('⚠️  DUPLICATE EMAILS FOUND:\n');
    duplicateEmails.forEach(([email, count]) => {
      console.log(`  ${email} - ${count} users`);
      const dupes = users.filter(u => u.email.toLowerCase() === email);
      dupes.forEach(u => {
        console.log(`    - ID: ${u.id}, Name: ${u.name}, Created: ${u.createdAt}`);
      });
      console.log('');
    });
  } else {
    console.log('✅ No duplicate emails found\n');
  }

  // Check for duplicate phones
  const phoneCounts = {};
  users.forEach(user => {
    phoneCounts[user.phone] = (phoneCounts[user.phone] || 0) + 1;
  });

  const duplicatePhones = Object.entries(phoneCounts).filter(([_, count]) => count > 1);
  
  if (duplicatePhones.length > 0) {
    console.log('⚠️  DUPLICATE PHONES FOUND:\n');
    duplicatePhones.forEach(([phone, count]) => {
      console.log(`  ${phone} - ${count} users`);
      const dupes = users.filter(u => u.phone === phone);
      dupes.forEach(u => {
        console.log(`    - ID: ${u.id}, Name: ${u.name}, Email: ${u.email}, Created: ${u.createdAt}`);
      });
      console.log('');
    });
  } else {
    console.log('✅ No duplicate phones found\n');
  }

  // Show recent registrations
  console.log('📋 Recent Registrations (last 10):\n');
  users.slice(0, 10).forEach((user, index) => {
    console.log(`${index + 1}. ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Phone: ${user.phone}`);
    console.log(`   Form: ${user.formId}`);
    console.log(`   Created: ${user.createdAt}`);
    console.log('');
  });

  // Provide recommendations
  console.log('💡 Recommendations:\n');
  
  if (duplicateEmails.length > 0 || duplicatePhones.length > 0) {
    console.log('⚠️  You have duplicate users in the database');
    console.log('   This will cause 409 errors when trying to register with those emails/phones');
    console.log('\n   Solutions:');
    console.log('   1. Delete duplicate users from admin dashboard');
    console.log('   2. Use different email/phone for testing');
    console.log('   3. Clear database (development only): rm backend/data/degas.db');
  } else {
    console.log('✅ Database looks clean');
    console.log('\n   If you\'re still getting 409 errors:');
    console.log('   1. Check what email/phone you\'re trying to register');
    console.log('   2. Run: node check-user-exists.js your-email@example.com');
    console.log('   3. Check backend logs for the exact error message');
  }

  db.close();
});
