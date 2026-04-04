const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// Get DATABASE_URL from environment
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL environment variable is not set!');
  console.error('   Make sure you have set DATABASE_URL in Render environment variables.');
  process.exit(1);
}

console.log('📂 Connecting to Neon PostgreSQL database...');
console.log('   Connection string:', connectionString.substring(0, 30) + '...');

const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

async function setupNeonAdmin() {
  const client = await pool.connect();
  
  try {
    console.log('✅ Connected to Neon database');

    // Check if core_users table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'core_users'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('❌ core_users table does not exist!');
      console.log('   Database may not be initialized properly.');
      console.log('   Make sure the backend server has started at least once.');
      return;
    }

    console.log('✅ core_users table exists');

    // Check if admin already exists
    const existingAdmin = await client.query(
      'SELECT id, email, role, status FROM core_users WHERE email = $1',
      ['admin@degas.com']
    );

    if (existingAdmin.rows.length > 0) {
      const admin = existingAdmin.rows[0];
      console.log('✅ Admin already exists in core_users');
      console.log('   ID:', admin.id);
      console.log('   Email:', admin.email);
      console.log('   Role:', admin.role);
      console.log('   Status:', admin.status);
      
      // Update to super_admin and active if not already
      if (admin.role !== 'super_admin' || admin.status !== 'active') {
        await client.query(
          'UPDATE core_users SET role = $1, status = $2, updated_at = NOW() WHERE email = $3',
          ['super_admin', 'active', 'admin@degas.com']
        );
        console.log('✅ Updated role to super_admin and status to active');
      }
      
      return;
    }

    // Create new super admin
    console.log('📝 Creating super admin...');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const adminId = uuidv4();

    await client.query(
      `INSERT INTO core_users (id, email, password, full_name, phone, role, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
      [adminId, 'admin@degas.com', hashedPassword, 'Super Admin', '+1234567890', 'super_admin', 'active']
    );

    console.log('✅ Super admin created successfully!');
    console.log('');
    console.log('🔑 Login Credentials:');
    console.log('   Email: admin@degas.com');
    console.log('   Password: admin123');
    console.log('');
    console.log('📍 Login Endpoint:');
    console.log('   POST https://degas-cs-backend-brmk.onrender.com/api/core-auth/login');
    console.log('   Body: { "email": "admin@degas.com", "password": "admin123" }');
    console.log('');
    console.log('🎉 You can now login to the system!');

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

setupNeonAdmin();
