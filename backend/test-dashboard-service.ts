/**
 * Direct test of dashboardService
 */
import dashboardService from './src/services/dashboardService';

async function test() {
  try {
    console.log('🔍 Testing dashboardService.getAttendanceOverview()...\n');
    const result = await dashboardService.getAttendanceOverview();
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
  }
  process.exit(0);
}

test();
