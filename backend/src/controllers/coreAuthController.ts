import { Request, Response } from 'express';
import { body } from 'express-validator';
import { handleValidationErrors } from '../middleware/validation';
import CoreUserService from '../services/coreUserService';
import logger from '../config/logger';
import jwt from 'jsonwebtoken';

const CORE_USER_JWT_SECRET = process.env.CORE_USER_JWT_SECRET || 'core-user-secret-change-in-production';
const CORE_USER_JWT_EXPIRES_IN = process.env.CORE_USER_JWT_EXPIRES_IN || '7d';

/**
 * Core Auth Controller - Handles end-user authentication
 * Separate from admin authentication system
 */

// Validation rules
export const registerValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  handleValidationErrors
];

export const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors
];

/**
 * Register a new core user
 * POST /api/core-auth/register
 */
export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, role, status } = req.body;

    const user = await CoreUserService.createUser({
      email,
      password,
      role,
      status
    });

    logger.info('✅ Core user registered successfully', { userId: user.id, email: user.email });

    // Generate JWT token for auto-login
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        type: 'core_user'
      },
      CORE_USER_JWT_SECRET,
      { expiresIn: CORE_USER_JWT_EXPIRES_IN } as jwt.SignOptions
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        token, // Include token for auto-login
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          status: user.status,
          qrToken: user.qrToken
        }
      }
    });
  } catch (error: any) {
    logger.error('❌ Core user registration failed:', error);
    
    if (error.message === 'Email already registered') {
      return res.status(409).json({
        success: false,
        message: 'Email already registered',
        error: 'Email already registered'
      });
    }

    if (error.message === 'Invalid email format') {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format',
        error: 'Invalid email format'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: 'Registration failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Login with email and password
 * POST /api/core-auth/login
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const result = await CoreUserService.login(email, password);

    logger.info('✅ Core user logged in successfully', { userId: result.user.id, email: result.user.email });

    res.json({
      success: true,
      data: {
        token: result.token,
        user: {
          id: result.user.id,
          email: result.user.email,
          role: result.user.role,
          status: result.user.status,
          qrToken: result.qrToken
        }
      },
      message: 'Login successful'
    });
  } catch (error: any) {
    logger.error('❌ Core user login failed:', error);

    if (error.message === 'Invalid email or password' || error.message === 'Account is not active') {
      return res.status(401).json({
        success: false,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      error: 'Login failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get current user profile
 * GET /api/core-auth/me
 */
export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Access token required'
      });
    }

    const decoded = CoreUserService.verifyToken(token);
    const user = await CoreUserService.getUserById(decoded.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          status: user.status,
          qrToken: user.qrToken,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        }
      }
    });
  } catch (error: any) {
    logger.error('❌ Get current user failed:', error);

    if (error.message === 'Invalid or expired token') {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to get user profile',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * List all core users (admin only)
 * GET /api/core-auth/users
 */
export const listUsers = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await CoreUserService.listUsers(page, limit);

    res.json({
      success: true,
      data: {
        users: result.users,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit)
        }
      }
    });
  } catch (error: any) {
    logger.error('❌ List core users failed:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to list users',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update user status (admin only)
 * PUT /api/core-auth/users/:id/status
 */
export const updateUserStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'inactive', 'suspended'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid status. Must be: active, inactive, or suspended'
      });
    }

    await CoreUserService.updateStatus(id, status);

    logger.info('✅ Core user status updated', { userId: id, status });

    res.json({
      success: true,
      message: 'User status updated successfully'
    });
  } catch (error: any) {
    logger.error('❌ Update user status failed:', error);

    res.status(500).json({
      success: false,
      error: 'Failed to update user status',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
