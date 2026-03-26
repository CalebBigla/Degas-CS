# Complete Attendance System API Reference

Comprehensive API documentation for the complete attendance and user onboarding system.

## 📋 Table of Contents

1. [Authentication](#authentication)
2. [User Onboarding](#user-onboarding)
3. [Core User Auth](#core-user-auth)
4. [Form Management](#form-management)
5. [Attendance Sessions](#attendance-sessions)
6. [Attendance Scanning](#attendance-scanning)
7. [User Dashboard](#user-dashboard)
8. [Admin Features](#admin-features)

---

## 🔐 Authentication

### Admin Authentication
Used for admin endpoints (form management, session management, user management)

**Login**: `POST /api/auth/login`
```json
Request:
{
  "email": "admin@example.com",
  "password": "admin-password"
}

Response:
{
  "success": true,
  "token": "admin-jwt-token",
  "user": { "id": "...", "email": "..." }
}
```

### Core User Authentication
Used for user endpoints (dashboard, attendance scanning)

**Login**: `POST /api/core-auth/login`
```json
Request:
{
  "email": "user@example.com",
  "password": "user-password"
}

Response:
{
  "success": true,
  "token": "user-jwt-token",
  "user": { "id": "...", "email": "..." }
}
```

---

## 👤 User Onboarding

### Get Active Onboarding Form
`GET /api/onboarding/form`  
**Auth**: None (public)

Returns the currently active registration form.

```json
Response:
{
  "success": true,
  "data": {
    "id": "form-id",
    "form_name": "Student Registration",
    "target_table": "Students",
    "fields": [
      {
        "field_name": "email",
        "field_label": "Email Address",
        "field_type": "email",
        "is_required": true,
        "is_email_field": true,
        "field_order": 1
      }
      // ... more fields
    ]
  }
}
```

### Register New User
`POST /api/onboarding/register`  
**Auth**: None (public)  
**Content-Type**: `application/json` or `multipart/form-data`

Register a new user with dynamic form data.

```json
Request (JSON):
{
  "email": "student@example.com",
  "password": "SecurePass123!",
  "fullName": "John Doe",
  "studentId": "STU-12345",
  "photo": "data:image/png;base64,..." // Optional base64 image
}

Response:
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "coreUserId": "core-user-id",
    "email": "student@example.com",
    "userId": "user-uuid",
    "table": "Students",
    "qrCode": "data:image/png;base64,...",
    "qrToken": "signed-jwt-token"
  }
}
```

---

## 🔑 Core User Auth

### Get Current User
`GET /api/core-auth/me`  
**Auth**: Core User

Get authenticated user's information.

```json
Response:
{
  "success": true,
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "full_name": "John Doe",
    "phone": "+1234567890"
  }
}
```

---

## 📝 Form Management

### Get All Forms (Admin)
`GET /api/admin/forms`  
**Auth**: Admin

List all form definitions.

### Get Form by ID (Admin)
`GET /api/admin/forms/:id`  
**Auth**: Admin

### Create Form (Admin)
`POST /api/admin/forms`  
**Auth**: Admin

```json
Request:
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
    }
    // ... more fields
  ]
}
```

### Update Form (Admin)
`PUT /api/admin/forms/:id`  
**Auth**: Admin

### Delete Form (Admin)
`DELETE /api/admin/forms/:id`  
**Auth**: Admin

---

## 📅 Attendance Sessions

### Create Session (Admin)
`POST /api/admin/sessions`  
**Auth**: Admin

```json
Request:
{
  "session_name": "Morning Assembly",
  "description": "Daily morning assembly",
  "start_time": "2024-03-27T08:00:00Z",
  "end_time": "2024-03-27T09:00:00Z",
  "grace_period_minutes": 15,
  "is_active": true
}

Response:
{
  "success": true,
  "message": "Session created successfully",
  "data": {
    "id": "session-id",
    "session_name": "Morning Assembly",
    "start_time": "2024-03-27T08:00:00Z",
    "end_time": "2024-03-27T09:00:00Z",
    "grace_period_minutes": 15,
    "is_active": true
  }
}
```

### Get All Sessions (Admin)
`GET /api/admin/sessions?isActive=true&startDate=...&endDate=...`  
**Auth**: Admin

Query parameters:
- `isActive` (optional): Filter by active status
- `startDate` (optional): Filter sessions starting after date
- `endDate` (optional): Filter sessions ending before date

### Get Session by ID (Admin)
`GET /api/admin/sessions/:id`  
**Auth**: Admin

### Update Session (Admin)
`PUT /api/admin/sessions/:id`  
**Auth**: Admin

### Delete Session (Admin)
`DELETE /api/admin/sessions/:id`  
**Auth**: Admin

### Toggle Session Active (Admin)
`POST /api/admin/sessions/:id/activate`  
**Auth**: Admin

```json
Request:
{
  "isActive": true
}
```

### Generate Session QR (Admin)
`GET /api/admin/sessions/:id/qr`  
**Auth**: Admin

```json
Response:
{
  "success": true,
  "data": {
    "sessionId": "session-id",
    "qrToken": "signed-jwt-token",
    "qrImage": "data:image/png;base64,..."
  }
}
```

### Get Session Attendance (Admin)
`GET /api/admin/sessions/:id/attendance`  
**Auth**: Admin

```json
Response:
{
  "success": true,
  "data": {
    "attendance": [
      {
        "id": "record-id",
        "core_user_id": "user-id",
        "email": "student@example.com",
        "full_name": "John Doe",
        "checked_in_at": "2024-03-27T08:15:00Z"
      }
    ],
    "stats": {
      "totalUsers": 100,
      "attended": 85,
      "absent": 15,
      "attendanceRate": 85.00
    }
  }
}
```

### Get Session Absentees (Admin)
`GET /api/admin/sessions/:id/absentees`  
**Auth**: Admin

```json
Response:
{
  "success": true,
  "data": [
    {
      "id": "user-id",
      "email": "absent@example.com",
      "full_name": "Jane Smith",
      "phone": "+9876543210"
    }
  ]
}
```

---

## 📱 Attendance Scanning

### Scan QR to Check In (User)
`POST /api/attendance/scan`  
**Auth**: Core User

```json
Request:
{
  "qrToken": "signed-jwt-token-from-qr"
}

Response (Success):
{
  "success": true,
  "message": "Check-in successful",
  "data": {
    "record": {
      "id": "record-id",
      "session_id": "session-id",
      "core_user_id": "user-id",
      "checked_in_at": "2024-03-27T08:15:00Z"
    },
    "sessionName": "Morning Assembly"
  }
}

Response (Error - Already Checked In):
{
  "success": false,
  "message": "Already checked in to this session"
}

Response (Error - Session Ended):
{
  "success": false,
  "message": "Session has ended (grace period expired)"
}
```

### Get User Attendance History (User)
`GET /api/attendance/history`  
**Auth**: Core User

```json
Response:
{
  "success": true,
  "data": [
    {
      "id": "record-id",
      "session_id": "session-id",
      "session_name": "Morning Assembly",
      "checked_in_at": "2024-03-27T08:15:00Z",
      "start_time": "2024-03-27T08:00:00Z",
      "end_time": "2024-03-27T09:00:00Z"
    }
  ]
}
```

---

## 📊 User Dashboard

### Get User Dashboard (User)
`GET /api/user/dashboard`  
**Auth**: Core User

Get complete dashboard data including profile, QR code, and attendance.

```json
Response:
{
  "success": true,
  "data": {
    "user": {
      "id": "user-id",
      "email": "student@example.com",
      "full_name": "John Doe",
      "phone": "+1234567890",
      "created_at": "2024-03-20T10:00:00Z"
    },
    "profile": {
      "table": "Students",
      "data": {
        "uuid": "user-uuid",
        "fullName": "John Doe",
        "studentId": "STU-12345",
        "grade": "10th Grade",
        "photoUrl": "/uploads/photo.jpg"
      }
    },
    "qrCode": {
      "token": "signed-jwt-token",
      "image": "data:image/png;base64,..."
    },
    "attendance": {
      "history": [
        {
          "id": "record-id",
          "session_name": "Morning Assembly",
          "checked_in_at": "2024-03-27T08:15:00Z"
        }
      ],
      "stats": {
        "totalSessions": 10,
        "attended": 8,
        "missed": 2,
        "attendanceRate": 80.00
      }
    }
  }
}
```

---

## 👥 Admin Features

### Get All Core Users (Admin)
`GET /api/admin/core-users?search=...&limit=...&offset=...`  
**Auth**: Admin

Query parameters:
- `search` (optional): Search by email or name
- `limit` (optional): Number of results per page
- `offset` (optional): Pagination offset

```json
Response:
{
  "success": true,
  "data": [
    {
      "id": "user-id",
      "email": "student@example.com",
      "full_name": "John Doe",
      "phone": "+1234567890",
      "created_at": "2024-03-20T10:00:00Z",
      "linkedTables": [
        {
          "table": "Students",
          "recordId": "record-id"
        }
      ],
      "attendanceCount": 8
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 20,
    "offset": 0
  }
}
```

### Get Core User by ID (Admin)
`GET /api/admin/core-users/:id`  
**Auth**: Admin

```json
Response:
{
  "success": true,
  "data": {
    "id": "user-id",
    "email": "student@example.com",
    "full_name": "John Doe",
    "phone": "+1234567890",
    "created_at": "2024-03-20T10:00:00Z",
    "linkedData": [
      {
        "id": "link-id",
        "table_name": "Students",
        "record_id": "record-id",
        "record_data": {
          "fullName": "John Doe",
          "studentId": "STU-12345"
        }
      }
    ],
    "attendanceHistory": [
      {
        "id": "record-id",
        "session_name": "Morning Assembly",
        "checked_in_at": "2024-03-27T08:15:00Z"
      }
    ],
    "attendanceCount": 8
  }
}
```

### Get Attendance Overview (Admin)
`GET /api/admin/attendance/overview`  
**Auth**: Admin

```json
Response:
{
  "success": true,
  "data": {
    "totalUsers": 150,
    "totalSessions": 25,
    "activeSessions": 3,
    "totalCheckIns": 1200,
    "averageAttendanceRate": 82.50,
    "recentSessions": [
      {
        "id": "session-id",
        "session_name": "Morning Assembly",
        "start_time": "2024-03-27T08:00:00Z",
        "end_time": "2024-03-27T09:00:00Z",
        "is_active": true,
        "attendance_count": 120
      }
    ]
  }
}
```

---

## 🔄 Complete User Journey

### 1. User Registration
```
POST /api/onboarding/form (get form)
  ↓
POST /api/onboarding/register (register)
  ↓
Receive QR code
```

### 2. User Login & Dashboard
```
POST /api/core-auth/login (login)
  ↓
GET /api/user/dashboard (view dashboard)
  ↓
Display profile, QR, attendance
```

### 3. Attendance Check-In
```
Admin: POST /api/admin/sessions (create session)
  ↓
Admin: GET /api/admin/sessions/:id/qr (generate QR)
  ↓
Display QR on screen
  ↓
User: Scan QR with camera
  ↓
User: POST /api/attendance/scan (check in)
  ↓
Success confirmation
```

### 4. Admin Monitoring
```
GET /api/admin/attendance/overview (system stats)
  ↓
GET /api/admin/sessions/:id/attendance (session attendance)
  ↓
GET /api/admin/sessions/:id/absentees (who's missing)
  ↓
GET /api/admin/core-users (user management)
```

---

## ⚠️ Error Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate entry)
- `500` - Internal Server Error

---

## 🧪 Testing Endpoints

### Run Test Suites
```bash
# Phase 3: Forms
node backend/test-phase3.js

# Phase 4-5: Onboarding
node backend/test-phase4-5.js

# Phase 6-8: Attendance
node backend/test-phase6-8.js

# Phase 9-10: Dashboard & Admin
node backend/test-phase9-10.js
```

---

**Last Updated**: All Phases Complete  
**Status**: ✅ Production Ready  
**Version**: 1.0.0
