import express from 'express';
import attendanceController from '../controllers/attendanceController';
import { authenticateCoreUser, requireCoreRole } from '../middleware/coreAuth';

const router = express.Router();

// Admin endpoints - require core user authentication (admin role)
router.post('/admin/sessions', authenticateCoreUser, requireCoreRole(['admin', 'super_admin']), attendanceController.createSession.bind(attendanceController));
router.get('/admin/sessions', authenticateCoreUser, requireCoreRole(['admin', 'super_admin']), attendanceController.getAllSessions.bind(attendanceController));
router.get('/admin/sessions/:id', authenticateCoreUser, requireCoreRole(['admin', 'super_admin']), attendanceController.getSessionById.bind(attendanceController));
router.put('/admin/sessions/:id', authenticateCoreUser, requireCoreRole(['admin', 'super_admin']), attendanceController.updateSession.bind(attendanceController));
router.delete('/admin/sessions/:id', authenticateCoreUser, requireCoreRole(['admin', 'super_admin']), attendanceController.deleteSession.bind(attendanceController));
router.post('/admin/sessions/:id/activate', authenticateCoreUser, requireCoreRole(['admin', 'super_admin']), attendanceController.toggleSessionActive.bind(attendanceController));
router.get('/admin/sessions/:id/qr', authenticateCoreUser, requireCoreRole(['admin', 'super_admin']), attendanceController.generateSessionQR.bind(attendanceController));
router.get('/admin/sessions/:id/attendance', authenticateCoreUser, requireCoreRole(['admin', 'super_admin']), attendanceController.getSessionAttendance.bind(attendanceController));
router.get('/admin/sessions/:id/absentees', authenticateCoreUser, requireCoreRole(['admin', 'super_admin']), attendanceController.getSessionAbsentees.bind(attendanceController));

// User endpoints - require core user authentication
router.post('/attendance/scan', authenticateCoreUser, attendanceController.scanQR.bind(attendanceController));
router.get('/attendance/history', authenticateCoreUser, attendanceController.getUserAttendanceHistory.bind(attendanceController));

export default router;
