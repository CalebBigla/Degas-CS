@echo off
echo Clearing Vite cache...
cd frontend
if exist node_modules\.vite (
    rmdir /s /q node_modules\.vite
    echo Cache cleared!
) else (
    echo No cache found.
)
cd ..

echo.
echo Restarting dev server...
npm run dev
