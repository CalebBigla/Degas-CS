import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import { getIDCardSettings, updateIDCardSettings } from '../controllers/settingsController';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get ID card settings (all authenticated users can view)
router.get('/id-card', getIDCardSettings);

// Update ID card settings (admin and super_admin only)
router.put('/id-card', requireRole(['admin', 'super_admin']), updateIDCardSettings);

export default router;
