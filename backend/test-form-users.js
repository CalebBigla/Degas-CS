const http = require('http');

const formId = '06aa4b67-76fe-411a-a1e0-682871e8506f'; // Default form ID

const options = {
  hostname: 'localhost',
  port: 3001,
  path: `/api/admin/forms-tables/${formId}/users`,
  method: 'GET',
  headers: {
    'Authorization': 'Bearer test-token', // Will fail auth, but we can see the error
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  console.log(`\n📊 Response Status: ${res.statusCode}`);

  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log('\n✅ Response Body:');
      console.log(JSON.stringify(parsed, null, 2));
      
      if (parsed.data && parsed.data.records) {
        console.log(`\n📋 Found ${parsed.data.records.length} users registered`);
        if (parsed.data.link) {
          console.log(`📎 Form Link: ${parsed.data.link}`);
        }
        if (parsed.data.qrCode) {
          console.log('📱 QR Code: Available');
        }
      }
    } catch (e) {
      console.log('\n❌ Failed to parse response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request error:', error);
});

console.log('📡 Testing form users endpoint (without auth)...');
console.log(`URL: GET http://localhost:3001/api/admin/forms-tables/${formId}/users`);

req.write('');
req.end();
