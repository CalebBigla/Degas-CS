@echo off
echo ========================================
echo   Enable Local HTTPS for Phone Testing
echo ========================================
echo.
echo This will install a basic SSL certificate
echo so your phone camera can work locally.
echo.
pause

echo.
echo Step 1: Installing @vitejs/plugin-basic-ssl...
cd frontend
call npm install @vitejs/plugin-basic-ssl --save-dev

echo.
echo Step 2: Certificate installed!
echo.
echo ========================================
echo   NEXT STEPS:
echo ========================================
echo.
echo 1. Restart your frontend server
echo 2. Access from phone using: https://192.168.1.224:5173
echo 3. Accept the security warning (it's safe - it's your own cert)
echo 4. Camera will work!
echo.
echo Note: You'll see a security warning because it's self-signed.
echo Just click "Advanced" then "Proceed" - it's completely safe.
echo.
pause
