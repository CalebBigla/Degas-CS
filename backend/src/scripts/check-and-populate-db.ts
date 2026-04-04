/**
 * Check and populate database with test data
 */
import { getDatabase } from '../config/database';
import logger from '../config/logger';
import crypto from 'crypto';

async function checkAndPopulateDatabase() {
  try {
    const db = getDatabase();

    // Check core_users
    console.log('\n👥 Checking CORE_USERS...');
    const users = await db.all('SELECT * FROM core_users');
    console.log('Current users count:', users.length);
    console.log('Users:', users);

    if (users.length === 0) {
      console.log('\n➕ Adding test users...');
      
      // Add test user 1
      await db.run(
        `INSERT INTO core_users (id, user_id, email, full_name, phone, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [crypto.randomUUID(), 'user1', 'john@example.com', 'John Doe', '555-0001']
      );
      console.log('✅ Added: john@example.com');

      // Add test user 2
      await db.run(
        `INSERT INTO core_users (id, user_id, email, full_name, phone, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [crypto.randomUUID(), 'user2', 'jane@example.com', 'Jane Smith', '555-0002']
      );
      console.log('✅ Added: jane@example.com');
    }

    // Check attendance_sessions
    console.log('\n📅 Checking ATTENDANCE_SESSIONS...');
    const sessions = await db.all('SELECT COUNT(*) as count FROM attendance_sessions');
    console.log('Sessions count:', sessions[0]?.count);

    // Check attendance_records
    console.log('\n📝 Checking ATTENDANCE_RECORDS...');
    const records = await db.all('SELECT COUNT(*) as count FROM attendance_records');
    console.log('Records count:', records[0]?.count);

    // Final count
    console.log('\n📊 Final verification...');
    const finalUsers = await db.all('SELECT * FROM core_users');
    console.log('Final users count:', finalUsers.length);
    console.log('✅ Database check complete');

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
  }
}

checkAndPopulateDatabase().catch(console.error);
