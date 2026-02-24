import { Request, Response } from 'express';
import { getDatabase } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { DashboardStats } from '@gatekeeper/shared';
import logger from '../config/logger';
import { DashboardService } from '../services/dashboardService';

// Helper function to check mock mode
const isMockMode = (): boolean => {
  return process.env.DEV_MOCK === 'true';
};

export const getDashboardStats = async (req: AuthRequest, res: Response) => {
  try {
    if (isMockMode()) {
      logger.warn('🚨 MOCK MODE: Returning mock dashboard stats');
      
      const mockStats = {
        totalUsers: 15,
        activeUsers: 12,
        todayScans: 8,
        successfulScans: 7,
        recentActivity: [
          {
            id: '1',
            userName: 'John Doe',
            action: 'Access Granted',
            timestamp: new Date(),
            status: 'granted' as const
          }
        ]
      };

      return res.json({
        success: true,
        data: mockStats
      });
    }

    // Get real-time metrics from dashboard service
    const metrics = await DashboardService.getMetrics();

    // Map DashboardMetrics to expected DashboardStats response format
    const dashboardStats: any = {
      totalUsers: metrics.totalUsers,
      activeUsers: metrics.totalUsers,
      todayScans: metrics.totalScans,
      successfulScans: metrics.grantedScans,
      recentActivity: metrics.recentScans.map(scan => ({
        id: scan.id,
        userName: scan.userName,
        action: scan.status === 'granted' ? 'Access Granted' : 'Access Denied',
        timestamp: scan.timestamp,
        status: scan.status
      }))
    };

    res.json({
      success: true,
      data: dashboardStats
    });

  } catch (error) {
    logger.error('❌ Get dashboard stats error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Return fallback stats on error
    const fallbackStats: any = {
      totalUsers: 0,
      activeUsers: 0,
      todayScans: 0,
      successfulScans: 0,
      recentActivity: []
    };

    res.json({
      success: true,
      data: fallbackStats,
      details: error instanceof Error ? error.message : String(error)
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
    const tableId = req.query.tableId as string || '';
    const offset = (page - 1) * limit;

    const dbType = process.env.DATABASE_TYPE || 'sqlite';

    // Build WHERE clause
    let whereClause = '1=1';
    const params: any[] = [];

    if (search) {
      if (dbType === 'sqlite') {
        whereClause += ` AND (json_extract(du.data, '$.fullName') LIKE ? OR t.name LIKE ?)`;
      } else {
        whereClause += ` AND ((du.data::jsonb->>'fullName') LIKE $${params.length + 1} OR t.name LIKE $${params.length + 2})`;
      }
      params.push(`%${search}%`, `%${search}%`);
    }

    if (tableId) {
      if (dbType === 'sqlite') {
        whereClause += ` AND al.table_id = ?`;
        params.push(tableId);
      } else {
        whereClause += ` AND al.table_id = $${params.length + 1}`;
        params.push(tableId);
      }
    }

    if (status !== 'all') {
      if (dbType === 'sqlite') {
        whereClause += ` AND al.access_granted = ?`;
        params.push(status === 'granted' ? 1 : 0);
      } else {
        whereClause += ` AND al.access_granted = $${params.length + 1}`;
        params.push(status === 'granted'); // PostgreSQL uses boolean
      }
    }

    // Get total count (with filters applied)
    const countQuery = `
      SELECT COUNT(*) as ${dbType === 'sqlite' ? 'total' : '"total"'}
      FROM access_logs al
      LEFT JOIN dynamic_users du ON al.user_id = du.id
      LEFT JOIN tables t ON al.table_id = t.id
      WHERE ${whereClause}
    `;
    const countResult = await db.get(countQuery, params);
    const total = parseInt(countResult?.total || '0');

    // Get overall stats (total scans, granted, denied - NO filters except status if explicitly chosen)
    let statsWhereClause = '1=1';
    const statsParams: any[] = [];
    
    if (tableId) {
      if (dbType === 'sqlite') {
        whereClause += ` AND al.table_id = ?`;
        params.push(tableId);
      } else {
        whereClause += ` AND al.table_id = $${params.length + 1}`;
        params.push(tableId);
      }
    }

    if (status !== 'all') {
      if (dbType === 'sqlite') {
        statsWhereClause = `al.access_granted = ?`;
        statsParams.push(status === 'granted' ? 1 : 0);
      } else {
        statsWhereClause = `al.access_granted = $1`;
        statsParams.push(status === 'granted');
      }
    }

    const statsQuery = `
      SELECT 
        COUNT(*) as "totalScans",
        SUM(CASE WHEN al.access_granted = ${dbType === 'sqlite' ? '1' : 'true'} THEN 1 ELSE 0 END) as "grantedScans",
        SUM(CASE WHEN al.access_granted = ${dbType === 'sqlite' ? '0' : 'false'} THEN 1 ELSE 0 END) as "deniedScans"
      FROM access_logs al
      ${statsWhereClause !== '1=1' ? `WHERE ${statsWhereClause}` : ''}
    `;
    const statsResult = await db.get(statsQuery, statsParams);
    
    logger.info('📊 Stats query result:', {
      dbType,
      statsResult,
      totalScans: statsResult?.totalScans,
      grantedScans: statsResult?.grantedScans,
      deniedScans: statsResult?.deniedScans
    });
    
    const stats = {
      totalScans: parseInt(statsResult?.totalScans || statsResult?.totalscans || '0'),
      grantedScans: parseInt(statsResult?.grantedScans || statsResult?.grantedscans || '0'),
      deniedScans: parseInt(statsResult?.deniedScans || statsResult?.deniedscans || '0')
    };

    // Get paginated logs
    let logsQuery: string;
    if (dbType === 'sqlite') {
      logsQuery = `
        SELECT 
          al.id,
          al.user_id as userId,
          du.data as userData,
          t.schema as tableSchema,
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
    } else {
      logsQuery = `
        SELECT 
          al.id,
          al.user_id as "userId",
          du.data as "userData",
          t.schema as "tableSchema",
          du.photo_url as "userPhoto",
          al.table_id as "tableId",
          t.name as "tableName",
          CASE WHEN al.access_granted = true THEN 'granted' ELSE 'denied' END as status,
          al.scan_timestamp as timestamp,
          al.scanner_location as "scanLocation",
          al.qr_code_id as "qrId"
        FROM access_logs al
        LEFT JOIN dynamic_users du ON al.user_id = du.id
        LEFT JOIN tables t ON al.table_id = t.id
        WHERE ${whereClause}
        ORDER BY al.scan_timestamp DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `;
    }
    
    const logs = await db.all(logsQuery, [...params, limit, offset]);

    logger.info(`📊 Raw logs fetched from database:`, {
      count: logs.length,
      dbType,
      firstLog: logs[0] ? {
        id: logs[0].id,
        userId: logs[0].userId,
        tableName: logs[0].tableName,
        status: logs[0].status,
        timestamp: logs[0].timestamp,
        hasUserData: !!logs[0].userData,
        hasTableSchema: !!logs[0].tableSchema
      } : null
    });

    // Process logs to extract userName from userData using schema
    const processedLogs = logs.map((log: any) => {
      let userName = 'Unknown';
      
      // Try to extract from schema
      try {
        const tableSchema = log.tableSchema ? (typeof log.tableSchema === 'string' ? JSON.parse(log.tableSchema) : log.tableSchema) : null;
        const userData = log.userData ? (typeof log.userData === 'string' ? JSON.parse(log.userData) : log.userData) : null;
        
        if (tableSchema?.length > 0 && userData) {
          const firstFieldName = tableSchema[0]?.name;
          if (firstFieldName && userData[firstFieldName]) {
            userName = String(userData[firstFieldName]).trim();
          }
        }
      } catch (parseError) {
        logger.warn('Failed to extract userName from userData:', parseError);
      }

      return {
        id: log.id,
        userId: log.userId,
        userName,
        userPhoto: log.userPhoto,
        userData: log.userData, // Keep full data for detail view
        tableId: log.tableId,
        tableName: log.tableName,
        status: log.status,
        timestamp: log.timestamp,
        scanLocation: log.scanLocation,
        qrId: log.qrId
      };
    });

    logger.info(`Access logs fetched: ${processedLogs.length} records, total: ${total}`);
    if (processedLogs.length > 0) {
      logger.info('📋 Sample access log entry:', {
        userName: processedLogs[0]?.userName,
        tableName: processedLogs[0]?.tableName,
        status: processedLogs[0]?.status,
        userId: processedLogs[0]?.userId
      });
    }

    res.json({
      success: true,
      data: {
        data: processedLogs,
        total,
        stats: {
          totalScans: stats.totalScans,
          grantedScans: stats.grantedScans,
          deniedScans: stats.deniedScans
        }
      }
    });

  } catch (error) {
    logger.error('❌ Get access logs error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      page: req.query.page,
      limit: req.query.limit,
      search: req.query.search
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch access logs',
      details: error instanceof Error ? error.message : String(error)
    });
  }
};

export const getAnalyticsLogs = async (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const range = req.query.range as string || '7d';
    const dbType = process.env.DATABASE_TYPE || 'sqlite';
    
    // Calculate date range
    let daysBack = 7;
    if (range === '1d') daysBack = 1;
    else if (range === '30d') daysBack = 30;
    else if (range === '90d') daysBack = 90;

    // Date filter for SQLite vs PostgreSQL
    const dateFilter = dbType === 'sqlite' 
      ? `scan_timestamp >= datetime('now', '-${daysBack} days')`
      : `scan_timestamp >= (NOW() - INTERVAL '${daysBack} days')`;

    // Get total scans
    const totalScansResult = await db.get(`
      SELECT COUNT(*) as count 
      FROM access_logs 
      WHERE ${dateFilter}
    `);
    const totalScans = totalScansResult?.count || 0;

    // Get successful scans
    const successCondition = dbType === 'sqlite' ? 'access_granted = 1' : 'access_granted = true';
    const successfulScansResult = await db.get(`
      SELECT COUNT(*) as count 
      FROM access_logs 
      WHERE ${dateFilter}
      AND ${successCondition}
    `);
    const successfulScans = successfulScansResult?.count || 0;

    // Get failed scans
    const failedScans = totalScans - successfulScans;

    // Get unique users
    const uniqueUsersResult = await db.get(`
      SELECT COUNT(DISTINCT user_id) as count 
      FROM access_logs 
      WHERE ${dateFilter}
    `);
    const uniqueUsers = uniqueUsersResult?.count || 0;

    // Get daily stats
    let dailyStatsQuery: string;
    if (dbType === 'sqlite') {
      dailyStatsQuery = `
        SELECT 
          date(scan_timestamp) as date,
          COUNT(*) as scans,
          SUM(CASE WHEN access_granted = 1 THEN 1 ELSE 0 END) as success,
          SUM(CASE WHEN access_granted = 0 THEN 1 ELSE 0 END) as failed
        FROM access_logs
        WHERE ${dateFilter}
        GROUP BY date(scan_timestamp)
        ORDER BY date
      `;
    } else {
      dailyStatsQuery = `
        SELECT 
          DATE(scan_timestamp) as date,
          COUNT(*) as scans,
          SUM(CASE WHEN access_granted = true THEN 1 ELSE 0 END) as success,
          SUM(CASE WHEN access_granted = false THEN 1 ELSE 0 END) as failed
        FROM access_logs
        WHERE ${dateFilter}
        GROUP BY DATE(scan_timestamp)
        ORDER BY date
      `;
    }
    const dailyStats = await db.all(dailyStatsQuery);

    // Get top users
    let topUsersQuery: string;
    if (dbType === 'sqlite') {
      topUsersQuery = `
        SELECT 
          json_extract(du.data, '$.fullName') as name,
          COUNT(*) as scans
        FROM access_logs al
        LEFT JOIN dynamic_users du ON al.user_id = du.id
        WHERE ${dateFilter}
        GROUP BY al.user_id
        ORDER BY scans DESC
        LIMIT 10
      `;
    } else {
      topUsersQuery = `
        SELECT 
          (du.data::jsonb->>'fullName') as name,
          COUNT(*) as scans
        FROM access_logs al
        LEFT JOIN dynamic_users du ON al.user_id = du.id
        WHERE ${dateFilter}
        GROUP BY al.user_id, (du.data::jsonb->>'fullName')
        ORDER BY scans DESC
        LIMIT 10
      `;
    }
    const topUsers = await db.all(topUsersQuery);

    // Get recent logs
    let recentLogsQuery: string;
    if (dbType === 'sqlite') {
      recentLogsQuery = `
        SELECT 
          al.id,
          json_extract(du.data, '$.fullName') as userName,
          al.scan_timestamp as timestamp,
          CASE WHEN al.access_granted = 1 THEN 'granted' ELSE 'denied' END as status,
          al.scanner_location as location
        FROM access_logs al
        LEFT JOIN dynamic_users du ON al.user_id = du.id
        WHERE ${dateFilter}
        ORDER BY al.scan_timestamp DESC
        LIMIT 20
      `;
    } else {
      recentLogsQuery = `
        SELECT 
          al.id,
          (du.data::jsonb->>'fullName') as "userName",
          al.scan_timestamp as timestamp,
          CASE WHEN al.access_granted = true THEN 'granted' ELSE 'denied' END as status,
          al.scanner_location as location
        FROM access_logs al
        LEFT JOIN dynamic_users du ON al.user_id = du.id
        WHERE ${dateFilter}
        ORDER BY al.scan_timestamp DESC
        LIMIT 20
      `;
    }
    const recentLogs = await db.all(recentLogsQuery);

    logger.info(`Analytics logs fetched for range: ${range}`);

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
    logger.error('❌ Get analytics logs error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      range: req.query.range || '7d'
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics logs',
      details: error instanceof Error ? error.message : String(error)
    });
  }
};