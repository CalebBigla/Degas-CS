# QR Code Testing Guide

## Problem: "QR data not recognized" Error

The error occurs because the system is receiving invalid QR data format.

## How QR Codes Work in Degas-CS

1. When you generate an ID card, the system creates a QR code containing encrypted base64 data
2. The QR code image displays a URL like: `http://localhost:5173/verify/ABC123XYZ...`
3. The scanner needs ONLY the base64 part: `ABC123XYZ...`

## Testing Steps

### Option 1: Use Phone Camera (RECOMMENDED)

1. On your PC, find your local IP address:
   - **Windows**: Run `ipconfig` in PowerShell, look for IPv4 Address (e.g., `192.168.1.XXX`)
   - **Mac/Linux**: Run `ifconfig`, look for inet address
2. Open scanner page on your phone: `http://YOUR_LOCAL_IP:5173/scanner`
3. Point camera at QR code on PC screen
4. Scanner will automatically read and verify

### Option 2: Manual Entry (For Testing)

Since you can't scan the QR code directly, here's how to extract the data:

#### Step 1: Get QR Data from Browser Console

1. On your PC, go to the table detail page
2. Click "Generate ID Card" for a user
3. Open browser console (F12 or right-click → Inspect → Console tab)
4. Look for a log message like: `QR code generated: eyJkYXRhIjoi...`
   - If you don't see this log, the console logging may not be implemented in your QR generation
   - Check the backend logs instead (see Debugging Commands section)
5. Copy the entire base64 string (starts with `eyJ` and is URL-safe characters only)

#### Step 2: Test in Scanner

1. Go to scanner page (`http://localhost:5173/scanner`)
2. Switch to "Manual Entry" mode (if auto-scan option is selected)
3. Paste the base64 string into the input field
4. Click "Verify QR Code"

#### Step 3: Verify Results

After clicking "Verify QR Code":
- **Success**: Green banner shows user details (name, ID, status)
- **Error**: Red banner explains the issue (QR not found, expired, invalid format)
- Check browser console for debug messages
- If verification fails, see Common Issues section below

### Option 3: Check Database Directly

Run this SQL query to see stored QR codes:

```sql
SELECT id, user_id, qr_data, created_at 
FROM qr_codes 
WHERE is_active = 1 
ORDER BY created_at DESC 
LIMIT 5;
```

Copy the `qr_data` value and paste it in manual entry.

## Common Issues

### Issue: "QR data not recognized"
- **Cause**: Pasting image data or corrupted text
- **Solution**: Make sure you're pasting the base64 string, not the image

### Issue: "QR code not found in system"
- **Cause**: QR code wasn't saved to database
- **Solution**: Regenerate the ID card and check backend logs

### Issue: "Invalid QR code format"
- **Cause**: Incomplete or corrupted base64 string
- **Solution**: Copy the entire string from console or database

## Debugging Commands

### Check Backend Logs
```bash
Get-Content backend/logs/combined.log -Tail 20
```

### Check Error Logs
```bash
Get-Content backend/logs/error.log -Tail 20
```

### Test QR Generation
1. Generate an ID card
2. Check console for: `QR code generated and stored`
3. Verify `qrId` and `userId` are logged

## Next Steps

Once you deploy to Render (with HTTPS), the camera will work properly on your phone without manual entry workarounds.
