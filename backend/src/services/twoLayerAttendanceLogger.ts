import { getDatabase } from '../config/database';
import logger from '../config/logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * Two-layer attendance logging architecture:
 * 
 * LAYER 1: access_log (Live Presence Tracking)
 * - Resets after 48 hours via cron job
 * - Shows who is currently 'present' vs 'absent'
 * - Used by dashboard and follow-up team for live tracking
 * 
 * LAYER 2: analytics_log (Permanent Historical Record)
 * - Never resets or deletes
 * - Complete history of every scan
 * - Used for analytics, reports, attendance history
 */

export class TwoLayerAttendanceLogger {
  /**
   * LAYER 1 & LAYER 2: Record a successful QR scan
   * Inserts into BOTH tables when a scan succeeds
   * Non-breaking: Gracefully falls back if tables don't exist yet
   */
  static async recordSuccessfulScan(userId: string, scannedByUserId: string): Promise<void> {
    try {
      const db = getDatabase();
      const dbType = process.env.DATABASE_TYPE || 'sqlite';
      
      // Don't log if database type is sqlite in production context
      // (SQLite is for local development only)
      if (dbType !== 'sqlite') {
        const now = new Date();
        const v4Id = uuidv4();

        logger.info('📝 [TWO-LAYER LOGGING] Recording scan to both access_log and analytics_log', {
          userId,
          scannedBy: scannedByUserId
        });

        try {
          // LAYER 1: Insert into access_log (live presence)
          // Status is 'present', expires after 48 hours
          const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);

          await db.run(
            `INSERT INTO access_log (id, user_id, scanned_at, scanned_by, status, expires_at)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [v4Id, userId, now, scannedByUserId, 'present', expiresAt]
          );
          logger.info('✅ [LAYER 1] Recorded to access_log', { userId });
        } catch (layer1Error: any) {
          // LAYER 1: Graceful fallback - table might not exist yet
          if (layer1Error.message?.includes('access_log') || 
              layer1Error.message?.includes('does not exist')) {
            logger.warn('⚠️  [LAYER 1] access_log table not found - skipping live presence logging', {
              reason: layer1Error.message
            });
          } else {
            throw layer1Error; // Re-throw if it's a different error
          }
        }

        try {
          // LAYER 2: Insert into analytics_log (permanent record)
          // Never deleted - permanent history
          const serviceDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
          const analyticsId = uuidv4();

          await db.run(
            `INSERT INTO analytics_log (id, user_id, scanned_at, scanned_by, service_date)
             VALUES ($1, $2, $3, $4, $5)`,
            [analyticsId, userId, now, scannedByUserId, serviceDate]
          );
          logger.info('✅ [LAYER 2] Recorded to analytics_log', { userId });
        } catch (layer2Error: any) {
          // LAYER 2: Graceful fallback - table might not exist yet
          if (layer2Error.message?.includes('analytics_log') || 
              layer2Error.message?.includes('does not exist')) {
            logger.warn('⚠️  [LAYER 2] analytics_log table not found - skipping historical logging', {
              reason: layer2Error.message
            });
          } else {
            throw layer2Error; // Re-throw if it's a different error
          }
        }
      } else {
        // SQLite mode - log to console for debugging
        logger.info('📝 [TWO-LAYER LOGGING] SQLite mode - attendance logging available after migration to PostgreSQL', {
          userId,
          scannedBy: scannedByUserId
        });
      }
    } catch (error) {
      logger.error('❌ [TWO-LAYER LOGGING] Failed to record scan:', error);
      // Non-critical - don't throw, just log the error
      // Scan was successful, logging failure shouldn't block the response
    }
  }

  /**
   * Get all currently absent members (for CSV export)
   * Pulls from access_log where status = 'absent'
   */
  static async getAbsentMembers(): Promise<any[]> {
    try {
      const db = getDatabase();
      const dbType = process.env.DATABASE_TYPE || 'sqlite';

      logger.info('📋 Fetching absent members from access_log');

      let query: string;
      if (dbType === 'sqlite') {
        query = `
          SELECT DISTINCT
            cu.id,
            cu.email,
            cu.phone_number as phone,
            al.scanned_at as last_scanned_date
          FROM access_log al
          JOIN core_users cu ON al.user_id = cu.id
          WHERE al.status = 'absent'
          AND al.expires_at >= datetime('now')
          ORDER BY al.scanned_at DESC
        `;
      } else {
        // PostgreSQL
        query = `
          SELECT DISTINCT
            cu.id,
            cu.email,
            cu.phone_number as phone,
            al.scanned_at as last_scanned_date
          FROM access_log al
          JOIN core_users cu ON al.user_id = cu.id
          WHERE al.status = 'absent'
          AND al.expires_at >= NOW()
          ORDER BY al.scanned_at DESC
        `;
      }

      const absentMembers = await db.all(query);
      logger.info('✅ Retrieved absent members', { count: absentMembers?.length || 0 });
      return absentMembers || [];
    } catch (error) {
      logger.error('❌ Failed to fetch absent members:', error);
      return [];
    }
  }

  /**
   * Get current presence status (for dashboard)
   * Shows who is present vs absent today
   */
  static async getCurrentPresenceStatus(): Promise<{ present: number; absent: number }> {
    try {
      const db = getDatabase();
      const dbType = process.env.DATABASE_TYPE || 'sqlite';

      const presentCount = await db.get(
        `SELECT COUNT(DISTINCT user_id) as count FROM access_log WHERE status = 'present'`
      );

      const absentCount = await db.get(
        `SELECT COUNT(DISTINCT user_id) as count FROM access_log WHERE status = 'absent'`
      );

      return {
        present: presentCount?.count || 0,
        absent: absentCount?.count || 0
      };
    } catch (error) {
      logger.error('❌ Failed to fetch presence status:', error);
      return { present: 0, absent: 0 };
    }
  }

  /**
   * Manual reset: Set all present members to absent
   * Called by superadmin dashboard button
   */
  static async manualResetAllToAbsent(): Promise<number> {
    try {
      const db = getDatabase();

      logger.warn('🔄 [MANUAL RESET] Superadmin resetting all attendance to absent');

      const result = await db.run(
        `UPDATE access_log SET status = 'absent' WHERE status = 'present'`
      ) as any;

      const affectedRows = result?.rowCount || result?.changes || 0;
      logger.warn('✅ [MANUAL RESET] Attendance reset complete', { affectedRows });
      return affectedRows;
    } catch (error) {
      logger.error('❌ Failed to reset attendance:', error);
      throw error;
    }
  }

  /**
   * Get member's complete attendance history
   * Returns all scans from analytics_log (permanent record)
   */
  static async getMemberAttendanceHistory(userId: string): Promise<any[]> {
    try {
      const db = getDatabase();
      const dbType = process.env.DATABASE_TYPE || 'sqlite';

      const query = dbType === 'sqlite'
        ? `SELECT scanned_at, scanned_by, service_date FROM analytics_log WHERE user_id = ? ORDER BY scanned_at DESC LIMIT 100`
        : `SELECT scanned_at, scanned_by, service_date FROM analytics_log WHERE user_id = $1 ORDER BY scanned_at DESC LIMIT 100`;

      const params = dbType === 'sqlite' ? [userId] : [userId];
      const history = await db.all(query, params);

      logger.info('✅ Retrieved member attendance history', { userId, count: history?.length || 0 });
      return history || [];
    } catch (error) {
      logger.error('❌ Failed to fetch attendance history:', error);
      return [];
    }
  }

  /**
   * Get attendance analytics from permanent record
   */
  static async getAttendanceAnalytics(days: number = 30): Promise<any> {
    try {
      const db = getDatabase();
      const dbType = process.env.DATABASE_TYPE || 'sqlite';

      logger.info('📊 Fetching attendance analytics', { days });

      const dateFilter = dbType === 'sqlite'
        ? `AND DATE(al.scanned_at) >= DATE('now', '-${days} days')`
        : `AND DATE(al.scanned_at) >= CURRENT_DATE - INTERVAL '${days} days'`;

      const totalScans = await db.get(
        `SELECT COUNT(*) as count FROM analytics_log WHERE 1=1 ${dateFilter}`
      );

      const uniqueMembers = await db.get(
        `SELECT COUNT(DISTINCT user_id) as count FROM analytics_log WHERE 1=1 ${dateFilter}`
      );

      const scansPerDay = await db.all(
        `SELECT service_date, COUNT(*) as count FROM analytics_log WHERE 1=1 ${dateFilter} GROUP BY service_date ORDER BY service_date DESC`
      );

      return {
        period: `Last ${days} days`,
        totalScans: totalScans?.count || 0,
        uniqueMembers: uniqueMembers?.count || 0,
        scansPerDay: scansPerDay || []
      };
    } catch (error) {
      logger.error('❌ Failed to fetch analytics:', error);
      return { totalScans: 0, uniqueMembers: 0, scansPerDay: [] };
    }
  }
}
