@echo off
echo ========================================
echo Restarting Degas CS System
echo ========================================
echo.

echo Stopping all Node processes...
taskkill /F /IM node.exe /T 2>nul
timeout /t 2 /nobreak >nul

echo.
echo Starting Backend...
cd backend
start "Degas Backend" cmd /k "npm run dev"
timeout /t 3 /nobreak >nul

echo.
echo Starting Frontend...
cd ..\frontend
start "Degas Frontend" cmd /k "npm run dev"

echo.
echo ========================================
echo System restarted!
echo Backend: http://localhost:10000
echo Frontend: http://localhost:5173
echo ========================================
echo.
echo Press any key to close this window...
pause >nul
