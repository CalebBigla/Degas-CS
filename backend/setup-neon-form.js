const { Pool } = require('pg');
const QRCode = require('qrcode');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL environment variable is not set!');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function setupNeonForm() {
  const client = await pool.connect();
  
  try {
    console.log('✅ Connected to Neon database');

    // Check if forms table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'forms'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('❌ forms table does not exist!');
      console.log('   Creating forms table...');
      
      await client.query(`
        CREATE TABLE IF NOT EXISTS forms (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL UNIQUE,
          link TEXT NOT NULL UNIQUE,
          "qrCode" TEXT DEFAULT NULL,
          "isActive" BOOLEAN DEFAULT true,
          "createdAt" TIMESTAMP DEFAULT NOW(),
          "updatedAt" TIMESTAMP DEFAULT NOW()
        )
      `);
      
      console.log('✅ forms table created');
    }

    // Check if users table exists
    const usersTableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'users'
      );
    `);

    if (!usersTableCheck.rows[0].exists) {
      console.log('❌ users table does not exist!');
      console.log('   Creating users table...');
      
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          phone TEXT NOT NULL UNIQUE,
          email TEXT NOT NULL UNIQUE,
          address TEXT NOT NULL,
          password TEXT NOT NULL,
          "formId" UUID NOT NULL,
          scanned BOOLEAN DEFAULT false,
          "scannedAt" TIMESTAMP DEFAULT NULL,
          "createdAt" TIMESTAMP DEFAULT NOW(),
          "updatedAt" TIMESTAMP DEFAULT NOW()
        )
      `);
      
      // Create indexes
      await client.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_users_formId ON users("formId")`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_users_scanned ON users(scanned)`);
      
      console.log('✅ users table created');
    }

    // Check if default form exists
    const existingForm = await client.query(
      'SELECT id, name, link FROM forms WHERE name = $1',
      ['The Force of Grace Ministry']
    );

    const formId = '06aa4b67-76fe-411a-a1e0-682871e8506f';
    const frontendUrl = process.env.FRONTEND_URL || 'https://degas-cs-frontend.onrender.com';
    const registrationLink = `${frontendUrl}/register/${formId}`;
    const scanUrl = `${frontendUrl}/scan/${formId}`;

    if (existingForm.rows.length > 0) {
      console.log('✅ Default form already exists');
      console.log('   ID:', existingForm.rows[0].id);
      console.log('   Name:', existingForm.rows[0].name);
      console.log('   Link:', existingForm.rows[0].link);
      
      // Update QR code to scan URL
      console.log('📝 Updating QR code to scan URL...');
      const qrCodeData = await QRCode.toDataURL(scanUrl, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        width: 300,
        margin: 2
      });
      
      await client.query(
        'UPDATE forms SET "qrCode" = $1, "updatedAt" = NOW() WHERE name = $2',
        [qrCodeData, 'The Force of Grace Ministry']
      );
      
      console.log('✅ QR code updated');
      return;
    }

    // Create default form
    console.log('📝 Creating default form: The Force of Grace Ministry...');
    
    const qrCodeData = await QRCode.toDataURL(scanUrl, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 300,
      margin: 2
    });
    
    await client.query(
      `INSERT INTO forms (id, name, link, "qrCode", "isActive", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, true, NOW(), NOW())`,
      [formId, 'The Force of Grace Ministry', registrationLink, qrCodeData]
    );

    console.log('✅ Default form created successfully!');
    console.log('');
    console.log('📋 Form Details:');
    console.log('   ID:', formId);
    console.log('   Name: The Force of Grace Ministry');
    console.log('   Registration Link:', registrationLink);
    console.log('   Scan URL:', scanUrl);
    console.log('');
    console.log('🎉 Form is ready to use!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code) {
      console.error('   Error code:', error.code);
    }
    if (error.detail) {
      console.error('   Detail:', error.detail);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

setupNeonForm();
