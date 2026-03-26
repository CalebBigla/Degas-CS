import { db } from '../config/database';
import logger from '../config/logger';
import userDataLinkService from './userDataLinkService';
import attendanceService from './attendanceService';
import { QRService } from './qrService';

export interface UserDashboardData {
  user: {
    id: string;
    email: string;
    full_name: string | null;
    phone: string | null;
    created_at: string;
  };
  profile: {
    table: string;
    data: Record<string, any>;
  } | null;
  qrCode: {
    token: string;
    image: string;
  };
  attendance: {
    history: any[];
    stats: {
      totalSessions: number;
      attended: number;
      missed: number;
      attendanceRate: number;
    };
  };
}

class DashboardService {
  /**
   * Get complete dashboard data for a user
   */
  async getUserDashboard(coreUserId: string): Promise<UserDashboardData> {
    try {
      // Get core user data
      const user = await db.get(
        'SELECT id, email, full_name, phone, created_at FROM core_users WHERE id = ?',
        [coreUserId]
      );

      if (!user) {
        throw new Error('User not found');
      }

      // Get linked profile data
      const linkedData = await userDataLinkService.getLinkedData(coreUserId);
      
      let profile = null;
      if (linkedData.length > 0) {
        const link = linkedData[0];
        profile = {
          table: link.tableName,
          data: link.data
        };
      }

      // Generate user QR code
      let qrToken = '';
      let qrImage = '';
      
      if (profile) {
        // Get user UUID from profile data
        const userUuid = profile.data.uuid;
        
        if (userUuid) {
          // Generate QR code using QRService
          const qrResult = await QRService.generateSecureQR(userUuid, profile.table);
          qrToken = qrResult.qrData;
          qrImage = qrResult.qrImage;
        }
      }

      // Get attendance history
      const history = await attendanceService.getUserAttendanceHistory(coreUserId);

      // Calculate attendance stats
      const totalSessions = await db.get(
        'SELECT COUNT(*) as count FROM attendance_sessions WHERE is_active = 1'
      );

      const attended = history.length;
      const total = totalSessions?.count || 0;
      const missed = Math.max(0, total - attended);
      const rate = total > 0 ? (attended / total) * 100 : 0;

      return {
        user: {
          id: user.id,
          email: user.email,
          full_name: user.full_name,
          phone: user.phone,
          created_at: user.created_at
        },
        profile,
        qrCode: {
          token: qrToken,
          image: qrImage
        },
        attendance: {
          history,
          stats: {
            totalSessions: total,
            attended,
            missed,
            attendanceRate: Math.round(rate * 100) / 100
          }
        }
      };
    } catch (error) {
      logger.error('Error getting user dashboard:', error);
      throw error;
    }
  }

  /**
   * Get all core users (admin only)
   */
  async getAllCoreUsers(filters?: {
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ users: any[]; total: number }> {
    try {
      let query = 'SELECT id, email, full_name, phone, created_at FROM core_users WHERE 1=1';
      const params: any[] = [];

      // Search filter
      if (filters?.search) {
        query += ' AND (email LIKE ? OR full_name LIKE ?)';
        const searchTerm = `%${filters.search}%`;
        params.push(searchTerm, searchTerm);
      }

      // Get total count
      const countQuery = query.replace('SELECT id, email, full_name, phone, created_at', 'SELECT COUNT(*) as count');
      const countResult = await db.get(countQuery, params);
      const total = countResult?.count || 0;

      // Add pagination
      query += ' ORDER BY created_at DESC';
      
      if (filters?.limit) {
        query += ' LIMIT ?';
        params.push(filters.limit);
      }

      if (filters?.offset) {
        query += ' OFFSET ?';
        params.push(filters.offset);
      }

      const users = await db.all(query, params);

      // Enrich with linked data
      const enrichedUsers = await Promise.all(
        users.map(async (user: any) => {
          const linkedData = await userDataLinkService.getLinkedData(user.id);
          const attendanceCount = await db.get(
            'SELECT COUNT(*) as count FROM attendance_records WHERE core_user_id = ?',
            [user.id]
          );

          return {
            ...user,
            linkedTables: linkedData.map(link => ({
              table: link.tableName,
              recordId: link.recordId
            })),
            attendanceCount: attendanceCount?.count || 0
          };
        })
      );

      return {
        users: enrichedUsers,
        total
      };
    } catch (error) {
      logger.error('Error getting all core users:', error);
      throw error;
    }
  }

  /**
   * Get core user by ID with full details (admin only)
   */
  async getCoreUserById(coreUserId: string): Promise<any> {
    try {
      const user = await db.get(
        'SELECT id, email, full_name, phone, created_at FROM core_users WHERE id = ?',
        [coreUserId]
      );

      if (!user) {
        return null;
      }

      // Get linked data
      const linkedData = await userDataLinkService.getLinkedData(coreUserId);

      // Get attendance history
      const attendanceHistory = await attendanceService.getUserAttendanceHistory(coreUserId);

      // Get attendance stats
      const attendanceCount = await db.get(
        'SELECT COUNT(*) as count FROM attendance_records WHERE core_user_id = ?',
        [coreUserId]
      );

      return {
        ...user,
        linkedData,
        attendanceHistory,
        attendanceCount: attendanceCount?.count || 0
      };
    } catch (error) {
      logger.error('Error getting core user by ID:', error);
      throw error;
    }
  }

  /**
   * Get attendance overview (admin only)
   */
  async getAttendanceOverview(): Promise<any> {
    try {
      // Total users
      const totalUsers = await db.get(
        'SELECT COUNT(*) as count FROM core_users'
      );

      // Total sessions
      const totalSessions = await db.get(
        'SELECT COUNT(*) as count FROM attendance_sessions'
      );

      // Active sessions
      const activeSessions = await db.get(
        'SELECT COUNT(*) as count FROM attendance_sessions WHERE is_active = 1'
      );

      // Total check-ins
      const totalCheckIns = await db.get(
        'SELECT COUNT(*) as count FROM attendance_records'
      );

      // Recent sessions with attendance
      const recentSessions = await db.all(
        `SELECT 
          ats.id,
          ats.session_name,
          ats.start_time,
          ats.end_time,
          ats.is_active,
          COUNT(ar.id) as attendance_count
         FROM attendance_sessions ats
         LEFT JOIN attendance_records ar ON ats.id = ar.session_id
         GROUP BY ats.id
         ORDER BY ats.start_time DESC
         LIMIT 10`
      );

      // Calculate average attendance rate
      let totalRate = 0;
      let sessionCount = 0;

      for (const session of recentSessions) {
        const stats = await attendanceService.getSessionStats(session.id);
        totalRate += stats.attendanceRate;
        sessionCount++;
      }

      const averageAttendanceRate = sessionCount > 0 ? totalRate / sessionCount : 0;

      return {
        totalUsers: totalUsers?.count || 0,
        totalSessions: totalSessions?.count || 0,
        activeSessions: activeSessions?.count || 0,
        totalCheckIns: totalCheckIns?.count || 0,
        averageAttendanceRate: Math.round(averageAttendanceRate * 100) / 100,
        recentSessions
      };
    } catch (error) {
      logger.error('Error getting attendance overview:', error);
      throw error;
    }
  }
}

export default new DashboardService();
