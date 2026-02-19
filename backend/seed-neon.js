const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_HIZXfPdYny92@ep-snowy-dust-ai85xh5f-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
});

async function seedNeon() {
  const client = await pool.connect();
  try {
    console.log('Connecting to Neon...');
    
    // Create admins table
    await client.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(255),
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        last_login TIMESTAMP
      )
    `);
    console.log('✅ Admins table created');

    // Check if admin accounts exist
    const result = await client.query('SELECT COUNT(*) FROM admins');
    const count = parseInt(result.rows[0].count);
    console.log(`Current admin count: ${count}`);

    if (count === 0) {
      // Hash passwords
      const adminPassword = await bcrypt.hash('admin123', 10);
      const guardPassword = await bcrypt.hash('guard123', 10);

      // Insert admin accounts
      await client.query(
        `INSERT INTO admins (id, username, email, password_hash, role) 
         VALUES ($1, $2, $3, $4, $5)`,
        [uuidv4(), 'admin', 'admin@degas.com', adminPassword, 'super_admin']
      );
      console.log('✅ Admin account created');

      await client.query(
        `INSERT INTO admins (id, username, email, password_hash, role) 
         VALUES ($1, $2, $3, $4, $5)`,
        [uuidv4(), 'guard', 'guard@degas.com', guardPassword, 'guard']
      );
      console.log('✅ Guard account created');

      // Verify
      const verify = await client.query('SELECT username, role FROM admins');
      console.log('\n✅ Admin accounts in Neon:');
      verify.rows.forEach(row => {
        console.log(`  - ${row.username} (${row.role})`);
      });
    } else {
      console.log('Admin accounts already exist in Neon');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    await pool.end();
  }
}

seedNeon();
