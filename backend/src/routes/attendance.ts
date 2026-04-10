import express from 'express';
import attendanceController from '../controllers/attendanceController';
import { authenticateCoreUser, requireCoreRole } from '../middleware/coreAuth';
import { requireModuleAccess } from '../middleware/authorizationMiddleware';

const router = express.Router();

// Admin endpoints - require core user authentication and access-logs module access
router.post('/admin/sessions', authenticateCoreUser, requireModuleAccess('access-logs'), attendanceController.createSession.bind(attendanceController));
router.get('/admin/sessions', authenticateCoreUser, requireModuleAccess('access-logs'), attendanceController.getAllSessions.bind(attendanceController));
router.get('/admin/sessions/:id', authenticateCoreUser, requireModuleAccess('access-logs'), attendanceController.getSessionById.bind(attendanceController));
router.put('/admin/sessions/:id', authenticateCoreUser, requireModuleAccess('access-logs'), attendanceController.updateSession.bind(attendanceController));
router.delete('/admin/sessions/:id', authenticateCoreUser, requireModuleAccess('access-logs'), attendanceController.deleteSession.bind(attendanceController));
router.post('/admin/sessions/:id/activate', authenticateCoreUser, requireModuleAccess('access-logs'), attendanceController.toggleSessionActive.bind(attendanceController));
router.get('/admin/sessions/:id/qr', authenticateCoreUser, requireModuleAccess('access-logs'), attendanceController.generateSessionQR.bind(attendanceController));
router.get('/admin/sessions/:id/attendance', authenticateCoreUser, requireModuleAccess('access-logs'), attendanceController.getSessionAttendance.bind(attendanceController));
router.get('/admin/sessions/:id/absentees', authenticateCoreUser, requireModuleAccess('access-logs'), attendanceController.getSessionAbsentees.bind(attendanceController));

// User endpoints - require core user authentication
router.post('/attendance/scan', authenticateCoreUser, attendanceController.scanQR.bind(attendanceController));
router.get('/attendance/history', authenticateCoreUser, attendanceController.getUserAttendanceHistory.bind(attendanceController));

// User self-check-in endpoints
router.post('/user/attendance/checkin', authenticateCoreUser, attendanceController.userCheckIn.bind(attendanceController));
router.get('/user/attendance/recent', authenticateCoreUser, attendanceController.getUserRecentAttendance.bind(attendanceController));

export default router;
