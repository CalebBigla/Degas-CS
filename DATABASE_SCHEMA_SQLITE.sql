-- ============================================================================
-- DEGAS-CS DATABASE SCHEMA - SQLite Version
-- Complete SQL schema for SQLite database from scratch
-- Use this for local development
-- ============================================================================

-- ============================================================================
-- SECTION 1: CORE AUTHENTICATION & ADMIN USERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS core_users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin', 'follow_up', 'greeter')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  qr_token TEXT UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- SECTION 2: MAIN USERS TABLE (Attendance System)
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  address TEXT NOT NULL,
  password TEXT NOT NULL,
  formid TEXT NOT NULL,
  scanned BOOLEAN DEFAULT 0,
  scannedat DATETIME DEFAULT NULL,
  profileImageUrl TEXT NOT NULL DEFAULT '',
  createdat DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedat DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (formid) REFERENCES forms(id) ON DELETE CASCADE
);

-- ============================================================================
-- SECTION 3: FORMS/EVENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS forms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  link TEXT NOT NULL UNIQUE,
  qrcode TEXT DEFAULT NULL,
  isactive BOOLEAN DEFAULT 1,
  createdat DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedat DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- SECTION 4: ACCESS LOGS & SCANNING HISTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS access_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  formid TEXT,
  table_id TEXT,
  qr_code_id TEXT,
  scanner_location TEXT,
  access_granted BOOLEAN NOT NULL,
  scanned_by TEXT,
  scan_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  scannedat DATETIME DEFAULT CURRENT_TIMESTAMP,
  ip_address TEXT,
  user_agent TEXT,
  denial_reason TEXT
);

-- ============================================================================
-- SECTION 5: QR CODES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS qr_codes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  table_id TEXT,
  qr_data TEXT NOT NULL,
  qr_payload TEXT,
  is_active BOOLEAN DEFAULT 1,
  scan_count INTEGER DEFAULT 0,
  last_scanned DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- SECTION 6: INDEXES FOR PERFORMANCE
-- ============================================================================

-- Core Users Indexes
CREATE INDEX IF NOT EXISTS idx_core_users_email ON core_users(email);
CREATE INDEX IF NOT EXISTS idx_core_users_role ON core_users(role);
CREATE INDEX IF NOT EXISTS idx_core_users_status ON core_users(status);

-- Users Table Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_formid ON users(formid);
CREATE INDEX IF NOT EXISTS idx_users_scanned ON users(scanned);
CREATE INDEX IF NOT EXISTS idx_users_createdat ON users(createdat);

-- Forms Table Indexes
CREATE INDEX IF NOT EXISTS idx_forms_active ON forms(isactive);
CREATE INDEX IF NOT EXISTS idx_forms_name ON forms(name);

-- Access Logs Indexes
CREATE INDEX IF NOT EXISTS idx_access_logs_user_id ON access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_formid ON access_logs(formid);
CREATE INDEX IF NOT EXISTS idx_access_logs_scan_timestamp ON access_logs(scan_timestamp);
CREATE INDEX IF NOT EXISTS idx_access_logs_access_granted ON access_logs(access_granted);

-- QR Codes Indexes
CREATE INDEX IF NOT EXISTS idx_qr_codes_user_id ON qr_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_qr_data ON qr_codes(qr_data);
CREATE INDEX IF NOT EXISTS idx_qr_codes_is_active ON qr_codes(is_active);

-- ============================================================================
-- SECTION 7: SQLITE-SPECIFIC FEATURES
-- ============================================================================

-- Enable foreign key constraints in SQLite
PRAGMA foreign_keys = ON;

-- ============================================================================
-- SECTION 8: INITIAL DATA SETUP (Optional)
-- ============================================================================

-- Insert super admin (email: admin@degas.com, password: admin123)
-- NOTE: For SQLite, generate UUID using: SELECT lower(hex(randomblob(16)))
-- Password hash is bcryptjs hash of 'admin123' with salt rounds 10

-- INSERT INTO core_users (id, email, password, full_name, phone, role, status)
-- VALUES (
--   lower(hex(randomblob(16))),
--   'admin@degas.com',
--   '$2a$10$Zs8BTwtd2GKfF4qzXZG6I.nVqP8RNJxHJ92zHRgQwT8wfJJKEfRuW',
--   'Super Admin',
--   '+1234567890',
--   'super_admin',
--   'active'
-- );

-- Insert default form (generate UUID using: SELECT lower(hex(randomblob(16))))
-- INSERT INTO forms (id, name, link, qrcode, isactive)
-- VALUES (
--   '06aa4b67-76fe-411a-a1e0-682871e8506f',
--   'The Force of Grace Ministry',
--   'https://your-domain.com/register/06aa4b67-76fe-411a-a1e0-682871e8506f',
--   NULL,
--   1
-- );

-- ============================================================================
-- NOTES & SETUP INSTRUCTIONS FOR SQLITE
-- ============================================================================

-- 1. SQLITE VERSION REQUIREMENTS:
--    - SQLite 3.35+ recommended for JSON support
--    - Most systems have compatible SQLite

-- 2. ID GENERATION:
--    SQLite doesn't have native UUID type
--    Use TEXT type and generate UUIDs in application code
--    For testing, use: SELECT lower(hex(randomblob(16)))

-- 3. BOOLEAN HANDLING:
--    SQLite uses 0 for FALSE, 1 for TRUE
--    Application layer should handle boolean conversion

-- 4. TIMESTAMP HANDLING:
--    SQLite stores datetime as TEXT in ISO 8601 format
--    CURRENT_TIMESTAMP works in SQLite

-- 5. CONNECTION STRING:
--    File-based: /path/to/degas_cs.db
--    In-memory: :memory:

-- 6. CLOUDINARY SETUP:
--    The profileImageUrl field stores Cloudinary URLs
--    Set up Cloudinary credentials in .env:
--      CLOUDINARY_CLOUD_NAME=your_cloud_name
--      CLOUDINARY_API_KEY=your_api_key
--      CLOUDINARY_API_SECRET=your_api_secret

-- 7. INITIAL ADMIN SETUP:
--    Email: admin@degas.com
--    Password: admin123 (CHANGE THIS IN PRODUCTION!)
--    Role: super_admin

-- 8. RELATIONSHIPS:
--    - users.formid → forms.id (each user belongs to one form/event)
--    - qr_codes.user_id → users.id (each QR code is linked to a user)
--    - access_logs.user_id → users.id (each access log records a user's scan)
--    - core_users - standalone admin authentication table

-- 9. LEGACY TABLES (Can be dropped if not using old schema):
--    - tables (deprecated, use forms instead)
--    - dynamic_users (deprecated, use users instead)

-- 10. BEST PRACTICES:
--     - Always enable foreign_keys: PRAGMA foreign_keys = ON;
--     - Use transactions for bulk operations
--     - Back up database regularly
--     - Consider migrating to PostgreSQL for production

-- ============================================================================
