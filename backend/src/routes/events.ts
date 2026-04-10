/**
 * Event Routes - Central event management
 * 
 * All authentication is required for admin operations
 */

import express from 'express';
import eventController from '../controllers/eventController';
import checkInController from '../controllers/checkInController';
import eventRegistrationController from '../controllers/eventRegistrationController';
import { authenticateCoreUser, requireCoreRole } from '../middleware/coreAuth';
import { requireModuleAccess } from '../middleware/authorizationMiddleware';
import { upload } from '../middleware/upload';

const router = express.Router();

// ============================================================================
// EVENT REGISTRATION (Public - no auth required)
// ============================================================================

// Get registration form for an event
router.get(
  '/:eventId/register/form',
  eventRegistrationController.getRegistrationForm.bind(eventRegistrationController)
);

// Register user for an event
router.post(
  '/:eventId/register',
  upload.single('photo'),
  eventRegistrationController.registerForEvent.bind(eventRegistrationController)
);

// ============================================================================
// EVENT MANAGEMENT (Admin only - requires forms module access)
// ============================================================================

// Create event
router.post(
  '/',
  authenticateCoreUser,
  requireModuleAccess('forms'),
  eventController.createEvent.bind(eventController)
);

// Get all events
router.get(
  '/',
  authenticateCoreUser,
  requireModuleAccess('forms'),
  eventController.getAllEvents.bind(eventController)
);

// Get active events (for public registration - no auth required)
router.get('/public/active', eventController.getActiveEvents.bind(eventController));

// Get event by ID
router.get(
  '/:id',
  authenticateCoreUser,
  requireModuleAccess('forms'),
  eventController.getEventById.bind(eventController)
);

// Get registration form for event (no auth required)
router.get('/:id/registration-form', eventController.getEventRegistrationForm.bind(eventController));

// Update event
router.put(
  '/:id',
  authenticateCoreUser,
  requireModuleAccess('forms'),
  eventController.updateEvent.bind(eventController)
);

// Delete event
router.delete(
  '/:id',
  authenticateCoreUser,
  requireModuleAccess('forms'),
  eventController.deleteEvent.bind(eventController)
);

// Get event statistics
router.get(
  '/:id/stats',
  authenticateCoreUser,
  requireModuleAccess('forms'),
  eventController.getEventStats.bind(eventController)
);

// ============================================================================
// CHECK-IN OPERATIONS (Event-driven) - DISABLED
// ============================================================================
// Attendance module disabled. Use QR scanning via /api/scanner/verify instead.

// // Check in user (requires authentication)
// router.post(
//   '/checkin',
//   authenticateCoreUser,
//   checkInController.checkIn.bind(checkInController)
// );

// // Get all check-ins for an event (admin only)
// router.get(
//   '/:eventId/checkins',
//   authenticateCoreUser,
//   requireCoreRole(['admin', 'super_admin']),
//   checkInController.getEventCheckIns.bind(checkInController)
// );

// // Get failed check-ins for an event (admin only)
// router.get(
//   '/:eventId/failed-checkins',
//   authenticateCoreUser,
//   requireCoreRole(['admin', 'super_admin']),
//   checkInController.getFailedCheckIns.bind(checkInController)
// );

// // Get user's check-in history for a specific event
// router.get(
//   '/:eventId/checkins/:userId',
//   authenticateCoreUser,
//   checkInController.getUserEventCheckIns.bind(checkInController)
// );

export default router;
