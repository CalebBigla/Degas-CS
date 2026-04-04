const axios = require('axios');

const API_URL = 'http://localhost:3001/api';

async function testCoreLogin() {
  console.log('🧪 Testing Core User Login...\n');
  
  try {
    const response = await axios.post(`${API_URL}/core-auth/login`, {
      email: 'admin@degas.com',
      password: 'admin123'
    });
    
    console.log('✅ Login successful!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.data && response.data.data.token) {
      console.log('\n🎫 Token:', response.data.data.token.substring(0, 50) + '...');
      console.log('👤 User:', response.data.data.user);
    }
  } catch (error) {
    console.error('❌ Login failed!');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testCoreLogin();
