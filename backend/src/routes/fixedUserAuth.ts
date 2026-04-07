import express from 'express';
import fixedUserController from '../controllers/fixedUserController';
import logger from '../config/logger';

const router = express.Router();

/**
 * Fixed User Schema Routes
 * Clean, production-ready authentication and user management
 * 
 * Mounted at: /api/form
 * Full paths:
 * - POST /api/form/register/:formId
 * - POST /api/form/login
 * - GET /api/form/users/:formId
 * - PUT /api/form/users/:userId
 * - DELETE /api/form/users/:userId
 * - POST /api/form/scan
 * - GET /api/form/logs/:formId
 * - GET /api/form/analytics/:formId
 */

// Registration - POST /api/form/register/:formId
router.post('/register/:formId', fixedUserController.register.bind(fixedUserController));

// Login - POST /api/form/login
router.post('/login', fixedUserController.login.bind(fixedUserController));

// Debug: Check database state (development only)
if (process.env.NODE_ENV !== 'production') {
  router.get('/debug/db-state', async (req, res) => {
    try {
      const { db } = require('../config/database');
      
      logger.info('🔍 Debug endpoint: Checking database state...');
      
      // Get all users
      const users = await db.all('SELECT id, name, email, phone FROM users');
      logger.info(`📊 Database has ${users?.length || 0} users`);
      
      // Check for specific email if provided
      const queryEmail = req.query.email as string;
      let emailMatch = null;
      if (queryEmail) {
        emailMatch = await db.get('SELECT id, email FROM users WHERE LOWER(email) = LOWER(?)', [queryEmail]);
        logger.info('🔍 Email search result:', { queryEmail, found: !!emailMatch });
      }
      
      res.json({
        success: true,
        database: {
          totalUsers: users?.length || 0,
          users: users || [],
          queryEmail: queryEmail ? { email: queryEmail, found: !!emailMatch, match: emailMatch } : null
        }
      });
    } catch (error: any) {
      logger.error('❌ Debug endpoint error:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  router.post('/debug/delete-all-users', async (req, res) => {
    const { confirmToken } = req.body;
    
    if (confirmToken !== process.env.ADMIN_KEY) {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized'
      });
    }

    try {
      const { db } = require('../config/database');
      await db.run('DELETE FROM users');
      logger.warn('🗑️  DEBUG: All users deleted');
      
      res.json({
        success: true,
        message: 'All users deleted'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
}

// Get users by form - GET /api/form/users/:formId
router.get('/users/:formId', fixedUserController.getUsersByForm.bind(fixedUserController));

// Update user - PUT /api/form/users/:userId
router.put('/users/:userId', fixedUserController.updateUser.bind(fixedUserController));

// Delete user - DELETE /api/form/users/:userId
router.delete('/users/:userId', fixedUserController.deleteUser.bind(fixedUserController));

// Scan user - POST /api/form/scan
router.post('/scan', fixedUserController.scan.bind(fixedUserController));

// Get access logs - GET /api/form/logs/:formId
router.get('/logs/:formId', fixedUserController.getAccessLogs.bind(fixedUserController));

// Analytics - GET /api/form/analytics/:formId
router.get('/analytics/:formId', fixedUserController.getAnalytics.bind(fixedUserController));

export default router;
