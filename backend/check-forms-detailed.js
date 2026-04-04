const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'degas.db');
const db = new sqlite3.Database(dbPath);

console.log('📋 Checking forms...\n');

db.all(`SELECT * FROM form_definitions ORDER BY created_at DESC`, [], (err, forms) => {
  if (err) {
    console.error('❌ Error:', err);
    db.close();
    return;
  }

  console.log(`Found ${forms.length} forms:\n`);

  forms.forEach((form, index) => {
    console.log(`Form ${index + 1}:`);
    console.log(`  ID: ${form.id}`);
    console.log(`  Name: ${form.form_name}`);
    console.log(`  Target Table: ${form.target_table}`);
    console.log(`  Active: ${form.is_active ? 'Yes' : 'No'}`);
    console.log(`  Created: ${form.created_at}`);
    
    // Get fields for this form
    db.all(`SELECT * FROM form_fields WHERE form_id = ? ORDER BY order_index`, [form.id], (err, fields) => {
      if (err) {
        console.error('  ❌ Error getting fields:', err);
        return;
      }

      console.log(`  Fields (${fields.length}):`);
      fields.forEach(field => {
        console.log(`    - ${field.field_label} (${field.field_name}): ${field.field_type}${field.is_required ? ' *' : ''}${field.is_email_field ? ' [EMAIL]' : ''}${field.is_password_field ? ' [PASSWORD]' : ''}`);
      });
      console.log('');

      if (index === forms.length - 1) {
        db.close();
      }
    });
  });

  if (forms.length === 0) {
    db.close();
  }
});
