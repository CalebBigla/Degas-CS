import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body } from 'express-validator';
import { getDatabase } from '../config/database';
import { handleValidationErrors } from '../middleware/validation';
import { LoginRequest, LoginResponse, ApiResponse } from '@gatekeeper/shared';
import logger from '../config/logger';

export const loginValidation = [
  body('username').notEmpty().withMessage('Username is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  handleValidationErrors
];

export const login = async (req: Request<{}, ApiResponse<LoginResponse>, LoginRequest>, res: Response) => {
  try {
    const { username, password } = req.body;

    // Check if mock mode is explicitly enabled
    const mockMode = process.env.DEV_MOCK === 'true';
    
    if (mockMode) {
      logger.warn('🚨 MOCK MODE ENABLED - This should NEVER be used in production');
      
      // Mock authentication (DEV ONLY)
      const mockUsers = [
        { username: 'admin', password: 'admin123', role: 'super_admin', email: 'admin@degas.com' },
        { username: 'guard', password: 'guard123', role: 'guard', email: 'guard@degas.com' }
      ];

      const user = mockUsers.find(u => u.username === username && u.password === password);

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
      }

      const token = jwt.sign(
        { adminId: 'mock-id', role: user.role },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '24h' }
      );

      const refreshToken = jwt.sign(
        { adminId: 'mock-id' },
        process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret',
        { expiresIn: '7d' }
      );

      logger.info(`Mock admin login successful: ${username}`);

      return res.json({
        success: true,
        data: {
          token,
          refreshToken,
          admin: {
            username: user.username,
            email: user.email,
            role: user.role
          }
        }
      });
    }

    // PRODUCTION-SAFE: Database-only authentication
    const db = getDatabase();
    const admin = await db.get('SELECT * FROM admins WHERE username = ?', [username]);

    if (!admin) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    const isValidPassword = await bcrypt.compare(password, admin.password_hash);
    
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Update last login
    await db.run(
      'UPDATE admins SET last_login = datetime("now") WHERE id = ?',
      [admin.id]
    );

    // Generate tokens
    const token = jwt.sign(
      { adminId: admin.id, role: admin.role },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    const refreshToken = jwt.sign(
      { adminId: admin.id },
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    logger.info(`Database admin login successful: ${username}`);

    return res.json({
      success: true,
      data: {
        token,
        refreshToken,
        admin: {
          username: admin.username,
          email: admin.email,
          role: admin.role
        }
      }
    });

  } catch (error) {
    logger.error('❌ Authentication failed - Database error:', error);
    res.status(503).json({
      success: false,
      error: 'Database connection failed - Authentication unavailable'
    });
  }
};

export const refresh = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        error: 'Refresh token required'
      });
    }

    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as any;
    
    // Handle mock mode
    if (process.env.DEV_MOCK === 'true' && decoded.adminId === 'mock-id') {
      logger.warn('🚨 MOCK MODE: Refreshing mock token');
      
      const token = jwt.sign(
        { adminId: 'mock-id', role: 'super_admin' },
        process.env.JWT_SECRET!,
        { expiresIn: '24h' }
      );

      return res.json({
        success: true,
        data: { token }
      });
    }
    
    // PRODUCTION-SAFE: Database-only token refresh
    const db = getDatabase();
    const admin = await db.get('SELECT id, username, email, role FROM admins WHERE id = ?', [decoded.adminId]);

    if (!admin) {
      return res.status(401).json({
        success: false,
        error: 'Invalid refresh token'
      });
    }

    // Generate new access token
    const token = jwt.sign(
      { adminId: admin.id, role: admin.role },
      process.env.JWT_SECRET!,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      data: { token }
    });
  } catch (error) {
    logger.error('❌ Token refresh failed - Database error:', error);
    res.status(401).json({
      success: false,
      error: 'Token refresh failed - Database unavailable'
    });
  }
};

export const logout = async (req: Request, res: Response) => {
  // In a production app, you might want to blacklist the token
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
};