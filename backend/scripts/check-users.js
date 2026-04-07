#!/usr/bin/env node

/**
 * Debug script: Check all users in database
 * Usage: node backend/scripts/check-users.js
 */

const Database = require('better-sqlite3');
const { Pool } = require('pg');
const path = require('path');

async function checkPostgresUsers() {
  console.log('🔍 PostgreSQL: Checking users...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    const result = await pool.query('SELECT id, name, email, phone, "profileImageUrl" FROM users LIMIT 20');
    console.log(`✅ Found ${result.rows.length} users:`);
    result.rows.forEach((user, idx) => {
      console.log(`  ${idx + 1}. ${user.name} (${user.email}) - Phone: ${user.phone}`);
    });
    return result.rows;
  } catch (error) {
    console.error('❌ Query failed:', error.message);
    return [];
  } finally {
    await pool.end();
  }
}

function checkSQLiteUsers() {
  console.log('🔍 SQLite: Checking users...');
  
  try {
    const dbPath = process.env.SQLITE_PATH || path.join(__dirname, '../data/degas.db');
    const db = new Database(dbPath);

    const users = db.prepare('SELECT id, name, email, phone, profileImageUrl FROM users LIMIT 20').all();
    console.log(`✅ Found ${users.length} users:`);
    users.forEach((user, idx) => {
      console.log(`  ${idx + 1}. ${user.name} (${user.email}) - Phone: ${user.phone}`);
    });
    
    db.close();
    return users;
  } catch (error) {
    console.error('❌ Query failed:', error.message);
    return [];
  }
}

async function run() {
  const dbType = process.env.DATABASE_TYPE || 'sqlite';
  
  console.log(`\n📊 Database: ${dbType.toUpperCase()}\n`);
  
  if (dbType === 'postgresql' || dbType === 'postgres') {
    await checkPostgresUsers();
  } else {
    checkSQLiteUsers();
  }
}

run();
