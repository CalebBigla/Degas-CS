-- ============================================================================
-- RESET ANALYTICS SCRIPT
-- ============================================================================
-- This script clears all analytics data from the database
-- WARNING: This action is irreversible!
-- 
-- Usage:
-- 1. For Neon (PostgreSQL): Run this in the Neon SQL Editor
-- 2. For SQLite: Run using sqlite3 database.sqlite < reset-analytics.sql
-- ============================================================================

-- Show current counts before deletion
SELECT 'BEFORE DELETION - Record Counts:' as info;
SELECT 'access_logs' as table_name, COUNT(*) as count FROM access_logs;
SELECT 'access_log' as table_name, COUNT(*) as count FROM access_log;
SELECT 'analytics_log' as table_name, COUNT(*) as count FROM analytics_log;

-- Delete all analytics data
DELETE FROM access_logs;
DELETE FROM access_log;
DELETE FROM analytics_log;

-- Show counts after deletion
SELECT 'AFTER DELETION - Record Counts:' as info;
SELECT 'access_logs' as table_name, COUNT(*) as count FROM access_logs;
SELECT 'access_log' as table_name, COUNT(*) as count FROM access_log;
SELECT 'analytics_log' as table_name, COUNT(*) as count FROM analytics_log;

-- ============================================================================
-- NOTES:
-- - This does NOT reset user attendance status (users.scanned field)
-- - To reset user attendance, use the "Reset All" button in the Attendance Report page
-- - This only clears historical analytics data
-- ============================================================================
