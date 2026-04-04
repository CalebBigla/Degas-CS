# Start Complete System

## Issue
Registration page is blank - frontend dev server is not running.

## Solution
Start both backend and frontend servers.

---

## Quick Start (2 Terminals)

### Terminal 1: Backend
```bash
cd Degas-CS-main/backend
npm run dev
```

**Expected Output:**
```
Server running on port 3001
✅ Backend is ready
```

### Terminal 2: Frontend
```bash
cd Degas-CS-main/frontend
npm run dev
```

**Expected Output:**
```
VITE v4.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

---

## Verify System is Running

### 1. Check Backend (Port 3001)
Open browser: `http://localhost:3001/api/health`

Should show:
```json
{
  "status": "ok",
  "ready": true
}
```

### 2. Check Frontend (Port 5173)
Open browser: `http://localhost:5173`

Should redirect to login page.

### 3. Test Registration Link
Open browser: `http://localhost:5173/register/06aa4b67-76fe-411a-a1e0-682871e8506f`

Should show registration form with:
- Title: "The Force of Grace Ministry"
- 5 form fields
- Register button

---

## If Frontend Won't Start

### Check for Errors
```bash
cd Degas-CS-main/frontend
npm run dev
```

Look for error messages like:
- `Port 5173 is already in use`
- `Module not found`
- `Build failed`

### Fix: Port Already in Use
```powershell
# Windows PowerShell - Kill process on port 5173
Get-Process -Id (Get-NetTCPConnection -LocalPort 5173).OwningProcess | Stop-Process -Force

# Then try again
npm run dev
```

### Fix: Missing Dependencies
```bash
cd Degas-CS-main/frontend
npm install
npm run dev
```

### Fix: Build Errors
```bash
# Clear cache and rebuild
cd Degas-CS-main/frontend
rm -rf node_modules/.vite
npm run dev
```

---

## Symptoms & Solutions

### Symptom: Blank Page, No Console Output
**Cause:** Frontend not running
**Solution:** Start frontend with `npm run dev`

### Symptom: "This page isn't working"
**Cause:** Backend not running
**Solution:** Start backend with `npm run dev`

### Symptom: CORS Error
**Cause:** Wrong API URL
**Solution:** Check `.env` file has `VITE_API_URL=http://localhost:3001/api`

---

## Complete Startup Checklist

- [ ] Backend running on port 3001
- [ ] Frontend running on port 5173
- [ ] Can access `http://localhost:3001/api/health`
- [ ] Can access `http://localhost:5173`
- [ ] Can access registration link
- [ ] Registration form loads
- [ ] Console shows no errors
- [ ] Network tab shows API calls

---

## Test Registration

Once both servers are running:

1. **Open:** `http://localhost:5173/register/06aa4b67-76fe-411a-a1e0-682871e8506f`

2. **Fill Form:**
   - Name: Test User
   - Phone: +1234567890
   - Email: test@example.com
   - Address: 123 Test St
   - Password: password123

3. **Click Register**

4. **Should See:**
   - ✓ Registration Successful!
   - Email confirmation
   - "Go to Login" button

---

## PowerShell Commands

```powershell
# Check if backend is running
Test-NetConnection -ComputerName localhost -Port 3001

# Check if frontend is running
Test-NetConnection -ComputerName localhost -Port 5173

# Start backend (in one terminal)
cd Degas-CS-main\backend
npm run dev

# Start frontend (in another terminal)
cd Degas-CS-main\frontend
npm run dev
```

---

## Summary

The registration system is fully implemented and working. You just need to:

1. **Start Backend:** `cd backend && npm run dev`
2. **Start Frontend:** `cd frontend && npm run dev`
3. **Test:** Open `http://localhost:5173/register/06aa4b67-76fe-411a-a1e0-682871e8506f`

Both servers must be running for the registration link to work!
