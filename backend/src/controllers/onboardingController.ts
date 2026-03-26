import { Request, Response } from 'express';
import formService from '../services/formService';
import coreUserService from '../services/coreUserService';
import userDataLinkService from '../services/userDataLinkService';
import { QRService } from '../services/qrService';
import { ImageService } from '../services/imageService';
import { db } from '../config/database';
import logger from '../config/logger';

class OnboardingController {
  /**
   * Complete user registration with dynamic form
   * POST /api/onboarding/register
   * 
   * Supports both multipart/form-data (file upload) and application/json
   */
  async register(req: Request, res: Response) {
    try {
      // Get active form
      const form = await formService.getActiveForm();
      
      if (!form) {
        return res.status(404).json({
          success: false,
          message: 'No active onboarding form available'
        });
      }

      // Extract form data (works for both JSON and multipart)
      const formData = req.body;
      
      // Validate form data
      const validation = await formService.validateFormData(form.id!, formData);
      
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: validation.errors
        });
      }

      // Get email and password fields
      const authFields = await formService.getAuthFields(form.id!);
      
      if (!authFields.emailField || !authFields.passwordField) {
        return res.status(500).json({
          success: false,
          message: 'Form configuration error: missing email or password field'
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

      // Check if email already exists
      const existingUser = await coreUserService.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'Email already registered'
        });
      }

      // Handle image upload if present
      let photoUrl: string | null = null;
      
      if (req.file) {
        // File uploaded via multipart
        logger.info('Processing uploaded file:', req.file.filename);
        photoUrl = `/uploads/${req.file.filename}`;
      } else if (formData.photo && typeof formData.photo === 'string') {
        // Base64 image from camera
        if (formData.photo.startsWith('data:image')) {
          logger.info('Processing base64 image');
          const uploadedPath = await ImageService.saveBase64Image(formData.photo);
          photoUrl = uploadedPath;
        }
      }

      // Create core user (with hashed password)
      const coreUser = await coreUserService.createUser({
        email,
        password
      });

      logger.info('Core user created:', coreUser.id);

      // Prepare data for dynamic table (exclude email and password)
      const dynamicData: Record<string, any> = {};
      
      for (const field of form.fields || []) {
        if (!field.is_email_field && !field.is_password_field) {
          const value = formData[field.field_name];
          if (value !== undefined && value !== null && value !== '') {
            dynamicData[field.field_name] = value;
          }
        }
      }

      // Add photo URL if available
      if (photoUrl) {
        dynamicData.photoUrl = photoUrl;
      }

      // Generate UUID for dynamic user
      const userUuid = this.generateUUID();
      dynamicData.uuid = userUuid;

      // Insert into dynamic table
      const targetTable = form.target_table;
      const columns = Object.keys(dynamicData);
      const placeholders = columns.map(() => '?').join(', ');
      const values = columns.map(col => dynamicData[col]);

      await db.run(
        `INSERT INTO ${targetTable} (${columns.join(', ')}) VALUES (${placeholders})`,
        values
      );

      logger.info(`User data inserted into ${targetTable}`);

      // Get the inserted record ID
      const insertedRecord = await db.get(
        `SELECT id FROM ${targetTable} WHERE uuid = ?`,
        [userUuid]
      );

      if (!insertedRecord) {
        throw new Error('Failed to retrieve inserted record');
      }

      const recordId = insertedRecord.id;

      // Create user-data link
      await userDataLinkService.createLink(
        coreUser.id,
        targetTable,
        recordId
      );

      logger.info('User-data link created');

      // Generate QR code using QRService
      const qrResult = await QRService.generateSecureQR(userUuid, targetTable);

      logger.info('QR code generated and stored');

      res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: {
          coreUserId: coreUser.id,
          email: coreUser.email,
          userId: userUuid,
          table: targetTable,
          qrCode: qrResult.qrImage,
          qrToken: qrResult.qrData
        }
      });

    } catch (error: any) {
      logger.error('Registration error:', error);
      
      // Check for specific errors
      if (error.message?.includes('UNIQUE constraint failed')) {
        return res.status(409).json({
          success: false,
          message: 'A user with this information already exists'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Registration failed',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get onboarding form (convenience endpoint)
   * GET /api/onboarding/form
   */
  async getForm(req: Request, res: Response) {
    try {
      const form = await formService.getActiveForm();
      
      if (!form) {
        return res.status(404).json({
          success: false,
          message: 'No active onboarding form available'
        });
      }

      res.json({
        success: true,
        data: form
      });
    } catch (error) {
      logger.error('Error getting onboarding form:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get onboarding form'
      });
    }
  }

  // Helper methods
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

export default new OnboardingController();
