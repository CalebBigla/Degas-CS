import { Resend } from 'resend';
import logger from '../config/logger';
import fs from 'fs';
import path from 'path';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface SendIDCardEmailParams {
  to: string;
  userName: string;
  tableName: string;
  pdfPath: string;
  pdfBuffer?: Buffer;
  customMessage?: string;
}

export class EmailService {
  /**
   * Check if email service is configured
   */
  static isConfigured(): boolean {
    return !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
  }

  /**
   * Send ID card via email
   */
  static async sendIDCard(params: SendIDCardEmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      if (!this.isConfigured()) {
        throw new Error('Email service not configured. Please set RESEND_API_KEY and EMAIL_FROM environment variables.');
      }

      const { to, userName, tableName, pdfPath, pdfBuffer, customMessage } = params;

      logger.info('📧 Sending ID card email', {
        to,
        userName,
        tableName,
        hasPdfPath: !!pdfPath,
        hasPdfBuffer: !!pdfBuffer
      });

      // Get PDF content
      let pdfContent: Buffer;
      if (pdfBuffer) {
        pdfContent = pdfBuffer;
      } else if (pdfPath && fs.existsSync(pdfPath)) {
        pdfContent = fs.readFileSync(pdfPath);
      } else {
        throw new Error('PDF file not found');
      }

      // Send email with Resend
      const result = await resend.emails.send({
        from: process.env.EMAIL_FROM!,
        to: [to],
        subject: `Your ID Card - ${tableName}`,
        html: this.getEmailTemplate(userName, tableName, customMessage),
        attachments: [
          {
            filename: `${userName.replace(/\s+/g, '_')}_ID_Card.pdf`,
            content: pdfContent,
          },
        ],
      });

      if (result.error) {
        logger.error('❌ Failed to send email:', result.error);
        return {
          success: false,
          error: result.error.message || 'Failed to send email'
        };
      }

      logger.info('✅ Email sent successfully', {
        messageId: result.data?.id,
        to
      });

      return {
        success: true,
        messageId: result.data?.id
      };

    } catch (error: any) {
      logger.error('❌ Email service error:', {
        error: error?.message || String(error),
        stack: error?.stack
      });

      return {
        success: false,
        error: error?.message || 'Failed to send email'
      };
    }
  }

  /**
   * Get HTML email template
   */
  private static getEmailTemplate(userName: string, tableName: string, customMessage?: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Your ID Card</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Your ID Card is Ready!</h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #333333;">
                        Hello <strong>${userName}</strong>,
                      </p>
                      
                      <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #333333;">
                        Your ID card for <strong>${tableName}</strong> has been generated and is attached to this email.
                      </p>
                      
                      ${customMessage ? `
                      <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
                        <p style="margin: 0; font-size: 14px; color: #1e40af; white-space: pre-wrap;">${customMessage}</p>
                      </div>
                      ` : ''}
                      
                      <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px;">
                        <p style="margin: 0; font-size: 14px; color: #065f46;">
                          <strong>📎 Attachment:</strong> Your ID card is attached as a PDF file. You can print it or save it to your device.
                        </p>
                      </div>
                      
                      <p style="margin: 20px 0 0; font-size: 16px; line-height: 1.6; color: #333333;">
                        If you have any questions or need assistance, please don't hesitate to contact us.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                      <p style="margin: 0 0 10px; font-size: 14px; color: #6b7280;">
                        This email was sent by GateKeeper HQ
                      </p>
                      <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                        © ${new Date().getFullYear()} GateKeeper HQ. All rights reserved.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
  }

  /**
   * Send test email to verify configuration
   */
  static async sendTestEmail(to: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          error: 'Email service not configured'
        };
      }

      const result = await resend.emails.send({
        from: process.env.EMAIL_FROM!,
        to: [to],
        subject: 'Test Email - GateKeeper HQ',
        html: '<p>This is a test email from GateKeeper HQ. Your email service is configured correctly!</p>',
      });

      if (result.error) {
        return {
          success: false,
          error: result.error.message
        };
      }

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Failed to send test email'
      };
    }
  }
}

export default EmailService;
