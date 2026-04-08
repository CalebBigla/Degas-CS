/**
 * Debug Registration Issues
 * Tests registration with detailed logging
 */

const axios = require('axios');

const BACKEND_URL = 'http://localhost:3001';
const FORM_ID = '06aa4b67-76fe-411a-a1e0-682871e8506f'; // From your database

// Generate unique test data
const timestamp = Date.now();
const testData = {
  name: 'Test User ' + timestamp,
  phone: '+1555' + timestamp.toString().slice(-7),
  email: `test${timestamp}@example.com`,
  address: '123 Test Street',
  password: 'TestPassword123!',
  photo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
};

console.log('🧪 Testing Registration\n');
console.log('Backend URL:', BACKEND_URL);
console.log('Form ID:', FORM_ID);
console.log('\nTest Data:');
console.log('  Name:', testData.name);
console.log('  Phone:', testData.phone);
console.log('  Email:', testData.email);
console.log('  Address:', testData.address);
console.log('  Has Photo:', !!testData.photo);
console.log('  Has Password:', !!testData.password);
console.log('\n📤 Sending registration request...\n');

axios.post(`${BACKEND_URL}/api/form/register/${FORM_ID}`, testData)
  .then(response => {
    console.log('✅ Registration successful!\n');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.profileImageUrl) {
      console.log('\n📷 Image URL:', response.data.profileImageUrl);
    }
  })
  .catch(error => {
    console.log('❌ Registration failed!\n');
    
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Error:', JSON.stringify(error.response.data, null, 2));
      
      if (error.response.status === 409) {
        console.log('\n⚠️  409 Conflict - This means:');
        console.log('   - Email already exists in database');
        console.log('   - OR Phone already exists in database');
        console.log('\n💡 Solution:');
        console.log('   Run: node check-user-exists.js ' + testData.email);
        console.log('   Or try with different email/phone');
      } else if (error.response.status === 400) {
        console.log('\n⚠️  400 Bad Request - This means:');
        console.log('   - Missing required field');
        console.log('   - Invalid data format');
        console.log('   - Photo validation failed');
      } else if (error.response.status === 404) {
        console.log('\n⚠️  404 Not Found - This means:');
        console.log('   - Form ID not found');
        console.log('   - Check form exists: SELECT * FROM forms WHERE id = "' + FORM_ID + '"');
      }
    } else if (error.request) {
      console.log('❌ No response from server');
      console.log('\n💡 Possible causes:');
      console.log('   - Backend not running');
      console.log('   - Wrong port (check backend is on 3001)');
      console.log('   - CORS issues');
      console.log('\n🔧 Try:');
      console.log('   cd backend && npm run dev');
    } else {
      console.log('Error:', error.message);
    }
  });
