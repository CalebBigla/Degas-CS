const https = require('https');

const testLogin = async () => {
  const data = JSON.stringify({
    email: 'test@test.com',
    password: '1234'
  });

  const options = {
    hostname: 'degas-cs-backend-brmk.onrender.com',
    port: 443,
    path: '/api/form/login',
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
          console.log('\n✅ Login Response:', JSON.stringify(parsed, null, 2));
          if (parsed.success) {
            console.log('\n🎉 LOGIN SUCCESSFUL!');
            console.log('User ID:', parsed.userId);
            console.log('Form ID:', parsed.formId);
            console.log('Has QR Code:', !!parsed.qrCode);
          } else {
            console.log('\n❌ LOGIN FAILED:', parsed.message);
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

console.log('🔐 Testing login with test@test.com / 1234...\n');
testLogin().catch(console.error);
