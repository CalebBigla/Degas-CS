import { Response } from 'express';
import { getDatabase } from '../config/database';
import { AuthRequest } from '../middleware/auth';
import logger from '../config/logger';

// Get active ID card settings
export const getIDCardSettings = async (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const settings = await db.get('SELECT * FROM id_card_settings WHERE is_active = 1');
    
    if (!settings) {
      // Return default settings if none exist
      return res.json({
        success: true,
        data: {
          id: 'default',
          name: 'Default Template',
          visible_fields: JSON.stringify({
            name: true,
            photo: true,
            idNumber: false,
            department: false,
            email: false,
            customFields: {}
          }),
          layout: 'standard',
          background_template: 'light',
          font_size: 'medium',
          qr_position: 'bottom-right'
        }
      });
    }
    
    // Parse visible_fields JSON
    const parsedSettings = {
      ...settings,
      visible_fields: JSON.parse(settings.visible_fields)
    };
    
    res.json({
      success: true,
      data: parsedSettings
    });
  } catch (error) {
    logger.error('❌ Get ID card settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch ID card settings'
    });
  }
};

// Update ID card settings
export const updateIDCardSettings = async (req: AuthRequest, res: Response) => {
  try {
    const db = getDatabase();
    const {
      name,
      visibleFields,
      layout,
      logoUrl,
      backgroundTemplate,
      fontSize,
      qrPosition
    } = req.body;
    
    // Validate required fields
    if (!visibleFields) {
      return res.status(400).json({
        success: false,
        error: 'Visible fields configuration is required'
      });
    }
    
    // Update or insert settings
    await db.run(`
      INSERT INTO id_card_settings (
        id, name, visible_fields, layout, logo_url, 
        background_template, font_size, qr_position, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        visible_fields = excluded.visible_fields,
        layout = excluded.layout,
        logo_url = excluded.logo_url,
        background_template = excluded.background_template,
        font_size = excluded.font_size,
        qr_position = excluded.qr_position,
        updated_at = CURRENT_TIMESTAMP
    `, [
      'default',
      name || 'Default Template',
      JSON.stringify(visibleFields),
      layout || 'standard',
      logoUrl || null,
      backgroundTemplate || 'light',
      fontSize || 'medium',
      qrPosition || 'bottom-right'
    ]);
    
    logger.info('✅ ID card settings updated', {
      adminId: req.admin?.id,
      layout,
      fontSize
    });
    
    res.json({
      success: true,
      message: 'ID card settings updated successfully'
    });
  } catch (error) {
    logger.error('❌ Update ID card settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update ID card settings'
    });
  }
};
