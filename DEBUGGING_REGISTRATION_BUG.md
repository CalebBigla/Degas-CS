# Registration Bug: "Email Already Registered" - Debug Guide

## Problem
User gets "This email is already registered" error even when trying to create a new account with a new email.

## Debug Tools Available

### 1. Check Database State
```bash
# See all users currently in database
curl https://your-api.com/api/form/debug/db-state

# Search for specific email
curl "https://your-api.com/api/form/debug/db-state?email=test@example.com"
```

Response shows:
```json
{
  "success": true,
  "database": {
    "totalUsers": 2,
    "users": [
      { "id": "...", "name": "John", "email": "john@example.com", "phone": "123" },
      { "id": "...", "name": "Jane", "email": "jane@example.com", "phone": "456" }
    ],
    "queryEmail": {
      "email": "test@example.com",
      "found": false,
      "match": null
    }
  }
}
```

### 2. Delete All Users (DEBUG ONLY)
⚠️ **WARNING: This cannot be undone!**

```bash
# Replace YOUR_ADMIN_KEY with actual key
curl -X POST https://your-api.com/api/form/debug/delete-all-users \
  -H "Content-Type: application/json" \
  -d '{"confirmToken":"YOUR_ADMIN_KEY"}'
```

### 3. Check Backend Logs
Render backend shows detailed logs with queries:

```
🔍 Starting duplicate email check... email=test@example.com
🔍 Executing query: SELECT id, email FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1
✅ No duplicate found (LOWER method)
🔍 Starting duplicate phone check... phone=12345
✅ No duplicate phone found
✅ User registered successfully userId=uuid email=test@example.com
```

## Troubleshooting Steps

### Step 1: Check if Users Exist
```bash
curl https://your-api.com/api/form/debug/db-state
```

**If totalUsers > 0 but you never created them:**
- There's stale data from previous testing
- Solution: Delete all users and start fresh

**If totalUsers = 0:**
- Database is clean
- Problem is in the duplicate check logic

### Step 2: Test with Specific Email
```bash
curl "https://your-api.com/api/form/debug/db-state?email=newemail123@test.com"
```

- If `found: false` → Email doesn't exist in database
- If `found: true` → Email is already registered

### Step 3: Try Registration
1. Get a fresh email address (e.g., `testnew-${timestamp}@example.com`)
2. Attempt registration via UI
3. If same "already registered" error → Bug is in duplicate check
4. Check Render logs for the query that's failing

### Step 4: Check Backend Logs
In Render dashboard:
1. Go to your service
2. Click "Logs" tab
3. Search for logs from registration endpoint
4. Look for patterns:
   - `SELECT id, email FROM users WHERE LOWER(email)...` - LOWER() method
   - `Found existing email` - Email was found
   - `No duplicate found` - Check passed

## Possible Root Causes

### 1. Database Query Syntax Error
- LOWER() function not working in SQLite
- **Fix:** Uses fallback to simple query comparison

### 2. Query Always Returns Result
- Bug in database adapter
- **Fix:** Added detailed logging to show actual queries

### 3. Stale Data in Production
- Old test users preventing new registrations
- **Fix:** Use debug endpoint to clear

### 4. Email Validation Issue
- Email field being sanitized/modified
- **Fix:** Logs show exact email being checked

## Expected Behavior

**Successful Registration:**
```
✅ No duplicate found (LOWER method)
✅ No duplicate phone found
✅ User registered successfully
Password hashed ✅
Database insert ✅
Status: 201 Created
Response: { success: true, userId, formId, profileImageUrl }
```

**Rejected Registration:**
```
⚠️  Found existing email (LOWER method)
Found email: john@example.com
Database query returned match
Status: 409 Conflict
Response: { success: false, message: "Email already registered" }
```

## Database Structure

Users table should have:
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  address TEXT NOT NULL,
  password TEXT NOT NULL,
  formid UUID NOT NULL,
  scanned BOOLEAN DEFAULT false,
  scannedat TIMESTAMP,
  profileImageUrl TEXT,
  createdat TIMESTAMP,
  updatedat TIMESTAMP
)
```

## Quick Fix Checklist

- [ ] Check `https://your-api.com/api/form/debug/db-state` - are there users?
- [ ] If yes, delete them with debug endpoint
- [ ] Try registration with new test email
- [ ] Check Render logs for LOWER() or query errors
- [ ] If still failing, check email field format (spaces, case, etc.)
- [ ] Verify formId parameter is correct

## Next Steps

If after these troubleshooting steps the issue persists:

1. **Screenshot the debug endpoint response** - shows exact database state
2. **Copy Render logs** - shows exact query being executed
3. **List test emails tried** - shows pattern of attempts
4. **Check if manually inserting user works** - isolates frontend vs backend vs database issue
