#!/bin/bash

# GateKeeper HQ Setup Script for Unix/Linux/macOS
# This script automates the setup process for the GateKeeper HQ system

echo "🛡️  GateKeeper HQ Setup Script"
echo "================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;37m'
NC='\033[0m' # No Color

# Check if Node.js is installed
echo -e "\n📋 Checking prerequisites..."

if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✅ Node.js found: $NODE_VERSION${NC}"
else
    echo -e "${RED}❌ Node.js not found!${NC}"
    echo -e "${YELLOW}Please install Node.js from https://nodejs.org/${NC}"
    echo -e "${YELLOW}Or use a package manager:${NC}"
    echo -e "${GRAY}  macOS: brew install node${NC}"
    echo -e "${GRAY}  Ubuntu: curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs${NC}"
    echo -e "${YELLOW}After installation, restart your terminal and run this script again.${NC}"
    read -p "Press Enter to exit"
    exit 1
fi

# Check if npm is available
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✅ npm found: $NPM_VERSION${NC}"
else
    echo -e "${RED}❌ npm not found!${NC}"
    echo -e "${YELLOW}npm should come with Node.js. Please reinstall Node.js.${NC}"
    read -p "Press Enter to exit"
    exit 1
fi

# Install dependencies
echo -e "\n📦 Installing dependencies..."
echo -e "${GRAY}This may take a few minutes...${NC}"

# Install root dependencies
echo -e "${GRAY}Installing root dependencies...${NC}"
if npm install; then
    echo -e "${GREEN}✅ Root dependencies installed${NC}"
else
    echo -e "${RED}❌ Failed to install root dependencies!${NC}"
    exit 1
fi

# Install backend dependencies
echo -e "${GRAY}Installing backend dependencies...${NC}"
if (cd backend && npm install); then
    echo -e "${GREEN}✅ Backend dependencies installed${NC}"
else
    echo -e "${RED}❌ Failed to install backend dependencies!${NC}"
    exit 1
fi

# Install frontend dependencies
echo -e "${GRAY}Installing frontend dependencies...${NC}"
if (cd frontend && npm install); then
    echo -e "${GREEN}✅ Frontend dependencies installed${NC}"
else
    echo -e "${RED}❌ Failed to install frontend dependencies!${NC}"
    exit 1
fi

# Install shared dependencies
echo -e "${GRAY}Installing shared dependencies...${NC}"
if (cd shared && npm install); then
    echo -e "${GREEN}✅ Shared dependencies installed${NC}"
else
    echo -e "${RED}❌ Failed to install shared dependencies!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All dependencies installed successfully!${NC}"

# Setup environment files
echo -e "\n⚙️  Setting up environment files..."

if [ ! -f "backend/.env" ]; then
    if [ -f "backend/.env.example" ]; then
        cp backend/.env.example backend/.env
        echo -e "${GREEN}✅ Created backend/.env from template${NC}"
        echo -e "${YELLOW}⚠️  Please update backend/.env with your database credentials${NC}"
    else
        echo -e "${RED}❌ backend/.env.example not found!${NC}"
    fi
else
    echo -e "${GREEN}✅ backend/.env already exists${NC}"
fi

if [ ! -f "frontend/.env" ]; then
    cat > frontend/.env << EOF
VITE_API_URL=http://localhost:3001/api
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
EOF
    echo -e "${GREEN}✅ Created frontend/.env${NC}"
else
    echo -e "${GREEN}✅ frontend/.env already exists${NC}"
fi

# Database setup prompt
echo -e "\n🗄️  Database Setup"
echo -e "${GRAY}You need to set up a PostgreSQL database. Choose an option:${NC}"
echo -e "${GRAY}1. Use Supabase (Recommended - Free tier available)${NC}"
echo -e "${GRAY}2. Use local PostgreSQL${NC}"
echo -e "${GRAY}3. Skip for now (you can set up later)${NC}"

read -p "Enter your choice (1-3): " db_choice

case $db_choice in
    1)
        echo -e "\n${CYAN}📝 Supabase Setup Instructions:${NC}"
        echo -e "${GRAY}1. Go to https://supabase.com and create a free account${NC}"
        echo -e "${GRAY}2. Create a new project${NC}"
        echo -e "${GRAY}3. Go to Settings > Database${NC}"
        echo -e "${GRAY}4. Copy the connection string${NC}"
        echo -e "${GRAY}5. Update DATABASE_URL in backend/.env${NC}"
        echo -e "${GRAY}6. Also update SUPABASE_URL and SUPABASE_ANON_KEY${NC}"
        ;;
    2)
        echo -e "\n${CYAN}📝 Local PostgreSQL Setup:${NC}"
        echo -e "${GRAY}1. Install PostgreSQL:${NC}"
        echo -e "${GRAY}   macOS: brew install postgresql${NC}"
        echo -e "${GRAY}   Ubuntu: sudo apt-get install postgresql postgresql-contrib${NC}"
        echo -e "${GRAY}2. Create a database named 'gatekeeper_hq'${NC}"
        echo -e "${GRAY}3. Update DATABASE_URL in backend/.env with your local credentials${NC}"
        echo -e "${GRAY}   Example: postgresql://username:password@localhost:5432/gatekeeper_hq${NC}"
        ;;
    3)
        echo -e "${YELLOW}⚠️  Database setup skipped. You'll need to configure it before running the app.${NC}"
        ;;
    *)
        echo -e "${YELLOW}⚠️  Invalid choice. Database setup skipped.${NC}"
        ;;
esac

# Build shared package
echo -e "\n🔧 Building shared package..."
if (cd shared && npm run build); then
    echo -e "${GREEN}✅ Shared package built successfully!${NC}"
else
    echo -e "${RED}❌ Failed to build shared package!${NC}"
fi

# Final instructions
echo -e "\n${GREEN}🎉 Setup Complete!${NC}"
echo -e "${GREEN}=================================${NC}"

echo -e "\n${YELLOW}📋 Next Steps:${NC}"
echo -e "${GRAY}1. Update backend/.env with your database credentials${NC}"
echo -e "${GRAY}2. Run database migrations: cd backend && npm run migrate${NC}"
echo -e "${GRAY}3. Seed demo data: cd backend && npm run seed${NC}"
echo -e "${GRAY}4. Start development: npm run dev${NC}"

echo -e "\n${CYAN}🔐 Default Login Credentials (after seeding):${NC}"
echo -e "${GRAY}Admin: admin / admin123${NC}"
echo -e "${GRAY}Guard: guard / guard123${NC}"

echo -e "\n${CYAN}🌐 URLs:${NC}"
echo -e "${GRAY}Frontend: http://localhost:5173${NC}"
echo -e "${GRAY}Backend API: http://localhost:3001${NC}"
echo -e "${GRAY}Scanner (PWA): http://localhost:5173/scanner${NC}"

echo -e "\n${YELLOW}📚 For detailed instructions, see README.md${NC}"

read -p "Press Enter to exit"