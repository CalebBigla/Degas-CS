-- ============================================================================
-- DEGAS-CS DATABASE SCHEMA
-- Complete SQL schema for creating database from scratch
-- Compatible with: PostgreSQL (Neon), SQLite, MySQL
-- ============================================================================

-- ============================================================================
-- SECTION 1: CORE AUTHENTICATION & ADMIN USERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS core_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin', 'follow_up', 'greeter')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  qr_token TEXT UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- SECTION 2: MAIN USERS TABLE (Attendance System)
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  address TEXT NOT NULL,
  password TEXT NOT NULL,
  formid UUID NOT NULL,
  scanned BOOLEAN DEFAULT false,
  scannedat TIMESTAMP DEFAULT NULL,
  profileImageUrl TEXT NOT NULL DEFAULT '',
  createdat TIMESTAMP DEFAULT NOW(),
  updatedat TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (formid) REFERENCES forms(id) ON DELETE CASCADE
);

-- ============================================================================
-- SECTION 3: FORMS/EVENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  link TEXT NOT NULL UNIQUE,
  qrcode TEXT DEFAULT NULL,
  isactive BOOLEAN DEFAULT true,
  createdat TIMESTAMP DEFAULT NOW(),
  updatedat TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- SECTION 4: ACCESS LOGS & SCANNING HISTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS access_logs (
  id SERIAL PRIMARY KEY,
  user_id UUID,
  formid UUID,
  table_id UUID,
  qr_code_id UUID,
  scanner_location TEXT,
  access_granted BOOLEAN NOT NULL,
  scanned_by UUID,
  scan_timestamp TIMESTAMP DEFAULT NOW(),
  scannedat TIMESTAMP DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  denial_reason TEXT
);

-- ============================================================================
-- SECTION 5: QR CODES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  table_id TEXT,
  qr_data TEXT NOT NULL,
  qr_payload TEXT,
  is_active BOOLEAN DEFAULT true,
  scan_count INTEGER DEFAULT 0,
  last_scanned TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
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
-- SECTION 7: INITIAL DATA SETUP (Optional)
-- ============================================================================

-- Insert super admin (email: admin@degas.com, password: admin123)
-- NOTE: In production, hash the password and use a secure password!
-- Password hash below is for admin123 using bcryptjs with salt rounds 10
-- You should UPDATE this with an actual bcrypt hash from your system

-- For PostgreSQL/Neon, uncomment and use:
-- INSERT INTO core_users (email, password, full_name, phone, role, status)
-- VALUES (
--   'admin@degas.com',
--   '$2a$10$Zs8BTwtd2GKfF4qzXZG6I.nVqP8RNJxHJ92zHRgQwT8wfJJKEfRuW', -- bcrypt hash of 'admin123'
--   'Super Admin',
--   '+1234567890',
--   'super_admin',
--   'active'
-- )
-- ON CONFLICT (email) DO NOTHING;

-- Insert default form "The Force of Grace Ministry"
-- INSERT INTO forms (id, name, link, qrcode, isactive)
-- VALUES (
--   '06aa4b67-76fe-411a-a1e0-682871e8506f',
--   'The Force of Grace Ministry',
--   'https://your-domain.com/register/06aa4b67-76fe-411a-a1e0-682871e8506f',
--   NULL,
--   true
-- )
-- ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- LEGACY TABLES (Keeping for backward compatibility - can be dropped if not needed)
-- ============================================================================

-- CREATE TABLE IF NOT EXISTS tables (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   name VARCHAR(255) UNIQUE NOT NULL,
--   description TEXT,
--   schema TEXT NOT NULL,
--   created_at TIMESTAMP DEFAULT NOW(),
--   updated_at TIMESTAMP DEFAULT NOW()
-- );
--
-- CREATE TABLE IF NOT EXISTS dynamic_users (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   table_id UUID NOT NULL,
--   uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
--   data TEXT NOT NULL,
--   photo_url VARCHAR(500),
--   scanned BOOLEAN DEFAULT false,
--   scanned_at TIMESTAMP,
--   created_at TIMESTAMP DEFAULT NOW(),
--   updated_at TIMESTAMP DEFAULT NOW(),
--   FOREIGN KEY (table_id) REFERENCES tables (id) ON DELETE CASCADE
-- );

-- ============================================================================
-- NOTES & SETUP INSTRUCTIONS
-- ============================================================================

-- 1. DATABASE TYPE SUPPORT:
--    - PostgreSQL/Neon: Full support with UUID generation
--    - SQLite: Replace UUID with TEXT and gen_random_uuid() with randomblob()
--    - MySQL: Replace UUID with CHAR(36) and gen_random_uuid() with UUID()

-- 2. FOR SQLITE, USE THIS VERSION INSTEAD:
--    (See DATABASE_SCHEMA_SQLITE.sql file)

-- 3. CONNECTION STRING EXAMPLES:
--    PostgreSQL: postgresql://user:password@localhost:5432/degas_cs
--    Neon: postgresql://user:password@xxx.neon.tech/degas_cs
--    SQLite: /path/to/database.db

-- 4. CLOUDINARY SETUP:
--    The profileImageUrl field stores Cloudinary URLs
--    Set up Cloudinary credentials in .env:
--      CLOUDINARY_CLOUD_NAME=your_cloud_name
--      CLOUDINARY_API_KEY=your_api_key
--      CLOUDINARY_API_SECRET=your_api_secret

-- 5. INITIAL ADMIN SETUP:
--    Email: admin@degas.com
--    Password: admin123 (CHANGE THIS IN PRODUCTION!)
--    Role: super_admin

-- 6. RELATIONSHIPS:
--    - users.formid → forms.id (each user belongs to one form/event)
--    - qr_codes.user_id → users.id (each QR code is linked to a user)
--    - access_logs.user_id → users.id (each access log records a user's scan)
--    - core_users - standalone admin authentication table

-- 7. COLUMNS EXPLANATION:
--    users.scanned: Boolean flag indicating user attended
--    users.scannedat: Timestamp of when user was scanned/marked present
--    users.profileImageUrl: URL to profile image on Cloudinary
--    forms.qrcode: QR code data to display for registration
--    access_logs.access_granted: True if user granted access, false if denied

-- ============================================================================
