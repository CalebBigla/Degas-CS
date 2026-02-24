import { Request, Response } from 'express';
import { body, param, query } from 'express-validator';
import { getDatabase } from '../config/database';
import { handleValidationErrors } from '../middleware/validation';
import { AuthRequest } from '../middleware/auth';
import { User } from '@gatekeeper/shared';
import logger from '../config/logger';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs/promises';
import archiver from 'archiver';
import csv from 'csv-parser';
import { Readable } from 'stream';
import { PDFService } from '../services/pdfService';
import { QRService } from '../services/qrService';
import { ImageService } from '../services/imageService';

// Define interfaces for this module
interface Table {
  id: string;
  name: string;
  description?: string;
  schema: TableColumn[];
  createdAt: Date;
  updatedAt: Date;
}

interface TableColumn {
  id: string;
  name: string;
  type: 'text' | 'email' | 'number' | 'date' | 'select' | 'boolean';
  required: boolean;
  options?: string[];
}

interface DynamicUser {
  id: string;
  tableId: string;
  uuid: string;
  data: Record<string, any>;
  photoUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface CreateTableRequest {
  name: string;
  description?: string;
  schema: Omit<TableColumn, 'id'>[];
}

// Validation rules
export const createTableValidation = [
  body('name').notEmpty().withMessage('Table name is required'),
  body('schema').isArray({ min: 1 }).withMessage('Schema must be a non-empty array'),
  body('schema.*.name').notEmpty().withMessage('Column name is required'),
  body('schema.*.type').isIn(['text', 'email', 'number', 'date', 'select', 'boolean']).withMessage('Invalid column type'),
  handleValidationErrors
];

export const addUserValidation = [
  param('tableId').isUUID().withMessage('Invalid table ID'),
  body('data').isString().withMessage('User data is required'),
  handleValidationErrors
];

export const bulkImportValidation = [
  param('tableId').isUUID().withMessage('Invalid table ID'),
  body('users').isArray({ min: 1 }).withMessage('Users array is required'),
  handleValidationErrors
];

// Helper function to validate CSV headers
function validateCSVHeaders(headers: string[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (headers.length === 0) {
    errors.push('CSV must have at least one header column');
    return { valid: false, errors };
  }
  
  // Check for duplicate headers
  const seen = new Set<string>();
  const duplicates: string[] = [];
  headers.forEach(header => {
    const normalized = header.trim().toLowerCase();
    if (seen.has(normalized)) {
      duplicates.push(header);
    }
    seen.add(normalized);
  });
  
  if (duplicates.length > 0) {
    errors.push(`Duplicate headers found: ${duplicates.join(', ')}`);
  }
  
  // Check for empty headers
  const emptyCount = headers.filter(header => !header || header.trim() === '').length;
  if (emptyCount > 0) {
    errors.push(`CSV contains ${emptyCount} empty header column(s)`);
  }
  
  // Very lenient check - only block extremely problematic headers
  const invalidHeaders = headers.filter(header => {
    const trimmed = header.trim();
    // Only block if header is too long or contains SQL injection characters
    return trimmed.length > 200 || /['"`;\\]/.test(trimmed);
  });
  
  if (invalidHeaders.length > 0) {
    errors.push(`Invalid header names: ${invalidHeaders.slice(0, 3).join(', ')}${invalidHeaders.length > 3 ? '...' : ''}`);
  }
  
  return { valid: errors.length === 0, errors };
}

// Helper function to validate CSV data with detailed error reporting
function validateCSVData(data: any[], headers: string[]): { valid: boolean; errors: string[]; errorDetails?: Array<{row: number; column: string; issue: string}> } {
  const errors: string[] = [];
  const errorDetails: Array<{row: number; column: string; issue: string}> = [];
  
  if (data.length === 0) {
    errors.push('CSV must contain at least one data row');
    return { valid: false, errors };
  }

  if (data.length > 10000) {
    errors.push('CSV contains too many rows (maximum 10,000 allowed)');
    return { valid: false, errors };
  }

  // Check for completely empty rows - but be lenient
  let emptyRowCount = 0;
  const nonEmptyRows: any[] = [];
  
  data.forEach((row, index) => {
    const values = Object.values(row);
    const hasAnyValue = values.some(val => val !== undefined && val !== null && String(val).trim() !== '');
    
    if (!hasAnyValue) {
      emptyRowCount++;
    } else {
      nonEmptyRows.push(row);
    }
  });

  // Only fail if ALL rows are empty
  if (nonEmptyRows.length === 0) {
    errors.push('All rows are empty - CSV must contain some data');
    return { valid: false, errors };
  }

  // Just warn about empty rows, don't fail
  if (emptyRowCount > 0) {
    logger.warn(`Found ${emptyRowCount} empty rows in CSV, will skip them`);
  }

  return { valid: true, errors, errorDetails };
}

// Helper function to detect data type from value
function detectDataType(value: string): 'text' | 'email' | 'number' | 'date' | 'boolean' {
  if (!value || value.trim() === '') return 'text';
  
  // Email detection
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailRegex.test(value)) return 'email';
  
  // Number detection
  if (!isNaN(Number(value)) && !isNaN(parseFloat(value))) return 'number';
  
  // Boolean detection
  const lowerValue = value.toLowerCase();
  if (['true', 'false', 'yes', 'no', '1', '0'].includes(lowerValue)) return 'boolean';
  
  // Date detection (basic)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$|^\d{2}\/\d{2}\/\d{4}$/;
  if (dateRegex.test(value)) return 'date';
  
  return 'text';
}

// Helper function to sanitize column name for database
function sanitizeColumnName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/^(\d)/, '_$1') // Ensure doesn't start with number
    .substring(0, 50); // Limit length
}

// Helper function to sanitize user input data
function sanitizeUserData(data: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(data)) {
    // Reject null, undefined, or excessively large objects
    if (value === null || value === undefined) {
      sanitized[key] = null;
      continue;
    }

    // Convert to JSON string if object/array, then back to prevent deep nesting
    if (typeof value === 'object') {
      const jsonStr = JSON.stringify(value);
      if (jsonStr.length > 10000) {
        logger.warn(`Value for key "${key}" exceeds maximum length, truncating`);
        sanitized[key] = jsonStr.substring(0, 10000);
      } else {
        sanitized[key] = value;
      }
    } else if (typeof value === 'string') {
      // Limit string length to prevent DoS
      sanitized[key] = value.substring(0, 5000).trim();
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      sanitized[key] = value;
    } else {
      // For any other type, convert to string
      sanitized[key] = String(value).substring(0, 5000);
    }
  }
  
  return sanitized;
}

// Helper function to validate table schema
function validateTableSchema(schema: any[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!Array.isArray(schema) || schema.length === 0) {
    errors.push('Schema must be a non-empty array');
    return { valid: false, errors };
  }

  const validTypes = ['text', 'email', 'number', 'date', 'select', 'boolean'];
  const columnNames = new Set<string>();

  schema.forEach((col, idx) => {
    if (!col.name || typeof col.name !== 'string') {
      errors.push(`Column ${idx}: name is required and must be a string`);
    } else if (col.name.length > 100) {
      errors.push(`Column ${idx}: name exceeds maximum length`);
    } else if (columnNames.has(col.name)) {
      errors.push(`Column name "${col.name}" is duplicated`);
    } else {
      columnNames.add(col.name);
    }

    if (!col.type || !validTypes.includes(col.type)) {
      errors.push(`Column ${idx}: type must be one of ${validTypes.join(', ')}`);
    }

    if (typeof col.required !== 'boolean') {
      errors.push(`Column ${idx}: required must be a boolean`);
    }
  });

  return { valid: errors.length === 0, errors };
}

// Helper function to generate unique table name
async function generateUniqueTableName(baseName: string): Promise<string> {
  const db = getDatabase();
  let counter = 0;
  let tableName = baseName;
  
  while (true) {
    try {
      const existing = await db.get('SELECT id FROM tables WHERE name = ?', [tableName]);
      if (!existing) {
        return tableName;
      }
      counter++;
      tableName = `${baseName}_${counter}`;
    } catch (error) {
      logger.error('Error checking table name uniqueness:', error);
      throw error;
    }
  }
}

// Helper function to get SQL based on database type
function getSQL(sqliteQuery: string, postgresQuery: string): string {
  const dbType = process.env.DATABASE_TYPE || 'sqlite';
  return dbType === 'sqlite' ? sqliteQuery : postgresQuery;
}

// Create a new table
export const createTable = async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, schema } = req.body as CreateTableRequest;
    
    // Validate schema
    const schemaValidation = validateTableSchema(schema);
    if (!schemaValidation.valid) {
      logger.warn('Invalid schema provided:', schemaValidation.errors);
      return res.status(400).json({
        success: false,
        error: 'Invalid table schema',
        details: schemaValidation.errors
      });
    }

    // Validate table name
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Table name is required and must be a string'
      });
    }

    if (name.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Table name exceeds maximum length (100 characters)'
      });
    }

    // Check if table name is already taken
    const db = getDatabase();
    const existingTable = await db.get('SELECT id FROM tables WHERE name = ?', [name.trim()]);
    if (existingTable) {
      return res.status(409).json({
        success: false,
        error: 'Table name already exists. Please use a different name.'
      });
    }

    // PRODUCTION-SAFE: Database-only table creation
    const tableId = uuidv4();
    const schemaWithIds = schema.map(col => ({ ...col, id: uuidv4() }));
    
    try {
      const sql = getSQL(
        `INSERT INTO tables (id, name, description, schema, created_at, updated_at)
         VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`,
        `INSERT INTO tables (id, name, description, schema, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())`
      );
      
      await db.run(sql, [tableId, name.trim(), description || '', JSON.stringify(schemaWithIds)]);

      const newTable = {
        id: tableId,
        name: name.trim(),
        description,
        schema: schemaWithIds,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      logger.info(`Table created: ${name} (${tableId})`, {
        adminId: req.admin?.id,
        columnCount: schema.length
      });

      res.status(201).json({
        success: true,
        data: newTable
      });
    } catch (dbError) {
      logger.error('❌ Database query failed:', dbError);
      res.status(503).json({
        success: false,
        error: 'Database connection failed - Table creation unavailable'
      });
    }

  } catch (error) {
    logger.error('Create table error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create table'
    });
  }
};

// Get all tables
export const getTables = async (req: AuthRequest, res: Response) => {
  try {
    // PRODUCTION-SAFE: Database-only table retrieval
    const db = getDatabase();
    const tables = await db.all('SELECT * FROM tables ORDER BY created_at DESC');

    const formattedTables = await Promise.all(tables.map(async (row: any) => {
      // Get user count for each table
      const userCountResult = await db.get(
        'SELECT COUNT(*) as count FROM dynamic_users WHERE table_id = ?',
        [row.id]
      );
      
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        schema: JSON.parse(row.schema),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        userCount: userCountResult?.count || 0
      };
    }));

    res.json({
      success: true,
      data: formattedTables
    });

  } catch (error) {
    logger.error('Get tables error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tables'
    });
  }
};

// Get table by ID
export const getTableById = async (req: AuthRequest, res: Response) => {
  try {
    const { tableId } = req.params;
    const mockMode = process.env.DEV_MOCK === 'true';

    if (mockMode) {
      logger.warn('🚨 MOCK MODE: Mock table by ID');
      return res.status(404).json({
        success: false,
        error: 'Table not found (mock mode)'
      });
    }

    // PRODUCTION-SAFE: Database-only table retrieval
    const db = getDatabase();
    const table = await db.get('SELECT * FROM tables WHERE id = ?', [tableId]);

    if (!table) {
      return res.status(404).json({
        success: false,
        error: 'Table not found'
      });
    }

    const formattedTable = {
      id: table.id,
      name: table.name,
      description: table.description,
      schema: JSON.parse(table.schema),
      createdAt: table.created_at,
      updatedAt: table.updated_at
    };

    res.json({
      success: true,
      data: formattedTable
    });

  } catch (error) {
    logger.error('Get table by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch table'
    });
  }
};

// Get users for a specific table
export const getTableUsers = async (req: AuthRequest, res: Response) => {
  try {
    const { tableId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const search = req.query.search as string;
    const offset = (page - 1) * limit;

    // PRODUCTION-SAFE: Database-only user retrieval
    try {
      const db = getDatabase();
      
      // Verify table exists
      const table = await db.get('SELECT * FROM tables WHERE id = ?', [tableId]);

      if (!table) {
        return res.status(404).json({
          success: false,
          error: 'Table not found'
        });
      }

      // Build search query
      let searchCondition = '';
      let queryParams = [tableId];
      
      if (search) {
        searchCondition = `AND data LIKE ?`;
        queryParams.push(`%${search}%`);
      }

      // Get total count
      const countResult = await db.get(
        `SELECT COUNT(*) as count FROM dynamic_users WHERE table_id = ? ${searchCondition}`,
        queryParams
      );
      const total = countResult?.count || 0;

      // Get paginated users
      const users = await db.all(
        `SELECT * FROM dynamic_users 
         WHERE table_id = ? ${searchCondition}
         ORDER BY created_at DESC 
         LIMIT ? OFFSET ?`,
        [...queryParams, limit, offset]
      );

      const formattedUsers = users.map((row: any) => ({
        id: row.id,
        tableId: row.table_id,
        uuid: row.uuid,
        data: JSON.parse(row.data),
        photoUrl: row.photo_url,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));

      const totalPages = Math.ceil(total / limit);

      res.json({
        success: true,
        data: {
          data: formattedUsers,
          total,
          page,
          limit,
          totalPages
        }
      });

    } catch (dbError) {
      logger.error('❌ Database query failed:', dbError);
      res.status(503).json({
        success: false,
        error: 'Database connection failed - Table users unavailable'
      });
    }

  } catch (error) {
    logger.error('Get table users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch table users'
    });
  }
};

// Add user to table
export const addUserToTable = async (req: AuthRequest, res: Response) => {
  try {
    const { tableId } = req.params;
    const { data } = req.body;
    
    logger.info('Adding user to table', {
      tableId,
      hasData: !!data,
      hasPhoto: !!req.file,
      adminId: req.admin?.id
    });

    // Process image through ImageService if provided
    let photoUrl: string | undefined = undefined;
    if (req.file) {
      try {
        photoUrl = await ImageService.processAndSaveImage(req.file);
        logger.info('Image processed for user:', { photoUrl });
      } catch (imageError) {
        logger.warn('Image processing failed, continuing without photo:', imageError);
        // Continue without photo
      }
    }

    // Validate that data is provided and is valid JSON
    if (!data) {
      logger.error('No data provided for user creation');
      return res.status(400).json({
        success: false,
        error: 'User data is required'
      });
    }

    let parsedData;
    try {
      parsedData = JSON.parse(data);
    } catch (parseError) {
      logger.error('Invalid JSON data provided:', parseError);
      return res.status(400).json({
        success: false,
        error: 'Invalid user data format'
      });
    }

    // Sanitize user data to prevent injection and excessive data
    const sanitizedData = sanitizeUserData(parsedData);

    // Validate image file if provided
    if (req.file) {
      const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.avif'];
      const fileExt = path.extname(req.file.originalname).toLowerCase();

      if (!allowedMimeTypes.includes(req.file.mimetype) || 
          !allowedExtensions.includes(fileExt)) {
        logger.warn(`Invalid image type attempted: ${req.file.mimetype}`);
        return res.status(400).json({
          success: false,
          error: 'Invalid image format. Allowed: JPG, PNG, WebP, AVIF'
        });
      }

      // Check file size (max 5MB)
      const maxFileSize = 5 * 1024 * 1024; // 5MB
      if (req.file.size > maxFileSize) {
        logger.warn(`Image file too large: ${req.file.size} bytes`);
        return res.status(400).json({
          success: false,
          error: 'Image file too large. Maximum size: 5MB'
        });
      }
    }

    // PRODUCTION-SAFE: Database-only user creation (no mock mode fallback)
    try {
      const db = getDatabase();
      
      // Verify table exists
      const table = await db.get('SELECT * FROM tables WHERE id = ?', [tableId]);

      if (!table) {
        logger.error('Table not found:', tableId);
        return res.status(404).json({
          success: false,
          error: 'Table not found'
        });
      }

      const userId = uuidv4();
      const userUuid = uuidv4();

      const sql = getSQL(
        `INSERT INTO dynamic_users (id, table_id, uuid, data, photo_url, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        `INSERT INTO dynamic_users (id, table_id, uuid, data, photo_url, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`
      );

      // Use JSON string representation of sanitized data
      const dataString = JSON.stringify(sanitizedData);

      await db.run(sql, [userId, tableId, userUuid, dataString, photoUrl || null]);

      const newUser = {
        id: userId,
        tableId,
        uuid: userUuid,
        data: sanitizedData,
        photoUrl,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      logger.info(`User added to table successfully: ${userId} in table ${tableId}`);

      res.status(201).json({
        success: true,
        data: newUser
      });

    } catch (dbError) {
      logger.error('❌ Database error adding user to table:', dbError);
      res.status(503).json({
        success: false,
        error: 'Database connection failed - User creation unavailable'
      });
    }

  } catch (error) {
    logger.error('Add user to table error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add user to table'
    });
  }
};

// Update user in table
export const updateUserInTable = async (req: AuthRequest, res: Response) => {
  try {
    const { tableId, userId } = req.params;
    const { data } = req.body;
    const mockMode = process.env.DEV_MOCK === 'true';

    // Process image through ImageService if provided
    let photoUrl: string | undefined = undefined;
    if (req.file) {
      try {
        photoUrl = await ImageService.processAndSaveImage(req.file);
        logger.info('Image processed for user update:', { photoUrl });
      } catch (imageError) {
        logger.warn('Image processing failed, continuing without photo:', imageError);
        // Continue without photo
      }
    }

    if (mockMode) {
      logger.warn('🚨 MOCK MODE: Mock user update');
      return res.json({
        success: true,
        data: {
          id: userId,
          tableId,
          uuid: 'mock-uuid',
          data: JSON.parse(data),
          photoUrl,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
    }

    // PRODUCTION-SAFE: Database-only user update
    try {
      const db = getDatabase();
      
      // Verify table and user exist
      const table = await db.get('SELECT * FROM tables WHERE id = ?', [tableId]);

      if (!table) {
        return res.status(404).json({
          success: false,
          error: 'Table not found'
        });
      }

      const user = await db.get('SELECT * FROM dynamic_users WHERE id = ? AND table_id = ?', [userId, tableId]);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Update user
      const updatePhotoUrl = photoUrl || user.photo_url;

      const sql = getSQL(
        `UPDATE dynamic_users 
         SET data = ?, photo_url = ?, updated_at = datetime('now')
         WHERE id = ? AND table_id = ?`,
        `UPDATE dynamic_users 
         SET data = $1, photo_url = $2, updated_at = NOW()
         WHERE id = $3 AND table_id = $4`
      );

      await db.run(sql, [data, updatePhotoUrl, userId, tableId]);

      const updatedUser = {
        id: userId,
        tableId,
        uuid: user.uuid,
        data: JSON.parse(data),
        photoUrl: updatePhotoUrl,
        createdAt: user.created_at,
        updatedAt: new Date()
      };

      logger.info(`User updated in table ${tableId}: ${userId}`);

      res.json({
        success: true,
        data: updatedUser
      });

    } catch (dbError) {
      logger.error('❌ Database query failed:', dbError);
      res.status(503).json({
        success: false,
        error: 'Database connection failed - User update unavailable'
      });
    }

  } catch (error) {
    logger.error('Update user in table error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user'
    });
  }
};

// Delete user from table
export const deleteUserFromTable = async (req: AuthRequest, res: Response) => {
  try {
    const { tableId, userId } = req.params;
    const mockMode = process.env.DEV_MOCK === 'true';

    if (mockMode) {
      logger.warn('🚨 MOCK MODE: Mock user deletion');
      return res.json({
        success: true,
        message: 'User deleted (mock mode)'
      });
    }

    // PRODUCTION-SAFE: Database-only user deletion
    try {
      const db = getDatabase();
      
      // Verify user exists in table
      const user = await db.get('SELECT * FROM dynamic_users WHERE id = ? AND table_id = ?', [userId, tableId]);

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Delete user
      await db.run('DELETE FROM dynamic_users WHERE id = ? AND table_id = ?', [userId, tableId]);

      logger.info(`User deleted from table ${tableId}: ${userId}`);

      res.json({
        success: true,
        message: 'User deleted successfully'
      });

    } catch (dbError) {
      logger.error('❌ Database query failed:', dbError);
      res.status(503).json({
        success: false,
        error: 'Database connection failed - User deletion unavailable'
      });
    }

  } catch (error) {
    logger.error('Delete user from table error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user'
    });
  }
};

// Bulk import users to table
export const bulkImportUsers = async (req: AuthRequest, res: Response) => {
  try {
    const { tableId } = req.params;
    const { users } = req.body;
    const mockMode = process.env.DEV_MOCK === 'true';

    if (mockMode) {
      logger.warn('🚨 MOCK MODE: Mock bulk import');
      return res.json({
        success: true,
        data: {
          imported: users.length,
          failed: 0,
          total: users.length
        }
      });
    }

    // PRODUCTION-SAFE: Database-only bulk import
    try {
      const db = getDatabase();
      
      // Verify table exists
      const table = await db.get('SELECT * FROM tables WHERE id = ?', [tableId]);

      if (!table) {
        return res.status(404).json({
          success: false,
          error: 'Table not found'
        });
      }

      let imported = 0;
      let failed = 0;

      // Process users one by one
      for (const userData of users) {
        try {
          const userId = uuidv4();
          const userUuid = uuidv4();

          const sql = getSQL(
            `INSERT INTO dynamic_users (id, table_id, uuid, data, created_at, updated_at)
             VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`,
            `INSERT INTO dynamic_users (id, table_id, uuid, data, created_at, updated_at)
             VALUES ($1, $2, $3, $4, NOW(), NOW())`
          );

          await db.run(sql, [userId, tableId, userUuid, JSON.stringify(userData)]);
          imported++;
        } catch (userError) {
          logger.error('Failed to import user:', userError);
          failed++;
        }
      }

      logger.info(`Bulk import completed: ${imported} imported, ${failed} failed`);

      res.json({
        success: true,
        data: {
          imported,
          failed,
          total: users.length
        }
      });

    } catch (dbError) {
      logger.error('❌ Database query failed:', dbError);
      res.status(503).json({
        success: false,
        error: 'Database connection failed - Bulk import unavailable'
      });
    }

  } catch (error) {
    logger.error('Bulk import users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk import users'
    });
  }
};

// CSV Preview - Parse and validate without importing
export const previewCSV = async (req: AuthRequest, res: Response) => {
  try {
    logger.info('📋 CSV Preview started', { 
      adminId: req.admin?.id,
      filename: req.file?.originalname 
    });
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No CSV file provided'
      });
    }

    const fileName = req.file.originalname;
    logger.info(`📁 Processing file for preview: ${fileName}`);
    
    const fileContent = await fs.readFile(req.file.path, 'utf-8');
    logger.info(`📄 File content length: ${fileContent.length} characters`);
    
    // Parse CSV content
    const csvData = await new Promise<any[]>((resolve, reject) => {
      const results: any[] = [];
      const stream = Readable.from([fileContent]);
      
      stream
        .pipe(csv())
        .on('data', (data) => {
          results.push(data);
        })
        .on('end', () => {
          logger.info(`📊 Parsed ${results.length} rows from CSV`);
          resolve(results);
        })
        .on('error', (error) => {
          logger.error('❌ CSV parsing error:', error);
          reject(error);
        });
    });
    
    if (!csvData || !Array.isArray(csvData) || csvData.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or empty CSV data'
      });
    }

    // Extract headers from first row
    const headers = Object.keys(csvData[0]);
    if (headers.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'CSV must have headers'
      });
    }

    // Validate CSV headers
    const headerValidation = validateCSVHeaders(headers);
    if (!headerValidation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid CSV headers',
        details: headerValidation.errors
      });
    }

    // Validate CSV data
    const dataValidation = validateCSVData(csvData, headers);
    if (!dataValidation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid CSV data',
        details: dataValidation.errors,
        errorDetails: dataValidation.errorDetails || []
      });
    }

    // Generate table name from filename
    const baseName = fileName.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, '_');
    const suggestedTableName = await generateUniqueTableName(baseName);

    // Detect column types from data with better sampling
    const schema = headers.map(header => {
      const sampleSize = Math.min(csvData.length, 20);
      const sampleValues = csvData.slice(0, sampleSize)
        .map(row => row[header])
        .filter(val => val != null && val !== '');
      
      let detectedType: 'text' | 'email' | 'number' | 'date' | 'boolean' = 'text';
      
      if (sampleValues.length > 0) {
        const types = sampleValues.map(val => detectDataType(String(val)));
        const typeCounts = types.reduce((acc, type) => {
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        detectedType = Object.keys(typeCounts).reduce((a, b) => 
          typeCounts[a] > typeCounts[b] ? a : b
        ) as typeof detectedType;
      }

      return {
        id: uuidv4(),
        name: header,
        type: detectedType,
        required: false
      };
    });

    // Get preview data (first 10 rows)
    const previewData = csvData.slice(0, 10);

    // Clean up uploaded file
    try {
      await fs.unlink(req.file.path);
    } catch (cleanupError) {
      logger.warn('⚠️  Failed to clean up preview file:', cleanupError);
    }

    const response = {
      fileName,
      suggestedTableName,
      headers,
      schema,
      totalRows: csvData.length,
      previewData,
      validation: {
        headers: headerValidation,
        data: dataValidation
      }
    };

    logger.info(`✅ CSV preview completed: ${headers.length} columns, ${csvData.length} rows`);

    res.json({
      success: true,
      data: response
    });

  } catch (error) {
    logger.error('❌ CSV preview error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to preview CSV: ' + (error instanceof Error ? error.message : 'Unknown error')
    });
  }
};

// CSV Upload and Auto Table Creation
export const uploadCSVAndCreateTable = async (req: AuthRequest, res: Response) => {
  try {
    logger.info('📤 CSV Upload started', { 
      adminId: req.admin?.id,
      filename: req.file?.originalname 
    });
    
    // Handle both file upload and direct CSV data
    let csvData: any[] = [];
    let fileName = '';

    if (req.file) {
      // File upload from Dashboard
      fileName = req.file.originalname;
      logger.info(`📁 Processing file: ${fileName}`);
      
      const fileContent = await fs.readFile(req.file.path, 'utf-8');
      logger.info(`📄 File content length: ${fileContent.length} characters`);
      
      // Parse CSV content
      csvData = await new Promise((resolve, reject) => {
        const results: any[] = [];
        const stream = Readable.from([fileContent]);
        
        stream
          .pipe(csv())
          .on('data', (data) => {
            results.push(data);
          })
          .on('end', () => {
            logger.info(`📊 Parsed ${results.length} rows from CSV`);
            resolve(results);
          })
          .on('error', (error) => {
            logger.error('❌ CSV parsing error:', error);
            reject(error);
          });
      });
    } else if (req.body.csvData) {
      // Direct CSV data (for API calls)
      csvData = req.body.csvData;
      fileName = req.body.fileName || 'uploaded_file.csv';
      logger.info(`📊 Direct CSV data: ${csvData.length} rows`);
    } else {
      logger.error('❌ No CSV file or data provided');
      return res.status(400).json({
        success: false,
        error: 'No CSV file or data provided'
      });
    }
    
    if (!csvData || !Array.isArray(csvData) || csvData.length === 0) {
      logger.error('❌ Invalid or empty CSV data');
      return res.status(400).json({
        success: false,
        error: 'Invalid or empty CSV data'
      });
    }

    // Extract headers from first row
    const headers = Object.keys(csvData[0]);
    if (headers.length === 0) {
      logger.error('❌ CSV has no headers');
      return res.status(400).json({
        success: false,
        error: 'CSV must have headers'
      });
    }

    // Validate CSV headers
    const headerValidation = validateCSVHeaders(headers);
    if (!headerValidation.valid) {
      logger.error('❌ CSV header validation failed:', headerValidation.errors);
      return res.status(400).json({
        success: false,
        error: 'Invalid CSV headers',
        details: headerValidation.errors
      });
    }

    // Validate CSV data
    const dataValidation = validateCSVData(csvData, headers);
    if (!dataValidation.valid) {
      logger.error('❌ CSV data validation failed:', dataValidation.errors);
      return res.status(400).json({
        success: false,
        error: 'Invalid CSV data',
        details: dataValidation.errors,
        errorDetails: dataValidation.errorDetails || []
      });
    }

    // Filter out empty rows
    const filteredData = csvData.filter(row => {
      const values = Object.values(row);
      return values.some(val => val !== undefined && val !== null && String(val).trim() !== '');
    });

    logger.info(`📋 CSV headers: ${headers.join(', ')}`);
    logger.info(`📊 Filtered data: ${filteredData.length} non-empty rows (${csvData.length - filteredData.length} empty rows removed)`);

    // Generate table name - use provided name or generate from filename
    let tableName: string;
    
    if (req.body.tableName && req.body.tableName.trim()) {
      // Use the table name provided by user (from frontend)
      const userProvidedName = req.body.tableName.trim().replace(/[^a-zA-Z0-9_\s]/g, '_');
      tableName = await generateUniqueTableName(userProvidedName);
      logger.info(`🏷️  Using user-provided table name: ${tableName}`);
    } else {
      // Generate from filename as fallback
      const baseName = fileName ? 
        fileName.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, '_') : 
        'imported_table';
      
      tableName = await generateUniqueTableName(baseName);
      logger.info(`🏷️  Generated table name from filename: ${tableName}`);
    }

    // Detect column types from data with better sampling
    const schema = headers.map(header => {
      // Sample more rows for better type detection
      const sampleSize = Math.min(filteredData.length, 20);
      const sampleValues = filteredData.slice(0, sampleSize)
        .map(row => row[header])
        .filter(val => val != null && val !== '');
      
      let detectedType: 'text' | 'email' | 'number' | 'date' | 'boolean' = 'text';
      
      if (sampleValues.length > 0) {
        const types = sampleValues.map(val => detectDataType(String(val)));
        // Use most common type
        const typeCounts = types.reduce((acc, type) => {
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        detectedType = Object.keys(typeCounts).reduce((a, b) => 
          typeCounts[a] > typeCounts[b] ? a : b
        ) as typeof detectedType;
      }

      return {
        id: uuidv4(),
        name: header,
        type: detectedType,
        required: false
      };
    });

    logger.info(`🔧 Schema detected: ${schema.map(s => `${s.name}:${s.type}`).join(', ')}`);

    // Create table
    const db = getDatabase();
    const tableId = uuidv4();
    logger.info(`🆔 Creating table with ID: ${tableId}`);
    
    const createTableSQL = getSQL(
      `INSERT INTO tables (id, name, description, schema, created_at, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`,
      `INSERT INTO tables (id, name, description, schema, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())`
    );

    await db.run(createTableSQL, [
      tableId, 
      tableName, 
      `Auto-created from CSV: ${fileName}`,
      JSON.stringify(schema)
    ]);

    logger.info(`✅ Table created successfully: ${tableName}`);

    // Insert users with batch processing for better performance
    let imported = 0;
    let failed = 0;
    const batchSize = 100;
    logger.info(`👥 Starting to import ${filteredData.length} users in batches of ${batchSize}...`);

    const insertUserSQL = getSQL(
      `INSERT INTO dynamic_users (id, table_id, uuid, data, created_at, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`,
      `INSERT INTO dynamic_users (id, table_id, uuid, data, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())`
    );

    // Process in batches for better performance
    for (let i = 0; i < filteredData.length; i += batchSize) {
      const batch = filteredData.slice(i, i + batchSize);
      
      for (const [batchIndex, rowData] of batch.entries()) {
        try {
          const userId = uuidv4();
          const userUuid = uuidv4();

          await db.run(insertUserSQL, [userId, tableId, userUuid, JSON.stringify(rowData)]);
          imported++;
        } catch (userError) {
          logger.error(`❌ Failed to import CSV row ${i + batchIndex + 1}:`, userError);
          failed++;
        }
      }
      
      // Log progress for large imports
      if (filteredData.length > 1000) {
        logger.info(`📊 Progress: ${Math.min(i + batchSize, filteredData.length)}/${filteredData.length} rows processed`);
      }
    }

    // Clean up uploaded file if it exists
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
        logger.info('🗑️  Cleaned up uploaded file');
      } catch (cleanupError) {
        logger.warn('⚠️  Failed to clean up uploaded file:', cleanupError);
      }
    }

    logger.info(`✅ CSV import completed: Table "${tableName}" created with ${imported} users (${failed} failed)`);

    const responseData = {
      table: {
        id: tableId,
        name: tableName,
        description: `Auto-created from CSV: ${fileName}`,
        schema,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      imported,
      failed,
      total: filteredData.length,
      tableName,
      created: imported,
      message: `Successfully created table "${tableName}" with ${imported} users`
    };

    res.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    logger.error('❌ CSV upload and table creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process CSV upload: ' + (error instanceof Error ? error.message : 'Unknown error')
    });
  }
};

// Generate ID cards for table users
export const generateTableIDCards = async (req: AuthRequest, res: Response) => {
  try {
    const { tableId } = req.params;
    const mockMode = process.env.DEV_MOCK === 'true';

    if (mockMode) {
      logger.warn('🚨 MOCK MODE: Mock ID card generation');
      return res.json({
        success: true,
        data: {
          downloadUrl: '/mock-id-cards.zip',
          count: 0
        }
      });
    }

    const db = getDatabase();
    
    // Get table and users
    logger.info('🔍 Fetching table details for ID card generation', { tableId });
    const table = await db.get('SELECT * FROM tables WHERE id = ?', [tableId]);

    if (!table) {
      return res.status(404).json({
        success: false,
        error: 'Table not found'
      });
    }

    logger.info('📋 Fetching users from table', { tableId, tableName: table.name });
    const users = await db.all('SELECT * FROM dynamic_users WHERE table_id = ?', [tableId]);

    if (users.length === 0) {
      logger.warn('⚠️  No users found in table', { tableId });
      return res.status(400).json({
        success: false,
        error: 'No users found in table'
      });
    }

    logger.info(`✅ Found ${users.length} users for ID card generation`, { tableId });

    // Generate ID cards
    const zipFileName = `${table.name}_id_cards_${Date.now()}.zip`;
    const zipPath = path.join(__dirname, '../../temp', zipFileName);
    
    logger.info('📦 Starting bulk ID card generation', { tableId, userCount: users.length, zipPath });
    
    // Ensure temp directory exists
    await fs.mkdir(path.dirname(zipPath), { recursive: true });

    // Wrap archive operations in a Promise
    return new Promise((resolve, reject) => {
      const output = require('fs').createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      // Handle archive errors
      archive.on('error', (err: any) => {
        logger.error('❌ Archive creation error:', { error: err.message, code: err.code });
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: 'Failed to create zip file',
            details: err instanceof Error ? err.message : String(err)
          });
        }
        reject(err);
      });

      // Handle stream errors
      output.on('error', (err: any) => {
        logger.error('❌ File stream error:', { error: err.message, code: err.code });
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: 'Failed to write zip file',
            details: err instanceof Error ? err.message : String(err)
          });
        }
        reject(err);
      });

      // Handle completion
      output.on('close', () => {
        const size = archive.pointer();
        logger.info('✅ Zip file created successfully', { 
          zipFileName, 
          size,
          userCount: users.length,
          downloadUrl: `/temp/${zipFileName}`
        });
        res.json({
          success: true,
          data: {
            downloadUrl: `/temp/${zipFileName}`,
            count: users.length,
            size: archive.pointer()
          }
        });
        resolve(true);
      });

      archive.pipe(output);

      // Generate PDF for each user
      (async () => {
        let successCount = 0;
        let failureCount = 0;

        for (const user of users) {
          try {
            logger.info('🎨 Generating ID card for user', { 
              userId: user.id,
              userName: user.data && (typeof user.data === 'string' ? JSON.parse(user.data).fullName : user.data.fullName)
            });
            
            // Parse user data - handle both string and object formats
            let userData;
            if (typeof user.data === 'string') {
              userData = JSON.parse(user.data);
            } else {
              userData = user.data;
            }
            
            // Generate QR code with ID (for verification lookup)
            logger.info('🔲 Generating QR code', { userId: user.id, tableId });
            const qrResult = await QRService.generateSecureQR(user.id, tableId);
            logger.info('✅ QR code generated', { userUuid: user.uuid });
            
            // Generate PDF
            logger.info('📄 Generating PDF', { userId: user.id, userName: userData.fullName });
            const pdfBuffer = await PDFService.generateIDCard({
              id: user.uuid,
              tableId: tableId,
              name: userData.fullName || userData.name || 'Unknown User',
              role: userData.role || 'Member',
              department: userData.department || '',
              photoUrl: user.photo_url,
              qrCode: qrResult.qrData,
              issuedDate: new Date(user.created_at)
            }, undefined, table.name);

            logger.info('✅ PDF generated successfully', { 
              userId: user.id, 
              bufferSize: pdfBuffer.length,
              format: 'pdf'
            });

            const fileName = `${(userData.fullName || user.uuid).replace(/[^a-zA-Z0-9]/g, '_')}_id_card.pdf`;
            archive.append(pdfBuffer, { name: fileName });
            successCount++;
          } catch (cardError) {
            failureCount++;
            logger.error(`❌ Failed to generate ID card for user ${user.id}:`, {
              error: cardError instanceof Error ? cardError.message : String(cardError),
              stack: cardError instanceof Error ? cardError.stack : undefined,
              userId: user.id
            });
            // Continue with next user instead of failing entire batch
          }
        }
        
        logger.info(`📊 ID card generation complete`, {
          total: users.length,
          success: successCount,
          failed: failureCount
        });
        
        // Finalize archive after all PDFs are processed
        await archive.finalize();
      })().catch((err) => {
        logger.error('❌ ID card batch generation error:', {
          error: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined
        });
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: 'Failed to generate ID cards',
            details: err instanceof Error ? err.message : String(err)
          });
        }
        reject(err);
      });
    });

  } catch (error) {
    logger.error('❌ Generate table ID cards error:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      tableId: req.params.tableId
    });
    res.status(500).json({
      success: false,
      error: 'Failed to generate ID cards',
      details: error instanceof Error ? error.message : String(error)
    });
  }
};

// Generate custom ID card for user
export const generateCustomIDCard = async (req: AuthRequest, res: Response) => {
  try {
    const { tableId, userId } = req.params;
    let { format = 'pdf', options } = req.body;
    const mockMode = process.env.DEV_MOCK === 'true';

    logger.info(`📌 CHECKPOINT 0: Starting custom ID card generation`, { tableId, userId, format });

    if (mockMode) {
      logger.warn('🚨 MOCK MODE: Mock custom ID card generation');
      return res.json({
        success: true,
        data: {
          downloadUrl: `/mock-custom-id-card.${format}`,
          format
        }
      });
    }

    const db = getDatabase();
    
    // Get table and user
    logger.info(`📌 CHECKPOINT 1: Fetching table from database`);
    const table = await db.get('SELECT * FROM tables WHERE id = ?', [tableId]);
    if (!table) {
      logger.error(`❌ CHECKPOINT 1a: Table not found`, { tableId });
      return res.status(404).json({
        success: false,
        error: 'Table not found'
      });
    }
    logger.info(`✅ CHECKPOINT 1b: Table fetched`, { tableId, tableName: table.name });

    logger.info(`📌 CHECKPOINT 2: Fetching user from database`);
    const user = await db.get('SELECT * FROM dynamic_users WHERE id = ? AND table_id = ?', [userId, tableId]);
    if (!user) {
      logger.error(`❌ CHECKPOINT 2a: User not found`, { userId, tableId });
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    logger.info(`✅ CHECKPOINT 2b: User fetched`, { userId, userUuid: user.uuid });

    logger.info(`📊 User object details:`, {
      userId,
      userUuid: user.uuid,
      userKeys: Object.keys(user),
      userIdFromDb: user.id,
      userTableId: user.table_id,
      userDataLength: user.data?.length || 0
    });

    // If no options provided, use table's ID card config
    logger.info(`📌 CHECKPOINT 3: Processing ID card options`);
    if (!options) {
      let idCardConfig;
      if (table.id_card_config) {
        try {
          idCardConfig = JSON.parse(table.id_card_config);
          logger.info(`✅ CHECKPOINT 3a: Parsed id_card_config from table`);
        } catch (error) {
          logger.warn(`⚠️ CHECKPOINT 3a: Failed to parse id_card_config for table ${tableId}`, error);
        }
      }

      // If table has config, use it
      if (idCardConfig) {
        options = {
          visibleFields: idCardConfig.visibleFields || [],
          showPhoto: idCardConfig.showPhoto !== undefined ? idCardConfig.showPhoto : true,
          layout: idCardConfig.layout || 'standard',
          theme: idCardConfig.theme || 'light'
        };
        logger.info(`✅ CHECKPOINT 3b: Using table configuration`);
      } else {
        // Default: show all fields
        options = {
          visibleFields: {
            name: true,
            role: true,
            department: true,
            email: true,
            tableName: true,
            photo: true,
            customFields: {}
          },
          layout: 'standard',
          theme: 'light'
        };
      }
    } else {
      // Ensure visibleFields exists with defaults
      if (!options.visibleFields) {
        options.visibleFields = {
          name: true,
          role: true,
          department: true,
          email: true,
          tableName: true,
          photo: true,
          customFields: {}
        };
      }
      // Set defaults for layout and theme
      if (!options.layout) options.layout = 'standard';
      if (!options.theme) options.theme = 'light';
    }
    logger.info(`✅ CHECKPOINT 3c: Options processed`, { layout: options.layout, theme: options.theme });

    logger.info(`📌 CHECKPOINT 4: Parsing user data`);
    let userData;
    try {
      userData = JSON.parse(user.data);
      logger.info(`✅ CHECKPOINT 4a: User data parsed`, { dataKeys: Object.keys(userData) });
    } catch (parseError: any) {
      logger.error(`❌ CHECKPOINT 4a FAILED: Cannot parse user data`, {
        error: parseError?.message,
        userDataRaw: user.data?.substring(0, 100)
      });
      throw new Error(`Failed to parse user data: ${parseError?.message}`);
    }

    logger.info(`📌 CHECKPOINT 5: Generating QR code`);
    let qrResult;
    try {
      // Use user.id for QR generation (verification searches by user.id)
      qrResult = await QRService.generateSecureQR(user.id, tableId);
      logger.info(`✅ CHECKPOINT 5a: QR code generated`, { qrDataLength: qrResult.qrData?.length || 0, userId: user.id });
    } catch (qrError: any) {
      logger.error(`❌ CHECKPOINT 5a FAILED: QR code generation error`, {
        error: qrError instanceof Error ? qrError.message : String(qrError),
        stack: qrError instanceof Error ? qrError.stack : undefined,
        userId: user.id,
        tableId
      });
      throw new Error(`QR code generation failed: ${qrError?.message || String(qrError)}`);
    }
    
    // Build card data - handle both array-based and object-based visibleFields
    logger.info(`📌 CHECKPOINT 6: Building card data object`);
    const cardData = {
      id: user.id,  // Use internal database ID for foreign key constraint
      uuid: user.uuid,  // Keep UUID for display/reference
      tableId: tableId,
      name: '',
      role: '',
      department: '',
      email: '',
      tableName: table.name,
      photoUrl: null as string | null,
      qrCode: qrResult.qrData,
      issuedDate: new Date(user.created_at),
      customFields: {} as Record<string, any>,
      layout: options.layout || 'standard',
      theme: options.theme || 'light'
    };
    logger.info(`✅ CHECKPOINT 6a: Card data object created`);

    logger.info(`🎨 Generating ID card for user ${user.uuid}`, {
      tableId,
      visibleFieldsType: Array.isArray(options.visibleFields) ? 'array' : 'object',
      visibleFields: options.visibleFields,
      userData: Object.keys(userData),
      userDataValues: userData
    });

    // FULLY DYNAMIC: Handle array-based visibleFields (from table config)
    if (Array.isArray(options.visibleFields)) {
      // Simply map ALL selected fields directly to customFields
      // The first field becomes the name, rest go to customFields
      let isFirstField = true;
      
      // System fields that should never be displayed as text
      const systemFields = ['photo', 'photoUrl', 'photo_url', 'id', 'uuid', 'tableId', 'table_id', 'qrCode', 'qr_code', 'createdAt', 'created_at', 'updatedAt', 'updated_at'];
      
      options.visibleFields.forEach((fieldName: string) => {
        const fieldValue = userData[fieldName];
        
        // Skip system fields
        if (systemFields.includes(fieldName) || fieldName.toLowerCase().includes('photo') || fieldName.toLowerCase().includes('id')) {
          logger.info(`⏭️ Skipping system field: ${fieldName}`);
          return;
        }
        
        if (fieldValue !== undefined && fieldValue !== null && fieldValue !== '' && typeof fieldValue !== 'object') {
          if (isFirstField) {
            // First selected field becomes the primary name
            cardData.name = String(fieldValue);
            logger.info(`✅ Using ${fieldName} as primary name: ${fieldValue}`);
            isFirstField = false;
          }
          
          // Add ALL fields to customFields for display
          (cardData.customFields as Record<string, any>)[fieldName] = fieldValue;
          logger.info(`✅ Added ${fieldName}: ${fieldValue}`);
        }
      });
      
      cardData.photoUrl = options.showPhoto ? user.photo_url : null;
    } else {
      // Handle object-based visibleFields (legacy format - should not be used)
      logger.warn('⚠️ Using legacy object-based visibleFields format');
      
      // Just take all userData and put in customFields
      Object.keys(userData).forEach(fieldName => {
        const fieldValue = userData[fieldName];
        if (fieldValue !== undefined && fieldValue !== null && fieldValue !== '') {
          if (!cardData.name) {
            cardData.name = String(fieldValue);
          }
          (cardData.customFields as Record<string, any>)[fieldName] = fieldValue;
        }
      });
      
      cardData.photoUrl = options.visibleFields.photo ? user.photo_url : null;
    }

    // Fallback: If no name set, use first available field
    if (!cardData.name) {
      const firstField = Object.keys(userData)[0];
      if (firstField && userData[firstField]) {
        cardData.name = String(userData[firstField]);
        logger.info(`✅ Fallback: Using ${firstField} as name: ${cardData.name}`);
      } else {
        cardData.name = 'No Data';
        logger.warn(`⚠️ No data found in user record`);
      }
    }

    logger.info(`📋 Final card data:`, {
      name: cardData.name,
      customFieldsCount: Object.keys(cardData.customFields).length,
      customFields: cardData.customFields
    });

    logger.info(`📌 CHECKPOINT 7: Generating PDF from card data`);
    let cardBuffer;
    try {
      if (format === 'pdf') {
        cardBuffer = await PDFService.generateCustomIDCard(cardData);
      } else {
        // For JPEG format, we'll use the PDF service and convert
        cardBuffer = await PDFService.generateCustomIDCard(cardData);
      }
      logger.info(`✅ CHECKPOINT 7a: PDF generated successfully`, { bufferSize: cardBuffer?.length || 0 });
    } catch (pdfError: any) {
      logger.error(`❌ CHECKPOINT 7a: PDF generation failed`, {
        error: pdfError instanceof Error ? pdfError.message : String(pdfError),
        stack: pdfError instanceof Error ? pdfError.stack : undefined
      });
      throw pdfError;
    }

    logger.info(`📌 CHECKPOINT 8: Sending response with PDF buffer`);
    const fileName = `${cardData.name.replace(/[^a-zA-Z0-9]/g, '_')}_id_card.${format}`;
    
    res.setHeader('Content-Type', format === 'pdf' ? 'application/pdf' : 'image/jpeg');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(cardBuffer);
    logger.info(`✅ CHECKPOINT 8a: Response sent successfully`);

  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    logger.error('❌ Generate custom ID card error:', {
      errorType: error?.constructor?.name || typeof error,
      errorMessage,
      errorStack,
      tableId: req.params.tableId,
      userId: req.params.userId,
      fullError: String(error)
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to generate custom ID card',
      details: errorMessage,
      errorType: error?.constructor?.name || 'Unknown'
    });
  }
};

// Generate bulk download with customization
export const generateBulkDownloadCustom = async (req: AuthRequest, res: Response) => {
  try {
    const { tableId } = req.params;
    const { userIds, format, options } = req.body;
    const mockMode = process.env.DEV_MOCK === 'true';

    if (mockMode) {
      logger.warn('🚨 MOCK MODE: Mock bulk custom download');
      return res.json({
        success: true,
        data: {
          downloadUrl: '/mock-bulk-custom-cards.zip',
          count: userIds.length
        }
      });
    }

    const db = getDatabase();
    
    // Get table
    const table = await db.get('SELECT * FROM tables WHERE id = ?', [tableId]);
    if (!table) {
      return res.status(404).json({
        success: false,
        error: 'Table not found'
      });
    }

    // Get users
    const placeholders = userIds.map(() => '?').join(',');
    const users = await db.all(
      `SELECT * FROM dynamic_users WHERE table_id = ? AND id IN (${placeholders})`,
      [tableId, ...userIds]
    );

    if (users.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No users found'
      });
    }

    // Generate ZIP file
    const zipFileName = `${table.name}_custom_id_cards_${Date.now()}.zip`;
    const zipPath = path.join(__dirname, '../../temp', zipFileName);
    
    // Ensure temp directory exists
    await fs.mkdir(path.dirname(zipPath), { recursive: true });

    const output = require('fs').createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.pipe(output);

    for (const user of users) {
      try {
        const userData = JSON.parse(user.data);
        const qrResult = await QRService.generateSecureQR(user.id, tableId);
        
        // Generate custom card data
        const cardData = {
          id: user.uuid,
          tableId: tableId,
          name: options.visibleFields.name ? (userData.fullName || userData.name || 'Unknown User') : '',
          role: options.visibleFields.role ? (userData.role || '') : '',
          department: options.visibleFields.department ? (userData.department || '') : '',
          email: options.visibleFields.email ? (userData.email || '') : '',
          tableName: options.visibleFields.tableName ? table.name : '',
          photoUrl: options.visibleFields.photo ? user.photo_url : null,
          qrCode: qrResult.qrData,
          issuedDate: new Date(user.created_at),
          customFields: {} as Record<string, any>,
          layout: options.layout || 'standard',
          theme: options.theme || 'light'
        };

        // Add custom fields if visible
        if (options.visibleFields.customFields) {
          Object.keys(options.visibleFields.customFields).forEach(fieldName => {
            if (options.visibleFields.customFields[fieldName] && userData[fieldName]) {
              (cardData.customFields as Record<string, any>)[fieldName] = userData[fieldName];
            }
          });
        }

        let cardBuffer;
        if (format === 'pdf') {
          cardBuffer = await PDFService.generateCustomIDCard(cardData);
        } else {
          // For JPEG format, we'll use the PDF service and convert
          cardBuffer = await PDFService.generateCustomIDCard(cardData);
        }

        const fileName = `${userData.fullName || user.uuid}_custom_id_card.${format}`;
        archive.append(cardBuffer, { name: fileName });
      } catch (cardError) {
        logger.error(`Failed to generate custom ID card for user ${user.id}:`, cardError);
      }
    }

    await archive.finalize();

    res.json({
      success: true,
      data: {
        downloadUrl: `/temp/${zipFileName}`,
        count: users.length
      }
    });

  } catch (error) {
    logger.error('Generate bulk custom download error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate bulk custom download'
    });
  }
};

// Delete table
export const deleteTable = async (req: AuthRequest, res: Response) => {
  try {
    const { tableId } = req.params;
    const mockMode = process.env.DEV_MOCK === 'true';

    if (mockMode) {
      logger.warn('🚨 MOCK MODE: Mock table deletion');
      return res.json({
        success: true,
        message: 'Table deleted (mock mode)'
      });
    }

    // PRODUCTION-SAFE: Database-only table deletion
    try {
      const db = getDatabase();
      
      // Delete users first
      await db.run('DELETE FROM dynamic_users WHERE table_id = ?', [tableId]);

      // Delete table
      await db.run('DELETE FROM tables WHERE id = ?', [tableId]);

      logger.info(`Table deleted: ${tableId}`);

      res.json({
        success: true,
        message: 'Table deleted successfully'
      });

    } catch (dbError) {
      logger.error('❌ Database query failed:', dbError);
      res.status(503).json({
        success: false,
        error: 'Database connection failed - Table deletion unavailable'
      });
    }

  } catch (error) {
    logger.error('Delete table error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete table'
    });
  }
};

/**
 * ID CARD TEMPLATE MANAGEMENT
 * Allows admins to customize ID card design globally
 */

// Get all ID card templates
export const getIDCardTemplates = async (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const templates = await db.all(
      `SELECT * FROM id_card_templates ORDER BY is_default DESC, created_at DESC`
    );

    const formattedTemplates = templates.map((template: any) => ({
      ...template,
      visible_fields: JSON.parse(template.visible_fields)
    }));

    res.json({
      success: true,
      data: formattedTemplates
    });
  } catch (error) {
    logger.error('Get ID card templates error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch ID card templates'
    });
  }
};

// Get default ID card template
export const getDefaultIDCardTemplate = async (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const template = await db.get(
      `SELECT * FROM id_card_templates WHERE is_default = 1 LIMIT 1`
    );

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'No default ID card template found'
      });
    }

    res.json({
      success: true,
      data: {
        ...template,
        visible_fields: JSON.parse(template.visible_fields)
      }
    });
  } catch (error) {
    logger.error('Get default ID card template error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch default ID card template'
    });
  }
};

// Create or update ID card template
export const saveIDCardTemplate = async (req: AuthRequest, res: Response) => {
  try {
    const { id, name, description, visibleFields, layout, theme, logoUrl } = req.body;

    if (!name || !visibleFields) {
      return res.status(400).json({
        success: false,
        error: 'Template name and visible fields are required'
      });
    }

    const db = getDatabase();
    let templateId = id;

    if (id) {
      // Update existing template
      await db.run(
        `UPDATE id_card_templates 
         SET name = ?, description = ?, visible_fields = ?, layout = ?, theme = ?, logo_url = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [name, description || null, JSON.stringify(visibleFields), layout || 'standard', theme || 'light', logoUrl || null, id]
      );
      logger.info(`Updated ID card template: ${name}`);
    } else {
      // Create new template
      templateId = uuidv4();
      await db.run(
        `INSERT INTO id_card_templates (id, name, description, visible_fields, layout, theme, logo_url, is_default)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
        [templateId, name, description || null, JSON.stringify(visibleFields), layout || 'standard', theme || 'light', logoUrl || null]
      );
      logger.info(`Created new ID card template: ${name}`);
    }

    res.json({
      success: true,
      data: { id: templateId, message: 'Template saved successfully' }
    });
  } catch (error) {
    logger.error('Save ID card template error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save ID card template'
    });
  }
};

// Set default ID card template
export const setDefaultIDCardTemplate = async (req: AuthRequest, res: Response) => {
  try {
    const { templateId } = req.body;

    if (!templateId) {
      return res.status(400).json({
        success: false,
        error: 'Template ID is required'
      });
    }

    const db = getDatabase();

    // Clear other defaults
    await db.run(`UPDATE id_card_templates SET is_default = 0`);

    // Set this one as default
    const result = await db.run(
      `UPDATE id_card_templates SET is_default = 1 WHERE id = ?`,
      [templateId]
    );

    if (!result.changes) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    logger.info(`Set default ID card template: ${templateId}`);
    res.json({
      success: true,
      message: 'Default template updated'
    });
  } catch (error) {
    logger.error('Set default ID card template error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to set default ID card template'
    });
  }
};

// Delete ID card template
export const deleteIDCardTemplate = async (req: AuthRequest, res: Response) => {
  try {
    const { templateId } = req.params;

    const db = getDatabase();
    
    // Prevent deleting the only template
    const count = await db.get('SELECT COUNT(*) as count FROM id_card_templates');
    if (count.count <= 1) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete the last ID card template'
      });
    }

    const result = await db.run(
      `DELETE FROM id_card_templates WHERE id = ?`,
      [templateId]
    );

    if (!result.changes) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }

    logger.info(`Deleted ID card template: ${templateId}`);
    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    logger.error('Delete ID card template error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete ID card template'
    });
  }
};

/**
 * BULK ID CARD GENERATION
 * Generate and download multiple ID cards as PDF or JPEG ZIP
 */

// Generate bulk ID cards for a table
export const generateBulkIDCards = async (req: AuthRequest, res: Response) => {
  try {
    const { tableId } = req.params;
    const { userIds, format = 'pdf', templateId } = req.body;

    if (!tableId) {
      return res.status(400).json({
        success: false,
        error: 'Table ID is required'
      });
    }

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'User IDs array is required'
      });
    }

    if (!['pdf', 'jpeg'].includes(format)) {
      return res.status(400).json({
        success: false,
        error: 'Format must be "pdf" or "jpeg"'
      });
    }

    const db = getDatabase();

    // Get table info with ID card config
    const table = await db.get('SELECT * FROM tables WHERE id = ?', [tableId]);
    if (!table) {
      return res.status(404).json({
        success: false,
        error: 'Table not found'
      });
    }

    // Parse table's ID card config or use defaults
    let idCardConfig;
    if (table.id_card_config) {
      try {
        idCardConfig = JSON.parse(table.id_card_config);
      } catch (error) {
        logger.warn(`Failed to parse id_card_config for table ${tableId}, using defaults`);
      }
    }

    // If no config, use all fields by default
    if (!idCardConfig) {
      const schema = JSON.parse(table.schema);
      idCardConfig = {
        visibleFields: schema.map((col: any) => col.name),
        showPhoto: true,
        layout: 'standard',
        theme: 'light',
        fontSize: 'medium',
        qrPosition: 'bottom-right'
      };
    }

    logger.info(`Using table-specific ID card config for ${table.name}:`, {
      visibleFields: idCardConfig.visibleFields,
      showPhoto: idCardConfig.showPhoto,
      layout: idCardConfig.layout
    });

    // Get all requested users
    const placeholders = userIds.map(() => '?').join(',');
    const users = await db.all(
      `SELECT * FROM dynamic_users WHERE table_id = ? AND id IN (${placeholders})`,
      [tableId, ...userIds]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No users found for bulk generation'
      });
    }

    logger.info(`🖨️  Generating ${users.length} ID cards in ${format.toUpperCase()} format`);

    // Generate ZIP file with ID cards
    const zipFileName = `${table.name}_id_cards_${Date.now()}.zip`;
    const zipPath = path.join(__dirname, '../../temp', zipFileName);
    
    // Ensure temp directory exists
    await fs.mkdir(path.dirname(zipPath), { recursive: true });

    const output = require('fs').createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.pipe(output);

    let successCount = 0;
    let failCount = 0;

    // Process users in batches to avoid memory issues
    const batchSize = 10;
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      
      for (const user of batch) {
        try {
          const userData = JSON.parse(user.data);
          
          // Build card data based on table's ID card config
          const cardData = {
            id: user.uuid,
            tableId: tableId,
            name: '',
            role: '',
            department: '',
            email: '',
            tableName: table.name,
            photoUrl: idCardConfig.showPhoto ? user.photo_url : null,
            qrCode: user.uuid,
            issuedDate: new Date(user.created_at),
            customFields: {} as Record<string, any>,
            layout: idCardConfig.layout || 'standard',
            theme: idCardConfig.theme || 'light'
          };

          // FULLY DYNAMIC: Add ALL selected fields
          let isFirstField = true;
          const systemFields = ['photo', 'photoUrl', 'photo_url', 'id', 'uuid', 'tableId', 'table_id', 'qrCode', 'qr_code', 'createdAt', 'created_at', 'updatedAt', 'updated_at'];
          
          idCardConfig.visibleFields.forEach((fieldName: string) => {
            const fieldValue = userData[fieldName];
            
            // Skip system fields
            if (systemFields.includes(fieldName) || fieldName.toLowerCase().includes('photo') || fieldName.toLowerCase().includes('id')) {
              return;
            }
            
            if (fieldValue !== undefined && fieldValue !== null && fieldValue !== '' && typeof fieldValue !== 'object') {
              if (isFirstField) {
                // First field becomes primary name
                cardData.name = String(fieldValue);
                isFirstField = false;
              }
              
              // Add ALL fields to customFields
              (cardData.customFields as Record<string, any>)[fieldName] = fieldValue;
            }
          });

          // Fallback: use first available field if no name
          if (!cardData.name) {
            const firstField = Object.keys(userData)[0];
            if (firstField && userData[firstField]) {
              cardData.name = String(userData[firstField]);
            } else {
              cardData.name = 'No Data';
            }
          }

          // Generate ID card
          const cardBuffer = await PDFService.generateCustomIDCard(cardData);
          
          const fileName = `${cardData.name.replace(/[^a-zA-Z0-9]/g, '_')}_id_card.${format}`;
          archive.append(cardBuffer, { name: fileName });
          successCount++;
          
          logger.info(`✅ Generated card ${successCount}/${users.length}: ${fileName}`);
        } catch (cardError) {
          failCount++;
          logger.error(`❌ Failed to generate ID card for user ${user.id}:`, cardError);
        }
      }
    }

    await archive.finalize();

    // Wait for the output stream to finish
    await new Promise((resolve, reject) => {
      output.on('close', resolve);
      output.on('error', reject);
    });

    logger.info(`✅ Bulk ID card generation complete: ${successCount} success, ${failCount} failed`);

    // Send the ZIP file
    res.download(zipPath, zipFileName, async (err) => {
      if (err) {
        logger.error('Error sending ZIP file:', err);
      }
      
      // Clean up temp file after download
      try {
        await fs.unlink(zipPath);
        logger.info('🗑️  Cleaned up temp ZIP file');
      } catch (cleanupError) {
        logger.warn('⚠️  Failed to clean up temp ZIP file:', cleanupError);
      }
    });
  } catch (error) {
    logger.error('Generate bulk ID cards error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate bulk ID cards'
    });
  }
};

// Get bulk ID card generation status
export const getBulkIDCardStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { tableId, jobId } = req.params;

    // This would track the status of background job
    // For now, return a placeholder
    res.json({
      success: true,
      data: {
        jobId,
        status: 'completed',
        totalCards: 0,
        processedCards: 0,
        downloadUrl: null
      }
    });
  } catch (error) {
    logger.error('Get bulk ID card status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get bulk ID card status'
    });
  }
};


/**
 * PER-TABLE ID CARD CONFIGURATION
 * Each table has its own ID card customization based on its columns
 */

// Get table's ID card configuration
export const getTableIDCardConfig = async (req: AuthRequest, res: Response) => {
  try {
    const { tableId } = req.params;

    logger.info('📋 Getting ID card config for table', { tableId });

    const db = getDatabase();
    const table = await db.get('SELECT id, name, schema, id_card_config FROM tables WHERE id = ?', [tableId]);

    logger.info('📋 Table query result', { found: !!table, tableId });

    if (!table) {
      logger.warn('❌ Table not found', { tableId });
      return res.status(404).json({
        success: false,
        error: 'Table not found'
      });
    }

    // Parse the config or return default
    let config = null;
    if (table.id_card_config) {
      try {
        config = JSON.parse(table.id_card_config);
        logger.info('✅ Parsed existing config');
      } catch (error) {
        logger.warn(`Failed to parse id_card_config for table ${tableId}:`, error);
      }
    }

    // If no config, return default (show all fields)
    if (!config) {
      logger.info('📋 No config found, creating default');
      let allFields: string[] = [];
      
      // Try to get fields from schema
      if (table.schema) {
        try {
          let schema: any = table.schema;
          
          // If schema is a string, parse it
          if (typeof schema === 'string') {
            schema = JSON.parse(schema);
            logger.info('✅ Parsed schema from string');
          }
          
          // Schema should now be an array
          if (Array.isArray(schema)) {
            allFields = schema.map((col: any) => col.name || col);
            logger.info('✅ Extracted fields from schema array', { fieldCount: allFields.length, fields: allFields });
          } else {
            logger.warn('⚠️ Schema is not an array after parsing', { schemaType: typeof schema });
            allFields = [];
          }
        } catch (parseError) {
          logger.error(`❌ Failed to parse schema for table ${tableId}:`, parseError);
          allFields = [];
        }
      } else {
        logger.warn('❌ Table schema is null or undefined');
      }
      
      config = {
        visibleFields: allFields,
        showPhoto: true,
        layout: 'standard',
        theme: 'light',
        fontSize: 'medium',
        qrPosition: 'bottom-right'
      };
    }

    logger.info('✅ Returning config', { configFields: config?.visibleFields?.length || 0 });
    res.json({
      success: true,
      data: config
    });
  } catch (error: any) {
    logger.error('❌ Get table ID card config error:', {
      error: error?.message || String(error),
      stack: error?.stack,
      tableId: req.params.tableId
    });
    res.status(500).json({
      success: false,
      error: 'Failed to get table ID card configuration',
      details: error?.message
    });
  }
};

// Update table's ID card configuration
export const updateTableIDCardConfig = async (req: AuthRequest, res: Response) => {
  try {
    const { tableId } = req.params;
    const { visibleFields, showPhoto, layout, theme, fontSize, qrPosition } = req.body;

    logger.info(`📝 Updating ID card config for table ${tableId}`, {
      visibleFields,
      showPhoto,
      layout,
      theme,
      fontSize,
      qrPosition
    });

    if (!visibleFields || !Array.isArray(visibleFields)) {
      logger.error('Invalid visibleFields:', visibleFields);
      return res.status(400).json({
        success: false,
        error: 'visibleFields must be an array of column names'
      });
    }

    const db = getDatabase();
    
    // Verify table exists
    const table = await db.get('SELECT id, schema FROM tables WHERE id = ?', [tableId]);
    if (!table) {
      logger.error(`Table not found: ${tableId}`);
      return res.status(404).json({
        success: false,
        error: 'Table not found'
      });
    }

    // Verify all visible fields exist in table schema
    const schema = JSON.parse(table.schema);
    const validColumns = schema.map((col: any) => col.name);
    const invalidFields = visibleFields.filter(field => !validColumns.includes(field));
    
    if (invalidFields.length > 0) {
      logger.error(`Invalid fields detected:`, invalidFields);
      return res.status(400).json({
        success: false,
        error: `Invalid fields: ${invalidFields.join(', ')}. These fields don't exist in the table.`
      });
    }

    // Build config object
    const config = {
      visibleFields,
      showPhoto: showPhoto !== undefined ? showPhoto : true,
      layout: layout || 'standard',
      theme: theme || 'light',
      fontSize: fontSize || 'medium',
      qrPosition: qrPosition || 'bottom-right'
    };

    logger.info(`💾 Saving config to database:`, config);

    // Update table's id_card_config
    const result = await db.run(
      'UPDATE tables SET id_card_config = ?, updated_at = datetime(\'now\') WHERE id = ?',
      [JSON.stringify(config), tableId]
    );

    logger.info(`✅ Updated ID card config for table ${tableId}`, {
      changes: result.changes,
      visibleFieldsCount: visibleFields.length,
      showPhoto,
      layout
    });

    res.json({
      success: true,
      message: 'ID card configuration updated successfully',
      data: config
    });
  } catch (error) {
    logger.error('Update table ID card config error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update table ID card configuration'
    });
  }
};
