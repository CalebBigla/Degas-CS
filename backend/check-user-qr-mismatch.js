#!/usr/bin/env node
const dotenv = require('dotenv');
dotenv.config();

const { Client } = require('pg');

async function run() {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not set');
    process.exit(1);
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  
  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL');

    // Get all QR codes
    console.log('\n📋 QR Codes in database:');
    const qrResult = await client.query('SELECT COUNT(*) as count FROM qr_codes');
    console.log(`Total QR codes: ${qrResult.rows[0].count}`);

    const qrSample = await client.query(`
      SELECT id, user_id, is_active, created_at
      FROM qr_codes
      ORDER BY created_at DESC
      LIMIT 5
    `);
    console.log('Sample QR codes:');
    qrSample.rows.forEach(row => {
      console.log(`  - ID: ${row.id}, User: ${row.user_id}, Active: ${row.is_active}`);
    });

    // Get all unique user IDs from QR codes
    console.log('\n🔎 Checking User/QR relationship:');
    const qrUserIds = await client.query(`
      SELECT DISTINCT user_id FROM qr_codes ORDER BY user_id
    `);
    
    const uniqueUserIds = qrUserIds.rows.map(r => r.user_id);
    console.log(`Unique user IDs in QR codes: ${uniqueUserIds.length}`);

    // Check which of these user IDs exist in any user table
    console.log('\n👥 Checking if QR users exist in dynamic_users table:');
    
    for (const userId of uniqueUserIds.slice(0, 5)) {
      const userCheck = await client.query(
        'SELECT id, data FROM dynamic_users WHERE id = $1 LIMIT 1',
        [userId]
      );
      if (userCheck.rows.length > 0) {
        const userData = userCheck.rows[0].data;
        console.log(`✅ ${userId} - FOUND - Name: ${userData?.fullName || 'N/A'}`);
      } else {
        console.log(`❌ ${userId} - NOT FOUND`);
      }
    }

    // Check what users actually exist
    console.log('\n📊 Users in dynamic_users table:');
    const userCount = await client.query('SELECT COUNT(*) as count FROM dynamic_users');
    console.log(`Total users: ${userCount.rows[0].count}`);

    const userSample = await client.query(`
      SELECT id, data FROM dynamic_users LIMIT 5
    `);
    console.log('Sample users:');
    userSample.rows.forEach(row => {
      console.log(`  - ID: ${row.id}, Name: ${row.data?.fullName || 'N/A'}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

run();
