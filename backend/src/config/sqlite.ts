import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import logger from './logger';

// Ensure data directory exists
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'degas.db');

// Enable verbose mode for debugging
sqlite3.verbose();

export const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    logger.error('Error opening SQLite database:', err);
  } else {
    logger.info('Connected to SQLite database:', { path: dbPath });
  }
});

// Initialize database tables
export const initializeDatabase = async (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // System tables
      db.run(`CREATE TABLE IF NOT EXISTS admins (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME
      )`, (err) => {
        if (err) logger.error('Error creating admins table:', err);
        else logger.info('Admins table ready');
      });

      db.run(`CREATE TABLE IF NOT EXISTS tables (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        schema TEXT NOT NULL,
        id_card_config TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) logger.error('Error creating tables table:', err);
        else logger.info('Tables table ready');
      });

      db.run(`CREATE TABLE IF NOT EXISTS dynamic_users (
        id TEXT PRIMARY KEY,
        table_id TEXT NOT NULL,
        uuid TEXT UNIQUE NOT NULL,
        data TEXT NOT NULL,
        photo_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (table_id) REFERENCES tables (id)
      )`, (err) => {
        if (err) logger.error('Error creating dynamic_users table:', err);
        else logger.info('Dynamic users table ready');
      });

      db.run(`CREATE TABLE IF NOT EXISTS access_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        table_id TEXT,
        qr_code_id TEXT,
        scanner_location TEXT,
        access_granted BOOLEAN NOT NULL,
        scanned_by TEXT,
        scan_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        ip_address TEXT,
        user_agent TEXT,
        denial_reason TEXT
      )`, (err) => {
        if (err) logger.error('Error creating access_logs table:', err);
        else logger.info('Access logs table ready');
      });

      // QR Codes table - stores all generated QR codes
      db.run(`CREATE TABLE IF NOT EXISTS qr_codes (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        table_id TEXT NOT NULL,
        qr_data TEXT UNIQUE NOT NULL,
        qr_payload TEXT NOT NULL,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME,
        last_scanned DATETIME,
        scan_count INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES dynamic_users(id) ON DELETE CASCADE,
        FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE CASCADE
      )`, (err) => {
        if (err) logger.error('Error creating qr_codes table:', err);
        else logger.info('QR codes table ready');
      });

      // ID Card Settings table - stores global customization settings
      db.run(`CREATE TABLE IF NOT EXISTS id_card_settings (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL DEFAULT 'Default Template',
        visible_fields TEXT NOT NULL,
        layout TEXT NOT NULL DEFAULT 'standard',
        logo_url TEXT,
        background_template TEXT DEFAULT 'light',
        font_size TEXT DEFAULT 'medium',
        qr_position TEXT DEFAULT 'bottom-right',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT 1
      )`, (err) => {
        if (err) logger.error('Error creating id_card_settings table:', err);
        else logger.info('ID card settings table ready');
        
        // Insert default settings if none exist
        db.get('SELECT COUNT(*) as count FROM id_card_settings', (err, row: any) => {
          if (!err && row.count === 0) {
            const defaultSettings = {
              name: true,
              photo: true,
              idNumber: false,
              department: false,
              email: false,
              customFields: {}
            };
            
            db.run(`INSERT INTO id_card_settings (id, name, visible_fields) 
              VALUES (?, ?, ?)`,
              ['default', 'Default Template', JSON.stringify(defaultSettings)],
              (err) => {
                if (err) logger.error('Error creating default ID card settings:', err);
                else logger.info('Default ID card settings created');
              }
            );
          }
        });
      });

      // ID Card Templates table - stores customization settings for ID cards
      db.run(`CREATE TABLE IF NOT EXISTS id_card_templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        is_default BOOLEAN DEFAULT 0,
        visible_fields TEXT NOT NULL,
        layout TEXT DEFAULT 'standard',
        theme TEXT DEFAULT 'light',
        logo_url TEXT,
        font_size INTEGER DEFAULT 12,
        background_color TEXT DEFAULT '#FFFFFF',
        text_color TEXT DEFAULT '#000000',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) logger.error('Error creating id_card_templates table:', err);
        else logger.info('ID card templates table ready');
      });

      // Create default ID card template if none exists
      db.get("SELECT COUNT(*) as count FROM id_card_templates", (err, row: any) => {
        if (err) {
          logger.error('Error checking id_card_templates count:', err);
        } else if (row && row.count === 0) {
          logger.info('Creating default ID card template...');
          const defaultTemplate = {
            name: true,
            role: true,
            department: true,
            email: true,
            tableName: true,
            photo: true,
            customFields: {}
          };
          
          const insertTemplateSQL = `INSERT INTO id_card_templates (id, name, description, is_default, visible_fields, layout, theme) 
            VALUES (?, ?, ?, 1, ?, ?, ?)`;
          
          db.run(insertTemplateSQL, [
            uuidv4(),
            'Default Template',
            'Default ID card template with all fields',
            JSON.stringify(defaultTemplate),
            'standard',
            'light'
          ], (err) => {
            if (err) logger.error('Error creating default ID card template:', err);
            else logger.info('Default ID card template created');
          });
        }
      });

      // Create default admin user if none exists
      db.get("SELECT COUNT(*) as count FROM admins", async (err, row: any) => {
        if (err) {
          logger.error('Error checking admin count:', err);
          reject(err);
          return;
        }

        if (row.count === 0) {
          logger.info('Creating default admin users...');
          
          const adminPassword = await bcrypt.hash('admin123', 10);
          const guardPassword = await bcrypt.hash('guard123', 10);

          db.run(`INSERT INTO admins (id, username, email, password_hash, role) VALUES (?, ?, ?, ?, ?)`,
            [uuidv4(), 'admin', 'admin@degas.com', adminPassword, 'super_admin'], (err) => {
              if (err) logger.error('Error creating admin user:', err);
              else logger.info('Default admin user created: admin/admin123');
            });

          db.run(`INSERT INTO admins (id, username, email, password_hash, role) VALUES (?, ?, ?, ?, ?)`,
            [uuidv4(), 'guard', 'guard@degas.com', guardPassword, 'guard'], (err) => {
              if (err) logger.error('Error creating guard user:', err);
              else logger.info('Default guard user created: guard/guard123');
            });
        }

        logger.info('SQLite database initialization complete');
        resolve();
      });
    });
  });
};

// Graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      logger.error('Error closing database:', err);
    } else {
      logger.info('Database connection closed');
    }
    process.exit(0);
  });
});

export default db;