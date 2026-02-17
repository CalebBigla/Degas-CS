import logger from '../config/logger';
import { getDatabase } from '../config/database';

/**
 * Table Schema Registry Service
 * Manages field mappings and schemas per table dynamically
 * Enables each table to have completely different field structures
 */

export interface TableSchema {
  tableId: string;
  tableName: string;
  fields: SchemaField[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SchemaField {
  name: string;
  type: 'text' | 'email' | 'number' | 'date' | 'boolean';
  displayName: string;
  isMappedTo?: string; // e.g., "fullName", "employeeId", "designation"
}

export class TableSchemaRegistry {
  /**
   * Get or detect table schema from actual data
   */
  static async getTableSchema(tableId: string): Promise<TableSchema | null> {
    const db = getDatabase();
    
    try {
      const table = await db.get(
        `SELECT id, name, schema FROM tables WHERE id = ?`,
        [tableId]
      );

      if (!table) {
        return null;
      }

      let fields: SchemaField[] = [];
      
      if (table.schema) {
        try {
          const parsedSchema = JSON.parse(table.schema);
          fields = Array.isArray(parsedSchema) ? parsedSchema : [];
        } catch (e) {
          logger.warn('Could not parse table schema', { tableId });
        }
      }

      // If schema is empty, detect from first user's data
      if (fields.length === 0) {
        fields = await this.detectSchemaFromData(tableId);
      }

      return {
        tableId,
        tableName: table.name,
        fields: fields.map(f => {
          const field = typeof f === 'string' 
            ? { name: f } 
            : (f as any);
          
          const fieldName = (field.name as string) || (typeof f === 'string' ? f : 'unknown');
          
          return {
            name: fieldName,
            type: (field.type as any) || 'text',
            displayName: (field.displayName as string) || fieldName,
            isMappedTo: field.isMappedTo as any
          } as SchemaField;
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      logger.error('Failed to get table schema', { tableId, error });
      return null;
    }
  }

  /**
   * Detect schema by inspecting actual user data in table
   */
  private static async detectSchemaFromData(tableId: string): Promise<SchemaField[]> {
    const db = getDatabase();
    
    try {
      // Get first user's data
      const user = await db.get(
        `SELECT data FROM dynamic_users WHERE table_id = ? LIMIT 1`,
        [tableId]
      );

      if (!user) {
        return [];
      }

      const userData = JSON.parse(user.data);
      const fields: SchemaField[] = [];

      Object.entries(userData).forEach(([key, value]) => {
        if (typeof value === 'string' || typeof value === 'number') {
          fields.push({
            name: key,
            type: 'text',
            displayName: key
          });
        }
      });

      return fields;
    } catch (error) {
      logger.error('Failed to detect schema from data', { tableId, error });
      return [];
    }
  }

  /**
   * Get a specific user from ANY table (cross-table search)
   * Searches all tables for a user with matching UUID (as QR codes store UUID, not ID)
   */
  static async findUserAcrossTables(userId: string): Promise<{
    user: any;
    tableId: string;
    tableName: string;
    schema: TableSchema | null;
  } | null> {
    const db = getDatabase();

    try {
      logger.info('Searching for user across tables', { userId });
      
      // Search for user across all tables - search by UUID since QR codes store the UUID as userId
      const result = await db.get(
        `SELECT du.*, t.id as table_id, t.name as table_name
         FROM dynamic_users du
         JOIN tables t ON du.table_id = t.id
         WHERE du.uuid = ?`,
        [userId]
      );

      logger.info('Cross-table search result', { userId, found: !!result, result: result ? { id: result.id, uuid: result.uuid, tableId: result.table_id } : null });

      if (!result) {
        logger.warn('User not found in any table', { userId });
        return null;
      }

      // Get the table schema
      const schema = await this.getTableSchema(result.table_id);

      return {
        user: {
          id: result.id,
          uuid: result.uuid,
          data: JSON.parse(result.data),
          photoUrl: result.photo_url
        },
        tableId: result.table_id,
        tableName: result.table_name,
        schema
      };
    } catch (error) {
      logger.error('Error searching for user across tables', { userId, error });
      return null;
    }
  }

  /**
   * Map user data to standard display fields based on table schema
   */
  static mapUserData(userData: any, schema: TableSchema | null): Record<string, string> {
    const mapped: Record<string, string> = {};

    if (!schema || schema.fields.length === 0) {
      // Fallback: return all string values
      Object.entries(userData).forEach(([key, value]) => {
        if (typeof value === 'string' || typeof value === 'number') {
          mapped[key] = String(value);
        }
      });
      return mapped;
    }

    // Map fields based on schema
    schema.fields.forEach(field => {
      const value = userData[field.name];
      if (value) {
        mapped[field.displayName] = String(value);
      }
    });

    return mapped;
  }

  /**
   * Get standard display values from user data using table schema
   */
  static extractDisplayValues(
    userData: any,
    schema: TableSchema | null
  ): {
    fullName: string;
    employeeId: string;
    designation: string;
    department?: string;
    email?: string;
  } {
    const display = {
      fullName: 'Unknown',
      employeeId: 'N/A',
      designation: 'Member',
      department: '',
      email: ''
    };

    if (!userData) {
      return display;
    }

    // If schema provided, use it to find fields
    if (schema && schema.fields.length > 0) {
      schema.fields.forEach(field => {
        const value = String(userData[field.name] || '').trim();
        
        if (!value) return;

        // Check if field has explicit mapping
        if (field.isMappedTo) {
          display[field.isMappedTo as keyof typeof display] = value;
        } else {
          // Try to guess based on field name patterns
          const lowerName = field.name.toLowerCase();
          
          if (lowerName.includes('name') || lowerName.includes('fullname')) {
            display.fullName = value;
          } else if (lowerName.includes('id') || lowerName.includes('code') || lowerName.includes('state')) {
            display.employeeId = value;
          } else if (lowerName.includes('designation') || lowerName.includes('role') || lowerName.includes('position')) {
            display.designation = value;
          } else if (lowerName.includes('department') || lowerName.includes('dept')) {
            display.department = value;
          } else if (lowerName.includes('email') || lowerName.includes('mail')) {
            display.email = value;
          }
        }
      });
    } else {
      // Fallback: search by common field name patterns
      Object.entries(userData).forEach(([key, val]) => {
        const value = String(val || '').trim();
        if (!value) return;

        const lowerKey = key.toLowerCase();
        
        if (lowerKey.includes('name')) {
          display.fullName = value;
        } else if (lowerKey.includes('id') || lowerKey.includes('code') || lowerKey.includes('state')) {
          if (!display.employeeId.includes('N/A')) return;
          display.employeeId = value;
        } else if (lowerKey.includes('designation') || lowerKey.includes('role')) {
          display.designation = value;
        } else if (lowerKey.includes('department')) {
          display.department = value;
        } else if (lowerKey.includes('email')) {
          display.email = value;
        }
      });
    }

    // Ensure fullName is never "Unknown" if we have any data
    if (display.fullName === 'Unknown' && Object.keys(userData).length > 0) {
      // Try to build from any available fields
      const allValues = Object.values(userData)
        .filter(v => typeof v === 'string' && v.length > 0)
        .map(v => String(v))
        .slice(0, 3)
        .join(' ');
      
      if (allValues) {
        display.fullName = allValues;
      }
    }

    return display;
  }

  /**
   * Register field mapping for a table
   * Explicitly tell system which field means what
   */
  static async registerFieldMapping(
    tableId: string,
    mappings: Record<string, string> // { "fullName": "Names", "employeeId": "State Code", ... }
  ): Promise<boolean> {
    const db = getDatabase();

    try {
      // Get current schema
      let table = await db.get('SELECT schema FROM tables WHERE id = ?', [tableId]);
      
      if (!table) {
        return false;
      }

      let schema = [];
      try {
        schema = JSON.parse(table.schema || '[]');
      } catch (e) {
        schema = [];
      }

      // Update field mappings in schema
      if (Array.isArray(schema)) {
        schema = schema.map((field: any) => {
          // Find if this field matches any mapping
          for (const [standardName, fieldName] of Object.entries(mappings)) {
            if (field.name === fieldName || field === fieldName) {
              return {
                ...field,
                isMappedTo: standardName
              };
            }
          }
          return field;
        });
      }

      // Save updated schema
      await db.run(
        `UPDATE tables SET schema = ?, updated_at = datetime('now') WHERE id = ?`,
        [JSON.stringify(schema), tableId]
      );

      logger.info('Field mapping registered', { tableId, mappings });
      return true;
    } catch (error) {
      logger.error('Failed to register field mapping', { tableId, error });
      return false;
    }
  }

  /**
   * Find user in a SPECIFIC table (table-filtered search)
   * Returns null if user not found in that specific table
   */
  static async findUserInTable(userId: string, tableId: string): Promise<{
    user: any;
    tableId: string;
    tableName: string;
    schema: TableSchema | null;
  } | null> {
    const db = getDatabase();

    try {
      logger.info('Searching for user in specific table', { userId, tableId });
      
      // Search for user in SPECIFIC table by UUID
      const result = await db.get(
        `SELECT du.*, t.id as table_id, t.name as table_name
         FROM dynamic_users du
         JOIN tables t ON du.table_id = t.id
         WHERE du.uuid = ? AND du.table_id = ?`,
        [userId, tableId]
      );

      logger.info('User in table search result', { userId, tableId, found: !!result });

      if (!result) {
        logger.warn('User not found in specified table', { userId, tableId });
        return null;
      }

      // Get the table schema
      const schema = await this.getTableSchema(result.table_id);

      return {
        user: {
          id: result.id,
          uuid: result.uuid,
          data: result.data && typeof result.data === 'string' ? JSON.parse(result.data) : result.data,
          photoUrl: result.photo_url
        },
        tableId: result.table_id,
        tableName: result.table_name,
        schema
      };
    } catch (error) {
      logger.error('Error searching for user in table', { userId, tableId, error });
      return null;
    }
  }

  /**
   * Get all available tables for scanner selection
   */
  static async getAllTables(): Promise<Array<{ id: string; name: string }>> {
    const db = getDatabase();

    try {
      const tables = await db.all(
        `SELECT id, name FROM tables ORDER BY name ASC`,
        []
      );

      logger.info('Retrieved all tables', { count: tables.length });
      return tables || [];
    } catch (error) {
      logger.error('Error getting all tables', { error });
      return [];
    }
  }
}

export default TableSchemaRegistry;
