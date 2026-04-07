#!/usr/bin/env node

/**
 * Cleanup script: Delete test users from database
 * Usage: node backend/scripts/clear-test-users.js
 * 
 * This script removes all users with test/admin emails
 */

const Database = require('better-sqlite3');
const { Pool } = require('pg');
const path = require('path');

async function clearPostgresUsers() {
  console.log('🗑️  PostgreSQL: Clearing test users...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    // Show what will be deleted
    const result = await pool.query('SELECT COUNT(*) as count FROM users');
    const count = result.rows[0].count;
    
    console.log(`📊 Current user count: ${count}`);
    console.log('Are you sure you want to delete ALL users? (no way to undo)');
    console.log('To proceed, set environment variable: DELETE_USERS=yes');
    
    if (process.env.DELETE_USERS !== 'yes') {
      console.log('❌ Cancelled - no users deleted');
      return;
    }

    // Delete all users
    await pool.query('DELETE FROM users');
    console.log(`✅ Deleted all users`);
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

function clearSQLiteUsers() {
  console.log('🗑️  SQLite: Clearing test users...');
  
  try {
    const dbPath = process.env.SQLITE_PATH || path.join(__dirname, '../data/degas.db');
    const db = new Database(dbPath);

    // Show what will be deleted
    const countResult = db.prepare('SELECT COUNT(*) as count FROM users').get();
    const count = countResult?.count || 0;
    
    console.log(`📊 Current user count: ${count}`);
    console.log('Are you sure you want to delete ALL users? (no way to undo)');
    console.log('To proceed, set environment variable: DELETE_USERS=yes');
    
    if (process.env.DELETE_USERS !== 'yes') {
      console.log('❌ Cancelled - no users deleted');
      db.close();
      return;
    }

    // Delete all users
    db.prepare('DELETE FROM users').run();
    console.log(`✅ Deleted all users`);
    
    db.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function run() {
  const dbType = process.env.DATABASE_TYPE || 'sqlite';
  
  console.log(`\n📊 Database: ${dbType.toUpperCase()}\n`);
  
  if (dbType === 'postgresql' || dbType === 'postgres') {
    await clearPostgresUsers();
  } else {
    clearSQLiteUsers();
  }
}

run();
