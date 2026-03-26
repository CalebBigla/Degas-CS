# Attendance System API Guide

Complete API reference for the attendance tracking system.

## 🎯 Overview

The attendance system allows:
- Admins to create and manage attendance sessions
- Admins to generate QR codes for sessions
- Users to check in by scanning session QR codes
- Admins to view attendance reports and statistics
- Users to view their attendance history

## 🔐 Authentication

### Admin Endpoints
Require admin JWT token in Authorization header:
```
Authorization: Bearer <admin-token>
```

Get admin token via: `POST /api/auth/login`

### User Endpoints
Require core user JWT token in Authorization header:
```
Authorization: Bearer <user-token>
```

Get user token via: `POST /api/core-auth/login`

---

## 📋 Admin Endpoints

### 1. Create Attendance Session

**Endpoint**: `POST /api/admin/sessions`  
**Authentication**: Admin  
**Description**: Create a new attendance session

**Request Body**:
```json
{
  "session_name": "Morning Assembly",
  "description": "Daily morning assembly attendance",
  "start_time": "2024-03-27T08:00:00Z",
  "end_time": "2024-03-27T09:00:00Z",
  "grace_period_minutes": 15,
  "is_active": true
}
```

**Field Descriptions**:
- `session_name` (required): Name of the session
- `description` (optional): Session description
- `start_time` (required): ISO 8601 datetime when session starts
- `end_time` (required): ISO 8601 datetime when session ends
- `grace_period_minutes` (optional): Minutes after end_time to allow check-ins (default: 0)
- `is_active` (optional): Whether session is active (default: true)

**Response**:
```json
{
  "success": true,
  "message": "Session created successfully",
  "data": {
    "id": "1234567890-abc123",
    "session_name": "Morning Assembly",
    "description": "Daily morning assembly attendance",
    "start_time": "2024-03-27T08:00:00Z",
    "end_time": "2024-03-27T09:00:00Z",
    "grace_period_minutes": 15,
    "is_active": true,
    "created_by": "admin-id",
    "created_at": "2024-03-26T10:00:00Z",
    "updated_at": "2024-03-26T10:00:00Z"
  }
}
```

---

### 2. Get All Sessions

**Endpoint**: `GET /api/admin/sessions`  
**Authentication**: Admin  
**Description**: List all attendance sessions with optional filters

**Query Parameters**:
- `isActive` (optional): Filter by active status (true/false)
- `startDate` (optional): Filter sessions starting after this date (ISO 8601)
- `endDate` (optional): Filter sessions ending before this date (ISO 8601)

**Example**: `GET /api/admin/sessions?isActive=true&startDate=2024-03-01T00:00:00Z`

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "session-id",
      "session_name": "Morning Assembly",
      "description": "Daily morning assembly",
      "start_time": "2024-03-27T08:00:00Z",
      "end_time": "2024-03-27T09:00:00Z",
      "grace_period_minutes": 15,
      "is_active": true,
      "created_by": "admin-id",
      "created_at": "2024-03-26T10:00:00Z",
      "updated_at": "2024-03-26T10:00:00Z"
    }
  ]
}
```

---

### 3. Get Session by ID

**Endpoint**: `GET /api/admin/sessions/:id`  
**Authentication**: Admin  
**Description**: Get details of a specific session

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "session-id",
    "session_name": "Morning Assembly",
    "description": "Daily morning assembly",
    "start_time": "2024-03-27T08:00:00Z",
    "end_time": "2024-03-27T09:00:00Z",
    "grace_period_minutes": 15,
    "is_active": true,
    "created_by": "admin-id",
    "created_at": "2024-03-26T10:00:00Z",
    "updated_at": "2024-03-26T10:00:00Z"
  }
}
```

---

### 4. Update Session

**Endpoint**: `PUT /api/admin/sessions/:id`  
**Authentication**: Admin  
**Description**: Update session details

**Request Body** (all fields optional):
```json
{
  "session_name": "Updated Session Name",
  "description": "Updated description",
  "start_time": "2024-03-27T08:30:00Z",
  "end_time": "2024-03-27T09:30:00Z",
  "grace_period_minutes": 20,
  "is_active": false
}
```

**Response**:
```json
{
  "success": true,
  "message": "Session updated successfully",
  "data": {
    "id": "session-id",
    "session_name": "Updated Session Name",
    // ... updated fields
  }
}
```

---

### 5. Delete Session

**Endpoint**: `DELETE /api/admin/sessions/:id`  
**Authentication**: Admin  
**Description**: Delete session and all related records

**Response**:
```json
{
  "success": true,
  "message": "Session deleted successfully"
}
```

**Note**: This will also delete:
- All attendance records for this session
- All audit logs for this session

---

### 6. Activate/Deactivate Session

**Endpoint**: `POST /api/admin/sessions/:id/activate`  
**Authentication**: Admin  
**Description**: Toggle session active status

**Request Body**:
```json
{
  "isActive": true
}
```

**Response**:
```json
{
  "success": true,
  "message": "Session activated successfully",
  "data": {
    "id": "session-id",
    "is_active": true,
    // ... other fields
  }
}
```

---

### 7. Generate Session QR Code

**Endpoint**: `GET /api/admin/sessions/:id/qr`  
**Authentication**: Admin  
**Description**: Generate QR code for session check-in

**Response**:
```json
{
  "success": true,
  "data": {
    "sessionId": "session-id",
    "qrToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0eXBlIjoiYXR0ZW5kYW5jZSIsInNlc3Npb25JZCI6InNlc3Npb24taWQiLCJzZXNzaW9uTmFtZSI6Ik1vcm5pbmcgQXNzZW1ibHkiLCJleHAiOjE3MTE1MjY0MDB9.signature",
    "qrImage": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
  }
}
```

**QR Token Payload**:
```json
{
  "type": "attendance",
  "sessionId": "session-id",
  "sessionName": "Morning Assembly",
  "exp": 1711526400
}
```

**Notes**:
- QR token is signed with JWT (HMAC-SHA256)
- Expiration is set to `end_time + grace_period_minutes`
- QR image is base64 encoded PNG (300x300px)
- Display the QR image for users to scan

---

### 8. Get Session Attendance

**Endpoint**: `GET /api/admin/sessions/:id/attendance`  
**Authentication**: Admin  
**Description**: Get list of users who attended and statistics

**Response**:
```json
{
  "success": true,
  "data": {
    "attendance": [
      {
        "id": "record-id",
        "session_id": "session-id",
        "core_user_id": "user-id",
        "checked_in_at": "2024-03-27T08:15:00Z",
        "email": "student@example.com",
        "full_name": "John Doe",
        "phone": "+1234567890"
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

---

### 9. Get Session Absentees

**Endpoint**: `GET /api/admin/sessions/:id/absentees`  
**Authentication**: Admin  
**Description**: Get list of users who did not attend

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "user-id",
      "email": "absent@example.com",
      "full_name": "Jane Smith",
      "phone": "+9876543210",
      "created_at": "2024-03-20T10:00:00Z"
    }
  ]
}
```

---

## 👤 User Endpoints

### 10. Scan QR to Check In

**Endpoint**: `POST /api/attendance/scan`  
**Authentication**: Core User  
**Description**: Check in to a session by scanning QR code

**Request Body**:
```json
{
  "qrToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response**:
```json
{
  "success": true,
  "message": "Check-in successful",
  "data": {
    "record": {
      "id": "record-id",
      "session_id": "session-id",
      "core_user_id": "user-id",
      "checked_in_at": "2024-03-27T08:15:00Z",
      "created_at": "2024-03-27T08:15:00Z"
    },
    "sessionName": "Morning Assembly"
  }
}
```

**Error Responses**:

**Invalid QR**:
```json
{
  "success": false,
  "message": "Invalid QR code"
}
```

**Expired QR**:
```json
{
  "success": false,
  "message": "QR code has expired"
}
```

**Session Not Active**:
```json
{
  "success": false,
  "message": "Session is not active"
}
```

**Session Not Started**:
```json
{
  "success": false,
  "message": "Session has not started yet"
}
```

**Session Ended**:
```json
{
  "success": false,
  "message": "Session has ended (grace period expired)"
}
```

**Already Checked In** (409 Conflict):
```json
{
  "success": false,
  "message": "Already checked in to this session"
}
```

---

### 11. Get User Attendance History

**Endpoint**: `GET /api/attendance/history`  
**Authentication**: Core User  
**Description**: Get authenticated user's attendance history

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "record-id",
      "session_id": "session-id",
      "checked_in_at": "2024-03-27T08:15:00Z",
      "session_name": "Morning Assembly",
      "description": "Daily morning assembly",
      "start_time": "2024-03-27T08:00:00Z",
      "end_time": "2024-03-27T09:00:00Z"
    }
  ]
}
```

---

## 🔄 Typical Workflows

### Admin Workflow: Create and Run Session

1. **Create Session**
   ```javascript
   POST /api/admin/sessions
   {
     "session_name": "Morning Assembly",
     "start_time": "2024-03-27T08:00:00Z",
     "end_time": "2024-03-27T09:00:00Z",
     "grace_period_minutes": 15,
     "is_active": true
   }
   ```

2. **Generate QR Code**
   ```javascript
   GET /api/admin/sessions/{sessionId}/qr
   ```

3. **Display QR Code**
   - Show the QR image on screen/projector
   - Users scan with their mobile devices

4. **Monitor Attendance**
   ```javascript
   GET /api/admin/sessions/{sessionId}/attendance
   ```

5. **View Absentees**
   ```javascript
   GET /api/admin/sessions/{sessionId}/absentees
   ```

6. **Close Session** (optional)
   ```javascript
   POST /api/admin/sessions/{sessionId}/activate
   { "isActive": false }
   ```

### User Workflow: Check In

1. **Login**
   ```javascript
   POST /api/core-auth/login
   { "email": "user@example.com", "password": "password" }
   ```

2. **Scan QR Code**
   - Use camera to scan displayed QR
   - Extract QR token from scanned data

3. **Check In**
   ```javascript
   POST /api/attendance/scan
   { "qrToken": "scanned-token" }
   ```

4. **View History** (optional)
   ```javascript
   GET /api/attendance/history
   ```

---

## 🧪 Testing with cURL

### Create Session
```bash
curl -X POST http://localhost:10000/api/admin/sessions \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "session_name": "Test Session",
    "start_time": "2024-03-27T08:00:00Z",
    "end_time": "2024-03-27T09:00:00Z",
    "grace_period_minutes": 15,
    "is_active": true
  }'
```

### Generate QR
```bash
curl -X GET http://localhost:10000/api/admin/sessions/SESSION_ID/qr \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Check In
```bash
curl -X POST http://localhost:10000/api/attendance/scan \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"qrToken": "QR_TOKEN_HERE"}'
```

---

## 📱 Mobile Integration

### QR Scanner Implementation

```typescript
import { BrowserQRCodeReader } from '@zxing/browser';

async function scanQRCode() {
  const codeReader = new BrowserQRCodeReader();
  
  try {
    const result = await codeReader.decodeOnceFromVideoDevice(
      undefined, // Use default camera
      'video-element-id'
    );
    
    const qrToken = result.getText();
    
    // Check in with scanned token
    await checkIn(qrToken);
  } catch (error) {
    console.error('QR scan failed:', error);
  }
}

async function checkIn(qrToken: string) {
  const response = await fetch('/api/attendance/scan', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${userToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ qrToken })
  });
  
  const result = await response.json();
  
  if (result.success) {
    showSuccess('Checked in successfully!');
  } else {
    showError(result.message);
  }
}
```

---

## ⚠️ Important Notes

### Time Zones
- All timestamps are in UTC (ISO 8601 format)
- Convert to local time on frontend if needed
- Server validates times in UTC

### Grace Period
- Extends the check-in window after end_time
- Example: end_time = 9:00 AM, grace = 15 min → can check in until 9:15 AM
- QR expiration is set to end_time + grace_period

### Session Status
- `is_active = false` prevents all check-ins
- Use to temporarily disable a session
- Useful for testing or emergency situations

### Duplicate Prevention
- Database UNIQUE constraint on (session_id, core_user_id)
- Returns 409 Conflict if user tries to check in twice
- Audit log records all attempts

### QR Security
- QR tokens are signed with JWT
- Signature prevents tampering
- Expiration prevents reuse after session ends
- Type field prevents using user QR for attendance

---

**Last Updated**: Phase 6-8 Complete  
**Status**: ✅ Production Ready
