import { db } from '../config/database';
import logger from '../config/logger';
import DynamicTableService from './dynamicTableService';
import QRCode from 'qrcode';

export interface FormField {
  id?: string;
  form_id?: string;
  field_name: string;
  field_label: string;
  field_type: 'text' | 'email' | 'password' | 'number' | 'date' | 'tel' | 'textarea' | 'select' | 'file';
  is_required: boolean;
  is_email_field: boolean;
  is_password_field: boolean;
  field_order: number;
  validation_rules?: string;
  options?: string;
  placeholder?: string;
  created_at?: string;
}

export interface FormDefinition {
  id?: string;
  form_name: string;
  target_table: string;
  description?: string;
  qr_code?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  fields?: FormField[];
}

class FormService {
  async getActiveForm(): Promise<FormDefinition | null> {
    try {
      const form = await db.get(
        `SELECT id, name as form_name, description, target_table, qr_code, is_active, created_at, updated_at FROM form_definitions WHERE is_active = 1 LIMIT 1`
      );

      if (!form) {
        return null;
      }

      const fields = await db.all(
        'SELECT * FROM form_fields WHERE form_id = ? ORDER BY order_index ASC',
        [form.id]
      );

      return {
        ...form,
        fields
      };
    } catch (error) {
      logger.error('Error getting active form:', error);
      throw error;
    }
  }

  async getAllForms(): Promise<FormDefinition[]> {
    try {
      const forms = await db.all(
        `SELECT id, name as form_name, description, target_table, qr_code, is_active, created_at, updated_at FROM form_definitions ORDER BY created_at DESC`
      );

      for (const form of forms) {
        const fields = await db.all(
          'SELECT * FROM form_fields WHERE form_id = ? ORDER BY order_index ASC',
          [form.id]
        );
        form.fields = fields;
      }

      return forms;
    } catch (error) {
      logger.error('Error getting all forms:', error);
      throw error;
    }
  }

  async getFormById(formId: string): Promise<FormDefinition | null> {
    try {
      const form = await db.get(
        `SELECT id, name as form_name, description, target_table, qr_code, is_active, created_at, updated_at FROM form_definitions WHERE id = ?`,
        [formId]
      );

      if (!form) {
        return null;
      }

      const fields = await db.all(
        'SELECT * FROM form_fields WHERE form_id = ? ORDER BY order_index ASC',
        [form.id]
      );

      return {
        ...form,
        fields
      };
    } catch (error) {
      logger.error('Error getting form by ID:', error);
      throw error;
    }
  }

  async createForm(formData: FormDefinition): Promise<FormDefinition> {
    try {
      const formId = this.generateId();
      const now = new Date().toISOString();

      if (formData.is_active) {
        await db.run('UPDATE form_definitions SET is_active = 0');
      }

      // Generate QR code for the form
      let qrCodeBase64 = null;
      try {
        const qrUrl = `/scan/${formId}`;
        qrCodeBase64 = await QRCode.toDataURL(qrUrl);
        logger.info(`✅ QR code generated for form: ${formId}`);
      } catch (qrError) {
        logger.warn(`⚠️  Could not generate QR code for form: ${qrError}`);
        // Continue without QR code, it's not critical
      }

      await db.run(
        `INSERT INTO form_definitions (id, name, form_name, target_table, description, is_active, qr_code, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          formId,
          formData.form_name,
          formData.form_name,
          formData.target_table,
          formData.description || null,
          formData.is_active ? 1 : 0,
          qrCodeBase64,
          now,
          now
        ]
      );

      if (formData.fields && formData.fields.length > 0) {
        for (let index = 0; index < formData.fields.length; index++) {
          await this.createFormField(formId, formData.fields[index], index + 1);
        }
      }

      // CREATE DYNAMIC TABLE FOR THIS FORM
      // This ensures the target_table is created in the database
      try {
        const tableExists = await DynamicTableService.tableExists(formData.target_table);
        if (!tableExists) {
          await DynamicTableService.createDynamicTable(
            formData.target_table,
            formData.fields || []
          );
          logger.info(`✅ Dynamic table created for form: ${formData.form_name} -> ${formData.target_table}`);
        } else {
          logger.info(`ℹ️  Table already exists: ${formData.target_table}`);
        }
      } catch (tableCreationError: any) {
        logger.error(`⚠️  Warning: Could not create table ${formData.target_table}:`, tableCreationError.message);
        // Don't throw - form can still be created even if table creation fails
        // User might want to create the table manually or it already exists
      }

      const createdForm = await this.getFormById(formId);
      logger.info(`Form created: ${formId}`);
      return createdForm!;
    } catch (error) {
      logger.error('Error creating form:', error);
      throw error;
    }
  }

  async updateForm(formId: string, formData: Partial<FormDefinition>): Promise<FormDefinition> {
    try {
      const now = new Date().toISOString();

      if (formData.is_active) {
        await db.run('UPDATE form_definitions SET is_active = 0 WHERE id != ?', [formId]);
      }

      const updates: string[] = [];
      const values: any[] = [];

      if (formData.form_name !== undefined) {
        updates.push('name = ?');
        values.push(formData.form_name);
      }
      if (formData.target_table !== undefined) {
        updates.push('target_table = ?');
        values.push(formData.target_table);
      }
      if (formData.description !== undefined) {
        updates.push('description = ?');
        values.push(formData.description);
      }
      if (formData.is_active !== undefined) {
        updates.push('is_active = ?');
        values.push(formData.is_active ? 1 : 0);
      }

      updates.push('updated_at = ?');
      values.push(now);
      values.push(formId);

      await db.run(
        `UPDATE form_definitions SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      if (formData.fields) {
        await db.run('DELETE FROM form_fields WHERE form_id = ?', [formId]);
        
        for (let index = 0; index < formData.fields.length; index++) {
          await this.createFormField(formId, formData.fields[index], index + 1);
        }
      }

      const updatedForm = await this.getFormById(formId);
      logger.info(`Form updated: ${formId}`);
      return updatedForm!;
    } catch (error) {
      logger.error('Error updating form:', error);
      throw error;
    }
  }

  async deleteForm(formId: string): Promise<void> {
    try {
      await db.run('DELETE FROM form_fields WHERE form_id = ?', [formId]);
      await db.run('DELETE FROM form_definitions WHERE id = ?', [formId]);
      logger.info(`Form deleted: ${formId}`);
    } catch (error) {
      logger.error('Error deleting form:', error);
      throw error;
    }
  }

  private async createFormField(formId: string, field: FormField, orderIndex: number): Promise<void> {
    const fieldId = this.generateId();
    const now = new Date().toISOString();

    await db.run(
      `INSERT INTO form_fields (
        id, form_id, field_name, field_label, field_type, 
        is_required, is_email_field, is_password_field, 
        order_index, options, placeholder, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        fieldId,
        formId,
        field.field_name,
        field.field_label,
        field.field_type,
        field.is_required ? 1 : 0,
        field.is_email_field ? 1 : 0,
        field.is_password_field ? 1 : 0,
        orderIndex,
        field.options || null,
        field.placeholder || null,
        now
      ]
    );
  }

  async validateFormData(formId: string, data: Record<string, any>): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    try {
      const form = await this.getFormById(formId);
      
      if (!form || !form.fields) {
        errors.push('Form not found');
        return { valid: false, errors };
      }

      for (const field of form.fields) {
        const value = data[field.field_name];

        if (field.is_required && (value === undefined || value === null || value === '')) {
          errors.push(`${field.field_label} is required`);
          continue;
        }

        if (!value) continue;

        switch (field.field_type) {
          case 'email':
            if (!this.isValidEmail(value)) {
              errors.push(`${field.field_label} must be a valid email`);
            }
            break;
          case 'number':
            if (isNaN(Number(value))) {
              errors.push(`${field.field_label} must be a number`);
            }
            break;
          case 'tel':
            if (!this.isValidPhone(value)) {
              errors.push(`${field.field_label} must be a valid phone number`);
            }
            break;
        }

        if (field.validation_rules) {
          try {
            const rules = JSON.parse(field.validation_rules);
            
            if (rules.minLength && value.length < rules.minLength) {
              errors.push(`${field.field_label} must be at least ${rules.minLength} characters`);
            }
            if (rules.maxLength && value.length > rules.maxLength) {
              errors.push(`${field.field_label} must be at most ${rules.maxLength} characters`);
            }
            if (rules.pattern && !new RegExp(rules.pattern).test(value)) {
              errors.push(`${field.field_label} format is invalid`);
            }
          } catch (e) {
            logger.warn(`Invalid validation rules for field ${field.field_name}`);
          }
        }
      }

      return { valid: errors.length === 0, errors };
    } catch (error) {
      logger.error('Error validating form data:', error);
      throw error;
    }
  }

  async getAuthFields(formId: string): Promise<{ emailField: string | null; passwordField: string | null }> {
    try {
      const emailField = await db.get(
        'SELECT field_name FROM form_fields WHERE form_id = ? AND is_email_field = 1',
        [formId]
      );

      const passwordField = await db.get(
        'SELECT field_name FROM form_fields WHERE form_id = ? AND is_password_field = 1',
        [formId]
      );

      return {
        emailField: emailField?.field_name || null,
        passwordField: passwordField?.field_name || null
      };
    } catch (error) {
      logger.error('Error getting auth fields:', error);
      throw error;
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidPhone(phone: string): boolean {
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
  }
}

export default new FormService();