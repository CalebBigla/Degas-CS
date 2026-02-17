import { getDatabase } from '../config/database';
import logger from '../config/logger';

export interface DashboardMetrics {
  totalUsers: number;
  totalScans: number;
  grantedScans: number;
  deniedScans: number;
  grantRate: number;
  recentScans: Array<{
    id: string;
    userName: string;
    userPhoto?: string;
    tableName: string;
    status: 'granted' | 'denied';
    timestamp: Date;
    location?: string;
  }>;
}

/**
 * Dashboard Service - Real-time metrics from database
 * No hardcoded data, pure database aggregation
 */
export class DashboardService {
  /**
   * Get comprehensive dashboard metrics
   */
  static async getMetrics(): Promise<DashboardMetrics> {
    const db = getDatabase();
    
    try {
      // Total users across all tables
      const totalUsers = await this.getTotalUsers();
      
      // Total scans (all access logs)
      const totalScans = await this.getTotalScans();
      
      // Granted scans
      const grantedScans = await this.getGrantedScans();
      
      // Denied scans
      const deniedScans = totalScans - grantedScans;
      
      // Grant rate percentage
      const grantRate = totalScans > 0 ? Math.round((grantedScans / totalScans) * 100) : 0;
      
      // Recent scans with user details
      const recentScans = await this.getRecentScansWithUserDetails();

      logger.info('📊 Dashboard metrics retrieved', {
        totalUsers,
        totalScans,
        grantedScans,
        deniedScans,
        grantRate
      });

      return {
        totalUsers,
        totalScans,
        grantedScans,
        deniedScans,
        grantRate,
        recentScans
      };
    } catch (error) {
      logger.error('❌ Failed to get dashboard metrics:', error);
      throw error;
    }
  }

  /**
   * Get total user count across all tables
   */
  private static async getTotalUsers(): Promise<number> {
    const db = getDatabase();
    try {
      const result = await db.get(
        `SELECT COUNT(DISTINCT id) as count FROM dynamic_users`
      );
      return result?.count || 0;
    } catch (error) {
      logger.error('Error counting total users:', error);
      return 0;
    }
  }

  /**
   * Get total scan count from access logs
   */
  private static async getTotalScans(): Promise<number> {
    const db = getDatabase();
    try {
      const result = await db.get(
        `SELECT COUNT(*) as count FROM access_logs`
      );
      return result?.count || 0;
    } catch (error) {
      logger.error('Error counting total scans:', error);
      return 0;
    }
  }

  /**
   * Get count of granted access scans
   */
  private static async getGrantedScans(): Promise<number> {
    const db = getDatabase();
    try {
      const result = await db.get(
        `SELECT COUNT(*) as count FROM access_logs WHERE access_granted = 1`
      );
      return result?.count || 0;
    } catch (error) {
      logger.error('Error counting granted scans:', error);
      return 0;
    }
  }

  /**
   * Get recent scans with full user and table information
   * Joins access_logs → dynamic_users → tables
   */
  private static async getRecentScansWithUserDetails(): Promise<DashboardMetrics['recentScans']> {
    const db = getDatabase();
    try {
      const scans = await db.all(
        `SELECT 
          al.id,
          al.access_granted,
          al.scan_timestamp,
          al.scanner_location,
          du.data as user_data,
          du.photo_url,
          t.name as table_name
        FROM access_logs al
        LEFT JOIN dynamic_users du ON al.user_id = du.id
        LEFT JOIN tables t ON du.table_id = t.id
        ORDER BY al.scan_timestamp DESC
        LIMIT 10`
      );

      return scans.map((scan: any) => {
        let userName = 'Unknown User';
        
        // Extract user name from dynamic user data
        if (scan.user_data) {
          try {
            const userData = typeof scan.user_data === 'string' 
              ? JSON.parse(scan.user_data) 
              : scan.user_data;
            userName = userData.fullName || userData.name || 'Unknown User';
          } catch (e) {
            logger.warn('Failed to parse user data:', e);
          }
        }

        return {
          id: scan.id.toString(),
          userName,
          userPhoto: scan.photo_url || undefined,
          tableName: scan.table_name || 'Unknown Table',
          status: scan.access_granted === 1 ? 'granted' : 'denied',
          timestamp: new Date(scan.scan_timestamp),
          location: scan.scanner_location || undefined
        };
      });
    } catch (error) {
      logger.error('Error fetching recent scans with user details:', error);
      return [];
    }
  }

  /**
   * Get metrics for a specific time period (e.g., today, this week)
   */
  static async getMetricsForPeriod(period: 'today' | 'week' | 'month'): Promise<{
    scans: number;
    granted: number;
    denied: number;
  }> {
    const db = getDatabase();
    
    let dateFilter = '';
    switch (period) {
      case 'today':
        dateFilter = `DATE(scan_timestamp) = DATE('now')`;
        break;
      case 'week':
        dateFilter = `scan_timestamp >= datetime('now', '-7 days')`;
        break;
      case 'month':
        dateFilter = `scan_timestamp >= datetime('now', '-30 days')`;
        break;
    }

    try {
      const result = await db.get(
        `SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN access_granted = 1 THEN 1 ELSE 0 END) as granted
        FROM access_logs
        WHERE ${dateFilter}`
      );

      const total = result?.total || 0;
      const granted = result?.granted || 0;
      const denied = total - granted;

      return { scans: total, granted, denied };
    } catch (error) {
      logger.error(`Error getting metrics for period ${period}:`, error);
      return { scans: 0, granted: 0, denied: 0 };
    }
  }
}

export default DashboardService;
