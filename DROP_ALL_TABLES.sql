-- Drop all tables to start fresh
-- Run this in Neon SQL Editor

-- Drop tables in correct order (respecting foreign keys)
DROP TABLE IF EXISTS attendance_audit_logs CASCADE;
DROP TABLE IF EXISTS attendance_records CASCADE;
DROP TABLE IF EXISTS attendance_sessions CASCADE;
DROP TABLE IF EXISTS form_fields CASCADE;
DROP TABLE IF EXISTS form_definitions CASCADE;
DROP TABLE IF EXISTS user_data_links CASCADE;
DROP TABLE IF EXISTS qr_codes CASCADE;
DROP TABLE IF EXISTS access_logs CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS forms CASCADE;
DROP TABLE IF EXISTS dynamic_users CASCADE;
DROP TABLE IF EXISTS tables CASCADE;
DROP TABLE IF EXISTS admins CASCADE;

-- Keep core_users table (has the admin account)
-- DROP TABLE IF EXISTS core_users CASCADE;

-- Verify all tables are dropped
SELECT tablename FROM pg_tables WHERE schemaname = 'public';
