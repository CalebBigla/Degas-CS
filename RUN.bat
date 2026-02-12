@echo off
cd /d "%~dp0"

echo.
echo ========================================
echo   Starting Frontend Dev Server
echo ========================================
echo.

cd frontend
npm run dev

pause
