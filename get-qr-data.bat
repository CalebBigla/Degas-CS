@echo off
echo ========================================
echo DEGAS-CS QR DATA EXTRACTOR
echo ========================================
echo.
echo This will show you the most recent QR codes from the database.
echo Copy the qr_data value and paste it in the scanner's manual entry.
echo.
echo ========================================
echo RECENT QR CODES:
echo ========================================
echo.

powershell -Command "Get-Content backend\logs\combined.log -Tail 50 | Select-String 'QR code generated' | Select-Object -Last 5"

echo.
echo ========================================
echo HOW TO USE:
echo ========================================
echo 1. Note the userId from the log above
echo 2. Go to: http://localhost:5173/scanner
echo 3. Click "Manual Entry" button
echo 4. Run this command to get the QR data:
echo.
echo    sqlite3 backend\data\degas.db "SELECT qr_data FROM qr_codes WHERE user_id='[USER_ID]' ORDER BY created_at DESC LIMIT 1"
echo.
echo 5. Or use DB Browser for SQLite to query the database
echo 6. Paste the QR data in manual entry field
echo.
echo NOTE: Install sqlite3 with: winget install SQLite.SQLite
echo Or use DB Browser: https://sqlitebrowser.org/
echo.
pause
