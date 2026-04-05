/**
 * Check what tables exist in Neon and their column names
 */

require('dotenv').config();
const { Pool } = require('pg');

async function checkTables() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL not found');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const client = await pool.connect();
    
    // Get all tables
    const tables = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    
    console.log('\n📋 Tables in database:');
    console.log('='.repeat(50));
    
    for (const table of tables.rows) {
      console.log(`\n📊 Table: ${table.tablename}`);
      
      // Get columns for this table
      const columns = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [table.tablename]);
      
      console.log('   Columns:');
      columns.rows.forEach(col => {
        console.log(`   - ${col.column_name} (${col.data_type})`);
      });
      
      // Get row count
      const count = await client.query(`SELECT COUNT(*) as count FROM ${table.tablename}`);
      console.log(`   Rows: ${count.rows[0].count}`);
    }
    
    client.release();
    await pool.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkTables();
