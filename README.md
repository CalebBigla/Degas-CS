# GateKeeper HQ - High-Security QR Access Control System

A comprehensive access control system designed for high-traffic environments like Lagos corporate offices and estates. Features encrypted QR codes, visual verification, and real-time monitoring.

## 🚀 Features

### Admin Portal
- **User Management**: Add, edit, suspend, and revoke user access
- **Bulk Operations**: CSV/Excel import for mass user creation
- **ID Card Generation**: One-click PDF ID cards with encrypted QR codes
- **Analytics Dashboard**: Real-time insights and access logs
- **Role-based Access**: Super Admin, Admin, and Guard roles

### Scanner Interface (PWA)
- **High-Speed Scanning**: html5-qrcode integration for fast QR recognition
- **Visual Verification**: Immediate photo display for security verification
- **Offline Capability**: PWA functionality with local caching
- **Mobile Optimized**: App-like experience on tablets and phones
- **Audio/Visual Feedback**: Clear success/denial indicators

### Security Features
- **HMAC-Signed QR Codes**: Tamper-proof encrypted QR codes
- **JWT Authentication**: Secure admin authentication
- **Audit Logging**: Comprehensive access attempt tracking
- **Rate Limiting**: API protection against abuse
- **Data Encryption**: Secure storage of sensitive information

## 🛠 Technology Stack

- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL (Supabase compatible)
- **QR Scanning**: html5-qrcode library
- **PDF Generation**: react-pdf
- **Animations**: Framer Motion
- **Deployment**: Optimized for Render.com

## 📋 Prerequisites

Before setting up GateKeeper HQ, ensure you have:

- **Node.js** (v18 or higher) - [Download here](https://nodejs.org/)
- **PostgreSQL** database (local or Supabase)
- **Git** for version control

## 📱 Testing Scanner on Mobile Phone

For best QR scanning results, test the scanner on a mobile device:

1. **Quick Setup:**
   ```cmd
   setup-phone-access.bat
   ```
   This will configure firewall and show your PC's IP address.

2. **Manual Setup:**
   - Run `get-network-ip.ps1` to get your PC's IP
   - Add firewall rules for ports 5173 and 3001
   - Start the app with `npm start`
   - Connect phone to same WiFi
   - Open `http://YOUR_IP:5173` on phone browser

3. **Detailed Guide:**
   See [PHONE_ACCESS_GUIDE.md](PHONE_ACCESS_GUIDE.md) for complete instructions.

## 🚀 Quick Start

### 1. Install Node.js

If Node.js is not installed:

**Windows:**
- Download from [nodejs.org](https://nodejs.org/)
- Run the installer and follow the setup wizard
- Verify installation: Open Command Prompt and run `node --version`

**macOS:**
```bash
# Using Homebrew
brew install node

# Or download from nodejs.org
```

**Linux:**
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# CentOS/RHEL
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs
```

### 2. Clone and Setup

```bash
# Clone the repository
git clone <repository-url>
cd gatekeeper-hq

# Install all dependencies
npm run install:all

# Copy environment files
cp backend/.env.example backend/.env
```

### 3. Database Setup

#### Option A: Using Supabase (Recommended)

1. Create a free account at [supabase.com](https://supabase.com)
2. Create a new project
3. Get your database URL from Settings > Database
4. Update `backend/.env`:

```env
DATABASE_URL=postgresql://postgres:[password]@[host]:5432/postgres
SUPABASE_URL=https://[project-id].supabase.co
SUPABASE_ANON_KEY=[your-anon-key]
```

#### Option B: Local PostgreSQL

1. Install PostgreSQL locally
2. Create a database named `gatekeeper_hq`
3. Update `backend/.env`:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/gatekeeper_hq
```

### 4. Environment Configuration

Update `backend/.env` with your settings:

```env
# Database
DATABASE_URL=your_database_url_here

# JWT Secret (generate a strong random string)
JWT_SECRET=your_super_secret_jwt_key_here

# QR Code Secret (generate a strong random string)
QR_SECRET=your_qr_signing_secret_here

# Supabase (if using)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# Server
PORT=3001
NODE_ENV=development

# File Upload
UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760
```

Update `frontend/.env`:

```env
VITE_API_URL=http://localhost:3001/api
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 5. Initialize Database

```bash
# Run database migrations
cd backend
npm run migrate

# Seed with demo data
npm run seed
```

### 6. Start Development

```bash
# Start both frontend and backend
npm run dev

# Or start individually
npm run dev:backend  # Backend on http://localhost:3001
npm run dev:frontend # Frontend on http://localhost:5173
```

## 🔐 Default Login Credentials

After seeding the database:

- **Admin**: `admin` / `admin123`
- **Guard**: `guard` / `guard123`

## 📱 PWA Installation

The scanner interface works as a Progressive Web App:

1. Open the scanner page on a mobile device
2. Add to home screen when prompted
3. Use like a native app with offline capabilities

## 🚀 Production Deployment

### Render.com Deployment

1. **Create Render Account**: Sign up at [render.com](https://render.com)

2. **Database Setup**:
   - Create a PostgreSQL database service
   - Note the connection string

3. **Backend Deployment**:
   - Create a new Web Service
   - Connect your GitHub repository
   - Set build command: `npm run build:backend`
   - Set start command: `npm run start:backend`
   - Add environment variables from your `.env` file

4. **Frontend Deployment**:
   - Create a Static Site service
   - Set build command: `npm run build:frontend`
   - Set publish directory: `frontend/dist`

5. **Environment Variables**:
   ```
   DATABASE_URL=your_render_postgres_url
   JWT_SECRET=your_production_jwt_secret
   QR_SECRET=your_production_qr_secret
   NODE_ENV=production
   ```

### Manual Deployment

```bash
# Build for production
npm run build

# Start production server
npm start
```

## 📊 Usage Guide

### Admin Portal

1. **Login**: Use admin credentials to access the dashboard
2. **Add Users**: Click "Add User" to create new access profiles
3. **Bulk Upload**: Use CSV template for mass user creation
4. **Generate ID Cards**: Click user actions → "Download ID Card"
5. **Monitor Access**: View real-time logs in Analytics

### Scanner Interface

1. **Access Scanner**: Navigate to `/scanner` or use PWA
2. **Start Scanning**: Click "Start Scanner" to activate camera
3. **Scan QR Codes**: Point camera at QR codes for verification
4. **Visual Verification**: Check displayed photo matches the person
5. **Grant/Deny Access**: Based on system response and visual confirmation

### QR Code Security

- Each QR code contains encrypted user data
- HMAC signature prevents tampering
- Codes are unique per user and time-sensitive
- Invalid codes are immediately rejected

## 🔧 Development

### Project Structure

```
gatekeeper-hq/
├── backend/           # Node.js API server
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   └── config/
├── frontend/          # React application
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── lib/
├── shared/            # Shared TypeScript types
└── docs/              # Documentation
```

### Available Scripts

```bash
# Development
npm run dev              # Start both frontend and backend
npm run dev:backend      # Backend only
npm run dev:frontend     # Frontend only

# Building
npm run build           # Build all packages
npm run build:backend   # Build backend
npm run build:frontend  # Build frontend

# Database
npm run migrate         # Run database migrations
npm run seed           # Seed demo data

# Testing
npm test               # Run all tests
npm run test:backend   # Backend tests
npm run test:frontend  # Frontend tests
```

### Adding New Features

1. **Backend**: Add routes in `backend/src/routes/`
2. **Frontend**: Add components in `frontend/src/components/`
3. **Types**: Update shared types in `shared/src/types/`
4. **Database**: Add migrations in `backend/src/scripts/migrate.ts`

## 🐛 Troubleshooting

### Common Issues

**Node.js not found**:
- Install Node.js from [nodejs.org](https://nodejs.org/)
- Restart your terminal after installation

**Database connection failed**:
- Check your DATABASE_URL in `.env`
- Ensure PostgreSQL is running
- Verify database credentials

**QR Scanner not working**:
- Ensure HTTPS in production (required for camera access)
- Check browser permissions for camera
- Try different browsers (Chrome recommended)

**Build failures**:
- Clear node_modules: `rm -rf node_modules && npm install`
- Check Node.js version: `node --version` (should be 18+)

### Getting Help

- Check the [Issues](../../issues) page for known problems
- Create a new issue with detailed error information
- Include your environment details (OS, Node version, browser)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 🔒 Security

For security concerns, please email security@gatekeeper.com instead of using the issue tracker.

---

**GateKeeper HQ** - Securing access, one scan at a time. 🛡️