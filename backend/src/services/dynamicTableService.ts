import { db } from '../config/database';
import logger from '../config/logger';
import { FormField } from './formService';

/**
 * Utility service for creating dynamic tables based on form definitions
 * This ensures forms create proper SQL tables automatically
 */
class DynamicTableService {
  /**
   * Generate CREATE TABLE SQL based on form fields
   */
  static generateCreateTableSQL(tableName: string, fields: FormField[]): string {
    // Validate table name (alphanumeric and underscores only)
    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
      throw new Error(`Invalid table name: ${tableName}. Only alphanumeric characters and underscores allowed.`);
    }

    // Build column definitions
    const columns: string[] = [
      'id INTEGER PRIMARY KEY AUTOINCREMENT',
      'uuid TEXT UNIQUE NOT NULL',
      'created_at DATETIME DEFAULT CURRENT_TIMESTAMP',
      'updated_at DATETIME DEFAULT CURRENT_TIMESTAMP'
    ];

    // Add field columns
    for (const field of fields) {
      if (!field.is_email_field && !field.is_password_field) {
        // Skip email/password - they're stored separately in core_users
        const columnDef = this.getColumnDefinition(field);
        columns.push(columnDef);
      }
    }

    // Special columns that might be added
    columns.push('photoUrl TEXT');

    return `CREATE TABLE IF NOT EXISTS ${tableName} (
      ${columns.join(',\n    ')}
    )`;
  }

  /**
   * Get SQL column definition for a field
   */
  private static getColumnDefinition(field: FormField): string {
    const nullable = !field.is_required ? 'NULL' : 'NOT NULL';
    let columnType: string;

    switch (field.field_type) {
      case 'email':
      case 'tel':
      case 'text':
      case 'textarea':
      case 'select':
        columnType = `TEXT ${nullable}`;
        break;
      case 'password':
        columnType = `TEXT ${nullable}`;
        break;
      case 'number':
        columnType = `DECIMAL(10,2) ${nullable}`;
        break;
      case 'date':
        columnType = `DATE ${nullable}`;
        break;
      case 'file':
        columnType = `TEXT ${nullable}`;
        break;
      default:
        columnType = `TEXT ${nullable}`;
    }

    return `${field.field_name} ${columnType}`;
  }

  /**
   * Create a dynamic table in the database
   */
  static async createDynamicTable(tableName: string, fields: FormField[]): Promise<void> {
    try {
      const sql = this.generateCreateTableSQL(tableName, fields);
      logger.info(`Creating dynamic table: ${tableName}`, { fieldCount: fields.length });

      await db.run(sql);

      logger.info(`✅ Dynamic table created: ${tableName}`);
    } catch (error: any) {
      logger.error(`Error creating dynamic table ${tableName}:`, error);
      throw new Error(`Failed to create table ${tableName}: ${error.message}`);
    }
  }

  /**
   * Check if a table exists
   */
  static async tableExists(tableName: string): Promise<boolean> {
    try {
      // Validate table name first
      if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
        return false;
      }

      const result = await db.get(
        `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
        [tableName]
      );
      return !!result;
    } catch (error) {
      logger.error(`Error checking if table exists: ${tableName}`, error);
      return false;
    }
  }

  /**
   * Drop a table (use with caution)
   */
  static async dropTable(tableName: string): Promise<void> {
    try {
      // Validate table name
      if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
        throw new Error(`Invalid table name: ${tableName}`);
      }

      logger.warn(`⚠️  Dropping table: ${tableName}`);
      await db.run(`DROP TABLE IF EXISTS ${tableName}`);
      logger.info(`✅ Table dropped: ${tableName}`);
    } catch (error: any) {
      logger.error(`Error dropping table ${tableName}:`, error);
      throw error;
    }
  }

  /**
   * Get list of all dynamic tables (excluding system tables)
   */
  static async getDynamicTables(): Promise<string[]> {
    try {
      const result = await db.all(
        `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT IN ('admins', 'tables', 'dynamic_users', 'access_logs', 'qr_codes', 'core_users', 'user_data_links', 'form_definitions', 'form_fields', 'attendance_sessions', 'attendance_records', 'attendance_audit_logs', 'attendance_student_rosters')`
      );
      return result?.map((r: any) => r.name) || [];
    } catch (error) {
      logger.error('Error getting dynamic tables:', error);
      return [];
    }
  }
}

export default DynamicTableService;
