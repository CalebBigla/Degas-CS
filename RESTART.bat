@echo off
echo Killing process on port 3001...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001"') do taskkill /PID %%a /F 2>nul

echo.
echo Waiting 2 seconds...
timeout /t 2 /nobreak

echo.
echo Starting development server...
npm run dev

pause
