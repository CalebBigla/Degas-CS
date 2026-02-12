import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import { upload } from '../middleware/upload';
import {
  createUser,
  createUserValidation,
  getUsers,
  getUserById,
  updateUser,
  updateUserValidation,
  deleteUser,
  generateUserCard
} from '../controllers/userController';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get users (all roles)
router.get('/', getUsers);

// Get single user (all roles)
router.get('/:id', getUserById);

// Create user (admin and super_admin only)
router.post('/', requireRole(['admin', 'super_admin']), upload.single('photo'), createUserValidation, createUser);

// Update user (admin and super_admin only)
router.put('/:id', requireRole(['admin', 'super_admin']), upload.single('photo'), updateUserValidation, updateUser);

// Delete user (admin and super_admin only)
router.delete('/:id', requireRole(['admin', 'super_admin']), deleteUser);

// Generate ID card (all roles)
router.get('/:id/card', generateUserCard);

// Bulk upload users
router.post('/bulk-upload', requireRole(['admin', 'super_admin']), upload.single('file'), createUser);

// Download CSV template
router.get('/template', (req, res) => {
  const csvContent = 'fullName,email,employeeId,role,department,status\nJohn Doe,john@example.com,EMP001,Manager,IT,active\n';
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=user_template.csv');
  res.send(csvContent);
});

export default router;