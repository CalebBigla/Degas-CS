import { getDatabase } from '../config/database';
import logger from '../config/logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * User Data Link Service - Links core users to dynamic table records
 * This allows a single core user to have profile data in dynamic tables
 */

export interface UserDataLink {
  id: number;
  coreUserId: string;
  tableName: string;
  recordId: string;
  createdAt: Date;
}

export interface LinkedData {
  tableName: string;
  recordId: string;
  data: any;
  photoUrl?: string;
}

// Whitelist of allowed table names (security measure)
const ALLOWED_TABLES = ['dynamic_users', 'Students', 'Staff', 'Visitors', 'Contractors'];

/**
 * Validate table name against whitelist
 */
function validateTableName(tableName: string): boolean {
  return ALLOWED_TABLES.includes(tableName);
}

export class UserDataLinkService {
  /**
   * Create a link between core user and dynamic table record
   */
  static async createLink(
    coreUserId: string,
    tableName: string,
    recordId: string
  ): Promise<UserDataLink> {
    const db = getDatabase();
    const dbType = process.env.DATABASE_TYPE || 'sqlite';

    try {
      // Validate table name
      if (!validateTableName(tableName)) {
        throw new Error(`Invalid table name: ${tableName}`);
      }

      // Check if record exists in the target table
      const record = await db.get(
        `SELECT id FROM ${tableName} WHERE id = ?`,
        [recordId]
      );

      if (!record) {
        throw new Error(`Record not found in table ${tableName}`);
      }

      // Check if link already exists
      const existing = await db.get(
        'SELECT id FROM user_data_links WHERE core_user_id = ? AND table_name = ? AND record_id = ?',
        [coreUserId, tableName, recordId]
      );

      if (existing) {
        throw new Error('Link already exists');
      }

      // Create link
      if (dbType === 'sqlite') {
        const result = await db.run(
          `INSERT INTO user_data_links (core_user_id, table_name, record_id, created_at)
           VALUES (?, ?, ?, datetime('now'))`,
          [coreUserId, tableName, recordId]
        );

        logger.info('✅ User data link created', { coreUserId, tableName, recordId, linkId: result.lastID });

        return {
          id: result.lastID!,
          coreUserId,
          tableName,
          recordId,
          createdAt: new Date()
        };
      } else {
        const result = await db.get(
          `INSERT INTO user_data_links (core_user_id, table_name, record_id, created_at)
           VALUES ($1, $2, $3, NOW())
           RETURNING id, created_at`,
          [coreUserId, tableName, recordId]
        );

        logger.info('✅ User data link created', { coreUserId, tableName, recordId, linkId: result.id });

        return {
          id: result.id,
          coreUserId,
          tableName,
          recordId,
          createdAt: new Date(result.created_at)
        };
      }
    } catch (error) {
      logger.error('❌ Failed to create user data link:', error);
      throw error;
    }
  }

  /**
   * Get all links for a core user
   */
  static async getUserLinks(coreUserId: string): Promise<UserDataLink[]> {
    const db = getDatabase();

    try {
      const links = await db.all(
        'SELECT * FROM user_data_links WHERE core_user_id = ? ORDER BY created_at DESC',
        [coreUserId]
      );

      return links.map((link: any) => ({
        id: link.id,
        coreUserId: link.core_user_id,
        tableName: link.table_name,
        recordId: link.record_id,
        createdAt: new Date(link.created_at)
      }));
    } catch (error) {
      logger.error('❌ Failed to get user links:', error);
      throw error;
    }
  }

  /**
   * Get linked data for a core user (fetches actual data from dynamic tables)
   */
  static async getLinkedData(coreUserId: string): Promise<LinkedData[]> {
    const db = getDatabase();

    try {
      const links = await this.getUserLinks(coreUserId);
      const linkedData: LinkedData[] = [];

      for (const link of links) {
        try {
          // Fetch data from the linked table
          const record = await db.get(
            `SELECT * FROM ${link.tableName} WHERE id = ?`,
            [link.recordId]
          );

          if (record) {
            // For dynamic tables (Students, Staff, etc.), the data is stored as columns, not JSON
            linkedData.push({
              tableName: link.tableName,
              recordId: link.recordId,
              data: record, // Return the entire record as-is
              photoUrl: record.photo_url || record.photoUrl
            });
          }
        } catch (error) {
          logger.warn(`⚠️ Failed to fetch data for link ${link.id}:`, error);
          // Continue with other links even if one fails
        }
      }

      return linkedData;
    } catch (error) {
      logger.error('❌ Failed to get linked data:', error);
      throw error;
    }
  }

  /**
   * Delete a link
   */
  static async deleteLink(linkId: number): Promise<void> {
    const db = getDatabase();

    try {
      await db.run('DELETE FROM user_data_links WHERE id = ?', [linkId]);
      logger.info('✅ User data link deleted', { linkId });
    } catch (error) {
      logger.error('❌ Failed to delete user data link:', error);
      throw error;
    }
  }

  /**
   * Delete all links for a core user
   */
  static async deleteUserLinks(coreUserId: string): Promise<void> {
    const db = getDatabase();

    try {
      await db.run('DELETE FROM user_data_links WHERE core_user_id = ?', [coreUserId]);
      logger.info('✅ All user data links deleted', { coreUserId });
    } catch (error) {
      logger.error('❌ Failed to delete user data links:', error);
      throw error;
    }
  }

  /**
   * Find core user by dynamic table record
   */
  static async findCoreUserByRecord(tableName: string, recordId: string): Promise<string | null> {
    const db = getDatabase();

    try {
      if (!validateTableName(tableName)) {
        throw new Error(`Invalid table name: ${tableName}`);
      }

      const link = await db.get(
        'SELECT core_user_id FROM user_data_links WHERE table_name = ? AND record_id = ?',
        [tableName, recordId]
      );

      return link ? link.core_user_id : null;
    } catch (error) {
      logger.error('❌ Failed to find core user by record:', error);
      throw error;
    }
  }

  /**
   * Add a table to the whitelist (admin function)
   */
  static addAllowedTable(tableName: string): void {
    if (!ALLOWED_TABLES.includes(tableName)) {
      ALLOWED_TABLES.push(tableName);
      logger.info('✅ Table added to whitelist', { tableName });
    }
  }

  /**
   * Get list of allowed tables
   */
  static getAllowedTables(): string[] {
    return [...ALLOWED_TABLES];
  }
}

export default UserDataLinkService;
