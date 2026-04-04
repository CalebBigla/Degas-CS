/**
 * Event Registration Controller - Refactored registration flow tied to events
 * 
 * Routes:
 * - POST /api/events/:eventId/register - Register user for an event
 * - GET /api/events/:eventId/register/form - Get registration form for event
 */

import { Request, Response } from 'express';
import EventService from '../services/eventService';
import FormService from '../services/formService';
import CoreUserService from '../services/coreUserService';
import UserDataLinkService from '../services/userDataLinkService';
import { QRService } from '../services/qrService';
import { ImageService } from '../services/imageService';
import { getDatabase } from '../config/database';
import logger from '../config/logger';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

class EventRegistrationController {
  /**
   * Get registration form for an event
   * GET /api/events/:eventId/register/form
   * 
   * Public endpoint - no authentication required
   */
  async getRegistrationForm(req: Request, res: Response) {
    try {
      const { eventId } = req.params;

      // Get event
      const event = await EventService.getEventById(eventId);
      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      }

      // Check if event is active
      if (!event.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Event is not active for registration'
        });
      }

      // Get form for this event
      const form = await FormService.getFormById(event.formId);
      if (!form) {
        return res.status(404).json({
          success: false,
          message: 'Event registration form not found'
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
            end_time: event.end_time
          },
          form: {
            id: form.id,
            name: form.form_name,
            description: form.description,
            fields: form.fields
          }
        }
      });
    } catch (error: any) {
      logger.error('Error getting registration form:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get registration form'
      });
    }
  }

  /**
   * Register user for an event
   * POST /api/events/:eventId/register
   * 
   * Public endpoint - no authentication required (registration form)
   * Supports both multipart/form-data (file upload) and application/json
   * 
   * Flow:
   * 1. Validate event exists and is active
   * 2. Validate form data
   * 3. Create or get core user (email-based)
   * 4. Insert user data into event's table
   * 5. Link core user to user record
   * 6. Generate QR code
   * 7. Create access log for registration
   * 8. Return auto-login token
   */
  async registerForEvent(req: Request, res: Response) {
    const db = getDatabase();
    const dbType = process.env.DATABASE_TYPE || 'sqlite';

    try {
      const { eventId } = req.params;
      const formData = req.body;

      // 1. Verify event exists and is active
      const event = await EventService.getEventById(eventId);
      if (!event) {
        return res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      }

      if (!event.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Event is not active for registration'
        });
      }

      // 2. Get form and validate data
      const form = await FormService.getFormById(event.formId);
      if (!form) {
        return res.status(500).json({
          success: false,
          message: 'Event registration form configuration error'
        });
      }

      const validation = await FormService.validateFormData(event.formId, formData);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validation.errors
        });
      }

      // 3. Get auth fields (email and password for core user)
      const authFields = await FormService.getAuthFields(event.formId);
      if (!authFields.emailField || !authFields.passwordField) {
        return res.status(500).json({
          success: false,
          message: 'Event registration form missing auth fields'
        });
      }

      const email = formData[authFields.emailField];
      const password = formData[authFields.passwordField];

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }

      // 4. Create or get core user
      let coreUser = await CoreUserService.getUserByEmail(email);
      
      if (!coreUser) {
        // New user registration
        coreUser = await CoreUserService.createUser({
          email,
          password,
          role: 'user',
          status: 'active'
        });
        logger.info('✅ Core user created during event registration', { eventId, userId: coreUser.id });
      } else {
        // Existing user - verify password
        const { compare } = await import('bcryptjs');
        const db = getDatabase();
        const userRecord = await db.get(
          'SELECT password FROM core_users WHERE id = ?',
          [coreUser.id]
        );
        const passwordMatch = userRecord && await compare(password, userRecord.password);
        if (!passwordMatch) {
          return res.status(401).json({
            success: false,
            message: 'Invalid credentials'
          });
        }
        logger.info('✅ Existing user logging in for event registration', { eventId, userId: coreUser.id });
      }

      // 5. Handle image upload if present
      let photoUrl: string | null = null;
      if (req.file) {
        photoUrl = `/uploads/${req.file.filename}`;
        logger.info('Processed uploaded file:', req.file.filename);
      } else if (formData.photo && typeof formData.photo === 'string') {
        if (formData.photo.startsWith('data:image')) {
          const uploadedPath = await ImageService.saveBase64Image(formData.photo);
          photoUrl = uploadedPath;
          logger.info('Processed base64 image');
        }
      }

      // 6. Prepare data for dynamic table (exclude auth fields)
      const dynamicData: Record<string, any> = {};
      
      for (const field of form.fields || []) {
        if (!field.is_email_field && !field.is_password_field) {
          const value = formData[field.field_name];
          if (value !== undefined && value !== null && value !== '') {
            dynamicData[field.field_name] = value;
          }
        }
      }

      if (photoUrl) {
        dynamicData.photoUrl = photoUrl;
      }

      // Generate UUID for dynamic user
      const userUuid = uuidv4();
      dynamicData.uuid = userUuid;
      dynamicData.event_id = eventId; // Link to event

      // 7. Insert into dynamic table
      const targetTable = event.tableId;
      const columns = Object.keys(dynamicData);
      const placeholders = columns.map(() => '?').join(', ');
      const values = columns.map(col => dynamicData[col]);

      await db.run(
        `INSERT INTO ${targetTable} (${columns.join(', ')}) VALUES (${placeholders})`,
        values
      );

      logger.info(`User data inserted into event table`, { eventId, table: targetTable });

      // Get the inserted record ID
      const insertedRecord = await db.get(
        `SELECT id FROM ${targetTable} WHERE uuid = ?`,
        [userUuid]
      );

      if (!insertedRecord) {
        throw new Error('Failed to retrieve inserted record');
      }

      const recordId = insertedRecord.id;

      // 8. Create user-data link
      await UserDataLinkService.createLink(
        coreUser.id,
        targetTable,
        recordId
      );

      logger.info('User-data link created for event', { eventId });

      // 9. Generate QR code
      const qrResult = await QRService.generateSecureQR(userUuid, targetTable);
      logger.info('QR code generated for event registration', { eventId });

      // 10. Create access log entry for registration
      const registrationLogId = uuidv4();
      const registeredAt = new Date().toISOString();

      if (dbType === 'sqlite') {
        await db.run(
          `INSERT INTO access_logs (
            id, event_id, user_id, table_id, scanner_location, access_granted,
            scanned_at, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            registrationLogId,
            eventId,
            recordId,
            targetTable,
            'Registration',
            1,
            registeredAt,
            registeredAt
          ]
        );
      } else {
        await db.run(
          `INSERT INTO access_logs (
            id, event_id, user_id, table_id, scanner_location, access_granted,
            scanned_at, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            registrationLogId,
            eventId,
            recordId,
            targetTable,
            'Registration',
            1,
            registeredAt,
            registeredAt
          ]
        );
      }

      logger.info('Registration access log created', { eventId, logId: registrationLogId });

      // 11. Generate JWT token for auto-login
      const token = jwt.sign(
        {
          id: coreUser.id,
          email: coreUser.email,
          role: coreUser.role || 'user'
        },
        process.env.CORE_USER_JWT_SECRET || 'core-user-secret',
        { expiresIn: '7d' }
      );

      res.status(201).json({
        success: true,
        message: 'Event registration successful',
        data: {
          coreUserId: coreUser.id,
          email: coreUser.email,
          userId: userUuid,
          recordId: recordId,
          eventId: eventId,
          table: targetTable,
          qrCode: qrResult.qrImage,
          qrToken: qrResult.qrData,
          token,
          registeredAt
        }
      });
    } catch (error: any) {
      logger.error('Event registration error:', error);

      if (error.message?.includes('UNIQUE constraint failed')) {
        return res.status(409).json({
          success: false,
          message: 'User already registered for this event'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Event registration failed',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  private generateUUID(): string {
    return uuidv4();
  }
}

export default new EventRegistrationController();
