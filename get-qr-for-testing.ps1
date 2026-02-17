# Get QR Data for Testing
# This script extracts QR data from the database for manual scanner testing

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "DEGAS-CS QR DATA EXTRACTOR" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$dbPath = "backend\data\degas.db"

if (-not (Test-Path $dbPath)) {
    Write-Host "ERROR: Database not found at $dbPath" -ForegroundColor Red
    Write-Host "Make sure you're running this from the project root directory" -ForegroundColor Yellow
    pause
    exit
}

Write-Host "Extracting QR codes from database..." -ForegroundColor Yellow
Write-Host ""

# Use sqlite3 command if available, otherwise provide manual instructions
$sqliteCmd = Get-Command sqlite3 -ErrorAction SilentlyContinue

if ($sqliteCmd) {
    # Run query
    $query = @"
SELECT 
    'QR ID: ' || qc.id || char(10) ||
    'User: ' || json_extract(du.data, '$.Name') || char(10) ||
    'Table: ' || t.name || char(10) ||
    'Created: ' || qc.created_at || char(10) ||
    'QR Data: ' || qc.qr_data || char(10) ||
    '----------------------------------------'
FROM qr_codes qc
JOIN dynamic_users du ON qc.user_id = du.id
JOIN tables t ON qc.table_id = t.id
WHERE qc.is_active = 1
ORDER BY qc.created_at DESC
LIMIT 3;
"@
    
    sqlite3 $dbPath $query
} else {
    Write-Host "SQLite3 command not found. Here's how to get QR data manually:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Option 1: Check Backend Logs" -ForegroundColor Cyan
    Write-Host "  Get-Content backend\logs\combined.log -Tail 30 | Select-String 'QR code generated'" -ForegroundColor White
    Write-Host ""
    Write-Host "Option 2: Use DB Browser for SQLite" -ForegroundColor Cyan
    Write-Host "  1. Download from: https://sqlitebrowser.org/" -ForegroundColor White
    Write-Host "  2. Open: backend\data\degas.db" -ForegroundColor White
    Write-Host "  3. Run query from: backend\get-qr-data.sql" -ForegroundColor White
    Write-Host ""
    Write-Host "Option 3: Install SQLite3" -ForegroundColor Cyan
    Write-Host "  winget install SQLite.SQLite" -ForegroundColor White
    Write-Host "  Then run this script again" -ForegroundColor White
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "HOW TO USE QR DATA" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "1. Copy the QR Data value (long base64 string)" -ForegroundColor White
Write-Host "2. Go to: http://localhost:5173/scanner" -ForegroundColor White
Write-Host "3. Click 'Manual Entry' button" -ForegroundColor White
Write-Host "4. Paste the QR Data" -ForegroundColor White
Write-Host "5. Click 'Verify QR Code'" -ForegroundColor White
Write-Host ""
Write-Host "NOTE: Once deployed to Render with HTTPS," -ForegroundColor Yellow
Write-Host "your phone camera will work directly!" -ForegroundColor Yellow
Write-Host ""

pause
