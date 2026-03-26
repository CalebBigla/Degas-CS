# 🎯 Attendance & User Onboarding System - Implementation Roadmap

## 📋 Overview
This document outlines the incremental implementation of a complete user onboarding and attendance tracking system that **extends** the existing GateKeeper HQ system without breaking any current functionality.

## 🔒 Core Principles
1. **NON-BREAKING**: All existing features remain functional
2. **ADDITIVE**: New tables, APIs, and modules only
3. **ISOLATED**: Core user system separate from dynamic tables
4. **BACKWARD COMPATIBLE**: Existing QR/access control unchanged

---

## 📊 Implementation Status

### ✅ COMPLETED
- [x] Database schema design (001_core_users.sql)
- [x] TypeScript type definitions
- [x] Migration script integration
- [x] Phase 1: Core User System
- [x] Phase 2: User-Data Linking
- [x] Phase 3: CMS Form System
- [x] Phase 4: User Onboarding Flow
- [x] Phase 5: Image Upload Support
- [x] Phase 6: Attendance Session Management
- [x] Phase 7: Session QR Generation
- [x] Phase 8: Attendance Scanning
- [x] Phase 9: User Dashboard
- [x] Phase 10: Admin Features

### 🎉 ALL PHASES COMPLETE!

### ⏳ RECOMMENDED NEXT STEPS
- [ ] Frontend UI components
- [ ] End-to-end testing
- [ ] Production deployment
- [ ] User documentation

---

## 🏗️ PHASE-BY-PHASE BREAKDOWN

### **PHASE 1: Core User System** ⏱️ 30 mins
**Goal**: Create authentication layer separate from dynamic tables

**Backend Tasks**:
1. Create `CoreUserService` (`backend/src/services/coreUserService.ts`)
2. Create `CoreAuthController` (`backend/src/controllers/coreAuthController.ts`)
3. Add routes (`backend/src/routes/coreAuth.ts`)
4. Implement:
   - `POST /api/core-auth/register` - Create core user
   - `POST /api/core-auth/login` - Email/password login
   - `GET /api/core-auth/me` - Get current user

**Database**:
- `core_users` table (already created in migration)

**Security**:
- bcrypt password hashing
- JWT token generation
- Separate from admin authentication

---

### **PHASE 2: User-Data Linking** ⏱️ 20 mins
**Goal**: Link core users to dynamic table records

**Backend Tasks**:
1. Create `UserDataLinkService` (`backend/src/services/userDataLinkService.ts`)
2. Add methods:
   - `createLink(coreUserId, tableName, recordId)`
   - `getUserLinks(coreUserId)`
   - `getLinkedData(coreUserId)`

**Database**:
- `user_data_links` table (already created)

**Validation**:
- Whitelist allowed table names
- Verify record exists before linking

---

### **PHASE 3: CMS Form System** ⏱️ 45 mins
**Goal**: Dynamic onboarding form definitions

**Backend Tasks**:
1. Create `FormService` (`backend/src/services/formService.ts`)
2. Create `FormController` (`backend/src/controllers/formController.ts`)
3. Add routes (`backend/src/routes/forms.ts`)
4. Implement:
   - `GET /api/forms/onboarding` - Get active form
   - `POST /api/admin/forms` - Create form (admin only)
   - `PUT /api/admin/forms/:id` - Update form
   - `DELETE /api/admin/forms/:id` - Delete form

**Database**:
- `form_definitions` table
- `form_fields` table

**Features**:
- Field ordering
- Required/optional fields
- Field type validation
- Email/password field markers

---

### **PHASE 4: User Onboarding Flow** ⏱️ 60 mins
**Goal**: Complete registration with dynamic forms

**Backend Tasks**:
1. Create `OnboardingController` (`backend/src/controllers/onboardingController.ts`)
2. Add route: `POST /api/onboarding/register`
3. Implement logic:
   ```
   1. Validate form data against form definition
   2. Extract email + password
   3. Hash password
   4. Create core_user
   5. Insert remaining data into target dynamic table
   6. Create user_data_link
   7. Generate QR token
   8. Return QR code image
   ```

**Validation**:
- Dynamic field validation
- Email uniqueness check
- Password strength requirements
- Required field enforcement

---

### **PHASE 5: Image Upload Support** ⏱️ 30 mins
**Goal**: Handle photo uploads in onboarding

**Backend Tasks**:
1. Extend `OnboardingController` to handle:
   - Multipart file upload
   - Base64 camera capture
2. Use existing `ImageService` for processing
3. Store image URL in dynamic table (not core_users)

**Integration**:
- Reuse existing image processing pipeline
- Cloudinary support (already implemented)

---

### **PHASE 6: Attendance Session Management** ⏱️ 45 mins
**Goal**: Create and manage attendance sessions

**Backend Tasks**:
1. Create `AttendanceService` (`backend/src/services/attendanceService.ts`)
2. Create `AttendanceController` (`backend/src/controllers/attendanceController.ts`)
3. Add routes (`backend/src/routes/attendance.ts`)
4. Implement:
   - `POST /api/admin/sessions` - Create session
   - `GET /api/admin/sessions` - List sessions
   - `PUT /api/admin/sessions/:id` - Update session
   - `DELETE /api/admin/sessions/:id` - Delete session
   - `POST /api/admin/sessions/:id/activate` - Activate/deactivate

**Database**:
- `attendance_sessions` table

**Features**:
- Date/time validation
- Grace period support
- Active/inactive toggle

---

### **PHASE 7: Session QR Generation** ⏱️ 30 mins
**Goal**: Generate QR codes for attendance sessions

**Backend Tasks**:
1. Extend `AttendanceService` with:
   - `generateSessionQR(sessionId)`
2. QR payload structure:
   ```json
   {
     "type": "attendance",
     "sessionId": "uuid",
     "exp": timestamp
   }
   ```
3. Sign with JWT or HMAC
4. Generate QR image using existing `QRService`

**Security**:
- Signed QR codes
- Expiration validation
- Type discrimination (attendance vs access control)

---

### **PHASE 8: Attendance Scanning** ⏱️ 45 mins
**Goal**: Check-in via QR scan

**Backend Tasks**:
1. Add route: `POST /api/attendance/scan`
2. Implement logic:
   ```
   1. Decode QR
   2. Verify signature
   3. Check session exists
   4. Validate is_active = true
   5. Check time window (start_time to end_time + grace)
   6. Get user from JWT auth
   7. Prevent duplicate (UNIQUE constraint)
   8. Insert attendance_record
   9. Log in attendance_audit_logs
   ```

**Validation**:
- Session active check
- Time window validation
- Duplicate prevention
- User authentication required

---

### **PHASE 9: User Dashboard** ⏱️ 60 mins
**Goal**: End-user dashboard with profile & attendance

**Backend Tasks**:
1. Add route: `GET /api/user/dashboard`
2. Implement:
   - Get core user data
   - Fetch linked dynamic profile via `user_data_links`
   - Get attendance history
   - Calculate stats (total, attended, missed, rate)
   - Generate user QR code

**Frontend Tasks**:
1. Create `UserDashboardPage.tsx`
2. Display:
   - Profile information
   - QR code for attendance
   - Attendance history table
   - Statistics cards

---

### **PHASE 10: Admin Features** ⏱️ 45 mins
**Goal**: Admin management interfaces

**Backend Tasks**:
1. Add routes:
   - `GET /api/admin/core-users` - List all users
   - `GET /api/admin/attendance/:sessionId` - Session attendance
   - `GET /api/admin/absentees/:sessionId` - Who didn't attend
2. Absentees query:
   ```sql
   SELECT * FROM core_users
   WHERE id NOT IN (
     SELECT core_user_id FROM attendance_records
     WHERE session_id = ?
   )
   ```

**Frontend Tasks**:
1. Add "Core Users" tab to admin panel
2. Add "Attendance Sessions" management page
3. Add session attendance report view

---

## 🔐 Security Checklist

- [ ] Password hashing with bcrypt (salt rounds: 10)
- [ ] JWT tokens for core user auth
- [ ] Separate JWT secret from admin auth
- [ ] QR token signing (HMAC-SHA256)
- [ ] Table name whitelist validation
- [ ] SQL injection prevention (parameterized queries)
- [ ] Rate limiting on registration endpoint
- [ ] Email validation
- [ ] Password strength requirements (min 8 chars)

---

## ⚡ Performance Optimizations

- [ ] Indexes on `core_users.email`
- [ ] Indexes on `attendance_records.core_user_id`
- [ ] Indexes on `user_data_links.core_user_id`
- [ ] Composite index on `attendance_records(session_id, core_user_id)`
- [ ] Query optimization for absentees report
- [ ] Caching for form definitions

---

## 🧪 Testing Strategy

### Unit Tests
- [ ] CoreUserService methods
- [ ] Password hashing/verification
- [ ] QR token generation
- [ ] Form validation logic

### Integration Tests
- [ ] Onboarding flow end-to-end
- [ ] Attendance scan flow
- [ ] User dashboard data aggregation

### Manual Testing
- [ ] Register new user via form
- [ ] Login with email/password
- [ ] Scan attendance QR
- [ ] View user dashboard
- [ ] Admin: create session
- [ ] Admin: view attendance report

---

## 📦 Dependencies

### New NPM Packages
```json
{
  "bcryptjs": "^2.4.3",  // Already installed
  "jsonwebtoken": "^9.0.2"  // Already installed
}
```

No new dependencies needed! ✅

---

## 🚀 Deployment Steps

1. **Database Migration**:
   ```bash
   # Run migration script
   npm run db:migrate
   ```

2. **Environment Variables**:
   ```env
   CORE_USER_JWT_SECRET=your-secret-here
   CORE_USER_JWT_EXPIRES_IN=7d
   ```

3. **Build & Deploy**:
   ```bash
   npm run build
   git push
   # Render auto-deploys
   ```

---

## 📝 API Documentation

### Core Auth Endpoints
```
POST   /api/core-auth/register
POST   /api/core-auth/login
GET    /api/core-auth/me
```

### Onboarding Endpoints
```
GET    /api/forms/onboarding
POST   /api/onboarding/register
```

### Attendance Endpoints
```
POST   /api/attendance/scan
GET    /api/user/dashboard
```

### Admin Endpoints
```
POST   /api/admin/sessions
GET    /api/admin/sessions
GET    /api/admin/sessions/:id/attendance
GET    /api/admin/sessions/:id/absentees
GET    /api/admin/core-users
```

---

## ✅ Success Criteria

- [ ] Users can register via dynamic form
- [ ] Users can login with email/password
- [ ] Users see their profile data from dynamic tables
- [ ] Admins can create attendance sessions
- [ ] Users can scan QR to check-in
- [ ] Duplicate check-ins prevented
- [ ] Time window validation works
- [ ] User dashboard shows attendance history
- [ ] Admin can view attendance reports
- [ ] Admin can see absentees list
- [ ] **CRITICAL**: All existing features still work

---

## 🎯 Next Steps

1. Review this roadmap
2. Confirm approach
3. Begin Phase 1 implementation
4. Test incrementally after each phase
5. Deploy to production

---

**Estimated Total Time**: 6-8 hours
**Priority**: High
**Risk Level**: Low (non-breaking design)
