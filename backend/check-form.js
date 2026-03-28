const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'degas.db');
const db = new sqlite3.Database(dbPath);

console.log('🔍 Checking forms and fields...\n');

db.all('SELECT * FROM form_definitions WHERE is_active = 1', [], (err, forms) => {
  if (err) {
    console.error('❌ Error:', err.message);
    db.close();
    return;
  }

  if (forms.length === 0) {
    console.log('⚠️  No active forms found');
    db.close();
    return;
  }

  console.log(`✅ Found ${forms.length} active form(s):\n`);
  
  forms.forEach(form => {
    console.log('Form:', {
      id: form.id,
      name: form.form_name,
      targetTable: form.target_table,
      description: form.description
    });
    console.log('');

    db.all('SELECT * FROM form_fields WHERE form_id = ? ORDER BY field_order', [form.id], (err, fields) => {
      if (err) {
        console.error('Error loading fields:', err.message);
        return;
      }

      console.log('Fields:');
      fields.forEach(field => {
        console.log(`  - ${field.field_name} (${field.field_type})`, {
          label: field.field_label,
          required: !!field.is_required,
          isEmail: !!field.is_email_field,
          isPassword: !!field.is_password_field,
          placeholder: field.placeholder
        });
      });
      console.log('\n---\n');
      
      if (forms.indexOf(form) === forms.length - 1) {
        db.close();
      }
    });
  });
});
