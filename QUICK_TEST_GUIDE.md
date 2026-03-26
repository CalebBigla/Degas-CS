# Quick Test Guide

Fast reference for testing the attendance system.

## 🚀 Quick Start (3 Steps)

### 1. Start the Server
```bash
cd backend
npm run dev
```

Wait for: `✅ Backend initialization complete`

### 2. Run All Tests
**Windows:**
```bash
test-all.bat
```

**Mac/Linux:**
```bash
chmod +x test-all.sh
./test-all.sh
```

### 3. Check Results
All tests should show ✅ and end with "ALL TESTS PASSED! 🎉"

---

## 🧪 Individual Test Suites

```bash
cd backend

# Test forms (3 min)
node test-phase3.js

# Test onboarding (5 min)
node test-phase4-5.js

# Test attendance (7 min)
node test-phase6-8.js

# Test dashboard (5 min)
node test-phase9-10.js
```

---

## 🔧 Manual Testing (Postman/Thunder Client)

### Step 1: Admin Login
```http
POST http://localhost:10000/api/auth/login
Content-Type: application/json

{
  "email": "admin@degas.com",
  "password": "admin123"
}
```
**Save the token!**

### Step 2: Create Form
```http
POST http://localhost:10000/api/admin/forms
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "form_name": "Test Form",
  "target_table": "Students",
  "is_active": true,
  "fields": [
    {
      "field_name": "email",
      "field_label": "Email",
      "field_type": "email",
      "is_required": true,
      "is_email_field": true,
      "is_password_field": false,
      "field_order": 1
    },
    {
      "field_name": "password",
      "field_label": "Password",
      "field_type": "password",
      "is_required": true,
      "is_email_field": false,
      "is_password_field": true,
      "field_order": 2,
      "validation_rules": "{\"minLength\":8}"
    },
    {
      "field_name": "fullName",
      "field_label": "Full Name",
      "field_type": "text",
      "is_required": true,
      "is_email_field": false,
      "is_password_field": false,
      "field_order": 3
    }
  ]
}
```

### Step 3: Register User
```http
POST http://localhost:10000/api/onboarding/register
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "Test123!",
  "fullName": "Test User"
}
```
**Save the email and password!**

### Step 4: User Login
```http
POST http://localhost:10000/api/core-auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "Test123!"
}
```
**Save the user token!**

### Step 5: View Dashboard
```http
GET http://localhost:10000/api/user/dashboard
Authorization: Bearer USER_TOKEN
```

### Step 6: Create Session
```http
POST http://localhost:10000/api/admin/sessions
Authorization: Bearer ADMIN_TOKEN
Content-Type: application/json

{
  "session_name": "Test Session",
  "description": "Testing",
  "start_time": "2024-03-27T08:00:00Z",
  "end_time": "2024-03-27T09:00:00Z",
  "grace_period_minutes": 15,
  "is_active": true
}
```
**Note:** Use current dates!

### Step 7: Generate QR
```http
GET http://localhost:10000/api/admin/sessions/SESSION_ID/qr
Authorization: Bearer ADMIN_TOKEN
```
**Save the qrToken!**

### Step 8: Check In
```http
POST http://localhost:10000/api/attendance/scan
Authorization: Bearer USER_TOKEN
Content-Type: application/json

{
  "qrToken": "QR_TOKEN_FROM_STEP_7"
}
```

### Step 9: View Attendance
```http
GET http://localhost:10000/api/admin/sessions/SESSION_ID/attendance
Authorization: Bearer ADMIN_TOKEN
```

---

## ✅ Success Indicators

### Automated Tests
- All test suites show "✅" for each test
- Final message: "🎉 All tests passed"
- No "❌" marks

### Manual Tests
- All requests return `"success": true`
- Status codes are 200 or 201
- No 400, 401, 403, 500 errors

### Server Health
```http
GET http://localhost:10000/api/health
```
Should return:
```json
{
  "success": true,
  "ready": true,
  "database": {
    "status": "connected"
  }
}
```

---

## 🐛 Common Issues

### "Cannot connect to server"
```bash
# Check if server is running
curl http://localhost:10000/api/health

# If not, start it
cd backend
npm run dev
```

### "Database not initialized"
```bash
cd backend
npm run db:migrate
npm run db:seed
```

### "Admin login failed"
```bash
# Re-seed database
cd backend
npm run db:seed
```

### "Tests failing"
1. Stop server
2. Delete database: `rm backend/data/degas.db`
3. Run migrations: `npm run db:migrate`
4. Seed data: `npm run db:seed`
5. Restart server: `npm run dev`
6. Run tests again

---

## 📊 What Gets Tested

### Phase 3 (Forms)
- ✅ Form creation
- ✅ Form retrieval
- ✅ Form updates
- ✅ Form deletion
- ✅ Validation

### Phase 4-5 (Onboarding)
- ✅ User registration
- ✅ Image upload
- ✅ Email validation
- ✅ Duplicate prevention
- ✅ QR generation

### Phase 6-8 (Attendance)
- ✅ Session creation
- ✅ Session QR generation
- ✅ User check-in
- ✅ Duplicate prevention
- ✅ Time validation
- ✅ Attendance reports

### Phase 9-10 (Dashboard)
- ✅ User dashboard
- ✅ User statistics
- ✅ Admin user list
- ✅ User search
- ✅ Attendance overview

---

## 🎯 Next Steps After Testing

Once all tests pass:

1. ✅ Backend is verified working
2. 🎨 Build frontend UI
3. 📱 Integrate QR scanner
4. 🚀 Deploy to production

---

## 📚 More Information

- **Full Testing Guide**: `TESTING_INSTRUCTIONS.md`
- **API Reference**: `COMPLETE_API_REFERENCE.md`
- **Implementation Details**: `IMPLEMENTATION_COMPLETE.md`

---

**Total Test Time**: ~20 minutes (automated)  
**Manual Test Time**: ~10 minutes  
**Status**: ✅ Ready to test!
