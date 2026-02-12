@echo off
echo ==========================================
echo NUCLEAR RESET - Force complete refresh
echo ==========================================

echo.
echo [1/5] Killing all Node processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo [2/5] Deleting Vite cache...
cd frontend
if exist node_modules\.vite rmdir /s /q node_modules\.vite
if exist dist rmdir /s /q dist
cd ..

echo.
echo [3/5] Deleting browser cache files...
echo Please clear browser cache manually:
echo   1. Open DevTools (F12)
echo   2. Right-click refresh button
echo   3. Select "Empty Cache and Hard Reload"

echo.
echo [4/5] Creating cache-busting timestamp...
echo /* Cache bust: %date% %time% */ > frontend\src\cache-bust.txt

echo.
echo [5/5] Starting dev server with --force flag...
timeout /t 2 /nobreak >nul
start cmd /k "npm run dev"

echo.
echo ==========================================
echo Server starting in new window...
echo.
echo IMPORTANT: After server starts:
echo 1. Go to browser
echo 2. Press Ctrl+Shift+R (hard refresh)
echo 3. Or press F12, right-click refresh, "Empty Cache and Hard Reload"
echo ==========================================
pause
