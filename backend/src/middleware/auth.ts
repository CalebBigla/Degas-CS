import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Admin } from '@gatekeeper/shared';
import { getDatabase } from '../config/database';
import logger from '../config/logger';

export interface AuthRequest extends Request {
  admin?: Admin;
}

export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  logger.info('🔐 [AUTH CHECK] Processing scanner request', {
    path: req.path,
    hasAuthHeader: !!authHeader,
    hasToken: !!token,
    authHeaderPreview: authHeader ? authHeader.substring(0, 50) + '...' : 'NONE'
  });

  if (!token) {
    logger.warn('🔐 [AUTH FAIL] No token in request', {
      ip: req.ip,
      path: req.path,
      authHeader: !!authHeader
    });
    return res.status(401).json({ 
      success: false, 
      error: 'Access token required' 
    });
  }

  try {
    // Verify JWT token with proper secret
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      logger.error('🔐 [AUTH ERROR] JWT_SECRET not configured');
      return res.status(500).json({ 
        success: false, 
        error: 'Authentication service misconfigured' 
      });
    }

    logger.info('🔐 [AUTH CHECK] Verifying JWT token...');
    const decoded = jwt.verify(token, jwtSecret) as any;
    
    logger.info('🔐 [AUTH CHECK] JWT verified, looking up admin', {
      adminId: decoded.adminId
    });

    // Database-only authentication (no mock fallback)
    const db = getDatabase();
    const admin = await db.get(
      'SELECT id, username, email, role, last_login, created_at FROM admins WHERE id = ?',
      [decoded.adminId]
    );

    if (admin) {
      req.admin = admin;
      logger.info('🔐 [AUTH SUCCESS] Admin authenticated', {
        adminId: admin.id,
        username: admin.username,
        role: admin.role,
        path: req.path
      });
      return next();
    }

    logger.warn('🔐 [AUTH FAIL] Admin not found in database', {
      adminId: decoded.adminId,
      ip: req.ip,
      path: req.path
    });
    return res.status(401).json({ 
      success: false, 
      error: 'Invalid token - user not found' 
    });

  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('🔐 [AUTH FAIL] JWT verification failed', {
        error: error.message,
        code: (error as any).code,
        ip: req.ip,
        path: req.path
      });
      return res.status(403).json({ 
        success: false, 
        error: 'Invalid or expired token' 
      });
    }
    
    logger.error('Token verification error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Authentication service error' 
    });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.admin) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    if (!roles.includes(req.admin.role)) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }

    next();
  };
};