# Degas CS - Quick Start Guide

## 🚀 Getting Started

### 1. Start the System

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend  
cd frontend
npm run dev
```

### 2. Login
- URL: `http://localhost:5173`
- Username: `admin`
- Password: `admin123`

---

## 📋 Common Tasks

### Create a Table from CSV

1. Click "Dashboard" in sidebar
2. Click "Upload CSV" button
3. Select your CSV file
4. System automatically:
   - Creates table
   - Imports users
   - Generates QR codes
   - Stores everything in database

### Generate ID Cards

**Single User:**
1. Go to table detail page
2. Click user row
3. Click "Generate ID Card"
4. PDF downloads with photo and QR code

**Bulk Download:**
1. Select multiple users (checkboxes)
2. Click "Bulk Download"
3. Customize options:
   - Format (PDF/JPEG)
   - Visible fields
   - Layout (standard/compact/detailed)
   - Theme (light/dark/corporate)
4. Click "Generate & Download ZIP"
5. ZIP file downloads with all cards

### Scan QR Codes

**Using Scanner Page:**
1. Click "Scanner" in sidebar
2. Allow camera access
3. Point camera at QR code
4. System automatically:
   - Reads QR code
   - Verifies signature
   - Looks up in database
   - Displays user info
   - Logs access attempt

**Verification Shows:**
- User photo
- Full name
- State code/ID
- Designation/role
- Access status (granted/denied)
- Timestamp

### View Access Logs

1. Click "Access Logs" in sidebar
2. View all scan attempts
3. Filter by:
   - Status (granted/denied)
   - Location
   - Date range
4. Search by user name or location
5. Export to CSV for reports

---

## 🔑 Key Features

### ✅ What Works Now

**User Management:**
- Create, edit, delete users
- Upload photos
- Bulk import from CSV
- Multi-table support

**QR Code System:**
- Automatic generation
- Database storage
- User information embedded
- Signature verification
- Scan tracking

**ID Card Generation:**
- PDF format with embedded photos
- Customizable layouts and themes
- Bulk generation
- ZIP download

**Scanner:**
- Live camera scanning
- Database verification
- User profile display
- Access logging

**Access Logs:**
- All scans recorded
- Filterable and searchable
- CSV export
- Statistics dashboard

---

## 📊 System Architecture

### Database Tables

**tables** - Stores table definitions
- id, name, description, schema

**dynamic_users** - Stores user data
- id, table_id, uuid, data, photo_url

**qr_codes** - Stores QR code data
- id, user_id, table_id, qr_data, scan_count

**access_logs** - Stores scan attempts
- id, user_id, table_id, qr_code_id, access_granted

**admins** - Stores admin users
- id, username, password_hash, role

### API Endpoints

**Authentication:**
- POST `/api/auth/login` - Login
- POST `/api/auth/logout` - Logout

**Tables:**
- GET `/api/tables` - List tables
- POST `/api/tables` - Create table
- POST `/api/tables/upload-csv` - Import CSV

**Users:**
- GET `/api/tables/:tableId/users` - List users
- POST `/api/tables/:tableId/users` - Add user
- PUT `/api/tables/:tableId/users/:userId` - Update user
- DELETE `/api/tables/:tableId/users/:userId` - Delete user

**Scanner:**
- POST `/api/scanner/verify` - Verify QR code
- GET `/api/scanner/logs` - Get access logs

**Downloads:**
- POST `/api/tables/:tableId/bulk-download` - Bulk download

---

## 🎯 Workflow Examples

### Complete Onboarding Flow

1. **Prepare CSV File:**
   ```csv
   fullName,stateCode,designation,email,department
   John Doe,EMP001,Engineer,john@example.com,IT
   Jane Smith,EMP002,Manager,jane@example.com,HR
   ```

2. **Import Users:**
   - Upload CSV via Dashboard
   - Table created automatically
   - Users imported with QR codes

3. **Add Photos:**
   - Click each user
   - Upload photo
   - Photo stored and linked

4. **Generate ID Cards:**
   - Select all users
   - Bulk download
   - Distribute cards

5. **Setup Scanner:**
   - Open scanner page
   - Allow camera access
   - Ready to scan

6. **Monitor Access:**
   - View access logs
   - Filter and search
   - Export reports

### Daily Operations

**Morning:**
- Check access logs from previous day
- Review any denied access attempts
- Export daily report

**During Day:**
- Scan QR codes for access control
- Add new users as needed
- Generate ID cards for new users

**End of Day:**
- Review access statistics
- Export logs for records
- Check for any issues

---

## 🔧 Troubleshooting

### Photos Not Showing
- ✅ FIXED - Photos now embed correctly
- Ensure photo uploaded before generating card
- Supported formats: JPG, JPEG, PNG

### QR Code Not Verifying
- ✅ FIXED - QR codes stored in database
- Ensure QR code generated after latest update
- Check scanner has camera permission

### Bulk Download Not Working
- ✅ FIXED - Export issue resolved
- Ensure users selected before clicking
- Check browser allows downloads

### Access Logs Empty
- ✅ FIXED - Logging system complete
- Logs appear after QR scans
- Check date range filter

---

## 📱 Scanner Usage

### For Guards/Security:

1. **Open Scanner:**
   - Navigate to scanner page
   - Allow camera access

2. **Scan QR Code:**
   - Point camera at ID card
   - Wait for automatic detection
   - No need to click anything

3. **Check Result:**
   - Green = Access Granted
   - Red = Access Denied
   - User info displayed

4. **Next Scan:**
   - Click "Scan Again"
   - Ready for next person

### Tips:
- Good lighting helps
- Hold steady
- Center QR in frame
- Wait for beep/vibration

---

## 💾 Data Management

### Backup
```bash
# Backup database
cp backend/data/degas.db backend/data/degas.db.backup

# Backup uploads
cp -r backend/uploads backend/uploads.backup
```

### Export Data
- Access logs: Use "Export CSV" button
- User data: Download from table view
- ID cards: Use bulk download

### Import Data
- CSV import: Use "Upload CSV" button
- Photos: Upload individually or bulk

---

## 🎨 Customization

### ID Card Themes
- **Light:** White background, dark text
- **Dark:** Dark background, light text
- **Corporate:** Professional blue/gold theme

### Layouts
- **Standard:** Full information display
- **Compact:** Minimal information
- **Detailed:** Maximum information

### Visible Fields
- Name, Photo, Role, Department
- Email, State Code, Table Name
- Custom fields from CSV

---

## 📈 Analytics

### Current Stats Available:
- Total scans
- Access granted count
- Access denied count
- Recent activity

### Coming Soon:
- Real-time charts
- Peak hours analysis
- User activity trends
- Location breakdown

---

## 🔐 Security

### Features:
- JWT authentication
- HMAC-signed QR codes
- Timestamp validation
- Access logging
- IP address tracking

### Best Practices:
- Change default passwords
- Regular log reviews
- Backup database regularly
- Monitor denied access
- Update QR codes periodically

---

## 📞 Support

### Common Questions:

**Q: Can I use my own CSV format?**
A: Yes, system auto-detects columns and types.

**Q: How many users can I import?**
A: Up to 10,000 users per CSV file.

**Q: Can I have multiple tables?**
A: Yes, unlimited tables supported.

**Q: Do QR codes expire?**
A: Yes, after 24 hours by default.

**Q: Can I regenerate QR codes?**
A: Yes, generate new ID card to get new QR.

---

## ✅ System Status

**All Features Working:**
- ✅ Photo embedding
- ✅ QR code generation and storage
- ✅ Scanner verification
- ✅ Bulk download
- ✅ Access logs
- ✅ CSV import/export
- ✅ User management
- ✅ Table management

**Production Ready:** YES ✅

---

*Quick Start Guide - Version 2.0*
*Last Updated: February 6, 2026*
*System Status: Fully Operational*
