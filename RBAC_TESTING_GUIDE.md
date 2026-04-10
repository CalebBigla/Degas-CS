# RBAC System End-to-End Testing Guide

## Overview
This guide provides comprehensive testing procedures for the new Role-Based Access Control (RBAC) system with FOLLOW_UP and GREETER roles.

## Prerequisites

1. **Database Updated** - All schema files updated with new roles
2. **Backend Running** - Node.js server with new RBAC middleware
3. **Frontend Built** - React app with role-based routing
4. **Test Users Created** - Use `RBAC_TEST_DATA.sql` to create test accounts

## Test Users

### User 1: FOLLOW_UP Role
- **Email:** followup@fgm.com
- **Password:** followup123
- **Permissions:** Dashboard + Access Logs
- **Default Redirect:** /admin/dashboard

### User 2: GREETER Role
- **Email:** greeter@fgm.com
- **Password:** greeter123
- **Permissions:** Scanner only
- **Default Redirect:** /scanner

### User 3: ADMIN Role (Existing)
- **Email:** admin@degas.com
- **Password:** admin123
- **Permissions:** Full access to all modules
- **Default Redirect:** /admin/dashboard

### User 4: REGULAR USER Role (Existing)
- **Email:** user@example.com
- **Password:** user123
- **Permissions:** User dashboard only
- **Default Redirect:** /user/dashboard

## Test Scenarios

### Test Suite 1: FOLLOW_UP User Access Control

#### 1.1 Login and Initial Redirect
```
Steps:
1. Go to /login
2. Enter email: followup@fgm.com, password: followup123
3. Click Sign In

Expected:
✅ Login successful
✅ Redirected to /admin/dashboard
✅ No error messages
✅ Dashboard displays properly
```

#### 1.2 Sidebar Navigation Visibility
```
Steps:
1. (After login as follow_up user) Observe the sidebar

Expected:
✅ Visible items:
   - Dashboard
   - Access Logs
✅ Hidden items (not shown):
   - Tables
   - Forms
   - Scanner
   - Analytics
```

#### 1.3 Access Logs Module Access
```
Steps:
1. Click "Access Logs" in sidebar
2. Verify page loads and shows access logs

Expected:
✅ /admin/access-logs page loads
✅ Access logs data displays
✅ No errors
```

#### 1.4 Unauthorized Table Access (Manual URL)
```
Steps:
1. Manually navigate to http://localhost:5173/admin/tables
2. Observe page behavior

Expected:
✅ Redirected back to /admin/dashboard
✅ No error message (graceful redirect)
```

#### 1.5 API Protection - Tables Route
```
Steps:
1. Open browser DevTools (F12)
2. Go to Network tab
3. (Ensure logged in as follow_up)
4. Try to fetch: /api/admin/tables

Expected:
❌ Response: 403 Forbidden
❌ Message: "Access denied. You do not have permission to access the tables module."
```

#### 1.6 API Protection - Forms Route
```
Steps:
1. In DevTools Console, run:
   fetch('/api/admin/forms', {
     headers: {
       'Authorization': 'Bearer ' + localStorage.getItem('degas_core_token')
     }
   }).then(r => r.json()).then(console.log)

Expected:
❌ Response: 403 Forbidden
❌ Error message about insufficient permissions
```

#### 1.7 Logout and Re-login
```
Steps:
1. Click logout button
2. Verify redirected to /login
3. Log back in with follow_up credentials
4. Verify proper module access

Expected:
✅ Session properly cleared
✅ Login works again
✅ Same access restrictions apply
```

---

### Test Suite 2: GREETER User Access Control

#### 2.1 Login and Initial Redirect
```
Steps:
1. Go to /login
2. Enter email: greeter@fgm.com, password: greeter123
3. Click Sign In

Expected:
✅ Login successful
✅ Redirected to /scanner (or /scanner.html)
✅ Scanner interface displays
```

#### 2.2 Sidebar Navigation (GREETER)
```
Steps:
1. (After login as greeter user) Observe layout

Expected:
❌ No traditional sidebar (or sidebar shows only scanner)
✅ Only Scanner interface visible
✅ No navigation to other modules
```

#### 2.3 Unauthorized Dashboard Access (Manual URL)
```
Steps:
1. Manually navigate to http://localhost:5173/admin/dashboard

Expected:
✅ Redirected to /scanner
✅ No error messages
```

#### 2.4 Unauthorized Access Logs Access (Manual URL)
```
Steps:
1. Manually navigate to http://localhost:5173/admin/access-logs

Expected:
✅ Redirected to /scanner
```

#### 2.5 Scanner Module Access
```
Steps:
1. (Logged in as greeter)
2. Verify scanner QR code functionality
3. Test scanning a QR code

Expected:
✅ Scanner interface is fully functional
✅ Can scan QR codes
✅ Results display properly
```

#### 2.6 API Protection - Dashboard Route
```
Steps:
1. In DevTools Console, run:
   fetch('/api/admin/core-users', {
     headers: {
       'Authorization': 'Bearer ' + localStorage.getItem('degas_core_token')
     }
   }).then(r => r.json()).then(console.log)

Expected:
❌ Response: 403 Forbidden
❌ Message: "Access denied. You do not have permission to access the dashboard module."
```

#### 2.7 API Protection - Access Logs Route
```
Steps:
1. In DevTools Console, run:
   fetch('/api/admin/sessions', {
     headers: {
       'Authorization': 'Bearer ' + localStorage.getItem('degas_core_token')
     }
   }).then(r => r.json()).then(console.log)

Expected:
❌ Response: 403 Forbidden
❌ Error about insufficient permissions
```

---

### Test Suite 3: ADMIN User (Full Access Verification)

#### 3.1 Login and Dashboard Access
```
Steps:
1. Log in with admin credentials
2. Verify dashboard loads

Expected:
✅ Full access to /admin/dashboard
✅ All stats visible
```

#### 3.2 Complete Sidebar Visibility
```
Steps:
1. Observe sidebar after admin login

Expected:
✅ All navigation items visible:
   - Dashboard
   - Tables
   - Forms
   - Scanner
   - Access Logs
   - Analytics
```

#### 3.3 Access All Admin Modules
```
Steps:
1. Click on each sidebar item in sequence:
   - Tables
   - Forms
   - Scanner
   - Access Logs
   - Analytics

Expected:
✅ All pages load without errors
✅ All data displays correctly
✅ No 403 errors
```

#### 3.4 API Access - All Routes
```
Steps:
1. Test API calls to:
   - /api/admin/core-users
   - /api/admin/tables
   - /api/admin/forms
   - /api/admin/sessions
   - /api/analytics
   - All other admin routes

Expected:
✅ All return 200 OK
✅ All data displays properly
✅ No permission errors
```

---

### Test Suite 4: REGULAR USER (Limited Access)

#### 4.1 Login and Redirect
```
Steps:
1. Log in with user@example.com credentials
2. Verify redirect

Expected:
✅ Redirected to /user/dashboard
✅ User dashboard displays
```

#### 4.2 Admin Route Prevention
```
Steps:
1. Manually navigate to /admin/dashboard

Expected:
✅ Redirected to /user/dashboard
```

#### 4.3 API Protection
```
Steps:
1. Try API calls to admin endpoints with user token

Expected:
❌ All return errors (401 or 403)
❌ User cannot access admin APIs
```

---

### Test Suite 5: Authentication & Token Management

#### 5.1 Missing Token
```
Steps:
1. Logout all users
2. In DevTools Console, try:
   fetch('/api/admin/dashboard', {
     headers: {
       'Authorization': 'Bearer invalid_token'
     }
   }).then(r => r.json()).then(console.log)

Expected:
❌ Response: 401 Unauthorized
❌ Message: "Invalid or expired token"
```

#### 5.2 No Authorization Header
```
Steps:
1. In DevTools Console, try:
   fetch('/api/admin/dashboard').then(r => r.json()).then(console.log)

Expected:
❌ Response: 401 Unauthorized
❌ Message: "Access token required"
```

#### 5.3 Token Expiration Handling
```
Steps:
1. Log in a user
2. Wait for token to expire (or manually modify it)
3. Try to access a protected page

Expected:
✅ Graceful handling
✅ Either: redirect to login or show error
❌ App doesn't crash
```

---

### Test Suite 6: Permission Edge Cases

#### 6.1 Role-Changing (if implemented)
```
Steps:
1. (Admin) Change a user's role from follow_up to greeter
2. Log out that user
3. Log back in

Expected:
✅ User has new role permissions
✅ Navigation updates accordingly
```

#### 6.2 Deactivated User
```
Steps:
1. (Admin) Set a user's status to 'inactive'
2. Try to log in with that user

Expected:
❌ Login fails
❌ Message: "Account is not active"
```

#### 6.3 Database Constraint Validation
```
Steps:
1. (Admin) Try to insert invalid role via DB direct query
   INSERT INTO core_users VALUES (..., 'invalid_role', ...)

Expected:
❌ Database rejects the insert
❌ CHECK constraint violation error
```

---

### Test Suite 7: UI/UX Behavior

#### 7.1 Sidebar Collapse (FOLLOW_UP)
```
Steps:
1. Log in as follow_up user
2. Click collapse sidebar button
3. Verify icons still show for accessible modules

Expected:
✅ Sidebar collapses
✅ Icons for Dashboard and Access Logs visible
✅ Icons for hidden modules not shown
```

#### 7.2 Mobile Navigation (FOLLOW_UP)
```
Steps:
1. Log in as follow_up user
2. Resize window to mobile size
3. Click mobile menu button
4. Verify only Dashboard and Access Logs shown

Expected:
✅ Mobile menu shows only accessible modules
✅ No extra modules listed
```

#### 7.3 Loading States
```
Steps:
1. Log in a user
2. Observe loading behavior while modules load
3. Navigate between modules quickly

Expected:
✅ Loading spinners display
✅ No "flash" of restricted content
✅ Graceful transition between pages
```

---

## Browser DevTools Testing

### Console Tests
```javascript
// Check current user's role
localStorage.getItem('degas_user') // For regular users
localStorage.getItem('degas_admin') // For admin/staff users

// Check stored token
localStorage.getItem('degas_core_token')

// Check auth state
JSON.parse(localStorage.getItem('degas_admin')).role

// Test API with current token
const token = localStorage.getItem('degas_core_token');
fetch('/api/admin/tables', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json()).then(console.log);
```

### Network Tab Tests
1. Monitor all requests after login
2. Verify proper headers are sent
3. Check response codes for protected routes
4. Verify 403 responses for unauthorized access

---

## Test Coverage Checklist

### Frontend Tests
- [ ] Login redirect for each role
- [ ] Sidebar filtering for each role
- [ ] Manual URL access prevention
- [ ] Navigation between accessible modules
- [ ] Logout functionality
- [ ] Token storage and retrieval
- [ ] Mobile responsive access control

### Backend Tests
- [ ] Authentication middleware (401 responses)
- [ ] Authorization middleware (403 responses)
- [ ] Module access enforcement
- [ ] Role/permission mapping correctness
- [ ] Database constraints
- [ ] Error logging for denied access

### Integration Tests
- [ ] End-to-end login flow for each role
- [ ] API + Frontend consistency
- [ ] Token refresh handling
- [ ] Session restoration

### Security Tests
- [ ] No admin endpoints accessible to non-admin users
- [ ] No privilege escalation possible
- [ ] RBAC cannot be bypassed via direct API calls
- [ ] SQL injection prevention in user queries

---

## Logging & Monitoring

### What to Monitor During Tests

1. **Backend Logs:**
   - Look for `[MODULE ACCESS DENIED]` for unauthorized attempts
   - Look for `[MODULE ACCESS GRANTED]` for successful accesses
   - Verify timestamps and user IDs match

2. **Browser Console:**
   - No 403 errors for follow_up dashboard access
   - 403 errors for follow_up tables access
   - No errors when redirecting unauthorized access

3. **Network Tab:**
   - Verify Authorization headers present
   - Check response codes (200, 401, 403)
   - Monitor redirect chains

---

## Common Issues & Troubleshooting

### Issue: User can't login with new role
**Solution:** 
1. Verify role spelling matches enum in database
2. Check database record was inserted correctly
3. Verify password hash is correct

### Issue: Sidebar shows all modules despite restricted role
**Solution:**
1. Check frontend RBAC definition matches backend
2. Verify ROLE_PERMISSIONS in rbac.ts includes role
3. Hard refresh frontend (Ctrl+Shift+R)

### Issue: API returns 403 but direct URL works
**Solution:**
1. Frontend and backend RBAC out of sync
2. Update ROLE_PERMISSIONS in both places
3. Verify backend middleware is applied to all routes

### Issue: User redirected to incorrect page after login
**Solution:**
1. Check LOGIN_REDIRECT_PATHS in LoginPage
2. Verify getDefaultRedirectPath function is correct
3. Check localStorage has correct role value

---

## Sign-Off Checklist

- [ ] All test scenarios passed
- [ ] No 403 errors for authorized access
- [ ] All 403 errors occur only for unauthorized access
- [ ] Sidebar correctly filters modules per role
- [ ] Manual URL access prevention working
- [ ] API protection verified
- [ ] Token management working correctly
- [ ] No privilege escalation possible
- [ ] Mobile responsive design maintained
- [ ] Error messages are appropriate
- [ ] Logging shows all access attempts
- [ ] Performance acceptable (no slowdowns)

---

## Test Report Template

```
Test Date: ___________
Tester: ___________
Environment: [ ] Dev [ ] Staging [ ] Production
Browser/OS: ___________

Tests Passed: ___ / ___
Tests Failed: ___
Known Issues: ___________

Signed Off: ___________
```
