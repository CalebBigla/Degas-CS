// Create qr_codes table directly in Neon
require('dotenv').config({ path: '.env' });
const { Client } = require('pg');

async function createQRTable() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to Neon PostgreSQL\n');

    // Create qr_codes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS qr_codes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        table_id TEXT,
        qr_data TEXT NOT NULL,
        qr_payload TEXT,
        is_active BOOLEAN DEFAULT true,
        scan_count INTEGER DEFAULT 0,
        last_scanned TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ qr_codes table created');

    // Create index
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_qr_codes_user_id ON qr_codes(user_id)
    `);
    console.log('✅ Index created on user_id');

    // Check the table
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'qr_codes'
      ORDER BY ordinal_position
    `);

    console.log('\n📋 Table structure:');
    result.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });

    console.log('\n✅ Done! Users can now login and get QR codes.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

createQRTable();
