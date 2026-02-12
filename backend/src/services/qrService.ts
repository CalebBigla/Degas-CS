import crypto from 'crypto';
import QRCode from 'qrcode';
import { QRPayload } from '@gatekeeper/shared';
import logger from '../config/logger';
import { getDatabase } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

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
      
      await db.run(
        `INSERT INTO qr_codes (id, user_id, table_id, qr_data, qr_payload, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, 1, datetime('now'))`,
        [qrId, userId, finalTableId, qrData, data]
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
      const decoded = JSON.parse(Buffer.from(qrData, 'base64').toString());
      const { data, signature } = decoded;

      if (!data || !signature) {
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
        return { valid: false, error: 'QR code signature verification failed' };
      }

      const payload: QRPayload = JSON.parse(data);

      // Check if QR code is not too old (24 hours)
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      if (Date.now() - payload.timestamp > maxAge) {
        return { valid: false, error: 'QR code has expired' };
      }

      return { valid: true, payload };
    } catch (error) {
      logger.error('QR verification failed:', error);
      return { valid: false, error: 'Invalid QR code format' };
    }
  }

  static async verifyQRFromDatabase(qrData: string): Promise<{
    valid: boolean;
    user?: any;
    table?: any;
    qrCode?: any;
    error?: string;
  }> {
    try {
      // First verify the QR signature
      const verification = this.verifyQR(qrData);
      if (!verification.valid) {
        return { valid: false, error: verification.error };
      }

      // Look up QR code in database
      const db = getDatabase();
      const qrRecord = await db.get(
        `SELECT qc.*, du.data as user_data, du.photo_url, t.name as table_name, t.schema
         FROM qr_codes qc
         JOIN dynamic_users du ON qc.user_id = du.id
         JOIN tables t ON qc.table_id = t.id
         WHERE qc.qr_data = ? AND qc.is_active = 1`,
        [qrData]
      );

      if (!qrRecord) {
        return { valid: false, error: 'QR code not found in system' };
      }

      // Update scan count and last scanned time
      await db.run(
        `UPDATE qr_codes 
         SET scan_count = scan_count + 1, last_scanned = datetime('now')
         WHERE id = ?`,
        [qrRecord.id]
      );

      // Parse user data
      const userData = JSON.parse(qrRecord.user_data);

      return {
        valid: true,
        user: {
          id: qrRecord.user_id,
          name: userData.fullName || userData.name || userData['NAMES'] || 'Unknown',
          stateCode: userData.stateCode || userData['STATE CODE'] || userData.id || 'N/A',
          designation: userData.designation || userData.role || userData.DESIGNATION || 'Member',
          photoUrl: qrRecord.photo_url,
          ...userData
        },
        table: {
          id: qrRecord.table_id,
          name: qrRecord.table_name
        },
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