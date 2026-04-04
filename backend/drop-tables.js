/**
 * Drop and recreate tables in Neon PostgreSQL
 * Run this to fix column name issues
 */

require('dotenv').config();
const { Pool } = require('pg');

async function dropTables() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL not found in environment variables');
    process.exit(1);
  }

  console.log('🔗 Connecting to Neon PostgreSQL...');
  
  const pool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    const client = await pool.connect();
    console.log('✅ Connected to database');

    // Drop tables in correct order (respecting foreign keys)
    console.log('\n🗑️  Dropping tables...');
    
    await client.query('DROP TABLE IF EXISTS access_logs CASCADE');
    console.log('✅ Dropped access_logs table');
    
    await client.query('DROP TABLE IF EXISTS users CASCADE');
    console.log('✅ Dropped users table');
    
    await client.query('DROP TABLE IF EXISTS forms CASCADE');
    console.log('✅ Dropped forms table');
    
    console.log('\n✅ All tables dropped successfully!');
    console.log('\n📝 Next step: Visit the setup endpoint to recreate tables:');
    console.log('   https://degas-cs-backend-brmk.onrender.com/api/setup/initialize');
    
    client.release();
    await pool.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

dropTables();
