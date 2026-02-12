@echo off
REM Start only the frontend dev server
setlocal enabledelayedexpansion

cd /d "%~dp0"

echo.
echo ========================================
echo Gatekeeper HQ - Frontend Dev Server
echo ========================================
echo.
echo Frontend will be available at: http://localhost:5173
echo.

cd frontend

echo Installing dependencies if needed...
if not exist "node_modules" (
    call npm install
)

echo.
echo Starting Vite dev server...
call npm run dev

pause
