require('dotenv').config();
const { Pool } = require('pg');

async function testProfileImageAPI() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔍 Testing profile image data...\n');

    // Get a form
    const formResult = await pool.query('SELECT id, name FROM forms LIMIT 1');
    if (formResult.rows.length === 0) {
      console.log('❌ No forms found');
      return;
    }

    const form = formResult.rows[0];
    console.log(`📋 Testing with form: ${form.name} (${form.id})\n`);

    // Get users with their profile images
    const usersResult = await pool.query(
      `SELECT id, name, email, profileimageurl, createdat
       FROM users
       WHERE formid = $1
       ORDER BY createdat DESC
       LIMIT 5`,
      [form.id]
    );

    console.log(`👥 Found ${usersResult.rows.length} users:\n`);

    usersResult.rows.forEach((user, index) => {
      console.log(`User ${index + 1}:`);
      console.log(`  Name: ${user.name}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Profile Image URL: ${user.profileimageurl || 'NULL'}`);
      console.log(`  Has Image: ${user.profileimageurl ? '✅ YES' : '❌ NO'}`);
      console.log('');
    });

    // Test the mapping that the API does
    console.log('\n📤 API Response Format (after mapping):');
    const mappedUsers = usersResult.rows.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      profileImageUrl: user.profileimageurl, // This is what the API returns
      createdAt: user.createdat
    }));

    console.log(JSON.stringify(mappedUsers, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

testProfileImageAPI();
