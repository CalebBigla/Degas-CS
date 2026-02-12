# Degas-CS Access Control System - Documentation

## Overview

Degas-CS is a production-ready access control and ID card management system with QR code scanning capabilities.

## Key Features

### ✅ Dynamic Table System
- Create tables via CSV import or manual creation
- Fully dynamic columns (no hardcoded fields)
- Each table can have different column structures
- Live user count per table

### ✅ ID Card Generation
- Per-table customization (select which columns to display)
- Photo support (optional)
- QR code embedded for scanning
- Bulk generation with ZIP export
- Clean layout with no field labels (values only)

### ✅ QR Code Scanner
- Real-time camera scanning
- Instant verification
- Access granted/denied feedback
- Automatic logging to database

### ✅ Access Logs
- Every scan is logged (success and failure)
- Searchable and filterable
- Shows user info, table, status, timestamp
- Pagination support

### ✅ Dashboard
- Live statistics from database:
  - Total Users
  - Total Scanned
  - Total Access Granted
  - Total Access Denied
- Quick CSV upload
- Real-time updates

## Quick Start

### 1. Start the System
```cmd
RUN.bat
```

This starts both backend (port 5000) and frontend (port 5173).

### 2. Login
- Default admin: `admin` / `admin123`
- Default guard: `guard` / `guard123`

### 3. Create Your First Table

**Option A: Import CSV**
1. Go to Tables page
2. Click "Import CSV"
3. Upload your CSV file
4. System auto-creates table with columns from CSV headers

**Option B: Manual Creation**
1. Go to Tables page
2. Click "Create Table"
3. Add table name and columns
4. Define column types (text, email, number, date, boolean, select)
5. Save

### 4. Add Users
1. Open a table
2. Click "Add User"
3. Fill in the dynamic form (based on table columns)
4. Upload photo (optional)
5. Save

### 5. Customize ID Cards
1. Open a table
2. Click "Customize ID Cards"
3. Select which columns to show on ID cards
4. Choose layout, theme, font size
5. Toggle photo display
6. Save

### 6. Generate ID Cards
- **Single**: Click download icon on any user row
- **Bulk**: Select users → Click "Bulk Generate ID Cards"
- Downloads as PDF or ZIP file

### 7. Scan QR Codes
1. Go to Scanner page
2. Click "Start Scanner"
3. Point camera at QR code
4. System verifies and logs access
5. Check Access Logs page to see history

## System Architecture

### Backend (Node.js + TypeScript)
- **Database**: SQLite (production-ready, can migrate to PostgreSQL)
- **API**: RESTful endpoints
- **Services**:
  - PDF generation (pdf-lib)
  - QR code generation (qrcode)
  - Image processing (sharp)
  - Authentication (JWT)

### Frontend (React + TypeScript)
- **UI**: Tailwind CSS with custom design system
- **State**: React Query for server state
- **Routing**: React Router
- **Scanner**: html5-qrcode library

### Database Tables
- `admins` - System administrators
- `tables` - Dynamic table definitions
- `dynamic_users` - User data (JSON storage for flexibility)
- `access_logs` - Scan history
- `qr_codes` - Generated QR codes
- `id_card_settings` - Global ID card settings
- `id_card_templates` - ID card templates

## Important Files

### Configuration
- `backend/.env` - Backend environment variables
- `frontend/.env` - Frontend environment variables
- `backend/src/config/sqlite.ts` - Database schema

### Key Controllers
- `backend/src/controllers/tableController.ts` - Table and user management
- `backend/src/controllers/scannerController.ts` - QR scanning and verification
- `backend/src/controllers/analyticsController.ts` - Dashboard and logs

### Key Services
- `backend/src/services/pdfService.ts` - ID card PDF generation
- `backend/src/services/qrService.ts` - QR code generation and verification
- `backend/src/services/imageService.ts` - Image processing

### Frontend Pages
- `frontend/src/pages/DashboardPage.tsx` - Dashboard with statistics
- `frontend/src/pages/TablesPage.tsx` - Table management
- `frontend/src/pages/TableDetailPage.tsx` - User management per table
- `frontend/src/pages/ScannerPage.tsx` - QR code scanner
- `frontend/src/pages/AccessLogsPage.tsx` - Access log history

## Database Migration

If you need to add the `id_card_config` column (for per-table customization):

```cmd
cd backend
node add-id-card-config-column.js
```

## Utility Scripts

### Clear Cache and Restart
```cmd
clear-cache-and-restart.bat
```

### Full Reset (WARNING: Deletes all data)
```cmd
nuclear-reset.bat
```

### Fix Database Issues
```cmd
cd backend
node fix-database.js
```

### Flush Access Logs
```cmd
cd backend
node flush-access-logs.js
```

## Production Deployment

See `DEPLOYMENT.md` for detailed deployment instructions including:
- Render.com deployment
- Environment variables
- Database migration
- SSL configuration

## Testing

See `TESTING_GUIDE.md` for comprehensive testing procedures.

## Troubleshooting

### Backend won't start
1. Check if port 5000 is available
2. Verify `backend/.env` exists
3. Run `npm install` in backend folder

### Frontend won't start
1. Check if port 5173 is available
2. Verify `frontend/.env` exists
3. Run `npm install` in frontend folder

### Database errors
1. Check if `backend/data/degas.db` exists
2. Run `node fix-database.js` in backend folder
3. Check file permissions

### ID cards not generating
1. Verify table has users
2. Check if customization is saved
3. Look at backend logs for errors

### Scanner not working
1. Allow camera permissions in browser
2. Use HTTPS (required for camera access)
3. Check if QR code is valid

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Tables
- `GET /api/tables` - List all tables
- `POST /api/tables` - Create table
- `GET /api/tables/:id` - Get table details
- `DELETE /api/tables/:id` - Delete table
- `GET /api/tables/:id/id-card-config` - Get ID card config
- `PUT /api/tables/:id/id-card-config` - Update ID card config

### Users
- `GET /api/tables/:tableId/users` - List users in table
- `POST /api/tables/:tableId/users` - Add user to table
- `PUT /api/tables/:tableId/users/:userId` - Update user
- `DELETE /api/tables/:tableId/users/:userId` - Delete user

### ID Cards
- `POST /api/tables/:tableId/users/:userId/card/custom` - Generate single ID card
- `POST /api/tables/:tableId/bulk-id-cards` - Generate bulk ID cards

### Scanner
- `POST /api/scanner/verify` - Verify QR code

### Analytics
- `GET /api/analytics/dashboard` - Dashboard statistics
- `GET /api/analytics/access-logs` - Access log history

## Security Features

- JWT-based authentication
- Role-based access control (admin, super_admin, guard)
- Password hashing with bcrypt
- SQL injection prevention
- XSS protection
- CORS configuration
- Rate limiting (recommended for production)

## Best Practices

### Table Design
- Use clear, descriptive column names
- Avoid special characters in column names
- Keep column names consistent across tables
- Use appropriate data types

### User Management
- Always upload photos for better identification
- Use unique identifiers (employee ID, student ID, etc.)
- Keep user data up to date

### ID Card Customization
- Select only essential fields for ID cards
- Test ID card layout before bulk generation
- Use consistent themes across organization

### Scanner Usage
- Ensure good lighting for scanning
- Hold QR code steady
- Use dedicated scanner device for high-traffic areas

## Support

For issues or questions:
1. Check this documentation
2. Review `TESTING_GUIDE.md`
3. Check backend logs in `backend/logs/`
4. Review `DEPLOYMENT.md` for production issues

## Version

Current Version: 1.0.0
Last Updated: February 2026

## License

Proprietary - All rights reserved
