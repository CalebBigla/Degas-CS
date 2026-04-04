# Registration Link Troubleshooting

## Current Status

### ✅ Backend Working
- Form API: `GET /api/fixed-forms/:formId` ✅
- Registration API: `POST /api/form/register/:formId` ✅
- Test user successfully registered ✅
- Database verified ✅

### ❓ Frontend Issue
Registration link not working: `http://localhost:5173/register/06aa4b67-76fe-411a-a1e0-682871e8506f`

---

## Diagnostic Steps

### Step 1: Check Frontend is Running
```bash
# Is frontend dev server running?
# Should see output like:
# VITE v4.x.x  ready in xxx ms
# ➜  Local:   http://localhost:5173/
```

**If NOT running:**
```bash
cd Degas-CS-main/frontend
npm run dev
```

### Step 2: Check Browser Console
1. Open browser DevTools (F12)
2. Go to Console tab
3. Navigate to: `http://localhost:5173/register/06aa4b67-76fe-411a-a1e0-682871e8506f`
4. Look for errors

**Common Errors:**
- `Failed to fetch` - Backend not running
- `404 Not Found` - Route not configured
- `CORS error` - CORS not configured
- `Network Error` - Wrong API URL

### Step 3: Check Network Tab
1. Open DevTools → Network tab
2. Navigate to registration link
3. Look for API calls

**Expected Calls:**
1. `GET /api/fixed-forms/06aa4b67-76fe-411a-a1e0-682871e8506f`
   - Should return 200 OK
   - Response: `{ success: true, data: { name: "The Force of Grace Ministry", ... } }`

**If API call fails:**
- Check Status Code
- Check Response
- Check Request URL

### Step 4: Test API Directly
Open `test-api.html` in browser:
```
file:///path/to/Degas-CS-main/frontend/test-api.html
```

This will test the API endpoints directly.

---

## Possible Issues & Solutions

### Issue 1: Frontend Not Running
**Symptom:** Page shows "This site can't be reached"

**Solution:**
```bash
cd Degas-CS-main/frontend
npm run dev
```

### Issue 2: Backend Not Running
**Symptom:** API calls fail with "Network Error"

**Solution:**
```bash
cd Degas-CS-main/backend
npm run dev
```

### Issue 3: Wrong API URL
**Symptom:** API calls go to wrong URL

**Check:**
```bash
# Frontend .env file should have:
VITE_API_URL=http://localhost:3001/api
```

**Fix:**
1. Edit `Degas-CS-main/frontend/.env`
2. Set `VITE_API_URL=http://localhost:3001/api`
3. Restart frontend dev server

### Issue 4: Route Not Found
**Symptom:** Shows 404 or blank page

**Check:** `frontend/src/App.tsx` should have:
```typescript
<Route path="/register/:formId" element={<RegisterPage />} />
```

### Issue 5: CORS Error
**Symptom:** Console shows CORS policy error

**Check:** Backend `server.ts` should allow `localhost:5173`

---

## Manual Test

### Test Backend API
```bash
# PowerShell
# Test 1: Get form
Invoke-RestMethod -Uri 'http://localhost:3001/api/fixed-forms/06aa4b67-76fe-411a-a1e0-682871e8506f' -Method Get

# Test 2: Register user
$body = @{
  name = "Manual Test"
  phone = "+9999999999"
  email = "manual@test.com"
  address = "999 Test St"
  password = "test123"
} | ConvertTo-Json

Invoke-RestMethod -Uri 'http://localhost:3001/api/form/register/06aa4b67-76fe-411a-a1e0-682871e8506f' -Method Post -Body $body -ContentType 'application/json'
```

### Test Frontend
1. Start frontend: `cd frontend && npm run dev`
2. Open: `http://localhost:5173`
3. Should see login page
4. Navigate to: `http://localhost:5173/register/06aa4b67-76fe-411a-a1e0-682871e8506f`
5. Should see registration form

---

## Expected Behavior

### When Working Correctly:

1. **Navigate to registration link**
   ```
   http://localhost:5173/register/06aa4b67-76fe-411a-a1e0-682871e8506f
   ```

2. **Page loads and shows:**
   - Title: "The Force of Grace Ministry"
   - Description: "Please fill in all required fields to register"
   - 5 form fields: Name, Phone, Email, Address, Password
   - Register button
   - Login button

3. **Fill form and submit:**
   - Name: John Doe
   - Phone: +1234567890
   - Email: john@example.com
   - Address: 123 Main St
   - Password: password123

4. **Success screen shows:**
   - ✓ Registration Successful!
   - Email confirmation
   - "Go to Login" button

---

## Debug Checklist

- [ ] Backend running on port 3001
- [ ] Frontend running on port 5173
- [ ] `.env` file has correct API URL
- [ ] Browser console shows no errors
- [ ] Network tab shows successful API calls
- [ ] Form loads with correct name
- [ ] Registration submits successfully

---

## Quick Fix Commands

```bash
# Terminal 1: Start Backend
cd Degas-CS-main/backend
npm run dev

# Terminal 2: Start Frontend
cd Degas-CS-main/frontend
npm run dev

# Then open browser:
# http://localhost:5173/register/06aa4b67-76fe-411a-a1e0-682871e8506f
```

---

## Contact Points

If still not working, check:
1. Browser console for JavaScript errors
2. Network tab for failed API calls
3. Backend logs for errors
4. Frontend terminal for build errors

The backend API is confirmed working - the issue is likely frontend-related (not running, wrong URL, or build issue).
