#!/usr/bin/env node
/**
 * Diagnostic Script - Check system state
 */

const http = require('http');
const sqlite3 = require('sqlite3');
const path = require('path');
const db = new sqlite3.Database(path.join(process.cwd(), 'data', 'degas.db'));

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

function query(sql) {
  return new Promise((resolve, reject) => {
    db.all(sql, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function diagnose() {
  console.log('\n' + '='.repeat(70));
  console.log('🔍 DIAGNOSTIC REPORT');
  console.log('='.repeat(70) + '\n');

  try {
    // Check database tables
    console.log('📋 Database Tables:');
    const tables = await query(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`);
    for (const table of tables) {
      console.log(`   - ${table.name}`);
    }

    // Check forms
    console.log('\n📝 Forms:');
    const forms = await query(`SELECT id, name, target_table, is_active FROM form_definitions`);
    if (forms.length === 0) {
      console.log('   ⚠️  No forms found');
    } else {
      for (const form of forms) {
        console.log(`   - ${form.name} (${form.target_table}) ${form.is_active ? '✅' : '❌'}`);
        const fields = await query(`SELECT field_name, field_type FROM form_fields WHERE form_id = '${form.id}'`);
        for (const field of fields) {
          console.log(`     • ${field.field_name} (${field.field_type})`);
        }
      }
    }

    // Check core users
    console.log('\n👤 Core Users:');
    const users = await query(`SELECT id, email FROM core_users`);
    console.log(`   Total: ${users.length}`);
    for (const user of users.slice(0, 5)) {
      console.log(`   - ${user.email}`);
    }

    // Check user data links
    console.log('\n🔗 User Data Links:');
    const links = await query(`SELECT core_user_id, table_name, record_id FROM user_data_links`);
    console.log(`   Total: ${links.length}`);
    for (const link of links.slice(0, 5)) {
      console.log(`   - ${link.core_user_id} -> ${link.table_name}(${link.record_id})`);
    }

    // Check for dynamic user tables
    console.log('\n🗂️  Dynamic Tables Check:');
    const systemTables = ['admins', 'tables', 'dynamic_users', 'access_logs', 'qr_codes', 'core_users', 'user_data_links', 'form_definitions', 'form_fields', 'attendance_sessions', 'attendance_records', 'attendance_audit_logs', 'attendance_student_rosters', 'sqlite_sequence'];
    const dynamicTables = tables.filter(t => !systemTables.includes(t.name));
    if (dynamicTables.length === 0) {
      console.log('   ⚠️  No dynamic tables found');
    } else {
      for (const table of dynamicTables) {
        const count = await query(`SELECT COUNT(*) as cnt FROM ${table.name}`);
        console.log(`   - ${table.name}: ${count[0].cnt} records`);
      }
    }

    // Test API endpoints
    console.log('\n🧪 API Tests:');

    // Get active form
    console.log('   Testing GET /onboarding/form...');
    const formRes = await makeRequest('GET', '/onboarding/form', null);
    if (formRes.status === 200) {
      console.log(`   ✅ Form retrieved: ${formRes.data.data.form_name}`);
    } else {
      console.log(`   ❌ Status ${formRes.status}: ${formRes.data.message}`);
    }

    // Test dashboard (need token)
    console.log('   Testing GET /user/dashboard...');
    const dashRes = await makeRequest('GET', '/user/dashboard', null, 'dummy_token');
    console.log(`   Status: ${dashRes.status} (Expected: 401 without auth)`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  console.log('\n' + '='.repeat(70) + '\n');
  db.close();
}

diagnose().catch(console.error);
