import { Request, Response } from 'express';
import { getDatabase } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { DashboardStats } from '@gatekeeper/shared';
import logger from '../config/logger';

// Helper function to check mock mode
const isMockMode = (): boolean => {
  return process.env.DEV_MOCK === 'true';
};

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    if (isMockMode()) {
      logger.warn('🚨 MOCK MODE: Returning mock dashboard stats');
      
      const mockStats: DashboardStats = {
        totalUsers: 15,
        activeUsers: 12,
        todayScans: 8,
        successfulScans: 7,
        recentLogs: [
          {
            id: '1',
            userId: 'user-1',
            scannerLocation: 'Main Entrance',
            accessGranted: true,
            scannedBy: 'admin',
            scanTimestamp: new Date(),
            ipAddress: '192.168.1.100',
            userAgent: 'Scanner/1.0',
            user: {
              id: 'user-1',
              employeeId: 'EMP001',
              fullName: 'John Doe',
              email: 'john@company.com',
              role: 'Engineer',
              department: 'IT',
              photoUrl: undefined,
              status: 'active',
              qrHash: 'qr-1',
              createdAt: new Date(),
              updatedAt: new Date()
            }
          }
        ]
      };

      return res.json({
        success: true,
        data: mockStats
      });
    }

    // PRODUCTION-SAFE: Database-only analytics
    try {
      const db = getDatabase();
      
      // Get total users from dynamic_users table
      const totalUsersResult = await db.get('SELECT COUNT(*) as count FROM dynamic_users');
      const totalUsers = totalUsersResult?.count || 0;

      // Get total scans (all time)
      const totalScannedResult = await db.get('SELECT COUNT(*) as count FROM access_logs');
      const totalScanned = totalScannedResult?.count || 0;

      // Get total access granted
      const totalAccessGrantedResult = await db.get(`SELECT COUNT(*) as count FROM access_logs 
                WHERE access_granted = 1`);
      const totalAccessGranted = totalAccessGrantedResult?.count || 0;

      // Get total access denied
      const totalAccessDeniedResult = await db.get(`SELECT COUNT(*) as count FROM access_logs 
                WHERE access_granted = 0`);
      const totalAccessDenied = totalAccessDeniedResult?.count || 0;

      // Get recent logs
      const recentLogs = await db.all(`SELECT * FROM access_logs 
                ORDER BY scan_timestamp DESC 
                LIMIT 10`);

      const stats: DashboardStats = {
        totalUsers,
        activeUsers: totalUsers, // For now, assume all users are active
        todayScans: totalScanned, // Changed to total scanned
        successfulScans: totalAccessGranted, // Changed to total access granted
        recentLogs: recentLogs.map(log => ({
          id: log.id.toString(),
          userId: log.user_id,
          scannerLocation: log.scanner_location,
          accessGranted: log.access_granted === 1,
          scannedBy: log.scanned_by,
          scanTimestamp: new Date(log.scan_timestamp),
          ipAddress: log.ip_address,
          userAgent: log.user_agent
        }))
      };

      res.json({
        success: true,
        data: stats
      });

    } catch (dbError) {
      logger.error('Database error in dashboard stats:', dbError);
      
      // Return basic stats if database fails
      const fallbackStats: DashboardStats = {
        totalUsers: 0,
        activeUsers: 0,
        todayScans: 0,
        successfulScans: 0,
        recentLogs: []
      };

      res.json({
        success: true,
        data: fallbackStats
      });
    }

  } catch (error) {
    logger.error('❌ Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard statistics'
    });
  }
};

export const getAccessAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    if (isMockMode()) {
      logger.warn('🚨 MOCK MODE: Returning mock analytics');
      
      return res.json({
        success: true,
        data: {
          trends: [],
          topLocations: [],
          hourlyDistribution: []
        }
      });
    }

    // For now, return empty analytics - can be enhanced later
    res.json({
      success: true,
      data: {
        trends: [],
        topLocations: [],
        hourlyDistribution: []
      }
    });

  } catch (error) {
    logger.error('❌ Get access analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch access analytics'
    });
  }
};

export const getAccessLogs = async (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string || '';
    const status = req.query.status as string || 'all';
    const offset = (page - 1) * limit;

    // Build WHERE clause
    let whereClause = '1=1';
    const params: any[] = [];

    if (search) {
      whereClause += ` AND (json_extract(du.data, '$.fullName') LIKE ? OR t.name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    if (status !== 'all') {
      whereClause += ` AND al.access_granted = ?`;
      params.push(status === 'granted' ? 1 : 0);
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM access_logs al
      LEFT JOIN dynamic_users du ON al.user_id = du.id
      LEFT JOIN tables t ON al.table_id = t.id
      WHERE ${whereClause}
    `;
    const countResult = await db.get(countQuery, params);
    const total = countResult?.total || 0;

    // Get paginated logs
    const logsQuery = `
      SELECT 
        al.id,
        al.user_id as userId,
        json_extract(du.data, '$.fullName') as userName,
        du.photo_url as userPhoto,
        al.table_id as tableId,
        t.name as tableName,
        CASE WHEN al.access_granted = 1 THEN 'granted' ELSE 'denied' END as status,
        al.scan_timestamp as timestamp,
        al.scanner_location as scanLocation,
        al.qr_code_id as qrId
      FROM access_logs al
      LEFT JOIN dynamic_users du ON al.user_id = du.id
      LEFT JOIN tables t ON al.table_id = t.id
      WHERE ${whereClause}
      ORDER BY al.scan_timestamp DESC
      LIMIT ? OFFSET ?
    `;
    const logs = await db.all(logsQuery, [...params, limit, offset]);

    res.json({
      success: true,
      data: {
        data: logs,
        total
      }
    });

  } catch (error) {
    logger.error('❌ Get access logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch access logs'
    });
  }
};

export const getAnalyticsLogs = async (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const range = req.query.range as string || '7d';
    
    // Calculate date range
    let daysBack = 7;
    if (range === '1d') daysBack = 1;
    else if (range === '30d') daysBack = 30;
    else if (range === '90d') daysBack = 90;

    // Get total scans
    const totalScansResult = await db.get(`
      SELECT COUNT(*) as count 
      FROM access_logs 
      WHERE scan_timestamp >= datetime('now', '-${daysBack} days')
    `);
    const totalScans = totalScansResult?.count || 0;

    // Get successful scans
    const successfulScansResult = await db.get(`
      SELECT COUNT(*) as count 
      FROM access_logs 
      WHERE scan_timestamp >= datetime('now', '-${daysBack} days')
      AND access_granted = 1
    `);
    const successfulScans = successfulScansResult?.count || 0;

    // Get failed scans
    const failedScans = totalScans - successfulScans;

    // Get unique users
    const uniqueUsersResult = await db.get(`
      SELECT COUNT(DISTINCT user_id) as count 
      FROM access_logs 
      WHERE scan_timestamp >= datetime('now', '-${daysBack} days')
    `);
    const uniqueUsers = uniqueUsersResult?.count || 0;

    // Get daily stats
    const dailyStats = await db.all(`
      SELECT 
        date(scan_timestamp) as date,
        COUNT(*) as scans,
        SUM(CASE WHEN access_granted = 1 THEN 1 ELSE 0 END) as success,
        SUM(CASE WHEN access_granted = 0 THEN 1 ELSE 0 END) as failed
      FROM access_logs
      WHERE scan_timestamp >= datetime('now', '-${daysBack} days')
      GROUP BY date(scan_timestamp)
      ORDER BY date
    `);

    // Get top users
    const topUsers = await db.all(`
      SELECT 
        json_extract(du.data, '$.fullName') as name,
        COUNT(*) as scans
      FROM access_logs al
      LEFT JOIN dynamic_users du ON al.user_id = du.id
      WHERE al.scan_timestamp >= datetime('now', '-${daysBack} days')
      GROUP BY al.user_id
      ORDER BY scans DESC
      LIMIT 10
    `);

    // Get recent logs
    const recentLogs = await db.all(`
      SELECT 
        al.id,
        json_extract(du.data, '$.fullName') as userName,
        al.scan_timestamp as timestamp,
        CASE WHEN al.access_granted = 1 THEN 'granted' ELSE 'denied' END as status,
        al.scanner_location as location
      FROM access_logs al
      LEFT JOIN dynamic_users du ON al.user_id = du.id
      WHERE al.scan_timestamp >= datetime('now', '-${daysBack} days')
      ORDER BY al.scan_timestamp DESC
      LIMIT 20
    `);

    res.json({
      totalScans,
      successfulScans,
      failedScans,
      uniqueUsers,
      peakHours: [], // Can be enhanced later
      dailyStats,
      topUsers,
      recentLogs
    });

  } catch (error) {
    logger.error('❌ Get analytics logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics logs'
    });
  }
};