@echo off
echo Building shared package...
cd shared
call npm run build
cd ..

echo Installing frontend dependencies...
cd frontend
call npm install html-to-image jszip file-saver @types/file-saver
cd ..

echo Installing backend dependencies...
cd backend
call npm install archiver @types/archiver
cd ..

echo Starting development servers...
call npm run dev

pause