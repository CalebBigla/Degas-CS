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
    this.pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
  }

  async query(sql: string, params: any[] = []): Promise<any> {
    const client = await this.pool.connect();
    try {
      // Convert SQLite syntax to PostgreSQL
      const pgSql = this.convertSQLiteToPostgreSQL(sql);
      const result = await client.query(pgSql, params);
      return { rows: result.rows };
    } finally {
      client.release();
    }
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
    const client = await this.pool.connect();
    try {
      const pgSql = this.convertSQLiteToPostgreSQL(sql);
      const result = await client.query(pgSql, params);
      return { 
        lastID: result.rows[0]?.id, 
        changes: result.rowCount || 0 
      };
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }

  private convertSQLiteToPostgreSQL(sql: string): string {
    let converted = sql
      // Convert datetime functions
      .replace(/datetime\('now'\)/g, 'NOW()')
      .replace(/datetime\("now"\)/g, 'NOW()')
      .replace(/datetime\('now',\s*'([^']+)'\)/g, (match, offset) => {
        // Convert SQLite datetime offsets to PostgreSQL intervals
        // Examples: '-7 days', '+1 hour', '-30 minutes'
        return `(NOW() ${offset.includes('-') ? '-' : '+'} INTERVAL '${offset.replace(/^[+-]\s*/, '')}')`
      })
      .replace(/datetime\("now",\s*"([^"]+)"\)/g, (match, offset) => {
        // Same for double quotes
        return `(NOW() ${offset.includes('-') ? '-' : '+'} INTERVAL '${offset.replace(/^[+-]\s*/, '')}')`
      })
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
      .replace(/AUTOINCREMENT/g, 'SERIAL')
      .replace(/TEXT PRIMARY KEY/g, 'UUID PRIMARY KEY DEFAULT gen_random_uuid()')
      .replace(/INTEGER PRIMARY KEY AUTOINCREMENT/g, 'SERIAL PRIMARY KEY');
    
    // Convert ? placeholders to $1, $2, $3, etc.
    let paramIndex = 1;
    converted = converted.replace(/\?/g, () => `$${paramIndex++}`);
    
    return converted;
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