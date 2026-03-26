import { Request, Response } from 'express';
import formService from '../services/formService';
import logger from '../config/logger';

class FormController {
  /**
   * Get active onboarding form (public endpoint)
   * GET /api/forms/onboarding
   */
  async getOnboardingForm(req: Request, res: Response) {
    try {
      const form = await formService.getActiveForm();

      if (!form) {
        return res.status(404).json({
          success: false,
          message: 'No active onboarding form found'
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

  /**
   * Get all forms (admin only)
   * GET /api/admin/forms
   */
  async getAllForms(req: Request, res: Response) {
    try {
      const forms = await formService.getAllForms();

      res.json({
        success: true,
        data: forms
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Error getting all forms:', { message: errorMessage, stack: errorStack });
      res.status(500).json({
        success: false,
        message: 'Failed to get forms',
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  }

  /**
   * Get form by ID (admin only)
   * GET /api/admin/forms/:id
   */
  async getFormById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const form = await formService.getFormById(id);

      if (!form) {
        return res.status(404).json({
          success: false,
          message: 'Form not found'
        });
      }

      res.json({
        success: true,
        data: form
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Error getting form by ID:', { message: errorMessage });
      res.status(500).json({
        success: false,
        message: 'Failed to get form',
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  }

  /**
   * Create new form (admin only)
   * POST /api/admin/forms
   */
  async createForm(req: Request, res: Response) {
    try {
      const formData = req.body;

      // Validation
      if (!formData.form_name || !formData.target_table) {
        return res.status(400).json({
          success: false,
          message: 'Form name and target table are required'
        });
      }

      // Validate target table is whitelisted
      const allowedTables = ['Staff', 'Students', 'Visitors', 'Contractors'];
      if (!allowedTables.includes(formData.target_table)) {
        return res.status(400).json({
          success: false,
          message: `Target table must be one of: ${allowedTables.join(', ')}`
        });
      }

      // Validate fields
      if (!formData.fields || !Array.isArray(formData.fields) || formData.fields.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one field is required'
        });
      }

      // Check for email and password fields
      const hasEmailField = formData.fields.some((f: any) => f.is_email_field);
      const hasPasswordField = formData.fields.some((f: any) => f.is_password_field);

      if (!hasEmailField) {
        return res.status(400).json({
          success: false,
          message: 'Form must have at least one email field'
        });
      }

      if (!hasPasswordField) {
        return res.status(400).json({
          success: false,
          message: 'Form must have at least one password field'
        });
      }

      const form = await formService.createForm(formData);

      res.status(201).json({
        success: true,
        message: 'Form created successfully',
        data: form
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Error creating form:', { message: errorMessage, stack: errorStack });
      res.status(500).json({
        success: false,
        message: 'Failed to create form',
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  }

  /**
   * Update form (admin only)
   * PUT /api/admin/forms/:id
   */
  async updateForm(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const formData = req.body;

      // Check if form exists
      const existingForm = await formService.getFormById(id);
      if (!existingForm) {
        return res.status(404).json({
          success: false,
          message: 'Form not found'
        });
      }

      // Validate target table if provided
      if (formData.target_table) {
        const allowedTables = ['Staff', 'Students', 'Visitors', 'Contractors'];
        if (!allowedTables.includes(formData.target_table)) {
          return res.status(400).json({
            success: false,
            message: `Target table must be one of: ${allowedTables.join(', ')}`
          });
        }
      }

      // Validate fields if provided
      if (formData.fields) {
        if (!Array.isArray(formData.fields) || formData.fields.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'At least one field is required'
          });
        }

        const hasEmailField = formData.fields.some((f: any) => f.is_email_field);
        const hasPasswordField = formData.fields.some((f: any) => f.is_password_field);

        if (!hasEmailField) {
          return res.status(400).json({
            success: false,
            message: 'Form must have at least one email field'
          });
        }

        if (!hasPasswordField) {
          return res.status(400).json({
            success: false,
            message: 'Form must have at least one password field'
          });
        }
      }

      const form = await formService.updateForm(id, formData);

      res.json({
        success: true,
        message: 'Form updated successfully',
        data: form
      });
    } catch (error) {
      logger.error('Error updating form:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update form'
      });
    }
  }

  /**
   * Delete form (admin only)
   * DELETE /api/admin/forms/:id
   */
  async deleteForm(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Check if form exists
      const existingForm = await formService.getFormById(id);
      if (!existingForm) {
        return res.status(404).json({
          success: false,
          message: 'Form not found'
        });
      }

      await formService.deleteForm(id);

      res.json({
        success: true,
        message: 'Form deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting form:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete form'
      });
    }
  }
}

export default new FormController();
