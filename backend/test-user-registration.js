const http = require('http');

const formId = '06aa4b67-76fe-411a-a1e0-682871e8506f'; // Default form ID

const postData = JSON.stringify({
  name: 'Test User',
  phone: '+1 (555) 100-0001',
  email: 'testuser@example.com',
  address: '123 Test Street, Test City',
  password: 'TestPassword123!'
});

const options = {
  hostname: 'localhost',
  port: 3001,
  path: `/api/form/register/${formId}`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  console.log(`\n📊 Response Status: ${res.statusCode}`);
  console.log('Response Headers:', res.headers);

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log('\n✅ Response Body:');
      console.log(JSON.stringify(parsed, null, 2));
      
      if (res.statusCode === 201) {
        console.log('\n🎉 USER REGISTRATION SUCCESSFUL!');
      } else if (res.statusCode === 400) {
        console.log('\n⚠️  Bad Request - Validation error');
      } else if (res.statusCode === 404) {
        console.log('\n❌ Form not found');
      } else if (res.statusCode === 409) {
        console.log('\n⚠️  Conflict - Email or phone already registered');
      } else if (res.statusCode === 500) {
        console.log('\n🔥 SERVER ERROR - Check backend logs');
      }
    } catch (e) {
      console.log('\n❌ Failed to parse response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request error:', error);
});

console.log('📡 Testing user registration endpoint...');
console.log(`URL: POST http://localhost:3001/api/form/register/${formId}`);
console.log('Request Body:', JSON.parse(postData));

req.write(postData);
req.end();
