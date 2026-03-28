#!/usr/bin/env node
/**
 * Fix Script - Remove invalid form and demonstrate proper form creation
 */

const http = require('http');
const sqlite3 = require('sqlite3');
const path = require('path');
const db = new sqlite3.Database(path.join(process.cwd(), 'data', 'degas.db'));

function runAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function makeRequest(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api' + path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data
          });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function fix() {
  console.log('\n' + '='.repeat(70));
  console.log('🔧 FIX: Removing invalid form and creating new one');
  console.log('='.repeat(70) + '\n');

  try {
    // Find and delete the invalid form
    console.log('🗑️  Cleaning up invalid form...');
    const forms = await query(`SELECT id, target_table FROM form_definitions`);
    
    for (const form of forms) {
      if (form.target_table.includes(' ') || !/^[a-zA-Z0-9_]+$/.test(form.target_table)) {
        console.log(`   Deleting form with invalid table: ${form.target_table}`);
        await runAsync(`DELETE FROM form_fields WHERE form_id = ?`, [form.id]);
        await runAsync(`DELETE FROM form_definitions WHERE id = ?`, [form.id]);
      }
    }

    console.log('✅ Cleanup complete\n');

    // Now create a new valid form
    console.log('📝 Creating new valid form...');
    
    // First get admin token
    const loginRes = await makeRequest('POST', '/core-auth/login', {
      email: 'admin@degas.com',
      password: 'admin123'
    });

    if (loginRes.status !== 200) {
      console.error('❌ Failed to login:', loginRes.data);
      return;
    }

    const adminToken = loginRes.data.data.token;
    console.log('✅ Admin authenticated\n');

    // Create new form with valid table name
    const createRes = await makeRequest('POST', '/admin/forms', {
      form_name: 'Church Member Registration',
      target_table: 'ChurchMembers', // Valid: no spaces, alphanumeric with underscores
      description: 'Registration form for church members',
      is_active: true,
      fields: [
        {
          field_name: 'fullName',
          field_label: 'Full Name',
          field_type: 'text',
          is_required: true,
          is_email_field: false,
          is_password_field: false,
          field_order: 1,
          placeholder: 'Enter your full name'
        },
        {
          field_name: 'email',
          field_label: 'Email Address',
          field_type: 'email',
          is_required: true,
          is_email_field: true,
          is_password_field: false,
          field_order: 2,
          placeholder: 'your.email@example.com'
        },
        {
          field_name: 'password',
          field_label: 'Password',
          field_type: 'password',
          is_required: true,
          is_email_field: false,
          is_password_field: true,
          field_order: 3,
          placeholder: 'Create a password'
        },
        {
          field_name: 'phone',
          field_label: 'Phone Number',
          field_type: 'tel',
          is_required: false,
          is_email_field: false,
          is_password_field: false,
          field_order: 4,
          placeholder: '555-1234'
        },
        {
          field_name: 'department',
          field_label: 'Department',
          field_type: 'select',
          is_required: false,
          is_email_field: false,
          is_password_field: false,
          field_order: 5,
          options: 'Worship,Usher,Admin,Finance,Teaching'
        }
      ]
    }, adminToken);

    if (createRes.status === 201) {
      console.log('✅ Form created successfully!');
      console.log('\n📋 Form Details:');
      console.log(`   Name: ${createRes.data.data.form_name}`);
      console.log(`   Table: ${createRes.data.data.target_table}`);
      console.log(`   Fields: ${createRes.data.data.fields.length}\n`);

      // Verify the table was created
      const tableCheck = await query(`SELECT name FROM sqlite_master WHERE type='table' AND name = ?`, ['ChurchMembers']);
      if (tableCheck.length > 0) {
        console.log('✅ Dynamic table "ChurchMembers" created successfully!\n');
      }
    } else {
      console.log('❌ Failed to create form:', createRes.data);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  console.log('='.repeat(70) + '\n');
  db.close();
}

fix().catch(console.error);
