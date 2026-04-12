import { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import {
  verifyQR,
  verifyQRForGreeter,
  verifyQRValidation,
  getUserByHash,
  getAccessLogs,
  getAllTables
} from '../controllers/scannerController';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Verify QR code - ADMIN & GREETER (superadmin endpoint now accessible to greeters for troubleshooting)
router.post('/verify', requireRole(['admin', 'super_admin', 'greeter']), verifyQRValidation, verifyQR);

// Verify QR code - GREETER ONLY (uses same validation as admin, rejects admin tokens)
router.post('/scan-greeter', requireRole(['greeter']), verifyQRValidation, verifyQRForGreeter);

// Get user by QR hash - ADMIN ONLY
router.get('/user/:hash', requireRole(['admin', 'super_admin']), getUserByHash);

// Get access logs - ADMIN ONLY
router.get('/logs', requireRole(['admin', 'super_admin']), getAccessLogs);

// Get all tables for scanner selector - ADMIN ONLY
router.get('/tables', requireRole(['admin', 'super_admin']), getAllTables);

// Test route to get verification URL for a user
router.get('/test-qr/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { tableId } = req.query;
    const { QRService } = await import('../services/qrService');
    
    const { qrData, qrImage } = await QRService.generateSecureQR(userId, tableId as string || undefined);
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const verificationUrl = `${baseUrl}/verify/${encodeURIComponent(qrData)}`;
    
    res.json({
      success: true,
      data: {
        verificationUrl,
        qrImage,
        qrData
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to generate test QR'
    });
  }
});

export default router;