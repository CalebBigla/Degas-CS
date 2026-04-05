// Check if qr_codes table exists in Neon
require('dotenv').config({ path: './backend/.env' });
const { Client } = require('pg');

async function checkQRTable() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to Neon PostgreSQL\n');

    // Check if qr_codes table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'qr_codes'
      );
    `);

    if (tableCheck.rows[0].exists) {
      console.log('✅ qr_codes table EXISTS\n');
      
      // Get table structure
      const structure = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'qr_codes'
        ORDER BY ordinal_position;
      `);
      
      console.log('📋 Table structure:');
      structure.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(required)' : '(optional)'}`);
      });
      
      // Check row count
      const count = await client.query('SELECT COUNT(*) as count FROM qr_codes');
      console.log(`\n📊 Total QR codes: ${count.rows[0].count}`);
      
    } else {
      console.log('❌ qr_codes table DOES NOT EXIST');
      console.log('\n🔧 Need to create it!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkQRTable();
