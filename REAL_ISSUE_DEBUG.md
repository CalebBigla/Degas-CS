# Real Issue Debug - Email Doesn't Exist

## What You Told Me

- Email `admin@prince.com` does NOT exist in database ✅
- Registration still fails with 409 ❌

## Existing Emails in Database:
1. church@test.com
2. anibielijah1@gmail.com
3. skifoe50@gmail.com
4. test@test.com
5. ofojeejennifer02@gmail.com
6. admin@lagos.com

## Existing Phones in Database:
1. 5678
2. 09039459108
3. 12345678 ⚠️
4. 08109895149
5. +2347045821041
6. 1234

## Possible Causes

### Cause 1: Phone Number Conflict

**Check:** Are you using phone `12345678`?

This phone already exists (user: Caleb Joshua, email: skifoe50@gmail.com)

**Solution:** Use a different phone number

### Cause 2: Frontend Sending Wrong Data

**Check:** Is the frontend sending the correct email?

Maybe it's sending a different email than what you see.

### Cause 3: Backend Not Restarted

**Check:** Did you restart backend after code changes?

### Cause 4: Multiple Backend Instances

**Check:** Are multiple backend servers running?

## Debug Steps

### Step 1: Check Backend Logs

When you submit registration, backend should log:
```
📝 Registration attempt { formId: '...', email: 'admin@prince.com', name: '...', hasPassword: true, hasPhoto: true }
🔍 Starting duplicate email check... { email: 'admin@prince.com' }
🔍 Executing query: { query: 'SELECT id, email FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1', params: [ 'admin@prince.com' ] }
```

**What to look for:**
- Is the email correct?
- Does it find a duplicate?
- Is it checking phone?

### Step 2: Check Frontend Network Tab

1. Open DevTools (F12)
2. Go to Network tab
3. Submit registration
4. Find POST request to `/api/form/register/:formId`
5. Click on it
6. Check "Payload" tab

**What to look for:**
```json
{
  "name": "Joshua Prince",
  "phone": "12345678",  ← Is this the duplicate?
  "email": "admin@prince.com",
  "address": "...",
  "password": "...",
  "photo": "data:image/..."
}
```

### Step 3: Test with Script

```bash
cd backend
node test-registration-debug.js
```

This will:
- Generate unique email AND phone
- Test registration
- Show exact error

### Step 4: Manual Database Check

```bash
cd backend
node -e "
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/degas.db');

// Check email
db.get('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', ['admin@prince.com'], (err, row) => {
  console.log('Email check:', row ? 'FOUND' : 'NOT FOUND');
  if (row) console.log('  User:', row.name, '|', row.email);
  
  // Check phone
  db.get('SELECT * FROM users WHERE phone = ?', ['12345678'], (err2, row2) => {
    console.log('Phone 12345678 check:', row2 ? 'FOUND' : 'NOT FOUND');
    if (row2) console.log('  User:', row2.name, '|', row2.email);
    db.close();
  });
});
"
```

## Most Likely Issue: Phone Number

Looking at your screenshot, you're using:
- Email: admin@prince.com ✅ (doesn't exist)
- Phone: 12345678 ❌ (ALREADY EXISTS!)

**User with phone 12345678:**
- Name: Caleb Joshua
- Email: skifoe50@gmail.com
- ID: 4c693d9b-97c1-4486-af6e-e70896a24060

## Solution

### Option 1: Use Different Phone

```
Phone: +15551234567
OR
Phone: 09012345678
OR
Phone: +2348012345678
```

### Option 2: Delete User with That Phone

```bash
cd backend
node -e "
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/degas.db');
db.run('DELETE FROM users WHERE phone = ?', ['12345678'], (err) => {
  if (err) console.error(err);
  else console.log('✅ User with phone 12345678 deleted');
  db.close();
});
"
```

### Option 3: Update Existing User's Phone

```bash
cd backend
node -e "
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/degas.db');
db.run('UPDATE users SET phone = ? WHERE phone = ?', ['+2341234567890', '12345678'], (err) => {
  if (err) console.error(err);
  else console.log('✅ Phone updated');
  db.close();
});
"
```

## What Backend Logs Should Show

### If Email Duplicate:
```
⚠️  Found existing email (LOWER method): { inputEmail: 'admin@prince.com', foundEmail: '...', foundId: '...' }
❌ Registration blocked: email already registered
```

### If Phone Duplicate:
```
✅ No duplicate found (LOWER method) { email: 'admin@prince.com' }
🔍 Starting duplicate phone check... { phone: '12345678' }
⚠️  Found existing phone: { inputPhone: '12345678', foundPhone: '12345678', foundId: '...' }
❌ Registration blocked: phone already registered
```

### If No Duplicate:
```
✅ No duplicate found (LOWER method) { email: 'admin@prince.com' }
✅ No duplicate phone found { phone: '+15551234567' }
🔐 Hashing password
📷 Processing profile image
✅ Profile image uploaded
✅ User registered successfully
```

## Action Plan

1. **Check backend console** - Look for the exact error message
2. **Check phone number** - Are you using `12345678`?
3. **Try different phone** - Use `+15551234567` or similar
4. **Run test script** - `node backend/test-registration-debug.js`
5. **Send me backend logs** - Copy the full console output

## Quick Test

Try registering with:
```
Name: Test User
Email: admin@prince.com
Phone: +15559876543  ← Different phone!
Address: 123 Test St
Password: TestPass123!
Photo: [Upload image]
```

If this works, the issue was the phone number.

---

**My bet: You're using phone `12345678` which already exists. Try a different phone number!**
