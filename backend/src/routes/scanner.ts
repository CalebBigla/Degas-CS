import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import {
  verifyQR,
  verifyQRValidation,
  getUserByHash,
  getAccessLogs,
  getAllTables
} from '../controllers/scannerController';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Verify QR code
router.post('/verify', verifyQRValidation, verifyQR);

// Get user by QR hash
router.get('/user/:hash', getUserByHash);

// Get access logs
router.get('/logs', getAccessLogs);

// Get all tables for scanner selector
router.get('/tables', getAllTables);

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