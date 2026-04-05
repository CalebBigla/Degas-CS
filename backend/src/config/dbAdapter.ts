import { Pool } from 'pg';
import sqlite3 from 'sqlite3';
import logger from './logger';

export interface DatabaseAdapter {
  query(sql: string, params?: any[]): Promise<any>;
  get(sql: string, params?: any[]): Promise<any>;
  all(sql: string, params?: any[]): Promise<any[]>;
  run(sql: string, params?: any[]): Promise<{ lastID?: number; changes?: number }>;
  close(): Promise<void>;
}

class SQLiteAdapter implements DatabaseAdapter {
  private db: sqlite3.Database;

  constructor(dbPath: string) {
    this.db = new sqlite3.Database(dbPath);
  }

  async query(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve({ rows: rows || [] });
      });
    });
  }

  async get(sql: string, params: any[] = []): Promise<any> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  async all(sql: string, params: any[] = []): Promise<any[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  async run(sql: string, params: any[] = []): Promise<{ lastID?: number; changes?: number }> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}

class PostgreSQLAdapter implements DatabaseAdapter {
  private pool: Pool;

  constructor(connectionString: string) {
    logger.info('🔐 Creating PostgreSQL pool with SSL configuration');
    
    // For production (Render), use longer timeouts for initial connection
    const isProduction = process.env.NODE_ENV === 'production';
    const connectionTimeoutMillis = isProduction ? 10000 : 2000; // 10s for production, 2s for dev
    const idleTimeoutMillis = isProduction ? 60000 : 30000; // 60s for production
    
    this.pool = new Pool({
      connectionString,
      ssl: isProduction
        ? { rejectUnauthorized: false }
        : false,
      max: 20,  // Maximum number of clients in pool
      idleTimeoutMillis,
      connectionTimeoutMillis,
      statement_timeout: isProduction ? 30000 : 5000,  // 30s for production
    });
    
    // Log pool connection events
    this.pool.on('error', (err: any) => {
      logger.error('❌ PostgreSQL pool error:', {
        message: err?.message || String(err),
        code: err?.code,
        severity: err?.severity
      });
    });
    
    this.pool.on('connect', () => {
      logger.info('✅ PostgreSQL pool - new client connected');
    });
    
    logger.info('✅ PostgreSQL pool created and configured', {
      connectionTimeout: connectionTimeoutMillis,
      idleTimeout: idleTimeoutMillis,
      environment: process.env.NODE_ENV || 'development'
    });
  }

  async query(sql: string, params: any[] = []): Promise<any> {
    return this.executeWithRetry(async () => {
      const client = await this.pool.connect();
      try {
        // Convert SQLite syntax to PostgreSQL
        const pgSql = this.convertSQLiteToPostgreSQL(sql);
        logger.debug('PostgreSQL query:', { 
          original: sql.substring(0, 150), 
          converted: pgSql.substring(0, 150),
          paramCount: params.length 
        });
        const result = await client.query(pgSql, params);
        return { rows: result.rows };
      } finally {
        client.release();
      }
    });
  }

  async get(sql: string, params: any[] = []): Promise<any> {
    const result = await this.query(sql, params);
    return result.rows[0] || null;
  }

  async all(sql: string, params: any[] = []): Promise<any[]> {
    const result = await this.query(sql, params);
    return result.rows;
  }

  async run(sql: string, params: any[] = []): Promise<{ lastID?: number; changes?: number }> {
    return this.executeWithRetry(async () => {
      const client = await this.pool.connect();
      try {
        const pgSql = this.convertSQLiteToPostgreSQL(sql);
        logger.debug('PostgreSQL run:', { 
          sql: pgSql.substring(0, 150),
          paramCount: params.length 
        });
        const result = await client.query(pgSql, params);
        return { 
          lastID: result.rows[0]?.id, 
          changes: result.rowCount || 0 
        };
      } finally {
        client.release();
      }
    });
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  // Retry helper with exponential backoff for connection failures
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    initialDelayMs: number = 100
  ): Promise<T> {
    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;
        
        // Don't retry on syntax errors or permission errors
        if (error?.code === 'SYNTAX_ERROR' || error?.code === 'INSUFFICIENT_PRIVILEGE') {
          logger.error('Non-retryable PostgreSQL error:', {
            message: error.message,
            code: error.code,
            detail: error.detail
          });
          throw error;
        }
        
        if (attempt < maxRetries) {
          const delayMs = initialDelayMs * Math.pow(2, attempt);
          logger.warn(`Database operation failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delayMs}ms:`, {
            error: error.message,
            code: error.code
          });
          await new Promise(resolve => setTimeout(resolve, delayMs));
        } else {
          logger.error('❌ PostgreSQL operation failed after all retries:', {
            message: error instanceof Error ? error.message : String(error),
            sql: error?.sql?.substring(0, 150),
            code: error?.code,
            detail: error?.detail,
            attempts: maxRetries + 1
          });
        }
      }
    }
    
    throw lastError;
  }

  private convertSQLiteToPostgreSQL(sql: string): string {
    // Step 1: Quote table and column identifiers for PostgreSQL
    sql = this.quoteIdentifiersForPostgreSQL(sql);
    
    // Step 2: Convert data type and function syntax
    let converted = sql
      // Convert datetime functions
      .replace(/datetime\('now'\)/g, 'NOW()')
      .replace(/datetime\("now"\)/g, 'NOW()')
      .replace(/CURRENT_TIMESTAMP/g, 'NOW()')
      .replace(/datetime\('now',\s*'([^']+)'\)/g, (match, offset) => {
        // Convert SQLite datetime offsets to PostgreSQL intervals
        // Examples: '-7 days', '+1 hour', '-30 minutes'
        return `(NOW() ${offset.includes('-') ? '-' : '+'} INTERVAL '${offset.replace(/^[+-]\s*/, '')}')`
      })
      .replace(/datetime\("now",\s*"([^"]+)"\)/g, (match, offset) => {
        // Same for double quotes
        return `(NOW() ${offset.includes('-') ? '-' : '+'} INTERVAL '${offset.replace(/^[+-]\s*/, '')}')`
      })
      // Convert SQLite boolean syntax to PostgreSQL
      .replace(/\s*=\s*1(\s+AND|\s+OR|\s*[,;\)])/g, ' = true$1')  // = 1 to = true
      .replace(/\s*=\s*0(\s+AND|\s+OR|\s*[,;\)])/g, ' = false$1')  // = 0 to = false
      .replace(/\bTRUE\b/g, 'true')  // TRUE to true
      .replace(/\bFALSE\b/g, 'false')  // FALSE to false
      // Convert json_extract to PostgreSQL JSON operators
      .replace(/json_extract\((\w+\.?\w*),\s*'(\$\.[^']+)'\)/g, (match, table, path) => {
        // Convert json_extract(table.column, '$.field') to (table.column->>'field')
        const field = path.replace('$.', '');
        return `(${table}->>'${field}')`
      })
      .replace(/json_extract\((\w+\.?\w*),\s*"(\$\.[^"]+)"\)/g, (match, table, path) => {
        // Same for double quotes
        const field = path.replace('$.', '');
        return `(${table}->>'${field}')`
      })
      // Convert AUTOINCREMENT
      .replace(/\bAUTOINCREMENT\b/g, 'SERIAL')
      .replace(/TEXT PRIMARY KEY/g, 'UUID PRIMARY KEY DEFAULT gen_random_uuid()')
      .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, 'SERIAL PRIMARY KEY')
      // Convert COUNT(*) syntax to be PostgreSQL-safe
      .replace(/COUNT\(\*\) as (\w+)/gi, 'COUNT(*) as $1');
    
    // Step 3: Convert ? placeholders to $1, $2, $3, etc.
    let paramIndex = 1;
    converted = converted.replace(/\?/g, () => `$${paramIndex++}`);
    
    return converted;
  }

  /**
   * Quote table and column identifiers for PostgreSQL
   * PostgreSQL requires double quotes for identifiers, especially if case-sensitive or reserved keywords
   */
  private quoteIdentifiersForPostgreSQL(sql: string): string {
    // List of common table and column names that should be quoted
    const tableNames = [
      'forms', 'users', 'tables', 'dynamic_users', 'form_definitions',
      'access_logs', 'core_users', 'qr_codes', 'id_card_settings',
      'id_card_templates', 'user_data_links', 'admins', 'form_fields'
    ];

    let quoted = sql;

    // Quote table names in FROM, INTO, UPDATE, JOIN clauses
    tableNames.forEach(table => {
      // FROM table
      quoted = quoted.replace(
        new RegExp(`\\bFROM\\s+${table}\\b`, 'gi'),
        (match) => {
          const keyword = match.split(/\s+/)[0];
          return `${keyword} "${table}"`;
        }
      );

      // INTO table
      quoted = quoted.replace(
        new RegExp(`\\bINTO\\s+${table}\\b`, 'gi'),
        (match) => {
          const keyword = match.split(/\s+/)[0];
          return `${keyword} "${table}"`;
        }
      );

      // UPDATE table
      quoted = quoted.replace(
        new RegExp(`\\bUPDATE\\s+${table}\\b`, 'gi'),
        (match) => {
          const keyword = match.split(/\s+/)[0];
          return `${keyword} "${table}"`;
        }
      );

      // JOIN table
      quoted = quoted.replace(
        new RegExp(`\\bJOIN\\s+${table}\\b`, 'gi'),
        (match) => {
          const keyword = match.split(/\s+/)[0];
          return `${keyword} "${table}"`;
        }
      );
    });

    // Quote common column names that are PostgreSQL reserved words
    const reservedColumns = ['number', 'order', 'group', 'value', 'key', 'type', 'status', 'user', 'role', 'name'];
    reservedColumns.forEach(col => {
      // Quote in SET clauses (UPDATE)
      quoted = quoted.replace(
        new RegExp(`\\b${col}\\s*=`, 'gi'),
        (match) => {
          const eqPos = match.indexOf('=');
          const before = match.substring(0, eqPos).trim();
          return `"${before}" =`;
        }
      );

      // Quote in column lists
      quoted = quoted.replace(
        new RegExp(`\\(${col}\\s*,`, 'gi'),
        `("${col}",`
      );
      quoted = quoted.replace(
        new RegExp(`\\,\\s*${col}\\s*\\)`, 'gi'),
        `, "${col}")`
      );
      quoted = quoted.replace(
        new RegExp(`\\(${col}\\s*\\)`, 'gi'),
        `("${col}")`
      );
    });

    return quoted;
  }
}

// Database factory
export class DatabaseFactory {
  static create(): DatabaseAdapter {
    const dbType = process.env.DATABASE_TYPE || 'sqlite';
    
    if (dbType === 'postgresql') {
      const connectionString = process.env.DATABASE_URL;
      if (!connectionString) {
        throw new Error('DATABASE_URL is required for PostgreSQL');
      }
      logger.info('Using PostgreSQL adapter');
      return new PostgreSQLAdapter(connectionString);
    } else {
      const dbPath = process.env.DATABASE_PATH || './data/degas.db';
      logger.info('Using SQLite adapter');
      return new SQLiteAdapter(dbPath);
    }
  }
}

export default DatabaseFactory;