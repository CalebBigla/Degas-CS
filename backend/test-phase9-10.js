/**
 * Test script for Phase 9-10: User Dashboard & Admin Features
 * Tests dashboard data, core user management, and attendance overview
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

// Test credentials
const ADMIN_EMAIL = 'admin@degas.com';
const ADMIN_PASSWORD = 'admin123';

let adminToken = '';
let coreUserToken = '';
let testUserId = '';
let testUserEmail = '';
let formId = '';
let sessionId = '';

async function loginAdmin() {
  console.log('\n🔐 Logging in as admin...');
  try {
    const response = await axios.post(`${BASE_URL}/core-auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    
    adminToken = response.data.data.token;
    console.log('✅ Admin login successful');
    return true;
  } catch (error) {
    console.error('❌ Admin login failed:', error.response?.data || error.message);
    return false;
  }
}

async function createTestUserAndSession() {
  console.log('\n👤 Creating test user and session...');
  
  // Create form
  const formData = {
    form_name: 'Dashboard Test Form',
    target_table: 'Students',
    description: 'Test form',
    is_active: true,
    fields: [
      {
        field_name: 'email',
        field_label: 'Email',
        field_type: 'email',
        is_required: true,
        is_email_field: true,
        is_password_field: false,
        field_order: 1
      },
      {
        field_name: 'password',
        field_label: 'Password',
        field_type: 'password',
        is_required: true,
        is_email_field: false,
        is_password_field: true,
        field_order: 2,
        validation_rules: JSON.stringify({ minLength: 8 })
      },
      {
        field_name: 'fullName',
        field_label: 'Full Name',
        field_type: 'text',
        is_required: true,
        is_email_field: false,
        is_password_field: false,
        field_order: 3
      }
    ]
  };

  try {
    const formResponse = await axios.post(`${BASE_URL}/admin/forms`, formData, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    formId = formResponse.data.data.id;

    // Register test user
    const timestamp = Date.now();
    testUserEmail = `dashboard.test.${timestamp}@example.com`;
    
    const registrationData = {
      email: testUserEmail,
      password: 'TestPass123!',
      fullName: 'Dashboard Test User'
    };

    const userResponse = await axios.post(`${BASE_URL}/onboarding/register`, registrationData);
    testUserId = userResponse.data.data.coreUserId;

    // Create a session
    const now = new Date();
    const startTime = new Date(now.getTime() - 10 * 60 * 1000);
    const endTime = new Date(now.getTime() + 50 * 60 * 1000);
    
    const sessionData = {
      session_name: 'Dashboard Test Session',
      description: 'Testing dashboard',
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      grace_period_minutes: 15,
      is_active: true
    };

    const sessionResponse = await axios.post(`${BASE_URL}/admin/sessions`, sessionData, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    sessionId = sessionResponse.data.data.id;
    
    console.log('✅ Test user and session created');
    console.log('   User Email:', testUserEmail);
    console.log('   User ID:', testUserId);
    console.log('   Session ID:', sessionId);
    return true;
  } catch (error) {
    console.error('❌ Setup failed:', error.response?.data || error.message);
    return false;
  }
}

async function loginTestUser() {
  console.log('\n🔐 Logging in as test user...');
  try {
    const response = await axios.post(`${BASE_URL}/core-auth/login`, {
      email: testUserEmail,
      password: 'TestPass123!'
    });
    
    coreUserToken = response.data.data.token;
    console.log('✅ Test user login successful');
    return true;
  } catch (error) {
    console.error('❌ Test user login failed:', error.response?.data || error.message);
    return false;
  }
}

async function checkInToSession() {
  console.log('\n📱 Checking in to session...');
  
  try {
    // Generate session QR
    const qrResponse = await axios.get(`${BASE_URL}/admin/sessions/${sessionId}/qr`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    const qrToken = qrResponse.data.data.qrToken;
    
    // Check in
    await axios.post(
      `${BASE_URL}/attendance/scan`,
      { qrToken },
      { headers: { Authorization: `Bearer ${coreUserToken}` } }
    );
    
    console.log('✅ Check-in successful');
    return true;
  } catch (error) {
    console.error('❌ Check-in failed:', error.response?.data || error.message);
    return false;
  }
}

async function testUserDashboard() {
  console.log('\n📊 Testing user dashboard...');
  
  try {
    const response = await axios.get(`${BASE_URL}/user/dashboard`, {
      headers: { Authorization: `Bearer ${coreUserToken}` }
    });
    
    const data = response.data.data;
    
    console.log('✅ User dashboard retrieved');
    console.log('   User Email:', data.user.email);
    console.log('   Full Name:', data.user.full_name);
    console.log('   Profile Table:', data.profile?.table || 'None');
    console.log('   QR Code:', data.qrCode.image ? 'Generated' : 'Missing');
    console.log('   QR Token:', data.qrCode.token ? 'Generated' : 'Missing');
    console.log('   Attendance History:', data.attendance.history.length, 'sessions');
    console.log('   Total Sessions:', data.attendance.stats.totalSessions);
    console.log('   Attended:', data.attendance.stats.attended);
    console.log('   Missed:', data.attendance.stats.missed);
    console.log('   Attendance Rate:', data.attendance.stats.attendanceRate + '%');
    
    // Verify QR code exists
    if (!data.qrCode.image || !data.qrCode.token) {
      console.log('⚠️  Warning: QR code not generated');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ User dashboard failed:', error.response?.data || error.message);
    return false;
  }
}

async function testGetAllCoreUsers() {
  console.log('\n👥 Testing get all core users (admin)...');
  
  try {
    const response = await axios.get(`${BASE_URL}/admin/core-users`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    console.log('✅ Core users retrieved');
    console.log('   Total Users:', response.data.pagination.total);
    console.log('   Users in Response:', response.data.data.length);
    
    if (response.data.data.length > 0) {
      const user = response.data.data[0];
      console.log('   Sample User:');
      console.log('     - Email:', user.email);
      console.log('     - Full Name:', user.full_name);
      console.log('     - Linked Tables:', user.linkedTables?.length || 0);
      console.log('     - Attendance Count:', user.attendanceCount);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Get all core users failed:', error.response?.data || error.message);
    return false;
  }
}

async function testSearchCoreUsers() {
  console.log('\n🔍 Testing search core users...');
  
  try {
    const response = await axios.get(`${BASE_URL}/admin/core-users?search=dashboard`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    console.log('✅ Search completed');
    console.log('   Results Found:', response.data.data.length);
    
    if (response.data.data.length > 0) {
      console.log('   First Result:', response.data.data[0].email);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Search failed:', error.response?.data || error.message);
    return false;
  }
}

async function testPaginationCoreUsers() {
  console.log('\n📄 Testing pagination...');
  
  try {
    const response = await axios.get(`${BASE_URL}/admin/core-users?limit=5&offset=0`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    console.log('✅ Pagination working');
    console.log('   Limit:', response.data.pagination.limit);
    console.log('   Offset:', response.data.pagination.offset);
    console.log('   Total:', response.data.pagination.total);
    console.log('   Returned:', response.data.data.length);
    
    return true;
  } catch (error) {
    console.error('❌ Pagination failed:', error.response?.data || error.message);
    return false;
  }
}

async function testGetCoreUserById() {
  console.log('\n🔍 Testing get core user by ID...');
  
  try {
    const response = await axios.get(`${BASE_URL}/admin/core-users/${testUserId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    console.log('✅ Core user details retrieved');
    console.log('   Email:', response.data.data.email);
    console.log('   Full Name:', response.data.data.full_name);
    console.log('   Linked Data:', response.data.data.linkedData?.length || 0, 'records');
    console.log('   Attendance History:', response.data.data.attendanceHistory?.length || 0, 'sessions');
    console.log('   Attendance Count:', response.data.data.attendanceCount);
    
    return true;
  } catch (error) {
    console.error('❌ Get core user by ID failed:', error.response?.data || error.message);
    return false;
  }
}

async function testAttendanceOverview() {
  console.log('\n📈 Testing attendance overview (admin)...');
  
  try {
    const response = await axios.get(`${BASE_URL}/admin/attendance/overview`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    const data = response.data.data;
    
    console.log('✅ Attendance overview retrieved');
    console.log('   Total Users:', data.totalUsers);
    console.log('   Total Sessions:', data.totalSessions);
    console.log('   Active Sessions:', data.activeSessions);
    console.log('   Total Check-ins:', data.totalCheckIns);
    console.log('   Average Attendance Rate:', data.averageAttendanceRate + '%');
    console.log('   Recent Sessions:', data.recentSessions?.length || 0);
    
    if (data.recentSessions && data.recentSessions.length > 0) {
      const session = data.recentSessions[0];
      console.log('   Latest Session:');
      console.log('     - Name:', session.session_name);
      console.log('     - Attendance:', session.attendance_count);
      console.log('     - Active:', session.is_active ? 'Yes' : 'No');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Attendance overview failed:', error.response?.data || error.message);
    return false;
  }
}

async function testUnauthorizedAccess() {
  console.log('\n🚫 Testing unauthorized access prevention...');
  
  try {
    // Try to access admin endpoint without token
    await axios.get(`${BASE_URL}/admin/core-users`);
    
    console.log('❌ Unauthorized access was not prevented (this is bad!)');
    return false;
  } catch (error) {
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.log('✅ Unauthorized access correctly prevented');
      return true;
    } else {
      console.error('❌ Unexpected error:', error.response?.data || error.message);
      return false;
    }
  }
}

async function testUserCannotAccessAdminEndpoints() {
  console.log('\n🔒 Testing user cannot access admin endpoints...');
  
  try {
    // Try to access admin endpoint with user token
    await axios.get(`${BASE_URL}/admin/core-users`, {
      headers: { Authorization: `Bearer ${coreUserToken}` }
    });
    
    console.log('❌ User access to admin endpoint was not prevented (this is bad!)');
    return false;
  } catch (error) {
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.log('✅ User access to admin endpoint correctly prevented');
      return true;
    } else {
      console.error('❌ Unexpected error:', error.response?.data || error.message);
      return false;
    }
  }
}

async function cleanup() {
  console.log('\n🧹 Cleaning up test data...');
  
  try {
    // Delete session
    if (sessionId) {
      await axios.delete(`${BASE_URL}/admin/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      console.log('✅ Test session deleted');
    }
    
    // Delete form
    if (formId) {
      await axios.delete(`${BASE_URL}/admin/forms/${formId}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      console.log('✅ Test form deleted');
    }
    
    return true;
  } catch (error) {
    console.error('⚠️  Cleanup warning:', error.response?.data || error.message);
    return true; // Don't fail on cleanup errors
  }
}

async function runTests() {
  console.log('🚀 Starting Phase 9-10 Tests: User Dashboard & Admin Features');
  console.log('==============================================================');
  
  const results = {
    loginAdmin: false,
    createTestUserAndSession: false,
    loginTestUser: false,
    checkInToSession: false,
    testUserDashboard: false,
    testGetAllCoreUsers: false,
    testSearchCoreUsers: false,
    testPaginationCoreUsers: false,
    testGetCoreUserById: false,
    testAttendanceOverview: false,
    testUnauthorizedAccess: false,
    testUserCannotAccessAdminEndpoints: false,
    cleanup: false
  };

  // Run tests in sequence
  results.loginAdmin = await loginAdmin();
  if (!results.loginAdmin) {
    console.log('\n❌ Cannot proceed without admin authentication');
    return;
  }

  results.createTestUserAndSession = await createTestUserAndSession();
  results.loginTestUser = await loginTestUser();
  results.checkInToSession = await checkInToSession();
  results.testUserDashboard = await testUserDashboard();
  results.testGetAllCoreUsers = await testGetAllCoreUsers();
  results.testSearchCoreUsers = await testSearchCoreUsers();
  results.testPaginationCoreUsers = await testPaginationCoreUsers();
  results.testGetCoreUserById = await testGetCoreUserById();
  results.testAttendanceOverview = await testAttendanceOverview();
  results.testUnauthorizedAccess = await testUnauthorizedAccess();
  results.testUserCannotAccessAdminEndpoints = await testUserCannotAccessAdminEndpoints();
  results.cleanup = await cleanup();

  // Summary
  console.log('\n==============================================================');
  console.log('📊 Test Results Summary:');
  console.log('==============================================================');
  
  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;
  
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}`);
  });
  
  console.log(`\n${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('\n🎉 Phase 9-10 Complete! All tests passed.');
    console.log('\n✨ Key Features Verified:');
    console.log('   • User dashboard with profile data');
    console.log('   • User QR code generation');
    console.log('   • User attendance history');
    console.log('   • User attendance statistics');
    console.log('   • Admin core users listing');
    console.log('   • Core user search');
    console.log('   • Pagination support');
    console.log('   • Core user details');
    console.log('   • Attendance overview');
    console.log('   • Authorization checks');
    console.log('   • Role-based access control');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.');
  }
}

// Run the tests
runTests().catch(error => {
  console.error('💥 Test suite crashed:', error);
  process.exit(1);
});
