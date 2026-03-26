/**
 * Test script for Phase 6-8: Attendance System
 * Tests session management, QR generation, and attendance scanning
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

// Test credentials
const ADMIN_EMAIL = 'admin@degas.com';
const ADMIN_PASSWORD = 'admin123';

let adminToken = '';
let coreUserToken = '';
let sessionId = '';
let sessionQRToken = '';
let testUserId = '';
let testUserEmail = '';
let formId = '';

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

async function createTestUser() {
  console.log('\n👤 Creating test user for attendance...');
  
  // First create a form
  const formData = {
    form_name: 'Test Attendance Form',
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
    testUserEmail = `attendance.test.${timestamp}@example.com`;
    
    const registrationData = {
      email: testUserEmail,
      password: 'TestPass123!',
      fullName: 'Attendance Test User'
    };

    const response = await axios.post(`${BASE_URL}/onboarding/register`, registrationData);
    testUserId = response.data.data.coreUserId;
    
    console.log('✅ Test user created');
    console.log('   Email:', testUserEmail);
    console.log('   User ID:', testUserId);
    return true;
  } catch (error) {
    console.error('❌ Test user creation failed:', error.response?.data || error.message);
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

async function createSession() {
  console.log('\n📅 Creating attendance session...');
  
  const now = new Date();
  const startTime = new Date(now.getTime() - 10 * 60 * 1000); // 10 minutes ago
  const endTime = new Date(now.getTime() + 50 * 60 * 1000); // 50 minutes from now
  
  const sessionData = {
    session_name: 'Test Attendance Session',
    description: 'Testing attendance system',
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    grace_period_minutes: 15,
    is_active: true
  };

  try {
    const response = await axios.post(`${BASE_URL}/admin/sessions`, sessionData, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    sessionId = response.data.data.id;
    console.log('✅ Session created');
    console.log('   Session ID:', sessionId);
    console.log('   Session Name:', response.data.data.session_name);
    console.log('   Start Time:', response.data.data.start_time);
    console.log('   End Time:', response.data.data.end_time);
    console.log('   Grace Period:', response.data.data.grace_period_minutes, 'minutes');
    return true;
  } catch (error) {
    console.error('❌ Session creation failed:', error.response?.data || error.message);
    return false;
  }
}

async function getAllSessions() {
  console.log('\n📋 Getting all sessions...');
  
  try {
    const response = await axios.get(`${BASE_URL}/admin/sessions`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    console.log('✅ Sessions retrieved');
    console.log('   Total Sessions:', response.data.data.length);
    response.data.data.slice(0, 3).forEach((session, index) => {
      console.log(`   ${index + 1}. ${session.session_name} (${session.is_active ? 'Active' : 'Inactive'})`);
    });
    return true;
  } catch (error) {
    console.error('❌ Failed to get sessions:', error.response?.data || error.message);
    return false;
  }
}

async function updateSession() {
  console.log('\n✏️  Updating session...');
  
  const updates = {
    description: 'Updated test session description',
    grace_period_minutes: 20
  };

  try {
    const response = await axios.put(`${BASE_URL}/admin/sessions/${sessionId}`, updates, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    console.log('✅ Session updated');
    console.log('   Description:', response.data.data.description);
    console.log('   Grace Period:', response.data.data.grace_period_minutes, 'minutes');
    return true;
  } catch (error) {
    console.error('❌ Session update failed:', error.response?.data || error.message);
    return false;
  }
}

async function generateSessionQR() {
  console.log('\n🎫 Generating session QR code...');
  
  try {
    const response = await axios.get(`${BASE_URL}/admin/sessions/${sessionId}/qr`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    sessionQRToken = response.data.data.qrToken;
    
    console.log('✅ Session QR generated');
    console.log('   QR Token:', sessionQRToken.substring(0, 50) + '...');
    console.log('   QR Image:', response.data.data.qrImage ? 'Generated' : 'Missing');
    return true;
  } catch (error) {
    console.error('❌ QR generation failed:', error.response?.data || error.message);
    return false;
  }
}

async function scanQRCheckIn() {
  console.log('\n📱 Scanning QR code to check in...');
  
  try {
    const response = await axios.post(
      `${BASE_URL}/attendance/scan`,
      { qrToken: sessionQRToken },
      { headers: { Authorization: `Bearer ${coreUserToken}` } }
    );
    
    console.log('✅ Check-in successful');
    console.log('   Session:', response.data.data.sessionName);
    console.log('   Checked in at:', response.data.data.record.checked_in_at);
    return true;
  } catch (error) {
    console.error('❌ Check-in failed:', error.response?.data || error.message);
    return false;
  }
}

async function testDuplicateCheckIn() {
  console.log('\n🔄 Testing duplicate check-in prevention...');
  
  try {
    await axios.post(
      `${BASE_URL}/attendance/scan`,
      { qrToken: sessionQRToken },
      { headers: { Authorization: `Bearer ${coreUserToken}` } }
    );
    
    console.log('❌ Duplicate check-in was not prevented (this is bad!)');
    return false;
  } catch (error) {
    if (error.response?.status === 409) {
      console.log('✅ Duplicate check-in correctly prevented');
      console.log('   Error message:', error.response.data.message);
      return true;
    } else {
      console.error('❌ Unexpected error:', error.response?.data || error.message);
      return false;
    }
  }
}

async function getSessionAttendance() {
  console.log('\n📊 Getting session attendance...');
  
  try {
    const response = await axios.get(`${BASE_URL}/admin/sessions/${sessionId}/attendance`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    console.log('✅ Attendance retrieved');
    console.log('   Total Users:', response.data.data.stats.totalUsers);
    console.log('   Attended:', response.data.data.stats.attended);
    console.log('   Absent:', response.data.data.stats.absent);
    console.log('   Attendance Rate:', response.data.data.stats.attendanceRate + '%');
    console.log('   Attendees:', response.data.data.attendance.length);
    return true;
  } catch (error) {
    console.error('❌ Failed to get attendance:', error.response?.data || error.message);
    return false;
  }
}

async function getSessionAbsentees() {
  console.log('\n👥 Getting session absentees...');
  
  try {
    const response = await axios.get(`${BASE_URL}/admin/sessions/${sessionId}/absentees`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    console.log('✅ Absentees retrieved');
    console.log('   Total Absentees:', response.data.data.length);
    if (response.data.data.length > 0) {
      console.log('   Sample absentees:', response.data.data.slice(0, 3).map(a => a.email).join(', '));
    }
    return true;
  } catch (error) {
    console.error('❌ Failed to get absentees:', error.response?.data || error.message);
    return false;
  }
}

async function getUserAttendanceHistory() {
  console.log('\n📜 Getting user attendance history...');
  
  try {
    const response = await axios.get(`${BASE_URL}/attendance/history`, {
      headers: { Authorization: `Bearer ${coreUserToken}` }
    });
    
    console.log('✅ Attendance history retrieved');
    console.log('   Total Sessions Attended:', response.data.data.length);
    if (response.data.data.length > 0) {
      const latest = response.data.data[0];
      console.log('   Latest Session:', latest.session_name);
      console.log('   Checked in at:', latest.checked_in_at);
    }
    return true;
  } catch (error) {
    console.error('❌ Failed to get attendance history:', error.response?.data || error.message);
    return false;
  }
}

async function testInactiveSession() {
  console.log('\n🚫 Testing inactive session check-in prevention...');
  
  try {
    // Deactivate session
    await axios.post(
      `${BASE_URL}/admin/sessions/${sessionId}/activate`,
      { isActive: false },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    
    // Try to check in
    await axios.post(
      `${BASE_URL}/attendance/scan`,
      { qrToken: sessionQRToken },
      { headers: { Authorization: `Bearer ${coreUserToken}` } }
    );
    
    console.log('❌ Inactive session check-in was not prevented (this is bad!)');
    
    // Reactivate for cleanup
    await axios.post(
      `${BASE_URL}/admin/sessions/${sessionId}/activate`,
      { isActive: true },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    
    return false;
  } catch (error) {
    if (error.response?.status === 400 && error.response.data.message.includes('not active')) {
      console.log('✅ Inactive session check-in correctly prevented');
      
      // Reactivate for cleanup
      await axios.post(
        `${BASE_URL}/admin/sessions/${sessionId}/activate`,
        { isActive: true },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      
      return true;
    } else {
      console.error('❌ Unexpected error:', error.response?.data || error.message);
      return false;
    }
  }
}

async function testExpiredQR() {
  console.log('\n⏰ Testing expired QR code...');
  
  try {
    // Create a session that has already ended
    const now = new Date();
    const pastStart = new Date(now.getTime() - 120 * 60 * 1000); // 2 hours ago
    const pastEnd = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
    
    const expiredSessionData = {
      session_name: 'Expired Test Session',
      description: 'Testing expired session',
      start_time: pastStart.toISOString(),
      end_time: pastEnd.toISOString(),
      grace_period_minutes: 5,
      is_active: true
    };

    const sessionResponse = await axios.post(`${BASE_URL}/admin/sessions`, expiredSessionData, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    const expiredSessionId = sessionResponse.data.data.id;
    
    // Generate QR for expired session
    const qrResponse = await axios.get(`${BASE_URL}/admin/sessions/${expiredSessionId}/qr`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    const expiredQRToken = qrResponse.data.data.qrToken;
    
    // Try to check in with expired QR
    await axios.post(
      `${BASE_URL}/attendance/scan`,
      { qrToken: expiredQRToken },
      { headers: { Authorization: `Bearer ${coreUserToken}` } }
    );
    
    console.log('❌ Expired QR was not rejected (this is bad!)');
    
    // Cleanup
    await axios.delete(`${BASE_URL}/admin/sessions/${expiredSessionId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    return false;
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ Expired QR correctly rejected');
      console.log('   Error message:', error.response.data.message);
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
  console.log('🚀 Starting Phase 6-8 Tests: Attendance System');
  console.log('==============================================');
  
  const results = {
    loginAdmin: false,
    createTestUser: false,
    loginTestUser: false,
    createSession: false,
    getAllSessions: false,
    updateSession: false,
    generateSessionQR: false,
    scanQRCheckIn: false,
    testDuplicateCheckIn: false,
    getSessionAttendance: false,
    getSessionAbsentees: false,
    getUserAttendanceHistory: false,
    testInactiveSession: false,
    testExpiredQR: false,
    cleanup: false
  };

  // Run tests in sequence
  results.loginAdmin = await loginAdmin();
  if (!results.loginAdmin) {
    console.log('\n❌ Cannot proceed without admin authentication');
    return;
  }

  results.createTestUser = await createTestUser();
  results.loginTestUser = await loginTestUser();
  results.createSession = await createSession();
  results.getAllSessions = await getAllSessions();
  results.updateSession = await updateSession();
  results.generateSessionQR = await generateSessionQR();
  results.scanQRCheckIn = await scanQRCheckIn();
  results.testDuplicateCheckIn = await testDuplicateCheckIn();
  results.getSessionAttendance = await getSessionAttendance();
  results.getSessionAbsentees = await getSessionAbsentees();
  results.getUserAttendanceHistory = await getUserAttendanceHistory();
  results.testInactiveSession = await testInactiveSession();
  results.testExpiredQR = await testExpiredQR();
  results.cleanup = await cleanup();

  // Summary
  console.log('\n==============================================');
  console.log('📊 Test Results Summary:');
  console.log('==============================================');
  
  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;
  
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}`);
  });
  
  console.log(`\n${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('\n🎉 Phase 6-8 Complete! All tests passed.');
    console.log('\n✨ Key Features Verified:');
    console.log('   • Session creation and management');
    console.log('   • Session QR code generation');
    console.log('   • QR code signing and expiration');
    console.log('   • User check-in via QR scan');
    console.log('   • Duplicate check-in prevention');
    console.log('   • Time window validation');
    console.log('   • Inactive session prevention');
    console.log('   • Expired QR rejection');
    console.log('   • Attendance tracking');
    console.log('   • Absentee reporting');
    console.log('   • User attendance history');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the errors above.');
  }
}

// Run the tests
runTests().catch(error => {
  console.error('💥 Test suite crashed:', error);
  process.exit(1);
});
