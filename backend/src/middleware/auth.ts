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
    // Try old admin JWT first
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      logger.error('🔐 [AUTH ERROR] JWT_SECRET not configured');
      return res.status(500).json({ 
        success: false, 
        error: 'Authentication service misconfigured' 
      });
    }

    logger.info('🔐 [AUTH CHECK] Verifying JWT token...');
    
    try {
      // Try old admin token
      const decoded = jwt.verify(token, jwtSecret) as any;
      
      logger.info('🔐 [AUTH CHECK] Old admin JWT verified, looking up admin', {
        adminId: decoded.adminId
      });

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
    } catch (oldAdminError) {
      // Old admin token failed, try core user token
      const coreJwtSecret = process.env.CORE_USER_JWT_SECRET;
      if (!coreJwtSecret) {
        throw oldAdminError; // Re-throw original error if no core secret
      }

      try {
        const decoded = jwt.verify(token, coreJwtSecret) as any;
        
        logger.info('🔐 [AUTH CHECK] Core user JWT verified, looking up user', {
          userId: decoded.userId
        });

        const db = getDatabase();
        const coreUser = await db.get(
          'SELECT id, email, role, status FROM core_users WHERE id = ?',
          [decoded.userId]
        );

        if (coreUser && coreUser.status === 'active') {
          // Map core user to admin format for compatibility
          req.admin = {
            id: coreUser.id,
            username: coreUser.email,
            email: coreUser.email,
            role: coreUser.role
          } as Admin;
          
          logger.info('🔐 [AUTH SUCCESS] Core user authenticated as admin', {
            userId: coreUser.id,
            email: coreUser.email,
            role: coreUser.role,
            path: req.path
          });
          return next();
        }

        logger.warn('🔐 [AUTH FAIL] Core user not found or inactive', {
          userId: decoded.userId,
          ip: req.ip,
          path: req.path
        });
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid token - user not found' 
        });
      } catch (coreUserError) {
        // Both token types failed
        throw oldAdminError; // Throw the original error
      }
    }

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