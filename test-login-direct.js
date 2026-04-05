// Direct login test script
// Run with: node test-login-direct.js

const https = require('https');

const testCredentials = {
  email: 'test@test.com',
  password: '1234'
};

console.log('🔍 Testing login for:', testCredentials.email);
console.log('⏳ Connecting to backend...\n');

// Test the debug endpoint
const debugData = JSON.stringify(testCredentials);

const debugOptions = {
  hostname: 'degas-cs-backend-brmk.onrender.com',
  port: 443,
  path: '/api/debug/test-login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': debugData.length
  }
};

const debugReq = https.request(debugOptions, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('=== DEBUG ENDPOINT RESULT ===');
    console.log('Status:', res.statusCode);
    try {
      const result = JSON.parse(data);
      console.log(JSON.stringify(result, null, 2));
      
      // Analyze the result
      console.log('\n=== ANALYSIS ===');
      if (result.step2_userLookup?.found) {
        console.log('✅ User found in database');
        console.log('   User ID:', result.step2_userLookup.userId);
        console.log('   Email:', result.step2_userLookup.email);
        console.log('   Form ID:', result.step2_userLookup.formId);
        console.log('   Has password stored:', result.step2_userLookup.hasStoredPassword);
        console.log('   Password hash length:', result.step2_userLookup.storedPasswordLength);
        
        if (result.step3_passwordCheck) {
          if (result.step3_passwordCheck.isValid) {
            console.log('✅ Password is VALID');
            console.log('\n🎉 LOGIN SHOULD WORK!');
            console.log('\nIf login still fails in the UI, the issue is:');
            console.log('- QR code generation');
            console.log('- Response format');
            console.log('- Frontend handling');
          } else {
            console.log('❌ Password is INVALID');
            console.log('\n🔍 PROBLEM: Password mismatch');
            console.log('Possible causes:');
            console.log('1. Wrong password entered');
            console.log('2. Password not hashed correctly during registration');
            console.log('3. Database encoding issue');
          }
        }
      } else {
        console.log('❌ User NOT found in database');
        console.log('\n🔍 PROBLEM: User does not exist');
        console.log('Solutions:');
        console.log('1. Register again');
        console.log('2. Check if email is correct');
        console.log('3. Check database connection');
      }
      
      // Now test the actual login endpoint
      console.log('\n\n=== TESTING ACTUAL LOGIN ENDPOINT ===');
      testActualLogin();
      
    } catch (e) {
      console.log('Raw response:', data);
      console.log('Parse error:', e.message);
    }
  });
});

debugReq.on('error', (e) => {
  console.error('❌ Request failed:', e.message);
});

debugReq.write(debugData);
debugReq.end();

// Test actual login endpoint
function testActualLogin() {
  const loginData = JSON.stringify(testCredentials);
  
  const loginOptions = {
    hostname: 'degas-cs-backend-brmk.onrender.com',
    port: 443,
    path: '/api/form/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': loginData.length
    }
  };
  
  const loginReq = https.request(loginOptions, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('Status:', res.statusCode);
      try {
        const result = JSON.parse(data);
        console.log(JSON.stringify(result, null, 2));
        
        if (res.statusCode === 200 && result.success) {
          console.log('\n✅ ACTUAL LOGIN SUCCESSFUL!');
          console.log('User can login and get QR code');
        } else {
          console.log('\n❌ ACTUAL LOGIN FAILED');
          console.log('Error:', result.message || 'Unknown error');
        }
      } catch (e) {
        console.log('Raw response:', data);
        console.log('Parse error:', e.message);
      }
    });
  });
  
  loginReq.on('error', (e) => {
    console.error('❌ Login request failed:', e.message);
  });
  
  loginReq.write(loginData);
  loginReq.end();
}
