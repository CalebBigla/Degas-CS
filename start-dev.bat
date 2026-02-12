@echo off
REM Start development server in CMD
cd /d "%~dp0"

echo.
echo ========================================
echo Gatekeeper HQ - Development Server
echo ========================================
echo.

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing root dependencies...
    call npm install
)

REM Check backend node_modules
if not exist "backend\node_modules" (
    echo Installing backend dependencies...
    cd backend
    call npm install
    cd ..
)

REM Check frontend node_modules
if not exist "frontend\node_modules" (
    echo Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
)

REM Check shared node_modules
if not exist "shared\node_modules" (
    echo Installing shared dependencies...
    cd shared
    call npm install
    cd ..
)

echo.
echo Starting development servers...
echo Frontend will be at: http://localhost:5173
echo Backend will be at: http://localhost:3001
echo.

npm run dev

pause
