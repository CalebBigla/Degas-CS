import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import { upload, uploadCSV } from '../middleware/upload';
import {
  getTables,
  createTable,
  createTableValidation,
  getTableUsers,
  getTableById,
  addUserToTable,
  addUserValidation,
  updateUserInTable,
  deleteUserFromTable,
  deleteTable,
  generateTableIDCards,
  generateCustomIDCard,
  generateBulkDownloadCustom,
  bulkImportUsers,
  bulkImportValidation,
  uploadCSVAndCreateTable,
  previewCSV,
  getIDCardTemplates,
  getDefaultIDCardTemplate,
  saveIDCardTemplate,
  setDefaultIDCardTemplate,
  deleteIDCardTemplate,
  generateBulkIDCards,
  getBulkIDCardStatus,
  getTableIDCardConfig,
  updateTableIDCardConfig,
  sendIDCardEmail
} from '../controllers/tableController';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Get all tables
router.get('/', getTables);

// Create new table (admin and super_admin only)
router.post('/', requireRole(['admin', 'super_admin']), createTableValidation, createTable);

// Get table by ID
router.get('/:tableId', getTableById);

// Delete table (admin and super_admin only)
router.delete('/:tableId', requireRole(['admin', 'super_admin']), deleteTable);

// Get users in a table
router.get('/:tableId/users', getTableUsers);

// Add user to a table (admin and super_admin only)
router.post('/:tableId/users', requireRole(['admin', 'super_admin']), upload.single('photo'), addUserValidation, addUserToTable);

// Update user in a table (admin and super_admin only)
router.put('/:tableId/users/:userId', requireRole(['admin', 'super_admin']), upload.single('photo'), updateUserInTable);

// Delete user from a table (admin and super_admin only)
router.delete('/:tableId/users/:userId', requireRole(['admin', 'super_admin']), deleteUserFromTable);

// Generate ID cards for all users in table (ZIP download)
router.post('/:tableId/generate-cards', requireRole(['admin', 'super_admin']), generateTableIDCards);

// Generate custom ID card for single user
router.post('/:tableId/users/:userId/card/custom', requireRole(['admin', 'super_admin']), generateCustomIDCard);

// Generate bulk download with customization
router.post('/:tableId/bulk-download', requireRole(['admin', 'super_admin']), generateBulkDownloadCustom);

// Bulk import users to existing table
router.post('/:tableId/bulk-import', requireRole(['admin', 'super_admin']), bulkImportValidation, bulkImportUsers);

// Auto-create table from CSV upload (Quick Upload feature)
router.post('/upload-csv', requireRole(['admin', 'super_admin']), uploadCSV.single('file'), uploadCSVAndCreateTable);

// CSV Import endpoint for existing functionality
router.post('/import', requireRole(['admin', 'super_admin']), uploadCSV.single('file'), uploadCSVAndCreateTable);

// CSV Preview endpoint - parse and validate without importing
router.post('/preview-csv', requireRole(['admin', 'super_admin']), uploadCSV.single('file'), previewCSV);

// Alternative route for backward compatibility
router.post('/auto/bulk-import', requireRole(['admin', 'super_admin']), uploadCSV.single('file'), uploadCSVAndCreateTable);

// ========== ID CARD TEMPLATE MANAGEMENT ==========

// Get all ID card templates
router.get('/templates/list', getIDCardTemplates);

// Get default ID card template
router.get('/templates/default', getDefaultIDCardTemplate);

// Create or update ID card template
router.post('/templates', requireRole(['admin', 'super_admin']), saveIDCardTemplate);

// Set default ID card template
router.put('/templates/:templateId/default', requireRole(['admin', 'super_admin']), setDefaultIDCardTemplate);

// Delete ID card template
router.delete('/templates/:templateId', requireRole(['admin', 'super_admin']), deleteIDCardTemplate);

// ========== BULK ID CARD GENERATION ==========

// Generate bulk ID cards for a table
router.post('/:tableId/bulk-cards', requireRole(['admin', 'super_admin']), generateBulkIDCards);

// Get bulk ID card generation status
router.get('/:tableId/bulk-cards/status/:jobId', getBulkIDCardStatus);

// ========== PER-TABLE ID CARD CONFIGURATION ==========

// Get table's ID card configuration
router.get('/:tableId/id-card-config', requireRole(['admin', 'super_admin']), getTableIDCardConfig);

// Update table's ID card configuration
router.put('/:tableId/id-card-config', requireRole(['admin', 'super_admin']), updateTableIDCardConfig);

// Send ID card via email
router.post('/:tableId/users/:userId/send-email', requireRole(['admin', 'super_admin']), sendIDCardEmail);

export default router;