/**
 * Reset Analytics Data
 * Clears analytics_log and access_log tables
 */

require('dotenv').config();
const { getDatabase } = require('./dist/config/database');

async function resetAnalytics() {
  try {
    console.log('🔄 Starting analytics reset...\n');
    
    const db = getDatabase();
    const dbType = process.env.DATABASE_TYPE || 'sqlite';
    
    console.log(`📊 Database type: ${dbType}`);
    
    // Check current counts before deletion
    try {
      const analyticsCount = await db.get('SELECT COUNT(*) as count FROM analytics_log');
      const accessLogCount = await db.get('SELECT COUNT(*) as count FROM access_log');
      
      console.log(`\n📋 Current records:`);
      console.log(`   - analytics_log: ${analyticsCount?.count || 0} records`);
      console.log(`   - access_log: ${accessLogCount?.count || 0} records`);
    } catch (e) {
      console.log('⚠️  Could not count records (tables may not exist yet)');
    }
    
    // Delete from analytics_log (permanent history)
    console.log('\n🗑️  Deleting from analytics_log...');
    try {
      const result1 = await db.run('DELETE FROM analytics_log');
      console.log(`✅ Deleted ${result1?.changes || result1?.rowCount || 0} records from analytics_log`);
    } catch (e) {
      console.log('⚠️  analytics_log table does not exist or is empty');
    }
    
    // Delete from access_log (live presence)
    console.log('\n🗑️  Deleting from access_log...');
    try {
      const result2 = await db.run('DELETE FROM access_log');
      console.log(`✅ Deleted ${result2?.changes || result2?.rowCount || 0} records from access_log`);
    } catch (e) {
      console.log('⚠️  access_log table does not exist or is empty');
    }
    
    // Also reset users.scanned and users.scannedat fields
    console.log('\n🔄 Resetting users.scanned fields...');
    try {
      const result3 = await db.run(
        dbType === 'sqlite'
          ? `UPDATE users SET scanned = 0, scannedat = NULL WHERE scanned = 1`
          : `UPDATE users SET scanned = false, scannedat = NULL WHERE scanned = true`
      );
      console.log(`✅ Reset ${result3?.changes || result3?.rowCount || 0} users to absent status`);
    } catch (e) {
      console.log('⚠️  Could not reset users table:', e.message);
    }
    
    console.log('\n✅ Analytics reset complete!');
    console.log('\n📊 All attendance tracking data has been cleared.');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting analytics:', error);
    process.exit(1);
  }
}

resetAnalytics();
