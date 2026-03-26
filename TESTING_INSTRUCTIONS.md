# Testing Instructions - Attendance System

Complete guide to test all features of the attendance and user onboarding system.

## 🚀 Quick Start

### Prerequisites
1. Backend server running on `http://localhost:10000`
2. Database initialized with migrations
3. Admin user seeded (email: `admin@degas.com`, password: `admin123`)

### Start the Server
```bash
# From project root
cd backend
npm run dev
```

Wait for the message: `✅ Backend initialization complete - API routes registered`

---

## 🧪 Automated Testing

### Run All Test Suites

```bash
# Navigate to backend
cd backend

# Test Phase 3: Form System
node test-phase3.js

# Test Phase 4-5: User Onboarding
node test-phase4-5.js

# Test Phase 6-8: Attendance System
node test-phase6-8.js

# Test Phase 9-10: Dashboard & Admin
node test-phase9-10.js
```

### Expected Output
Each test suite will show:
- ✅ Green checkmarks for passing tests
- ❌ Red X marks for failing tests
- Summary at the end with pass/fail count

**All tests should pass!**

---

## 🔧 Manual Testing with Postman/Thunder Client

### 1. Setup Collection

Import these base URLs:
- Base URL: `http://localhost:10000/api`
- Admin Email: `admin@degas.com`
- Admin Password: `admin123`

### 2. Test Authentication

#### Admin Login
```http
POST http://localhost:10000/api/auth/login
Content-Type: application/json

{
  "email": "admin@degas.com",
  "password": "admin123"
}
```

**Expected Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "...",
    "email": "admin@degas.com"
  }
}
```

**Save the token** - you'll need it for admin endpoints!

---

### 3. Test Form System

#### Create a Form (Admin)
```http
POST http://localhost:10000/api/admin/forms
Authorization: Bearer YOUR_ADMIN_TOKEN
Content-Type: application/json

{
  "form_name": "Student Registration",
  "target_table": "Students",
  "description": "Registration form for students",
  "is_active": true,
  "fields": [
    {
      "field_name": "email",
      "field_label": "Email Address",
      "field_type": "email",
      "is_required": true,
      "is_email_field": true,
      "is_password_field": false,
      "field_order": 1,
      "placeholder": "student@example.com"
    },
    {
      "field_name": "password",
      "field_label": "Password",
      "field_type": "password",
      "is_required": true,
      "is_email_field": false,
      "is_password_field": true,
      "field_order": 2,
      "validation_rules": "{\"minLength\":8}",
      "placeholder": "Enter password"
    },
    {
      "field_name": "fullName",
      "field_label": "Full Name",
      "field_type": "text",
      "is_required": true,
      "is_email_field": false,
      "is_password_field": false,
      "field_order": 3,
      "placeholder": "John Doe"
    },
    {
      "field_name": "studentId",
      "field_label": "Student ID",
      "field_type": "text",
      "is_required": true,
      "is_email_field": false,
      "is_password_field": false,
      "field_order": 4,
      "placeholder": "STU-12345"
    }
  ]
}
```

#### Get Active Form (Public)
```http
GET http://localhost:10000/api/forms/onboarding
```

---

### 4. Test User Registration

#### Register New User
```http
POST http://localhost:10000/api/onboarding/register
Content-Type: application/json

{
  "email": "test.student@example.com",
  "password": "TestPass123!",
  "fullName": "Test Student",
  "studentId": "STU-TEST-001"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "coreUserId": "...",
    "email": "test.student@example.com",
    "userId": "uuid-...",
    "table": "Students",
    "qrCode": "data:image/png;base64,...",
    "qrToken": "..."
  }
}
```

**Save the email and password** - you'll use them to login!

---

### 5. Test User Login

#### Login as User
```http
POST http://localhost:10000/api/core-auth/login
Content-Type: application/json

{
  "email": "test.student@example.com",
  "password": "TestPass123!"
}
```

**Expected Response:**
```json
{
  "success": true,
  "token": "user-jwt-token...",
  "user": {
    "id": "...",
    "email": "test.student@example.com"
  }
}
```

**Save the user token** - you'll need it for user endpoints!

---

### 6. Test User Dashboard

#### Get User Dashboard
```http
GET http://localhost:10000/api/user/dashboard
Authorization: Bearer YOUR_USER_TOKEN
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "test.student@example.com",
      "full_name": "Test Student"
    },
    "profile": {
      "table": "Students",
      "data": {
        "fullName": "Test Student",
        "studentId": "STU-TEST-001"
      }
    },
    "qrCode": {
      "token": "...",
      "image": "data:image/png;base64,..."
    },
    "attendance": {
      "history": [],
      "stats": {
        "totalSessions": 0,
        "attended": 0,
        "missed": 0,
        "attendanceRate": 0
      }
    }
  }
}
```

---

### 7. Test Attendance Session

#### Create Session (Admin)
```http
POST http://localhost:10000/api/admin/sessions
Authorization: Bearer YOUR_ADMIN_TOKEN
Content-Type: application/json

{
  "session_name": "Morning Assembly",
  "description": "Daily morning assembly",
  "start_time": "2024-03-27T08:00:00Z",
  "end_time": "2024-03-27T09:00:00Z",
  "grace_period_minutes": 15,
  "is_active": true
}
```

**Note:** Adjust the dates to be current! Use dates that are:
- `start_time`: A few minutes ago
- `end_time`: An hour from now

**Save the session ID** from the response!

#### Generate Session QR (Admin)
```http
GET http://localhost:10000/api/admin/sessions/SESSION_ID/qr
Authorization: Bearer YOUR_ADMIN_TOKEN
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "sessionId": "...",
    "qrToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "qrImage": "data:image/png;base64,..."
  }
}
```

**Save the qrToken** - you'll use it to check in!

---

### 8. Test Attendance Check-In

#### Scan QR to Check In (User)
```http
POST http://localhost:10000/api/attendance/scan
Authorization: Bearer YOUR_USER_TOKEN
Content-Type: application/json

{
  "qrToken": "THE_QR_TOKEN_FROM_PREVIOUS_STEP"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Check-in successful",
  "data": {
    "record": {
      "id": "...",
      "session_id": "...",
      "core_user_id": "...",
      "checked_in_at": "2024-03-27T08:15:00Z"
    },
    "sessionName": "Morning Assembly"
  }
}
```

#### Try to Check In Again (Should Fail)
```http
POST http://localhost:10000/api/attendance/scan
Authorization: Bearer YOUR_USER_TOKEN
Content-Type: application/json

{
  "qrToken": "SAME_QR_TOKEN"
}
```

**Expected Response (409 Conflict):**
```json
{
  "success": false,
  "message": "Already checked in to this session"
}
```

---

### 9. Test Attendance Reports

#### Get Session Attendance (Admin)
```http
GET http://localhost:10000/api/admin/sessions/SESSION_ID/attendance
Authorization: Bearer YOUR_ADMIN_TOKEN
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "attendance": [
      {
        "id": "...",
        "core_user_id": "...",
        "email": "test.student@example.com",
        "full_name": "Test Student",
        "checked_in_at": "2024-03-27T08:15:00Z"
      }
    ],
    "stats": {
      "totalUsers": 1,
      "attended": 1,
      "absent": 0,
      "attendanceRate": 100
    }
  }
}
```

#### Get Session Absentees (Admin)
```http
GET http://localhost:10000/api/admin/sessions/SESSION_ID/absentees
Authorization: Bearer YOUR_ADMIN_TOKEN
```

---

### 10. Test Admin Features

#### Get All Core Users (Admin)
```http
GET http://localhost:10000/api/admin/core-users
Authorization: Bearer YOUR_ADMIN_TOKEN
```

#### Search Users (Admin)
```http
GET http://localhost:10000/api/admin/core-users?search=test
Authorization: Bearer YOUR_ADMIN_TOKEN
```

#### Get Attendance Overview (Admin)
```http
GET http://localhost:10000/api/admin/attendance/overview
Authorization: Bearer YOUR_ADMIN_TOKEN
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "totalUsers": 1,
    "totalSessions": 1,
    "activeSessions": 1,
    "totalCheckIns": 1,
    "averageAttendanceRate": 100,
    "recentSessions": [...]
  }
}
```

---

## 🌐 Testing with Browser

### 1. Test Health Check
Open in browser:
```
http://localhost:10000/api/health
```

Should show:
```json
{
  "success": true,
  "message": "Degas CS API is running",
  "ready": true,
  "database": {
    "status": "connected",
    "type": "sqlite"
  }
}
```

### 2. View QR Code
After getting a QR code from any endpoint:
1. Copy the base64 image data (starts with `data:image/png;base64,`)
2. Create an HTML file:
```html
<!DOCTYPE html>
<html>
<body>
  <h1>QR Code</h1>
  <img src="PASTE_BASE64_HERE" alt="QR Code">
</body>
</html>
```
3. Open in browser to see the QR code

---

## 🐛 Troubleshooting

### Server Not Starting
```bash
# Check if port 10000 is in use
netstat -ano | findstr :10000

# Kill the process if needed
taskkill /PID <PID> /F

# Restart server
cd backend
npm run dev
```

### Database Errors
```bash
# Run migrations
cd backend
npm run db:migrate

# Or manually
node -e "require('./dist/scripts/migrate.js')"
```

### Authentication Errors
- Make sure you're using the correct token
- Check token hasn't expired
- Verify you're using the right auth header format: `Authorization: Bearer TOKEN`

### Test Failures
- Ensure server is running
- Check database is initialized
- Verify admin user exists
- Make sure no other tests are running

---

## ✅ Success Checklist

After testing, you should have verified:

- [ ] Admin can login
- [ ] Admin can create forms
- [ ] Users can register via forms
- [ ] Users can login
- [ ] Users can view dashboard
- [ ] Users receive QR codes
- [ ] Admin can create sessions
- [ ] Admin can generate session QR
- [ ] Users can check in via QR
- [ ] Duplicate check-ins are prevented
- [ ] Admin can view attendance
- [ ] Admin can view absentees
- [ ] Admin can view all users
- [ ] Admin can search users
- [ ] Admin can view overview

---

## 📊 Test Data Cleanup

After testing, you may want to clean up test data:

```sql
-- Connect to database
sqlite3 backend/data/degas.db

-- Delete test user
DELETE FROM core_users WHERE email LIKE '%test%';

-- Delete test sessions
DELETE FROM attendance_sessions WHERE session_name LIKE '%test%';

-- Delete test forms
DELETE FROM form_definitions WHERE form_name LIKE '%test%';
```

Or simply delete the database and re-run migrations:
```bash
cd backend
rm data/degas.db
npm run db:migrate
npm run db:seed
```

---

## 🎯 Next Steps

Once all tests pass:
1. ✅ Backend is working correctly
2. ✅ All features are functional
3. ✅ Ready for frontend integration
4. ✅ Ready for deployment

---

**Need Help?**
- Check `COMPLETE_API_REFERENCE.md` for full API docs
- Review phase-specific summaries for detailed info
- Check server logs in `backend/logs/` for errors
