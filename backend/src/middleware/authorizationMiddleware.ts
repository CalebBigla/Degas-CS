import { Request, Response, NextFunction } from 'express';
import { CoreAuthRequest } from './coreAuth';
import { canAccessModule, Role } from '../config/rbac';
import logger from '../config/logger';

/**
 * Middleware to enforce module-level access control
 * Requires authentication middleware to run first
 */
export const requireModuleAccess = (module: string) => {
  return (req: CoreAuthRequest, res: Response, next: NextFunction) => {
    if (!req.coreUser) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const userRole = req.coreUser.role as Role;
    
    if (!canAccessModule(userRole, module)) {
      logger.warn('🔐 [MODULE ACCESS DENIED]', {
        userId: req.coreUser.id,
        userRole: userRole,
        requestedModule: module,
        ip: req.ip,
        path: req.path
      });

      return res.status(403).json({
        success: false,
        error: `Access denied. You do not have permission to access the ${module} module.`
      });
    }

    logger.info('🔐 [MODULE ACCESS GRANTED]', {
      userId: req.coreUser.id,
      userRole: userRole,
      accessedModule: module,
      path: req.path
    });

    next();
  };
};

/**
 * Middleware to enforce multi-module access
 */
export const requireModuleAccessAny = (modules: string[]) => {
  return (req: CoreAuthRequest, res: Response, next: NextFunction) => {
    if (!req.coreUser) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const userRole = req.coreUser.role as Role;
    const hasAccess = modules.some(module => canAccessModule(userRole, module));

    if (!hasAccess) {
      logger.warn('🔐 [MODULE ACCESS DENIED - ANY]', {
        userId: req.coreUser.id,
        userRole: userRole,
        requestedModules: modules,
        ip: req.ip,
        path: req.path
      });

      return res.status(403).json({
        success: false,
        error: 'Access denied. You do not have permission to access this resource.'
      });
    }

    logger.info('🔐 [MODULE ACCESS GRANTED - ANY]', {
      userId: req.coreUser.id,
      userRole: userRole,
      accessedModules: modules,
      path: req.path
    });

    next();
  };
};
