import { Request, Response } from 'express';
import formService from '../services/formService';
import DynamicTableService from '../services/dynamicTableService';
import { db } from '../config/database';
import logger from '../config/logger';

/**
 * Get all form-created dynamic tables
 * Lists form definitions as "virtual tables" for admin management
 * GET /api/admin/forms-tables
 */
export async function getFormTables(req: Request, res: Response) {
  try {
    const forms = await formService.getAllForms();
    
    // Map forms to table format
    const formTables = await Promise.all(
      forms.map(async (form) => {
        try {
          // Count records in the dynamic table
          const result = await db.get(
            `SELECT COUNT(*) as count FROM ${form.target_table}`,
            []
          );
          
          const recordCount = result?.count || 0;

          return {
            id: form.id,
            name: form.form_name,
            description: form.description,
            target_table: form.target_table,
            type: 'form',
            is_active: form.is_active,
            record_count: recordCount,
            fields: form.fields,
            created_at: form.created_at,
            updated_at: form.updated_at
          };
        } catch (error: any) {
          logger.warn(`Could not count records in table ${form.target_table}:`, error.message);
          
          return {
            id: form.id,
            name: form.form_name,
            description: form.description,
            target_table: form.target_table,
            type: 'form',
            is_active: form.is_active,
            record_count: 0,
            fields: form.fields,
            created_at: form.created_at,
            updated_at: form.updated_at,
            error: 'Table not created yet'
          };
        }
      })
    );

    res.json({
      success: true,
      data: formTables
    });
  } catch (error) {
    logger.error('Error getting form tables:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get form tables'
    });
  }
}

/**
 * Get users in a form table
 * GET /api/admin/forms-tables/:formId/users
 */
export async function getFormTableUsers(req: Request, res: Response) {
  try {
    const { formId } = req.params;

    // Get form
    const form = await formService.getFormById(formId);
    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'Form not found'
      });
    }

    // Get users from dynamic table
    const records = await db.all(
      `SELECT * FROM ${form.target_table} ORDER BY created_at DESC`
    );

    // Parse form fields to get field names
    let formFields = [];
    if (form.fields) {
      try {
        const parsedFields = typeof form.fields === 'string' ? JSON.parse(form.fields) : form.fields;
        formFields = parsedFields.map((f: any) => ({
          field_name: f.field_name,
          field_label: f.field_label,
          field_type: f.field_type
        }));
      } catch (e) {
        logger.warn('Could not parse form fields:', e);
      }
    }

    res.json({
      success: true,
      data: {
        form_name: form.form_name,
        target_table: form.target_table,
        form_fields: formFields,
        total_records: records.length,
        records: records
      }
    });
  } catch (error) {
    logger.error('Error getting form table users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get form table users'
    });
  }
}

/**
 * Delete a record from a form table
 * DELETE /api/admin/forms-tables/:formId/users/:userId
 */
export async function deleteFormTableUser(req: Request, res: Response) {
  try {
    const { formId, userId } = req.params;

    // Get form
    const form = await formService.getFormById(formId);
    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'Form not found'
      });
    }

    // Delete record from dynamic table
    await db.run(
      `DELETE FROM ${form.target_table} WHERE id = ?`,
      [userId]
    );

    res.json({
      success: true,
      message: 'Record deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting form table user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete record'
    });
  }
}

export default {
  getFormTables,
  getFormTableUsers,
  deleteFormTableUser
};
