const https = require('https');

const testRegistration = async () => {
  const data = JSON.stringify({
    name: "New Test User",
    phone: "9876543210",
    email: "newtest@example.com",
    address: "123 Test Street",
    password: "password123"
  });

  const options = {
    hostname: 'degas-cs-backend-brmk.onrender.com',
    port: 443,
    path: '/api/form/register/06aa4b67-76fe-411a-a1e0-682871e8506f',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        console.log('Response:', body);
        try {
          const parsed = JSON.parse(body);
          console.log('\n✅ Registration Response:', JSON.stringify(parsed, null, 2));
          if (parsed.success) {
            console.log('\n🎉 REGISTRATION SUCCESSFUL!');
            console.log('User ID:', parsed.userId);
            console.log('Form ID:', parsed.formId);
          } else {
            console.log('\n❌ REGISTRATION FAILED:', parsed.message);
          }
        } catch (e) {
          console.log('Raw response:', body);
        }
        resolve();
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request Error:', error);
      reject(error);
    });

    req.write(data);
    req.end();
  });
};

console.log('📝 Testing registration endpoint...\n');
testRegistration().catch(console.error);
