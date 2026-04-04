/**
 * Test Registration Endpoint
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3001/api';
const FORM_ID = '06aa4b67-76fe-411a-a1e0-682871e8506f';

const testUser = {
  name: 'Registration Test User',
  phone: '+9876543210',
  email: 'regtest@example.com',
  address: '789 Test Avenue',
  password: 'testpass123'
};

async function testRegistration() {
  console.log('🧪 Testing Registration Endpoint\n');
  console.log('Form ID:', FORM_ID);
  console.log('User Data:', testUser);
  console.log('\n' + '='.repeat(60) + '\n');

  try {
    // Test 1: Get form details
    console.log('📋 Step 1: Getting form details...');
    const formResponse = await axios.get(`${API_BASE}/fixed-forms/${FORM_ID}`);
    console.log('✅ Form found:', formResponse.data.data.name);
    console.log('   Link:', formResponse.data.data.link);
    console.log('   Active:', formResponse.data.data.isActive);
    console.log('');

    // Test 2: Register user
    console.log('📝 Step 2: Registering user...');
    const registerResponse = await axios.post(
      `${API_BASE}/form/register/${FORM_ID}`,
      testUser
    );
    
    console.log('✅ Registration successful!');
    console.log('   User ID:', registerResponse.data.userId);
    console.log('   Form ID:', registerResponse.data.formId);
    console.log('');

    // Test 3: Verify user was created
    console.log('📊 Step 3: Verifying user in database...');
    const usersResponse = await axios.get(`${API_BASE}/form/users/${FORM_ID}`);
    const registeredUser = usersResponse.data.data.find(u => u.email === testUser.email);
    
    if (registeredUser) {
      console.log('✅ User found in database!');
      console.log('   Name:', registeredUser.name);
      console.log('   Email:', registeredUser.email);
      console.log('   Phone:', registeredUser.phone);
      console.log('');
    } else {
      console.log('❌ User not found in database');
    }

    console.log('='.repeat(60));
    console.log('✅ All tests passed!');
    console.log('='.repeat(60));
    console.log('\n📝 Frontend URL to test:');
    console.log(`   http://localhost:5173/register/${FORM_ID}`);
    console.log('');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
    process.exit(1);
  }
}

testRegistration();
