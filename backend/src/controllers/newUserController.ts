import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import userService from '../services/userService';
import logger from '../config/logger';

// Extended Request with optional userId
interface AuthRequest extends Request {
  userId?: string;
  token?: string;
}

/**
 * FIXED USER SCHEMA CONTROLLER
 * 
 * Handles the complete onboarding → login → scan → analytics pipeline
 * using fixed User schema with: name, phone, email, address, password, formId, scanned
 * 
 * PRODUCTION-READY: All endpoints return structured JSON error handling
 * SECURE: Passwords are hashed with bcrypt and never exposed
 * SAFE: Validates all input and checks for duplicates before saving
 */

/**
 * POST /api/auth/register/:formId
 * Register new user with form data
 * 
 * BODY:
 * {
 *   "name": "John Doe",
 *   "phone": "+234-800-1234567",
 *   "email": "john@example.com",
 *   "address": "123 Main St, Lagos",
 *   "password": "secure_password123"
 * }
 * 
 * RESPONSE (Success):
 * {
 *   "success": true,
 *   "userId": "uuid-here",
 *   "formId": "form-id-here",
 *   "token": "jwt-token-here",
 *   "message": "Registration successful"
 * }
 * 
 * RESPONSE (Error):
 * {
 *   "success": false,
 *   "message": "Email already registered"
 * }
 */
export const registerUser = async (req: AuthRequest, res: Response) => {
  try {
    const { formId } = req.params;
    const { name, phone, email, address, password } = req.body;

    logger.info('📝 Registration request received', {
      formId,
      email,
      phone
    });

    // Validate form exists
    if (!formId) {
      logger.warn('❌ Registration failed: formId missing');
      return res.status(400).json({
        success: false,
        message: 'Form ID is required'
      });
    }

    // Validate all fields
    if (!name || !phone || !email || !address || !password) {
      logger.warn('❌ Registration failed: missing required fields', {
        hasForms: !!name,
        hasPhone: !!phone,
        hasEmail: !!email,
        hasAddress: !!address,
        hasPassword: !!password
      });
      return res.status(400).json({
        success: false,
        message: 'All fields are required: name, phone, email, address, password'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      logger.warn('❌ Registration failed: invalid email format', { email });
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Validate password strength
    if (password.length < 6) {
      logger.warn('❌ Registration failed: password too short');
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    // Register user
    const user = await userService.registerUser({
      name,
      phone,
      email,
      address,
      password,
      formId
    });

    logger.info('✅ User registered successfully', {
      userId: user.id,
      email: user.email
    });

    // Generate JWT token for auto-login
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        formId: user.formId
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    return res.status(201).json({
      success: true,
      userId: user.id,
      formId: user.formId,
      token,
      message: 'Registration successful'
    });
  } catch (error: any) {
    logger.error('❌ Registration error:', error);

    // Handle specific error messages
    if (error.message.includes('Email already registered')) {
      return res.status(409).json({
        success: false,
        message: 'Email already registered'
      });
    }

    if (error.message.includes('Phone number already registered')) {
      return res.status(409).json({
        success: false,
        message: 'Phone number already registered'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Registration failed: ' + error.message
    });
  }
};

/**
 * POST /api/auth/login
 * Login user with email and password
 * 
 * BODY:
 * {
 *   "email": "john@example.com",
 *   "password": "secure_password123"
 * }
 * 
 * RESPONSE (Success):
 * {
 *   "success": true,
 *   "userId": "uuid-here",
 *   "email": "john@example.com",
 *   "name": "John Doe",
 *   "formId": "form-id-here",
 *   "token": "jwt-token-here",
 *   "message": "Login successful"
 * }
 * 
 * RESPONSE (Error):
 * {
 *   "success": false,
 *   "message": "Invalid email or password"
 * }
 */
export const loginUser = async (req: AuthRequest, res: Response) => {
  try {
    const { email, password } = req.body;

    logger.info('🔐 Login request received', { email });

    if (!email || !password) {
      logger.warn('❌ Login failed: missing email or password');
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Authenticate user
    const user = await userService.loginUser(email, password);

    logger.info('✅ User logged in successfully', {
      userId: user.id,
      email: user.email
    });

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        formId: user.formId
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    return res.status(200).json({
      success: true,
      userId: user.id,
      email: user.email,
      name: user.name,
      formId: user.formId,
      token,
      message: 'Login successful'
    });
  } catch (error: any) {
    logger.error('❌ Login error:', error);

    if (error.message.includes('Invalid email or password')) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Login failed: ' + error.message
    });
  }
};

/**
 * POST /api/scan
 * Mark user as scanned for attendance
 * 
 * BODY:
 * {
 *   "userId": "uuid-here",
 *   "formId": "form-id-here"
 * }
 * 
 * RESPONSE (Success):
 * {
 *   "success": true,
 *   "message": "User scanned successfully"
 * }
 * 
 * RESPONSE (Already Scanned):
 * {
 *   "success": false,
 *   "message": "User already scanned"
 * }
 */
export const scanUser = async (req: AuthRequest, res: Response) => {
  try {
    const { userId, formId } = req.body;

    logger.info('📱 Scan request received', { userId, formId });

    if (!userId || !formId) {
      logger.warn('❌ Scan failed: missing userId or formId');
      return res.status(400).json({
        success: false,
        message: 'User ID and Form ID are required'
      });
    }

    // Get user
    const user = await userService.getUserById(userId);

    if (!user) {
      logger.warn('❌ Scan failed: user not found', { userId });
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify user belongs to this form
    if (user.formId !== formId) {
      logger.warn('❌ Scan failed: user does not belong to this form', {
        userId,
        expectedFormId: formId,
        actualFormId: user.formId
      });
      return res.status(403).json({
        success: false,
        message: 'User does not belong to this form'
      });
    }

    // Check if already scanned
    if (user.scanned) {
      logger.info('⚠️  User already scanned', { userId, scannedAt: user.scannedAt });
      return res.status(409).json({
        success: false,
        message: 'User already scanned',
        scannedAt: user.scannedAt
      });
    }

    // Mark as scanned
    await userService.markUserAsScanned(userId);

    logger.info('✅ User scanned successfully', { userId });

    return res.status(200).json({
      success: true,
      message: 'User scanned successfully',
      userId
    });
  } catch (error: any) {
    logger.error('❌ Scan error:', error);

    return res.status(500).json({
      success: false,
      message: 'Scan failed: ' + error.message
    });
  }
};

/**
 * GET /api/users/:formId
 * Get all users for a form with fixed columns
 * 
 * COLUMNS: Name, Phone, Email, Address, Scanned
 * 
 * RESPONSE:
 * {
 *   "success": true,
 *   "users": [
 *     {
 *       "id": "uuid",
 *       "name": "John Doe",
 *       "phone": "+234-800-1234567",
 *       "email": "john@example.com",
 *       "address": "123 Main St",
 *       "scanned": true,
 *       "scannedAt": "2024-01-15T10:30:00Z",
 *       "createdAt": "2024-01-15T09:00:00Z"
 *     }
 *   ],
 *   "total": 1
 * }
 */
export const getUsersByForm = async (req: AuthRequest, res: Response) => {
  try {
    const { formId } = req.params;

    logger.info('📋 Fetch users request', { formId });

    if (!formId) {
      logger.warn('❌ Fetch failed: missing formId');
      return res.status(400).json({
        success: false,
        message: 'Form ID is required'
      });
    }

    // Get all users for this form
    const users = await userService.getUsersByFormId(formId);

    logger.info('✅ Users fetched successfully', {
      formId,
      count: users.length
    });

    return res.status(200).json({
      success: true,
      users,
      total: users.length
    });
  } catch (error: any) {
    logger.error('❌ Fetch users error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch users: ' + error.message
    });
  }
};

/**
 * GET /api/analytics/:formId
 * Get attendance analytics for a form
 * 
 * RESPONSE:
 * {
 *   "success": true,
 *   "analytics": {
 *     "totalUsers": 50,
 *     "scannedUsers": 45,
 *     "notScannedUsers": 5,
 *     "attendanceRate": 90.0,
 *     "scannedList": [
 *       {
 *         "id": "uuid",
 *         "name": "John Doe",
 *         "email": "john@example.com",
 *         "phone": "+234-800-1234567",
 *         "scannedAt": "2024-01-15T10:30:00Z"
 *       }
 *     ]
 *   }
 * }
 */
export const getFormAnalytics = async (req: AuthRequest, res: Response) => {
  try {
    const { formId } = req.params;

    logger.info('📊 Analytics request', { formId });

    if (!formId) {
      logger.warn('❌ Analytics failed: missing formId');
      return res.status(400).json({
        success: false,
        message: 'Form ID is required'
      });
    }

    // Get analytics
    const analytics = await userService.getFormAnalytics(formId);

    logger.info('✅ Analytics retrieved successfully', {
      formId,
      totalUsers: analytics.totalUsers,
      scannedUsers: analytics.scannedUsers,
      attendanceRate: analytics.attendanceRate
    });

    return res.status(200).json({
      success: true,
      analytics
    });
  } catch (error: any) {
    logger.error('❌ Analytics error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to get analytics: ' + error.message
    });
  }
};

/**
 * GET /api/forms
 * Get all active forms
 * 
 * RESPONSE:
 * {
 *   "success": true,
 *   "forms": [
 *     {
 *       "id": "form-id",
 *       "name": "Conference Registration"
 *     }
 *   ]
 * }
 */
export const getAllForms = async (req: AuthRequest, res: Response) => {
  try {
    logger.info('📋 Get forms request');

    const forms = await userService.getAllForms();

    logger.info('✅ Forms retrieved successfully', { count: forms.length });

    return res.status(200).json({
      success: true,
      forms
    });
  } catch (error: any) {
    logger.error('❌ Get forms error:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to get forms: ' + error.message
    });
  }
};
