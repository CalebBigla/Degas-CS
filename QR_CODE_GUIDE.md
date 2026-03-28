# QR Code System Guide

## Overview
Every registered user automatically gets a QR code generated during registration. This QR code is used for attendance tracking and verification.

## How QR Codes Work

### 1. Generation (During Registration)
When a user registers through any form:
1. User fills out registration form
2. Backend creates user account
3. Backend generates secure QR code with user's UUID
4. QR code is stored in `qr_codes` table
5. QR code image (base64) is returned in registration response

### 2. Display Locations

#### A. Registration Success Page
After successful registration, users see:
- Success message
- Their QR code displayed
- Download button to save QR code
- Button to go to dashboard or login

#### B. Member Dashboard (`/my-dashboard`)
Users can always access their QR code from their dashboard:
- Navigate to "My Dashboard" after login
- QR code is displayed in a dedicated card
- Download button available
- QR code persists and can be accessed anytime

### 3. QR Code Usage

#### For Users:
1. Register through any form
2. Save/download QR code from success page or dashboard
3. Present QR code for attendance scanning
4. QR code can be printed or shown on mobile device

#### For Admins:
1. Go to Scanner page (`/scanner`)
2. Scan user's QR code using camera
3. System verifies QR code and records attendance
4. User information is displayed
5. Attendance is logged in database

## API Endpoints

### Get User Dashboard (includes QR code)
```
GET /api/user/dashboard
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "user": { "id": "...", "email": "..." },
    "profile": { "table": "Members", "data": {...} },
    "qrCode": {
      "image": "data:image/png;base64,...",
      "token": "encrypted-qr-data"
    },
    "attendance": { "total": 5, "recent": [...] }
  }
}
```

### Verify QR Code (Scanner)
```
POST /api/scanner/verify
{
  "qrData": "encrypted-qr-data-from-scan"
}

Response:
{
  "success": true,
  "data": {
    "valid": true,
    "user": {
      "uuid": "...",
      "table": "Members",
      "name": "John Doe",
      "email": "john@example.com",
      "photoUrl": "/uploads/..."
    }
  }
}
```

## Database Schema

### qr_codes Table
```sql
CREATE TABLE qr_codes (
  id TEXT PRIMARY KEY,
  user_uuid TEXT NOT NULL,
  table_name TEXT NOT NULL,
  qr_data TEXT NOT NULL,      -- Encrypted QR data
  qr_image TEXT NOT NULL,      -- Base64 PNG image
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT,
  is_active INTEGER DEFAULT 1
);
```

## QR Code Security

### Encryption
- QR codes contain encrypted data
- Includes user UUID, table name, and timestamp
- Cannot be forged or tampered with
- Backend verifies signature on scan

### Expiration (Optional)
- QR codes can have expiration dates
- Expired codes are rejected during scanning
- Can be regenerated if needed

## Troubleshooting

### QR Code Not Showing on Registration
**Issue**: Frontend shows error but backend creates user
**Solution**: 
- Check browser console for actual error
- Verify response status is 201
- Check if `response.data.success === true`
- Updated RegisterPage now handles both `success` flag and 201 status

### QR Code Not in Dashboard
**Issue**: Dashboard shows "QR code not available"
**Causes**:
1. QR code wasn't generated during registration
2. User registered before QR system was implemented
3. Database query error

**Solution**:
```javascript
// Check if user has QR code
node backend/check-qr-codes.js

// Regenerate QR code for user
// (Admin feature - to be implemented)
```

### Scanner Not Working
**Issue**: QR scanner doesn't recognize code
**Causes**:
1. Camera permissions not granted
2. QR code image quality too low
3. QR code expired

**Solution**:
1. Grant camera permissions in browser
2. Download high-quality QR code from dashboard
3. Check QR code expiration in database

## User Flow Examples

### New User Registration
```
1. User visits /register/[formId]
2. Fills out form (name, email, password, etc.)
3. Submits form
4. Backend:
   - Creates core_user
   - Inserts data into target table
   - Generates QR code
   - Returns success + QR code
5. Frontend shows:
   - Success message
   - QR code image
   - Download button
   - Dashboard/Login button
6. User downloads QR code
7. User clicks "Go to Dashboard"
8. Dashboard shows QR code again
```

### Existing User Accessing QR Code
```
1. User logs in at /login
2. Navigates to /my-dashboard
3. Dashboard loads user data including QR code
4. QR code displayed in dedicated card
5. User can download QR code anytime
```

### Admin Scanning QR Code
```
1. Admin goes to /scanner
2. Clicks "Start Scanner"
3. Camera activates
4. User presents QR code
5. Scanner reads QR data
6. Backend verifies QR code
7. User info displayed
8. Admin confirms attendance
9. Attendance recorded in database
```

## Future Enhancements

1. **QR Code Regeneration**: Allow users to regenerate QR codes
2. **Multiple QR Codes**: Support different QR codes for different purposes
3. **QR Code Analytics**: Track how often QR codes are scanned
4. **Email QR Code**: Send QR code via email after registration
5. **Print-Friendly Format**: Generate PDF with QR code and user info
6. **Bulk QR Generation**: Generate QR codes for all users in a table
7. **QR Code Expiration**: Set expiration dates for security
8. **Dynamic QR Codes**: QR codes that change periodically

## Files Modified

### Frontend
- `frontend/src/pages/RegisterPage.tsx` - Added QR code display on success
- `frontend/src/pages/MemberDashboardPage.tsx` - Already has QR code display

### Backend
- `backend/src/controllers/onboardingController.ts` - Returns QR code in registration response
- `backend/src/services/qrService.ts` - Generates and manages QR codes
- `backend/src/controllers/scannerController.ts` - Verifies QR codes

## Testing

### Test QR Code Generation
1. Register a new user
2. Check registration response includes `qrCode` field
3. Verify QR code is base64 PNG image
4. Check `qr_codes` table has new entry

### Test QR Code Display
1. Complete registration
2. Verify QR code shows on success page
3. Click "Go to Dashboard"
4. Verify QR code shows in dashboard
5. Click download button
6. Verify PNG file downloads

### Test QR Code Scanning
1. Open scanner page
2. Present QR code to camera
3. Verify user info displays
4. Confirm attendance
5. Check attendance_records table
