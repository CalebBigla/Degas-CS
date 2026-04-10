import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import { 
  getDashboardStats, 
  getAccessAnalytics, 
  getAccessLogs, 
  getAnalyticsLogs, 
  getScanStats,
  getDashboardStatsNew,
  getRecentRegistrations
} from '../controllers/analyticsController';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Dashboard statistics (all roles)
router.get('/dashboard', getDashboardStats);

// New dashboard statistics endpoint
router.get('/dashboard-stats', getDashboardStatsNew);

// Recent registrations endpoint
router.get('/recent-registrations', getRecentRegistrations);

// Scan statistics - count scanned vs not scanned users (admin and super_admin only)
router.get('/scan-stats', requireRole(['admin', 'super_admin']), getScanStats);

// Access analytics (admin and super_admin only)
router.get('/access', requireRole(['admin', 'super_admin']), getAccessAnalytics);

// Access logs with pagination and filtering (admin and super_admin only)
router.get('/access-logs', requireRole(['admin', 'super_admin']), getAccessLogs);

// Analytics logs with date range (admin and super_admin only)
router.get('/logs', requireRole(['admin', 'super_admin']), getAnalyticsLogs);

export default router;