import express from 'express';
import formController from '../controllers/formController';
import formsTablesController from '../controllers/formsTablesController';
import { authenticateCoreUser, requireCoreRole } from '../middleware/coreAuth';

const router = express.Router();

// Public endpoint - get active onboarding form
router.get('/onboarding', formController.getOnboardingForm.bind(formController));

// Admin endpoints - require core user authentication
router.get('/admin/forms', authenticateCoreUser, requireCoreRole(['admin', 'super_admin']), formController.getAllForms.bind(formController));
router.get('/admin/forms/:id', authenticateCoreUser, requireCoreRole(['admin', 'super_admin']), formController.getFormById.bind(formController));
router.get('/admin/forms/:id/qr-code', authenticateCoreUser, requireCoreRole(['admin', 'super_admin']), formController.getFormQRCode.bind(formController));
router.post('/admin/forms', authenticateCoreUser, requireCoreRole(['admin', 'super_admin']), formController.createForm.bind(formController));
router.put('/admin/forms/:id', authenticateCoreUser, requireCoreRole(['admin', 'super_admin']), formController.updateForm.bind(formController));
router.delete('/admin/forms/:id', authenticateCoreUser, requireCoreRole(['admin', 'super_admin']), formController.deleteForm.bind(formController));

// Form tables endpoints - lists forms as virtual tables
router.get('/admin/forms-tables', authenticateCoreUser, requireCoreRole(['admin', 'super_admin', 'follow_up']), formsTablesController.getFormTables);
router.get('/admin/forms-tables/:formId/users', authenticateCoreUser, requireCoreRole(['admin', 'super_admin', 'follow_up']), formsTablesController.getFormTableUsers);
router.delete('/admin/forms-tables/:formId/users/:userId', authenticateCoreUser, requireCoreRole(['admin', 'super_admin']), formsTablesController.deleteFormTableUser);

export default router;
