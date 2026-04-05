#!/usr/bin/env node

/**
 * PostgreSQL Migration - Step 8: Seed Data
 * Populates database with test data for validation
 * 
 * Usage:
 *   npm run migrate:seed
 *   npm run migrate:seed -- --clean  (removes existing data first)
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const args = process.argv.slice(2);
const shouldClean = args.includes('--clean');

// Database path
const dataDir = process.env.DATABASE_DIR || path.join(__dirname, '../../data');
const dbPath = path.join(dataDir, 'degas.db');

console.log('\n🌱 PostgreSQL Migration - Seed Data Generator\n');
console.log(`📁 Database: ${dbPath}`);
console.log(`🗑️  Clean existing data: ${shouldClean}\n`);

// Ensure data directory exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log(`✅ Created data directory: ${dataDir}\n`);
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error opening database:', err);
    process.exit(1);
  }
  console.log('✅ Connected to SQLite database\n');
});

// Helper to run SQL
async function runSql(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

// Helper to get data
async function querySql(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

/**
 * Main seeding process
 */
async function seedData() {
  try {
    console.log('📋 Seeding Process:\n');

    // Step 1: Clean existing data if requested
    if (shouldClean) {
      console.log('🗑️  Cleaning existing data...');
      const tables = [
        'access_logs', 'user_data_links', 'dynamic_users', 
        'qr_codes', 'tables', 'form_definitions', 'forms', 'users',
        'core_users', 'admins'
      ];
      
      for (const table of tables) {
        try {
          await runSql(`DELETE FROM ${table}`);
          console.log(`   ✓ Cleared ${table}`);
        } catch (e) {
          // Table might not exist, continue
          console.log(`   ℹ️  Skipped ${table} (doesn't exist yet)`);
        }
      }
      console.log('');
    }

    // Step 2: Seed admin user
    console.log('👤 Creating admin user...');
    const adminId = uuidv4();
    try {
      await runSql(`
        INSERT OR REPLACE INTO admins (id, username, email, password_hash, role, created_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `, [
        adminId,
        'admin',
        'admin@example.com',
        'hashed_password_placeholder',
        'super_admin'
      ]);
      console.log(`   ✓ Admin user created: ${adminId}\n`);
    } catch (e) {
      console.log(`   ⚠️  Could not create admin: ${e.message}\n`);
    }

    // Step 3: Seed core users (for authentication)
    console.log('👥 Creating core users...');
    const coreUsers = [];
    for (let i = 1; i <= 3; i++) {
      const userId = uuidv4();
      try {
        await runSql(`
          INSERT OR IGNORE INTO core_users (id, email, password, full_name, phone, role, status, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `, [
          userId,
          `user${i}@example.com`,
          'hashed_password_placeholder',
          `User ${i}`,
          `555-000${i}`,
          i === 1 ? 'admin' : 'user',
          'active'
        ]);
        coreUsers.push({ id: userId, email: `user${i}@example.com` });
        console.log(`   ✓ Core user ${i} created: ${userId}`);
      } catch (e) {
        console.log(`   ⚠️  Could not create core user ${i}: ${e.message}`);
      }
    }
    console.log('');

    // Step 4: Seed tables (for dynamic_users)
    console.log('📊 Creating tables...');
    const tables = [];
    for (let i = 1; i <= 2; i++) {
      const tableId = uuidv4();
      const schema = JSON.stringify([
        { field_name: 'name', field_label: 'Name', field_type: 'text' },
        { field_name: 'email', field_label: 'Email', field_type: 'email' },
        { field_name: 'department', field_label: 'Department', field_type: 'text' }
      ]);
      
      try {
        await runSql(`
          INSERT OR IGNORE INTO tables (id, name, description, schema, created_at)
          VALUES (?, ?, ?, ?, datetime('now'))
        `, [
          tableId,
          `Event ${i}`,
          `Test event table ${i}`,
          schema
        ]);
        tables.push({ id: tableId, name: `Event ${i}` });
        console.log(`   ✓ Table ${i} created: ${tableId}`);
      } catch (e) {
        console.log(`   ⚠️  Could not create table ${i}: ${e.message}`);
      }
    }
    console.log('');

    // Step 5: Seed dynamic users (records in tables)
    console.log('👤 Creating dynamic users (table records)...');
    let userCount = 0;
    for (const table of tables) {
      for (let i = 1; i <= 5; i++) {
        const userId = uuidv4();
        const data = JSON.stringify({
          name: `Attendee ${userCount + 1}`,
          email: `attendee${userCount + 1}@example.com`,
          department: 'Engineering'
        });
        
        try {
          await runSql(`
            INSERT OR IGNORE INTO dynamic_users (id, table_id, uuid, data, scanned, created_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'))
          `, [
            userId,
            table.id,
            uuidv4(),
            data,
            Math.random() > 0.5 ? 1 : 0  // 50% marked as scanned
          ]);
          userCount++;
          console.log(`   ✓ Dynamic user ${userCount} created for table "${table.name}"`);
        } catch (e) {
          console.log(`   ⚠️  Could not create dynamic user: ${e.message}`);
        }
      }
    }
    console.log('');

    // Step 6: Seed forms (old form_definitions)
    console.log('📝 Creating forms...');
    for (let i = 1; i <= 2; i++) {
      const formId = uuidv4();
      const fields = JSON.stringify([
        { field_name: 'attendee_name', field_label: 'Attendee Name', field_type: 'text' },
        { field_name: 'company', field_label: 'Company', field_type: 'text' },
        { field_name: 'role', field_label: 'Role', field_type: 'text' }
      ]);
      
      try {
        await runSql(`
          INSERT OR IGNORE INTO form_definitions (id, form_name, name, description, target_table, is_active, fields, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `, [
          formId,
          `Registration Form ${i}`,
          `form_${i}`,
          `Registration form for event ${i}`,
          `form_table_${i}`,
          1,
          fields
        ]);
        console.log(`   ✓ Form ${i} created: ${formId}`);
      } catch (e) {
        console.log(`   ⚠️  Could not create form ${i}: ${e.message}`);
      }
    }
    console.log('');

    // Step 7: Seed access logs
    console.log('📊 Creating access logs...');
    for (let i = 0; i < 10; i++) {
      const tableId = tables[i % tables.length]?.id;
      if (!tableId) continue;
      
      try {
        await runSql(`
          INSERT INTO access_logs (table_id, access_granted, scanned_by, scan_timestamp)
          VALUES (?, ?, ?, datetime('now', '-' || ? || ' hours'))
        `, [
          tableId,
          Math.random() > 0.1 ? 1 : 0,  // 90% granted
          'auto_scanner',
          Math.floor(Math.random() * 24)
        ]);
        console.log(`   ✓ Access log ${i + 1} created`);
      } catch (e) {
        console.log(`   ⚠️  Could not create access log: ${e.message}`);
      }
    }
    console.log('');

    // Step 8: Verify data
    console.log('🔍 Verifying seeded data...\n');
    const verification = {
      'admins': 'SELECT COUNT(*) as count FROM admins',
      'core_users': 'SELECT COUNT(*) as count FROM core_users',
      'tables': 'SELECT COUNT(*) as count FROM tables',
      'dynamic_users': 'SELECT COUNT(*) as count FROM dynamic_users',
      'form_definitions': 'SELECT COUNT(*) as count FROM form_definitions',
      'access_logs': 'SELECT COUNT(*) as count FROM access_logs'
    };

    console.log('Table Counts:');
    for (const [tableName, query] of Object.entries(verification)) {
      try {
        const result = await querySql(query);
        const count = result[0]?.count || 0;
        console.log(`   ${tableName}: ${count} row(s)`);
      } catch (e) {
        console.log(`   ${tableName}: ⚠️  ${e.message}`);
      }
    }
    console.log('');

    // Close database
    console.log('✅ Seeding completed successfully!\n');
    db.close();

  } catch (error) {
    console.error('\n❌ Seeding error:', error.message);
    db.close();
    process.exit(1);
  }
}

// Run seeding process
seedData();
