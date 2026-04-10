import express from 'express';
import dashboardController from '../controllers/dashboardController';
import { authenticateCoreUser, requireCoreRole } from '../middleware/coreAuth';
import { requireModuleAccess } from '../middleware/authorizationMiddleware';

const router = express.Router();

// User endpoints - require core user authentication
router.get('/user/dashboard', authenticateCoreUser, dashboardController.getUserDashboard.bind(dashboardController));
router.get('/user/qr-code', authenticateCoreUser, dashboardController.getUserQRCode.bind(dashboardController));

// Admin endpoints - require core user authentication and dashboard module access
router.get('/admin/core-users', authenticateCoreUser, requireModuleAccess('dashboard'), dashboardController.getAllCoreUsers.bind(dashboardController));
router.get('/admin/core-users/:id', authenticateCoreUser, requireModuleAccess('dashboard'), dashboardController.getCoreUserById.bind(dashboardController));
router.get('/admin/attendance/overview', authenticateCoreUser, requireModuleAccess('dashboard'), dashboardController.getAttendanceOverview.bind(dashboardController));

export default router;
