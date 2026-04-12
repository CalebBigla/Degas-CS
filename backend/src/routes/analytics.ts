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
import {
  getAbsentMembers,
  getPresenceStatus,
  exportAbsentMembersCSV,
  getMemberAttendanceHistory,
  getAttendanceAnalyticsSummary,
  resetIndividualUser,
  manualResetAttendance
} from '../controllers/attendanceAnalyticsController';

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

// ============================================================================
// LAYER 1 & LAYER 2: ATTENDANCE ANALYTICS (Two-Layer Logging System)
// ============================================================================

// Get current presence status (present vs absent count)
// Access: Super Admin, Follow-up team
router.get('/presence-status', requireRole(['admin', 'super_admin', 'follow_up']), getPresenceStatus);

// Get all currently absent members (for dashboard and CSV export)
// Access: Super Admin, Follow-up team
router.get('/absent-members', requireRole(['admin', 'super_admin', 'follow_up']), getAbsentMembers);

// Export absent members to CSV
// CSV: Full Name, Phone, Email, Last Scanned Date
// Filename: absent-members-[date].csv
router.post('/export-absent-csv', requireRole(['admin', 'super_admin', 'follow_up']), exportAbsentMembersCSV);

// Get attendance history for a specific member
// Access: Super Admin, Follow-up team
router.get('/attendance-history/:userId', requireRole(['admin', 'super_admin', 'follow_up']), getMemberAttendanceHistory);

// Get attendance analytics summary
// Query params: days (default: 30)
// Access: Super Admin
router.get('/attendance-summary', requireRole(['admin', 'super_admin']), getAttendanceAnalyticsSummary);

// Manual reset: Set all present members to absent
// Superadmin dashboard button for manual correction
// Access: Super Admin ONLY
router.post('/reset-attendance', requireRole(['super_admin']), manualResetAttendance);

// Reset individual user to absent
// Superadmin access logs user reset button
// Access: Super Admin ONLY
router.post('/reset-user/:userId', requireRole(['super_admin']), resetIndividualUser);

export default router;