/**
 * Check-In Service - Central validation and check-in logic for events
 * 
 * Responsibilities:
 * - Validate check-in eligibility
 * - Prevent duplicate check-ins
 * - Handle grace periods
 * - Create access logs
 * - Record attendance
 */

import { getDatabase } from '../config/database';
import logger from '../config/logger';
import { EventService } from './eventService';
import { v4 as uuidv4 } from 'uuid';

export interface CheckInResult {
  success: boolean;
  message: string;
  accessGranted: boolean;
  checkedInAt?: string;
  denialReason?: string;
}

export class CheckInService {
  /**
   * Perform check-in for an event
   * 
   * Input: eventId, userId (from table)
   * 
   * Validation:
   * - Event must exist and be active
   * - Check-in must be allowed
   * - User must exist in event's table
   * - Prevent duplicate check-in (within grace period)
   * 
   * On success:
   * - Create access log with eventId
   * - Record attendance
   */
  static async checkIn(
    eventId: string,
    userId: string,
    scannerLocation?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<CheckInResult> {
    const db = getDatabase();
    const dbType = process.env.DATABASE_TYPE || 'sqlite';

    try {
      // 1. Verify event exists and is active
      const event = await EventService.getEventById(eventId);
      if (!event) {
        return {
          success: false,
          message: 'Event not found',
          accessGranted: false,
          denialReason: 'EVENT_NOT_FOUND'
        };
      }

      if (!event.isActive) {
        return {
          success: false,
          message: 'Event is not active',
          accessGranted: false,
          denialReason: 'EVENT_INACTIVE'
        };
      }

      if (!event.allowCheckIn) {
        return {
          success: false,
          message: 'Check-in is not allowed for this event',
          accessGranted: false,
          denialReason: 'CHECK_IN_NOT_ALLOWED'
        };
      }

      // 2. Check event time window
      const now = new Date();
      const startTime = new Date(event.start_time);
      const endTime = new Date(event.end_time);

      if (now < startTime) {
        return {
          success: false,
          message: 'Event has not started yet',
          accessGranted: false,
          denialReason: 'EVENT_NOT_STARTED'
        };
      }

      if (now > endTime) {
        return {
          success: false,
          message: 'Event has ended',
          accessGranted: false,
          denialReason: 'EVENT_ENDED'
        };
      }

      // 3. Verify user exists in event's table
      const userExists = await db.get(
        `SELECT id, uuid FROM ${event.tableId} WHERE id = ? OR uuid = ?`,
        [userId, userId]
      );

      if (!userExists) {
        return {
          success: false,
          message: 'User not registered for this event',
          accessGranted: false,
          denialReason: 'USER_NOT_FOUND'
        };
      }

      const actualUserId = userExists.id || userExists.uuid;

      // 4. Check for duplicate check-in (within grace period)
      const gracePeriod = (event.gracePeriodMinutes || 0) * 60 * 1000; // Convert to milliseconds
      const gracePeriodStart = new Date(now.getTime() - gracePeriod);

      const recentCheckIn = await db.get(
        `SELECT id, access_granted FROM access_logs 
         WHERE event_id = ? AND user_id = ? AND scanned_at > ? AND access_granted = 1
         ORDER BY scanned_at DESC LIMIT 1`,
        [eventId, actualUserId, gracePeriodStart.toISOString()]
      );

      if (recentCheckIn && recentCheckIn.access_granted === 1) {
        return {
          success: false,
          message: 'User has already checked in within grace period',
          accessGranted: false,
          denialReason: 'DUPLICATE_CHECK_IN'
        };
      }

      // 5. Create access log
      const logId = uuidv4();
      const checkedInAt = now.toISOString();

      const logData = {
        id: logId,
        event_id: eventId,
        user_id: actualUserId,
        table_id: event.tableId,
        scanner_location: scannerLocation || 'API',
        access_granted: 1,
        scanned_at: checkedInAt,
        ip_address: ipAddress || null,
        user_agent: userAgent || null,
        denial_reason: null,
        created_at: checkedInAt
      };

      if (dbType === 'sqlite') {
        await db.run(
          `INSERT INTO access_logs (
            id, event_id, user_id, table_id, scanner_location, access_granted,
            scanned_at, ip_address, user_agent, denial_reason, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            logData.id,
            logData.event_id,
            logData.user_id,
            logData.table_id,
            logData.scanner_location,
            logData.access_granted,
            logData.scanned_at,
            logData.ip_address,
            logData.user_agent,
            logData.denial_reason,
            logData.created_at
          ]
        );
      } else {
        await db.run(
          `INSERT INTO access_logs (
            id, event_id, user_id, table_id, scanner_location, access_granted,
            scanned_at, ip_address, user_agent, denial_reason, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            logData.id,
            logData.event_id,
            logData.user_id,
            logData.table_id,
            logData.scanner_location,
            logData.access_granted,
            logData.scanned_at,
            logData.ip_address,
            logData.user_agent,
            logData.denial_reason,
            logData.created_at
          ]
        );
      }

      logger.info('✅ Check-in successful', {
        eventId,
        userId: actualUserId,
        timestamp: checkedInAt
      });

      return {
        success: true,
        message: 'Check-in successful',
        accessGranted: true,
        checkedInAt
      };
    } catch (error) {
      logger.error('❌ Check-in failed:', error);
      return {
        success: false,
        message: 'Check-in failed',
        accessGranted: false,
        denialReason: 'SYSTEM_ERROR'
      };
    }
  }

  /**
   * Get check-in history for a user at an event
   */
  static async getUserEventHistory(eventId: string, userId: string): Promise<any[]> {
    const db = getDatabase();

    try {
      return await db.all(
        `SELECT * FROM access_logs 
         WHERE event_id = ? AND user_id = ? 
         ORDER BY scanned_at DESC`,
        [eventId, userId]
      );
    } catch (error) {
      logger.error('❌ Failed to get user event history:', error);
      throw error;
    }
  }

  /**
   * Get all check-ins for an event
   */
  static async getEventCheckIns(eventId: string): Promise<any[]> {
    const db = getDatabase();

    try {
      return await db.all(
        `SELECT al.*, 
                COUNT(CASE WHEN al.access_granted = 1 THEN 1 END) as successful_count,
                COUNT(CASE WHEN al.access_granted = 0 THEN 1 END) as failed_count
         FROM access_logs al
         WHERE al.event_id = ?
         GROUP BY al.user_id
         ORDER BY al.scanned_at DESC`,
        [eventId]
      );
    } catch (error) {
      logger.error('❌ Failed to get event check-ins:', error);
      throw error;
    }
  }

  /**
   * Get failed check-in attempts for an event
   */
  static async getFailedCheckIns(eventId: string): Promise<any[]> {
    const db = getDatabase();

    try {
      return await db.all(
        `SELECT * FROM access_logs 
         WHERE event_id = ? AND access_granted = 0
         ORDER BY scanned_at DESC`,
        [eventId]
      );
    } catch (error) {
      logger.error('❌ Failed to get failed check-ins:', error);
      throw error;
    }
  }

  /**
   * Deny check-in (for manual denial or system rules)
   */
  static async denyCheckIn(
    eventId: string,
    userId: string,
    denialReason: string,
    scannerLocation?: string,
    ipAddress?: string
  ): Promise<string> {
    const db = getDatabase();
    const dbType = process.env.DATABASE_TYPE || 'sqlite';

    try {
      const event = await EventService.getEventById(eventId);
      if (!event) {
        throw new Error('Event not found');
      }

      const logId = uuidv4();
      const deniedAt = new Date().toISOString();

      if (dbType === 'sqlite') {
        await db.run(
          `INSERT INTO access_logs (
            id, event_id, user_id, table_id, scanner_location, access_granted,
            scanned_at, ip_address, denial_reason, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            logId,
            eventId,
            userId || null,
            event.tableId,
            scannerLocation || 'API',
            0,
            deniedAt,
            ipAddress || null,
            denialReason,
            deniedAt
          ]
        );
      } else {
        await db.run(
          `INSERT INTO access_logs (
            id, event_id, user_id, table_id, scanner_location, access_granted,
            scanned_at, ip_address, denial_reason, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            logId,
            eventId,
            userId || null,
            event.tableId,
            scannerLocation || 'API',
            0,
            deniedAt,
            ipAddress || null,
            denialReason,
            deniedAt
          ]
        );
      }

      logger.info('⚠️  Check-in denied', { eventId, reason: denialReason });
      return logId;
    } catch (error) {
      logger.error('❌ Failed to deny check-in:', error);
      throw error;
    }
  }
}

export default CheckInService;
