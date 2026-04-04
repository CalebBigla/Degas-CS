import express from 'express';
import fixedUserController from '../controllers/fixedUserController';

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
