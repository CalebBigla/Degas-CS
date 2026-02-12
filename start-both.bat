@echo off
echo ========================================
echo   Starting Degas-CS System
echo ========================================
echo.
echo Starting Backend and Frontend servers...
echo.
echo Backend will run in this window
echo Frontend will open in a new window
echo.
echo Press Ctrl+C in either window to stop
echo ========================================
echo.

REM Start frontend in new window
start "Degas-CS Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

REM Start backend in current window
cd /d %~dp0backend
npm start
