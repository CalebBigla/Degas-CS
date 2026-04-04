const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/degas.db');

console.log('🧹 Starting database cleanup...\n');

db.serialize(() => {
  // Delete all forms and their fields
  db.run('DELETE FROM form_fields', (err) => {
    if (err) console.error('Error deleting form_fields:', err);
    else console.log('✅ Deleted all form fields');
  });

  db.run('DELETE FROM form_definitions', (err) => {
    if (err) console.error('Error deleting form_definitions:', err);
    else console.log('✅ Deleted all forms');
  });

  // Delete all core users EXCEPT the default ones
  // Keep emails: admin@degas.com, guard@degas.com
  db.run("DELETE FROM core_users WHERE email NOT IN ('admin@degas.com', 'guard@degas.com')", (err) => {
    if (err) console.error('Error deleting core_users:', err);
    else console.log('✅ Deleted all non-default user accounts');
  });

  // Delete orphaned user_data_links
  db.run('DELETE FROM user_data_links WHERE core_user_id NOT IN (SELECT id FROM core_users)', (err) => {
    if (err) console.error('Error deleting orphaned user_data_links:', err);
    else console.log('✅ Deleted orphaned user-data links');
  });

  // Delete all attendance records
  db.run('DELETE FROM attendance_records', (err) => {
    if (err) console.error('Error deleting attendance_records:', err);
    else console.log('✅ Deleted all attendance records');
  });

  // Delete all attendance sessions
  db.run('DELETE FROM attendance_sessions', (err) => {
    if (err) console.error('Error deleting attendance_sessions:', err);
    else console.log('✅ Deleted all attendance sessions');
  });

  // Delete all attendance audit logs
  db.run('DELETE FROM attendance_audit_logs', (err) => {
    if (err) console.error('Error deleting attendance_audit_logs:', err);
    else console.log('✅ Deleted all attendance audit logs');
  });

  // Delete all QR codes
  db.run('DELETE FROM qr_codes', (err) => {
    if (err) console.error('Error deleting qr_codes:', err);
    else console.log('✅ Deleted all QR codes');
  });

  // Delete all dynamic user data (Students, Staff, Visitors, Contractors)
  const tables = ['Students', 'Staff', 'Visitors', 'Contractors'];
  tables.forEach(table => {
    db.run(`DELETE FROM ${table}`, (err) => {
      if (err) console.error(`Error deleting from ${table}:`, err);
      else console.log(`✅ Deleted all records from ${table}`);
    });
  });

  // Verify remaining data
  setTimeout(() => {
    db.all('SELECT COUNT(*) as count FROM core_users', (err, rows) => {
      if (!err) console.log(`\n📊 Remaining core users: ${rows[0].count}`);
    });

    db.all('SELECT COUNT(*) as count FROM form_definitions', (err, rows) => {
      if (!err) console.log(`📊 Remaining forms: ${rows[0].count}`);
    });

    db.all('SELECT email FROM core_users', (err, rows) => {
      if (!err) {
        console.log('\n👤 Remaining users:');
        rows.forEach(row => console.log(`  - ${row.email}`));
      }
      
      db.close(() => {
        console.log('\n✅ Database cleanup complete!');
      });
    });
  }, 1000);
});
