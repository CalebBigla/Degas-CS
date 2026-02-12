import { Request, Response } from 'express';
import { body } from 'express-validator';
import { getDatabase } from '../config/database';
import { handleValidationErrors } from '../middleware/validation';
import { AuthRequest } from '../middleware/auth';
import { QRService } from '../services/qrService';
import { VerifyQRRequest, ScanResult, ApiResponse } from '@gatekeeper/shared';
import logger from '../config/logger';

export const verifyQRValidation = [
  body('qrData').notEmpty().withMessage('QR data is required'),
  body('scannerLocation').optional().isString().withMessage('Scanner location must be a string'),
  handleValidationErrors
];

export const verifyQR = async (req: AuthRequest, res: Response) => {
  try {
    const { qrData, scannerLocation } = req.body as VerifyQRRequest;
    const scannedBy = req.admin?.id;

    logger.info('QR verification request received', { scannerLocation, scannedBy });

    // Use the new database verification method
    const verification = await QRService.verifyQRFromDatabase(qrData);
    
    if (!verification.valid) {
      // Log failed scan attempt
      try {
        const db = getDatabase();
        await db.run(
          `INSERT INTO access_logs (scanner_location, access_granted, scanned_by, scan_timestamp, ip_address, user_agent, denial_reason)
           VALUES (?, ?, ?, datetime('now', 'utc'), ?, ?, ?)`,
          [scannerLocation, 0, scannedBy, req.ip, req.get('User-Agent'), verification.error || 'Invalid QR code']
        );
      } catch (dbError) {
        logger.error('Failed to log access attempt:', dbError);
      }

      const result: ScanResult = {
        success: false,
        accessGranted: false,
        message: verification.error || 'Invalid QR code'
      };

      return res.json({
        success: true,
        data: result
      });
    }

    // QR is valid and user found
    const { user, table, qrCode } = verification;
    const accessGranted = true; // User exists in system

    // Log successful scan
    try {
      const db = getDatabase();
      await db.run(
        `INSERT INTO access_logs (user_id, table_id, qr_code_id, scanner_location, access_granted, scanned_by, scan_timestamp, ip_address, user_agent)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now', 'utc'), ?, ?)`,
        [user!.id, table!.id, qrCode!.id, scannerLocation, 1, scannedBy, req.ip, req.get('User-Agent')]
      );
    } catch (dbError) {
      logger.error('Failed to log access:', dbError);
    }

    const result: ScanResult = {
      success: true,
      user: {
        id: user!.id,
        employeeId: user!.stateCode,
        fullName: user!.name,
        email: user!.email || '',
        role: user!.designation,
        department: user!.department || '',
        photoUrl: user!.photoUrl,
        status: 'active',
        qrHash: qrCode!.id,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      accessGranted,
      message: 'Access granted'
    };

    logger.info(`QR scan: ${user!.name} - GRANTED at ${scannerLocation}`);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    logger.error('QR verification failed:', error);
    res.status(500).json({
      success: false,
      error: 'Verification failed'
    });
  }
};

export const getUserByHash = async (req: AuthRequest, res: Response) => {
  try {
    const { hash } = req.params;

    if (process.env.DEV_MOCK === 'true') {
      logger.warn('🚨 MOCK MODE: Mock user lookup by hash');
      return res.status(404).json({
        success: false,
        error: 'User not found (mock mode)'
      });
    }

    // PRODUCTION-SAFE: Database-only user lookup
    const db = getDatabase();
    const user = await db.get(
      'SELECT id, employee_id, full_name, role, department, photo_url, status FROM users WHERE qr_hash = ?',
      [hash]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        employeeId: user.employee_id,
        fullName: user.full_name,
        role: user.role,
        department: user.department,
        photoUrl: user.photo_url,
        status: user.status
      }
    });

  } catch (error) {
    logger.error('❌ Get user by hash failed - Database error:', error);
    res.status(503).json({
      success: false,
      error: 'Database connection failed - User lookup unavailable'
    });
  }
};

export const getAccessLogs = async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const location = req.query.location as string;
    const granted = req.query.granted as string;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        al.*,
        du.uuid as employee_id,
        du.data as user_data,
        du.photo_url,
        a.username as scanned_by_username
      FROM access_logs al
      LEFT JOIN dynamic_users du ON al.user_id = du.id
      LEFT JOIN admins a ON al.scanned_by = a.id
      WHERE 1=1
    `;
    
    let countQuery = 'SELECT COUNT(*) as count FROM access_logs WHERE 1=1';
    const params: any[] = [];

    // Add location filter
    if (location) {
      query += ` AND al.scanner_location LIKE ?`;
      countQuery += ` AND scanner_location LIKE ?`;
      params.push(`%${location}%`);
    }

    // Add access granted filter
    if (granted !== undefined) {
      const isGranted = granted === 'true' ? 1 : 0;
      query += ` AND al.access_granted = ?`;
      countQuery += ` AND access_granted = ?`;
      params.push(isGranted);
    }

    // Add pagination
    query += ` ORDER BY al.scan_timestamp DESC LIMIT ? OFFSET ?`;
    const queryParams = [...params, limit, offset];
    
    // Get logs and count
    const db = getDatabase();
    const logs = await db.all(query, queryParams);
    const countResult = await db.get(countQuery, params);

    // Parse user data from JSON
    const formattedLogs = logs.map((log: any) => {
      let full_name = 'Unknown User';
      if (log.user_data) {
        try {
          const userData = JSON.parse(log.user_data);
          full_name = userData.fullName || userData.full_name || userData.name || 'Unknown User';
        } catch (e) {
          // Keep default
        }
      }
      return {
        ...log,
        full_name
      };
    });

    const total = countResult?.count || 0;
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        data: formattedLogs,
        total,
        page,
        limit,
        totalPages
      }
    });

  } catch (error) {
    logger.error('Get access logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch access logs'
    });
  }
};