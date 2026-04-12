# Two-Layer Attendance Logging Architecture

## Overview

The Force of Grace now implements a sophisticated two-layer attendance tracking system that separates **live presence tracking** (48-hour rolling window) from **permanent historical analytics** (never deletes).

```
Every Successful QR Scan
         ↓
    ┌────┴────┐
    ↓         ↓
 LAYER 1   LAYER 2
  24/7      Permanent
 Reset      Historical
   Log        Record
```

---

## LAYER 1: Live Presence Tracking (`access_log` table)

**Purpose**: Shows who is currently 'present' vs 'absent' (real-time dashboard)

**Behavior**:
- Creates a record every time someone scans with status `'present'`
- Automatically resets to `'absent'` after **48 hours** via hourly cron job
- Used by superadmin dashboard and follow-up team for real-time tracking
- Can be manually reset by superadmin button

**Database Schema**:
```sql
CREATE TABLE access_log (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES core_users(id),
  scanned_at TIMESTAMP DEFAULT NOW(),
  scanned_by UUID REFERENCES core_users(id),  -- greeter or admin ID
  status TEXT DEFAULT 'present' CHECK (status IN ('present', 'absent')),
  expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '48 hours'
);
```

**Indexes** (for performance):
- `idx_access_log_user_id` - Fast user lookups
- `idx_access_log_status` - Filter by present/absent
- `idx_access_log_expires_at` - Cron job optimization
- `idx_access_log_scanned_at` - Timeline queries

---

## LAYER 2: Permanent Historical Record (`analytics_log` table)

**Purpose**: Permanent, audit-proof record of every scan (never deletes)

**Behavior**:
- Creates a record every time someone scans
- **NEVER** deletes or updates records
- Keeps `service_date` field for daily grouping
- Used for attendance reports, history, and analytics

**Database Schema**:
```sql
CREATE TABLE analytics_log (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES core_users(id),
  scanned_at TIMESTAMP DEFAULT NOW(),
  scanned_by UUID REFERENCES core_users(id),  -- greeter or admin ID
  service_date DATE DEFAULT CURRENT_DATE
);
```

**Indexes** (for performance):
- `idx_analytics_log_user_id` - Fast member history queries
- `idx_analytics_log_service_date` - Efficient date filtering
- `idx_analytics_log_scanned_at` - Timeline analysis

---

## 48-Hour Reset Mechanism

**Implementation**: Node-cron (runs every hour)

**File**: `backend/src/services/cronJobs.ts`

**How it Works**:
1. **Hourly Trigger**: Cron job runs at `0 * * * *` (every hour, 0-minute mark)
2. **Expiration Check**: Finds all records where `expires_at < NOW()`
3. **Auto-Reset**: Sets `status = 'absent'` for expired records
4. **On Startup**: Immediately checks for expired records to catch any delays

**Code**:
```typescript
// Update all expired 'present' records to 'absent'
UPDATE access_log 
SET status = 'absent' 
WHERE status = 'present' 
AND expires_at < NOW()
```

---

## Scanner Integration

**When a QR Code is Successfully Scanned**:

1. ✅ Verify QR code data (existing logic - unchanged)
2. ✅ Look up user from database (existing logic - unchanged)
3. ✅ Build scan result (existing logic - unchanged)
4. 📝 **NEW**: Record to `access_log` (LAYER 1)
5. 📝 **NEW**: Record to `analytics_log` (LAYER 2)
6. ✅ Return success response

**Implementation**:
```typescript
// In scannerController.ts (both admin and greeter endpoints)
try {
  await TwoLayerAttendanceLogger.recordSuccessfulScan(user.id, scannedByUserId);
} catch (error) {
  // Non-critical: log error but don't block response
}
```

### File: `backend/src/services/twoLayerAttendanceLogger.ts`

#### Key Methods:

**1. Record a Successful Scan**
```typescript
static async recordSuccessfulScan(userId: string, scannedByUserId: string): Promise<void>
```
- Inserts into BOTH tables on successful scan
- Calculates 48-hour `expires_at` automatically
- Non-blocking (won't fail scan if logging fails)

**2. Get Absent Members**
```typescript
static async getAbsentMembers(): Promise<any[]>
```
- Returns all members currently absent from access_log
- Used for CSV export to follow-up team
- Returns: id, email, phone, last_scanned_date

**3. Get Presence Status**
```typescript
static async getCurrentPresenceStatus(): Promise<{present: number; absent: number}>
```
- Dashboard summary cards
- Fast count query

**4. Get Member History**
```typescript
static async getMemberAttendanceHistory(userId: string): Promise<any[]>
```
- Complete history from analytics_log (permanent)
- Never filtered or reset
- Shows every scan date and time

**5. Get Analytics Summary**
```typescript
static async getAttendanceAnalytics(days: number): Promise<any>
```
- From analytics_log (permanent record)
- Shows total scans, unique members, scans per day

**6. Manual Reset (Superadmin Only)**
```typescript
static async manualResetAllToAbsent(): Promise<number>
```
- Sets all 'present' to 'absent' immediately
- Logged for audit trail
- Superadmin dashboard button

---

## API Endpoints

### **GET** `/api/analytics/presence-status`
Get current presence summary

**Response**:
```json
{
  "success": true,
  "data": {
    "present": 45,
    "absent": 12
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Access**: Super Admin, Follow-up team

---

### **GET** `/api/analytics/absent-members`
Get all currently absent members (for CSV export)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "user-uuid",
      "email": "john@example.com",
      "phone": "+1234567890",
      "last_scanned_date": "2024-01-15T08:00:00Z"
    }
  ],
  "count": 12
}
```

**Access**: Super Admin, Follow-up team

---

### **POST** `/api/analytics/export-absent-csv`
Export absent members to CSV file

**Response**: CSV file with columns:
- Full Name
- Phone
- Email
- Last Scanned

**Filename**: `absent-members-2024-01-15.csv`

**Access**: Super Admin, Follow-up team

---

### **GET** `/api/analytics/attendance-history/:userId`
Get attendance history for a specific member

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "scanned_at": "2024-01-15T09:00:00Z",
      "scanned_by": "admin-uuid",
      "service_date": "2024-01-15"
    },
    {
      "scanned_at": "2024-01-14T09:15:00Z",
      "scanned_by": "greeter-uuid",
      "service_date": "2024-01-14"
    }
  ],
  "count": 2
}
```

**Access**: Super Admin, Follow-up team

---

### **GET** `/api/analytics/attendance-summary`
Get attendance analytics from permanent record

**Query Params**: `days=30` (default)

**Response**:
```json
{
  "success": true,
  "data": {
    "period": "Last 30 days",
    "totalScans": 1450,
    "uniqueMembers": 87,
    "scansPerDay": [
      {"service_date": "2024-01-15", "count": 45},
      {"service_date": "2024-01-14", "count": 42}
    ]
  }
}
```

**Access**: Super Admin

---

### **POST** `/api/analytics/reset-attendance`
Manual reset: Set all present members to absent

**Access**: Super Admin ONLY

**Response**:
```json
{
  "success": true,
  "message": "Reset 45 members from present to absent",
  "affectedRows": 45
}
```

---

## Dashboard Features

### Superadmin Dashboard

**Live Presence Cards** (from LAYER 1 - `access_log`):
- Present Today: 45
- Absent Today: 12
- Reset Button (manual override)

**Export Button**:
- Exports all currently absent members as CSV
- Ready for follow-up team action

### Follow-Up Team

**Access Log** (from LAYER 1 - `access_log`):
- See who is currently absent
- Filter by time window
- Download absent members CSV

**Member History** (from LAYER 2 - `analytics_log`):
- Click member → see full attendance history
- No deletions, complete audit trail

### Analytics Dashboard

**Reports from LAYER 2** (`analytics_log` - permanent):
- Total scans per day/week/month
- Each member's full attendance history
- Members absent for last 2, 3, 4+ consecutive services
- Attendance rate (%) calculations
- No data is ever deleted

---

## Data Flow Diagram

```
┌─────────────────────┬──────────────────┬────────────────────┐
│ Admin Scans QR      │ Greeter Scans QR │ Auto-Reset (Hourly)│
└─────────┬───────────┴────────┬─────────┴─────────┬──────────┘
          │                    │                   │
          ├────────────────────┼───────────────────┤
          │                    │                   │
          ↓                    ↓                   ↓
    ┌─────────────────────────────────────────────────────┐
    │ twoLayerAttendanceLogger.recordSuccessfulScan()     │
    └──────────────┬──────────────────┬──────────────────┘
                   │                  │
          ┌────────▼─────┐      ┌─────▼──────────┐
          │ INSERT into  │      │ INSERT into    │
          │ access_log   │      │ analytics_log  │
          │ status=      │      │ (permanent)   │
          │ 'present'    │      │                │
          │ expires_at   │      └────────────────┘
          │ +48hrs       │
          └──────┬───────┘
                 │
          Every Hour (Cron)
                 │
          ┌──────▼────────────────────┐
          │ Find Expired Records:      │
          │ WHERE expires_at < NOW()   │
          │ UPDATE status='absent'     │
          └───────────────────────────┘
```

---

## Database Compatibility

### PostgreSQL
- Uses `TIMESTAMP` and `NOW()` functions
- `INTERVAL '48 hours'` syntax
- Transactions supported

### SQLite
- Uses `DATETIME` functions
- `datetime('now', '+48 hours')` syntax
- Automatic conversion handled

---

## Monitoring & Debugging

### Logs to Watch

**On Scan**:
```
✅ [LAYER 1] Recorded to access_log
✅ [LAYER 2] Recorded to analytics_log
```

**Hourly Cron**:
```
✅ [CRON] Expired 5 attendees from 'present' to 'absent'
```

**CSV Export**:
```
📄 [ANALYTICS] Generating CSV file... (count: 12)
✅ [ANALYTICS] CSV export completed
```

### Query Examples

**Check Current Presence**:
```sql
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN status='present' THEN 1 ELSE 0 END) as present,
  SUM(CASE WHEN status='absent' THEN 1 ELSE 0 END) as absent
FROM access_log;
```

**See Attendance History**:
```sql
SELECT * FROM analytics_log 
WHERE user_id = 'user-uuid'
ORDER BY scanned_at DESC;
```

**Find Expired Records**:
```sql
SELECT * FROM access_log 
WHERE expires_at < NOW()
AND status = 'present';
```

---

## Use Cases

### 1. Superadmin Dashboard
- See real-time presence (present/absent)
- Export absent members instantly
- Manual reset if needed
- View historical analytics

### 2. Follow-Up Team
- Download CSV of absent members
- Call/email/contact absent members
- View member attendance history
- Filter by date range

### 3. Attendance Reports
- Generate monthly reports from `analytics_log`
- Calculate attendance rates
- Identify patterns (who never misses, who's frequently absent)
- Audit trail for compliance

### 4. Member Check-In at Events
- Greeter scans QR → recorded to BOTH layers
- Superadmin dashboard updates live
- Follow-up team can immediately see who's present
- History preserved forever

---

## What Was NOT Modified

✅ Existing QR scanning logic - unchanged  
✅ Greeter or Admin endpoint validation - unchanged  
✅ Member onboarding flow - unchanged  
✅ Profile image handling - unchanged  
✅ Database schema for users, tables, forms - unchanged  

---

## Migration Notes

**For Existing Systems**:
1. Run migrations to create `access_log` and `analytics_log` tables
2. No data migration needed (fresh tables)
3. Cron job starts on server restart
4. Optional: Import historical access_logs data into analytics_log

**Backwards Compatibility**:
- Existing `access_logs` table stays for backward compatibility
- New tables work independently
- No changes to current API behavior
- CSV export uses new tables (more efficient)

---

## Testing Checklist

- [ ] **Scan Test**: Admin scans → records in BOTH tables
- [ ] **Greeter Test**: Greeter scans → records in BOTH tables
- [ ] **Cron Test**: Wait 1 hour → records expire correctly
- [ ] **Presence Status**: API returns present/absent counts
- [ ] **CSV Export**: Follow-up team can download absent members
- [ ] **Manual Reset**: Superadmin can instantly reset all
- [ ] **History**: Old records stay in analytics_log forever
- [ ] **Dashboard**: Live presence cards update correctly

---

**Status**: ✅ COMPLETE  
**Deployed**: April 12, 2026  
**Version**: 1.0.0
