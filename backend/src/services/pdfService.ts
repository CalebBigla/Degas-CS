import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';
import { QRService } from './qrService';
import logger from '../config/logger';
import { getDatabase } from '../config/database';

// Helper function to sanitize text for PDF generation
function sanitizeTextForPDF(text: string | undefined | null): string {
  if (!text) return '';
  
  return String(text)
    // Remove BOM (Byte Order Mark) characters
    .replace(/^\uFEFF/, '')
    .replace(/\uFEFF/g, '')
    // Remove other problematic Unicode characters
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    // Replace smart quotes with regular quotes
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    // Remove zero-width characters
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    // Trim whitespace
    .trim();
}

export class PDFService {
  // Helper to fetch ID card settings from database
  static async getIDCardSettings() {
    try {
      const db = getDatabase();
      const settings = await db.get('SELECT * FROM id_card_settings WHERE is_active = 1');
      
      if (!settings) {
        // Return default settings
        return {
          visible_fields: {
            name: true,
            photo: true,
            idNumber: true,
            department: true,
            email: false
          },
          layout: 'standard',
          background_template: 'light',
          font_size: 'medium',
          qr_position: 'bottom-right'
        };
      }
      
      return {
        visible_fields: JSON.parse(settings.visible_fields),
        layout: settings.layout,
        background_template: settings.background_template,
        font_size: settings.font_size,
        qr_position: settings.qr_position,
        logo_url: settings.logo_url
      };
    } catch (error) {
      logger.warn('Failed to fetch ID card settings, using defaults:', error);
      return {
        visible_fields: {
          name: true,
          photo: true,
          idNumber: true,
          department: true,
          email: false
        },
        layout: 'standard',
        background_template: 'light',
        font_size: 'medium',
        qr_position: 'bottom-right'
      };
    }
  }

  static async generateIDCard(user: any, customSettings?: any): Promise<Buffer> {
    try {
      // Validate user data
      if (!user) {
        throw new Error('User data is required');
      }
      
      // Fetch settings from database if not provided
      const settings = customSettings || await this.getIDCardSettings();
      
      // Log the user data being processed
      logger.info('PDF Service - Generating ID card for user:', {
        id: user.id,
        data: user.data || user,
        createdAt: user.createdAt
      });
      
      // Extract user data - handle both direct user objects and dynamic user objects
      const userData = user.data || user;
      
      // Try to find name field dynamically
      const nameField = userData.fullName || userData.full_name || userData.name || 
                       userData.firstName || userData.first_name || 'Unknown User';
      
      // Try to find role/position field dynamically  
      const roleField = userData.role || userData.position || userData.job_title || 
                       userData.title || userData.designation || 'No Role';
      
      // Try to find department field dynamically
      const deptField = userData.department || userData.dept || userData.division || 
                       userData.section || userData.unit || '';
      
      // Try to find email field dynamically
      const emailField = userData.email || userData.email_address || userData.mail || '';
      
      // Try to find status field dynamically
      const statusField = userData.status || userData.state || userData.active || 'active';
      
      // Ensure we have minimum required data
      const safeUser = {
        ...user,
        fullName: nameField,
        role: roleField,
        department: deptField,
        email: emailField,
        status: statusField,
        employeeId: user.employeeId || user.uuid || user.id || 'N/A'
      };
      
      // Create a new PDF document
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([350, 220]); // ID card size (3.5" x 2.2")

      // Embed fonts
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // Colors
      const charcoal = rgb(0.07, 0.07, 0.07); // #121212
      const emerald = rgb(0.06, 0.73, 0.51); // #10B981
      const white = rgb(1, 1, 1);

      // Background
      page.drawRectangle({
        x: 0,
        y: 0,
        width: 350,
        height: 220,
        color: white,
      });

      // Header bar
      page.drawRectangle({
        x: 0,
        y: 180,
        width: 350,
        height: 40,
        color: charcoal,
      });

      // Company name
      page.drawText('DEGAS CS', {
        x: 20,
        y: 195,
        size: 16,
        font: helveticaBoldFont,
        color: white,
      });

      // Access Control badge
      page.drawText('ACCESS CONTROL', {
        x: 20,
        y: 185,
        size: 8,
        font: helveticaFont,
        color: emerald,
      });

      // User photo embedding
      if (safeUser.photoUrl) {
        try {
          // Load and embed actual photo
          const photoPath = path.join(__dirname, '../../', safeUser.photoUrl);
          const photoExists = await fs.access(photoPath).then(() => true).catch(() => false);
          
          if (photoExists) {
            const photoBytes = await fs.readFile(photoPath);
            let photoImage;
            
            // Detect image type and embed accordingly
            const ext = path.extname(safeUser.photoUrl).toLowerCase();
            if (ext === '.png') {
              photoImage = await pdfDoc.embedPng(photoBytes);
            } else if (['.jpg', '.jpeg'].includes(ext)) {
              photoImage = await pdfDoc.embedJpg(photoBytes);
            } else {
              throw new Error('Unsupported image format');
            }
            
            // Draw the photo
            page.drawImage(photoImage, {
              x: 20,
              y: 100,
              width: 60,
              height: 60,
            });
            
            // Add border
            page.drawRectangle({
              x: 20,
              y: 100,
              width: 60,
              height: 60,
              borderColor: emerald,
              borderWidth: 2,
            });
          } else {
            throw new Error('Photo file not found');
          }
        } catch (photoError) {
          logger.warn('Failed to embed photo, using placeholder:', photoError);
          // Fallback to branded placeholder
          page.drawRectangle({
            x: 20,
            y: 100,
            width: 60,
            height: 60,
            color: rgb(0.95, 0.95, 0.95),
            borderColor: emerald,
            borderWidth: 1,
          });
          
          // Draw user initials
          const initials = safeUser.fullName
            .split(' ')
            .map((name: string) => name.charAt(0))
            .join('')
            .toUpperCase()
            .substring(0, 2);
            
          page.drawText(initials || 'DC', {
            x: 35,
            y: 125,
            size: 16,
            font: helveticaBoldFont,
            color: emerald,
          });
        }
      } else {
        // No photo - use branded placeholder
        page.drawRectangle({
          x: 20,
          y: 100,
          width: 60,
          height: 60,
          color: rgb(0.95, 0.95, 0.95),
          borderColor: emerald,
          borderWidth: 1,
        });
        
        // Draw user initials if available
        const initials = safeUser.fullName
          .split(' ')
          .map((name: string) => name.charAt(0))
          .join('')
          .toUpperCase()
          .substring(0, 2);
          
        page.drawText(initials || 'DC', {
          x: 35,
          y: 125,
          size: 16,
          font: helveticaBoldFont,
          color: emerald,
        });
      }

      // User information - using safeUser data
      page.drawText(safeUser.fullName.toUpperCase(), {
        x: 100,
        y: 145,
        size: 14,
        font: helveticaBoldFont,
        color: charcoal,
      });

      page.drawText(`ID: ${safeUser.employeeId}`, {
        x: 100,
        y: 130,
        size: 10,
        font: helveticaFont,
        color: charcoal,
      });

      page.drawText(`Role: ${safeUser.role}`, {
        x: 100,
        y: 115,
        size: 10,
        font: helveticaFont,
        color: charcoal,
      });

      if (safeUser.department) {
        page.drawText(`Dept: ${safeUser.department}`, {
          x: 100,
          y: 100,
          size: 10,
          font: helveticaFont,
          color: charcoal,
        });
      }

      // Generate QR code with tableId (use 'default' if not provided)
      const tableId = user.tableId || user.table_id || 'default';
      const { qrImage } = await QRService.generateSecureQR(safeUser.id, tableId);
      
      // Convert base64 QR image to bytes and embed
      const qrImageBytes = Buffer.from(qrImage.split(',')[1], 'base64');
      const qrImageEmbed = await pdfDoc.embedPng(qrImageBytes);

      // Draw QR code
      page.drawImage(qrImageEmbed, {
        x: 250,
        y: 100,
        width: 80,
        height: 80,
      });

      // QR code label
      page.drawText('SCAN FOR ACCESS', {
        x: 250,
        y: 90,
        size: 8,
        font: helveticaFont,
        color: charcoal,
      });

      // Status indicator
      const statusColor = safeUser.status === 'active' ? emerald : rgb(0.94, 0.27, 0.27); // crimson
      page.drawRectangle({
        x: 20,
        y: 70,
        width: 60,
        height: 15,
        color: statusColor,
      });

      page.drawText(safeUser.status.toUpperCase(), {
        x: 25,
        y: 75,
        size: 8,
        font: helveticaBoldFont,
        color: white,
      });

      // Issue date - use actual user creation date
      const issueDate = safeUser.createdAt ? new Date(safeUser.createdAt).toLocaleDateString() : new Date().toLocaleDateString();
      page.drawText(`Issued: ${issueDate}`, {
        x: 100,
        y: 75,
        size: 8,
        font: helveticaFont,
        color: charcoal,
      });

      // Footer
      page.drawText('This card remains property of the organization', {
        x: 20,
        y: 20,
        size: 6,
        font: helveticaFont,
        color: rgb(0.5, 0.5, 0.5),
      });

      // Serialize the PDF
      const pdfBytes = await pdfDoc.save();
      
      logger.info('PDF Service - ID card generated successfully');
      return Buffer.from(pdfBytes);

    } catch (error) {
      logger.error('PDF generation failed:', error);
      throw new Error('Failed to generate ID card');
    }
  }

  static async generateCustomIDCard(cardData: {
    id: string;
    tableId?: string;
    name: string;
    role: string;
    department: string;
    email: string;
    tableName: string;
    photoUrl?: string | null;
    qrCode: string;
    issuedDate: Date;
    customFields: Record<string, any>;
    layout: 'standard' | 'compact' | 'detailed';
    theme: 'light' | 'dark' | 'corporate';
  }): Promise<Buffer> {
    try {
      // Create a new PDF document
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([350, 220]); // ID card size

      // Embed fonts
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // Theme colors
      let bgColor, headerColor, textColor, accentColor;
      
      switch (cardData.theme) {
        case 'dark':
          bgColor = rgb(0.1, 0.1, 0.1);
          headerColor = rgb(0.05, 0.05, 0.05);
          textColor = rgb(0.9, 0.9, 0.9);
          accentColor = rgb(0.06, 0.73, 0.51); // emerald
          break;
        case 'corporate':
          bgColor = rgb(0.98, 0.98, 0.98);
          headerColor = rgb(0.2, 0.3, 0.5);
          textColor = rgb(0.1, 0.1, 0.1);
          accentColor = rgb(0.8, 0.6, 0.2); // gold
          break;
        default: // light
          bgColor = rgb(1, 1, 1);
          headerColor = rgb(0.07, 0.07, 0.07);
          textColor = rgb(0.07, 0.07, 0.07);
          accentColor = rgb(0.06, 0.73, 0.51); // emerald
      }

      // Background
      page.drawRectangle({
        x: 0,
        y: 0,
        width: 350,
        height: 220,
        color: bgColor,
      });

      // Header bar
      page.drawRectangle({
        x: 0,
        y: 180,
        width: 350,
        height: 40,
        color: headerColor,
      });

      // Company name
      page.drawText('DEGAS CS', {
        x: 20,
        y: 195,
        size: 16,
        font: helveticaBoldFont,
        color: cardData.theme === 'dark' ? textColor : rgb(1, 1, 1),
      });

      // Table name if visible
      if (cardData.tableName) {
        page.drawText(cardData.tableName.toUpperCase(), {
          x: 20,
          y: 185,
          size: 8,
          font: helveticaFont,
          color: accentColor,
        });
      }

      let yPosition = 145;
      let xPosition = 20;

      // User photo - KEEP THE IMAGE
      if (cardData.photoUrl) {
        try {
          // Load and embed actual photo
          const photoPath = path.join(__dirname, '../../', cardData.photoUrl);
          const photoExists = await fs.access(photoPath).then(() => true).catch(() => false);
          
          if (photoExists) {
            const photoBytes = await fs.readFile(photoPath);
            let photoImage;
            
            // Detect image type and embed accordingly
            const ext = path.extname(cardData.photoUrl).toLowerCase();
            if (ext === '.png') {
              photoImage = await pdfDoc.embedPng(photoBytes);
            } else if (['.jpg', '.jpeg'].includes(ext)) {
              photoImage = await pdfDoc.embedJpg(photoBytes);
            } else {
              throw new Error('Unsupported image format');
            }
            
            // Draw the photo
            page.drawImage(photoImage, {
              x: 20,
              y: 100,
              width: 60,
              height: 60,
            });
            
            // Add border
            page.drawRectangle({
              x: 20,
              y: 100,
              width: 60,
              height: 60,
              borderColor: accentColor,
              borderWidth: 2,
            });
          } else {
            throw new Error('Photo file not found');
          }
        } catch (photoError) {
          logger.warn('Failed to embed photo in custom card, using placeholder:', photoError);
          // Fallback to placeholder
          page.drawRectangle({
            x: 20,
            y: 100,
            width: 60,
            height: 60,
            color: rgb(0.9, 0.9, 0.9),
            borderColor: accentColor,
            borderWidth: 2,
          });

          page.drawText('NO PHOTO', {
            x: 25,
            y: 125,
            size: 7,
            font: helveticaFont,
            color: textColor,
          });
        }
        
        xPosition = 100;
      }

      // User name (primary field) - BOLD, NO LABEL
      if (cardData.name) {
        page.drawText(sanitizeTextForPDF(cardData.name).toUpperCase(), {
          x: xPosition,
          y: yPosition,
          size: cardData.layout === 'compact' ? 12 : 14,
          font: helveticaBoldFont,
          color: textColor,
        });
        yPosition -= 20;
      }

      // Render other fields WITHOUT labels, just values
      const systemFields = ['photo', 'photoUrl', 'photo_url', 'id', 'uuid', 'tableId', 'table_id', 'qrCode', 'qr_code', 'createdAt', 'created_at', 'updatedAt', 'updated_at'];
      
      Object.entries(cardData.customFields).forEach(([fieldName, value]) => {
        // Skip system fields, the first field (already shown as name), and object values
        const isSystemField = systemFields.includes(fieldName) || fieldName.toLowerCase().includes('photo') || fieldName.toLowerCase().includes('id');
        const isObjectValue = typeof value === 'object';
        const isNameField = String(value).toUpperCase() === cardData.name.toUpperCase();
        
        if (value && !isSystemField && !isObjectValue && !isNameField && yPosition > 80) {
          // Show only the value, no field name label
          const displayText = sanitizeTextForPDF(String(value));
          page.drawText(displayText, {
            x: xPosition,
            y: yPosition,
            size: 9,
            font: helveticaFont,
            color: textColor,
          });
          yPosition -= 14;
        }
      });

      // QR code with tableId
      if (cardData.qrCode) {
        const tableId = cardData.tableId || 'default';
        const { qrImage } = await QRService.generateSecureQR(cardData.id, tableId);
        const qrImageBytes = Buffer.from(qrImage.split(',')[1], 'base64');
        const qrImageEmbed = await pdfDoc.embedPng(qrImageBytes);

        const qrSize = cardData.layout === 'compact' ? 60 : 80;
        page.drawImage(qrImageEmbed, {
          x: 350 - qrSize - 20,
          y: 100,
          width: qrSize,
          height: qrSize,
        });

        page.drawText('SCAN FOR ACCESS', {
          x: 350 - qrSize - 20,
          y: 90,
          size: 8,
          font: helveticaFont,
          color: textColor,
        });
      }

      // Status indicator
      page.drawRectangle({
        x: 20,
        y: 70,
        width: 60,
        height: 15,
        color: accentColor,
      });

      page.drawText('ACTIVE', {
        x: 25,
        y: 75,
        size: 8,
        font: helveticaBoldFont,
        color: cardData.theme === 'dark' ? rgb(0, 0, 0) : rgb(1, 1, 1),
      });

      // Issue date
      const issueDate = cardData.issuedDate.toLocaleDateString();
      page.drawText(`Issued: ${issueDate}`, {
        x: 100,
        y: 75,
        size: 8,
        font: helveticaFont,
        color: textColor,
      });

      // Footer
      page.drawText('This card remains property of the organization', {
        x: 20,
        y: 20,
        size: 6,
        font: helveticaFont,
        color: rgb(0.5, 0.5, 0.5),
      });

      // Serialize the PDF
      const pdfBytes = await pdfDoc.save();
      return Buffer.from(pdfBytes);

    } catch (error) {
      logger.error('Custom PDF generation failed:', error);
      throw new Error('Failed to generate custom ID card');
    }
  }

  static async generateBulkIDCards(users: any[]): Promise<Buffer> {
    try {
      const pdfDoc = await PDFDocument.create();

      for (const user of users) {
        // Generate individual card and copy to main document
        const userCardBuffer = await this.generateIDCard(user);
        const userPdf = await PDFDocument.load(userCardBuffer);
        const [userPage] = await pdfDoc.copyPages(userPdf, [0]);
        pdfDoc.addPage(userPage);
      }

      const pdfBytes = await pdfDoc.save();
      return Buffer.from(pdfBytes);

    } catch (error) {
      logger.error('Bulk PDF generation failed:', error);
      throw new Error('Failed to generate bulk ID cards');
    }
  }
}