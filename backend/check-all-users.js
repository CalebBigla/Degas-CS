const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'degas.db');
const db = new sqlite3.Database(dbPath);

console.log('📊 Checking all users in system...\n');

// Check core_users
db.all(`SELECT * FROM core_users`, [], (err, coreUsers) => {
  if (err) {
    console.error('❌ Error:', err);
    return;
  }

  console.log(`✅ Core Users (${coreUsers.length}):`);
  coreUsers.forEach(user => {
    console.log(`  - ID: ${user.id}, Email: ${user.email}, Role: ${user.role || 'user'}, Created: ${user.created_at}`);
  });

  // Check user_data_links
  db.all(`SELECT * FROM user_data_links`, [], (err, links) => {
    if (err) {
      console.error('❌ Error:', err);
      return;
    }

    console.log(`\n✅ User Data Links (${links.length}):`);
    links.forEach(link => {
      console.log(`  - Core User: ${link.core_user_id}, Table: ${link.table_name}, Record ID: ${link.record_id}`);
    });

    // Check all dynamic tables
    db.all(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT IN ('admins', 'core_users', 'user_data_links', 'form_definitions', 'form_fields', 'attendance_sessions', 'attendance_records', 'attendance_audit_logs', 'qr_codes', 'access_logs', 'tables', 'dynamic_users', 'id_card_settings', 'id_card_templates', 'sqlite_sequence')`, [], (err, tables) => {
      if (err) {
        console.error('❌ Error:', err);
        db.close();
        return;
      }

      console.log(`\n✅ Dynamic Tables (${tables.length}):`);
      
      if (tables.length === 0) {
        console.log('  (No dynamic tables found)');
        db.close();
        return;
      }

      let processed = 0;
      tables.forEach(table => {
        db.all(`SELECT * FROM ${table.name}`, [], (err, records) => {
          if (err) {
            console.error(`  ❌ Error reading ${table.name}:`, err);
          } else {
            console.log(`\n  📋 ${table.name} (${records.length} records):`);
            records.forEach(record => {
              console.log(`    - ID: ${record.id}, UUID: ${record.uuid || 'N/A'}`);
              if (record.name) console.log(`      Name: ${record.name}`);
              if (record.email) console.log(`      Email: ${record.email}`);
            });
          }

          processed++;
          if (processed === tables.length) {
            db.close();
          }
        });
      });
    });
  });
});
