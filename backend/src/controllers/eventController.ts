/**
 * Event Controller - Handles event operations
 * 
 * Routes:
 * - POST /api/events - Create event
 * - GET /api/events - List events
 * - GET /api/events/:id - Get event details
 * - PUT /api/events/:id - Update event
 * - DELETE /api/events/:id - Delete event
 * - GET /api/events/:id/stats - Get event statistics
 * - GET /api/events/:id/registration-form - Get registration form for event
 */

import { Request, Response } from 'express';
import EventService from '../services/eventService';
import FormService from '../services/formService';
import logger from '../config/logger';

class EventController {
  /**
   * Create a new event
   * POST /api/events
   */
  async createEvent(req: Request, res: Response) {
    try {
      const adminId = (req as any).coreUser?.id;
      const payload = req.body;

      if (!adminId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized'
        });
      }

      // Validate required fields
      const required = ['name', 'start_time', 'end_time', 'tableId', 'formId'];
      const missing = required.filter(field => !payload[field]);
      
      if (missing.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields',
          missing
        });
      }

      const event = await EventService.createEvent(payload, adminId);

      res.status(201).json({
        success: true,
        message: 'Event created successfully',
        data: event
      });
    } catch (error: any) {
      logger.error('Error creating event:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create event'
      });
    }
  }

  /**
   * Get all events
   * GET /api/events?isActive=true&startDate=2026-01-01&endDate=2026-12-31
   */
  async getAllEvents(req: Request, res: Response) {
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

      const events = await EventService.getAllEvents(filters);

      res.json({
        success: true,
        data: events,
        count: events.length
      });
    } catch (error: any) {
      logger.error('Error getting events:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get events'
      });
    }
  }

  /**
   * Get active events (for registration)
   * GET /api/events/active
   */
  async getActiveEvents(req: Request, res: Response) {
    try {
      const events = await EventService.getActiveEvents();

      res.json({
        success: true,
        data: events,
        count: events.length
      });
    } catch (error: any) {
      logger.error('Error getting active events:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get active events'
      });
    }
  }

  /**
   * Get event by ID
   * GET /api/events/:id
   */
  async getEventById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const event = await EventService.getEventById(id);

      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      }

      res.json({
        success: true,
        data: event
      });
    } catch (error: any) {
      logger.error('Error getting event:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get event'
      });
    }
  }

  /**
   * Get registration form for an event
   * GET /api/events/:id/registration-form
   */
  async getEventRegistrationForm(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const event = await EventService.getEventById(id);
      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      }

      // Get form for this event
      const form = await FormService.getFormById(event.formId);
      if (!form) {
        return res.status(404).json({
          success: false,
          message: 'Form not found for this event'
        });
      }

      res.json({
        success: true,
        data: {
          event: {
            id: event.id,
            name: event.name,
            description: event.description,
            date: event.date,
            start_time: event.start_time,
            end_time: event.end_time,
            isActive: event.isActive,
            allowCheckIn: event.allowCheckIn
          },
          form
        }
      });
    } catch (error: any) {
      logger.error('Error getting event registration form:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get event registration form'
      });
    }
  }

  /**
   * Update event
   * PUT /api/events/:id
   */
  async updateEvent(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const event = await EventService.updateEvent(id, updates);

      res.json({
        success: true,
        message: 'Event updated successfully',
        data: event
      });
    } catch (error: any) {
      logger.error('Error updating event:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to update event'
      });
    }
  }

  /**
   * Delete event
   * DELETE /api/events/:id
   */
  async deleteEvent(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await EventService.deleteEvent(id);

      res.json({
        success: true,
        message: 'Event deleted successfully'
      });
    } catch (error: any) {
      logger.error('Error deleting event:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete event'
      });
    }
  }

  /**
   * Get event statistics
   * GET /api/events/:id/stats
   */
  async getEventStats(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const stats = await EventService.getEventStats(id);

      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      logger.error('Error getting event stats:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to get event statistics'
      });
    }
  }
}

export default new EventController();
