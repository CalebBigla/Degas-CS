import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import logger from './logger';

// Determine data directory - use DATABASE_DIR env var or fallback to local directory
const dataDir = process.env.DATABASE_DIR || path.join(__dirname, '../../data');

// Ensure data directory exists
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
        scanned BOOLEAN DEFAULT 0,
        scanned_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (table_id) REFERENCES tables (id)
      )`, (err) => {
        if (err) {
          logger.error('Error creating dynamic_users table:', err);
        } else {
          logger.info('Dynamic users table ready');
        }
        
        // Add scanned and scanned_at columns if they don't exist (for existing databases)
        db.run(`ALTER TABLE dynamic_users ADD COLUMN scanned BOOLEAN DEFAULT 0`, (alterErr) => {
          if (alterErr && !alterErr.message.includes('duplicate column')) {
            logger.warn('Could not add scanned column to dynamic_users:', alterErr.message);
          }
        });
        
        db.run(`ALTER TABLE dynamic_users ADD COLUMN scanned_at DATETIME`, (alterErr) => {
          if (alterErr && !alterErr.message.includes('duplicate column')) {
            logger.warn('Could not add scanned_at column to dynamic_users:', alterErr.message);
          }
        });
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

      // ATTENDANCE SYSTEM TABLES (Non-breaking extension)
      
      // Core users table for authentication
      db.run(`CREATE TABLE IF NOT EXISTS core_users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        full_name TEXT,
        phone TEXT,
        role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
        status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
        qr_token TEXT UNIQUE,
        scanned BOOLEAN DEFAULT 0,
        scanned_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) {
          if (err.message.includes('duplicate column')) {
            logger.info('Core users table already has new columns');
          } else {
            logger.error('Error creating core_users table:', err);
          }
        } else {
          logger.info('Core users table ready');
        }
        
        // Add scanned and scanned_at columns if they don't exist (for existing databases)
        db.run(`ALTER TABLE core_users ADD COLUMN scanned BOOLEAN DEFAULT 0`, (alterErr) => {
          if (alterErr && !alterErr.message.includes('duplicate column')) {
            logger.warn('Could not add scanned column:', alterErr.message);
          }
        });
        
        db.run(`ALTER TABLE core_users ADD COLUMN scanned_at DATETIME`, (alterErr) => {
          if (alterErr && !alterErr.message.includes('duplicate column')) {
            logger.warn('Could not add scanned_at column:', alterErr.message);
          }
        });
      });

      // Link core users to dynamic table records
      db.run(`CREATE TABLE IF NOT EXISTS user_data_links (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        core_user_id TEXT NOT NULL,
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (core_user_id) REFERENCES core_users(id) ON DELETE CASCADE,
        UNIQUE(core_user_id, table_name, record_id)
      )`, (err) => {
        if (err) logger.error('Error creating user_data_links table:', err);
        else logger.info('User data links table ready');
      });

      // CMS-driven form definitions - with migration support
      db.run(`CREATE TABLE IF NOT EXISTS form_definitions (
        id TEXT PRIMARY KEY,
        form_name TEXT,
        name TEXT,
        description TEXT,
        target_table TEXT NOT NULL,
        qr_code TEXT,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) {
          // Table already exists, try migration if needed
          logger.warn('Form definitions table exists, attempting migration...');
          db.run(`ALTER TABLE form_definitions ADD COLUMN form_name TEXT`, (alterErr) => {
            if (alterErr) {
              // Column might already exist, try to migrate data
              logger.info('Form definitions table already has form_name column');
              db.run(`UPDATE form_definitions SET form_name = COALESCE(form_name, name) WHERE form_name IS NULL AND name IS NOT NULL`, (migrateErr) => {
                if (migrateErr) logger.warn('Could not migrate form_definitions data:', migrateErr);
                else logger.info('Form definitions data migrated');
              });
            } else {
              // Column was added, migrate data
              db.run(`UPDATE form_definitions SET form_name = name WHERE name IS NOT NULL`, (migrateErr) => {
                if (migrateErr) logger.warn('Could not migrate form_definitions data:', migrateErr);
                else logger.info('Form definitions table ready (migrated column)');
              });
            }
          });
        } else {
          logger.info('Form definitions table created/ready');
        }
        
        // Add qr_code column if it doesn't exist
        db.run(`ALTER TABLE form_definitions ADD COLUMN qr_code TEXT`, (alterErr) => {
          if (alterErr && !alterErr.message.includes('duplicate column')) {
            logger.info('qr_code column added to form_definitions');
          }
        });
      });

      db.run(`CREATE TABLE IF NOT EXISTS form_fields (
        id TEXT PRIMARY KEY,
        form_id TEXT NOT NULL,
        field_name TEXT NOT NULL,
        field_label TEXT NOT NULL,
        field_type TEXT NOT NULL CHECK (field_type IN ('text', 'email', 'password', 'number', 'date', 'tel', 'file', 'camera', 'select', 'textarea')),
        is_required BOOLEAN DEFAULT 0,
        is_email_field BOOLEAN DEFAULT 0,
        is_password_field BOOLEAN DEFAULT 0,
        options TEXT,
        placeholder TEXT,
        order_index INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (form_id) REFERENCES form_definitions(id) ON DELETE CASCADE
      )`, (err) => {
        if (err) logger.error('Error creating form_fields table:', err);
        else logger.info('Form fields table ready');
      });

      // Attendance system
      db.run(`CREATE TABLE IF NOT EXISTS attendance_sessions (
        id TEXT PRIMARY KEY,
        name TEXT,
        session_name TEXT NOT NULL,
        description TEXT,
        session_date DATE,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        grace_period_minutes INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT 1,
        qr_code TEXT,
        created_by TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES core_users(id)
      )`, (err) => {
        if (err) {
          // Table exists, try to add missing columns
          logger.info('Attendance sessions table exists, checking for migrations...');
          db.run(`ALTER TABLE attendance_sessions ADD COLUMN session_name TEXT`, (alterErr) => {
            if (alterErr) logger.info('session_name column already exists or error:', alterErr.message);
            else {
              logger.info('Added session_name column');
              db.run(`UPDATE attendance_sessions SET session_name = name WHERE session_name IS NULL`, () => {});
            }
          });
        } else {
          logger.info('Attendance sessions table ready');
        }
      });

      db.run(`CREATE TABLE IF NOT EXISTS attendance_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        core_user_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        check_in_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        checked_in_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        method TEXT DEFAULT 'qr_scan',
        location TEXT,
        ip_address TEXT,
        user_agent TEXT,
        FOREIGN KEY (core_user_id) REFERENCES core_users(id) ON DELETE CASCADE,
        FOREIGN KEY (session_id) REFERENCES attendance_sessions(id) ON DELETE CASCADE,
        UNIQUE(core_user_id, session_id)
      )`, (err) => {
        if (err) {
          logger.info('Attendance records table exists, checking for migrations...');
          db.run(`ALTER TABLE attendance_records ADD COLUMN checked_in_at DATETIME`, (alterErr) => {
            if (alterErr) logger.info('checked_in_at column already exists or error:', alterErr.message);
            else {
              logger.info('Added checked_in_at column');
              db.run(`UPDATE attendance_records SET checked_in_at = check_in_time WHERE checked_in_at IS NULL`, () => {});
            }
          });
        } else {
          logger.info('Attendance records table ready');
        }
      });

      // Audit log for attendance
      db.run(`CREATE TABLE IF NOT EXISTS attendance_audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        core_user_id TEXT,
        session_id TEXT,
        action TEXT NOT NULL,
        status TEXT NOT NULL,
        details TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (core_user_id) REFERENCES core_users(id),
        FOREIGN KEY (session_id) REFERENCES attendance_sessions(id)
      )`, (err) => {
        if (err) logger.error('Error creating attendance_audit_logs table:', err);
        else logger.info('Attendance audit logs table ready');
      });

      // Create dynamic data tables
      // REMOVED: Hardcoded tables (Students, Staff, Visitors, Contractors)
      // REASON: All user tables are now created dynamically via form definitions
      // When a form is created, the target_table is automatically created in the database
      // This ensures production-ready, scalable architecture where any custom table can be created on-demand
      
      logger.info('ℹ️  Dynamic tables are created automatically when forms are created');
      logger.info('ℹ️  No hardcoded tables are created - all tables are form-driven');

      // Create indexes for performance
      db.run(`CREATE INDEX IF NOT EXISTS idx_core_users_email ON core_users(email)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_core_users_qr_token ON core_users(qr_token)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_user_data_links_core_user ON user_data_links(core_user_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_form_fields_form_id ON form_fields(form_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_attendance_records_user ON attendance_records(core_user_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_attendance_records_session ON attendance_records(session_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_attendance_sessions_date ON attendance_sessions(session_date)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_attendance_sessions_active ON attendance_sessions(is_active)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_attendance_audit_user ON attendance_audit_logs(core_user_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_attendance_audit_session ON attendance_audit_logs(session_id)`);

      // Events table - central controller for all activities
      db.run(`CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        event_date DATE NOT NULL,
        start_time DATETIME NOT NULL,
        end_time DATETIME NOT NULL,
        table_id TEXT NOT NULL,
        form_id TEXT NOT NULL,
        is_active BOOLEAN DEFAULT 1,
        allow_check_in BOOLEAN DEFAULT 1,
        grace_period_minutes INTEGER DEFAULT 0,
        created_by TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (table_id) REFERENCES tables(id),
        FOREIGN KEY (form_id) REFERENCES form_definitions(id),
        FOREIGN KEY (created_by) REFERENCES core_users(id)
      )`, (err) => {
        if (err) logger.error('Error creating events table:', err);
        else logger.info('Events table ready');
      });

      // Update access_logs to include event_id and scanned_at
      db.run(`ALTER TABLE access_logs ADD COLUMN event_id TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          logger.info('Event_id column already exists or error:', err?.message);
        } else if (!err) {
          logger.info('Added event_id column to access_logs');
          db.run(`CREATE INDEX IF NOT EXISTS idx_access_logs_event ON access_logs(event_id)`);
        }
      });

      db.run(`ALTER TABLE access_logs ADD COLUMN scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
          logger.info('Scanned_at column already exists or error:', err?.message);
        } else if (!err) {
          logger.info('Added scanned_at column to access_logs');
        }
      });

      // FIXED USER SCHEMA TABLES (Production-Ready Pipeline)
      // New fixed Users collection with standard fields for stability and simplicity
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        address TEXT NOT NULL,
        password TEXT NOT NULL,
        formId TEXT NOT NULL,
        scanned BOOLEAN DEFAULT 0,
        scannedAt DATETIME DEFAULT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (formId) REFERENCES form_definitions(id) ON DELETE CASCADE
      )`, (err) => {
        if (err) {
          logger.error('Error creating users table:', err);
        } else {
          logger.info('Users table ready (Fixed Schema)');
        }
      });

      // Create indexes on users table for performance
      db.run(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_users_formId ON users(formId)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_users_scanned ON users(scanned)`);

      // NEW Forms collection to manage forms with associated QR codes
      db.run(`CREATE TABLE IF NOT EXISTS forms (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        link TEXT NOT NULL UNIQUE,
        qrCode TEXT DEFAULT NULL,
        isActive BOOLEAN DEFAULT 1,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) {
          if (err.message.includes('already exists')) {
            logger.info('Forms table already exists');
          } else {
            logger.error('Error creating forms table:', err);
          }
        } else {
          logger.info('Forms table ready');
        }
      });

      // Create indexes on forms table
      db.run(`CREATE INDEX IF NOT EXISTS idx_forms_active ON forms(isActive)`);

      // Create default "The Force of Grace Ministry" form if none exists
      db.get("SELECT COUNT(*) as count FROM forms WHERE name = 'The Force of Grace Ministry'", async (err, row: any) => {
        if (err) {
          logger.error('Error checking forms count:', err);
        } else if (row && row.count === 0) {
          logger.info('Creating default form: The Force of Grace Ministry...');
          
          try {
            const QRCode = require('qrcode');
            const formId = '06aa4b67-76fe-411a-a1e0-682871e8506f'; // Fixed ID for consistency
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            const registrationLink = `${frontendUrl}/register/${formId}`;
            
            // Generate QR code for SCANNING (not registration)
            const scanUrl = `${frontendUrl}/scan/${formId}`;
            const qrCodeData = await QRCode.toDataURL(scanUrl, {
              errorCorrectionLevel: 'H',
              type: 'image/png',
              width: 300,
              margin: 2
            });
            
            db.run(
              `INSERT INTO forms (id, name, link, qrCode, isActive, createdAt, updatedAt)
               VALUES (?, ?, ?, ?, 1, datetime('now'), datetime('now'))`,
              [formId, 'The Force of Grace Ministry', registrationLink, qrCodeData],
              (err) => {
                if (err) logger.error('Error creating default form:', err);
                else logger.info('✅ Default form created: The Force of Grace Ministry (QR for scanning)');
              }
            );
          } catch (error) {
            logger.error('Error generating QR code for default form:', error);
          }
        } else if (row && row.count > 0) {
          // Update existing form's QR code to use scan URL
          logger.info('Updating existing form QR code to scan URL...');
          try {
            const QRCode = require('qrcode');
            const formId = '06aa4b67-76fe-411a-a1e0-682871e8506f';
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
            const scanUrl = `${frontendUrl}/scan/${formId}`;
            
            const qrCodeData = await QRCode.toDataURL(scanUrl, {
              errorCorrectionLevel: 'H',
              type: 'image/png',
              width: 300,
              margin: 2
            });
            
            db.run(
              `UPDATE forms SET qrCode = ?, updatedAt = datetime('now') WHERE name = 'The Force of Grace Ministry'`,
              [qrCodeData],
              (err) => {
                if (err) logger.warn('Could not update QR code:', err);
                else logger.info('✅ Updated form QR code to scan URL');
              }
            );
          } catch (error) {
            logger.warn('Could not update QR code:', error);
          }
        }
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