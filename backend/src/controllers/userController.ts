import { Request, Response } from 'express';
import { body, param, query } from 'express-validator';
import { handleValidationErrors } from '../middleware/validation';
import { AuthRequest } from '../middleware/auth';
import { User, CreateUserRequest, UpdateUserRequest, PaginatedResponse, ApiResponse } from '@gatekeeper/shared';
import logger from '../config/logger';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../config/database';

// Validation middleware - Updated to match frontend fields
export const createUserValidation = [
  body('fullName').notEmpty().withMessage('Full name is required'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('employeeId').optional().notEmpty().withMessage('Employee ID cannot be empty'),
  body('role').optional().notEmpty().withMessage('Role cannot be empty'),
  body('department').optional().notEmpty().withMessage('Department cannot be empty'),
  body('status').optional().isIn(['active', 'suspended', 'revoked']).withMessage('Invalid status'),
  handleValidationErrors
];

export const updateUserValidation = [
  param('id').notEmpty().withMessage('User ID is required'),
  body('employeeId').optional().notEmpty().withMessage('Employee ID cannot be empty'),
  body('fullName').optional().notEmpty().withMessage('Full name cannot be empty'),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('role').optional().notEmpty().withMessage('Role cannot be empty'),
  handleValidationErrors
];

// Production mode: No mock users allowed
// This system is production-only and uses database-driven user management
// User data is populated only through admin actions (manual creation or CSV import)

export const getUsers = async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string || '';
    const status = req.query.status as string;
    const offset = (page - 1) * limit;

    // PRODUCTION-SAFE: Database-only user retrieval
    // Users are stored in dynamic_users table, organized by tables
    // Use /api/tables/:tableId/users for table-specific users
    
    const response: PaginatedResponse<User> = {
      data: [],
      total: 0,
      page,
      limit,
      totalPages: 0
    };

    res.json({
      success: true,
      data: response,
      note: 'Use /api/tables/:tableId/users to access users within a specific table'
    });

  } catch (error) {
    logger.error('❌ Failed to fetch users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users'
    });
  }
};

export const getUserById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    // PRODUCTION-SAFE: Database-only user lookup
    // Users are managed through the tables API
    res.status(404).json({
      success: false,
      error: 'User not found. Users are managed through table endpoints.',
      hint: 'Use /api/tables/:tableId/users/:userId to access users'
    });

  } catch (error) {
    logger.error('❌ Failed to fetch user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user'
    });
  }
};

export const createUser = async (req: AuthRequest, res: Response) => {
  try {
    const { fullName, email, employeeId, role, department, status } = req.body;
    const photoUrl = req.file ? `/uploads/${req.file.filename}` : undefined;

    logger.info('Creating user with data:', { fullName, email, employeeId, role, department, status, hasPhoto: !!req.file });

    // Use database to create user
    const db = getDatabase();
    const userId = uuidv4();
    const userUuid = uuidv4();

    // Create user data object
    const userData = {
      fullName: fullName || 'Unknown User',
      email: email || '',
      employeeId: employeeId || `EMP-${Date.now()}`,
      role: role || 'Employee',
      department: department || '',
      status: status || 'active'
    };

    try {
      // Insert into dynamic_users table (this is where users are stored in Degas-CS)
      const sql = `INSERT INTO dynamic_users (id, table_id, uuid, data, photo_url, created_at, updated_at)
                   VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`;
      
      // Use a default table for manual user creation (create if doesn't exist)
      let defaultTableId = 'manual-users-table';
      
      // Check if default table exists, create if not
      const existingTable = await db.get('SELECT id FROM tables WHERE id = ?', [defaultTableId]);
      
      if (!existingTable) {
        const defaultSchema = [
          { id: uuidv4(), name: 'fullName', type: 'text', required: true },
          { id: uuidv4(), name: 'email', type: 'email', required: false },
          { id: uuidv4(), name: 'employeeId', type: 'text', required: false },
          { id: uuidv4(), name: 'role', type: 'text', required: false },
          { id: uuidv4(), name: 'department', type: 'text', required: false },
          { id: uuidv4(), name: 'status', type: 'select', required: false, options: ['active', 'suspended', 'revoked'] }
        ];

        await db.run(
          `INSERT INTO tables (id, name, description, schema, created_at, updated_at)
           VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`,
          [defaultTableId, 'Manual Users', 'Users created manually through the UI', JSON.stringify(defaultSchema)]
        );
        
        logger.info('Created default manual users table');
      }

      await db.run(sql, [userId, defaultTableId, userUuid, JSON.stringify(userData), photoUrl || null]);

      const newUser = {
        id: userId,
        employeeId: userData.employeeId,
        fullName: userData.fullName,
        email: userData.email,
        role: userData.role,
        department: userData.department,
        photoUrl,
        status: userData.status,
        qrHash: userUuid,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      logger.info(`User created successfully: ${userData.fullName} (${userId})`);

      res.status(201).json({
        success: true,
        data: newUser,
        message: 'User created successfully'
      });

    } catch (dbError) {
      logger.error('❌ Database error creating user:', dbError);
      res.status(503).json({
        success: false,
        error: 'Database connection failed - User creation unavailable'
      });
    }

  } catch (error) {
    logger.error('❌ Failed to create user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create user'
    });
  }
};

export const updateUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updateData: UpdateUserRequest = req.body;

    res.status(501).json({
      success: false,
      error: 'User update not implemented - use dynamic tables instead'
    });

  } catch (error) {
    logger.error('❌ Failed to update user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user'
    });
  }
};

export const deleteUser = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    res.status(501).json({
      success: false,
      error: 'User deletion not implemented - use dynamic tables instead'
    });

  } catch (error) {
    logger.error('❌ Failed to delete user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user'
    });
  }
};

export const generateUserCard = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { format = 'pdf' } = req.query;
    const formatStr = Array.isArray(format) ? format[0] : format;

    res.status(501).json({
      success: false,
      error: 'Card generation not implemented - use dynamic tables instead'
    });

  } catch (error) {
    logger.error('❌ Failed to generate user card:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate user card'
    });
  }
};