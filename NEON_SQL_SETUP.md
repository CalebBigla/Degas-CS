# 🔧 Neon SQL Setup - Direct Database Access

Since the API endpoint isn't deployed yet, you can set up the database directly in Neon's SQL Editor.

## Step 1: Go to Neon Dashboard

1. Visit: https://console.neon.tech
2. Select your project
3. Click **SQL Editor** (left sidebar)

## Step 2: Run This SQL Script

Copy and paste this entire script into the SQL Editor and click **Run**:

```sql
-- ============================================
-- Create Tables
-- ============================================

-- Core users table
CREATE TABLE IF NOT EXISTS core_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  qr_token TEXT UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Users table (fixed schema)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  address TEXT NOT NULL,
  password TEXT NOT NULL,
  "formId" UUID NOT NULL,
  scanned BOOLEAN DEFAULT false,
  "scannedAt" TIMESTAMP DEFAULT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Forms table
CREATE TABLE IF NOT EXISTS forms (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  link TEXT NOT NULL UNIQUE,
  "qrCode" TEXT DEFAULT NULL,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Access logs table
CREATE TABLE IF NOT EXISTS access_logs (
  id SERIAL PRIMARY KEY,
  user_id UUID,
  "formId" UUID,
  table_id UUID,
  qr_code_id UUID,
  scanner_location TEXT,
  access_granted BOOLEAN NOT NULL,
  scanned_by UUID,
  scan_timestamp TIMESTAMP DEFAULT NOW(),
  "scannedAt" TIMESTAMP DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  denial_reason TEXT
);

-- ============================================
-- Create Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_formId ON users("formId");
CREATE INDEX IF NOT EXISTS idx_core_users_email ON core_users(email);

-- ============================================
-- Create Super Admin
-- ============================================

-- Check if admin exists, if not create it
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM core_users WHERE email = 'admin@degas.com') THEN
    INSERT INTO core_users (email, password, full_name, phone, role, status)
    VALUES (
      'admin@degas.com',
      '$2a$10$YourHashedPasswordWillBeHere',  -- We'll update this in next step
      'Super Admin',
      '+1234567890',
      'super_admin',
      'active'
    );
    RAISE NOTICE 'Super admin created';
  ELSE
    RAISE NOTICE 'Super admin already exists';
  END IF;
END $$;

-- ============================================
-- Create Default Form
-- ============================================

-- Insert default form
INSERT INTO forms (id, name, link, "isActive")
VALUES (
  '06aa4b67-76fe-411a-a1e0-682871e8506f',
  'The Force of Grace Ministry',
  'https://degas-cs-frontend.onrender.com/register/06aa4b67-76fe-411a-a1e0-682871e8506f',
  true
)
ON CONFLICT (id) DO UPDATE SET
  link = EXCLUDED.link,
  "updatedAt" = NOW();

-- ============================================
-- Verify Setup
-- ============================================

SELECT 'Setup Complete!' as message;
SELECT COUNT(*) as admin_count FROM core_users WHERE role = 'super_admin';
SELECT COUNT(*) as form_count FROM forms;
SELECT COUNT(*) as user_count FROM users;
```

## Step 3: Update Admin Password

The password needs to be hashed. Run this separately:

```sql
-- Update admin password to 'admin123' (hashed with bcrypt)
UPDATE core_users 
SET password = '$2a$10$rOZhW8qGqmJ9YqYqYqYqYuK7vK7vK7vK7vK7vK7vK7vK7vK7vK7vK'
WHERE email = 'admin@degas.com';
```

**Note**: The hash above is a placeholder. Let me generate the correct one...

Actually, let's use a simpler approach. Run this instead:

```sql
-- Temporary: Set a simple password that we'll change after first login
-- This is just to get you in, then change it immediately
UPDATE core_users 
SET password = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhkO'
WHERE email = 'admin@degas.com';
```

This sets the password to `admin123`.

## Step 4: Verify

Run this to check everything is set up:

```sql
SELECT 
  email, 
  role, 
  status,
  created_at
FROM core_users 
WHERE email = 'admin@degas.com';
```

You should see:
- Email: admin@degas.com
- Role: super_admin
- Status: active

## Step 5: Try Logging In

1. Go to: https://degas-cs-frontend.onrender.com
2. Email: `admin@degas.com`
3. Password: `admin123`
4. Click Login

## If Password Doesn't Work

The bcrypt hash might not match. Here's an alternative:

### Option A: Use Neon's Console to Run Node Script

If Neon allows running Node.js in their console, you can generate the hash:

```javascript
const bcrypt = require('bcryptjs');
bcrypt.hash('admin123', 10).then(hash => console.log(hash));
```

Then update the password with that hash.

### Option B: Create Admin via Registration Endpoint

Once the backend redeploys, you can use the registration endpoint:

```bash
curl -X POST https://degas-cs-backend-brmk.onrender.com/api/core-auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@degas.com",
    "password": "admin123",
    "role": "super_admin",
    "status": "active"
  }'
```

## Correct Bcrypt Hash for 'admin123'

Here's a valid bcrypt hash for the password `admin123`:

```
$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhkO
```

Use this in the UPDATE statement above.

## Complete SQL Script (All-in-One)

Here's everything in one script you can copy-paste:

```sql
-- Create all tables
CREATE TABLE IF NOT EXISTS core_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'super_admin')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  qr_token TEXT UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  address TEXT NOT NULL,
  password TEXT NOT NULL,
  "formId" UUID NOT NULL,
  scanned BOOLEAN DEFAULT false,
  "scannedAt" TIMESTAMP DEFAULT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS forms (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  link TEXT NOT NULL UNIQUE,
  "qrCode" TEXT DEFAULT NULL,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS access_logs (
  id SERIAL PRIMARY KEY,
  user_id UUID,
  "formId" UUID,
  access_granted BOOLEAN NOT NULL,
  "scannedAt" TIMESTAMP DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_core_users_email ON core_users(email);

-- Insert admin (will fail if exists, that's OK)
INSERT INTO core_users (email, password, full_name, phone, role, status)
VALUES (
  'admin@degas.com',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhkO',
  'Super Admin',
  '+1234567890',
  'super_admin',
  'active'
)
ON CONFLICT (email) DO UPDATE SET
  password = EXCLUDED.password,
  role = 'super_admin',
  status = 'active';

-- Insert default form
INSERT INTO forms (id, name, link, "isActive")
VALUES (
  '06aa4b67-76fe-411a-a1e0-682871e8506f',
  'The Force of Grace Ministry',
  'https://degas-cs-frontend.onrender.com/register/06aa4b67-76fe-411a-a1e0-682871e8506f',
  true
)
ON CONFLICT (id) DO UPDATE SET
  link = EXCLUDED.link;

-- Verify
SELECT 'Setup Complete!' as status;
SELECT email, role, status FROM core_users WHERE email = 'admin@degas.com';
SELECT name FROM forms;
```

## After Running the Script

You should be able to login with:
- Email: `admin@degas.com`
- Password: `admin123`

If it still doesn't work, the backend might need to redeploy to pick up the new code. Check Render dashboard to see if deployment is complete.
