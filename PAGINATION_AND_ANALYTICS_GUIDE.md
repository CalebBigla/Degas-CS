# Pagination and Analytics Guide

## 1. Pagination Status

### Tables Module (`/admin/tables`)
- **NO PAGINATION**: Shows all forms/tables in a grid layout
- All tables are loaded at once and filtered client-side by search
- Suitable for small to medium number of forms (< 100)

### Table Detail Pages
- **FormTableDetailPage** (`/admin/forms-tables/:id`): 
  - Uses "Load More" infinite scroll pagination
  - Initially shows 15 users
  - Loads 10 more users per click
  - Good for large user lists
  
- **TableDetailPage** (`/admin/tables/:id`):
  - Has pagination controls (Previous/Next buttons)
  - Shows page numbers when multiple pages exist

### Dashboard Module (`/admin/dashboard`)
- **NO PAGINATION**: Shows summary stats and top 5 recent registrations
- Uses `.slice(0, 5)` to limit recent registrations display
- Not a full list view, just a dashboard overview

### Analytics/Access Logs
- **HAS PAGINATION**: Full pagination with page controls
- Shows 20 records per page by default
- Has Previous/Next buttons and page numbers

### Attendance Report Page
- **NO PAGINATION**: Shows all users from selected form
- Filtered client-side by search, status, and date
- Suitable for event-based attendance (typically < 500 users per form)

---

## 2. How to Reset Analytics

Analytics data is stored in three tables:
1. **access_logs** - Legacy table (old system)
2. **access_log** - Layer 1: Live presence tracking (resets after 48 hours)
3. **analytics_log** - Layer 2: Permanent historical record (never auto-resets)

### Method 1: Using the Reset Script (Recommended)

Run this command from the backend directory:

```bash
cd backend
node reset-analytics.js
```

The script will:
- Show current record counts in all analytics tables
- Ask for confirmation before deleting
- Delete all records from all three analytics tables
- Verify deletion was successful
- **Note**: Does NOT reset user attendance status (users.scanned field)

### Method 2: Manual Database Commands

#### For SQLite (Local Development):
```bash
cd backend
sqlite3 database.sqlite

DELETE FROM access_logs;
DELETE FROM access_log;
DELETE FROM analytics_log;

.quit
```

#### For PostgreSQL (Production - Neon):
```bash
# Connect to your Neon database using psql or the Neon console
# Then run:

DELETE FROM access_logs;
DELETE FROM access_log;
DELETE FROM analytics_log;
```

### Method 3: Reset User Attendance (Separate)

To reset user attendance status (mark all as absent):
1. Go to **Attendance Report** page in the admin dashboard
2. Click the red **"Reset All"** button
3. Confirm the action

This resets:
- `users.scanned` → false (absent)
- `users.scannedat` → NULL
- `access_log.status` → 'absent'

---

## 3. What Gets Reset vs What Stays

### Analytics Reset (using reset-analytics.js):
- ✅ Clears all scan history from `analytics_log`
- ✅ Clears live presence data from `access_log`
- ✅ Clears legacy logs from `access_logs`
- ❌ Does NOT reset user attendance status (`users.scanned`)
- ❌ Does NOT delete users or forms

### Attendance Reset (using "Reset All" button):
- ✅ Marks all users as absent (`users.scanned = false`)
- ✅ Clears scan timestamps (`users.scannedat = NULL`)
- ✅ Updates live presence tracking (`access_log.status = 'absent'`)
- ❌ Does NOT delete historical analytics (`analytics_log`)
- ❌ Does NOT delete users or forms

### Full Reset (Both):
To completely reset attendance tracking:
1. Run `node backend/reset-analytics.js` (clears history)
2. Click "Reset All" in Attendance Report (marks users absent)

---

## 4. When to Add Pagination

Consider adding pagination when:

### Tables Module
- You have more than 50 forms/tables
- Page load becomes slow
- Scrolling becomes cumbersome

### Attendance Report
- You have more than 500 users per form
- Filtering/searching becomes slow
- Export functionality is sufficient for now

### Implementation Priority
1. **Low Priority**: Tables Module (typically < 20 forms)
2. **Medium Priority**: Attendance Report (can grow to 500+ users)
3. **Already Done**: Access Logs, Table Detail Pages

---

## 5. Database Cleanup Schedule

### Automatic Cleanup (Built-in):
- `access_log` records expire after 48 hours (has `expires_at` field)
- System automatically removes expired presence records

### Manual Cleanup (Recommended):
- Reset analytics monthly or after major events
- Reset user attendance before each new service/event
- Keep `analytics_log` for historical reporting (or archive quarterly)

### Archive Strategy (Optional):
Before resetting analytics, you can export data:
```bash
# Export analytics_log to CSV before deletion
# Use the Access Logs export feature in the admin dashboard
```

---

## Summary

- **Pagination**: Only on Access Logs and some Table Detail pages
- **Analytics Reset**: Use `node backend/reset-analytics.js`
- **Attendance Reset**: Use "Reset All" button in Attendance Report
- **Full Reset**: Run both methods above
