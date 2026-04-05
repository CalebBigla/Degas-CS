import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../config/database';
import logger from '../config/logger';
import { QRService } from '../services/qrService';

/**
 * Fixed User Schema Controller
 * Handles registration, login, and user management for the fixed User schema
 */
class FixedUserController {
  /**
   * Register a new user with a specific form
   * POST /api/auth/register/:formId
   */
  async register(req: Request, res: Response) {
    try {
      const { formId } = req.params;
      const { name, phone, email, address, password } = req.body;

      // Validate required fields
      if (!name || !phone || !email || !address || !password) {
        return res.status(400).json({
          success: false,
          message: 'All fields are required: name, phone, email, address, password'
        });
      }

      if (!formId) {
        return res.status(400).json({
          success: false,
          message: 'formId is required'
        });
      }

      // Check if form exists
      const form = await db.get('SELECT id, name FROM forms WHERE id = ?', [formId]);
      if (!form) {
        return res.status(404).json({
          success: false,
          message: 'Form not found'
        });
      }

      // Check for duplicate email
      const existingEmail = await db.get('SELECT id FROM users WHERE email = ?', [email]);
      if (existingEmail) {
        return res.status(409).json({
          success: false,
          message: 'Email already registered'
        });
      }

      // Check for duplicate phone
      const existingPhone = await db.get('SELECT id FROM users WHERE phone = ?', [phone]);
      if (existingPhone) {
        return res.status(409).json({
          success: false,
          message: 'Phone number already registered'
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Generate user ID
      const userId = uuidv4();

      // Insert user into database
      const now = new Date().toISOString();
      await db.run(
        `INSERT INTO users (id, name, phone, email, address, password, formid, scanned, scannedat, createdat, updatedat)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, name, phone, email, address, hashedPassword, formId, false, null, now, now]
      );

      logger.info('✅ User registered successfully', { userId, email, formId });

      // Return success response
      res.status(201).json({
        success: true,
        userId,
        formId
      });

    } catch (error: any) {
      logger.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Registration failed',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Login user
   * POST /api/form/login
   */
  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      // Validate required fields
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }

      // Find user by email
      const user = await db.get(
        'SELECT id, name, phone, email, address, password, formid, scanned, scannedat FROM users WHERE email = ?',
        [email]
      );

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // Use QRService to generate secure QR code
      const { qrImage } = await QRService.generateSecureQR(user.id, user.formid);

      logger.info('✅ User logged in successfully', { userId: user.id, email: user.email });

      // Return user data (excluding password) with QR code
      res.json({
        success: true,
        userId: user.id,
        formId: user.formid,
        qrCode: qrImage, // Base64 QR code image
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          address: user.address,
          scanned: user.scanned,
          scannedAt: user.scannedat
        }
      });

    } catch (error: any) {
      logger.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get all users for a specific form
   * GET /api/users/:formId
   */
  async getUsersByForm(req: Request, res: Response) {
    try {
      const { formId } = req.params;

      if (!formId) {
        return res.status(400).json({
          success: false,
          message: 'formId is required'
        });
      }

      // Get users (excluding passwords)
      const users = await db.all(
        `SELECT id, name, phone, email, address, scanned, scannedat, createdat, updatedat
         FROM users
         WHERE formid = ?
         ORDER BY createdat DESC`,
        [formId]
      );

      logger.info(`📊 Fetched ${users.length} users for form ${formId}`);

      res.json({
        success: true,
        data: users
      });

    } catch (error: any) {
      logger.error('Error fetching users:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch users',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Scan a user (mark as attended) and create access log
   * POST /api/scan
   * 
   * This endpoint accepts QR data in multiple formats:
   * 1. JSON with userId and formId: {"userId": "...", "formId": "..."}
   * 2. Form URL: https://localhost:5173/scan/:formId (requires userId in body)
   * 3. Just formId (requires userId in body)
   */
  async scan(req: Request, res: Response) {
    try {
      const { qrData, userId: bodyUserId } = req.body;

      // Validate required fields
      if (!qrData) {
        return res.status(400).json({
          success: false,
          message: 'qrData is required'
        });
      }

      let userId: string;
      let formId: string;
      
      // Try to parse as JSON first (user QR code)
      try {
        const parsed = JSON.parse(qrData);
        userId = parsed.userId;
        formId = parsed.formId;
      } catch (parseError) {
        // Not JSON, try to extract formId from URL or use as-is
        // Format 1: https://localhost:5173/scan/06aa4b67-76fe-411a-a1e0-682871e8506f
        // Format 2: 06aa4b67-76fe-411a-a1e0-682871e8506f
        
        const urlMatch = qrData.match(/\/scan\/([a-f0-9-]+)/i);
        if (urlMatch) {
          formId = urlMatch[1];
        } else if (/^[a-f0-9-]{36}$/i.test(qrData)) {
          // UUID format
          formId = qrData;
        } else {
          return res.status(400).json({
            success: false,
            message: 'Invalid QR code format. Expected JSON, URL, or UUID.'
          });
        }
        
        // For form QR codes, userId must be provided in request body
        if (!bodyUserId) {
          return res.status(400).json({
            success: false,
            message: 'userId is required when scanning form QR code'
          });
        }
        userId = bodyUserId;
      }

      if (!userId || !formId) {
        return res.status(400).json({
          success: false,
          message: 'QR code missing userId or formId'
        });
      }

      // Verify form exists
      const form = await db.get('SELECT id, name FROM forms WHERE id = ?', [formId]);
      if (!form) {
        return res.status(404).json({
          success: false,
          message: 'Form not found'
        });
      }

      // Find user
      const user = await db.get(
        'SELECT id, name, email, formid, scanned, scannedat FROM users WHERE id = ?',
        [userId]
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Verify user belongs to the form
      if (user.formid !== formId) {
        return res.status(400).json({
          success: false,
          message: 'User does not belong to this form'
        });
      }

      // Check if already scanned
      if (user.scanned) {
        return res.status(400).json({
          success: false,
          message: 'Already scanned',
          scannedAt: user.scannedat
        });
      }

      const scannedAt = new Date().toISOString();
      const updatedAt = new Date().toISOString();

      // Mark as scanned
      await db.run(
        `UPDATE users SET scanned = ?, scannedat = ?, updatedat = ? WHERE id = ?`,
        [true, scannedAt, updatedAt, userId]
      );

      // Create access log entry
      const now = new Date().toISOString();
      await db.run(
        `INSERT INTO access_logs (user_id, table_id, access_granted, scan_timestamp, ip_address, user_agent)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, formId, true, now, req.ip || req.connection.remoteAddress, req.get('user-agent')]
      );

      logger.info('✅ User scanned successfully and access logged', { userId, formId, userName: user.name });

      res.json({
        success: true,
        message: 'Scan successful',
        userId,
        userName: user.name,
        formId,
        scannedAt
      });

    } catch (error: any) {
      logger.error('Scan error:', error);
      res.status(500).json({
        success: false,
        message: 'Scan failed',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get access logs for a specific form
   * GET /api/logs/:formId
   */
  async getAccessLogs(req: Request, res: Response) {
    try {
      const { formId } = req.params;

      if (!formId) {
        return res.status(400).json({
          success: false,
          message: 'formId is required'
        });
      }

      // Verify form exists
      const form = await db.get('SELECT id, name FROM forms WHERE id = ?', [formId]);
      if (!form) {
        return res.status(404).json({
          success: false,
          message: 'Form not found'
        });
      }

      // Get access logs with user details
      const logs = await db.all(
        `SELECT 
          al.id,
          al.user_id as userId,
          al.table_id as formId,
          al.access_granted as accessGranted,
          al.scan_timestamp as timestamp,
          al.ip_address as ipAddress,
          al.user_agent as userAgent,
          u.name as userName,
          u.email as userEmail,
          u.phone as userPhone
         FROM access_logs al
         LEFT JOIN users u ON al.user_id = u.id
         WHERE al.table_id = ?
         ORDER BY al.scan_timestamp DESC`,
        [formId]
      );

      logger.info(`📊 Fetched ${logs.length} access logs for form ${formId}`);

      res.json({
        success: true,
        data: logs
      });

    } catch (error: any) {
      logger.error('Error fetching access logs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch access logs',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Get analytics for a form
   * GET /api/analytics/:formId
   */
  async getAnalytics(req: Request, res: Response) {
    try {
      const { formId } = req.params;

      if (!formId) {
        return res.status(400).json({
          success: false,
          message: 'formId is required'
        });
      }

      // Get total users
      const totalResult = await db.get(
        'SELECT COUNT(*) as count FROM users WHERE formid = ?',
        [formId]
      );

      // Get scanned users
      const scannedResult = await db.get(
        'SELECT COUNT(*) as count FROM users WHERE formid = ? AND scanned = 1',
        [formId]
      );

      // Get not scanned users
      const notScannedResult = await db.get(
        'SELECT COUNT(*) as count FROM users WHERE formid = ? AND scanned = 0',
        [formId]
      );

      const total = totalResult?.count || 0;
      const attended = scannedResult?.count || 0;
      const notAttended = notScannedResult?.count || 0;

      logger.info(`📊 Analytics for form ${formId}:`, { total, attended, notAttended });

      res.json({
        success: true,
        data: {
          total,
          attended,
          notAttended,
          attendanceRate: total > 0 ? ((attended / total) * 100).toFixed(2) : '0.00'
        }
      });

    } catch (error: any) {
      logger.error('Analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch analytics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Update a user
   * PUT /api/form/users/:userId
   */
  async updateUser(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { name, phone, email, address } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'userId is required'
        });
      }

      // Find user
      const user = await db.get('SELECT id, formid FROM users WHERE id = ?', [userId]);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Update user
      const updatedAt = new Date().toISOString();
      await db.run(
        `UPDATE users 
         SET name = ?, phone = ?, email = ?, address = ?, updatedat = ?
         WHERE id = ?`,
        [name, phone, email, address, updatedAt, userId]
      );

      logger.info('✅ User updated successfully', { userId, email });

      res.json({
        success: true,
        message: 'User updated successfully'
      });

    } catch (error: any) {
      logger.error('Update user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update user',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * Delete a user
   * DELETE /api/form/users/:userId
   */
  async deleteUser(req: Request, res: Response) {
    try {
      const { userId } = req.params;

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'userId is required'
        });
      }

      // Find user
      const user = await db.get('SELECT id, name, email FROM users WHERE id = ?', [userId]);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Delete user
      await db.run('DELETE FROM users WHERE id = ?', [userId]);

      // Delete associated access logs
      await db.run('DELETE FROM access_logs WHERE user_id = ?', [userId]);

      logger.info('✅ User deleted successfully', { userId, email: user.email });

      res.json({
        success: true,
        message: 'User deleted successfully'
      });

    } catch (error: any) {
      logger.error('Delete user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete user',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

export default new FixedUserController();
