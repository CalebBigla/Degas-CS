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
    
    logger.info(`🔍 [getFormTables] Starting - Database Type: ${dbType}`);
    
    // Get old forms from form_definitions (if table exists)
    let oldForms: any[] = [];
    try {
      oldForms = await formService.getAllForms();
      logger.info(`✅ [getFormTables] Fetched ${oldForms.length} old forms from form_definitions`);
    } catch (error: any) {
      logger.warn(`⚠️  [getFormTables] Could not fetch old forms:`, {
        error: error.message,
        code: error.code,
        detail: error.detail
      });
      // Table might not exist - that's okay
    }
    
    // Get new forms from forms table - use lowercase column names
    logger.info(`📊 [getFormTables] Querying forms table...`);
    const newForms = await db.all('SELECT * FROM forms ORDER BY createdat DESC');
    logger.info(`✅ [getFormTables] Fetched ${newForms.length} forms from forms table`);
    
    logger.info(`📊 [getFormTables] Found ${oldForms.length} old forms and ${newForms.length} new forms`);
    
    // Map old forms to table format
    const oldFormTables = await Promise.all(
      oldForms.map(async (form) => {
        try {
          // Count records in the dynamic table
          const result = await db.get(
            `SELECT COUNT(*) as count FROM ${form.target_table}`,
            []
          );
          
          const recordCount = parseInt(result?.count || 0);

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
          // Count users registered with this form - use lowercase column name
          const result = await db.get(
            `SELECT COUNT(*) as count FROM users WHERE formid = ?`,
            [form.id]
          );
          
          const recordCount = parseInt(result?.count || 0);

          return {
            id: form.id,
            name: form.name,
            description: 'Fixed schema form',
            target_table: 'users',
            type: 'fixed_form',
            is_active: form.isactive,
            record_count: recordCount,
            fields: [
              { field_name: 'name', field_label: 'Name', field_type: 'text' },
              { field_name: 'phone', field_label: 'Phone', field_type: 'tel' },
              { field_name: 'email', field_label: 'Email', field_type: 'email' },
              { field_name: 'address', field_label: 'Address', field_type: 'text' }
            ],
            created_at: form.createdat,
            updated_at: form.updatedat,
            link: form.link,
            qrCode: form.qrcode
          };
        } catch (error: any) {
          logger.error(`❌ Error counting users for form ${form.name}:`, {
            error: error.message,
            formId: form.id
          });
          
          return {
            id: form.id,
            name: form.name,
            description: 'Fixed schema form',
            target_table: 'users',
            type: 'fixed_form',
            is_active: form.isactive,
            record_count: 0,
            fields: [],
            created_at: form.createdat,
            updated_at: form.updatedat,
            link: form.link,
            qrCode: form.qrcode,
            error: 'Could not count users'
          };
        }
      })
    );
    
    // Combine both lists
    const allFormTables = [...newFormTables, ...oldFormTables];

    logger.info(`✅ Returning ${allFormTables.length} total forms/tables`);

    res.json({
      success: true,
      data: allFormTables
    });
  } catch (error: any) {
    logger.error('🔥 [getFormTables] BACKEND ERROR:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      sql: error.sql ? error.sql.substring(0, 200) : undefined,
      errno: error.errno,
      sqlState: error.sqlState,
      stack: error.stack?.substring(0, 500)
    });
    res.status(500).json({
      success: false,
      message: 'Failed to get form tables',
      error: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        code: error.code,
        sql: error.sql ? error.sql.substring(0, 200) : undefined
      } : undefined
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

    logger.info(`📊 Fetching users for formId: ${formId}`);

    // First check if it's a new form (from forms table) - use ? placeholder
    const newForm = await db.get('SELECT * FROM forms WHERE id = ?', [formId]);
    
    if (newForm) {
      // It's a fixed schema form - get users from users table
      logger.info(`📊 Found fixed schema form: ${newForm.name}`);
      
      // Use ? placeholder, adapter will convert - use lowercase column names
      const users = await db.all(
        `SELECT id, name, phone, email, address, scanned, scannedat, profileimageurl, createdat, updatedat
         FROM users
         WHERE formid = ?
         ORDER BY createdat DESC`,
        [formId]
      );
      
      // Map lowercase column names to camelCase for frontend compatibility
      const mappedUsers = users.map((user: any) => ({
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        address: user.address,
        scanned: user.scanned,
        scannedAt: user.scannedat,
        profileImageUrl: user.profileimageurl, // Map lowercase to camelCase
        createdAt: user.createdat,
        updatedAt: user.updatedat
      }));
      
      logger.info(`✅ Found ${mappedUsers.length} users for form ${newForm.name}`);
      logger.info('🔍 Sample mapped user:', JSON.stringify(mappedUsers[0], null, 2));
      
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
          total_records: mappedUsers.length,
          records: mappedUsers,
          link: newForm.link,
          qrCode: newForm.qrCode || newForm["qrCode"]
        }
      });
    }

    // If not found in new forms, check old form_definitions
    const form = await formService.getFormById(formId);
    if (!form) {
      logger.warn(`⚠️ Form not found: ${formId}`);
      return res.status(404).json({
        success: false,
        message: 'Form not found'
      });
    }

    logger.info(`📊 Found old form definition: ${form.form_name}, table: ${form.target_table}`);

    // Check if table exists
    let tableExists;
    if (dbType === 'postgresql') {
      tableExists = await db.get(
        `SELECT tablename FROM pg_tables WHERE tablename = ?`,
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

    logger.info(`✅ Found ${records.length} records in ${form.target_table}`);

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
  } catch (error: any) {
    const dbType = process.env.DATABASE_TYPE || 'sqlite';
    logger.error('🔥 [getFormTableUsers] BACKEND ERROR:', {
      formId: req.params.formId,
      dbType: dbType,
      message: error.message,
      code: error.code,
      detail: error.detail,
      sql: error.sql ? error.sql.substring(0, 200) : undefined,
      errno: error.errno,
      sqlState: error.sqlState,
      stack: error.stack?.substring(0, 500)
    });
    res.status(500).json({
      success: false,
      message: 'Failed to get form table users',
      error: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        code: error.code,
        sql: error.sql ? error.sql.substring(0, 200) : undefined,
        formId: req.params.formId
      } : undefined
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
