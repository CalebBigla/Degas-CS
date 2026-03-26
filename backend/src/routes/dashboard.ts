import express from 'express';
import dashboardController from '../controllers/dashboardController';
import { authenticateCoreUser, requireCoreRole } from '../middleware/coreAuth';

const router = express.Router();

// User endpoints - require core user authentication
router.get('/user/dashboard', authenticateCoreUser, dashboardController.getUserDashboard.bind(dashboardController));

// Admin endpoints - require core user authentication (admin role)
router.get('/admin/core-users', authenticateCoreUser, requireCoreRole(['admin', 'super_admin']), dashboardController.getAllCoreUsers.bind(dashboardController));
router.get('/admin/core-users/:id', authenticateCoreUser, requireCoreRole(['admin', 'super_admin']), dashboardController.getCoreUserById.bind(dashboardController));
router.get('/admin/attendance/overview', authenticateCoreUser, requireCoreRole(['admin', 'super_admin']), dashboardController.getAttendanceOverview.bind(dashboardController));

export default router;
