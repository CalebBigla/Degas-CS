# Query QR Codes from Database
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "QUERYING QR CODES FROM DATABASE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$dbPath = "backend\data\degas.db"

if (-not (Test-Path $dbPath)) {
    Write-Host "ERROR: Database not found at $dbPath" -ForegroundColor Red
    pause
    exit
}

# Check if sqlite3 is available
$sqliteCmd = Get-Command sqlite3 -ErrorAction SilentlyContinue

if ($sqliteCmd) {
    Write-Host "Fetching QR codes..." -ForegroundColor Yellow
    Write-Host ""
    
    $query = "SELECT id, user_id, substr(qr_data, 1, 50) as qr_preview, created_at, is_active FROM qr_codes ORDER BY created_at DESC LIMIT 5;"
    
    sqlite3 $dbPath $query
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "To get full QR data for a specific user:" -ForegroundColor Yellow
    Write-Host "sqlite3 backend\data\degas.db ""SELECT qr_data FROM qr_codes WHERE user_id='USER_ID_HERE' ORDER BY created_at DESC LIMIT 1;""" -ForegroundColor White
} else {
    Write-Host "SQLite3 not found. Install it with:" -ForegroundColor Yellow
    Write-Host "  winget install SQLite.SQLite" -ForegroundColor White
    Write-Host ""
    Write-Host "Or use DB Browser for SQLite:" -ForegroundColor Yellow
    Write-Host "  https://sqlitebrowser.org/" -ForegroundColor White
    Write-Host ""
    Write-Host "Then run this query:" -ForegroundColor Yellow
    Write-Host "  SELECT id, user_id, qr_data, created_at, is_active" -ForegroundColor White
    Write-Host "  FROM qr_codes" -ForegroundColor White
    Write-Host "  ORDER BY created_at DESC" -ForegroundColor White
    Write-Host "  LIMIT 5;" -ForegroundColor White
}

Write-Host ""
pause
