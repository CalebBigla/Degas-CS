@echo off
echo ========================================
echo FULL RESET - Clearing all caches
echo ========================================

echo.
echo [1/4] Stopping any running processes...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo [2/4] Clearing Vite cache...
cd frontend
if exist node_modules\.vite (
    rmdir /s /q node_modules\.vite
    echo Vite cache cleared!
) else (
    echo No Vite cache found.
)
cd ..

echo.
echo [3/4] Clearing browser cache instructions:
echo Please do the following in your browser:
echo 1. Press Ctrl+Shift+Delete
echo 2. Select "Cached images and files"
echo 3. Click "Clear data"
echo OR
echo Press Ctrl+Shift+R for hard refresh

echo.
echo [4/4] Starting fresh dev server...
timeout /t 3 /nobreak >nul
npm run dev
