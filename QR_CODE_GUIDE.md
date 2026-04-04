# QR Code Guide - Attendance Scanning

## Overview
The system now has an updated QR code that users can scan to mark their attendance.

## QR Code Updated ✅

The form QR code has been updated to encode:
```
https://localhost:5173/scan/06aa4b67-76fe-411a-a1e0-682871e8506f
```

This QR code is specifically for **attendance scanning**, not registration.

---

## How to Get the QR Code

### Option 1: Download from Admin Dashboard
1. Login as admin: https://localhost:5175/login
   - Email: admin@degas.com
   - Password: admin123
2. Navigate to "Tables" section
3. Find "The Force of Grace Ministry" form
4. Click the "Download QR" button
5. QR code will be downloaded as a PNG file

### Option 2: Download from Form Detail Page
1. Login as admin
2. Go to Tables → Click on "The Force of Grace Ministry"
3. Click "Download QR" button at the top
4. QR code will be downloaded

---

## Two Types of QR Codes

### 1. Form QR Code (For Attendance)
- **Purpose:** Users scan this to mark attendance
- **Location:** Download from admin dashboard
- **Encodes:** `https://localhost:5173/scan/06aa4b67-76fe-411a-a1e0-682871e8506f`
- **Usage:** Print and display at event entrance

### 2. User Personal QR Code (For Admin Scanning)
- **Purpose:** Admin scans this to mark user's attendance
- **Location:** User's dashboard after login
- **Encodes:** JSON with userId and formId
- **Usage:** User shows this to admin at entrance

---

## Attendance Workflow

### Method 1: Self-Service (User Scans Form QR)
1. **Setup:** Admin downloads and prints form QR code
2. **Display:** Place QR code at event entrance
3. **User Action:**
   - User scans QR code with phone camera
   - Opens link in browser
   - Logs into their account
   - Clicks "Scan Form QR Code" on dashboard
   - Scans the form QR code again (or enters manually)
   - Attendance marked ✅

### Method 2: Admin Scanning (Admin Scans User QR)
1. **Setup:** Admin opens scanner on admin dashboard
2. **User Action:**
   - User logs into their account
   - Opens their dashboard
   - Shows personal QR code to admin
3. **Admin Action:**
   - Admin scans user's personal QR code
   - Attendance marked ✅

---

## Testing the QR Code

### Test 1: Manual Entry (Easiest)
1. Login as a user (e.g., regtest@example.com)
2. Go to user dashboard
3. Click "Scan Form QR Code"
4. In the manual input field, enter:
   ```
   https://localhost:5173/scan/06aa4b67-76fe-411a-a1e0-682871e8506f
   ```
   OR just:
   ```
   06aa4b67-76fe-411a-a1e0-682871e8506f
   ```
5. Click "Submit"
6. Should see success message ✅

### Test 2: Camera Scanning
1. Download the QR code from admin dashboard
2. Display it on another device or print it
3. Login as a user
4. Click "Scan Form QR Code"
5. Point camera at the QR code
6. Should automatically scan and mark attendance ✅

---

## Supported QR Formats

The system accepts THREE formats:

### 1. Full URL
```
https://localhost:5173/scan/06aa4b67-76fe-411a-a1e0-682871e8506f
```

### 2. UUID Only
```
06aa4b67-76fe-411a-a1e0-682871e8506f
```

### 3. JSON (User Personal QR)
```json
{
  "userId": "user-id-here",
  "formId": "06aa4b67-76fe-411a-a1e0-682871e8506f",
  "type": "user_scan",
  "timestamp": 1775328652756
}
```

All three formats work correctly! ✅

---

## Important Notes

### Registration vs Scanning
- **Registration Link:** `https://localhost:5173/register/[formId]`
  - For NEW users to sign up
  - Creates account in database
  - One-time use per user

- **Scanning Link:** `https://localhost:5173/scan/[formId]`
  - For EXISTING users to mark attendance
  - Requires login first
  - Can be used at each event

### Security
- Users must be logged in to mark attendance
- Users can only scan once per event
- System verifies user belongs to the form
- All scans are logged in access_logs table

### Troubleshooting

**Issue:** "Invalid QR code format"
- **Solution:** Make sure you're logged in as a user first

**Issue:** "User not found"
- **Solution:** Register first using the registration link

**Issue:** "Already scanned"
- **Solution:** You've already marked attendance for this event

**Issue:** "User does not belong to this form"
- **Solution:** You registered for a different form

---

## Production Deployment

When deploying to production:

1. Update the QR code URL to your production domain:
   ```
   https://yourdomain.com/scan/06aa4b67-76fe-411a-a1e0-682871e8506f
   ```

2. Run the update script:
   ```bash
   cd backend
   # Edit update-qr-for-scanning.js to use production URL
   node update-qr-for-scanning.js
   ```

3. Download and distribute the new QR code

---

## Quick Commands

### Update QR Code
```bash
cd backend
node update-qr-for-scanning.js
```

### Check QR Code Content
```bash
cd backend
node check-qr-content.js
```

### Test Scanning
```bash
cd backend
node test-scan-formats.js
```

---

**Status:** ✅ QR Code Updated and Ready
**Date:** 2026-04-04
**Next Step:** Download QR code from admin dashboard and test scanning
