@echo off
echo ========================================
echo Testing Attendance System - All Phases
echo ========================================
echo.

cd backend

echo [1/4] Testing Phase 3: Form System...
echo ----------------------------------------
node test-phase3.js
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Phase 3 tests failed!
    pause
    exit /b 1
)
echo.
echo.

echo [2/4] Testing Phase 4-5: User Onboarding...
echo ----------------------------------------
node test-phase4-5.js
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Phase 4-5 tests failed!
    pause
    exit /b 1
)
echo.
echo.

echo [3/4] Testing Phase 6-8: Attendance System...
echo ----------------------------------------
node test-phase6-8.js
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Phase 6-8 tests failed!
    pause
    exit /b 1
)
echo.
echo.

echo [4/4] Testing Phase 9-10: Dashboard & Admin...
echo ----------------------------------------
node test-phase9-10.js
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Phase 9-10 tests failed!
    pause
    exit /b 1
)
echo.
echo.

echo ========================================
echo ALL TESTS PASSED! 🎉
echo ========================================
echo.
echo The attendance system is working correctly!
echo You can now proceed with frontend development.
echo.
pause
