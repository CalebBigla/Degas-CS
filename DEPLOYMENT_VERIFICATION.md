# Deployment Verification Guide

This guide will help you verify that your Degas CS deployment is working correctly after migration to PostgreSQL (Neon) and deployment on Render.

## Quick Verification Checklist

### 1. Check Backend Health Endpoint

```bash
curl https://your-backend-url.onrender.com/api/health
```

Expected response:
```json
{
  "success": true,
  "message": "Degas CS API is running",
  "ready": true,
  "database": {
    "status": "connected",
    "type": "postgresql",
    "mode": "production-safe"
  },
  "environment": "production",
  "frontend": {
    "url": "https://your-frontend-url.onrender.com",
    "corsEnabled": true
  },
  "cloudinary": {
    "configured": true,
    "provider": "cloudinary"
  }
}
```

**If this fails**, check:
- Backend service is running (check Render logs)
- DATABASE_URL is set correctly
- Port 3001 is being used

### 2. Check Backend Logs for Errors

Go to: **Render Dashboard → Backend Service → Logs**

Look for:
- ✅ `✅ Environment variables validated`
- ✅ `✅ PostgreSQL database initialized`
- ✅ `✅ Database connectivity verified`
- ✅ `✅ Database schema verified`
- ✅ `✅ All API routes registered`
- ✅ `🎯 System ready to accept requests`

**If you don't see these**, there's likely a database connection or initialization error.

### 3. Check Frontend API URL

In browser console (F12):
```javascript
// Should show your backend URL
console.log(import.meta.env.VITE_API_URL)
```

Expected: `https://your-backend-url.onrender.com/api`

**If it shows `http://localhost:3001/api`**, the frontend environment variable is not set.

### 4. Test ID Card Generation

1. Go to your application
2. Create a test user or open an existing user record
3. Click "Generate ID Card" or "Download ID Card"
4. Check frontend console for errors (F12)
5. Check backend logs for detailed error messages

**Common errors and solutions:**

| Error | Solution |
|-------|----------|
| "Failed to generate ID card" | Check backend logs for full error message |
| "Cannot read property 'photo_url'" | User data missing photo field - not critical |
| "QR code generation failed" | Check QR_SECRET environment variable is set |
| "Cloudinary upload failed" | Check CLOUDINARY credentials in backend logs |

### 5. Test Access Logs

1. Go to Dashboard → Analytics → Access Logs
2. Should show list of scans (or "No data" if no scans yet)
3. Check for "Failed to fetch data" errors

**If it fails**, check backend logs:
```
❌ Get access logs error:
```

Look for SQL syntax errors or connection issues.

### 6. Test Analytics

1. Go to Dashboard → Analytics
2. Should show dashboard stats (even if all zeros)
3. Try different time ranges (1d, 7d, 30d, 90d)

**If it fails**, similar to Access Logs - check backend logs.

## Detailed Troubleshooting

### Backend Not Ready

**Symptoms:**
- Health endpoint returns `"ready": false`
- Logs show `❌ Backend initialization failed`

**Solutions:**
1. Check DATABASE_URL
   ```bash
   # In Render Shell
   echo $DATABASE_URL
   ```
   Should output: `postgresql://user:pass@host/db?sslmode=require`

2. Check database is accessible
   ```bash
   # In Render Shell
   psql $DATABASE_URL -c "SELECT 1;"
   ```
   Should return `1`

3. Check database tables exist
   ```bash
   # In Render Shell
   psql $DATABASE_URL -c "\dt"
   ```
   Should list: `admins`, `tables`, `dynamic_users`, `access_logs`

### CORS Errors

**Symptoms:**
- Frontend shows CORS error in console
- Error: `No 'Access-Control-Allow-Origin' header`

**Solutions:**
1. Check FRONTEND_URL is set
   ```bash
   # In Render backend environment
   echo $FRONTEND_URL
   ```
   Should output: `https://your-frontend-url.onrender.com`

2. Verify exact URL match
   - Frontend URL in browser: `https://abc123.onrender.com`
   - FRONTEND_URL must be exactly: `https://abc123.onrender.com`
   - No trailing slashes, exact case

3. Check backend logs
   ```
   CORS blocked origin: https://wrong-url.onrender.com
   ```

### "Failed to fetch" Errors

**Symptoms:**
- All API calls fail with 503 error
- Health endpoint shows `"ready": false`

**Solutions:**
Same as "Backend Not Ready" - initialize database first.

### ID Card Generation Fails

**Symptoms:**
- "Failed to generate ID card" error
- No error details shown

**Solutions:**
1. Check backend logs for full error stack
2. Common issues:
   - User missing photo field
   - Cloudinary not configured
   - Render /tmp/uploads directory permissions
   - QR code generation failure

**To fix:**
```bash
# Configure Cloudinary (recommended for production)
# Add to Render backend environment:
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### Database Connection Timeout

**Symptoms:**
```
Error: connect ETIMEDOUT
Error: connect ECONNREFUSED
```

**Solutions:**
1. **If using Neon:**
   - Go to Neon Dashboard
   - Check database is not paused
   - Check connection string includes `?sslmode=require`

2. **Check connection pooling**
   - Backend logs should show: `✅ PostgreSQL pool created and configured`
   - If not, database configuration failed

3. **Test connection manually:**
   ```bash
   # In Render Shell
   psql $DATABASE_URL -c "SELECT version();"
   ```

## Environment Variables Checklist

### Backend (Render)

- [ ] `DATABASE_TYPE=postgresql`
- [ ] `DATABASE_URL=postgresql://...` (from Neon)
- [ ] `JWT_SECRET=...` (keep existing or generate new)
- [ ] `QR_SECRET=...` (keep existing or generate new)
- [ ] `FRONTEND_URL=https://your-frontend-url.onrender.com`
- [ ] `NODE_ENV=production`
- [ ] `PORT=3001`
- [ ] `DEV_MOCK=false`
- [ ] `CLOUDINARY_CLOUD_NAME=...` (optional)
- [ ] `CLOUDINARY_API_KEY=...` (optional)
- [ ] `CLOUDINARY_API_SECRET=...` (optional)

### Frontend (Render Static Site)

- [ ] `VITE_API_URL=https://your-backend-url.onrender.com/api`

## Performance Verification

### Check Response Times

```bash
# Time a request
time curl https://your-backend-url.onrender.com/api/health

# Should respond in < 500ms
```

### Check Database Query Performance

Backend logs should show query execution starting with `🔍` symbols and quick resolution.

## Security Verification

### Check SSL/TLS Configuration

```bash
curl -I https://your-backend-url.onrender.com/api/health
# Should show: HTTP/2 200 (not HTTP/1.1)
```

### Check PostgreSQL SSL

```bash
# In Render Shell, for Neon+
psql $DATABASE_URL -c "SELECT ssl_version FROM pg_stat_ssl LIMIT 1;"
# Should show TLS version like TLSv1.2 or TLSv1.3
```

### Check JWT & QR_SECRET

```bash
# These should always be set
# In Render backend environment:
echo $JWT_SECRET | wc -c  # Should be > 32 characters
echo $QR_SECRET | wc -c   # Should be > 32 characters
```

## Full System Test Script

Create `test-deployment.sh`:

```bash
#!/bin/bash

BACKEND_URL=${1:-https://your-backend-url.onrender.com}
FRONTEND_URL=${2:-https://your-frontend-url.onrender.com}

echo "🧪 Degas CS Deployment Test"
echo "=============================="
echo "Backend: $BACKEND_URL"
echo "Frontend: $FRONTEND_URL"
echo ""

# Test 1: Health Check
echo "1️⃣  Testing health endpoint..."
HEALTH=$(curl -s $BACKEND_URL/api/health)
if echo $HEALTH | grep -q '"ready":true'; then
  echo "✅ Backend is ready"
  echo "Database: $(echo $HEALTH | grep -o '"type":"[^"]*"')"
else
  echo "❌ Backend is NOT ready"
  echo $HEALTH | jq .
  exit 1
fi

# Test 2: CORS Configuration
echo ""
echo "2️⃣  Testing CORS configuration..."
CORS=$(curl -s -H "Origin: $FRONTEND_URL" -H "Access-Control-Request-Method: POST" $BACKEND_URL/api/tables)
if echo $CORS | grep -q "Access-Control-Allow-Origin"; then
  echo "✅ CORS is properly configured"
else
  echo "⚠️  CORS may not be properly configured"
fi

# Test 3: Database Connection
echo ""
echo "3️⃣  Testing database..."
TABLES=$(curl -s -H "Authorization: Bearer test" $BACKEND_URL/api/tables)
if echo $TABLES | grep -q '"success"'; then
  echo "✅ Database queries are working"
else
  echo "⚠️  Database queries may not be working"
fi

echo ""
echo "✅ Basic deployment test complete!"
```

## Next Steps

1. **If everything passes:** Your deployment is complete! 🎉
2. **If something fails:** Check the troubleshooting section above
3. **For additional support:** Check the application logs in Render dashboard

## Useful Commands for Render Shell

```bash
# Check environment variables
env | grep -E "DATABASE|JWT|QR|FRONTEND|CLOUDINARY"

# Test database connection
psql $DATABASE_URL -c "SELECT COUNT(*) FROM dynamic_users;"

# Test file uploads (Cloudinary)
curl -X POST ... (requires Cloudinary)

# View recent logs
journalctl -n 50 -f

# Restart service
# (Go to Render dashboard, click "Restart" or push to GitHub)
```

## Support

If you continue to have issues:

1. **Check backend logs in detail** - look for stack traces
2. **Verify all environment variables** - typos are common
3. **Test database connectivity** - use psql directly
4. **Check frontend console** (F12) - for API call failures
5. **Review the SQL queries** - check PostgreSQL conversion syntax

---

**Last Updated:** 2026-02-22
**Version:** 1.0.0
