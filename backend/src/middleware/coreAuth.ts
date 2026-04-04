import { Request, Response, NextFunction } from 'express';
import CoreUserService, { CoreUser } from '../services/coreUserService';
import logger from '../config/logger';

/**
 * Core User Authentication Middleware
 * Separate from admin authentication
 */

export interface CoreAuthRequest extends Request {
  coreUser?: CoreUser;
}

/**
 * Authenticate core user JWT token
 */
export const authenticateCoreUser = async (req: CoreAuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    logger.warn('🔐 [CORE AUTH FAIL] No token in request', {
      ip: req.ip,
      path: req.path
    });
    return res.status(401).json({
      success: false,
      error: 'Access token required'
    });
  }

  try {
    const decoded = CoreUserService.verifyToken(token);
    const user = await CoreUserService.getUserById(decoded.userId);

    if (!user) {
      logger.warn('🔐 [CORE AUTH FAIL] User not found', {
        userId: decoded.userId,
        ip: req.ip,
        path: req.path
      });
      return res.status(401).json({
        success: false,
        error: 'Invalid token - user not found'
      });
    }

    if (user.status !== 'active') {
      logger.warn('🔐 [CORE AUTH FAIL] User not active', {
        userId: user.id,
        status: user.status,
        ip: req.ip,
        path: req.path
      });
      return res.status(403).json({
        success: false,
        error: 'Account is not active'
      });
    }

    req.coreUser = user;
    logger.info('🔐 [CORE AUTH SUCCESS] User authenticated', {
      userId: user.id,
      email: user.email,
      role: user.role,
      path: req.path
    });

    next();
  } catch (error: any) {
    logger.warn('🔐 [CORE AUTH FAIL] Token verification failed', {
      error: error.message,
      ip: req.ip,
      path: req.path
    });

    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
};

/**
 * Require specific core user role
 */
export const requireCoreRole = (roles: string[]) => {
  return (req: CoreAuthRequest, res: Response, next: NextFunction) => {
    if (!req.coreUser) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!roles.includes(req.coreUser.role)) {
      logger.warn('🔐 [CORE AUTH FAIL] Insufficient permissions', {
        userId: req.coreUser.id,
        userRole: req.coreUser.role,
        requiredRoles: roles,
        path: req.path
      });

      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }

    next();
  };
};
