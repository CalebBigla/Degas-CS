-- ============================================================================
-- SUPABASE TABLE INITIALIZATION FOR DEGAS-CS
-- Copy this entire code and paste into: Supabase SQL Editor → Run
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
  id BIGSERIAL PRIMARY KEY,
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
-- SECTION 7: INITIAL DATA - INSERT SUPER ADMIN
-- ============================================================================
-- ⚠️ IMPORTANT: Change the password hash before production use!
-- This is the bcrypt hash for: admin123
-- Generate real hash: npm install -g bcrypt && bcrypt 'your-password'
-- Or use: https://bcrypt-generator.com/

INSERT INTO core_users (email, password, full_name, phone, role, status)
VALUES (
  'admin@degas.com',
  '$2a$10$Zs8BTwtd2GKfF4qzXZG6I.nVqP8RNJxHJ92zHRgQwT8wfJJKEfRuW', -- bcrypt hash of 'admin123'
  'Super Admin',
  '+1234567890',
  'super_admin',
  'active'
)
ON CONFLICT (email) DO NOTHING;

-- ============================================================================
-- SECTION 8: CREATE DEFAULT FORM
-- ============================================================================
-- Create the default form for "The Force of Grace Ministry"
-- Update the link with your actual frontend URL

INSERT INTO forms (id, name, link, qrcode, isactive)
VALUES (
  '06aa4b67-76fe-411a-a1e0-682871e8506f',
  'The Force of Grace Ministry',
  'https://your-domain.com/register/06aa4b67-76fe-411a-a1e0-682871e8506f',
  NULL,
  true
)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERIES (Run after setup to verify)
-- ============================================================================
-- Uncomment and run these to verify tables were created successfully:

-- SELECT COUNT(*) as core_users_count FROM core_users;
-- SELECT COUNT(*) as users_count FROM users;
-- SELECT COUNT(*) as forms_count FROM forms;
-- SELECT COUNT(*) as access_logs_count FROM access_logs;
-- SELECT COUNT(*) as qr_codes_count FROM qr_codes;
-- SELECT * FROM information_schema.tables WHERE table_schema = 'public';
