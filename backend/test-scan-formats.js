const axios = require('axios');

const API_URL = 'http://localhost:3001/api';

// Test user from database
const TEST_USER_ID = 'e8f7c6d5-4b3a-2c1d-0e9f-8a7b6c5d4e3f'; // You'll need to get a real userId
const FORM_ID = '06aa4b67-76fe-411a-a1e0-682871e8506f';

console.log('🧪 Testing Scan Endpoint with Different QR Formats\n');

async function testScan(testName, qrData, userId) {
  try {
    console.log(`\n📱 Test: ${testName}`);
    console.log(`   QR Data: ${qrData}`);
    console.log(`   User ID: ${userId || 'Not provided'}`);
    
    const response = await axios.post(`${API_URL}/form/scan`, {
      qrData,
      userId
    });
    
    console.log(`   ✅ Success: ${response.data.message}`);
    console.log(`   User: ${response.data.userName}`);
    console.log(`   Scanned At: ${response.data.scannedAt}`);
    return true;
  } catch (error) {
    console.log(`   ❌ Error: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

async function runTests() {
  // First, get a real user ID from the database
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  const dbPath = path.join(__dirname, 'data', 'degas.db');
  const db = new sqlite3.Database(dbPath);
  
  db.get('SELECT id, name, email, scanned FROM users WHERE formId = ? LIMIT 1', [FORM_ID], async (err, user) => {
    if (err || !user) {
      console.error('❌ Could not find test user:', err);
      db.close();
      return;
    }
    
    console.log(`\n👤 Using test user: ${user.name} (${user.email})`);
    console.log(`   User ID: ${user.id}`);
    console.log(`   Already scanned: ${user.scanned ? 'Yes' : 'No'}`);
    
    if (user.scanned) {
      console.log('\n⚠️  User already scanned. Resetting scan status...');
      db.run('UPDATE users SET scanned = 0, scannedAt = NULL WHERE id = ?', [user.id], async (err) => {
        if (err) {
          console.error('❌ Failed to reset scan status:', err);
          db.close();
          return;
        }
        console.log('✅ Scan status reset\n');
        await performTests(user.id);
        db.close();
      });
    } else {
      await performTests(user.id);
      db.close();
    }
  });
}

async function performTests(userId) {
  console.log('\n' + '='.repeat(60));
  console.log('TESTING DIFFERENT QR CODE FORMATS');
  console.log('='.repeat(60));
  
  // Test 1: JSON format (user QR code)
  const jsonQR = JSON.stringify({ userId, formId: FORM_ID, type: 'user_scan', timestamp: Date.now() });
  await testScan('JSON Format (User QR)', jsonQR, null);
  
  // Reset for next test
  const sqlite3 = require('sqlite3').verbose();
  const path = require('path');
  const dbPath = path.join(__dirname, 'data', 'degas.db');
  const db = new sqlite3.Database(dbPath);
  
  await new Promise(resolve => {
    db.run('UPDATE users SET scanned = 0, scannedAt = NULL WHERE id = ?', [userId], () => {
      db.close();
      resolve();
    });
  });
  
  // Test 2: URL format (form QR code)
  await testScan('URL Format (Form QR)', `https://localhost:5173/scan/${FORM_ID}`, userId);
  
  // Reset for next test
  const db2 = new sqlite3.Database(dbPath);
  await new Promise(resolve => {
    db2.run('UPDATE users SET scanned = 0, scannedAt = NULL WHERE id = ?', [userId], () => {
      db2.close();
      resolve();
    });
  });
  
  // Test 3: UUID only (form QR code)
  await testScan('UUID Only (Form QR)', FORM_ID, userId);
  
  console.log('\n' + '='.repeat(60));
  console.log('TESTS COMPLETE');
  console.log('='.repeat(60));
}

runTests();
