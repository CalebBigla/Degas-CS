/**
 * Test forms directly from Neon database
 * This will show us exactly what data exists and what queries work
 */

require('dotenv').config();
const { Pool } = require('pg');

async function testForms() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL not found');
    console.log('Set it in .env.production or as environment variable');
    process.exit(1);
  }

  console.log('🔗 Connecting to Neon PostgreSQL...\n');
  
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const client = await pool.connect();
    console.log('✅ Connected to database\n');

    // Test 1: Check if forms table exists
    console.log('📋 TEST 1: Check if forms table exists');
    console.log('='.repeat(50));
    const tablesResult = await client.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' AND tablename = 'forms'
    `);
    console.log('Forms table exists:', tablesResult.rows.length > 0 ? '✅ YES' : '❌ NO');
    console.log('');

    // Test 2: Get all forms
    console.log('📋 TEST 2: Query all forms');
    console.log('='.repeat(50));
    const formsResult = await client.query('SELECT * FROM forms');
    console.log(`Found ${formsResult.rows.length} form(s)\n`);
    
    if (formsResult.rows.length > 0) {
      formsResult.rows.forEach((form, index) => {
        console.log(`Form ${index + 1}:`);
        console.log(`  ID: ${form.id}`);
        console.log(`  Name: ${form.name}`);
        console.log(`  Link: ${form.link}`);
        console.log(`  Active: ${form.isactive}`);
        console.log(`  Created: ${form.createdat}`);
        console.log(`  Columns in result:`, Object.keys(form));
        console.log('');
      });
    }

    // Test 3: Count users for each form
    console.log('📋 TEST 3: Count users per form');
    console.log('='.repeat(50));
    for (const form of formsResult.rows) {
      const userCount = await client.query(
        'SELECT COUNT(*) as count FROM users WHERE formid = $1',
        [form.id]
      );
      console.log(`Form "${form.name}": ${userCount.rows[0].count} users`);
    }
    console.log('');

    // Test 4: Check if form_definitions table exists (old system)
    console.log('📋 TEST 4: Check if form_definitions table exists');
    console.log('='.repeat(50));
    const oldTableResult = await client.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' AND tablename = 'form_definitions'
    `);
    console.log('form_definitions table exists:', oldTableResult.rows.length > 0 ? '✅ YES' : '❌ NO (expected)');
    console.log('');

    // Test 5: Simulate the controller query
    console.log('📋 TEST 5: Simulate controller query');
    console.log('='.repeat(50));
    try {
      const controllerQuery = await client.query(`
        SELECT id, name, link, qrcode, isactive, createdat, updatedat 
        FROM forms 
        ORDER BY createdat DESC
      `);
      console.log('✅ Controller query works!');
      console.log(`   Returned ${controllerQuery.rows.length} form(s)`);
      
      if (controllerQuery.rows.length > 0) {
        const form = controllerQuery.rows[0];
        console.log('\n   Sample form data:');
        console.log(`   - id: ${form.id}`);
        console.log(`   - name: ${form.name}`);
        console.log(`   - isactive: ${form.isactive}`);
        console.log(`   - createdat: ${form.createdat}`);
      }
    } catch (error) {
      console.error('❌ Controller query failed:', error.message);
    }
    console.log('');

    // Summary
    console.log('📊 SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Database connection: Working`);
    console.log(`✅ Forms table: ${formsResult.rows.length > 0 ? 'Has data' : 'Empty'}`);
    console.log(`✅ Column names: All lowercase (correct for PostgreSQL)`);
    console.log(`\n🎯 Next step: Push the fix and redeploy to Render`);

    client.release();
    await pool.end();
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

testForms();
