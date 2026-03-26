import { Request, Response } from 'express';
import attendanceService from '../services/attendanceService';
import logger from '../config/logger';

class AttendanceController {
  /**
   * Create attendance session (admin only)
   * POST /api/admin/sessions
   */
  async createSession(req: Request, res: Response) {
    try {
      const sessionData = req.body;
      const adminId = (req as any).coreUser?.id;

      if (!adminId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      // Validation
      if (!sessionData.session_name || !sessionData.start_time || !sessionData.end_time) {
        return res.status(400).json({
          success: false,
          message: 'Session name, start time, and end time are required'
        });
      }

      sessionData.created_by = adminId;

      const session = await attendanceService.createSession(sessionData);

      res.status(201).json({
        success: true,
        message: 'Session created successfully',
        data: session
      });
    } catch (error: any) {
      logger.error('Error creating session:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create session'
      });
    }
  }

  /**
   * Get all sessions (admin only)
   * GET /api/admin/sessions
   */
  async getAllSessions(req: Request, res: Response) {
    try {
      const { isActive, startDate, endDate } = req.query;

      const filters: any = {};
      if (isActive !== undefined) {
        filters.isActive = isActive === 'true';
      }
      if (startDate) {
        filters.startDate = startDate as string;
      }
      if (endDate) {
        filters.endDate = endDate as string;
      }

      const sessions = await attendanceService.getAllSessions(filters);

      res.json({
        success: true,
        data: sessions
      });
    } catch (error) {
      logger.error('Error getting sessions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get sessions'
      });
    }
  }

  /**
   * Get session by ID (admin only)
   * GET /api/admin/sessions/:id
   */
  async getSessionById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const session = await attendanceService.getSessionById(id);

      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Session not found'
        });
      }

      res.json({
        success: true,
        data: session
      });
    } catch (error) {
      logger.error('Error getting session:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get session'
      });
    }
  }

  /**
   * Update session (admin only)
   * PUT /api/admin/sessions/:id
   */
  async updateSession(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const session = await attendanceService.updateSession(id, updates);

      res.json({
        success: true,
        message: 'Session updated successfully',
        data: session
      });
    } catch (error) {
      logger.error('Error updating session:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update session'
      });
    }
  }

  /**
   * Delete session (admin only)
   * DELETE /api/admin/sessions/:id
   */
  async deleteSession(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await attendanceService.deleteSession(id);

      res.json({
        success: true,
        message: 'Session deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting session:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete session'
      });
    }
  }

  /**
   * Activate/deactivate session (admin only)
   * POST /api/admin/sessions/:id/activate
   */
  async toggleSessionActive(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { isActive } = req.body;

      if (isActive === undefined) {
        return res.status(400).json({
          success: false,
          message: 'isActive field is required'
        });
      }

      const session = await attendanceService.toggleSessionActive(id, isActive);

      res.json({
        success: true,
        message: `Session ${isActive ? 'activated' : 'deactivated'} successfully`,
        data: session
      });
    } catch (error) {
      logger.error('Error toggling session active:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update session status'
      });
    }
  }

  /**
   * Generate QR code for session (admin only)
   * GET /api/admin/sessions/:id/qr
   */
  async generateSessionQR(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { qrToken, qrImage } = await attendanceService.generateSessionQR(id);

      res.json({
        success: true,
        data: {
          sessionId: id,
          qrToken,
          qrImage
        }
      });
    } catch (error: any) {
      logger.error('Error generating session QR:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to generate QR code'
      });
    }
  }

  /**
   * Scan QR code to check in (requires core user authentication)
   * POST /api/attendance/scan
   */
  async scanQR(req: Request, res: Response) {
    try {
      const { qrToken } = req.body;
      const coreUserId = (req as any).coreUser?.id;

      if (!coreUserId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      if (!qrToken) {
        return res.status(400).json({
          success: false,
          message: 'QR token is required'
        });
      }

      // Verify QR token
      const verification = attendanceService.verifySessionQR(qrToken);
      
      if (!verification.valid) {
        return res.status(400).json({
          success: false,
          message: verification.error || 'Invalid QR code'
        });
      }

      const sessionId = verification.payload.sessionId;

      // Check in user
      const record = await attendanceService.checkInUser(sessionId, coreUserId);

      res.json({
        success: true,
        message: 'Check-in successful',
        data: {
          record,
          sessionName: verification.payload.sessionName
        }
      });
    } catch (error: any) {
      logger.error('Error scanning QR:', error);
      
      // Return appropriate status codes for different errors
      if (error.message.includes('not active')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      if (error.message.includes('not started') || error.message.includes('ended')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      if (error.message.includes('Already checked in')) {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }

      res.status(500).json({
        success: false,
        message: error.message || 'Check-in failed'
      });
    }
  }

  /**
   * Get session attendance (admin only)
   * GET /api/admin/sessions/:id/attendance
   */
  async getSessionAttendance(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const attendance = await attendanceService.getSessionAttendance(id);
      const stats = await attendanceService.getSessionStats(id);

      res.json({
        success: true,
        data: {
          attendance,
          stats
        }
      });
    } catch (error) {
      logger.error('Error getting session attendance:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get attendance'
      });
    }
  }

  /**
   * Get session absentees (admin only)
   * GET /api/admin/sessions/:id/absentees
   */
  async getSessionAbsentees(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const absentees = await attendanceService.getSessionAbsentees(id);

      res.json({
        success: true,
        data: absentees
      });
    } catch (error) {
      logger.error('Error getting session absentees:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get absentees'
      });
    }
  }

  /**
   * Get user's attendance history (requires core user authentication)
   * GET /api/attendance/history
   */
  async getUserAttendanceHistory(req: Request, res: Response) {
    try {
      const coreUserId = (req as any).coreUser?.id;

      if (!coreUserId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const history = await attendanceService.getUserAttendanceHistory(coreUserId);

      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      logger.error('Error getting user attendance history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get attendance history'
      });
    }
  }
}

export default new AttendanceController();
