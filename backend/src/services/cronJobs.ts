import cron from 'node-cron';
import { getDatabase } from '../config/database';
import logger from '../config/logger';

/**
 * Cron jobs for attendance system
 * Handles 48-hour auto-reset of presence status
 */

export async function initAttendanceAutoCrons() {
  try {
    logger.info('⏰ [CRON INIT] Scheduling attendance auto-reset jobs...');

    // Run every hour: Reset expired 'present' records to 'absent'
    // Cron format: minute, hour, day of month, month, day of week
    // '0 * * * *' = every hour at the 0-minute mark
    const cronJob = cron.schedule('0 * * * *', async () => {
      await resetExpiredAttendance();
    });

    cronJob.start();
    logger.info('✅ [CRON] Hourly attendance reset job scheduled');

    // Also run on startup to catch any expired records immediately
    logger.info('⏰ [CRON] Running initial attendance reset...');
    await resetExpiredAttendance();

  } catch (error) {
    logger.error('❌ [CRON INIT] Failed to initialize cron jobs:', error);
    throw error;
  }
}

/**
 * Reset all expired 'present' records to 'absent'
 * Called by cron job and on startup
 */
async function resetExpiredAttendance() {
  try {
    const db = getDatabase();
    const dbType = process.env.DATABASE_TYPE || 'sqlite';

    logger.info('⏰ [CRON RUN] Starting attendance expiration reset...');

    let result;
    if (dbType === 'sqlite') {
      // SQLite: Use datetime comparison
      result = await db.run(
        `UPDATE access_log 
         SET status = 'absent' 
         WHERE status = 'present' 
         AND expires_at < datetime('now')`
      );
    } else {
      // PostgreSQL: Use timestamp comparison
      result = await db.run(
        `UPDATE access_log 
         SET status = 'absent'
         WHERE status = 'present' 
         AND expires_at < NOW()`
      );
    }

    const affectedRows = result?.changes || result?.rowCount || 0;
    if (affectedRows > 0) {
      logger.info(`✅ [CRON RUN] Expired ${affectedRows} attendees from 'present' to 'absent'`);
    } else {
      logger.debug('⏰ [CRON RUN] No expired records to reset');
    }

    return affectedRows;
  } catch (error: any) {
    // Graceful fallback if access_log table doesn't exist yet
    if (error.message?.includes('access_log') || error.message?.includes('does not exist')) {
      logger.warn('⚠️  [CRON RUN] access_log table does not exist yet - skipping reset', {
        reason: error.message
      });
      return 0;
    }
    logger.error('❌ [CRON RUN] Attendance reset job failed:', error);
    // Don't throw - let cron continue running
  }
}
