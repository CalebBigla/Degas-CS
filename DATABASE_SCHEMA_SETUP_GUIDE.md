## Database Schema Setup Guide

Created two complete SQL schema files ready to paste into any SQL editor:

### 📄 Files Created:

1. **DATABASE_SCHEMA.sql** - PostgreSQL/Neon version
   - Use for production (Neon) and cloud deployments
   - Includes UUID generation, CHECK constraints, proper timestamps
   - All indexes optimized for PostgreSQL

2. **DATABASE_SCHEMA_SQLITE.sql** - SQLite version  
   - Use for local development
   - Adapted for SQLite data types and functions
   - Simpler ID generation (TEXT-based UUIDs)

---

## Quick Start - How to Use

### Option A: PostgreSQL (Neon) Setup
1. Log into your Neon console
2. Open SQL editor
3. Copy entire contents of `DATABASE_SCHEMA.sql`
4. Paste into SQL editor and execute
5. Done! Database tables created with all indexes

### Option B: SQLite Setup (Local Dev)
1. Open your SQLite client/editor (DB Browser, SQLite Studio, etc.)
2. Create new database file: `degas_cs.db`
3. Copy contents of `DATABASE_SCHEMA_SQLITE.sql`
4. Paste and execute
5. Database ready to use

### Option C: MySQL Setup
```sql
-- For MySQL, make these replacements:
-- Replace: UUID -> CHAR(36)
-- Replace: gen_random_uuid() -> UUID()
-- Replace: DEFAULT NOW() -> DEFAULT CURRENT_TIMESTAMP
-- Replace: SERIAL PRIMARY KEY -> AUTO_INCREMENT
```

---

## Schema Overview

### Core Tables (7 total):

#### 1. **core_users** - Admin authentication
```
Columns: id, email, password, full_name, phone, role, status, qr_token
Purpose: Store super admin and staff user credentials
Indexed: email (for login), role (for permission lookup)
```

#### 2. **users** - Main user/attendee table
```
Columns: id, name, phone, email, address, password, formid, scanned, 
         scannedat, profileImageUrl, createdat, updatedat
Purpose: Store registered attendees for each form/event
Indexed: email, phone (for search), formid (for form filtering), 
         scanned (for attendance reports)
Foreign Key: formid → forms.id
```

#### 3. **forms** - Events/forms table
```
Columns: id, name, link, qrcode, isactive, createdat, updatedat
Purpose: Define events/forms that users register for
Indexed: isactive (for active forms query), name (for search)
```

#### 4. **access_logs** - Attendance/scan history
```
Columns: id, user_id, formid, table_id, qr_code_id, scanner_location,
         access_granted, scanned_by, scan_timestamp, ip_address, user_agent
Purpose: Complete audit trail of all scans/attendance checks
Indexed: user_id, formid, scan_timestamp (for reports/history)
```

#### 5. **qr_codes** - QR code registry
```
Columns: id, user_id, table_id, qr_data, qr_payload, is_active,
         scan_count, last_scanned, created_at
Purpose: Store QR code data and scan statistics
Indexed: user_id (for user's QR), qr_data (for QR lookup)
```

---

## Key Configuration Notes

### Cloudinary Profile Images
The `users.profileImageUrl` column stores URLs from Cloudinary (persistent cloud storage).

**Set up in .env:**
```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Initial Admin Credentials
- Email: `admin@degas.com`
- Password: `admin123` (MUST change in production!)
- Hashed password in SQL: `$2a$10$Zs8BTwtd2GKfF4qzXZG6I.nVqP8RNJxHJ92zHRgQwT8wfJJKEfRuW` (bcryptjs)

### Database Relationships
```
forms (parent)
  ↓ (formid FK)
users (child)
  ↓ (user_id FK)
access_logs, qr_codes
```

Each user registered for a form → can have multiple attendance logs → can have multiple QR codes

---

## Migration from Old Schema

If you have data in old `dynamic_users` and `tables`:

### Step 1: Back up old database
```sql
CREATE TABLE dynamic_users_backup AS SELECT * FROM dynamic_users;
CREATE TABLE tables_backup AS SELECT * FROM tables;
```

### Step 2: Migrate existing users (example)
```sql
INSERT INTO users (id, name, phone, email, address, password, formid, 
                   scanned, scannedat, profileImageUrl, createdat, updatedat)
SELECT 
  id,
  JSON_EXTRACT(data, '$.name') as name,
  JSON_EXTRACT(data, '$.phone') as phone,
  JSON_EXTRACT(data, '$.email') as email,
  JSON_EXTRACT(data, '$.address') as address,
  JSON_EXTRACT(data, '$.password') as password,
  table_id as formid,
  scanned,
  scanned_at as scannedat,
  photo_url as profileImageUrl,
  created_at as createdat,
  updated_at as updatedat
FROM dynamic_users;
```

### Step 3: Verify migration
```sql
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM forms;
```

---

## Common Queries After Setup

### Get all registered users for a form
```sql
SELECT users.* FROM users 
WHERE formid = '06aa4b67-76fe-411a-a1e0-682871e8506f'
ORDER BY createdat DESC;
```

### Get attendance summary for a form
```sql
SELECT 
  formid,
  COUNT(*) as total_registered,
  SUM(CASE WHEN scanned = 1 THEN 1 ELSE 0 END) as attended,
  ROUND(100.0 * SUM(CASE WHEN scanned = 1 THEN 1 ELSE 0 END) / COUNT(*), 2) as attendance_percentage
FROM users
GROUP BY formid;
```

### Get scan history for a specific user
```sql
SELECT * FROM access_logs 
WHERE user_id = 'user-uuid-here'
ORDER BY scan_timestamp DESC;
```

### Find users not yet scanned
```sql
SELECT * FROM users 
WHERE scanned = 0 
ORDER BY createdat DESC;
```

---

## Troubleshooting

**Issue: Foreign key constraint failure**
- Solution: Ensure `formid` references existing form in `forms` table
- For SQLite: Enable foreign keys: `PRAGMA foreign_keys = ON;`

**Issue: UUID conflicts**
- PostgreSQL: UUIDs auto-generated with `gen_random_uuid()`
- SQLite: Generate in app or use: `SELECT lower(hex(randomblob(16)))`

**Issue: Timestamp format mismatch**
- PostgreSQL: Uses TIMESTAMP with timezone
- SQLite: Uses TEXT in ISO 8601 format (YYYY-MM-DD HH:MM:SS)
- Application should handle timezone conversion

**Issue: Boolean values showing as 0/1 in SQLite**
- This is expected in SQLite (no native boolean type)
- Application code converts 0→false, 1→true

---

## Files Location
- PostgreSQL: [DATABASE_SCHEMA.sql](./DATABASE_SCHEMA.sql)
- SQLite: [DATABASE_SCHEMA_SQLITE.sql](./DATABASE_SCHEMA_SQLITE.sql)

Just copy the appropriate file's content and paste into your SQL editor! 🚀
