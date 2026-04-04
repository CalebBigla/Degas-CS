/**
 * Test Script for Form Module Enhancements
 * Tests: Registration, QR Scanning, Access Logs
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3001/api/form';
const FORM_ID = '06aa4b67-76fe-411a-a1e0-682871e8506f'; // The Force of Grace Ministry

// Test data
const testUser = {
  name: 'Test User Enhanced',
  phone: '+1234567899',
  email: 'testenhanced@grace.com',
  address: '456 Enhanced Street',
  password: 'password123'
};

let createdUserId = null;

async function runTests() {
  console.log('🧪 Starting Form Module Enhancement Tests\n');
  console.log('=' .repeat(60));

  try {
    // Test 1: Register User
    console.log('\n📝 Test 1: Register User with Form');
    console.log('-'.repeat(60));
    try {
      const registerResponse = await axios.post(
        `${API_BASE}/register/${FORM_ID}`,
        testUser
      );
      
      if (registerResponse.data.success) {
        createdUserId = registerResponse.data.userId;
        console.log('✅ Registration successful');
        console.log('   User ID:', createdUserId);
        console.log('   Form ID:', registerResponse.data.formId);
      } else {
        console.log('❌ Registration failed:', registerResponse.data.message);
      }
    } catch (error) {
      if (error.response?.status === 409) {
        console.log('⚠️  User already exists (expected if running multiple times)');
        // Try to get the user ID
        const loginResponse = await axios.post(`${API_BASE}/login`, {
          email: testUser.email,
          password: testUser.password
        });
        createdUserId = loginResponse.data.userId;
        console.log('   Using existing user ID:', createdUserId);
      } else {
        throw error;
      }
    }

    // Test 2: Get Users by Form
    console.log('\n📊 Test 2: Get Users by Form');
    console.log('-'.repeat(60));
    const usersResponse = await axios.get(`${API_BASE}/users/${FORM_ID}`);
    
    if (usersResponse.data.success) {
      console.log('✅ Users fetched successfully');
      console.log('   Total users:', usersResponse.data.data.length);
      console.log('   Users:', usersResponse.data.data.map(u => ({
        name: u.name,
        email: u.email,
        scanned: u.scanned
      })));
    } else {
      console.log('❌ Failed to fetch users');
    }

    // Test 3: Scan User (First Time)
    console.log('\n🔍 Test 3: Scan User (First Time)');
    console.log('-'.repeat(60));
    try {
      const scanResponse = await axios.post(`${API_BASE}/scan`, {
        userId: createdUserId,
        formId: FORM_ID
      });
      
      if (scanResponse.data.success) {
        console.log('✅ Scan successful');
        console.log('   User:', scanResponse.data.userName);
        console.log('   Scanned at:', scanResponse.data.scannedAt);
      } else {
        console.log('❌ Scan failed:', scanResponse.data.message);
      }
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.message === 'Already scanned') {
        console.log('⚠️  User already scanned (expected if running multiple times)');
      } else {
        throw error;
      }
    }

    // Test 4: Scan User (Duplicate - Should Fail)
    console.log('\n🔍 Test 4: Scan User (Duplicate - Should Fail)');
    console.log('-'.repeat(60));
    try {
      const duplicateScanResponse = await axios.post(`${API_BASE}/scan`, {
        userId: createdUserId,
        formId: FORM_ID
      });
      
      console.log('❌ Duplicate scan should have failed but succeeded');
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.message === 'Already scanned') {
        console.log('✅ Duplicate scan prevented correctly');
        console.log('   Message:', error.response.data.message);
        console.log('   Previously scanned at:', error.response.data.scannedAt);
      } else {
        throw error;
      }
    }

    // Test 5: Get Access Logs
    console.log('\n📋 Test 5: Get Access Logs for Form');
    console.log('-'.repeat(60));
    const logsResponse = await axios.get(`${API_BASE}/logs/${FORM_ID}`);
    
    if (logsResponse.data.success) {
      console.log('✅ Access logs fetched successfully');
      console.log('   Total logs:', logsResponse.data.data.length);
      if (logsResponse.data.data.length > 0) {
        console.log('   Recent logs:');
        logsResponse.data.data.slice(0, 3).forEach(log => {
          console.log(`     - ${log.userName} (${log.userEmail}) at ${log.timestamp}`);
        });
      }
    } else {
      console.log('❌ Failed to fetch access logs');
    }

    // Test 6: Get Analytics
    console.log('\n📈 Test 6: Get Analytics for Form');
    console.log('-'.repeat(60));
    const analyticsResponse = await axios.get(`${API_BASE}/analytics/${FORM_ID}`);
    
    if (analyticsResponse.data.success) {
      console.log('✅ Analytics fetched successfully');
      console.log('   Total users:', analyticsResponse.data.data.total);
      console.log('   Attended:', analyticsResponse.data.data.attended);
      console.log('   Not attended:', analyticsResponse.data.data.notAttended);
      console.log('   Attendance rate:', analyticsResponse.data.data.attendanceRate + '%');
    } else {
      console.log('❌ Failed to fetch analytics');
    }

    // Test 7: Get Form Details
    console.log('\n📄 Test 7: Get Form Details');
    console.log('-'.repeat(60));
    const formResponse = await axios.get(`${API_BASE}/fixed-forms/${FORM_ID}`);
    
    if (formResponse.data.success) {
      console.log('✅ Form details fetched successfully');
      console.log('   Name:', formResponse.data.data.name);
      console.log('   Registration link:', formResponse.data.data.link);
      console.log('   User count:', formResponse.data.data.userCount);
      console.log('   QR Code:', formResponse.data.data.qrCode ? 'Generated ✓' : 'Missing ✗');
      console.log('   QR encodes: /scan/' + FORM_ID);
    } else {
      console.log('❌ Failed to fetch form details');
    }

    // Test 8: Error Handling - Invalid Form ID
    console.log('\n⚠️  Test 8: Error Handling - Invalid Form ID');
    console.log('-'.repeat(60));
    try {
      await axios.post(`${API_BASE}/register/invalid-form-id`, testUser);
      console.log('❌ Should have failed with invalid form ID');
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('✅ Invalid form ID handled correctly');
        console.log('   Error:', error.response.data.message);
      } else {
        throw error;
      }
    }

    // Test 9: Error Handling - Missing Fields
    console.log('\n⚠️  Test 9: Error Handling - Missing Required Fields');
    console.log('-'.repeat(60));
    try {
      await axios.post(`${API_BASE}/register/${FORM_ID}`, {
        name: 'Incomplete User'
        // Missing phone, email, address, password
      });
      console.log('❌ Should have failed with missing fields');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Missing fields handled correctly');
        console.log('   Error:', error.response.data.message);
      } else {
        throw error;
      }
    }

    // Test 10: Error Handling - User Not Belonging to Form
    console.log('\n⚠️  Test 10: Error Handling - User Not Belonging to Form');
    console.log('-'.repeat(60));
    try {
      await axios.post(`${API_BASE}/scan`, {
        userId: createdUserId,
        formId: 'different-form-id'
      });
      console.log('❌ Should have failed with wrong form ID');
    } catch (error) {
      if (error.response?.status === 400 || error.response?.status === 404) {
        console.log('✅ Form mismatch handled correctly');
        console.log('   Error:', error.response.data.message);
      } else {
        throw error;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests completed successfully!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
    process.exit(1);
  }
}

// Run tests
console.log('⏳ Waiting for backend to be ready...\n');
setTimeout(() => {
  runTests().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}, 2000);
