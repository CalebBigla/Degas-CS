#!/usr/bin/env node

/**
 * Diagnostic: Check if profileimageurl column exists and has data
 * Run: node diagnose-profile-images.js
 */

require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DATABASE_DIR ? 
  path.join(process.env.DATABASE_DIR, 'degas.db') : 
  path.join(__dirname, '../data/degas.db');

console.log('🔍 Diagnostic: Profile Images in Database\n');
console.log(`📁 Database path: ${dbPath}\n`);

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Failed to open database:', err.message);
    process.exit(1);
  }

  runDiagnostics();
});

function runDiagnostics() {
  // Check users table schema
  console.log('='.repeat(60));
  console.log('📋 USERS TABLE SCHEMA');
  console.log('='.repeat(60) + '\n');

  db.all("PRAGMA table_info(users)", (err, columns) => {
    if (err) {
      console.error('❌ Error reading users table:', err);
      return;
    }

    if (!columns || columns.length === 0) {
      console.error('❌ Users table does not exist or is empty');
      close();
      return;
    }

    console.log('Columns in users table:');
    columns.forEach((col) => {
      const marker = col.name === 'profileimageurl' ? '✅ ' : '  ';
      console.log(`${marker}${col.name} (${col.type})`);
    });

    // Check if profileimageurl exists
    const hasProfileImageUrl = columns.some(col => col.name === 'profileimageurl');
    console.log(`\n${hasProfileImageUrl ? '✅' : '❌'} profileimageurl column exists: ${hasProfileImageUrl}\n`);

    // Check data
    checkProfileImageData(hasProfileImageUrl);
  });
}

function checkProfileImageData(hasColumn) {
  console.log('='.repeat(60));
  console.log('📊 PROFILE IMAGE DATA');
  console.log('='.repeat(60) + '\n');

  if (!hasColumn) {
    console.error('❌ profileimageurl column does NOT exist in users table');
    console.log('\n🔧 FIX: You need to add the column:');
    console.log(`   ALTER TABLE users ADD COLUMN profileimageurl TEXT;`);
    close();
    return;
  }

  db.all(
    `SELECT id, name, email, profileimageurl FROM users WHERE profileimageurl IS NOT NULL LIMIT 5`,
    (err, rows) => {
      if (err) {
        console.error('❌ Query failed:', err.message);
        close();
        return;
      }

      if (!rows || rows.length === 0) {
        console.warn('⚠️  No users with profile images found');
      } else {
        console.log(`✅ Found ${rows.length} users with profile images:\n`);
        rows.forEach((row, idx) => {
          console.log(`${idx + 1}. ${row.name} (${row.email})`);
          console.log(`   URL: ${row.profileimageurl}`);
          console.log('');
        });
      }

      // Check total users
      checkTotalUsers();
    }
  );
}

function checkTotalUsers() {
  db.get(`SELECT COUNT(*) as total FROM users`, (err, row) => {
    if (err) {
      console.error('❌ Query failed:', err.message);
      close();
      return;
    }

    console.log(`📈 Total users: ${row.total}`);

    // Check null values
    db.get(`SELECT COUNT(*) as nullCount FROM users WHERE profileimageurl IS NULL`, (err, row2) => {
      if (err) {
        close();
        return;
      }

      console.log(`📊 Users without profile images: ${row2.nullCount}\n`);

      checkFormTable();
    });
  });
}

function checkFormTable() {
  console.log('='.repeat(60));
  console.log('📋 FORMS TABLE');
  console.log('='.repeat(60) + '\n');

  db.all(
    `SELECT id, name FROM forms LIMIT 5`,
    (err, rows) => {
      if (err) {
        console.error('❌ Error querying forms:', err.message);
        close();
        return;
      }

      if (!rows || rows.length === 0) {
        console.warn('⚠️  No forms found');
      } else {
        console.log(`✅ Found ${rows.length} forms:\n`);
        rows.forEach((form, idx) => {
          console.log(`${idx + 1}. ${form.name} (ID: ${form.id})`);
        });
      }

      printRecommendations();
    }
  );
}

function printRecommendations() {
  console.log('\n' + '='.repeat(60));
  console.log('📝 NEXT STEPS');
  console.log('='.repeat(60) + '\n');

  console.log('✅ If profileimageurl column exists:');
  console.log('   The images should be showing in the admin dashboard.');
  console.log('   Check:');
  console.log('   1. Browser console for errors (F12 → Console tab)');
  console.log('   2. API response: Open Network tab, click on forms-tables request');
  console.log('   3. Verify profileImageUrl is in the response\n');

  console.log('❌ If profileimageurl column does NOT exist:');
  console.log('   You need to add it to the users table.\n');

  close();
}

function close() {
  db.close((err) => {
    if (err) console.error('Error closing database:', err.message);
    process.exit(0);
  });
}
