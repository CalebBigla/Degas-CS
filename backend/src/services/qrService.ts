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
      logger.info('Verifying QR data', { qrDataLength: qrData.length, qrDataPreview: qrData.substring(0, 50) });
      
      const decoded = JSON.parse(Buffer.from(qrData, 'base64').toString());
      const { data, signature } = decoded;

      if (!data || !signature) {
        logger.warn('QR verification failed: Missing data or signature');
        return { valid: false, error: 'Invalid QR code format' };
      }

      // Verify HMAC signature
      const expectedSignature = crypto
        .createHmac('sha256', this.QR_SECRET)
        .update(data)
        .digest('hex');

      const isValid = crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );

      if (!isValid) {
        logger.warn('QR verification failed: Signature mismatch');
        return { valid: false, error: 'QR code signature verification failed' };
      }

      const payload: QRPayload = JSON.parse(data);

      // Check if QR code is not too old (24 hours)
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      if (Date.now() - payload.timestamp > maxAge) {
        logger.warn('QR verification failed: Expired', { age: Date.now() - payload.timestamp });
        return { valid: false, error: 'QR code has expired' };
      }

      logger.info('QR signature verified successfully', { userId: payload.userId });
      return { valid: true, payload };
    } catch (error: any) {
      logger.error('QR verification failed:', { error: error.message, stack: error.stack });
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
      // First verify the QR signature
      const verification = this.verifyQR(qrData);
      if (!verification.valid) {
        return { valid: false, error: verification.error };
      }

      const userId = verification.payload?.userId;
      if (!userId) {
        logger.warn('No userId in QR payload');
        return { valid: false, error: 'Invalid QR code format' };
      }

      logger.info('QR signature verified, searching for user', { userId, filterTableId });

      // Find user - optionally filtered by table
      const userResult = filterTableId 
        ? await TableSchemaRegistry.findUserInTable(userId, filterTableId)
        : await TableSchemaRegistry.findUserAcrossTables(userId);
      
      if (!userResult) {
        const errorMsg = filterTableId 
          ? `User not found in selected table`
          : 'User not found in any table';
        logger.warn(errorMsg, { userId, filterTableId });
        return { valid: false, error: 'QR code not found in system' };
      }

      const { user, tableId, tableName, schema } = userResult;
      const db = getDatabase();

      // Verify QR code exists and is active
      const qrRecord = await db.get(
        `SELECT id, scan_count, created_at FROM qr_codes 
         WHERE user_id = ? AND is_active = 1
         ORDER BY created_at DESC
         LIMIT 1`,
        [userId]
      );

      if (!qrRecord) {
        logger.warn('No active QR codes found for user', { userId, tableId });
        return { valid: false, error: 'QR code not found in system' };
      }

      // Update scan count and last scanned time
      await db.run(
        `UPDATE qr_codes 
         SET scan_count = scan_count + 1, last_scanned = datetime('now')
         WHERE id = ?`,
        [qrRecord.id]
      );

      // Build dynamic field values from actual user data and schema
      const fieldValues: Record<string, any> = {};
      if (schema && schema.fields && user.data) {
        schema.fields.forEach((field: any) => {
          fieldValues[field.name] = user.data[field.name];
        });
      } else if (user.data) {
        Object.assign(fieldValues, user.data);
      }

      logger.info('QR verification successful', {
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
    } catch (error) {
      logger.error('Database QR verification failed:', error);
      return { valid: false, error: 'Verification failed' };
    }
  }

  static generateQRHash(qrData: string): string {
    return crypto.createHash('sha256').update(qrData).digest('hex');
  }
}