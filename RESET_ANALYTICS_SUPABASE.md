# Reset Analytics - Supabase Guide

## Quick Reset (Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Click on **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste this SQL:

```sql
-- Show current counts
SELECT 'access_logs' as table_name, COUNT(*) as count FROM access_logs
UNION ALL
SELECT 'access_log' as table_name, COUNT(*) as count FROM access_log
UNION ALL
SELECT 'analytics_log' as table_name, COUNT(*) as count FROM analytics_log;

-- Delete all analytics data
DELETE FROM access_logs;
DELETE FROM access_log;
DELETE FROM analytics_log;

-- Verify deletion
SELECT 'access_logs' as table_name, COUNT(*) as count FROM access_logs
UNION ALL
SELECT 'access_log' as table_name, COUNT(*) as count FROM access_log
UNION ALL
SELECT 'analytics_log' as table_name, COUNT(*) as count FROM analytics_log;
```

6. Click **Run** (or press Ctrl+Enter)
7. Done! All analytics history is cleared.

---

## What Gets Deleted

This clears:
- ✅ `access_logs` - Legacy scan logs
- ✅ `access_log` - Live presence tracking (Layer 1)
- ✅ `analytics_log` - Permanent historical record (Layer 2)

This does NOT affect:
- ❌ User data (`users` table)
- ❌ User attendance status (`users.scanned` field)
- ❌ Forms/tables
- ❌ QR codes
- ❌ Admin accounts

---

## Reset User Attendance (Separate Action)

To mark all users as absent:
1. Log in to your admin dashboard
2. Go to **Attendance Report** page
3. Click the red **"Reset All"** button
4. Confirm the action

This will:
- Set `users.scanned = false` (mark all as absent)
- Clear `users.scannedat = NULL`
- Update `access_log.status = 'absent'`

---

## Alternative: Using Supabase Table Editor

If you prefer a visual approach:

1. Go to **Table Editor** in Supabase Dashboard
2. Select `access_logs` table
3. Click the **⋮** menu → **Truncate table**
4. Repeat for `access_log` table
5. Repeat for `analytics_log` table

⚠️ Note: Truncate is faster but doesn't show counts before deletion.

---

## Full Reset (Analytics + Attendance)

For a complete reset before a new event:

**Step 1: Clear Analytics History (Supabase SQL Editor)**
```sql
DELETE FROM access_logs;
DELETE FROM access_log;
DELETE FROM analytics_log;
```

**Step 2: Reset User Attendance (Admin Dashboard)**
- Go to Attendance Report → Click "Reset All"

---

## Backup Before Reset (Optional)

To backup analytics data before deletion:

```sql
-- Export to CSV using Supabase Dashboard
-- 1. Go to Table Editor
-- 2. Select analytics_log table
-- 3. Click Export → CSV
-- 4. Repeat for access_log and access_logs
```

Or use the Access Logs export feature in your admin dashboard.

---

## Troubleshooting

### "Permission denied" error
- Make sure you're logged in as the project owner
- Check that RLS (Row Level Security) policies allow deletion

### Tables don't exist
- Run the database schema setup first
- Check `DATABASE_SCHEMA.sql` or `SUPABASE_SETUP.sql`

### Need to reset specific date range only
```sql
-- Delete only records from a specific date
DELETE FROM analytics_log 
WHERE scanned_at >= '2024-01-01' 
  AND scanned_at < '2024-02-01';
```

---

## Summary

**Fastest Method**: Supabase SQL Editor → Run the DELETE queries above

**Safest Method**: Export data first, then delete

**Most Common Use Case**: Reset before each new service/event
