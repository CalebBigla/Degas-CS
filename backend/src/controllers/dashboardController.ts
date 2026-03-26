import { Request, Response } from 'express';
import dashboardService from '../services/dashboardService';
import logger from '../config/logger';

class DashboardController {
  /**
   * Get user dashboard (requires core user authentication)
   * GET /api/user/dashboard
   */
  async getUserDashboard(req: Request, res: Response) {
    try {
      const coreUserId = (req as any).coreUser?.id;

      if (!coreUserId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const dashboardData = await dashboardService.getUserDashboard(coreUserId);

      res.json({
        success: true,
        data: dashboardData
      });
    } catch (error: any) {
      logger.error('Error getting user dashboard:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get dashboard data'
      });
    }
  }

  /**
   * Get all core users (admin only)
   * GET /api/admin/core-users
   */
  async getAllCoreUsers(req: Request, res: Response) {
    try {
      const { search, limit, offset } = req.query;

      const filters: any = {};
      if (search) filters.search = search as string;
      if (limit) filters.limit = parseInt(limit as string);
      if (offset) filters.offset = parseInt(offset as string);

      const result = await dashboardService.getAllCoreUsers(filters);

      res.json({
        success: true,
        data: result.users,
        pagination: {
          total: result.total,
          limit: filters.limit || result.total,
          offset: filters.offset || 0
        }
      });
    } catch (error) {
      logger.error('Error getting all core users:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get core users'
      });
    }
  }

  /**
   * Get core user by ID (admin only)
   * GET /api/admin/core-users/:id
   */
  async getCoreUserById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = await dashboardService.getCoreUserById(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      logger.error('Error getting core user by ID:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user'
      });
    }
  }

  /**
   * Get attendance overview (admin only)
   * GET /api/admin/attendance/overview
   */
  async getAttendanceOverview(req: Request, res: Response) {
    try {
      const overview = await dashboardService.getAttendanceOverview();

      res.json({
        success: true,
        data: overview
      });
    } catch (error) {
      logger.error('Error getting attendance overview:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get attendance overview'
      });
    }
  }
}

export default new DashboardController();
