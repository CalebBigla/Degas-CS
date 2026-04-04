import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import { db } from '../config/database';
import logger from '../config/logger';

/**
 * Fixed Form Controller
 * Handles form creation and management with QR code generation
 */
class FixedFormController {
  /**
   * Create a new form with QR code for scanning
   * POST /api/forms
   */
  async createForm(req: Request, res: Response) {
    try {
      const { name } = req.body;

      // Validate required fields
      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Form name is required'
        });
      }

      // Check for duplicate form name
      const existingForm = await db.get('SELECT id FROM forms WHERE name = ?', [name]);
      if (existingForm) {
        return res.status(409).json({
          success: false,
          message: 'Form with this name already exists'
        });
      }

      // Generate form ID
      const formId = uuidv4();

      // Generate registration link
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const registrationLink = `${frontendUrl}/register/${formId}`;

      // Generate QR code for SCANNING (not registration)
      // QR encodes the scan endpoint URL
      const scanUrl = `${frontendUrl}/scan/${formId}`;
      const qrCodeData = await QRCode.toDataURL(scanUrl, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        width: 300,
        margin: 2
      });

      // Insert form into database
      await db.run(
        `INSERT INTO forms (id, name, link, qrcode, isactive, createdat, updatedat)
         VALUES (?, ?, ?, ?, 1, datetime('now'), datetime('now'))`,
        [formId, name, registrationLink, qrCodeData]
      );

      logger.info('✅ Form created successfully', { formId, name, scanUrl });

      res.status(201).json({
        success: true,
        data: {
          id: formId,
          name,
          link: registrationLink,
          scanUrl,
          qrCode: qrCodeData,
          isActive: true
        }
      });

    } catch (error: any) {
      logger.error('Form creation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create form',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get all forms
   * GET /api/forms
   */
  async getAllForms(req: Request, res: Response) {
    try {
      const forms = await db.all(
        `SELECT id, name, link, qrcode, isactive, createdat, updatedat
         FROM forms
         ORDER BY createdat DESC`
      );

      // Get user count for each form
      const formsWithCounts = await Promise.all(
        forms.map(async (form: any) => {
          const countResult = await db.get(
            'SELECT COUNT(*) as count FROM users WHERE formid = ?',
            [form.id]
          );
          return {
            ...form,
            userCount: countResult?.count || 0
          };
        })
      );

      logger.info(`📊 Fetched ${forms.length} forms`);

      res.json({
        success: true,
        data: formsWithCounts
      });

    } catch (error: any) {
      logger.error('Error fetching forms:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch forms',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get a specific form by ID
   * GET /api/forms/:formId
   */
  async getFormById(req: Request, res: Response) {
    try {
      const { formId } = req.params;

      const form = await db.get(
        'SELECT id, name, link, qrcode, isactive, createdat, updatedat FROM forms WHERE id = ?',
        [formId]
      );

      if (!form) {
        return res.status(404).json({
          success: false,
          message: 'Form not found'
        });
      }

      // Get user count
      const countResult = await db.get(
        'SELECT COUNT(*) as count FROM users WHERE formid = ?',
        [formId]
      );

      res.json({
        success: true,
        data: {
          ...form,
          userCount: countResult?.count || 0
        }
      });

    } catch (error: any) {
      logger.error('Error fetching form:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch form',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Update form
   * PUT /api/forms/:formId
   */
  async updateForm(req: Request, res: Response) {
    try {
      const { formId } = req.params;
      const { name, isActive } = req.body;

      // Check if form exists
      const form = await db.get('SELECT id FROM forms WHERE id = ?', [formId]);
      if (!form) {
        return res.status(404).json({
          success: false,
          message: 'Form not found'
        });
      }

      // Build update query
      const updates: string[] = [];
      const values: any[] = [];

      if (name !== undefined) {
        updates.push('name = ?');
        values.push(name);
      }

      if (isActive !== undefined) {
        updates.push('isactive = ?');
        values.push(isActive ? 1 : 0);
      }

      if (updates.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No fields to update'
        });
      }

      updates.push("updatedat = datetime('now')");
      values.push(formId);

      await db.run(
        `UPDATE forms SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      logger.info('✅ Form updated successfully', { formId });

      res.json({
        success: true,
        message: 'Form updated successfully'
      });

    } catch (error: any) {
      logger.error('Form update error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update form',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Delete form
   * DELETE /api/forms/:formId
   */
  async deleteForm(req: Request, res: Response) {
    try {
      const { formId } = req.params;

      // Check if form exists
      const form = await db.get('SELECT id FROM forms WHERE id = ?', [formId]);
      if (!form) {
        return res.status(404).json({
          success: false,
          message: 'Form not found'
        });
      }

      // Check if form has users
      const userCount = await db.get(
        'SELECT COUNT(*) as count FROM users WHERE formId = ?',
        [formId]
      );

      if (userCount && userCount.count > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete form with ${userCount.count} registered users`
        });
      }

      // Delete form
      await db.run('DELETE FROM forms WHERE id = ?', [formId]);

      logger.info('✅ Form deleted successfully', { formId });

      res.json({
        success: true,
        message: 'Form deleted successfully'
      });

    } catch (error: any) {
      logger.error('Form deletion error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete form',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

export default new FixedFormController();
