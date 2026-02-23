import crypto from 'crypto';
import QRCode from 'qrcode';
import { QRPayload } from '@gatekeeper/shared';
import logger from '../config/logger';
import { getDatabase } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import { FieldNormalizer } from './fieldNormalizer';
import { TableSchemaRegistry } from './tableSchemaRegistry';

export class QRService {
  private static readonly QR_SECRET = process.env.QR_SECRET!;

  static async generateSecureQR(
    userId: string, 
    tableId?: string
  ): Promise<{ qrData: string; qrHash: string; qrImage: string; qrId: string }> {
    try {
      const payload: QRPayload = {
        userId,
        timestamp: Date.now(),
        nonce: crypto.randomBytes(16).toString('hex')
      };

      const data = JSON.stringify(payload);
      const signature = crypto
        .createHmac('sha256', this.QR_SECRET)
        .update(data)
        .digest('hex');

      const qrData = Buffer.from(JSON.stringify({ data, signature })).toString('base64');
      const qrHash = crypto.createHash('sha256').update(qrData).digest('hex');
      
      // Create verification URL
      const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const verificationUrl = `${baseUrl}/verify/${qrData}`;
      
      // Generate QR code image with verification URL
      const qrImage = await QRCode.toDataURL(verificationUrl, {
        errorCorrectionLevel: 'M',
        margin: 1,
        color: {
          dark: '#121212',
          light: '#FFFFFF'
        },
        width: 256
      });

      // Store QR code in database
      const qrId = uuidv4();
      const db = getDatabase();
      
      // Use provided tableId or 'default' if not provided
      const finalTableId = tableId || 'default';
      
      logger.info('📊 QR insertion details:', {
        qrId,
        userId,
        finalTableId,
        userIdType: typeof userId,
        userIdLength: String(userId).length,
        tableIdType: typeof finalTableId,
        qrDataLength: qrData?.length
      });
      
      await db.run(
        `INSERT INTO qr_codes (id, user_id, table_id, qr_data, qr_payload, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
        [qrId, userId, finalTableId, qrData, data, true]
      );

      logger.info('QR code generated and stored', { qrId, userId, tableId: finalTableId });

      return { qrData, qrHash, qrImage, qrId };
    } catch (error) {
      logger.error('QR generation failed:', error);
      throw error;
    }
  }

  static verifyQR(qrData: string): { valid: boolean; payload?: QRPayload; error?: string } {
    try {
      logger.info('🔐 [VERIFY_QR] START - Verifying QR data', { 
        qrDataLength: qrData.length, 
        qrDataPreview: qrData.substring(0, 50) 
      });
      
      const decoded = JSON.parse(Buffer.from(qrData, 'base64').toString());
      const { data, signature } = decoded;

      logger.info('🔐 [VERIFY_QR] Decoded QR:', {
        hasData: !!data,
        hasSignature: !!signature,
        dataPreview: data?.substring(0, 80) || 'NONE',
        signatureLength: signature?.length || 0
      });

      if (!data || !signature) {
        logger.warn('🔐 [VERIFY_QR] FAIL - Missing data or signature');
        return { valid: false, error: 'Invalid QR code format' };
      }

      // Verify HMAC signature
      logger.info('🔐 [VERIFY_QR] Computing expected signature...');
      const expectedSignature = crypto
        .createHmac('sha256', this.QR_SECRET)
        .update(data)
        .digest('hex');

      logger.info('🔐 [VERIFY_QR] Signature comparison:', {
        providedSignature: signature.substring(0, 16) + '...',
        expectedSignature: expectedSignature.substring(0, 16) + '...',
        match: signature === expectedSignature
      });

      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );

      if (!isValid) {
        logger.warn('🔐 [VERIFY_QR] FAIL - Signature mismatch');
        return { valid: false, error: 'QR code signature verification failed' };
      }

      logger.info('🔐 [VERIFY_QR] Signature valid ✓');

      const payload: QRPayload = JSON.parse(data);
      logger.info('🔐 [VERIFY_QR] Payload parsed:', {
        userId: payload.userId,
        timestamp: payload.timestamp,
        nonce: payload.nonce?.substring(0, 8) + '...',
        age: Date.now() - payload.timestamp
      });

      // Check if QR code is not too old (24 hours)
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      const age = Date.now() - payload.timestamp;
      
      if (age > maxAge) {
        logger.warn('🔐 [VERIFY_QR] FAIL - Expired', { age, maxAge, ageHours: Math.round(age / 1000 / 60 / 60) });
        return { valid: false, error: 'QR code has expired' };
      }

      logger.info('🔐 [VERIFY_QR] ✅ SUCCESS - QR verified', { userId: payload.userId, ageMinutes: Math.round(age / 1000 / 60) });
      return { valid: true, payload };
    } catch (error: any) {
      logger.error('🔐 [VERIFY_QR] ❌ EXCEPTION:', { 
        error: error.message, 
        stack: error.stack 
      });
      return { valid: false, error: 'Invalid QR code format' };
    }
  }

  static async verifyQRFromDatabase(qrData: string, filterTableId?: string): Promise<{
    valid: boolean;
    user?: any;
    table?: any;
    tableSchema?: any;
    qrCode?: any;
    error?: string;
  }> {
    try {
      logger.info('🔍 verifyQRFromDatabase START', { qrDataLength: qrData?.length, filterTableId });

      // First verify the QR signature
      logger.info('📌 Step 1: Verifying QR signature');
      const verification = this.verifyQR(qrData);
      logger.info('✅ Step 1 complete:', { valid: verification.valid });

      if (!verification.valid) {
        logger.warn('❌ QR signature invalid:', { error: verification.error });
        return { valid: false, error: verification.error };
      }

      const userId = verification.payload?.userId;
      if (!userId) {
        logger.warn('❌ No userId in QR payload');
        return { valid: false, error: 'Invalid QR code format' };
      }

      logger.info('� Step 2: Searching for user', { userId, filterTableId, method: filterTableId ? 'findUserInTable' : 'findUserAcrossTables' });
      let userResult;
      try {
        // Find user - optionally filtered by table
        userResult = filterTableId 
          ? await TableSchemaRegistry.findUserInTable(userId, filterTableId)
          : await TableSchemaRegistry.findUserAcrossTables(userId);
        
        if (userResult) {
          logger.info('📍 Step 2 ✅ - User found:', {
            userId: userResult.user?.id,
            userName: userResult.user?.data?.fullName || userResult.user?.data?.name || 'N/A',
            tableId: userResult.tableId,
            tableName: userResult.tableName,
            userDataKeys: Object.keys(userResult.user?.data || {}).slice(0, 5)
          });
        } else {
          logger.info('📍 Step 2 ⚠️ - No user found', { userId, filterTableId });
        }
      } catch (userSearchError: any) {
        logger.error('📍 Step 2 ❌ - User search error:', {
          error: userSearchError?.message || String(userSearchError),
          stack: userSearchError?.stack
        });
        return { valid: false, error: 'Failed to search for user: ' + (userSearchError?.message || 'Unknown error') };
      }
      
      if (!userResult) {
        const errorMsg = filterTableId 
          ? `User not found in selected table`
          : 'User not found in any table';
        logger.warn('❌ ' + errorMsg, { userId, filterTableId });
        return { valid: false, error: 'QR code not found in system' };
      }

      const { user, tableId, tableName, schema } = userResult;
      logger.info('📌 Step 3: Getting database connection');
      const db = getDatabase();
      logger.info('✅ Step 3 complete, got DB connection');

      // Verify QR code exists and is active
      logger.info('� Step 4: Checking QR record in database', { userId });
      let qrRecord;
      try {
        // First, log what QR codes exist for debugging
        const allQRsForUser = await db.all(
          `SELECT id, is_active, created_at FROM qr_codes WHERE user_id = ? ORDER BY created_at DESC`,
          [userId]
        );
        logger.info('📍 Step 4 - QR codes for this user:', {
          userId,
          totalQRs: allQRsForUser.length,
          qrDetails: allQRsForUser.slice(0, 3).map(q => ({
            id: q.id,
            isActive: q.is_active,
            createdAt: q.created_at
          }))
        });

        qrRecord = await db.get(
          `SELECT id, scan_count, created_at FROM qr_codes 
           WHERE user_id = ? AND is_active = 1
           ORDER BY created_at DESC
           LIMIT 1`,
          [userId]
        );

        if (qrRecord) {
          logger.info('📍 Step 4 ✅ - Active QR record found:', {
            qrId: qrRecord.id,
            scanCount: qrRecord.scan_count,
            createdAt: qrRecord.created_at
          });
        } else {
          logger.warn('📍 Step 4 ⚠️ - No active QR record found', {
            userId,
            activeQRCount: allQRsForUser.filter(q => q.is_active === 1).length,
            totalQRCount: allQRsForUser.length
          });
        }
      } catch (qrCheckError: any) {
        logger.error('📍 Step 4 ❌ - QR check error:', {
          error: qrCheckError?.message || String(qrCheckError),
          stack: qrCheckError?.stack,
          userId
        });
        return { valid: false, error: 'Failed to check QR: ' + (qrCheckError?.message || 'Unknown error') };
      }

      if (!qrRecord) {
        logger.warn('❌ No active QR codes found for user', { userId, tableId });
        return { valid: false, error: 'QR code not found in system' };
      }

      // Update scan count and last scanned time
      logger.info('📌 Step 5: Updating scan count');
      try {
        await db.run(
          `UPDATE qr_codes 
           SET scan_count = scan_count + 1, last_scanned = datetime('now')
           WHERE id = ?`,
          [qrRecord.id]
        );
        logger.info('✅ Step 5 complete');
      } catch (updateError: any) {
        logger.error('❌ Step 5 FAILED - Update error:', {
          error: updateError?.message || String(updateError),
          stack: updateError?.stack
        });
        // Don't return error, just log it - scanning should still work
      }

      // Build dynamic field values from actual user data and schema
      logger.info('📌 Step 6: Building field values');
      const fieldValues: Record<string, any> = {};
      if (schema && schema.fields && user.data) {
        schema.fields.forEach((field: any) => {
          fieldValues[field.name] = user.data[field.name];
        });
      } else if (user.data) {
        Object.assign(fieldValues, user.data);
      }
      logger.info('✅ Step 6 complete');

      logger.info('✅ QR verification successful', {
        userId,
        tableId,
        tableName
      });

      return {
        valid: true,
        user: {
          id: user.id,
          uuid: user.uuid,
          photoUrl: user.photoUrl,
          data: fieldValues
        },
        table: {
          id: tableId,
          name: tableName
        },
        tableSchema: schema,
        qrCode: {
          id: qrRecord.id,
          scanCount: qrRecord.scan_count + 1,
          lastScanned: new Date()
        }
      };
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      logger.error('❌ verifyQRFromDatabase EXCEPTION:', {
        errorMessage,
        errorStack,
        errorType: error?.constructor?.name || typeof error
      });

      return {
        valid: false,
        error: `Verification error: ${errorMessage}`
      };
    }
  }

  static generateQRHash(qrData: string): string {
    return crypto.createHash('sha256').update(qrData).digest('hex');
  }
}