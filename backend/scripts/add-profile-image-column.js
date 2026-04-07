#!/usr/bin/env node

/**
 * Migration: Add profileImageUrl column to users table
 * Run this if you get: column "profileimageurl" of relation "users" does not exist
 */

const Database = require('better-sqlite3');
const path = require('path');
const { Pool } = require('pg');

async function migratePostgreSQL() {
  console.log('🔧 PostgreSQL Migration: Adding profileImageUrl column...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    // Check if column already exists
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='users' AND column_name='profileImageUrl'
    `);

    if (checkResult.rows.length > 0) {
      console.log('✅ Column profileImageUrl already exists!');
      return;
    }

    // Add the column
    console.log('Adding profileImageUrl column...');
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN profileImageUrl TEXT DEFAULT '' NOT NULL
    `);

    console.log('✅ Successfully added profileImageUrl column to users table');
  } catch (error) {
    console.error('❌ PostgreSQL migration failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

function migrateSQLite() {
  console.log('🔧 SQLite Migration: Adding profileImageUrl column...');
  
  try {
    const dbPath = process.env.SQLITE_PATH || path.join(__dirname, '../data/degas.db');
    const db = new Database(dbPath);

    // Check if column exists
    const columns = db.prepare(`PRAGMA table_info(users)`).all();
    const hasColumn = columns.some(col => col.name === 'profileImageUrl');

    if (hasColumn) {
      console.log('✅ Column profileImageUrl already exists!');
      return;
    }

    // Add the column
    console.log('Adding profileImageUrl column...');
    db.prepare(`
      ALTER TABLE users 
      ADD COLUMN profileImageUrl TEXT NOT NULL DEFAULT ''
    `).run();

    console.log('✅ Successfully added profileImageUrl column to users table');
    db.close();
  } catch (error) {
    console.error('❌ SQLite migration failed:', error.message);
    throw error;
  }
}

async function runMigration() {
  const dbType = process.env.DATABASE_TYPE || 'sqlite';
  
  try {
    if (dbType === 'postgresql' || dbType === 'postgres') {
      await migratePostgreSQL();
    } else {
      migrateSQLite();
    }
  } catch (error) {
    process.exit(1);
  }
}

runMigration();
