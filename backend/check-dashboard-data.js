/**
 * Check dashboard data in database
 */
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'degas.db');
console.log('📊 Checking database:', dbPath);

try {
  const db = new Database(dbPath);
  
  // Check core_users
  console.log('\n👥 CORE_USERS:');
  const users = db.prepare('SELECT COUNT(*) as count FROM core_users').get();
  console.log('Total count:', users.count);
  
  const userDetails = db.prepare('SELECT * FROM core_users').all();
  console.log('Users:', userDetails);
  
  // Check attendance_sessions
  console.log('\n📅 ATTENDANCE_SESSIONS:');
  const sessions = db.prepare('SELECT COUNT(*) as count FROM attendance_sessions').get();
  console.log('Total count:', sessions.count);
  
  // Check attendance_records
  console.log('\n📝 ATTENDANCE_RECORDS:');
  const records = db.prepare('SELECT COUNT(*) as count FROM attendance_records').get();
  console.log('Total count:', records.count);
  
  // Check access_logs
  console.log('\n🔐 ACCESS_LOGS:');
  const logs = db.prepare('SELECT COUNT(*) as count FROM access_logs').get();
  console.log('Total count:', logs.count);
  
  db.close();
  console.log('\n✅ Done');
} catch (error) {
  console.error('❌ Error:', error.message);
}
