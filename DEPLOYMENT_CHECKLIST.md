# Production Deployment Checklist

## Issues Fixed
✅ Backend CORS now allows `.onrender.com` domains  
✅ Access Logs query supports both SQLite and PostgreSQL  
✅ Analytics query supports both SQLite and PostgreSQL  
✅ Database adapter properly handles PostgreSQL (Neon)

---

## Immediate Actions Required

### 1. Backend Environment Variables (Render)
Go to: Render Dashboard → Backend Service → Environment

Add/Update these variables:
```bash
DATABASE_TYPE=postgresql
DATABASE_URL=<your-neon-connection-string>
FRONTEND_URL=<your-frontend-render-url>
UPLOAD_DIR=/tmp/uploads
JWT_SECRET=<keep-existing-or-generate-new>
QR_SECRET=<keep-existing-or-generate-new>
NODE_ENV=production
PORT=3001
DEV_MOCK=false
```

**Get Neon Connection String:**
1. Go to Neon Dashboard
2. Select your project
3. Copy connection string (format: `postgresql://user:pass@host/db?sslmode=require`)

### 2. Frontend Environment Variables (Render)
Go to: Render Dashboard → Frontend Static Site → Environment

Add/Update:
```bash
VITE_API_URL=https://degas-cs-backend-brmk.onrender.com/api
```

### 3. Deploy Changes
1. Commit and push the updated code to GitHub:
   ```bash
   git add .
   git commit -m "Fix production deployment: CORS, PostgreSQL support, Analytics"
   git push origin main
   ```

2. Render will auto-deploy, or trigger manual deploy from dashboard

---

## Testing After Deployment

### Step 1: Backend Health Check
```bash
curl https://degas-cs-backend-brmk.onrender.com/api/health
```

Expected response:
```json
{
  "success": true,
  "ready": true,
  "database": {
    "status": "connected",
    "mode": "production-safe"
  }
}
```

### Step 2: Frontend Login
1. Open your frontend URL
2. Login with admin credentials
3. Should redirect to Dashboard

### Step 3: Dashboard
- Check if numbers show live data (not zeros)
- Verify recent activity shows up

### Step 4: Access Logs
- Navigate to Access Logs tab
- Should load without "failed to fetch" error
- If empty, that's normal (no scans yet)

### Step 5: Analytics
- Navigate to Analytics tab
- Should load without errors
- Charts may be empty (no data yet)

### Step 6: ID Card Generation
1. Go to Tables tab
2. Select a table
3. Try generating an ID card for a user
4. **Note**: May fail due to ephemeral storage on Render free tier

---

## Known Limitations (Render Free Tier)

### Ephemeral Storage
- Files uploaded to `/tmp/uploads` are deleted on dyno restart
- ID cards and photos may disappear after restart
- **Solution**: Implement Cloudinary or AWS S3 (see below)

### Cold Starts
- Service spins down after 15 minutes of inactivity
- First request after spin-down takes 30-60 seconds
- **Solution**: Upgrade to paid tier or use a ping service

---

## File Storage Solutions

### Option A: Cloudinary (Recommended)
1. Sign up at cloudinary.com (free tier available)
2. Get credentials from dashboard
3. Add to backend environment:
   ```bash
   CLOUDINARY_CLOUD_NAME=<your-cloud-name>
   CLOUDINARY_API_KEY=<your-api-key>
   CLOUDINARY_API_SECRET=<your-api-secret>
   ```
4. Update `imageService.ts` to use Cloudinary

### Option B: AWS S3
1. Create S3 bucket
2. Create IAM user with S3 access
3. Add to backend environment:
   ```bash
   AWS_ACCESS_KEY_ID=<your-key>
   AWS_SECRET_ACCESS_KEY=<your-secret>
   AWS_REGION=us-east-1
   AWS_S3_BUCKET=degas-cs-uploads
   ```
4. Update `imageService.ts` to use S3

---

## Troubleshooting

### "Failed to fetch" errors
- Check browser console for CORS errors
- Verify `VITE_API_URL` is correct in frontend
- Verify `FRONTEND_URL` is correct in backend
- Check backend logs in Render dashboard

### Database connection errors
- Verify `DATABASE_TYPE=postgresql`
- Check Neon connection string is correct
- Ensure Neon database is active (not paused)

### ID cards not generating
- Check backend logs for file system errors
- Verify `UPLOAD_DIR=/tmp/uploads`
- Consider implementing Cloudinary/S3

### Backend shows "not ready"
- Check Render logs for initialization errors
- Verify all environment variables are set
- Check database connection

---

## Post-Deployment Monitoring

### Check Backend Logs
```
Render Dashboard → Backend Service → Logs
```

Look for:
- ✅ "Backend initialization complete"
- ✅ "Database connection successful"
- ✅ "System ready to accept requests"
- ❌ Any error messages

### Check Frontend Console
```
Browser DevTools → Console
```

Look for:
- ✅ "Backend is ready"
- ❌ CORS errors
- ❌ Network errors

---

## Success Criteria

✅ Backend health endpoint returns `ready: true`  
✅ Frontend loads without errors  
✅ Login works  
✅ Dashboard shows live data  
✅ Access Logs loads (even if empty)  
✅ Analytics loads (even if empty)  
✅ Tables page loads  
✅ Scanner page loads  

⚠️ ID card generation may fail (ephemeral storage issue)

---

## Next Steps

1. Deploy the fixes
2. Test all functionality
3. If ID cards fail, implement Cloudinary/S3
4. Monitor Render logs for any errors
5. Test QR scanner with real data
