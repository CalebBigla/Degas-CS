#!/usr/bin/env node
/**
 * Setup Script - Create Default Admin User
 * Run this after database migration to ensure admin exists
 */

const http = require('http');

function makeRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api' + path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(data)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data
          });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function setupAdmin() {
  console.log('\n' + '='.repeat(70));
  console.log('🔧 SETUP: Creating Default Admin User');
  console.log('='.repeat(70) + '\n');

  try {
    // Try to create admin user
    console.log('📝 Creating admin user...');
    const registerRes = await makeRequest('POST', '/core-auth/register', {
      email: 'admin@degas.com',
      password: 'admin123',
      role: 'admin',
      status: 'active'
    });

    if (registerRes.status === 201) {
      console.log('✅ Admin user created successfully');
      console.log('\n📋 Login Credentials:');
      console.log('   Email: admin@degas.com');
      console.log('   Password: admin123\n');
    } else if (registerRes.status === 409) {
      console.log('ℹ️  Admin user already exists');
      console.log('\n📋 Login Credentials:');
      console.log('   Email: admin@degas.com');
      console.log('   Password: admin123\n');
    } else {
      console.log('⚠️  Response:', JSON.stringify(registerRes.data, null, 2));
    }

    // Test login
    console.log('🧪 Testing login...');
    const loginRes = await makeRequest('POST', '/core-auth/login', {
      email: 'admin@degas.com',
      password: 'admin123'
    });

    if (loginRes.status === 200) {
      console.log('✅ Login successful!\n');
      console.log('🎉 System is ready to use!');
      console.log('\n📌 Next Steps:');
      console.log('   1. Go to http://localhost:5173');
      console.log('   2. Create a form via admin panel');
      console.log('   3. Users can register using the form\n');
    } else {
      console.log('❌ Login failed:', loginRes.data.message || loginRes.data.error);
    }

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    process.exit(1);
  }

  console.log('='.repeat(70) + '\n');
}

setupAdmin();
