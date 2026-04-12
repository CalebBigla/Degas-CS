import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { TwoLayerAttendanceLogger } from '../services/twoLayerAttendanceLogger';
import logger from '../config/logger';
import * as csv from 'fast-csv';
import { Writable } from 'stream';

export class AttendanceAnalyticsController {
  /**
   * GET /api/analytics/absent-members
   * Get all currently absent members (for dashboard and CSV export)
   * Access: Super Admin, Follow-up team
   */
  static async getAbsentMembers(req: AuthRequest, res: Response) {
    try {
      logger.info('📋 [ANALYTICS] Fetching absent members for export...');

      const absentMembers = await TwoLayerAttendanceLogger.getAbsentMembers();

      logger.info('✅ [ANALYTICS] Retrieved absent members', { count: absentMembers.length });

      return res.json({
        success: true,
        data: absentMembers,
        count: absentMembers.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('❌ [ANALYTICS] Error fetching absent members:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch absent members'
      });
    }
  }

  /**
   * GET /api/analytics/presence-status
   * Get current presence summary (present vs absent)
   * Access: Super Admin, Follow-up team
   */
  static async getPresenceStatus(req: AuthRequest, res: Response) {
    try {
      logger.info('📊 [ANALYTICS] Fetching presence status...');

      const status = await TwoLayerAttendanceLogger.getCurrentPresenceStatus();

      return res.json({
        success: true,
        data: status,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('❌ [ANALYTICS] Error fetching presence status:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch presence status'
      });
    }
  }

  /**
   * POST /api/analytics/export-absent-csv
   * Export absent members to CSV
   * CSV columns: Full Name, Phone, Email, Last Scanned Date
   * Filename: absent-members-[date].csv
   * Access: Super Admin, Follow-up team
   */
  static async exportAbsentMembersCSV(req: AuthRequest, res: Response) {
    try {
      logger.info('📥 [ANALYTICS] Exporting absent members to CSV...');

      const absentMembers = await TwoLayerAttendanceLogger.getAbsentMembers();

      if (!absentMembers || absentMembers.length === 0) {
        logger.info('ℹ️ [ANALYTICS] No absent members to export');
        return res.json({
          success: true,
          message: 'No absent members',
          data: []
        });
      }

      // Format data for CSV
      const csvData = absentMembers.map((member: any) => ({
        'Full Name': member.full_name || 'N/A',
        'Phone': member.phone || 'N/A',
        'Email': member.email || 'N/A',
        'Last Scanned': member.last_scanned_date 
          ? new Date(member.last_scanned_date).toLocaleString()
          : 'N/A'
      }));

      // Create CSV filename
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
      const filename = `absent-members-${dateStr}.csv`;

      // Set response headers
      res.setHeader('Content-Type', 'text/csv;charset=utf-8;');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      logger.info('📄 [ANALYTICS] Generating CSV file...', { filename, recordCount: csvData.length });

      // Write CSV to response
      const output = res as unknown as Writable;
      csv
        .write(csvData, { headers: true })
        .pipe(output)
        .on('finish', () => {
          logger.info('✅ [ANALYTICS] CSV export completed', { filename, recordCount: csvData.length });
        })
        .on('error', (error) => {
          logger.error('❌ [ANALYTICS] CSV export error:', error);
        });

    } catch (error) {
      logger.error('❌ [ANALYTICS] Error exporting CSV:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to export CSV'
      });
    }
  }

  /**
   * GET /api/analytics/attendance-history/:userId
   * Get attendance history for a specific member
   * Access: Super Admin, Follow-up team
   */
  static async getMemberAttendanceHistory(req: AuthRequest, res: Response) {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
      }

      logger.info('📅 [ANALYTICS] Fetching attendance history for member...', { userId });

      const history = await TwoLayerAttendanceLogger.getMemberAttendanceHistory(userId);

      return res.json({
        success: true,
        data: history,
        count: history.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('❌ [ANALYTICS] Error fetching attendance history:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch attendance history'
      });
    }
  }

  /**
   * GET /api/analytics/summary
   * Get attendance analytics summary
   * Query params: days (default: 30)
   * Access: Super Admin
   */
  static async getAttendanceAnalyticsSummary(req: AuthRequest, res: Response) {
    try {
      const days = parseInt(req.query.days as string) || 30;

      logger.info('📊 [ANALYTICS] Fetching attendance summary...', { days });

      const analytics = await TwoLayerAttendanceLogger.getAttendanceAnalytics(days);

      return res.json({
        success: true,
        data: analytics,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('❌ [ANALYTICS] Error fetching analytics summary:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch analytics summary'
      });
    }
  }

  /**
   * POST /api/analytics/reset-attendance
   * Manual reset: Set all present members to absent
   * Superadmin dashboard button
   * Access: Super Admin ONLY
   */
  static async manualResetAttendance(req: AuthRequest, res: Response) {
    try {
      // Verify super admin
      if (req.admin?.role !== 'super_admin') {
        logger.warn('⚠️ [ANALYTICS] Unauthorized reset attempt by:', { userId: req.admin?.id, role: req.admin?.role });
        return res.status(403).json({
          success: false,
          error: 'Only superadmin can reset attendance'
        });
      }

      logger.warn('🔄 [ANALYTICS] Superadmin resetting all attendance...', { adminId: req.admin?.id });

      const affectedRows = await TwoLayerAttendanceLogger.manualResetAllToAbsent();

      logger.warn('✅ [ANALYTICS] Attendance reset complete', { adminId: req.admin?.id, affectedRows });

      return res.json({
        success: true,
        message: `Reset ${affectedRows} members from present to absent`,
        affectedRows,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('❌ [ANALYTICS] Error resetting attendance:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to reset attendance'
      });
    }
  }
}

// Export instance methods for routing
export const getAbsentMembers = AttendanceAnalyticsController.getAbsentMembers.bind(AttendanceAnalyticsController);
export const getPresenceStatus = AttendanceAnalyticsController.getPresenceStatus.bind(AttendanceAnalyticsController);
export const exportAbsentMembersCSV = AttendanceAnalyticsController.exportAbsentMembersCSV.bind(AttendanceAnalyticsController);
export const getMemberAttendanceHistory = AttendanceAnalyticsController.getMemberAttendanceHistory.bind(AttendanceAnalyticsController);
export const getAttendanceAnalyticsSummary = AttendanceAnalyticsController.getAttendanceAnalyticsSummary.bind(AttendanceAnalyticsController);
export const manualResetAttendance = AttendanceAnalyticsController.manualResetAttendance.bind(AttendanceAnalyticsController);
