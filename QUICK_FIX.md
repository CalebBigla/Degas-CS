# Quick Fix for Registration Page

## Problem Identified
The API calls are failing because the frontend is not using the correct API base URL.

Network tab shows requests to:
```
http://localhost:5173/register/06aa4b67-76fe-411a-a1e0-682871e8506f
```

But should be calling:
```
http://localhost:3001/api/fixed-forms/06aa4b67-76fe-411a-a1e0-682871e8506f
```

---

## Solution

### Step 1: Verify .env File
Check `Degas-CS-main/frontend/.env` contains:
```
VITE_API_URL=http://localhost:3001/api
```

### Step 2: Restart Frontend
**IMPORTANT:** Vite only reads `.env` on startup!

```bash
# Stop the frontend (Ctrl+C)
# Then restart:
cd Degas-CS-main/frontend
npm run dev
```

### Step 3: Hard Refresh Browser
After restarting frontend:
1. Open browser
2. Press `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
3. This clears cache and reloads

### Step 4: Test Again
Navigate to:
```
http://localhost:5173/register/06aa4b67-76fe-411a-a1e0-682871e8506f
```

---

## Verify API URL is Loaded

Open browser console and look for:
```
🔧 API Configuration: {
  VITE_API_URL: "http://localhost:3001/api",
  API_BASE_URL: "http://localhost:3001/api"
}
```

If you see `/api` instead of `http://localhost:3001/api`, the env variable is not loaded.

---

## Alternative: Check .env.local

Vite prioritizes `.env.local` over `.env`. Check if `frontend/.env.local` exists and has wrong URL.

If it exists, update it:
```
VITE_API_URL=http://localhost:3001/api
```

---

## Network Tab Should Show

After fix, network tab should show:
```
✅ GET http://localhost:3001/api/fixed-forms/06aa4b67-76fe-411a-a1e0-682871e8506f
   Status: 200 OK
   Response: { success: true, data: { name: "The Force of Grace Ministry", ... } }
```

---

## If Still Not Working

### Check Console for API URL
Console should show:
```javascript
🔧 API Configuration: {
  VITE_API_URL: "http://localhost:3001/api",
  API_BASE_URL: "http://localhost:3001/api",
  allEnvVars: { ... }
}
```

### Manually Test API
Open new browser tab:
```
http://localhost:3001/api/fixed-forms/06aa4b67-76fe-411a-a1e0-682871e8506f
```

Should show JSON response with form data.

---

## Summary

1. ✅ Verify `.env` has `VITE_API_URL=http://localhost:3001/api`
2. ✅ Stop and restart frontend dev server
3. ✅ Hard refresh browser (Ctrl+Shift+R)
4. ✅ Check console for API configuration
5. ✅ Test registration link again

The issue is that the frontend is not using the correct API URL from the environment variable!
