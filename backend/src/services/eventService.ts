/**
 * Event Service - Central controller for all event-driven operations
 * 
 * Responsibilities:
 * - Event CRUD operations
 * - Event validation
 * - Event state management
 * - Event statistics
 */

import { getDatabase } from '../config/database';
import logger from '../config/logger';
import { v4 as uuidv4 } from 'uuid';
import { Event, EventCreatePayload, EventStats } from '../models/eventModel';

export class EventService {
  /**
   * Create a new event
   * Events are the central point for all operations
   */
  static async createEvent(payload: EventCreatePayload, adminId: string): Promise<Event> {
    const db = getDatabase();
    const dbType = process.env.DATABASE_TYPE || 'sqlite';

    try {
      // Validate inputs
      const validationError = this.validateEventPayload(payload);
      if (validationError) {
        throw new Error(validationError);
      }

      // Check if end time is after start time
      const startTime = new Date(payload.start_time);
      const endTime = new Date(payload.end_time);
      if (endTime <= startTime) {
        throw new Error('Event end time must be after start time');
      }

      // Check if form exists
      const formExists = await this.checkFormExists(payload.formId);
      if (!formExists) {
        throw new Error(`Form ${payload.formId} does not exist`);
      }

      // Check if table exists
      const tableExists = await this.checkTableExists(payload.tableId);
      if (!tableExists) {
        throw new Error(`Table ${payload.tableId} does not exist`);
      }

      const eventId = uuidv4();
      const now = new Date().toISOString();
      const eventDate = payload.date || startTime.toISOString().split('T')[0];

      if (dbType === 'sqlite') {
        await db.run(
          `INSERT INTO events (
            id, name, description, event_date, start_time, end_time,
            table_id, form_id, is_active, allow_check_in, grace_period_minutes,
            created_by, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            eventId,
            payload.name,
            payload.description || null,
            eventDate,
            payload.start_time,
            payload.end_time,
            payload.tableId,
            payload.formId,
            payload.isActive ? 1 : 0,
            payload.allowCheckIn ? 1 : 0,
            payload.gracePeriodMinutes || 0,
            adminId,
            now,
            now
          ]
        );
      } else {
        await db.run(
          `INSERT INTO events (
            id, name, description, event_date, start_time, end_time,
            table_id, form_id, is_active, allow_check_in, grace_period_minutes,
            created_by, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [
            eventId,
            payload.name,
            payload.description || null,
            eventDate,
            payload.start_time,
            payload.end_time,
            payload.tableId,
            payload.formId,
            payload.isActive,
            payload.allowCheckIn,
            payload.gracePeriodMinutes || 0,
            adminId,
            now,
            now
          ]
        );
      }

      logger.info('✅ Event created', { eventId, name: payload.name });
      return this.getEventById(eventId) as Promise<Event>;
    } catch (error) {
      logger.error('❌ Failed to create event:', error);
      throw error;
    }
  }

  /**
   * Get event by ID with form fields
   */
  static async getEventById(eventId: string): Promise<Event | null> {
    const db = getDatabase();

    try {
      const event = await db.get(
        `SELECT * FROM events WHERE id = ?`,
        [eventId]
      );

      if (!event) {
        return null;
      }

      // Get form fields for this event
      const formFields = await db.all(
        `SELECT * FROM form_fields WHERE form_id = ? ORDER BY order_index ASC`,
        [event.form_id]
      );

      return this.formatEventRow(event, formFields);
    } catch (error) {
      logger.error('❌ Failed to get event:', error);
      throw error;
    }
  }

  /**
   * Get all active events
   */
  static async getActiveEvents(): Promise<Event[]> {
    const db = getDatabase();

    try {
      const events = await db.all(
        `SELECT * FROM events WHERE is_active = 1 ORDER BY start_time DESC`
      );

      return await Promise.all(
        events.map(async (event) => {
          const formFields = await db.all(
            `SELECT * FROM form_fields WHERE form_id = ? ORDER BY order_index ASC`,
            [event.form_id]
          );
          return this.formatEventRow(event, formFields);
        })
      );
    } catch (error) {
      logger.error('❌ Failed to get active events:', error);
      throw error;
    }
  }

  /**
   * Get all events with optional filters
   */
  static async getAllEvents(filters?: {
    isActive?: boolean;
    startDate?: string;
    endDate?: string;
  }): Promise<Event[]> {
    const db = getDatabase();

    try {
      let query = `SELECT * FROM events WHERE 1=1`;
      const params: any[] = [];

      if (filters?.isActive !== undefined) {
        query += ` AND is_active = ?`;
        params.push(filters.isActive ? 1 : 0);
      }

      if (filters?.startDate) {
        query += ` AND event_date >= ?`;
        params.push(filters.startDate);
      }

      if (filters?.endDate) {
        query += ` AND event_date <= ?`;
        params.push(filters.endDate);
      }

      query += ` ORDER BY start_time DESC`;

      const events = await db.all(query, params);

      return await Promise.all(
        events.map(async (event) => {
          const formFields = await db.all(
            `SELECT * FROM form_fields WHERE form_id = ? ORDER BY order_index ASC`,
            [event.form_id]
          );
          return this.formatEventRow(event, formFields);
        })
      );
    } catch (error) {
      logger.error('❌ Failed to get events:', error);
      throw error;
    }
  }

  /**
   * Update event
   */
  static async updateEvent(eventId: string, updates: Partial<EventCreatePayload>): Promise<Event> {
    const db = getDatabase();

    try {
      const event = await this.getEventById(eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      const now = new Date().toISOString();
      const updateFields: string[] = [];
      const updateValues: any[] = [];

      if (updates.name) {
        updateFields.push('name = ?');
        updateValues.push(updates.name);
      }
      if (updates.description !== undefined) {
        updateFields.push('description = ?');
        updateValues.push(updates.description);
      }
      if (updates.isActive !== undefined) {
        updateFields.push('is_active = ?');
        updateValues.push(updates.isActive ? 1 : 0);
      }
      if (updates.allowCheckIn !== undefined) {
        updateFields.push('allow_check_in = ?');
        updateValues.push(updates.allowCheckIn ? 1 : 0);
      }
      if (updates.gracePeriodMinutes !== undefined) {
        updateFields.push('grace_period_minutes = ?');
        updateValues.push(updates.gracePeriodMinutes);
      }

      if (updateFields.length === 0) {
        return event;
      }

      updateFields.push('updated_at = ?');
      updateValues.push(now);
      updateValues.push(eventId);

      await db.run(
        `UPDATE events SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      logger.info('✅ Event updated', { eventId });
      return this.getEventById(eventId) as Promise<Event>;
    } catch (error) {
      logger.error('❌ Failed to update event:', error);
      throw error;
    }
  }

  /**
   * Delete event
   */
  static async deleteEvent(eventId: string): Promise<void> {
    const db = getDatabase();

    try {
      await db.run(`DELETE FROM events WHERE id = ?`, [eventId]);
      logger.info('✅ Event deleted', { eventId });
    } catch (error) {
      logger.error('❌ Failed to delete event:', error);
      throw error;
    }
  }

  /**
   * Get event statistics
   */
  static async getEventStats(eventId: string): Promise<EventStats> {
    const db = getDatabase();

    try {
      const event = await this.getEventById(eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      // Count total registrations (users in event's table)
      const registeredCount = await db.get(
        `SELECT COUNT(*) as count FROM ${event.tableId}`,
        []
      );

      // Count check-ins for this event
      const checkedInCount = await db.get(
        `SELECT COUNT(*) as count FROM access_logs 
         WHERE event_id = ? AND access_granted = 1`,
        [eventId]
      );

      // Count failed check-ins
      const failedCount = await db.get(
        `SELECT COUNT(*) as count FROM access_logs 
         WHERE event_id = ? AND access_granted = 0`,
        [eventId]
      );

      const total = registeredCount?.count || 0;
      const checkedIn = checkedInCount?.count || 0;
      const failed = failedCount?.count || 0;

      return {
        totalRegistered: total,
        totalCheckedIn: checkedIn,
        checkInRate: total > 0 ? (checkedIn / total) * 100 : 0,
        failedCheckIns: failed
      };
    } catch (error) {
      logger.error('❌ Failed to get event stats:', error);
      throw error;
    }
  }

  /**
   * Validate event payload
   */
  private static validateEventPayload(payload: EventCreatePayload): string | null {
    if (!payload.name || payload.name.trim().length === 0) {
      return 'Event name is required';
    }
    if (!payload.start_time) {
      return 'Start time is required';
    }
    if (!payload.end_time) {
      return 'End time is required';
    }
    if (!payload.tableId) {
      return 'Table ID is required';
    }
    if (!payload.formId) {
      return 'Form ID is required';
    }
    return null;
  }

  /**
   * Check if form exists
   */
  private static async checkFormExists(formId: string): Promise<boolean> {
    const db = getDatabase();
    const result = await db.get(
      `SELECT id FROM form_definitions WHERE id = ?`,
      [formId]
    );
    return !!result;
  }

  /**
   * Check if table exists
   */
  private static async checkTableExists(tableId: string): Promise<boolean> {
    const db = getDatabase();
    try {
      const result = await db.get(
        `SELECT * FROM sqlite_master WHERE type='table' AND name=?`,
        [tableId]
      );
      return !!result;
    } catch {
      return false;
    }
  }

  /**
   * Format event row to match Event interface
   */
  private static formatEventRow(row: any, formFields: any[] = []): Event {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      date: row.event_date,
      start_time: row.start_time,
      end_time: row.end_time,
      tableId: row.table_id,
      formId: row.form_id,
      formFields: formFields,
      isActive: row.is_active === 1 || row.is_active === true,
      allowCheckIn: row.allow_check_in === 1 || row.allow_check_in === true,
      gracePeriodMinutes: row.grace_period_minutes || 0,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

export default EventService;
