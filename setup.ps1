# GateKeeper HQ Setup Script for Windows
# This script automates the setup process for the GateKeeper HQ system

Write-Host "🛡️  GateKeeper HQ Setup Script" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green

# Check if Node.js is installed
Write-Host "`n📋 Checking prerequisites..." -ForegroundColor Yellow

try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found!" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    Write-Host "After installation, restart PowerShell and run this script again." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if npm is available
try {
    $npmVersion = npm --version
    Write-Host "✅ npm found: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm not found!" -ForegroundColor Red
    Write-Host "npm should come with Node.js. Please reinstall Node.js." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Install dependencies
Write-Host "`n📦 Installing dependencies..." -ForegroundColor Yellow
Write-Host "This may take a few minutes..." -ForegroundColor Gray

try {
    # Install root dependencies
    Write-Host "Installing root dependencies..." -ForegroundColor Gray
    npm install

    # Install backend dependencies
    Write-Host "Installing backend dependencies..." -ForegroundColor Gray
    Set-Location backend
    npm install
    Set-Location ..

    # Install frontend dependencies
    Write-Host "Installing frontend dependencies..." -ForegroundColor Gray
    Set-Location frontend
    npm install
    Set-Location ..

    # Install shared dependencies
    Write-Host "Installing shared dependencies..." -ForegroundColor Gray
    Set-Location shared
    npm install
    Set-Location ..

    Write-Host "✅ All dependencies installed successfully!" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to install dependencies!" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Setup environment files
Write-Host "`n⚙️  Setting up environment files..." -ForegroundColor Yellow

if (!(Test-Path "backend/.env")) {
    if (Test-Path "backend/.env.example") {
        Copy-Item "backend/.env.example" "backend/.env"
        Write-Host "✅ Created backend/.env from template" -ForegroundColor Green
        Write-Host "⚠️  Please update backend/.env with your database credentials" -ForegroundColor Yellow
    } else {
        Write-Host "❌ backend/.env.example not found!" -ForegroundColor Red
    }
} else {
    Write-Host "✅ backend/.env already exists" -ForegroundColor Green
}

if (!(Test-Path "frontend/.env")) {
    # Create frontend .env file
    @"
VITE_API_URL=http://localhost:3001/api
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
"@ | Out-File -FilePath "frontend/.env" -Encoding UTF8
    Write-Host "✅ Created frontend/.env" -ForegroundColor Green
} else {
    Write-Host "✅ frontend/.env already exists" -ForegroundColor Green
}

# Database setup prompt
Write-Host "`n🗄️  Database Setup" -ForegroundColor Yellow
Write-Host "You need to set up a PostgreSQL database. Choose an option:" -ForegroundColor Gray
Write-Host "1. Use Supabase (Recommended - Free tier available)" -ForegroundColor Gray
Write-Host "2. Use local PostgreSQL" -ForegroundColor Gray
Write-Host "3. Skip for now (you can set up later)" -ForegroundColor Gray

$dbChoice = Read-Host "Enter your choice (1-3)"

switch ($dbChoice) {
    "1" {
        Write-Host "`n📝 Supabase Setup Instructions:" -ForegroundColor Cyan
        Write-Host "1. Go to https://supabase.com and create a free account" -ForegroundColor Gray
        Write-Host "2. Create a new project" -ForegroundColor Gray
        Write-Host "3. Go to Settings > Database" -ForegroundColor Gray
        Write-Host "4. Copy the connection string" -ForegroundColor Gray
        Write-Host "5. Update DATABASE_URL in backend/.env" -ForegroundColor Gray
        Write-Host "6. Also update SUPABASE_URL and SUPABASE_ANON_KEY" -ForegroundColor Gray
    }
    "2" {
        Write-Host "`n📝 Local PostgreSQL Setup:" -ForegroundColor Cyan
        Write-Host "1. Install PostgreSQL from https://www.postgresql.org/download/" -ForegroundColor Gray
        Write-Host "2. Create a database named 'gatekeeper_hq'" -ForegroundColor Gray
        Write-Host "3. Update DATABASE_URL in backend/.env with your local credentials" -ForegroundColor Gray
        Write-Host "   Example: postgresql://username:password@localhost:5432/gatekeeper_hq" -ForegroundColor Gray
    }
    "3" {
        Write-Host "⚠️  Database setup skipped. You'll need to configure it before running the app." -ForegroundColor Yellow
    }
    default {
        Write-Host "⚠️  Invalid choice. Database setup skipped." -ForegroundColor Yellow
    }
}

# Build shared package
Write-Host "`n🔧 Building shared package..." -ForegroundColor Yellow
try {
    Set-Location shared
    npm run build
    Set-Location ..
    Write-Host "✅ Shared package built successfully!" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to build shared package!" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
}

# Final instructions
Write-Host "`n🎉 Setup Complete!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green

Write-Host "`n📋 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Update backend/.env with your database credentials" -ForegroundColor Gray
Write-Host "2. Run database migrations: cd backend && npm run migrate" -ForegroundColor Gray
Write-Host "3. Seed demo data: cd backend && npm run seed" -ForegroundColor Gray
Write-Host "4. Start development: npm run dev" -ForegroundColor Gray

Write-Host "`n🔐 Default Login Credentials (after seeding):" -ForegroundColor Cyan
Write-Host "Admin: admin / admin123" -ForegroundColor Gray
Write-Host "Guard: guard / guard123" -ForegroundColor Gray

Write-Host "`n🌐 URLs:" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Gray
Write-Host "Backend API: http://localhost:3001" -ForegroundColor Gray
Write-Host "Scanner (PWA): http://localhost:5173/scanner" -ForegroundColor Gray

Write-Host "`n📚 For detailed instructions, see README.md" -ForegroundColor Yellow

Read-Host "`nPress Enter to exit"