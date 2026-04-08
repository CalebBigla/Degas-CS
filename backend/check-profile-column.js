require('dotenv').config();
const { Pool } = require('pg');

async function checkProfileColumn() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔍 Checking users table schema...\n');

    // Get column information
    const columnsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);

    console.log('📋 Users table columns:');
    columnsResult.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    console.log('\n🔍 Checking for profile image column specifically...\n');
    
    const profileColumns = columnsResult.rows.filter(col => 
      col.column_name.toLowerCase().includes('profile') || 
      col.column_name.toLowerCase().includes('image') ||
      col.column_name.toLowerCase().includes('photo')
    );

    if (profileColumns.length > 0) {
      console.log('✅ Found profile/image columns:');
      profileColumns.forEach(col => {
        console.log(`  - ${col.column_name}`);
      });
    } else {
      console.log('❌ No profile/image columns found');
    }

    // Get sample user data
    console.log('\n👥 Sample user data:\n');
    const usersResult = await pool.query('SELECT * FROM users LIMIT 2');
    
    if (usersResult.rows.length > 0) {
      console.log('First user columns:');
      Object.keys(usersResult.rows[0]).forEach(key => {
        const value = usersResult.rows[0][key];
        const displayValue = typeof value === 'string' && value.length > 50 
          ? value.substring(0, 50) + '...' 
          : value;
        console.log(`  ${key}: ${displayValue}`);
      });
    } else {
      console.log('No users found in database');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

checkProfileColumn();
