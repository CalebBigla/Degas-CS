/**
 * Reset Analytics Script
 * 
 * This script clears all analytics data from the database:
 * - access_logs (legacy table)
 * - access_log (Layer 1: live presence tracking)
 * - analytics_log (Layer 2: permanent historical record)
 * 
 * WARNING: This action is irreversible!
 */

require('dotenv').config();
const { getDatabase } = require('./dist/config/database');

async function resetAnalytics() {
  try {
    console.log('🔄 Starting analytics reset...\n');
    
    const db = getDatabase();
    const dbType = process.env.DATABASE_TYPE || 'sqlite';
    
    console.log(`📊 Database Type: ${dbType}`);
    console.log(`📍 Database: ${process.env.DATABASE_URL ? 'PostgreSQL (Neon)' : 'SQLite (local)'}\n`);

    // Count records before deletion
    console.log('📊 Current record counts:');
    
    const accessLogsCount = await db.get('SELECT COUNT(*) as count FROM access_logs');
    console.log(`   - access_logs: ${accessLogsCount?.count || 0} records`);
    
    const accessLogCount = await db.get('SELECT COUNT(*) as count FROM access_log');
    console.log(`   - access_log (Layer 1): ${accessLogCount?.count || 0} records`);
    
    const analyticsLogCount = await db.get('SELECT COUNT(*) as count FROM analytics_log');
    console.log(`   - analytics_log (Layer 2): ${analyticsLogCount?.count || 0} records\n`);

    // Confirm deletion
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const answer = await new Promise((resolve) => {
      readline.question('⚠️  Are you sure you want to DELETE ALL analytics data? (yes/no): ', resolve);
    });
    readline.close();

    if (answer.toLowerCase() !== 'yes') {
      console.log('\n❌ Analytics reset cancelled.');
      process.exit(0);
    }

    console.log('\n🗑️  Deleting analytics data...\n');

    // Delete from all analytics tables
    const result1 = await db.run('DELETE FROM access_logs');
    console.log(`✅ Cleared access_logs: ${result1?.changes || result1?.rowCount || 0} records deleted`);

    const result2 = await db.run('DELETE FROM access_log');
    console.log(`✅ Cleared access_log (Layer 1): ${result2?.changes || result2?.rowCount || 0} records deleted`);

    const result3 = await db.run('DELETE FROM analytics_log');
    console.log(`✅ Cleared analytics_log (Layer 2): ${result3?.changes || result3?.rowCount || 0} records deleted`);

    // Verify deletion
    console.log('\n📊 Verifying deletion:');
    
    const afterAccessLogs = await db.get('SELECT COUNT(*) as count FROM access_logs');
    console.log(`   - access_logs: ${afterAccessLogs?.count || 0} records remaining`);
    
    const afterAccessLog = await db.get('SELECT COUNT(*) as count FROM access_log');
    console.log(`   - access_log: ${afterAccessLog?.count || 0} records remaining`);
    
    const afterAnalyticsLog = await db.get('SELECT COUNT(*) as count FROM analytics_log');
    console.log(`   - analytics_log: ${afterAnalyticsLog?.count || 0} records remaining`);

    console.log('\n✅ Analytics reset complete!\n');
    console.log('📝 Note: User attendance status (users.scanned) was NOT reset.');
    console.log('   Use the "Reset All" button in the Attendance Report page to reset user attendance.\n');

    process.exit(0);

  } catch (error) {
    console.error('❌ Error resetting analytics:', error);
    process.exit(1);
  }
}

resetAnalytics();
