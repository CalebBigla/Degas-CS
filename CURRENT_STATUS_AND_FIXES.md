# Current System Status & Fixes Needed

## ✅ What's Working

1. **Backend**: Running successfully on port 3001
2. **Frontend**: Loading correctly on port 5173
3. **Authentication**: Dual auth system working
4. **Forms System**: Dynamic form creation working
5. **Self Check-In**: User scanner page implemented

## ❌ Current Issues

### Issue 1: Users Not Showing in Admin Dashboard

**Problem**: 5 users registered but not visible in admin dashboard

**Root Cause**: Users registered but `user_data_links` table is empty (0 records)

**Why**: The registration happened but the link between core_users and dynamic tables wasn't created

**Users Registered**:
- admin@degas.com (admin)
- guard@degas.com (admin)
- force@grace.com (user)
- test@test.com (user)
- ella@james.com (user)

**Fix Needed**: These users need to be re-registered OR manually linked to tables

### Issue 2: "Membership" Table Doesn't Exist

**Error**: `SQLITE_ERROR: no such table: Membership`

**Root Cause**: Form was created before table creation code was added

**Fix**: Delete old form and create new one (table will be created automatically)

### Issue 3: "Create Attendance" Button Not Working

**Location**: Admin Dashboard
**Expected**: Should navigate to `/admin/attendance` page
**Fix**: Need to check DashboardPage.tsx

## 🔧 Fixes to Apply

### Fix 1: Clean Up and Start Fresh

```bash
# 1. Delete old forms
node backend/delete-form.js

# 2. Have users re-register with new form
# (This will create proper links)
```

### Fix 2: Check Admin Dashboard Button

Need to verify the "Create Attendance" button in DashboardPage.tsx navigates correctly.

### Fix 3: Manual User Linking (Alternative)

If you don't want users to re-register, we can manually create the links:

```sql
-- For each user, create link to appropriate table
INSERT INTO user_data_links (id, core_user_id, table_name, record_id, created_at)
VALUES ('link-1', 'user-id', 'Members', record-id, datetime('now'));
```

## 📋 Recommended Steps

### Step 1: Clean Database
```bash
cd backend
node check-all-users.js  # See current state
node check-forms-detailed.js  # See current forms
```

### Step 2: Delete Old Forms
```bash
# If forms exist without proper table creation
node delete-form.js
```

### Step 3: Create New Form Properly
1. Login as admin
2. Go to `/admin/forms`
3. Click "Create Form"
4. Fill in:
   - Form Name: "Church Membership"
   - Target Table: "Membership"
   - Fields:
     * Name (text, required)
     * Email (email, required, ✓ Email Field)
     * Password (password, required, ✓ Password Field)
     * Phone (text, optional)
5. Click "Create Form"
6. Verify "Membership" table is created

### Step 4: Test Registration
1. Copy registration link
2. Open in incognito window
3. Register new test user
4. Verify:
   - User created in `core_users`
   - Record created in `Membership` table
   - Link created in `user_data_links`
   - User visible in admin dashboard

### Step 5: Create Attendance Session
1. Go to `/admin/attendance`
2. Click "Create Session"
3. Fill in session details
4. Generate QR code
5. Test user check-in

## 🔍 Verification Commands

### Check Users
```bash
cd backend
node check-all-users.js
```

### Check Forms
```bash
node check-forms-detailed.js
```

### Check Tables
```bash
node check-tables.js
```

### Check Specific Table
```bash
node -e "
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/degas.db');
db.all('SELECT * FROM Membership', [], (err, rows) => {
  if (err) console.error(err);
  else console.log(rows);
  db.close();
});
"
```

## 🎯 Expected Final State

### Core Users Table
```
5 users (including admins)
```

### User Data Links Table
```
3-5 links (one per registered user)
```

### Dynamic Tables
```
Membership table with 3-5 records
```

### Forms
```
1 active form: "Church Membership"
```

### Attendance Sessions
```
1+ sessions created by admin
```

## 🚀 Quick Fix Script

I can create a script to:
1. Check current state
2. Identify issues
3. Offer to fix automatically

Would you like me to create this?

## 📞 Next Steps

1. **Immediate**: Fix the "Create Attendance" button
2. **Short-term**: Clean up and recreate forms properly
3. **Medium-term**: Have users re-register OR manually link existing users
4. **Long-term**: Test complete flow end-to-end

## ⚠️ Important Notes

- Don't delete `core_users` table (users will lose accounts)
- Backup database before making changes
- Test with one user first before mass migration
- Users can keep same email/password if re-registering
