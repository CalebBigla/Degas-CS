@echo off
echo ========================================
echo   Starting Degas-CS System
echo ========================================
echo.
echo Backend will run in this window
echo Frontend will open in a new window
echo.
echo Press Ctrl+C in either window to stop
echo ========================================
echo.

REM Start frontend in new window
start "Degas-CS Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

REM Wait a moment for frontend to start
timeout /t 2 /nobreak >nul

REM Start backend in current window
cd /d %~dp0backend
echo Building backend...
npm run build
echo Starting backend...
npm start
