/**
 * Check-In Controller - Handles check-in operations for events
 * 
 * Routes:
 * - POST /api/checkin - Check in user to event
 * - GET /api/events/:eventId/checkins - Get all check-ins for event
 * - GET /api/events/:eventId/failed-checkins - Get failed check-ins
 * - GET /api/events/:eventId/checkins/:userId - Get user's check-ins for event
 */

import { Request, Response } from 'express';
import CheckInService from '../services/checkInService';
import EventService from '../services/eventService';
import logger from '../config/logger';

class CheckInController {
  /**
   * Check in user to event
   * POST /api/checkin
   * 
   * Body: {
   *   eventId: string,
   *   userId: string,
   *   scannerLocation?: string
   * }
   */
  async checkIn(req: Request, res: Response) {
    try {
      const { eventId, userId, scannerLocation } = req.body;

      // Validate required fields
      if (!eventId || !userId) {
        return res.status(400).json({
          success: false,
          message: 'eventId and userId are required'
        });
      }

      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('user-agent');

      const result = await CheckInService.checkIn(
        eventId,
        userId,
        scannerLocation,
        ipAddress,
        userAgent
      );

      const statusCode = result.accessGranted ? 200 : 403;

      res.status(statusCode).json({
        success: result.success,
        message: result.message,
        data: {
          accessGranted: result.accessGranted,
          checkedInAt: result.checkedInAt,
          denialReason: result.denialReason
        }
      });
    } catch (error: any) {
      logger.error('Error during check-in:', error);
      res.status(500).json({
        success: false,
        message: 'Check-in failed',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get all check-ins for an event
   * GET /api/events/:eventId/checkins
   */
  async getEventCheckIns(req: Request, res: Response) {
    try {
      const { eventId } = req.params;

      // Verify event exists
      const event = await EventService.getEventById(eventId);
      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      }

      const checkIns = await CheckInService.getEventCheckIns(eventId);

      res.json({
        success: true,
        data: checkIns,
        count: checkIns.length
      });
    } catch (error: any) {
      logger.error('Error getting check-ins:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get check-ins'
      });
    }
  }

  /**
   * Get failed check-ins for an event
   * GET /api/events/:eventId/failed-checkins
   */
  async getFailedCheckIns(req: Request, res: Response) {
    try {
      const { eventId } = req.params;

      // Verify event exists
      const event = await EventService.getEventById(eventId);
      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      }

      const failedCheckIns = await CheckInService.getFailedCheckIns(eventId);

      res.json({
        success: true,
        data: failedCheckIns,
        count: failedCheckIns.length
      });
    } catch (error: any) {
      logger.error('Error getting failed check-ins:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get failed check-ins'
      });
    }
  }

  /**
   * Get user's check-in history for a specific event
   * GET /api/events/:eventId/checkins/:userId
   */
  async getUserEventCheckIns(req: Request, res: Response) {
    try {
      const { eventId, userId } = req.params;

      // Verify event exists
      const event = await EventService.getEventById(eventId);
      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      }

      const history = await CheckInService.getUserEventHistory(eventId, userId);

      res.json({
        success: true,
        data: history,
        count: history.length
      });
    } catch (error: any) {
      logger.error('Error getting user check-in history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get check-in history'
      });
    }
  }
}

export default new CheckInController();
