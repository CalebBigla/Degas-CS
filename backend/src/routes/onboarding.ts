import express from 'express';
import onboardingController from '../controllers/onboardingController';
import { upload } from '../middleware/upload';

const router = express.Router();

// Public endpoints - no authentication required

// Get active onboarding form
router.get('/form', onboardingController.getForm.bind(onboardingController));

// Get specific form by ID
router.get('/form/:formId', onboardingController.getFormById.bind(onboardingController));

// Register new user with dynamic form (active form)
// Supports both JSON and multipart/form-data (for file uploads)
router.post(
  '/register',
  upload.single('photo'), // Optional file upload
  onboardingController.register.bind(onboardingController)
);

// Register with specific form by ID
router.post(
  '/register/:formId',
  upload.single('photo'),
  onboardingController.registerWithForm.bind(onboardingController)
);

export default router;
