@echo off
echo ========================================
echo Degas CS System Verification
echo ========================================
echo.

echo [1/5] Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)
node --version
echo OK: Node.js is installed
echo.

echo [2/5] Checking backend dependencies...
cd backend
if not exist "node_modules" (
    echo WARNING: Backend dependencies not installed
    echo Run: cd backend && npm install
) else (
    echo OK: Backend dependencies found
)
cd ..
echo.

echo [3/5] Checking frontend dependencies...
cd frontend
if not exist "node_modules" (
    echo WARNING: Frontend dependencies not installed
    echo Run: cd frontend && npm install
) else (
    echo OK: Frontend dependencies found
)
cd ..
echo.

echo [4/5] Checking environment files...
if not exist "backend\.env" (
    echo WARNING: backend\.env not found
    echo Copying from backend\.env.example...
    copy "backend\.env.example" "backend\.env" >nul
    echo CREATED: backend\.env
) else (
    echo OK: backend\.env exists
)

if not exist "frontend\.env" (
    echo WARNING: frontend\.env not found
    echo Creating default frontend\.env...
    echo VITE_API_URL=http://localhost:3001/api > "frontend\.env"
    echo CREATED: frontend\.env
) else (
    echo OK: frontend\.env exists
)
echo.

echo [5/5] Checking database...
if not exist "backend\data\degas.db" (
    echo INFO: Database will be created on first run
) else (
    echo OK: Database exists
)
echo.

echo ========================================
echo System Verification Complete!
echo ========================================
echo.
echo To start the system:
echo 1. Open TWO command prompts
echo 2. In first prompt: cd backend && npm run dev
echo 3. In second prompt: cd frontend && npm run dev
echo 4. Open browser to http://localhost:5173
echo 5. Login with: admin / admin123
echo.
echo For detailed system info, see SYSTEM_CHECK_REPORT.md
echo.
pause
