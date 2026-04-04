import { Request, Response } from 'express';
import formService from '../services/formService';
import DynamicTableService from '../services/dynamicTableService';
import { db } from '../config/database';
import logger from '../config/logger';

/**
 * Get all form-created dynamic tables
 * Lists form definitions as "virtual tables" for admin management
 * Includes both old form_definitions and new forms table
 * GET /api/admin/forms-tables
 */
export async function getFormTables(req: Request, res: Response) {
  try {
    const dbType = process.env.DATABASE_TYPE || 'sqlite';
    
    // Get old forms from form_definitions
    const oldForms = await formService.getAllForms();
    
    // Get new forms from forms table
    let newForms;
    if (dbType === 'postgresql') {
      newForms = await db.all('SELECT * FROM forms ORDER BY "createdAt" DESC');
    } else {
      newForms = await db.all('SELECT * FROM forms ORDER BY createdAt DESC');
    }
    
    // Map old forms to table format
    const oldFormTables = await Promise.all(
      oldForms.map(async (form) => {
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
    
    // Map new forms to table format
    const newFormTables = await Promise.all(
      newForms.map(async (form: any) => {
        try {
          // Count users registered with this form
          let result;
          if (dbType === 'postgresql') {
            result = await db.get(
              `SELECT COUNT(*) as count FROM users WHERE "formId" = $1`,
              [form.id]
            );
          } else {
            result = await db.get(
              `SELECT COUNT(*) as count FROM users WHERE formId = ?`,
              [form.id]
            );
          }
          
          const recordCount = parseInt(result?.count || 0);

          return {
            id: form.id,
            name: form.name,
            description: 'Fixed schema form',
            target_table: 'users',
            type: 'fixed_form',
            is_active: form.isActive || form["isActive"],
            record_count: recordCount,
            fields: [
              { field_name: 'name', field_label: 'Name', field_type: 'text' },
              { field_name: 'phone', field_label: 'Phone', field_type: 'tel' },
              { field_name: 'email', field_label: 'Email', field_type: 'email' },
              { field_name: 'address', field_label: 'Address', field_type: 'text' }
            ],
            created_at: form.createdAt || form["createdAt"],
            updated_at: form.updatedAt || form["updatedAt"],
            link: form.link,
            qrCode: form.qrCode || form["qrCode"]
          };
        } catch (error: any) {
          logger.warn(`Could not count users for form ${form.name}:`, error.message);
          
          return {
            id: form.id,
            name: form.name,
            description: 'Fixed schema form',
            target_table: 'users',
            type: 'fixed_form',
            is_active: form.isActive || form["isActive"],
            record_count: 0,
            fields: [],
            created_at: form.createdAt || form["createdAt"],
            updated_at: form.updatedAt || form["updatedAt"],
            link: form.link,
            qrCode: form.qrCode || form["qrCode"],
            error: 'Could not count users'
          };
        }
      })
    );
    
    // Combine both lists
    const allFormTables = [...newFormTables, ...oldFormTables];

    res.json({
      success: true,
      data: allFormTables
    });
  } catch (error) {
    logger.error('Error getting form tables:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get form tables',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
}

/**
 * Get users in a form table
 * Handles both old form_definitions and new forms table
 * GET /api/admin/forms-tables/:formId/users
 */
export async function getFormTableUsers(req: Request, res: Response) {
  try {
    const { formId } = req.params;
    const dbType = process.env.DATABASE_TYPE || 'sqlite';

    // First check if it's a new form (from forms table)
    const newForm = await db.get('SELECT * FROM forms WHERE id = $1', [formId]);
    
    if (newForm) {
      // It's a fixed schema form - get users from users table
      logger.info(`📊 Fetching users for fixed schema form: ${newForm.name}`);
      
      let users;
      if (dbType === 'postgresql') {
        users = await db.all(
          `SELECT id, name, phone, email, address, scanned, "scannedAt", "createdAt", "updatedAt"
           FROM users
           WHERE "formId" = $1
           ORDER BY "createdAt" DESC`,
          [formId]
        );
      } else {
        users = await db.all(
          `SELECT id, name, phone, email, address, scanned, scannedAt, createdAt, updatedAt
           FROM users
           WHERE formId = ?
           ORDER BY createdAt DESC`,
          [formId]
        );
      }
      
      logger.info(`📊 Found ${users.length} users for form ${newForm.name}`);
      
      // Return in the expected format
      return res.json({
        success: true,
        data: {
          form_name: newForm.name,
          target_table: 'users',
          form_fields: [
            { field_name: 'name', field_label: 'Name', field_type: 'text' },
            { field_name: 'phone', field_label: 'Phone', field_type: 'tel' },
            { field_name: 'email', field_label: 'Email', field_type: 'email' },
            { field_name: 'address', field_label: 'Address', field_type: 'text' }
          ],
          total_records: users.length,
          records: users,
          link: newForm.link,
          qrCode: newForm.qrCode || newForm["qrCode"]
        }
      });
    }

    // If not found in new forms, check old form_definitions
    const form = await formService.getFormById(formId);
    if (!form) {
      return res.status(404).json({
        success: false,
        message: 'Form not found'
      });
    }

    logger.info(`📊 Fetching users from table: ${form.target_table}`);

    // Check if table exists
    let tableExists;
    if (dbType === 'postgresql') {
      tableExists = await db.get(
        `SELECT tablename FROM pg_tables WHERE tablename = $1`,
        [form.target_table]
      );
    } else {
      tableExists = await db.get(
        `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
        [form.target_table]
      );
    }

    if (!tableExists) {
      logger.warn(`⚠️ Table does not exist: ${form.target_table}`);
      return res.json({
        success: true,
        data: {
          form_name: form.form_name,
          target_table: form.target_table,
          form_fields: [],
          total_records: 0,
          records: [],
          error: 'Table not created yet - no users have registered'
        }
      });
    }

    // Get users from dynamic table
    const records = await db.all(
      `SELECT * FROM ${form.target_table} ORDER BY created_at DESC`
    );

    logger.info(`📊 Found ${records.length} records in ${form.target_table}`);

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

    logger.info(`📊 Returning ${records.length} records with ${formFields.length} fields`);

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
      message: 'Failed to get form table users',
      error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
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
