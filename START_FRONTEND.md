# Start Frontend Server

## Issue
The registration link shows "This page isn't working" because the frontend dev server is not running.

## Solution
Start the frontend development server.

---

## Steps to Start Frontend

### Option 1: Using npm (Recommended)
```bash
cd Degas-CS-main/frontend
npm run dev
```

### Option 2: Using PowerShell
```powershell
cd Degas-CS-main/frontend
npm run dev
```

---

## Expected Output
```
VITE v4.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
➜  press h to show help
```

---

## Verify It's Working

### 1. Check Frontend is Running
Open browser and go to:
```
http://localhost:5173
```

Should redirect to login page.

### 2. Test Registration Link
Open browser and go to:
```
http://localhost:5173/register/06aa4b67-76fe-411a-a1e0-682871e8506f
```

Should show "The Force of Grace Ministry" registration form.

---

## Backend Status

✅ Backend is running on port 3001
✅ Registration API endpoint is working
✅ Form exists in database
✅ Test registration successful

**Test Results:**
- Form API: ✅ Working
- Registration API: ✅ Working  
- User created: ✅ Success
- User in database: ✅ Verified

---

## Full System Check

### Backend (Port 3001)
```bash
# Check if backend is running
curl http://localhost:3001/api/health
```

### Frontend (Port 5173)
```bash
# Start frontend
cd Degas-CS-main/frontend
npm run dev
```

### Test Registration
1. Start frontend: `npm run dev`
2. Open: `http://localhost:5173/register/06aa4b67-76fe-411a-a1e0-682871e8506f`
3. Fill form:
   - Name: Test User
   - Phone: +1234567890
   - Email: test@example.com
   - Address: 123 Test St
   - Password: password123
4. Click Register
5. Should see success message

---

## Troubleshooting

### Frontend Won't Start
```bash
# Install dependencies
cd Degas-CS-main/frontend
npm install

# Try starting again
npm run dev
```

### Port 5173 Already in Use
```bash
# Kill process on port 5173
# Windows PowerShell:
Get-Process -Id (Get-NetTCPConnection -LocalPort 5173).OwningProcess | Stop-Process

# Then start frontend again
npm run dev
```

### Registration Page Shows Error
1. Check browser console (F12)
2. Check network tab for API calls
3. Verify backend is running on port 3001
4. Check API base URL in frontend/.env

---

## Summary

✅ Backend is working correctly
✅ Registration API tested and verified
✅ Need to start frontend dev server
✅ Registration link will work once frontend is running

**Next Step:** Start the frontend dev server with `npm run dev` in the frontend directory.
