const { Pool } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function testQueries() {
  const client = await pool.connect();
  
  try {
    console.log('✅ Connected to Neon database\n');

    // Test 1: Check if forms table exists
    console.log('📋 Test 1: Check if forms table exists');
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'forms'
      );
    `);
    console.log('   Result:', tableCheck.rows[0].exists ? '✅ Table exists' : '❌ Table missing');

    // Test 2: Get all forms
    console.log('\n📋 Test 2: Get all forms');
    const forms = await client.query('SELECT * FROM forms');
    console.log('   Found:', forms.rows.length, 'forms');
    if (forms.rows.length > 0) {
      console.log('   First form:', {
        id: forms.rows[0].id,
        name: forms.rows[0].name,
        isActive: forms.rows[0].isActive
      });
    }

    // Test 3: Check if users table exists
    console.log('\n📋 Test 3: Check if users table exists');
    const usersTableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      );
    `);
    console.log('   Result:', usersTableCheck.rows[0].exists ? '✅ Table exists' : '❌ Table missing');

    // Test 4: Check column names in users table
    if (usersTableCheck.rows[0].exists) {
      console.log('\n📋 Test 4: Check users table columns');
      const columns = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'users'
        ORDER BY ordinal_position
      `);
      console.log('   Columns:');
      columns.rows.forEach(col => {
        console.log(`     - ${col.column_name} (${col.data_type})`);
      });
    }

    // Test 5: Count users for a specific form
    if (forms.rows.length > 0) {
      console.log('\n📋 Test 5: Count users for first form');
      const formId = forms.rows[0].id;
      
      // Try different query variations
      try {
        const count1 = await client.query('SELECT COUNT(*) as count FROM users WHERE "formId" = $1', [formId]);
        console.log('   Query with "formId":', count1.rows[0].count, 'users');
      } catch (e) {
        console.log('   Query with "formId" failed:', e.message);
      }

      try {
        const count2 = await client.query('SELECT COUNT(*) as count FROM users WHERE formId = $1', [formId]);
        console.log('   Query with formId (no quotes):', count2.rows[0].count, 'users');
      } catch (e) {
        console.log('   Query with formId (no quotes) failed:', e.message);
      }
    }

    console.log('\n✅ All tests complete');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('   Detail:', error.detail);
    console.error('   Code:', error.code);
  } finally {
    client.release();
    await pool.end();
  }
}

testQueries();
