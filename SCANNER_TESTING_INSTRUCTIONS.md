# Scanner Testing Instructions

## Current Status

✅ Manual Entry feature added to scanner
✅ Backend logging enhanced for debugging
✅ QR data extraction tools created
⚠️ Camera scanning requires HTTPS (will work after Render deployment)

## Why Manual Entry is Needed

Browsers require HTTPS for camera access. Since you're testing on local network (HTTP), the camera won't work. Manual entry is a workaround until deployment.

## How to Test Scanner with Manual Entry

### Step 1: Generate an ID Card

1. Go to your table detail page: `http://localhost:5173/tables/[your-table-id]`
2. Click "Download ID Card" button for any user
3. The ID card PDF will download
4. Check browser console (F12) - you'll see testing instructions

### Step 2: Extract QR Data

You have 3 options:

#### Option A: Use PowerShell Script (Easiest)
```powershell
.\get-qr-for-testing.ps1
```
This will show you the QR data from the database.

#### Option B: Check Backend Logs
```powershell
Get-Content backend\logs\combined.log -Tail 30 | Select-String "QR code generated"
```
Look for the log entry with `qrId` and note the user ID.

#### Option C: Query Database Directly
```powershell
# If you have sqlite3 installed
sqlite3 backend\data\degas.db < backend\get-qr-data.sql
```

Or use DB Browser for SQLite:
1. Download from: https://sqlitebrowser.org/
2. Open: `backend\data\degas.db`
3. Execute query from: `backend\get-qr-data.sql`
4. Copy the `qr_data` value

### Step 3: Test in Scanner

1. Open scanner page: `http://localhost:5173/scanner`
2. Click "Manual Entry" button (top of page)
3. Paste the QR data (base64 string starting with "eyJ...")
4. Click "Verify QR Code"
5. You should see "ACCESS GRANTED" with user details

## Troubleshooting

### Error: "QR data not recognized"

**Cause**: Invalid data format
**Solution**: 
- Make sure you're pasting the base64 string, not the image
- The string should start with "eyJ" and be very long (200+ characters)
- Don't paste the full URL, just the base64 part after `/verify/`

### Error: "QR code not found in system"

**Cause**: QR code wasn't saved to database
**Solution**:
1. Check backend logs for errors during ID card generation
2. Regenerate the ID card
3. Verify database has the qr_codes table

### Error: "Invalid QR code format"

**Cause**: Corrupted or incomplete base64 string
**Solution**:
- Copy the entire base64 string from database
- Don't copy from PDF (won't work)
- Use the extraction methods above

## Testing on Phone (Local Network)

### Current Limitation
Camera won't work over HTTP on local network. You have 2 options:

#### Option 1: Use Manual Entry on Phone
1. Extract QR data on PC (using methods above)
2. Send QR data to your phone (email, messaging app)
3. Open scanner on phone: `http://192.168.1.224:5173/scanner`
4. Switch to "Manual Entry"
5. Paste QR data
6. Verify

#### Option 2: Wait for Render Deployment
Once deployed to Render with HTTPS, camera will work perfectly on phone!

## After Render Deployment

Once deployed with HTTPS:
1. Camera will work on all devices
2. No manual entry needed
3. Just point camera at QR code
4. Instant verification

## Quick Reference

### Backend is Running
```
http://localhost:3001
```

### Frontend is Running
```
http://localhost:5173
```

### Scanner Page
```
http://localhost:5173/scanner
```

### Phone Access (Local Network)
```
http://192.168.1.224:5173/scanner
```

### Check Backend Logs
```powershell
Get-Content backend\logs\combined.log -Tail 20
Get-Content backend\logs\error.log -Tail 20
```

### Extract QR Data
```powershell
.\get-qr-for-testing.ps1
```

## What's Working

✅ QR code generation and storage
✅ QR code verification logic
✅ Access logging
✅ Manual entry scanner
✅ Database integration
✅ User verification
✅ Access granted/denied flow

## What Needs HTTPS

❌ Camera access on phone
❌ Camera access on PC (over network)

## Next Steps

1. Test manual entry with extracted QR data
2. Verify access logs are being created
3. Deploy to Render for full camera functionality
4. Test camera scanning on phone after deployment

## Support Files Created

- `QR_TESTING_GUIDE.md` - Detailed testing guide
- `get-qr-for-testing.ps1` - PowerShell script to extract QR data
- `backend/get-qr-data.sql` - SQL query to get QR data
- Enhanced logging in backend for debugging

## Questions?

If manual entry still shows "QR data not recognized":
1. Check that QR code was actually generated (check logs)
2. Verify the base64 string is complete
3. Try generating a new ID card
4. Check backend error logs for specific error messages
