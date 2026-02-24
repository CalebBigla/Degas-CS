import { Request, Response } from 'express';
import { body } from 'express-validator';
import { getDatabase } from '../config/database';
import { handleValidationErrors } from '../middleware/validation';
import { AuthRequest } from '../middleware/auth';
import { QRService } from '../services/qrService';
import { FieldNormalizer } from '../services/fieldNormalizer';
import { TableSchemaRegistry } from '../services/tableSchemaRegistry';
import { VerifyQRRequest, ScanResult, ApiResponse } from '@gatekeeper/shared';
import logger from '../config/logger';

export const verifyQRValidation = [
  body('qrData').notEmpty().withMessage('QR data is required'),
  body('scannerLocation').optional().isString().withMessage('Scanner location must be a string'),
  body('selectedTableId').optional().isString().withMessage('Selected table ID must be a string'),
  handleValidationErrors
];

export const verifyQR = async (req: AuthRequest, res: Response) => {
  try {
    const { qrData, scannerLocation, selectedTableId } = req.body as VerifyQRRequest & { selectedTableId?: string };
    const scannedBy = req.admin?.id;

    logger.info('🎯 [VERIFY_QR] ========== REQUEST RECEIVED ==========');
    logger.info('🎯 [VERIFY_QR] Admin authenticated', {
      adminId: scannedBy,
      adminUsername: req.admin?.username
    });

    logger.info('🎯 [VERIFY_QR] Request payload:', { 
      scannerLocation, 
      scannedBy,
      selectedTableId: selectedTableId || 'all-tables',
      qrDataLength: qrData?.length || 0,
      qrDataPreview: qrData?.substring(0, 100) || 'NO DATA'
    });

    // Use the new database verification method with optional table filter
    logger.info('🎯 [VERIFY_QR] Calling QRService.verifyQRFromDatabase...');
    const verification = await QRService.verifyQRFromDatabase(qrData, selectedTableId);
    
    logger.info('🎯 [VERIFY_QR] Service returned:', {
      valid: verification.valid,
      hasUser: !!verification.user,
      hasTable: !!verification.table,
      error: verification.error || 'none'
    });
    
    if (!verification.valid) {
      logger.warn('🎯 [VERIFY_QR] ❌ VERIFICATION FAILED', { 
        reason: verification.error,
        qrDataPreview: qrData?.substring(0, 50)
      });

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

      logger.info('📍 Sending 401 response with error');
      return res.status(401).json({
        success: true,
        data: result
      });
    }

    // QR is valid and user found
    const { user, table, tableSchema, qrCode } = verification;
    const accessGranted = true; // User exists in system (or in selected table)

    logger.info('✅ VERIFICATION SUCCESS', {
      userId: user?.id,
      userUuid: user?.uuid,
      tableName: table?.name,
      tableId: table?.id,
      qrCodeId: qrCode?.id
    });

    // Log successful scan
    try {
      const db = getDatabase();
      logger.info('📝 Recording access log:', {
        userId: user!.id,
        tableId: table!.id,
        qrCodeId: qrCode!.id,
        scannerLocation,
        accessGranted: true,
        scannedBy
      });
      await db.run(
        `INSERT INTO access_logs (user_id, table_id, qr_code_id, scanner_location, access_granted, scanned_by, scan_timestamp, ip_address, user_agent)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now', 'utc'), ?, ?)`,
        [user!.id, table!.id, qrCode!.id, scannerLocation, 1, scannedBy, req.ip, req.get('User-Agent')]
      );
      logger.info('✅ Access log recorded successfully');
    } catch (dbError) {
      logger.error('❌ Failed to log access:', dbError);
    }

    // Build result using SCHEMA as source of truth - no hardcoded fields
    // Use first schema field as name field (aligned with ID card customization)
    const getNameFromSchema = (schema: any, data: any): string => {
      if (!schema?.fields || schema.fields.length === 0 || !data) {
        return 'Unknown User';
      }
      
      // First field in schema is the name field
      const nameField = schema.fields[0]?.name;
      if (nameField && data[nameField]) {
        const nameValue = data[nameField];
        return typeof nameValue === 'string' ? nameValue.trim() : String(nameValue);
      }
      
      return 'Unknown User';
    };

    // Build user object from schema - only include fields defined in schema
    const buildUserFromSchema = (schema: any, data: any): any => {
      const userObj: any = {
        id: user!.id,
        photoUrl: user!.photoUrl,
        status: 'active',
        qrHash: qrCode!.id,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      if (!schema?.fields || schema.fields.length === 0) {
        // Fallback: just return all data if no schema
        userObj.fullName = 'Unknown User';
        return userObj;
      }

      // Use first field as fullName
      userObj.fullName = getNameFromSchema(schema, data);

      // Add all other schema fields to user object
      schema.fields.forEach((field: any, index: number) => {
        if (index > 0) { // Skip first field (already set as fullName)
          userObj[field.name] = data?.[field.name] || '';
        }
      });

      logger.info('📋 Built user object from schema:', {
        schemaFieldCount: schema.fields.length,
        userFieldCount: Object.keys(userObj).length,
        nameField: schema.fields[0]?.name,
        nameValue: userObj.fullName
      });

      return userObj;
    };


    // Build dynamic user object from schema
    const userObj = buildUserFromSchema(tableSchema, user!.data);

    const result: ScanResult = {
      success: true,
      user: userObj,
      accessGranted,
      message: 'Access granted'
    };

    // Attach schema and field values for frontend to display dynamically
    // If no schema exists, auto-generate from actual field values
    let schema = tableSchema?.fields || [];
    if (schema.length === 0 && user!.data) {
      // Auto-generate schema from actual user data
      schema = Object.keys(user!.data).map((fieldName, index) => ({
        id: `${fieldName}-${index}`,
        name: fieldName,
        type: typeof user!.data[fieldName],
        displayName: fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/([A-Z])/g, ' $1') // Convert camelCase to Title Case
      }));
      logger.info('📋 Auto-generated schema from user data:', { fieldCount: schema.length, fieldNames: schema.map((f: any) => f.name) });
    }

    const enrichedResult = {
      ...result,
      tableInfo: {
        id: table!.id,
        name: table!.name
      },
      schema,
      fieldValues: user!.data || {}
    };

    logger.info(`✅ QR scan verified - Table: ${table!.name}, User: ${userObj.fullName}`);
    logger.info('📍 CHECKPOINT: Sending successful verification response');

    return res.status(200).json({
      success: true,
      data: enrichedResult
    });

  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    logger.error('❌ QR verification failed:', {
      errorMessage,
      errorStack,
      errorType: error?.constructor?.name || typeof error
    });

    return res.status(500).json({
      success: false,
      error: 'Verification failed',
      details: errorMessage
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

export const getAllTables = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const tables = await TableSchemaRegistry.getAllTables();
    
    res.json({
      success: true,
      data: tables
    });
  } catch (error) {
    logger.error('Get tables error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tables'
    });
  }
};

// DEBUG: Check QR codes in database
export const debugQRCodes = async (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const dbType = process.env.DATABASE_TYPE || 'sqlite';
    
    logger.info('📊 [DEBUG QR] Checking QR codes in database...');
    
    // Get all QR codes with qr_data
    const allQRs = await db.all(`
      SELECT id, user_id, table_id, qr_data, is_active, created_at, scan_count
      FROM qr_codes
      ORDER BY created_at DESC
      LIMIT 20
    `);
    
    logger.info('📊 [DEBUG QR] QR codes found:', {
      count: allQRs.length,
      qrCodes: allQRs.map(qr => ({
        id: qr.id,
        userId: qr.user_id,
        tableId: qr.table_id,
        isActive: qr.is_active,
        createdAt: qr.created_at,
        scanCount: qr.scan_count,
        qrDataExists: !!qr.qr_data,
        qrDataLength: qr.qr_data ? String(qr.qr_data).length : 0
      }))
    });

    // Get count by status
    const activeQRs = await db.get(`SELECT COUNT(*) as count FROM qr_codes WHERE is_active = ${dbType === 'sqlite' ? 1 : 'true'}`);
    const inactiveQRs = await db.get(`SELECT COUNT(*) as count FROM qr_codes WHERE is_active = ${dbType === 'sqlite' ? 0 : 'false'}`);
    
    // Return first 3 complete codes with qr_data for testing
    const testCodes = allQRs.slice(0, 3).map(qr => ({
      id: qr.id,
      userId: qr.user_id,
      tableId: qr.table_id,
      isActive: qr.is_active,
      createdAt: qr.created_at,
      qrData: qr.qr_data  // Include the actual QR data for testing
    }));
    
    res.json({
      success: true,
      data: {
        totalQRCodes: allQRs.length,
        activeCount: activeQRs?.count || 0,
        inactiveCount: inactiveQRs?.count || 0,
        testCodes: testCodes,
        allCodesCount: allQRs.length,
        notice: 'Use testCodes with /debug/verify-qr endpoint to test verification'
      }
    });
  } catch (error: any) {
    logger.error('📊 [DEBUG QR] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Debug check failed',
      details: error?.message || String(error)
    });
  }
};

// DEBUG: Test QR verification with a specific code
export const debugVerifyQR = async (req: Request, res: Response) => {
  try {
    const { qrData } = req.body;
    
    if (!qrData) {
      return res.status(400).json({
        success: false,
        error: 'qrData required in body'
      });
    }
    
    logger.info('🔐 [DEBUG VERIFY] Testing QR verification...', {
      qrDataLength: qrData.length,
      qrDataPreview: qrData.substring(0, 100)
    });

    // Step 1: Verify signature
    logger.info('🔐 [DEBUG VERIFY] Step 1: Verifying signature...');
    const signatureResult = QRService.verifyQR(qrData);
    logger.info('🔐 [DEBUG VERIFY] Signature result:', {
      valid: signatureResult.valid,
      userId: signatureResult.payload?.userId,
      error: signatureResult.error
    });

    if (!signatureResult.valid) {
      return res.status(400).json({
        success: false,
        step: 'SIGNATURE_VERIFICATION',
        error: signatureResult.error,
        details: 'QR code signature is invalid'
      });
    }

    const userId = signatureResult.payload?.userId;

    if (!userId) {
      return res.status(400).json({
        success: false,
        step: 'PAYLOAD_EXTRACTION',
        error: 'Could not extract userId from QR payload',
        details: 'The QR signature is valid but userId is missing from payload'
      });
    }

    // Step 2: Check if user exists and find their table
    logger.info('🔐 [DEBUG VERIFY] Step 2: Searching for user...', { userId });
    const userResult = await TableSchemaRegistry.findUserAcrossTables(userId);
    logger.info('🔐 [DEBUG VERIFY] User search result:', {
      userFound: !!userResult,
      tableId: userResult?.tableId,
      tableName: userResult?.tableName,
      userId: userResult?.user?.id
    });

    if (!userResult) {
      return res.status(400).json({
        success: false,
        step: 'USER_LOOKUP',
        userId,
        error: 'User not found in any table',
        details: 'The user ID from the QR code does not exist in the database'
      });
    }

    // Step 3: Check if QR code record exists
    logger.info('🔐 [DEBUG VERIFY] Step 3: Checking QR record in database...', { userId });
    const db = getDatabase();
    const qrRecord = await db.get(`
      SELECT id, is_active, scan_count, created_at
      FROM qr_codes
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `, [userId]);

    logger.info('🔐 [DEBUG VERIFY] QR record check:', {
      found: !!qrRecord,
      isActive: qrRecord?.is_active,
      scanCount: qrRecord?.scan_count,
      createdAt: qrRecord?.created_at
    });

    if (!qrRecord) {
      return res.status(400).json({
        success: false,
        step: 'QR_RECORD_LOOKUP',
        userId,
        error: 'No QR code record found for this user',
        details: 'The user exists but has no QR code stored in the database',
        userData: {
          id: userResult.user.id,
          name: userResult.user.data?.fullName,
          tableId: userResult.tableId
        }
      });
    }

    if (!qrRecord.is_active) {
      return res.status(400).json({
        success: false,
        step: 'QR_INACTIVE',
        userId,
        error: 'QR code is inactive',
        details: 'The QR code for this user is marked as inactive'
      });
    }

    res.json({
      success: true,
      verification: 'PASSED',
      steps: {
        signatureVerification: 'PASSED',
        userLookup: 'PASSED',
        qrRecordLookup: 'PASSED'
      },
      data: {
        user: {
          id: userResult.user.id,
          name: userResult.user.data?.fullName,
          tableId: userResult.tableId,
          tableName: userResult.tableName
        },
        qrRecord: {
          id: qrRecord.id,
          scanCount: qrRecord.scan_count,
          createdAt: qrRecord.created_at,
          isActive: qrRecord.is_active
        }
      }
    });
  } catch (error: any) {
    logger.error('🔐 [DEBUG VERIFY] Exception:', error);
    res.status(500).json({
      success: false,
      step: 'EXCEPTION',
      error: error?.message || String(error),
      details: error?.stack
    });
  }
};