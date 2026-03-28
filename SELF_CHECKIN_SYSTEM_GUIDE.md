# Self Check-In Attendance System Guide

## Overview
The system now supports **two types of QR codes** for flexible attendance tracking:

1. **User QR Code**: Each user has their own QR code (for admin to scan)
2. **Location/Event QR Code**: Posted at entrance (for users to scan themselves)

## Two QR Code System

### Type 1: User QR Code (Admin Scans User)
**Purpose**: Identity verification and manual check-in by admin

**How it works**:
- Each user gets a unique QR code when they register
- User shows their QR code to admin
- Admin scans it using `/scanner` page
- System verifies identity and records attendance

**Use cases**:
- Security checkpoints
- VIP entry
- Manual verification needed
- Small events with dedicated staff

### Type 2: Location QR Code (User Scans Location) ⭐ NEW
**Purpose**: Self-service attendance marking

**How it works**:
- Admin creates attendance session (e.g., "Sunday Service 10AM")
- Admin generates Location QR code for that session
- Admin prints/displays QR code at entrance
- Users scan the QR code with their phone
- System automatically records their attendance

**Use cases**:
- Church services
- School classes
- Conferences
- Large events
- Self-service check-in

## Complete Workflow

### Admin Setup (One-time per event)

1. **Create Attendance Session**
   ```
   - Go to /admin/attendance
   - Click "Create Session"
   - Fill in:
     * Session Name: "Sunday Service"
     * Description: "Weekly worship service"
     * Start Time: 2026-03-28 10:00
     * End Time: 2026-03-28 12:00
     * Grace Period: 15 minutes
   - Click "Create"
   ```

2. **Generate Location QR Code**
   ```
   - Find the session in the list
   - Click "Generate QR Code" button
   - QR code image appears
   - Click "Download QR Code"
   - Print or display on screen
   ```

3. **Display QR Code**
   ```
   - Print QR code poster
   - Place at entrance/registration desk
   - Or display on TV/monitor
   - Users will scan this to check in
   ```

### User Check-In Flow

1. **User Arrives at Location**
   ```
   - User sees QR code at entrance
   - Opens phone camera or attendance app
   ```

2. **Scan Location QR Code**
   ```
   - User logs into their account
   - Goes to "Mark Attendance" page
   - Clicks "Start Scanner"
   - Points camera at Location QR code
   - Scans the code
   ```

3. **Attendance Recorded**
   ```
   - System verifies session is active
   - Checks user is authenticated
   - Records attendance with timestamp
   - Shows success message
   - User can see their recent attendance
   ```

### Admin Monitoring

1. **View Attendance in Real-Time**
   ```
   - Go to /admin/attendance
   - Click "View Attendance" on session
   - See list of who checked in
   - See timestamps
   - Export attendance report
   ```

2. **View Absentees**
   ```
   - Click "View Absentees"
   - See who didn't check in
   - Filter by table (Students, Staff, etc.)
   - Send reminders if needed
   ```

3. **Analytics Dashboard**
   ```
   - Go to /admin/analytics
   - View attendance trends
   - See attendance rates
   - Compare across sessions
   ```

## API Endpoints

### Admin Endpoints

#### Create Session
```http
POST /api/admin/sessions
Authorization: Bearer <admin-token>

{
  "session_name": "Sunday Service",
  "description": "Weekly worship",
  "start_time": "2026-03-28T10:00:00Z",
  "end_time": "2026-03-28T12:00:00Z",
  "grace_period_minutes": 15
}
```

#### Generate Location QR Code
```http
GET /api/admin/sessions/:sessionId/qr
Authorization: Bearer <admin-token>

Response:
{
  "success": true,
  "data": {
    "qrImage": "data:image/png;base64,...",
    "qrData": "U0VTU0lPTjoxMjM0NTY3ODkw...",
    "sessionId": "1234567890",
    "sessionName": "Sunday Service"
  }
}
```

#### View Attendance
```http
GET /api/admin/sessions/:sessionId/attendance
Authorization: Bearer <admin-token>

Response:
{
  "success": true,
  "data": {
    "session": {...},
    "attendance": [
      {
        "user_uuid": "...",
        "name": "John Doe",
        "check_in_time": "2026-03-28T10:05:00Z",
        "status": "present"
      }
    ],
    "stats": {
      "total": 100,
      "present": 85,
      "absent": 15,
      "rate": "85%"
    }
  }
}
```

### User Endpoints

#### Self Check-In
```http
POST /api/user/attendance/checkin
Authorization: Bearer <user-token>

{
  "sessionQrData": "U0VTU0lPTjoxMjM0NTY3ODkw..."
}

Response:
{
  "success": true,
  "message": "Attendance recorded successfully",
  "data": {
    "sessionName": "Sunday Service",
    "timestamp": "2026-03-28T10:05:00Z",
    "status": "Present"
  }
}
```

#### Get Recent Attendance
```http
GET /api/user/attendance/recent
Authorization: Bearer <user-token>

Response:
{
  "success": true,
  "data": [
    {
      "session_name": "Sunday Service",
      "check_in_time": "2026-03-28T10:05:00Z",
      "status": "present"
    }
  ]
}
```

## QR Code Format

### User QR Code
```
Format: Encrypted user UUID + table name
Example: "eyJ1dWlkIjoiYWJjZDEyMzQiLCJ0YWJsZSI6IlN0dWRlbnRzIn0="
```

### Location QR Code
```
Format: SESSION:{sessionId}:{timestamp}:{signature}
Example (base64): "U0VTU0lPTjoxNzc0NTc0NDIzOTc4LTczbjExdWRpdToxNzExNTg0MDAwMDAwOnNpZ25hdHVyZQ=="
Decoded: "SESSION:1774574423978-73nn1udiu:1711584000000:signature"
```

## Database Schema

### attendance_sessions
```sql
CREATE TABLE attendance_sessions (
  id TEXT PRIMARY KEY,
  session_name TEXT NOT NULL,
  description TEXT,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  grace_period_minutes INTEGER DEFAULT 15,
  is_active INTEGER DEFAULT 1,
  qr_code TEXT,  -- Location QR code data
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### attendance_records
```sql
CREATE TABLE attendance_records (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_uuid TEXT NOT NULL,
  table_name TEXT NOT NULL,
  check_in_time TEXT NOT NULL,
  status TEXT DEFAULT 'present',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES attendance_sessions(id)
);
```

## Frontend Pages

### For Users

#### /mark-attendance (NEW)
- User scanner page
- Scan Location QR codes
- See recent attendance
- Success/error feedback

#### /my-dashboard
- View personal QR code
- Download QR code
- See attendance history
- "Mark Attendance" button

### For Admins

#### /admin/attendance
- Create sessions
- Generate Location QR codes
- View attendance
- View absentees
- Export reports

#### /admin/scanner
- Scan User QR codes
- Manual check-in
- Verify identities

#### /admin/analytics
- Attendance trends
- Attendance rates
- Session comparisons

## Security Features

### Session Validation
- QR codes contain session ID
- System checks if session is active
- System checks if session has ended
- Grace period for late arrivals

### Duplicate Prevention
- System checks if user already checked in
- Returns friendly message if duplicate
- Prevents multiple check-ins

### Authentication Required
- Users must be logged in to check in
- JWT token required for API calls
- User identity verified from token

### QR Code Expiration
- Location QR codes tied to session times
- Cannot check in after session ends
- Cannot check in before session starts (optional)

## Use Case Examples

### Church Service
```
1. Pastor creates "Sunday Service 10AM" session
2. Generates Location QR code
3. Displays QR code on TV at entrance
4. Members scan QR code as they arrive
5. System records attendance automatically
6. Pastor views attendance report after service
7. Sends follow-up to absentees
```

### School Class
```
1. Teacher creates "Math 101 - Monday" session
2. Prints Location QR code poster
3. Places poster at classroom door
4. Students scan QR code when entering
5. System marks them present
6. Teacher views attendance in real-time
7. Identifies absent students
```

### Conference
```
1. Organizer creates "Tech Conference Day 1" session
2. Generates Location QR code
3. Displays at registration desk
4. Attendees scan to check in
5. System tracks attendance
6. Organizer monitors attendance live
7. Generates attendance certificates
```

## Troubleshooting

### User Can't Check In

**Error: "Session not found"**
- QR code might be corrupted
- Session might have been deleted
- Ask admin to regenerate QR code

**Error: "Session has ended"**
- Session end time has passed
- Ask admin to extend session time
- Or create new session

**Error: "Already checked in"**
- User already scanned this session
- Check recent attendance to confirm
- No action needed

**Error: "User not authenticated"**
- User not logged in
- Redirect to login page
- Try again after login

### Admin Can't Generate QR Code

**Error: "Session not found"**
- Session might have been deleted
- Refresh page and try again

**QR Code Not Displaying**
- Check browser console for errors
- Try different browser
- Check network connection

## Future Enhancements

1. **Geofencing**: Only allow check-in within certain radius
2. **Time Restrictions**: Only allow check-in during session time
3. **Capacity Limits**: Limit number of check-ins
4. **Multiple Check-ins**: Allow check-in/check-out tracking
5. **Notifications**: Push notifications for attendance reminders
6. **Offline Mode**: Cache QR codes for offline scanning
7. **Bulk QR Generation**: Generate QR codes for multiple sessions
8. **QR Code Customization**: Add logos, colors to QR codes
9. **Analytics Dashboard**: Advanced attendance analytics
10. **Integration**: Export to Google Sheets, Excel, etc.

## Files Created/Modified

### Frontend
- `frontend/src/pages/UserScannerPage.tsx` (NEW) - User scanner page
- `frontend/src/pages/MemberDashboardPage.tsx` - Added "Mark Attendance" button
- `frontend/src/App.tsx` - Added `/mark-attendance` route

### Backend
- `backend/src/controllers/attendanceController.ts` - Added `userCheckIn()` and `getUserRecentAttendance()`
- `backend/src/routes/attendance.ts` - Added user check-in routes

## Testing

### Test User Check-In
1. Create attendance session as admin
2. Generate Location QR code
3. Login as regular user
4. Go to /mark-attendance
5. Scan the Location QR code
6. Verify success message
7. Check attendance record in database

### Test Duplicate Prevention
1. Check in once successfully
2. Try to check in again with same QR code
3. Should see "Already checked in" message
4. Verify only one record in database

### Test Session Expiration
1. Create session with end time in past
2. Try to check in
3. Should see "Session has ended" error

### Test Admin View
1. Have multiple users check in
2. Go to /admin/attendance
3. Click "View Attendance"
4. Verify all check-ins are listed
5. Check timestamps are correct

## Summary

The self check-in system provides a seamless way for users to mark their own attendance by scanning Location QR codes. This reduces admin workload, speeds up check-in process, and provides real-time attendance tracking. Combined with the existing User QR code system, you now have complete flexibility in how attendance is tracked.
