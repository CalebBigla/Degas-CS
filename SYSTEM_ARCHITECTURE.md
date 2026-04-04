# System Architecture Diagram

## Complete Workflow - End to End

```
╔════════════════════════════════════════════════════════════════════════════╗
║                      FORM → ATTENDANCE → ACCESS LOG FLOW                   ║
╚════════════════════════════════════════════════════════════════════════════╝

STEP 1: ADMIN CREATES FORM
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Admin Dashboard
       ↓
  Create Form
    - Form Name: "Church Member Registration"
    - Fields: fullName, email, password, phone, department
    - Target Table: ChurchMembers (auto-generated)
       ↓
Database (NEW!)
  CREATE TABLE ChurchMembers (
    id INTEGER PRIMARY KEY,
    uuid TEXT UNIQUE NOT NULL,
    fullName TEXT,
    email TEXT,
    phone TEXT,
    department TEXT,
    photoUrl TEXT,
    created_at DATETIME,
    ...
  )
       ↓
FORMS TAB (Admin → Tables)  [✅ WORKING - NEW FEATURE]
  Shows: ChurchMembers (1 registration)


STEP 2: USER REGISTERS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

User (localhost:5173/register)
       ↓
Fill Form:
  - Full Name: "John Smith"
  - Email: john@example.com
  - Password: **********
  - Phone: 555-1234
  - Department: Worship
       ↓
POST /api/onboarding/register
       ├─ Create core_user
       │   ├─ Email: john@example.com
       │   ├─ Password: hashed
       │   └─ Role: user
       │
       ├─ Insert into ChurchMembers
       │   ├─ uuid: a531f462-f20c-4180-996c-bd83bf361534
       │   ├─ fullName: John Smith
       │   ├─ email: john@example.com
       │   ├─ phone: 555-1234
       │   └─ department: Worship
       │
       ├─ Create user_data_link
       │   ├─ core_user_id: xxxxxx
       │   ├─ table_name: ChurchMembers
       │   └─ record_id: 1
       │
       ├─ Generate Personal QR
       │   └─ Encodes: uuid (a531f462...)
       │
       └─ Auto-login
           └─ JWT Token issued
       ↓
User redirected → Download QR → Login
       ↓
User Dashboard
  - Profile data displayed
  - Personal QR Code shown
  - Can scan to check in


STEP 3: ADMIN CREATES ATTENDANCE SESSION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Admin Dashboard → Attendance Tab
       ↓
Click "Create Session" [✅ WORKING - NEW FEATURE]
       ↓
CreateSessionModal opens
  - Session Name: "Sunday Worship"
  - Start Time: 2026-03-27 9:00 AM
  - End Time: 2026-03-27 10:30 AM
  - Grace Period: 10 minutes
       ↓
POST /api/admin/sessions
       ├─ Session stored:
       │   ├─ id: 1774637426551-e9akefc92
       │   ├─ session_name: "Sunday Worship"
       │   ├─ start_time: 2026-03-27T09:00:00Z
       │   ├─ end_time: 2026-03-27T10:30:00Z
       │   └─ grace_period_minutes: 10
       │
       ├─ Session QR generated
       │   └─ Encodes: sessionId
       │
       └─ Returns: Session ID + QR Image
       ↓
Admin clicks "Show QR"
       ↓
QR Code displayed for projection/printing
  (Attendees scan this during event)


STEP 4: USER CHECKS IN AT EVENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Event Location (9:05 AM - During Session)
       ↓
User opens mobile app → Scanner
       ↓
Scans Session QR (from display)
  Encoded data: { sessionId: "1774637426551-e9akefc92" }
       ↓
POST /api/attendance/scan-session
       ├─ Verify session exists and is active ✓
       ├─ Check current time:
       │   - Session started? 9:00 AM ✓
       │   - Not ended? 10:30 AM + 10min = 10:40 AM ✓
       │   - Current time 9:05 AM? ✓ VALID (on-time)
       │
       ├─ Check not already checked in? ✓
       │
       ├─ Create attendance_records entry:
       │   ├─ session_id: 1774637426551-e9akefc92
       │   ├─ core_user_id: xxxxxx (from JWT)
       │   ├─ checked_in_at: 2026-03-27T09:05:00Z
       │   └─ on_time: true (calculated from time window)
       │
       ├─ Create access_logs entry:
       │   ├─ core_user_id: xxxxxx
       │   ├─ session_id: 1774637426551-e9akefc92
       │   ├─ access_granted: true
       │   ├─ scan_timestamp: 2026-03-27T09:05:00Z
       │   └─ denial_reason: null
       │
       └─ Return: "✅ Check-in successful"
       ↓
User sees confirmation
  "Welcome John Smith! Checked in at 9:05 AM"


STEP 5: ADMIN REVIEWS ATTENDANCE & ACCESS LOGS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Admin Dashboard → Attendance Tab
       ↓
View "Sunday Worship" session
       ├─ View Attendance:
       │   - 1 of 1 registered user checked in
       │   - John Smith checked in at 9:05 AM (on-time)
       │   - Attendance Rate: 100%
       │
       └─ View Access Logs:
           - John Smith scanned at 9:05 AM
           - Access granted: YES
           - Denial reason: None
           - Time: On-time (within start-end window)

Admin can generate report:
  "Sunday Worship Service Attendance Report
   Date: March 27, 2026
   Time: 9:00 AM - 10:30 AM
   Grace Period: 10 minutes
   
   Attendees (1):
   - John Smith (9:05 AM) - ON-TIME ✓
   
   Absentees: None
   Attendance Rate: 100%"


DATA FLOW VISUALIZATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

                           ADMIN SIDE
                          ╔═════════╗
                          ║ Admins  ║
                          ╚════╤════╝
                               │
                 ┌─────────────┼─────────────┐
                 │             │             │
         Create Form    Create Session  View Results
                 │             │             │
                 ▼             ▼             ▼
    ╔════════════════╗ ╔═════════════════╗ ╔════════════╗
    ║Generate Table ║ ║ Generate QR    ║ ║  Get Data ║
    ║               ║──→║ for Display    ║ │            ║
    ║ChurchMembers  ║   ╚═════════════════╝ ╚════════════╝
    ╚════════╤═══════╝         ▲
             │                 │
             │        ┌────────┴────────┐
             │        │                 │
             ▼        ▼                 ▼
         ╔═══════════════╗  ╔═════════════════════╗
         ║  USER SIDE    ║  ║  EVENT LOCATION    ║
         ║               ║  ║                    ║
         ║ 1. Register   ║──→│ 1. Display QR     │
         ║ 2. Get QR     ║   │ 2. User Scans     │
         ║ 3. Login      ║   │ 3. Check-in       │
         ║ 4. Dashboard  ║   └──────┬────────────┘
         ╚═══════════════╝          │
                                    │
                                    ▼
                    ╔═════════════════════════╗
                    ║   DATABASE UPDATES     ║
                    ║                        ║
                    ║ attendance_records    ║
                    ║ access_logs           ║
                    ║ user_data_links       ║
                    ╚═════════════════════════╝


DATABASE RELATIONSHIPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

form_definitions
  ├─ id: 12345
  ├─ form_name: "Church Member Registration"
  ├─ target_table: "ChurchMembers"
  └─ fields: [...5 fields...]
        │
        ├──→ ChurchMembers (Dynamic Table)
        │      ├─ id: 1
        │      ├─ uuid: a531f462... ◄──┐
        │      ├─ fullName: John       │
        │      └─ [form fields...]     │
        │                              │
        └──→ user_data_links           │
               ├─ core_user_id: xxx ◄──┤
               ├─ table_name: ChurchMembers
               └─ record_id: 1
                    │
                    │
        core_users  │───────────────────┐
          ├─ id: xxx ◄────────────────────■
          ├─ email: john@example.com
          ├─ role: user
          └─ password: hash
                    │
                    └──→ attendance_records
                           ├─ session_id: 123
                           ├─ core_user_id: xxx
                           ├─ checked_in_at: timestamp
                           └─ created_at: timestamp
                                 │
                                 └──→ access_logs
                                        ├─ user_id: xxx
                                        ├─ session_id: 123
                                        ├─ access_granted: true
                                        ├─ scan_timestamp: timestamp
                                        └─ denial_reason: null

attendance_sessions
  ├─ id: 1774637426551
  ├─ session_name: "Sunday Worship"
  ├─ start_time: timestamp
  ├─ end_time: timestamp
  └─ grace_period_minutes: 10


KEY FEATURES HIGHLIGHTED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ FEATURE 1: Forms Create Tables
   - Admin creates form → Table auto-created in database
   - Table appears in Tables tab with record count
   - Admin can manage registrations from same interface

✅ FEATURE 2: Create Session Now Works
   - Button opens professional modal
   - Modal validates all inputs
   - Session stored with automatic ID generation
   - QR code generated immediately

✅ FEATURE 3: Complete Attendance System
   - Forms → Users in database with UUID
   - Users → Personal QR codes
   - Sessions → Event QR codes
   - Scanning → Attendance recorded
   - Attendance → Access logs created
   - Access logs → Admin audit trail


SYSTEM IS PRODUCTION READY! 🚀
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ All features implemented and tested
✓ All endpoints functional
✓ Database schema complete
✓ Frontend UI complete
✓ Error handling in place
✓ Security checks implemented (auth, validation)
✓ Comprehensive audit trail via access logs
```

---

## Component Architecture

```
FRONTEND COMPONENTS
─────────────────────────────────────────

AttendanceSessionsPage
  ├─ Session List Display
  ├─ Show QR Button
  └─ CreateSessionModal (NEW!)
      ├─ Form Inputs
      ├─ Validation
      └─ Submit Handler

TablesPage
  ├─ Tables List (now showing forms)
  ├─ Form Badges (NEW!)
  ├─ Record Count (NEW!)
  └─ View Records Button

UserDashboardPage
  ├─ Profile Section
  ├─ QR Code Display
  └─ Attendance Stats

UserScannerPage
  ├─ QR Scanner
  ├─ Scan Result Display
  └─ Success/Error Handling


BACKEND SERVICES
─────────────────────────────────────────

formsTablesController (NEW!)
  ├─ getFormTables()
  └─ getFormTableUsers()

formService
  ├─ createForm()
  ├─ getAllForms()
  ├─ updateForm()
  └─ deleteForm()

attendanceService
  ├─ createSession()
  ├─ checkInUser()
  ├─ getSessionAttendance()
  └─ getUserAttendanceHistory()

dynamicTableService
  ├─ createDynamicTable()
  ├─ tableExists()
  └─ generateCreateTableSQL()

coreUserService
  ├─ createUser()
  ├─ getUserByEmail()
  └─ verifyPassword()


API ROUTES STRUCTURE
─────────────────────────────────────────

/api/admin/
  ├─ forms/               (Create, read, update, delete forms)
  ├─ forms-tables/        (NEW! - View forms as tables)
  ├─ forms-tables/:id/users/  (NEW! - View form records)
  └─ sessions/            (Create, read, update sessions)

/api/attendance/
  ├─ scan-session         (User QR check-in)
  └─ history              (User attendance history)

/api/core-auth/
  ├─ register             (User registration)
  └─ login                (User login)

/api/user/
  └─ dashboard            (User dashboard data)
```

---

## Deployment Checklist

```
PRE-DEPLOYMENT
─────────────────────────────────────────
✅ Backend builds without errors
✅ Frontend compiles without errors
✅ Database schema initialized
✅ All endpoints tested
✅ Admin user created
✅ Sample form created
✅ Registration workflow tested
✅ Session creation tested
✅ Attendance tracking tested

PRODUCTION READY
─────────────────────────────────────────
✅ Forms → Tables integration
✅ Create Session functionality
✅ Attendance → Access Logs integration
✅ Admin dashboard features
✅ User dashboard features
✅ Mobile scanning capability
✅ QR code generation
✅ Complete audit trail

NEXT DEPLOYMENT STEPS
─────────────────────────────────────────
1. Deploy backend to production server
2. Deploy frontend to production server
3. Point domain to production
4. Run smoke tests
5. Enable monitoring/logs
6. Communicate launch to users
```
