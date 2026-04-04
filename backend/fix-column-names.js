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

async function fixColumnNames() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Fixing column names to be PostgreSQL-friendly...\n');

    // Check current column names
    console.log('📋 Current users table columns:');
    const columns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    
    columns.rows.forEach(col => {
      console.log(`   - ${col.column_name}`);
    });

    // Check if we need to rename columns
    const hasFormId = columns.rows.some(c => c.column_name === 'formId');
    const hasformid = columns.rows.some(c => c.column_name === 'formid');

    if (hasFormId) {
      console.log('\n⚠️  Found camelCase column "formId" - this requires quotes in queries');
      console.log('   Recommendation: Use "formId" with quotes in all queries');
    } else if (hasformid) {
      console.log('\n✅ Found lowercase column "formid" - no quotes needed');
    } else {
      console.log('\n❌ No formId column found!');
    }

    // Test a query
    console.log('\n🧪 Testing query...');
    const testQuery = hasFormId 
      ? 'SELECT COUNT(*) as count FROM users WHERE "formId" = $1'
      : 'SELECT COUNT(*) as count FROM users WHERE formid = $1';
    
    const forms = await client.query('SELECT id FROM forms LIMIT 1');
    if (forms.rows.length > 0) {
      const result = await client.query(testQuery, [forms.rows[0].id]);
      console.log(`   ✅ Query successful: ${result.rows[0].count} users found`);
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

fixColumnNames();
