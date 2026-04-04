/**
 * Delete Test Form and its users
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'degas.db');
const db = new sqlite3.Database(dbPath);

const FORM_ID = '196a976f-7221-4fc0-8cd2-6baea19c913a';
const FORM_NAME = 'Test Form 1775310485211';

console.log('🗑️  Deleting Test Form and associated data...\n');

db.serialize(() => {
  // Delete users associated with this form
  db.run('DELETE FROM users WHERE formId = ?', [FORM_ID], function(err) {
    if (err) {
      console.error('❌ Error deleting users:', err);
    } else {
      console.log(`✅ Deleted ${this.changes} user(s) from form`);
    }
  });

  // Delete access logs associated with this form
  db.run('DELETE FROM access_logs WHERE table_id = ?', [FORM_ID], function(err) {
    if (err) {
      console.error('❌ Error deleting access logs:', err);
    } else {
      console.log(`✅ Deleted ${this.changes} access log(s)`);
    }
  });

  // Delete the form
  db.run('DELETE FROM forms WHERE id = ?', [FORM_ID], function(err) {
    if (err) {
      console.error('❌ Error deleting form:', err);
    } else {
      console.log(`✅ Deleted form: ${FORM_NAME}`);
    }
  });

  // Verify deletion
  db.get('SELECT COUNT(*) as count FROM forms WHERE id = ?', [FORM_ID], (err, row) => {
    if (err) {
      console.error('❌ Error verifying deletion:', err);
    } else {
      if (row.count === 0) {
        console.log('\n✅ Form successfully deleted!');
      } else {
        console.log('\n⚠️  Form still exists in database');
      }
    }
    
    // Close database
    db.close();
  });
});
