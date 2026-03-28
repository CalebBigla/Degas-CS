# System Architecture - What's Working & What's Missing

## ✅ WHAT'S WORKING

### 1. **Onboarding Registration Process**
- ✅ User can sign up via registration form
- ✅ Form data inserted into dynamic table (ChurchMembers)
- ✅ Core user created with e credentials
- ✅ Auto-login after registration
- ✅ QR code generated for user
- ✅ User redirected to login afterward

### 2. **User Dashboard**
- ✅ User can login with email/password
- ✅ Dashboard shows user profile data
- ✅ Displays user's QR code
- ✅ Displays attendance statistics

### 3. **Forms System**
- ✅ Admin can create forms
- ✅ Forms automatically create dynamic SQL tables
- ✅ Forms have email + password fields (auth fields)
- ✅ Each form creates a registration link
- ✅ Form-specific fields stored in form_fields table

---

## ❌ WHAT'S NOT WORKING / MISSING

### 1. **Forms in Tables Tab** 
**Problem:** TablesPage shows empty - dynamically created form tables don't appear

**Root Cause:** 
- Old system uses `/tables` endpoint (legacy system)
- New form-driven tables exist in database but not exposed as "tables"
- No endpoint to list form target_tables as management interface

**Solution Needed:**
- Add endpoint: `GET /api/admin/forms-tables` to list all form-created tables
- Show form tables in TablesPage with form name as table name
- Allow viewing users in each form table
- Link back to original form definition

### 2. **Create Session Button Not Functional**
**Problem:** "Create Session" button doesn't open modal or do anything

**Root Cause:** No onClick handler on button
```typescript
<button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
  {/* ❌ NO onClick HANDLER */}
  <Plus size={20} />
  Create Session
</button>
```

**Solution Needed:**
- Create `CreateSessionModal` component
- Add onClick handler to open modal
- Modal should capture:
  - Session name (required)
  - Description (optional)
  - Start time (required)
  - End time (required)
  - Grace period in minutes (optional)
- POST to `/api/admin/sessions` when submitted

### 3. **Form ↔ Attendance ↔ Access Logs Integration**
**Problem:** No clear connection between forms, user identity, attendance, and access logging

**Current Flow (What Exists):**
```
1. User registers via form
   → Core user created
   → Data inserted into form's target_table
   → UUID generated for user
   → QR code created with UUID
   
2. Admin creates attendance session
   → Session gets QR code (encodes session ID)
   → During session, users scan session QR + their own QR

3. User scans during attendance
   → Session QR (sessionId) + User QR (userUUID)
   → Should record: attendance_records + access_logs
```

**Missing Pieces:**

**A) Attendance Session QR Code Format**
- Session QR should encode: sessionId + optional location data
- Current: No standard format defined

**B) QR Scanning Upload to Access Logs**
- Need endpoint: `POST /api/attendance/scan-session`
  - Input: sessionId, userQR (with userUUID)
  - Output: Create access_logs entry with:
    - session_id (from session QR)
    - core_user_id (from user QR)
    - access_granted (true/false based on time window)
    - scanner_location (if provided)

**C) Admin Dashboard Access Logs View**
- Show all scans for admin review
- Filter by session, date, user
- Show access granted/denied + reason

---

## IMPLEMENTATION PLAN

### Phase 1: Forms → Tables Integration (15 min)
**Goal:** Show form-created tables in admin panel

**Changes:**
1. Create `GET /api/admin/forms-tables` endpoint
   - Lists all form definitions as "virtual tables"
   - Returns: form name, target_table name, user count
   
2. Update `AttendanceSessionsPage` to support listing forms as tables
3. Allow admin to view users in form tables

### Phase 2: Attendance Session Creation (20 min)
**Goal:** Make "Create Session" button functional

**Changes:**
1. Create `CreateSessionModal.tsx` component
2. Add onClick handler to "Create Session" button
3. Modal submits to `POST /api/admin/sessions`
4. Auto-refresh sessions list after creation

### Phase 3: QR Code Scanning Integration (30 min)
**Goal:** Connect QR scanning to access logs

**Changes:**
1. Update `UserScannerPage` to handle both:
   - User personal QR (has userUUID)
   - Session QR (has sessionId)
   
2. When both scanned:
   - POST to `POST /api/attendance/scan-session`
   - Record in access_logs table
   - Show confirmation to user
   
3. Create `AccessLogsPage` for admin
   - View all access logs
   - Filter by session, date, user
   - See access granted/denied

### Phase 4: Admin Dashboard Enhancements (20 min)
**Goal:** Show attendance + access logs on admin dashboard

**Changes:**
1. Add tabs to admin dashboard:
   - Attendance Overview
   - Access Logs
   - Session Management

---

## DATABASE SCHEMA (Existing)

```
attendance_sessions:
  - id (PRIMARY KEY)
  - session_name
  - description
  - start_time
  - end_time
  - grace_period_minutes
  - is_active
  - created_by
  - created_at
  - updated_at

attendance_records:
  - id (PRIMARY KEY)
  - session_id (FOREIGN KEY)
  - core_user_id (FOREIGN KEY)
  - checked_in_at
  - created_at

access_logs:
  - id (PRIMARY KEY AUTOINCREMENT)
  - user_id (core_user_id)
  - table_id (N/A for form-driven)
  - qr_code_id
  - scanner_location
  - access_granted (BOOLEAN)
  - scanned_by (admin ID)
  - scan_timestamp
  - ip_address
  - user_agent
  - denial_reason

core_users:
  - id
  - email
  - password
  - full_name
  - phone
  - role (user, admin, super_admin)
  - status (active, inactive, suspended)
  - created_at
  - updated_at

form_definitions:
  - id
  - form_name
  - target_table
  - description
  - is_active
  - created_at
  - updated_at

[Dynamic Table] (e.g., ChurchMembers):
  - id (AUTOINCREMENT)
  - uuid (UNIQUE - user's identity)
  - created_at
  - updated_at
  - [form fields...]
  - photoUrl

user_data_links:
  - id
  - core_user_id (FOREIGN KEY to core_users)
  - table_name (form's target_table)
  - record_id (row id in the table)
  - created_at
```

---

## WORKFLOW DIAGRAM

```
REGISTRATION FLOW:
┌─────────────────────────────────────────────────────────┐
│ User Registers via Form (localhost:5173/register)       │
│ Input: fullName, email, password, phone, department     │
└──────────────┬──────────────────────────────────────────┘
               │
               ├─ POST /api/onboarding/register
               │    ├─ Validates form data
               │    ├─ Creates core_user (email + password hash)
               │    ├─ Inserts into ChurchMembers table
               │    ├─ Generates UUID for user
               │    ├─ Creates user_data_link
               │    ├─ Generates QR code (encodes UUID)
               │    └─ Auto-logs in & returns JWT token
               │
               └─ User Redirected to:
                   ├─ QR Code Download
                   └─ Login Page


ATTENDANCE FLOW (MISSING - NEEDS IMPLEMENTATION):
┌──────────────────────────────────────┐
│ Admin Creates Session                │
│ POST /api/admin/sessions             │
│  Input: name, time, description      │
└──────────────┬───────────────────────┘
               │
               ├─ Session stored in attendance_sessions
               ├─ Session QR generated (encodes sessionId)
               │
               └─ Admin shares QR with scanner location


┌──────────────────────────────────────┐
│ User Scanner Scans QR Code           │
│ Two QRs during session:              │
│  1) Session QR (from display)        │
│  2) User Personal QR (from app)      │
└──────────────┬───────────────────────┘
               │
               ├─ POST /api/attendance/scan-session [NEEDS CREATION]
               │    ├─ Validates sessionId + userUUID
               │    ├─ Creates attendance_records entry
               │    ├─ Creates access_logs entry
               │    ├─ Determines access_granted:
               │    │   (check current time vs session window)
               │    │
               │    └─ Returns confirmation
               │
               └─ User sees confirmation screen


ADMIN ACCESS LOG VIEW (MISSING - NEEDS CREATION):
┌────────────────────────────────────────┐
│ /admin/access-logs                     │
│ Shows all scans with:                  │
│  - User ID + Name                      │
│  - Session Name                        │
│  - Time Scanned                        │
│  - Access Granted (✓/✗)                │
│  - Denial Reason (if denied)           │
└────────────────────────────────────────┘
```

---

## NEXT STEPS

1. **Immediately** (5 min): Fix "Create Session" button with onClick
2. **Next** (15 min): Create forms-tables endpoint
3. **Then** (20 min): Create CreateSessionModal component
4. **Finally** (30 min): Implement QR scanning to access logs flow
