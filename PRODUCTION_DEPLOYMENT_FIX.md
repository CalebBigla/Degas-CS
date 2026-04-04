# Production Deployment Fix Guide

## Issues Identified

### 1. Backend URL Mismatch
- **render.yaml** specifies: `degas-cs-backend`
- **Frontend env** expects: `degas-cs-backend-brmk.onrender.com`
- **Fix**: Update render.yaml or Render dashboard to match actual backend URL

### 2. Missing Super Admin in Production Database
- The super admin (`admin@degas.com`) may not exist in production database
- Database initialization happens on first backend startup
- **Fix**: Run setup script after deployment

### 3. Missing PWA Icon
- Error: `GET /pwa-192x192.png 404 (Not Found)`
- **Fix**: Ensure PWA icons are in `frontend/public` directory

## Quick Fix Steps

### Step 1: Update Frontend Environment Variable in Render

1. Go to Render Dashboard → `degas-cs-frontend` service
2. Navigate to **Environment** tab
3. Update `VITE_API_URL` to match your actual backend URL:
   ```
   https://degas-cs-backend-brmk.onrender.com/api
   ```
4. Click **Save Changes**
5. Redeploy frontend

### Step 2: Create Super Admin in Production

Option A: Via Render Shell (Recommended)
1. Go to Render Dashboard → `degas-cs-backend` service
2. Click **Shell** tab
3. Run:
   ```bash
   cd backend
   node setup-production-admin.js
   ```

Option B: Via API Call
1. Use Postman or curl to create admin:
   ```bash
   curl -X POST https://degas-cs-backend-brmk.onrender.com/api/core-auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "admin@degas.com",
       "password": "admin123",
       "role": "super_admin",
       "status": "active"
     }'
   ```

### Step 3: Verify Database Initialization

Check if database is properly initialized:
```bash
# In Render Shell
cd backend
node -e "
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/degas.db');
db.all('SELECT name FROM sqlite_master WHERE type=\"table\"', (err, tables) => {
  console.log('Tables:', tables.map(t => t.name));
  db.get('SELECT COUNT(*) as count FROM core_users', (err, row) => {
    console.log('Core users count:', row?.count || 0);
    db.close();
  });
});
"
```

### Step 4: Fix PWA Icons

Ensure these files exist in `frontend/public/`:
- `pwa-192x192.png`
- `pwa-512x512.png`
- `favicon.ico`

If missing, add placeholder icons or update `vite.config.ts` to remove PWA plugin.

## Login Credentials

After setup, use these credentials:

**Super Admin:**
- Email: `admin@degas.com`
- Password: `admin123`
- Endpoint: `POST /api/core-auth/login`

**Test User (if created):**
- Email: (user's registered email)
- Password: (user's password)
- Endpoint: `POST /api/form/login`

## Common Errors and Solutions

### Error: 500 Internal Server Error on `/api/form/login`
**Cause**: Database not initialized or users table doesn't exist
**Solution**: 
1. Check backend logs in Render
2. Restart backend service to trigger database initialization
3. Verify `users` table exists

### Error: 401 Unauthorized on `/api/core-auth/login`
**Cause**: Admin user doesn't exist or wrong credentials
**Solution**:
1. Run `setup-production-admin.js` script
2. Verify email is `admin@degas.com` (not `degas@admin.com`)
3. Check password is `admin123`

### Error: CORS issues
**Cause**: Frontend URL not in backend CORS whitelist
**Solution**:
1. Check `FRONTEND_URL` environment variable in backend
2. Should be: `https://degas-cs-frontend.onrender.com`
3. Restart backend after changing

## Verification Checklist

- [ ] Backend is running and healthy (`/api/health` returns 200)
- [ ] Frontend environment variable `VITE_API_URL` matches actual backend URL
- [ ] Database is initialized (tables exist)
- [ ] Super admin exists in `core_users` table
- [ ] Default form "The Force of Grace Ministry" exists in `forms` table
- [ ] CORS is configured correctly
- [ ] Can login with `admin@degas.com` / `admin123`

## Testing After Fix

1. **Test Backend Health:**
   ```bash
   curl https://degas-cs-backend-brmk.onrender.com/api/health
   ```
   Should return: `{"status":"ok"}`

2. **Test Admin Login:**
   ```bash
   curl -X POST https://degas-cs-backend-brmk.onrender.com/api/core-auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@degas.com","password":"admin123"}'
   ```
   Should return token and user data

3. **Test Frontend:**
   - Visit: `https://degas-cs-frontend.onrender.com`
   - Try logging in with admin credentials
   - Should redirect to dashboard

## Need Help?

If issues persist:
1. Check Render logs for both services
2. Verify all environment variables are set correctly
3. Ensure database disk is mounted and writable
4. Check that backend build completed successfully
