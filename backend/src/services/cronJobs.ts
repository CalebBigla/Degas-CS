import { getDatabase } from '../config/database';
import logger from '../config/logger';

/**
 * DEPRECATED: Cron jobs removed - use manual reset button instead
 * Auto-reset via cron was removed to simplify deployment and reduce dependencies.
 * Superadmin can manually reset all attendance status via the API endpoint.
 */

/**
 * Reset all expired 'present' records to 'absent'
 * DEPRECATED: Called only via manual API endpoint
 * This is no longer automatic - admins trigger via dashboard button
 */
export async function resetExpiredAttendance() {
  try {
    const db = getDatabase();
    const dbType = process.env.DATABASE_TYPE || 'sqlite';

    logger.info('🔄 [MANUAL RESET] Starting attendance reset...');

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

    const affectedRows = (result as any)?.rowCount || (result as any)?.changes || 0;
    if (affectedRows > 0) {
      logger.info(`✅ [MANUAL RESET] Reset ${affectedRows} attendees from 'present' to 'absent'`);
    } else {
      logger.info('ℹ️ [MANUAL RESET] No present records to reset');
    }

    return affectedRows;
  } catch (error: any) {
    // Graceful fallback if access_log table doesn't exist yet
    if (error.message?.includes('access_log') || error.message?.includes('does not exist')) {
      logger.warn('⚠️  [MANUAL RESET] access_log table does not exist yet - skipping reset', {
        reason: error.message
      });
      return 0;
    }
    logger.error('❌ [MANUAL RESET] Reset operation failed:', error);
    throw error;
  }
}
