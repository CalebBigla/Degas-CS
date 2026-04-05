#!/usr/bin/env node

/**
 * PostgreSQL Migration - Step 10 Validation Script
 * End-to-End Endpoint Testing
 * 
 * Usage:
 *   npm run migrate:validate
 *   npm run migrate:validate -- --baseUrl=http://localhost:3001
 *   npm run migrate:validate -- --token=your_jwt_token
 */

const http = require('http');
const https = require('https');
const url = require('url');

// Configuration
const args = process.argv.slice(2);
const baseUrlArg = args.find(arg => arg.startsWith('--baseUrl='));
const tokenArg = args.find(arg => arg.startsWith('--token='));

const API_BASE_URL = baseUrlArg ? baseUrlArg.split('=')[1] : (process.env.API_URL || 'http://localhost:3001');
const AUTH_TOKEN = tokenArg ? tokenArg.split('=')[1] : (process.env.AUTH_TOKEN || '');

console.log('\n🧪 PostgreSQL Migration Validation - Testing All Endpoints\n');
console.log(`📍 Base URL: ${API_BASE_URL}`);
console.log(`🔐 Token: ${AUTH_TOKEN ? '***' + AUTH_TOKEN.slice(-10) : 'Not provided (will test public endpoints only)'}\n`);

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

/**
 * Helper function to make HTTP requests
 */
async function makeRequest(path, method = 'GET', requiresAuth = false) {
  return new Promise((resolve, reject) => {
    const fullUrl = new URL(path, API_BASE_URL);
    const options = {
      hostname: fullUrl.hostname,
      port: fullUrl.port || (fullUrl.protocol === 'https:' ? 443 : 80),
      path: fullUrl.pathname + fullUrl.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    // Add auth token if required and provided
    if (requiresAuth && AUTH_TOKEN) {
      options.headers['Authorization'] = `Bearer ${AUTH_TOKEN}`;
    }

    const client = fullUrl.protocol === 'https:' ? https : http;
    
    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data ? JSON.parse(data) : null,
            rawBody: data
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: null,
            rawBody: data,
            parseError: e.message
          });
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(5000); // 5 second timeout
    req.end();
  });
}

/**
 * Test result logging
 */
function logTestResult(testName, passed, details = '') {
  results.tests.push({ testName, passed, details });
  if (passed) {
    results.passed++;
    console.log(`✅ ${testName}`);
  } else {
    results.failed++;
    console.log(`❌ ${testName}${details ? ': ' + details : ''}`);
  }
}

/**
 * Run all validation tests
 */
async function runMigrationValidation() {
  console.log('Running validation tests...\n');

  try {
    // ====================================================================
    // Test 1: Health Check (No auth required)
    // ====================================================================
    console.log('📋 Test 1: Health Check Endpoint');
    console.log('─────────────────────────────────');
    try {
      const healthRes = await makeRequest('/api/health');
      const passed = healthRes.statusCode === 200 && healthRes.body?.success !== false;
      logTestResult('GET /api/health', passed, 
        `Status: ${healthRes.statusCode}, Ready: ${healthRes.body?.ready}`);
    } catch (error: any) {
      logTestResult('GET /api/health', false, error.message);
    }
    console.log('');

    // ====================================================================
    // Test 2: Diagnostic Endpoint (No auth required)
    // ====================================================================
    console.log('📋 Test 2: Diagnostic Endpoint');
    console.log('──────────────────────────────');
    try {
      const diagRes = await makeRequest('/api/diagnostic');
      const passed = diagRes.statusCode === 200 && diagRes.body?.database;
      const dbType = diagRes.body?.database?.type || 'unknown';
      logTestResult('GET /api/diagnostic', passed, 
        `Status: ${diagRes.statusCode}, DB Type: ${dbType}`);
      
      if (dbType === 'postgresql') {
        console.log(`   ℹ️  PostgreSQL Diagnostics Available:`);
        if (diagRes.body?.postgresqlDiagnostics) {
          console.log(`   • information_schema accessible: ${diagRes.body.postgresqlDiagnostics.informationSchemaAccessible}`);
          if (diagRes.body.postgresqlDiagnostics.discoveredTables) {
            console.log(`   • Discovered tables: ${diagRes.body.postgresqlDiagnostics.discoveredTables.length}`);
          }
        }
      }
    } catch (error: any) {
      logTestResult('GET /api/diagnostic', false, error.message);
    }
    console.log('');

    // ====================================================================
    // Test 3: Forms/Tables Endpoint (Requires auth)
    // ====================================================================
    console.log('📋 Test 3: Forms/Tables List Endpoint');
    console.log('────────────────────────────────────');
    try {
      const formsRes = await makeRequest('/api/admin/forms-tables', 'GET', true);
      const isAuth = formsRes.statusCode === 401;
      const isSuccess = formsRes.statusCode === 200 && Array.isArray(formsRes.body?.data);
      
      if (isAuth && !AUTH_TOKEN) {
        logTestResult('GET /api/admin/forms-tables', true, 
          'Auth required (expected - no token provided)');
      } else if (isSuccess) {
        const formCount = formsRes.body?.data?.length || 0;
        logTestResult('GET /api/admin/forms-tables', true, 
          `Status: ${formsRes.statusCode}, Found: ${formCount} forms/tables`);
      } else {
        logTestResult('GET /api/admin/forms-tables', false, 
          `Status: ${formsRes.statusCode}, Error: ${formsRes.body?.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      logTestResult('GET /api/admin/forms-tables', false, error.message);
    }
    console.log('');

    // ====================================================================
    // Test 4: Tables List Endpoint (Requires auth)
    // ====================================================================
    console.log('📋 Test 4: Tables List Endpoint');
    console.log('───────────────────────────────');
    try {
      const tablesRes = await makeRequest('/api/tables', 'GET', true);
      const isAuth = tablesRes.statusCode === 401;
      const isSuccess = tablesRes.statusCode === 200 && Array.isArray(tablesRes.body?.data);
      
      if (isAuth && !AUTH_TOKEN) {
        logTestResult('GET /api/tables', true, 
          'Auth required (expected - no token provided)');
      } else if (isSuccess) {
        const tableCount = tablesRes.body?.data?.length || 0;
        logTestResult('GET /api/tables', true, 
          `Status: ${tablesRes.statusCode}, Found: ${tableCount} tables`);
      } else {
        logTestResult('GET /api/tables', false, 
          `Status: ${tablesRes.statusCode}`);
      }
    } catch (error: any) {
      logTestResult('GET /api/tables', false, error.message);
    }
    console.log('');

    // ====================================================================
    // Test 5: Analytics Dashboard Endpoint (Requires auth)
    // ====================================================================
    console.log('📋 Test 5: Analytics Dashboard Endpoint');
    console.log('──────────────────────────────────────');
    try {
      const analyticsRes = await makeRequest('/api/analytics/dashboard', 'GET', true);
      const isAuth = analyticsRes.statusCode === 401;
      const isSuccess = analyticsRes.statusCode === 200 && analyticsRes.body?.data;
      
      if (isAuth && !AUTH_TOKEN) {
        logTestResult('GET /api/analytics/dashboard', true, 
          'Auth required (expected - no token provided)');
      } else if (isSuccess) {
        logTestResult('GET /api/analytics/dashboard', true, 
          `Status: ${analyticsRes.statusCode}, Data returned`);
      } else {
        logTestResult('GET /api/analytics/dashboard', false, 
          `Status: ${analyticsRes.statusCode}`);
      }
    } catch (error: any) {
      logTestResult('GET /api/analytics/dashboard', false, error.message);
    }
    console.log('');

    // ====================================================================
    // SUMMARY
    // ====================================================================
    console.log('═'.repeat(60));
    console.log('📊 VALIDATION SUMMARY');
    console.log('═'.repeat(60));
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📈 Total:  ${results.passed + results.failed}\n`);

    if (results.failed === 0) {
      console.log('🎉 All tests passed! System is migration-ready.');
      console.log('\n📋 Next Steps:');
      console.log('1. Set DATABASE_TYPE=postgresql environment variable');
      console.log('2. Set DATABASE_URL to your PostgreSQL connection string');
      console.log('3. Deploy changes');
      console.log('4. Monitor logs for any migration issues\n');
      process.exit(0);
    } else {
      console.log('⚠️  Some tests failed. Check the details above.');
      console.log('\n🔧 Troubleshooting:');
      console.log('1. Verify backend is running on ' + API_BASE_URL);
      console.log('2. If auth tests failed, provide token: --token=your_jwt_token');
      console.log('3. Check backend logs for detailed error information');
      console.log('4. Verify database connectivity with /api/diagnostic\n');
      process.exit(1);
    }

  } catch (error: any) {
    console.error('\n💥 Validation Error:', error.message);
    process.exit(1);
  }
}

// Run validation
runMigrationValidation();
