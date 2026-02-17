const http = require('http');

// Helper function to make HTTP requests
function makeRequest(path, method = 'GET', body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test'
    };

    const options = {
      hostname: 'localhost',
      port: 3001,
      path,
      method,
      headers: { ...defaultHeaders, ...headers }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: data ? JSON.parse(data) : null,
            raw: data
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: null,
            raw: data
          });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Test the new endpoints
async function runTests() {
  console.log('🧪 Testing NEW Scanner Endpoints\n');

  try {
    // Test 1: Get all tables
    console.log('1️⃣ Testing GET /api/scanner/tables...');
    const tablesRes = await makeRequest('/api/scanner/tables');
    console.log(`   Status: ${tablesRes.status}`);
    console.log(`   Response:`, JSON.stringify(tablesRes.data, null, 2));
    console.log();

    // Test 2: Verify QR with table ID (if we have a valid QR code)
    console.log('2️⃣ Testing POST /api/scanner/verify with selectedTableId...');
    const verifyRes = await makeRequest('/api/scanner/verify', 'POST', {
      qrData: 'test-qr-data',
      selectedTableId: 'test-table-id',
      scannerLocation: 'Test Location'
    });
    console.log(`   Status: ${verifyRes.status}`);
    console.log(`   Response:`, JSON.stringify(verifyRes.data, null, 2));
    console.log();

    console.log('✅ Endpoint tests completed!');
  } catch (error) {
    console.error('❌ Error during tests:', error.message);
  }
}

// Run tests
runTests();
