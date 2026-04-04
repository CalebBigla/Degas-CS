import express from 'express';
import fixedFormController from '../controllers/fixedFormController';

const router = express.Router();

/**
 * Fixed Form Routes
 * Clean, production-ready form management with QR codes
 */

// Create form - POST /api/fixed-forms
router.post('/', fixedFormController.createForm.bind(fixedFormController));

// Get all forms - GET /api/fixed-forms
router.get('/', fixedFormController.getAllForms.bind(fixedFormController));

// Get form by ID - GET /api/fixed-forms/:formId
router.get('/:formId', fixedFormController.getFormById.bind(fixedFormController));

// Update form - PUT /api/fixed-forms/:formId
router.put('/:formId', fixedFormController.updateForm.bind(fixedFormController));

// Delete form - DELETE /api/fixed-forms/:formId
router.delete('/:formId', fixedFormController.deleteForm.bind(fixedFormController));

export default router;
