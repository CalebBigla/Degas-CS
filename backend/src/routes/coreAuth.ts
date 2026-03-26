import { Router } from 'express';
import {
  register,
  login,
  getCurrentUser,
  listUsers,
  updateUserStatus,
  registerValidation,
  loginValidation
} from '../controllers/coreAuthController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router = Router();

/**
 * Core Auth Routes - End-user authentication
 * Separate from admin authentication
 */

// Public routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);

// Protected routes (require core user authentication)
router.get('/me', getCurrentUser);

// Admin-only routes (require admin authentication)
router.get('/users', authenticateToken, requireRole(['super_admin', 'admin']), listUsers);
router.put('/users/:id/status', authenticateToken, requireRole(['super_admin', 'admin']), updateUserStatus);

export default router;
